import { MapStyleSwitchRow } from './map-style-switch-row';

interface LocationLabelsRowProps {
  /** Whether the basemap's own labels show. */
  areShown: boolean;
  onToggle: () => void;
}

/** The Map Style card's Location Labels row (Figma 4474:6524): the basemap's own labels on or off. */
export function LocationLabelsRow({ areShown, onToggle }: LocationLabelsRowProps) {
  return <MapStyleSwitchRow label="Location Labels" isOn={areShown} onToggle={onToggle} />;
}
