import type { ReactNode } from 'react';

import { EndIcon, StartIcon } from '@/shared/ui/route-icons';

import {
  HEAD_ROUTE,
  LINE_FILL,
  LINE_SURFACE,
  LINE_TEXT,
  LINE_WORDS,
  type LabelLook,
} from './livery-line';
import type { Livery } from '../model/liveries';

/**
 * Figma's Variant: Head Route, where a ride starts; Tail Route, where it
 * goes; and Default, an end named with neither (see below). Unselected,
 * Default at 60%, an end outside the ride, as the Label's Unselected
 * (4200:13645).
 */
export type RouteLineEndingsLabelVariant = 'head' | 'tail' | 'default' | 'unselected';

interface RouteLineEndingsLabelProps {
  variant: RouteLineEndingsLabelVariant;
  name: string;
  /**
   * The line's colour, which Tail Route and Default wear: a card's; null,
   * the selected blue with none. Head Route wears Start's green whatever
   * the line.
   */
  livery: Livery | null;
  /**
   * Figma's Property=CodeSign: a train station's sign code, YL06, in a white
   * chip before the name, the S or E then in a disc of its own. Head and
   * Tail Route alone, as Figma draws it.
   */
  codeSign?: string | null;
}

/**
 * A ride's end named over its circle, Figma's RouteLineEndingsLabels
 * (3848:12135): a pill in SN Pro Medium 14/20, 28 tall, and under it Figma's
 * `knobb`, the pointer at the circle. Head Route leads with Start's circled S
 * in Map/HotspotsCard/Hintuan/surface, the green; Tail Route with End's
 * circled E in the line's colour, not the brand's blue (the owner's call).
 * Both apply to every lit line, a list's blue ones too (the owner's call).
 *
 * At a train station, CodeSign (the owner's addition to Figma, 4073:7215 and
 * 4073:7220): the S or E in a 28 disc of its own, 4 left of the pill, and in
 * the pill the station's code in a white chip, its words the pill's colour,
 * before the name. The pointer stays at the pill's middle, as Figma has it,
 * so the pill is what stands over the circle and the disc hangs beside it.
 *
 * Default is the name alone in the line's colour, which Figma's set does
 * not draw. Unselected is Default at 60%, the Label's Unselected (4200:13645):
 * an end outside the ride. The map draws every unmarked end outside the ride,
 * so it wears Unselected; Default stays for an unmarked end inside one.
 *
 * The font is set here: the marker holding it sits in MapLibre's container,
 * whose stylesheet sets Helvetica Neue (RouteLineLabel). The icons say
 * which end to the eye alone, so the word goes before the name for a
 * screen reader, unseen; a pill inside a button says it in the button's
 * label instead.
 */
export function RouteLineEndingsLabel({
  variant,
  name,
  livery,
  codeSign = null,
}: RouteLineEndingsLabelProps) {
  const look = LOOK[variant];
  const colour = livery ?? 'selected';
  const worn: LabelLook =
    look.wears === 'start'
      ? HEAD_ROUTE
      : {
          surface: LINE_SURFACE[colour],
          pointer: LINE_FILL[colour],
          code: LINE_TEXT[colour],
          words: LINE_WORDS[colour],
        };
  const Icon = look.icon ? ICON[look.icon] : null;
  const code = Icon ? codeSign : null;
  return (
    <span
      data-part="name"
      className={
        'relative flex max-w-full min-w-0 items-center gap-1 rounded-full font-sn-pro text-sm/5 font-medium whitespace-nowrap ' +
        worn.words +
        ' ' +
        (code ? CODE_PADDING : look.padding) +
        ' ' +
        worn.surface +
        ' ' +
        look.fade
      }
    >
      {Icon && !code && (
        <span aria-hidden data-part={look.icon} className="size-6 shrink-0 *:size-full">
          <Icon />
        </span>
      )}
      {Icon && code && (
        <span
          aria-hidden
          data-part={look.icon}
          className={'absolute top-0 right-full mr-1 flex rounded-full p-0.5 ' + worn.surface}
        >
          <span className="size-6 *:size-full">
            <Icon />
          </span>
        </span>
      )}
      {look.word && <span className="sr-only">{look.word}</span>}
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
      {/* Figma's Arrow, turned to point down at the circle: 2 into the pill, its tip 11 past it. */}
      <svg
        aria-hidden
        data-part="knobb"
        viewBox="0 0 14.7047 13"
        className={
          'absolute top-full left-1/2 -mt-0.5 h-3.25 w-[14.7px] -translate-x-1/2 rotate-180 ' +
          worn.pointer
        }
      >
        <path d="M6.48632 0.5C6.87122 -0.166666 7.83347 -0.166667 8.21837 0.499999L14.5692 11.5C14.9541 12.1667 14.473 13 13.7032 13H1.00149C0.231692 13 -0.249434 12.1667 0.135466 11.5L6.48632 0.5Z" />
      </svg>
    </span>
  );
}

/**
 * What each variant is (3848:12135): its padding — 2 round a 24 icon and 8
 * after the name, so the pill stays 28 tall; 8 each side and 4 above and
 * below the name alone — what it wears, Start's green or the line's colour,
 * its icon, the word a screen reader hears before the name, and its fade.
 */
const LOOK = {
  head: {
    padding: 'py-0.5 pr-2 pl-0.5',
    wears: 'start',
    icon: 'start',
    word: 'Start, ',
    fade: '',
  },
  tail: { padding: 'py-0.5 pr-2 pl-0.5', wears: 'line', icon: 'end', word: 'End, ', fade: '' },
  default: { padding: 'px-2 py-1', wears: 'line', icon: null, word: null, fade: '' },
  unselected: { padding: 'px-2 py-1', wears: 'line', icon: null, word: null, fade: 'opacity-60' },
} as const satisfies Record<
  RouteLineEndingsLabelVariant,
  {
    padding: string;
    wears: 'start' | 'line';
    icon: 'start' | 'end' | null;
    word: string | null;
    /** Figma's opacity/60 for a name outside the ride (the Label's Unselected), else nothing. */
    fade: '' | 'opacity-60';
  }
>;

/** Figma's Start and End, by the part each is. */
const ICON = { start: StartIcon, end: EndIcon } satisfies Record<'start' | 'end', () => ReactNode>;

/** CodeSign's pill, its icon in the disc beside it: 4 before the code's chip, 8 after the name, 4 above and below. */
const CODE_PADDING = 'py-1 pr-2 pl-1';
