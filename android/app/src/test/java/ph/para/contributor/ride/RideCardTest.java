package ph.para.contributor.ride;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** Which card the ride shows (RideCard): never "Recording" while nothing records. */
public class RideCardTest {
    private static final long T0 = 1_000_000;

    private static Ride recording() {
        return RideMachine.start(Ride.NO_RIDE, "r1", T0).ride;
    }

    @Test
    public void recordingOnlyWhileTheServiceRuns() {
        assertEquals(RideCard.RECORDING, RideCard.of(recording(), true));
        assertEquals(RideCard.NONE, RideCard.of(recording(), false));
    }

    @Test
    public void noLocationWhileOffOrSilent() {
        Ride off = RideMachine.locationOff(recording(), T0).ride;
        assertEquals(RideCard.NO_LOCATION, RideCard.of(off, true));
        Ride silent = RideMachine.check(recording(), T0 + RideMachine.FIX_LIMIT_MS + 1).ride;
        assertEquals(RideCard.NO_LOCATION, RideCard.of(silent, true));
    }

    @Test
    public void aRideCutOffByAKillShowsNoCard() {
        Ride cut = RideMachine.serviceMissing(recording(), T0 + 1).ride;
        assertEquals(RideCard.NONE, RideCard.of(cut, false));
    }

    @Test
    public void aRideCutOffByARestartSaysSo() {
        Ride cut = RideMachine.phoneRestarted(recording(), T0 + 1).ride;
        assertEquals(RideCard.STOPPED_BY_RESTART, RideCard.of(cut, false));
    }

    @Test
    public void pausedAndFinishedShowWithNoService() {
        Ride paused = RideMachine.pause(recording(), T0 + 1).ride;
        assertEquals(RideCard.PAUSED, RideCard.of(paused, false));
        assertEquals(RideCard.FINISHED, RideCard.of(RideMachine.finish(paused, T0 + 2).ride, false));
        assertEquals(RideCard.NONE, RideCard.of(Ride.NO_RIDE, false));
    }

    @Test
    public void onlyTheTickingCardsExpire() {
        assertTrue(RideCard.expires(RideCard.RECORDING));
        assertTrue(RideCard.expires(RideCard.NO_LOCATION));
        assertFalse(RideCard.expires(RideCard.PAUSED));
        assertFalse(RideCard.expires(RideCard.STOPPED_BY_RESTART));
    }
}
