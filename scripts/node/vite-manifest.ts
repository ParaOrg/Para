import { readFileSync } from 'node:fs';

import { z } from 'zod';

/** One chunk of Vite's build manifest: the fields the service-worker plugins walk. */
const manifestChunkSchema = z.object({
  file: z.string(),
  css: z.array(z.string()).optional(),
  assets: z.array(z.string()).optional(),
  imports: z.array(z.string()).optional(),
  dynamicImports: z.array(z.string()).optional(),
});

const manifestSchema = z.record(z.string(), manifestChunkSchema);

export type ManifestChunk = z.infer<typeof manifestChunkSchema>;
export type Manifest = z.infer<typeof manifestSchema>;

/** Vite's build manifest at `path`, validated: a chunk shaped otherwise fails the build. */
export function readManifest(path: string): Manifest {
  return manifestSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}
