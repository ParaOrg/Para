import { useEffect, useId, useRef } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import type { MapCredit } from '@/features/routes/map/map-attribution';
import { useDialogFocus } from '@/shared/hooks/use-dialog-focus';
import { useEscape } from '@/shared/hooks/use-escape';
import { CloseIcon } from '@/shared/ui/route-icons';

interface MapDataSourceSheetProps {
  /** The map's credits, from mapCredits: one row each, in its order. */
  credits: readonly MapCredit[];
  /** ✕, Escape, or a tap on the dimmed map: the sheet goes and focus returns to its ⓘ. */
  onClose: () => void;
}

/**
 * The map's credits on the contributor page (Figma 4494:10177): a
 * BottomSheetConfiguration, "Map Data Source", over the map dimmed in
 * Background/surface-transparent. Each row is a link out, in a new tab. It
 * holds the keyboard while open, as a dialog does: focus goes into it, Tab
 * goes round inside it, and focus goes back to the ⓘ when it closes.
 */
export function MapDataSourceSheet({ credits, onClose }: MapDataSourceSheetProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useDialogFocus(sheetRef, false);
  useEscape(onClose);

  // A tap anywhere but the sheet, on the dimmed map, closes it.
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && sheetRef.current?.contains(e.target)) return;
      onClose();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  // Tab goes round inside the sheet, from its last link to ✕ and back.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const stops = [...sheet.querySelectorAll<HTMLElement>('a, button')];
      const first = stops.at(0);
      const last = stops.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    sheet.addEventListener('keydown', handleKeyDown);
    return () => sheet.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <div aria-hidden className="absolute inset-0 z-40 bg-surface-transparent" />
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 z-50 overflow-y-auto rounded-t-4xl bg-surface font-sn-pro shadow-bottom-sheet-top-shadow outline-none"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 id={titleId} className="min-w-0 flex-1 text-lg/7 font-bold text-content-primary">
            Map Data Source
          </h2>
          <IconButton
            icon={<CloseIcon />}
            label="Close"
            size="small"
            tooltip="top"
            onClick={onClose}
          />
        </div>
        <ul className="flex flex-col px-4 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))]">
          {credits.map((credit) => (
            <li key={credit.href} className="border-border-primary not-last:border-b-0-6">
              <CreditLink credit={credit} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** One row: its title, its grey description under it, and the chevron, the whole of it the link. */
function CreditLink({ credit }: { credit: MapCredit }) {
  return (
    <a
      href={credit.href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 py-3.5 text-content-primary"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base/6 font-medium">{credit.title}</span>
        {credit.description && (
          <span className="text-sm/5 text-content-tertiary">{credit.description}</span>
        )}
      </span>
      <ChevronRightIcon />
    </a>
  );
}

/** Figma's chevron-right, 20 across, in Content/quaternary: the row leads out. */
function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className="size-5 shrink-0 text-content-quaternary"
    >
      <path d="M6.89616 4.55485C7.14185 4.22157 7.61172 4.1506 7.94515 4.39616L7.94596 4.39697C7.94671 4.39752 7.94788 4.39842 7.94922 4.39941C7.95185 4.40136 7.95575 4.40395 7.96061 4.40755C7.97064 4.41498 7.98564 4.42601 8.00456 4.4401C8.04233 4.46825 8.09696 4.50965 8.1665 4.56217C8.30591 4.66747 8.50476 4.81922 8.74268 5.00488C9.21768 5.37557 9.8535 5.88565 10.4915 6.43962C11.1259 6.9904 11.7801 7.59948 12.2811 8.1665C12.5306 8.44897 12.758 8.73874 12.9272 9.01937C13.0841 9.2796 13.2503 9.62643 13.2503 10C13.2503 10.3736 13.0841 10.7204 12.9272 10.9806C12.758 11.2613 12.5306 11.551 12.2811 11.8335C11.7801 12.4005 11.1259 13.0096 10.4915 13.5604C9.8535 14.1144 9.21767 14.6244 8.74268 14.9951C8.50487 15.1807 8.30671 15.3325 8.16732 15.4378C8.09761 15.4905 8.04238 15.5317 8.00456 15.5599C7.98564 15.574 7.97064 15.585 7.96061 15.5924C7.95575 15.5961 7.95184 15.5986 7.94922 15.6006C7.94788 15.6016 7.94671 15.6025 7.94596 15.603L7.94515 15.6038C7.61171 15.8494 7.14185 15.7785 6.89616 15.4451C6.65052 15.1116 6.72214 14.6418 7.05566 14.3962C7.05614 14.3958 7.05712 14.3944 7.05811 14.3937C7.06024 14.3921 7.06354 14.3896 7.06787 14.3864C7.07672 14.3798 7.09022 14.3702 7.10775 14.3571C7.14316 14.3307 7.19619 14.2913 7.26318 14.2407C7.3972 14.1395 7.58911 13.9927 7.81982 13.8127C8.28229 13.4518 8.89658 12.9588 9.50846 12.4276C10.1239 11.8932 10.72 11.3346 11.1564 10.8407C11.3754 10.5928 11.5389 10.3787 11.6431 10.2059C11.7109 10.0934 11.7356 10.027 11.7448 10C11.7356 9.97301 11.7109 9.90661 11.6431 9.79411C11.5389 9.62133 11.3754 9.40721 11.1564 9.15934C10.72 8.66544 10.1239 8.1068 9.50846 7.57243C8.89659 7.04118 8.28229 6.54824 7.81982 6.18734C7.58912 6.0073 7.3972 5.8605 7.26318 5.75928C7.19619 5.70867 7.14317 5.6693 7.10775 5.6429C7.09023 5.62985 7.07673 5.62017 7.06787 5.61361C7.06355 5.61041 7.06024 5.60786 7.05811 5.60628C7.05713 5.60556 7.05614 5.60501 7.05566 5.60465C6.72214 5.35902 6.65053 4.88837 6.89616 4.55485Z" />
    </svg>
  );
}
