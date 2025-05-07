import { useState } from 'react';
import { UserList } from './UserList';
import { ClaimList } from './ClaimList';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('claims');

  return (
    <div className="space-y-6 w-[95%] mx-auto">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('claims')}
            className={`${
              activeTab === 'claims'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            Claims Management
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            User Management
          </button>
        </nav>
      </div>

      {activeTab === 'claims' ? (
        <ClaimList />
      ) : (
        <UserList />
      )}
    </div>
  );
}