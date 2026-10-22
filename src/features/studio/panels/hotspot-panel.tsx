import { useMemo, useState } from 'react';

import { TextField } from '@/design-system/primitives/text-field';
import { coarse } from '@/features/routes/map/map-view';
import { parseAliases, type HotspotRow } from '@/features/routes/model/hotspots';
import { isLoop, type DirectionRow } from '@/features/routes/model/routes';

import { groupBySignboard, knownInformalNames, tickedDirections } from './hotspot-checks';
import { PassesThrough } from './passes-through';
import { FOOTER, OVERLAY, PANEL } from './sheet';
import { TerminalChecklist } from './terminal-checklist';
import { useHotspotSave } from './use-hotspot-save';
import { useNearLines } from './use-near-lines';
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
  onSaved: (s: HotspotRow) => void;
  onCancel: () => void;
  /** Hears the row a save wrote, the moment it is in, to keep it beyond this panel. */
  onWritten?: (hotspotId: string) => void;
  /** A save stored as a draft (STUDIO_DRAFTS). */
  onDrafted?: (hotspotId: string) => void;
}

/**
 * The save form for a hotspot outline. Name is the only required field.
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
  onSaved,
  onCancel,
  onWritten,
  onDrafted,
}: HotspotPanelProps) {
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
  const { busy, error, setError, writtenId, submit } = useHotspotSave({
    onSaved,
    onWritten,
    onDrafted,
  });
  const hotspotId = writtenId ?? existing?.id ?? area?.hotspotId ?? null;

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
  const swatch = kind === 'terminal' ? 'bg-sky-500' : 'bg-orange-500';

  return (
    <div className={OVERLAY}>
      <form
        onSubmit={(e) =>
          void submit(
            e,
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
          )
        }
        className={PANEL}
      >
        <h2 className="flex items-center gap-2 text-base font-medium text-neutral-900">
          <span className={`inline-block h-3 w-3 rounded-sm ${swatch}`} />
          {existing ? `Update this ${label.toLowerCase()}` : `Save this ${label.toLowerCase()}`}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">{ring.length} corners</p>

        <div className="mt-4">
          <TextField
            label={
              <>
                Ground name{' '}
                <span className="text-content-disabled">(as written on the ground)</span>
              </>
            }
            required
            // eslint-disable-next-line jsx-a11y/no-autofocus -- this overlay opens for typing, so its first field takes focus; not on touch, where it would open the keyboard unasked
            autoFocus={!coarse}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onClear={() => setName('')}
            placeholder={kind === 'terminal' ? 'SM Fairview Terminal A' : 'SM Fairview Ilalim'}
          />
        </div>

        <div className="mt-3">
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
            list="parapo-informal-names"
            aria-describedby="parapo-stop-name-hint"
            placeholder="SM Fairview"
          />
          <datalist id="parapo-informal-names">
            {knownInformal.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <p id="parapo-stop-name-hint" className="mt-1 text-[11px] text-content-disabled">
            Boxes that share a hotspot name are one hotspot, whatever is written on each. Route
            names read it
            {kind === 'terminal' ? '; a hotspot has one terminal.' : '.'}
          </p>
        </div>

        {kind === 'terminal' ? (
          <TerminalChecklist groups={groups} ticked={ticked} onToggle={toggle} />
        ) : (
          <PassesThrough groups={hintuanGroups} />
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className={FOOTER}>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300"
          >
            Back to map
          </button>
          <button
            type="submit"
            disabled={busy || ring.length < 3 || !lined}
            className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : existing ? 'Save changes' : `Save ${label.toLowerCase()}`}
          </button>
        </div>
      </form>
    </div>
  );
}
