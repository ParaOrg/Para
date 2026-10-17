import { kilometresText, minutesText } from './format';
import { WAY_LABEL, type Way } from './ride-rules';

interface StatsStripProps {
  /** Time recorded so far, pauses left out. */
  elapsedSeconds: number;
  distanceM: number;
  way: Way;
  /** Stopped for now: the third column says so. */
  isPaused: boolean;
}

interface StatProps {
  label: string;
  value: string;
  unit?: string;
  className?: string;
}

function Stat({ label, value, unit, className = '' }: StatProps) {
  return (
    <div className={className}>
      <dt className="text-base/6 text-content-quaternary">{label}</dt>
      <dd className="text-2xl/8 font-bold text-content-secondary">
        {value}
        {unit && <span className="text-content-quaternary"> {unit}</span>}
      </dd>
    </div>
  );
}

/**
 * The figures over the bars: time and distance, and the leg the ride is on.
 * They change every second, so nothing here is a live region; the leg switch
 * is announced once on its own (RecordingScreen).
 */
export function StatsStrip({ elapsedSeconds, distanceM, way, isPaused }: StatsStripProps) {
  return (
    <div
      role="group"
      aria-label="Ride so far"
      className="bg-surface/5 px-4 pb-4 font-sn-pro backdrop-blur-[6px]"
    >
      <dl className="flex gap-4">
        <Stat className="flex-1" label="Time" value={minutesText(elapsedSeconds)} unit="min" />
        <Stat className="flex-1" label="Distance" value={kilometresText(distanceM)} unit="km" />
        <Stat
          className="shrink-0 text-right"
          label={isPaused ? 'Stopped' : 'Recording'}
          value={WAY_LABEL[way]}
        />
      </dl>
    </div>
  );
}
