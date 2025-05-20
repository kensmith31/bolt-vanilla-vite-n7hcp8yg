import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";
import { useSelection } from "../../contexts/SelectionContext";
import { ItemDetails } from "./ItemDetails";
import { ItemReceiptModal } from "./ItemReceiptModal";
import { ReceiptViewerModal } from "./ReceiptViewerModal";
import toast from "react-hot-toast";
import { useFilterStore } from "../../stores/filterStore";

export default function InventoryGrid({
  claimId,
  mode = "inventory",
  searchQuery = "",
  className = "",
}) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredItems, setFilteredItems] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [changeHistory, setChangeHistory] = useState({});
  const gridRef = useRef(null);
  const [editingCell, setEditingCell] = useState(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [showAddRoomInput, setShowAddRoomInput] = useState(false);
  const lastMode = useRef(mode);
  const refreshKey = useRef(0);
  const { selectedRows, toggleRowSelection, shiftSelectRows } = useSelection();
  const [updating, setUpdating] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptModalItem, setReceiptModalItem] = useState(null);
  const [isReceiptViewerOpen, setIsReceiptViewerOpen] = useState(false);
  const [viewingReceipts, setViewingReceipts] = useState([]);
  const [currentReceiptIndex, setCurrentReceiptIndex] = useState(0);
  const [isUpdatingAmountSpent, setIsUpdatingAmountSpent] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "item_number",
    direction: "ascending",
  });
  const { filters, clearFilters } = useFilterStore();

  const editableCells = {
    enter_identify: [
      "description",
      "room",
      "category",
      "quantity",
      "claimed_rcv",
      "age",
      "condition",
    ],
    review_verify: [
      "description",
      "category",
      "no_loss_or_damage",
      "not_involved_in_claim",
      "duplicate_item",
      "cleaning_allowance",
      "cleaning_allowance_amount",
    ],
    price_verify: ["adjusted_rcv", "tax_rate", "comparable_link"],
    depreciation: ["depreciation_percent", "replacement_cost_applies"],
    recovery: ["replaced", "replacement_spent"],
  };

  const fieldMapping = {
    description: "description",
    room: "room",
    category_id: "category_id",
    quantity: "quantity",
    claimed_rcv: "claimed_rcv",
    age: "age",
    condition: "condition",
    adjusted_rcv: "adjusted_rcv",
    rcv_total: "rcv_total",
    tax_rate: "tax_rate",
    rcv_plus_tax: "rcv_plus_tax",
    depreciation_percent: "depreciation_percent",
    depreciation_amount: "depreciation_amount",
    acv: "acv",
    replacement_cost_applies: "replacement_cost_applies",
    replaced: "replaced",
    replacement_spent: "replacement_spent",
    no_loss_or_damage: "no_loss_or_damage",
    not_involved_in_claim: "not_involved_in_claim",
    duplicate_item: "duplicate_item",
    cleaning_allowance: "cleaning_allowance",
    cleaning_allowance_amount: "cleaning_allowance_amount",
    comparable_link: "comparable_link",
  };

  const numericFields = [
    "quantity",
    "claimed_rcv",
    "age",
    "adjusted_rcv",
    "tax_rate",
    "depreciation_percent",
    "replacement_spent",
    "cleaning_allowance_amount",
  ];

  const handleCellClick = async (e, field, item) => {
    if (!editableCells[mode]?.includes(field)) return;

    // Handle tax rate editing
    if (field === "tax_rate") {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.001";
      input.min = "0";
      input.max = "100";
      input.value = (item.tax_rate * 100).toFixed(3);
      input.className =
        "w-full h-full text-right pr-6 border-none focus:ring-0";

      const wrapper = document.createElement("div");
      wrapper.className = "relative w-full h-full";
      wrapper.appendChild(input);

      const percentSign = document.createElement("span");
      percentSign.textContent = "%";
      percentSign.className =
        "absolute right-2 top-1/2 -translate-y-1/2 text-gray-500";
      wrapper.appendChild(percentSign);

      e.target.innerHTML = "";
      e.target.appendChild(wrapper);
      input.focus();
      input.select();

      const handleBlur = async () => {
        try {
          const newValue = parseFloat(input.value) / 100;
          if (isNaN(newValue)) return;

          const { error } = await supabase
            .from("items")
            .update({ tax_rate: newValue })
            .eq("id", item.id);

          if (error) throw error;
          refreshData();
        } catch (err) {
          console.error("Error updating tax rate:", err);
          toast.error("Failed to update tax rate");
        }
      };

      input.addEventListener("blur", handleBlur);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          input.blur();
        } else if (e.key === "Escape") {
          refreshData();
        }
      });
      return;
    }

    setEditingCell({ id: item.id, field });
  };

  const renderCell = (item, field) => {
    switch (field) {
      case "tax_rate":
        return mode === "price_verify" ? (
          <div
            className={cn(
              "w-full h-full flex items-center justify-end cursor-pointer hover:bg-gray-50 px-2",
              editableCells[mode]?.includes(field) && "hover:bg-blue-50/50",
            )}
            onClick={(e) => handleCellClick(e, field, item)}
          >
            {item.tax_rate != null
              ? `${(item.tax_rate * 100).toFixed(3)}%`
              : "-"}
          </div>
        ) : (
          <div className="text-right px-2">
            {item.tax_rate != null
              ? `${(item.tax_rate * 100).toFixed(3)}%`
              : "-"}
          </div>
        );
      default:
        return item[field] || "-";
    }
  };

  useEffect(() => {
    console.log("useEffect triggered with mode:", mode);
    fetchItems();
    fetchCategories();

    if (claimId) {
      fetchRoomsForClaim(claimId);
    }
  }, [claimId, mode, refreshKey.current]);

  useEffect(() => {
    // Apply both search query and filters
    const applyFiltersAndSearch = () => {
      const hasActiveFilters = Object.values(filters).some(
        (filter) => filter !== "" && filter !== null && filter !== undefined,
      );

      if (!searchQuery?.trim() && !hasActiveFilters) {
        setFilteredItems(items);
        return;
      }

      const query = searchQuery?.toLowerCase().trim() || "";

      if (query.startsWith("#")) {
        const itemNumber = parseInt(query.substring(1));
        const filtered = items.filter(
          (item) => item.item_number === itemNumber,
        );
        setFilteredItems(filtered);
        if (filtered.length === 0) {
          toast(`No items found with number ${itemNumber}`);
        }
        return;
      }

      const filtered = items.filter((item) => {
        const matchesSearch =
          !query ||
          (item.item_number?.toString() || "").includes(query) ||
          (item.description?.toLowerCase() || "").includes(query) ||
          (item.room?.toLowerCase() || "").includes(query) ||
          (
            categories
              .find((c) => c.id === item.category_id)
              ?.name?.toLowerCase() || ""
          ).includes(query) ||
          (item.quantity?.toString() || "").includes(query) ||
          (item.claimed_rcv?.toString() || "").includes(query) ||
          (item.adjusted_rcv?.toString() || "").includes(query) ||
          (item.rcv_total?.toString() || "").includes(query) ||
          (item.rcv_plus_tax?.toString() || "").includes(query) ||
          (item.depreciation_amount?.toString() || "").includes(query) ||
          (item.acv?.toString() || "").includes(query) ||
          (item.holdback_due?.toString() || "").includes(query) ||
          (item.replacement_spent?.toString() || "").includes(query) ||
          (item.age?.toString() || "").includes(query) ||
          (item.status?.toLowerCase() || "").includes(query) ||
          (item.condition?.toLowerCase() || "").includes(query) ||
          (item.adjuster_notes?.toLowerCase() || "").includes(query) ||
          (item.comparable_link?.toLowerCase() || "").includes(query);

        if (!matchesSearch) return false;

        return applyFiltersToItem(item);
      });

      setFilteredItems(filtered);

      if (
        filtered.length === 0 &&
        items.length > 0 &&
        (hasActiveFilters || query)
      ) {
        toast("No items match the current criteria", {
          id: "no-items-match",
          duration: 3000,
        });
      }
    };

    const applyFiltersToItem = (item) => {
      if (!item) return false;

      if (filters.room && item.room !== filters.room) {
        return false;
      }

      if (
        filters.category_id &&
        item.category_id !== parseInt(filters.category_id)
      ) {
        return false;
      }

      if (filters.status && item.status !== filters.status) {
        return false;
      }

      if (filters.condition && item.condition !== filters.condition) {
        return false;
      }

      if (filters.tax_rate) {
        const taxRateFilter = parseFloat(filters.tax_rate);
        if (
          item.tax_rate === null ||
          Math.abs(item.tax_rate - taxRateFilter) > 0.0001
        ) {
          return false;
        }
      }

      if (filters.depreciation_percent) {
        const depPercentFilter = parseFloat(filters.depreciation_percent) / 100;
        if (
          item.depreciation_percent === null ||
          Math.abs(item.depreciation_percent - depPercentFilter) > 0.0001
        ) {
          return false;
        }
      }

      if (filters.age) {
        const ageFilter = parseInt(filters.age);
        if (item.age === null || item.age !== ageFilter) {
          return false;
        }
      }

      if (filters.replacement_cost_applies) {
        const rcAppliesFilter = filters.replacement_cost_applies === "true";
        if (item.replacement_cost_applies !== rcAppliesFilter) {
          return false;
        }
      }

      if (filters.replaced) {
        const replacedFilter = filters.replaced === "true";
        if (item.replaced !== replacedFilter) {
          return false;
        }
      }

      if (filters.no_loss_or_damage) {
        const noLossFilter = filters.no_loss_or_damage === "true";
        if (item.no_loss_or_damage !== noLossFilter) {
          return false;
        }
      }

      if (filters.not_involved_in_claim) {
        const notInvolvedFilter = filters.not_involved_in_claim === "true";
        if (item.not_involved_in_claim !== notInvolvedFilter) {
          return false;
        }
      }

      if (filters.duplicate_item) {
        const duplicateFilter = filters.duplicate_item === "true";
        if (item.duplicate_item !== duplicateFilter) {
          return false;
        }
      }

      if (filters.cleaning_allowance) {
        const cleaningFilter = filters.cleaning_allowance === "true";
        if (item.cleaning_allowance !== cleaningFilter) {
          return false;
        }
      }

      return true;
    };

    applyFiltersAndSearch();
  }, [searchQuery, items, filters, categories]);

  async function fetchRoomsForClaim(claimId) {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("room")
        .eq("claim_id", claimId)
        .not("room", "is", null);

      if (error) throw error;

      if (data && data.length > 0) {
        const uniqueRooms = [...new Set(data.map((item) => item.room))].filter(
          Boolean,
        );
        console.log("Fetched rooms for claim:", uniqueRooms);
        setRooms(uniqueRooms);
      } else {
        console.log("No rooms found for this claim");
        setRooms([]);
      }
    } catch (err) {
      console.error("Error fetching rooms for claim:", err);
      toast.error("Failed to load rooms");
    }
  }

  async function addNewRoom(roomName) {
    if (!roomName || roomName.trim() === "") {
      toast.error("Room name cannot be empty");
      return;
    }

    const newRooms = [...rooms, roomName.trim()];
    setRooms(newRooms);
    setNewRoomName("");
    setShowAddRoomInput(false);

    toast.success(`Added new room: ${roomName.trim()}`);
  }

  async function fetchCategories() {
    try {
      setCategoriesLoading(true);
      console.log("Fetching categories...");

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching categories from Supabase:", error);
        toast.error(`Failed to load categories: ${error.message}`);
        throw error;
      }

      console.log("Categories data received:", data);

      if (!data) {
        console.warn("No data returned from categories query (data is null)");
        toast.error("No category data returned from the database");
        setCategories([]);
        return;
      }

      if (data.length === 0) {
        console.warn("Categories table exists but is empty (0 records)");
        toast.error(
          "No categories found in the database. Please add some categories first.",
        );
      } else {
        console.log(`Successfully fetched ${data.length} categories`);
        if (data.length > 0) {
          console.log("First few categories:");
          data.slice(0, 3).forEach((cat, index) => {
            console.log(
              `Category ${index + 1}: ID=${cat.id}, Name=${cat.name}`,
            );
          });
        }
      }

      setCategories(data);

      console.log("Categories fetch completed successfully");
    } catch (err) {
      console.error("Error in fetchCategories():", err);
      toast.error(`Failed to load categories: ${err.message}`);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function applyDefaultTaxRate() {
    try {
      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .select("default_tax_rate")
        .eq("file_number", claimId)
        .single();

      if (claimError) {
        throw claimError;
      }

      const defaultTaxRate = claim.default_tax_rate;

      if (defaultTaxRate === null || defaultTaxRate === undefined) {
        console.warn("No default tax rate set for this claim");
        return;
      }

      // Only update items where tax_rate_is_custom is false or null
      const { error: updateError } = await supabase
        .from("items")
        .update({
          tax_rate: defaultTaxRate,
          updated_at: new Date().toISOString(),
        })
        .eq("claim_id", claimId)
        .is("tax_rate_is_custom", null); // Only update where tax_rate_is_custom is null

      if (updateError) {
        throw updateError;
      }

      // Second query to catch false values
      const { error: updateError2 } = await supabase
        .from("items")
        .update({
          tax_rate: defaultTaxRate,
          updated_at: new Date().toISOString(),
        })
        .eq("claim_id", claimId)
        .eq("tax_rate_is_custom", false); // Only update where tax_rate_is_custom is false

      if (updateError2) {
        throw updateError2;
      }

      console.log("Applied default tax rate to non-custom items only");
      toast.success("Applied default tax rate to applicable items", {
        id: "apply-default-tax-rate", // Adding an ID prevents duplicate toasts
      });
    } catch (err) {
      console.error("Error applying default tax rate:", err);
      toast.error("Failed to apply default tax rate");
    }
  }

  const handleCellEdit = async (itemId, field, value) => {
    try {
      setLoading(true);

      const dbField = fieldMapping[field];
      if (!dbField) {
        throw new Error(`Invalid field: ${field}`);
      }

      let parsedValue = value;

      // Handle numeric fields
      if (numericFields.includes(field)) {
        if (value === "" || value === null || value === undefined) {
          parsedValue = null;
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            toast.error("Please enter a valid number");
            return;
          }
          parsedValue = numValue;
        }
      }

      // Handle boolean fields explicitly
      if (
        field === "no_loss_or_damage" ||
        field === "not_involved_in_claim" ||
        field === "duplicate_item" ||
        field === "cleaning_allowance" ||
        field === "replacement_cost_applies" ||
        field === "replaced"
      ) {
        // Ensure boolean values are properly typed
        parsedValue = Boolean(parsedValue);
      }

      const { data: currentItem, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", itemId)
        .limit(1)
        .single();

      if (fetchError) {
        console.error("Error fetching item:", fetchError);
        toast.error("Failed to fetch item before update");
        return;
      }

      if (!currentItem) {
        console.error("Item not found with ID:", itemId);
        toast.error("Item not found");
        fetchItems();
        return;
      }

      // For boolean fields, compare actual boolean values
      if (
        typeof parsedValue === "boolean" &&
        typeof currentItem[dbField] === "boolean"
      ) {
        if (parsedValue === currentItem[dbField]) {
          setLoading(false);
          return;
        }
      } else if (currentItem[dbField]?.toString() === parsedValue?.toString()) {
        setLoading(false);
        return;
      }

      // Prepare update data
      let updateData = {};
      // Use explicit property assignment instead of computed property to avoid SQL errors
      if (dbField === "description") updateData.description = parsedValue;
      else if (dbField === "room") updateData.room = parsedValue;
      else if (dbField === "category_id") updateData.category_id = parsedValue;
      else if (dbField === "quantity") updateData.quantity = parsedValue;
      else if (dbField === "claimed_rcv") updateData.claimed_rcv = parsedValue;
      else if (dbField === "age") updateData.age = parsedValue;
      else if (dbField === "condition") updateData.condition = parsedValue;
      else if (dbField === "adjusted_rcv")
        updateData.adjusted_rcv = parsedValue;
      else if (dbField === "tax_rate") updateData.tax_rate = parsedValue;
      else if (dbField === "depreciation_percent")
        updateData.depreciation_percent = parsedValue;
      else if (dbField === "replacement_cost_applies")
        updateData.replacement_cost_applies = parsedValue;
      else if (dbField === "replaced") updateData.replaced = parsedValue;
      else if (dbField === "replacement_spent")
        updateData.replacement_spent = parsedValue;
      else if (dbField === "no_loss_or_damage")
        updateData.no_loss_or_damage = parsedValue;
      else if (dbField === "not_involved_in_claim")
        updateData.not_involved_in_claim = parsedValue;
      else if (dbField === "duplicate_item")
        updateData.duplicate_item = parsedValue;
      else if (dbField === "cleaning_allowance")
        updateData.cleaning_allowance = parsedValue;
      else if (dbField === "cleaning_allowance_amount")
        updateData.cleaning_allowance_amount = parsedValue;
      else if (dbField === "comparable_link") {
        // Format the URL before saving
        updateData.comparable_link = formatUrl(parsedValue);
      } else {
        console.warn(`Unhandled field: ${dbField}`);
      }

      updateData.updated_at = new Date().toISOString();

      // Handle special status updates based on checkbox fields
      if (field === "no_loss_or_damage" && parsedValue === true) {
        // Set status to No Loss/Damage
        updateData.status = "in_review";
        updateData.status_display = "No Loss/Damage";
        // Reset other conflicting flags
        updateData.not_involved_in_claim = false;
        updateData.duplicate_item = false;
        updateData.cleaning_allowance = false;
        updateData.cleaning_allowance_amount = null;
      } else if (field === "not_involved_in_claim" && parsedValue === true) {
        // Set status to Not Involved in Claim
        updateData.status = "in_review";
        updateData.status_display = "Not Involved in Claim";
        // Reset other conflicting flags
        updateData.no_loss_or_damage = false;
        updateData.duplicate_item = false;
        updateData.cleaning_allowance = false;
        updateData.cleaning_allowance_amount = null;
      } else if (field === "duplicate_item" && parsedValue === true) {
        // Set status to Duplicate
        updateData.status = "in_review";
        updateData.status_display = "Duplicate";
        // Reset other conflicting flags
        updateData.no_loss_or_damage = false;
        updateData.not_involved_in_claim = false;
        updateData.cleaning_allowance = false;
        updateData.cleaning_allowance_amount = null;
      } else if (field === "cleaning_allowance" && parsedValue === true) {
        // Set status to Clean Only
        updateData.status = "in_review";
        updateData.status_display = "Clean Only";
        // Reset other conflicting flags
        updateData.no_loss_or_damage = false;
        updateData.not_involved_in_claim = false;
        updateData.duplicate_item = false;
        // Don't reset cleaning_allowance_amount if it exists
      } else if (field === "cleaning_allowance" && parsedValue === false) {
        // If cleaning allowance is unchecked, reset the cleaning allowance amount
        updateData.cleaning_allowance_amount = null;
        // We no longer reset the adjusted_rcv when cleaning allowance is unchecked
      } else if (
        field === "cleaning_allowance_amount" &&
        currentItem.cleaning_allowance
      ) {
        // If cleaning allowance amount is updated and cleaning allowance is checked,
        // we don't update the adjusted_rcv to match the cleaning allowance amount
      }

      // Handle status updates for unchecking special flags
      if (
        (field === "no_loss_or_damage" && parsedValue === false) ||
        (field === "not_involved_in_claim" && parsedValue === false) ||
        (field === "duplicate_item" && parsedValue === false) ||
        (field === "cleaning_allowance" && parsedValue === false)
      ) {
        // If any special flag is unchecked, check if we need to update the status
        const hasAnySpecialFlag =
          currentItem.no_loss_or_damage ||
          currentItem.not_involved_in_claim ||
          currentItem.duplicate_item ||
          currentItem.cleaning_allowance;

        // If this was the only special flag and it's being unchecked, reset status
        if (
          hasAnySpecialFlag &&
          ((field === "no_loss_or_damage" && currentItem.no_loss_or_damage) ||
            (field === "not_involved_in_claim" &&
              currentItem.not_involved_in_claim) ||
            (field === "duplicate_item" && currentItem.duplicate_item) ||
            (field === "cleaning_allowance" && currentItem.cleaning_allowance))
        ) {
          // Check if any other special flag is still active
          const otherFlagsActive =
            (field !== "no_loss_or_damage" && currentItem.no_loss_or_damage) ||
            (field !== "not_involved_in_claim" &&
              currentItem.not_involved_in_claim) ||
            (field !== "duplicate_item" && currentItem.duplicate_item) ||
            (field !== "cleaning_allowance" && currentItem.cleaning_allowance);

          if (!otherFlagsActive) {
            // If no other special flags are active, reset the status
            updateData.status = "in_review";
            updateData.status_display = null;
          } else {
            // Update status display based on which flags are still active
            if (
              field !== "no_loss_or_damage" &&
              currentItem.no_loss_or_damage
            ) {
              updateData.status_display = "No Loss/Damage";
            } else if (
              field !== "not_involved_in_claim" &&
              currentItem.not_involved_in_claim
            ) {
              updateData.status_display = "Not Involved in Claim";
            } else if (
              field !== "duplicate_item" &&
              currentItem.duplicate_item
            ) {
              updateData.status_display = "Duplicate";
            } else if (
              field !== "cleaning_allowance" &&
              currentItem.cleaning_allowance
            ) {
              updateData.status_display = "Clean Only";
            }
          }
        }
      }

      console.log("Updating item with data:", updateData);

      // Get current user information for change history
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error getting current user:", userError);
      }

      // Get user's full name for change history
      let userName = "Unknown User";
      if (user?.id) {
        const { data: userData } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (userData) {
          userName =
            `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
            "Unknown User";
        }
      }

      console.log("Updating with data:", updateData);

      // Update the item
      const { data: updatedItem, error: updateError } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", itemId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating item:", updateError);
        toast.error("Failed to update item: " + updateError.message);
        return;
      }

      if (!updatedItem) {
        console.error("No item was updated");
        toast.error("Failed to update item");
        fetchItems();
        return;
      }

      // Record the change in item_change_history
      const changeHistoryEntry = {
        item_id: itemId,
        field_name: dbField,
        old_value: currentItem[dbField],
        new_value: parsedValue,
        changed_at: new Date().toISOString(),
        user_id: user?.id || null,
        user_name: userName,
      };

      const { error: historyError } = await supabase
        .from("item_change_history")
        .insert(changeHistoryEntry);

      if (historyError) {
        console.error("Error recording change history:", historyError);
        // Continue execution even if history recording fails
      } else {
        // Update local change history if we're viewing this item
        if (expandedItem === itemId && changeHistory[itemId]) {
          setChangeHistory((prev) => ({
            ...prev,
            [itemId]: [changeHistoryEntry, ...prev[itemId]],
          }));
        }
      }

      setItems(items.map((item) => (item.id === itemId ? updatedItem : item)));

      toast.success("Item updated successfully");
    } catch (err) {
      console.error("Error updating item:", err);
      toast.error("Failed to update item: " + (err.message || err), {
        id: `update-error-${itemId}`,
      });

      fetchItems();
    } finally {
      setLoading(false);
    }
  };

  // Helper function to find the next cell to navigate to based on current position and direction
  const findNextCell = (itemId, field, direction) => {
    const currentEditableCells = editableCells[mode] || [];
    const fieldIndex = currentEditableCells.indexOf(field);
    const currentItemIndex = sortedItems.findIndex(
      (item) => item.id === itemId,
    );

    // Direction can be: 'next-field', 'prev-field', 'next-row', 'prev-row', 'same-field-next-row', 'same-field-prev-row'
    switch (direction) {
      case "next-field":
        if (fieldIndex < currentEditableCells.length - 1) {
          return {
            id: itemId,
            field: currentEditableCells[fieldIndex + 1],
          };
        }
        return findNextCell(itemId, field, "next-row");

      case "prev-field":
        if (fieldIndex > 0) {
          return {
            id: itemId,
            field: currentEditableCells[fieldIndex - 1],
          };
        }
        return findNextCell(itemId, field, "prev-row");

      case "next-row":
        if (currentItemIndex < sortedItems.length - 1) {
          const nextItemId = sortedItems[currentItemIndex + 1].id;
          return {
            id: nextItemId,
            field: currentEditableCells[0],
          };
        }
        return null;

      case "prev-row":
        if (currentItemIndex > 0) {
          const prevItemId = sortedItems[currentItemIndex - 1].id;
          return {
            id: prevItemId,
            field: currentEditableCells[currentEditableCells.length - 1],
          };
        }
        return null;

      case "same-field-next-row":
        if (currentItemIndex < sortedItems.length - 1) {
          const nextItemId = sortedItems[currentItemIndex + 1].id;
          return {
            id: nextItemId,
            field: field,
          };
        }
        return null;

      case "same-field-prev-row":
        if (currentItemIndex > 0) {
          const prevItemId = sortedItems[currentItemIndex - 1].id;
          return {
            id: prevItemId,
            field: field,
          };
        }
        return null;

      default:
        return null;
    }
  };

  const handleKeyDown = (e, itemId, field, currentIndex) => {
    // Special handling for category field - map category to category_id for database operations
    const dbField =
      field === "category" ? "category_id" : fieldMapping[field] || field;

    if (e.key === "Enter") {
      e.preventDefault();
      const value = e.target.value;

      // For all tabs, move to the same field in the next row when Enter is pressed
      // This is especially important for Review and Verify tab
      const nextCell = findNextCell(itemId, field, "same-field-next-row");
      saveAndMove(itemId, field, value, nextCell);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const value = e.target.value;

      // Direction based on shift key
      const direction = e.shiftKey ? "prev-field" : "next-field";

      // Special handling for Enter & Identify tab - always move across the entire row first
      if (mode === "enter_identify") {
        const currentEditableCells = editableCells[mode] || [];
        const fieldIndex = currentEditableCells.indexOf(field);
        const nextFieldIndex = e.shiftKey ? fieldIndex - 1 : fieldIndex + 1;

        if (
          nextFieldIndex >= 0 &&
          nextFieldIndex < currentEditableCells.length
        ) {
          // Stay in the same row, move to the next field
          const nextCell = {
            id: itemId,
            field: currentEditableCells[nextFieldIndex],
          };
          saveAndMove(itemId, field, value, nextCell);
        } else {
          // Move to the next/previous row
          const currentItemIndex = sortedItems.findIndex(
            (item) => item.id === itemId,
          );
          const nextItemIndex = e.shiftKey
            ? currentItemIndex - 1
            : currentItemIndex + 1;

          if (nextItemIndex >= 0 && nextItemIndex < sortedItems.length) {
            const nextItemId = sortedItems[nextItemIndex].id;
            const nextCell = {
              id: nextItemId,
              field: e.shiftKey
                ? currentEditableCells[currentEditableCells.length - 1]
                : currentEditableCells[0],
            };
            saveAndMove(itemId, field, value, nextCell);
          } else {
            // At the beginning or end of the list, just save the current cell
            saveAndMove(itemId, field, value, null);
          }
        }
      } else {
        // For other tabs, use the findNextCell helper
        const nextCell = findNextCell(itemId, field, direction);
        saveAndMove(itemId, field, value, nextCell);
      }
    } else if (e.key === "ArrowDown") {
      // Move to the same field in the next row
      e.preventDefault();
      const value = e.target.value;
      const nextCell = findNextCell(itemId, field, "same-field-next-row");
      saveAndMove(itemId, field, value, nextCell);
    } else if (e.key === "ArrowUp") {
      // Move to the same field in the previous row
      e.preventDefault();
      const value = e.target.value;
      const prevCell = findNextCell(itemId, field, "same-field-prev-row");
      if (prevCell) {
        saveAndMove(itemId, field, value, prevCell);
      }
    }
  };

  const saveAndMove = async (itemId, field, value, nextCell) => {
    try {
      await handleCellEdit(itemId, field, value);
      setEditingCell(nextCell);

      // If we're moving to a new cell, focus it after a short delay to allow the DOM to update
      if (nextCell) {
        setTimeout(() => {
          const cellSelector = `td[data-item-id="${nextCell.id}"][data-field="${nextCell.field}"]`;
          const cell = document.querySelector(cellSelector);
          if (cell) {
            cell.click();
          }
        }, 50);
      }
    } catch (err) {
      console.error("Error saving cell:", err);
      toast.error("Failed to save changes");

      const input = document.activeElement;
      if (input && input.select) {
        input.select();
      }
    }
  };
  const formatUrl = (url) => {
    if (!url) return "";

    // Check if URL already has a protocol
    if (url.match(/^https?:\/\//i)) {
      return url;
    }

    // Add https:// prefix if missing
    return `https://${url}`;
  };

  const getDisplayUrl = (url) => {
    if (!url) return "";

    // Remove protocol and trailing slashes for display
    return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  };
  useEffect(() => {
    const handleRefresh = () => {
      refreshKey.current += 1;
      fetchItems();
      applyDefaultTaxRate();
    };

    const element = gridRef.current;
    if (element) {
      element.addEventListener("refreshData", handleRefresh);
      return () => element.removeEventListener("refreshData", handleRefresh);
    }
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      setError(null);

      const { error: connectionError } = await supabase
        .from("claims")
        .select("count", { count: "exact", head: true });

      if (connectionError) {
        throw new Error(
          "Unable to connect to database. Please check your connection and try again.",
        );
      }

      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("claim_id", claimId)
        .order("item_number", { ascending: true });

      if (error) {
        throw error;
      }

      setItems(data || []);
      setFilteredItems(data || []);
      retryCount.current = 0;
    } catch (err) {
      console.error("Error fetching items:", err);

      if (
        err.message.includes("Failed to fetch") &&
        retryCount.current < maxRetries
      ) {
        retryCount.current += 1;
        console.log(
          `Retrying fetch attempt ${retryCount.current} of ${maxRetries}...`,
        );
        setTimeout(fetchItems, 1000 * retryCount.current);
        return;
      }

      setError(
        err.message === "Failed to fetch"
          ? "Unable to connect to the server. Please check your internet connection and try again."
          : `Error loading items: ${err.message}`,
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchItemHistory(itemId) {
    try {
      const { data, error } = await supabase
        .from("item_change_history")
        .select(
          `
          id,
          changed_at,
          field_name,
          old_value,
          new_value,
          user_name
        `,
        )
        .eq("item_id", itemId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      setChangeHistory((prev) => ({ ...prev, [itemId]: data }));
    } catch (err) {
      console.error("Error fetching item history:", err);
      setError("Unable to load item history. Please try again later.");
    }
  }

  const handleReplacedChange = async (e, itemId) => {
    if (updating) return;

    const newValue = e.target.checked;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from("items")
        .update({ replaced: newValue })
        .eq("id", itemId);

      if (error) throw error;

      toast.success(`Item marked as ${newValue ? "replaced" : "not replaced"}`);

      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, replaced: newValue } : item,
        ),
      );
    } catch (err) {
      console.error("Error updating item:", err);
      toast.error("Failed to update replacement status");
    } finally {
      setUpdating(false);
    }
  };

  const handleExpandItem = async (itemId) => {
    if (mode !== "inventory") return;

    if (expandedItem === itemId) {
      setExpandedItem(null);
    } else {
      setExpandedItem(itemId);
      if (!changeHistory[itemId]) {
        await fetchItemHistory(itemId);
      }
    }
  };

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    console.log(`Sorting by ${key} in ${direction} order`);
  };

  const columns = useMemo(() => {
    const baseColumns = [
      { key: "item_number", label: "#", width: "w-12", sortable: true },
      {
        key: "description",
        label: "Description",
        width: "w-80",
        sortable: true,
      },
    ];

    // Status column definition to be added to the end of each tab's columns
    const statusColumn = {
      key: "status",
      label: "Status",
      width: "w-28 min-w-[112px]",
      sortable: true,
    };

    const modeColumns = {
      inventory: [
        ...baseColumns,
        {
          key: "claimed_rcv",
          label: "RCV Claimed",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "adjusted_rcv",
          label: "Adjusted RCV",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "photos",
          label: "Photos",
          width: "w-32 min-w-[128px]",
          sortable: true,
        },
        // Status column moved to the end
        statusColumn,
      ],
      enter_identify: [
        ...baseColumns,
        {
          key: "room",
          label: "Room",
          width: "w-48 min-w-[192px]",
          sortable: true,
        },
        {
          key: "category",
          label: "Category",
          width: "w-48 min-w-[192px]",
          sortable: true,
        },
        {
          key: "quantity",
          label: "Qty",
          width: "w-20 min-w-[80px]",
          sortable: true,
        },
        {
          key: "claimed_rcv",
          label: "Claimed RCV",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "age",
          label: "Age",
          width: "w-32 min-w-[128px]",
          sortable: true,
        },
        {
          key: "condition",
          label: "Condition",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        // Status column moved to the end
        statusColumn,
      ],
      review_verify: [
        ...baseColumns,
        {
          key: "no_loss_or_damage",
          label: "No Loss or Damage",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "not_involved_in_claim",
          label: "Not Involved in Claim",
          width: "w-48 min-w-[192px]",
          sortable: true,
        },
        {
          key: "duplicate_item",
          label: "Duplicate",
          width: "w-32 min-w-[128px]",
          sortable: true,
        },
        {
          key: "cleaning_allowance",
          label: "Clean Only",
          width: "w-32 min-w-[128px]",
          sortable: true,
        },
        {
          key: "cleaning_allowance_amount",
          label: "Cleaning Amount",
          width: "w-40 min-w-[160px]",
          sortable: true,
          conditionalDisplay: (item) => item.cleaning_allowance,
        },
        // Status column moved to the end
        statusColumn,
      ],
      price_verify: [
        ...baseColumns,
        {
          key: "claimed_rcv",
          label: "RCV Claimed",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "quantity",
          label: "Qty",
          width: "w-20 min-w-[80px]",
          sortable: true,
        },
        {
          key: "accept_claimed",
          label: "Accept Claimed",
          width: "w-40 min-w-[160px]",
          sortable: false,
        },
        {
          key: "adjusted_rcv",
          label: "Adjusted RCV",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "rcv_total",
          label: "RCV Total",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "tax_rate",
          label: "Tax Rate",
          width: "w-32 min-w-[128px]",
          sortable: true,
        },
        {
          key: "rcv_plus_tax",
          label: "RCV + Tax",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "comparable_link",
          label: "Comparable",
          width: "w-24 min-w-[96px]",
          sortable: true,
        },
        // Status column added to the end
        statusColumn,
      ],
      depreciation: [
        ...baseColumns,
        {
          key: "rcv_plus_tax",
          label: "RCV + Tax",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "age",
          label: "Age",
          width: "w-32 min-w-[128px]",
          sortable: true,
        },
        {
          key: "condition",
          label: "Condition",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "depreciation_percent",
          label: "Dep %",
          width: "w-32 min-w-[128px]",
          sortable: true,
        },
        {
          key: "depreciation_amount",
          label: "Dep Amt",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "acv",
          label: "ACV",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "replacement_cost_applies",
          label: "RC Applies",
          width: "w-32 min-w-[128px]",
          sortable: true,
        },
        // Status column added to the end
        statusColumn,
      ],
      recovery: [
        ...baseColumns,
        {
          key: "rcv_plus_tax",
          label: "RCV + Tax",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "depreciation_amount",
          label: "Dep Amt",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "acv",
          label: "ACV",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "replaced",
          label: "Replaced",
          width: "w-32 min-w-[128px]",
          sortable: true,
        },
        {
          key: "replacement_spent",
          label: "Amt Spent",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "holdback_due",
          label: "Holdback Due",
          width: "w-40 min-w-[160px]",
          sortable: true,
        },
        {
          key: "receipts",
          label: "Receipts",
          width: "w-32 min-w-[128px]",
          sortable: true,
        },
        // Status column added to the end
        statusColumn,
      ],
    };

    let columns = modeColumns[mode] || baseColumns;

    return columns;
  }, [mode]);

  const sortedItems = useMemo(() => {
    let sortableItems = [...filteredItems];

    // Always allow sorting regardless of special checkboxes
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === "category") {
          const catA =
            categories.find((c) => c.id === a.category_id)?.name || "";
          const catB =
            categories.find((c) => c.id === b.category_id)?.name || "";
          if (sortConfig.direction === "ascending") {
            return catA.localeCompare(catB);
          }
          return catB.localeCompare(catA);
        }

        if (sortConfig.key === "status") {
          // Get display status for each item
          const getDisplayStatus = (item) => {
            if (item.status_display) return item.status_display;
            if (item.no_loss_or_damage) return "No Loss/Damage";
            if (item.not_involved_in_claim) return "Not Involved in Claim";
            if (item.duplicate_item) return "Duplicate";
            if (item.cleaning_allowance) return "Clean Only";
            return item.status?.replace("_", " ") || "";
          };

          const statusA = getDisplayStatus(a).toUpperCase();
          const statusB = getDisplayStatus(b).toUpperCase();

          if (sortConfig.direction === "ascending") {
            return statusA.localeCompare(statusB);
          }
          return statusB.localeCompare(statusA);
        }

        if (a[sortConfig.key] === undefined || a[sortConfig.key] === null) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        if (b[sortConfig.key] === undefined || b[sortConfig.key] === null) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }

        if (typeof a[sortConfig.key] === "string") {
          return sortConfig.direction === "ascending"
            ? a[sortConfig.key].localeCompare(b[sortConfig.key])
            : b[sortConfig.key].localeCompare(a[sortConfig.key]);
        }

        return sortConfig.direction === "ascending"
          ? a[sortConfig.key] - b[sortConfig.key]
          : b[sortConfig.key] - a[sortConfig.key];
      });
    }
    return sortableItems;
  }, [filteredItems, sortConfig, categories]);

  // This function returns visibility flags for columns
  const getColumnVisibility = (item, defaultColumns) => {
    const visibilityMap = {};

    // Initialize all columns as visible
    defaultColumns.forEach((col) => {
      visibilityMap[col.key] = true;
    });

    // Handle special cases based on item flags
    if (item.no_loss_or_damage) {
      [
        "not_involved_in_claim",
        "duplicate_item",
        "cleaning_allowance",
        "adjusted_rcv",
        "rcv_total",
        "tax_rate",
        "rcv_plus_tax",
        "depreciation_percent",
        "depreciation_amount",
        "acv",
        "replaced",
        "replacement_spent",
        "holdback_due",
        "replacement_cost_applies",
        "receipts",
        "accept_claimed",
        "comparable_link",
      ].forEach((key) => {
        visibilityMap[key] = false;
      });
    }

    if (item.not_involved_in_claim) {
      [
        "no_loss_or_damage",
        "duplicate_item",
        "cleaning_allowance",
        "adjusted_rcv",
        "rcv_total",
        "tax_rate",
        "rcv_plus_tax",
        "depreciation_percent",
        "depreciation_amount",
        "acv",
        "replaced",
        "replacement_spent",
        "holdback_due",
        "replacement_cost_applies",
        "receipts",
        "accept_claimed",
        "comparable_link",
      ].forEach((key) => {
        visibilityMap[key] = false;
      });
    }

    if (item.duplicate_item) {
      [
        "not_involved_in_claim",
        "no_loss_or_damage",
        "cleaning_allowance",
        "adjusted_rcv",
        "rcv_total",
        "tax_rate",
        "rcv_plus_tax",
        "depreciation_percent",
        "depreciation_amount",
        "acv",
        "replaced",
        "replacement_spent",
        "holdback_due",
        "replacement_cost_applies",
        "receipts",
        "accept_claimed",
        "comparable_link",
      ].forEach((key) => {
        visibilityMap[key] = false;
      });
    }

    if (item.cleaning_allowance) {
      [
        "not_involved_in_claim",
        "duplicate_item",
        "no_loss_or_damage",
        "adjusted_rcv",
        "rcv_total",
        "tax_rate",
        "rcv_plus_tax",
        "depreciation_percent",
        "depreciation_amount",
        "acv",
        "replaced",
        "replacement_spent",
        "holdback_due",
        "replacement_cost_applies",
        "receipts",
        "accept_claimed",
        "comparable_link",
      ].forEach((key) => {
        visibilityMap[key] = false;
      });

      // Make sure cleaning_allowance_amount is visible when cleaning_allowance is true
      visibilityMap["cleaning_allowance_amount"] = true;
      // Make sure the status is updated to reflect "Clean Only"
      if (item.status !== "Clean Only") {
        item.status = "Clean Only";
      }
    }

    // Original logic for recovery mode
    if (mode === "recovery" && !item.replacement_cost_applies) {
      ["replaced", "replacement_spent", "holdback_due", "receipts"].forEach(
        (key) => {
          visibilityMap[key] = false;
        },
      );
    }

    if (mode === "recovery" && !item.replaced) {
      ["replacement_spent", "holdback_due", "receipts"].forEach((key) => {
        visibilityMap[key] = false;
      });
    }

    return visibilityMap;
  };

  return (
    <div
      ref={gridRef}
      data-testid="inventory-grid"
      className={`h-full ${className}`}
      onRefreshData={() => fetchItems()}
    >
      <div className="overflow-auto h-full relative pb-32">
        {" "}
        {/* Added padding to bottom to make room for the fixed totals bar */}
        {loading && !items.length ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-lg">
            <h3 className="font-semibold">Error</h3>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {filteredItems.length === 0 && items.length > 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="text-lg mb-4">
                  {searchQuery
                    ? `No items match "${searchQuery}"`
                    : "No items match the current filters"}
                </p>
                {Object.values(filters).some(
                  (f) => f !== "" && f !== null && f !== undefined,
                ) && (
                  <button
                    onClick={() => {
                      clearFilters();
                      toast.success("Filters cleared");
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {filteredItems.length > 0 && (
              <table className="min-w-full divide-y divide-gray-200 relative table-fixed border-spacing-0 shadow-sm rounded-md overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={cn(
                          "h-8 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 overflow-hidden",
                          column.key === "item_number" &&
                            "sticky left-0 z-30 w-[3%] bg-gray-50",
                          column.key === "description" &&
                            "sticky left-[5%] z-30 w-[20%] bg-gray-50",
                          column.width,
                          column.sortable && "cursor-pointer hover:bg-gray-100",
                        )}
                        style={{
                          minWidth: column.width
                            ? column.width.replace("w-", "") + "px"
                            : "auto",
                        }}
                        onClick={() => {
                          if (column.sortable) {
                            requestSort(column.key);
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <span>{column.label}</span>
                          {column.sortable && (
                            <span className="ml-1 flex-shrink-0">
                              {sortConfig.key === column.key ? (
                                sortConfig.direction === "ascending" ? (
                                  <ArrowUpIcon className="h-3 w-3 text-gray-500" />
                                ) : (
                                  <ArrowDownIcon className="h-3 w-3 text-gray-500" />
                                )
                              ) : (
                                <span className="h-3 w-3 opacity-0">•</span>
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    {mode === "inventory" && (
                      <th className="h-8 w-10 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 z-20">
                        <span className="sr-only">Expand</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {sortedItems.map((item) => {
                    // Get visibility map for all columns
                    const columnVisibility = getColumnVisibility(item, columns);

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={(e) => {
                            if (e.shiftKey) {
                              shiftSelectRows(sortedItems, item.id);
                            } else {
                              toggleRowSelection(item.id);
                            }
                          }}
                          className={cn(
                            "group transition-colors duration-150 cursor-pointer h-14 select-none inventory-row",
                            selectedRows.has(item.id)
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-gray-50",
                          )}
                        >
                          {columns.map((column) => {
                            // Skip columns that should be hidden based on conditional display
                            if (
                              column.conditionalDisplay &&
                              !column.conditionalDisplay(item)
                            ) {
                              return (
                                <td
                                  key={column.key}
                                  className="hidden"
                                  style={{
                                    width: 0,
                                    padding: 0,
                                    margin: 0,
                                    border: "none",
                                    display: "table-cell",
                                  }}
                                ></td>
                              );
                            }

                            // Skip columns that should be hidden based on item flags
                            if (columnVisibility[column.key] === false) {
                              return (
                                <td
                                  key={column.key}
                                  className="hidden"
                                  style={{
                                    width: 0,
                                    padding: 0,
                                    margin: 0,
                                    border: "none",
                                    display: "table-cell",
                                  }}
                                ></td>
                              );
                            }
                            if (
                              column.key === "replacement_cost_applies" ||
                              column.key === "replaced" ||
                              column.key === "no_loss_or_damage" ||
                              column.key === "not_involved_in_claim" ||
                              column.key === "duplicate_item" ||
                              column.key === "cleaning_allowance"
                            ) {
                              return (
                                <td
                                  key={column.key}
                                  className={cn(
                                    "px-6 py-2 whitespace-nowrap text-sm text-gray-900 transition-colors duration-150 h-14 cursor-pointer",
                                    column.key === "item_number" &&
                                      "sticky left-0 z-20 w-[3%] bg-white",
                                    column.key === "description" &&
                                      "sticky left-[5%] z-20 w-[20%] bg-white",
                                    selectedRows.has(item.id)
                                      ? "bg-blue-50 group-hover:bg-blue-100"
                                      : column.key === "item_number" ||
                                          column.key === "description"
                                        ? "bg-white group-hover:bg-gray-50"
                                        : "",
                                  )}
                                  // Don't stop propagation on the cell click
                                  // This allows row selection to work when clicking the cell
                                >
                                  <div className="flex justify-center items-center h-full">
                                    <label className="checkbox-container cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0"
                                        checked={Boolean(item[column.key])}
                                        disabled={updating}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          // Directly handle the checkbox change here
                                          const newValue = e.target.checked;
                                          handleCellEdit(
                                            item.id,
                                            column.key,
                                            newValue,
                                          );
                                        }}
                                        onClick={(e) => {
                                          // Only stop propagation on the checkbox itself
                                          e.stopPropagation();
                                        }}
                                      />
                                    </label>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={column.key}
                                onClick={() => {
                                  if (
                                    editableCells[mode]?.includes(column.key)
                                  ) {
                                    setEditingCell({
                                      id: item.id,
                                      field: column.key,
                                    });
                                  }
                                }}
                                className={cn(
                                  "px-6 py-2 whitespace-nowrap text-sm text-gray-900 transition-colors duration-150 h-14 overflow-hidden",
                                  column.key === "item_number" &&
                                    "sticky left-0 z-20 w-[3%] bg-white",
                                  column.key === "description" &&
                                    "sticky left-[5%] z-20 w-[20%] bg-white",
                                  editableCells[mode]?.includes(column.key) &&
                                    "cursor-pointer hover:bg-gray-50 editable-cell",
                                  selectedRows.has(item.id)
                                    ? "bg-blue-50 group-hover:bg-blue-100"
                                    : column.key === "item_number" ||
                                        column.key === "description"
                                      ? "bg-white group-hover:bg-gray-50"
                                      : "",
                                )}
                              >
                                {editingCell?.id === item.id &&
                                editingCell?.field === column.key ? (
                                  (() => {
                                    if (column.key === "room") {
                                      return (
                                        <div className="relative h-9">
                                          {showAddRoomInput ? (
                                            <div className="flex flex-col space-y-2">
                                              <input
                                                type="text"
                                                className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                value={newRoomName}
                                                onChange={(e) =>
                                                  setNewRoomName(e.target.value)
                                                }
                                                autoFocus
                                                placeholder="Enter room name"
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    addNewRoom(newRoomName);
                                                    saveAndMove(
                                                      item.id,
                                                      "room",
                                                      newRoomName,
                                                      null,
                                                    );
                                                  } else if (
                                                    e.key === "Escape"
                                                  ) {
                                                    setShowAddRoomInput(false);
                                                    setEditingCell(null);
                                                  }
                                                }}
                                              />
                                              <div className="flex space-x-2">
                                                <button
                                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                                  onClick={() => {
                                                    addNewRoom(newRoomName);
                                                    saveAndMove(
                                                      item.id,
                                                      "room",
                                                      newRoomName,
                                                      null,
                                                    );
                                                  }}
                                                >
                                                  Add
                                                </button>
                                                <button
                                                  className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                                  onClick={() => {
                                                    setShowAddRoomInput(false);
                                                    setEditingCell(null);
                                                  }}
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <select
                                              autoFocus
                                              className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                              value={item.room || ""}
                                              onChange={(e) => {
                                                if (
                                                  e.target.value ===
                                                  "add_new_room"
                                                ) {
                                                  setShowAddRoomInput(true);
                                                } else {
                                                  // Find the next field to move to after saving
                                                  const currentEditableCells =
                                                    editableCells[mode] || [];
                                                  const fieldIndex =
                                                    currentEditableCells.indexOf(
                                                      "room",
                                                    );
                                                  const nextFieldIndex =
                                                    fieldIndex + 1;

                                                  let nextCell = null;
                                                  if (
                                                    nextFieldIndex <
                                                    currentEditableCells.length
                                                  ) {
                                                    nextCell = {
                                                      id: item.id,
                                                      field:
                                                        currentEditableCells[
                                                          nextFieldIndex
                                                        ],
                                                    };
                                                  }

                                                  saveAndMove(
                                                    item.id,
                                                    "room",
                                                    e.target.value,
                                                    nextCell,
                                                  );
                                                }
                                              }}
                                              onBlur={(e) => {
                                                if (
                                                  e.target.value !==
                                                  "add_new_room"
                                                ) {
                                                  saveAndMove(
                                                    item.id,
                                                    "room",
                                                    e.target.value,
                                                    null,
                                                  );
                                                }
                                              }}
                                              onKeyDown={(e) =>
                                                handleKeyDown(
                                                  e,
                                                  item.id,
                                                  "room",
                                                  editableCells[mode].indexOf(
                                                    column.key,
                                                  ),
                                                )
                                              }
                                            >
                                              <option value="">
                                                Select a room
                                              </option>
                                              {rooms.map((roomName, index) => (
                                                <option
                                                  key={`room-${index}`}
                                                  value={roomName}
                                                >
                                                  {roomName}
                                                </option>
                                              ))}
                                              <option
                                                value="add_new_room"
                                                className="font-semibold text-blue-600"
                                              >
                                                + Add Room
                                              </option>
                                            </select>
                                          )}
                                        </div>
                                      );
                                    } else if (column.key === "condition") {
                                      return (
                                        <select
                                          autoFocus
                                          className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                          style={{ minWidth: "100%" }}
                                          defaultValue={item[column.key]}
                                          onBlur={(e) => {
                                            saveAndMove(
                                              item.id,
                                              column.key,
                                              e.target.value,
                                              null,
                                            );
                                          }}
                                          onKeyDown={(e) =>
                                            handleKeyDown(
                                              e,
                                              item.id,
                                              column.key,
                                              editableCells[mode].indexOf(
                                                column.key,
                                              ),
                                            )
                                          }
                                        >
                                          <option value="poor">Poor</option>
                                          <option value="fair">Fair</option>
                                          <option value="good">Good</option>
                                          <option value="new">New</option>
                                        </select>
                                      );
                                    } else if (column.key === "category") {
                                      return (
                                        <select
                                          autoFocus
                                          name="category_id"
                                          className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                          style={{ minWidth: "100%" }}
                                          value={item.category_id || ""}
                                          onChange={(e) => {
                                            const value = e.target.value
                                              ? parseInt(e.target.value)
                                              : null;

                                            // Find the next field to move to after saving
                                            const currentEditableCells =
                                              editableCells[mode] || [];
                                            const fieldIndex =
                                              currentEditableCells.indexOf(
                                                "category",
                                              );
                                            const nextFieldIndex =
                                              fieldIndex + 1;

                                            let nextCell = null;
                                            if (
                                              nextFieldIndex <
                                              currentEditableCells.length
                                            ) {
                                              nextCell = {
                                                id: item.id,
                                                field:
                                                  currentEditableCells[
                                                    nextFieldIndex
                                                  ],
                                              };
                                            }

                                            saveAndMove(
                                              item.id,
                                              "category_id",
                                              value,
                                              nextCell,
                                            );
                                          }}
                                          onBlur={(e) => {
                                            const value = e.target.value
                                              ? parseInt(e.target.value)
                                              : null;

                                            // Check if the value has actually changed before saving
                                            if (value !== item.category_id) {
                                              // Find the next field to move to after saving
                                              const currentEditableCells =
                                                editableCells[mode] || [];
                                              const fieldIndex =
                                                currentEditableCells.indexOf(
                                                  "category",
                                                );
                                              const nextFieldIndex =
                                                fieldIndex + 1;

                                              let nextCell = null;
                                              if (
                                                nextFieldIndex <
                                                currentEditableCells.length
                                              ) {
                                                nextCell = {
                                                  id: item.id,
                                                  field:
                                                    currentEditableCells[
                                                      nextFieldIndex
                                                    ],
                                                };
                                              }

                                              saveAndMove(
                                                item.id,
                                                "category_id",
                                                value,
                                                nextCell,
                                              );
                                            } else {
                                              // If no change, just move to the next cell without saving
                                              const currentEditableCells =
                                                editableCells[mode] || [];
                                              const fieldIndex =
                                                currentEditableCells.indexOf(
                                                  "category",
                                                );
                                              const nextFieldIndex =
                                                fieldIndex + 1;

                                              if (
                                                nextFieldIndex <
                                                currentEditableCells.length
                                              ) {
                                                setEditingCell({
                                                  id: item.id,
                                                  field:
                                                    currentEditableCells[
                                                      nextFieldIndex
                                                    ],
                                                });
                                              } else {
                                                setEditingCell(null);
                                              }
                                            }
                                          }}
                                          onKeyDown={(e) =>
                                            handleKeyDown(
                                              e,
                                              item.id,
                                              "category",
                                              editableCells[mode].indexOf(
                                                "category",
                                              ),
                                            )
                                          }
                                        >
                                          <option value="">
                                            Select a category
                                          </option>
                                          {categoriesLoading ? (
                                            <option value="" disabled>
                                              Loading categories...
                                            </option>
                                          ) : categories.length > 0 ? (
                                            categories.map((cat) => (
                                              <option
                                                key={cat.id}
                                                value={cat.id}
                                              >
                                                {cat.name}
                                              </option>
                                            ))
                                          ) : (
                                            <option value="" disabled>
                                              No categories available
                                            </option>
                                          )}
                                        </select>
                                      );
                                    } else {
                                      return (
                                        <input
                                          type={
                                            column.key === "quantity" ||
                                            column.key === "claimed_rcv" ||
                                            column.key === "age"
                                              ? "number"
                                              : "text"
                                          }
                                          step={
                                            column.key === "quantity" ||
                                            column.key === "claimed_rcv"
                                              ? "0.01"
                                              : column.key === "age"
                                                ? "0.1"
                                                : undefined
                                          }
                                          min={
                                            column.key === "quantity" ||
                                            column.key === "claimed_rcv" ||
                                            column.key === "age"
                                              ? "0"
                                              : undefined
                                          }
                                          className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                          style={{ minWidth: "100%" }}
                                          defaultValue={item[column.key]}
                                          autoFocus
                                          onBlur={(e) => {
                                            saveAndMove(
                                              item.id,
                                              column.key,
                                              e.target.value,
                                              null,
                                            );
                                          }}
                                          onKeyDown={(e) =>
                                            handleKeyDown(
                                              e,
                                              item.id,
                                              column.key,
                                              editableCells[mode].indexOf(
                                                column.key,
                                              ),
                                            )
                                          }
                                        />
                                      );
                                    }
                                  })()
                                ) : column.key === "description" ? (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-gray-900">
                                      {item[column.key] || "-"}
                                    </span>
                                    <div className="text-xs text-gray-500 pointer-events-none">
                                      {item.room && item.category_id
                                        ? `${item.room} • ${categories.find((c) => c.id === item.category_id)?.name || "Category " + item.category_id}`
                                        : item.room ||
                                          (item.category_id
                                            ? categories.find(
                                                (c) =>
                                                  c.id === item.category_id,
                                              )?.name ||
                                              "Category " + item.category_id
                                            : "")}
                                    </div>
                                  </div>
                                ) : column.key === "room" ? (
                                  item.room || "-"
                                ) : column.key === "condition" ? (
                                  item[column.key] || "-"
                                ) : column.key === "status" ? (
                                  <span
                                    className={cn(
                                      "px-2 py-1 text-xs font-medium rounded-full",
                                      {
                                        "bg-red-100 text-red-800":
                                          item.status === "submitted",
                                        "bg-yellow-100 text-yellow-800":
                                          item.status === "in_review",
                                        "bg-green-100 text-green-800":
                                          item.status === "priced",
                                        "bg-blue-100 text-blue-800":
                                          item.status === "adjusted",
                                        "bg-purple-100 text-purple-800":
                                          item.status === "holdback_paid",
                                        "bg-orange-100 text-orange-800":
                                          item.no_loss_or_damage,
                                        "bg-indigo-100 text-indigo-800":
                                          item.not_involved_in_claim,
                                        "bg-pink-100 text-pink-800":
                                          item.duplicate_item,
                                        "bg-teal-100 text-teal-800":
                                          item.cleaning_allowance,
                                      },
                                    )}
                                  >
                                    {item.status_display
                                      ? item.status_display
                                      : item.no_loss_or_damage
                                        ? "NO LOSS/DAMAGE"
                                        : item.not_involved_in_claim
                                          ? "NOT INVOLVED IN CLAIM"
                                          : item.duplicate_item
                                            ? "DUPLICATE"
                                            : item.cleaning_allowance
                                              ? "CLEAN ONLY"
                                              : item.status
                                                  ?.replace("_", " ")
                                                  .toUpperCase()}
                                  </span>
                                ) : column.key === "photos" ? (
                                  item[column.key] &&
                                  item[column.key].length > 0 ? (
                                    <div className="flex items-center space-x-1">
                                      <img
                                        src={item[column.key][0]}
                                        alt="Preview"
                                        className="h-8 w-8 object-cover rounded"
                                      />
                                      {item[column.key].length > 1 && (
                                        <span className="text-xs text-gray-500">
                                          +{item[column.key].length - 1}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    "-"
                                  )
                                ) : column.key === "claimed_rcv" ? (
                                  item[column.key] ? (
                                    <span className="text-gray-900">
                                      $
                                      {item[column.key]?.toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )}
                                    </span>
                                  ) : (
                                    "-"
                                  )
                                ) : column.key === "adjusted_rcv" ||
                                  column.key === "rcv_total" ||
                                  column.key === "rcv_plus_tax" ||
                                  column.key === "replacement_spent" ||
                                  column.key === "holdback_due" ||
                                  column.key === "cleaning_allowance_amount" ? (
                                  item[column.key] ? (
                                    <span className="text-gray-900">
                                      $
                                      {item[column.key].toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )}
                                    </span>
                                  ) : (
                                    "-"
                                  )
                                ) : column.key === "tax_rate" ? (
                                  item[column.key] !== null &&
                                  item[column.key] !== undefined ? (
                                    (() => {
                                      const taxRate = parseFloat(
                                        item[column.key],
                                      );
                                      const taxPercent = taxRate * 100;
                                      const roundedTaxPercent =
                                        Math.round(taxPercent * 1000) / 1000;
                                      return `${roundedTaxPercent.toFixed(3)}%`;
                                    })()
                                  ) : (
                                    "-"
                                  )
                                ) : column.key === "depreciation_percent" ? (
                                  editingCell?.id === item.id &&
                                  editingCell?.field === column.key ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="any"
                                      className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      style={{ minWidth: "100%" }}
                                      defaultValue={
                                        item[column.key]
                                          ? (item[column.key] * 100).toFixed(0)
                                          : ""
                                      }
                                      autoFocus
                                      onBlur={(e) => {
                                        let value = e.target.value
                                          ? parseFloat(e.target.value)
                                          : null;
                                        if (value !== null) {
                                          value = Math.max(
                                            0,
                                            Math.min(100, value),
                                          );
                                          value = value / 100;
                                          handleCellEdit(
                                            item.id,
                                            column.key,
                                            value,
                                          );
                                        } else {
                                          handleCellEdit(
                                            item.id,
                                            column.key,
                                            null,
                                          );
                                        }
                                        setEditingCell(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          const value = e.target.value
                                            ? parseFloat(e.target.value)
                                            : null;
                                          if (value !== null) {
                                            const normalizedValue =
                                              Math.max(
                                                0,
                                                Math.min(100, value),
                                              ) / 100;
                                            handleCellEdit(
                                              item.id,
                                              column.key,
                                              normalizedValue,
                                            );
                                          } else {
                                            handleCellEdit(
                                              item.id,
                                              column.key,
                                              null,
                                            );
                                          }
                                          setEditingCell(null);
                                        } else if (e.key === "Escape") {
                                          setEditingCell(null);
                                        }
                                      }}
                                    />
                                  ) : item[column.key] ? (
                                    `${(item[column.key] * 100).toFixed(0)}%`
                                  ) : (
                                    "-"
                                  )
                                ) : column.key === "depreciation_amount" ||
                                  column.key === "acv" ? (
                                  item[column.key] ? (
                                    `$${item[column.key].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  ) : (
                                    "-"
                                  )
                                ) : column.key === "adjusted_rcv" ? (
                                  editingCell?.id === item.id &&
                                  editingCell?.field === column.key ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      style={{ minWidth: "100%" }}
                                      defaultValue={item[column.key]}
                                      autoFocus
                                      onBlur={(e) => {
                                        saveAndMove(
                                          item.id,
                                          column.key,
                                          parseFloat(e.target.value) || null,
                                          null,
                                        );
                                      }}
                                      onKeyDown={(e) =>
                                        handleKeyDown(
                                          e,
                                          item.id,
                                          column.key,
                                          editableCells[mode].indexOf(
                                            column.key,
                                          ),
                                        )
                                      }
                                    />
                                  ) : item[column.key] ? (
                                    `${item[column.key].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  ) : (
                                    "-"
                                  )
                                ) : column.key === "replacement_spent" ? (
                                  editingCell?.id === item.id &&
                                  editingCell?.field === column.key ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      style={{ minWidth: "100%" }}
                                      defaultValue={item[column.key]}
                                      autoFocus
                                      onBlur={(e) => {
                                        saveAndMove(
                                          item.id,
                                          column.key,
                                          parseFloat(e.target.value) || null,
                                          null,
                                        );
                                      }}
                                      onKeyDown={(e) =>
                                        handleKeyDown(
                                          e,
                                          item.id,
                                          column.key,
                                          editableCells[mode].indexOf(
                                            column.key,
                                          ),
                                        )
                                      }
                                    />
                                  ) : item[column.key] ? (
                                    `${item[column.key].toFixed(2)}`
                                  ) : (
                                    "-"
                                  )
                                ) : column.key === "accept_claimed" ? (
                                  <div className="flex justify-center items-center h-full">
                                    <button
                                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.claimed_rcv) {
                                          handleCellEdit(
                                            item.id,
                                            "adjusted_rcv",
                                            item.claimed_rcv,
                                          );
                                          toast.success(
                                            "Copied claimed RCV to adjusted RCV",
                                          );
                                        } else {
                                          toast.error(
                                            "No claimed RCV value to copy",
                                          );
                                        }
                                      }}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 mr-1"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8z" />
                                        <path d="M12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                                      </svg>
                                      Copy
                                    </button>
                                  </div>
                                ) : column.key === "comparable_link" ? (
                                  editingCell?.id === item.id &&
                                  editingCell?.field === column.key ? (
                                    <input
                                      type="url"
                                      className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      style={{ minWidth: "100%" }}
                                      defaultValue={item[column.key] || ""}
                                      autoFocus
                                      onBlur={(e) => {
                                        saveAndMove(
                                          item.id,
                                          column.key,
                                          e.target.value,
                                          null,
                                        );
                                      }}
                                      onKeyDown={(e) =>
                                        handleKeyDown(
                                          e,
                                          item.id,
                                          column.key,
                                          editableCells[mode].indexOf(
                                            column.key,
                                          ),
                                        )
                                      }
                                      placeholder="Enter URL..."
                                    />
                                  ) : item[column.key] ? (
                                    <div className="flex items-center space-x-2">
                                      <a
                                        href={item[column.key]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-4 w-4 mr-1"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                        >
                                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                        </svg>
                                        Link
                                      </a>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingCell({
                                            id: item.id,
                                            field: column.key,
                                          });
                                        }}
                                        className="text-gray-600 hover:text-gray-800 text-sm"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-4 w-4"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                        >
                                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCell({
                                          id: item.id,
                                          field: column.key,
                                        });
                                      }}
                                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center text-sm"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 mr-1"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      Add Link
                                    </button>
                                  )
                                ) : column.key === "receipts" ? (
                                  item[column.key]?.length > 0 ? (
                                    <div className="flex items-center space-x-2">
                                      <div
                                        className="h-8 w-8 flex items-center justify-center bg-gray-100 rounded cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingReceipts(item[column.key]);
                                          setCurrentReceiptIndex(0);
                                          setReceiptModalItem(item);
                                          setIsReceiptViewerOpen(true);
                                        }}
                                      >
                                        {item[column.key][0]
                                          .toLowerCase()
                                          .endsWith(".pdf") ? (
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-red-600"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        ) : (
                                          <img
                                            src={item[column.key][0]}
                                            alt="Receipt preview"
                                            className="h-5 w-5 object-cover rounded"
                                          />
                                        )}
                                      </div>
                                      {item[column.key].length > 1 && (
                                        <span className="text-xs text-gray-500">
                                          +{item[column.key].length - 1}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReceiptModalItem(item);
                                        setIsReceiptModalOpen(true);
                                        console.log(
                                          "Upload receipt for item:",
                                          item.id,
                                        );
                                      }}
                                      className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                      Upload Receipt
                                    </button>
                                  )
                                ) : column.key === "category" ? (
                                  categories.find(
                                    (c) => c.id === item.category_id,
                                  )?.name || "-"
                                ) : (
                                  item[column.key] || "-"
                                )}
                              </td>
                            );
                          })}
                          {mode === "inventory" && (
                            <td className="w-10 px-2 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExpandItem(item.id);
                                }}
                                className="text-blue-700 hover:text-blue-900 transition-colors duration-150 p-1 rounded-full hover:bg-blue-100 border border-blue-300"
                              >
                                {expandedItem === item.id ? (
                                  <ChevronUpIcon className="h-4 w-4" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          )}
                        </tr>
                        {mode === "inventory" && expandedItem === item.id && (
                          <tr>
                            <td
                              colSpan={
                                columns.length + (mode === "inventory" ? 1 : 0)
                              }
                              className="px-6 py-2 bg-gray-50 transition-all duration-300"
                            >
                              <div className="p-3">
                                <ItemDetails
                                  item={{
                                    ...item,
                                    change_history: changeHistory[item.id],
                                  }}
                                  categories={categories}
                                  onEdit={(item) =>
                                    console.log("Edit item:", item.id)
                                  }
                                  onDelete={(itemId) => {
                                    setExpandedItem(null);
                                    fetchItems();
                                  }}
                                  onRefresh={() => fetchItems()}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Receipt Upload Modal */}
      {isReceiptModalOpen && receiptModalItem && (
        <ItemReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          item={receiptModalItem}
          onUploadComplete={(updateData) => {
            // Update the local state with the new receipt data
            const updatedItems = items.map((item) =>
              item.id === receiptModalItem.id
                ? { ...item, ...updateData }
                : item,
            );

            // Update both items and filteredItems to ensure the UI reflects changes immediately
            setItems(updatedItems);
            setFilteredItems(
              updatedItems.filter((item) =>
                filteredItems.some((fi) => fi.id === item.id),
              ),
            );

            console.log("Receipt modal update complete with data:", updateData);
          }}
        />
      )}

      {/* Receipt Viewer Modal */}
      <ReceiptViewerModal
        isOpen={isReceiptViewerOpen}
        onClose={() => setIsReceiptViewerOpen(false)}
        item={receiptModalItem}
        receipts={viewingReceipts}
        onUpdateComplete={(updateData) => {
          // Handle updates from the receipt viewer modal
          if (updateData.openUploadModal) {
            setIsReceiptModalOpen(true);
            return;
          }

          // Update both items and filteredItems to ensure the UI reflects changes immediately
          if (receiptModalItem) {
            const updatedItems = items.map((item) =>
              item.id === receiptModalItem.id
                ? { ...item, ...updateData }
                : item,
            );

            setItems(updatedItems);
            setFilteredItems(
              updatedItems.filter((item) =>
                filteredItems.some((fi) => fi.id === item.id),
              ),
            );

            // Update the modal item to reflect changes
            setReceiptModalItem({
              ...receiptModalItem,
              ...updateData,
            });
          }
        }}
      />
    </div>
  );
}

export { InventoryGrid };
