import { FARE_PHP_MAX } from '../api/upload-fare';

/** The fare field's one complaint: what it takes, in the words the field shows under itself. */
export const FARE_ERROR = 'Enter an amount from ₱0 to ₱2,000';

/** Pesos, and at most two digits of centavos: "13", "13.5", "13.50", ".5". */
const FARE_PATTERN = /^(\d+(\.\d{0,2})?|\.\d{1,2})$/;

/**
 * The fare as typed, read: none for an empty field, the pesos for an amount from 0 to
 * FARE_PHP_MAX with at most two decimals, and an error for anything else. Spaces around it and a
 * comma between thousands are let through, as a phone's keypad may give them.
 */
export function fareFromText(text: string): { farePhp?: number; error?: string } {
  const typed = text.trim().replace(/,/g, '');
  if (typed === '') return {};
  if (!FARE_PATTERN.test(typed)) return { error: FARE_ERROR };
  const farePhp = Number(typed);
  if (!Number.isFinite(farePhp) || farePhp < 0 || farePhp > FARE_PHP_MAX) {
    return { error: FARE_ERROR };
  }
  return { farePhp };
}
