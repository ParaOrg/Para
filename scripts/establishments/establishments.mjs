// Turns the OpenStreetMap features build.sh filtered out of the extract (one GeoJSON feature per
// line, from `osmium export`) into the establishment file: public/data/establishments.v1.json
// (.scratch/establishments, step E3a). One point per place, an area's centroid, inside the map's
// panning box. Nothing here reaches the network: the same features always give the same file.
//
// Usage: node --experimental-strip-types scripts/establishments/establishments.mjs <features.geojsonseq> <extract timestamp> <out.json>
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

import { osmIdOf, pointOf } from '../landmarks/landmarks.mjs';
import { readPanningBox } from '../tiles/area.mjs';
import { ESTABLISHMENT_KINDS, establishmentFileText } from './establishment-file.mjs';

/** osmium may start each record with RS (RFC 8142). */
const RECORD_SEPARATOR = '\u001e';

/** Each kind and the OSM tag values that are it, by key. */
const KIND_TAGS = {
  atm: { amenity: ['atm'] },
  bank: { amenity: ['bank'] },
  pawnshop: { shop: ['pawnbroker'] },
  remittance: { amenity: ['money_transfer', 'payment_centre'] },
  pharmacy: { amenity: ['pharmacy'], shop: ['chemist'], healthcare: ['pharmacy'] },
  convenience: { shop: ['convenience', 'general', 'variety_store'] },
  supermarket: { shop: ['supermarket'] },
  restaurant: { amenity: ['restaurant'] },
  fast_food: { amenity: ['fast_food', 'food_court'] },
  cafe: { amenity: ['cafe'] },
  fuel: { amenity: ['fuel'] },
  clinic: {
    amenity: ['clinic', 'doctors', 'dentist'],
    healthcare: ['clinic', 'doctor', 'dentist'],
  },
  laundry: { shop: ['laundry', 'dry_cleaning'] },
  toilets: { amenity: ['toilets'] },
  police: { amenity: ['police'] },
};

/** The kinds a place is worth listing without a name: the kind alone says what a commuter needs. */
const NAMELESS_KINDS = new Set(['atm', 'toilets', 'police', 'fuel', 'pharmacy']);

/** The osmium filter build.sh runs, from KIND_TAGS: `nwr/amenity=atm,bank,…` and the rest. */
export function osmiumFilters() {
  const byKey = new Map();
  for (const tags of Object.values(KIND_TAGS))
    for (const [key, values] of Object.entries(tags))
      byKey.set(key, [...new Set([...(byKey.get(key) ?? []), ...values])]);
  return [...byKey].map(([key, values]) => `nwr/${key}=${values.join(',')}`);
}

/** The establishment kind of a feature's tags, or null when it is not one Para lists. */
export function establishmentKind(tags) {
  if (tags.disused || tags.abandoned || tags.construction) return null;
  for (const kind of ESTABLISHMENT_KINDS) {
    for (const [key, values] of Object.entries(KIND_TAGS[kind])) {
      if (values.includes(tags[key])) return kind;
    }
  }
  return null;
}

/** What a place carries beyond its name: its brand when it says more than the name, a bank's ATM. */
export function extrasOf(tags, kind) {
  const extras = {};
  const name = tags.name?.trim();
  const brand = tags.brand?.trim();
  if (brand && brand.toLowerCase() !== name?.toLowerCase()) extras.brand = brand;
  if (kind === 'bank' && tags.atm === 'yes') extras.atm = true;
  return extras;
}

const round = (value) => Math.round(value * 1e5) / 1e5;
const isInside = (box, [lng, lat]) =>
  lng >= box.west && lng <= box.east && lat >= box.south && lat <= box.north;
const osmNumber = (id) => Number(id.slice(1));

/** Every establishment in the features, inside the box, once each, in the file's order. */
export function establishmentsFrom(features, box) {
  const byId = new Map();
  for (const { id: featureId, geometry, properties } of features) {
    const kind = establishmentKind(properties);
    if (!kind || !geometry) continue;
    const name = properties.name?.trim() || null;
    if (!name && !NAMELESS_KINDS.has(kind)) continue;
    const id = osmIdOf(featureId);
    // osmium can export one closed way twice, as its area and as its line: the area wins.
    const isArea = geometry.type !== 'Point' && geometry.type !== 'LineString';
    if (byId.has(id) && !isArea) continue;
    const [lng, lat] = pointOf(geometry);
    byId.set(id, {
      id,
      kind,
      name,
      point: [round(lng), round(lat)],
      extras: extrasOf(properties, kind),
    });
  }
  const order = (kind) => ESTABLISHMENT_KINDS.indexOf(kind);
  return [...byId.values()]
    .filter(({ point }) => isInside(box, point))
    .sort(
      (a, b) =>
        order(a.kind) - order(b.kind) ||
        a.id[0].localeCompare(b.id[0]) ||
        osmNumber(a.id) - osmNumber(b.id),
    );
}

async function readFeatures(path) {
  const features = [];
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of lines) {
    const text = (line.startsWith(RECORD_SEPARATOR) ? line.slice(1) : line).trim();
    if (text !== '') features.push(JSON.parse(text));
  }
  return features;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [featuresPath, extractAt, outPath] = process.argv.slice(2);
  if (featuresPath === '--filters') {
    console.log(osmiumFilters().join(' '));
    process.exit(0);
  }
  if (!featuresPath || !extractAt || !outPath) {
    console.error(
      'Usage: node --experimental-strip-types scripts/establishments/establishments.mjs <features.geojsonseq> <extract timestamp> <out.json>',
    );
    process.exit(2);
  }
  const establishments = establishmentsFrom(await readFeatures(featuresPath), readPanningBox());
  writeFileSync(outPath, establishmentFileText({ extractAt, establishments }));
  console.error(`Wrote ${establishments.length} establishments to ${outPath}.`);
}
