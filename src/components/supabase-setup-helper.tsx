import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';

export function SupabaseSetupHelper() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Supabase Setup Required
        </CardTitle>
        <CardDescription>
          To fix authentication errors, disable email confirmation in your Supabase project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Error:</strong> "Invalid login credentials" usually means email confirmation is required but hasn't been completed.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h3 className="font-medium">Quick Fix (Recommended for Development):</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              Go to your{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Supabase Dashboard
              </a>
            </li>
            <li>Select your project</li>
            <li>Navigate to: <code className="bg-muted px-1 py-0.5 rounded">Authentication → Providers → Email</code></li>
            <li>
              Scroll down to <strong>"Confirm email"</strong>
            </li>
            <li>
              <strong>Disable</strong> the "Confirm email" toggle
            </li>
            <li>Click "Save"</li>
            <li>Try signing in again</li>
          </ol>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-2">Alternative: Use Magic Link Instead</h3>
          <p className="text-sm text-muted-foreground">
            Click "Use magic link instead" on the login page to use passwordless email authentication.
            This doesn't require email confirmation setup.
          </p>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-2">For Production:</h3>
          <p className="text-sm text-muted-foreground">
            Keep email confirmation enabled and ensure your Supabase email templates are configured correctly.
            Users will receive a confirmation email after signing up.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
