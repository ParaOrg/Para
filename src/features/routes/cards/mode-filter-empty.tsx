import { Button } from '@/design-system/primitives/button';

import { picksEither, type ModePicks } from '../model/mode-filter';

interface ModeFilterEmptyProps {
  /** The modes picked that left nothing listed; never none (All). */
  picks: ModePicks;
  /** Back to every route. */
  onShowAll: () => void;
}

/**
 * What the route list says when its filter keeps nothing: "No Jeepney or Bus routes here", and a
 * way back to All. Designed by the builder for now, from the house's own parts, until the owner
 * draws it.
 */
export function ModeFilterEmpty({ picks, onShowAll }: ModeFilterEmptyProps) {
  return (
    <div
      data-testid="mode-filter-empty"
      className="flex flex-col items-center gap-4 px-4 py-8 text-center font-sn-pro text-content-primary"
    >
      <p className="text-lg/7 font-bold">No {picksEither(picks)} routes here</p>
      <Button variant="secondary" label="Show all routes" onClick={onShowAll} />
    </div>
  );
}
