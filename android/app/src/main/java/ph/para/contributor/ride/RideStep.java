package ph.para.contributor.ride;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * What one input to the ride did: the ride after it, and what the phone must do for it. The machine
 * (RideMachine) only decides; whoever runs it on the phone (the service, the receiver, the plugin)
 * does these, in order.
 */
public final class RideStep {
    /** What the phone does for a step. */
    public static final class Effect {
        /** Start (or start again) the ride's foreground service and its location request. */
        public static final String START_SERVICE = "start-service";
        /** Stop the ride's service: no more locating. */
        public static final String STOP_SERVICE = "stop-service";
        /** Begin the fix log for the ride (kept if it is already the ride's). */
        public static final String BEGIN_LOG = "begin-log";
        /** Seal the fix log at `time`: no fix after it is kept. */
        public static final String SEAL_LOG = "seal-log";
        /** Post the card again: what it shows changed. */
        public static final String POST_CARD = "post-card";
        /** Write `note` to the phone's own diagnostics log. */
        public static final String DIAGNOSE = "diagnose";

        public final String kind;
        public final long time;
        public final String note;

        Effect(String kind, long time, String note) {
            this.kind = kind;
            this.time = time;
            this.note = note;
        }

        @Override
        public String toString() {
            return note == null ? kind : kind + ": " + note;
        }
    }

    public final Ride ride;
    public final List<Effect> effects;

    private RideStep(Ride ride, List<Effect> effects) {
        this.ride = ride;
        this.effects = Collections.unmodifiableList(effects);
    }

    /** Nothing changed: the input did not apply to the ride as it is. */
    static RideStep same(Ride ride) {
        return new RideStep(ride, new ArrayList<Effect>());
    }

    static Builder to(Ride ride) {
        return new Builder(ride);
    }

    /** Whether the step asks for an effect of `kind`. */
    public boolean has(String kind) {
        for (Effect effect : effects) {
            if (effect.kind.equals(kind)) return true;
        }
        return false;
    }

    static final class Builder {
        private final Ride ride;
        private final List<Effect> effects = new ArrayList<>();

        private Builder(Ride ride) {
            this.ride = ride;
        }

        Builder then(String kind) {
            effects.add(new Effect(kind, 0, null));
            return this;
        }

        Builder seal(long time) {
            effects.add(new Effect(Effect.SEAL_LOG, time, null));
            return this;
        }

        Builder diagnose(String note) {
            effects.add(new Effect(Effect.DIAGNOSE, 0, note));
            return this;
        }

        RideStep done() {
            return new RideStep(ride, effects);
        }
    }
}
