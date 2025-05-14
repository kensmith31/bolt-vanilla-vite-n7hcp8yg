// Update to filterStore.js to add a clearFilters function
import { create } from "zustand";

export const useFilterStore = create((set) => ({
  filters: {
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
    cleaning_allowance_amount: "",
  },

  // Set a single filter
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),

  // Set multiple filters at once
  setFilters: (filterObject) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filterObject,
      },
    })),

  // Add this new function to clear all filters
  clearFilters: () =>
    set({
      filters: {
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
        cleaning_allowance_amount: "",
      },
    }),

  // Check if any filters are active
  hasActiveFilters: (state) =>
    Object.values(state.filters).some(
      (filter) => filter !== "" && filter !== null && filter !== undefined,
    ),
}));
