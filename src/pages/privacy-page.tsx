import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Shield } from 'lucide-react';

interface PrivacyPageProps {
  onNavigate: (route: { page: 'home' | 'login' }) => void;
}

export function PrivacyPage({ onNavigate }: PrivacyPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-primary sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate({ page: 'login' })}
              className="text-white hover:bg-white/20 active:bg-white/30 shrink-0 touch-active"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-white" />
              <h1 className="text-white">Privacy Policy</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Privacy Policy
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                This Privacy Policy explains how Clerk Inspections ("we", "our", or "us") collects, uses, and protects your personal information when you use our property inspection management system.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">2. Information We Collect</h2>
              <div className="space-y-3 text-muted-foreground">
                <div>
                  <h3 className="text-foreground mb-2">2.1 Account Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Email address</li>
                    <li>Display name</li>
                    <li>Role (admin or clerk)</li>
                    <li>Account creation and login timestamps</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-foreground mb-2">2.2 Property and Inspection Data</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Property addresses and details</li>
                    <li>Inspection reports and notes</li>
                    <li>Photos uploaded during inspections</li>
                    <li>Inspection status and timestamps</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-foreground mb-2">2.3 Audit and Usage Data</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Actions performed within the system</li>
                    <li>Login history</li>
                    <li>Data modifications and deletions</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>To provide and maintain our inspection management services</li>
                <li>To authenticate and authorize user access</li>
                <li>To enable collaboration between team members</li>
                <li>To generate inspection reports and documentation</li>
                <li>To maintain audit trails for compliance and security</li>
                <li>To improve and optimize our services</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">4. Data Storage and Security</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Your data is securely stored using Supabase's infrastructure, which includes:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Encrypted data transmission (HTTPS/SSL)</li>
                  <li>Secure database storage with access controls</li>
                  <li>Role-based access control (RBAC)</li>
                  <li>Regular security updates and monitoring</li>
                  <li>Private photo storage with signed URL access</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">5. Data Sharing and Disclosure</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We do not sell, trade, or rent your personal information to third parties. Data may be shared only in the following circumstances:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>With team members within your organization (collaborative access)</li>
                  <li>When required by law or legal process</li>
                  <li>With service providers who assist in operating our platform (e.g., Supabase)</li>
                  <li>With your explicit consent</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">6. Your Data Protection Rights (GDPR)</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  If you are located in the European Economic Area (EEA), you have the following rights:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong className="text-foreground">Right to Access:</strong> Request a copy of your personal data</li>
                  <li><strong className="text-foreground">Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                  <li><strong className="text-foreground">Right to Erasure:</strong> Request deletion of your personal data</li>
                  <li><strong className="text-foreground">Right to Restrict Processing:</strong> Limit how we use your data</li>
                  <li><strong className="text-foreground">Right to Data Portability:</strong> Export your data in a structured format</li>
                  <li><strong className="text-foreground">Right to Object:</strong> Object to certain data processing activities</li>
                </ul>
                <p className="mt-3">
                  To exercise these rights, contact your system administrator or email us at{' '}
                  <a href="mailto:privacy@clerkinspections.com" className="text-primary underline">
                    privacy@clerkinspections.com
                  </a>
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">7. Data Retention</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We retain your personal data only for as long as necessary to provide our services and comply with legal obligations:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Account data: Retained while your account is active</li>
                  <li>Inspection data: Retained according to your organization's policies</li>
                  <li>Audit logs: Retained for compliance and security purposes</li>
                  <li>Deleted data: Permanently removed from our systems within 30 days</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use minimal cookies and local storage to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground mt-2">
                <li>Maintain your login session</li>
                <li>Remember your preferences</li>
                <li>Provide authentication and security</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                We do not use third-party tracking or advertising cookies.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">9. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our service is not intended for users under the age of 18. We do not knowingly collect personal information from children.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">10. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the "Last updated" date at the top of this policy.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">11. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact:
              </p>
              <div className="mt-3 p-4 bg-muted rounded-lg">
                <p><strong>Clerk Inspections</strong></p>
                <p className="text-sm text-muted-foreground mt-1">
                  Email:{' '}
                  <a href="mailto:privacy@clerkinspections.com" className="text-primary underline">
                    privacy@clerkinspections.com
                  </a>
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
