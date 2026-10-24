import { ContributePage, NativeSpikeSlot } from '@/features/contribute';
import { ContributorLocation } from '@/features/locator';

/** The contribute page's shell: the feature's page, with the locator on its map. */
export function ContributeApp() {
  return (
    <>
      <NativeSpikeSlot />
      <ContributePage
        locator={(map, isMapLoaded, isRecording, mark) => (
          <ContributorLocation
            map={map}
            isMapLoaded={isMapLoaded}
            isRecording={isRecording}
            above={mark}
          />
        )}
      />
    </>
  );
}
