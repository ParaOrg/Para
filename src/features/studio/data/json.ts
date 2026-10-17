import type { Json } from '@/shared/types/database.types';

function isJson(value: unknown): value is Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.every(isJson);
  if (typeof value === 'object')
    return Object.values(value).every((v) => v === undefined || isJson(v));
  return false;
}

/**
 * A value bound for a json column, proved to be json. The generated types
 * name those columns `Json`, which our own interfaces (Segment, GeoJSON) do
 * not satisfy structurally; this is the check in place of a cast.
 */
export function toJson(value: unknown): Json {
  if (!isJson(value)) throw new Error('A value bound for the database is not valid JSON.');
  return value;
}
