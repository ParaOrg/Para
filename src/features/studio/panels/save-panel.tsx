import { useId, useState, type FormEvent } from 'react';

import { hotspotLabel } from '@/features/routes/model/hotspots';
import { isLineMode } from '@/features/routes/model/routes';

import { DraftAlert } from './draft-alert';
import { DraftSignboards } from './draft-signboards';
import { IkotNameField } from './ikot-name-field';
import { LineDetail } from './line-detail';
import { LoopToggle } from './loop-toggle';
import { ModeField } from './mode-field';
import { RouteInfoHeading } from './route-info-heading';
import { SaveEndsFields } from './save-ends-fields';
import { SaveFooter } from './save-footer';
import { SaveNotices } from './save-notices';
import { SaveTimeline } from './save-timeline';
import { BESIDE_BODY } from './sheet';
import { useLineStamps } from './use-line-stamps';
import { useSavePanel, type UseSavePanelOptions } from './use-save-panel';
import { useStoredDraft } from './use-stored-draft';
import { useUnpublish } from './use-unpublish';
import { ViaField } from './via-field';

interface SavePanelProps extends UseSavePanelOptions {
  /** Why a save can't go yet, said under the form; null when it can. Beside the map only. */
  saveBlocked?: string | null;
  /** Back to the map, when the form covers it. Absent beside the map, where Exit ends the drawing. */
  onCancel?: () => void;
  /**
   * The route as it stands is published, has no draft and its line is as it opened (the caller
   * knows the line from before this form): Published until a field changes too.
   */
  isPublished?: boolean;
  /** The published route came off the map (Unpublish). */
  onUnpublished?: () => void;
  /** The editor's own draft of the route was dropped (Discard draft). */
  onDiscarded?: () => void;
}

/**
 * The route's sidebar (Figma 4300:20893). On a computer it stands left of the map the whole time
 * a route is drawn, filling itself in as the line reaches places; narrower, it covers the map at
 * Done. Which is the caller's: it wraps the form in SaveBesideFrame or SaveSheetFrame.
 *
 * Route Information asks for a route's two ends, its Origin and Destination, not its name: the
 * name is generated from them and cannot be typed over, so a hotspot renamed once fixes every
 * route through it. An ikot has no ends: it is named by its Ikot name (ADR 0005).
 *
 * Its state and its submit are `useSavePanel`; its pieces live beside it: the ends
 * (`SaveEndsFields`), the route's facts (`IkotNameField`, `ViaField`, `ModeField`), the notices
 * (`SaveNotices`), what the line passes (`SaveTimeline`) and the footer (`SaveFooter`).
 */
export function SavePanel({
  saveBlocked = null,
  onCancel,
  isPublished = false,
  onUnpublished,
  onDiscarded,
  ...options
}: SavePanelProps) {
  const headingId = useId();
  const { draw, existing, directions = [] } = options;
  const panel = useSavePanel(options);
  const { ends, facts, isLoop, routeLocked } = panel;
  const modeLocked = routeLocked || isLineMode(existing?.route.mode); // a saved line stays one
  const { hotspots, head, tail } = ends;
  const { reversed, direction } = facts;
  const isBeside = !onCancel;

  // What Exit would lose: the line or a field changed since the sidebar opened.
  const fields = JSON.stringify([
    panel.signboard,
    panel.mode,
    panel.via,
    ends.headId,
    ends.tailId,
    isLoop,
  ]);
  const line = JSON.stringify(draw.controlPoints);
  const [opened] = useState({ fields, line });
  const isChanged = fields !== opened.fields || line !== opened.line;
  const stored = useStoredDraft({
    kind: 'route',
    subjectId: panel.parent?.id ?? null,
    isChanged,
    publishForm: () => void panel.submit('publish'),
    onApproved: () => options.onPublished?.(existing?.id ?? panel.parent?.id ?? ''),
    onDiscarded,
  });
  // Draft only when one is stored; published and as it was, Published; else nothing saved yet.
  const status = stored.footer.hasDraft
    ? 'draft'
    : isPublished && fields === opened.fields
      ? 'published'
      : 'unsaved';
  const stamps = useLineStamps('route', panel.parent?.id ?? null);
  const unpublishing = useUnpublish({
    kind: 'route',
    subjectId: isPublished ? (existing?.route.id ?? null) : null,
    onUnpublished,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void panel.submit('draft');
  };
  const handleExit = () => {
    if (isChanged && !window.confirm('Discard your changes?')) return;
    draw.cancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={headingId}
      data-testid="route-panel"
      className={isBeside ? 'flex min-h-0 flex-1 flex-col' : undefined}
    >
      <div className={isBeside ? BESIDE_BODY : 'flex flex-col gap-5'}>
        <section className="flex flex-col gap-3">
          <RouteInfoHeading
            id={headingId}
            hasDraft={stored.footer.hasDraft}
            isEdit={!!existing}
            isReturnTrip={!!options.route}
            isLoop={isLoop}
            isRouteLocked={routeLocked}
          />
          <LoopToggle isLoop={isLoop} isLocked={panel.loopLocked} onChange={panel.setIsLoop} />
          {isLoop ? (
            <IkotNameField
              value={panel.signboard}
              isLocked={routeLocked}
              onChange={panel.setSignboard}
            />
          ) : (
            <SaveEndsFields
              places={ends.places}
              headPlace={ends.headPlace}
              tailPlace={ends.tailPlace}
              making={ends.making}
              nearHead={ends.nearHead}
              nearTail={ends.nearTail}
              hotspots={hotspots}
              directions={directions}
              isLocked={routeLocked}
              headRef={ends.headSelect}
              tailRef={ends.tailSelect}
              onHeadChange={ends.pickHead}
              onTailChange={ends.pickTail}
              onPlaceSaved={ends.handlePlaceSaved}
              onPlaceCancel={ends.closeMaking}
            />
          )}
          <ViaField
            value={panel.via}
            isLoop={isLoop}
            isLocked={routeLocked}
            onChange={panel.setVia}
          />
          <ModeField mode={panel.mode} isLocked={modeLocked} onChange={panel.setMode} />
        </section>

        {/* Add signboard, beside the map on an existing direction: a placeholder until it is drawn. */}
        {isBeside && existing && <DraftSignboards direction={existing} />}

        {(isLoop || (head && tail)) && (
          <SaveTimeline
            isLoop={isLoop}
            loopPlacesCount={facts.loopPlacesCount}
            preview={facts.preview}
          />
        )}

        <LineDetail
          points={draw.controlPoints.length}
          metres={draw.metres}
          status={status}
          {...stamps}
        />

        <SaveNotices
          segments={draw.segments}
          loop={panel.loop}
          hotspotsCount={hotspots.length}
          isLoop={isLoop}
          passedTwice={isLoop ? facts.placesPassedTwice : []}
          wrongWay={
            !isLoop && facts.wrongWayRound && head && tail
              ? {
                  direction,
                  startsAt: hotspotLabel(reversed ? head : tail),
                  from: hotspotLabel(reversed ? tail : head),
                }
              : null
          }
          borrowed={
            facts.borrowParent && facts.borrowedM > 0
              ? { metres: facts.borrowedM, parent: facts.borrowParent }
              : null
          }
          sameEnds={facts.sameEnds}
          direction={direction}
        />

        {panel.error && (
          <p role="alert" className="text-sm text-content-error">
            {panel.error}
          </p>
        )}
        <DraftAlert error={unpublishing.error ?? stored.error} {...stored.keeping} />

        {saveBlocked && <p className="text-sm text-content-quaternary">{saveBlocked}</p>}
      </div>

      <SaveFooter
        busyIntent={panel.busy}
        status={status}
        isUnpublishing={unpublishing.isBusy}
        onUnpublish={() => unpublishing.unpublish(existing?.route.name ?? 'this route')}
        saveBlocked={saveBlocked}
        onExit={handleExit}
        onCancel={onCancel}
        {...stored.footer}
      />
    </form>
  );
}
