import type { Ref } from 'react';

import { cn } from '@/shared/utils/cn';

// Figma's `Record` and Account, drawn in the colours each tab wears; files, not inline, so the
// page's own script stays small.
import accountTabIcon from './account-tab-icon.svg?no-inline';
import recordIcon from './record-icon.svg?no-inline';

interface BottomToolbarProps {
  onOpenAccount: () => void;
  /** The Account tab, so focus can come back to it when Account closes. */
  accountRef?: Ref<HTMLButtonElement>;
}

const TAB = 'flex min-w-18 flex-col items-center rounded-full py-1 text-xs/4 font-medium';

/**
 * Figma's BottomToolbar (4486:25116): Record, the screen showing, and Account. A pill over the
 * map, centred above the Start bar.
 */
export function BottomToolbar({ onOpenAccount, accountRef }: BottomToolbarProps) {
  return (
    <nav aria-label="Screens" className="flex justify-center">
      <div className="flex items-center rounded-full bg-surface p-1 font-sn-pro">
        {/* The screen showing: marked, not a button, since there is nowhere for it to go. */}
        <span aria-current="page" className={cn(TAB, 'bg-surface-tertiary text-content-primary')}>
          <img src={recordIcon} alt="" className="size-6" />
          Record
        </span>
        <button
          ref={accountRef}
          type="button"
          onClick={onOpenAccount}
          className={cn(TAB, 'text-content-quaternary')}
        >
          <img src={accountTabIcon} alt="" className="size-6" />
          Account
        </button>
      </div>
    </nav>
  );
}
