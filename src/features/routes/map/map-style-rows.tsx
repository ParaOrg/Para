import { createContext, useContext, type ReactNode } from 'react';

import { LocationLabelsRow } from './location-labels-row';

/**
 * Rows a page adds under the Map Style card's own: the studio's Footbridges switch
 * (.scratch/footbridges, ticket 03). A context, as the card opens four components below the page
 * that knows them (its location control); none on the public map.
 */
export const MapStyleRowsContext = createContext<ReactNode>(null);

interface MapStyleRowsProps {
  /** Whether the basemap's own labels show: the Location Labels switch. */
  areLabelsShown: boolean;
  onLabelsToggle: () => void;
}

/** The Map Style card's rows under its designs: Location Labels (4474:6524), then the page's own. */
export function MapStyleRows({ areLabelsShown, onLabelsToggle }: MapStyleRowsProps) {
  const pageRows = useContext(MapStyleRowsContext);
  return (
    <>
      <LocationLabelsRow areShown={areLabelsShown} onToggle={onLabelsToggle} />
      {pageRows}
    </>
  );
}
