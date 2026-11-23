package ph.para.contributor.ride;

import static org.junit.Assert.assertEquals;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.Test;

/** The page's and the phone's account of a ride, put together (RideHistory). */
public class RideHistoryTest {
    private static Ride.ModeSwitch mode(long time, String to) {
        return new Ride.ModeSwitch(time, to);
    }

    private static Ride.Gap gap(long from, long to) {
        return new Ride.Gap(from, to, Ride.GAP_PAUSED);
    }

    @Test
    public void modesOfBothInTimeOrder() {
        List<Ride.ModeSwitch> kept = RideHistory.modes(
            Arrays.asList(mode(0, Ride.WALK), mode(30, Ride.WALK)),
            Arrays.asList(mode(0, Ride.WALK), mode(20, Ride.RIDE)));
        assertEquals(3, kept.size());
        assertEquals(20, kept.get(1).time);
        assertEquals(Ride.WALK, kept.get(2).to);
    }

    @Test
    public void putTogetherAgainAddsNothing() {
        List<Ride.ModeSwitch> once = RideHistory.modes(
            Collections.singletonList(mode(0, Ride.WALK)), Collections.singletonList(mode(5, Ride.RIDE)));
        assertEquals(once.size(), RideHistory.modes(once, once).size());
        List<Ride.Gap> gaps = RideHistory.gaps(Collections.singletonList(gap(10, 20)),
            Arrays.asList(gap(10, 20), gap(30, 40)));
        assertEquals(2, gaps.size());
        assertEquals(2, RideHistory.gaps(gaps, gaps).size());
    }

    @Test
    public void anOpenGapOfTheirsIsNotTakenAndOursStaysLast() {
        List<Ride.Gap> gaps = RideHistory.gaps(Collections.singletonList(gap(50, 0)),
            Arrays.asList(gap(10, 20), gap(60, 0)));
        assertEquals(2, gaps.size());
        assertEquals(10, gaps.get(0).from);
        assertEquals(50, gaps.get(1).from);
        assertEquals(0, gaps.get(1).to);
    }
}
