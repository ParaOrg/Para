import type { Diagnosis } from './diagnose';

interface MapFailureProps {
  /** What went wrong, as MapLibre or the load's clock said it. */
  message: string;
  /** What the device and the style's address answered, once asked. */
  diagnosis: Diagnosis | null;
  /** What the map's container held when the load ran out of time. */
  dom: string | null;
  /** How far the map got: its events, in order, each with its time. */
  trace: readonly string[];
  /** The style the map was asked to draw. */
  styleUrl: string;
  /**
   * Whether the raw error, the device's answers and the style's address are shown: an editor's,
   * in the studio. A commuter and a contributor read the first line alone.
   */
  showsDiagnostics: boolean;
}

/**
 * Said over a map that did not come. A blank map with no explanation is the worst failure, so
 * this says what failed and what the device answered. Presentational: MapView decides when.
 */
export function MapFailure({
  message,
  diagnosis,
  dom,
  trace,
  styleUrl,
  showsDiagnostics,
}: MapFailureProps) {
  const box =
    'absolute inset-x-0 top-0 z-30 m-4 rounded-lg bg-red-50 p-4 text-sm text-red-900 shadow ring-1 ring-red-200';
  // TODO: say what a commuter can do (try again, check the signal) once the owner has designed
  // the message; until then they read this one line and none of the diagnostics.
  if (!showsDiagnostics) {
    return (
      <div className={box}>
        <p className="font-medium">The map failed to load.</p>
      </div>
    );
  }
  return (
    <div className={box}>
      <p className="font-medium">The map failed to load.</p>
      <p className="mt-1 break-words">{message}</p>
      {diagnosis && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-red-800">
          <dt className="font-medium">WebGL</dt>
          <dd>{diagnosis.webgl}</dd>
          <dt className="font-medium">Renderer</dt>
          <dd className="break-words">{diagnosis.renderer ?? '(hidden)'}</dd>
          <dt className="font-medium">Style fetch</dt>
          <dd className="break-words">{diagnosis.styleFetch}</dd>
          <dt className="font-medium">DOM</dt>
          <dd className="break-words">{dom ?? '—'}</dd>
          <dt className="font-medium">Events</dt>
          <dd className="break-words">{trace.length ? trace.join(' → ') : '(none fired)'}</dd>
        </dl>
      )}
      <p className="mt-2 text-red-700">
        Tile source: <code className="break-all">{styleUrl}</code>
      </p>
    </div>
  );
}
