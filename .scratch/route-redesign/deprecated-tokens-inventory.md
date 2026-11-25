# Deprecated tokens: where they are still used

A read-only inventory for issue 16 ([16-deprecated-tokens.md](issues/16-deprecated-tokens.md)). Nothing is deleted. Deleting waits for the owner's OK.

Taken from `staging` at `ad50e25`.

## How it was made

- **The old tokens** are the `:root` semantics in `src/design-system/foundation/tokens.css` that Figma calls "Semantics(Depreciated)", and the `@theme inline` utilities made from them. That is colours only: the shadows and motion tokens are not part of that collection.
- **A use** is any utility made from one of them (`bg-surface`, `text-content-primary`, `border-border-primary`, with any variant prefix or `/opacity`), or a `var(--…)` of one. This covers every `.ts`, `.tsx` and `.css` file under `src/` except `tokens.css` itself, stories included.
- **The screen** is read from the folder the file lives in: `features/studio` is the Studio, `features/contribute` the Contributor page, and `features/routes` the public map (and the studio's Public map, which draws the same parts). `shared/` and `design-system/` serve any page.
- **The new token** is a new semantic that resolves to the very same colour and plays the same part (text, background or stroke). "None" means no new semantic holds that colour. Where one holds it in another part, that is noted, but it is not a mapping: Figma's new collection decides those, and the owner confirms them.
- **The map's paint** reads the `Map/…` colours a second time, as hex in `src/design-system/foundation/map-colours.ts`. Those hex uses are not counted here, so a `map-` token with no use here may still colour the map.

## Summary

- 94 old tokens. 88 are still used, 1197 uses in all.
- Unused already: `card-red-surface-light`, `card-green-surface-light`, `map-trail-papunta`, `map-trail-pabalik`, `map-trail-mark`, `map-trail-flag`.
- 27 have a same-colour new token in the same part; 67 have none. The `Map/…` group has no new semantics in Figma yet.
- 480 of the uses are in stories. 193 of those are the swatches in `tokens.stories.tsx`, which issue 16 deletes together with the tokens; the other 287 are components' own stories.
- Used only by those swatches: `content-inverse-secondary`, `border-tertiary`, `border-error`, `border-plain`, `surface-success`, `surface-transparent-inverse`, `surface-transparent-secondary`, `card-red-surface-pale`, `trip-start`, `trip-end`, `map-route-line-arrow-rest`, `map-route-line-casing`, `map-route-line-hintuan-surface-default`, `map-overlay-card-hintuan-surface`, `map-overlay-card-hintuan-content`, `map-overlay-card-terminal-surface`, `map-overlay-card-terminal-border`, `map-overlay-card-terminal-content`, `map-pin-terminal-surface`, `map-pin-hintuan-surface`, `map-trail-lakad`, `map-trail-sakay`. The `map-` ones among them still paint the map, through the hex in `map-colours.ts`.

| Screen | Uses |
| --- | --- |
| Design system | 311 |
| Contributor page | 293 |
| Public map (and the studio's Public map) | 283 |
| Studio | 231 |
| Shared (any page) | 44 |
| Public map: locator | 26 |
| Public map: updates | 7 |
| Public map | 2 |

## By token

### Content (text)

| Old token | Colour | Uses | Screens | New token (same colour) |
| --- | --- | --- | --- | --- |
| `content-primary` | neutral-900 `#171717` | 159 | Contributor page; Design system; Public map (and the studio's Public map); Public map: locator; Public map: updates; Shared (any page); Studio | `text-primary` |
| `content-secondary` | neutral-800 `#262626` | 43 | Contributor page; Design system; Public map (and the studio's Public map); Shared (any page); Studio | none |
| `content-tertiary` | neutral-700 `#404040` | 52 | Contributor page; Design system; Public map (and the studio's Public map); Public map: locator; Public map: updates; Studio | `text-secondary` |
| `content-quaternary` | neutral-600 `#525252` | 52 | Contributor page; Design system; Public map (and the studio's Public map); Shared (any page); Studio | `text-tertiary` |
| `content-disabled` | neutral-500 `#737373` | 27 | Contributor page; Design system; Public map: locator; Studio | none |
| `content-inverse` | white `#ffffff` | 43 | Contributor page; Design system; Public map (and the studio's Public map); Public map: updates; Shared (any page); Studio | `text-on-fill` |
| `content-inverse-secondary` | neutral-200 `#e5e5e5` | 2 | Design system | none in its role (same colour: `card-uv-express-fill`) |
| `content-error` | red-700 `#c10007` | 25 | Contributor page; Design system; Shared (any page); Studio | none in its role (same colour: `direction-end-fill`) |
| `content-success` | green-700 `#008236` | 5 | Contributor page; Design system; Studio | none in its role (same colour: `direction-start-fill`) |
| `content-warning` | orange-700 `#ca3500` | 5 | Contributor page; Design system; Studio | none |

### Border

| Old token | Colour | Uses | Screens | New token (same colour) |
| --- | --- | --- | --- | --- |
| `border-primary` | neutral-200 `#e5e5e5` | 25 | Contributor page; Design system; Public map (and the studio's Public map); Shared (any page); Studio | none in its role (same colour: `card-uv-express-fill`) |
| `border-secondary` | neutral-300 `#d4d4d4` | 8 | Contributor page; Design system | `stroke-tertiary` |
| `border-tertiary` | neutral-300 `#d4d4d4` | 2 | Design system | `stroke-tertiary` |
| `border-error` | red-700 `#c10007` | 2 | Design system | none in its role (same colour: `direction-end-fill`) |
| `border-plain` | white `#ffffff` | 2 | Design system | `stroke-light` |

### Surface

| Old token | Colour | Uses | Screens | New token (same colour) |
| --- | --- | --- | --- | --- |
| `surface` | white `#ffffff` | 170 | Contributor page; Design system; Public map; Public map (and the studio's Public map); Public map: locator; Public map: updates; Shared (any page); Studio | `bg-surface`, `bg-fill` |
| `surface-secondary` | neutral-100 `#f5f5f5` | 66 | Contributor page; Design system; Public map (and the studio's Public map); Public map: locator; Shared (any page); Studio | none in its role (same colour: `stroke-default`) |
| `surface-tertiary` | neutral-150 `#f0f0f0` | 31 | Contributor page; Design system; Public map (and the studio's Public map); Public map: locator; Shared (any page); Studio | `bg-surface-secondary`, `bg-fill-secondary` |
| `surface-quaternary` | neutral-200 `#e5e5e5` | 71 | Contributor page; Design system; Public map; Public map (and the studio's Public map); Public map: updates; Shared (any page); Studio | none in its role (same colour: `card-uv-express-fill`) |
| `surface-inverse` | neutral-900 `#171717` | 7 | Contributor page; Design system; Public map (and the studio's Public map) | none in its role (same colour: `text-primary`, `stroke-dark`) |
| `surface-inverse-secondary` | neutral-700 `#404040` | 3 | Contributor page | none in its role (same colour: `text-secondary`) |
| `surface-error` | red-100 `#ffe2e2` | 5 | Design system; Studio | none in its role (same colour: `direction-end-surface`) |
| `surface-success` | green-100 `#dcfce7` | 1 | Design system | none in its role (same colour: `direction-start-surface`, `special-green-surface`) |
| `surface-transparent` | color-mix(in srgb, var(--color-black) 60%, transparent) | 10 | Contributor page; Design system; Public map (and the studio's Public map); Public map: updates; Studio | none |
| `surface-transparent-inverse` | color-mix(in srgb, var(--color-white) 60%, transparent) | 2 | Design system | none |
| `surface-transparent-secondary` | color-mix(in srgb, var(--color-white) 70%, transparent) | 2 | Design system | none |

### Card: red, green and a trip's ends

| Old token | Colour | Uses | Screens | New token (same colour) |
| --- | --- | --- | --- | --- |
| `card-red-surface` | red-800 `#9f0712` | 37 | Contributor page; Design system; Public map (and the studio's Public map); Shared (any page) | none |
| `card-red-surface-pale` | red-300 `#ffa2a2` | 2 | Design system | none |
| `card-red-border-primary` | red-900 `#82181a` | 3 | Contributor page; Design system | none |
| `card-red-timeline-surface` | red-900 `#82181a` | 3 | Design system | none |
| `card-red-surface-light` | red-400 `#ff6467` | 0 | (unused) | none |
| `card-green-surface-light` | green-500 `#00c950` | 0 | (unused) | none |
| `trip-start` | green-700 `#008236` | 1 | Design system | `direction-start-fill` |
| `trip-end` | red-800 `#9f0712` | 1 | Design system | none |

### Mode cards

| Old token | Colour | Uses | Screens | New token (same colour) |
| --- | --- | --- | --- | --- |
| `card-jeep-surface` | blue-700 `#1447e6` | 12 | Design system; Public map (and the studio's Public map) | none |
| `card-jeep-surface-secondary` | blue-800 `#193cb8` | 6 | Design system; Public map (and the studio's Public map) | `card-jeep-fill` |
| `card-jeep-surface-border` | blue-800 `#193cb8` | 5 | Design system; Public map (and the studio's Public map) | `card-jeep-fill` |
| `card-jeep-on-surface` | white `#ffffff` | 6 | Design system; Public map (and the studio's Public map) | `special-fill` |
| `card-uv-express-surface` | neutral-300 `#d4d4d4` | 10 | Design system; Public map (and the studio's Public map) | none in its role (same colour: `stroke-tertiary`) |
| `card-uv-express-surface-secondary` | neutral-400 `#a1a1a1` | 6 | Design system; Public map (and the studio's Public map) | none in its role (same colour: `text-quaternary`, `stroke-quaternary`) |
| `card-uv-express-surface-border` | neutral-400 `#a1a1a1` | 10 | Design system; Public map (and the studio's Public map) | none in its role (same colour: `text-quaternary`, `stroke-quaternary`) |
| `card-uv-express-on-surface` | neutral-950 `#0a0a0a` | 6 | Design system; Public map (and the studio's Public map) | none |
| `card-ejeep-surface` | neutral-50 `#fafafa` | 10 | Design system; Public map (and the studio's Public map) | none |
| `card-ejeep-surface-secondary` | neutral-300 `#d4d4d4` | 5 | Design system; Public map (and the studio's Public map) | none in its role (same colour: `stroke-tertiary`) |
| `card-ejeep-surface-border` | neutral-300 `#d4d4d4` | 7 | Design system; Public map (and the studio's Public map) | none in its role (same colour: `stroke-tertiary`) |
| `card-ejeep-on-surface` | neutral-800 `#262626` | 6 | Design system; Public map (and the studio's Public map) | none |
| `card-bus-surface` | orange-700 `#ca3500` | 12 | Design system; Public map (and the studio's Public map) | none |
| `card-bus-surface-secondary` | orange-800 `#9f2d00` | 6 | Design system; Public map (and the studio's Public map) | `card-bus-fill`, `special-orange-fill` |
| `card-bus-surface-border` | orange-800 `#9f2d00` | 5 | Design system; Public map (and the studio's Public map) | `card-bus-fill`, `special-orange-fill` |
| `card-bus-on-surface` | neutral-50 `#fafafa` | 15 | Design system; Public map (and the studio's Public map) | none |

### Error, brand, save and delete

| Old token | Colour | Uses | Screens | New token (same colour) |
| --- | --- | --- | --- | --- |
| `error-surface` | red-700 `#c10007` | 4 | Design system | `direction-end-fill` |
| `error-surface-secondary` | red-800 `#9f0712` | 3 | Design system | none |
| `brand-surface` | parabrand-900 `#3b009a` | 45 | Contributor page; Design system; Public map (and the studio's Public map); Public map: locator; Studio | none |
| `brand-surface-secondary` | parabrand-950 `#1c0058` | 5 | Contributor page; Design system | none |
| `brand-border` | parabrand-950 `#1c0058` | 5 | Contributor page; Design system | none |
| `brand-ring-track` | parabrand-100 `#ececff` | 1 | Contributor page | none |
| `save-surface` | green-700 `#008236` | 1 | Contributor page | `direction-start-fill` |
| `save-border` | green-800 `#016630` | 1 | Contributor page | `special-green-fill` |
| `delete-surface` | red-800 `#9f0712` | 1 | Contributor page | none |
| `delete-border` | red-900 `#82181a` | 1 | Contributor page | none |

### Components

| Old token | Colour | Uses | Screens | New token (same colour) |
| --- | --- | --- | --- | --- |
| `components-tooltip-surface` | neutral-900 `#171717` | 4 | Design system | none in its role (same colour: `text-primary`, `stroke-dark`) |

### Map

| Old token | Colour | Uses | Screens | New token (same colour) |
| --- | --- | --- | --- | --- |
| `map-route-line-surface-default` | parabrand-300 `#c1bfff` | 6 | Design system; Public map (and the studio's Public map) | none |
| `map-route-line-surface-selected` | parabrand-800 `#4900be` | 6 | Design system; Public map (and the studio's Public map) | none |
| `map-route-line-arrow-rest` | white `#ffffff` | 2 | Design system | `special-fill` |
| `map-route-line-arrow-inverse` | neutral-900 `#171717` | 4 | Design system; Public map (and the studio's Public map) | none in its role (same colour: `text-primary`, `stroke-dark`) |
| `map-route-line-casing` | neutral-800 `#262626` | 2 | Design system | none |
| `map-route-line-hintuan-surface-default` | green-400 `#05df72` | 2 | Design system | none |
| `map-overlay-card-hintuan-surface` | green-500 `#00c950` | 2 | Design system | none |
| `map-overlay-card-hintuan-content` | green-800 `#016630` | 3 | Design system | `special-green-fill` |
| `map-overlay-card-terminal-surface` | sky-500 `#00a6f4` | 2 | Design system | none |
| `map-overlay-card-terminal-border` | sky-800 `#00598a` | 1 | Design system | none |
| `map-overlay-card-terminal-content` | sky-800 `#00598a` | 2 | Design system | none |
| `map-hotspots-card-hintuan-surface` | green-700 `#008236` | 23 | Design system; Public map (and the studio's Public map); Studio | `direction-start-fill` |
| `map-hotspots-card-hintuan-border-primary` | green-900 `#0d542b` | 2 | Design system; Public map (and the studio's Public map) | none |
| `map-hotspots-card-terminal-surface` | sky-700 `#0069a8` | 4 | Design system; Public map (and the studio's Public map); Studio | none |
| `map-pin-terminal-surface` | blue-700 `#1447e6` | 2 | Design system | none |
| `map-pin-hintuan-surface` | green-700 `#008236` | 2 | Design system | `direction-start-fill` |
| `map-locator-indicator-overlay-surface` | parabrand-500 `#8b7aff` | 4 | Design system; Public map: locator | none |
| `map-locator-indicator-overlay-border` | parabrand-800 `#4900be` | 3 | Design system; Public map: locator | none |
| `map-trail-papunta` | blue-700 `#1447e6` | 0 | (unused) | none |
| `map-trail-pabalik` | orange-700 `#ca3500` | 0 | (unused) | none |
| `map-trail-lakad` | blue-700 `#1447e6` | 1 | Design system | none |
| `map-trail-sakay` | green-700 `#008236` | 1 | Design system | `direction-start-fill` |
| `map-trail-mark` | purple-700 `#8200db` | 0 | (unused) | none |
| `map-trail-flag` | red-800 `#9f0712` | 0 | (unused) | none |
| `map-rail-light-rail-way-one-surface` | light-rail-way-one-600 `#1d7739` | 10 | Design system; Public map (and the studio's Public map) | `card-lrt-one-fill` |
| `map-rail-light-rail-way-one-surface-pale` | light-rail-way-one-200 `#b7f5ca` | 3 | Design system; Public map (and the studio's Public map) | none |
| `map-rail-light-rail-way-two-surface` | light-rail-way-two-600 `#4a3a6b` | 10 | Design system; Public map (and the studio's Public map) | `card-lrt-two-fill` |
| `map-rail-light-rail-way-two-surface-pale` | light-rail-way-two-200 `#d0b9ff` | 3 | Design system; Public map (and the studio's Public map) | none |
| `map-rail-metro-rail-way-three-surface` | metro-rail-way-three-600 `#edc319` | 11 | Design system; Public map (and the studio's Public map) | `card-mrt-three-fill` |
| `map-ferry-surface` | ferry-600 `#003399` | 10 | Design system; Public map (and the studio's Public map) | `card-ferry-fill` |
| `map-ferry-surface-pale` | ferry-200 `#bccfff` | 3 | Design system; Public map (and the studio's Public map) | none |
| `map-ferry-border-primary` | ferry-700 `#002a80` | 3 | Design system; Public map (and the studio's Public map) | none |
| `map-ferry-timeline-surface` | ferry-800 `#002366` | 5 | Design system; Public map (and the studio's Public map) | none |

## Every use, file by file

Line numbers are as of the commit above.

<details><summary><code>content-primary</code>: 159 uses in 107 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:20,29,39,57,63,75,83,573,576,579,582,585,591,594`
- `src/design-system/primitives/button-link.stories.tsx:80`
- `src/design-system/primitives/button-look.ts:35,41,45`
- `src/design-system/primitives/button.stories.tsx:31`
- `src/design-system/primitives/field-frame.tsx:37,40`
- `src/design-system/primitives/icon-button.tsx:60`
- `src/design-system/primitives/location-icon.stories.tsx:13`
- `src/design-system/primitives/otp-field.tsx:48,49,50,52,124`
- `src/design-system/primitives/switch.stories.tsx:68`
- `src/features/contribute/account/account-page.tsx:85`
- `src/features/contribute/account/account-screen.tsx:65`
- `src/features/contribute/account/account-settings-screen.tsx:86`
- `src/features/contribute/account/change-password-screen.tsx:80`
- `src/features/contribute/account/commute-stats.tsx:50,136`
- `src/features/contribute/account/delete-account-screen.tsx:60`
- `src/features/contribute/account/general-bar.tsx:30`
- `src/features/contribute/account/hand-question.tsx:65`
- `src/features/contribute/account/profile-card.tsx:48`
- `src/features/contribute/account/thank-you-screen.tsx:18`
- `src/features/contribute/account/vehicle-grid.tsx:71`
- `src/features/contribute/app-update/app-update-notice.tsx:14`
- `src/features/contribute/consent/consent-panel.tsx:71,98`
- `src/features/contribute/consent/earlier-recordings-panel.tsx:22`
- `src/features/contribute/history/history-card.tsx:57`
- `src/features/contribute/history/history-screen.tsx:51`
- `src/features/contribute/history/ride-detail-screen.tsx:68`
- `src/features/contribute/history/ride-summary-preview.tsx:91`
- `src/features/contribute/map/map-frost.stories.tsx:34`
- `src/features/contribute/native/keep-recording-panel.tsx:26`
- `src/features/contribute/native/location-off-panel.tsx:20`
- `src/features/contribute/native/permission-panel.tsx:21`
- `src/features/contribute/native/permissions-screen.tsx:82`
- `src/features/contribute/native/refused-panel.tsx:27`
- `src/features/contribute/native/start-gate.tsx:28`
- `src/features/contribute/screens/recording-card.tsx:44,64,95`
- `src/features/contribute/screens/ride-field.tsx:55`
- `src/features/contribute/screens/ride-sheet.tsx:103,131`
- `src/features/contribute/screens/save-form.tsx:117`
- `src/features/contribute/screens/screen-unavailable.tsx:36`
- `src/features/contribute/screens/stop-recording-screen.tsx:75,115`
- `src/features/contribute/screens/tracking-button.tsx:38`
- `src/features/contribute/screens/unfinished-screen.tsx:50`
- `src/features/contribute/stop-notes/card-button.tsx:15`
- `src/features/contribute/stop-notes/stop-note-card.tsx:66`
- `src/features/contribute/stop-notes/stop-note-editor.tsx:54,81`
- `src/features/contribute/stop-notes/stop-note-pill.tsx:77,82`
- `src/features/contribute/stop-notes/stop-note-row.tsx:107`
- `src/features/contribute/stop-notes/stop-notes-entry.tsx:24`
- `src/features/contribute/stop-notes/stop-notes-screen.tsx:37`
- `src/features/contribute/toolbar/bottom-toolbar.tsx:126`
- `src/features/contribute/tutorial/coachmark.tsx:117`
- `src/features/contribute/tutorial/track-routes-card.tsx:39`
- `src/features/contribute/uploads/upload-check.tsx:14`
- `src/features/locator/locator-button.tsx:72`
- `src/features/published-map/install-prompt.tsx:78`
- `src/features/routes/cards/hintuan-card-counter.tsx:29`
- `src/features/routes/cards/hintuan-card-header.tsx:31`
- `src/features/routes/cards/livery-card.ts:70`
- `src/features/routes/cards/mode-filter-card.tsx:59`
- `src/features/routes/cards/mode-filter-empty.tsx:20`
- `src/features/routes/cards/route-end-point-bar.tsx:46`
- `src/features/routes/cards/route-list-controller.tsx:131`
- `src/features/routes/cards/route-list-hotspot-rows.tsx:27`
- `src/features/routes/cards/vehicle-icon.stories.tsx:13`
- `src/features/routes/map/credits-button.tsx:23`
- `src/features/routes/map/landmark-pin.stories.tsx:115`
- `src/features/routes/map/landmark-pin.tsx:28`
- `src/features/routes/map/map-data-source-sheet.tsx:129,163`
- `src/features/routes/map/map-style-button.tsx:48`
- `src/features/routes/map/map-style-switch-row.tsx:24`
- `src/features/routes/map/map-style.tsx:107,160`
- `src/features/routes/search/place-search-results.tsx:59,82`
- `src/features/routes/search/routes-near-here.tsx:61,88`
- `src/features/studio/auth/auth-card.tsx:52`
- `src/features/studio/auth/auth-dialog.tsx:14`
- `src/features/studio/contributors/actions/contribution-hint.tsx:18,22,29`
- `src/features/studio/contributors/actions/ride-list.tsx:30`
- `src/features/studio/contributors/actions/use-part.tsx:38,51`
- `src/features/studio/contributors/contribution-details.tsx:60,63`
- `src/features/studio/contributors/contribution-list.tsx:29,33`
- `src/features/studio/contributors/contributors-view.tsx:21,68,102`
- `src/features/studio/contributors/delete-upload.tsx:45`
- `src/features/studio/drawing/draw-toolbar-look.ts:17`
- `src/features/studio/drawing/snap-draw.tsx:43`
- `src/features/studio/maps/draft-markers.tsx:25`
- `src/features/studio/maps/held-draft-sheet.tsx:59`
- `src/features/studio/maps/map-placeholder.tsx:31,33`
- `src/features/studio/maps/map-switch.tsx:65,90`
- `src/features/studio/maps/subject-status-view.tsx:81`
- `src/features/studio/panels/draft-badge.stories.tsx:27`
- `src/features/studio/panels/hotspot-card.tsx:117`
- `src/features/studio/panels/hotspot-panel.tsx:208`
- `src/features/studio/panels/line-detail.tsx:61`
- `src/features/studio/panels/new-menu.tsx:108`
- `src/features/studio/panels/route-facts.tsx:55,61,65`
- `src/features/studio/panels/route-line.tsx:103`
- `src/features/studio/panels/save-panel.tsx:120`
- `src/features/studio/panels/save-timeline.tsx:29`
- `src/features/studio/panels/signboard-editor.tsx:135`
- `src/shared/ui/bottom-sheet.stories.tsx:19,51,290,303,309,392`
- `src/shared/ui/error-boundary.stories.tsx:9,10`
- `src/shared/ui/page-error-screen.tsx:25`
- `src/shared/ui/route-icons.stories.tsx:14`
- `src/shared/ui/sheet-header.stories.tsx:22,47`
- `src/shared/ui/toast-host.stories.tsx:309`
- `src/shared/ui/toast.tsx:50,126,147`
- `src/shared/ui/turnstile.tsx:152`

</details>

<details><summary><code>content-secondary</code>: 43 uses in 33 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:84`
- `src/features/contribute/account/commute-stats.tsx:241`
- `src/features/contribute/screens/tracking-button.tsx:38`
- `src/features/contribute/tutorial/coachmark.tsx:120`
- `src/features/routes/cards/trip-card.stories.tsx:353`
- `src/features/routes/search/place-search-results.tsx:74,77`
- `src/features/routes/search/place-search.tsx:133`
- `src/features/routes/search/routes-near-here.tsx:64,74,80,92`
- `src/features/routes/search/search-row-content.tsx:21,26,37,47`
- `src/features/studio/auth/auth-card.tsx:55`
- `src/features/studio/contributors/actions/contribution-hint.tsx:18`
- `src/features/studio/contributors/actions/hinto-list.stories.tsx:13`
- `src/features/studio/contributors/actions/phone-block.stories.tsx:25,68`
- `src/features/studio/contributors/actions/phone-block.tsx:76`
- `src/features/studio/contributors/actions/ride-list.stories.tsx:21`
- `src/features/studio/contributors/actions/use-part.tsx:36`
- `src/features/studio/contributors/actions/use-this-line.stories.tsx:25`
- `src/features/studio/contributors/actions/use-this-line.tsx:20`
- `src/features/studio/contributors/contribution-details.tsx:58`
- `src/features/studio/contributors/contribution-list.tsx:37`
- `src/features/studio/contributors/contributors-view.tsx:91,176`
- `src/features/studio/contributors/delete-upload.stories.tsx:16`
- `src/features/studio/contributors/hide-upload.stories.tsx:21`
- `src/features/studio/maps/map-placeholder.tsx:31`
- `src/features/studio/maps/subject-status-view.tsx:40,44`
- `src/features/studio/panels/draft-alert.tsx:26`
- `src/features/studio/panels/draft-lock-notice.tsx:29`
- `src/features/studio/panels/route-line.tsx:53`
- `src/features/studio/public-view/waiting-list.tsx:34`
- `src/shared/ui/bottom-sheet.stories.tsx:52`
- `src/shared/ui/sheet-header.stories.tsx:23`
- `src/shared/ui/toast.tsx:148`
- `src/shared/ui/turnstile.tsx:63`

</details>

<details><summary><code>content-tertiary</code>: 52 uses in 34 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:76,85`
- `src/design-system/primitives/button.stories.tsx:189`
- `src/design-system/primitives/switch.stories.tsx:75`
- `src/features/contribute/account/account-page.tsx:74,117`
- `src/features/contribute/account/new-password-field.tsx:26`
- `src/features/contribute/account/profile-card.tsx:31,50`
- `src/features/contribute/account/thank-you-screen.tsx:33`
- `src/features/contribute/account/verify-code-screen.tsx:109`
- `src/features/contribute/history/card-meta.tsx:51,63,73`
- `src/features/contribute/history/ride-detail-body.tsx:88`
- `src/features/contribute/native/permissions-screen.tsx:109`
- `src/features/contribute/screens/screen-unavailable.tsx:46`
- `src/features/contribute/stop-notes/stop-map-popup.tsx:93`
- `src/features/contribute/stop-notes/stop-note-card.tsx:72`
- `src/features/contribute/stop-notes/stop-note-pill.tsx:83`
- `src/features/contribute/tutorial/coachmark.tsx:125`
- `src/features/contribute/tutorial/track-routes-card.tsx:43`
- `src/features/locator/last-known-mark.tsx:20`
- `src/features/locator/locator-button.tsx:105`
- `src/features/locator/locator-indicator-overlay.stories.tsx:94,148,176,212,240`
- `src/features/published-map/install-prompt.tsx:81`
- `src/features/routes/cards/switch-icon.stories.tsx:12`
- `src/features/routes/map/map-data-source-sheet.tsx:168`
- `src/features/routes/search/place-search-results.tsx:65,89`
- `src/features/routes/search/routes-near-here.tsx:96`
- `src/features/studio/auth/reset-password-card.tsx:73`
- `src/features/studio/drawing/draw-toolbar.tsx:102,108`
- `src/features/studio/maps/map-switch.tsx:90`
- `src/features/studio/maps/subject-status-view.tsx:72,82`
- `src/features/studio/panels/hotspot-card.tsx:134,185`
- `src/features/studio/panels/new-menu.tsx:110`
- `src/features/studio/panels/route-export-panel.tsx:79`
- `src/features/studio/panels/route-facts.tsx:41,54,60,64,70`
- `src/features/studio/panels/signboard-editor.tsx:88,110`

</details>

<details><summary><code>content-quaternary</code>: 52 uses in 37 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:21,44,58,86,588`
- `src/design-system/primitives/field-frame.tsx:69`
- `src/design-system/primitives/phone-field.tsx:46`
- `src/features/contribute/account/account-settings-screen.tsx:103,125`
- `src/features/contribute/account/app-setting-row.tsx:19`
- `src/features/contribute/account/commute-stats.tsx:62,116`
- `src/features/contribute/account/general-bar.tsx:61`
- `src/features/contribute/account/hand-question.tsx:81`
- `src/features/contribute/account/password-button-field.tsx:15`
- `src/features/contribute/account/verify-code-screen.tsx:95`
- `src/features/contribute/consent/consent-panel.tsx:89`
- `src/features/contribute/history/card-status-line.tsx:23`
- `src/features/contribute/history/history-load-line.tsx:13`
- `src/features/contribute/history/history-screen.tsx:77`
- `src/features/contribute/history/ride-detail-body.tsx:59`
- `src/features/contribute/history/ride-header.tsx:15`
- `src/features/contribute/history/ride-summary-preview.tsx:125`
- `src/features/contribute/screens/recording-card.tsx:51,65`
- `src/features/contribute/screens/stop-recording-screen.tsx:78,114,116`
- `src/features/contribute/stop-notes/stop-note-row.tsx:72`
- `src/features/contribute/stop-notes/stop-notes-entry.tsx:30,33`
- `src/features/contribute/stop-notes/stop-notes-screen.tsx:62`
- `src/features/contribute/toolbar/bottom-toolbar.tsx:139`
- `src/features/routes/cards/route-list-hotspot-rows.tsx:30`
- `src/features/routes/map/map-data-source-sheet.tsx:183`
- `src/features/studio/contributors/contribution-list.tsx:41`
- `src/features/studio/contributors/contributors-view.tsx:210`
- `src/features/studio/drawing/draw-toolbar.tsx:144`
- `src/features/studio/panels/draft-signboards-notice.tsx:18`
- `src/features/studio/panels/hotspot-card.tsx:142`
- `src/features/studio/panels/hotspot-panel.tsx:213,276`
- `src/features/studio/panels/line-detail.tsx:22,89,90`
- `src/features/studio/panels/route-facts.tsx:71`
- `src/features/studio/panels/save-panel.tsx:125,212`
- `src/features/studio/panels/save-timeline.tsx:33`
- `src/features/studio/panels/signboard-editor.tsx:128,139`
- `src/shared/ui/page-error-screen.tsx:29`

</details>

<details><summary><code>content-disabled</code>: 27 uses in 17 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:87`
- `src/design-system/primitives/field-frame.tsx:41,100`
- `src/design-system/primitives/otp-field.tsx:53`
- `src/design-system/primitives/text-field.stories.tsx:98`
- `src/features/contribute/account/commute-stats.tsx:135`
- `src/features/contribute/account/vehicle-grid.tsx:65`
- `src/features/contribute/screens/recording-card.tsx:49,50,63`
- `src/features/contribute/screens/ride-field.tsx:55`
- `src/features/contribute/screens/stop-recording-screen.tsx:91`
- `src/features/contribute/stop-notes/stop-note-card.tsx:66,68`
- `src/features/contribute/stop-notes/stop-note-editor.tsx:54`
- `src/features/contribute/stop-notes/stop-note-row.tsx:107`
- `src/features/locator/last-known-mark.tsx:18`
- `src/features/studio/panels/hotspot-panel.tsx:221,239,254`
- `src/features/studio/panels/new-place-form.tsx:93,108`
- `src/features/studio/panels/route-line.tsx:89,91,93,97`
- `src/features/studio/panels/via-field.tsx:29`

</details>

<details><summary><code>content-inverse</code>: 43 uses in 26 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:95`
- `src/design-system/primitives/button-look.ts:53,76`
- `src/design-system/primitives/button.stories.tsx:16,23,27,33`
- `src/design-system/primitives/icon-button.tsx:66`
- `src/design-system/primitives/tooltip.tsx:36`
- `src/features/contribute/screens/start-bar.tsx:22`
- `src/features/contribute/screens/tracking-button.tsx:103`
- `src/features/contribute/stop-notes/card-button.tsx:16,17`
- `src/features/contribute/stop-notes/stop-map-popup.tsx:86`
- `src/features/contribute/stop-notes/stop-notes-button.tsx:38`
- `src/features/contribute/stop-notes/stop-timeline-rail.tsx:25`
- `src/features/published-map/notices.tsx:30`
- `src/features/routes/cards/end-sign.tsx:28`
- `src/features/routes/cards/hintuan-card-box.tsx:48`
- `src/features/routes/cards/livery-card.ts:68,69,71`
- `src/features/routes/cards/timeline-dot.tsx:22,28`
- `src/features/routes/map/livery-line.ts:118,119,121,122`
- `src/features/routes/map/route-line-endings-label.stories.tsx:85,88,134`
- `src/features/routes/map/route-line-endings-label.tsx:58`
- `src/features/routes/map/route-line-label.stories.tsx:96,100,135,154`
- `src/features/routes/map/route-line-label.tsx:54`
- `src/features/studio/drawing/draw-toolbar.tsx:131`
- `src/features/studio/maps/map-switch.tsx:90`
- `src/features/studio/panels/hotspot-card.tsx:159`
- `src/features/studio/panels/route-line.tsx:92,98`
- `src/shared/ui/route-icons.stories.tsx:15`

</details>

<details><summary><code>content-inverse-secondary</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:96,97`

</details>

<details><summary><code>content-error</code>: 25 uses in 23 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:88`
- `src/design-system/primitives/button-look.ts:36`
- `src/design-system/primitives/field-error.tsx:12`
- `src/design-system/primitives/location-icon.stories.tsx:16`
- `src/design-system/primitives/switch.stories.tsx:75`
- `src/features/contribute/account/account-page.tsx:138`
- `src/features/contribute/account/account-screen.tsx:97`
- `src/features/contribute/account/general-bar.tsx:31`
- `src/features/contribute/account/hand-question.tsx:86`
- `src/features/contribute/account/save-changes-sheet.tsx:28`
- `src/features/contribute/history/card-status-line.tsx:24`
- `src/features/contribute/native/permissions-screen.tsx:109,130`
- `src/features/contribute/screens/discard-recording-button.tsx:19`
- `src/features/studio/drawing/draw-toolbar.tsx:112`
- `src/features/studio/maps/subject-status-view.tsx:53`
- `src/features/studio/panels/draft-alert.tsx:34`
- `src/features/studio/panels/draft-lock-notice.tsx:45`
- `src/features/studio/panels/draft-signboards-notice.tsx:24`
- `src/features/studio/panels/hotspot-panel.tsx:271`
- `src/features/studio/panels/route-export-panel.tsx:94`
- `src/features/studio/panels/save-panel.tsx:206`
- `src/features/studio/panels/signboard-editor.tsx:120,153`
- `src/shared/ui/toast.tsx:51`

</details>

<details><summary><code>content-success</code>: 5 uses in 5 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:89`
- `src/features/contribute/history/card-status-line.tsx:21`
- `src/features/contribute/history/history-card.tsx:89`
- `src/features/contribute/notices/note-added.tsx:12`
- `src/features/studio/panels/line-detail.tsx:21`

</details>

<details><summary><code>content-warning</code>: 5 uses in 4 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:90,91`
- `src/features/contribute/history/card-status-line.tsx:22`
- `src/features/studio/panels/draft-badge.tsx:7`
- `src/features/studio/panels/line-detail.tsx:20`

</details>

<details><summary><code>border-primary</code>: 25 uses in 16 files</summary>

- `src/app/studio/workshop.tsx:245`
- `src/design-system/foundation/tokens.stories.tsx:17,82,104,106,451,459,572`
- `src/features/contribute/account/vehicle-grid.tsx:60`
- `src/features/routes/cards/route-list-hotspot-rows.tsx:18,20`
- `src/features/routes/map/map-data-source-sheet.tsx:142`
- `src/features/studio/contributors/actions/phone-block.tsx:110`
- `src/features/studio/contributors/contribution-list.tsx:21`
- `src/features/studio/contributors/contributors-view.tsx:67`
- `src/features/studio/contributors/delete-upload.tsx:43`
- `src/features/studio/contributors/hide-upload.tsx:62`
- `src/features/studio/maps/draft-markers.tsx:25`
- `src/features/studio/panels/sheet.ts:23,31`
- `src/features/studio/panels/signboard-editor.tsx:135`
- `src/features/studio/public-view/public-view-content.tsx:22,39`
- `src/features/studio/public-view/waiting-list.tsx:45`
- `src/shared/ui/bottom-sheet.stories.tsx:19`

</details>

<details><summary><code>border-secondary</code>: 8 uses in 5 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:109,111`
- `src/design-system/primitives/switch.tsx:53,55,59`
- `src/features/contribute/screens/ride-sheet.tsx:162`
- `src/features/contribute/stop-notes/card-button.tsx:15`
- `src/features/contribute/stop-notes/stop-notes-entry.tsx:24`

</details>

<details><summary><code>border-tertiary</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:114,116`

</details>

<details><summary><code>border-error</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:119,121`

</details>

<details><summary><code>border-plain</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:124,126`

</details>

<details><summary><code>surface</code>: 170 uses in 135 files</summary>

- `src/app/public-map/place-search-bar.tsx:76`
- `src/app/studio/studio-app.tsx:52`
- `src/app/studio/workshop.tsx:245`
- `src/design-system/foundation/tokens.stories.tsx:74,82,104,109,114,119,131,287,451,459,559,563,572`
- `src/design-system/primitives/button.stories.tsx:188`
- `src/design-system/primitives/otp-field.stories.tsx:30,191`
- `src/design-system/primitives/password-field.stories.tsx:21`
- `src/design-system/primitives/phone-field.stories.tsx:21,83`
- `src/design-system/primitives/select-field.stories.tsx:22`
- `src/design-system/primitives/switch.stories.tsx:50`
- `src/design-system/primitives/switch.tsx:99`
- `src/design-system/primitives/text-area-field.stories.tsx:21`
- `src/design-system/primitives/text-field.stories.tsx:28`
- `src/features/contribute/account/account-page.tsx:85`
- `src/features/contribute/account/account-screen.tsx:65,108`
- `src/features/contribute/account/account-settings-screen.tsx:86`
- `src/features/contribute/account/change-password-screen.tsx:80`
- `src/features/contribute/account/commute-stats.stories.tsx:52`
- `src/features/contribute/account/commute-stats.tsx:79,89,112,155,161,180`
- `src/features/contribute/account/delete-account-screen.tsx:60`
- `src/features/contribute/account/general-bar.stories.tsx:12`
- `src/features/contribute/account/hand-question.tsx:65`
- `src/features/contribute/account/logout-confirm.stories.tsx:14`
- `src/features/contribute/account/profile-card.stories.tsx:11`
- `src/features/contribute/account/profile-card.tsx:25`
- `src/features/contribute/account/save-changes-sheet.tsx:26`
- `src/features/contribute/account/thank-you-screen.tsx:18`
- `src/features/contribute/account/vehicle-grid.stories.tsx:13`
- `src/features/contribute/account/vehicle-grid.tsx:51`
- `src/features/contribute/app-update/app-update-notice.tsx:14`
- `src/features/contribute/common/skeleton.stories.tsx:11`
- `src/features/contribute/common/skeleton.tsx:30`
- `src/features/contribute/consent/consent-panel.tsx:71`
- `src/features/contribute/consent/earlier-recordings-panel.tsx:22`
- `src/features/contribute/contribute-page.tsx:341`
- `src/features/contribute/history/history-card.stories.tsx:86`
- `src/features/contribute/history/history-card.tsx:57`
- `src/features/contribute/history/history-screen.tsx:51,55,109`
- `src/features/contribute/history/history-skeleton.tsx:31`
- `src/features/contribute/history/ride-summary-preview.tsx:91`
- `src/features/contribute/map/map-frost.stories.tsx:28,34`
- `src/features/contribute/map/map-frost.tsx:58`
- `src/features/contribute/native/keep-recording-panel.tsx:26`
- `src/features/contribute/native/location-off-panel.tsx:20`
- `src/features/contribute/native/permission-panel.tsx:21`
- `src/features/contribute/native/permissions-screen.tsx:48,82`
- `src/features/contribute/native/refused-panel.tsx:27`
- `src/features/contribute/native/start-gate.tsx:28`
- `src/features/contribute/screens/ready-screen.tsx:121`
- `src/features/contribute/screens/recording-card.tsx:79`
- `src/features/contribute/screens/ride-sheet.tsx:100`
- `src/features/contribute/screens/save-form.tsx:117,181`
- `src/features/contribute/screens/screen-unavailable.tsx:36`
- `src/features/contribute/screens/stop-recording-screen.tsx:64`
- `src/features/contribute/screens/unfinished-screen.tsx:50`
- `src/features/contribute/stop-notes/card-button.tsx:15`
- `src/features/contribute/stop-notes/stop-map-popup.stories.tsx:39`
- `src/features/contribute/stop-notes/stop-map-popup.tsx:79`
- `src/features/contribute/stop-notes/stop-note-card.tsx:52`
- `src/features/contribute/stop-notes/stop-note-pill.tsx:60`
- `src/features/contribute/stop-notes/stop-notes-entry.stories.tsx:12`
- `src/features/contribute/stop-notes/stop-notes-screen.tsx:37`
- `src/features/contribute/toolbar/bottom-toolbar.tsx:66`
- `src/features/contribute/tutorial/coachmark.tsx:95,109`
- `src/features/contribute/tutorial/track-routes-card.tsx:27`
- `src/features/contribute/uploads/upload-check.tsx:14`
- `src/features/locator/last-known-mark.tsx:17,20`
- `src/features/locator/locator-button.tsx:78`
- `src/features/locator/locator-indicator-overlay.tsx:118,129,130`
- `src/features/locator/locator.css:163`
- `src/features/published-map/install-prompt.tsx:68`
- `src/features/routes/cards/hintuan-card-counter.tsx:28`
- `src/features/routes/cards/hintuan-card-header.tsx:20`
- `src/features/routes/cards/mode-filter-card.tsx:59`
- `src/features/routes/cards/mode-filter-empty.stories.tsx:12`
- `src/features/routes/cards/route-end-point-bar.stories.tsx:23`
- `src/features/routes/cards/route-list-controller.stories.tsx:54`
- `src/features/routes/cards/route-list-controller.tsx:97`
- `src/features/routes/cards/switch-icon.stories.tsx:12`
- `src/features/routes/map/map-data-source-sheet.tsx:126`
- `src/features/routes/map/map-style.tsx:102`
- `src/features/routes/search/place-search-results.tsx:39`
- `src/features/routes/search/place-search.stories.tsx:412`
- `src/features/routes/search/place-search.tsx:133`
- `src/features/routes/search/routes-near-here.tsx:57`
- `src/features/studio/auth/auth-dialog.tsx:14`
- `src/features/studio/auth/reset-password-card.stories.tsx:23`
- `src/features/studio/auth/sign-in-card.stories.tsx:38`
- `src/features/studio/contributors/actions/contribution-hint.tsx:18`
- `src/features/studio/contributors/actions/hinto-list.stories.tsx:13`
- `src/features/studio/contributors/actions/phone-block.stories.tsx:25,68`
- `src/features/studio/contributors/actions/ride-list.stories.tsx:21`
- `src/features/studio/contributors/actions/use-this-line.stories.tsx:25`
- `src/features/studio/contributors/contribution-details.stories.tsx:27`
- `src/features/studio/contributors/contribution-list.stories.tsx:13`
- `src/features/studio/contributors/contributors-view.tsx:21`
- `src/features/studio/contributors/delete-upload.stories.tsx:16`
- `src/features/studio/contributors/hide-upload.stories.tsx:21`
- `src/features/studio/drawing/draw-toolbar-look.ts:5`
- `src/features/studio/drawing/use-connect-hint.stories.tsx:22`
- `src/features/studio/drawing/use-connect-hint.ts:46`
- `src/features/studio/maps/draft-markers.tsx:25`
- `src/features/studio/maps/held-draft-sheet.tsx:52`
- `src/features/studio/maps/map-placeholder.tsx:31`
- `src/features/studio/maps/search-mark.tsx:20`
- `src/features/studio/maps/studio-search.tsx:95`
- `src/features/studio/maps/subject-status-view.tsx:107`
- `src/features/studio/panels/card-actions.stories.tsx:17,22`
- `src/features/studio/panels/draft-alert.stories.tsx:16`
- `src/features/studio/panels/draft-badge.stories.tsx:26`
- `src/features/studio/panels/draft-signboards-notice.stories.tsx:12`
- `src/features/studio/panels/ikot-name-field.stories.tsx:13`
- `src/features/studio/panels/line-detail.stories.tsx:14`
- `src/features/studio/panels/loop-toggle.stories.tsx:11`
- `src/features/studio/panels/mode-field.stories.tsx:12`
- `src/features/studio/panels/new-menu.tsx:93`
- `src/features/studio/panels/place-picker.stories.tsx:24`
- `src/features/studio/panels/route-export-panel.stories.tsx:73`
- `src/features/studio/panels/route-facts.stories.tsx:50`
- `src/features/studio/panels/route-line.stories.tsx:36`
- `src/features/studio/panels/route-line.tsx:53`
- `src/features/studio/panels/save-footer.stories.tsx:12`
- `src/features/studio/panels/save-notices.stories.tsx:52`
- `src/features/studio/panels/save-timeline.stories.tsx:20`
- `src/features/studio/panels/sheet.ts:18,24,31,38`
- `src/features/studio/panels/signboard-editor.stories.tsx:66`
- `src/features/studio/panels/trip-card-extras.stories.tsx:77`
- `src/features/studio/public-view/public-view-content.tsx:20`
- `src/shared/ui/bottom-sheet.tsx:312`
- `src/shared/ui/page-error-screen.tsx:20`
- `src/shared/ui/route-icons.stories.tsx:14`
- `src/shared/ui/sheet-header.stories.tsx:12`
- `src/shared/ui/toast-host.stories.tsx:309`
- `src/shared/ui/toast.tsx:119,138`
- `src/shared/ui/turnstile.stories.tsx:13`

</details>

<details><summary><code>surface-secondary</code>: 66 uses in 54 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:60,132`
- `src/design-system/primitives/field-frame.tsx:37`
- `src/design-system/primitives/otp-field.tsx:48,49`
- `src/features/contribute/account/account-screen.stories.tsx:113`
- `src/features/contribute/account/create-account-screen.stories.tsx:20,76`
- `src/features/contribute/account/forgot-password-screen.stories.tsx:20,73`
- `src/features/contribute/account/new-password-screen.stories.tsx:13,70`
- `src/features/contribute/account/profile-step-screen.stories.tsx:12,46`
- `src/features/contribute/account/sign-in-screen.stories.tsx:20,58`
- `src/features/contribute/account/thank-you-screen.stories.tsx:12,37`
- `src/features/contribute/account/verify-code-screen.stories.tsx:25,190`
- `src/features/contribute/app-update/app-update-notice.stories.tsx:14`
- `src/features/contribute/consent/consent-panel.stories.tsx:12,29`
- `src/features/contribute/consent/earlier-recordings-panel.stories.tsx:12`
- `src/features/contribute/contribute-page.tsx:288`
- `src/features/contribute/history/card-picture.tsx:18`
- `src/features/contribute/history/ride-summary-preview.tsx:103`
- `src/features/contribute/map/map-frost.stories.tsx:21`
- `src/features/contribute/native/keep-recording-panel.stories.tsx:12`
- `src/features/contribute/native/location-off-panel.stories.tsx:12`
- `src/features/contribute/native/permission-panel.stories.tsx:12`
- `src/features/contribute/native/refused-panel.stories.tsx:17`
- `src/features/contribute/notices/page-toasts.stories.tsx:24`
- `src/features/contribute/screens/recording-screen.stories.tsx:28`
- `src/features/contribute/screens/recording-tint.stories.tsx:11`
- `src/features/contribute/screens/ride-sheet.tsx:131`
- `src/features/contribute/stop-notes/note-box.ts:2`
- `src/features/contribute/stop-notes/stop-note-editor.tsx:81`
- `src/features/contribute/stop-notes/stop-notes-entry.tsx:24`
- `src/features/contribute/stop-notes/stop-notes-title.tsx:25`
- `src/features/contribute/tutorial/coachmark.stories.tsx:29`
- `src/features/locator/last-known-mark.stories.tsx:15`
- `src/features/routes/cards/mode-filter-card.tsx:66`
- `src/features/routes/cards/route-list-hotspot-rows.tsx:25`
- `src/features/routes/map/credits-button.stories.tsx:12`
- `src/features/routes/map/map-credits-dock.stories.tsx:15`
- `src/features/routes/map/map-failure.stories.tsx:12`
- `src/features/routes/map/map-style-switch-row.tsx:20`
- `src/features/routes/map/map-style.tsx:154`
- `src/features/routes/map/map-view.tsx:502`
- `src/features/routes/search/place-search-results.tsx:60`
- `src/features/routes/search/search-row-content.tsx:21`
- `src/features/studio/contributors/contribution-list.tsx:30`
- `src/features/studio/drawing/draw-toolbar-look.ts:13,17`
- `src/features/studio/drawing/snap-draw.tsx:43`
- `src/features/studio/maps/map-placeholder.tsx:28`
- `src/features/studio/maps/map-switch.tsx:83`
- `src/features/studio/panels/hotspot-card.tsx:185`
- `src/features/studio/panels/new-menu.tsx:102`
- `src/features/studio/panels/route-facts.tsx:40`
- `src/features/studio/panels/signboard-editor.tsx:97,135`
- `src/shared/ui/standing-toasts.stories.tsx:55`
- `src/shared/ui/toast-host.stories.tsx:84`
- `src/shared/ui/toast.stories.tsx:15`

</details>

<details><summary><code>surface-tertiary</code>: 31 uses in 24 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:133,504,509`
- `src/design-system/primitives/button-look.ts:41,45`
- `src/design-system/primitives/field-frame.tsx:41`
- `src/design-system/primitives/icon-button.tsx:60`
- `src/design-system/primitives/otp-field.tsx:53`
- `src/design-system/primitives/tooltip.stories.tsx:47`
- `src/features/contribute/account/commute-stats.tsx:215`
- `src/features/contribute/account/profile-card.tsx:27`
- `src/features/contribute/common/skeleton.tsx:24`
- `src/features/contribute/screens/recording-card.tsx:38`
- `src/features/contribute/toolbar/bottom-toolbar.tsx:72`
- `src/features/locator/locator-button.tsx:64`
- `src/features/routes/cards/destination-row.stories.tsx:132`
- `src/features/routes/cards/destination-row.tsx:31`
- `src/features/routes/cards/route-end-point-bar.stories.tsx:47`
- `src/features/routes/cards/route-end-point-bar.tsx:46`
- `src/features/routes/cards/route-list-controller.stories.tsx:105`
- `src/features/routes/map/map-style-button.tsx:48`
- `src/features/routes/search/place-search.stories.tsx:123,411`
- `src/features/studio/maps/map-switch.tsx:90`
- `src/features/studio/maps/studio-search.stories.tsx:144`
- `src/features/studio/panels/route-line.tsx:33,43`
- `src/features/studio/panels/signboard-editor.tsx:110`
- `src/shared/ui/bottom-sheet.stories.tsx:303,309,392`

</details>

<details><summary><code>surface-quaternary</code>: 71 uses in 54 files</summary>

- `src/app/public-map/page-toasts.stories.tsx:33`
- `src/design-system/foundation/tokens.stories.tsx:124,135,137,514`
- `src/design-system/primitives/button-look.ts:43,47`
- `src/design-system/primitives/icon-button.tsx:62`
- `src/design-system/primitives/switch.tsx:47,49`
- `src/features/contribute/history/ride-detail-screen.stories.tsx:55`
- `src/features/contribute/history/ride-summary-preview.stories.tsx:51`
- `src/features/contribute/motion/start-morph.stories.tsx:22`
- `src/features/contribute/screens/help-button.stories.tsx:12`
- `src/features/contribute/screens/recording-card.stories.tsx:13`
- `src/features/contribute/screens/save-form.stories.tsx:21`
- `src/features/contribute/screens/start-bar.stories.tsx:13`
- `src/features/contribute/screens/stop-recording-screen.stories.tsx:17,41`
- `src/features/contribute/screens/tracking-button.stories.tsx:12`
- `src/features/contribute/stop-notes/stop-note-card.stories.tsx:12`
- `src/features/contribute/stop-notes/stop-note-editor.tsx:81`
- `src/features/contribute/stop-notes/stop-note-pill.stories.tsx:13`
- `src/features/contribute/stop-notes/stop-notes-button.stories.tsx:12`
- `src/features/contribute/toolbar/bottom-toolbar.stories.tsx:14`
- `src/features/published-map/notices.stories.tsx:18,19`
- `src/features/routes/cards/route-list-controller.stories.tsx:163`
- `src/features/routes/cards/trip-card.stories.tsx:118,119`
- `src/features/routes/map/basemap-control.stories.tsx:78`
- `src/features/routes/map/end-titles.stories.tsx:82`
- `src/features/routes/map/footbridge-layer.stories.tsx:84`
- `src/features/routes/map/hintuan-label.stories.tsx:12`
- `src/features/routes/map/hintuan-pin.stories.tsx:67`
- `src/features/routes/map/hotspot-pins.stories.tsx:99`
- `src/features/routes/map/landmark-pin.stories.tsx:64`
- `src/features/routes/map/map-data-source-sheet.stories.tsx:16`
- `src/features/routes/map/map-style.stories.tsx:17,67`
- `src/features/routes/map/route-line-endings-label.stories.tsx:12`
- `src/features/routes/map/route-line-label.stories.tsx:12`
- `src/features/routes/map/station-labels.stories.tsx:114`
- `src/features/studio/auth/auth-dialogs.stories.tsx:21`
- `src/features/studio/auth/change-password.stories.tsx:44`
- `src/features/studio/auth/not-editor.stories.tsx:16,17`
- `src/features/studio/auth/reset-password.stories.tsx:28`
- `src/features/studio/auth/sign-in.stories.tsx:28`
- `src/features/studio/drawing/draw-toolbar.stories.tsx:150,151`
- `src/features/studio/drawing/point-bar.stories.tsx:90,91`
- `src/features/studio/drawing/use-connect-hint.stories.tsx:21`
- `src/features/studio/maps/held-draft-sheet.stories.tsx:56`
- `src/features/studio/maps/map-placeholder.stories.tsx:11`
- `src/features/studio/maps/map-switch.stories.tsx:14`
- `src/features/studio/maps/subject-status-list.stories.tsx:38`
- `src/features/studio/maps/subject-status-view.stories.tsx:30`
- `src/features/studio/panels/account-pill.stories.tsx:16,17`
- `src/features/studio/panels/card-actions.stories.tsx:16`
- `src/features/studio/panels/new-menu.stories.tsx:18,19`
- `src/features/studio/panels/save-toasts.stories.tsx:16,17`
- `src/features/studio/panels/toast.stories.tsx:11`
- `src/shared/ui/bottom-sheet.stories.tsx:71,73,74`
- `src/shared/ui/bottom-sheet.tsx:332`

</details>

<details><summary><code>surface-inverse</code>: 7 uses in 4 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:141`
- `src/features/contribute/history/ride-summary-preview.tsx:103`
- `src/features/contribute/stop-notes/stop-notes-button.tsx:38`
- `src/features/routes/cards/route-card-look.ts:31,42,43,47`

</details>

<details><summary><code>surface-inverse-secondary</code>: 3 uses in 2 files</summary>

- `src/features/contribute/stop-notes/stop-map-popup.tsx:86`
- `src/features/contribute/stop-notes/stop-timeline-rail.tsx:23,24`

</details>

<details><summary><code>surface-error</code>: 5 uses in 4 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:139`
- `src/design-system/primitives/field-frame.tsx:40`
- `src/design-system/primitives/otp-field.tsx:50,52`
- `src/features/studio/panels/signboard-editor.tsx:120`

</details>

<details><summary><code>surface-success</code>: 1 use in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:140`

</details>

<details><summary><code>surface-transparent</code>: 10 uses in 9 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:143,145`
- `src/features/contribute/screens/ride-sheet.tsx:93`
- `src/features/contribute/stop-notes/stop-map-popup.tsx:71`
- `src/features/contribute/stop-notes/stop-note-card.tsx:40`
- `src/features/contribute/tutorial/coachmark.tsx:89`
- `src/features/published-map/install-prompt.tsx:66`
- `src/features/routes/cards/mode-filter-card.tsx:59`
- `src/features/routes/map/map-data-source-sheet.tsx:117`
- `src/features/studio/auth/auth-dialog.tsx:14`

</details>

<details><summary><code>surface-transparent-inverse</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:148,150`

</details>

<details><summary><code>surface-transparent-secondary</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:153,155`

</details>

<details><summary><code>card-red-surface</code>: 37 uses in 15 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:171,173,534,539,554`
- `src/design-system/primitives/button-look.ts:77`
- `src/design-system/primitives/button.stories.tsx:16`
- `src/design-system/primitives/switch.tsx:61,93,119`
- `src/features/contribute/map/map-frost.stories.tsx:26`
- `src/features/contribute/screens/tracking-button.tsx:34`
- `src/features/routes/cards/end-sign.stories.tsx:15`
- `src/features/routes/cards/end-sign.tsx:20,21,22`
- `src/features/routes/map/end-titles.stories.tsx:193,200,267,272,353`
- `src/features/routes/map/hintuan-label.stories.tsx:81`
- `src/features/routes/map/hintuan-pin.stories.tsx:141,144,181`
- `src/features/routes/map/landmark-pin.stories.tsx:116`
- `src/features/routes/map/route-line-endings-label.stories.tsx:113,123,133,213,223`
- `src/features/routes/map/route-line-label.stories.tsx:95,101,111,137,138`
- `src/shared/ui/route-icons.stories.tsx:15`

</details>

<details><summary><code>card-red-surface-pale</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:176,178`

</details>

<details><summary><code>card-red-border-primary</code>: 3 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:171`
- `src/design-system/primitives/switch.tsx:93`
- `src/features/contribute/screens/tracking-button.tsx:34`

</details>

<details><summary><code>card-red-timeline-surface</code>: 3 uses in 2 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:181,183`
- `src/design-system/primitives/button-look.ts:77`

</details>

<details><summary><code>trip-start</code>: 1 use in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:168`

</details>

<details><summary><code>trip-end</code>: 1 use in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:169`

</details>

<details><summary><code>card-jeep-surface</code>: 12 uses in 7 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:189,191,565`
- `src/design-system/primitives/button-look.ts:78`
- `src/design-system/primitives/button.stories.tsx:17`
- `src/features/routes/cards/controller-look.ts:17,18`
- `src/features/routes/cards/livery-card.ts:32`
- `src/features/routes/cards/route-card-look.ts:10,41`
- `src/features/routes/map/livery-line.ts:84,97`

</details>

<details><summary><code>card-jeep-surface-secondary</code>: 6 uses in 4 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:194,196`
- `src/design-system/primitives/button-look.ts:78`
- `src/features/routes/cards/destination-row.stories.tsx:77`
- `src/features/routes/cards/livery-card.ts:118,136`

</details>

<details><summary><code>card-jeep-surface-border</code>: 5 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:189,199,201`
- `src/features/routes/cards/livery-card.ts:32`
- `src/features/routes/cards/route-card-look.ts:10`

</details>

<details><summary><code>card-jeep-on-surface</code>: 6 uses in 5 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:204,206`
- `src/design-system/primitives/button.stories.tsx:17`
- `src/features/routes/cards/livery-card.ts:64`
- `src/features/routes/cards/route-card-look.ts:25`
- `src/features/routes/map/livery-line.ts:114`

</details>

<details><summary><code>card-uv-express-surface</code>: 10 uses in 6 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:209,211,544,549`
- `src/design-system/primitives/button-look.ts:80`
- `src/design-system/primitives/button.stories.tsx:18`
- `src/features/routes/cards/controller-look.ts:20`
- `src/features/routes/cards/livery-card.ts:33`
- `src/features/routes/cards/route-card-look.ts:11,42`

</details>

<details><summary><code>card-uv-express-surface-secondary</code>: 6 uses in 4 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:214,216`
- `src/design-system/primitives/button-look.ts:80`
- `src/features/routes/cards/destination-row.stories.tsx:85`
- `src/features/routes/cards/livery-card.ts:119,138`

</details>

<details><summary><code>card-uv-express-surface-border</code>: 10 uses in 6 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:209,219,221`
- `src/features/routes/cards/livery-card.ts:33`
- `src/features/routes/cards/route-card-look.ts:11`
- `src/features/routes/map/livery-line.ts:85,98`
- `src/features/routes/map/route-line-endings-label.stories.tsx:145`
- `src/features/routes/map/route-line-label.stories.tsx:64,82`

</details>

<details><summary><code>card-uv-express-on-surface</code>: 6 uses in 5 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:224,226`
- `src/design-system/primitives/button.stories.tsx:18`
- `src/features/routes/cards/livery-card.ts:65`
- `src/features/routes/cards/route-card-look.ts:26`
- `src/features/routes/map/livery-line.ts:115`

</details>

<details><summary><code>card-ejeep-surface</code>: 10 uses in 7 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:229,231`
- `src/design-system/primitives/button-look.ts:81`
- `src/design-system/primitives/button.stories.tsx:19`
- `src/features/routes/cards/controller-look.ts:21`
- `src/features/routes/cards/destination-row.stories.tsx:18`
- `src/features/routes/cards/livery-card.ts:34`
- `src/features/routes/cards/route-card-look.ts:12,43,66`

</details>

<details><summary><code>card-ejeep-surface-secondary</code>: 5 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:234,236`
- `src/design-system/primitives/button-look.ts:81`
- `src/features/routes/cards/livery-card.ts:120,139`

</details>

<details><summary><code>card-ejeep-surface-border</code>: 7 uses in 4 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:229,239,241`
- `src/features/routes/cards/livery-card.ts:34`
- `src/features/routes/cards/route-card-look.ts:12`
- `src/features/routes/map/livery-line.ts:86,99`

</details>

<details><summary><code>card-ejeep-on-surface</code>: 6 uses in 5 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:244,246`
- `src/design-system/primitives/button.stories.tsx:19`
- `src/features/routes/cards/livery-card.ts:66`
- `src/features/routes/cards/route-card-look.ts:27`
- `src/features/routes/map/livery-line.ts:116`

</details>

<details><summary><code>card-bus-surface</code>: 12 uses in 9 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:249,251`
- `src/design-system/primitives/button-link.stories.tsx:62`
- `src/design-system/primitives/button-look.ts:82`
- `src/design-system/primitives/button.stories.tsx:20`
- `src/features/routes/cards/controller-look.ts:22`
- `src/features/routes/cards/livery-card.ts:35`
- `src/features/routes/cards/route-card-look.ts:13,44`
- `src/features/routes/cards/timeline-dot.stories.tsx:17`
- `src/features/routes/map/livery-line.ts:87,100`

</details>

<details><summary><code>card-bus-surface-secondary</code>: 6 uses in 4 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:254,256`
- `src/design-system/primitives/button-look.ts:82`
- `src/features/routes/cards/livery-card.ts:121,140`
- `src/features/routes/cards/route-end-point-bar.stories.tsx:63`

</details>

<details><summary><code>card-bus-surface-border</code>: 5 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:249,259,261`
- `src/features/routes/cards/livery-card.ts:35`
- `src/features/routes/cards/route-card-look.ts:13`

</details>

<details><summary><code>card-bus-on-surface</code>: 15 uses in 6 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:264,266`
- `src/design-system/primitives/button-link.stories.tsx:62`
- `src/design-system/primitives/button.stories.tsx:20`
- `src/features/routes/cards/livery-card.ts:67`
- `src/features/routes/cards/route-card-look.ts:28,29,30,32,41,44,45,46,48`
- `src/features/routes/map/livery-line.ts:117`

</details>

<details><summary><code>error-surface</code>: 4 uses in 4 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:271`
- `src/design-system/primitives/button-look.ts:53`
- `src/design-system/primitives/field-frame.tsx:40`
- `src/design-system/primitives/otp-field.tsx:50`

</details>

<details><summary><code>error-surface-secondary</code>: 3 uses in 2 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:273,275`
- `src/design-system/primitives/button-look.ts:55`

</details>

<details><summary><code>brand-surface</code>: 45 uses in 30 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:280,519,524`
- `src/design-system/primitives/button-look.ts:76`
- `src/design-system/primitives/field-frame.tsx:37,40,108`
- `src/design-system/primitives/icon-button.tsx:66`
- `src/design-system/primitives/otp-field.tsx:49,52`
- `src/design-system/primitives/switch.tsx:48`
- `src/features/contribute/account/logout-confirm.stories.tsx:16`
- `src/features/contribute/account/verify-code-screen.tsx:101`
- `src/features/contribute/history/history-card.tsx:69`
- `src/features/contribute/motion/start-morph.ts:216`
- `src/features/contribute/screens/para-mark.tsx:12`
- `src/features/contribute/screens/ride-sheet.tsx:131,162,165`
- `src/features/contribute/screens/start-bar.tsx:22`
- `src/features/contribute/screens/stop-recording-screen.stories.tsx:18`
- `src/features/contribute/screens/tracking-button.tsx:37`
- `src/features/contribute/stop-notes/card-button.tsx:52`
- `src/features/contribute/stop-notes/stop-note-editor.tsx:81`
- `src/features/contribute/stop-notes/stop-note-pill.tsx:60,74`
- `src/features/contribute/stop-notes/stop-note-row.tsx:72,118`
- `src/features/contribute/stop-notes/stop-notes-entry.tsx:24`
- `src/features/contribute/tutorial/coachmark.stories.tsx:33`
- `src/features/locator/locator-button.tsx:65,79,82`
- `src/features/locator/locator-indicator-overlay.tsx:124`
- `src/features/routes/cards/mode-filter-card.tsx:66,77`
- `src/features/routes/cards/route-list-controller.tsx:97,131`
- `src/features/routes/cards/way-button.tsx:41`
- `src/features/routes/map/map-style-button.tsx:49`
- `src/features/routes/map/map-style.tsx:154,155`
- `src/features/studio/contributors/actions/use-part.tsx:47,60`
- `src/features/studio/maps/search-mark.tsx:20`

</details>

<details><summary><code>brand-surface-secondary</code>: 5 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:282,284,529`
- `src/design-system/primitives/button-look.ts:76`
- `src/features/contribute/screens/start-bar.tsx:22`

</details>

<details><summary><code>brand-border</code>: 5 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:287,289`
- `src/design-system/primitives/switch.tsx:54,60`
- `src/features/contribute/screens/tracking-button.tsx:37`

</details>

<details><summary><code>brand-ring-track</code>: 1 use in 1 file</summary>

- `src/features/contribute/stop-notes/stop-note-pill.tsx:64`

</details>

<details><summary><code>save-surface</code>: 1 use in 1 file</summary>

- `src/features/contribute/stop-notes/card-button.tsx:16`

</details>

<details><summary><code>save-border</code>: 1 use in 1 file</summary>

- `src/features/contribute/stop-notes/card-button.tsx:16`

</details>

<details><summary><code>delete-surface</code>: 1 use in 1 file</summary>

- `src/features/contribute/stop-notes/card-button.tsx:17`

</details>

<details><summary><code>delete-border</code>: 1 use in 1 file</summary>

- `src/features/contribute/stop-notes/card-button.tsx:17`

</details>

<details><summary><code>components-tooltip-surface</code>: 4 uses in 2 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:295,297`
- `src/design-system/primitives/tooltip.tsx:36,42`

</details>

<details><summary><code>map-route-line-surface-default</code>: 6 uses in 2 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:303,305`
- `src/features/routes/cards/livery-card.ts:53,54,55,56`

</details>

<details><summary><code>map-route-line-surface-selected</code>: 6 uses in 4 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:308,310`
- `src/features/routes/map/end-titles.tsx:150`
- `src/features/routes/map/livery-line.ts:92,105`
- `src/features/routes/map/route-line-endings-label.stories.tsx:156`

</details>

<details><summary><code>map-route-line-arrow-rest</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:313,315`

</details>

<details><summary><code>map-route-line-arrow-inverse</code>: 4 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:318,320`
- `src/features/routes/map/livery-line.ts:120`
- `src/features/routes/map/route-line-endings-label.stories.tsx:176`

</details>

<details><summary><code>map-route-line-casing</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:323,325`

</details>

<details><summary><code>map-route-line-hintuan-surface-default</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:328,330`

</details>

<details><summary><code>map-overlay-card-hintuan-surface</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:333,335`

</details>

<details><summary><code>map-overlay-card-hintuan-content</code>: 3 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:333,343,345`

</details>

<details><summary><code>map-overlay-card-terminal-surface</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:348,350`

</details>

<details><summary><code>map-overlay-card-terminal-border</code>: 1 use in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:348`

</details>

<details><summary><code>map-overlay-card-terminal-content</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:353,355`

</details>

<details><summary><code>map-hotspots-card-hintuan-surface</code>: 23 uses in 11 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:358,360`
- `src/features/routes/cards/end-sign.stories.tsx:15`
- `src/features/routes/cards/end-sign.tsx:14,15,16`
- `src/features/routes/cards/hintuan-card-box.tsx:10`
- `src/features/routes/map/end-titles.stories.tsx:190,199,269`
- `src/features/routes/map/hintuan-label.stories.tsx:107`
- `src/features/routes/map/hintuan-pin.stories.tsx:160,163`
- `src/features/routes/map/landmark-pin.stories.tsx:117`
- `src/features/routes/map/route-line-endings-label.stories.tsx:83,90,101,191,194`
- `src/features/routes/map/route-line-label.stories.tsx:152,166,172`
- `src/features/studio/panels/new-menu.tsx:44`

</details>

<details><summary><code>map-hotspots-card-hintuan-border-primary</code>: 2 uses in 2 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:358`
- `src/features/routes/cards/hintuan-card-box.tsx:10`

</details>

<details><summary><code>map-hotspots-card-terminal-surface</code>: 4 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:363,365`
- `src/features/routes/cards/hintuan-card-box.tsx:9`
- `src/features/studio/panels/new-menu.tsx:37`

</details>

<details><summary><code>map-pin-terminal-surface</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:368,370`

</details>

<details><summary><code>map-pin-hintuan-surface</code>: 2 uses in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:373,375`

</details>

<details><summary><code>map-locator-indicator-overlay-surface</code>: 4 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:378,380`
- `src/features/locator/locator-button.tsx:75`
- `src/features/locator/locator-indicator-overlay.tsx:71`

</details>

<details><summary><code>map-locator-indicator-overlay-border</code>: 3 uses in 2 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:378`
- `src/features/locator/locator-indicator-overlay.tsx:71,83`

</details>

<details><summary><code>map-trail-lakad</code>: 1 use in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:382`

</details>

<details><summary><code>map-trail-sakay</code>: 1 use in 1 file</summary>

- `src/design-system/foundation/tokens.stories.tsx:383`

</details>

<details><summary><code>map-rail-light-rail-way-one-surface</code>: 10 uses in 7 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:388,390`
- `src/design-system/primitives/button-look.ts:84`
- `src/design-system/primitives/button.stories.tsx:23`
- `src/features/routes/cards/controller-look.ts:24`
- `src/features/routes/cards/livery-card.ts:37`
- `src/features/routes/cards/route-card-look.ts:15,45`
- `src/features/routes/map/livery-line.ts:88,101`

</details>

<details><summary><code>map-rail-light-rail-way-one-surface-pale</code>: 3 uses in 2 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:393,395`
- `src/features/routes/cards/livery-card.ts:57`

</details>

<details><summary><code>map-rail-light-rail-way-two-surface</code>: 10 uses in 7 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:403,405`
- `src/design-system/primitives/button-look.ts:86`
- `src/design-system/primitives/button.stories.tsx:27`
- `src/features/routes/cards/controller-look.ts:26`
- `src/features/routes/cards/livery-card.ts:39`
- `src/features/routes/cards/route-card-look.ts:17,46`
- `src/features/routes/map/livery-line.ts:89,102`

</details>

<details><summary><code>map-rail-light-rail-way-two-surface-pale</code>: 3 uses in 2 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:408,410`
- `src/features/routes/cards/livery-card.ts:58`

</details>

<details><summary><code>map-rail-metro-rail-way-three-surface</code>: 11 uses in 8 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:418,420`
- `src/design-system/primitives/button-link.stories.tsx:80`
- `src/design-system/primitives/button-look.ts:88`
- `src/design-system/primitives/button.stories.tsx:31`
- `src/features/routes/cards/controller-look.ts:28`
- `src/features/routes/cards/livery-card.ts:41`
- `src/features/routes/cards/route-card-look.ts:19,47`
- `src/features/routes/map/livery-line.ts:90,103`

</details>

<details><summary><code>map-ferry-surface</code>: 10 uses in 7 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:433,435`
- `src/design-system/primitives/button-look.ts:89`
- `src/design-system/primitives/button.stories.tsx:33`
- `src/features/routes/cards/controller-look.ts:29`
- `src/features/routes/cards/livery-card.ts:42`
- `src/features/routes/cards/route-card-look.ts:20,48`
- `src/features/routes/map/livery-line.ts:91,104`

</details>

<details><summary><code>map-ferry-surface-pale</code>: 3 uses in 2 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:438,440`
- `src/features/routes/cards/livery-card.ts:60`

</details>

<details><summary><code>map-ferry-border-primary</code>: 3 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:433`
- `src/features/routes/cards/livery-card.ts:42`
- `src/features/routes/cards/route-card-look.ts:20`

</details>

<details><summary><code>map-ferry-timeline-surface</code>: 5 uses in 3 files</summary>

- `src/design-system/foundation/tokens.stories.tsx:443,445`
- `src/design-system/primitives/button-look.ts:89`
- `src/features/routes/cards/livery-card.ts:125,147`

</details>

