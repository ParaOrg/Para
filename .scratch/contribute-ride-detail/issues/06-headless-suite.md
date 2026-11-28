# 06: The headless suite

Status: ready-for-agent
Type: task
Blocked by: 02, 03, 04

`tests/e2e/`: what is left is reloading on a ride's screen (the ride stays open) and Back from it (History again).

`tests/e2e/upload-test.mjs` already covers the rest: it opens a ride from History, retries its upload and runs Delete this record (`openRide`, `retryButton`, `deleteRecord`). Narrowed by /tidy on 2026-11-28.
