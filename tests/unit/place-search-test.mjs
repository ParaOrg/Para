// Place search over Para's own places (src/features/routes/model/place-search.ts,
// .scratch/place-search/README.md step 1): matched by informal name, name and aliases, ignoring
// case, accents and small typos; ranked by match, then distance, then name.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/place-search-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  editDistance,
  foldForSearch,
  matchQuality,
  searchPlaces,
  searchablePlaces,
  typosAllowed,
} from '../../src/features/routes/model/place-search.ts';

let next = 0;
const hotspot = (
  name,
  { informal = null, aliases = [], kind = 'hintuan', at = [121, 14.6] } = {},
) => ({
  id: `s${++next}`,
  name,
  informal,
  aliases,
  kind,
  point: { type: 'Point', coordinates: at },
  area: null,
  note: null,
  createdAt: '2026-01-01T00:00:00Z',
  line: null,
});

const HOTSPOTS = [
  hotspot('SM Fairview Terminal B', {
    informal: 'SM Fairview',
    kind: 'terminal',
    aliases: ['SM City Fairview'],
    at: [121.06, 14.733],
  }),
  hotspot('SM Fairview Hintuan', {
    informal: 'SM Fairview',
    aliases: ['Fairview'],
    at: [121.061, 14.734],
  }),
  hotspot('Quiapo Church', { informal: 'Quiapo', at: [120.984, 14.599] }),
  hotspot('Parañaque Integrated Terminal Exchange', {
    informal: 'PITX',
    aliases: ['Paranaque Terminal'],
    at: [120.992, 14.51],
  }),
  hotspot('Cubao Farmers', { informal: 'Cubao', at: [121.054, 14.619] }),
  hotspot('Cubao Gateway', { informal: 'Gateway Cubao', at: [121.053, 14.621] }),
];
const PLACES = searchablePlaces(HOTSPOTS);
const labels = (matches) => matches.map(({ place }) => place.label);

test('a fold drops case, accents and punctuation', () => {
  assert.equal(foldForSearch('  Parañaque  Int’l. Terminal '), 'paranaque int l terminal');
  assert.equal(foldForSearch('ESPAÑA'), 'espana');
});

test('boxes sharing an informal name are one place, answering to every name and alias once', () => {
  const fairview = PLACES.find(({ label }) => label === 'SM Fairview');
  assert.equal(fairview.hotspots.length, 2);
  assert.deepEqual(fairview.terms, [
    'SM Fairview',
    'SM Fairview Terminal B',
    'SM City Fairview',
    'SM Fairview Hintuan',
    'Fairview',
  ]);
  assert.equal(PLACES.length, 5);
});

test('the match qualities, best first', () => {
  assert.equal(matchQuality('quiapo', 'Quiapo'), 'whole');
  assert.equal(matchQuality('quia', 'Quiapo Church'), 'start');
  assert.equal(matchQuality('church', 'Quiapo Church'), 'word');
  assert.equal(matchQuality('apo', 'Quiapo'), 'inside');
  assert.equal(matchQuality('quaipo', 'Quiapo'), 'typo');
  assert.equal(matchQuality('fairveiw', 'SM Fairview'), 'typo');
  assert.equal(matchQuality('xyz', 'Quiapo'), null);
});

test('typos: none under 4 letters, one up to 7, two from 8', () => {
  assert.equal(typosAllowed(3), 0);
  assert.equal(typosAllowed(4), 1);
  assert.equal(typosAllowed(7), 1);
  assert.equal(typosAllowed(8), 2);
  assert.equal(matchQuality('cuba', 'Quiapo'), null);
  assert.equal(matchQuality('qpo', 'Quiapo'), null);
});

test('edit distance counts a swap of neighbours as one, and stops past its limit', () => {
  assert.equal(editDistance('quaipo', 'quiapo', 2), 1);
  assert.equal(editDistance('kitten', 'sitting', 5), 3);
  assert.equal(editDistance('abc', 'xyzxyz', 1), 2);
});

test('accents and case never stop a match: "paranaque" finds PITX by its name', () => {
  assert.deepEqual(labels(searchPlaces('PARANAQUE', PLACES)), ['PITX']);
  assert.deepEqual(labels(searchPlaces('parañaque integrated', PLACES)), ['PITX']);
});

test('an alias finds its place, and the match says which name matched', () => {
  const [match] = searchPlaces('sm city', PLACES);
  assert.equal(match.place.label, 'SM Fairview');
  assert.equal(match.matchedTerm, 'SM City Fairview');
});

test('a better match ranks first, whatever the distance', () => {
  const near = [121.053, 14.621];
  assert.deepEqual(labels(searchPlaces('cubao', PLACES, near)), ['Cubao', 'Gateway Cubao']);
});

test('equal matches rank nearest first when the commuter is located, by name otherwise', () => {
  // "terminal" is a word match in both "SM Fairview Terminal B" and PITX's "Paranaque Terminal".
  assert.deepEqual(labels(searchPlaces('terminal', PLACES)), ['PITX', 'SM Fairview']);
  assert.deepEqual(labels(searchPlaces('terminal', PLACES, [121.06, 14.73])), [
    'SM Fairview',
    'PITX',
  ]);
  const nearPitx = searchPlaces('terminal', PLACES, [120.992, 14.511]);
  assert.deepEqual(labels(nearPitx), ['PITX', 'SM Fairview']);
  assert.ok(nearPitx[0].distanceM < nearPitx[1].distanceM);
});

test("at one quality, a place matched by its own label beats one matched by another's name", () => {
  const places = searchablePlaces([
    hotspot('Robinsons Fairview', {
      informal: 'Robinson',
      aliases: ['SM Fairview'],
      at: [121.0, 14.7],
    }),
    hotspot('SM Fairview Terminal', { informal: 'SM Fairview', at: [121.06, 14.73] }),
  ]);
  assert.deepEqual(labels(searchPlaces('sm fairveiw', places)), ['SM Fairview', 'Robinson']);
  assert.deepEqual(labels(searchPlaces('sm fairveiw', places, [121.0, 14.7])), [
    'SM Fairview',
    'Robinson',
  ]);
});

test('a place is as near as its nearest box', () => {
  const [match] = searchPlaces('sm fairview', PLACES, [121.061, 14.734]);
  assert.ok(match.distanceM < 1);
});

test('an empty or blank query finds nothing; no location means no distance', () => {
  assert.deepEqual(searchPlaces('', PLACES), []);
  assert.deepEqual(searchPlaces('  ', PLACES), []);
  assert.equal(searchPlaces('quiapo', PLACES)[0].distanceM, null);
  assert.deepEqual(searchPlaces('nowhere at all', PLACES), []);
});

// The first typo rule, kept here as the reference: the query against each word start's stretch,
// as long as the query give or take the typos, one editDistance each.
const typoByStretches = (query, name) => {
  const limit = typosAllowed(query.length);
  if (limit === 0) return false;
  const starts = [0, ...[...name].flatMap((char, i) => (char === ' ' ? [i + 1] : []))];
  return starts.some((start) => {
    for (let length = query.length - limit; length <= query.length + limit; length++) {
      if (length < 1 || start + length > name.length) continue;
      if (editDistance(query, name.slice(start, start + length), limit) <= limit) return true;
    }
    return false;
  });
};

test('the one-table typo match and the letter filter answer as the stretch-by-stretch rule does', () => {
  // A fixed sequence, so a failure repeats.
  let seed = 7;
  const random = (n) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n);
  const letters = 'aeinorstum';
  const word = (length) => Array.from({ length }, () => letters[random(letters.length)]).join('');
  const mutate = (text) => {
    const at = random(text.length);
    const edits = [
      () => text.slice(0, at) + text.slice(at + 1),
      () => text.slice(0, at) + letters[random(letters.length)] + text.slice(at + 1),
      () => text.slice(0, at) + letters[random(letters.length)] + text.slice(at),
      () => text.slice(0, at) + (text[at + 1] ?? '') + text[at] + text.slice(at + 2),
    ];
    return edits[random(edits.length)]();
  };
  let typos = 0;
  for (let n = 0; n < 4000; n++) {
    const name = [word(3 + random(6)), word(3 + random(6)), word(2 + random(5))].join(' ');
    const words = name.split(' ');
    const picked = words[random(words.length)];
    const query = random(3) === 0 ? word(4 + random(6)) : mutate(mutate(picked + word(random(3))));
    if (query.length < 4 || name.includes(query)) continue;
    const expected = typoByStretches(query, name);
    if (expected) typos++;
    assert.equal(matchQuality(query, name) === 'typo', expected, `${query} in ${name}`);
  }
  assert.ok(typos > 200, `only ${typos} typo matches were tried`);
});
