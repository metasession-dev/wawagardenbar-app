'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'cookieConsent';
const CONSENT_VERSION = 'v1';

/**
 * @requirement REQ-065 — Cookie consent banner (#117 P4 #20)
 *
 * Informational mode: the app currently has no analytics scripts wired,
 * so the banner just acknowledges that authentication + cart cookies
 * are in use. A future REQ that adds analytics can extend the consent
 * shape (e.g. `{ acceptedAt, version, analytics?: boolean }`) and gate
 * those scripts on the read.
 */
export function CookieConsentBanner() {
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setNeedsConsent(true);
      }
    } catch {
      // Private mode / disabled storage — treat as already-acknowledged so
      // the banner doesn't loop. Privacy-respecting failure mode.
    }
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          acceptedAt: new Date().toISOString(),
          version: CONSENT_VERSION,
        })
      );
    } catch {
      // ignored — banner still dismisses for the session.
    }
    setNeedsConsent(false);
  }

  if (!needsConsent) return null;

  return (
    <div
      data-testid="cookie-consent-banner"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur p-4"
    >
      <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          We use cookies for authentication and your cart. By continuing to use
          the site you accept this.
        </p>
        <Button onClick={accept} size="sm">
          Got it
        </Button>
      </div>
    </div>
  );
}
