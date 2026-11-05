/**
 * The studio's dialogs on a phone (narrower than 40rem): a sheet that fills
 * the screen, clear of the notch and the home bar, with its buttons held at
 * its foot while the form scrolls, so the keyboard never hides Save. Wider,
 * they stay a card in the middle of the map. On a computer a route's form is
 * not a dialog at all but a panel beside the map (BESIDE).
 */

/**
 * The dimmed layer over the map, holding the dialog. Above the map's own z-20
 * notices, which come after it in the page.
 */
export const OVERLAY =
  'absolute inset-0 z-30 grid place-items-center bg-black/30 p-4 max-sm:place-items-stretch max-sm:p-0';

/** A long form (SavePanel, HotspotPanel): a card, or the whole screen on a phone. */
export const PANEL =
  'max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl ' +
  'max-sm:h-full max-sm:max-w-none max-sm:rounded-none max-sm:pt-[calc(1.5rem+env(safe-area-inset-top))]';

/** A long form's Cancel and Save, kept at the bottom of the screen on a phone. */
export const FOOTER =
  'mt-5 flex gap-2 max-sm:sticky max-sm:-bottom-6 max-sm:-mx-6 max-sm:border-t max-sm:border-neutral-200 ' +
  'max-sm:bg-white max-sm:px-6 max-sm:pt-3 max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]';

/**
 * A route's sidebar left of the map on a computer (Figma 4300:20893): 380 across, the full
 * height, its sections scrolling on their own above the footer.
 */
export const BESIDE =
  'flex w-95 shrink-0 flex-col border-r border-border-primary bg-surface font-sn-pro';

/** The sidebar's sections: 16 in, 20 between them. */
export const BESIDE_BODY = 'flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4';

/** The sidebar's footer, Exit and its saves, held at its foot under the bottom toolbar's shadow. */
export const FOOTER_BESIDE =
  'flex shrink-0 items-center gap-2 bg-surface px-4 pt-2 pb-4 shadow-bottom-sheet-top-shadow';
