import { execFileSync } from 'node:child_process';

import type { Plugin } from 'vite';

/** Where the dev server says which folder it serves, and at which commit. */
export const SERVED_SOURCE_PATH = '/__para/served-source';

/** The commit checked out in `folder`, or why there is none to name. */
function commitIn(folder: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: folder, encoding: 'utf8' }).trim();
  } catch {
    return 'not a git checkout';
  }
}

/**
 * The dev server only: answers SERVED_SOURCE_PATH with the folder it serves and its commit, so a
 * browser suite run from one worktree can tell when the server on its port is another's
 * (tests/e2e/lib/harness.mjs).
 */
export function servedSource(): Plugin {
  return {
    name: 'para:served-source',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(SERVED_SOURCE_PATH, (_request, response) => {
        const folder = server.config.root;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ folder, commit: commitIn(folder) }));
      });
    },
  };
}
