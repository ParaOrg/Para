# 03: Sample data for staging

Status: needs-info (waits on 01)
Type: task
Who: Opus

## What to build

A script, `scripts/staging/seed.mjs`, that fills `para-staging` with sample data the owner runs by hand:

- the routes, directions and hotspots from the published map in `public/data/`, which is public, so the studio on staging starts with the same map commuters see;
- a few made-up contributions and accounts with obviously fake names.

The script must refuse to run against the live project: it checks the URL, and it needs the staging project named explicitly. Never copy contributors' or editors' real data.

## Done when

A fresh `para-staging` seeded by the script shows the published map in the staging studio, and pointing the script at the live URL stops it with a message.

## Comments
