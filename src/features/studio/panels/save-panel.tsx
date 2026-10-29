import { hotspotLabel } from '@/features/routes/model/hotspots';
import { LOOP_WORD } from '@/features/routes/model/routes';

import { LoopToggle } from './loop-toggle';
import { RouteFields } from './route-fields';
import { SaveDirectionName } from './save-direction-name';
import { SaveEndsFields } from './save-ends-fields';
import { SaveFooter } from './save-footer';
import { SaveNotices } from './save-notices';
import { SaveTimeline } from './save-timeline';
import { OVERLAY, PANEL } from './sheet';
import { useSavePanel, type UseSavePanelOptions } from './use-save-panel';
import { ViaField } from './via-field';

interface SavePanelProps extends UseSavePanelOptions {
  onCancel: () => void;
}

/**
 * The one form in the app. Appears once, at ✓ Done.
 *
 * It asks for a route's two ends, not its name: the name is generated from
 * them and cannot be typed over, so a hotspot renamed once fixes every route
 * through it. Nothing here is required except the two ends — the signboard is
 * an observed fact and can wait until it is known.
 *
 * Its state and its submit are `useSavePanel`; its pieces live beside it: the
 * ends (`SaveEndsFields`), the route's facts (`RouteFields`, `ViaField`), the
 * notices (`SaveNotices`), what the line passes (`SaveTimeline`) and is
 * called (`SaveDirectionName`), the buttons (`SaveFooter`) and the phone
 * layout's classes (`sheet.ts`).
 */
export function SavePanel({ onCancel, ...options }: SavePanelProps) {
  const { draw, existing, route, directions = [] } = options;
  const panel = useSavePanel(options);
  const { ends, facts, isLoop, routeLocked } = panel;
  const { hotspots, head, tail } = ends;
  const { reversed, direction } = facts;

  const routeFields = (
    <RouteFields
      signboard={panel.signboard}
      mode={panel.mode}
      isLocked={routeLocked}
      isSignboardRequired={isLoop}
      onSignboardChange={panel.setSignboard}
      onModeChange={panel.setMode}
    />
  );

  return (
    <div className={OVERLAY}>
      <form onSubmit={panel.submit} className={PANEL}>
        <h2 className="text-base font-medium text-neutral-900">
          {panelTitle({ isEdit: !!existing, isReturnTrip: !!route, isLoop })}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          {draw.controlPoints.length} points · {(draw.metres / 1000).toFixed(2)} km
          {routeLocked && ' · the ends belong to the route, so both directions share them'}
          {existing &&
            " · the ends, via, signboard, mode and fare note are the route's: a change here is a change to both directions"}
        </p>
        <LoopToggle isLoop={isLoop} isLocked={panel.loopLocked} onChange={panel.setIsLoop} />
        {isLoop && <div className="mt-3">{routeFields}</div>}
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

        {!isLoop && (
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

        {(isLoop || (head && tail)) && (
          <SaveTimeline
            isLoop={isLoop}
            loopPlacesCount={facts.loopPlacesCount}
            preview={facts.preview}
          />
        )}

        <ViaField
          value={panel.via}
          isLoop={isLoop}
          isLocked={routeLocked}
          onChange={panel.setVia}
        />

        <SaveDirectionName
          isLoop={isLoop}
          name={facts.name}
          direction={direction}
          hasParent={!!panel.parent}
          isEdit={!!existing}
        />

        {!isLoop && (
          <>
            <hr className="my-4 border-neutral-200" />
            {routeFields}
          </>
        )}

        {panel.error && <p className="mt-3 text-sm text-red-600">{panel.error}</p>}

        <SaveFooter isBusy={panel.busy} isEdit={!!existing} onCancel={onCancel} />
      </form>
    </div>
  );
}

/** The panel's heading: an edit, a return trip, or a new route or loop. */
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
