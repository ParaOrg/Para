import type { Plugin } from 'vite';

/**
 * The PWA plugin writes its `<link rel="manifest">` into every page it builds
 * without looking at which page it is, so left alone /studio/ and /contribute/
 * would install as Para too. This runs after it (both are post-order; this
 * one is later in the list) and takes the link back out of those pages. The
 * manifest belongs to / only; scripts/checks/check-build.mjs checks the built
 * pages.
 */
export function onlyTheMapHasAManifest(): Plugin {
  return {
    name: 'para:only-the-map-has-a-manifest',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const file = ctx.filename.replaceAll('\\', '/');
        if (!file.endsWith('/studio/index.html') && !file.endsWith('/contribute/index.html')) {
          return html;
        }
        return html.replace(/<link rel="manifest"[^>]*>/g, '');
      },
    },
  };
}
