import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { DeskAdjusterDashboard } from './components/DeskAdjusterDashboard';
import { FieldAdjusterDashboard } from './components/FieldAdjusterDashboard';
import { PolicyholderDashboard } from './components/PolicyholderDashboard';
import { AdjustmentScreen } from './components/adjustment/AdjustmentScreen';
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Toaster } from 'react-hot-toast';

function HeaderNavigation() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center space-x-2 text-sm text-white/80">
      <Link to="/" className="hover:text-white flex items-center">
        <HomeIcon className="h-5 w-5" />
      </Link>
      {pathSegments.map((segment, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRightIcon className="h-4 w-4" />
          <span className="capitalize">{segment.replace('-', ' ')}</span>
        </div>
      ))}
    </nav>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('App component mounted');
    
    const handleInvalidToken = async (error) => {
      if (error?.message?.includes('Invalid Refresh Token')) {
        console.log('Invalid refresh token detected, signing out...');
        await supabase.auth.signOut();
        setSession(null);
        setUserRole(null);
        setError(null);
      } else {
        setError(error?.message);
      }
    };
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Initial session check:', session ? 'Session exists' : 'No session');
      
      if (error) {
        handleInvalidToken(error);
        setLoading(false);
        return;
      }
      
      setSession(session);
      
      if (session?.user?.id) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event);
      
      if (_event === 'TOKEN_REFRESHED' && !session) {
        console.log('Token refresh failed, signing out...');
        await supabase.auth.signOut();
        setSession(null);
        setUserRole(null);
        setError(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      
      if (session?.user?.id) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId) {
    try {
      console.log('Fetching role for user:', userId);
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select(`
          roles (
            name
          )
        `)
        .eq('id', userId)
        .single();

      if (roleError) throw roleError;
      if (!userData?.roles?.name) {
        throw new Error('No role found for user');
      }
      setUserRole(userData.roles.name);
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getDashboardComponent = () => {
    switch (userRole) {
      case 'admin':
        return <AdminDashboard />;
      case 'desk_adjuster':
        return <DeskAdjusterDashboard />;
      case 'field_adjuster':
        return <FieldAdjusterDashboard />;
      case 'policyholder':
        return <PolicyholderDashboard />;
      default:
        return <PolicyholderDashboard />;
    }
  };

  console.log('Current state:', { session: !!session, userRole, loading, error });

  if (loading) {
    return (
      <>
        <Toaster position="top-right" />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-accent">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (!session) {
    console.log('Rendering Auth component');
    return (
      <>
        <Toaster position="top-right" />
        <Auth />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Toaster position="top-right" />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="bg-red-50 text-red-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Error</h3>
            <p>{error}</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <div className="min-h-screen bg-background">
          <header className="bg-primary shadow">
            <div className="mx-auto w-[95%] py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <h1 className="text-4xl font-bold tracking-tight text-white font-montserrat">
                    Clarity Contents
                  </h1>
                  <HeaderNavigation />
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-white/80">
                    <span className="px-3 py-1 bg-white/10 rounded-full">
                      {userRole?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="bg-white text-primary px-4 py-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </header>
          <main>
            <div className="mx-auto w-[95%] py-6">
              <Routes>
                <Route path="/" element={getDashboardComponent()} />
                <Route path="/claim/:fileNumber/*" element={<AdjustmentScreen userRole={userRole} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </>
  );
}

export default App