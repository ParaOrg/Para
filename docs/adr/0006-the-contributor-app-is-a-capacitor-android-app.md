---
status: accepted
date: 2026-10-24
---

# The contributor app is a Capacitor Android app

[ADR 0004](0004-location-leaves-the-phone-only-by-choice.md) put recording on a
contributor page. A web page can't keep recording once the screen goes off, and
that is what a ride needs. On 2026-10-24 the owner asked for the contributor to
be a downloadable APK, and a spike on the owner's phone (PR #385, never merged)
settled the open risks.

The contributor app is the contributor page's own React code inside a native
Android shell made with Capacitor. It is Android only, installed from a direct
download link rather than the Play Store, and its location comes from
`@capacitor-community/background-geolocation`, which runs as a foreground
service with a visible "ParaPo is recording" notification.

## Consequences

- One codebase. The app is `features/contribute/` and `app/contribute/`;
  `vite.apk.config.ts` builds that page's entry only, `capacitor.config.ts` and
  `android/` wrap it, and the app runs from its own files, offline.
- The web bundle carries no Capacitor code. `@capacitor/core` is imported only
  when the build mode is `apk` (`native-app.ts`), and
  `scripts/checks/check-build.mjs` proves on every build that no web chunk
  holds it.
- The app's build reads `.env.apk`, which holds only public values, like
  `.env.production`. Turnstile passes at the app's own origin,
  `https://localhost`, with no Cloudflare change.
- A GitHub workflow builds a debug APK on pull requests that touch the app and,
  on a tag `app-v*`, a signed release APK on the runner's own Android SDK. The
  tag's run publishes a GitHub Release with two assets, `parapo-contributor.apk`
  and `latest.json`; nothing is deployed to the website. `releases/latest/download/latest.json`
  always names the newest Release, so **any other Release made in this
  repository must pass `--latest=false`**.
- **Signing.** A one-time workflow, "Make the app signing key", generates the
  release keystore from the secret `PARAPO_KEY_PASSPHRASE` and uploads it
  encrypted (AES-256-CBC, PBKDF2) with the certificate's SHA-256 fingerprint.
  Both are committed (`android/release-key.p12.enc`, `android/release-key.sha256`).
  The release build decrypts the key with the same secret into a temp file,
  deletes it at the end, and refuses an APK whose certificate is not the
  recorded fingerprint. **The repository is public, so the passphrase is all
  that protects the key**: anyone can download the file and guess offline. It
  must be at least 24 characters, ideally six or more random words, kept in a
  password manager. A release run with no passphrase fails; it never publishes
  an unsigned APK.
- **Where the secret lives.** The passphrase is a secret of the GitHub
  Environment `app-release`, which allows only the branch `main` and the tags
  `app-v*`, so no pull request or other branch can read it. Only the key-making
  workflow and the release build job name that environment. Only the `publish`
  job can write to the repository, and it holds no secret.
- **Updates.** The app reads
  `https://github.com/Roviicc/ParaPo/releases/latest/download/latest.json` at
  start (`version`, `versionCode`, `url`, `minVersion`; `url` must be https on
  github.com). A newer `versionCode` shows a quiet "A new version is ready"
  with a Download link; below `minVersion` the app asks to update before Start;
  offline it shows nothing. `minVersion` is set in `android/min-version.txt`.
  The version code is major * 1,000,000 + minor * 1,000 + patch, with the major
  up to 2100 and minor and patch up to 999.
- **How the app reads `latest.json`.** GitHub sends no CORS headers on release
  assets (two 302s to `release-assets.githubusercontent.com`, none with
  `Access-Control-Allow-Origin`), so a WebView `fetch` from `https://localhost`
  is always blocked. The app reads the file with `CapacitorHttp.get` from
  `@capacitor/core`, which uses the phone's own HTTP client, follows redirects
  and is not held to CORS. Rejected: turning on Capacitor's global
  `CapacitorHttp` setting, because it patches `fetch` for every call, Supabase's
  included; and `api.github.com`, whose limit is 60 requests an hour per IP,
  which carriers' shared addresses would exhaust.
- **Recording with the screen off.** Android freezes the page's JavaScript about five minutes
  after the screen goes off, even with `useLegacyBridge: true` (the plugin's known problem, seen in
  the spike's emulator ride), so the page cannot be the only place a fix is written. The app's own
  `ParaPoApplication` listens to the broadcast the plugin's foreground service sends for each fix
  and appends it to a small file (`FixLog.java`, JSON lines, in the service's own process); the
  `FixLog` plugin lets the page start it for a recording, read it and clear it. The page imports
  what it has not stored yet, de-duplicated by time (a fix at or before the last stored one is
  skipped), when it is shown again and when the app reopens, before anything reads the ride, so a
  ride Android killed comes back as Unfinished with every fix up to the kill. The plugin is not
  forked; the broadcast is its in-process contract, and the version is pinned by the lockfile.
  **Auto-stop "back at the start" runs when the page wakes**, over what it imports, and stops the
  ride at the first fix that satisfies it, so the ride is cut there but the stop itself is seen
  only on waking. The fix rate is the plugin's one a second (its request interval is fixed at
  1000 ms); the emulator ride checks it while moving.
- **Permissions and battery.** The Start bar in the app (`native/start-gate.tsx`) asks in order for
  notifications (Android 13+), location, then "Allow all the time" (Android 10+), each after a plain
  reason; a refusal says what still works and opens the phone's Settings, and Start goes on without
  any but location. On makers known to stop background apps (Xiaomi, Oppo, Vivo, Samsung, Huawei,
  Realme) the first Start shows once how to allow ParaPo to run in the background, with that
  maker's steps, unless Android already says it is unrestricted.
- The CI job `emulator-ride` runs a scripted twenty-minute ride with the screen off on an emulator,
  kills the app's process at fifteen minutes and reopens it, and fails unless every fix the service
  had kept is in the ride. Its APK holds a driver (`VITE_EMULATOR_RIDE`) that the release build
  refuses to contain.
- A downloaded APK does not update itself. The signing key must never change
  and never be lost: a new key means testers uninstall and lose unsent
  recordings.
- Rejected: a wrapped web page (a Trusted Web Activity), which can't record
  with the screen off; a separate native app, which would rewrite the recorder;
  an iPhone build, for now.
