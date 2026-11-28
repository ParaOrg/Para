import type { KeyboardEvent, Ref } from 'react';

import { cn } from '@/shared/utils/cn';

/** One choice in a menu. */
export interface MenuChoice {
  id: string;
  label: string;
  /** Destructive words, in Content/error. */
  isDestructive?: boolean;
}

interface MenuListProps {
  ref: Ref<HTMLDivElement>;
  id: string;
  /** The menu's name for a screen reader: its button's. */
  label: string;
  choices: readonly MenuChoice[];
  /** Which edge of its button the menu lines up with. */
  align: 'left' | 'right';
  onChoose: (id: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

const ALIGN = { left: 'left-0', right: 'right-0' } satisfies Record<'left' | 'right', string>;

const WORDS = {
  default: 'text-content-primary',
  destructive: 'text-content-error',
} satisfies Record<'default' | 'destructive', string>;

/**
 * The menu a studio menu button opens under it, in the New menu's look (new-menu.tsx), a
 * placeholder until the owner draws one. Its keyboard is its button's hook's (useNewMenu).
 */
export function MenuList({ ref, id, label, choices, align, onChoose, onKeyDown }: MenuListProps) {
  return (
    <div
      ref={ref}
      id={id}
      role="menu"
      tabIndex={-1}
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'absolute top-full z-30 mt-1 flex w-48 flex-col gap-1 rounded-2xl bg-surface p-1.5 shadow-sm',
        ALIGN[align],
      )}
    >
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          role="menuitem"
          onClick={() => onChoose(choice.id)}
          className={cn(
            'flex w-full rounded-xl p-2 text-left font-sn-pro text-sm/5 font-semibold hover:bg-surface-secondary focus-visible:bg-surface-secondary',
            WORDS[choice.isDestructive ? 'destructive' : 'default'],
          )}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
