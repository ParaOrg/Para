# 04: Signing, the download link and updates

Status: resolved
Type: task
Who: a session; the owner keeps the passphrase
Blocked by: 02

The owner's decisions (2026-10-24): the key is made by a workflow from a passphrase the owner types, and the APK is published as a GitHub Release.

- **Key:** the owner creates the GitHub Environment `app-release` (only the branch `main` and the tags `app-v*`) and adds one secret to it, `PARAPO_KEY_PASSPHRASE` (24 characters or more, ideally six or more random words, in a password manager). They run **Actions > Make the app signing key > Run workflow** once, on `main`. It uploads the artifact `app-signing-key`: `release-key.p12.enc` (PKCS12, RSA 4096, alias `parapo`, encrypted with the passphrase) and `release-key.sha256` (the certificate's public fingerprint). The coordinator commits both under `android/`. The repo is public, so the passphrase is the key's only protection. Losing it means testers must uninstall to update.
- **Signing:** a tag run decrypts the file with the passphrase into a temp file, signs, verifies the signature and that the certificate is the recorded one, and deletes the temp file. A missing passphrase or key file fails the run; nothing unsigned is ever published.
- **Download:** a tag `app-v*` creates a GitHub Release (not a prerelease, marked latest) with `parapo-contributor.apk` and `latest.json` `{ version, versionCode, url, minVersion }`. Linked from nowhere. Only the `publish` job has `contents: write`. Any other Release in the repo must use `--latest=false`.
- **Update check:** on start the native app reads
  `https://github.com/Roviicc/ParaPo/releases/latest/download/latest.json` with `CapacitorHttp.get` (Zod). GitHub sends no CORS headers on release assets, so a WebView `fetch` would always be blocked; the global `CapacitorHttp` setting stays off (it patches Supabase's `fetch`), and `api.github.com` is avoided (60 requests an hour per IP). A newer version shows "A new version is ready" with a Download link; below `minVersion` the app asks to update before recording. Offline: no check, no nagging; a file that is reached but invalid logs one `console.warn`.
- **To check on a device:** the Download link's `target="_blank"` opening the system browser.
- **Open:** installing over the old app keeps recordings and the sign-in (same key): prove it once in the emulator, once the real key exists.
- `npm run check`; the workflow green.
