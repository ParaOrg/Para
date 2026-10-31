import { IconButton } from '@/design-system/primitives/icon-button';

import './start-icons.css';

interface HelpButtonProps {
  onClick: () => void;
}

/**
 * Figma's ? at the Start screen's top right (4520:3472), which opens the tutorial. Built, not yet
 * shown: the tutorial is not designed (ready-screen.tsx says where it goes).
 */
export function HelpButton({ onClick }: HelpButtonProps) {
  return (
    <IconButton
      tooltip="top"
      size="large"
      label="How to record"
      icon={<span className="start-icon start-icon-help" />}
      onClick={onClick}
    />
  );
}
