<!-- Base branch must be `staging`, not `main`. Check the "base" box above. -->

## What and why

<!-- What does this change, and why? One purpose per pull request. -->

## Linked issue

Closes #

## Screenshots

<!-- For anything you can see: before and after. Delete this section if nothing changed on screen. -->

## Checklist

- [ ] The base branch is `staging`
- [ ] `npm run check` passes (formatting, lint, build with its guards, unit checks)
- [ ] No new `any`, `!` or `as`
- [ ] New and changed files follow the naming and folder rules (kebab-case, in the right feature)
- [ ] Imports flow `app → pages → features → shared → design-system`
- [ ] Loading, error and empty states are handled for any data-driven UI
- [ ] The UI works with a keyboard and is labelled
- [ ] Stories are added or updated for UI components
- [ ] No `console.log`, commented-out code or unrelated changes

Standards: [`.claude/CLAUDE.md`](https://github.com/Roviicc/ParaPo/blob/staging/.claude/CLAUDE.md), see "Definition of done".
