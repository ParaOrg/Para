# 06: The headless suite

Status: ready-for-agent
Type: task
Blocked by: 02, 03, 04

`tests/e2e/`: what is left is reloading on a ride's screen (the ride stays open), the phone's or browser's Back from it (History again), and retrying from the ride's own Status row (Tap retry upload).

`tests/e2e/upload-test.mjs` already covers the rest: it opens a ride from History, retries an upload from the History card, closes the ride with Close and with Escape, and runs Delete this record (`openRide`, `retryButton`, `deleteRecord`). Narrowed by /tidy on 2026-11-28.
