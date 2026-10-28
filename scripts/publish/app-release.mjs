// Lays out a signed release's two GitHub Release assets: <out>/para-contributor.apk and
// <out>/latest.json. The release workflow runs it after signing and checking the APK.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs \
//     scripts/publish/app-release.mjs --apk <file> --version 1.2.3 --code 1002003 \
//     --min 0.0.0 --apk-url https://github.com/<owner>/<repo>/releases/latest/download/para-contributor.apk --out <dir>
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { latestReleaseText } from './app-release-file.mjs';

const { values } = parseArgs({
  options: {
    apk: { type: 'string' },
    version: { type: 'string' },
    code: { type: 'string' },
    min: { type: 'string' },
    'apk-url': { type: 'string' },
    out: { type: 'string' },
  },
});
for (const name of ['apk', 'version', 'code', 'min', 'apk-url', 'out']) {
  if (!values[name]) throw new Error(`--${name} is required`);
}

const text = latestReleaseText({
  version: values.version,
  versionCode: Number(values.code),
  minVersion: values.min,
  apkUrl: values['apk-url'],
});
mkdirSync(values.out, { recursive: true });
copyFileSync(values.apk, join(values.out, 'para-contributor.apk'));
writeFileSync(join(values.out, 'latest.json'), text);
console.log(`Wrote ${values.out}/para-contributor.apk and latest.json`);
