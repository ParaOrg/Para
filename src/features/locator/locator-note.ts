import type { LocatorStatus } from './locator-rules';

/**
 * What the locator has to say when it cannot show where the commuter is, for the page to say
 * as a problem toast with the location drawing. One id for every kind, the one the contributor
 * page's own location problems use, so a tap again, or one kind turning into another, says it
 * in the same toast and never stacks a second.
 */
export interface LocatorNote {
  id: typeof LOCATOR_NOTE_ID;
  /** One line, about 30 characters on a phone: what happened. */
  title: string;
  /** What to do about it. */
  body: string;
}

export const LOCATOR_NOTE_ID = 'location';

const DENIED_NOTE: LocatorNote = {
  id: LOCATOR_NOTE_ID,
  title: 'Location is off for this site',
  body: 'Allow it in your browser settings, then try again.',
};

const UNAVAILABLE_NOTE: LocatorNote = {
  id: LOCATOR_NOTE_ID,
  title: 'Can’t get a location',
  body: 'This browser cannot give one.',
};

/** The contributor app's, when the phone's location is off and stays off after Google's dialog. */
export const LOCATION_OFF_NOTE: LocatorNote = {
  id: LOCATOR_NOTE_ID,
  title: 'Location is off',
  body: 'Turn it on in Quick Settings to see where you are.',
};

const NO_FIX_NOTE: LocatorNote = {
  id: LOCATOR_NOTE_ID,
  title: 'No fix yet',
  body: 'Try again outdoors, or check that location is on.',
};

/**
 * The note for the locator's state: a note, null once a fix has come (the note is taken back),
 * or undefined while nothing has changed for it: off, or asking, when the last word stands.
 */
export function noteFor(status: LocatorStatus, noFix: boolean): LocatorNote | null | undefined {
  if (status === 'denied') return DENIED_NOTE;
  if (status === 'unavailable') return UNAVAILABLE_NOTE;
  if (noFix) return NO_FIX_NOTE;
  if (status === 'on') return null;
  return undefined;
}
