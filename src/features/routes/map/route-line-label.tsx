import { EndIcon, StartIcon } from '@/shared/ui/route-icons';

import { LINE_SURFACE, LINE_TEXT, LINE_WORDS } from './livery-line';
import type { Livery } from '../model/liveries';

/**
 * Figma's Label, Property 1: Default, the name alone; End, End's E before
 * it. Start, Start's S before it, is End's look for a ride's picked start
 * (2026-10-15): Figma draws no Start Label yet.
 */
export type RouteLineLabelVariant = 'default' | 'end' | 'start';

/** The circled letter before a marked label's name, and what it says to a screen reader. */
const MARK = {
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
   * before the name, End's E then a disc of its own (CodeSignEnd). Drawn
   * on End alone, as Figma draws it: a station shows its code once picked.
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
 * MRT-3's yellow (LINE_WORDS, 2026-10-13).
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
  const surface = LINE_SURFACE[livery];
  const mark = variant === 'default' ? null : MARK[variant];
  const code = mark ? codeSign : null;
  return (
    <span
      data-part="label"
      className={
        'flex max-w-full min-w-0 items-center gap-2 font-sn-pro text-sm/5 font-medium whitespace-nowrap ' +
        LINE_WORDS[livery]
      }
    >
      {/* CodeSignEnd: the E in a disc of its own, 28 across, beside the pill. */}
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
          'flex max-w-full min-w-0 items-center rounded-full py-1 ' +
          surface +
          ' ' +
          PADDING[code ? 'code' : variant]
        }
      >
        {mark && !code && (
          <span aria-hidden data-part={variant} className="size-5 shrink-0 *:size-full">
            <mark.Icon />
          </span>
        )}
        {mark && <span className="sr-only">{mark.spoken}</span>}
        {code && (
          <span
            data-part="code"
            className={'shrink-0 rounded-full bg-content-inverse px-1.5 ' + LINE_TEXT[livery]}
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

/** The pill's padding and gap per look (4068:4799): 8 each side for the name alone; 4 before an icon or chip, 8 after the name. */
const PADDING = {
  default: 'px-2',
  end: 'gap-1 pr-2 pl-1',
  start: 'gap-1 pr-2 pl-1',
  code: 'gap-1.5 pr-2 pl-1',
} satisfies Record<RouteLineLabelVariant | 'code', string>;
