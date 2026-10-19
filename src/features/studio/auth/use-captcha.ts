import { useState } from 'react';

import { turnstileSiteKey } from '../data/env';

export interface Captcha {
  /** The widget's site key, or null when the build has none and no check is sent. */
  siteKey: string | null;
  /** Bumped for a fresh widget: a token is good for one request. */
  round: number;
  setToken: (token: string | null) => void;
  /** Whether a request may go: a token is in hand, or none is needed. */
  isReady: boolean;
  /** What a Supabase Auth call takes, spent by the call. */
  takeToken: () => { captchaToken?: string };
}

/** One Turnstile check per Auth request, for the forms that sign in or send a reset. */
export function useCaptcha(): Captcha {
  const [token, setToken] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  return {
    siteKey: turnstileSiteKey,
    round,
    setToken,
    isReady: turnstileSiteKey === null || token !== null,
    takeToken: () => {
      if (turnstileSiteKey === null) return {};
      setToken(null);
      setRound((r) => r + 1);
      return token ? { captchaToken: token } : {};
    },
  };
}
