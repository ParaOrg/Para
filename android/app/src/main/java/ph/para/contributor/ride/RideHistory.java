package ph.para.contributor.ride;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Two accounts of one ride's history put together: the page's (told while it is awake) and the
 * phone's (taps on the card while the page slept). Nothing either side knows is lost, and putting
 * the same history together again adds nothing, so neither side needs to remember what it has
 * already passed on. The page does the same with the phone's account (recorder/ride-history.ts).
 */
public final class RideHistory {
    private RideHistory() {}

    /** Every switch of either, by time; one at a time already there, or to the mode already on, is dropped. */
    public static List<Ride.ModeSwitch> modes(List<Ride.ModeSwitch> ours, List<Ride.ModeSwitch> theirs) {
        List<Ride.ModeSwitch> all = new ArrayList<>(ours);
        all.addAll(theirs);
        Collections.sort(all, (a, b) -> Long.compare(a.time, b.time));
        List<Ride.ModeSwitch> kept = new ArrayList<>();
        for (Ride.ModeSwitch mode : all) {
            Ride.ModeSwitch last = kept.isEmpty() ? null : kept.get(kept.size() - 1);
            if (last != null && (last.time == mode.time || last.to.equals(mode.to))) continue;
            kept.add(mode);
        }
        return kept;
    }

    /**
     * `ours`, with each closed gap of `theirs` that ours lacks (the same start and reason is the same
     * gap), in time order. An open gap of theirs is not taken: whether the ride stands paused is
     * ours to say.
     */
    public static List<Ride.Gap> gaps(List<Ride.Gap> ours, List<Ride.Gap> theirs) {
        List<Ride.Gap> kept = new ArrayList<>(ours);
        for (Ride.Gap gap : theirs) {
            if (gap.isOpen() || has(ours, gap)) continue;
            kept.add(gap);
        }
        Collections.sort(kept, (a, b) -> {
            // An open gap (a pause now) stays last.
            if (a.isOpen() != b.isOpen()) return a.isOpen() ? 1 : -1;
            return Long.compare(a.from, b.from);
        });
        return kept;
    }

    private static boolean has(List<Ride.Gap> gaps, Ride.Gap gap) {
        for (Ride.Gap there : gaps) {
            if (there.from == gap.from && there.reason.equals(gap.reason)) return true;
        }
        return false;
    }
}
