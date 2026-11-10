import { cacheStorageMapFiles } from '@/features/routes/map/map-file-store';
import type { LineStringGeoJSON } from '@/features/routes/model/geojson-schema';
import {
  fetchIndex,
  readIndexFile,
  setMapFileStore,
} from '@/features/routes/published/fetch-index';
import { fetchLine, readLineFile } from '@/features/routes/published/fetch-line';
import type { Index } from '@/features/routes/published/index-schema';
import { LINES_URL, MAP_FILE_URL } from '@/features/routes/published/map-file';

import { nativeGetText } from '../native-bridge/native-app';

/*
 * Where the contributor's map reads the published map. The web page reads it from its own site,
 * as the public map does. The app's build carries none of it (vite.apk.config.ts), and its page
 * is served from the phone itself: it reads the public site's files through the phone's own HTTP
 * client, as the site sends no CORS headers for a page from another origin.
 */

/** The public site, whose /data/ the app reads. */
const PUBLISHED_SITE = 'https://www.para-commute.org';

let appIndex: Promise<Index> | null = null;
const appLines = new Map<string, Promise<LineStringGeoJSON | null>>();

/** Reads a file of the public site's as JSON, through the phone's HTTP client. */
async function siteJson(path: string): Promise<unknown> {
  return JSON.parse(await nativeGetText(`${PUBLISHED_SITE}${path}`));
}

/** The published index, read once a page; a failure is not kept, so the next read tries again. */
export function readPublishedIndex(): Promise<Index> {
  if (import.meta.env.MODE !== 'apk') {
    // With no signal, the map file the page's worker kept from an earlier visit. Given here, not
    // in main.tsx, so the reader stays out of the page's opening chunk.
    setMapFileStore(cacheStorageMapFiles);
    return fetchIndex();
  }
  appIndex ??= siteJson(MAP_FILE_URL)
    .then((raw) => readIndexFile(raw, MAP_FILE_URL))
    .catch((error: unknown) => {
      appIndex = null;
      throw error;
    });
  return appIndex;
}

/** A direction's full line, read once a page; null for a direction with none. */
export function readPublishedLine(id: string): Promise<LineStringGeoJSON | null> {
  if (import.meta.env.MODE !== 'apk') return fetchLine(id);
  let line = appLines.get(id);
  if (!line) {
    const path = `${LINES_URL}${encodeURIComponent(id)}.json`;
    line = siteJson(path)
      .then((raw) => readLineFile(raw, id))
      .catch((error: unknown) => {
        appLines.delete(id);
        throw error;
      });
    appLines.set(id, line);
  }
  return line;
}
