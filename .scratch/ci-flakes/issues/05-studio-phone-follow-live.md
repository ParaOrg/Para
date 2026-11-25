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

## Comments

### No recurrence on the live runs since 2026-11-05

The drawing-suites logs of the CI runs with live services (staging and main pushes, the nightly
run, dispatches) from 2026-11-05 to 2026-11-17 were read for the two lines: every run whose
drawing suites failed, and 7 green ones. 23 reads, and neither line failed in any of them. Where
studio-phone-test did fail (three runs on 11-05), it was "the hint speaks of taps, not
right-clicks", not this.

Every pass borrowed the end of a saved line. Which line changes from run to run, even on one
commit. The distance between the join's first two points belongs to the line:

| Line borrowed | Points | Join's first two apart | Times |
| ------------- | ------ | ---------------------- | ----- |
| 8e053c8b      | 13     | 8186.3 m               | 7     |
| 9c8e6422      | 7      | 982.8 m                | 4     |
| c0d2d9f4      | 9      | 414.1 m                | 3     |
| a6dc5193      | 6      | 414.1 m                | 3     |
| 78cd7692      | 4      | 954.3 m                | 3     |
| d3f00276      | 6      | 427.2 m                | 2     |
| 2eed1668      | 14     | 1000.8 m               | 1     |

So the failure's "982.8 m apart" is that line's ordinary join, not a join in the wrong place. What
failed was the borrow itself: `null`, with the chip shown and taken.

On a live run, a drawing suite that fails runs once more after a minute (ci.yml, for the live
router), and the job then carries the warning "studio-phone-test needed the router retry". A
recurrence hidden by that retry shows there, not as a red job. Still no change: the next
warning on studio-phone-test, with its log, goes here.
