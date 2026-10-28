import type { StudioContributorsProps } from './contributors-props';
import { ContributorsView } from './contributors-view';

/** The Contributors map, loaded on its own: its cache is the studio's (StudioSessionProvider). */
export function ContributorsWorkspace(props: StudioContributorsProps) {
  return <ContributorsView {...props} />;
}
