import { terminalFileSchema, type TerminalFile } from './terminal-file-schema';

/** Where the terminal file is served (scripts/landmarks/build.sh writes it to public/data/). */
export const TERMINAL_FILE_URL = '/data/terminals.v1.json';

let read: Promise<TerminalFile> | null = null;

/**
 * OpenStreetMap's terminals (.scratch/terminals), read once a page and shared. Loaded with the
 * layer that draws them, never by the page itself. The offline worker keeps the file once read. A
 * failure is not kept, so the next try asks again.
 */
export function fetchTerminals(): Promise<TerminalFile> {
  read ??= fetch(TERMINAL_FILE_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`${TERMINAL_FILE_URL}: HTTP ${response.status}`);
      return terminalFileSchema.parse(await response.json());
    })
    .catch((error: unknown) => {
      read = null;
      throw error;
    });
  return read;
}
