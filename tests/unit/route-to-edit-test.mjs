import assert from 'node:assert/strict';
import { test } from 'node:test';

import { routeToEdit } from '../../src/features/studio/data/route-to-edit.ts';

const approved = {
  id: 'r1',
  name: 'Tala – SM Fairview',
  routeCode: null,
  shortName: null,
  longName: null,
  fareAsOf: null,
  signboard: 'TALA – SM FAIRVIEW',
  mode: 'jeepney',
  fareNote: null,
  via: null,
  headHotspotId: 'tala',
  tailHotspotId: 'fairview',
};
const draftOf = (route) => ({
  id: 'd1',
  kind: 'route',
  subject_id: 'r1',
  is_new: false,
  base_revision: 3,
  revision: 1,
  payload: { version: 1, route, directions: [] },
});

test('with no draft, the form starts from the approved route', () => {
  assert.equal(routeToEdit(approved, null), approved);
});

test("with the editor's draft, the form starts from the draft's facts, the name kept", () => {
  const edited = routeToEdit(
    approved,
    draftOf({
      signboard: 'TALA – NOVA',
      mode: 'e_jeepney',
      fare_note: 'Student fare on weekdays',
      via: 'Zabarte',
      head_stop_id: 'tala',
      tail_stop_id: 'nova',
      is_loop: false,
    }),
  );
  assert.equal(edited.via, 'Zabarte');
  assert.equal(edited.signboard, 'TALA – NOVA');
  assert.equal(edited.mode, 'e_jeepney');
  assert.equal(edited.fareNote, 'Student fare on weekdays');
  assert.equal(edited.tailHotspotId, 'nova');
  assert.equal(edited.name, approved.name);
  assert.equal('isLoop' in edited, false);
});
