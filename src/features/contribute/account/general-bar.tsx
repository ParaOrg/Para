import { cn } from '@/shared/utils/cn';

import './account-icons.css';

/** The row's icon: one of Figma's, by its name. */
export type GeneralBarIcon = 'settings' | 'history' | 'logout';

/** Default for a place to go, Error for an act that ends something (Logout). */
export type GeneralBarTone = 'default' | 'error';

interface GeneralBarProps {
  icon: GeneralBarIcon;
  label: string;
  tone?: GeneralBarTone;
  /** A chevron at the right, for a row that opens a screen of its own. */
  hasChevron?: boolean;
  onClick: () => void;
}

const ICON_CLASSES = {
  settings: 'account-icon-settings',
  history: 'account-icon-history',
  logout: 'account-icon-logout',
} satisfies Record<GeneralBarIcon, string>;

const TONE_CLASSES = {
  default: 'text-content-primary',
  error: 'text-content-error',
} satisfies Record<GeneralBarTone, string>;

/**
 * Figma's GeneralBar (4513:22925): an icon, the row's words, and a chevron when it opens a screen,
 * the whole row one button.
 */
export function GeneralBar({
  icon,
  label,
  tone = 'default',
  hasChevron = false,
  onClick,
}: GeneralBarProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl py-3 text-left font-sn-pro text-base/6',
        TONE_CLASSES[tone],
      )}
    >
      <span aria-hidden className={cn('account-icon size-6 shrink-0', ICON_CLASSES[icon])} />
      <span className="min-w-0 flex-1">{label}</span>
      {hasChevron && (
        <span
          aria-hidden
          className="account-icon account-icon-chevron-right size-6 shrink-0 text-content-quaternary"
        />
      )}
    </button>
  );
}
