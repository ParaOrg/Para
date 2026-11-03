// Here rather than in ../native/: the page reads it on every load to decide whether to fetch the
// permissions screen at all, and native/ is only fetched when it is shown.
const KEY = 'para-permissions-screen-seen';

/** Whether the permissions screen was finished on this phone already: it is shown once. */
export function hasSeenPermissionsScreen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch (error) {
    console.warn('The phone would not say whether the permissions screen was shown.', error);
    return false;
  }
}

export function markPermissionsScreenSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch (error) {
    console.warn('The phone would not keep that the permissions screen was shown.', error);
  }
}
