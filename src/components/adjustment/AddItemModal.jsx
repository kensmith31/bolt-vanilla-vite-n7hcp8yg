import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import {
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  PhotoIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export function AddItemModal({
  isOpen,
  onClose,
  claimId,
  onItemAdded,
  userRole,
}) {
  const [formData, setFormData] = useState({
    description: "",
    category_id: "",
    room: "",
    quantity: 1,
    claimed_rcv: "",
    age: "",
    condition: "good",
    comparable_link: "",
    adjuster_notes: "",
    photos: [],
  });

  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState("");
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Fetch categories and rooms when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchRooms();
    }
  }, [isOpen, claimId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error("Failed to load categories");
    }
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("room")
        .eq("claim_id", claimId)
        .not("room", "is", null);

      if (error) throw error;
      const uniqueRooms = [...new Set(data.map((item) => item.room))].filter(
        Boolean,
      );
      setRooms(uniqueRooms);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      toast.error("Failed to load rooms");
    }
  };

  const handleAddRoom = () => {
    if (!newRoom.trim()) return;

    setRooms((prev) => [...prev, newRoom.trim()]);
    setFormData((prev) => ({ ...prev, room: newRoom.trim() }));
    setNewRoom("");
    setShowAddRoom(false);
  };

  const handleRoomChange = (e) => {
    const value = e.target.value;
    if (value === "__add_new__") {
      setShowAddRoom(true);
      setFormData((prev) => ({ ...prev, room: "" }));
    } else {
      setFormData((prev) => ({ ...prev, room: value }));
    }
  };

  // Map user roles to valid submission_source enum values
  const getSubmissionSource = (userRole) => {
    const roleMap = {
      admin: "adjuster",
      desk_adjuster: "adjuster",
      field_adjuster: "field_adjuster",
      policyholder: "policyholder",
    };
    return roleMap[userRole] || "adjuster";
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    // Filter out files larger than 5MB
    const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);

    if (validFiles.length < files.length) {
      toast.error("Some files were skipped because they exceed the 5MB limit");
    }

    // Create preview URLs for valid files
    const newFiles = validFiles.map((file) => ({
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      uploading: false,
    }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadPhotos = async () => {
    if (selectedFiles.length === 0) return [];

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const fileObj of selectedFiles) {
        const file = fileObj.file;
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `items/${claimId}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from("item-photos")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Error uploading file:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("item-photos").getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (err) {
      console.error("Error in photo upload:", err);
      toast.error("Some photos failed to upload");
      return uploadedUrls;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const addAnother = e.nativeEvent.submitter?.name === "addAnother";

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Get claim's tax rate
      const { data: claimData, error: claimError } = await supabase
        .from("claims")
        .select("default_tax_rate")
        .eq("file_number", claimId)
        .single();

      if (claimError) throw claimError;

      const itemData = {
        ...formData,
        claim_id: claimId,
        tax_rate: claimData.default_tax_rate
          ? claimData.default_tax_rate / 100
          : null,
        quantity: parseFloat(formData.quantity),
        claimed_rcv: formData.claimed_rcv
          ? parseFloat(formData.claimed_rcv)
          : null,
        age: formData.age ? parseFloat(formData.age) : null,
        submitted_by: getSubmissionSource(userRole),
      };

      // Step 1: Insert the item first
      const { data: newItem, error } = await supabase
        .from("items")
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;

      // Step 2: Upload photos if there are any
      let photoUrls = [];
      if (selectedFiles.length > 0) {
        setUploading(true);
        photoUrls = await uploadPhotos();
        setUploading(false);

        // Step 3: Update the item with the photo URLs
        if (photoUrls.length > 0) {
          const { error: updateError } = await supabase
            .from("items")
            .update({ photos: photoUrls })
            .eq("id", newItem.id);

          if (updateError) {
            console.error("Error updating item with photos:", updateError);
            toast.error("Item added but photos could not be saved");
          } else {
            toast.success("Item and photos added successfully");
          }
        } else {
          toast.success("Item added successfully");
        }
      } else {
        toast.success("Item added successfully");
      }

      // Trigger grid refresh
      const gridComponent = document.querySelector(
        '[data-testid="inventory-grid"]',
      );
      if (gridComponent) {
        gridComponent.dispatchEvent(new CustomEvent("refreshData"));
      }

      const resetForm = () => {
        setFormData({
          description: "",
          category_id: "",
          room: "",
          quantity: 1,
          claimed_rcv: "",
          age: "",
          condition: "good",
          adjuster_notes: "",
          photos: [],
        });

        // Clear selected files and revoke object URLs
        selectedFiles.forEach((fileObj) => {
          URL.revokeObjectURL(fileObj.preview);
        });
        setSelectedFiles([]);
      };

      if (addAnother) {
        resetForm();
        // Focus the description field
        document.querySelector('input[name="description"]').focus();
      } else {
        onClose();
        resetForm();
      }
    } catch (err) {
      console.error("Error adding item:", err);
      toast.error("Failed to add item: " + err.message);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
              <Dialog.Panel className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-3">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Add New Item
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Description - Full width */}
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <input
                        name="description"
                        type="text"
                        required
                        placeholder="Description"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Grid for Category, Room, Quantity, Claimed RCV */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <select
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={formData.category_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            category_id: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="relative">
                        <select
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          value={formData.room}
                          onChange={handleRoomChange}
                        >
                          <option value="">Select Room</option>
                          {rooms.map((room, index) => (
                            <option key={index} value={room}>
                              {room}
                            </option>
                          ))}
                          <option value="__add_new__">+ Add New Room</option>
                        </select>
                        {showAddRoom && (
                          <div className="absolute top-0 left-0 right-0 z-10 bg-white border rounded-md shadow-sm p-1 flex gap-1">
                            <input
                              type="text"
                              value={newRoom}
                              onChange={(e) => setNewRoom(e.target.value)}
                              placeholder="Enter new room name"
                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddRoom();
                                } else if (e.key === "Escape") {
                                  setShowAddRoom(false);
                                  setNewRoom("");
                                }
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddRoom(false);
                                setNewRoom("");
                                setFormData((prev) => ({ ...prev, room: "" }));
                              }}
                              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleAddRoom}
                              className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="Quantity"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, quantity: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Claimed RCV"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={formData.claimed_rcv}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            claimed_rcv: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Grid for Age, Condition */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Age (years)"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={formData.age}
                        onChange={(e) =>
                          setFormData({ ...formData, age: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <select
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={formData.condition}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            condition: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Condition</option>
                        <option value="poor">Poor</option>
                        <option value="fair">Fair</option>
                        <option value="good">Good</option>
                        <option value="new">New</option>
                      </select>
                    </div>
                  </div>

                  {/* Adjuster Notes */}
                  <div>
                    <textarea
                      rows={2}
                      placeholder="Adjuster Notes"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      value={formData.adjuster_notes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          adjuster_notes: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Photos
                    </label>
                    <div className="flex items-center">
                      <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <PhotoIcon className="h-5 w-5 mr-2 text-gray-500" />
                        Add Photos
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          multiple
                          className="sr-only"
                          onChange={handleFileChange}
                          disabled={uploading}
                        />
                      </label>
                      <span className="ml-2 text-xs text-gray-500">
                        JPG or PNG, max 5MB each
                      </span>
                    </div>

                    {/* Preview selected images */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {selectedFiles.map((fileObj, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={fileObj.preview}
                              alt={`Preview ${index}`}
                              className="h-20 w-20 object-cover rounded-md border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/3 -translate-y-1/3 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                            <span className="text-xs truncate block mt-1">
                              {fileObj.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="submit"
                      name="addAnother"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Add and Add Another"}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Add Item"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
