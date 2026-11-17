# snap-test: a rare live-preview request in "Curves in Draw" that the router stand-in has no answer for

Status: resolved
Type: task
Priority: low

## What happened

Once, in a local run of snap-test against the router stand-in (`tests/e2e/lib/stand-ins.mjs`),
all 62 checks passed, but the suite failed on the stand-in's own check:

```
FAIL  the router's stand-in has no answer for 1 request(s):
  /route/v1/driving/121.040288,14.741611;121.041350,14.739536?overview=false&geometries=geojson&steps=true&continue_straight=false&radiuses=25;25
```

It came up once in 3 runs of the original test (with debug lines added), and then not in 12 more
runs of the same copy. Those 12 runs logged every router request with the mouse's position and
the element under it.

## What is known

- The request went out in "Curves in Draw", between the checks "handles: in Snap nothing shows
  handles, the point still selected" and "cursor line: none in Snap".
- It is Snap mode's live preview: a route from the drawing's last point (E, Sinai Street, as
  clicked) to wherever the cursor rests. Whether the preview fires depends on the preview's
  rest timer and the test's next mouse move, so it is a timing race.
- It is not camera drift. In every logged request the map's centre was exactly on the
  scenario's view (121.0418115, 14.7417565 at zoom 16), and #1042's `view()` now asserts that.
- At that view, the missed point is at page pixel (597, 638). That is not the Snap button's
  centre (625, 754), not the "click elsewhere" spot at E + 60 px (559, 499), and not D (541, 408).
  What left the cursor there is not known.

## Where it matters

Only on pull-request runs. Staging, main and the nightly run use the live router
(`PARA_LIVE_SERVICES=1`), which answers any point, so there the race costs one request and
nothing fails.

## Not done, on purpose

No retry, and no recorded answer for the unknown point: a guessed answer would hide what moved
the cursor.

## Next

Catch it again with the request log (mouse `clientX`/`clientY`, the element under it, the
camera), name the cursor's resting spot, then:

- If it is on the map canvas: the test parks the cursor on a known map point (or off the map)
  before switching to Snap, so the preview's target is part of the test's own steps and its
  answer is recorded.
- If it is over UI (the toolbar or a panel above the canvas): whether a cursor resting over UI
  should preview a route to the map point under it is the owner's call.

## Answer

It came up again on CI, on #1041's run 44002880529, with the same request. So the target is a
fixed point, and measured locally in the same state it has a name:

- At the scenario's view, the missed point is page pixel (597.0, 638.0). `elementFromPoint`
  there is the map's canvas, so it is not UI.
- The test clicks the Snap button, whose centre is (625.5, 754), so the mouse rests there. It
  then moves to D at (541, 408) with `{ steps: 3 }`.
- The first of those steps is (625.5 + (541 − 625.5) / 3, 754 + (408 − 754) / 3) =
  (597.3, 638.7): the missed point.
- On a slow frame, Snap's preview rest timer fires between step 1 and step 2, and routes from E
  to that point on the way.

Fixed by the pull request from `claude/e2e-snap-preview-one-step`:

- The move to D is one step, so the only place the cursor rests on the map is D. E→D is
  recorded.
- A new check says the router is asked for routes to D only, from the Snap click on, and names
  any other point.


The same race showed in "Live preview" on that pull request's own first CI run (44006754014):
`121.041833,14.742006;121.041565,14.741985`. `drawRoute([A, B])` leaves the cursor on B at
(642.7, 400.2), and `restAt(D)` moved to D at (541.1, 408.3) in 4 steps. The first step is
(617.3, 402.2), the missed point. `restAt` moves in one step now, and a check says the preview
section asks for routes to B, D and E only.
