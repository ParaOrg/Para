import type { HotspotRow } from '@/features/routes/model/hotspots';
import { nameDirections, type DirectionRow } from '@/features/routes/model/routes';

import { syncHintuanLinks } from './hotspots-write';
import { saveDirection, type SaveInput } from './routes-write';

/**
 * A direction saved, then every hintuan's route list brought up to date
 * against its line: a hintuan's list is a fact about geometry, so a changed
 * line re-checks itself against all of them (terminal links are the owner's
 * and are left alone). `onWritten` hears of the row the moment it is in, so a
 * retry after a failed link sync updates that row instead of inserting the
 * route again.
 *
 * TODO: two steps, not one transaction; one RPC per save would make it one
 * (PLAN.md, Known risks #3).
 */
export async function saveRouteAndLinks(
  input: SaveInput,
  hotspots: HotspotRow[],
  onWritten: (written: { routeId: string; directionId: string }) => void,
): Promise<DirectionRow> {
  const saved = await saveDirection(input);
  onWritten({ routeId: saved.routeId, directionId: saved.id });
  const named = nameDirections([saved], hotspots)[0];
  try {
    await syncHintuanLinks(named);
  } catch (err) {
    throw new Error(
      `The line is saved, but its hintuan links are not: ${err instanceof Error ? err.message : String(err)}. ` +
        'Press Save again to retry.',
      { cause: err },
    );
  }
  return named;
}
