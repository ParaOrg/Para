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
  and `latest.json`; nothing is deployed to the website.
- **Signing.** A one-time workflow, "Make the app signing key", generates the
  release keystore from the repository secret `PARAPO_KEY_PASSPHRASE` and
  uploads it encrypted (AES-256-CBC, PBKDF2) as `android/release-key.p12.enc`,
  which is committed. The release build decrypts it with the same secret into a
  temp file and deletes it. **The repository is public, so the passphrase is all
  that protects the key**: anyone can download the file and guess offline. It
  must be at least 24 characters, ideally six or more random words, kept in a
  password manager. A release run with no passphrase fails; it never publishes
  an unsigned APK.
- **Updates.** The app reads
  `https://github.com/Roviicc/ParaPo/releases/latest/download/latest.json` at
  start (`version`, `versionCode`, `url`, `minVersion`). A newer `versionCode`
  shows a quiet "A new version is ready" with a Download link; below
  `minVersion` the app asks to update before Start; offline it shows nothing.
  `minVersion` is set in `android/min-version.txt`. GitHub sends no CORS
  headers on release assets, so a WebView `fetch` from `https://localhost` is
  blocked: see the update check's fallback in the pull request.
- A downloaded APK does not update itself. The signing key must never change
  and never be lost: a new key means testers uninstall and lose unsent
  recordings.
- Rejected: a wrapped web page (a Trusted Web Activity), which can't record
  with the screen off; a separate native app, which would rewrite the recorder;
  an iPhone build, for now.
