import { EndIcon, StartIcon } from '@/shared/ui/route-icons';

import { HEAD_ROUTE, LINE_SURFACE, LINE_TEXT, LINE_WORDS, type LabelLook } from './livery-line';
import type { Livery } from '../model/liveries';

/**
 * Figma's Label, Property 1: Default, the name alone; End, End's E before
 * it. Start, Start's S before it, for a ride's picked start (2026-10-15):
 * End's shape in Head Route's green (2026-10-16), as Figma draws no Start
 * Label but draws the start that way on RouteLineEndingsLabels.
 * Unselected, Default at 60% (4200:13645, 2026-10-16), a hintuan outside
 * the ride.
 */
export type RouteLineLabelVariant = 'default' | 'unselected' | 'end' | 'start';

/** The circled letter before a marked label's name, and what it says to a screen reader. */
const MARK = {
  default: null,
  unselected: null,
  end: { Icon: EndIcon, spoken: 'End, ' },
  start: { Icon: StartIcon, spoken: 'Start, ' },
} as const;

interface RouteLineLabelProps {
  variant: RouteLineLabelVariant;
  name: string;
  /** The line's colour, which the label wears: the open trip's card's. */
  livery: Livery;
  /**
   * Figma's `codeSign`: a train station's sign code, YL06, in a white chip
   * before the name, End's E or Start's S then a disc of its own
   * (CodeSignEnd). Drawn on End and Start alone: a station shows its code
   * once picked.
   */
  codeSign?: string | null;
}

/**
 * A hintuan's name on the map, the owner's Label (Figma 4068:4799,
 * 2026-10-13; its Default is 3846:11748, the RouteLineLabel of 2026-10-02):
 * Default beside a hintuan's dot along a trip, End beside the picked one,
 * where the ride now ends, and CodeSignEnd for a picked train station. All
 * three wear the line's colour (his "must be color of route line") with
 * white words in SN Pro Medium 14/20, 28 tall, drawn flat — near-black on
 * MRT-3's yellow (LINE_WORDS, 2026-10-13). Start, a picked start, wears
 * Head Route's green instead, whatever the line (HEAD_ROUTE, 2026-10-16).
 *
 * The font is set here, not inherited: every label sits in a DOM marker
 * inside MapLibre's container, whose stylesheet sets Helvetica Neue on all
 * of it (the owner's "why the font is in helvetica Neue", 2026-10-13).
 * HintuanLabel places it beside the dot; the ends of a ride have their own,
 * RouteLineEndingsLabel.
 *
 * The E says which end to the eye alone, so the word goes before the name
 * for a screen reader, unseen; a label inside a button says it in the
 * button's label instead.
 */
export function RouteLineLabel({ variant, name, livery, codeSign = null }: RouteLineLabelProps) {
  const worn: Omit<LabelLook, 'pointer'> =
    variant === 'start'
      ? HEAD_ROUTE
      : { surface: LINE_SURFACE[livery], code: LINE_TEXT[livery], words: LINE_WORDS[livery] };
  const surface = worn.surface;
  const mark = MARK[variant];
  const code = mark ? codeSign : null;
  return (
    <span
      data-part="label"
      className={
        'flex max-w-full min-w-0 items-center gap-2 font-sn-pro text-sm/5 font-medium whitespace-nowrap ' +
        worn.words +
        (variant === 'unselected' ? ' opacity-60' : '')
      }
    >
      {/* CodeSignEnd: the E, or Start's S, in a disc of its own, 28 across, beside the pill. */}
      {mark && code && (
        <span
          aria-hidden
          data-part={variant}
          className={'flex shrink-0 rounded-full p-0.5 ' + surface}
        >
          <span className="size-6 *:size-full">
            <mark.Icon />
          </span>
        </span>
      )}
      <span
        data-part="name"
        className={
          'flex max-w-full min-w-0 items-center rounded-full ' +
          surface +
          ' ' +
          PADDING[code ? 'code' : variant]
        }
      >
        {mark && !code && (
          <span aria-hidden data-part={variant} className="size-6 shrink-0 *:size-full">
            <mark.Icon />
          </span>
        )}
        {mark && <span className="sr-only">{mark.spoken}</span>}
        {code && (
          <span
            data-part="code"
            className={'shrink-0 rounded-full bg-content-inverse px-1.5 ' + worn.code}
          >
            {code}
          </span>
        )}
        <span data-part="words" className="min-w-0 truncate">
          {name}
        </span>
      </span>
    </span>
  );
}

/**
 * The pill's padding and gap per look (4068:4799, respaced 2026-10-16): 8
 * each side and 4 above and below the name alone; 2 round a 24 icon, so
 * End and Start stay 28 tall; 4 before the code's chip, 8 after the name.
 */
const PADDING = {
  default: 'px-2 py-1',
  unselected: 'px-2 py-1',
  end: 'gap-1 py-0.5 pr-2 pl-0.5',
  start: 'gap-1 py-0.5 pr-2 pl-0.5',
  code: 'gap-1.5 py-1 pr-2 pl-1',
} satisfies Record<RouteLineLabelVariant | 'code', string>;
