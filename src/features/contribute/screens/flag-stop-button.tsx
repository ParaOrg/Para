import { useId } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';

import { FlagStopIcon } from '../common/flag-stop-icon';

export interface FlagStopButtonProps {
  /** False while paused: the button shows, disabled, as the Paused frame draws it. */
  isRecording: boolean;
  /** False once the ride holds the most stops it can: the button looks disabled, as paused. */
  canFlag: boolean;
  onFlag: () => void;
}

/**
 * Figma's Flag a stop (4494:2038): the Special Large IconButton with the `falgstop` icon, at the
 * top of the right-hand column over the map-style and locator buttons. A tap flags the place the
 * contributor is, just the place: no note, no question afterwards. The page says "Stop flagged" in
 * a toast at the top (onFlag).
 */
export function FlagStopButton({ isRecording, canFlag, onFlag }: FlagStopButtonProps) {
  const limitId = useId();
  const handleClick = () => {
    // aria-disabled, not disabled: focus stays on the button on the tap that fills the ride.
    if (!canFlag) return;
    onFlag();
  };

  return (
    // 16 over the map-style button, as Figma has it: 4 of them the column's own gap.
    <div className="relative mb-3">
      <IconButton
        size="large"
        tooltip="left"
        label="Flag a stop"
        icon={<FlagStopIcon />}
        disabled={!isRecording}
        aria-disabled={!canFlag || undefined}
        aria-describedby={canFlag ? undefined : limitId}
        onClick={handleClick}
      />
      {/* The look says it can do nothing; this says why. */}
      {!canFlag && (
        <span id={limitId} className="sr-only">
          This ride has the most stops it can hold.
        </span>
      )}
    </div>
  );
}
