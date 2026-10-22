import { LINE_SURFACE, LINE_WORDS } from './livery-line';
import { END_SIGN_LOOK, EndSign } from '../cards/end-sign';
import type { Livery } from '../model/liveries';

/**
 * Figma's Label, Property 1: Default, the name alone; End, End's word before
 * it. Start, Start's word before it, for a ride's picked start: End's shape
 * in green, as Figma draws no Start Label but draws the start that way on
 * RouteLineEndingsLabels. Unselected, Default at 60% (4200:13645), a hintuan
 * outside the ride.
 */
export type RouteLineLabelVariant = 'default' | 'unselected' | 'end' | 'start';

interface RouteLineLabelProps {
  variant: RouteLineLabelVariant;
  name: string;
  /** The line's colour, which Default and Unselected wear: the open trip's card's. */
  livery: Livery;
  /**
   * Figma's `codeSign`: a train station's sign code, YL06, in a second white
   * segment after End's (CodeSignEnd), the name in a pill of its own beside
   * it. Drawn on End and Start alone: a station shows its code once picked.
   */
  codeSign?: string | null;
}

/** Which sign a variant leads with; Default and Unselected have none. */
const KIND = {
  default: null,
  unselected: null,
  end: 'end',
  start: 'start',
} as const satisfies Record<RouteLineLabelVariant, 'start' | 'end' | null>;

/**
 * A hintuan's name on the map, Figma's Label (4068:4799; its Default is
 * 3846:11748, the RouteLineLabel): Default beside a hintuan's dot along a
 * trip, End beside the picked one, where the ride now ends, and CodeSignEnd
 * for a picked train station. Default wears the line's colour with white words
 * in SN Pro Medium 14/20, 28 tall, drawn flat — near-black on MRT-3's yellow
 * (LINE_WORDS). End is red and Start green, whatever the line: a white inner
 * pill reads the word before the name. CodeSignEnd is two pills, 6 apart: the
 * word and the code in one, the name in the other.
 *
 * The font is set here, not inherited: every label sits in a DOM marker
 * inside MapLibre's container, whose stylesheet sets Helvetica Neue on all of
 * it. HintuanLabel places it beside the dot; the ends of a ride have their
 * own, RouteLineEndingsLabel.
 */
export function RouteLineLabel({ variant, name, livery, codeSign = null }: RouteLineLabelProps) {
  const kind = KIND[variant];
  const sign = kind ? END_SIGN_LOOK[kind] : null;
  const code = kind ? codeSign : null;
  const surface = sign ? sign.surface : LINE_SURFACE[livery];
  const words = sign ? 'text-content-inverse' : LINE_WORDS[livery];
  return (
    <span
      data-part="label"
      className={
        'flex max-w-full min-w-0 items-center gap-1.5 font-sn-pro text-sm/5 font-medium whitespace-nowrap ' +
        words +
        (variant === 'unselected' ? ' opacity-60' : '')
      }
    >
      {/* CodeSignEnd: the word and the code in a pill of their own, beside the name's. */}
      {kind && code && (
        <span className={'flex shrink-0 rounded-full p-0.5 ' + surface}>
          <EndSign kind={kind} code={code} />
        </span>
      )}
      <span
        data-part="name"
        className={
          'flex max-w-full min-w-0 items-center rounded-full ' +
          surface +
          ' ' +
          (kind && !code ? 'gap-1 py-0.5 pr-2 pl-0.5' : 'px-2 py-1')
        }
      >
        {kind && !code && <EndSign kind={kind} />}
        <span data-part="words" className="min-w-0 truncate">
          {name}
        </span>
      </span>
    </span>
  );
}
