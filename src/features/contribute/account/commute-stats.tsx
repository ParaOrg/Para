import type { ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';
import { cn } from '@/shared/utils/cn';

import {
  modeSplit,
  routeRecordingsLabel,
  totalDistanceFigure,
  totalFareFigure,
  totalTimeFigure,
  type ModeSplit,
} from './commute-figures';
import { VehicleGrid, type VehicleRides } from './vehicle-grid';
import type { Figure } from '../common/format';
import { Skeleton } from '../common/skeleton';
import { useIsSlowLoad } from '../common/use-is-slow-load';

/** The numbers the section shows, from the contributor's stats. */
export interface CommuteNumbers {
  recordings: number;
  /** Time on the road, moving and standing. */
  seconds: number;
  distanceM: number;
  walkM: number;
  /** Pesos paid over the rides that said their fare, and how many did (0: none known). */
  farePhpTotal: number;
  fareRecordings: number;
  ridesByVehicle: VehicleRides;
}

/** What there is to show: numbers, still loading, or a line saying why there are none. */
export type CommuteStatsState =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string; onRetry: () => void }
  | { kind: 'shown'; numbers: CommuteNumbers };

interface CommuteStatsProps {
  state: CommuteStatsState;
}

/**
 * Figma's Commute Statistics (4511:22712): total time and total distance, and beside them the
 * routes recorded with the Sakay and Lakad bar, by distance; under them the total fare, then the
 * rides by vehicle.
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
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-sm/5 text-content-quaternary">
          {state.message}
        </p>
        <Button variant="secondary" size="small" label="Try again" onClick={state.onRetry} />
      </div>
    );
  }
  if (state.kind === 'loading') return <StatsSkeleton />;
  const { numbers } = state;
  const fare = totalFareFigure(numbers.farePhpTotal, numbers.fareRecordings);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-4">
          <StatCard figure={totalTimeFigure(numbers.seconds)} name="Total time" />
          <StatCard figure={totalDistanceFigure(numbers.distanceM)} name="Total distance" />
        </div>
        <div className="flex flex-1 flex-col rounded-3xl bg-surface shadow-large">
          <StatFigure
            value={numbers.recordings.toLocaleString('en-US')}
            name={routeRecordingsLabel(numbers.recordings)}
            className="pt-4"
          />
          <ModeBar split={modeSplit(numbers.distanceM, numbers.walkM)} />
        </div>
      </div>
      {/* Figma's Total fare (4519:25331): said in pesos, as the ₱ sign is not read the same everywhere. */}
      <div className="rounded-3xl bg-surface p-4 shadow-large">
        <StatFigure
          value={
            <>
              <span aria-hidden>{fare.shown}</span>
              <span className="sr-only">{fare.spoken}</span>
            </>
          }
          name="Total fare"
        />
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
    <p className={cn('flex flex-col-reverse gap-0.5 text-center', className)}>
      <span className="text-sm/5 text-content-disabled">{name}</span>
      <span className="text-2xl/8 font-semibold text-content-primary">{value}</span>
    </p>
  );
}

/** The figures' tiles while the stats load, in their sizes, shimmering once the wait is long enough to see. */
function StatsSkeleton() {
  const isShown = useIsSlowLoad(true);
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        Loading your statistics
      </p>
      <div aria-hidden className={cn('flex flex-col gap-4', !isShown && 'invisible')}>
        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-4">
            <TileSkeleton isShown={isShown} />
            <TileSkeleton isShown={isShown} />
          </div>
          <div className="flex flex-1 flex-col items-center rounded-3xl bg-surface pt-4 shadow-large">
            <FigureSkeleton isShown={isShown} />
          </div>
        </div>
        <TileSkeleton isShown={isShown} />
        {/* The rides by vehicle (vehicle-grid.tsx): two rows of three, as tall as its own. */}
        <div className="grid grid-cols-3 gap-y-8 rounded-3xl bg-surface px-2 py-4 shadow-large">
          {VEHICLE_CELLS.map((key) => (
            <FigureSkeleton key={key} isShown={isShown} />
          ))}
        </div>
      </div>
    </div>
  );
}

const VEHICLE_CELLS = ['jeep', 'e-jeep', 'uv-express', 'bus', 'train', 'ferry'];

interface ShownProps {
  isShown: boolean;
}

/** A tile as StatCard draws it: its figure over its name. */
function TileSkeleton({ isShown }: ShownProps) {
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-large">
      <FigureSkeleton isShown={isShown} />
    </div>
  );
}

/** A figure over its name, each in its line's height (StatFigure). */
function FigureSkeleton({ isShown }: ShownProps) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span className="flex h-8 items-center">
        <Skeleton isShown={isShown} className="h-6 w-16 rounded-full" />
      </span>
      <span className="flex h-5 items-center">
        <Skeleton isShown={isShown} className="h-4 w-20 rounded-full" />
      </span>
    </span>
  );
}

interface ModeBarProps {
  split: ModeSplit | null;
}

/**
 * Figma's Sakay and Lakad (4516:23788): the bar, each share under its own end in its colour, and
 * the legend below. A share's side and the legend's order say which is which beside the colour;
 * a screen reader hears each share with its word. A small share keeps a sliver; none is grey.
 */
function ModeBar({ split }: ModeBarProps) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-1.5 px-4 text-xs/4">
      <div aria-hidden className="flex flex-col gap-0.5">
        <div className="flex h-4 gap-0.5 overflow-clip rounded-full opacity-80">
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
        {split && (
          <p className="flex gap-2 font-medium">
            <span className="flex-1 text-green-700">{split.sakayPercent}%</span>
            <span className="text-blue-700">{split.lakadPercent}%</span>
          </p>
        )}
      </div>
      <ul className="flex flex-col gap-1.5 text-content-secondary">
        <LegendRow dotClass="bg-green-700" word="Sakay" percent={split?.sakayPercent} />
        <LegendRow dotClass="bg-blue-700" word="Lakad" percent={split?.lakadPercent} />
      </ul>
    </div>
  );
}

interface LegendRowProps {
  dotClass: string;
  word: string;
  /** Its share, said with the word to a screen reader; none with no distance yet. */
  percent: number | undefined;
}

function LegendRow({ dotClass, word, percent }: LegendRowProps) {
  return (
    <li className="flex items-center gap-1">
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', dotClass)} />
      <span className="flex-1">
        {word}
        {percent !== undefined && <span className="sr-only"> {percent}%</span>}
      </span>
    </li>
  );
}
