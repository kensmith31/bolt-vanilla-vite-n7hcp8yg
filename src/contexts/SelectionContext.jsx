import { create } from 'zustand';

export const useSelection = create((set, get) => ({
  selectedRows: new Set(),
  lastSelectedId: null,
  
  toggleRowSelection: (itemId) => 
    set((state) => {
      const newSet = new Set(state.selectedRows);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return { 
        selectedRows: newSet,
        lastSelectedId: itemId 
      };
    }),
  
  // New function for shift selection
  shiftSelectRows: (items, currentId) => {
    const state = get();
    const { lastSelectedId } = state;
    
    if (!lastSelectedId || lastSelectedId === currentId) {
      get().toggleRowSelection(currentId);
      return;
    }
    
    // Find indices of the last selected row and current row
    const lastIndex = items.findIndex(item => item.id === lastSelectedId);
    const currentIndex = items.findIndex(item => item.id === currentId);
    
    if (lastIndex === -1 || currentIndex === -1) {
      get().toggleRowSelection(currentId);
      return;
    }
    
    // Determine range to select (inclusive)
    const startIndex = Math.min(lastIndex, currentIndex);
    const endIndex = Math.max(lastIndex, currentIndex);
    
    set((state) => {
      const newSet = new Set(state.selectedRows);
      
      // Add all items in the range to selection
      for (let i = startIndex; i <= endIndex; i++) {
        newSet.add(items[i].id);
      }
      
      return {
        selectedRows: newSet,
        lastSelectedId: currentId
      };
    });
  },
  
  clearSelections: () => set({ 
    selectedRows: new Set(),
    lastSelectedId: null
  }),
  
  selectAll: (itemIds) => set({ 
    selectedRows: new Set(itemIds),
    lastSelectedId: null
  }),
  
  unselectAll: () => set({ 
    selectedRows: new Set(),
    lastSelectedId: null
  })
}));