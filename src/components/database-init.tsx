import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SetupGuide } from './setup-guide';

export function DatabaseInit({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initDatabase() {
      try {
        // Check if server API is available with timeout
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        );
        
        // Test if the server is available by attempting a simple KV operation
        // Using /health endpoint which is simpler and faster
        const healthCheck = await Promise.race([
          fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60/health`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
              },
            }
          ),
          timeoutPromise
        ]) as Response;

        if (!healthCheck.ok) {
          console.error('Server API health check failed');
          setError('Server connection error. Please ensure Edge Functions are deployed.');
          setIsInitialized(true);
          return;
        }

        setIsInitialized(true);
      } catch (err: any) {
        console.error('Database initialization error:', err);
        
        // If it's a timeout error, show a more helpful message
        if (err.message === 'Health check timeout') {
          setError('Server is taking too long to respond. Edge Functions may still be deploying.');
        } else {
          setError(err.message);
        }
        
        // Even if there's an error, allow the app to continue
        setIsInitialized(true);
      }
    }

    initDatabase();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold">Connection Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            The server Edge Function may still be deploying. Please wait a moment and refresh.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return <SetupGuide />;
  }

  return <>{children}</>;
}
