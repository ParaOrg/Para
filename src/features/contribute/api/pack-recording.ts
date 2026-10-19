import { keptFixes, summarize, type Fix } from '@/features/routes/model/ride-recording';
import { overviewOf, type LngLat } from '@/shared/utils/geo';

import { RECORDING_VERSION, type Recording } from '../recording-schema';
import type { ContributionPayload, PointBatch } from './contribution-payload-schema';

/** The rules that made the totals, the hintos and the line; bump when ride-recording.ts changes them. */
export const RULES_VERSION = 1;

/** The limits the database holds every upload to (migration 20261019125900_contributions). */
export const UPLOAD_LIMITS = {
  points: 14_400,
  pointsPerBatch: 600,
  hintos: 2_000,
  listEntries: 500,
  hours: 6,
  nameLength: 80,
  descriptionLength: 1_000,
  lineBytes: 200_000,
  /** The database refuses 150 km/h; points are dropped a little below it, so rounding never trips it. */
  speedKmh: 140,
} as const;

/** The Philippines, as the database checks it. */
const BOX = { south: 4, north: 22, west: 116, east: 127 } as const;
const MICRO = 1e6;
/** Metres per millionth of a degree of latitude, as the database measures. */
const M_PER_MICRO = 0.11132;

/** Why a recording cannot be uploaded at all, whatever the signal. */
export type PackRefusal = 'too-long' | 'too-many-points' | 'line-too-large';

export type PackResult =
  | { ok: true; payload: ContributionPayload; droppedPoints: number }
  | { ok: false; reason: PackRefusal };

const iso = (ms: number): string => new Date(ms).toISOString();
const inBox = (lat: number, lng: number): boolean =>
  lat >= BOX.south && lat <= BOX.north && lng >= BOX.west && lng <= BOX.east;

interface MicroPoint {
  time: number;
  lat: number;
  lng: number;
  accuracyM: number;
}

/**
 * The fixes the database will take, in whole millionths of a degree: inside the
 * Philippines, each after the one before, none faster than the limit from the
 * last one kept. Measured as the database measures, so what passes here passes there.
 */
function acceptedPoints(fixes: readonly Fix[]): MicroPoint[] {
  const points: MicroPoint[] = [];
  for (const fix of [...fixes].sort((a, b) => a.time - b.time)) {
    const [lng, lat] = fix.at;
    if (!inBox(lat, lng)) continue;
    const point = {
      time: Math.round(fix.time),
      lat: Math.round(lat * MICRO),
      lng: Math.round(lng * MICRO),
      accuracyM: Math.min(32_767, Math.max(0, Math.round(fix.accuracyM))),
    };
    const last = points[points.length - 1];
    if (last) {
      const seconds = (point.time - last.time) / 1000;
      if (seconds <= 0) continue;
      const cos = Math.cos(((point.lat / MICRO) * Math.PI) / 180);
      const metres = M_PER_MICRO * Math.hypot(point.lat - last.lat, (point.lng - last.lng) * cos);
      if (metres / seconds > UPLOAD_LIMITS.speedKmh / 3.6) continue;
    }
    points.push(point);
  }
  return points;
}

function batchesOf(points: readonly MicroPoint[]): PointBatch[] {
  const batches: PointBatch[] = [];
  for (let start = 0; start < points.length; start += UPLOAD_LIMITS.pointsPerBatch) {
    const slice = points.slice(start, start + UPLOAD_LIMITS.pointsPerBatch);
    const first = slice[0];
    if (!first) break;
    batches.push({
      seq: batches.length,
      first_at: iso(first.time),
      first_lat: first.lat,
      first_lng: first.lng,
      point_count: slice.length,
      dt_ms: slice.map((p, i) => (i === 0 ? 0 : p.time - (slice[i - 1]?.time ?? p.time))),
      dlat: slice.map((p, i) => (i === 0 ? 0 : p.lat - (slice[i - 1]?.lat ?? p.lat))),
      dlng: slice.map((p, i) => (i === 0 ? 0 : p.lng - (slice[i - 1]?.lng ?? p.lng))),
      accuracy_m: slice.map((p) => p.accuracyM),
    });
  }
  return batches;
}

function boxOf(
  line: readonly LngLat[],
): Pick<ContributionPayload, 'west' | 'south' | 'east' | 'north'> {
  if (line.length === 0) return { west: null, south: null, east: null, north: null };
  const lngs = line.map(([lng]) => lng);
  const lats = line.map(([, lat]) => lat);
  return {
    west: Math.min(...lngs),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    north: Math.max(...lats),
  };
}

/**
 * A saved recording in the shape the database stores, or why it can never be
 * stored. Pure: the same recording and fixes always pack the same way, apart
 * from `sentAt`, so a retry sends the same contribution.
 */
export function packRecording(
  recording: Recording,
  fixes: readonly Fix[],
  consentVersion: number,
  sentAt: number,
): PackResult {
  const ended = Math.max(
    recording.stoppedAt ?? recording.savedAt ?? recording.startedAt,
    recording.startedAt + 1000,
  );
  if (ended - recording.startedAt > UPLOAD_LIMITS.hours * 3_600_000) {
    return { ok: false, reason: 'too-long' };
  }
  const points = acceptedPoints(fixes);
  if (points.length > UPLOAD_LIMITS.points) return { ok: false, reason: 'too-many-points' };

  const summary = summarize(fixes, recording.gaps, recording.startedAt, ended);
  const kept = keptFixes(fixes).filter(({ at: [lng, lat] }) => inBox(lat, lng));
  const thinned = overviewOf(kept.map((fix) => fix.at));
  const line = thinned.length >= 2 ? { type: 'LineString' as const, coordinates: thinned } : null;
  if (line && JSON.stringify(line).length > UPLOAD_LIMITS.lineBytes) {
    return { ok: false, reason: 'line-too-large' };
  }

  const events = [
    { kind: 'start', at: iso(recording.startedAt) },
    ...(recording.switches ?? []).map((s) => ({ kind: 'switch', at: iso(s.time), to: s.to })),
    ...(recording.stoppedAt === null ? [] : [{ kind: 'stop', at: iso(recording.stoppedAt) }]),
    ...(recording.savedAt === null ? [] : [{ kind: 'save', at: iso(recording.savedAt) }]),
  ].slice(0, UPLOAD_LIMITS.listEntries);

  return {
    ok: true,
    droppedPoints: fixes.length - points.length,
    payload: {
      id: recording.id,
      format_version: RECORDING_VERSION,
      rules_version: RULES_VERSION,
      consent_version: consentVersion,
      started_at: iso(recording.startedAt),
      ended_at: iso(ended),
      sent_at: iso(sentAt),
      vehicle: recording.rideKind?.toLowerCase() ?? null,
      start_name: recording.startPointName.trim().slice(0, UPLOAD_LIMITS.nameLength),
      end_name: recording.endPointName.trim().slice(0, UPLOAD_LIMITS.nameLength),
      description: recording.description.trim().slice(0, UPLOAD_LIMITS.descriptionLength),
      distance_m: Math.round(summary.distanceM),
      moving_s: Math.round(summary.movingSeconds),
      standing_s: Math.round(summary.standingSeconds),
      lost_s: Math.round(summary.lostSeconds),
      point_count: points.length,
      events,
      gaps: summary.gaps
        .slice(0, UPLOAD_LIMITS.listEntries)
        .map((g) => ({ from: iso(g.from), to: iso(g.to), reasons: [...g.reasons] })),
      line,
      ...boxOf(thinned),
      batches: batchesOf(points),
      hintos: summary.hintos
        .filter(({ at: [lng, lat] }) => inBox(lat, lng))
        .slice(0, UPLOAD_LIMITS.hintos)
        .map((h, seq) => ({
          seq,
          started_at: iso(h.from),
          seconds: Math.min(21_600, Math.max(1, Math.round((h.to - h.from) / 1000))),
          lat: h.at[1],
          lng: h.at[0],
        })),
    },
  };
}
