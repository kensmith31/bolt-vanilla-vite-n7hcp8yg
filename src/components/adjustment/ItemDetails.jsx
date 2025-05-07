import React from 'react';
import { cn } from '../../lib/utils';
import { PencilIcon, TrashIcon, PhotoIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export function ItemDetails({ item, categories }) {
  const [scrollPosition, setScrollPosition] = useState(0);

  // Helper function to format currency values
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleScroll = (direction) => {
    const container = document.getElementById('photo-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setScrollPosition(container.scrollLeft + scrollAmount);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Item Card */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-start gap-4 mb-3">
          <div className="flex-1 mr-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {item.description}
            </h2>
          </div>
          
          {item.comparable_link && (
            <a 
              href={item.comparable_link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              Link to Comparable
            </a>
          )}
          
          <div className="flex items-center gap-2">
            <button
              className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100"
              onClick={() => console.log('Edit item:', item.id)}
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
              onClick={() => console.log('Delete item:', item.id)}
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4 mt-2">
          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">Quantity</div>
            <div className="text-xs font-semibold text-gray-900">{item.quantity || '-'}</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">Category</div>
            <div className="text-xs font-semibold text-gray-900">
              {categories.find(c => c.id === item.category_id)?.name || '-'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">Room</div>
            <div className="text-xs font-semibold text-gray-900">{item.room || '-'}</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">Age</div>
            <div className="text-xs font-semibold text-gray-900">
              {item.age ? `${item.age} years` : '-'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">Condition</div>
            <div className="text-xs font-semibold text-gray-900">
              {item.condition?.charAt(0).toUpperCase() + item.condition?.slice(1) || '-'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-medium text-gray-500 mb-0.5">Status</div>
            <div className={cn(
              "inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full",
              {
                'bg-red-100 text-red-800': item.status === 'submitted',
                'bg-yellow-100 text-yellow-800': item.status === 'in_review',
                'bg-green-100 text-green-800': item.status === 'priced',
                'bg-blue-100 text-blue-800': item.status === 'adjusted',
                'bg-purple-100 text-purple-800': item.status === 'holdback_paid'
              }
            )}>
              {item.status?.replace('_', ' ').toUpperCase() || '-'}
            </div>
          </div>
        </div>

        {/* Photos Section */}
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-5 gap-3">
        {/* Valuation Section */}
        <div className="bg-white rounded-lg shadow p-2">
          <h3 className="text-[10px] font-semibold text-gray-900 mb-2 text-center">Valuation</h3>
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">Claimed RCV:</dt>
              <dd className="text-[10px] text-gray-900">{formatCurrency(item.claimed_rcv)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">Adjusted RCV:</dt>
              <dd className="text-[10px] text-gray-900">{formatCurrency(item.adjusted_rcv)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">Quantity:</dt>
              <dd className="text-[10px] text-gray-900">{item.quantity || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">RCV Total:</dt>
              <dd className="text-[10px] text-gray-900">{formatCurrency(item.rcv_total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">Tax Rate:</dt>
              <dd className="text-[10px] text-gray-900">
                {item.tax_rate ? `${(item.tax_rate * 100).toFixed(2)}%` : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">RCV + Tax:</dt>
              <dd className="text-[10px] text-gray-900">{formatCurrency(item.rcv_plus_tax)}</dd>
            </div>
          </dl>
        </div>

        {/* Depreciation Section */}
        <div className="bg-white rounded-lg shadow p-2">
          <h3 className="text-[10px] font-semibold text-gray-900 mb-2 text-center">Depreciation</h3>
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">Depreciation %:</dt>
              <dd className="text-[10px] text-gray-900">
                {item.depreciation_percent ? `${(item.depreciation_percent * 100).toFixed(0)}%` : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">Depreciation Amount:</dt>
              <dd className="text-[10px] text-gray-900">{formatCurrency(item.depreciation_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">ACV:</dt>
              <dd className="text-[10px] text-gray-900">{formatCurrency(item.acv)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">RC Applies:</dt>
              <dd className="text-[10px] text-gray-900">{item.replacement_cost_applies ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </div>

        {/* Recovery Section */}
        <div className="bg-white rounded-lg shadow p-2">
          <h3 className="text-[10px] font-semibold text-gray-900 mb-2 text-center">Recovery</h3>
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">Replaced:</dt>
              <dd className="text-[10px] text-gray-900">{item.replaced ? 'Yes' : 'No'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">Replacement Spent:</dt>
              <dd className="text-[10px] text-gray-900">{formatCurrency(item.replacement_spent)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[10px] font-medium text-gray-500">Holdback Due:</dt>
              <dd className="text-[10px] text-gray-900">{formatCurrency(item.holdback_due)}</dd>
            </div>
          </dl>
        </div>

        {/* Change History Section */}
        <div className="bg-white rounded-lg shadow p-2">
          <h3 className="text-[10px] font-semibold text-gray-900 mb-2 text-center">Change History</h3>
          <div className="space-y-2 h-[120px] overflow-y-auto pr-2">
            {item.change_history?.map((change, index) => (
              <div key={index} className="text-[10px] border-b border-gray-100 pb-1.5 last:border-0">
                <div className="flex justify-between items-start mb-0.5">
                  <span className="font-medium text-gray-900">{change.user_name}</span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(change.changed_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-gray-600">
                  Changed <span className="font-medium">{change.field_name}</span> from{' '}
                  <span className="line-through">{JSON.stringify(change.old_value)}</span> to{' '}
                  <span className="font-medium">{JSON.stringify(change.new_value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Photos Section */}
        <div className="bg-white rounded-lg shadow p-2">
          <h3 className="text-[10px] font-semibold text-gray-900 mb-2 text-center">Photos</h3>
          <div className="space-y-1.5">
            {item.photos && item.photos.length > 0 ? (
              <div className="relative">
                <button
                  onClick={() => handleScroll('left')}
                  className="absolute left-0 top-1/2 z-10 p-1 bg-white/80 rounded-full shadow hover:bg-white transform -translate-y-1/2 -translate-x-1/2"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
                
                <div
                  id="photo-container"
                  className="flex gap-2 overflow-x-auto scrollbar-hide py-2"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {item.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Item photo ${index + 1}`}
                      className="h-24 w-24 object-cover rounded-lg shadow-sm"
                    />
                  ))}
                </div>
                
                <button
                  onClick={() => handleScroll('right')}
                  className="absolute right-0 top-1/2 z-10 p-1 bg-white/80 rounded-full shadow hover:bg-white transform -translate-y-1/2 translate-x-1/2"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            ) : (
              <button
                className="flex items-center gap-2 px-2 py-1 text-[10px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 w-full justify-center"
                onClick={() => console.log('Add photos')}
              >
                <PhotoIcon className="h-4 w-4" />
                Add Photos
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}