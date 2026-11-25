"""Pulls the Overture places Para draws (.scratch/establishments, step E3c) into one JSON line each.

Reads Overture Maps' public Places release straight from its S3 bucket (anonymous, no account),
keeps only the panning box, confidence >= 0.7 and the categories in CATEGORIES, and writes the
columns overture.mjs needs. The latest release is used unless one is named. Commuters never reach
Overture: this runs once a month in Actions (scripts/landmarks/build.sh), and the app reads the
files overture.mjs writes from it.

Needs: Python 3 and duckdb from pip (`pip install duckdb==<the version in landmarks.yml>`), never
an npm dependency.
Usage: python3 -I scripts/overture/pull.py <west,south,east,north> <out.ndjson> [release]
"""

import sys

import duckdb

BUCKET = "s3://overturemaps-us-west-2/release"
MIN_CONFIDENCE = 0.7
# Overture's basic categories Para draws: the owner's four kinds (README, "Answers"), food, cafés,
# clinics and schools, and the everyday stores the OSM establishments already have a marker for:
# convenience stores, pharmacies and laundries; and where to stay (hotels, inns, resorts).
# overture.mjs maps each one to the kind and marker the map uses.
CATEGORIES = (
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
    "convenience_store",
    "pharmacy_and_drug_store",
    "laundry_service",
    "hotel",
    "lodging",
    "resort",
)
# Overture files groceries under food_and_beverage_store, beside liquor and tobacco shops; these
# are the kinds of it that are a grocery, kept by their primary category, which then stands as the
# place's category.
FOOD_STORE = "food_and_beverage_store"
GROCERIES = (
    "grocery_store",
    "produce_store",
    "butcher_shop",
    "fishmonger",
    "food_and_beverage_store",
)


def latest_release(con):
    """The newest release in the bucket, by its dated name (2026-11-18.0 sorts after 2026-10-21.0)."""
    files = con.sql(f"select file from glob('{BUCKET}/*/theme=places/type=place/*')").fetchall()
    releases = {file.split("/release/")[1].split("/")[0] for (file,) in files}
    if not releases:
        sys.exit("No Overture release found in the bucket.")
    return max(releases)


def main():
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__.strip().splitlines()[-1])
    west, south, east, north = (float(value) for value in sys.argv[1].split(","))
    out = sys.argv[2]
    con = duckdb.connect()
    con.sql("INSTALL httpfs; LOAD httpfs;")
    con.sql("CREATE SECRET anonymous (TYPE s3, KEY_ID '', SECRET '', REGION 'us-west-2');")
    release = sys.argv[3] if len(sys.argv) == 4 else latest_release(con)
    categories = ", ".join(f"'{category}'" for category in CATEGORIES)
    groceries = ", ".join(f"'{category}'" for category in GROCERIES)
    con.sql(
        f"""
        COPY (
          SELECT id, names.primary AS name,
                 CASE WHEN basic_category = '{FOOD_STORE}' THEN taxonomy.primary
                      ELSE basic_category END AS category,
                 confidence,
                 operating_status AS status, brand.names.primary AS brand,
                 bbox.xmin AS lng, bbox.ymin AS lat,
                 list_transform(sources, lambda source: source.dataset) AS datasets,
                 '{release}' AS release
          FROM read_parquet('{BUCKET}/{release}/theme=places/type=place/*')
          WHERE bbox.xmin BETWEEN {west} AND {east} AND bbox.ymin BETWEEN {south} AND {north}
            AND confidence >= {MIN_CONFIDENCE}
            AND (basic_category IN ({categories})
                 OR (basic_category = '{FOOD_STORE}' AND taxonomy.primary IN ({groceries})))
          ORDER BY id
        ) TO '{out}' (FORMAT json)
        """
    )
    [(count,)] = con.sql(f"select count(*) from read_json('{out}')").fetchall()
    print(f"Overture {release}: {count} places in the box.", file=sys.stderr)


if __name__ == "__main__":
    main()
