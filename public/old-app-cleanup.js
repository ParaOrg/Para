// Imported by the public map's worker (vite.config.ts, `importScripts`).
// Deletes the caches of "Para PH", the app this address served before, which a
// phone that used it still holds. Their names start with the prefix in
// src/features/published-map/old-app.ts.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name.startsWith('para-ph-')).map((name) => caches.delete(name)),
        ),
      ),
  );
});
