# Kept on purpose

Things a `/tidy` scan may flag as unused that the owner chose to keep. Don't report them again unless the reason no longer holds.

| What | Where | Why kept | Since |
| --- | --- | --- | --- |
| `TrackRoutesCard` | `src/features/contribute/tutorial/track-routes-card.tsx` | Waits for the tutorial screens it opens; the TODO in `contribute-page.tsx` says where it goes. | 2026-10-31 |
| Tricycle in `RIDE_KINDS` | `src/features/contribute/storage/recording-schema.ts` | A ride kind the data keeps, though the ride sheet doesn't offer it. | 2026-10-31 |
| `ConsentPanel` | `src/features/contribute/consent/consent-panel.tsx` | Shown nowhere today; its TODO says the owner's redesign reuses it. | 2026-10-31 |
| `HelpButton` and `HAS_TUTORIAL` | `src/features/contribute/screens/help-button.tsx`, `ready-screen.tsx` | Built and hidden until the tutorial is designed. | 2026-10-31 |
