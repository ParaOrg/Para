# The studio's wheel-pan glide is not cancelled by another camera move

Status: resolved
Type: task
Priority: low
Decision: owner-approved (2026-11-17), via the hub

## What the editor sees

An editor pans the studio map with the mouse wheel and, while the pan is still gliding to a
stop, picks a place in search (or anything else that moves the camera). The map jumps to the
place, and then the glide's last steps nudge it on by whatever was still left to pan. The view
ends up off where the pick put it by up to that much: a fraction of a pixel in the case
measured below, up to most of the wheel's pan if the pick lands early in the glide. On a slow
machine more of the glide is left when the pick lands, so the nudge is larger.

## Why

`src/features/studio/maps/use-wheel-navigation.ts` glides a wheel pan with one `panBy` per
frame, each 30% of what is still to go (`panStep`, `wheel-navigation.ts`), with no duration.
Nothing stops it when another camera move starts. Because each step has no duration, MapLibre's
`isMoving()` never reports the glide either.

## How it was found

snap-test's far-click scenario failed on CI for #1042. The test pans with Shift+wheel by 200 px,
waits 700 ms, and then jumps the camera with `jumpTo`. With Chrome's CPU throttled 4×
(`Emulation.setCPUThrottlingRate`), the camera read 121.08512749, 14.74372936 after the jump,
0.5 m east of the target 121.0851225, 14.7437295 at zoom 16, and it stayed there. Unthrottled,
it landed exactly. #1042 makes the test wait for the camera to rest before it jumps. The app is
unchanged.

## Decision

The owner approved it: any new camera move stops the wheel-pan glide. That covers `jumpTo`,
`flyTo`, `easeTo`, `fitBounds`, a search pick and a drag.

## What done looks like

- Only the glide's behaviour changes. A wheel pan that nothing interrupts glides as it does today.
- A test wheel-pans and then starts a camera move straight away. The camera lands exactly on the
  move's target, with the CPU throttled 4× (`Emulation.setCPUThrottlingRate`).
- The glide's frame loop is cancelled when the component unmounts. The effect's cleanup already
  calls `cancelAnimationFrame`, and it stays.
- snap-test's rest wait in `view()` (#1042) stays, since it also covers other motion.
- A small app PR of its own, after #1041 merges and before PR 5.

## Answer

`useWheelNavigation` listens for `movestart`. The glide's own steps pass `{ isWheelGlide: true }`
as `panBy`'s event data, and any other camera move start (`jumpTo`, `flyTo`, `easeTo`,
`fitBounds`, a drag, MapLibre's scroll zoom) clears what is left to pan and cancels the glide's
frame. A pan that nothing interrupts glides as before. The effect's cleanup also stops listening.

snap-test checks it: "wheel: a jump while the pan glides lands where it was sent" wheel-pans
300 px and jumps the camera straight away. Without the change it fails at 1× and 4× CPU
throttling, the camera ending about 0.19° of latitude short. With it, it lands within 1e-9.

