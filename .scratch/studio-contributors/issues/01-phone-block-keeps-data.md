# PhoneBlock keeps the phone it read when a read again fails

Status: ready-for-agent
Type: task

## What happens

`src/features/studio/contributors/actions/phone-block.tsx` shows the phone an upload came from: its upload count, and Block or Unblock. It checks `phone.error` before `phone.data`. TanStack Query re-reads the phone in the background: when the card mounts again, when the window regains focus, and after a block. If that re-read fails (the network drops, Supabase answers an error), the query keeps the data it already had and also carries the error. The card shows only the error ("Phone a697d4 could not be read. …"), so the count and the Block / Unblock button vanish over a passing failure.

Found while fixing the PhoneBlock > Asking story for the Storybook plays check (#890): the story's seeded phone was re-read on mount with no database, and the card showed its error.

## What it should do

- **First read fails** (no data yet): the card shows the error, as now, with a way to try again.
- **A later re-read fails** (data in hand): the card keeps showing the phone and its Block / Unblock as they were read, and adds a quiet notice under them with Try again. The block and unblock buttons stay usable: the database answers for the phone as it is now, not as shown.
- Try again calls `phone.refetch()`.

## Copy and look (to propose to the owner through the hub)

- First read failed, as now plus a button: "Phone a697d4 could not be read. {reason}" and a secondary "Try again" button.
- Re-read failed, under the phone: "Couldn't check phone a697d4 again; this is what it was. [Try again]", small, `text-content-secondary`, the same secondary small Button. Not `role="alert"`: nothing the editor did failed. `role="status"` so a screen reader hears it once.

## Done when

- `phone-block.tsx` reads `phone.data` first, and the error only when there is no data.
- Stories cover: first read failed, re-read failed with data shown, Try again.
- A unit or story play proves the re-read failure keeps the data on screen.
- The ds-reviewer passes the notice.
