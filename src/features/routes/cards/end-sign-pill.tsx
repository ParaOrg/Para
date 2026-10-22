import { END_SIGN_LOOK, EndSign, type EndSignKind } from './end-sign';

interface EndSignPillProps {
  kind: EndSignKind;
}

/**
 * An EndSign alone in a pill of the end's own colour, 2 round it: the Start or End a railway card
 * puts beside its station names.
 */
export function EndSignPill({ kind }: EndSignPillProps) {
  return (
    <span
      className={
        'inline-flex shrink-0 items-center rounded-full p-0.5 text-sm/5 font-medium whitespace-nowrap ' +
        END_SIGN_LOOK[kind].surface
      }
    >
      <EndSign kind={kind} isFollowedByName={false} />
    </span>
  );
}
