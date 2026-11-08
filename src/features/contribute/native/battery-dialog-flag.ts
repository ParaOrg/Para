const KEY = 'para-battery-dialog-asked';

/** Whether Android's battery dialog was shown already: it is asked once, at the first Start. */
export function hasAskedBatteryDialog(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch (error) {
    console.warn('The phone would not say whether the battery dialog was shown.', error);
    return false;
  }
}

export function markBatteryDialogAsked(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch (error) {
    console.warn('The phone would not keep that the battery dialog was shown.', error);
  }
}
