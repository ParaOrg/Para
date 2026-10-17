# 12: The four screens, from the owner's Figma

Status: needs-info
Type: task
Wave: 4
Who: Opus with the owner, through the `ds-component` skill, which stops to ask
Blocked by: 10, 11
Waiting on: the owner's Figma for Ready (with the consent screen), Recording, Stopped and Saved; it also settles the page's language

## What to build

`../spec.md`, "The contributor page" and "Consent": the behaviour is fixed there, the look comes from Figma.

- **Ready** with the consent screen on the first visit (its text versioned, the version saved with each contribution); **Recording**; **Stopped** with the four optional fields; **Saved** with "Sent" or "Waiting for signal".
- Every input labelled; focus visible; the live numbers announced politely; touch targets 44 px; colour never the only signal.
- Stories for every state: default, waiting for GPS, a gap, many hintos, long names, unsent recordings waiting, sent, an error.

## Files it owns

`src/features/contribute/screens/` with the stories beside each, `src/app/contribute/contribute-app.tsx`.

## Acceptance checks

- A `ds-reviewer` PASS; `build-storybook`; the stories screenshotted and looked at.
- A keyboard and screen-reader walk-through of a whole recording.
- A recorded ride played back through the page in a headless suite gives the same totals as 01 did.
- `npm run check` passes.

## Comments
