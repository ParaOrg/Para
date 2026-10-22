export type EndSignKind = 'start' | 'end';

interface EndSignProps {
  kind: EndSignKind;
  /** A train station's sign code, YL06, in a second white segment after the word. */
  code?: string | null;
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

/**
 * Figma's white inner pill that says which end a place is (RouteLineEndingsLabels, 3848:12135):
 * "Start" or "End" in SN Pro Medium 14/20 in the outer pill's colour. At a train station a second
 * segment holds the code, 2 apart: the word's segment is round on the left and 2 on its top right,
 * the code's round on the right. It sits inside a pill of the end's own colour, a map label's.
 */
export function EndSign({ kind, code = null }: EndSignProps) {
  const look = END_SIGN_LOOK[kind];
  // The sign leads a name, so a screen reader hears a comma after it.
  const comma = <span className="sr-only">, </span>;
  if (!code) {
    return (
      <>
        <span
          data-part={kind}
          className={'shrink-0 rounded-full bg-content-inverse px-1.5 py-0.5 ' + look.words}
        >
          {look.word}
        </span>
        {comma}
      </>
    );
  }
  return (
    <>
      <span className={'flex shrink-0 items-center gap-0.5 ' + look.words}>
        <span
          data-part={kind}
          className="rounded-l-full rounded-tr-xs bg-content-inverse px-1.5 py-0.5"
        >
          {look.word}
        </span>
        <span data-part="code" className="rounded-r-full bg-content-inverse px-1.5 py-0.5">
          {code}
        </span>
      </span>
      {comma}
    </>
  );
}
