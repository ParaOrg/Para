/**
 * The limits the database holds every upload to (migration 20261019125900_contributions).
 * tests/unit/recording-limits-test.mjs reads that migration and fails when a number here
 * differs from it, so change both together.
 */
export const UPLOAD_LIMITS = {
  points: 14_400,
  pointsPerBatch: 600,
  hintos: 2_000,
  listEntries: 500,
  hours: 6,
  nameLength: 80,
  descriptionLength: 1_000,
  lineBytes: 200_000,
  contributionsPerDay: 20,
  /** The speed between two points above which the database refuses a batch. */
  databaseSpeedKmh: 150,
  /** Where the phone drops a point, a little below the database's, so rounding never trips it. */
  speedKmh: 140,
} as const;
