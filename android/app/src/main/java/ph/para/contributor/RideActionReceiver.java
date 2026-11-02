package ph.para.contributor;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import com.equimaps.capacitor_background_geolocation.ParaServiceWatchers;

/**
 * The notification's taps (RideNotification), done at once, natively, whether or not the page is
 * awake: Lakad or Sakay, Pause, Resume and Finish. Each is kept as an event (RideState) for the
 * page to apply where it was tapped, when it wakes.
 *
 * Pause and Finish stop collecting points at once: the fix log is sealed at the tap, so no fix
 * after it is kept whatever else happens (FixLog.end), and the location service lets the page's
 * watcher go, so the phone stops locating. Not exported: only the app's own notification reaches it.
 */
public class RideActionReceiver extends BroadcastReceiver {
    static final String SWITCH = "ph.para.contributor.ride.SWITCH";
    static final String PAUSE = "ph.para.contributor.ride.PAUSE";
    static final String RESUME = "ph.para.contributor.ride.RESUME";
    static final String FINISH = "ph.para.contributor.ride.FINISH";

    private static final String TAG = "ParaRide";
    /** How long to wait for the location service to answer a bind; it is local, so this is plenty. */
    private static final long BIND_TIMEOUT_MS = 3_000;

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
                    withService(app, state.watcherId, binder -> ParaServiceWatchers.remove(binder, state.watcherId),
                        () -> done(app, pending, "pause"));
                    return;
                case RESUME:
                    if (!RideState.PAUSED.equals(state.phase)) break;
                    state.phase = RideState.RECORDING;
                    state.pausedMs += now - state.pausedSince;
                    state.pausedSince = 0;
                    state.write(app);
                    RideState.addEvent(app, "resume", now, null);
                    FixLog.begin(app, state.recordingId);
                    withService(app, state.watcherId,
                        binder -> ParaServiceWatchers.add(binder, state.watcherId, RideNotification.build(app, state)),
                        () -> done(app, pending, "resume"));
                    return;
                case FINISH:
                    boolean wasRecording = RideState.RECORDING.equals(state.phase);
                    if (!wasRecording && !RideState.PAUSED.equals(state.phase)) break;
                    if (wasRecording) sealLog(app, now);
                    state.phase = RideState.FINISHED;
                    state.finishedAt = now;
                    state.write(app);
                    RideState.addEvent(app, "finish", now, null);
                    withService(app, state.watcherId, binder -> ParaServiceWatchers.remove(binder, state.watcherId),
                        () -> done(app, pending, "finish"));
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
        pending.finish();
    }

    private interface WithBinder {
        void run(IBinder binder);
    }

    /**
     * Does `work` with the location service, if it is running: bound without creating it (flag 0),
     * so with the app's process gone there is no service, no watcher to stop, and nothing to do.
     * The app's context, as a receiver's own may not bind. `then` runs either way, once.
     */
    private static void withService(Context context, String watcherId, WithBinder work, Runnable then) {
        Handler main = new Handler(Looper.getMainLooper());
        final boolean[] isDone = {false};
        Runnable finish = () -> {
            if (isDone[0]) return;
            isDone[0] = true;
            then.run();
        };
        if (watcherId == null || watcherId.isEmpty()) {
            finish.run();
            return;
        }
        ServiceConnection connection = new ServiceConnection() {
            @Override
            public void onServiceConnected(ComponentName name, IBinder binder) {
                try {
                    work.run(binder);
                } catch (Exception error) {
                    Log.e(TAG, "The location service could not be told.", error);
                } finally {
                    context.unbindService(this);
                    finish.run();
                }
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {}
        };
        boolean isBound = context.bindService(new Intent(context, ParaServiceWatchers.serviceClass()), connection, 0);
        if (!isBound) {
            try {
                context.unbindService(connection);
            } catch (IllegalArgumentException neverBound) {
                // Nothing to let go.
            }
            finish.run();
            return;
        }
        // Not running: a bind without BIND_AUTO_CREATE waits for a service that never comes.
        main.postDelayed(() -> {
            if (isDone[0]) return;
            try {
                context.unbindService(connection);
            } catch (IllegalArgumentException alreadyGone) {
                // Unbound in onServiceConnected meanwhile.
            }
            finish.run();
        }, BIND_TIMEOUT_MS);
    }
}
