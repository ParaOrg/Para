/** The consent text's version, sent with every upload; bump it when the consent panel's words change. */
export const CONSENT_VERSION = 2;

/** The first consent text stored a plain 'yes'; every later one stores its version number. */
const FIRST_VERSION_MARK = 'yes';

/** The version of the consent text a stored value says was agreed to, or null when there is none. */
export function agreedVersionOf(stored: string | null): number | null {
  if (stored === FIRST_VERSION_MARK) return 1;
  if (stored === null || !/^[1-9]\d*$/.test(stored)) return null;
  return Number(stored);
}

/** Whether the agreed version is the current text: an older one no longer counts as consent. */
export function isCurrentConsent(agreedVersion: number | null): boolean {
  return agreedVersion === CONSENT_VERSION;
}

/** Whether a recording was made before the current text was agreed to; one with no stamp was. */
export function isEarlierRecording(consentVersion: number | undefined): boolean {
  return consentVersion !== CONSENT_VERSION;
}

/** Whether the earlier-recordings question shows: consent is given, it was not answered, and some are unsent. */
export function shouldAskAboutEarlier(state: {
  hasConsent: boolean;
  hasAnswered: boolean;
  unsentEarlierCount: number;
}): boolean {
  return state.hasConsent && !state.hasAnswered && state.unsentEarlierCount > 0;
}
