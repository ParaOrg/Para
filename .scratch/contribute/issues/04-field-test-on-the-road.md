# 04: The field test, on the road

Status: ready-for-human
Type: research
Wave: 1 and 2
Who: the owner, and the people the owner sends the link to; a session helps read the results
Blocked by: 01, 02

## What to do

Record real rides with the field-test page (01), on its preview link.

- **Phones:** at least one cheap Android (the kind most commuters carry), and the owner's own.
- **Rides:** jeep, bus, train if possible; 15 to 90 minutes each; some with the screen kept on, some with the phone in a pocket, one with a call during it.
- **Setup per phone:** Chrome's battery setting as found (note it), then once on "Unrestricted".
- **A short log per ride:** the phone, the battery setting, what happened (a call, the screen off).
- Download each recording. They stay with the owner, off the repo.

Then a session reads the downloads (never committing them) and reports:

- **Gaps:** minutes lost to gaps over minutes ridden, per ride and overall, by cause. The verdict against the threshold agreed in 02 (recommended: more than 10% lost means the web page is not enough).
- **Hintos:** do 8 seconds and 25 m find the real passenger stops without counting every red light? Any number to change.
- **Size:** bytes per hour of riding once packed as `../database.md` §3 describes, against the 30 kB estimate.

## Files it owns

None in the repo. A ride becomes test data (ticket 10) only if it is the owner's own, trimmed 300 m at each end, and the owner says yes.

## Acceptance checks

- An `## Answer` with: the verdict (web page enough, or the Android app is needed), the gap figure, the hinto numbers to keep or change, the measured size, and which rides may become test data.
- `Status: resolved`.

## Comments
