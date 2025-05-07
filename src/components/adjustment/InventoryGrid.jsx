import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronDownIcon, ChevronUpIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { useSelection } from '../../contexts/SelectionContext';
import { ItemDetails } from './ItemDetails';
import toast from 'react-hot-toast';
import { useFilterStore } from '../../stores/filterStore';

export default function InventoryGrid({ claimId, mode = 'inventory', searchQuery = '' }) {
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
  const [newRoomName, setNewRoomName] = useState('');
  const [showAddRoomInput, setShowAddRoomInput] = useState(false);
  const lastMode = useRef(mode);
  const refreshKey = useRef(0);
  const { selectedRows, toggleRowSelection, shiftSelectRows } = useSelection();
  const [updating, setUpdating] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'item_number', direction: 'ascending' });
  const { filters, clearFilters } = useFilterStore();
  
  const editableCells = {
    enter_identify: ['description', 'room', 'category', 'quantity', 'claimed_rcv', 'age', 'condition'],
    price_verify: ['adjusted_rcv', 'tax_rate'],
    depreciation: ['depreciation_percent', 'replacement_cost_applies'],
    recovery: ['replaced', 'replacement_spent']
  };

  const fieldMapping = {
    description: 'description',
    room: 'room',
    category_id: 'category_id',
    quantity: 'quantity',
    claimed_rcv: 'claimed_rcv',
    age: 'age',
    condition: 'condition',
    adjusted_rcv: 'adjusted_rcv',
    rcv_total: 'rcv_total',
    tax_rate: 'tax_rate',
    rcv_plus_tax: 'rcv_plus_tax',
    depreciation_percent: 'depreciation_percent',
    depreciation_amount: 'depreciation_amount',
    acv: 'acv',
    replacement_cost_applies: 'replacement_cost_applies',
    replaced: 'replaced',
    replacement_spent: 'replacement_spent'
  };

  const numericFields = [
    'quantity',
    'claimed_rcv',
    'age',
    'adjusted_rcv',
    'tax_rate',
    'depreciation_percent',
    'replacement_spent'
  ];

  const handleCellClick = async (e, field, item) => {
    if (!editableCells[mode]?.includes(field)) return;
    
    // Handle tax rate editing
    if (field === 'tax_rate') {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.001';
      input.min = '0';
      input.max = '100';
      input.value = (item.tax_rate * 100).toFixed(3);
      input.className = 'w-full h-full text-right pr-6 border-none focus:ring-0';
      
      const wrapper = document.createElement('div');
      wrapper.className = 'relative w-full h-full';
      wrapper.appendChild(input);
      
      const percentSign = document.createElement('span');
      percentSign.textContent = '%';
      percentSign.className = 'absolute right-2 top-1/2 -translate-y-1/2 text-gray-500';
      wrapper.appendChild(percentSign);
      
      e.target.innerHTML = '';
      e.target.appendChild(wrapper);
      input.focus();
      input.select();

      const handleBlur = async () => {
        try {
          const newValue = parseFloat(input.value) / 100;
          if (isNaN(newValue)) return;

          const { error } = await supabase
            .from('items')
            .update({ tax_rate: newValue })
            .eq('id', item.id);

          if (error) throw error;
          refreshData();
        } catch (err) {
          console.error('Error updating tax rate:', err);
          toast.error('Failed to update tax rate');
        }
      };

      input.addEventListener('blur', handleBlur);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          input.blur();
        } else if (e.key === 'Escape') {
          refreshData();
        }
      });
      return;
    }

    setEditingCell({ id: item.id, field });
  };

  const renderCell = (item, field) => {
    switch (field) {
      case 'tax_rate':
        return mode === 'price_verify' ? (
          <div 
            className={cn(
              "w-full h-full flex items-center justify-end cursor-pointer hover:bg-gray-50 px-2",
              editableCells[mode]?.includes(field) && "hover:bg-blue-50/50"
            )}
            onClick={(e) => handleCellClick(e, field, item)}
          >
            {item.tax_rate != null ? `${(item.tax_rate * 100).toFixed(3)}%` : '-'}
          </div>
        ) : (
          <div className="text-right px-2">
            {item.tax_rate != null ? `${(item.tax_rate * 100).toFixed(3)}%` : '-'}
          </div>
        );
      default:
        return item[field] || '-';
    }
  };

  useEffect(() => {
    console.log('useEffect triggered with mode:', mode);
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
        filter => filter !== '' && filter !== null && filter !== undefined
      );
      
      if (!searchQuery?.trim() && !hasActiveFilters) {
        setFilteredItems(items);
        return;
      }

      const query = searchQuery?.toLowerCase().trim() || '';
      
      if (query.startsWith('#')) {
        const itemNumber = parseInt(query.substring(1));
        const filtered = items.filter(item => item.item_number === itemNumber);
        setFilteredItems(filtered);
        if (filtered.length === 0) {
          toast(`No items found with number ${itemNumber}`);
        }
        return;
      }

      const filtered = items.filter(item => {
        const matchesSearch = !query || (
          (item.item_number?.toString() || '').includes(query) ||
          (item.description?.toLowerCase() || '').includes(query) ||
          (item.room?.toLowerCase() || '').includes(query) ||
          (categories.find(c => c.id === item.category_id)?.name?.toLowerCase() || '').includes(query) ||
          (item.quantity?.toString() || '').includes(query) ||
          (item.claimed_rcv?.toString() || '').includes(query) ||
          (item.adjusted_rcv?.toString() || '').includes(query) ||
          (item.rcv_total?.toString() || '').includes(query) ||
          (item.rcv_plus_tax?.toString() || '').includes(query) ||
          (item.depreciation_amount?.toString() || '').includes(query) ||
          (item.acv?.toString() || '').includes(query) ||
          (item.holdback_due?.toString() || '').includes(query) ||
          (item.replacement_spent?.toString() || '').includes(query) ||
          (item.age?.toString() || '').includes(query) ||
          (item.status?.toLowerCase() || '').includes(query) ||
          (item.condition?.toLowerCase() || '').includes(query) ||
          (item.adjuster_notes?.toLowerCase() || '').includes(query) ||
          (item.comparable_link?.toLowerCase() || '').includes(query)
        );

        if (!matchesSearch) return false;
        
        return applyFiltersToItem(item);
      });

      setFilteredItems(filtered);
      
      if (filtered.length === 0 && items.length > 0 && (hasActiveFilters || query)) {
        toast('No items match the current criteria', {
          id: 'no-items-match',
          duration: 3000
        });
      }
    };
    
    const applyFiltersToItem = (item) => {
      if (!item) return false;
      
      if (filters.room && item.room !== filters.room) {
        return false;
      }
      
      if (filters.category_id && item.category_id !== parseInt(filters.category_id)) {
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
        if (item.tax_rate === null || Math.abs(item.tax_rate - taxRateFilter) > 0.0001) {
          return false;
        }
      }
      
      if (filters.depreciation_percent) {
        const depPercentFilter = parseFloat(filters.depreciation_percent) / 100;
        if (item.depreciation_percent === null || Math.abs(item.depreciation_percent - depPercentFilter) > 0.0001) {
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
        const rcAppliesFilter = filters.replacement_cost_applies === 'true';
        if (item.replacement_cost_applies !== rcAppliesFilter) {
          return false;
        }
      }
      
      if (filters.replaced) {
        const replacedFilter = filters.replaced === 'true';
        if (item.replaced !== replacedFilter) {
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
        .from('items')
        .select('room')
        .eq('claim_id', claimId)
        .not('room', 'is', null);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const uniqueRooms = [...new Set(data.map(item => item.room))].filter(Boolean);
        console.log('Fetched rooms for claim:', uniqueRooms);
        setRooms(uniqueRooms);
      } else {
        console.log('No rooms found for this claim');
        setRooms([]);
      }
    } catch (err) {
      console.error('Error fetching rooms for claim:', err);
      toast.error('Failed to load rooms');
    }
  }

  async function addNewRoom(roomName) {
    if (!roomName || roomName.trim() === '') {
      toast.error('Room name cannot be empty');
      return;
    }
    
    const newRooms = [...rooms, roomName.trim()];
    setRooms(newRooms);
    setNewRoomName('');
    setShowAddRoomInput(false);
    
    toast.success(`Added new room: ${roomName.trim()}`);
  }

  async function fetchCategories() {
    try {
      setCategoriesLoading(true);
      console.log('Fetching categories...');
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching categories from Supabase:', error);
        toast.error(`Failed to load categories: ${error.message}`);
        throw error;
      }
      
      console.log('Categories data received:', data);
      
      if (!data) {
        console.warn('No data returned from categories query (data is null)');
        toast.error('No category data returned from the database');
        setCategories([]);
        return;
      }
      
      if (data.length === 0) {
        console.warn('Categories table exists but is empty (0 records)');
        toast.error('No categories found in the database. Please add some categories first.');
      } else {
        console.log(`Successfully fetched ${data.length} categories`);
        if (data.length > 0) {
          console.log('First few categories:');
          data.slice(0, 3).forEach((cat, index) => {
            console.log(`Category ${index + 1}: ID=${cat.id}, Name=${cat.name}`);
          });
        }
      }
      
      setCategories(data);
      
      console.log('Categories fetch completed successfully');
    } catch (err) {
      console.error('Error in fetchCategories():', err);
      toast.error(`Failed to load categories: ${err.message}`);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }

async function applyDefaultTaxRate() {
  try {
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('default_tax_rate')
      .eq('file_number', claimId)
      .single();

    if (claimError) {
      throw claimError;
    }

    const defaultTaxRate = claim.default_tax_rate;

    if (defaultTaxRate === null || defaultTaxRate === undefined) {
      console.warn('No default tax rate set for this claim');
      return;
    }

    // Only update items where tax_rate_is_custom is false or null
    const { error: updateError } = await supabase
      .from('items')
      .update({ 
        tax_rate: defaultTaxRate,
        updated_at: new Date().toISOString()
      })
      .eq('claim_id', claimId)
      .is('tax_rate_is_custom', null);  // Only update where tax_rate_is_custom is null

    if (updateError) {
      throw updateError;
    }

    // Second query to catch false values
    const { error: updateError2 } = await supabase
      .from('items')
      .update({ 
        tax_rate: defaultTaxRate,
        updated_at: new Date().toISOString()
      })
      .eq('claim_id', claimId)
      .eq('tax_rate_is_custom', false);  // Only update where tax_rate_is_custom is false

    if (updateError2) {
      throw updateError2;
    }

console.log('Applied default tax rate to non-custom items only');
toast.success('Applied default tax rate to applicable items', {
  id: 'apply-default-tax-rate', // Adding an ID prevents duplicate toasts
});
  } catch (err) {
    console.error('Error applying default tax rate:', err);
    toast.error('Failed to apply default tax rate');
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
        if (value === '' || value === null || value === undefined) {
          parsedValue = null;
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            toast.error('Please enter a valid number');
            return;
          }
          parsedValue = numValue;
        }
      }

      const { data: currentItem, error: fetchError } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .limit(1)
        .single();

      if (fetchError) {
        console.error('Error fetching item:', fetchError);
        toast.error('Failed to fetch item before update');
        return;
      }

      if (!currentItem) {
        console.error('Item not found with ID:', itemId);
        toast.error('Item not found');
        fetchItems();
        return;
      }

      if (currentItem[dbField]?.toString() === parsedValue?.toString()) {
        setLoading(false);
        return;
      }

      const { data: updatedItem, error: updateError } = await supabase
        .from('items')
        .update({ 
          [dbField]: parsedValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating item:', updateError);
        toast.error('Failed to update item');
        return;
      }

      if (!updatedItem) {
        console.error('No item was updated');
        toast.error('Failed to update item');
        fetchItems();
        return;
      }

      setItems(items.map(item =>
        item.id === itemId
          ? updatedItem
          : item
      ));

      toast.success('Item updated successfully');
    } catch (err) {
      console.error('Error updating item:', err);
      toast.error('Failed to update item');
      
      fetchItems();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e, itemId, field, currentIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAndMove(itemId, field, e.target.value, null);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const value = e.target.value;
      const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
      let nextCell = null;
      
      if (nextIndex >= 0 && nextIndex < editableCells.length) {
        nextCell = { id: itemId, field: editableCells[nextIndex] };
      } else {
        const currentRowIndex = items.findIndex(item => item.id === itemId);
        const nextRowIndex = e.shiftKey ? currentRowIndex - 1 : currentRowIndex + 1;
        if (nextRowIndex >= 0 && nextRowIndex < items.length) {
          const nextRowId = items[nextRowIndex].id;
          nextCell = {
            id: nextRowId,
            field: e.shiftKey ? editableCells[editableCells.length - 1] : editableCells[0]
          };
        }
      }
      saveAndMove(itemId, field, value, nextCell);
    }
  };

  const saveAndMove = async (itemId, field, value, nextCell) => {
    try {
      await handleCellEdit(itemId, field, value);
      setEditingCell(nextCell);
    } catch (err) {
      console.error('Error saving cell:', err);
      toast.error('Failed to save changes');
      
      const input = document.activeElement;
      if (input && input.select) {
        input.select();
      }
    }
  };

  useEffect(() => {
    const handleRefresh = () => {
      refreshKey.current += 1;
      fetchItems();
      applyDefaultTaxRate();
    };

    const element = gridRef.current;
    if (element) {
      element.addEventListener('refreshData', handleRefresh);
      return () => element.removeEventListener('refreshData', handleRefresh);
    }
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      setError(null);

      const { error: connectionError } = await supabase.from('claims')
        .select('count', { count: 'exact', head: true });

      if (connectionError) {
        throw new Error('Unable to connect to database. Please check your connection and try again.');
      }

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('claim_id', claimId)
        .order('item_number', { ascending: true });

      if (error) {
        throw error;
      }

      setItems(data || []);
      setFilteredItems(data || []);
      retryCount.current = 0;
    } catch (err) {
      console.error('Error fetching items:', err);
      
      if (err.message.includes('Failed to fetch') && retryCount.current < maxRetries) {
        retryCount.current += 1;
        console.log(`Retrying fetch attempt ${retryCount.current} of ${maxRetries}...`);
        setTimeout(fetchItems, 1000 * retryCount.current);
        return;
      }

      setError(
        err.message === 'Failed to fetch'
          ? 'Unable to connect to the server. Please check your internet connection and try again.'
          : `Error loading items: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchItemHistory(itemId) {
    try {
      const { data, error } = await supabase
        .from('item_change_history')
        .select(`
          id,
          changed_at,
          field_name,
          old_value,
          new_value,
          user_name
        `)
        .eq('item_id', itemId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setChangeHistory(prev => ({ ...prev, [itemId]: data }));
    } catch (err) {
      console.error('Error fetching item history:', err);
      setError('Unable to load item history. Please try again later.');
    }
  }

  const handleReplacedChange = async (e, itemId) => {
    if (updating) return;

    const newValue = e.target.checked;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('items')
        .update({ replaced: newValue })
        .eq('id', itemId);

      if (error) throw error;

      toast.success(`Item marked as ${newValue ? 'replaced' : 'not replaced'}`);

      setItems(items.map(item => 
        item.id === itemId 
          ? { ...item, replaced: newValue }
          : item
      ));
    } catch (err) {
      console.error('Error updating item:', err);
      toast.error('Failed to update replacement status');
    } finally {
      setUpdating(false);
    }
  };

  const handleExpandItem = async (itemId) => {
    if (mode !== 'inventory') return;
    
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
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const columns = useMemo(() => {
    const baseColumns = [
      { key: 'item_number', label: '#', width: 'w-20', sortable: true },
      { key: 'description', label: 'Description', width: 'w-80', sortable: true },
    ];

    const modeColumns = {
      inventory: [
        ...baseColumns,
        { key: 'claimed_rcv', label: 'RCV Claimed', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'adjusted_rcv', label: 'Adjusted RCV', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'photos', label: 'Photos', width: 'w-32 min-w-[128px]', sortable: false },
        { key: 'status', label: 'Status', width: 'w-32 min-w-[128px]', sortable: true },
      ],
      enter_identify: [
        ...baseColumns,
        { key: 'room', label: 'Room', width: 'w-48 min-w-[192px]', sortable: true },
        { key: 'category', label: 'Category', width: 'w-48 min-w-[192px]', sortable: true },
        { key: 'quantity', label: 'Quantity', width: 'w-32 min-w-[128px]', sortable: true },
        { key: 'claimed_rcv', label: 'Claimed RCV', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'age', label: 'Age', width: 'w-32 min-w-[128px]', sortable: true },
        { key: 'condition', label: 'Condition', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'status', label: 'Status', width: 'w-32 min-w-[128px]', sortable: true }
      ],
      price_verify: [
        ...baseColumns,
        { key: 'claimed_rcv', label: 'RCV Claimed', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'quantity', label: 'Quantity', width: 'w-32 min-w-[128px]', sortable: true },
        { key: 'adjusted_rcv', label: 'Adjusted RCV', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'rcv_total', label: 'RCV Total', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'tax_rate', label: 'Tax Rate', width: 'w-32 min-w-[128px]', sortable: true },
        { key: 'rcv_plus_tax', label: 'RCV + Tax', width: 'w-40 min-w-[160px]', sortable: true }
      ],
      depreciation: [
        ...baseColumns,
        { key: 'rcv_plus_tax', label: 'RCV + Tax', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'age', label: 'Age', width: 'w-32 min-w-[128px]', sortable: true },
        { key: 'condition', label: 'Condition', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'depreciation_percent', label: 'Dep %', width: 'w-32 min-w-[128px]', sortable: true },
        { key: 'depreciation_amount', label: 'Dep Amt', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'acv', label: 'ACV', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'replacement_cost_applies', label: 'RC Applies', width: 'w-32 min-w-[128px]', sortable: true },
      ],
      recovery: [
        ...baseColumns,
        { key: 'rcv_plus_tax', label: 'RCV + Tax', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'depreciation_amount', label: 'Dep Amt', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'acv', label: 'ACV', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'replaced', label: 'Replaced', width: 'w-32 min-w-[128px]', sortable: true },
        { key: 'replacement_spent', label: 'Amt Spent', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'holdback_due', label: 'Holdback Due', width: 'w-40 min-w-[160px]', sortable: true },
        { key: 'receipts', label: 'Receipts', width: 'w-32 min-w-[128px]', sortable: false },
      ],
    };

    let columns = modeColumns[mode] || baseColumns;
    
    return columns;
  }, [mode]);

  const sortedItems = useMemo(() => {
    let sortableItems = [...filteredItems];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'category') {
          const catA = categories.find(c => c.id === a.category_id)?.name || '';
          const catB = categories.find(c => c.id === b.category_id)?.name || '';
          if (sortConfig.direction === 'ascending') {
            return catA.localeCompare(catB);
          }
          return catB.localeCompare(catA);
        }
        
        if (a[sortConfig.key] === undefined || a[sortConfig.key] === null) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        if (b[sortConfig.key] === undefined || b[sortConfig.key] === null) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        
        if (typeof a[sortConfig.key] === 'string') {
          return sortConfig.direction === 'ascending' 
            ? a[sortConfig.key].localeCompare(b[sortConfig.key])
            : b[sortConfig.key].localeCompare(a[sortConfig.key]);
        }
        
        return sortConfig.direction === 'ascending' 
          ? a[sortConfig.key] - b[sortConfig.key]
          : b[sortConfig.key] - a[sortConfig.key];
      });
    }
    return sortableItems;
  }, [filteredItems, sortConfig, categories]);

  const getVisibleColumns = (item, defaultColumns) => {
    if (mode === 'recovery' && !item.replacement_cost_applies) {
      return defaultColumns.filter(
        (col) => !['replaced', 'replacement_spent', 'holdback_due', 'receipts'].includes(col.key)
      );
    }
    if (mode === 'recovery' && !item.replaced) {
      return defaultColumns.filter(
        (col) => !['replacement_spent', 'holdback_due', 'receipts'].includes(col.key)
      );
    }
    return defaultColumns;
  };

  return (
    <div 
      ref={gridRef}
      data-testid="inventory-grid"
      className="h-full flex flex-col"
      onRefreshData={() => fetchItems()}>
      <div className="overflow-auto h-full">
        {loading && !items.length ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-lg">
            <h3  className="font-semibold">Error</h3>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {filteredItems.length === 0 && items.length > 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="text-lg mb-4">
                  {searchQuery
                    ? `No items match "${searchQuery}"`
                    : 'No items match the current filters'}
                </p>
                {Object.values(filters).some(f => f !== '' && f !== null && f !== undefined) && (
                  <button
                    onClick={() => {
                      clearFilters();
                      toast.success('Filters cleared');
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
            
            {filteredItems.length > 0 && (
              <table className="min-w-full divide-y divide-gray-200 relative">
                <thead className="bg-gray-50 sticky top-0 z-20">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={cn(
                          "h-8 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 overflow-hidden",
                          column.key === 'item_number' && "sticky left-0 z-20 w-[5%]",
                          column.key === 'description' && "sticky left-[5%] z-20 w-[20%]",
                          column.width,
                          column.sortable && "cursor-pointer hover:bg-gray-100"
                        )}
                        onClick={() => column.sortable && requestSort(column.key)}
                      >
                        <div className="flex items-center">
                          <span>{column.label}</span>
                          {column.sortable && (
                            <span className="ml-1 flex-shrink-0">
                              {sortConfig.key === column.key ? (
                                sortConfig.direction === 'ascending' ? (
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
                    {mode === 'inventory' && (
                      <th className="h-8 w-10 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                        <span className="sr-only">Expand</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedItems.map((item) => {
                    const visibleColumns = getVisibleColumns(item, columns);
                    
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
    "group transition-colors duration-150 cursor-pointer h-14 select-none",
    selectedRows.has(item.id) ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
  )}
>
                          {visibleColumns.map((column) => {
                            if (column.key === 'replacement_cost_applies' || column.key === 'replaced') {
                              return (
                                <td
                                  key={column.key}
                                  className={cn(
                                    "px-6 py-2 whitespace-nowrap text-sm text-gray-900 transition-colors duration-150 h-14 cursor-pointer",
                                    column.key === 'item_number' && "sticky left-0 z-10 w-[5%]",
                                    column.key === 'description' && "sticky left-[5%] z-10 w-[20%]",
                                    selectedRows.has(item.id) 
                                      ? "bg-blue-50 group-hover:bg-blue-100"
                                      : column.key === 'item_number' || column.key === 'description'
                                        ? "bg-white group-hover:bg-gray-50"
                                        : ""
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newValue = !item[column.key];
                                    handleCellEdit(item.id, column.key, newValue);
                                  }}
                                >
                                  <div className="flex justify-center items-center h-full w-full">
                                    <input
                                      type="checkbox"
                                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      checked={Boolean(item[column.key])}
                                      disabled={updating}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        if (column.key === 'replaced') {
                                          handleReplacedChange(e, item.id);
                                        } else {
                                          handleCellEdit(item.id, column.key, e.target.checked);
                                        }
                                      }}
                                    />
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td 
                                key={column.key} 
                                onClick={() => {
                                  if (editableCells[mode]?.includes(column.key)) {
                                    setEditingCell({ id: item.id, field: column.key });
                                  }
                                }}
                                className={cn(
                                  "px-6 py-2 whitespace-nowrap text-sm text-gray-900 transition-colors duration-150 h-14 overflow-hidden",
                                  column.key === 'item_number' && "sticky left-0 z-10 w-[5%]",
                                  column.key === 'description' && "sticky left-[5%] z-10 w-[20%]",
                                  editableCells[mode]?.includes(column.key) && "cursor-pointer hover:bg-gray-50",
                                  selectedRows.has(item.id) 
                                    ? "bg-blue-50 group-hover:bg-blue-100"
                                    : column.key === 'item_number' || column.key === 'description'
                                      ? "bg-white group-hover:bg-gray-50"
                                      : ""
                                )}
                              >
                                {editingCell?.id === item.id && editingCell?.field === column.key ? (
                                  (() => {
                                    if (column.key === 'room') {
                                      return (
                                        <div className="relative h-9">
                                          {showAddRoomInput ? (
                                            <div className="flex flex-col space-y-2">
                                              <input
                                                type="text"
                                                className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                value={newRoomName}
                                                onChange={(e) => setNewRoomName(e.target.value)}
                                                autoFocus
                                                placeholder="Enter room name"
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addNewRoom(newRoomName);
                                                    saveAndMove(item.id, 'room', newRoomName, null);
                                                  } else if (e.key === 'Escape') {
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
                                                    saveAndMove(item.id, 'room', newRoomName, null);
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
                                              value={item.room || ''}
                                              onChange={(e) => {
                                                if (e.target.value === 'add_new_room') {
                                                  setShowAddRoomInput(true);
                                                } else {
                                                  saveAndMove(item.id, 'room', e.target.value, null);
                                                }
                                              }}
                                              onBlur={(e) => {
                                                if (e.target.value !== 'add_new_room') {
                                                  saveAndMove(item.id, 'room', e.target.value, null);
                                                }
                                              }}
                                              onKeyDown={(e) => handleKeyDown(e, item.id, 'room', editableCells[mode].indexOf(column.key))}
                                            >
                                              <option value="">Select a room</option>
                                              {rooms.map((roomName, index) => (
                                                <option key={`room-${index}`} value={roomName}>
                                                  {roomName}
                                                </option>
                                              ))}
                                              <option value="add_new_room" className="font-semibold text-blue-600">
                                                + Add Room
                                              </option>
                                            </select>
                                          )}
                                        </div>
                                      );
                                    } else if (column.key === 'condition') {
                                      return (
                                        <select
                                          autoFocus
                                          className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                          style={{ minWidth: '100%' }}
                                          defaultValue={item[column.key]}
                                          onBlur={(e) => {
                                            saveAndMove(item.id, column.key, e.target.value, null);
                                          }}
                                          onKeyDown={(e) => handleKeyDown(e, item.id, column.key, editableCells[mode].indexOf(column.key))}
                                        >
                                          <option value="poor">Poor</option>
                                          <option value="fair">Fair</option>
                                          <option value="good">Good</option>
                                          <option value="new">New</option>
                                        </select>
                                      );
                                    } else if (column.key === 'category') {
                                      return (
                                        <select
                                          autoFocus
                                          name="category_id"
                                          className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                          style={{ minWidth: '100%' }}
                                          value={item.category_id || ''}
                                          onChange={(e) => {
                                            const value = e.target.value ? parseInt(e.target.value) : null;
                                            saveAndMove(item.id, 'category_id', value, null);
                                          }}
                                          onBlur={(e) => {
                                            const value = e.target.value ? parseInt(e.target.value) : null;
                                            saveAndMove(item.id, 'category_id', value, null);
                                          }}
                                          onKeyDown={(e) => handleKeyDown(e, item.id, 'category_id', editableCells[mode].indexOf(column.key))}
                                        >
                                          <option value="">Select a category</option>
                                          {categoriesLoading ? (
                                            <option value="" disabled>Loading categories...</option>
                                          ) : categories.length > 0 ? (
                                            categories.map(cat => (
                                              <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                              </option>
                                            ))
                                          ) : (
                                            <option value="" disabled>No categories available</option>
                                          )}
                                        </select>
                                      );
                                    } else {
                                      return (
                                        <input
                                          type={column.key === 'quantity' || column.key === 'claimed_rcv' || column.key === 'age' ? 'number' : 'text'}
                                          step={column.key === 'quantity' || column.key === 'claimed_rcv' ? '0.01' : column.key === 'age' ? '0.1' : undefined}
                                          min={column.key === 'quantity' || column.key === 'claimed_rcv' || column.key === 'age' ? '0' : undefined}
                                          className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                          style={{ minWidth: '100%' }}
                                          defaultValue={item[column.key]}
                                          autoFocus
                                          onBlur={(e) => {
                                            saveAndMove(item.id, column.key, e.target.value, null);
                                          }}
                                          onKeyDown={(e) => handleKeyDown(e, item.id, column.key, editableCells[mode].indexOf(column.key))}
                                        />
                                      );
                                    }
                                  })()
                                ) : column.key === 'description' ? (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-gray-900">
                                      {item[column.key] || '-'}
                                    </span>
                                    <div className="text-xs text-gray-500 pointer-events-none">
                                      {item.room && item.category_id
                                        ? `${item.room} • ${categories.find(c => c.id === item.category_id)?.name || 'Category ' + item.category_id}`
                                        : item.room || (item.category_id ? categories.find(c => c.id === item.category_id)?.name || 'Category ' + item.category_id : '')}
                                    </div>
                                  </div>
                                ) : column.key === 'room' ? (
                                  item.room || '-'
                                ) : column.key === 'condition' ? (
                                  item[column.key] || '-'
                                ) : column.key === 'status' ? (
                                  <span className={cn(
                                    "px-2 py-1 text-xs font-medium rounded-full",
                                    {
                                      'bg-red-100 text-red-800': item.status === 'submitted',
                                      'bg-yellow-100 text-yellow-800': item.status === 'in_review',
                                      'bg-green-100 text-green-800': item.status === 'priced',
                                      'bg-blue-100 text-blue-800': item.status === 'adjusted',
                                      'bg-purple-100 text-purple-800': item.status === 'holdback_paid'
                                    }
                                  )}>
                                    {item.status?.replace('_', ' ').toUpperCase()}
                                  </span>
                                ) : column.key === 'photos' ? (
                                  item[column.key] && item[column.key].length > 0 ? (
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
                                  ) : '-'
                                ) : column.key === 'claimed_rcv' ? (
                                  item[column.key] ? (
                                    <span className="text-gray-900">
                                      ${item[column.key]?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  ) : '-'
                                ) : column.key === 'adjusted_rcv' || column.key === 'rcv_total' || column.key === 'rcv_plus_tax' || column.key === 'replacement_spent' || column.key === 'holdback_due' ? (
                                  item[column.key] ? (
                                    <span className="text-gray-900">
                                      ${item[column.key].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  ) : '-'
                                ) : column.key === 'tax_rate' ? (
                                  item[column.key] !== null && item[column.key] !== undefined 
                                    ? (() => {
                                        const taxRate = parseFloat(item[column.key]);
                                        const taxPercent = taxRate * 100;
                                        const roundedTaxPercent = Math.round(taxPercent * 1000) / 1000;
                                        return `${roundedTaxPercent.toFixed(3)}%`;
                                      })()
                                    : '-'
                                ) : column.key === 'depreciation_percent' ? (
                                  editingCell?.id === item.id && editingCell?.field === column.key ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="any"
                                      className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      style={{ minWidth: '100%' }}
                                      defaultValue={item[column.key] ? (item[column.key] * 100).toFixed(0) : ''}
                                      autoFocus
                                      onBlur={(e) => {
                                        let value = e.target.value ? parseFloat(e.target.value) : null;
                                        if (value !== null) {
                                          value = Math.max(0, Math.min(100, value));
                                          value = value / 100;
                                          handleCellEdit(item.id, column.key, value);
                                        } else {
                                          handleCellEdit(item.id, column.key, null);
                                        }
                                        setEditingCell(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const value = e.target.value ? parseFloat(e.target.value) : null;
                                          if (value !== null) {
                                            const normalizedValue = Math.max(0, Math.min(100, value)) / 100;
                                            handleCellEdit(item.id, column.key, normalizedValue);
                                          } else {
                                            handleCellEdit(item.id, column.key, null);
                                          }
                                          setEditingCell(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingCell(null);
                                        }
                                      }}
                                    />
                                  ) : (
                                    item[column.key] ? `${(item[column.key] * 100).toFixed(0)}%` : '-'
                                  )
                                ) : column.key === 'depreciation_amount' || column.key === 'acv' ? (
                                  item[column.key] ? `$${item[column.key].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
                                ) : column.key === 'adjusted_rcv' ? (
                                  editingCell?.id === item.id && editingCell?.field === column.key ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      style={{ minWidth: '100%' }}
                                      defaultValue={item[column.key]}
                                      autoFocus
                                      onBlur={(e) => {
                                        saveAndMove(item.id, column.key, parseFloat(e.target.value) || null, null);
                                      }}
                                      onKeyDown={(e) => handleKeyDown(e, item.id, column.key, editableCells[mode].indexOf(column.key))}
                                    />
                                  ) : (
                                    item[column.key] ? `${item[column.key].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
                                  )
                                ) : column.key === 'replacement_spent' ? (
                                  editingCell?.id === item.id && editingCell?.field === column.key ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="w-full h-9 bg-white border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      style={{ minWidth: '100%' }}
                                      defaultValue={item[column.key]}
                                      autoFocus
                                      onBlur={(e) => {
                                        saveAndMove(item.id, column.key, parseFloat(e.target.value) || null, null);
                                      }}
                                      onKeyDown={(e) => handleKeyDown(e, item.id, column.key, editableCells[mode].indexOf(column.key))}
                                    />
                                  ) : (
                                    item[column.key] ? `${item[column.key].toFixed(2)}` : '-'
                                  )
                                ) : column.key === 'comparable_link' ? (
                                  item[column.key] ? (
                                    <a
                                      href={item[column.key]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View
                                    </a>
                                  ) : '-'
                                ) : column.key === 'receipts' ? (
                                  item[column.key]?.length > 0 ? (
                                    <div className="flex items-center space-x-2">
                                      <img
                                        src={item[column.key][0]}
                                        alt="Receipt preview"
                                        className="h-8 w-8 object-cover rounded cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(item[column.key][0], '_blank');
                                        }}
                                      />
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
                                        console.log('Upload receipt for item:', item.id);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                      Upload Receipt
                                    </button>
                                  )
                                ) : column.key === 'category' ? (
                                  categories.find(c => c.id === item.category_id)?.name || '-'
                                ) : (
                                  item[column.key] || '-'
                                )}
                              </td>
                            );
                          })}
                          {mode === 'inventory' && (
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
                        {mode === 'inventory' && expandedItem === item.id && (
                          <tr>
                            <td 
                              colSpan={columns.length + (mode === 'inventory' ? 1 : 0)} 
                              className="px-6 py-2 bg-gray-50 transition-all duration-300"
                            >
                              <div className="p-3">
                                <ItemDetails item={{ ...item, change_history: changeHistory[item.id] }} categories={categories} />
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
    </div>
  );
}

export { InventoryGrid }