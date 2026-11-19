# 01: Tokens: the new primitives and semantics, beside the old

Status: ready-for-agent
Type: task
Blocked by: none

## What to build

- **New tokens.** Figma's new primitives (a 15-step scale) and new semantic variables go into `src/design-system/foundation/tokens.css` beside the current ones, by the `/sync-tokens` skill.
- **Nothing is deleted or renamed.** The current semantics are deprecated but stay, so today's code keeps drawing as it does.
- **The colours are Figma's,** including the darker card fills and End's red-700.
- **The font is untouched here.** Livvic has its own pull request (issue 13).

## Done when

- Every new Figma variable the redesign's frames use has a token.
- No existing token changes value.
- `npm run check` passes, and the Storybook plays are unchanged: 1325 of 1325.
