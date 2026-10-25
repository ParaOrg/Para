import type { Contribution } from '../data/contributions-read';

const MANILA_DATE_TIME = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** A time as the studio reads it, in Manila: "Oct 19, 8:00 AM". */
export const manilaTime = (ms: number): string => MANILA_DATE_TIME.format(ms);

const MANILA_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Manila',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** A time of day in Manila, 24-hour: "08:14". */
export const manilaClock = (ms: number): string => MANILA_CLOCK.format(ms);

export const kilometres = (metres: number): string => `${(metres / 1000).toFixed(1)} km`;

export const minutes = (seconds: number): string => `${Math.round(seconds / 60)} min`;

/** What an upload is called in a list: its places, its description, or when it was. */
export function contributionName(c: Contribution): string {
  const places = [c.startName, c.endName].filter(Boolean).join(' to ');
  return places || c.description || `Recorded ${manilaTime(c.startedAt)}`;
}

const VEHICLE: Record<string, string> = {
  jeep: 'Jeep',
  bus: 'Bus',
  train: 'Train',
  ferry: 'Ferry',
  tricycle: 'Tricycle',
  other: 'Other',
};

export const vehicleName = (vehicle: string | null): string =>
  vehicle ? (VEHICLE[vehicle] ?? vehicle) : 'Not said';
