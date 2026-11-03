// The phone's upload limits (src/features/contribute/recorder/recording-limits.ts) against the
// database's: the migration is read as text, so a number changed on one side only fails here.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/recording-limits-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { UPLOAD_LIMITS } from '../../src/features/contribute/recorder/recording-limits.ts';

const MIGRATION = readFileSync(
  new URL('../../supabase/migrations/20261019125900_contributions.sql', import.meta.url),
  'utf8',
);

/** The number the first match of `pattern` captures; fails when the migration no longer says it. */
function numberIn(pattern, what) {
  const match = MIGRATION.match(pattern);
  assert.ok(match, `the migration no longer states ${what}`);
  return Number(match[1].replaceAll(',', ''));
}

test('the points a contribution may hold are the database cap', () => {
  assert.equal(
    numberIn(
      /point_count integer not null check \(point_count between 0 and (\d+)\)/,
      'the points per contribution',
    ),
    UPLOAD_LIMITS.points,
  );
  assert.equal(numberIn(/if total > (\d+) then/, 'the point cap trigger'), UPLOAD_LIMITS.points);
});

test('the points a batch may hold are the database cap', () => {
  assert.equal(
    numberIn(
      /point_count smallint not null check \(point_count between 1 and (\d+)\)/,
      'the points per batch',
    ),
    UPLOAD_LIMITS.pointsPerBatch,
  );
});

test('the speed the database refuses is the one the phone knows, and the phone stops below it', () => {
  assert.equal(
    numberIn(/metres \/ \(new\.dt_ms\[i\] \/ 1000\.0\) > (\d+) \/ 3\.6/, 'the speed limit'),
    UPLOAD_LIMITS.databaseSpeedKmh,
  );
  assert.ok(UPLOAD_LIMITS.speedKmh < UPLOAD_LIMITS.databaseSpeedKmh);
});

test('the recordings a phone may send in 24 hours are the database cap', () => {
  assert.equal(
    numberIn(/\) >= (\d+) then\s+raise exception 'day_cap/, 'the day cap'),
    UPLOAD_LIMITS.contributionsPerDay,
  );
});

test('the recording length, the list sizes, the text lengths and the line size are the database caps', () => {
  assert.equal(numberIn(/started_at \+ interval '(\d+) hours'/, 'the length'), UPLOAD_LIMITS.hours);
  assert.equal(
    numberIn(
      /events jsonb not null check \(.*jsonb_array_length\(events\) <= (\d+)\)/,
      'the events cap',
    ),
    UPLOAD_LIMITS.listEntries,
  );
  assert.equal(
    numberIn(/gaps jsonb not null check \(.*jsonb_array_length\(gaps\) <= (\d+)\)/, 'the gaps cap'),
    UPLOAD_LIMITS.listEntries,
  );
  assert.equal(
    numberIn(/start_name text check \(char_length\(start_name\) <= (\d+)\)/, 'the name length'),
    UPLOAD_LIMITS.nameLength,
  );
  assert.equal(
    numberIn(
      /description text check \(char_length\(description\) <= (\d+)\)/,
      'the description length',
    ),
    UPLOAD_LIMITS.descriptionLength,
  );
  assert.equal(
    numberIn(
      /from public\.hinto where contribution_id = new\.contribution_id\) >= (\d+) then/,
      'the hinto cap',
    ),
    UPLOAD_LIMITS.hintos,
  );
  assert.equal(
    numberIn(/octet_length\(line::text\) <= (\d+)/, 'the line size'),
    UPLOAD_LIMITS.lineBytes,
  );
});
