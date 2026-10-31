import type { ReactNode, Ref } from 'react';

import { cn } from '@/shared/utils/cn';

import './start-icons.css';

/** The screen the toolbar is shown on: its tab is the marked one. */
export type ToolbarTab = 'record' | 'account';

interface BottomToolbarProps {
  current?: ToolbarTab;
  /** Record, from Account: back to Start. */
  onOpenRecord?: () => void;
  onOpenAccount?: () => void;
  /** The Account tab, so focus can come back to it when Account closes. */
  accountRef?: Ref<HTMLButtonElement>;
}

const TAB = 'flex min-w-18 flex-col items-center rounded-full py-1 text-xs/4 font-medium';

/**
 * Figma's BottomToolbar (4486:25116): Record and Account, the screen showing marked. A pill over
 * the map, centred above the Start bar, and at the foot of Account.
 */
export function BottomToolbar({
  current = 'record',
  onOpenRecord,
  onOpenAccount,
  accountRef,
}: BottomToolbarProps) {
  return (
    <nav aria-label="Screens" className="flex justify-center">
      <div className="flex items-center rounded-full bg-surface p-1 font-sn-pro">
        <Tab isCurrent={current === 'record'} onClick={onOpenRecord}>
          <span aria-hidden className="start-icon start-icon-record size-6" />
          Record
        </Tab>
        <Tab isCurrent={current === 'account'} onClick={onOpenAccount} ref={accountRef}>
          <span aria-hidden className="start-icon start-icon-account-tab size-6" />
          Account
        </Tab>
      </div>
    </nav>
  );
}

interface TabProps {
  isCurrent: boolean;
  onClick: (() => void) | undefined;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}

/** The screen showing is marked, not a button, since there is nowhere for it to go. */
function Tab({ isCurrent, onClick, ref, children }: TabProps) {
  if (isCurrent) {
    return (
      <span aria-current="page" className={cn(TAB, 'bg-surface-tertiary text-content-primary')}>
        {children}
      </span>
    );
  }
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(TAB, 'text-content-quaternary')}
    >
      {children}
    </button>
  );
}
