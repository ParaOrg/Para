import { useState } from 'react';

import { turnstileSiteKey } from '../api/env';

export interface Captcha {
  /** The widget's site key, or null when the build has none and no check is sent. */
  siteKey: string | null;
  /** Bumped for a fresh widget: a token is good for one request. */
  round: number;
  onToken: (token: string | null) => void;
  /** Whether a request may go: a token is in hand, or none is needed. */
  isReady: boolean;
  /** The token for the request about to go, spent by it. */
  takeToken: () => string | undefined;
}

/** One Turnstile check per account request. */
export function useCaptcha(): Captcha {
  const [token, setToken] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  return {
    siteKey: turnstileSiteKey,
    round,
    onToken: setToken,
    isReady: turnstileSiteKey === null || token !== null,
    takeToken: () => {
      if (turnstileSiteKey === null) return undefined;
      setToken(null);
      setRound((current) => current + 1);
      return token ?? undefined;
    },
  };
}
