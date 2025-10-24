import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, Copy, Database, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function SetupGuide() {
  const [step, setStep] = useState(1);

  const SQL_SCHEMA = `-- Clerk Inspection Management System Database Schema

-- Properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postcode TEXT NOT NULL,
  country TEXT DEFAULT 'UK',
  bedrooms INTEGER,
  bathrooms INTEGER,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspections table
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('routine', 'fire_safety', 'check_in', 'check_out')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  assigned_to UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  summary_notes TEXT,
  reference_code TEXT UNIQUE NOT NULL
);

-- Inspection items table
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  question TEXT NOT NULL,
  answer_text TEXT,
  answer_boolean BOOLEAN,
  answer_select TEXT,
  notes TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos table
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  section TEXT,
  item_id UUID,
  storage_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  size_bytes BIGINT NOT NULL,
  exif_taken_at TIMESTAMPTZ,
  caption TEXT,
  order_index INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  processing_status TEXT DEFAULT 'done',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preview tokens table
CREATE TABLE IF NOT EXISTS public.preview_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_property ON public.inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_completed ON public.inspections(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_inspection ON public.photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_properties_postcode ON public.properties(postcode);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Team mode - all authenticated clerks can access everything)
-- Properties
CREATE POLICY "Clerks can view all properties" ON public.properties
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Clerks can insert properties" ON public.properties
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Clerks can update properties" ON public.properties
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Inspections
CREATE POLICY "Clerks can view all inspections" ON public.inspections
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Clerks can insert inspections" ON public.inspections
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Clerks can update inspections" ON public.inspections
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Inspection items
CREATE POLICY "Clerks can view all items" ON public.inspection_items
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Clerks can insert items" ON public.inspection_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Clerks can update items" ON public.inspection_items
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Photos
CREATE POLICY "Clerks can view all photos" ON public.photos
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Clerks can insert photos" ON public.photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Clerks can delete photos" ON public.photos
  FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Clerks can update photos" ON public.photos
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Preview tokens (public read for shareable links)
CREATE POLICY "Anyone can view valid tokens" ON public.preview_tokens
  FOR SELECT USING (true);
CREATE POLICY "Clerks can create tokens" ON public.preview_tokens
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Audit logs
CREATE POLICY "Clerks can view audit logs" ON public.audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Clerks can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <Database className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="mb-2">Setup Required</h1>
          <p className="text-muted-foreground">
            Initialize your database to start using the Clerk Inspection Management System
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <Card className={step >= 1 ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {step > 1 && <CheckCircle2 className="w-5 h-5 text-primary" />}
                Step 1: Open Supabase SQL Editor
              </CardTitle>
              <CardDescription>
                Navigate to your Supabase project dashboard and open the SQL Editor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to your Supabase project at supabase.com</li>
                <li>Click on "SQL Editor" in the left sidebar</li>
                <li>Click "New query" to create a new SQL query</li>
              </ol>
              {step === 1 && (
                <Button onClick={() => setStep(2)} className="mt-4 bg-primary">
                  Next Step
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 2 */}
          {step >= 2 && (
            <Card className={step >= 2 ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {step > 2 && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  Step 2: Run Database Schema
                </CardTitle>
                <CardDescription>
                  Copy and paste the SQL schema below into the SQL Editor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                    {SQL_SCHEMA}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(SQL_SCHEMA)}
                    className="absolute top-2 right-2"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    After pasting the SQL, click "Run" in the SQL Editor to create the tables and policies.
                  </AlertDescription>
                </Alert>
                {step === 2 && (
                  <Button onClick={() => setStep(3)} className="bg-primary">
                    Next Step
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3 */}
          {step >= 3 && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {step > 3 && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  Step 3: Configure Email Authentication
                </CardTitle>
                <CardDescription>
                  Enable email authentication (magic link) in Supabase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Go to Authentication → Providers in your Supabase dashboard</li>
                  <li>Ensure "Email" provider is enabled</li>
                  <li>Enable "Confirm email" if you want email verification (optional for testing)</li>
                  <li>Configure email templates if needed</li>
                </ol>
                <Alert className="bg-primary/10 border-primary/20">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <AlertDescription className="text-primary">
                    Once completed, refresh this page to start using the application!
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Refresh Page
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Need help? Check the Supabase documentation or contact support.</p>
        </div>
      </div>
    </div>
  );
}
