import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ROUTE_REPORT_KINDS } from '../../src/features/routes/model/route-report-schema.ts';
import { REPORT_KIND_LABEL, reportAge } from '../../src/features/studio/reports/report-labels.ts';

const NOW = Date.UTC(2026, 10, 11, 6, 0, 0);

test('every kind the database allows has a label', () => {
  assert.deepEqual(Object.keys(REPORT_KIND_LABEL).sort(), [...ROUTE_REPORT_KINDS].sort());
});

test('a report’s age reads in the largest whole unit', () => {
  assert.equal(reportAge(NOW - 20_000, NOW), 'just now');
  assert.equal(reportAge(NOW - 5 * 60_000, NOW), '5 minutes ago');
  assert.equal(reportAge(NOW - 3 * 3_600_000, NOW), '3 hours ago');
  assert.equal(reportAge(NOW - 30 * 3_600_000, NOW), 'yesterday');
  assert.equal(reportAge(NOW - 5 * 86_400_000, NOW), '5 days ago');
});

test('a clock behind the report reads just now, not a time ahead', () => {
  assert.equal(reportAge(NOW + 60_000, NOW), 'just now');
});
