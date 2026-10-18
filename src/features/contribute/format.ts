/** Whole minutes of a span, the way the stats strip says them: `42`. */
export const minutesText = (seconds: number): string => String(Math.floor(seconds / 60));

/** Metres as kilometres to one decimal: `4.2`. */
export const kilometresText = (metres: number): string => (metres / 1000).toFixed(1);

/** Seconds as a clock: `1:42`. */
export function countdownText(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** A moment in the phone's own date and time, short: `Oct 18, 3:42 PM`. */
export const dateTimeText = (time: number): string =>
  new Date(time).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** A moment to the second, with its year, for telling two recordings apart. */
export const fullDateTimeText = (time: number): string =>
  new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
