// SPIKE, not to merge: one build per page instead of one build of three pages.
//
//   PARA_PAGE=public-map|studio|contribute npx vite build --config vite.spike.config.mjs
//
// Each page is built alone into dist-spike/<page>, with everything else as
// vite.config.ts has it, so the two can be weighed side by side.
import base from './vite.config.ts';

const INPUTS = {
  'public-map': 'index.html',
  studio: 'studio/index.html',
  contribute: 'contribute/index.html',
};

const page = process.env.PARA_PAGE;
if (!page || !Object.hasOwn(INPUTS, page))
  throw new Error(`PARA_PAGE is one of ${Object.keys(INPUTS).join(', ')}, not "${page}"`);

export default {
  ...base,
  build: {
    ...base.build,
    outDir: `dist-spike/${page}`,
    rolldownOptions: {
      ...base.build?.rolldownOptions,
      input: { [page]: INPUTS[page] },
    },
  },
};
