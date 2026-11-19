# PalimosPoDesignSystem fonts

**Livvic** (`Livvic/`), the family the owner's redesign draws in, is the app's
type on every page. Its five static cuts the designs use, Regular 400, Medium
500, SemiBold 600, Bold 700 and Black 900, come from the family's official
release (google/fonts, `ofl/livvic`) under the SIL Open Font License, whose
text sits beside them (`Livvic/OFL.txt`). Livvic has no ExtraBold (800), so
nothing in the app asks for it.

**Wired** (fonts.css): those five, as woff2 subset to Latin from the .ttf
sources beside them by `subset.sh`, which says what the subset holds and how
to run it again. The build copies them and runs no Python, and holds them
under check-build's font budget. The contributor app's download page
(`public/app/`) keeps its own copies of Regular and SemiBold.

**Unwired:** Cubao Free's three .otf sources in `Cubao/`, dropped from the
app on 2026-10-16, until a design uses one. Wiring a face is one @font-face
block and, if new to the scale, one token.
