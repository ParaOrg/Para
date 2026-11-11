import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Plugin } from 'vite';

import { headersFor, parseHeadersFile } from '../headers-file.ts';

/**
 * `vite preview` serves the build without reading its `_headers`, which is
 * Cloudflare's file. This sends each path the content policies that file gives
 * it, and those alone, so the suites that run on a build meet the policies the
 * site will send and can fail on what one flags (tests/e2e/lib/policy.mjs).
 * The caching and the other headers stay Vite's: the suites were written
 * against them.
 */
export function previewPolicies(): Plugin {
  return {
    name: 'para:preview-policies',
    configurePreviewServer(server) {
      const file = resolve(server.config.root, server.config.build.outDir, '_headers');
      if (!existsSync(file)) return;
      const rules = parseHeadersFile(readFileSync(file, 'utf8'));
      server.middlewares.use((request, response, next) => {
        const { pathname } = new URL(request.url ?? '/', 'http://preview');
        for (const [name, value] of Object.entries(headersFor(rules, pathname)))
          if (name.startsWith('content-security-policy')) response.setHeader(name, value);
        next();
      });
    },
  };
}
