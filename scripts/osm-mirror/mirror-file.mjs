// Para's copy of the Philippines extract (.scratch/extract-mirror/plan.md): where it is, where it
// comes from, and the small JSON file beside it that says which extract it is. mirror.sh writes
// the JSON with mirrorRecord; the builds that read the copy read it back with readMirrorRecord.
// Nothing here reaches the network.

/** The public address of the copy: the R2 bucket `para-osm`, through its own domain. ODbL data only. */
export const MIRROR_URL = 'https://osm.para-commute.org';
/** The objects in the bucket: Geofabrik's whole file, its own .md5, and the record of both. */
export const MIRROR_KEYS = {
  extract: 'philippines-latest.osm.pbf',
  md5: 'philippines-latest.osm.pbf.md5',
  record: 'philippines-latest.json',
};
/** Where the copy comes from, in order: Geofabrik, then openstreetmap.fr when Geofabrik fails. */
export const MIRROR_SOURCES = [
  {
    name: 'Geofabrik',
    extract: 'https://download.geofabrik.de/asia/philippines/philippines-latest.osm.pbf',
    md5: 'https://download.geofabrik.de/asia/philippines/philippines-latest.osm.pbf.md5',
  },
  {
    name: 'openstreetmap.fr',
    extract: 'https://download.openstreetmap.fr/extracts/asia/philippines.osm.pbf',
    md5: 'https://download.openstreetmap.fr/extracts/asia/philippines.osm.pbf.md5',
  },
];

const MD5 = /^[0-9a-f]{32}$/;
const isTimestamp = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/**
 * The record of one copy, as its JSON text: the source it came from, the source's Last-Modified
 * (the tiles build's extract date), the file's own header timestamp (the landmarks build's), its
 * size and md5, and when it was copied. Throws on anything a build could not trust.
 */
export function mirrorRecord({ source, lastModified, extractAt, bytes, md5, copiedAt }) {
  if (!MIRROR_SOURCES.some(({ extract }) => extract === source))
    throw new Error(`${source} is not one of the mirror's sources.`);
  if (!isTimestamp(lastModified)) throw new Error(`Last-Modified "${lastModified}" is not a date.`);
  if (!isTimestamp(extractAt))
    throw new Error(`The extract's timestamp "${extractAt}" is not a date.`);
  if (!Number.isInteger(bytes) || bytes < 100_000_000)
    throw new Error(`${bytes} bytes is too small for the Philippines extract.`);
  if (!MD5.test(md5)) throw new Error(`"${md5}" is not an md5.`);
  if (!isTimestamp(copiedAt)) throw new Error(`The copy time "${copiedAt}" is not a date.`);
  const record = {
    schema: 1,
    license: 'ODbL-1.0',
    attribution: '© OpenStreetMap contributors',
    source,
    last_modified: new Date(lastModified).toISOString(),
    extract_at: new Date(extractAt).toISOString(),
    bytes,
    md5,
    copied_at: new Date(copiedAt).toISOString(),
  };
  return `${JSON.stringify(record, null, 2)}\n`;
}

/** A record's fields back, checked as mirrorRecord checks them; throws on a record not to trust. */
export function readMirrorRecord(text) {
  const record = JSON.parse(text);
  if (record?.schema !== 1) throw new Error('The mirror record is not schema 1.');
  mirrorRecord({
    source: record.source,
    lastModified: record.last_modified,
    extractAt: record.extract_at,
    bytes: record.bytes,
    md5: record.md5,
    copiedAt: record.copied_at,
  });
  return record;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // node mirror-file.mjs <source url> <last-modified> <extract timestamp> <bytes> <md5>
  const [source, lastModified, extractAt, bytes, md5] = process.argv.slice(2);
  try {
    process.stdout.write(
      mirrorRecord({
        source,
        lastModified,
        extractAt,
        bytes: Number(bytes),
        md5,
        copiedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
