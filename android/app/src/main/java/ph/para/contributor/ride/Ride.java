package ph.para.contributor.ride;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * One ride as the phone holds it: the truth the page reads (RideMachine says how it changes). Plain
 * Java with no Android in it, so its rules run in the JVM's unit tests. Immutable: every change is a
 * new Ride.
 *
 * Its history is kept whole, not as taps waiting for the page: the mode switches and the gaps (a
 * pause, or the time lost before a cut-off ride was resumed), so the page can read the ride at any
 * time and get the same answer.
 */
public final class Ride {
    /** No ride: nothing records, and no card shows. */
    public static final String NONE = "none";
    public static final String RECORDING = "recording";
    public static final String PAUSED = "paused";
    /** Finished from the card with the page gone: it waits for the page's Save form. */
    public static final String FINISHED = "finished";

    /** Recording, and nothing is wrong. */
    public static final String TROUBLE_NONE = "none";
    /** The phone's location switch is off. */
    public static final String TROUBLE_LOCATION_OFF = "location-off";
    /** Recording, location on, yet no fix in the last RideMachine.FIX_LIMIT_MS. */
    public static final String TROUBLE_NO_FIX = "no-fix";
    /** Android refused the recording (no permission, or no foreground): the ride was paused. */
    public static final String TROUBLE_REFUSED = "refused";
    /** The ride's process died and nothing restarted it: cut off at its last fix. */
    public static final String TROUBLE_CUT_OFF = "cut-off";
    /** The phone restarted (or the app was updated) mid-ride: cut off at its last fix. */
    public static final String TROUBLE_PHONE_RESTARTED = "phone-restarted";

    public static final String WALK = "walk";
    public static final String RIDE = "ride";

    public static final String GAP_PAUSED = "paused";
    public static final String GAP_RESUMED = "resumed";

    /** A switch of mode at a time. */
    public static final class ModeSwitch {
        public final long time;
        public final String to;

        public ModeSwitch(long time, String to) {
            this.time = time;
            this.to = to;
        }
    }

    /** Time not recorded: `to` is 0 while it is still running (a pause now). */
    public static final class Gap {
        public final long from;
        public final long to;
        public final String reason;

        public Gap(long from, long to, String reason) {
            this.from = from;
            this.to = to;
            this.reason = reason;
        }

        boolean isOpen() {
            return to == 0;
        }
    }

    public static final Ride NO_RIDE = new Ride("", NONE, TROUBLE_NONE, 0, 0, 0,
        Collections.<ModeSwitch>emptyList(), Collections.<Gap>emptyList());

    public final String recordingId;
    public final String phase;
    public final String trouble;
    public final long startedAt;
    /** When Finish was tapped; 0 until then. */
    public final long finishedAt;
    /** The last fix's time, or the time recording last began: what the fix check counts from. */
    public final long lastFixAt;
    public final List<ModeSwitch> modes;
    public final List<Gap> gaps;

    public Ride(String recordingId, String phase, String trouble, long startedAt, long finishedAt,
                long lastFixAt, List<ModeSwitch> modes, List<Gap> gaps) {
        this.recordingId = recordingId;
        this.phase = phase;
        this.trouble = trouble;
        this.startedAt = startedAt;
        this.finishedAt = finishedAt;
        this.lastFixAt = lastFixAt;
        this.modes = Collections.unmodifiableList(new ArrayList<>(modes));
        this.gaps = Collections.unmodifiableList(new ArrayList<>(gaps));
    }

    public boolean is(String which) {
        return phase.equals(which);
    }

    /** Recording with its service meant to run: not cut off by a kill or a restart. */
    public boolean isRecordingLive() {
        return is(RECORDING) && !isCutOff();
    }

    public boolean isCutOff() {
        return TROUBLE_CUT_OFF.equals(trouble) || TROUBLE_PHONE_RESTARTED.equals(trouble);
    }

    /** The mode the ride is on now. */
    public String mode() {
        return modes.isEmpty() ? WALK : modes.get(modes.size() - 1).to;
    }

    /** The pause running now, or null. */
    public Gap openPause() {
        if (gaps.isEmpty()) return null;
        Gap last = gaps.get(gaps.size() - 1);
        return last.isOpen() ? last : null;
    }

    /** Time recorded as the clock reads `now`, gaps left out: the card's Time. */
    public long elapsedMs(long now) {
        Gap open = openPause();
        long end = now;
        if (open != null) end = open.from;
        else if (is(FINISHED) && finishedAt > 0) end = finishedAt;
        else if (isCutOff()) end = lastFixAt;
        return Math.max(0, end - startedAt - pausedMs());
    }

    /**
     * The time paused, as the page's card counts it (recording-figures.ts pausedSecondsOf): the
     * closed "paused" gaps, those that overlap or touch counted once. Time lost to a cut-off
     * ("resumed") counts as the ride's, as on the page.
     */
    long pausedMs() {
        List<Gap> paused = new ArrayList<>();
        for (Gap gap : gaps) {
            if (!gap.isOpen() && GAP_PAUSED.equals(gap.reason)) paused.add(gap);
        }
        Collections.sort(paused, (a, b) -> Long.compare(a.from, b.from));
        long total = 0;
        long from = 0;
        long to = Long.MIN_VALUE;
        for (Gap gap : paused) {
            if (gap.from > to) {
                if (to != Long.MIN_VALUE) total += to - from;
                from = gap.from;
                to = gap.to;
            } else {
                to = Math.max(to, gap.to);
            }
        }
        if (to != Long.MIN_VALUE) total += to - from;
        return total;
    }

    Ride with(String phase, String trouble, long finishedAt, long lastFixAt,
              List<ModeSwitch> modes, List<Gap> gaps) {
        return new Ride(recordingId, phase, trouble, startedAt, finishedAt, lastFixAt, modes, gaps);
    }

    Ride withTrouble(String trouble) {
        return with(phase, trouble, finishedAt, lastFixAt, modes, gaps);
    }

    Ride withLastFixAt(long time) {
        return with(phase, trouble, finishedAt, time, modes, gaps);
    }
}
