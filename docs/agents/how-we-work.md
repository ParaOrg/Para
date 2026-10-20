# How we work

How the owner and the Claude sessions working on ParaPo split the work. The owner approved these rules on 2026-10-16.

The goals: a codebase that is easy to review, work that scales, and an app whose code, architecture and system design anyone can scan without much effort.

## Who decides what

- **The owner owns the design.** A session never makes up a look. When Figma doesn't cover something, the session collects its questions and sends them to the owner in one batch, not one at a time.
- **One coordinator session** hands out the work, merges between branches, and writes the release summary.
- **Only the owner merges** into `staging` and `main`.

## Which model does what

| Model  | Job                                                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------------- |
| Opus   | Planning, architecture and system design, hard bugs, and reviewing other sessions' work before it reaches the owner    |
| Sonnet | Building from a clear plan: renames, components from Figma, tests, small fixes                                         |
| Haiku  | Watching and scanning: CI, searching the code, inventories, checklists                                                  |

- The cheaper the model, the clearer its brief: what to change, where, and how to prove it.
- An agent runs on Sonnet unless its file names a model (`CLAUDE_CODE_SUBAGENT_MODEL` in `.claude/settings.json`). The CI watcher (`.claude/agents/ci-watcher.md`) runs on Haiku; brief an Opus agent only for planning, a hard bug or a review.
- A stronger model reviews a cheaper one's work before the owner sees it.

## Sessions in parallel

- Hand independent work to other sessions. At most about four build at the same time: the limit is how much the owner can review, not how fast the sessions work.
- Each session owns folders, not tasks. No two sessions edit the same file at the same time.
- Work that touches files most open pull requests touch (a rename, a pass over comments, file splits) waits until those pull requests land.
- One browser suite at a time in a container.
- Before every push: `npm run check`, and the browser suites the change reaches.

## How work lands

- Work lands in batches. Each batch is one combined branch with one preview link and one summary of what changed on screen, with screenshots.
- The owner reviews the screens. The coordinator and an Opus review cover the code.
- The small pull requests stay underneath, one purpose each, so the history stays readable.

## Keeping the codebase easy to scan

- **Comments say why.** Who asked for a change, when, and what the code used to do go in the commit message and the pull request, not in the code (`.claude/CLAUDE.md`, Comments).
- **Files stay under about 150 lines** (`.claude/CLAUDE.md`, Components). Long files are split folder by folder, biggest first.
- **An architecture page built from the code:** the apps, the features, what each exposes, which part uses which, and where the data flows. CI checks that it is current. Planned.
- **System design:** a few diagrams of how data moves (studio, database, publish, map files, public map; and the driver app once it is designed), with each big decision in `docs/adr/`. Planned.
- **A code-health page each release:** files over the limit, lint warnings left, the app's size against its budget, the test count, and components without stories. Planned.
