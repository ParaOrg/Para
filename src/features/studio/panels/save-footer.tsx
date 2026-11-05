import type { ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';

import type { LineStatus } from './line-detail';
import { FOOTER, FOOTER_BESIDE } from './sheet';
import type { SaveIntent } from './use-route-save';

interface SaveFooterProps {
  /** The save under way, if any: its button says so. */
  busyIntent: SaveIntent | null;
  /** Published and unchanged: Unpublish in the saves' place (Figma 4614:15082), when given. */
  status?: LineStatus;
  /** Unpublish under way: its button says so. */
  isUnpublishing?: boolean;
  onUnpublish?: () => void;
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
 * The sidebar's footer: Exit, Publish, and Save as draft, the form's submit (Figma 4300:20893);
 * published and unchanged, Exit and Unpublish (4614:15082). Over the map on a phone, Back to map
 * stands in Exit's place, since the line is kept.
 */
export function SaveFooter({
  busyIntent,
  status = 'draft',
  isUnpublishing = false,
  onUnpublish,
  saveBlocked = null,
  onExit,
  onCancel,
  onPublish,
}: SaveFooterProps) {
  const isBusy = busyIntent !== null || isUnpublishing;
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
      {status === 'published' && onUnpublish ? (
        <Grow>
          <Button
            variant="secondary"
            size="small"
            label={isUnpublishing ? 'Unpublishing…' : 'Unpublish'}
            onClick={onUnpublish}
            disabled={isBusy}
          />
        </Grow>
      ) : (
        <SaveButtons
          busyIntent={busyIntent}
          isDisabled={isBusy || saveBlocked !== null}
          blockedTitle={saveBlocked ?? undefined}
          onPublish={onPublish}
        />
      )}
    </div>
  );
}

interface SaveButtonsProps {
  busyIntent: SaveIntent | null;
  isDisabled: boolean;
  blockedTitle: string | undefined;
  onPublish: () => void;
}

/** A draft's two saves: Publish, and Save as draft, the form's submit. */
function SaveButtons({ busyIntent, isDisabled, blockedTitle, onPublish }: SaveButtonsProps) {
  return (
    <>
      <Grow>
        <Button
          variant="secondary"
          size="small"
          type="button"
          label={busyIntent === 'publish' ? 'Publishing…' : 'Publish'}
          onClick={onPublish}
          disabled={isDisabled}
          title={blockedTitle}
        />
      </Grow>
      <Grow>
        <Button
          variant="primary"
          size="small"
          type="submit"
          label={busyIntent === 'draft' ? 'Saving…' : 'Save as draft'}
          disabled={isDisabled}
          title={blockedTitle}
        />
      </Grow>
    </>
  );
}

/** A footer button that takes its share of the row, as Figma's Publish and Save as draft do. */
function Grow({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 *:w-full">{children}</div>;
}
