# studio-phone-test: "Follow joins the saved line" failed once against the live services

Status: needs-triage
Type: task
Priority: low

## What happened

In a local run of studio-phone-test with `PARA_LIVE_SERVICES=1` (the live router, basemap and
database, as staging and the nightly run use), on the branch that stands in the route tables, one
check failed:

```
PASS  a tap on a saved line offers to follow it  [chip 1, 3 points]
FAIL  Follow joins the saved line, in place of the tap's point  [borrow null, 7 points, the join's first two 982.8 m apart]
```

It is in the drawing section where a tap on a saved line offers to follow it, after "Keep keeps the
drawing" and before "a finger drag moves a hotspot corner". Every other check passed: 36 of 37.
The run's outside lines: router ×26 (network 25, cancelled 1), database ×21 (network 21), basemap
×24 (network 24).

## What is known

- It did not recur in 3 more live runs: 2 on the same branch and 1 on staging's code, each 37 of 37.
- The offer came (the chip showed), but taking it left no borrow, and the drawing's first two
  points ended 982.8 m apart, so the join was not made where the tap was.
- The suite's subject line is pinned (`tests/e2e/lib/subject-line.mjs`), and against the live
  tables the pin is the same line the suite used before, so the line is not what changed.

## Not done, on purpose

No retry and no change: one failure in four live runs is not enough to name a cause. If it shows
on staging or the nightly run, that run's log goes here and the cause is looked for then.
