// 6. Stylesheet order: on each page, the last rule that places
//    one of MapLibre's four corners is global.css's, inside the safe area, so
//    the attribution the licence asks for is never under a home indicator.
//    And each page asks for its stylesheets before its scripts, so over
//    HTTP/1.1 the first paint does not wait behind them.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGES = ['index.html', 'studio/index.html', 'contribute/index.html'];
const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export function proveStylesheetOrder(build, check) {
  const { dist, html } = build;

  // Over HTTP/1.1 the scripts ahead of a stylesheet can take all six of a
  // host's connections, and the first paint waits a round trip
  // (stylesheetsBeforeScripts in scripts/node/vite-plugins/stylesheets-first.ts).
  for (const page of PAGES) {
    const head = html(page).slice(0, html(page).indexOf('</head>'));
    const sheets = [...head.matchAll(/<link rel="stylesheet"/g)].map((m) => m.index);
    const scripts = [...head.matchAll(/<script type="module"|<link rel="modulepreload"/g)].map(
      (m) => m.index,
    );
    check(
      `${page} asks for its ${sheets.length} stylesheet(s) before its module script and its ${scripts.length - 1} preload(s)`,
      sheets.length > 0 && scripts.length > 0 && Math.max(...sheets) < Math.min(...scripts),
    );
  }

  // The rules each page's stylesheets hold, in the order the page links them; a
  // rule inside an at-rule is read as if outside it.
  for (const page of PAGES) {
    const sheets = [...html(page).matchAll(/<link rel="stylesheet"[^>]*href="\/([^"]+)"/g)].map(
      (m) => m[1],
    );
    const css = sheets.map((f) => readFileSync(join(dist, f), 'utf8')).join('\n');
    const last = {};
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const corner of CORNERS) {
        const places = body.split(';').some((p) => /^\s*(top|bottom|left|right)\s*:/.test(p));
        if (places && selectors.split(',').some((s) => s.trim() === `.maplibregl-ctrl-${corner}`))
          last[corner] = body;
      }
    }
    const outside = CORNERS.filter((c) => !/env\(safe-area-inset-/.test(last[c] ?? ''));
    check(
      `${page}: MapLibre's stylesheet is linked, and the last rule placing each of its corners is inside the safe area`,
      css.includes('.maplibregl-map{') && outside.length === 0,
      outside.map((c) => `${c}: ${last[c] ?? 'no rule'}`).join('; '),
    );
  }
}
