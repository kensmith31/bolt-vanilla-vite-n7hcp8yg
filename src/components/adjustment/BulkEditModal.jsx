import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

export function BulkEditModal({ isOpen, onClose, selectedItems, onUpdate }) {
  const [field, setField] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newRoom, setNewRoom] = useState('');
  const [showAddRoom, setShowAddRoom] = useState(false);

  // Reset field and value when modal closes
  useEffect(() => {
    if (!isOpen) {
      setField('');
      setValue('');
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
        .from('items')
        .select('room')
        .not('room', 'is', null)
        .order('room');

      if (error) throw error;
      
      // Get unique rooms
      const uniqueRooms = [...new Set(data.map(item => item.room))];
      setRooms(uniqueRooms);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleAddRoom = async () => {
    if (!newRoom.trim()) return;
    
    setRooms(prev => [...prev, newRoom.trim()]);
    setValue(newRoom.trim());
    setNewRoom('');
    setShowAddRoom(false);
  };

  const fields = [
    { id: 'category_id', label: 'Category', type: 'category' },
    { id: 'room', label: 'Room', type: 'text' },
    { id: 'quantity', label: 'Quantity', type: 'number' },
    { id: 'age', label: 'Age', type: 'number' },
    { id: 'tax_rate', label: 'Tax Rate', type: 'tax_rate' },
    { id: 'depreciation_percent', label: 'Depreciation %', type: 'number' },
    { id: 'condition', label: 'Condition', type: 'select', 
      options: ['poor', 'fair', 'good', 'new'] },
    { id: 'replacement_cost_applies', label: 'RC Applies', type: 'boolean' },
    { id: 'replaced', label: 'Replaced', type: 'boolean' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Convert value based on field type
      let processedValue = value;
      let updateData = {};
      if (field === 'age' || field === 'quantity') {
        processedValue = parseFloat(value) || 0;
      } else if (field === 'tax_rate') {
        // Convert percentage to decimal with proper parsing
        processedValue = parseFloat(value) / 100;
        updateData = {
          tax_rate: processedValue,
          tax_rate_is_custom: true,
          updated_at: new Date().toISOString()
        };
      } else if (field === 'depreciation_percent') {
        processedValue = parseFloat(value) / 100; // Convert percentage to decimal
      } else if (field === 'replacement_cost_applies' || field === 'replaced') {
        processedValue = value === 'true';
      } else if (field === 'category_id') {
        processedValue = parseInt(value);
      }

      // If no special handling was needed, set the regular update data
      if (Object.keys(updateData).length === 0) {
        updateData = {
          [field]: processedValue,
          updated_at: new Date().toISOString()
        };
      }

      // Update all selected items
      const { error } = await supabase
        .from('items')
        .update(updateData)
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      // Ensure the update takes effect before closing
      setTimeout(() => {
        toast.success(`Updated ${selectedItems.size} items`);
        onUpdate(); // Trigger refresh through parent component
        onClose();
      }, 300);
      
    } catch (err) {
      console.error('Error updating items:', err);
      toast.error('Failed to update items: ' + err.message);
    } finally {
      setLoading(false);
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
                        setValue(''); // Reset value when field changes
                      }}
                      required
                    >
                      <option value="">Select a field</option>
                      {fields.map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {field && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        New Value
                      </label>
                      {field === 'category_id' ? (
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          required
                        >
                          <option value="">Select a category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      ) : field === 'room' ? (
                        <div className="space-y-2">
                          <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            required
                          >
                            <option value="">Select a room</option>
                            {rooms.map(room => (
                              <option key={room} value={room}>{room}</option>
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
                      ) : fields.find(f => f.id === field)?.type === 'boolean' ? (
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
                      ) : fields.find(f => f.id === field)?.type === 'select' ? (
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          required
                        >
                          <option value="">Select a value</option>
                          {fields.find(f => f.id === field)?.options.map(opt => (
                            <option key={opt} value={opt}>
                              {opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="relative">
                          <input
                            type="number"
                            step={field === 'tax_rate' ? "0.001" : field === 'quantity' ? "0.01" : "1"}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-8"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            min={field === 'quantity' ? "0.01" : "0"}
                            max={field === 'tax_rate' || field === 'depreciation_percent' ? "100" : undefined} 
                            required
                          />
                          {(field === 'tax_rate' || field === 'depreciation_percent') && (
                            <span className="absolute right-3 top-2 text-gray-500">%</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
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
                      {loading ? 'Updating...' : 'Update Items'}
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