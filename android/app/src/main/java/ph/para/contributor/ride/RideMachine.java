package ph.para.contributor.ride;

import java.util.ArrayList;
import java.util.List;

import ph.para.contributor.ride.RideStep.Effect;

/**
 * Every way a ride changes, in one place: the contributor's taps (Start, Pause, Resume, Finish,
 * Lakad or Sakay, from the page or the card), the page's Save, and what happens to the phone
 * (a fix, location switched off or on, Android refusing the recording, the process killed, the
 * phone restarted). Each takes the ride as it is and gives the ride after it with what the phone
 * must do (RideStep). An input that does not apply to the ride as it is changes nothing.
 *
 * Pure: no Android, no clock of its own (every time is passed in), so tests/RideMachineTest runs
 * every rule on the JVM. docs/architecture/state-machines.md is the map of these states.
 */
public final class RideMachine {
    /** While recording, a fix comes at least this often, or the card and the page say why not. */
    public static final long FIX_LIMIT_MS = 2 * 60_000;

    private RideMachine() {}

    /**
     * Start: a new ride, on Lakad. The same ride paused or cut off resumes instead; the same ride
     * recording has its service started again, which does nothing to a service already running.
     */
    public static RideStep start(Ride ride, String recordingId, long now) {
        if (recordingId == null || recordingId.isEmpty()) return RideStep.same(ride);
        if (ride.recordingId.equals(recordingId) && ride.isRecordingLive()) {
            return RideStep.to(ride).then(Effect.BEGIN_LOG).then(Effect.START_SERVICE).done();
        }
        if (ride.recordingId.equals(recordingId) && !ride.is(Ride.NONE)) return resume(ride, now);
        if (!ride.is(Ride.NONE)) {
            return RideStep.to(ride).diagnose("start refused: ride " + ride.recordingId + " is still open").done();
        }
        List<Ride.ModeSwitch> modes = new ArrayList<>();
        modes.add(new Ride.ModeSwitch(now, Ride.WALK));
        Ride started = new Ride(recordingId, Ride.RECORDING, Ride.TROUBLE_NONE, now, 0, now,
            modes, new ArrayList<Ride.Gap>());
        return RideStep.to(started)
            .then(Effect.BEGIN_LOG).then(Effect.START_SERVICE).then(Effect.POST_CARD).done();
    }

    /** Pause at `at`: a Stop. A ride cut off is stopped at `at` too (the page's "stop at last fix"). */
    public static RideStep pause(Ride ride, long at) {
        if (!ride.is(Ride.RECORDING)) return RideStep.same(ride);
        List<Ride.Gap> gaps = new ArrayList<>(ride.gaps);
        gaps.add(new Ride.Gap(at, 0, Ride.GAP_PAUSED));
        Ride paused = ride.with(Ride.PAUSED, Ride.TROUBLE_NONE, 0, ride.lastFixAt, ride.modes, gaps);
        return RideStep.to(paused)
            .seal(at).then(Effect.STOP_SERVICE).then(Effect.POST_CARD).done();
    }

    /**
     * Resume: a paused ride records again, its pause a gap; a ride cut off records again, the time
     * since its last fix a gap.
     */
    public static RideStep resume(Ride ride, long now) {
        List<Ride.Gap> gaps = new ArrayList<>(ride.gaps);
        Ride.Gap open = ride.openPause();
        if (ride.is(Ride.PAUSED) && open != null) {
            gaps.set(gaps.size() - 1, new Ride.Gap(open.from, Math.max(open.from, now), open.reason));
        } else if (ride.is(Ride.RECORDING) && ride.isCutOff()) {
            gaps.add(new Ride.Gap(ride.lastFixAt, Math.max(ride.lastFixAt, now), Ride.GAP_RESUMED));
        } else {
            return RideStep.same(ride);
        }
        Ride resumed = ride.with(Ride.RECORDING, Ride.TROUBLE_NONE, 0, now, ride.modes, gaps);
        return RideStep.to(resumed)
            .then(Effect.BEGIN_LOG).then(Effect.START_SERVICE).then(Effect.POST_CARD).done();
    }

    /** Finish: the ride stops for good and waits for the page's Save form. */
    public static RideStep finish(Ride ride, long now) {
        if (!ride.is(Ride.RECORDING) && !ride.is(Ride.PAUSED)) return RideStep.same(ride);
        long at = ride.is(Ride.RECORDING) && ride.isCutOff() ? ride.lastFixAt : now;
        Ride finished = ride.with(Ride.FINISHED, Ride.TROUBLE_NONE, at, ride.lastFixAt, ride.modes, ride.gaps);
        RideStep.Builder step = RideStep.to(finished);
        if (ride.is(Ride.RECORDING)) step.seal(at);
        return step.then(Effect.STOP_SERVICE).then(Effect.POST_CARD).done();
    }

    /** Lakad to Sakay, or back, while recording. */
    public static RideStep switchMode(Ride ride, long now) {
        if (!ride.isRecordingLive()) return RideStep.same(ride);
        List<Ride.ModeSwitch> modes = new ArrayList<>(ride.modes);
        modes.add(new Ride.ModeSwitch(now, Ride.WALK.equals(ride.mode()) ? Ride.RIDE : Ride.WALK));
        Ride switched = ride.with(ride.phase, ride.trouble, ride.finishedAt, ride.lastFixAt, modes, ride.gaps);
        return RideStep.to(switched).then(Effect.POST_CARD).done();
    }

    /** The page saved or dropped `recordingId`: no ride from now on. */
    public static RideStep clear(Ride ride, String recordingId) {
        if (ride.is(Ride.NONE) || !ride.recordingId.equals(recordingId)) return RideStep.same(ride);
        return RideStep.to(Ride.NO_RIDE).then(Effect.STOP_SERVICE).then(Effect.POST_CARD).done();
    }

    /** A fix at `time`: the fix check counts from it, and a missing location is found again. */
    public static RideStep fix(Ride ride, long time) {
        if (!ride.isRecordingLive()) return RideStep.same(ride);
        Ride fixed = ride.withLastFixAt(Math.max(ride.lastFixAt, time));
        if (!isLocationTrouble(ride.trouble)) return RideStep.same(fixed);
        return RideStep.to(fixed.withTrouble(Ride.TROUBLE_NONE))
            .then(Effect.POST_CARD).diagnose("fixes again after " + ride.trouble).done();
    }

    public static RideStep locationOff(Ride ride, long now) {
        if (!ride.isRecordingLive() || Ride.TROUBLE_LOCATION_OFF.equals(ride.trouble)) return RideStep.same(ride);
        return RideStep.to(ride.withTrouble(Ride.TROUBLE_LOCATION_OFF))
            .then(Effect.POST_CARD).diagnose("location switched off while recording").done();
    }

    /** Location on again: the fix check counts afresh from now. */
    public static RideStep locationOn(Ride ride, long now) {
        if (!ride.isRecordingLive() || !Ride.TROUBLE_LOCATION_OFF.equals(ride.trouble)) return RideStep.same(ride);
        return RideStep.to(ride.withTrouble(Ride.TROUBLE_NONE).withLastFixAt(Math.max(ride.lastFixAt, now)))
            .then(Effect.POST_CARD).diagnose("location switched on again").done();
    }

    /** The fix check, run as the card ticks: no fix for FIX_LIMIT_MS is said, never faked. */
    public static RideStep check(Ride ride, long now) {
        if (!ride.isRecordingLive() || !Ride.TROUBLE_NONE.equals(ride.trouble)) return RideStep.same(ride);
        if (now - ride.lastFixAt <= FIX_LIMIT_MS) return RideStep.same(ride);
        return RideStep.to(ride.withTrouble(Ride.TROUBLE_NO_FIX))
            .then(Effect.POST_CARD).diagnose("no fix for " + ((now - ride.lastFixAt) / 1000) + " s").done();
    }

    /** Android refused the recording (`why`): paused where it stands, and said. */
    public static RideStep refused(Ride ride, long now, String why) {
        if (!ride.is(Ride.RECORDING)) return RideStep.same(ride);
        RideStep paused = pause(ride, now);
        RideStep.Builder step = RideStep.to(paused.ride.withTrouble(Ride.TROUBLE_REFUSED));
        for (Effect effect : paused.effects) {
            if (effect.kind.equals(Effect.SEAL_LOG)) step.seal(effect.time);
            else step.then(effect.kind);
        }
        return step.diagnose("recording refused: " + why).done();
    }

    /** Android brought the service back after a kill (sticky). A ride recording records on. */
    public static RideStep serviceRestarted(Ride ride, long now) {
        if (!ride.is(Ride.RECORDING)) {
            return RideStep.to(ride).then(Effect.STOP_SERVICE).diagnose("stray service restart stopped").done();
        }
        Ride live = Ride.TROUBLE_CUT_OFF.equals(ride.trouble) ? ride.withTrouble(Ride.TROUBLE_NONE) : ride;
        return RideStep.to(live).then(Effect.POST_CARD).diagnose("service restarted by Android").done();
    }

    /** The app's process started and found the ride recording with no service: it was cut off. */
    public static RideStep serviceMissing(Ride ride, long now) {
        if (!ride.isRecordingLive()) return RideStep.same(ride);
        return RideStep.to(ride.withTrouble(Ride.TROUBLE_CUT_OFF))
            .then(Effect.POST_CARD).diagnose("found cut off: the process died and was not restarted").done();
    }

    /** The phone restarted or the app was updated: a ride recording was cut off; any card is put back. */
    public static RideStep phoneRestarted(Ride ride, long now) {
        if (ride.is(Ride.NONE)) return RideStep.same(ride);
        if (!ride.is(Ride.RECORDING)) return RideStep.to(ride).then(Effect.POST_CARD).done();
        return RideStep.to(ride.withTrouble(Ride.TROUBLE_PHONE_RESTARTED))
            .then(Effect.POST_CARD).diagnose("cut off by a phone restart or an app update").done();
    }

    private static boolean isLocationTrouble(String trouble) {
        return Ride.TROUBLE_LOCATION_OFF.equals(trouble) || Ride.TROUBLE_NO_FIX.equals(trouble);
    }
}
