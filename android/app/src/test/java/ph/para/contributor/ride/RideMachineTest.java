package ph.para.contributor.ride;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import ph.para.contributor.ride.RideStep.Effect;

/** Every rule of RideMachine, on the JVM. docs/architecture/state-machines.md names the states. */
public class RideMachineTest {
    private static final long T0 = 1_000_000;
    private static final long SECOND = 1_000;
    private static final long MINUTE = 60 * SECOND;

    private static Ride recording() {
        return RideMachine.start(Ride.NO_RIDE, "r1", T0).ride;
    }

    private static Ride paused() {
        return RideMachine.pause(recording(), T0 + MINUTE).ride;
    }

    @Test
    public void startBeginsARideOnLakadAndRecords() {
        RideStep step = RideMachine.start(Ride.NO_RIDE, "r1", T0);
        assertEquals(Ride.RECORDING, step.ride.phase);
        assertEquals(Ride.WALK, step.ride.mode());
        assertEquals(T0, step.ride.startedAt);
        assertTrue(step.has(Effect.BEGIN_LOG));
        assertTrue(step.has(Effect.START_SERVICE));
    }

    @Test
    public void startWithAnotherRideOpenChangesNothing() {
        Ride open = recording();
        RideStep step = RideMachine.start(open, "r2", T0 + MINUTE);
        assertSame(open, step.ride);
        assertFalse(step.has(Effect.START_SERVICE));
        assertTrue(step.has(Effect.DIAGNOSE));
    }

    @Test
    public void startOfThePausedRideResumesIt() {
        RideStep step = RideMachine.start(paused(), "r1", T0 + 3 * MINUTE);
        assertEquals(Ride.RECORDING, step.ride.phase);
        assertEquals(1, step.ride.gaps.size());
    }

    @Test
    public void startOfTheRideRecordingStartsItsServiceAgain() {
        Ride live = recording();
        RideStep step = RideMachine.start(live, "r1", T0 + MINUTE);
        assertSame(live, step.ride);
        assertTrue(step.has(Effect.START_SERVICE));
        assertFalse(step.has(Effect.POST_CARD));
    }

    @Test
    public void pauseSealsTheLogAndStopsTheService() {
        RideStep step = RideMachine.pause(recording(), T0 + MINUTE);
        assertEquals(Ride.PAUSED, step.ride.phase);
        assertEquals(T0 + MINUTE, step.ride.openPause().from);
        assertEquals(T0 + MINUTE, step.effects.get(0).time);
        assertEquals(Effect.SEAL_LOG, step.effects.get(0).kind);
        assertTrue(step.has(Effect.STOP_SERVICE));
    }

    @Test
    public void resumeClosesThePauseAsAGap() {
        Ride resumed = RideMachine.resume(paused(), T0 + 3 * MINUTE).ride;
        assertEquals(Ride.RECORDING, resumed.phase);
        Ride.Gap gap = resumed.gaps.get(0);
        assertEquals(Ride.GAP_PAUSED, gap.reason);
        assertEquals(T0 + MINUTE, gap.from);
        assertEquals(T0 + 3 * MINUTE, gap.to);
        assertEquals(2 * MINUTE, resumed.elapsedMs(T0 + 4 * MINUTE));
    }

    @Test
    public void resumeOfARideRecordingChangesNothing() {
        Ride live = recording();
        assertSame(live, RideMachine.resume(live, T0 + MINUTE).ride);
    }

    @Test
    public void theTimeStandsStillWhilePaused() {
        Ride ride = paused();
        assertEquals(MINUTE, ride.elapsedMs(T0 + 10 * MINUTE));
    }

    @Test
    public void finishWhileRecordingSealsAtTheTap() {
        RideStep step = RideMachine.finish(recording(), T0 + 5 * MINUTE);
        assertEquals(Ride.FINISHED, step.ride.phase);
        assertEquals(T0 + 5 * MINUTE, step.ride.finishedAt);
        assertTrue(step.has(Effect.SEAL_LOG));
        assertEquals(5 * MINUTE, step.ride.elapsedMs(T0 + 9 * MINUTE));
    }

    @Test
    public void finishWhilePausedKeepsThePausedTime() {
        RideStep step = RideMachine.finish(paused(), T0 + 5 * MINUTE);
        assertEquals(Ride.FINISHED, step.ride.phase);
        assertFalse(step.has(Effect.SEAL_LOG));
        assertEquals(MINUTE, step.ride.elapsedMs(T0 + 9 * MINUTE));
    }

    @Test
    public void switchModeOnlyWhileRecording() {
        Ride switched = RideMachine.switchMode(recording(), T0 + MINUTE).ride;
        assertEquals(Ride.RIDE, switched.mode());
        assertEquals(Ride.WALK, RideMachine.switchMode(switched, T0 + 2 * MINUTE).ride.mode());
        Ride still = paused();
        assertSame(still, RideMachine.switchMode(still, T0 + 2 * MINUTE).ride);
    }

    @Test
    public void clearEndsOnlyTheRideNamed() {
        Ride ride = RideMachine.finish(recording(), T0 + MINUTE).ride;
        assertSame(ride, RideMachine.clear(ride, "other").ride);
        RideStep cleared = RideMachine.clear(ride, "r1");
        assertEquals(Ride.NONE, cleared.ride.phase);
        assertTrue(cleared.has(Effect.STOP_SERVICE));
    }

    @Test
    public void noFixForTwoMinutesIsSaidThenAFixClearsIt() {
        Ride ride = RideMachine.fix(recording(), T0 + 10 * SECOND).ride;
        assertSame(ride, RideMachine.check(ride, T0 + 10 * SECOND + RideMachine.FIX_LIMIT_MS).ride);
        RideStep lost = RideMachine.check(ride, T0 + 11 * SECOND + RideMachine.FIX_LIMIT_MS);
        assertEquals(Ride.TROUBLE_NO_FIX, lost.ride.trouble);
        assertTrue(lost.has(Effect.POST_CARD));
        assertTrue(lost.has(Effect.DIAGNOSE));
        RideStep found = RideMachine.fix(lost.ride, T0 + 3 * MINUTE);
        assertEquals(Ride.TROUBLE_NONE, found.ride.trouble);
        assertTrue(found.has(Effect.POST_CARD));
    }

    @Test
    public void aFixIsNeverMovedBack() {
        Ride ride = RideMachine.fix(recording(), T0 + MINUTE).ride;
        assertEquals(T0 + MINUTE, RideMachine.fix(ride, T0 + 10 * SECOND).ride.lastFixAt);
    }

    @Test
    public void locationOffIsSaidAndOnCountsAfresh() {
        Ride off = RideMachine.locationOff(recording(), T0 + MINUTE).ride;
        assertEquals(Ride.TROUBLE_LOCATION_OFF, off.trouble);
        // Still off: the check does not turn it into "no fix".
        assertSame(off, RideMachine.check(off, T0 + 10 * MINUTE).ride);
        Ride on = RideMachine.locationOn(off, T0 + 10 * MINUTE).ride;
        assertEquals(Ride.TROUBLE_NONE, on.trouble);
        assertEquals(T0 + 10 * MINUTE, on.lastFixAt);
    }

    @Test
    public void aRefusalPausesTheRideAndSaysWhy() {
        RideStep step = RideMachine.refused(recording(), T0 + MINUTE, "no permission");
        assertEquals(Ride.PAUSED, step.ride.phase);
        assertEquals(Ride.TROUBLE_REFUSED, step.ride.trouble);
        assertTrue(step.has(Effect.STOP_SERVICE));
        assertTrue(step.has(Effect.SEAL_LOG));
        assertEquals(Ride.TROUBLE_NONE, RideMachine.resume(step.ride, T0 + 2 * MINUTE).ride.trouble);
    }

    @Test
    public void aStickyRestartRecordsOn() {
        Ride cut = RideMachine.serviceMissing(recording(), T0 + MINUTE).ride;
        Ride back = RideMachine.serviceRestarted(cut, T0 + MINUTE + SECOND).ride;
        assertTrue(back.isRecordingLive());
    }

    @Test
    public void aStrayRestartIsStopped() {
        RideStep step = RideMachine.serviceRestarted(paused(), T0 + 2 * MINUTE);
        assertTrue(step.has(Effect.STOP_SERVICE));
        assertEquals(Ride.PAUSED, step.ride.phase);
    }

    @Test
    public void aRideCutOffResumesWithTheLostTimeAsAGap() {
        Ride ride = RideMachine.fix(recording(), T0 + MINUTE).ride;
        Ride cut = RideMachine.serviceMissing(ride, T0 + 5 * MINUTE).ride;
        assertTrue(cut.isCutOff());
        assertEquals(MINUTE, cut.elapsedMs(T0 + 9 * MINUTE));
        Ride resumed = RideMachine.resume(cut, T0 + 9 * MINUTE).ride;
        assertTrue(resumed.isRecordingLive());
        Ride.Gap gap = resumed.gaps.get(0);
        assertEquals(Ride.GAP_RESUMED, gap.reason);
        assertEquals(T0 + MINUTE, gap.from);
        assertEquals(T0 + 9 * MINUTE, gap.to);
    }

    @Test
    public void aRideCutOffStopsAtItsLastFix() {
        Ride ride = RideMachine.fix(recording(), T0 + MINUTE).ride;
        Ride cut = RideMachine.serviceMissing(ride, T0 + 5 * MINUTE).ride;
        Ride stopped = RideMachine.pause(cut, cut.lastFixAt).ride;
        assertEquals(Ride.PAUSED, stopped.phase);
        assertEquals(T0 + MINUTE, stopped.openPause().from);
        assertEquals(T0 + MINUTE, RideMachine.finish(cut, T0 + 9 * MINUTE).ride.finishedAt);
    }

    @Test
    public void aPhoneRestartCutsOffARecordingRide() {
        RideStep step = RideMachine.phoneRestarted(recording(), T0 + MINUTE);
        assertEquals(Ride.TROUBLE_PHONE_RESTARTED, step.ride.trouble);
        assertTrue(step.has(Effect.POST_CARD));
        assertFalse(step.has(Effect.START_SERVICE));
    }

    @Test
    public void aPhoneRestartPutsBackAPausedCard() {
        RideStep step = RideMachine.phoneRestarted(paused(), T0 + 2 * MINUTE);
        assertEquals(Ride.PAUSED, step.ride.phase);
        assertTrue(step.has(Effect.POST_CARD));
        assertTrue(RideMachine.phoneRestarted(Ride.NO_RIDE, T0).effects.isEmpty());
    }

    @Test
    public void thePageSayingNoRideEndsIt() {
        RideStep step = RideMachine.told(recording(), Ride.NO_RIDE);
        assertEquals(Ride.NONE, step.ride.phase);
        assertTrue(step.has(Effect.POST_CARD));
        assertTrue(RideMachine.told(Ride.NO_RIDE, Ride.NO_RIDE).effects.isEmpty());
    }

    @Test
    public void thePageKeepsWhatOnlyThePhoneKnows() {
        Ride off = RideMachine.locationOff(RideMachine.fix(recording(), T0 + MINUTE).ride, T0 + MINUTE).ride;
        Ride told = RideCodec.fromSummary("r1", Ride.RECORDING, Ride.RIDE, T0, 0, 0, 0, 0);
        Ride kept = RideMachine.told(off, told).ride;
        assertEquals(Ride.TROUBLE_LOCATION_OFF, kept.trouble);
        assertEquals(T0 + MINUTE, kept.lastFixAt);
        assertEquals(Ride.RIDE, kept.mode());
        Ride pausedByPage = RideCodec.fromSummary("r1", Ride.PAUSED, Ride.WALK, T0, 0, T0 + 2 * MINUTE, 0, 0);
        assertEquals(Ride.TROUBLE_NONE, RideMachine.told(off, pausedByPage).ride.trouble);
    }

    @Test
    public void thePageTellingKeepsATapItHasNotTaken() {
        Ride tapped = RideMachine.switchMode(recording(), T0 + MINUTE).ride;
        Ride told = RideCodec.fromSummary("r1", Ride.RECORDING, Ride.WALK, T0, 0, 0, 0, 0);
        Ride kept = RideMachine.told(tapped, told).ride;
        assertEquals(Ride.RIDE, kept.mode());
        assertEquals(2, kept.modes.size());
    }

    @Test
    public void pausesThatOverlapAreCountedOnceAndALostStretchIsNot() {
        Ride ride = new Ride("r1", Ride.RECORDING, Ride.TROUBLE_NONE, T0, 0, T0,
            java.util.Collections.singletonList(new Ride.ModeSwitch(T0, Ride.WALK)),
            java.util.Arrays.asList(
                new Ride.Gap(T0 + 10 * SECOND, T0 + 30 * SECOND, Ride.GAP_PAUSED),
                new Ride.Gap(T0 + 20 * SECOND, T0 + 40 * SECOND, Ride.GAP_PAUSED),
                new Ride.Gap(T0 + 40 * SECOND, T0 + 50 * SECOND, Ride.GAP_PAUSED),
                new Ride.Gap(T0 + 60 * SECOND, T0 + 90 * SECOND, Ride.GAP_RESUMED)));
        assertEquals(60 * SECOND, ride.elapsedMs(T0 + 100 * SECOND));
    }
}
