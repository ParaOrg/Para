import type { Json } from '@/shared/types/database.types';

function isJson(value: unknown): value is Json {
  if (value === null) return true;
  if (['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isJson);
  if (typeof value === 'object')
    return Object.values(value).every((v) => v === undefined || isJson(v));
  return false;
}

/**
 * A value bound for a json column, proved to have the generated `Json` type
 * the columns are named with. Our own interfaces (Segment, GeoJSON) do not
 * satisfy it structurally; this is the check in place of a cast. It checks the
 * type's shape, not the wire: NaN, Infinity, a Date or a Map pass it.
 */
export function toJson(value: unknown): Json {
  if (!isJson(value))
    throw new Error('A value bound for the database is not the Json type the column takes.');
  return value;
}
