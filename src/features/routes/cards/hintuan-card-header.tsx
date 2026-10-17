import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftIcon, CloseIcon, InformationIcon } from '@/shared/ui/route-icons';

interface HintuanCardHeaderProps {
  label: string;
  /** ‹, back to the trip whose name on the map opened the card; none, and no ‹. */
  onBack?: (() => void) | null;
  onClose: () => void;
}

/**
 * RouteCardHeader/Variant3: the place's name, ⓘ and ✕; ‹ before the name when a trip's name on
 * the map opened it, as a trip has.
 */
export function HintuanCardHeader({ label, onBack, onClose }: HintuanCardHeaderProps) {
  return (
    <div
      data-testid="card-place"
      className="flex w-full items-center gap-2 bg-surface px-3 pt-0 pb-4 @float:pt-3"
    >
      {onBack && (
        <IconButton
          variant="special"
          icon={<ChevronLeftIcon />}
          label="Back"
          tooltip="top"
          onClick={onBack}
        />
      )}
      <p className="min-w-0 flex-1 truncate font-sn-pro text-2xl/8 font-black text-content-primary">
        {label}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <IconButton
          variant="special"
          icon={<InformationIcon />}
          label="About this place"
          tooltip="top"
          disabled
        />
        <IconButton
          variant="special"
          icon={<CloseIcon />}
          label="Close"
          tooltip="top"
          onClick={onClose}
        />
      </div>
    </div>
  );
}
