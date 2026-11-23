"""Pulls Overture Maps places inside the public map's panning box into one local Parquet file, for
count-places.py. A study script, not part of the app or any build; the output stays out of the repo.

Usage: python3 -I overture-pull.py <out.parquet>
Needs: Python 3 and duckdb (pip, outside the repo). Reads Overture's public S3 bucket anonymously.
"""
import sys

import duckdb

out = sys.argv[1]
con = duckdb.connect()
con.sql("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; CREATE SECRET anon (TYPE s3, KEY_ID '', SECRET '', REGION 'us-west-2');")
con.sql(f"""
COPY (
  SELECT id, names.primary AS name, taxonomy.primary AS category, taxonomy.hierarchy AS hierarchy, taxonomy.alternates AS alt_categories,
         basic_category, confidence, operating_status, brand, addresses, sources,
         bbox.xmin AS lng, bbox.ymin AS lat
  FROM read_parquet('s3://overturemaps-us-west-2/release/2026-11-18.0/theme=places/type=place/*', hive_partitioning=1)
  WHERE bbox.xmin BETWEEN 120.6 AND 121.5 AND bbox.ymin BETWEEN 13.6 AND 15.05
) TO '{out}' (FORMAT parquet)
""")
print(con.sql(f"select count(*) from '{out}'").fetchall())
