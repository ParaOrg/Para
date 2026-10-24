# 04: Signing, the download link and updates

Status: in review (PR #393)
Type: task
Who: a session; the owner keeps the passphrase
Blocked by: 02

The owner's decisions (2026-10-24): the key is made by a workflow from a passphrase the owner types, and the APK is published as a GitHub Release.

- **Key:** the owner adds one repository secret, `PARAPO_KEY_PASSPHRASE` (24 characters or more, ideally six or more random words, in a password manager). They run **Actions > Make the app signing key > Run workflow** once. It uploads only `release-key.p12.enc` (PKCS12, RSA 4096, alias `parapo`, encrypted with the passphrase). The coordinator commits it as `android/release-key.p12.enc`. The repo is public, so the passphrase is the key's only protection. Losing the passphrase means testers must uninstall to update.
- **Signing:** a tag run decrypts the file with the passphrase into a temp file, signs, verifies, and deletes it. A missing passphrase or key file fails the run; nothing unsigned is ever published.
- **Download:** a tag `app-v*` creates a GitHub Release (not a prerelease, marked latest) with `parapo-contributor.apk` and `latest.json` `{ version, versionCode, url, minVersion }`. Linked from nowhere. Only the `release` job has `contents: write`.
- **Update check:** on start the native app reads
  `https://github.com/Roviicc/ParaPo/releases/latest/download/latest.json` (Zod); a newer version shows "A new version is ready" with a Download link; below `minVersion` the app asks to update before recording. Offline: no check, no nagging.
- **Open:** GitHub sends no CORS headers on release assets, so the WebView's `fetch` is blocked; see the PR for the smallest fallback.
- **Open:** installing over the old app keeps recordings and the sign-in (same key): prove it once in the emulator, once the real key exists.
- `npm run check`; the workflow green.
