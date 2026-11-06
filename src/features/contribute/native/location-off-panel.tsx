import { Button } from '@/design-system/primitives/button';
import { LocationIcon } from '@/design-system/primitives/location-icon';
import { useFocusHeading } from '@/shared/hooks/use-focus-heading';

interface LocationOffPanelProps {
  /** The phone's Location settings, where its switch is. */
  onOpenSettings: () => void;
  onClose: () => void;
}

/**
 * Start with the phone's location switch off: no ride starts, and this says why and where to turn
 * it on. The next Start checks again.
 */
export function LocationOffPanel({ onOpenSettings, onClose }: LocationOffPanelProps) {
  const headingRef = useFocusHeading();
  return (
    <section
      aria-labelledby="location-off-heading"
      className="flex flex-col gap-3 bg-surface p-4 font-sn-pro text-content-primary"
    >
      <span className="flex size-8 *:size-full">
        <LocationIcon />
      </span>
      <h1
        id="location-off-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl/7 font-extrabold focus:outline-none"
      >
        Turn on location
      </h1>
      <p className="text-base/6">Para needs your location to record your ride.</p>
      <div className="flex gap-3">
        <Button variant="primary" label="Go to Settings" onClick={onOpenSettings} />
        <Button variant="secondary" label="Close" onClick={onClose} />
      </div>
    </section>
  );
}
