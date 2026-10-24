import { ContributePage } from '@/features/contribute';
import { ContributorLocation } from '@/features/locator';

/** The contribute page's shell: the feature's page, with the locator on its map. */
export function ContributeApp() {
  return (
    <ContributePage
      locator={(map, isMapLoaded, isRecording) => (
        <ContributorLocation map={map} isMapLoaded={isMapLoaded} isRecording={isRecording} />
      )}
    />
  );
}
