package ph.para.contributor.ride;

/**
 * The time a fix is kept at, safe from the phone's clock being changed mid-ride. A fix's own time
 * (Location.getTime) is the wall clock, which Android says may jump back or forward; its elapsed
 * time (since the phone started) only goes forward. So the first fix a process sees anchors the
 * wall clock to the elapsed one, and every fix after it is that anchor plus its elapsed time: the
 * times go forward as the ride does, whatever the clock is set to, and the fix log and the page,
 * which both drop a fix not newer than the last, keep them all.
 *
 * Plain Java with no Android in it, so tests/FixClockTest runs it on the JVM.
 */
public final class FixClock {
    /** How far the wall clock may move from the fixes' time before it counts as changed. */
    public static final long CHANGE_MS = 60_000;

    private long offsetMs = 0;
    private boolean isAnchored = false;
    private boolean isChangeSaid = false;

    /** The time to keep a fix at: its wall time `wallMs`, read through its elapsed time `elapsedMs`. */
    public synchronized long timeOf(long wallMs, long elapsedMs) {
        if (!isAnchored) {
            offsetMs = wallMs - elapsedMs;
            isAnchored = true;
        }
        return elapsedMs + offsetMs;
    }

    /**
     * How far the phone's clock (`nowMs`, read at elapsed `elapsedMs`) has moved from the fixes'
     * time, once each time it moves past CHANGE_MS; 0 otherwise, and before any fix.
     */
    public synchronized long changeSince(long nowMs, long elapsedMs) {
        if (!isAnchored) return 0;
        long moved = nowMs - (elapsedMs + offsetMs);
        boolean isChanged = Math.abs(moved) > CHANGE_MS;
        if (isChanged == isChangeSaid) return 0;
        isChangeSaid = isChanged;
        return isChanged ? moved : 0;
    }
}
