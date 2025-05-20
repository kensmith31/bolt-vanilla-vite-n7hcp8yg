import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import { PlusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export function BulkEditModal({ isOpen, onClose, selectedItems, onUpdate }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [field, setField] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newRoom, setNewRoom] = useState("");
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Reset field and value when modal closes
  useEffect(() => {
    if (!isOpen) {
      setField("");
      setValue("");
      setShowDeleteConfirm(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [isOpen]);

  // Fetch rooms and categories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRooms();
      fetchCategories();
    }
  }, [isOpen]);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("room")
        .not("room", "is", null)
        .order("room");

      if (error) throw error;

      // Get unique rooms
      const uniqueRooms = [...new Set(data.map((item) => item.room))];
      setRooms(uniqueRooms);
    } catch (err) {
      console.error("Error fetching rooms:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleAddRoom = async () => {
    if (!newRoom.trim()) return;

    setRooms((prev) => [...prev, newRoom.trim()]);
    setValue(newRoom.trim());
    setNewRoom("");
    setShowAddRoom(false);
  };

  const fields = [
    { id: "category_id", label: "Category", type: "category" },
    { id: "room", label: "Room", type: "text" },
    { id: "quantity", label: "Quantity", type: "number" },
    { id: "age", label: "Age", type: "number" },
    { id: "tax_rate", label: "Tax Rate", type: "tax_rate" },
    { id: "depreciation_percent", label: "Depreciation %", type: "number" },
    { id: "accept_claimed", label: "Accept Claimed", type: "special" },
    {
      id: "condition",
      label: "Condition",
      type: "select",
      options: ["poor", "fair", "good", "new"],
    },
    { id: "replacement_cost_applies", label: "RC Applies", type: "boolean" },
    { id: "replaced", label: "Replaced", type: "boolean" },
    { id: "no_loss_or_damage", label: "No Loss or Damage", type: "boolean" },
    {
      id: "not_involved_in_claim",
      label: "Not Involved in Claim",
      type: "boolean",
    },
    { id: "duplicate_item", label: "Duplicate", type: "boolean" },
    { id: "cleaning_allowance", label: "Clean Only", type: "boolean" },
  ];

  const handleDelete = async () => {
    try {
      setLoading(true);

      const itemsArray = Array.from(selectedItems);
      setProgress({ current: 0, total: itemsArray.length });

      let successCount = 0;
      let errorCount = 0;

      // Process each item individually to avoid transaction conflicts
      for (let i = 0; i < itemsArray.length; i++) {
        const itemId = itemsArray[i];
        setProgress({ current: i + 1, total: itemsArray.length });

        try {
          // Delete the item - the trigger will handle history recording
          const { error } = await supabase
            .from("items")
            .delete()
            .eq("id", itemId);

          if (error) {
            console.error(`Error deleting item ${itemId}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (itemErr) {
          console.error(`Error processing delete for item ${itemId}:`, itemErr);
          errorCount++;
        }
      }

      // Success message with details
      if (errorCount === 0) {
        toast.success(`Successfully deleted ${successCount} items`);
      } else {
        toast.success(
          `Deleted ${successCount} items, failed to delete ${errorCount} items`,
        );
      }

      onUpdate(); // Trigger refresh through parent component
      onClose();
    } catch (err) {
      console.error("Error deleting items:", err);
      toast.error("Failed to delete items: " + err.message);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const itemsArray = Array.from(selectedItems);
      setProgress({ current: 0, total: itemsArray.length });

      // Special handling for Accept Claimed option
      if (field === "accept_claimed") {
        let successCount = 0;
        let errorCount = 0;

        // Process each item individually to avoid transaction conflicts
        for (let i = 0; i < itemsArray.length; i++) {
          const itemId = itemsArray[i];
          setProgress({ current: i + 1, total: itemsArray.length });

          try {
            // Get the current value to know what we're updating
            const { data: item, error: fetchError } = await supabase
              .from("items")
              .select("claimed_rcv")
              .eq("id", itemId)
              .single();

            if (fetchError) {
              console.error(`Error fetching item ${itemId}:`, fetchError);
              errorCount++;
              continue;
            }

            if (item.claimed_rcv) {
              // Update the item - the trigger will handle history recording
              const { error: updateError } = await supabase
                .from("items")
                .update({
                  adjusted_rcv: item.claimed_rcv,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", itemId);

              if (updateError) {
                console.error(`Error updating item ${itemId}:`, updateError);
                errorCount++;
              } else {
                successCount++;
              }
            }
          } catch (itemErr) {
            console.error(`Error processing item ${itemId}:`, itemErr);
            errorCount++;
          }
        }

        // Success message
        if (errorCount === 0) {
          toast.success(
            `Updated ${successCount} items with claimed RCV values`,
          );
        } else {
          toast.success(
            `Updated ${successCount} items, failed to update ${errorCount} items`,
          );
        }

        onUpdate(); // Trigger refresh through parent component
        onClose();
        return;
      }

      // For standard field updates
      let processedValue = value;
      let fieldToUpdate = field;

      // Process the value based on field type
      if (field === "age" || field === "quantity") {
        processedValue = parseFloat(value) || 0;
      } else if (field === "tax_rate") {
        processedValue = parseFloat(value) / 100;
        fieldToUpdate = "tax_rate";
        // Will handle tax_rate_is_custom separately
      } else if (field === "depreciation_percent") {
        processedValue = parseFloat(value) / 100;
      } else if (
        field === "replacement_cost_applies" ||
        field === "replaced" ||
        field === "no_loss_or_damage" ||
        field === "not_involved_in_claim" ||
        field === "duplicate_item" ||
        field === "cleaning_allowance"
      ) {
        processedValue = value === "true";
      } else if (field === "category_id") {
        processedValue = parseInt(value);
      }

      // Process items individually to avoid transaction conflicts
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < itemsArray.length; i++) {
        const itemId = itemsArray[i];
        setProgress({ current: i + 1, total: itemsArray.length });

        try {
          // Prepare update data for this specific item
          let updateData = {
            updated_at: new Date().toISOString(),
          };

          // Handle special case for tax_rate
          if (field === "tax_rate") {
            updateData.tax_rate = processedValue;
            updateData.tax_rate_is_custom = true;
          } else {
            // Set the field directly
            updateData[fieldToUpdate] = processedValue;
          }

          // Special handling for status updates based on checkbox fields
          if (field === "no_loss_or_damage" && processedValue === true) {
            updateData.status = "in_review";
            updateData.status_display = "No Loss/Damage";
            updateData.not_involved_in_claim = false;
            updateData.duplicate_item = false;
            updateData.cleaning_allowance = false;
            updateData.cleaning_allowance_amount = null;
          } else if (
            field === "not_involved_in_claim" &&
            processedValue === true
          ) {
            updateData.status = "in_review";
            updateData.status_display = "Not Involved in Claim";
            updateData.no_loss_or_damage = false;
            updateData.duplicate_item = false;
            updateData.cleaning_allowance = false;
            updateData.cleaning_allowance_amount = null;
          } else if (field === "duplicate_item" && processedValue === true) {
            updateData.status = "in_review";
            updateData.status_display = "Duplicate";
            updateData.no_loss_or_damage = false;
            updateData.not_involved_in_claim = false;
            updateData.cleaning_allowance = false;
            updateData.cleaning_allowance_amount = null;
          } else if (
            field === "cleaning_allowance" &&
            processedValue === true
          ) {
            updateData.status = "in_review";
            updateData.status_display = "Clean Only";
            updateData.no_loss_or_damage = false;
            updateData.not_involved_in_claim = false;
            updateData.duplicate_item = false;
          } else if (
            field === "cleaning_allowance" &&
            processedValue === false
          ) {
            updateData.cleaning_allowance_amount = null;
          }

          // Execute the update for this specific item
          const { error } = await supabase
            .from("items")
            .update(updateData)
            .eq("id", itemId);

          if (error) {
            console.error(`Error updating item ${itemId}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (itemErr) {
          console.error(`Error processing item ${itemId}:`, itemErr);
          errorCount++;
        }
      }

      // Success message with details
      if (errorCount === 0) {
        toast.success(`Successfully updated ${successCount} items`);
      } else {
        toast.success(
          `Updated ${successCount} items, failed to update ${errorCount} items`,
        );
      }

      onUpdate(); // Trigger refresh through parent component
      onClose();
    } catch (err) {
      console.error("Error updating items:", err);
      toast.error("Failed to update items: " + err.message);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <>
      <Transition appear show={isOpen && !showDeleteConfirm} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                  >
                    Bulk Edit {selectedItems.size} Items
                  </Dialog.Title>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Field to Update
                      </label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={field}
                        onChange={(e) => {
                          setField(e.target.value);
                          setValue(""); // Reset value when field changes
                        }}
                        required
                      >
                        <option value="">Select a field</option>
                        {fields.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {field && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          New Value
                        </label>
                        {field === "category_id" ? (
                          <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            required
                          >
                            <option value="">Select a category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        ) : field === "room" ? (
                          <div className="space-y-2">
                            <select
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                              required
                            >
                              <option value="">Select a room</option>
                              {rooms.map((room) => (
                                <option key={room} value={room}>
                                  {room}
                                </option>
                              ))}
                            </select>
                            {!showAddRoom ? (
                              <button
                                type="button"
                                onClick={() => setShowAddRoom(true)}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <PlusIcon className="h-4 w-4" />
                                Add New Room
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newRoom}
                                  onChange={(e) => setNewRoom(e.target.value)}
                                  placeholder="Enter room name"
                                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddRoom}
                                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                  Add
                                </button>
                              </div>
                            )}
                          </div>
                        ) : field === "accept_claimed" ? (
                          <div className="p-3 bg-blue-50 rounded-md">
                            <p className="text-sm text-blue-700 mb-2">
                              This will copy the Claimed RCV value to the
                              Adjusted RCV field for all selected items.
                            </p>
                            <button
                              type="submit"
                              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                              disabled={loading}
                            >
                              {loading
                                ? "Processing..."
                                : "Apply to Selected Items"}
                            </button>
                          </div>
                        ) : fields.find((f) => f.id === field)?.type ===
                          "boolean" ? (
                          <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            required
                          >
                            <option value="">Select a value</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : fields.find((f) => f.id === field)?.type ===
                          "select" ? (
                          <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            required
                          >
                            <option value="">Select a value</option>
                            {fields
                              .find((f) => f.id === field)
                              ?.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <div className="relative">
                            <input
                              type="number"
                              step={
                                field === "tax_rate"
                                  ? "0.001"
                                  : field === "quantity"
                                    ? "0.01"
                                    : "1"
                              }
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                              min={field === "quantity" ? "0.01" : "0"}
                              max={
                                field === "tax_rate" ||
                                field === "depreciation_percent"
                                  ? "100"
                                  : undefined
                              }
                              required
                            />
                            {(field === "tax_rate" ||
                              field === "depreciation_percent") && (
                              <span className="absolute right-3 top-2 text-gray-500">
                                %
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Progress bar for bulk operations */}
                    {loading && progress.total > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{
                              width: `${(progress.current / progress.total) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          Processing {progress.current} of {progress.total}{" "}
                          items
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex justify-between">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={loading}
                      >
                        Delete Items
                      </button>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                          onClick={onClose}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                          disabled={loading}
                        >
                          {loading ? "Updating..." : "Update Items"}
                        </button>
                      </div>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={showDeleteConfirm} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setShowDeleteConfirm(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Confirm Deletion
                    </Dialog.Title>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete {selectedItems.size}{" "}
                      items? This action cannot be undone.
                    </p>
                  </div>

                  {/* Progress bar for bulk operations */}
                  {loading && progress.total > 0 && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                        <div
                          className="bg-red-600 h-2.5 rounded-full"
                          style={{
                            width: `${(progress.current / progress.total) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        Deleting {progress.current} of {progress.total} items
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      {loading ? "Deleting..." : "Delete Items"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
