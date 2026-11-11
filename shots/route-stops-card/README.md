# RouteStopsCard (trip detail PR 1a): screenshots for the owner

The trip's stops card at a phone's width (393 px, @2x), from branch `claude/route-stops-card`
(Storybook, Features/Routes/RouteStopsCard). The rows inside are still today's trip rows; their
Figma restyle (plain origin, 17/24, rounded rail ends) lands with the ends card (PR 2).

| File | What it shows |
| --- | --- |
| `00-side-by-side.png` | Figma's RouteStopsCard (4681:29139, left) beside the build (right), on Figma's places |
| `00-figma-route-stops-card.png` | Figma's frame alone |
| `00-jeep-figma-places.png` | The build alone: Jeep, every stop shown, "View less" on its foot |
| `01-jeep.png` … `08-ferry.png` | Each livery, lifted in its own colour (RouteStopsCardShadow, one token per livery; Figma draws only the jeep's) |
| `09-lrt1-with-bound.png` | A train: its line's badge and its bound's |
| `10-long-names.png` | Long place names wrap; the badge never does |

## To decide

- **Shadow per livery** (rec): each card's shadow is its own surface at 12% and 24%, as Figma's jeep is.
- **The chip on light cards** (UV Express, E-Jeep, MRT 3): it wears the badge's colours, dark, as their badges are. Figma draws only the jeep's white chip.
- **Q179, a loop's name** ("UP – Ikot"): today's trip header shows it; Figma's has no place for it. Rec: a third badge after the mode.
- **"View more / View less"**: drawn here, not wired yet. Today's "N more hintuans" row still folds the stops until the fold questions are answered.
