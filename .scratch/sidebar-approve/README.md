# Approve in the sidebar

The studio's "Studio review · Provisional UI" workspace (`src/features/studio/review/`) goes. A draft is approved, discarded or put back from the route's or hotspot's sidebar instead.

## The owner's answers

- **Q86:** tapping a route on the studio map always opens its sidebar (Route Information), never the review screen, including a route with a draft.
- **Q87 a:** approving moves into the sidebar. A route or hotspot with a draft shows a small "Draft" badge, and an Approve beside Save. Approval is publish_draft, with its revision check.
- **Q88:** no approved-versus-draft comparison drawing and no changed-fields list. The draft's line shows on the main map while the sidebar is open.
- **Q89:** now, after release 0.4.0.
- **Q98 (design A):** with a draft stored, Publish reads Approve. Footer: Exit · Approve · Save as draft. With nothing changed on screen, Approve publishes the stored draft at the revision read; changed, it saves and then publishes at the saved revision.
- **Q99:** a draft with no approved row (a new route, a hotspot draft) opens in the sidebar, built from the draft's payload.
- **Q100:** another editor's draft stays locked (the sidebar isn't editable). Any editor may approve it; only its maker may discard it.
- **Q101:** "Discard draft" in the footer for the editor's own draft.
- **Q102:** Put back, for a taken-down route, goes in that route's sidebar beside Unpublish. The waiting list stays in `public-view/waiting-list.tsx`.

## The pull requests

1. Approve, the Draft badge and Discard in the sidebar, for the editor's own drafts.
2. Drafts with no approved row open in the sidebar.
3. Another editor's draft: the sidebar opens locked, with Approve.
4. Put back in a taken-down route's sidebar.
5. The review workspace removed; the draft lines and markers stay on the map, in `maps/`. Then tell the hub whether PR #746 can proceed.

## Owner to design later

1. **The Draft badge** beside the sidebar's heading (`panels/draft-badge.tsx`): a pill in Line detail's Draft orange, `border-current`, made from existing tokens. There is no Badge or Tag primitive yet. Screenshot: `draft-badge-and-approve.png`.
2. **Discard** in the sidebar's footer (`panels/save-footer.tsx`): a plain, error-tone button between Exit and Approve, asking first in the browser's own confirm. Labelled "Discard", not "Discard draft", so the four buttons keep one line at 380 wide. Screenshots: `footer-own-draft.png` beside the map; `footer-own-draft-phone.png` over the map on a phone, where "Back to map" wraps onto two lines.
3. **Line detail's Status "Not saved"** (`panels/line-detail.tsx`), in the label grey: a new line, or a change to a published one, with no draft stored. Draft now means a draft is stored.
4. **Keep my draft** (`panels/draft-alert.tsx`, Q137): a small secondary button under the conflict alert at the foot of the sidebar's form, asking first in the browser's confirm. Screenshot: `keep-my-draft-conflict.png`. The conflict's words still say "Refresh and compare before making a new draft"; proposed instead beside the button: "Another editor published a change since this draft began. Keep your draft to approve it over theirs, or discard it."
5. **Take down and Put back in the studio search** (`maps/subject-status-list.tsx`, Q121): under the place results, a panel "Take down or put back" listing up to five routes and places whose name holds what is typed, each Published or Taken down with its button. Screenshots: `search-take-down.png`, `search-put-back.png`.
6. **Another editor's new draft** (`maps/held-draft-sheet.tsx`, Q122): a small card at the map's foot with the draft's name, the lock notice, Approve and Close. Screenshot: `held-draft-sheet.png`.
