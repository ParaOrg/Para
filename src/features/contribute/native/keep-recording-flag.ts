// Its own key, not the earlier battery notice's: a phone that saw that notice sees this card once.
const KEY = 'para-keep-recording-seen';

/** Whether the Keep Para recording card was shown already: it is shown once. */
export function hasSeenKeepRecording(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch (error) {
    console.warn('The phone would not say whether the Keep Para recording card was shown.', error);
    return false;
  }
}

export function markKeepRecordingSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch (error) {
    console.warn('The phone would not keep that the Keep Para recording card was shown.', error);
  }
}
