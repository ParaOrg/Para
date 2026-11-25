/** The icons of the controls that float on the map over the route cards, Figma's paths in
 * route-icons.svg (a file the page fetches). Each fills with currentColor. */

import { RouteSpriteIcon } from './route-sprite-icon';

/** Figma's filter (the funnel, 4633:21371), 24 across: the map's, opening the route list's filter. */
export function FilterIcon() {
  return <RouteSpriteIcon id="filter" />;
}

/** Figma's Overview (4831:51294), 20 across: after the Overview button's word. */
export function OverviewIcon() {
  return <RouteSpriteIcon id="overview" />;
}
