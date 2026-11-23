package ph.para.contributor.ride;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** Fix times that go forward whatever the phone's clock is set to (FixClock). */
public class FixClockTest {
    private static final long WALL = 1_800_000_000_000L;
    private static final long HOUR = 3_600_000;

    @Test
    public void theFirstFixKeepsItsOwnTime() {
        FixClock clock = new FixClock();
        assertEquals(WALL, clock.timeOf(WALL, 5_000));
        assertEquals(WALL + 1_000, clock.timeOf(WALL + 1_000, 6_000));
    }

    @Test
    public void aClockSetBackAnHourStillGivesTimesThatGoForward() {
        FixClock clock = new FixClock();
        long first = clock.timeOf(WALL, 5_000);
        // The wall clock is set back an hour: the fix's own time is an hour before the last one.
        long next = clock.timeOf(WALL + 1_000 - HOUR, 6_000);
        assertTrue(next > first);
        assertEquals(WALL + 1_000, next);
    }

    @Test
    public void aClockChangeIsSaidOnceThenAgainOnlyWhenItMovesBack() {
        FixClock clock = new FixClock();
        assertEquals(0, clock.changeSince(WALL, 5_000));
        clock.timeOf(WALL, 5_000);
        assertEquals(0, clock.changeSince(WALL + 30_000, 35_000));
        assertEquals(-HOUR + 30_000, clock.changeSince(WALL + 30_000 - HOUR + 30_000, 35_000));
        assertEquals(0, clock.changeSince(WALL - HOUR, 40_000));
        // Set right again: nothing to say, and a later change is said again.
        assertEquals(0, clock.changeSince(WALL + 45_000, 50_000));
        assertEquals(2 * HOUR, clock.changeSince(WALL + 2 * HOUR + 50_000, 55_000));
    }
}
