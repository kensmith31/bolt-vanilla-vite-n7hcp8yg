import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast'; 
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

export function AddItemModal({ isOpen, onClose, claimId, onItemAdded, userRole }) {
  const [formData, setFormData] = useState({
    description: '',
    category_id: '',
    room: '',
    quantity: 1,
    claimed_rcv: '',
    age: '',
    condition: 'good',
    comparable_link: '',
    adjuster_notes: '',
  });

  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState('');
  const [showAddRoom, setShowAddRoom] = useState(false);

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
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast.error('Failed to load categories');
    }
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('room')
        .eq('claim_id', claimId)
        .not('room', 'is', null);

      if (error) throw error;
      const uniqueRooms = [...new Set(data.map(item => item.room))].filter(Boolean);
      setRooms(uniqueRooms);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      toast.error('Failed to load rooms');
    }
  };

  const handleAddRoom = () => {
    if (!newRoom.trim()) return;
    
    setRooms(prev => [...prev, newRoom.trim()]);
    setFormData(prev => ({ ...prev, room: newRoom.trim() }));
    setNewRoom('');
    setShowAddRoom(false);
  };

  const handleRoomChange = (e) => {
    const value = e.target.value;
    if (value === '__add_new__') {
      setShowAddRoom(true);
      setFormData(prev => ({ ...prev, room: '' }));
    } else {
      setFormData(prev => ({ ...prev, room: value }));
    }
  };

  // Map user roles to valid submission_source enum values
  const getSubmissionSource = (userRole) => {
    const roleMap = {
      'admin': 'adjuster',
      'desk_adjuster': 'adjuster',
      'field_adjuster': 'field_adjuster',
      'policyholder': 'policyholder'
    };
    return roleMap[userRole] || 'adjuster';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const addAnother = e.nativeEvent.submitter?.name === 'addAnother';
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Get claim's tax rate
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .select('default_tax_rate')
        .eq('file_number', claimId)
        .single();

      if (claimError) throw claimError;

      const itemData = {
        ...formData,
        claim_id: claimId,
        tax_rate: claimData.default_tax_rate ? claimData.default_tax_rate / 100 : null,
        quantity: parseFloat(formData.quantity),
        claimed_rcv: formData.claimed_rcv ? parseFloat(formData.claimed_rcv) : null,
        age: formData.age ? parseFloat(formData.age) : null,
        submitted_by: getSubmissionSource(userRole),
      };

      const { error } = await supabase
        .from('items')
        .insert([itemData]);

      if (error) throw error;

      toast.success('Item added successfully');

      // Trigger grid refresh
      const gridComponent = document.querySelector('[data-testid="inventory-grid"]');
      if (gridComponent) {
        gridComponent.dispatchEvent(new CustomEvent('refreshData'));
      }
      
      const resetForm = () => setFormData({
        description: '',
        category_id: '',
        room: '',
        quantity: 1,
        claimed_rcv: '',
        age: '',
        condition: 'good',
        adjuster_notes: '',
      });
      
      if (addAnother) {
        resetForm();
        // Focus the description field
        document.querySelector('input[name="description"]').focus();
      } else {
        onClose();
        resetForm();
      }
    } catch (err) {
      console.error('Error adding item:', err);
      toast.error('Failed to add item: ' + err.message);
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
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Grid for Category, Room, Quantity, Claimed RCV */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <select
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      >
                        <option value="">Select Category</option>
                        {categories.map(category => (
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
                            <option key={index} value={room}>{room}</option>
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
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddRoom();
                                } else if (e.key === 'Escape') {
                                  setShowAddRoom(false);
                                  setNewRoom('');
                                }
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddRoom(false);
                                setNewRoom('');
                                setFormData(prev => ({ ...prev, room: '' }));
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
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, claimed_rcv: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      />
                    </div>
                    <div>
                      <select
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, adjuster_notes: e.target.value })}
                    />
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="submit"
                      name="addAnother"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Add and Add Another
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Add Item
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