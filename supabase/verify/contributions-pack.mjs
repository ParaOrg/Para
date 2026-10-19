// The phone's upload, packed by the contributor page's own code
// (src/features/contribute/api/pack-recording.ts) from a ride with a real
// phone's faults, printed as the JSON save_contribution is sent.
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs supabase/verify/contributions-pack.mjs <id> <fixes>
import { packRecording } from '../../src/features/contribute/api/pack-recording.ts';
import { T0, rideFixes, rideRecording } from '../../tests/unit/fixtures/contribution-ride.mjs';

const [id, count] = process.argv.slice(2);
const fixes = rideFixes(Number(count));
const result = packRecording(rideRecording(id, fixes), fixes, 1, T0 + 3_600_000);
if (!result.ok) throw new Error(`not packed: ${result.reason}`);
process.stdout.write(JSON.stringify(result.payload));
