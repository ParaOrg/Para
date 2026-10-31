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

/** A ride's length as the card says it: `42 min`, or `<1 min`. */
export const durationText = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  return minutes < 1 ? '<1 min' : `${minutes} min`;
};

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

/** A day with its year, as History's card says it: `Jan 25, 2026`. */
export const dayText = (time: number): string =>
  new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

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
