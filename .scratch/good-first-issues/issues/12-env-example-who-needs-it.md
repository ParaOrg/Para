# 12: `.env.local.example` should say who needs it

Status: ready-for-human
Type: task
Size: tiny
Blocked by: none

## What is missing

`.env.local.example` starts with "Copy this file to .env.local and fill in the values." A newcomer reads that as required. But `README.md` says only the studio (`/studio/`) needs these values: "the public map needs nothing". A first-timer who works on the public map or Storybook can skip the file.

## What to do

Edit the comment block at the top of `.env.local.example` only:

- say who needs the file: only someone working on `/studio/`, who also needs an editor account
- say the public map (`npm run dev`, `/`) and Storybook need no `.env.local`
- keep the existing warning that `.env.local` is never committed

Do not add or change any variable, and do not paste any key.

## Done looks like

- the comment is correct against the README's "Running it" section
- `npm run check` passes

## Where to look

`.env.local.example`, `README.md` ("Running it").
