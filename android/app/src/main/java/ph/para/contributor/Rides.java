package ph.para.contributor;

import android.content.Context;
import android.util.Log;

import ph.para.contributor.ride.Ride;
import ph.para.contributor.ride.RideMachine;
import ph.para.contributor.ride.RideStep;
import ph.para.contributor.ride.RideStep.Effect;

/**
 * Runs the ride's rules (ride.RideMachine) on the phone: reads the ride kept (RideState), takes one
 * step, keeps the ride after it, then does what the step asks: the service, the fix log, the card
 * and the diagnostics log. Every change to the ride on the native side goes through here, so the
 * service, the card's taps and the page cannot each keep a ride of their own.
 */
final class Rides {
    private static final String TAG = "ParaRide";
    /** How often a fix's time is kept while nothing else changes: the ride's end if it is cut off. */
    private static final long KEEP_FIX_EVERY_MS = 30_000;

    /** One rule of RideMachine, applied to the ride as it is now. */
    interface Rule {
        RideStep apply(Ride ride);
    }

    private static long lastKeptFixAt = 0;

    private Rides() {}

    static Ride now(Context context) {
        return RideState.ride(context.getApplicationContext());
    }

    /** Applies `rule` to the ride kept, keeps the result and does its effects. */
    static RideStep apply(Context context, Rule rule) {
        Context app = context.getApplicationContext();
        RideStep step;
        synchronized (Rides.class) {
            Ride before = RideState.ride(app);
            step = rule.apply(before);
            if (step.ride != before) RideState.keep(app, step.ride);
        }
        for (Effect effect : step.effects) run(app, step.ride, effect);
        return step;
    }

    /**
     * A fix from the service. Its time is kept now and then, not each second; a fix that finds the
     * location again (after it was off, or silent) is kept at once, with its card.
     */
    static void fix(Context context, long time) {
        Context app = context.getApplicationContext();
        Ride ride = now(app);
        boolean isTrouble = !Ride.TROUBLE_NONE.equals(ride.trouble);
        if (!isTrouble && time - lastKeptFixAt < KEEP_FIX_EVERY_MS) return;
        lastKeptFixAt = time;
        apply(app, current -> RideMachine.fix(current, time));
    }

    private static void run(Context app, Ride ride, Effect effect) {
        try {
            switch (effect.kind) {
                case Effect.BEGIN_LOG:
                    FixLog.begin(app, ride.recordingId);
                    break;
                case Effect.SEAL_LOG:
                    FixLog.end(app, effect.time);
                    break;
                case Effect.START_SERVICE:
                    startService(app, ride);
                    break;
                case Effect.STOP_SERVICE:
                    if (RideService.isRunning()) {
                        RideService.stop(app);
                        // Its leaving the foreground takes its notification after ours may have landed.
                        RideNotification.postAgainSoon(app);
                    }
                    break;
                case Effect.POST_CARD:
                    RideNotification.post(app);
                    break;
                case Effect.DIAGNOSE:
                    RideDiagnostics.note(app, ride.recordingId, effect.note);
                    break;
                default:
                    Log.w(TAG, "An effect with no runner: " + effect);
            }
        } catch (Exception error) {
            // One effect failing must not stop the others: the next step tries again.
            Log.e(TAG, "The ride's " + effect + " failed.", error);
            RideDiagnostics.note(app, ride.recordingId, effect.kind + " failed: " + error);
        }
    }

    /** Starts the service; if Android refuses it here and now, the ride pauses and says why. */
    private static void startService(Context app, Ride ride) {
        try {
            RideService.start(app);
        } catch (RuntimeException refused) {
            // From the background without an exemption (Android 12 and later), say.
            long now = System.currentTimeMillis();
            apply(app, current -> RideMachine.refused(current, now, "the service could not start: " + refused));
            RideState.addEvent(app, "pause", now, null);
            RidePlugin.tellPage();
        }
    }
}
