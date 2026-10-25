const KEY = 'parapo-battery-notice-seen';

/** Whether the battery notice was shown already: it is shown once. */
export function hasSeenBatteryNotice(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch (error) {
    console.warn('The phone would not say whether the battery notice was shown.', error);
    return false;
  }
}

export function markBatteryNoticeSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch (error) {
    console.warn('The phone would not keep that the battery notice was shown.', error);
  }
}
