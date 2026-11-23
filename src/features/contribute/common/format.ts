/** A figure as the recording card shows it: the number, and its unit after it in grey. */
export interface Figure {
  value: string;
  unit: string;
}

/** Time recorded, as the recording card says it: whole seconds under a minute, then whole minutes. */
export function timeFigure(seconds: number): Figure {
  const whole = Math.max(0, Math.floor(seconds));
  return whole < 60
    ? { value: String(whole), unit: 'sec' }
    : { value: String(Math.floor(whole / 60)), unit: 'min' };
}

/** Distance, as the recording card says it: whole metres under a kilometre, then kilometres to one decimal. */
export function distanceFigure(metres: number): Figure {
  const whole = Math.max(0, Math.round(metres));
  return whole < 1000
    ? { value: String(whole), unit: 'm' }
    : { value: kilometresText(whole), unit: 'km' };
}

/**
 * Metres as kilometres to one decimal, a half rounded up: `4.2`, and 1150 m `1.2`. Counted in
 * whole tenths, as the ride's notification does (RideNotification.distanceText), so the card and
 * the notification always agree. toFixed would round the binary fraction: 1150 m as 1.1.
 */
export function kilometresText(metres: number): string {
  const tenths = Math.round(metres / 100);
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}

/** Seconds as a clock: `1:42`. */
export function countdownText(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** A moment to the second, with its year, for telling two recordings apart. */
export const fullDateTimeText = (time: number): string =>
  new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });

/**
 * A day with its year, as History's card says it: `Jan 25, 2026`. Manila's day in one fixed
 * pattern, whatever the phone's zone or language, as the recording's file name dates it.
 */
export const dayText = (time: number): string =>
  new Date(time).toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

/** A ride's length in hours and minutes, as History's card says it: `0h 12m`. */
export function hoursMinutesText(seconds: number): string {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** A ride's distance as History's card says it: `850 m`, `4.2 km`, then whole kilometres from 10. */
export function cardDistanceText(metres: number): string {
  const whole = Math.max(0, Math.round(metres));
  if (whole < 1000) return `${whole} m`;
  if (whole < 10_000) return `${kilometresText(whole)} km`;
  return `${Math.round(whole / 1000)} km`;
}

/**
 * A trip's whole time, in words, as the ride's screen says it: `4 hr 30 mins and 40 secs`,
 * `12 mins`, `40 secs`. Parts that are zero are left out; under a second reads `0 secs`.
 */
export function tripTimeText(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const parts = [
    hours > 0 && `${hours} hr`,
    minutes > 0 && `${minutes} ${minutes === 1 ? 'min' : 'mins'}`,
    secs > 0 && `${secs} ${secs === 1 ? 'sec' : 'secs'}`,
  ].filter((part) => part !== false);
  if (parts.length === 0) return '0 secs';
  const last = parts.pop();
  return parts.length === 0 ? `${last}` : `${parts.join(' ')} and ${last}`;
}

/** A time of day as the ride's flags say it: `10:42 AM`, Manila's, whatever the phone's zone. */
export const clockText = (time: number): string =>
  new Date(time).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  });
