import { ReadyScreen } from './ready-screen';
import { RecordingScreen } from './recording-screen';
import { StoppedScreen } from './stopped-screen';
import { UnfinishedScreen } from './unfinished-screen';
import { useRecording } from './use-recording';

/** The field-test page: records a ride on the phone and keeps it there. */
export function ContributePage() {
  const recording = useRecording();
  const { phase, summary } = recording;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">Record a ride</h1>
      {recording.problem && <p role="alert">{recording.problem}</p>}
      {phase === 'loading' && <p>Loading…</p>}
      {phase === 'ready' && (
        <ReadyScreen
          saved={recording.saved}
          onStart={recording.start}
          onDownload={recording.download}
          onRemove={recording.remove}
        />
      )}
      {phase === 'unfinished' && summary && (
        <UnfinishedScreen
          summary={summary}
          onResume={recording.resume}
          onStop={recording.stopAtLastFix}
        />
      )}
      {phase === 'recording' && summary && (
        <RecordingScreen summary={summary} isAwake={recording.isAwake} onStop={recording.stop} />
      )}
      {phase === 'stopped' && summary && (
        <StoppedScreen
          summary={summary}
          onSave={recording.save}
          onResume={recording.resume}
          onCancel={recording.cancel}
        />
      )}
    </main>
  );
}
