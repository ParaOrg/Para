import type { Ref } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';

import './start-icons.css';

interface HelpButtonProps {
  onClick: () => void;
  /** Where focus goes back to once the tutorial closes. */
  ref?: Ref<HTMLButtonElement>;
}

/** Figma's ? at the Start screen's top right (4520:3472), which opens the tutorial. */
export function HelpButton({ onClick, ref }: HelpButtonProps) {
  return (
    <IconButton
      tooltip="top"
      size="large"
      ref={ref}
      label="How to record"
      icon={<span className="start-icon start-icon-help" />}
      onClick={onClick}
    />
  );
}
