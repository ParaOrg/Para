import { IconButton } from '@/design-system/primitives/icon-button';
import { ViceVersaButton } from '@/features/routes/cards/vice-versa-button';
import { ChevronDownIcon } from '@/shared/ui/route-icons';

interface ListTopBarProps {
  /** Vice Versa's words for the list's way, as the map's Vice Versa has them (listWay). */
  way: { way: string; wayTo: string; isSwitchable: boolean } | null;
  isBack: boolean;
  onFlip: () => void;
  /** ⌄: the list down to the middle, the map in sight again. */
  onMiddle: () => void;
}

/**
 * What a route list raised to the top shows over its foot (4885:42122): Vice Versa at the left and
 * ⌄ at the right, 16 in and 24 up, under shadow-sm; the list's last card, the DonationCard, keeps
 * 80 under its words for it. Only while the list stands at its top, filling the map (`data-reaches-
 * top`: a short list's top is its last card, the map in sight above it); not where the card floats.
 */
export function ListTopBar({ way, isBack, onFlip, onMiddle }: ListTopBarProps) {
  return (
    <div
      data-testid="list-top-bar"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden items-start justify-between px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] group-has-[[data-testid=chooser][data-snap=full][data-reaches-top]:not([hidden])]/map:flex @float:hidden! [&_button]:pointer-events-auto"
    >
      {way ? (
        <ViceVersaButton
          way={way.way}
          wayTo={way.wayTo}
          isSwitchable={way.isSwitchable}
          isBack={isBack}
          onSwitch={onFlip}
          testId="list-top-flip"
        />
      ) : (
        <span />
      )}
      <span className="flex rounded-full shadow-sm">
        <IconButton
          size="large"
          icon={<ChevronDownIcon />}
          label="Down to the middle"
          tooltip="right"
          onClick={onMiddle}
          data-testid="list-to-middle"
        />
      </span>
    </div>
  );
}
