package ph.para.contributor;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import ph.para.contributor.ride.Ride;
import ph.para.contributor.ride.RideMachine;
import ph.para.contributor.ride.RideStep;

/**
 * The notification's taps (RideNotification), done at once, natively, whether or not the page is
 * awake: Lakad or Sakay, Pause, Resume and Finish, each through the ride's rules (RideMachine, run by
 * Rides). Each is also kept as an event (RideState) for the page to apply where it was tapped, when
 * it wakes.
 *
 * Pause and Finish stop collecting points at once: the fix log is sealed at the tap, so no fix
 * after it is kept whatever else happens, and the ride's service stops, so the phone stops
 * locating; Resume starts it again. Not exported: only the app's own notification reaches it.
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
        long now = System.currentTimeMillis();
        PendingResult pending = goAsync();
        try {
            String kept = tap(app, action, now);
            if (kept != null) {
                Log.i(TAG, "tap " + kept);
                RidePlugin.tellPage();
            }
        } catch (Exception error) {
            Log.e(TAG, "A tap on the ride's notification failed: " + action, error);
        }
        // Posted whatever the tap did: a tap that did nothing still shows the ride as it is.
        RideNotification.post(app);
        pending.finish();
    }

    /** Does the tap; returns what was kept for the page, or null when it did not apply. */
    private static String tap(Context app, String action, long now) {
        switch (action) {
            case SWITCH: {
                RideStep step = Rides.apply(app, ride -> RideMachine.switchMode(ride, now));
                if (step.effects.isEmpty()) return null;
                // The modes the page reads: "walk" (Lakad) and "ride" (Sakay).
                String to = Ride.RIDE.equals(step.ride.mode()) ? "ride" : "walk";
                RideState.addEvent(app, "mode", now, to);
                return "mode " + to;
            }
            case PAUSE:
                if (Rides.apply(app, ride -> RideMachine.pause(ride, now)).effects.isEmpty()) return null;
                RideState.addEvent(app, "pause", now, null);
                return "pause";
            case RESUME: {
                // A Resume posted while the page was alive may be tapped after it is gone, or after
                // the page paused the ride itself: then it is the app's to do.
                if (!RideNotification.canResumeHere(app)) return null;
                RideStep step = Rides.apply(app, ride -> RideMachine.resume(ride, now));
                // Android refused the service: the ride stays paused (Rides), and no resume is kept.
                if (step.effects.isEmpty() || !Rides.now(app).isRecordingLive()) return null;
                RideState.addEvent(app, "resume", now, null);
                return "resume";
            }
            case FINISH:
                if (Rides.apply(app, ride -> RideMachine.finish(ride, now)).effects.isEmpty()) return null;
                RideState.addEvent(app, "finish", now, null);
                return "finish";
            default:
                return null;
        }
    }
}
