// 4. The installable app (step 6) belongs to / only: the manifest link is in
//    index.html and not in studio/index.html, and no page but the map carries a
//    registration script. The web manifest names the app and its icons. What its
//    worker stores is public-worker.mjs's.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function proveInstallable(build, check) {
  const { dist, html } = build;

  check(
    'index.html links the manifest',
    /<link rel="manifest" href="\/manifest\.webmanifest">/.test(html('index.html')),
  );
  check(
    'studio/index.html links no manifest — /studio/ is not installable',
    !/rel="manifest"/.test(html('studio/index.html')),
  );
  check(
    'contribute/index.html links no manifest — /contribute/ is not installable',
    !/rel="manifest"/.test(html('contribute/index.html')),
  );
  check(
    'no page but the map carries a registration script',
    !/registerSW|vite-plugin-pwa:/.test(
      html('index.html') + html('studio/index.html') + html('contribute/index.html'),
    ),
  );

  const manifestFile = join(dist, 'manifest.webmanifest');
  let webManifest = null;
  try {
    webManifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  } catch {}
  check('manifest.webmanifest is valid JSON', webManifest !== null);
  if (!webManifest) return;
  const icons = webManifest.icons ?? [];
  const hasIcon = (size, purpose) =>
    icons.some(
      (i) =>
        i.sizes === size &&
        (purpose ? i.purpose === purpose : !i.purpose) &&
        existsSync(join(dist, i.src)),
    );
  check(
    'manifest: name, id/start_url/scope /, standalone, colours',
    webManifest.name === 'Para' &&
      webManifest.short_name === 'Para' &&
      webManifest.id === '/' &&
      webManifest.start_url === '/' &&
      webManifest.scope === '/' &&
      webManifest.display === 'standalone' &&
      /^#[0-9a-f]{6}$/.test(webManifest.theme_color) &&
      /^#[0-9a-f]{6}$/.test(webManifest.background_color),
  );
  check(
    'manifest: icons 192, 512 and 512 maskable, all present on disk',
    hasIcon('192x192') && hasIcon('512x512') && hasIcon('512x512', 'maskable'),
  );
  const themeMeta = /<meta name="theme-color" content="([^"]+)"/.exec(html('index.html'))?.[1];
  check(
    'index.html theme-color matches the manifest',
    themeMeta === webManifest.theme_color,
    `${themeMeta} vs ${webManifest.theme_color}`,
  );
}
