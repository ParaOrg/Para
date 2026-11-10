import { useId, useMemo, useState, type FormEvent } from 'react';

import { TextField } from '@/design-system/primitives/text-field';
import { coarse } from '@/features/routes/map/map-view';
import { parseAliases, type HotspotRow } from '@/features/routes/model/hotspots';
import { isLoop, type DirectionRow } from '@/features/routes/model/routes';

import { DraftAlert } from './draft-alert';
import { DraftBadge } from './draft-badge';
import { groupBySignboard, knownInformalNames, tickedDirections } from './hotspot-checks';
import { LineDetail } from './line-detail';
import { PassesThrough } from './passes-through';
import { SaveFooter } from './save-footer';
import type { SaveIntent } from './save-intent';
import { BESIDE_BODY } from './sheet';
import { TerminalChecklist } from './terminal-checklist';
import { useHotspotSave } from './use-hotspot-save';
import { useLineStamps } from './use-line-stamps';
import { useNearLines } from './use-near-lines';
import { useStoredDraft } from './use-stored-draft';
import { useUnpublish } from './use-unpublish';
import { linksThrough, directionsStartingIn } from '../data/hotspots-geometry';
import type { Drawing } from '../drawing/use-drawing';

interface HotspotPanelProps {
  draw: Drawing;
  /** The hotspot being edited, or null for a new one. */
  existing: HotspotRow | null;
  /** For an existing terminal: the directions currently linked to it. */
  existingLinks: string[];
  /** Every saved direction — the terminal checklist and the hintuan preview. */
  directions: DirectionRow[];
  /** Every saved hotspot, so the informal-name box can offer the names already in use. */
  hotspots?: HotspotRow[];
  /** Back to the map, when the form covers it. Absent beside the map, where Exit ends the drawing. */
  onCancel?: () => void;
  /** Why a save can't go yet, said under the form; null when it can. Beside the map only. */
  saveBlocked?: string | null;
  /**
   * The hotspot as it stands is published, has no draft and its outline is as it opened:
   * Published until a field changes too.
   */
  isPublished?: boolean;
  /** Hears the hotspot a save stored as a draft. */
  onDrafted?: (hotspotId: string) => void;
  /** Hears the hotspot a publish made published: the map has changed. */
  onPublished?: (hotspotId: string) => void;
  /** The published hotspot came off the map (Unpublish). */
  onUnpublished?: () => void;
  /** The editor's own draft of the hotspot was dropped (Discard draft). */
  onDiscarded?: () => void;
}

/**
 * A hotspot's sidebar: beside the map on a computer the whole time its outline is drawn, over it
 * at Done on a phone, as a route's is (SavePanel), wrapped by the caller in SaveBesideFrame or
 * SaveSheetFrame. Its Information, then what it links, then its Line detail and the same footer.
 * Name is the only required field.
 *
 * Terminal: a checklist of every direction, pre-ticked with the ones that
 * start inside the outline; the owner decides (TerminalChecklist). Hintuan:
 * a read-only preview of the directions that pass under the outline — the
 * polygon decides, and this shows exactly what the save will write
 * (PassesThrough).
 */
export function HotspotPanel({
  draw,
  existing,
  existingLinks,
  directions,
  hotspots = [],
  onCancel,
  saveBlocked = null,
  isPublished = false,
  onDrafted,
  onPublished,
  onUnpublished,
  onDiscarded,
}: HotspotPanelProps) {
  const headingId = useId();
  const informalListId = useId();
  const stopNameHintId = useId();
  const isBeside = !onCancel;
  const area = draw.area;
  const kind = area?.kind ?? 'hintuan';
  const ring = draw.controlPoints;

  const [name, setName] = useState(existing?.name ?? '');
  const [informal, setInformal] = useState(existing?.informal ?? '');
  // Also called and Note are off the form for now; a box that has them keeps them.
  const aliasText = existing?.aliases?.join(', ') ?? '';
  const note = existing?.note ?? '';

  // The informal names already in use, offered as suggestions so a second box
  // for the same place joins the group instead of starting "SM  Fairview".
  const knownInformal = useMemo(
    () => knownInformalNames(hotspots, existing?.id),
    [hotspots, existing?.id],
  );
  const { busy, error, setError, save: saveHotspot } = useHotspotSave({ onDrafted, onPublished });
  const hotspotId = existing?.id ?? area?.hotspotId ?? null;

  // The directions the outline can reach, read in full; Save waits for them.
  const lined = useNearLines(ring, directions, setError);
  const lines = lined ?? directions;

  const station = existing?.line ?? null;
  const through = useMemo(() => linksThrough(ring, lines, station), [ring, lines, station]);
  const throughIds = useMemo(() => new Set(through.map((l) => l.directionId)), [through]);

  // A terminal's checklist is pre-ticked from the full lines, once they are
  // in; a box the owner ticks or unticks before then keeps the owner's
  // choice over the pre-tick. Set during render, once, as the lines arrive.
  const [startTicks, setStartTicks] = useState<Set<string> | null>(() =>
    existing ? new Set(existingLinks) : null,
  );
  if (lined && startTicks === null)
    setStartTicks(
      new Set(
        directionsStartingIn(
          ring,
          lined.filter((v) => !isLoop(v)),
        ),
      ),
    );
  const [chosen, setChosen] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const ticked = useMemo(() => tickedDirections(startTicks, chosen), [startTicks, chosen]);

  // An ikot links the terminals on it by itself (terminalLinks), so it is not a choice here.
  const groups = useMemo(() => groupBySignboard(lines.filter((v) => !isLoop(v))), [lines]);
  const hintuanGroups = useMemo(
    () => groupBySignboard(lines.filter((v) => throughIds.has(v.id))),
    [lines, throughIds],
  );

  function toggle(id: string) {
    setChosen((m) => new Map(m).set(id, !ticked.has(id)));
  }

  const label = kind === 'terminal' ? 'Terminal' : 'Hintuan';

  // What Exit would lose: the outline or a field changed since the sidebar opened. Whether the
  // outline is as it opened is the caller's (isPublished): the form starts again on a read.
  const fields = JSON.stringify([name, informal, [...ticked].sort()]);
  const outline = JSON.stringify(ring);
  const [opened] = useState({ fields, outline });
  const isChanged = fields !== opened.fields || outline !== opened.outline;
  const stored = useStoredDraft({
    kind: 'hotspot',
    subjectId: existing?.id ?? null,
    isChanged,
    publishForm: () => save('publish'),
    onApproved: () => onPublished?.(existing?.id ?? ''),
    onDiscarded,
  });
  // Draft only when one is stored; published and as it was, Published; else nothing saved yet.
  const status = stored.footer.hasDraft
    ? 'draft'
    : isPublished && fields === opened.fields
      ? 'published'
      : 'unsaved';
  const stamps = useLineStamps('hotspot', existing?.id ?? null);
  const unpublishing = useUnpublish({
    kind: 'hotspot',
    subjectId: isPublished ? (existing?.id ?? null) : null,
    onUnpublished,
  });

  const save = (intent: SaveIntent) =>
    void saveHotspot(
      { ring, kind, hotspots, hotspotId, name, informal },
      {
        kind,
        name,
        informal,
        aliases: parseAliases(aliasText, [name, informal]),
        note,
        ring,
        directionIds: kind === 'terminal' ? [...ticked] : undefined,
        directions: lines,
      },
      intent,
    );
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    save('draft');
  };
  const handleExit = () => {
    if (isChanged && !window.confirm('Discard your changes?')) return;
    draw.cancel();
  };
  // The lines the outline reaches are read before a save can say what it links.
  const blocked = saveBlocked ?? (lined ? null : 'Reading the lines near it…');

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={headingId}
      data-testid="hotspot-panel"
      className={isBeside ? 'flex min-h-0 flex-1 flex-col' : undefined}
    >
      <div className={isBeside ? BESIDE_BODY : 'flex flex-col gap-5'}>
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 id={headingId} className="text-xl/7 font-semibold text-content-primary">
              {label} Information
            </h2>
            {stored.footer.hasDraft && <DraftBadge />}
          </div>
          <p className="-mt-2 text-xs text-content-quaternary">
            {existing ? `Update this ${label.toLowerCase()}` : `Save this ${label.toLowerCase()}`}
          </p>
          <div>
            <TextField
              label={
                <>
                  Ground name{' '}
                  <span className="text-content-disabled">(as written on the ground)</span>
                </>
              }
              required
              // eslint-disable-next-line jsx-a11y/no-autofocus -- the sheet over the map opens for typing, so its first field takes focus; not on touch, where it would open the keyboard unasked, nor beside the map, where the keys still draw
              autoFocus={!coarse && !isBeside}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onClear={() => setName('')}
              placeholder={kind === 'terminal' ? 'SM Fairview Terminal A' : 'SM Fairview Ilalim'}
            />
          </div>

          <div>
            <TextField
              label={
                <>
                  Stop name{' '}
                  <span className="text-content-disabled">(what people say — optional)</span>
                </>
              }
              value={informal}
              onChange={(e) => setInformal(e.target.value)}
              onClear={() => setInformal('')}
              list={informalListId}
              aria-describedby={stopNameHintId}
              placeholder="SM Fairview"
            />
            <datalist id={informalListId}>
              {knownInformal.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <p id={stopNameHintId} className="mt-1 text-[11px] text-content-disabled">
              Boxes that share a hotspot name are one hotspot, whatever is written on each. Route
              names read it
              {kind === 'terminal' ? '; a hotspot has one terminal.' : '.'}
            </p>
          </div>
        </section>

        {kind === 'terminal' ? (
          <TerminalChecklist groups={groups} ticked={ticked} onToggle={toggle} />
        ) : (
          <PassesThrough groups={hintuanGroups} />
        )}

        <LineDetail points={ring.length} pointsTerm="Corners" status={status} {...stamps} />

        {error && (
          <p role="alert" className="text-sm text-content-error">
            {error}
          </p>
        )}
        <DraftAlert error={unpublishing.error ?? stored.error} {...stored.keeping} />
        {blocked && <p className="text-sm text-content-quaternary">{blocked}</p>}
      </div>

      <SaveFooter
        busyIntent={busy}
        status={status}
        isUnpublishing={unpublishing.isBusy}
        onUnpublish={() => unpublishing.unpublish(existing?.name ?? `this ${label.toLowerCase()}`)}
        saveBlocked={blocked}
        onExit={handleExit}
        onCancel={onCancel}
        {...stored.footer}
      />
    </form>
  );
}
