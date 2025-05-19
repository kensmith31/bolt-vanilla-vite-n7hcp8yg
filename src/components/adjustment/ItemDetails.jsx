import React, { useRef } from "react";
import { cn } from "../../lib/utils";
import {
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export function ItemDetails({ item, categories, onEdit, onDelete, onRefresh }) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [currentPhotoPage, setCurrentPhotoPage] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Helper function to format field names for display
  const formatFieldName = (fieldName) => {
    // Convert snake_case to Title Case with spaces
    return fieldName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Helper function to format change values based on field type
  const formatChangeValue = (value, fieldName) => {
    if (value === null || value === undefined) return "null";

    // Handle different field types
    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    // Format boolean values
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    // Format currency fields
    if (
      [
        "claimed_rcv",
        "adjusted_rcv",
        "rcv_total",
        "rcv_plus_tax",
        "depreciation_amount",
        "acv",
        "holdback_due",
        "replacement_spent",
        "cleaning_allowance_amount",
      ].includes(fieldName)
    ) {
      return `${parseFloat(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Format percentage fields
    if (["tax_rate", "depreciation_percent"].includes(fieldName)) {
      return `${(parseFloat(value) * 100).toFixed(fieldName === "tax_rate" ? 3 : 0)}%`;
    }

    // Format category_id to show category name if possible
    if (fieldName === "category_id" && categories) {
      const category = categories.find((c) => c.id === parseInt(value));
      return category ? category.name : value;
    }

    // Default to string representation
    return String(value);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedItem({
      description: item.description,
      room: item.room,
      category_id: item.category_id,
      quantity: item.quantity,
      age: item.age,
      condition: item.condition,
      adjusted_rcv: item.adjusted_rcv,
      tax_rate: item.tax_rate,
      depreciation_percent: item.depreciation_percent,
      replacement_cost_applies: item.replacement_cost_applies,
      replaced: item.replaced,
      replacement_spent: item.replacement_spent,
      comparable_link: item.comparable_link,
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedItem({});
    setEditingSection(null);
  };

  const handleInputChange = (field, value) => {
    // Use a safer approach to update the editedItem state
    setEditedItem((prev) => {
      const updatedItem = { ...prev };
      // Explicitly set the field value to avoid "column key does not exist" error
      if (field === "description") updatedItem.description = value;
      else if (field === "room") updatedItem.room = value;
      else if (field === "category_id") updatedItem.category_id = value;
      else if (field === "quantity") updatedItem.quantity = value;
      else if (field === "age") updatedItem.age = value;
      else if (field === "condition") updatedItem.condition = value;
      else if (field === "adjusted_rcv") updatedItem.adjusted_rcv = value;
      else if (field === "tax_rate") updatedItem.tax_rate = value;
      else if (field === "depreciation_percent")
        updatedItem.depreciation_percent = value;
      else if (field === "replacement_cost_applies")
        updatedItem.replacement_cost_applies = value;
      else if (field === "replaced") updatedItem.replaced = value;
      else if (field === "replacement_spent")
        updatedItem.replacement_spent = value;
      else if (field === "comparable_link") updatedItem.comparable_link = value;
      return updatedItem;
    });
  };

  const handleSaveEdit = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);

      // Get current user information from Supabase auth
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Get user's full name from the users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
      }

      const userName = userData
        ? `${userData.first_name || ""} ${userData.last_name || ""}`.trim()
        : user.email;

      // Create a clean update object with only the fields we want to update
      const updateData = {};

      // Only include fields that are actually in editedItem
      if ("description" in editedItem)
        updateData.description = editedItem.description;
      if ("room" in editedItem) updateData.room = editedItem.room;
      if ("category_id" in editedItem)
        updateData.category_id = editedItem.category_id;
      if ("quantity" in editedItem) updateData.quantity = editedItem.quantity;
      if ("age" in editedItem) updateData.age = editedItem.age;
      if ("condition" in editedItem)
        updateData.condition = editedItem.condition;
      if ("adjusted_rcv" in editedItem)
        updateData.adjusted_rcv = editedItem.adjusted_rcv;
      if ("tax_rate" in editedItem) updateData.tax_rate = editedItem.tax_rate;
      if ("depreciation_percent" in editedItem)
        updateData.depreciation_percent = editedItem.depreciation_percent;
      if ("replacement_cost_applies" in editedItem)
        updateData.replacement_cost_applies =
          editedItem.replacement_cost_applies;
      if ("replaced" in editedItem) updateData.replaced = editedItem.replaced;
      if ("replacement_spent" in editedItem)
        updateData.replacement_spent = editedItem.replacement_spent;
      if ("comparable_link" in editedItem)
        updateData.comparable_link = editedItem.comparable_link;

      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();

      console.log("Updating item with data:", updateData);

      // Update the item
      const { error } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Item updated successfully");
      setIsEditing(false);

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error("Error updating item:", err);
      toast.error("Failed to update item: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (isDeleting) return;

    if (
      confirm(
        "Are you sure you want to delete this item? This action cannot be undone.",
      )
    ) {
      try {
        setIsDeleting(true);

        // First delete related records in item_change_history
        const { error: historyError } = await supabase
          .from("item_change_history")
          .delete()
          .eq("item_id", itemId);

        if (historyError) {
          console.error("Error deleting item history:", historyError);
          toast.error("Failed to delete item history: " + historyError.message);
          return;
        }

        // Also delete any messages related to this item
        const { error: messagesError } = await supabase
          .from("messages")
          .delete()
          .eq("item_id", itemId);

        if (messagesError) {
          console.error("Error deleting item messages:", messagesError);
          // Continue with deletion even if messages deletion fails
        }

        // Then delete the item itself
        const { error } = await supabase
          .from("items")
          .delete()
          .eq("id", itemId);

        if (error) throw error;

        toast.success("Item deleted successfully");

        if (onDelete) {
          onDelete(itemId);
        } else if (onRefresh) {
          onRefresh();
        }
      } catch (err) {
        console.error("Error deleting item:", err);
        toast.error("Failed to delete item: " + err.message);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Helper function to format currency values
  const formatCurrency = (value) => {
    if (!value && value !== 0) return "-";
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Reset photo page when item changes
  React.useEffect(() => {
    setCurrentPhotoPage(0);
  }, [item.id]);

  // Get photos for current page (4 per page)
  const getPhotosForCurrentPage = () => {
    if (!item.photos || item.photos.length === 0) return [];

    const startIdx = currentPhotoPage * 4;
    const endIdx = startIdx + 4;
    return item.photos.slice(startIdx, endIdx);
  };

  const currentPagePhotos = getPhotosForCurrentPage();
  const totalPages = Math.ceil((item.photos?.length || 0) / 4);

  const handlePhotoNavigation = (direction) => {
    if (direction === "left" && currentPhotoPage > 0) {
      setCurrentPhotoPage((prev) => prev - 1);
    } else if (direction === "right" && currentPhotoPage < totalPages - 1) {
      setCurrentPhotoPage((prev) => prev + 1);
    }
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
          .from("itemimages")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          throw error;
        }

        // Get the public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from("itemimages")
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);

        // Update progress
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      // Update the item with the new photo URLs
      const currentPhotos = item.photos || [];
      const updatedPhotos = [...currentPhotos, ...uploadedUrls];

      const { error: updateError } = await supabase
        .from("items")
        .update({ photos: updatedPhotos })
        .eq("id", item.id);

      if (updateError) throw updateError;

      toast.success("Photos uploaded successfully");

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error("Error uploading photos:", err);
      toast.error("Failed to upload photos: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async (photoUrl, index) => {
    if (confirm("Are you sure you want to delete this photo?")) {
      try {
        // Calculate the actual index in the full photos array
        const actualIndex = currentPhotoPage * 4 + index;

        // Extract the file name from the URL
        const fileName = photoUrl.split("/").pop();

        // Delete the file from storage
        const { error: storageError } = await supabase.storage
          .from("itemimages")
          .remove([fileName]);

        if (storageError) {
          console.warn("Error deleting from storage:", storageError);
          // Continue anyway as the file might not exist in storage
        }

        // Update the item's photos array
        const updatedPhotos = [...(item.photos || [])];
        updatedPhotos.splice(actualIndex, 1);

        const { error: updateError } = await supabase
          .from("items")
          .update({ photos: updatedPhotos })
          .eq("id", item.id);

        if (updateError) throw updateError;

        toast.success("Photo deleted successfully");

        // If we deleted the last photo on the current page and it's not the first page,
        // go back one page
        if (
          currentPagePhotos.length === 1 &&
          currentPhotoPage > 0 &&
          currentPhotoPage === totalPages - 1
        ) {
          setCurrentPhotoPage(currentPhotoPage - 1);
        }

        if (onRefresh) {
          onRefresh();
        }
      } catch (err) {
        console.error("Error deleting photo:", err);
        toast.error("Failed to delete photo: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Item Card */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-start gap-4 mb-3">
          <div className={isEditing ? "w-1/2" : "flex-1 mr-4"}>
            {isEditing ? (
              <input
                type="text"
                className="w-full text-lg font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                value={editedItem.description || ""}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Item description"
              />
            ) : (
              <h2 className="text-lg font-semibold text-gray-900">
                {item.description}
              </h2>
            )}
          </div>

          {!isEditing ? (
            item.comparable_link && (
              <a
                href={item.comparable_link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap"
              >
                Link to Comparable
              </a>
            )
          ) : (
            <div className="w-1/2">
              <input
                type="text"
                className="w-full text-xs font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                value={editedItem.comparable_link || ""}
                onChange={(e) =>
                  handleInputChange("comparable_link", e.target.value)
                }
                placeholder="Link to Comparable"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  className="p-2 text-gray-600 hover:text-green-600 rounded-full hover:bg-gray-100"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100"
                  onClick={handleEditClick}
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeleting}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4 mt-2">
          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">
              Quantity
            </div>
            {isEditing ? (
              <input
                type="number"
                min="0"
                step="1"
                className="w-full text-xs font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                value={editedItem.quantity || ""}
                onChange={(e) =>
                  handleInputChange(
                    "quantity",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            ) : (
              <div className="text-xs font-semibold text-gray-900">
                {item.quantity || "-"}
              </div>
            )}
          </div>

          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">
              Category
            </div>
            {isEditing ? (
              <select
                className="w-full text-xs font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                value={editedItem.category_id || ""}
                onChange={(e) =>
                  handleInputChange(
                    "category_id",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs font-semibold text-gray-900">
                {categories.find((c) => c.id === item.category_id)?.name || "-"}
              </div>
            )}
          </div>

          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">
              Room
            </div>
            {isEditing ? (
              <input
                type="text"
                className="w-full text-xs font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                value={editedItem.room || ""}
                onChange={(e) => handleInputChange("room", e.target.value)}
              />
            ) : (
              <div className="text-xs font-semibold text-gray-900">
                {item.room || "-"}
              </div>
            )}
          </div>

          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">
              Age
            </div>
            {isEditing ? (
              <input
                type="number"
                min="0"
                step="0.1"
                className="w-full text-xs font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                value={editedItem.age || ""}
                onChange={(e) =>
                  handleInputChange(
                    "age",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            ) : (
              <div className="text-xs font-semibold text-gray-900">
                {item.age ? `${item.age} years` : "-"}
              </div>
            )}
          </div>

          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">
              Condition
            </div>
            {isEditing ? (
              <select
                className="w-full text-xs font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                value={editedItem.condition || ""}
                onChange={(e) => handleInputChange("condition", e.target.value)}
              >
                <option value="">Select condition</option>
                <option value="poor">Poor</option>
                <option value="fair">Fair</option>
                <option value="good">Good</option>
                <option value="new">New</option>
              </select>
            ) : (
              <div className="text-xs font-semibold text-gray-900">
                {item.condition?.charAt(0).toUpperCase() +
                  item.condition?.slice(1) || "-"}
              </div>
            )}
          </div>

          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">
              Status
            </div>
            <div
              className={cn(
                "inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full",
                {
                  "bg-red-100 text-red-800": item.status === "submitted",
                  "bg-yellow-100 text-yellow-800": item.status === "in_review",
                  "bg-green-100 text-green-800": item.status === "priced",
                  "bg-blue-100 text-blue-800": item.status === "adjusted",
                  "bg-purple-100 text-purple-800":
                    item.status === "holdback_paid",
                },
              )}
            >
              {item.status?.replace("_", " ").toUpperCase() || "-"}
            </div>
          </div>
        </div>

        {/* Photos Section */}
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-5 gap-3">
        {/* Valuation Section */}
        <div className="bg-white rounded-lg shadow p-2">
          <h3 className="text-[10px] font-semibold text-gray-900 mb-2 text-center">
            Valuation
          </h3>
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                Claimed RCV:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {formatCurrency(item.claimed_rcv)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                Adjusted RCV:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full text-[10px] font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                    value={editedItem.adjusted_rcv || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "adjusted_rcv",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                ) : (
                  formatCurrency(item.adjusted_rcv)
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                Quantity:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {item.quantity || "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                RCV Total:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {formatCurrency(item.rcv_total)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                Tax Rate:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {isEditing ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.001"
                      className="w-full text-[10px] font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                      value={
                        editedItem.tax_rate
                          ? (editedItem.tax_rate * 100).toFixed(3)
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(
                          "tax_rate",
                          e.target.value ? Number(e.target.value) / 100 : null,
                        )
                      }
                    />
                    <span className="ml-1">%</span>
                  </div>
                ) : item.tax_rate ? (
                  `${(item.tax_rate * 100).toFixed(3)}%`
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                RCV + Tax:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {formatCurrency(item.rcv_plus_tax)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Depreciation Section */}
        <div className="bg-white rounded-lg shadow p-2">
          <h3 className="text-[10px] font-semibold text-gray-900 mb-2 text-center">
            Depreciation
          </h3>
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                Depreciation %:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {isEditing ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="w-full text-[10px] font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                      value={
                        editedItem.depreciation_percent
                          ? (editedItem.depreciation_percent * 100).toFixed(0)
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(
                          "depreciation_percent",
                          e.target.value ? Number(e.target.value) / 100 : null,
                        )
                      }
                    />
                    <span className="ml-1">%</span>
                  </div>
                ) : item.depreciation_percent ? (
                  `${(item.depreciation_percent * 100).toFixed(0)}%`
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                Depreciation Amount:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {formatCurrency(item.depreciation_amount)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">ACV:</dt>
              <dd className="text-[10px] text-gray-900">
                {formatCurrency(item.acv)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                RC Applies:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {isEditing &&
                (editingSection === "depreciation" ||
                  editingSection === null) ? (
                  <select
                    className="w-full text-[10px] font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                    value={
                      editedItem.replacement_cost_applies ? "true" : "false"
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "replacement_cost_applies",
                        e.target.value === "true",
                      )
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : item.replacement_cost_applies ? (
                  "Yes"
                ) : (
                  "No"
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Recovery Section */}
        <div className="bg-white rounded-lg shadow p-2">
          <h3 className="text-[10px] font-semibold text-gray-900 mb-2 text-center">
            Recovery
          </h3>
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                Replaced:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {isEditing &&
                (editingSection === "recovery" || editingSection === null) ? (
                  <select
                    className="w-full text-[10px] font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                    value={editedItem.replaced ? "true" : "false"}
                    onChange={(e) =>
                      handleInputChange("replaced", e.target.value === "true")
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : item.replaced ? (
                  "Yes"
                ) : (
                  "No"
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                Replacement Spent:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {isEditing &&
                (editingSection === "recovery" || editingSection === null) ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full text-[10px] font-semibold text-gray-900 border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                    value={editedItem.replacement_spent || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "replacement_spent",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                ) : (
                  formatCurrency(item.replacement_spent)
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">
                Holdback Due:
              </dt>
              <dd className="text-[10px] text-gray-900">
                {formatCurrency(item.holdback_due)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Change History Section */}
        <div className="bg-white rounded-lg shadow p-2">
          <h3 className="text-[10px] font-semibold text-gray-900 mb-2 text-center">
            Change History
          </h3>
          <div className="space-y-2 h-[120px] overflow-y-auto pr-2">
            {item.change_history && item.change_history.length > 0 ? (
              item.change_history.map((change, index) => (
                <div
                  key={index}
                  className="text-[10px] border-b border-gray-100 pb-1.5 last:border-0"
                >
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="font-medium text-gray-900">
                      {change.user_name || "System"}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(change.changed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    {change.old_value === null ? (
                      <>
                        Added{" "}
                        <span className="font-medium">{change.field_name}</span>
                        :{" "}
                        <span className="font-medium">
                          {formatChangeValue(
                            change.new_value,
                            change.field_name,
                          )}
                        </span>
                      </>
                    ) : change.new_value === null ? (
                      <>
                        Removed{" "}
                        <span className="font-medium">{change.field_name}</span>
                        :{" "}
                        <span className="line-through">
                          {formatChangeValue(
                            change.old_value,
                            change.field_name,
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        Changed{" "}
                        <span className="font-medium">
                          {formatFieldName(change.field_name)}
                        </span>{" "}
                        from{" "}
                        <span className="line-through">
                          {formatChangeValue(
                            change.old_value,
                            change.field_name,
                          )}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {formatChangeValue(
                            change.new_value,
                            change.field_name,
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-gray-500 text-center py-2">
                No change history available
              </div>
            )}
          </div>
        </div>

        {/* Photos Section - UPDATED FOR PAGINATION */}
        <div className="bg-white rounded-lg shadow p-2">
          <h3 className="text-[10px] font-semibold text-gray-900 mb-2 text-center">
            Photos
          </h3>
          <div className="space-y-1.5">
            {item.photos && item.photos.length > 0 ? (
              <div className="relative">
                {/* Only show navigation buttons if we have more than 4 photos */}
                {item.photos.length > 4 && (
                  <>
                    <button
                      onClick={() => handlePhotoNavigation("left")}
                      className={`absolute left-0 top-1/2 z-10 p-1 bg-white/80 rounded-full shadow transform -translate-y-1/2 -translate-x-1/2 ${
                        currentPhotoPage === 0
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-white"
                      }`}
                      disabled={currentPhotoPage === 0}
                    >
                      <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handlePhotoNavigation("right")}
                      className={`absolute right-0 top-1/2 z-10 p-1 bg-white/80 rounded-full shadow transform -translate-y-1/2 translate-x-1/2 ${
                        currentPhotoPage >= totalPages - 1
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-white"
                      }`}
                      disabled={currentPhotoPage >= totalPages - 1}
                    >
                      <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                    </button>
                  </>
                )}

                {/* Grid for the photos - display only current page photos */}
                <div className="grid grid-cols-4 gap-1 py-2">
                  {currentPagePhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Item photo ${currentPhotoPage * 4 + index + 1}`}
                        className="h-16 w-16 object-cover rounded-lg shadow-sm"
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo, index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete photo"
                      >
                        <XMarkIcon className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex justify-center flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-gray-500">
                      {item.photos.length > 0
                        ? `${currentPhotoPage * 4 + 1}-${Math.min(
                            (currentPhotoPage + 1) * 4,
                            item.photos.length,
                          )} of ${item.photos.length}`
                        : "0 photos"}
                    </span>
                  </div>

                  {/* Pagination indicators */}
                  {totalPages > 1 && (
                    <div className="flex gap-1 justify-center mb-2">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPhotoPage(i)}
                          className={`h-1.5 rounded-full ${
                            currentPhotoPage === i
                              ? "w-4 bg-blue-500"
                              : "w-1.5 bg-gray-300"
                          }`}
                          aria-label={`Go to page ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    onClick={handleFileSelect}
                    disabled={isUploading}
                  >
                    <ArrowUpTrayIcon className="h-3 w-3" />
                    Add More Photos
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  className="flex items-center gap-2 px-2 py-1 text-[10px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 w-full justify-center"
                  onClick={handleFileSelect}
                  disabled={isUploading}
                >
                  <PhotoIcon className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Add Photos"}
                </button>
                {isUploading && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-center mt-1">
                      {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
