import type { Ref } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';

import { ArrowLeftIcon } from './arrow-left-icon';

interface SettingsHeaderProps {
  /** The screen's name, centred: its heading. */
  title: string;
  headingId: string;
  /** The heading, focused as the screen opens. */
  headingRef: Ref<HTMLHeadingElement>;
  /** A line the heading reads out with it, focused: news a live region would miss on arrival. */
  describedBy?: string;
  /** While a save is under way: leaving would lose what it says when it ends. */
  isBackDisabled?: boolean;
  onBack: () => void;
}

/**
 * The header of the screens inside Account (Figma 4540:4317): Back at the left and the screen's
 * name centred, an empty 40 at the right to hold it there.
 */
export function SettingsHeader({
  title,
  headingId,
  headingRef,
  describedBy,
  isBackDisabled = false,
  onBack,
}: SettingsHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-2">
      <IconButton
        tooltip="top"
        label="Back"
        icon={<ArrowLeftIcon />}
        disabled={isBackDisabled}
        onClick={onBack}
      />
      <h1
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        aria-describedby={describedBy}
        className="min-w-0 truncate text-base/6 font-medium focus:outline-none"
      >
        {title}
      </h1>
      <div aria-hidden className="size-10 shrink-0" />
    </header>
  );
}
