# The Controller: one bar for the route list and the trip

Taken at 393 wide (the phone) and in a 1100-wide frame (the wide screen), at DPR 2, from the Storybook built from `claude/trip-controller`. Each Figma frame sits above our screenshot.

| File | What it shows |
| --- | --- |
| `00-side-phone.png` | Figma 4679:23737 above, our trip bar below |
| `00-side-wide.png` | Figma 4683:32635 above, our list bar below |
| `c1-list-phone.png` | The list on a phone: ✕, PAPUNTA, the filter, over the fade (`--gradient-bottom-toolbar`) |
| `c2-trip-phone.png` | A trip on a phone, with something behind it: ‹ and PAPUNTA. The extra slot is empty |
| `c3-list-wide.png` | The list's wide top bar, 64 tall, in Card/Jeep (Q190): ⇆ PAPUNTA and the filter at the left, ✕ at the right |
| `c4-trip-wide.png` | A trip's wide bar in its livery, with ‹ at the right (Q191) |
| `c5-liveries.png` | The wide bar in each livery |
| `c6-trip-sheet-phone.png` | The whole trip sheet on a phone, the bar floating at its foot |
| `c7-trip-sheet-wide.png` | The whole trip sheet on a wide screen, the bar on top |
| `c8-list-sheet-phone.png` | The whole list sheet on a phone |
| `c9-list-wide-filtered.png` | The wide bar with a filter on: the dot on the sliders |
| `c10-list-wide-disabled.png` | Nothing drawn the other way round: PAPUNTA disabled |
| `c11-list-sheet-wide.png` | The whole list sheet on a wide screen, 384 wide |

Known differences from Figma, all by decision:

- PAPUNTA is in SN Pro Bold 17/24, in capitals, not Cubao (Q163).
- There is no report flag yet. The slot for it is there and empty (decision 144).
- Q190 and Q191 are built to the recommendations, pending the owner's answer.
