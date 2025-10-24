import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { X } from 'lucide-react';

interface ConsentBannerProps {
  onPrivacyClick: () => void;
}

export function ConsentBanner({ onPrivacyClick }: ConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem('cookie-consent');
    if (!hasConsented) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom">
      <Card className="max-w-4xl mx-auto border-primary/20 shadow-lg">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold">🍪 We Value Your Privacy</h3>
              <p className="text-sm text-muted-foreground">
                We use essential cookies and local storage to maintain your login session and remember your preferences. 
                We do not use tracking or advertising cookies. By continuing to use this site, you consent to our use of essential cookies.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  className="bg-primary hover:bg-primary/90"
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDecline}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onPrivacyClick}
                  className="text-primary"
                >
                  Privacy Policy
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDecline}
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
