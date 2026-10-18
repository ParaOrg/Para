# ParaPo workflow handoff

Updated: 2026-10-18. Goal: complete contributor-to-studio workflow, through approval and publication.

## Verified baseline

- Local `staging` and fetched `origin/staging`: `80f5e4f0e960713ad7da528e8efeb6ddb3f2635e` (merge #272, save-test race fix).
- Fetched `origin/claude/loops-studio`: `c80a1f81519f52f84dfb83ad259899401daf741c`.
- #271 (Ikot card) and #272 are merged into staging. User reports staging drawing, Ikot, and save suites passed.
- Connected Supabase inspection verified migration 0021 at ledger version `20261018020203` and `route.is_loop` present. Types were regenerated from the live schema, including nullable route ends.
- Completion branch: `codex/ikot-studio-completion`, based on the unmodified `claude/loops-studio` head above. Includes generated types, the applied migration ledger entry, and a fix preserving an existing two-ended route's type when an edited line closes. Regression added to `save-test`.
- Historical contributor PRs to reconcile: #249 recorder, #258 recording rules, #262 screens/map. Do not duplicate their work. Current local staging has no contributor app.

## Owner decisions and working rules

- Recorder **must include a map**. Use existing #262 direction when reconciling work.
- Owner owns design; screenshots replace Figma references for now. Batch unresolved design questions.
- Cheap-phone testing is **not a release blocker**. Browser checks and owner's phone are the initial validation path.
- Use a small parallel team for independent work, separate folder ownership, concise briefs and persistent handoffs. One browser suite at a time.
- Only owner merges into `staging` and `main`. Prepare reviewable changes and evidence first.
- Another Claude/hub session may still be active; confirm current branch ownership before overlapping edits.
- Read `.claude/CLAUDE.md` and `docs/agents/how-we-work.md` before implementation. Do not add dependencies without asking.

## Implemented; reconcile stale tickets

- [x] Contributor plan approval, ADRs/glossary/standards (`contribute/02`, `/03`).
- [x] Typed studio client/generated types, ledger/index cleanup (`/05`); default-grant closure, migration 0017 (`/06`).
- [x] Published reader moved to `src/features/routes/published/` (`studio-maps/03`, ticket stale).
- [x] Contributors / Playground / Public URL switch, Playground default (`studio-maps/04`, ticket stale).
- Contributors and Public are still explicit placeholders. Playground writes live rows directly. Local drawing persistence is not database review drafts.
- Approved decisions in `contribute/issues/02`: reader option A, Playground default, seven-day stale-draft discard, recommended database design/caps. Studio spec's open-decision wording is stale.

## Dependency checklist

1. [x] Prepare Ikot types/loops-studio completion for review on `codex/ikot-studio-completion`. `npm run check`: 854 unit tests passed; Storybook build passed; `save-test`: 148 passed, 0 failed, including the new edited-closed-line regression. Owner merge and deployed verification remain pending.
2. [ ] **Next batch: migration 0018 review database** (`studio-maps/01`): statuses, drafts, takedowns, editor names, approved-only reads and guards. Preserve current public output. Include 0021 loop-aware partial uniqueness, null-ended loop approval, and route visibility needed by `private.loop_one_way`. Prepare SQL and review evidence before application.
3. [ ] Publish protections (`studio-maps/02`): takedown-aware shrink guard, private-table probes, emitted-file privacy checks.
4. [ ] Playground drafts/review (`/05`, `/06`): versioned schemas, draft ownership/overlay, save/discard, submit/approve/send-back, conflict handling, retry-safe link updates, take-down/put-back.
5. [ ] Studio Public view (`/07`): published data, read-only view, waiting-for-publish list and actions.
6. [ ] In parallel where ownership permits: reconcile recorder PRs; implement Turnstile studio auth (`contribute/07`), packing/rules (`/10`), offline shell (`/11`), approved screenshot screens (`/12`).
7. [ ] Contributor DB/auth/upload (`/08`, `/09`, `/13`): migration 0019 after 0018, isolated auth storage, anonymous first save, idempotent retry/upload/delete, studio-session isolation.
8. [ ] Contributors studio reader/view/actions (`studio-maps/08`, `/09`): bounded queries, list/map parity, use-line draft, hinto-to-hotspot, hide/block, provenance.
9. [ ] Backup/restore (`contribute/15`, migration 0020) and public contributor entry point (`/14`) after owner release/design decisions.

## Configuration and design dependencies

- Turnstile production/preview widget/site key; Supabase CAPTCHA secret/settings; anonymous sign-in and possible signup hook. Studio auth integration must ship before enabling project-wide CAPTCHA.
- Include `auth/change-password.tsx` current-password `signInWithPassword` call in CAPTCHA work; ticket currently names only sign-in/reset.
- Editor display names; approved references for missing recorder/review/contributor states.
- Backup: R2 bucket/lifecycle/scoped credentials, encryption public key, backup-reader connection secret, restore verification.
- Public contributor button ticket retains owner go/end-test-period and privacy-check dependencies. Do not expand these into blockers for private preview work.

## Verification and resumption

- Publishing blocked: the Roviicc GitHub connector returned 403 (`Resource not accessible by integration`) on creating the completion tree. Terminal Git authenticated as `jsonrls` and the new-branch push was denied (403). No remote branch or PR was created. Restore write access for the intended Roviicc account before publishing; do not overwrite the original Claude branch.
- Inventory and review used two focused agents; the coordinator integrated changes and ran verification.
- `npm run check` and Storybook build passed. `save-test`: 148/0 using only its in-memory Supabase stand-in. `gate-test`: 17/0 with `PARAPO_NODE_FETCH=1 NODE_USE_ENV_PROXY=1`. No live data writes or schema changes were made. The six live-router drawing suites were not rerun on this completion branch; staging's earlier results do not establish their result here.
- Local setup: `npm ci --cache /tmp/parapo-npm-cache`; gitignored `.env.local` copied from the repository's public `.env.production`; Playwright headless Chromium installed under `/tmp/parapo-browsers`. Tests requiring local sockets need network permission in this sandbox.
- Detailed next-batch risks and implementation order: [review-workflow-plan.md](review-workflow-plan.md).
- Recheck branch heads and active session ownership first. Inspect existing PRs before implementing missing code.
- Before pushes: `npm run check` and browser suites reached by the change. Record exact commit, checks, failures, blockers and next action here after each batch.
