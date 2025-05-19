import React, { useState, useRef, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export function ItemReceiptModal({ isOpen, onClose, item, onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [amountSpent, setAmountSpent] = useState("");
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

  // Reset state when modal opens with a new item
  useEffect(() => {
    console.log("Modal opened with item:", item);
    if (isOpen && item) {
      setFiles([]);
      setUploadProgress(0);

      try {
        // Safely handle the replacement_spent value
        if (
          item.replacement_spent === null ||
          item.replacement_spent === undefined
        ) {
          console.log(
            "Setting amount spent to empty string (null/undefined value)",
          );
          setAmountSpent("");
        } else {
          // Make sure it's a valid number before converting to string
          console.log(
            "Raw replacement_spent value:",
            item.replacement_spent,
            typeof item.replacement_spent,
          );
          // Use Number() instead of parseFloat to better handle different types
          const numValue = Number(item.replacement_spent);
          console.log("Converted to number:", numValue, typeof numValue);

          if (!isNaN(numValue)) {
            console.log("Setting amount spent to:", numValue.toString());
            setAmountSpent(numValue.toString());
          } else {
            console.log("Invalid number, setting to empty string");
            setAmountSpent("");
          }
        }
      } catch (error) {
        console.error("Error setting initial amount:", error);
        setAmountSpent("");
      }
    }
  }, [isOpen, item]);

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.add("bg-blue-50", "border-blue-500");
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove("bg-blue-50", "border-blue-500");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove("bg-blue-50", "border-blue-500");
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Allow saving even if no files are selected, to update amount spent only
    if (files.length === 0) {
      // Check if the amount has changed
      try {
        let currentAmountAsString = "";
        if (
          item?.replacement_spent !== null &&
          item?.replacement_spent !== undefined
        ) {
          currentAmountAsString = Number(item.replacement_spent).toString();
        }

        console.log("Comparing amounts:", {
          current: currentAmountAsString,
          new: amountSpent,
          areEqual: amountSpent === currentAmountAsString,
        });

        if (amountSpent === currentAmountAsString) {
          toast.error(
            "Please select at least one file to upload or change the amount spent",
          );
          return;
        }
      } catch (error) {
        console.error("Error comparing amounts:", error);
        // Continue anyway since we're changing the value
      }
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls = [];

      // Upload files if any
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split(".").pop();
          const fileName = `${item.id}_${Date.now()}_${i}.${fileExt}`;
          const filePath = `${fileName}`;

          // Upload the file to Supabase storage
          const { data, error } = await supabase.storage
            .from("itemreceipts")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (error) {
            throw error;
          }

          // Get the public URL for the uploaded file
          const { data: urlData } = supabase.storage
            .from("itemreceipts")
            .getPublicUrl(filePath);

          uploadedUrls.push(urlData.publicUrl);

          // Update progress
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        }
      }

      // Prepare update data
      const updateData = {
        updated_at: new Date().toISOString(),
      };

      // Only update receipts if new files were uploaded
      if (uploadedUrls.length > 0) {
        const currentReceipts = item.receipts || [];
        updateData.receipts = [...currentReceipts, ...uploadedUrls];
      }

      // Handle the amount spent field - convert empty string to null, otherwise to number
      if (amountSpent === "") {
        console.log("Setting replacement_spent to null (empty string)");
        updateData.replacement_spent = null;
      } else {
        try {
          const numValue = Number(amountSpent);
          console.log(
            "Converting amount spent to number:",
            amountSpent,
            "→",
            numValue,
          );
          if (!isNaN(numValue)) {
            updateData.replacement_spent = numValue;
          } else {
            console.log("Invalid number, not updating replacement_spent");
          }
        } catch (error) {
          console.error("Error converting amount spent:", error);
        }
      }

      // No holdback_due calculations - this is handled by the database

      console.log("Updating item with data:", updateData);

      // Update the item in the database
      const { data, error: updateError } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", item.id)
        .select();

      if (updateError) {
        console.error("Supabase update error:", updateError);
        throw updateError;
      }

      console.log("Update successful, response:", data);

      // Show success message
      if (files.length > 0) {
        toast.success("Receipts uploaded and amount updated successfully");
      } else {
        toast.success("Amount updated successfully");
      }

      onUploadComplete(updateData);
      onClose();
    } catch (err) {
      console.error("Error updating item:", err);
      toast.error("Failed to update: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getFileIcon = (file) => {
    const fileType = file.type.split("/")[0];
    if (fileType === "image") {
      return <PhotoIcon className="h-6 w-6 text-blue-500" />;
    } else if (file.name.endsWith(".pdf")) {
      return <DocumentIcon className="h-6 w-6 text-red-500" />;
    } else {
      return <DocumentIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getFilePreview = (file) => {
    const fileType = file.type.split("/")[0];
    if (fileType === "image") {
      return URL.createObjectURL(file);
    }
    return null;
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isUploading && onClose()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              Upload Receipt
            </Dialog.Title>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-1">Item:</div>
            <div className="text-base font-semibold">
              #{item?.item_number} - {item?.description}
            </div>
          </div>

          {/* Display current values from database */}
          <div className="mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Current Amount Spent:</span>
              <span className="font-medium">
                {item?.replacement_spent !== null &&
                item?.replacement_spent !== undefined
                  ? `${Number(item.replacement_spent).toFixed(2)}`
                  : "Not set"}
              </span>
            </div>
            {item?.replacement_cost_applies && item?.replaced && (
              <div className="flex justify-between mt-1">
                <span className="text-gray-600">Current Holdback Due:</span>
                <span className="font-medium">
                  {item?.holdback_due !== null &&
                  item?.holdback_due !== undefined
                    ? `${Number(item.holdback_due).toFixed(2)}`
                    : "Not set"}
                </span>
              </div>
            )}
          </div>

          <div
            ref={dropAreaRef}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 text-center transition-colors duration-200"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <ArrowUpTrayIcon className="h-10 w-10 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop files here, or{" "}
              <button
                type="button"
                onClick={handleFileSelect}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500">
              Supported formats: Images, PDF
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileChange}
            />
          </div>

          {files.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Selected Files ({files.length}):
              </div>
              <div className="max-h-40 overflow-y-auto">
                {files.map((file, index) => {
                  const preview = getFilePreview(file);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center">
                        {preview ? (
                          <img
                            src={preview}
                            alt="Preview"
                            className="h-8 w-8 object-cover rounded mr-2"
                          />
                        ) : (
                          <div className="mr-2">{getFileIcon(file)}</div>
                        )}
                        <div className="text-sm truncate max-w-[200px]">
                          {file.name}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="amountSpent"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Amount Spent
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="amountSpent"
                id="amountSpent"
                min="0"
                step="0.01"
                className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="0.00"
                value={amountSpent}
                onChange={(e) => {
                  // Allow empty string or valid numbers only
                  const value = e.target.value;
                  // Always allow empty string
                  if (value === "") {
                    setAmountSpent("");
                    return;
                  }

                  // For non-empty values, validate as number
                  const numValue = parseFloat(value);
                  if (!isNaN(numValue) && isFinite(numValue)) {
                    // Only allow positive numbers
                    if (numValue >= 0) {
                      setAmountSpent(value);
                    }
                  }
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to clear the amount
            </p>
          </div>

          {isUploading && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-center mt-1 text-gray-500">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Save"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
