import type { RouteStopSignKind } from './route-stop-sign';

interface RouteStopSignWordsProps {
  sign: RouteStopSignKind | null;
}

/** For a screen reader, after a stop's name, what its S or E says: the sign is for the eye. */
export function RouteStopSignWords({ sign }: RouteStopSignWordsProps) {
  if (!sign) return null;
  return <span className="sr-only">{sign === 'start' ? ', start' : ', end'}</span>;
}
