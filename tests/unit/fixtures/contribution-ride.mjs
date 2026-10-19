// A recorded ride as the contributor page keeps it, for the upload's tests:
// Fairview to Cubao along a straight street, one fix a second, standing still
// for two minutes in the middle, with the faults a real phone gives: a jump
// several hundred metres away, a fix repeated at the same time, and one
// reported outside the Philippines.
export const T0 = Date.UTC(2026, 9, 19, 0, 0, 0);
const M_PER_DEG_LAT = 111_320;

/** `count` fixes, the ride moving 8 m a second except while it stands (from 600 s to 720 s). */
export function rideFixes(count = 1300) {
  const fixes = [];
  let north = 0;
  for (let s = 0; s < count; s += 1) {
    const isStanding = s >= 600 && s < 720;
    if (!isStanding && s > 0) north += 8;
    fixes.push({ time: T0 + s * 1000, at: [121.05, 14.7 + north / M_PER_DEG_LAT], accuracyM: 6 });
  }
  if (count < 500) return fixes;
  // A jump of about 900 m in a second, a repeat of a fix's time, and a fix in Taiwan.
  fixes.splice(200, 0, { time: T0 + 200_500, at: [121.05, 14.71], accuracyM: 80 });
  fixes.splice(300, 0, { ...fixes[300] });
  fixes.splice(400, 0, { time: T0 + 400_500, at: [121.5, 25.0], accuracyM: 30 });
  return fixes;
}

/** The saved recording the fixes belong to. */
export function rideRecording(id, fixes) {
  const last = fixes[fixes.length - 1].time;
  return {
    version: 1,
    id,
    status: 'saved',
    startedAt: T0,
    stoppedAt: last,
    savedAt: last + 30_000,
    gaps: [],
    switches: [{ time: T0 + 900_000, to: 'return' }],
    startPointName: '  Fairview  ',
    endPointName: 'Cubao',
    description: 'Morning jeep',
    rideKind: 'Jeep',
  };
}
