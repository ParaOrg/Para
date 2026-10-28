import type { Plugin } from 'vite';

/**
 * Writes .vite/modules.json: every output chunk and the source modules inside
 * it. Vite's manifest lists which chunks a page loads but not what went into
 * them; with this, scripts/checks/check-build.mjs can prove that no file from
 * src/app/studio/ or src/features/studio/ reaches the public page, whatever
 * that file happens to contain.
 */
export function chunkModules(): Plugin {
  return {
    name: 'para:chunk-modules',
    apply: 'build',
    generateBundle(_options, bundle) {
      const modules: Record<string, string[]> = {};
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') {
          modules[output.fileName] = output.moduleIds.map((id) => id.replaceAll('\\', '/'));
        }
      }
      this.emitFile({
        type: 'asset',
        fileName: '.vite/modules.json',
        source: JSON.stringify(modules, null, 1),
      });
    },
  };
}
