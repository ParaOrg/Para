import type { ReactNode, Ref } from 'react';

import { cn } from '@/shared/utils/cn';

import { useSlidingPill } from './use-sliding-pill';
import { useToolbarSlide } from './use-toolbar-slide';
import { TOOLBAR_TAB_ATTR } from '../common/data-attributes';

import '../screens/start-icons.css';

/** The screen the toolbar is shown on: its tab is the marked one. */
export type ToolbarTab = 'record' | 'history' | 'account';

interface BottomToolbarProps {
  /** The screen showing: its tab is the marked one. */
  current?: ToolbarTab;
  /** Record: back to Start. */
  onOpenRecord?: () => void;
  /** History. */
  onOpenHistory?: () => void;
  /** Account. Left out in a build with no accounts, which has no Account tab. */
  onOpenAccount?: () => void;
  /** A finger landing on a tab, before its tap: the page fetches that tab's screen ahead. */
  onTabPointerDown?: (tab: ToolbarTab) => void;
  /** The History tab, so focus can come back to it when History closes. */
  historyRef?: Ref<HTMLButtonElement>;
  /** The Account tab, so focus can come back to it when Account closes. */
  accountRef?: Ref<HTMLButtonElement>;
}

const TAB = 'relative flex min-w-18 flex-col items-center rounded-full py-1 text-xs/4 font-medium';

/**
 * Figma's BottomToolbar (4496:10482): Record, History and Account, the screen showing marked. The
 * page draws one, over Record, History and Account alike, and never draws it again between them:
 * the screens slide under it, and only its pill moves, to the tab of the screen showing.
 */
export function BottomToolbar({
  current = 'record',
  onOpenRecord,
  onOpenHistory,
  onOpenAccount,
  onTabPointerDown,
  historyRef,
  accountRef,
}: BottomToolbarProps) {
  const { barRef, pillRef } = useSlidingPill(current);
  // Hold and slide the pill along the bar to another tab (use-toolbar-slide.ts).
  const openers: Record<ToolbarTab, (() => void) | undefined> = {
    record: onOpenRecord,
    history: onOpenHistory,
    account: onOpenAccount,
  };
  useToolbarSlide({
    barRef,
    pillRef,
    current,
    onPick: (tab) => openers[tab]?.(),
    onTabReached: onTabPointerDown,
  });
  return (
    <nav aria-label="Screens" className="flex justify-center">
      <div
        ref={barRef}
        // No pan, scroll or text selection from a finger on the bar: it slides the pill.
        className="tab-toolbar relative flex touch-none items-center rounded-full bg-surface p-1 font-sn-pro shadow-large select-none"
      >
        {/* The pill under the screen showing: placed, and slid, by useSlidingPill. */}
        <span
          ref={pillRef}
          aria-hidden
          className="absolute inset-y-1 left-0 rounded-full bg-surface-tertiary"
        />
        <Tab
          name="record"
          isCurrent={current === 'record'}
          onClick={onOpenRecord}
          onPointerDown={onTabPointerDown}
        >
          <span aria-hidden className="start-icon start-icon-record size-6" />
          Record
        </Tab>
        <Tab
          name="history"
          isCurrent={current === 'history'}
          onClick={onOpenHistory}
          onPointerDown={onTabPointerDown}
          ref={historyRef}
        >
          <span aria-hidden className="start-icon start-icon-history-tab size-6" />
          History
        </Tab>
        {(onOpenAccount || current === 'account') && (
          <Tab
            name="account"
            isCurrent={current === 'account'}
            onClick={onOpenAccount}
            onPointerDown={onTabPointerDown}
            ref={accountRef}
          >
            <span aria-hidden className="start-icon start-icon-account-tab size-6" />
            Account
          </Tab>
        )}
      </div>
    </nav>
  );
}

interface TabProps {
  name: ToolbarTab;
  isCurrent: boolean;
  onClick: (() => void) | undefined;
  onPointerDown: ((tab: ToolbarTab) => void) | undefined;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}

/** The screen showing is marked, not a button, since there is nowhere for it to go. */
function Tab({ name, isCurrent, onClick, onPointerDown, ref, children }: TabProps) {
  if (isCurrent) {
    return (
      <span
        {...{ [TOOLBAR_TAB_ATTR]: name }}
        aria-current="page"
        className={cn(TAB, 'text-content-primary')}
      >
        {children}
      </span>
    );
  }
  return (
    <button
      ref={ref}
      {...{ [TOOLBAR_TAB_ATTR]: name }}
      type="button"
      onPointerDown={() => onPointerDown?.(name)}
      onClick={onClick}
      className={cn(TAB, 'text-content-quaternary')}
    >
      {children}
    </button>
  );
}
