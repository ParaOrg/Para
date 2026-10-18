// Exports the actual UI with browser-local fixtures, never a live backend.
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { installReviewDemo } from './browser-demo.mjs';
import { previewSession, previewToken } from './review-fixture.mjs';
const source = '/tmp/parapo-review-hosted';
const seed = { version: 1 };
for (const table of ['route', 'route_variant', 'route_stop', 'stop', 'draft']) {
  const response = await fetch(`http://127.0.0.1:4180/api/rest/v1/${table}?select=*`, {
    headers: { Authorization: `Bearer ${previewToken()}` },
  });
  if (!response.ok) throw new Error(`Cannot export disposable ${table}`);
  seed[table] = await response.json();
}
seed.published = JSON.parse(
  readFileSync('/tmp/parapo-review-publish/public/data/index.v5.json', 'utf8'),
);
seed.publishedLines = Object.fromEntries(
  seed.published.variants.map((direction) => [
    direction.id,
    JSON.parse(
      readFileSync(`/tmp/parapo-review-publish/public/data/lines/${direction.id}.json`, 'utf8'),
    ),
  ]),
);
writeFileSync(
  `${source}/review-demo.js`,
  `(${installReviewDemo.toString()})(${JSON.stringify(seed)},${JSON.stringify(previewSession())});`,
);
const toolbar = `<div style="height:40px;padding:4px 8px;display:flex;align-items:center;gap:4px;font:12px sans-serif;background:white;color:#222"><strong style="min-width:0;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Sample · Provisional</strong><button style="white-space:nowrap" id="sample-publish">Publish sample</button><button style="white-space:nowrap" id="sample-reset">Reset sample</button><span style="max-width:25%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" id="sample-result" role="status"></span></div><script>document.getElementById('sample-publish').onclick=()=>{window.paraPoReviewDemo.publish();document.getElementById('sample-result').textContent='Published sample; reload Public view.';};document.getElementById('sample-reset').onclick=()=>window.paraPoReviewDemo.reset();</script><style>#root{height:calc(100% - 40px)!important}</style>`;
for (const page of ['index.html', 'studio/index.html']) {
  const file = `${source}/${page}`;
  let html = readFileSync(file, 'utf8');
  if (page.startsWith('studio') && html.includes('id="sample-publish"')) {
    const start = html.indexOf('>', html.indexOf('<body')) + 1;
    const end = html.indexOf('<div id="root"', start);
    if (end < start) throw new Error('Cannot locate the preview root');
    html = html.slice(0, start) + html.slice(end);
  }
  html = html
    .replaceAll('<script src="/review-demo.js"></script>', '')
    .replace('<head>', '<head><script src="/review-demo.js"></script>');
  if (page.startsWith('studio')) html = html.replace('<body>', `<body>${toolbar}`);
  writeFileSync(file, html);
}
cpSync('/tmp/parapo-review-publish/public/data', `${source}/data`, { recursive: true });
