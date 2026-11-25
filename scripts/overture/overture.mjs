// Turns the Overture places pull.py wrote (one JSON object per line) into the Overture place files,
// public/data/overture/v1/ (.scratch/establishments, step E3c): an index and a file per area cell,
// as the OSM establishment files are, but in a folder of their own. Nothing here reaches the
// network: the same pull, roads and OSM files always give the same files.
//
// Three filters on top of pull.py's (the study's findings, README §3 and §4):
// - a name that reads like an address is no place's name;
// - a point on a road's centre line is an address geocode, not where the place is;
// - a place OpenStreetMap already has is drawn from OSM, so Overture's copy is dropped.
//
// Usage: node --experimental-strip-types scripts/overture/overture.mjs <places.ndjson> <roads.geojsonseq> <out dir>
//   it reads the OSM establishment files and the landmark file already built in public/data/
import { createReadStream, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

import {
  establishmentFiles,
  readEstablishmentFiles,
  writeEstablishmentFiles,
} from '../establishments/establishment-file.mjs';
import { readPanningBox } from '../tiles/area.mjs';
import {
  KIND_OF_CATEGORY,
  OVERTURE_FILES,
  OVERTURE_KINDS,
  overtureIdOf,
} from './overture-file.mjs';

/** osmium reads the roads from this filter (build.sh): every road a pin may wrongly sit on. */
export const ROAD_FILTER =
  'w/highway=motorway,motorway_link,trunk,trunk_link,primary,primary_link,secondary,secondary_link,tertiary,tertiary_link,unclassified,residential,living_street,service,pedestrian';
/**
 * How near a road's centre line a point may not be, in metres: wider for the wider roads. A minor
 * road keeps only 1 m, since shops front narrow streets 2 to 5 m from the line.
 */
const ROAD_CLEARANCE_M = { major: 8, minor: 1 };
const MAJOR_ROADS = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);

/** OSM's kinds (and the landmark file's) a place of each Overture kind may already be. */
const SAME_PLACE_KINDS = {
  restaurant: ['restaurant', 'fast_food', 'cafe'],
  fast_food: ['restaurant', 'fast_food', 'cafe'],
  cafe: ['restaurant', 'fast_food', 'cafe'],
  clinic: ['clinic', 'pharmacy', 'hospital'],
  dentist: ['clinic'],
  school: ['school', 'university'],
  college: ['school', 'university'],
  convenience: ['convenience', 'supermarket'],
  supermarket: ['supermarket', 'convenience', 'mall'],
  pharmacy: ['pharmacy'],
  laundry: ['laundry'],
  // OSM's tourism=hotel, guest_house, hostel, motel and apartment: the basemap's 'lodging' labels.
  hotel: ['hotel'],
  lodging: ['hotel'],
};

/** What osmium takes from the extract for the dedupe: the places the basemap labels as lodging. */
export const LODGING_FILTER = 'nwr/tourism=hotel,guest_house,hostel,motel,apartment';
/**
 * A name of a subdivision or village, which Overture files under lodging too: never a place to
 * stay. Serviced and staycation condos (Residences, Condo, Tower) are, so they stay.
 */
const RESIDENTIAL_NAME = /\bsubd\b\.?|subdivision|heights|village|\bhomes\b|\bphase\b|association/i;
/** A name that says hotel; the small words below win over it. */
const HOTEL_NAME = /hotel|resort|suites|\binn\b|hostel|motel|lodge/i;
/** A name of the many small places to stay: drawn a zoom later than the hotels. */
const SMALL_LODGING_NAME =
  /transient|staycation|apartelle|airbnb|condo|\broom|bed ?space|dorm|pension|home ?stay|cottage|cabin|villa|\bhouse\b|\bunit\b|studio/i;

/**
 * A place to stay's kind: a hotel (drawn with the other places) when it has a brand or its name
 * says hotel, resort, suites, inn, hostel, motel or lodge and none of the small words; otherwise
 * lodging, the many small inns, apartelles and transient houses, drawn a zoom later. Overture's own
 * category cannot tell them apart: plenty of its "hotel" rows are staycation condos.
 */
export function lodgingKindOf(name, brand) {
  if (brand) return 'hotel';
  return HOTEL_NAME.test(name) && !SMALL_LODGING_NAME.test(name) ? 'hotel' : 'lodging';
}
/** The same name within this many metres is the same place; the same brand, within more. */
const SAME_NAME_M = 50;
const SAME_BRAND_M = 150;

const RECORD_SEPARATOR = '\u001e';
const M_PER_DEG = 111_320;

/** A name that is an address: a house number first, or a street, avenue, barangay or lot in it. */
export function isAddressLike(name) {
  return /^\d|\b(st|street|ave|avenue|road|rd|blvd|brgy|barangay|blk|block|lot|purok)\b\.?/i.test(
    name,
  );
}

/** A name or a brand, folded: lower case, no accents, no punctuation, single spaces. */
export function folded(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Two folded names that name the same place: equal, or one inside the other when both say enough. */
export function isSameName(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return short.length >= 5 && ` ${long} `.includes(` ${short} `);
}

/** Metres between two points this close, flat-earth: good to well under a metre at a city's scale. */
export function metresBetween([lng1, lat1], [lng2, lat2]) {
  const x = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.hypot(x, lat2 - lat1) * M_PER_DEG;
}

/** Metres from a point to a segment, flat-earth around the point. */
export function metresToSegment(point, a, b) {
  const k = Math.cos(point[1] * (Math.PI / 180));
  const [px, py] = [point[0] * k, point[1]];
  const [ax, ay, bx, by] = [a[0] * k, a[1], b[0] * k, b[1]];
  const [dx, dy] = [bx - ax, by - ay];
  const length2 = dx * dx + dy * dy;
  const t =
    length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) * M_PER_DEG;
}

/** A grid of things by ~110 m square, so a point looks only at what is near it. */
class Grid {
  static STEP = 0.001;
  #cells = new Map();
  static keyOf(lng, lat) {
    return `${Math.floor(lng / Grid.STEP)}:${Math.floor(lat / Grid.STEP)}`;
  }
  add(lng, lat, item) {
    const key = Grid.keyOf(lng, lat);
    this.#cells.set(key, [...(this.#cells.get(key) ?? []), item]);
  }
  /** Everything within `reach` cells of the point, each cell once. */
  near([lng, lat], reach) {
    const [x, y] = [Math.floor(lng / Grid.STEP), Math.floor(lat / Grid.STEP)];
    const found = [];
    for (let i = x - reach; i <= x + reach; i++)
      for (let j = y - reach; j <= y + reach; j++)
        found.push(...(this.#cells.get(`${i}:${j}`) ?? []));
    return found;
  }
}

/** The roads' segments in a grid, each with its clearance: a segment sits in every cell its ends do. */
export function roadGrid(roads) {
  const grid = new Grid();
  for (const { geometry, properties } of roads) {
    if (geometry?.type !== 'LineString') continue;
    const clearance = MAJOR_ROADS.has(properties.highway?.replace(/_link$/, ''))
      ? ROAD_CLEARANCE_M.major
      : ROAD_CLEARANCE_M.minor;
    const line = geometry.coordinates;
    for (let i = 1; i < line.length; i++) {
      const segment = { a: line[i - 1], b: line[i], clearance };
      const keys = new Set([Grid.keyOf(...segment.a), Grid.keyOf(...segment.b)]);
      for (const key of keys) {
        const [x, y] = key.split(':').map(Number);
        grid.add((x + 0.5) * Grid.STEP, (y + 0.5) * Grid.STEP, segment);
      }
    }
  }
  return grid;
}

/** Whether a point sits on a road's centre line, within that road's clearance. */
export function isOnRoad(grid, point) {
  return grid
    .near(point, 1)
    .some(({ a, b, clearance }) => metresToSegment(point, a, b) <= clearance);
}

/** OSM's places (the establishment cells and the landmark file) in a grid, folded for matching. */
export function osmPlaceGrid({ establishmentCells, landmarks, lodgings = [] }) {
  const grid = new Grid();
  const add = (kind, [lng, lat], name, brand) =>
    grid.add(lng, lat, {
      kind,
      point: [lng, lat],
      name: name ? folded(name) : '',
      brand: brand ? folded(brand) : '',
    });
  for (const text of establishmentCells) {
    for (const [, kind, lng, lat, name, extras] of JSON.parse(text).establishments)
      add(kind, [lng, lat], name, extras?.brand);
  }
  for (const { kind, point, name } of landmarks) add(kind, point, name);
  for (const { point, name } of lodgings) add('hotel', point, name);
  return grid;
}

/** Whether OSM already has this place: a like name near it, or its brand a little further. */
export function isInOsm(grid, { kind, point, name, brand }) {
  const kinds = SAME_PLACE_KINDS[kind];
  const [ownName, ownBrand] = [folded(name), brand ? folded(brand) : ''];
  return grid.near(point, 2).some((osm) => {
    if (!kinds.includes(osm.kind)) return false;
    const metres = metresBetween(point, osm.point);
    if (metres <= SAME_NAME_M && (isSameName(ownName, osm.name) || isSameName(ownName, osm.brand)))
      return true;
    return metres <= SAME_BRAND_M && ownBrand !== '' && isSameName(ownBrand, osm.brand || osm.name);
  });
}

const round = (value) => Math.round(value * 1e5) / 1e5;

/** OSM's named places to stay (LODGING_FILTER's export), each at its outline's mean point. */
export function lodgingsFrom(features) {
  const lodgings = [];
  for (const { geometry, properties } of features) {
    const name = properties?.name?.trim();
    if (!name || !geometry) continue;
    const ring =
      geometry.type === 'Point'
        ? [geometry.coordinates]
        : geometry.type === 'Polygon'
          ? geometry.coordinates[0]
          : geometry.type === 'MultiPolygon'
            ? geometry.coordinates[0][0]
            : geometry.type === 'LineString'
              ? geometry.coordinates
              : [];
    if (ring.length === 0) continue;
    const [lng, lat] = ring.reduce(([x, y], [a, b]) => [x + a, y + b], [0, 0]);
    lodgings.push({ name, point: [lng / ring.length, lat / ring.length] });
  }
  return lodgings;
}
const isInside = (box, [lng, lat]) =>
  lng >= box.west && lng <= box.east && lat >= box.south && lat <= box.north;

/**
 * The places to write, in the file's order (kind, then id), and how many each filter dropped.
 * `places` are pull.py's rows; `roads` a road grid; `osm` an OSM place grid.
 */
export function overturePlacesFrom(places, { roads, osm, box }) {
  const dropped = { name: 0, residential: 0, road: 0, osm: 0, closed: 0 };
  const byId = new Map();
  for (const place of places) {
    const kind = KIND_OF_CATEGORY[place.category];
    const point = [round(place.lng), round(place.lat)];
    if (!kind || !isInside(box, point)) continue;
    if (place.status && place.status !== 'open') {
      dropped.closed++;
      continue;
    }
    const name = place.name?.trim();
    if (!name || isAddressLike(name)) {
      dropped.name++;
      continue;
    }
    if (kind === 'hotel' && RESIDENTIAL_NAME.test(name)) {
      dropped.residential++;
      continue;
    }
    const brand = place.brand?.trim();
    const candidate = {
      id: overtureIdOf(place.id),
      kind: kind === 'hotel' ? lodgingKindOf(name, brand) : kind,
      point,
      name,
      brand,
    };
    if (isOnRoad(roads, point)) {
      dropped.road++;
      continue;
    }
    if (isInOsm(osm, candidate)) {
      dropped.osm++;
      continue;
    }
    if (byId.has(candidate.id)) continue;
    byId.set(candidate.id, {
      id: candidate.id,
      kind: candidate.kind,
      name,
      point,
      extras: brand && folded(brand) !== folded(name) ? { brand } : {},
    });
  }
  const order = (kind) => OVERTURE_KINDS.indexOf(kind);
  const establishments = [...byId.values()].sort(
    (a, b) => order(a.kind) - order(b.kind) || a.id.localeCompare(b.id),
  );
  return { establishments, dropped };
}

async function readLines(path) {
  const rows = [];
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of lines) {
    const text = (line.startsWith(RECORD_SEPARATOR) ? line.slice(1) : line).trim();
    if (text !== '') rows.push(JSON.parse(text));
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [placesPath, roadsPath, outDir, lodgingPath] = process.argv.slice(2);
  if (placesPath === '--roads') {
    console.log(ROAD_FILTER);
    process.exit(0);
  }
  if (placesPath === '--lodging') {
    console.log(LODGING_FILTER);
    process.exit(0);
  }
  if (!placesPath || !roadsPath || !outDir) {
    console.error(
      'Usage: node --experimental-strip-types scripts/overture/overture.mjs <places.ndjson> <roads.geojsonseq> <out dir> [lodging.geojsonseq]',
    );
    process.exit(2);
  }
  const places = await readLines(placesPath);
  const release = places[0]?.release;
  if (!release) {
    console.error(`${placesPath} holds no places.`);
    process.exit(1);
  }
  const osm = osmPlaceGrid({
    establishmentCells: [...readEstablishmentFiles('public/data/establishments/v1').cells.values()],
    landmarks: JSON.parse(readFileSync('public/data/landmarks.v1.json', 'utf8')).landmarks,
    lodgings: lodgingPath ? lodgingsFrom(await readLines(lodgingPath)) : [],
  });
  const { establishments, dropped } = overturePlacesFrom(places, {
    roads: roadGrid(await readLines(roadsPath)),
    osm,
    box: readPanningBox(),
  });
  const files = establishmentFiles({ extractAt: release, establishments }, OVERTURE_FILES);
  writeEstablishmentFiles(outDir, files);
  console.error(
    `Overture ${release}: wrote ${establishments.length} places in ${files.cells.size} cells to ${outDir}; ` +
      `dropped ${dropped.name} for their names, ${dropped.residential} places to stay named as homes, ${dropped.road} on a road, ${dropped.osm} OSM has, ${dropped.closed} closed.`,
  );
}
