# 01: useHeightVar could build on useHeightOf

Status: needs-triage
Type: task

Two hooks measure an element's height the same way: a callback ref, a ResizeObserver, and a clean-up as the element goes.

- `src/shared/hooks/use-height-of.ts` (`useHeightOf`) returns the height as state.
- `src/features/contribute/common/use-height-var.ts` (`useHeightVar`) writes it to a CSS custom property on the page.

`useHeightVar` could take its height from `useHeightOf` and only set or remove the property, so the measuring lives in one place. It should keep its behaviour: the property is set as the element arrives and removed as it goes.

**Done when:** `useHeightVar` uses `useHeightOf`, and its callers are unchanged (`--stack-room`, `--toolbar-lift`). contribute-test and contribute-offline-test pass.
