import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserInfo, setCurrentUserInfo] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      console.log('Starting fetchUsers function');
      setLoading(true);
      setError(null);

      // Get current user's ID from auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Error getting current user:', authError);
        setError(`Authentication error: ${authError.message}`);
        return;
      }

      if (!authUser) {
        setError('No authenticated user found');
        return;
      }

      console.log('Current auth user ID:', authUser.id);

      // Get user's role directly from public.users table
      const { data: currentUser, error: roleError } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', authUser.id)
        .single();

      if (roleError) {
        console.error('Error getting user role:', roleError);
        setError(`Role fetch error: ${roleError.message}`);
        return;
      }

      console.log('Current user info from public.users:', currentUser);
      setCurrentUserInfo({
        id: authUser.id,
        email: currentUser.email,
        role: currentUser.role
      });

      // Fetch all users if the current user is an admin
      if (currentUser.role === 'admin') {
        console.log('Fetching all users as admin');
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, role, status, created_at')
          .order('created_at', { ascending: false });

        if (usersError) {
          console.error('Error fetching users:', usersError);
          setError(`Users fetch error: ${usersError.message}`);
          return;
        }

        console.log('Fetched users count:', allUsers?.length);
        console.log('Fetched users:', allUsers);
        setUsers(allUsers || []);
      } else {
        console.log('Non-admin user, only showing own info');
        setUsers([currentUser]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">User Management Debug</h2>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
          <h3 className="font-semibold">Error</h3>
          <p>{error}</p>
        </div>
      )}

      {currentUserInfo && (
        <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-md">
          <h3 className="font-semibold">Current User Info</h3>
          <pre className="mt-2 text-sm">
            {JSON.stringify(currentUserInfo, null, 2)}
          </pre>
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Users List ({users.length} users)</h3>
        <div className="bg-gray-50 p-4 rounded-md overflow-auto">
          <pre className="text-sm">
            {JSON.stringify(users, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}