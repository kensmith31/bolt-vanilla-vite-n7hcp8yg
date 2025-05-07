import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MagnifyingGlassIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export function ComparableSearchModal({ isOpen, onClose, item, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [adjustedRCV, setAdjustedRCV] = useState(item?.adjusted_rcv || '');
  const [comparableLink, setComparableLink] = useState(item?.comparable_link || '');
  const [comparableImage, setComparableImage] = useState(null);
  const [comparableImageUrl, setComparableImageUrl] = useState(item?.comparable_image || '');
  
  // Initialize search with item description
  useEffect(() => {
    if (item) {
      setSearchQuery(item.description);
      setAdjustedRCV(item.adjusted_rcv || item.claimed_rcv || '');
      setComparableLink(item.comparable_link || '');
      setComparableImageUrl(item.comparable_image || '');
    }
  }, [item]);

  // Function to handle search in new tab
  const handleSearch = () => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    window.open(searchUrl, '_blank');
  };

  // Function to handle screenshot upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setLoading(true);
      
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${item.id}-comparable-${Date.now()}.${fileExt}`;
      const filePath = `comparables/${fileName}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('item-images')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase
        .storage
        .from('item-images')
        .getPublicUrl(filePath);
        
      setComparableImage(file);
      setComparableImageUrl(data.publicUrl);
      
      toast.success('Screenshot uploaded');
    } catch (err) {
      console.error('Error uploading screenshot:', err);
      toast.error('Failed to upload screenshot');
    } finally {
      setLoading(false);
    }
  };

  // Function to save the updated item
  const handleSave = async () => {
    try {
      setLoading(true);
      
      const updates = {
        adjusted_rcv: parseFloat(adjustedRCV) || null,
        comparable_link: comparableLink || null,
        comparable_image: comparableImageUrl || null,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', item.id);
        
      if (error) throw error;
      
      toast.success('Item updated successfully');
      onUpdate(updates);
      onClose();
    } catch (err) {
      console.error('Error updating item:', err);
      toast.error('Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Find Comparable for Item #{item.item_number}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Item Information Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Item Information</h3>
            <p className="text-gray-900 font-semibold">{item.description}</p>
            <div className="mt-1 flex gap-4 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Claimed RCV:</span> ${item.claimed_rcv?.toFixed(2) || '0.00'}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Quantity:</span> {item.quantity || 1}
              </p>
            </div>
          </div>
          
          {/* Search Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Terms
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter search terms..."
                />
                <button
                  onClick={handleSearch}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                  Search Google
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                This will open Google search in a new tab. Find the best match, then return here to enter the details.
              </p>
            </div>
            
            {/* Comparable Details Section */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-700 mb-4">Comparable Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comparable Link
                  </label>
                  <input
                    type="url"
                    value={comparableLink}
                    onChange={(e) => setComparableLink(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Paste URL here..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjusted RCV (Replacement Cost Value)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={adjustedRCV}
                      onChange={(e) => setAdjustedRCV(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screenshot (optional)
                  </label>
                  <div className="mt-1 flex items-center space-x-4">
                    <label className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <PhotoIcon className="h-4 w-4 mr-2" />
                      {comparableImage ? 'Change Screenshot' : 'Upload Screenshot'}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                    {loading && <p className="text-sm text-gray-500">Uploading...</p>}
                  </div>
                  
                  {comparableImageUrl && (
                    <div className="mt-3">
                      <img
                        src={comparableImageUrl}
                        alt="Comparable item screenshot"
                        className="max-h-48 rounded border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}