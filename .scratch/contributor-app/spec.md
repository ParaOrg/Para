# The contributor app (Android APK)

Planned with the owner on 2026-10-24. Status: **plan only** — no tickets started, nothing built. The owner said "let's plan only, don't create first".

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

## The signing key (the owner keeps it)

An Android app is signed with a key. **Lose it, and testers must uninstall, losing their unsent recordings, to install the next version.**

- A session generates the key once.
- It goes into GitHub Actions secrets.
- The owner keeps a backup in a password manager.
- It is never committed.

## Where the download lives

A hidden URL on our Cloudflare site, such as `/app/parapo-contributor-<version>.apk`, together with `/app/latest.json` (version, link, minimum version), that the owner sends to testers.

- It's linked from nowhere.
- It's not secret, but unlisted, which matches "closed for us".
- A tester's phone asks once to allow installs from their browser.

## Tickets (to write when the owner says go)

| # | Ticket | Notes |
| --- | --- | --- |
| 01 | Spike: Capacitor app, background location, sign-in and Turnstile on the owner's phone | A throwaway test APK; settles the four risks; go/no-go |
| 02 | The Android project and building the APK in CI | `android/`, `capacitor.config.ts`, a GitHub workflow that builds a signed APK on a tag |
| 03 | Native location in the recorder | Plugin fixes in the app, `watchPosition` on the web (kept for dev and tests); the notification; the permission steps; the battery-restriction help |
| 04 | Signing, the download link and the update check | The key in secrets, the owner's backup, `/app/latest.json`, the "new version" prompt |
| 05 | Close the web contributor page | `/contribute/` stops serving the recorder; the service worker; `check-build.mjs` |
| 06 | Docs | CLAUDE.md (stack, folders, `android/`), an ADR for the native app, the consent line "while you record, even with the screen off" (with consent v3) |

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
