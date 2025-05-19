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
  const [amountSpent, setAmountSpent] = useState(item?.replacement_spent || "");
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

  // Reset state when modal opens with a new item
  useEffect(() => {
    if (isOpen && item) {
      setFiles([]);
      setUploadProgress(0);
      setAmountSpent(item.replacement_spent || "");
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
    if (files.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls = [];

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

      // Update the item with the new receipt URLs and amount spent
      const currentReceipts = item.receipts || [];
      const updatedReceipts = [...currentReceipts, ...uploadedUrls];

      const updateData = {
        receipts: updatedReceipts,
        updated_at: new Date().toISOString(),
      };

      // Handle the amount spent field
      // amountSpent is already null or a number
      updateData.replacement_spent = amountSpent;

      // Calculate holdback_due if replacement_cost_applies and replaced are true
      if (item.replacement_cost_applies && item.replaced) {
        // Get the current item to ensure we have the latest values
        const { data: currentItem, error: fetchError } = await supabase
          .from("items")
          .select("*")
          .eq("id", item.id)
          .single();

        if (!fetchError && currentItem) {
          if (updateData.replacement_spent !== null) {
            // Calculate holdback_due = rcv_plus_tax - acv - replacement_spent
            const holdbackDue = Math.max(
              0,
              (currentItem.rcv_plus_tax || 0) -
                (currentItem.acv || 0) -
                updateData.replacement_spent,
            );

            updateData.holdback_due = holdbackDue;
          } else {
            // If replacement_spent is null, set holdback_due to the maximum possible value
            updateData.holdback_due = Math.max(
              0,
              (currentItem.rcv_plus_tax || 0) - (currentItem.acv || 0),
            );
          }
        }
      }

      const { error: updateError } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", item.id);

      if (updateError) throw updateError;

      toast.success("Receipts uploaded successfully");
      onUploadComplete(updateData);
      onClose();
    } catch (err) {
      console.error("Error uploading receipts:", err);
      toast.error("Failed to upload receipts: " + err.message);
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
              disabled={isUploading || files.length === 0}
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
