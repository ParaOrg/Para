# 04: Signing, the download link and updates

Status: blocked
Type: task
Who: a session; the owner keeps the key's backup
Blocked by: 02

- **Key:** a session generates the release keystore once and gives it to the owner through a safe path (never committed, never pasted in chat). The owner stores it in a password manager and adds it, with its passwords, as GitHub Actions secrets (exact steps in the PR). Losing it means testers must uninstall to update.
- **Download:** the tag workflow publishes the signed APK to a hidden path on the Cloudflare site, `/app/parapo-contributor-<version>.apk`, and `/app/latest.json` `{ version, url, minVersion }`; linked from nowhere.
- **Update check:** on start the app reads `latest.json` (Zod); a newer version shows "A new version is ready" with a Download button; below `minVersion` the app asks to update before recording. Offline: no check, no nagging.
- Installing over the old app keeps recordings and the sign-in (same key): prove it once in the emulator.
- `npm run check`; the workflow green.
