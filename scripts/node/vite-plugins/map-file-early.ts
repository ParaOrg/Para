import type { Plugin } from 'vite';

/**
 * The map file, asked for by the map's page as it is read: a few lines of
 * plain script in the <head> of the root index.html, ahead of the app's own
 * script and stylesheets (a script after a stylesheet waits for it), so the
 * small file comes over while the app's much larger script still downloads,
 * and the routes can go onto the map as soon as its style is in (MapView's
 * `openOn`). map-file.ts takes the answer once, under
 * EARLY_MAP_FILE, and treats it as the one it would have fetched itself.
 * `no-cache`, as map-file.ts asks: the file keeps no hash in its name. Low
 * priority: the app's script, which needs the whole link, keeps it first.
 * The studio's page reads the live tables and gets none. Not a word of the
 * registration here: check-build.mjs fails a page that carries one.
 */
export function mapFileEarly(mapFileUrl: string, earlyMapFile: string): Plugin {
  const script =
    `(function(){if(!window.fetch)return;` +
    `var q=fetch(${JSON.stringify(mapFileUrl)},{cache:'no-cache',priority:'low'})` +
    `.then(function(r){return{res:r,body:r.ok?r.clone().json().catch(function(){}):null}});` +
    `q.catch(function(){});window.${earlyMapFile}=q})()`;
  return {
    name: 'para:map-file-early',
    transformIndexHtml: {
      // Before Vite's own: in a build, the app's script and stylesheets are
      // added to the <head> after what is there by then.
      order: 'pre',
      handler(html, ctx) {
        if (ctx.path !== '/index.html') return html;
        return { html, tags: [{ tag: 'script', children: script, injectTo: 'head' }] };
      },
    },
  };
}
