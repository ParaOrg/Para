# PalimosPoDesignSystem fonts

The owner's files, dropped 2026-09-28: SN Pro's sixteen static cuts in
`SNPro/`, Cubao Free's three (narrow, regular, wide) in `Cubao/`.

**Wired** (fonts.css): SN Pro 400 / 500 / 600 / 700, its ExtraBold 800 (a
trip's origin and picked hintuan, the owner's RouteTripDetail of
2026-10-13) and its Black 900 (the route cards' titles, 2026-09-28), as
woff2 subset to Latin from these
sources by `subset.sh`, which says what the subset holds and how to run it
again; and Cubao Free Regular, whole — its kerning is a table the subsetter
drops. The seven weigh 129 kB together (the six 113 kB, from 290 kB, on
2026-09-29; the build holds them under 135 kB since ExtraBold); the build
copies them and runs no Python. Everything else stays here
unwired — italics, the extra weights, Cubao narrow and wide — until a
design uses one; wiring a face is one @font-face block and, if new to
the scale, one token.
