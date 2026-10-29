// Proves, from the production build, that the public page carries no editor.
// Runs as the last step of `npm run build`, so a deploy that would leak fails.
// The contributors' page (contribute/index.html) is held to the same: it loads
// no editor, its Supabase client names no studio table and keeps its session
// under its own key, it draws its map with the chunks the public page
// loads (MapLibre, the shared code) and a copy of none, it is not installable,
// and the public page loads none of its code.
//
// Each proof is a file of its own under build/, numbered as they were listed:
//   1  modules.mjs            no studio or contribute source reaches the public page
//   2  strings.mjs            no editor-only word in the public chunks
//   3  packages.mjs           no Supabase client on the public page, no Capacitor anywhere
//      development-only.mjs   no e2e switch and no window.__map in a built file
//   4  installable.mjs        only / is installable
//      public-worker.mjs      what the public page's worker stores and answers
//   4b contribute-worker.mjs  what the contributor page's worker stores and answers
//   5  weight.mjs             the fonts', the shared chunks' and the contributor page's budgets
//   6  stylesheet-order.mjs   stylesheets before scripts, MapLibre's corners in the safe area
//   7  maplibre-worker.mjs    MapLibre's worker imports only MapLibre's shared code
//   8  early-map-file.mjs     the root page asks for the map file as it is read
//
// Each check has a positive control on the studio side — its chunks must hold
// studio modules, every marker and the Supabase client — or the search itself
// is broken and a pass would mean nothing.
//
//   npm run build        (runs this at the end, with --experimental-strip-types
//                         for the .ts modules it imports)
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChecker, readBuild } from './build/context.mjs';
import { proveContributeWorker } from './build/contribute-worker.mjs';
import { proveDevelopmentOnly } from './build/development-only.mjs';
import { proveEarlyMapFile } from './build/early-map-file.mjs';
import { proveInstallable } from './build/installable.mjs';
import { proveMaplibreWorker } from './build/maplibre-worker.mjs';
import { proveModules } from './build/modules.mjs';
import { provePackages } from './build/packages.mjs';
import { provePublicWorker } from './build/public-worker.mjs';
import { proveStrings } from './build/strings.mjs';
import { proveStylesheetOrder } from './build/stylesheet-order.mjs';
import { proveWeight } from './build/weight.mjs';

const PROOFS = [
  proveModules,
  proveStrings,
  provePackages,
  proveDevelopmentOnly,
  proveInstallable,
  provePublicWorker,
  proveContributeWorker,
  proveWeight,
  proveStylesheetOrder,
  proveMaplibreWorker,
  proveEarlyMapFile,
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const build = readBuild(root);
const { check, failedCount } = createChecker();
for (const prove of PROOFS) prove(build, check);

process.exit(failedCount() ? 1 : 0);
