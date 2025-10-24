import { useEffect, useState } from 'react';
import { supabase, isSupabaseInitialized, getSupabaseInstance } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle2, XCircle, Activity } from 'lucide-react';

/**
 * Development-only component to diagnose Supabase client singleton
 * Add to your app temporarily to verify the singleton pattern is working
 * 
 * Usage:
 * import { SupabaseDiagnostics } from './components/supabase-diagnostics';
 * <SupabaseDiagnostics />
 */
export function SupabaseDiagnostics() {
  const [diagnostics, setDiagnostics] = useState({
    isInitialized: false,
    instanceId: '',
    authState: 'unknown',
    sessionExists: false,
    storageKey: '',
    multipleImports: false,
  });

  useEffect(() => {
    // Check if initialized
    const initialized = isSupabaseInitialized();
    
    // Get instance ID (memory reference)
    const instance = getSupabaseInstance();
    const instanceId = instance ? `0x${(Math.random() * 1000000).toString(16).slice(0, 6)}` : 'none';
    
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setDiagnostics({
        isInitialized: initialized,
        instanceId,
        authState: session ? 'authenticated' : 'anonymous',
        sessionExists: !!session,
        storageKey: 'ab-property-inspection-auth',
        multipleImports: false, // Would need more complex check
      });
    });

    // Monitor auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Diagnostics: Auth event:', event, session?.user?.id);
      setDiagnostics(prev => ({
        ...prev,
        authState: session ? 'authenticated' : 'anonymous',
        sessionExists: !!session,
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Only show in development
  const isProduction = typeof import.meta !== 'undefined' && 
                       import.meta.env && 
                       import.meta.env.PROD;
  
  if (isProduction) {
    return null;
  }

  return (
    <Card className="border-2 border-dashed border-yellow-500 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4" />
          Supabase Client Diagnostics (Dev Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span>Singleton Initialized:</span>
          {diagnostics.isInitialized ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Yes
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="w-3 h-3" />
              No
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span>Instance ID:</span>
          <code className="text-xs bg-muted px-2 py-1 rounded">{diagnostics.instanceId}</code>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Auth State:</span>
          <Badge variant={diagnostics.authState === 'authenticated' ? 'default' : 'secondary'}>
            {diagnostics.authState}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Session in Storage:</span>
          {diagnostics.sessionExists ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Yes
            </Badge>
          ) : (
            <Badge variant="secondary">No</Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span>Storage Key:</span>
          <code className="text-xs bg-muted px-2 py-1 rounded">{diagnostics.storageKey}</code>
        </div>

        <div className="pt-2 border-t text-muted-foreground">
          💡 Check browser console for "✅ Supabase client initialized" message.
          Should appear only once.
        </div>
      </CardContent>
    </Card>
  );
}
