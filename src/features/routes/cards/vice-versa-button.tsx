import { useId } from 'react';

import { Button } from '@/design-system/primitives/button';
import { SwitchVerticalIcon } from '@/shared/ui/route-icons';

interface ViceVersaButtonProps {
  /** The way the list is showing (wayWord): Papunta, Pabalik, or a train's bound. */
  way: string;
  /** Where a tap leads (switchWord). */
  wayTo: string;
  /** False when the other way round has nothing drawn: it rests disabled. */
  isSwitchable: boolean;
  /** Whether the way back is showing, for the suites (`data-back`). */
  isBack: boolean;
  /** Every route listed turned to its other way round, as the studio's PAPUNTA turns them. */
  onSwitch: () => void;
  /** What the suites find it by: the map's, or the one in the bar a list at the top shows. */
  testId?: string;
}

/**
 * Vice Versa (4831:51276), floating on the map over the public map's route list: the Button's
 * Secondary, its words then ⇅ (switch-vertical). A tap turns every route listed the other way
 * round. Its words never change, so a screen reader hears which way is showing and where a tap
 * leads after its name. `chooser-flip` to the suites.
 */
export function ViceVersaButton({
  way,
  wayTo,
  isSwitchable,
  isBack,
  onSwitch,
  testId = 'chooser-flip',
}: ViceVersaButtonProps) {
  const hintId = useId();
  // The hint stands beside the button, not in it, where it would join the button's name. Figma's
  // shadow-sm lies under it, as under every control floating on the map.
  return (
    <span className="flex rounded-full shadow-sm">
      <Button
        variant="secondary"
        size="large"
        label="Vice Versa"
        lastIcon={<SwitchVerticalIcon />}
        aria-describedby={hintId}
        data-testid={testId}
        data-back={isBack}
        disabled={!isSwitchable}
        onClick={onSwitch}
      />
      <span id={hintId} className="sr-only">
        {way} showing, turns to {wayTo}
      </span>
    </span>
  );
}
