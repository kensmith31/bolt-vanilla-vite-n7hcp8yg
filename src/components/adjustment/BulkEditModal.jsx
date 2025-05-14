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

  // Reset field and value when modal closes
  useEffect(() => {
    if (!isOpen) {
      setField("");
      setValue("");
      setShowDeleteConfirm(false);
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

      // Get current user information for change history
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      // Get user details for the change history
      let userName = "Unknown User";
      if (userId) {
        const { data: userData } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", userId)
          .single();

        if (userData) {
          userName =
            `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
            "Unknown User";
        }
      }

      // Get the items to be deleted for history records
      const { data: itemsToDelete, error: fetchError } = await supabase
        .from("items")
        .select("id, item_number, description")
        .in("id", Array.from(selectedItems));

      if (fetchError) throw fetchError;

      // First, delete any existing change history records for these items
      // This resolves the foreign key constraint issue
      const { error: deleteHistoryError } = await supabase
        .from("item_change_history")
        .delete()
        .in("item_id", Array.from(selectedItems));

      if (deleteHistoryError) {
        console.error("Error deleting change history:", deleteHistoryError);
        throw deleteHistoryError;
      }

      // Now delete the items after history records are removed
      const { error } = await supabase
        .from("items")
        .delete()
        .in("id", Array.from(selectedItems));

      if (error) throw error;

      // Record deletion in change history for each item
      const changeHistoryEntries = itemsToDelete.map((item) => ({
        item_id: item.id,
        field_name: "deleted",
        old_value: JSON.stringify({
          item_number: item.item_number,
          description: item.description,
        }),
        new_value: null,
        changed_at: new Date().toISOString(),
        user_id: userId || null,
        user_name: userName,
      }));

      // Insert change history records
      const { error: historyError } = await supabase
        .from("item_change_history")
        .insert(changeHistoryEntries);

      if (historyError) {
        console.error("Error recording deletion history:", historyError);
        // Continue execution even if history recording fails
      }

      toast.success(`Deleted ${selectedItems.size} items`);
      onUpdate(); // Trigger refresh through parent component
      onClose();
    } catch (err) {
      console.error("Error deleting items:", err);
      toast.error("Failed to delete items: " + err.message);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Convert value based on field type
      let processedValue = value;
      let updateData = {};
      if (field === "age" || field === "quantity") {
        processedValue = parseFloat(value) || 0;
      } else if (field === "tax_rate") {
        // Convert percentage to decimal with proper parsing
        processedValue = parseFloat(value) / 100;
        updateData = {
          tax_rate: processedValue,
          tax_rate_is_custom: true,
          updated_at: new Date().toISOString(),
        };
      } else if (field === "depreciation_percent") {
        processedValue = parseFloat(value) / 100; // Convert percentage to decimal
      } else if (field === "replacement_cost_applies" || field === "replaced") {
        processedValue = value === "true";
      } else if (field === "category_id") {
        processedValue = parseInt(value);
      }

      // If no special handling was needed, set the regular update data
      if (Object.keys(updateData).length === 0) {
        updateData = {
          updated_at: new Date().toISOString(),
        };
        // Use explicit property assignment instead of computed property
        if (field === "category_id") updateData.category_id = processedValue;
        else if (field === "room") updateData.room = processedValue;
        else if (field === "quantity") updateData.quantity = processedValue;
        else if (field === "age") updateData.age = processedValue;
        else if (field === "condition") updateData.condition = processedValue;
        else if (field === "replacement_cost_applies")
          updateData.replacement_cost_applies = processedValue;
        else if (field === "replaced") updateData.replaced = processedValue;
        else if (field === "no_loss_or_damage")
          updateData.no_loss_or_damage = processedValue;
        else if (field === "not_involved_in_claim")
          updateData.not_involved_in_claim = processedValue;
        else if (field === "duplicate_item")
          updateData.duplicate_item = processedValue;
        else if (field === "cleaning_allowance")
          updateData.cleaning_allowance = processedValue;
        else if (field === "depreciation_percent")
          updateData.depreciation_percent = processedValue;
      }

      // Get current user information for change history
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      // Get user details for the change history
      let userName = "Unknown User";
      if (userId) {
        const { data: userData } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", userId)
          .single();

        if (userData) {
          userName =
            `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
            "Unknown User";
        }
      }

      // First, get the current values of all selected items to record in change history
      const { data: currentItems, error: fetchError } = await supabase
        .from("items")
        .select("id, " + field)
        .in("id", Array.from(selectedItems));

      if (fetchError) throw fetchError;

      // Update all selected items
      const { error } = await supabase
        .from("items")
        .update(updateData)
        .in("id", Array.from(selectedItems));

      if (error) throw error;

      // Record changes in item_change_history for each item
      const changeHistoryEntries = currentItems.map((item) => ({
        item_id: item.id,
        field_name: field,
        old_value: item[field],
        new_value: processedValue,
        changed_at: new Date().toISOString(),
        user_id: userId || null,
        user_name: userName,
      }));

      // Insert change history records
      const { error: historyError } = await supabase
        .from("item_change_history")
        .insert(changeHistoryEntries);

      if (historyError) {
        console.error("Error recording change history:", historyError);
        // Continue execution even if history recording fails
      }

      // Ensure the update takes effect before closing
      setTimeout(() => {
        toast.success(`Updated ${selectedItems.size} items`);
        onUpdate(); // Trigger refresh through parent component
        onClose();
      }, 300);
    } catch (err) {
      console.error("Error updating items:", err);
      toast.error("Failed to update items: " + err.message);
    } finally {
      setLoading(false);
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

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      onClick={() => setShowDeleteConfirm(false)}
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
