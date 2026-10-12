import { EndIcon, StartIcon } from '@/shared/ui/route-icons';

import type { LineLook } from './livery-line';

/**
 * The owner's SelectedHintuanRouteTitle's variants (Figma 3848:12135,
 * redrawn 2026-10-12): Default, a place's name alone; Head Route, the name
 * led by Start's circled S; Tail Route, led by End's circled E.
 */
export type RouteTitleVariant = 'default' | 'head' | 'tail';

interface Props {
  variant: RouteTitleVariant;
  name: string;
  /**
   * What is lit, which only the map knows: Default wears the line's colour
   * behind the name and the chevrons' for its words (a plain name over a
   * lit ride's end, EndTitles); without it, the brand's blue the frame
   * draws it in. A Head or Tail Route wears its own tokens and never reads
   * it. (One shape for the three, not a union on `variant`: Storybook's
   * Meta reads a union of props as never — tried, 2026-10-12.)
   */
  look?: LineLook;
  /**
   * Figma's `knobb`: the pointer under the pill, at the circle it names (a
   * lit ride's end, EndTitles). None beside the picked hintuan's circle
   * (HintuanPin).
   */
  pointer?: boolean;
}

/**
 * A place's name in a pill on the map — the owner's SelectedHintuanRouteTitle
 * (Figma 3848:12135, 2026-09-30, its icons of 2026-10-12): over a lit ride's
 * end circles (EndTitles) and beside the picked hintuan's circle
 * (HintuanPin), one drawing for both since the icons, so the pill changes in
 * one place.
 *
 * Default is the name alone in 14/20 (3846:11748), in the brand's blue as
 * the frame draws it or, given `look`, in what is lit — the line's colour,
 * and the chevrons' white for its words, as a card's: a list's routes lit
 * in the selected blue, named without Start or End (the owner's ask,
 * 2026-10-02: there are too many). Head Route and
 * Tail Route say which end a place is (his redrawing of 2026-10-12: "start
 * and end will follow this color, blue is the end, green is the start"): a
 * 24px circled S in Start's green, Map/HotspotsCard/Hintuan/surface, or a
 * circled E in End's blue, Brand/surface-secondary, before the name in
 * 16/24, white words on both, and no shadow. The words Start and End stood
 * over the name as badges from 2026-10-02 until the icons took their place
 * (his of 2026-10-12, 4055:6468 and 4055:6446); the Tail Route's circled
 * arrow, the card rows' (2026-10-01), went with them. The icons say which
 * end to the eye alone, so the word goes before the name for a screen
 * reader, unseen (what is only on the map is text too); a pill that is a
 * button says it in its label instead.
 *
 * A box and a triangle in the DOM, as the markers that hold it are: a map
 * symbol would need a stretched picture for it in every colour.
 */
export function SelectedHintuanRouteTitle({ variant, name, look, pointer = false }: Props) {
  // Default's colours given a look are the map's, a value computed at runtime; the rest are tokens.
  const lit = variant === 'default' ? look : undefined;
  const worn = lit ? LIT : WORN[variant];
  return (
    <span
      data-part="name"
      className={
        'relative flex max-w-full items-center gap-1 rounded-full py-1 font-medium ' + worn.pill
      }
      style={lit ? { backgroundColor: lit.line, color: lit.arrow } : undefined}
    >
      {variant === 'head' && (
        <span aria-hidden data-part="start" className="size-6 shrink-0 *:size-full">
          <StartIcon />
        </span>
      )}
      {variant === 'tail' && (
        <span aria-hidden data-part="end" className="size-6 shrink-0 *:size-full">
          <EndIcon />
        </span>
      )}
      {variant !== 'default' && (
        <span className="sr-only">{variant === 'head' ? 'Start, ' : 'End, '}</span>
      )}
      <span data-part="words" className="min-w-0 truncate">
        {name}
      </span>
      {/* Figma's Arrow, turned to point down at the circle. */}
      {pointer && (
        <svg
          aria-hidden
          viewBox="0 0 14.7047 13"
          className={
            'absolute top-full left-1/2 -mt-[1.5px] h-[13px] w-[14.7px] -translate-x-1/2 rotate-180 ' +
            worn.pointer
          }
          style={lit ? { fill: lit.line } : undefined}
        >
          <path d="M6.48632 0.5C6.87122 -0.166666 7.83347 -0.166667 8.21837 0.499999L14.5692 11.5C14.9541 12.1667 14.473 13 13.7032 13H1.00149C0.231692 13 -0.249434 12.1667 0.135466 11.5L6.48632 0.5Z" />
        </svg>
      )}
    </span>
  );
}

/**
 * What each variant wears (3848:12135): Default the brand's blue, its name
 * 14/20 with 8 at each side; a Route variant a token each, its name 16/24
 * after the icon, 4 before the icon and 8 after the name; the pointer the
 * pill's colour. Literal class names: Tailwind reads the source.
 */
const WORN = {
  default: {
    pill: 'px-2 text-sm/5 bg-brand-surface-secondary text-content-inverse',
    pointer: 'fill-brand-surface-secondary',
  },
  head: {
    pill: 'pr-2 pl-1 text-base/6 bg-map-hotspots-card-hintuan-surface text-content-inverse',
    pointer: 'fill-map-hotspots-card-hintuan-surface',
  },
  tail: {
    pill: 'pr-2 pl-1 text-base/6 bg-brand-surface-secondary text-content-inverse',
    pointer: 'fill-brand-surface-secondary',
  },
} satisfies Record<RouteTitleVariant, { pill: string; pointer: string }>;

/** Default wearing what is lit (`look`): its colours come inline, so none here. */
const LIT = { pill: 'px-2 text-sm/5', pointer: '' };
