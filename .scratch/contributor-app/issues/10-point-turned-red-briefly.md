# 10: "A point turned red briefly"

Status: needs-info (owner: what exactly was seen)
Type: investigation
Who: a session
Source: the owner's phone test of the app, 2026-10-26, feedback (e)

## What I found

Neither first guess is a clean match, so no behaviour changed.

- **The dot's mood face is not red.** The random cross face (`glare`, and `huff` after quick taps on the locator button) is drawn in `locator.css` only by the eyes' shape (slanted, with a shake). There is no red anywhere in the locator code. It does come up by itself about one swing in 40 (every 5 s, for one turn), so it fits "briefly" and "a point", but not "red".
- **The Papunta/Pabalik button does not recolour the line.** It starts a new run: the line after it is drawn in the way's colour, and a dot is put where the way switched, ringed in that colour. Pabalik is `Map/Trail/pabalik`, `#ca3500`, a strong orange that can read as red. That ring and the run stay, they do not flash, so it fits "red" but not "briefly" unless the way was switched back at once.
- **The red bars are Stop and Cancel** (`tracking-button.tsx`): buttons, not points on the map.

My best reading is the way button's orange-red ring or run. That is a guess.

## Questions for the owner

- Was it on the map or in a button? The dot you stand on, or a dot left behind on the trail?
- Did it come right after tapping something (the way button, the locator button, three quick taps)?
- Did it go back to its colour by itself?

## If it was the cross face

The fix is small and leaves the public map alone: an option on `ContributorLocation` that stops the dot from showing the cross moods, default as today. It was not made, because the face is not red and the look is the owner's. Say the word and it is one small change.
