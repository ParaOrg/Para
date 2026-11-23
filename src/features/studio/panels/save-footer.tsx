import type { ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';

import type { LineStatus } from './line-detail';
import type { SaveIntent } from './save-intent';
import { FOOTER, FOOTER_BESIDE } from './sheet';
import type { ReviewAction } from '../data/review-commands';

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
  /** A draft is stored for it: Publish reads Approve, which publishes that draft. */
  hasDraft?: boolean;
  /** The editor's own stored draft: Discard draft, which drops it. */
  onDiscard?: () => void;
  /** What is under way on the stored draft (useStoredDraft): its button says so. */
  draftBusy?: ReviewAction | null;
}

/**
 * The sidebar's footer: Exit, Publish, and Save as draft, the form's submit (Figma 4300:20893);
 * published and unchanged, Exit and Unpublish (4614:15082). Over the map on a phone, Back to map
 * stands in Exit's place, since the line is kept. With a draft stored, Publish reads Approve, and
 * the maker has Discard beside Exit: a look for now, until the owner designs it.
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
  hasDraft = false,
  onDiscard,
  draftBusy = null,
}: SaveFooterProps) {
  const isBusy = busyIntent !== null || isUnpublishing || draftBusy !== null;
  const isPublishing = busyIntent === 'publish' || draftBusy === 'publish';
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
      {onDiscard && (
        <Button
          variant="plain"
          tone="error"
          size="small"
          label={draftBusy === 'discard' ? 'Discarding…' : 'Discard'}
          onClick={onDiscard}
          disabled={isBusy}
        />
      )}
      {status === 'published' && onUnpublish && !hasDraft ? (
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
          publishLabel={publishLabel(hasDraft, isPublishing)}
          isDisabled={isBusy || saveBlocked !== null}
          blockedTitle={saveBlocked ?? undefined}
          onPublish={onPublish}
        />
      )}
    </div>
  );
}

/** Publish, or Approve when a draft is stored; while it runs, what it is doing. */
function publishLabel(hasDraft: boolean, isPublishing: boolean): string {
  if (hasDraft) return isPublishing ? 'Approving…' : 'Approve';
  return isPublishing ? 'Publishing…' : 'Publish';
}

interface SaveButtonsProps {
  busyIntent: SaveIntent | null;
  publishLabel: string;
  isDisabled: boolean;
  blockedTitle: string | undefined;
  onPublish: () => void;
}

/** A draft's two saves: Publish (or Approve), and Save as draft, the form's submit. */
function SaveButtons({
  busyIntent,
  publishLabel,
  isDisabled,
  blockedTitle,
  onPublish,
}: SaveButtonsProps) {
  return (
    <>
      <Grow>
        <Button
          variant="secondary"
          size="small"
          type="button"
          label={publishLabel}
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
  return <div className="flex flex-1 *:w-full *:whitespace-nowrap">{children}</div>;
}
