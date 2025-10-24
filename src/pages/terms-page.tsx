import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, FileText } from 'lucide-react';

interface TermsPageProps {
  onNavigate: (route: { page: 'home' | 'login' }) => void;
}

export function TermsPage({ onNavigate }: TermsPageProps) {
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
              <FileText className="w-5 h-5 text-white" />
              <h1 className="text-white">Terms of Service</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Terms of Service
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Clerk Inspections, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">2. Service Description</h2>
              <p className="text-muted-foreground">
                Clerk Inspections is a web-based property inspection management system designed for property inspection clerks. The service allows users to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground mt-2">
                <li>Register and manage properties</li>
                <li>Create and complete property inspections</li>
                <li>Upload and manage inspection photos</li>
                <li>Generate shareable inspection reports</li>
                <li>Collaborate with team members</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">3. User Accounts and Responsibilities</h2>
              <div className="space-y-3 text-muted-foreground">
                <div>
                  <h3 className="text-foreground mb-2">3.1 Account Registration</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>You must provide accurate and complete information during registration</li>
                    <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                    <li>You must be 18 years or older to use this service</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-foreground mb-2">3.2 Account Security</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>You are responsible for all activities that occur under your account</li>
                    <li>Notify us immediately of any unauthorized use of your account</li>
                    <li>We are not liable for any loss or damage from unauthorized account access</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">4. Acceptable Use</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>You agree NOT to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Use the service for any illegal or unauthorized purpose</li>
                  <li>Violate any laws in your jurisdiction</li>
                  <li>Upload malicious code, viruses, or harmful content</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the service or servers</li>
                  <li>Impersonate another person or organization</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Use automated systems to access the service without permission</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">5. Data Ownership and Usage Rights</h2>
              <div className="space-y-3 text-muted-foreground">
                <div>
                  <h3 className="text-foreground mb-2">5.1 Your Data</h3>
                  <p>
                    You retain all rights to the data you create and upload (properties, inspections, photos, notes). We do not claim ownership of your content.
                  </p>
                </div>
                <div>
                  <h3 className="text-foreground mb-2">5.2 License to Use</h3>
                  <p>
                    You grant us a limited license to store, process, and display your data solely for the purpose of providing our services to you.
                  </p>
                </div>
                <div>
                  <h3 className="text-foreground mb-2">5.3 Data Backup and Export</h3>
                  <p>
                    You are responsible for maintaining backups of your data. We provide data export functionality for you to download your information.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">6. Service Availability</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We strive to provide reliable service but do not guarantee:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Uninterrupted or error-free operation</li>
                  <li>100% uptime or availability</li>
                  <li>Prevention of all security breaches</li>
                </ul>
                <p className="mt-3">
                  We reserve the right to modify, suspend, or discontinue the service with reasonable notice.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">7. Intellectual Property</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  The Clerk Inspections platform, including its design, code, features, and branding, is protected by copyright and other intellectual property laws. You may not:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Copy, modify, or distribute our software or content</li>
                  <li>Reverse engineer or attempt to extract source code</li>
                  <li>Remove or alter any copyright or proprietary notices</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">8. Limitation of Liability</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLERK INSPECTIONS SHALL NOT BE LIABLE FOR:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Any indirect, incidental, or consequential damages</li>
                  <li>Loss of profits, data, or business opportunities</li>
                  <li>Service interruptions or data loss</li>
                  <li>Actions or content of other users</li>
                </ul>
                <p className="mt-3">
                  Our total liability shall not exceed the amount you paid for the service in the past 12 months.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">9. Indemnification</h2>
              <p className="text-muted-foreground">
                You agree to indemnify and hold harmless Clerk Inspections from any claims, damages, or expenses arising from your use of the service, violation of these terms, or infringement of any third-party rights.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">10. Account Termination</h2>
              <div className="space-y-3 text-muted-foreground">
                <div>
                  <h3 className="text-foreground mb-2">10.1 By You</h3>
                  <p>
                    You may request account deletion at any time by contacting your administrator or us directly.
                  </p>
                </div>
                <div>
                  <h3 className="text-foreground mb-2">10.2 By Us</h3>
                  <p>
                    We reserve the right to suspend or terminate your account if you violate these terms or engage in abusive behavior.
                  </p>
                </div>
                <div>
                  <h3 className="text-foreground mb-2">10.3 Effect of Termination</h3>
                  <p>
                    Upon termination, your access will be revoked. We will retain data as required by law and delete other data according to our Privacy Policy.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">11. Modifications to Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms of Service from time to time. Material changes will be communicated via email or in-app notification. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">12. Governing Law</h2>
              <p className="text-muted-foreground">
                These terms are governed by the laws of your jurisdiction. Any disputes shall be resolved through binding arbitration or in the courts of your local jurisdiction.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="mb-3">13. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Service, please contact:
              </p>
              <div className="mt-3 p-4 bg-muted rounded-lg">
                <p><strong>Clerk Inspections</strong></p>
                <p className="text-sm text-muted-foreground mt-1">
                  Email:{' '}
                  <a href="mailto:legal@clerkinspections.com" className="text-primary underline">
                    legal@clerkinspections.com
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
