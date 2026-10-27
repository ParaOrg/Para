import { LINE_FILL, LINE_SURFACE, LINE_WORDS } from './livery-line';
import { END_SIGN_LOOK, EndSign, SignCode } from '../cards/end-sign';
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
  /** The line's colour, which Default and Unselected wear; null, the selected blue with none. */
  livery: Livery | null;
  /**
   * Figma's Property=Railway: a train station's sign code, YL06, in a pill of
   * its own before the name's. Head and Tail Route alone, as Figma draws it.
   */
  codeSign?: string | null;
}

/**
 * A ride's end named over its circle, Figma's RouteLineEndingsLabels
 * (3848:12135): a pill 28 tall, and under it Figma's `knobb`, the pointer at
 * the circle. Head Route is Start's green and Tail Route End's red, whatever
 * the line (green, blue and red are reserved for meanings): a white Badge
 * reads "Start" or "End" before the name, the name SN Pro Medium 16/24 in
 * white. At a train station (Railway) the code's Badge has a pill of its own,
 * 4 to the left: the pointer stays under the name, so the name's pill is the
 * one centred on the circle.
 *
 * Default is the name alone, SN Pro Medium 14/20, in the line's colour, which Figma's set does
 * not draw. Unselected is Default at 60%, the Label's Unselected (4200:13645):
 * an end outside the ride. The map draws every unmarked end outside the ride,
 * so it wears Unselected; Default stays for an unmarked end inside one.
 *
 * The font is set here: the marker holding it sits in MapLibre's container,
 * whose stylesheet sets Helvetica Neue (RouteLineLabel).
 */
export function RouteLineEndingsLabel({
  variant,
  name,
  livery,
  codeSign = null,
}: RouteLineEndingsLabelProps) {
  const kind = KIND[variant];
  const colour = livery ?? 'selected';
  const sign = kind ? END_SIGN_LOOK[kind] : null;
  return (
    <span
      data-part="name"
      className={
        'relative flex max-w-full min-w-0 items-center gap-1 rounded-full font-sn-pro font-medium whitespace-nowrap ' +
        (sign
          ? 'py-0.5 pr-2 pl-1 text-base-lower/6 text-content-inverse ' + sign.surface
          : 'px-2 py-1 text-sm/5 ' + LINE_WORDS[colour] + ' ' + LINE_SURFACE[colour]) +
        (variant === 'unselected' ? ' opacity-60' : '')
      }
    >
      {kind && codeSign && (
        <span className={'absolute top-0 right-full mr-1 flex rounded-full p-1 ' + sign?.surface}>
          <SignCode kind={kind} code={codeSign} />
        </span>
      )}
      {kind && <EndSign kind={kind} />}
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
          (sign ? sign.pointer : LINE_FILL[colour])
        }
      >
        <path d="M6.48632 0.5C6.87122 -0.166666 7.83347 -0.166667 8.21837 0.499999L14.5692 11.5C14.9541 12.1667 14.473 13 13.7032 13H1.00149C0.231692 13 -0.249434 12.1667 0.135466 11.5L6.48632 0.5Z" />
      </svg>
    </span>
  );
}

/** Which sign a variant leads with: Head Route Start's, Tail Route End's, the others none. */
const KIND = {
  head: 'start',
  tail: 'end',
  default: null,
  unselected: null,
} as const satisfies Record<RouteLineEndingsLabelVariant, 'start' | 'end' | null>;
