// The station codes (src/features/routes/model/rail-codes.ts) against the owner's
// table, every station of the three lines: the Figma research page "Research:
// train and ferry lines" (2026-10-08), which reserves GL01 for the North
// Triangle common station and numbers Fernando Poe Jr. GL02. The module
// holds a prefix a line and the rule that counts; the table is written out
// here, so a code that does not follow is a wrong rule or a wrong count.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/rail-codes-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stationCode } from '../../src/features/routes/model/rail-codes.ts';

/** The owner's table, in its order: each line from its first code, by the map's names. */
const CODES = {
  'LRT-1': [
    ['GL02', 'Fernando Poe Jr.'],
    ['GL03', 'Balintawak'],
    ['GL04', 'Monumento'],
    ['GL05', '5th Avenue'],
    ['GL06', 'R. Papa'],
    ['GL07', 'Abad Santos'],
    ['GL08', 'Blumentritt'],
    ['GL09', 'Tayuman'],
    ['GL10', 'Bambang'],
    ['GL11', 'Doroteo Jose'],
    ['GL12', 'Carriedo'],
    ['GL13', 'Central Terminal'],
    ['GL14', 'United Nations'],
    ['GL15', 'Pedro Gil'],
    ['GL16', 'Quirino'],
    ['GL17', 'Vito Cruz'],
    ['GL18', 'Gil Puyat'],
    ['GL19', 'Libertad'],
    ['GL20', 'EDSA'],
    ['GL21', 'Baclaran'],
    ['GL22', 'Redemptorist-Aseana'],
    ['GL23', 'MIA Road'],
    ['GL24', 'PITX'],
    ['GL25', 'Ninoy Aquino Avenue'],
    ['GL26', 'Dr. Santos'],
  ],
  'LRT-2': [
    ['PL01', 'Recto'],
    ['PL02', 'Legarda'],
    ['PL03', 'Pureza'],
    ['PL04', 'V. Mapa'],
    ['PL05', 'J. Ruiz'],
    ['PL06', 'Gilmore'],
    ['PL07', 'Betty Go - Belmonte'],
    ['PL08', 'Cubao'],
    ['PL09', 'Anonas'],
    ['PL10', 'Katipunan'],
    ['PL11', 'Santolan'],
    ['PL12', 'Marikina-Pasig'],
    ['PL13', 'Antipolo'],
  ],
  'MRT-3': [
    ['YL01', 'North Avenue'],
    ['YL02', 'Quezon Avenue'],
    ['YL03', 'Kamuning'],
    ['YL04', 'Cubao'],
    ['YL05', 'Santolan-Annapolis'],
    ['YL06', 'Ortigas'],
    ['YL07', 'Shaw Boulevard'],
    ['YL08', 'Boni'],
    ['YL09', 'Guadalupe'],
    ['YL10', 'Buendia'],
    ['YL11', 'Ayala'],
    ['YL12', 'Magallanes'],
    ['YL13', 'Taft Avenue'],
  ],
};

test("every station of the three lines, by the map's name, codes as the owner's table has it", () => {
  for (const [line, rows] of Object.entries(CODES))
    for (const [code, name] of rows) assert.equal(stationCode(line, name), code, `${line} ${name}`);
  assert.equal(Object.values(CODES).flat().length, 25 + 13 + 13);
});

test('a line’s codes are each one station’s, and GL01 is nobody’s: reserved for North Triangle', () => {
  for (const [line, rows] of Object.entries(CODES)) {
    const codes = rows.map(([code]) => code);
    assert.equal(new Set(codes).size, codes.length, line);
  }
  assert.ok(!CODES['LRT-1'].some(([code]) => code === 'GL01'));
  assert.equal(stationCode('LRT-1', 'North Triangle'), null);
});

test('the operators’ other names code the same station', () => {
  assert.equal(stationCode('LRT-1', 'Roosevelt'), 'GL02');
  assert.equal(stationCode('LRT-1', 'Yamaha Monumento'), 'GL04');
  assert.equal(stationCode('LRT-1', 'D. Jose'), 'GL11');
  assert.equal(stationCode('LRT-1', 'UN Avenue'), 'GL14');
  assert.equal(stationCode('LRT-2', 'Betty Go-Belmonte'), 'PL07');
  assert.equal(stationCode('LRT-2', 'Araneta Center-Cubao'), 'PL08');
  assert.equal(stationCode('MRT-3', 'GMA-Kamuning'), 'YL03');
  assert.equal(stationCode('MRT-3', 'Araneta Center-Cubao'), 'YL04');
  // Case, spaces and punctuation aside, as the table reads a name.
  assert.equal(stationCode('LRT-1', 'dr santos'), 'GL26');
});

test('null for a name the line’s table does not know, another line’s station among them', () => {
  assert.equal(stationCode('LRT-1', 'Cubao'), null);
  assert.equal(stationCode('LRT-2', 'EDSA'), null);
  assert.equal(stationCode('MRT-3', 'Recto'), null);
  assert.equal(stationCode('MRT-3', 'Nowhere'), null);
  assert.equal(stationCode('MRT-3', ''), null);
});
