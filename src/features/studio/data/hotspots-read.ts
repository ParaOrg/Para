import { hotspotLinkSchema, hotspotRowSchema } from '@/features/routes/model/hotspot-schema';
import type { HotspotLink, HotspotRow } from '@/features/routes/model/hotspots';

import { parsed, readAll } from './read-all';
import { getSupabase } from './supabase';

/**
 * Every hotspot, in full. Public: RLS allows anyone to read.
 *
 * Both hooks load at once — the directions need the hotspots to name
 * themselves, the hotspots hook needs them to draw — so a read already in
 * flight is shared, not repeated by each (two reads a load, four under
 * StrictMode). The next load, after it settles, reads afresh.
 */
let hotspotsInFlight: Promise<HotspotRow[]> | null = null;
export function listHotspots(): Promise<HotspotRow[]> {
  const client = getSupabase();
  if (!client) return Promise.resolve([]);
  if (hotspotsInFlight) return hotspotsInFlight;
  const read = readAll<unknown>((from, to) =>
    client
      .from('stop')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, to),
  ).then((rows) => parsed(hotspotRowSchema, rows, 'hotspot'));
  hotspotsInFlight = read;
  const settle = () => {
    if (hotspotsInFlight === read) hotspotsInFlight = null;
  };
  read.then(settle, settle);
  return read;
}

/** Every hotspot ↔ direction link. Public read. */
async function listHotspotLinks(): Promise<HotspotLink[]> {
  const client = getSupabase();
  if (!client) return [];
  const rows = await readAll<unknown>((from, to) =>
    client
      .from('route_stop')
      .select('route_variant_id, stop_id, stop_sequence', { count: 'exact' })
      .order('route_variant_id')
      .order('stop_sequence')
      .order('stop_id')
      .range(from, to),
  );
  return parsed(hotspotLinkSchema, rows, 'link');
}

/** What the editor's hotspots hook loads. Module-level, so it never changes between renders. */
export const loadHotspotsFromSupabase = async () => {
  const [hotspots, links] = await Promise.all([listHotspots(), listHotspotLinks()]);
  return { hotspots, links };
};
