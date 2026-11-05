import type { ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';

import { FOOTER, FOOTER_BESIDE } from './sheet';
import type { SaveIntent } from './use-route-save';

interface SaveFooterProps {
  /** The save under way, if any: its button says so. */
  busyIntent: SaveIntent | null;
  /**
   * Why a save can't go yet (whyNotDone): the line is too short, or the router still owes it
   * road. Only beside the map, where the line is still drawn.
   */
  saveBlocked?: string | null;
  /** Beside the map: Exit, which ends the drawing (asking first when it would lose changes). */
  onExit?: () => void;
  /** Over the map: back to the drawing, which is kept. */
  onCancel?: () => void;
  onPublish: () => void;
}

/**
 * The sidebar's footer (Figma 4300:20893): Exit, Publish, and Save as draft, the form's submit.
 * Over the map on a phone, Back to map stands in Exit's place, since the line is kept.
 */
export function SaveFooter({
  busyIntent,
  saveBlocked = null,
  onExit,
  onCancel,
  onPublish,
}: SaveFooterProps) {
  const isBusy = busyIntent !== null;
  const isSaveDisabled = isBusy || saveBlocked !== null;
  const blockedTitle = saveBlocked ?? undefined;
  return (
    <div className={onCancel ? FOOTER : FOOTER_BESIDE}>
      {onCancel ? (
        <Button
          variant="plain"
          size="small"
          label="Back to map"
          onClick={onCancel}
          disabled={isBusy}
        />
      ) : (
        <Button
          variant="plain"
          tone="error"
          size="small"
          label="Exit"
          onClick={onExit}
          disabled={isBusy}
        />
      )}
      <Grow>
        <Button
          variant="secondary"
          size="small"
          type="button"
          label={busyIntent === 'publish' ? 'Publishing…' : 'Publish'}
          onClick={onPublish}
          disabled={isSaveDisabled}
          title={blockedTitle}
        />
      </Grow>
      <Grow>
        <Button
          variant="primary"
          size="small"
          type="submit"
          label={busyIntent === 'draft' ? 'Saving…' : 'Save as draft'}
          disabled={isSaveDisabled}
          title={blockedTitle}
        />
      </Grow>
    </div>
  );
}

/** A footer button that takes its share of the row, as Figma's Publish and Save as draft do. */
function Grow({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 *:w-full">{children}</div>;
}
