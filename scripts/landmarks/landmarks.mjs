// Turns the OpenStreetMap features build.sh filtered out of the Metro Manila extract (one GeoJSON
// feature per line, from `osmium export`) into the landmark file place search reads:
// public/data/landmarks.v1.json (.scratch/place-search/README.md, step 2).
//
// A landmark is one named point: a mall, school, university, hospital, church, market, transport
// station, barangay or major street. Areas become their centroid; a street becomes one point per
// stretch of road that carries its name, at the vertex nearest that stretch's middle. Nothing
// here reaches the network: the same features always give the same file, byte for byte.
//
// Usage: node --experimental-strip-types scripts/landmarks/landmarks.mjs <features.geojsonseq> <extract timestamp> <out.json>
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { haversine } from '../../src/shared/utils/geo.ts';
import { readPanningBox } from '../tiles/area.mjs';
import { LANDMARK_KINDS, landmarkFileText } from './landmark-file.mjs';

const RAIL_OR_STATION = new Set(['station', 'halt']);
const STREET_HIGHWAYS = new Set(['trunk', 'primary', 'secondary']);
const ALIAS_TAGS = [
  'alt_name',
  'old_name',
  'short_name',
  'official_name',
  'loc_name',
  'name:en',
  'name:fil',
  'name:tl',
];
/** osmium may start each record with RS (RFC 8142). */
const RECORD_SEPARATOR = '\u001e';
/** Two features of one kind and name this close are the same landmark drawn twice (a node in its own outline). */
const SAME_LANDMARK_M = 250;
/** Two ways of one street name whose ends are this close are one stretch of road. */
const SAME_STREET_M = 300;

/**
 * The OSM id of an exported feature: osmium names an area `a` + twice its way's id, or twice its
 * relation's id plus one (osmium's area ids); nodes and ways keep `n` and `w`.
 */
export function osmIdOf(featureId) {
  if (featureId[0] !== 'a') return featureId;
  const areaId = Number(featureId.slice(1));
  return areaId % 2 === 0 ? `w${areaId / 2}` : `r${(areaId - 1) / 2}`;
}

/** The landmark kind of a feature's tags, or null when it is not one Para lists. */
export function landmarkKind(tags) {
  if (!tags.name) return null;
  if (tags.disused || tags.abandoned || tags.construction) return null;
  if (tags.boundary === 'administrative' && tags.admin_level === '10') return 'barangay';
  if (tags.shop === 'mall') return 'mall';
  if (tags.amenity === 'university' || tags.amenity === 'college') return 'university';
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.amenity === 'place_of_worship' && tags.religion === 'christian') return 'church';
  if (tags.amenity === 'marketplace') return 'market';
  if (RAIL_OR_STATION.has(tags.railway)) return 'station';
  if (tags.amenity === 'bus_station' || tags.amenity === 'ferry_terminal') return 'station';
  if (tags.public_transport === 'station') return 'station';
  if (STREET_HIGHWAYS.has(tags.highway)) return 'street';
  return null;
}

/** The other names a feature carries, without its name and without repeats, in tag order. */
export function aliasesOf(tags) {
  const seen = new Set([foldName(tags.name)]);
  const aliases = [];
  for (const key of ALIAS_TAGS) {
    for (const value of (tags[key] ?? '').split(';')) {
      const alias = value.trim();
      if (alias === '' || seen.has(foldName(alias))) continue;
      seen.add(foldName(alias));
      aliases.push(alias);
    }
  }
  return aliases;
}

/** A name as it is compared here: lower case, without accents, spaces collapsed. */
export function foldName(name) {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** The area-weighted centroid of a ring of [lng, lat], or its first vertex when it has no area. */
export function ringCentroid(ring) {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }
  if (twiceArea === 0) return ring[0];
  return [x / (3 * twiceArea), y / (3 * twiceArea)];
}

const ringArea = (ring) => {
  let twice = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    twice += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(twice / 2);
};

/** One point for a geometry: a point itself, an area's centroid (its largest part), a line's middle vertex. */
export function pointOf(geometry) {
  if (geometry.type === 'Point') return geometry.coordinates;
  if (geometry.type === 'LineString') {
    return geometry.coordinates[Math.floor(geometry.coordinates.length / 2)];
  }
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const outer = polygons
    .map((polygon) => polygon[0])
    .reduce((largest, ring) => (ringArea(ring) > ringArea(largest) ? ring : largest));
  return ringCentroid(outer);
}

const roundPoint = ([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5];
const isInside = (box, [lng, lat]) =>
  lng >= box.west && lng <= box.east && lat >= box.south && lat <= box.north;
const osmNumber = (id) => Number(id.slice(1));
const byOsmId = (a, b) => a.id[0].localeCompare(b.id[0]) || osmNumber(a.id) - osmNumber(b.id);

/**
 * The streets' ways joined into stretches: ways of one name whose ends lie within SAME_STREET_M
 * of each other's are one stretch, and each stretch is one landmark at the vertex nearest its middle.
 */
export function streetLandmarks(ways) {
  const byName = new Map();
  for (const way of ways) {
    const key = foldName(way.name);
    byName.set(key, [...(byName.get(key) ?? []), way]);
  }
  const landmarks = [];
  for (const group of byName.values()) {
    group.sort(byOsmId);
    const parent = group.map((_, i) => i);
    const root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i])));
    const ends = group.map(({ line }) => [line[0], line[line.length - 1]]);
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const touches = ends[i].some((a) => ends[j].some((b) => haversine(a, b) <= SAME_STREET_M));
        if (touches) parent[root(j)] = root(i);
      }
    }
    const stretches = new Map();
    group.forEach((way, i) => stretches.set(root(i), [...(stretches.get(root(i)) ?? []), way]));
    for (const stretch of stretches.values()) {
      const vertices = stretch.flatMap(({ line }) => line);
      const middle = [
        vertices.reduce((sum, [lng]) => sum + lng, 0) / vertices.length,
        vertices.reduce((sum, [, lat]) => sum + lat, 0) / vertices.length,
      ];
      const point = vertices.reduce((best, vertex) =>
        haversine(vertex, middle) < haversine(best, middle) ? vertex : best,
      );
      landmarks.push({
        id: stretch[0].id,
        name: stretch[0].name,
        kind: 'street',
        point,
        aliases: [...new Set(stretch.flatMap(({ aliases }) => aliases))],
      });
    }
  }
  return landmarks;
}

/** Landmarks of one kind and name within SAME_LANDMARK_M of each other kept once, the outline over the point. */
export function withoutRepeats(landmarks) {
  const kept = [];
  const ranked = [...landmarks].sort((a, b) => {
    const outline = (id) => (id[0] === 'n' ? 1 : 0);
    return outline(a.id) - outline(b.id) || byOsmId(a, b);
  });
  for (const landmark of ranked) {
    const twin = kept.find(
      (other) =>
        other.kind === landmark.kind &&
        foldName(other.name) === foldName(landmark.name) &&
        haversine(other.point, landmark.point) <= SAME_LANDMARK_M,
    );
    if (!twin) kept.push({ ...landmark, aliases: [...landmark.aliases] });
    else {
      for (const alias of landmark.aliases)
        if (!twin.aliases.includes(alias)) twin.aliases.push(alias);
    }
  }
  return kept;
}

/** Every landmark in the features, inside the box, once each, in the file's order. */
export function landmarksFrom(features, box) {
  const placesById = new Map();
  const streets = [];
  for (const { id: featureId, geometry, properties } of features) {
    const id = osmIdOf(featureId);
    const kind = landmarkKind(properties);
    if (!kind || !geometry) continue;
    const name = properties.name.trim();
    const aliases = aliasesOf(properties);
    if (kind === 'street') {
      if (geometry.type === 'LineString')
        streets.push({ id, name, aliases, line: geometry.coordinates });
      continue;
    }
    // osmium can export one closed way twice, as its area and as its line: the area wins.
    const isArea = geometry.type !== 'Point' && geometry.type !== 'LineString';
    if (!placesById.has(id) || isArea) {
      placesById.set(id, { id, name, kind, point: pointOf(geometry), aliases });
    }
  }
  const places = [...placesById.values()];
  const order = (kind) => LANDMARK_KINDS.indexOf(kind);
  return withoutRepeats([...places, ...streetLandmarks(streets)])
    .map((landmark) => ({ ...landmark, point: roundPoint(landmark.point) }))
    .filter((landmark) => isInside(box, landmark.point))
    .sort(
      (a, b) =>
        order(a.kind) - order(b.kind) ||
        foldName(a.name).localeCompare(foldName(b.name)) ||
        byOsmId(a, b),
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
  if (!featuresPath || !extractAt || !outPath) {
    console.error(
      'Usage: node --experimental-strip-types scripts/landmarks/landmarks.mjs <features.geojsonseq> <extract timestamp> <out.json>',
    );
    process.exit(2);
  }
  const landmarks = landmarksFrom(await readFeatures(featuresPath), readPanningBox());
  writeFileSync(outPath, landmarkFileText({ extractAt, landmarks }));
  console.error(`Wrote ${landmarks.length} landmarks to ${outPath}.`);
}
