import type { PageProblem } from './page-problem';

// What the recorder tells of. A toast's title is one line, about 30 characters on a phone; the
// line under it says what to do.

export const STORAGE_PROBLEM: PageProblem = {
  id: 'storage',
  icon: 'warning',
  title: 'Recording not kept',
  body: 'Close other tabs of this page and try again.',
};

export const OTHER_TAB_PROBLEM: PageProblem = {
  id: 'other-tab',
  icon: 'warning',
  title: 'Para is open in another tab',
  body: 'Record in that tab, or close it and reload this one.',
};

/** The app's location permission is off. */
export const LOCATION_OFF_PROBLEM: PageProblem = {
  id: 'location',
  icon: 'location',
  title: 'Location is off for Para',
  body: 'Turn it on in the phone’s Settings, under Apps, Para, Permissions, then start again.',
};

/** The browser blocks location for the page. */
export const LOCATION_BLOCKED_PROBLEM: PageProblem = {
  id: 'location',
  icon: 'location',
  title: 'Location is blocked',
  body: 'Allow it in the browser settings, then start again.',
};

export const POSITION_UNAVAILABLE_PROBLEM: PageProblem = {
  id: 'location',
  icon: 'location',
  title: 'Can’t find where you are',
  body: 'Check that location is on.',
};

export const POSITION_TIMEOUT_PROBLEM: PageProblem = {
  id: 'location',
  icon: 'location',
  title: 'Finding you took too long',
  body: 'Check that location is on, then try again.',
};
