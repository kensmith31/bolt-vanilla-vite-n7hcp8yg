import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useFilterStore } from "../../stores/filterStore";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export function FilterModal({ isOpen, onClose, claimId }) {
  const { filters, setFilter, setFilters, clearFilters } = useFilterStore();
  const [localFilters, setLocalFilters] = useState({ ...filters });
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [availableConditions, setAvailableConditions] = useState([]);
  const [availableTaxRates, setAvailableTaxRates] = useState([]);
  const [availableDepreciationRates, setAvailableDepreciationRates] = useState(
    [],
  );
  const [availableAges, setAvailableAges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters({ ...filters });
      fetchFilterData();
    }
  }, [isOpen, filters]);

  async function fetchFilterData() {
    try {
      setLoading(true);

      if (!claimId) {
        throw new Error("Claim ID is required");
      }

      // Fetch all items for this claim
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("claim_id", claimId);

      if (itemsError) throw itemsError;

      // Extract unique values from items
      const uniqueRooms = [...new Set(items.map((item) => item.room))]
        .filter(Boolean)
        .sort();
      setRooms(uniqueRooms);

      // Include all possible statuses plus those from items
      const allStatuses = [
        "submitted",
        "in_review",
        "priced",
        "adjusted",
        "holdback_paid",
        "No Loss/Damage",
        "Not Involved in Claim",
        "Duplicate",
        "Clean Only",
      ];

      const uniqueStatuses = [
        ...new Set([...allStatuses, ...items.map((item) => item.status)]),
      ]
        .filter(Boolean)
        .sort();
      setAvailableStatuses(uniqueStatuses);

      const uniqueConditions = [...new Set(items.map((item) => item.condition))]
        .filter(Boolean)
        .sort();
      setAvailableConditions(uniqueConditions);

      const uniqueTaxRates = [...new Set(items.map((item) => item.tax_rate))]
        .filter(Boolean)
        .map((rate) => (rate * 100).toFixed(3))
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      setAvailableTaxRates(uniqueTaxRates);

      const uniqueDepreciationRates = [
        ...new Set(items.map((item) => item.depreciation_percent)),
      ]
        .filter(Boolean)
        .map((rate) => (rate * 100).toFixed(0))
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      setAvailableDepreciationRates(uniqueDepreciationRates);

      const uniqueAges = [...new Set(items.map((item) => item.age))]
        .filter(Boolean)
        .sort((a, b) => a - b);
      setAvailableAges(uniqueAges);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (err) {
      console.error("Error fetching filter data:", err);
      toast.error("Failed to load filter options");
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Special handling for tax rate to convert from display percentage to decimal
    if (name === "tax_rate") {
      setLocalFilters({
        ...localFilters,
        [name]: value ? (parseFloat(value) / 100).toString() : "",
      });
      return;
    }

    // Special handling for replaced filter
    if (name === "replaced" && value === "true") {
      setLocalFilters({
        ...localFilters,
        [name]: value,
        replacement_cost_applies: "true", // Force replacement_cost_applies to true when replaced is true
      });
    } else {
      setLocalFilters({
        ...localFilters,
        [name]: value,
      });
    }
  };

  const applyFilters = () => {
    setFilters(localFilters);
    onClose();
    toast.success("Filters applied");
  };

  const resetFilters = () => {
    setLocalFilters({
      room: "",
      category_id: "",
      status: "",
      condition: "",
      tax_rate: "",
      depreciation_percent: "",
      age: "",
      replacement_cost_applies: "",
      replaced: "",
      no_loss_or_damage: "",
      not_involved_in_claim: "",
      duplicate_item: "",
      cleaning_allowance: "",
    });
  };

  const handleClearFilters = () => {
    clearFilters();
    resetFilters();
    onClose();
    toast.success("Filters cleared");
  };

  const countActiveFilters = () => {
    return Object.values(localFilters).filter(
      (value) => value !== "" && value !== null && value !== undefined,
    ).length;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Filter Items
              {countActiveFilters() > 0 && (
                <span className="ml-2 text-sm font-normal text-blue-600">
                  ({countActiveFilters()} active)
                </span>
              )}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-1"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : (
            <div className="flex flex-col space-y-6">
              {/* Basic Filters Section - Two columns */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">
                  Basic Filters
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Room
                    </label>
                    <select
                      name="room"
                      value={localFilters.room || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any Room</option>
                      {rooms.map((room, index) => (
                        <option key={`room-${index}`} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="category_id"
                      value={localFilters.category_id || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any Category</option>
                      {categories.map((category) => (
                        <option key={`cat-${category.id}`} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={localFilters.status || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any Status</option>
                      {availableStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status
                            .replace("_", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condition
                    </label>
                    <select
                      name="condition"
                      value={localFilters.condition || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any Condition</option>
                      {availableConditions.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition.charAt(0).toUpperCase() +
                            condition.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Advanced Filters Section - Two columns */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">
                  Advanced Filters
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Rate (%)
                    </label>
                    <select
                      name="tax_rate"
                      value={localFilters.tax_rate || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any Tax Rate</option>
                      {availableTaxRates.map((displayRate) => (
                        <option key={displayRate} value={displayRate}>
                          {displayRate}%
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Depreciation (%)
                    </label>
                    <select
                      name="depreciation_percent"
                      value={localFilters.depreciation_percent || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any Depreciation Rate</option>
                      {availableDepreciationRates.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age (years)
                    </label>
                    <select
                      name="age"
                      value={localFilters.age || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any Age</option>
                      {availableAges.map((age) => (
                        <option key={age} value={age}>
                          {age} {age === 1 ? "year" : "years"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Replacement Cost Applies
                    </label>
                    <select
                      name="replacement_cost_applies"
                      value={localFilters.replacement_cost_applies || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Replaced
                    </label>
                    <select
                      name="replaced"
                      value={localFilters.replaced || ""}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (e.target.value === "true") {
                          // Disable and hide replacement_cost_applies when replaced is true
                          const rcaSelect = document.querySelector(
                            'select[name="replacement_cost_applies"]',
                          );
                          if (rcaSelect) {
                            rcaSelect.parentElement.style.display = "none";
                          }
                        } else {
                          // Show replacement_cost_applies when replaced is not true
                          const rcaSelect = document.querySelector(
                            'select[name="replacement_cost_applies"]',
                          );
                          if (rcaSelect) {
                            rcaSelect.parentElement.style.display = "block";
                          }
                        }
                      }}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      No Loss or Damage
                    </label>
                    <select
                      name="no_loss_or_damage"
                      value={localFilters.no_loss_or_damage || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Not Involved in Claim
                    </label>
                    <select
                      name="not_involved_in_claim"
                      value={localFilters.not_involved_in_claim || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duplicate Item
                    </label>
                    <select
                      name="duplicate_item"
                      value={localFilters.duplicate_item || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clean Only
                    </label>
                    <select
                      name="cleaning_allowance"
                      value={localFilters.cleaning_allowance || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Any</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
            >
              Clear All Filters
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
