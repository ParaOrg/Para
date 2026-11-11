# The studio's toast says a success as a success, not as an error

Status: needs-triage
Type: task

## What happens

`src/features/studio/panels/toast.tsx` is the studio's one toast (SaveToasts shows it). Every toast is drawn the same way:

- `bg-red-600 text-white`: the error red, and a raw palette class where the design system has tokens.
- `role="alert"`: a screen reader interrupts for each one.

So "Published. The Studio map shows it now; the public map changes at the next publish.", "Saved as a draft.", "Draft discarded." and "Unpublished…" all look and sound like failures. Seen in the screenshots for the sidebar's Approve (`.scratch/sidebar-approve/keep-my-draft-conflict.png`, `search-take-down.png`).

## What it should do

- A toast says whether it reports a success or a problem: `SaveToast` gains a kind (`'success' | 'problem'`), set where each toast is made (`use-save-flow.ts`, `use-delete-actions.ts`, the contribution start).
- Each kind takes its colour from tokens. The owner's Figma has no studio toast frame: the look is the owner's to design (ask the hub). Until then, the problem kind keeps today's look on tokens (`bg-surface-error`/`text-content-inverse`, or what tokens.css has) and the success kind uses the neutral surface.
- A success is `role="status"`; a problem stays `role="alert"`.

## Done when

- Every toast is made with its kind; no toast reads as an error unless it is one.
- No raw palette class in `toast.tsx`.
- Stories show both kinds, phone and computer; ds-reviewer passes.
- save-test, save-drafts-test and studio-phone-test still find the toast (`data-testid="toast"`).
