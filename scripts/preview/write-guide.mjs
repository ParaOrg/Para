import { cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
const root = '/tmp/parapo-review-hosted';
mkdirSync(`${root}/review-screenshots`, { recursive: true });
cpSync('/tmp/parapo-review-screenshots', `${root}/review-screenshots`, { recursive: true });
mkdirSync('/workspace/ParaPo-review/screenshots', { recursive: true });
cpSync('/tmp/parapo-review-screenshots', '/workspace/ParaPo-review/screenshots', {
  recursive: true,
});
const labels = {
  '01-playground-markers': '1. Playground draft markers',
  '02-review-list': '2. Drafts list',
  '03-draft-comparison': '3. What the draft does, and draft versus approved',
  '04-approve': '4. Approve confirmation',
  '05-discard': '5. Discard confirmation',
  '06-take-down': '6. Take-down confirmation',
  '06-put-back': '6. Put-back confirmation',
  '07-public-view': '7. Published Public view',
  '08-waiting-for-publication': '8. Waiting for publication',
  '09-conflict': 'Conflict handling',
  '10-phone-review': 'Phone review layout',
};
const gallery = readdirSync(`${root}/review-screenshots`)
  .filter((file) => file.endsWith('.png'))
  .sort()
  .map((file) => {
    const title = labels[file.replace('.png', '')] ?? file;
    return `<figure><h3>${title}</h3><a href="/review-screenshots/${file}"><img loading="lazy" src="/review-screenshots/${file}" alt="${title}"></a></figure>`;
  })
  .join('\n');
writeFileSync(
  `${root}/review-guide.html`,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ParaPo review workflow preview</title><style>body{font:16px/1.55 system-ui,sans-serif;margin:0;color:#222;background:#f6f6f6}main{max-width:1100px;margin:auto;padding:24px}a{color:#1248e8}h1,h2{line-height:1.2}section{padding:20px;background:white;border-radius:12px;margin:20px 0}img{display:block;max-width:100%;height:auto;border:1px solid #ddd;border-radius:8px}figure{margin:24px 0}.open{display:inline-block;padding:12px 20px;border-radius:30px;background:#1248e8;color:white;text-decoration:none}li{margin:10px 0}small{color:#555}</style></head><body><main><h1>ParaPo studio review</h1><p>Basic functional UI · Provisional styling · Final visual design stays with you.</p><p><a class="open" href="/studio/">Open the functional preview</a></p><p><strong>Isolated sample data.</strong> Changes stay in this browser. This site never connects to live Supabase. Actual database transactions were separately tested on disposable Postgres and PostgREST.</p><section><h2>Click-through checklist</h2><ol><li>Open <strong>Drafts</strong>. Find <strong>Preview new place</strong> and open <strong>Review changes</strong>.</li><li>Read <strong>What this draft does</strong>, inspect the drawing and changed fields, edit the draft details and save. <strong>Approve</strong> and confirm.</li><li>Open <strong>Waiting for publication</strong>. Public view still shows the old snapshot. Close review, click the preview-only <strong>Publish sample</strong>, choose <strong>Public</strong>, and reload its map.</li><li>Back in <strong>Routes and places</strong>, find the place and try <strong>Take down</strong> and <strong>Put back</strong>. Publish each change to update Public view.</li><li>One sample route has a conflict: review both versions, explicitly keep the draft for a new review, and approve it again. Try discarding another draft with its confirmation.</li><li>Use <strong>New Route</strong> or <strong>New hotspot</strong> to draw and save a draft. New endpoint places need their own approvals before the route can be approved.</li></ol><p><strong>Reset sample</strong> starts over. Deployed staging/production flags remain off. Saves are never auto-approved.</p></section><section><h2>Screenshots from the database-backed checks</h2><small>The test basemap is plain for reproducible map assertions; the functional preview uses the normal basemap.</small>${gallery}</section></main></body></html>`,
);
