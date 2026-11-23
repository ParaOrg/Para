import { landmarkFileSchema, type Landmark } from './landmark-file-schema';

/** Where the landmark file is served (scripts/landmarks/build.sh writes it to public/data/). */
export const LANDMARK_FILE_URL = '/data/landmarks.v1.json';

export interface LandmarkFileRead {
  /** Every landmark, as the file has it (the search folds their names: searchableLandmarks). */
  landmarks: Landmark[];
  /** The credit the data's licence asks to be shown beside it: "© OpenStreetMap contributors". */
  attribution: string;
}

let read: Promise<LandmarkFileRead> | null = null;

/**
 * The OpenStreetMap landmark file (.scratch/place-search, step 2), read once a page and shared.
 * Loaded by place search on its first keystroke, never by the page itself: this module is a chunk
 * of its own. It imports none of the search's rules (the search folds the names itself): a module
 * two chunks import moves into the shared chunk the page always loads. The offline worker keeps
 * the file once read. A failure is not kept, so the next try asks again.
 */
export function fetchLandmarks(): Promise<LandmarkFileRead> {
  read ??= fetch(LANDMARK_FILE_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`${LANDMARK_FILE_URL}: HTTP ${response.status}`);
      const file = landmarkFileSchema.parse(await response.json());
      return { landmarks: file.landmarks, attribution: file.attribution };
    })
    .catch((error: unknown) => {
      read = null;
      throw error;
    });
  return read;
}
