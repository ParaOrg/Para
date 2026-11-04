# Ride detail

Planned with the owner on 2026-11-03. Status: tickets written; 01 in progress.

Figma: section "Route Information and delete" (4560:12561) in Para-Po (`MGPQFPjemLbzjNqAI5Ny4D`): the sheet folded over the ride's map (4558:11792), the sheet open (4560:12422), and the delete question (4560:12777). The green "on the map" box is a later frame the owner shared on 2026-11-03.

## What the owner asked

A contributor taps a ride in History and sees it on its own screen: its trail on the map, and a sheet with what it was (where from, where to, the vehicle, fare, distance, time, date, the description), whether it still needs sending, whether an editor used it on the map, and one way to delete it.

The owner's answers (2026-11-03):

1. **One delete, on the phone only.** "Remove from this phone" and "Delete from Para" merge into **Delete this record**. Para keeps every upload: it stays on the map and in the stats.
2. **Tapping the History card opens the ride.** The card's ⋮ menu goes.
3. **Time** is the whole trip, Start to Stop.
4. **Read only.** Nothing is edited here.
5. **Wording** is the session's to choose: short, only what matters.
6. **"On the map"** (an editor used the ride) shows in the ride's screen only, never on the card.

## How it works

### Opening a ride

- The ride's screen is at `#ride/<id>`, so a reload stays on it and Back returns to History. It sits inside History: no toolbar, and History's list is kept as it was under it.
- It draws over the map, which stays live: the sheet covers its foot, the back button and the map's own buttons stand on it.
- A ride whose id is not in History (deleted, or the link is stale) goes straight back to History, with no message; while a reloaded ride is still being found, Back stands alone over the map (the owner, 2026-11-03).

### What the sheet shows

| Row | From |
| --- | --- |
| Title, → end | `startPointName`, `endPointName`, as the card |
| Upload line | The card's status line (`history/card-status-line.tsx`), Tap retry upload included |
| On the map | `get_my_uses` (#674), only when an editor used it: "Now on the map: Cubao → SM Fairview" |
| Transport mode | `rideKind`, as the save form names it; Lakad for a walked one |
| Fare | `farePhp`; the row is left out when none was typed |
| Distance | `distanceM` |
| Time | `stoppedAt − startedAt` |
| Date | `startedAt` |
| Description | `description`; the heading is left out when it is empty |

A ride uploaded from another phone (History lists the account's uploads that this phone has no copy of: a new phone, a reinstall, the old ParaPo Contributor app, or the web page) has no trail here: the map shows none and the sheet says nothing about it.

### Deleting

- **Delete this record** asks first (the raised hand, `account/hand-question.tsx`): "Delete this record?", then "It's removed from this phone. Your upload stays on Para." or, never uploaded, "It hasn't been uploaded, so it will be gone for good." Buttons **Keep it** and **Delete this record**.
- It deletes the phone's copy, if there is one. An uploaded ride's id is also kept in a list of rides hidden on this phone, so History does not bring it back from the account's uploads (`history/history-merge.ts`). A ride from another phone is only hidden.
- Then back to History.
- Nothing in the app deletes a single upload from Para any more. Deleting the account with "Also delete my uploaded routes" still removes them all.

## Tickets

1. [01](issues/01-ride-address-and-opening.md): the ride's address, opening it from the card, the sheet's title.
2. [02](issues/02-the-sheets-content.md): the Commute Information rows, Description, upload line.
3. [03](issues/03-map-and-sheet.md): the trail on the map, fitted; the sheet folding and opening.
4. [04](issues/04-delete-this-record.md): Delete this record, the hidden list, the ⋮ menu removed.
5. [05](issues/05-on-the-map.md): "Now on the map", after #674 lands.
6. [06](issues/06-headless-suite.md): the headless suite for the whole flow.
