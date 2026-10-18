// The studio's draft payloads (src/features/studio/data/draft-save.ts), built
// by the studio's own code from rows studio-drafts.sh reads out of the
// disposable database, so the SQL side checks exactly what the studio sends.
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs supabase/verify/studio-drafts.mjs <op> < state.json
import { readFileSync } from 'node:fs';
import {
  hintuanLinksFor,
  hotspotPayloadOf,
  newRouteState,
  routePayloadOf,
  routeStateFromLive,
  servedRouteOf,
  withDirectionEmptied,
  withDirectionSaved,
  withSignboards,
} from '../../src/features/studio/data/draft-save.ts';

const [op] = process.argv.slice(2);
const s = JSON.parse(readFileSync(0, 'utf8'));
const lineInput = (over) => ({
  routeId: null,
  directionId: null,
  signboard: '',
  mode: 'jeepney',
  fareNote: '',
  headHotspotId: null,
  tailHotspotId: null,
  isLoop: false,
  via: '',
  reversed: false,
  controlPoints: s.line,
  segments: [{ mode: 'freehand', coordinates: s.line }],
  borrowedFrom: null,
  borrowedPart: null,
  borrowedMetres: null,
  ...over,
});

let payload;
if (op === 'hotspot') {
  payload = hotspotPayloadOf(s.input, s.line_name ?? null);
} else if (op === 'new') {
  const state = newRouteState(s.route_id);
  const input = lineInput({ headHotspotId: s.head, tailHotspotId: s.tail, signboard: 'New' });
  const ids = [...s.direction_ids];
  const links = hintuanLinksFor(s.line, s.hotspots, servedRouteOf(state, input));
  payload = routePayloadOf(withDirectionSaved(state, input, links, () => ids.shift()).state);
} else {
  const state = routeStateFromLive(s.route, s.variants, s.links);
  if (op === 'edit') {
    const input = lineInput({ routeId: state.subjectId, directionId: s.direction });
    const links = hintuanLinksFor(s.line, s.hotspots, servedRouteOf(state));
    payload = routePayloadOf(withDirectionSaved(state, input, links).state);
  } else if (op === 'signboards') {
    payload = routePayloadOf(withSignboards(state, s.direction, s.names));
  } else if (op === 'delete') {
    payload = routePayloadOf(withDirectionEmptied(state, s.direction));
  } else {
    throw new Error(`unknown op ${op}`);
  }
}
process.stdout.write(JSON.stringify(payload));
