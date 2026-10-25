# The contributor app (Android APK)

Planned with the owner on 2026-10-24. Status: **go** (the owner, 2026-10-24, after the spike). The spike is PR #385 (a draft, never merged).

## What the owner asked

> The contributor will be on a downloadable APK.

The owner's answers (2026-10-24):

- **Why:** record with the screen off; better location; feels like a real app; keep contributing off the web.
- **How testers get it:** a direct download link (no Play Store).
- **The web contributor page:** closes once the app exists. APK only.
- **iPhone:** Android only for now.

## The choice: a real Android app with Capacitor

A wrapped web page (a Trusted Web Activity) can't record with the screen off; that is the main reason for the app, so it is ruled out.

**Capacitor** puts the contributor page's own React code inside a native Android app:

- The code stays one codebase, in `features/contribute/` and `app/contribute/`, with no rewrite.
- Native plugins give background location.
- The accounts work (`../contributor-accounts/spec.md`) carries over as it is.

**New dependencies** need the owner's approval (CLAUDE.md, Stack):

- `@capacitor/core`, `@capacitor/cli` and `@capacitor/android`.
- A background-location plugin, `@capacitor-community/background-geolocation` or equivalent; the spike picks one.
- Possibly `@capacitor/app`, for version and update checks.

They replace nothing. The web stack can't record with the screen off.

## How it works

- **The build:** Vite builds the contributor page's entry only, and Capacitor copies it into `android/`. The app runs fully offline from its own files, not from the website.
- **Recording:**
  - Inside the app, the recorder takes its fixes from the native plugin, not the browser's `watchPosition`.
  - Android requires a foreground service with a visible notification while recording ("ParaPo is recording"). Recording goes on with the screen off or another app open, until Stop.
  - The fixes still go to IndexedDB, fix by fix, as today.
- **Location quality:** Android's fused location usually gives steadier fixes. The cleaner drawn line (a separate PR) still applies, and raw fixes still upload unchanged.
- **Accounts:** sign up and sign in as planned. The session lives in the app's storage.
- **Updates:** a downloaded APK doesn't update itself. The app reads a small version file on our site at start. When a newer version exists, it says so and links to the download. The new APK installs over the old one, keeping its recordings and its sign-in, as long as the same signing key is used.
- **The web page:** `/contribute/` stops serving the recorder. It shows nothing, or one line, to anyone who finds it, and the service worker stops caching it. The public map already has no way in (accounts ticket 05).

## Risks the spike must settle first

1. **The bot check (Turnstile) inside the app:**
   - The app runs from `https://localhost`, not our domain, so Turnstile may refuse to render.
   - CAPTCHA is on for the whole Supabase project, so sign-up and sign-in need a token.
   - Options:
     - a. Turnstile with `localhost` allowed on its widget;
     - b. a small hosted page on our domain that does the check and hands the token back;
     - c. turn CAPTCHA off and lean on the closed APK and Supabase's rate limits.
   - The spike tries a, then b. Option c is the owner's call.
2. **Background recording for real:**
   - A 30-minute ride on the owner's phone with the screen off, in a jeep.
   - Fixes keep arriving, IndexedDB keeps writing, and Stop works after unlocking.
   - Battery use is noted.
   - Some makers (Xiaomi, Oppo, Vivo, Samsung) kill background apps. The app then asks the tester to allow "no battery restrictions", with that maker's steps.
3. **Permissions:**
   - "Allow all the time" location (Android 10+) is asked in two steps, with a plain reason.
   - On Android 14 and up, the foreground-service-location permission.
   - On Android 13 and up, notifications.
4. **Building an APK in GitHub Actions:** Java and the Android SDK on the runner, and how long a build takes.

## The signing key (the owner keeps the passphrase)

An Android app is signed with a key. **Lose it, and testers must uninstall, losing their unsent recordings, to install the next version.**

- A one-time workflow generates the key from a passphrase the owner stores as the secret `PARAPO_KEY_PASSPHRASE`.
- Only the encrypted keystore leaves the workflow; it is committed as `android/release-key.p12.enc`.
- The repository is public, so the passphrase (24+ characters) is all that protects it. The owner keeps it in a password manager.

## Where the download lives

A GitHub Release per tag `app-v*`, with `parapo-contributor.apk` and `latest.json` as assets, that the owner sends to testers. The app reads `https://github.com/Roviicc/ParaPo/releases/latest/download/latest.json`.

- It's linked from nowhere.
- It's not secret, but unlisted, which matches "closed for us".
- A tester's phone asks once to allow installs from their browser.

## The spike's results (2026-10-24, the owner's phone)

- **Native app:** detected after importing `@capacitor/core` in the app build only (Android injects only `window.androidBridge`; `registerPlugin` comes from `@capacitor/core`'s JS). The web bundle carries none of it.
- **Turnstile inside the app:** passes at origin `https://localhost` with no Cloudflare change (risk 1). Still to confirm: Supabase accepting that token at a real sign-in.
- **Permissions:** the notice, location and "all the time" were all granted through the in-app steps.
- **Screen off:** the owner's phone kept recording with the screen locked. That was 91 fixes in 7 minutes, indoors, at 5 m accuracy, and the ride was saved.
- **Fix rate:** that is about one fix every 4–5 s while still, not one a second. Ticket 03 sets the plugin's interval and checks the rate while moving.
- **Build:** a debug APK in about 2½ minutes on GitHub's runner, using the runner's own Android SDK (`android-actions/setup-android` failed).
- **Emulator ride:** an automated screen-off ride on API 34 is in the spike's workflow.

## Tickets

| # | Ticket | Notes |
| --- | --- | --- |
| 01 | Spike (done, #385): Capacitor app, background location, sign-in and Turnstile on the owner's phone | A throwaway test APK; settles the four risks; go/no-go |
| 02 | [The Android project and building the APK in CI](issues/02-android-project-and-ci.md) | `android/`, `capacitor.config.ts`, a GitHub workflow that builds a signed APK on a tag |
| 03 | [Native location in the recorder](issues/03-native-location-in-the-recorder.md) | Plugin fixes in the app, `watchPosition` on the web (kept for dev and tests); the notification; the permission steps; the battery-restriction help |
| 04 | [Signing, the download link and the update check](issues/04-signing-download-and-updates.md) | The key from a passphrase secret, a GitHub Release with `latest.json`, the "new version" prompt |
| 05 | [Close the web contributor page](issues/05-close-the-web-contributor-page.md) | `/contribute/` stops serving the recorder; the service worker; `check-build.mjs` |
| 06 | Docs | Folded into 02 (CLAUDE.md lines and the ADR) and the accounts consent work |

**Order:** 01 first; 02–04 after a "go"; 05 only once testers have the APK.

## The owner's part

- An Android phone for the spike, with "install unknown apps" allowed for the browser.
- Approving the new dependencies (above).
- Choosing the Turnstile option if a and b both fail.
- Keeping the signing key's backup.
- Saying when to close the web page.

## How it fits what's already planned

- **Accounts** (`../contributor-accounts/`): unchanged, built first. The app signs in the same way.
- **Cleaner drawn line:** unchanged, used by the app.
- **Snapping in the studio:** unchanged, later.
