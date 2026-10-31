import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

import {
  modeSplit,
  recordingsLabel,
  totalDistanceFigure,
  totalTimeFigure,
  type ModeSplit,
} from './commute-figures';
import { VehicleGrid, type VehicleRides } from './vehicle-grid';
import type { Figure } from '../common/format';

/** The numbers the section shows, from the contributor's stats. */
export interface CommuteNumbers {
  recordings: number;
  /** Time on the road, moving and standing. */
  seconds: number;
  distanceM: number;
  walkM: number;
  ridesByVehicle: VehicleRides;
}

/** What there is to show: numbers, still loading, or a line saying why there are none. */
export type CommuteStatsState =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  | { kind: 'shown'; numbers: CommuteNumbers };

interface CommuteStatsProps {
  state: CommuteStatsState;
}

/**
 * Figma's Commute Statistics (4511:22712): total time and total distance, and beside them the
 * recordings with the Sakay and Lakad bar, by distance; under them the rides by vehicle. Each share
 * is said beside its word, so the bar's colour is never the only way to read it.
 */
export function CommuteStats({ state }: CommuteStatsProps) {
  return (
    <section aria-labelledby="commute-stats-heading" className="flex flex-col gap-4 font-sn-pro">
      <h2 id="commute-stats-heading" className="text-xl/7 font-semibold text-content-primary">
        Commute Statistics
      </h2>
      <StatsBody state={state} />
    </section>
  );
}

function StatsBody({ state }: CommuteStatsProps) {
  if (state.kind === 'failed') {
    return <p className="text-sm/5 text-content-quaternary">{state.message}</p>;
  }
  if (state.kind === 'loading') {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <p className="sr-only">Loading your statistics</p>
        <div className="flex gap-3.75">
          <div className="flex flex-1 flex-col gap-3.5">
            <PlaceholderCard />
            <PlaceholderCard />
          </div>
          <div aria-hidden className="flex-1 rounded-3xl bg-surface shadow-large">
            <span className="mx-auto mt-4 block h-6 w-10 rounded-full bg-surface-tertiary" />
          </div>
        </div>
        <div aria-hidden className="h-42 rounded-3xl bg-surface shadow-large" />
      </div>
    );
  }
  const { numbers } = state;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3.75">
        <div className="flex flex-1 flex-col gap-3.5">
          <StatCard figure={totalTimeFigure(numbers.seconds)} name="Total time" />
          <StatCard figure={totalDistanceFigure(numbers.distanceM)} name="Total distance" />
        </div>
        <div className="flex flex-1 flex-col rounded-3xl bg-surface shadow-large">
          <StatFigure
            value={numbers.recordings.toLocaleString('en-US')}
            name={recordingsLabel(numbers.recordings)}
            className="pt-4"
          />
          <ModeBar split={modeSplit(numbers.distanceM, numbers.walkM)} />
        </div>
      </div>
      <VehicleGrid rides={numbers.ridesByVehicle} />
    </div>
  );
}

interface StatCardProps {
  figure: Figure;
  name: string;
}

function StatCard({ figure, name }: StatCardProps) {
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-large">
      <StatFigure
        value={
          <>
            {figure.value} <span className="text-content-quaternary">{figure.unit}</span>
          </>
        }
        name={name}
      />
    </div>
  );
}

interface StatFigureProps {
  value: ReactNode;
  name: string;
  className?: string;
}

/** A figure over its name, read name first as the DOM has it. */
function StatFigure({ value, name, className }: StatFigureProps) {
  return (
    <p className={cn('flex flex-col-reverse text-center', className)}>
      <span className="text-sm/5 text-content-disabled">{name}</span>
      <span className="text-2xl/8 font-semibold text-content-primary">{value}</span>
    </p>
  );
}

function PlaceholderCard() {
  return (
    <div
      aria-hidden
      className="flex flex-col items-center gap-2 rounded-3xl bg-surface p-4 shadow-large"
    >
      <span className="h-6 w-16 rounded-full bg-surface-tertiary" />
      <span className="h-4 w-20 rounded-full bg-surface-tertiary" />
    </div>
  );
}

interface ModeBarProps {
  split: ModeSplit | null;
}

/** The share of each, with a sliver at the least so a small one still shows; grey with none. */
function ModeBar({ split }: ModeBarProps) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-1.5 px-3 py-3 text-xs/4">
      <div aria-hidden className="flex h-4 gap-0.5 overflow-clip rounded-full opacity-80">
        {split === null ? (
          <span className="flex-1 bg-surface-tertiary" />
        ) : (
          <>
            {split.sakayPercent > 0 && (
              // Runtime shares: CLAUDE.md's one use for `style`.
              <span
                className="min-w-1 basis-0 bg-green-700"
                style={{ flexGrow: split.sakayPercent }}
              />
            )}
            {split.lakadPercent > 0 && (
              <span
                className="min-w-1 basis-0 bg-blue-700"
                style={{ flexGrow: split.lakadPercent }}
              />
            )}
          </>
        )}
      </div>
      <ul className="flex flex-col gap-1 text-content-secondary">
        <LegendRow dotClass="bg-green-700" word="Sakay" percent={split?.sakayPercent} />
        <LegendRow dotClass="bg-blue-700" word="Lakad" percent={split?.lakadPercent} />
      </ul>
    </div>
  );
}

interface LegendRowProps {
  dotClass: string;
  word: string;
  /** Its share, beside the word; none with no distance yet. */
  percent: number | undefined;
}

function LegendRow({ dotClass, word, percent }: LegendRowProps) {
  return (
    <li className="flex items-center gap-1">
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', dotClass)} />
      <span className="flex-1">{word}</span>
      {percent !== undefined && <span>{percent}%</span>}
    </li>
  );
}
