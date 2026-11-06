package ph.para.contributor;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * The notification's taps (RideNotification), done at once, natively, whether or not the page is
 * awake: Lakad or Sakay, Pause, Resume and Finish. Each is kept as an event (RideState) for the
 * page to apply where it was tapped, when it wakes.
 *
 * Pause and Finish stop collecting points at once: the fix log is sealed at the tap, so no fix
 * after it is kept whatever else happens (FixLog.end), and the ride's service stops
 * (RideService), so the phone stops locating; Resume starts it again. Not exported: only the app's
 * own notification reaches it.
 */
public class RideActionReceiver extends BroadcastReceiver {
    static final String SWITCH = "ph.para.contributor.ride.SWITCH";
    static final String PAUSE = "ph.para.contributor.ride.PAUSE";
    static final String RESUME = "ph.para.contributor.ride.RESUME";
    static final String FINISH = "ph.para.contributor.ride.FINISH";

    private static final String TAG = "ParaRide";

    @Override
    public void onReceive(Context context, Intent intent) {
        Context app = context.getApplicationContext();
        String action = intent.getAction();
        if (action == null) return;
        RideState state = RideState.read(app);
        long now = System.currentTimeMillis();
        PendingResult pending = goAsync();
        try {
            switch (action) {
                case SWITCH:
                    if (!RideState.RECORDING.equals(state.phase)) break;
                    state.mode = "ride".equals(state.mode) ? "walk" : "ride";
                    state.write(app);
                    RideState.addEvent(app, "mode", now, state.mode);
                    done(app, pending, "mode " + state.mode);
                    return;
                case PAUSE:
                    if (!RideState.RECORDING.equals(state.phase)) break;
                    sealLog(app, now);
                    state.phase = RideState.PAUSED;
                    state.pausedSince = now;
                    state.write(app);
                    RideState.addEvent(app, "pause", now, null);
                    // The service's leaving the foreground takes its notification: ours follows it.
                    RideService.stop(app);
                    done(app, pending, "pause");
                    return;
                case RESUME:
                    if (!RideState.PAUSED.equals(state.phase)) break;
                    // A Resume posted while the page was alive may be tapped after it is gone, or
                    // after the page paused the ride itself: then it is the app's to do.
                    if (!RideNotification.canResumeHere(state)) break;
                    try {
                        FixLog.begin(app, state.recordingId);
                        // The ride records again in its own service, from this tap. Started before
                        // anything says it resumed: if Android refuses it, the ride stays paused.
                        RideService.start(app, state.recordingId);
                    } catch (java.io.IOException | org.json.JSONException | RuntimeException error) {
                        Log.e(TAG, "Resume: the ride could not record again; it stays paused.", error);
                        break;
                    }
                    state.phase = RideState.RECORDING;
                    state.pausedMs += now - state.pausedSince;
                    state.pausedSince = 0;
                    state.write(app);
                    RideState.addEvent(app, "resume", now, null);
                    done(app, pending, "resume");
                    return;
                case FINISH:
                    boolean wasRecording = RideState.RECORDING.equals(state.phase);
                    if (!wasRecording && !RideState.PAUSED.equals(state.phase)) break;
                    if (wasRecording) sealLog(app, now);
                    state.phase = RideState.FINISHED;
                    state.finishedAt = now;
                    state.write(app);
                    RideState.addEvent(app, "finish", now, null);
                    RideService.stop(app);
                    done(app, pending, "finish");
                    return;
                default:
                    break;
            }
        } catch (Exception error) {
            Log.e(TAG, "A tap on the ride's notification failed: " + action, error);
        }
        RideNotification.post(app);
        pending.finish();
    }

    private static void sealLog(Context context, long time) {
        try {
            FixLog.end(context, time);
        } catch (Exception error) {
            Log.e(TAG, "The fix log could not be sealed.", error);
        }
    }

    /** After a tap: the page hears it if it is awake, and the notification says the new state. */
    private static void done(Context context, PendingResult pending, String what) {
        Log.i(TAG, "tap " + what);
        RidePlugin.tellPage();
        RideNotification.post(context);
        if (!what.equals("resume") && !what.startsWith("mode")) RideNotification.postAgainSoon(context);
        pending.finish();
    }
}
