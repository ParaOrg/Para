/**
 * The terms a recording is made and sent under, stored on each recording and sent with its upload,
 * so the data shows which rides went under which terms:
 * - 1 and 2: the first consent screens (2 only differs by who is named).
 * - 3: the consent screen as consent-panel.tsx words it.
 * - 4: agreed by having an account; no consent screen shown.
 */
export const CONSENT_VERSION = 4;

/** The oldest consent text whose recordings still go without a question: 2 only differs by who is named. */
export const EARLIEST_SENT_VERSION = 2;

/** The terms an upload is sent under: those its recording was made under, else today's. */
export function sentConsentVersion(recordedVersion: number | undefined): number {
  return recordedVersion ?? CONSENT_VERSION;
}

/** Whether a recording was made under a text too old to send unasked; one with no stamp was. */
export function isEarlierRecording(consentVersion: number | undefined): boolean {
  return consentVersion === undefined || consentVersion < EARLIEST_SENT_VERSION;
}

/** Whether the earlier-recordings question shows: consent is given, it was not answered, and some are unsent. */
export function shouldAskAboutEarlier(state: {
  hasConsent: boolean;
  hasAnswered: boolean;
  unsentEarlierCount: number;
}): boolean {
  return state.hasConsent && !state.hasAnswered && state.unsentEarlierCount > 0;
}
