export type EndSignKind = 'start' | 'end';

interface EndSignProps {
  kind: EndSignKind;
}

/**
 * What each end wears, on every line: Start the green Map/HotspotsCard/Hintuan/surface, End the red
 * Card/red/surface. `surface` and `pointer` paint the pill around a sign; `words` is the sign's own
 * colour on its white.
 */
export const END_SIGN_LOOK = {
  start: {
    surface: 'bg-map-hotspots-card-hintuan-surface',
    pointer: 'fill-map-hotspots-card-hintuan-surface',
    words: 'text-map-hotspots-card-hintuan-surface',
    word: 'Start',
  },
  end: {
    surface: 'bg-card-red-surface',
    pointer: 'fill-card-red-surface',
    words: 'text-card-red-surface',
    word: 'End',
  },
} satisfies Record<EndSignKind, { surface: string; pointer: string; words: string; word: string }>;

/** Figma's Badge: white, round, its words SN Pro Medium 14/20 in the sign's colour. */
const BADGE = 'shrink-0 rounded-full bg-content-inverse px-1.5 text-sm/5';

/**
 * Figma's Badge that says which end a place is (RouteLineEndingsLabels, 3848:12135): "Start" or
 * "End" in the colour of the pill it sits in. At a train station it has a pill of its own, the
 * name's pill beside it holding the code (SignCode).
 */
export function EndSign({ kind }: EndSignProps) {
  const look = END_SIGN_LOOK[kind];
  return (
    <>
      <span data-part={kind} className={BADGE + ' ' + look.words}>
        {look.word}
      </span>
      {/* The sign leads a name, so a screen reader hears a comma after it. */}
      <span className="sr-only">, </span>
    </>
  );
}

interface SignCodeProps {
  kind: EndSignKind;
  /** A train station's sign code, YL06. */
  code: string;
}

/** A train station's code in the same Badge, before the name in the name's pill (Railway). */
export function SignCode({ kind, code }: SignCodeProps) {
  return (
    <span data-part="code" className={BADGE + ' ' + END_SIGN_LOOK[kind].words}>
      {code}
    </span>
  );
}
