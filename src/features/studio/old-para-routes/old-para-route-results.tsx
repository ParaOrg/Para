import { oldParaRouteFacts } from './old-para-route-facts';
import type { OldParaRouteSummary } from './old-para-route-schema';

interface OldParaRouteResultsProps {
  status: 'pending' | 'error' | 'success';
  isAsked: boolean;
  results: OldParaRouteSummary[];
  onRetry: () => void;
  onChoose: (route: OldParaRouteSummary) => void;
}

/** The old Para routes found, or what is happening instead: loading, failed, nothing asked, none found. */
export function OldParaRouteResults({
  status,
  isAsked,
  results,
  onRetry,
  onChoose,
}: OldParaRouteResultsProps) {
  if (status === 'pending') return <p>Reading the old Para routes…</p>;
  if (status === 'error')
    return (
      <p className="flex items-baseline gap-2">
        The old Para routes didn’t load.
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Try again
        </button>
      </p>
    );
  if (!isAsked)
    return <p>Type a route’s name, a place on it or its Para ID, or look near the map’s centre.</p>;
  if (results.length === 0) return <p>No old Para route matches.</p>;
  return (
    <ul aria-label="Old Para routes" className="flex flex-col gap-1">
      {results.map((route) => (
        <li key={route.paraId}>
          <button
            type="button"
            onClick={() => onChoose(route)}
            className="flex w-full flex-col rounded-xl p-2 text-left hover:bg-surface-secondary focus-visible:bg-surface-secondary"
          >
            <span className="font-semibold text-content-primary">{route.name}</span>
            <span className="text-xs text-content-tertiary">{oldParaRouteFacts(route)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
