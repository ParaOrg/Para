import { useEffect, useId, useRef, useState, type RefObject } from 'react';

import { useEscape } from '@/shared/hooks/use-escape';

import { CardMenu, hasMenuItems, type Asking, type CardActions } from './card-menu';
import type { CardStatus } from './card-status';
import { CardStatusLine } from './card-status-line';
import { MoreIcon } from './history-icons';

interface CardStatusRowProps {
  status: CardStatus;
  actions: CardActions;
  /** The card's recording in words, so every button says which one it acts on. */
  fullName: string;
  /** A question is asked under the card: the ⋮ waits until it is answered. */
  isAsking: boolean;
  /** The ⋮: Escape hands focus back to it, and so does the card when its question is kept. */
  moreRef: RefObject<HTMLButtonElement | null>;
  onUpload: () => void;
  onDownload: () => void;
  onAsk: (question: Exclude<Asking, null>) => void;
}

/**
 * The card's last line (Figma 4518:24536): its upload's status, and the ⋮ with its menu, which
 * Escape or a press anywhere else closes.
 */
export function CardStatusRow({
  status,
  actions,
  fullName,
  isAsking,
  moreRef,
  onUpload,
  onDownload,
  onAsk,
}: CardStatusRowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && areaRef.current?.contains(event.target)) return;
      setIsMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    moreRef.current?.focus();
  };
  useEscape(closeMenu, isMenuOpen);

  const thenClose = (action: () => void) => () => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <div ref={areaRef} className="relative flex h-4 items-center gap-2">
      <CardStatusLine status={status} fullName={fullName} onRetry={onUpload} />
      {hasMenuItems(actions) && (
        <button
          ref={moreRef}
          type="button"
          aria-label={`More actions for ${fullName}`}
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          disabled={isAsking}
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          className="-m-2 shrink-0 rounded-full p-2 text-content-primary disabled:text-content-disabled"
        >
          <span aria-hidden className="block size-4 *:size-full">
            <MoreIcon />
          </span>
        </button>
      )}
      {isMenuOpen && (
        <CardMenu
          actions={actions}
          fullName={fullName}
          menuId={menuId}
          onUpload={thenClose(onUpload)}
          onDownload={thenClose(onDownload)}
          onAsk={(question) => {
            setIsMenuOpen(false);
            onAsk(question);
          }}
        />
      )}
    </div>
  );
}
