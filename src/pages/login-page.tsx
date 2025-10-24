import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner@2.0.3';
import { CheckCircle2, Mail, Lock } from 'lucide-react';

// Check if we're in development mode
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('.local');

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [usePasswordAuth, setUsePasswordAuth] = useState(isDevelopment);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signInWithEmail, signInWithPassword, signUpWithPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      if (usePasswordAuth) {
        if (!password) {
          toast.error('Password is required');
          setIsSubmitting(false);
          return;
        }
        
        if (isSignUp) {
          const result = await signUpWithPassword(email, password, 'clerk');
          
          // Check if email confirmation is required
          if (result?.user && !result.session) {
            toast.info('Account created! Please check your email to confirm your account before signing in.', { duration: 10000 });
            setIsSignUp(false);
            setPassword('');
          } else if (result?.user && result.session) {
            // User is automatically signed in (email confirmation disabled)
            toast.success('Account created and signed in successfully!');
            setIsSignUp(false);
          } else {
            toast.success('Account created! You can now sign in.');
            setIsSignUp(false);
            setPassword('');
          }
        } else {
          await signInWithPassword(email, password);
          toast.success('Signed in successfully!');
        }
      } else {
        await signInWithEmail(email);
        setEmailSent(true);
        toast.success('Magic link sent! Check your email to sign in.');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      if (usePasswordAuth) {
        let errorMsg = error.message || 'Authentication failed';
        
        // Check for the specific "Invalid login credentials" error
        if (errorMsg.includes('Invalid login credentials')) {
          if (isSignUp) {
            errorMsg = 'Account created but email confirmation required. To fix: Go to Supabase Dashboard → Authentication → Settings → Disable "Enable email confirmations", then try signing in again.';
          } else {
            errorMsg = 'Invalid email or password. If you just created an account, check your email for a confirmation link, or disable email confirmation in Supabase Dashboard.';
          }
        }
        
        toast.error(errorMsg, { duration: 10000 });
      } else {
        toast.error(error.message || 'Failed to send magic link');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-primary">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {usePasswordAuth ? (
              <Lock className="w-8 h-8 text-primary" />
            ) : (
              <Mail className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="font-bold">Clerk Inspections</CardTitle>
          <CardDescription>
            {usePasswordAuth 
              ? (isSignUp ? 'Create a clerk account' : 'Sign in with your credentials')
              : 'Sign in with your email to access the inspection management system'
            }
          </CardDescription>
          {isDevelopment && (
            <div className="text-xs text-primary pt-2">
              Development Mode
            </div>
          )}
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <div>
                <h3 className="mb-2">Check your email</h3>
                <p className="text-muted-foreground mb-4">
                  We've sent a magic link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to sign in. The link will expire in 1 hour.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="w-full"
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="clerk@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="bg-input-background"
                  />
                </div>
                
                {usePasswordAuth && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-input-background"
                    />
                  </div>
                )}
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={isSubmitting || !email || (usePasswordAuth && !password)}
                >
                  {isSubmitting 
                    ? (usePasswordAuth ? 'Processing...' : 'Sending...') 
                    : (usePasswordAuth ? (isSignUp ? 'Create account' : 'Sign in') : 'Send magic link')
                  }
                </Button>
                
                <div className="space-y-2">
                  {usePasswordAuth && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsSignUp(!isSignUp);
                          setPassword('');
                        }}
                        className="w-full text-sm"
                      >
                        {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                      </Button>
                    </>
                  )}
                  
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setUsePasswordAuth(!usePasswordAuth);
                      setPassword('');
                      setIsSignUp(false);
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    {usePasswordAuth ? 'Use magic link instead' : 'Use password instead'}
                  </Button>
                </div>
              </form>
            </div>
          )}
          
          <div className="text-center text-xs text-muted-foreground mt-4 pt-4 border-t">
            By using this service, you agree to our{' '}
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Terms of Service
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
