import { IconButton } from '@/design-system/primitives/icon-button';

import helpIcon from './help-icon.svg?no-inline';

interface HelpButtonProps {
  onClick: () => void;
}

/**
 * Figma's ? at the Start screen's top left (4486:25007), which opens the tutorial. Built, not yet
 * shown: the tutorial is not designed (ready-screen.tsx says where it goes).
 */
export function HelpButton({ onClick }: HelpButtonProps) {
  return (
    <IconButton
      tooltip="top"
      size="large"
      label="How to record"
      icon={<img src={helpIcon} alt="" />}
      onClick={onClick}
    />
  );
}
