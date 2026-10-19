import { ContributeMap } from './contribute-map';
import { ReadyScreen } from './ready-screen';
import { RecordingScreen } from './recording-screen';
import { SaveForm } from './save-form';
import { SavedScreen } from './saved-screen';
import { UnfinishedScreen } from './unfinished-screen';
import { UploadCheck } from './upload-check';
import { uploadStatusText } from './upload-status';
import { useFollow } from './use-follow';
import { useRecording } from './use-recording';
import { useRecordingTrack } from './use-recording-track';
import { useUploads } from './use-uploads';

/** The contributor's page: a map with the recording drawn on it, and the screen for where the recording is. */
export function ContributePage() {
  const recording = useRecording();
  const uploads = useUploads(recording.saved);
  const follow = useFollow();
  const track = useRecordingTrack(recording.kept, recording.current?.switches);
  const { phase, figures } = recording;

  const handleStart = () => {
    follow.recentre();
    recording.start();
  };

  return (
    <main className="relative h-dvh overflow-hidden bg-surface-secondary font-sn-pro">
      <ContributeMap
        track={track}
        follow={follow}
        hasRecording={phase === 'recording' || phase === 'paused'}
      />
      {recording.problem && (
        <p
          role="alert"
          className="absolute inset-x-4 top-[max(4.5rem,env(safe-area-inset-top))] z-10 bg-surface p-2 text-sm/5 text-content-primary"
        >
          {recording.problem}
        </p>
      )}
      {uploads.check && (phase === 'ready' || phase === 'saved') && (
        <UploadCheck check={uploads.check} />
      )}
      <p role="status" className="sr-only">
        {recording.announcement}
      </p>
      {phase === 'ready' && (
        <ReadyScreen
          onStart={handleStart}
          saved={recording.saved}
          uploads={uploads}
          onDownloadSaved={recording.downloadSaved}
          onDeleteSaved={recording.deleteSaved}
        />
      )}
      {phase === 'unfinished' && figures && (
        <UnfinishedScreen
          figures={figures}
          way={recording.way}
          onResume={recording.resume}
          onStop={recording.stopAtLastFix}
        />
      )}
      {(phase === 'recording' || phase === 'paused') && figures && (
        <RecordingScreen
          figures={figures}
          way={recording.way}
          isPaused={phase === 'paused'}
          isAwake={recording.isAwake}
          shouldFocusStop={recording.focusTarget === 'stop'}
          onStop={recording.stop}
          onResume={recording.resume}
          onWaySwitch={recording.switchWay}
          onSave={recording.openSave}
          onCancel={recording.cancel}
        />
      )}
      {phase === 'form' && (
        <SaveForm
          failedFixWrites={recording.current?.failedFixWrites ?? 0}
          onDownload={recording.downloadCurrent}
          onKeepRecording={recording.keepRecording}
          onSave={recording.save}
        />
      )}
      {phase === 'saved' && (
        <SavedScreen
          failedFixWrites={recording.lastSaved?.failedFixWrites ?? 0}
          uploadText={
            recording.lastSaved
              ? uploadStatusText(
                  uploads.statusOf(recording.lastSaved),
                  uploads.canRemove(recording.lastSaved),
                )
              : ''
          }
          onRecordAgain={recording.recordAgain}
          onDownload={recording.downloadLastSaved}
        />
      )}
    </main>
  );
}
