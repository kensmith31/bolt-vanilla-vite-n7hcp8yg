import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export function ReceiptViewerModal({
  isOpen,
  onClose,
  item,
  receipts,
  onUpdateComplete,
}) {
  const [currentReceiptIndex, setCurrentReceiptIndex] = useState(0);
  const [isUpdatingAmountSpent, setIsUpdatingAmountSpent] = useState(false);
  const [amountSpent, setAmountSpent] = useState("");

  // Reset state and initialize amount spent when modal opens with a new item
  useEffect(() => {
    if (isOpen && item) {
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

  if (!isOpen || !receipts || receipts.length === 0 || !item) return null;

  const handleDeleteReceipt = async () => {
    try {
      setIsUpdatingAmountSpent(true);
      const updatedReceipts = [...receipts];
      updatedReceipts.splice(currentReceiptIndex, 1);

      const { error } = await supabase
        .from("items")
        .update({
          receipts: updatedReceipts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      // Adjust current index if needed
      if (currentReceiptIndex >= updatedReceipts.length) {
        setCurrentReceiptIndex(Math.max(0, updatedReceipts.length - 1));
      }

      // Close modal if no receipts left
      if (updatedReceipts.length === 0) {
        onClose();
      }

      toast.success("Receipt deleted successfully");

      // Update parent component
      onUpdateComplete({
        id: item.id,
        receipts: updatedReceipts,
      });
    } catch (err) {
      console.error("Error deleting receipt:", err);
      toast.error("Failed to delete receipt");
    } finally {
      setIsUpdatingAmountSpent(false);
    }
  };

  const handleAmountSpentChange = () => {
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
        // No change, no need to update
        return;
      }
    } catch (error) {
      console.error("Error comparing amounts:", error);
    }

    updateAmountSpent();
  };

  const updateAmountSpent = async () => {
    try {
      setIsUpdatingAmountSpent(true);

      // Debug: Log the current state and item
      console.log("Current state:", {
        amountSpent,
        item,
        itemId: item?.id,
      });

      // Validate item exists with an ID
      if (!item || !item.id) {
        console.error("Missing item or item.id", item);
        toast.error("Cannot update: Missing item information");
        return;
      }

      let newValue = null;
      if (amountSpent !== "") {
        newValue = Number(amountSpent);
        if (isNaN(newValue)) {
          toast.error("Please enter a valid number");
          return;
        }

        if (newValue < 0) {
          toast.error("Amount cannot be negative");
          return;
        }
      }

      // Create update data - ONLY include replacement_spent
      // Let the database handle holdback_due calculation
      const updateData = {
        replacement_spent: newValue,
        updated_at: new Date().toISOString(),
      };

      // Debug: Log the data we're about to send
      console.log("Updating item with data:", {
        itemId: item.id,
        ...updateData,
      });

      // Perform the update
      const { data, error } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", item.id)
        .select();

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      console.log("Update successful, response:", data);

      // Show success message
      toast.success("Amount spent updated");

      // Instead of passing our calculated holdback_due, use the value returned from the database
      const returnedItem = data && data.length > 0 ? data[0] : null;

      // Prepare the update data to send to the parent component
      const completeUpdateData = {
        id: item.id,
        replacement_spent: newValue,
        // Only include holdback_due if it was returned by the database
        ...(returnedItem?.holdback_due !== undefined && {
          holdback_due: returnedItem.holdback_due,
        }),
      };

      console.log("Sending update data to parent:", completeUpdateData);

      // Update parent component with the updated data
      onUpdateComplete(completeUpdateData);
    } catch (err) {
      console.error("Error updating amount spent:", err);

      // More descriptive error message
      if (err.message) {
        toast.error(`Failed to update: ${err.message}`);
      } else {
        toast.error("Failed to update amount spent");
      }
    } finally {
      setIsUpdatingAmountSpent(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h3 className="text-lg font-medium">
              Receipt {currentReceiptIndex + 1} of {receipts.length}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              #{item.item_number} - {item.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          {receipts[currentReceiptIndex].toLowerCase().endsWith(".pdf") ? (
            <iframe
              src={receipts[currentReceiptIndex]}
              className="w-full h-full min-h-[500px]"
              title="PDF Viewer"
            />
          ) : (
            <img
              src={receipts[currentReceiptIndex]}
              alt="Receipt"
              className="max-w-full max-h-[70vh] object-contain"
            />
          )}
        </div>

        <div className="p-4 border-t border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Amount Spent</div>
            <div className="flex items-center">
              <button
                onClick={handleDeleteReceipt}
                className="text-red-600 hover:text-red-800 mr-4 text-sm font-medium"
                disabled={isUpdatingAmountSpent}
              >
                Delete Receipt
              </button>
              <button
                onClick={() => {
                  onClose();
                  // Signal to parent to open the upload modal
                  onUpdateComplete({
                    id: item.id,
                    openUploadModal: true,
                  });
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Upload More
              </button>
            </div>
          </div>
          <div className="flex items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
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
                onBlur={handleAmountSpentChange}
                disabled={isUpdatingAmountSpent}
              />
            </div>
            <button
              type="button"
              onClick={updateAmountSpent}
              disabled={isUpdatingAmountSpent}
              className="ml-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isUpdatingAmountSpent ? "Updating..." : "Update"}
            </button>
            {item.replacement_cost_applies && item.replaced && (
              <div className="ml-4 text-sm">
                <div className="font-medium text-gray-700">Holdback Due:</div>
                <div className="font-bold">
                  ${(item.holdback_due || 0).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center p-4">
          <button
            onClick={() =>
              setCurrentReceiptIndex((prev) =>
                prev > 0 ? prev - 1 : receipts.length - 1,
              )
            }
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center"
            disabled={receipts.length <= 1}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Previous
          </button>

          <div className="text-sm text-gray-500">
            {currentReceiptIndex + 1} / {receipts.length}
          </div>

          <button
            onClick={() =>
              setCurrentReceiptIndex((prev) =>
                prev < receipts.length - 1 ? prev + 1 : 0,
              )
            }
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center"
            disabled={receipts.length <= 1}
          >
            Next
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <a
            href={receipts[currentReceiptIndex]}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md flex items-center"
          >
            Open in New Tab
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
