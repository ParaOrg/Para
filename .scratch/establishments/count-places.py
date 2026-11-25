"""Counts establishments per category per source in a test box, samples some for a spot check,
and weighs a Metro Manila file of them. A study script (.scratch/establishments/README.md), not
part of the app or any build.

Inputs, downloaded by hand into a scratch folder, never into the repo:
  osm.geojsonseq    `osmium tags-filter` + `osmium export -f geojsonseq` of openstreetmap.fr's
                    Metro Manila extract (the filter is in README.md)
  overture.parquet  Overture Maps places in the map's panning box (overture-pull.py)

Usage: python3 -I count-places.py <osm.geojsonseq> <overture.parquet> <out dir> <metro_manila.poly>
  metro_manila.poly: the extract's own outline, from download.openstreetmap.fr/polygons/, so
  both sources are counted over the same area.
Needs: Python 3 and duckdb (pip, outside the repo).
"""
import gzip, json, random, sys
from collections import Counter
from pathlib import Path

import duckdb

# Cubao: Araneta City and around, about 2 x 2 km centred on the Coliseum (14.6196, 121.0530).
CUBAO = (121.0437, 14.6106, 121.0623, 14.6286)  # west, south, east, north
# The public map's panning box, METRO_MANILA in src/features/routes/map/map-view.tsx.
PANNING = (120.6, 13.6, 121.5, 15.05)
CATEGORIES = ['atm', 'bank', 'pharmacy', 'convenience', 'supermarket', 'food', 'cafe', 'fuel',
              'school', 'health']


def osm_category(t):
    a, s, h = t.get('amenity'), t.get('shop'), t.get('healthcare')
    if a == 'atm': return 'atm'
    if a in ('bank', 'bureau_de_change'): return 'bank'
    if a == 'pharmacy' or s == 'chemist' or h == 'pharmacy': return 'pharmacy'
    if s == 'convenience': return 'convenience'
    if s == 'supermarket': return 'supermarket'
    if a in ('restaurant', 'fast_food', 'food_court'): return 'food'
    if a == 'cafe': return 'cafe'
    if a == 'fuel': return 'fuel'
    if a in ('school', 'college', 'university', 'kindergarten'): return 'school'
    if a in ('hospital', 'clinic', 'doctors', 'dentist') or h: return 'health'
    return None


def overture_category(hierarchy, category):
    h = set(hierarchy or [])
    if 'atm' in h: return 'atm'
    if 'bank_or_credit_union' in h: return 'bank'
    if 'pharmacy_and_drug_store' in h: return 'pharmacy'
    if 'convenience_store' in h: return 'convenience'
    if 'supermarket' in h or 'hypermarket' in h or category == 'grocery_store': return 'supermarket'
    if 'coffee_shop' in h or category == 'cafe': return 'cafe'
    if 'restaurant' in h or 'fast_food_restaurant' in h: return 'food'
    if 'fueling_station' in h: return 'fuel'
    if h & {'school', 'college_university', 'preschool'}: return 'school'
    if h & {'hospital', 'dental_clinic', 'primary_care_or_general_clinic', 'pediatric_clinic',
            'specialized_medical_facility', 'medical_center', 'doctor'} or category in (
            'health_care', 'clinic', 'medical_clinic'): return 'health'
    return None


def point_of(geometry):
    """A point for any geometry: the point itself, else the mean of its first ring's vertices."""
    c = geometry['coordinates']
    while isinstance(c[0], list) and isinstance(c[0][0], list): c = c[0]
    if not isinstance(c[0], list): return c
    return [sum(p[0] for p in c) / len(c), sum(p[1] for p in c) / len(c)]


def inside(box, lng, lat):
    return box[0] <= lng <= box[2] and box[1] <= lat <= box[3]


def read_osm(path):
    rows = []
    for line in open(path, encoding='utf8'):
        line = line.lstrip('\x1e').strip()
        if not line: continue
        f = json.loads(line)
        t = f['properties']
        cat = osm_category(t)
        if not cat or not f.get('geometry'): continue
        if f['geometry']['type'] == 'LineString' and f['id'][0] == 'w': continue  # the area twin wins
        lng, lat = point_of(f['geometry'])
        rows.append({'id': f['id'], 'name': t.get('name'), 'cat': cat, 'lng': lng, 'lat': lat,
                     'raw': t.get('amenity') or t.get('shop') or t.get('healthcare'),
                     'brand': t.get('brand')})
    return rows


def read_overture(path):
    con = duckdb.connect()
    q = f"select id, name, category, hierarchy, confidence, lng, lat from read_parquet('{path}')"
    rows = []
    for id_, name, category, hierarchy, confidence, lng, lat in con.sql(q).fetchall():
        cat = overture_category(hierarchy, category)
        if cat: rows.append({'id': id_, 'name': name, 'cat': cat, 'lng': lng, 'lat': lat,
                             'raw': category, 'confidence': confidence})
    return rows


def read_poly(path):
    rings, ring = [], None
    for line in open(path):
        parts = line.split()
        if len(parts) == 2 and ring is not None:
            ring.append((float(parts[0]), float(parts[1])))
        elif parts == ['END'] and ring is not None:
            rings.append(ring); ring = None
        elif len(parts) == 1 and parts[0] != 'END':
            ring = []
    return rings


def in_poly(rings, lng, lat):
    inside = False
    for ring in rings:
        for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]):
            if (y0 > lat) != (y1 > lat) and lng < x0 + (lat - y0) * (x1 - x0) / (y1 - y0):
                inside = not inside
    return inside


def counts(rows, box, min_confidence=None):
    return Counter(r['cat'] for r in rows if inside(box, r['lng'], r['lat'])
                   and (min_confidence is None or r.get('confidence', 1) >= min_confidence))


def weigh(rows, box):
    """Bytes of a compact GeoJSON-ish file (one array per place) and of real GeoJSON, raw and gzipped."""
    inbox = [r for r in rows if inside(box, r['lng'], r['lat']) and r['name']]
    compact = json.dumps([[r['name'], CATEGORIES.index(r['cat']), round(r['lng'], 5), round(r['lat'], 5)]
                          for r in inbox], ensure_ascii=False, separators=(',', ':')).encode()
    geo = json.dumps({'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'id': i, 'properties': {'name': r['name'], 'kind': r['cat']},
         'geometry': {'type': 'Point', 'coordinates': [round(r['lng'], 5), round(r['lat'], 5)]}}
        for i, r in enumerate(inbox)]}, ensure_ascii=False, separators=(',', ':')).encode()
    return {'places': len(inbox), 'compact': len(compact), 'compact_gz': len(gzip.compress(compact, 9)),
            'geojson': len(geo), 'geojson_gz': len(gzip.compress(geo, 9))}, geo


def main():
    osm_path, overture_path, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    sources = {'osm': read_osm(osm_path), 'overture': read_overture(overture_path)}
    ncr = read_poly(sys.argv[4])
    sources['overture'] = [dict(r, ncr=in_poly(ncr, r['lng'], r['lat'])) for r in sources['overture']]
    report = {}
    for name, rows in sources.items():
        report[name] = {'cubao': counts(rows, CUBAO), 'panning': counts(rows, PANNING)}
        if name == 'overture':
            report[name]['ncr'] = Counter(r['cat'] for r in rows if r['ncr'])
            report[name]['ncr_conf_0.5'] = Counter(r['cat'] for r in rows if r['ncr'] and r['confidence'] >= 0.5)
            report[name]['cubao_conf_0.5'] = counts(rows, CUBAO, 0.5)
            report[name]['panning_conf_0.5'] = counts(rows, PANNING, 0.5)
        weight, geo = weigh(rows, PANNING)
        report[name]['weight'] = weight
        (out / f'{name}-manila.geojson').write_bytes(geo)
        cubao = sorted((r for r in rows if inside(CUBAO, r['lng'], r['lat'])), key=lambda r: str(r['id']))
        random.Random(20261122).shuffle(cubao)
        report[name]['sample'] = cubao[:20]
        (out / f'{name}-cubao.json').write_text(json.dumps(cubao, ensure_ascii=False))
    conf = [r for r in sources['overture'] if r['confidence'] >= 0.5]
    weight, geo = weigh(conf, PANNING)
    report['overture']['weight_conf_0.5'] = weight
    (out / 'overture-conf-manila.geojson').write_bytes(geo)
    ncr_conf = [r for r in conf if r['ncr']]
    weight, geo = weigh(ncr_conf, PANNING)
    report['overture']['weight_ncr_conf_0.5'] = weight
    (out / 'overture-ncr-conf-manila.geojson').write_bytes(geo)
    print(json.dumps(report, ensure_ascii=False, indent=1, default=str))


main()
