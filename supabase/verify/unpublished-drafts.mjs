// The drafts unpublish leaves (20261105160000_draft_published.sql, private.payload_of), read by
// the studio's own code: a route's parses into the studio's draft state and builds back into the
// same payload, so the next save or publish of it is the studio's own; a hotspot's opens in Edit.
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs supabase/verify/unpublished-drafts.mjs < drafts.json
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { hotspotToEdit } from '../../src/features/studio/data/hotspot-to-edit.ts';
import {
  routePayloadOf,
  routeStateFromDraft,
} from '../../src/features/studio/data/route-draft-state.ts';

const drafts = JSON.parse(readFileSync(0, 'utf8'));
const failures = [];
for (const draft of drafts) {
  try {
    if (draft.kind === 'route') {
      const rebuilt = routePayloadOf(routeStateFromDraft(draft));
      if (!isDeepStrictEqual(JSON.parse(JSON.stringify(rebuilt)), draft.payload))
        failures.push(`route ${draft.subject_id}: the studio builds a different payload from it`);
    } else {
      const { linkedDirectionIds } = hotspotToEdit({ id: draft.subject_id }, draft);
      const expected = draft.payload.links.map((l) => l.route_variant_id);
      if (!isDeepStrictEqual(linkedDirectionIds, expected))
        failures.push(`hotspot ${draft.subject_id}: Edit opens other links`);
    }
  } catch (e) {
    failures.push(`${draft.kind} ${draft.subject_id}: ${e instanceof Error ? e.message : e}`);
  }
}
if (drafts.length === 0) failures.push('no draft to read');
for (const f of failures) console.log(`FAILED: ${f}`);
if (failures.length === 0)
  console.log(`unpublished drafts: ${drafts.length} read by the studio's code`);
process.exitCode = failures.length === 0 ? 0 : 1;
