package ph.para.contributor.ride;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.util.List;

import org.junit.Test;

/** The ride's history kept as text (RideCodec), and a ride kept before it had one. */
public class RideCodecTest {
    private static final long T0 = 1_000_000;

    @Test
    public void historyRoundTrips() {
        Ride ride = RideMachine.start(Ride.NO_RIDE, "r1", T0).ride;
        ride = RideMachine.switchMode(ride, T0 + 10).ride;
        ride = RideMachine.pause(ride, T0 + 20).ride;
        ride = RideMachine.resume(ride, T0 + 30).ride;
        ride = RideMachine.pause(ride, T0 + 40).ride;

        List<Ride.ModeSwitch> modes = RideCodec.modesOf(RideCodec.modesText(ride.modes));
        assertEquals(2, modes.size());
        assertEquals(T0 + 10, modes.get(1).time);
        assertEquals(Ride.RIDE, modes.get(1).to);

        List<Ride.Gap> gaps = RideCodec.gapsOf(RideCodec.gapsText(ride.gaps));
        assertEquals(2, gaps.size());
        assertEquals(T0 + 30, gaps.get(0).to);
        assertEquals(0, gaps.get(1).to);
        assertEquals(Ride.GAP_PAUSED, gaps.get(1).reason);
    }

    @Test
    public void anUnreadablePartIsSkipped() {
        assertEquals(1, RideCodec.modesOf("5:walk,x:ride,6:bus").size());
        assertEquals(1, RideCodec.gapsOf("1:2:paused,1:paused,a:2:paused").size());
        assertEquals(0, RideCodec.modesOf(null).size());
        assertEquals(0, RideCodec.gapsOf("").size());
    }

    @Test
    public void aRideKeptBeforeHistoryKeepsItsTimes() {
        Ride ride = RideCodec.fromSummary("r1", Ride.PAUSED, Ride.RIDE, T0, 30_000, T0 + 90_000, 0, 0);
        assertEquals(Ride.RIDE, ride.mode());
        assertEquals(T0 + 90_000, ride.openPause().from);
        assertEquals(60_000, ride.elapsedMs(T0 + 500_000));

        Ride recording = RideCodec.fromSummary("r1", Ride.RECORDING, "bus", T0, 0, 0, 0, 0);
        assertEquals(Ride.WALK, recording.mode());
        assertNull(recording.openPause());
        assertEquals(T0, recording.lastFixAt);
    }
}
