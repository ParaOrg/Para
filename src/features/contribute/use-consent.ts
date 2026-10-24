import { useState } from 'react';

import { CONSENT_VERSION, agreedVersionOf, isCurrentConsent } from './consent-version';

const CONSENT_KEY = 'parapo.contribute.consent';

function storedAgreedVersion(): number | null {
  try {
    return agreedVersionOf(localStorage.getItem(CONSENT_KEY));
  } catch {
    // Storage blocked (a private window): the contributor is asked again next visit.
    return null;
  }
}

export interface Consent {
  /** Whether this phone has agreed to the current text; an older text's agreement does not count. */
  hasConsent: boolean;
  giveConsent: () => void;
}

/** Whether this phone has agreed to what the page does, and a way to say it has. */
export function useConsent(): Consent {
  const [agreedVersion, setAgreedVersion] = useState(storedAgreedVersion);

  const giveConsent = () => {
    try {
      localStorage.setItem(CONSENT_KEY, String(CONSENT_VERSION));
    } catch (error) {
      console.warn('The page could not remember the consent.', error);
    }
    setAgreedVersion(CONSENT_VERSION);
  };

  return { hasConsent: isCurrentConsent(agreedVersion), giveConsent };
}
