"""The spot check: for each sampled place (count-places.py's <source>-cubao.json), how far it lies
from the nearest OpenStreetMap road, whether it falls inside a mapped building, and whether the
other source has a place of a similar name within 100 m. Also the overlap of the two sources over
the whole test box, the number deduplication would have to merge. A study script, not app code.

Usage: python3 -I spot-check.py <cubao-ctx.geojsonseq> <out dir of count-places.py> [--stats]
cubao-ctx.geojsonseq: `osmium extract -b 121.040,14.607,121.066,14.632`, then
`osmium tags-filter w/building r/building w/highway`, then `osmium export -f geojsonseq`.
"""
import json, math, random, re, sys
from difflib import SequenceMatcher
from pathlib import Path

LAT0 = 14.62
M_PER_DEG_LAT = 110_574
M_PER_DEG_LNG = 111_320 * math.cos(math.radians(LAT0))
ROAD_KINDS = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
              'service', 'living_street', 'motorway_link', 'trunk_link', 'primary_link',
              'secondary_link', 'tertiary_link'}


def xy(p): return (p[0] * M_PER_DEG_LNG, p[1] * M_PER_DEG_LAT)


def seg_dist(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def in_ring(p, ring):
    x, y, inside = p[0], p[1], False
    for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0): inside = not inside
    return inside


def fold(name):
    name = (name or '').lower()
    name = re.sub(r"[’'`.,&()\-]", ' ', name)
    return ' '.join(w for w in name.split() if w not in {'the', 'philippines', 'ph', 'inc', 'cubao', 'qc'})


def similar(a, b):
    a, b = fold(a), fold(b)
    return bool(a and b) and (a in b or b in a or SequenceMatcher(None, a, b).ratio() >= 0.8)


def main():
    ctx_path, out = sys.argv[1], Path(sys.argv[2])
    roads, buildings = [], []
    for line in open(ctx_path, encoding='utf8'):
        f = json.loads(line.lstrip('\x1e'))
        g, t = f['geometry'], f['properties']
        if t.get('highway') in ROAD_KINDS and g['type'] == 'LineString':
            roads.append([xy(p) for p in g['coordinates']])
        elif t.get('building'):
            polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates'] if g['type'] == 'MultiPolygon' else []
            for poly in polys: buildings.append([xy(p) for p in poly[0]])
    sources = {s: json.loads((out / f'{s}-cubao.json').read_text()) for s in ('osm', 'overture')}

    def describe(place, other):
        p = xy((place['lng'], place['lat']))
        road = min(seg_dist(p, a, b) for line in roads for a, b in zip(line, line[1:]))
        building = any(in_ring(p, ring) for ring in buildings)
        twin = next((o for o in other if similar(place['name'], o['name'])
                     and math.dist(p, xy((o['lng'], o['lat']))) <= 100), None)
        return road, building, twin

    for name, other_name in (('osm', 'overture'), ('overture', 'osm')):
        print(f'\n## {name}: 20 random places in the box (seed 20261122)\n')
        print('| Name | Category (source tag) | Confidence | m to road | In a building | Twin in the other source within 100 m |')
        print('| --- | --- | --- | --- | --- | --- |')
        for place in sources[name][:20]:
            road, building, twin = describe(place, sources[other_name])
            conf = '' if place.get('confidence') is None else f"{place['confidence']:.2f}"
            print(f"| {place['name']} | {place['cat']} ({place['raw']}) | {conf} | {road:.0f} | "
                  f"{'yes' if building else 'no'} | {twin['name'] if twin else '–'} |")

    named_osm = [p for p in sources['osm'] if p['name']]
    matched = sum(1 for p in named_osm if describe(p, sources['overture'])[2])
    print(f'\nNamed OSM places in the box with an Overture twin: {matched} of {len(named_osm)}')
    overture = sources['overture']
    matched = sum(1 for p in overture if any(similar(p['name'], o['name']) and math.dist(xy((p['lng'], p['lat'])), xy((o['lng'], o['lat']))) <= 100 for o in named_osm))
    print(f'Overture places in the box with an OSM twin: {matched} of {len(overture)}')
    unnamed = sum(1 for p in sources['osm'] if not p['name'])
    print(f'OSM places in the box with no name: {unnamed} of {len(sources["osm"])}')


if __name__ == '__main__' and len(sys.argv) == 3:
    main()


def stats():
    """Where each source puts its places in the box, and how often it lists one place twice."""
    ctx_path, out = sys.argv[1], Path(sys.argv[2])
    roads, buildings = [], []
    for line in open(ctx_path, encoding='utf8'):
        f = json.loads(line.lstrip('\x1e'))
        g, t = f['geometry'], f['properties']
        if t.get('highway') in ROAD_KINDS and g['type'] == 'LineString':
            roads.append([xy(p) for p in g['coordinates']])
        elif t.get('building'):
            polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates'] if g['type'] == 'MultiPolygon' else []
            for poly in polys: buildings.append([xy(p) for p in poly[0]])
    for name in ('osm', 'overture'):
        places = json.loads((out / f'{name}-cubao.json').read_text())
        dists, inside = [], 0
        for place in places:
            p = xy((place['lng'], place['lat']))
            dists.append(min(seg_dist(p, a, b) for line in roads for a, b in zip(line, line[1:])))
            inside += any(in_ring(p, ring) for ring in buildings)
        dists.sort()
        twins = sum(1 for i, a in enumerate(places) for b in places[i + 1:]
                    if a['name'] and fold(a['name']) == fold(b['name'])
                    and math.dist(xy((a['lng'], a['lat'])), xy((b['lng'], b['lat']))) <= 50)
        print(f"{name}: {len(places)} places, median {dists[len(dists) // 2]:.0f} m from a road, "
              f"{sum(d < 3 for d in dists)} within 3 m of a road's centre line, "
              f"{inside} inside a mapped building, {twins} pairs of one name within 50 m")


if __name__ == '__main__' and len(sys.argv) > 3 and sys.argv[3] == '--stats':
    stats()
