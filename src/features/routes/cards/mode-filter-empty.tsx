import { Button } from '@/design-system/primitives/button';

import { MODE_FILTER_LABEL, type ModeFilter } from '../model/mode-filter';

interface ModeFilterEmptyProps {
  /** The filter that left nothing listed; never All. */
  filter: Exclude<ModeFilter, 'all'>;
  /** Back to every route. */
  onShowAll: () => void;
}

/**
 * What the route list says when its filter keeps nothing: "No Jeep routes here", and a way back to
 * All. Designed by the builder for now, from the house's own parts, until the owner draws it.
 */
export function ModeFilterEmpty({ filter, onShowAll }: ModeFilterEmptyProps) {
  return (
    <div
      data-testid="mode-filter-empty"
      className="flex flex-col items-center gap-4 px-4 py-8 text-center font-sn-pro text-content-primary"
    >
      <p className="text-lg/7 font-bold">No {MODE_FILTER_LABEL[filter]} routes here</p>
      <Button variant="secondary" label="Show all routes" onClick={onShowAll} />
    </div>
  );
}
