import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/use-auth';
import { LoginPage } from './pages/login-page';
import { HomePage } from './pages/home-page';
import { PropertiesPage } from './pages/properties-page';
import { InspectionEditPage } from './pages/inspection-edit-page';
import { PreviewPage } from './pages/preview-page';
import { AdminPage } from './pages/admin-page';
import { DatabaseInit } from './components/database-init';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { useState, useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      // Increase cache time for photo data to persist across navigation
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes (renamed from cacheTime in v5)
    },
  },
});

type Route =
  | { page: 'home' }
  | { page: 'properties' }
  | { page: 'admin' }
  | { page: 'inspection-edit'; id: string }
  | { page: 'preview'; id: string; token?: string };

const BASE_PATH = '/AB-Property-Inspection-Clerks';

function Router({ userRole }: { userRole: 'admin' | 'clerk' | null }) {
  const [route, setRoute] = useState<Route>({ page: 'home' });

  useEffect(() => {
    const handlePopState = () => {
      let path = window.location.pathname;
      // Remove base path if present
      if (path.startsWith(BASE_PATH)) {
        path = path.slice(BASE_PATH.length) || '/';
      }
      const searchParams = new URLSearchParams(window.location.search);

      if (path === '/' || path === '') {
        setRoute({ page: 'home' });
      } else if (path === '/properties') {
        setRoute({ page: 'properties' });
      } else if (path === '/admin') {
        // Check if user has admin role
        if (userRole !== 'admin') {
          // Redirect non-admin users to home
          toast.error('Access Denied', {
            description: 'You must be an admin to access this page.',
          });
          window.history.replaceState({}, '', BASE_PATH + '/');
          setRoute({ page: 'home' });
        } else {
          setRoute({ page: 'admin' });
        }
      } else if (path.startsWith('/inspections/') && path.endsWith('/edit')) {
        const id = path.split('/')[2];
        setRoute({ page: 'inspection-edit', id });
      } else if (path.startsWith('/preview/')) {
        const id = path.split('/')[2];
        const token = searchParams.get('token') || undefined;
        setRoute({ page: 'preview', id, token });
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [userRole]);

  const navigate = (newRoute: Route) => {
    let path = '/';
    let search = '';

    if (newRoute.page === 'home') {
      path = '/';
    } else if (newRoute.page === 'properties') {
      path = '/properties';
    } else if (newRoute.page === 'admin') {
      // Check if user has admin role before allowing navigation
      if (userRole !== 'admin') {
        toast.error('Access Denied', {
          description: 'You must be an admin to access this page.',
        });
        return; // Don't navigate
      }
      path = '/admin';
    } else if (newRoute.page === 'inspection-edit') {
      path = `/inspections/${newRoute.id}/edit`;
    } else if (newRoute.page === 'preview') {
      path = `/preview/${newRoute.id}`;
      if (newRoute.token) {
        search = `?token=${newRoute.token}`;
      }
    }

    window.history.pushState({}, '', BASE_PATH + path + search);
    setRoute(newRoute);
  };

  switch (route.page) {
    case 'home':
      return <HomePage onNavigate={navigate} />;
    case 'properties':
      return <PropertiesPage onNavigate={navigate} />;
    case 'admin':
      return <AdminPage onNavigate={navigate} />;
    case 'inspection-edit':
      return <InspectionEditPage id={route.id} onNavigate={navigate} />;
    case 'preview':
      return <PreviewPage id={route.id} token={route.token} onNavigate={navigate} />;
  }
}

function AppContent() {
  // Check if current URL is a preview page with token (shareable link) FIRST
  // Do this check synchronously before any async operations
  let path = window.location.pathname;
  // Remove base path if present
  if (path.startsWith(BASE_PATH)) {
    path = path.slice(BASE_PATH.length) || '/';
  }
  const searchParams = new URLSearchParams(window.location.search);
  const isPreviewWithToken = path.startsWith('/preview/') && searchParams.has('token');
  
  if (isPreviewWithToken) {
    const id = path.split('/')[2];
    const token = searchParams.get('token')!;
    
    // Create a simple navigate function for shareable links
    const navigate = (newRoute: Route) => {
      let path = '/';
      let search = '';
      
      if (newRoute.page === 'home') {
        path = '/';
      } else if (newRoute.page === 'properties') {
        path = '/properties';
      } else if (newRoute.page === 'admin') {
        path = '/admin';
      } else if (newRoute.page === 'inspection-edit') {
        path = `/inspections/${newRoute.id}/edit`;
      } else if (newRoute.page === 'preview') {
        path = `/preview/${newRoute.id}`;
        if (newRoute.token) {
          search = `?token=${newRoute.token}`;
        }
      }
      
      window.location.href = path + search;
    };
    
    return <PreviewPage id={id} token={token} onNavigate={navigate} />;
  }

  // For non-preview routes, proceed with normal auth flow
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Router userRole={userRole} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseInit>
        <AppContent />
        <Toaster />
      </DatabaseInit>
    </QueryClientProvider>
  );
}
