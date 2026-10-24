// Lays out a signed release for the site: <out>/app/parapo-contributor-<version>.apk and
// <out>/app/latest.json. The release workflow runs it after signing and checking the APK.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs \
//     scripts/publish/app-release.mjs --apk <file> --version 1.2.3 --code 1002003 \
//     --min 0.0.0 --base-url https://example.workers.dev --out <dir>
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { apkName, latestReleaseText } from './app-release-file.mjs';

const { values } = parseArgs({
  options: {
    apk: { type: 'string' },
    version: { type: 'string' },
    code: { type: 'string' },
    min: { type: 'string' },
    'base-url': { type: 'string' },
    out: { type: 'string' },
  },
});
for (const name of ['apk', 'version', 'code', 'min', 'base-url', 'out']) {
  if (!values[name]) throw new Error(`--${name} is required`);
}

const text = latestReleaseText({
  version: values.version,
  versionCode: Number(values.code),
  minVersion: values.min,
  baseUrl: values['base-url'].replace(/\/+$/, ''),
});
const dir = join(values.out, 'app');
mkdirSync(dir, { recursive: true });
copyFileSync(values.apk, join(dir, apkName(values.version)));
writeFileSync(join(dir, 'latest.json'), text);
console.log(`Wrote ${dir}/${apkName(values.version)} and latest.json`);
