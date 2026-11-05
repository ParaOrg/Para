import { useId, useState, type FormEvent } from 'react';

import { hotspotLabel } from '@/features/routes/model/hotspots';
import { LOOP_WORD } from '@/features/routes/model/routes';

import { IkotNameField } from './ikot-name-field';
import { LineDetail } from './line-detail';
import { LoopToggle } from './loop-toggle';
import { ModeField } from './mode-field';
import { SaveDirectionName } from './save-direction-name';
import { SaveEndsFields } from './save-ends-fields';
import { SaveFooter } from './save-footer';
import { SaveNotices } from './save-notices';
import { SaveTimeline } from './save-timeline';
import { BESIDE_BODY } from './sheet';
import { useSavePanel, type UseSavePanelOptions } from './use-save-panel';
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
 * (`SaveNotices`), what the line passes (`SaveTimeline`) and is called (`SaveDirectionName`) and
 * the footer (`SaveFooter`).
 */
export function SavePanel({
  saveBlocked = null,
  onCancel,
  isPublished = false,
  onUnpublished,
  ...options
}: SavePanelProps) {
  const headingId = useId();
  const { draw, existing, directions = [] } = options;
  const panel = useSavePanel(options);
  const { ends, facts, isLoop, routeLocked } = panel;
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
  const status = isPublished && fields === opened.fields ? 'published' : 'draft';
  const unpublishing = useUnpublish({
    routeId: isPublished ? (existing?.route.id ?? null) : null,
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
      className={isBeside ? 'flex min-h-0 flex-1 flex-col' : undefined}
    >
      <div className={isBeside ? BESIDE_BODY : 'flex flex-col gap-5'}>
        <section className="flex flex-col gap-3">
          <h2 id={headingId} className="text-xl/7 font-semibold text-content-primary">
            Route Information
          </h2>
          <p className="-mt-2 text-xs text-content-quaternary">
            {panelTitle({ isEdit: !!existing, isReturnTrip: !!options.route, isLoop })}
            {routeLocked && ' · the ends belong to the route, so both directions share them'}
            {existing &&
              " · the ends, via, mode and fare note are the route's: a change here is a change to both directions"}
          </p>
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
          <ModeField mode={panel.mode} isLocked={routeLocked} onChange={panel.setMode} />
        </section>

        {(isLoop || (head && tail)) && (
          <SaveTimeline
            isLoop={isLoop}
            loopPlacesCount={facts.loopPlacesCount}
            preview={facts.preview}
          />
        )}

        <LineDetail points={draw.controlPoints.length} metres={draw.metres} status={status} />

        <SaveNotices
          segments={draw.segments}
          uTurns={draw.uTurns}
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

        <SaveDirectionName
          isLoop={isLoop}
          name={facts.name}
          direction={direction}
          hasParent={!!panel.parent}
          isEdit={!!existing}
        />

        {panel.error && <p className="text-sm text-content-error">{panel.error}</p>}
        {unpublishing.error && (
          <p role="alert" className="text-sm text-content-error">
            {unpublishing.error}
          </p>
        )}

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
        onPublish={() => void panel.submit('publish')}
      />
    </form>
  );
}

/** What this save is, under the heading: an edit, a return trip, or a new route or ikot. */
function panelTitle({
  isEdit,
  isReturnTrip,
  isLoop,
}: {
  isEdit: boolean;
  isReturnTrip: boolean;
  isLoop: boolean;
}): string {
  const loopWord = LOOP_WORD.toLowerCase();
  if (isEdit) return isLoop ? `Update this ${loopWord}` : 'Update this direction';
  if (isReturnTrip) return 'Draw the return trip';
  return isLoop ? `Save this ${loopWord}` : 'Save this route';
}
