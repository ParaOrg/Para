"""Pulls every Overture store and eatery Para's studio search lists (.scratch/establishments, the
studio's store search) into one JSON line each: drawn on the map or not, with no road filter and no
OSM dedupe, since a place on a road's line is still a place an editor may look for.

Reads the same release as the map's Overture files (scripts/overture/pull.py), from Overture
Maps' public S3 bucket, anonymously, inside the panning box, at confidence >= 0.7: every basic
category that is a store (ends in _store), the services a street shows (salons, laundries,
shopping, malls, petrol), hotels and other lodging, and the categories the map draws. The category
written is the place's primary one (beauty_salon, hardware_store), which the search shows as its
label.

Needs: Python 3 and duckdb from pip, as pull.py. Never an npm dependency.
Usage: python3 -I scripts/search/pull-search.py <west,south,east,north> <out.ndjson> <release>
"""

import sys

import duckdb

BUCKET = "s3://overturemaps-us-west-2/release"
MIN_CONFIDENCE = 0.7
STREET_SERVICES = (
    "personal_or_beauty_service",
    "laundry_service",
    "shopping",
    "shopping_mall",
    "gas_station",
)
# Where to stay: hotels, inns, apartelles, resorts. Searchable only; the map draws none yet.
LODGING = (
    "hotel",
    "lodging",
    "resort",
)
# The map's own categories (scripts/overture/pull.py CATEGORIES): eateries, cafés, clinics, schools.
DRAWN = (
    "restaurant",
    "fast_food_restaurant",
    "casual_eatery",
    "food_court",
    "coffee_shop",
    "cafe",
    "dental_clinic",
    "primary_care_or_general_clinic",
    "pediatric_clinic",
    "vision_or_eye_care_clinic",
    "specialized_health_care",
    "health_care",
    "diagnostics_imaging_or_lab_service",
    "elementary_school",
    "high_school",
    "middle_school",
    "preschool",
    "college_university",
)


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__.strip().splitlines()[-1])
    west, south, east, north = (float(value) for value in sys.argv[1].split(","))
    out, release = sys.argv[2], sys.argv[3]
    con = duckdb.connect()
    con.sql("INSTALL httpfs; LOAD httpfs;")
    con.sql("CREATE SECRET anonymous (TYPE s3, KEY_ID '', SECRET '', REGION 'us-west-2');")
    kept = ", ".join(f"'{category}'" for category in STREET_SERVICES + LODGING + DRAWN)
    con.sql(
        f"""
        COPY (
          SELECT id, names.primary AS name,
                 coalesce(taxonomy.primary, basic_category) AS category,
                 operating_status AS status, bbox.xmin AS lng, bbox.ymin AS lat,
                 '{release}' AS release
          FROM read_parquet('{BUCKET}/{release}/theme=places/type=place/*')
          WHERE bbox.xmin BETWEEN {west} AND {east} AND bbox.ymin BETWEEN {south} AND {north}
            AND confidence >= {MIN_CONFIDENCE}
            AND (basic_category LIKE '%\\_store' ESCAPE '\\' OR basic_category IN ({kept}))
          ORDER BY id
        ) TO '{out}' (FORMAT json)
        """
    )
    [(count,)] = con.sql(f"select count(*) from read_json('{out}')").fetchall()
    print(f"Overture {release}: {count} places for the studio's search.", file=sys.stderr)


if __name__ == "__main__":
    main()
