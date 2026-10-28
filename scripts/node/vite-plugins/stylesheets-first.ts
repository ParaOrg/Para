import type { Plugin } from 'vite';

/**
 * Each page asks for its stylesheets before its scripts (2026-10-05, for
 * the cheap-phone plan's steps 12 and 14). Vite writes the page's module
 * script, then a modulepreload for every chunk it imports, then the
 * stylesheets. Over HTTP/1.1 a browser opens six connections to a host:
 * once the page loads seven scripts (MapLibre in two chunks, step 14; React
 * and the shared code in one each, step 12; the entry, Rolldown's runtime
 * and Vite's preload helper), those ahead took all six, and the
 * stylesheets, which hold up the first paint, waited a round trip for one
 * to come free (the cheap-phone timer: first paint 1.76 -> 2.49 s). HTTP/2
 * and 3 have no such limit, but a phone behind a proxy, and the timer's own
 * server, speak HTTP/1.1. Moved to just before the module script: still
 * after index.html's early map-file script (a script after a stylesheet
 * waits for it), in the same order, so the cascade is the same, and the
 * module scripts waited for them anyway.
 */
export function stylesheetsBeforeScripts(html: string): string {
  const head = html.indexOf('</head>');
  const script = html.search(/<script type="module"[^>]*\ssrc=/);
  if (head < 0 || script < 0 || script > head) return html;
  const sheets = html.slice(script, head).match(/<link rel="stylesheet"[^>]*>/g);
  if (!sheets) return html;
  let rest = html.slice(script, head);
  for (const sheet of sheets)
    rest = rest.replace(
      new RegExp(`\\n?[ \\t]*${sheet.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`),
      '',
    );
  const indent = /[ \t]*$/.exec(html.slice(0, script))?.[0] ?? '';
  return (
    html.slice(0, script) + sheets.map((s) => `${s}\n${indent}`).join('') + rest + html.slice(head)
  );
}
export function stylesheetsFirst(): Plugin {
  return {
    name: 'para:stylesheets-first',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: { order: 'post', handler: stylesheetsBeforeScripts },
  };
}
