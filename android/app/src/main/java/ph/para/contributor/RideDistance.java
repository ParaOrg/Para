package ph.para.contributor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/**
 * How far a ride has gone, in metres, as the recording card says it: the same rule as the page's
 * keptFixes, hintosOf and pathLengthM in src/features/routes/model/ride-recording.ts, written again
 * in Java so the notification can say it while the page sleeps. tests/unit/ride-distance-test.mjs
 * runs both on the same rides and holds them to the same answer: change one, change the other.
 *
 * Plain Java, with no Android in it, so that check can compile and run it on its own.
 */
final class RideDistance {
    /** One fix: when, where, and the phone's own estimate of its error. */
    static final class Fix {
        final long time;
        final double lng;
        final double lat;
        final double accuracyM;

        Fix(long time, double lng, double lat, double accuracyM) {
            this.time = time;
            this.lng = lng;
            this.lat = lat;
            this.accuracyM = accuracyM;
        }
    }

    private static final class Hinto {
        final long from;
        long to;

        Hinto(long from, long to) {
            this.from = from;
            this.to = to;
        }
    }

    static final double MAX_SPEED_KMH = 120;
    static final double MAX_ACCURACY_M = 50;
    static final double HINTO_MIN_SECONDS = 8;
    static final double HINTO_RADIUS_M = 25;
    static final double SILENCE_SECONDS = 5;
    static final int REANCHOR_AFTER = 3;
    private static final double EARTH_RADIUS_M = 6_371_000;

    private RideDistance() {}

    /** Great-circle distance in metres between two fixes. */
    static double distanceM(Fix a, Fix b) {
        double dLat = Math.toRadians(b.lat - a.lat);
        double dLng = Math.toRadians(b.lng - a.lng);
        double h = Math.pow(Math.sin(dLat / 2), 2)
            + Math.cos(Math.toRadians(a.lat)) * Math.cos(Math.toRadians(b.lat)) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
    }

    private static double speedKmh(Fix from, Fix to) {
        return (distanceM(from, to) / ((to.time - from.time) / 1000.0)) * 3.6;
    }

    /** keptFixes: the fixes that count, in time order. */
    static List<Fix> keptFixes(List<Fix> fixes) {
        Fix[] sorted = fixes.toArray(new Fix[0]);
        // A stable sort, as JavaScript's is.
        Arrays.sort(sorted, Comparator.comparingLong(fix -> fix.time));
        List<Fix> kept = new ArrayList<>();
        List<Fix> pending = new ArrayList<>();
        for (Fix fix : sorted) {
            if (fix.accuracyM > MAX_ACCURACY_M) continue;
            Fix last = kept.isEmpty() ? null : kept.get(kept.size() - 1);
            if (last != null && fix.time <= last.time) continue;
            if (last == null || speedKmh(last, fix) <= MAX_SPEED_KMH) {
                kept.add(fix);
                pending = new ArrayList<>();
                continue;
            }
            Fix before = pending.isEmpty() ? null : pending.get(pending.size() - 1);
            if (before != null && speedKmh(before, fix) <= MAX_SPEED_KMH) {
                pending.add(fix);
            } else {
                pending = new ArrayList<>();
                pending.add(fix);
            }
            if (pending.size() >= REANCHOR_AFTER) {
                if (kept.size() < REANCHOR_AFTER) kept = new ArrayList<>();
                kept.addAll(pending);
                pending = new ArrayList<>();
            }
        }
        return kept;
    }

    /** hintosOf, with mergeHintos: where the ride stood, from fixes that count. */
    private static List<Hinto> hintosOf(List<Fix> fixes) {
        List<Hinto> hintos = new ArrayList<>();
        int start = 0;
        for (int i = 1; i < fixes.size(); i++) {
            if (distanceM(fixes.get(start), fixes.get(i)) > HINTO_RADIUS_M) {
                close(fixes, start, i - 1, hintos);
                start = i;
            }
        }
        if (!fixes.isEmpty()) close(fixes, start, fixes.size() - 1, hintos);
        List<Hinto> merged = new ArrayList<>();
        for (Hinto hinto : hintos) {
            Hinto last = merged.isEmpty() ? null : merged.get(merged.size() - 1);
            if (last != null && (hinto.from - last.to) / 1000.0 <= SILENCE_SECONDS) {
                last.to = Math.max(last.to, hinto.to);
            } else {
                merged.add(new Hinto(hinto.from, hinto.to));
            }
        }
        return merged;
    }

    private static void close(List<Fix> fixes, int start, int end, List<Hinto> hintos) {
        Fix first = fixes.get(start);
        Fix last = fixes.get(end);
        if (end > start && (last.time - first.time) / 1000.0 >= HINTO_MIN_SECONDS) {
            hintos.add(new Hinto(first.time, last.time));
        }
    }

    private static Hinto inside(Fix fix, List<Hinto> hintos) {
        for (Hinto hinto : hintos) {
            if (fix.time >= hinto.from && fix.time <= hinto.to) return hinto;
        }
        return null;
    }

    /** pathLengthM over the fixes that count, a hinto's wander left out: the card's distance. */
    static double of(List<Fix> fixes) {
        List<Fix> kept = keptFixes(fixes);
        List<Hinto> hintos = hintosOf(kept);
        double total = 0;
        for (int i = 1; i < kept.size(); i++) {
            Hinto was = inside(kept.get(i - 1), hintos);
            if (was != null && was == inside(kept.get(i), hintos)) continue;
            total += distanceM(kept.get(i - 1), kept.get(i));
        }
        return total;
    }

    /** For the unit check: reads `time lng lat accuracy` lines on stdin, prints the distance. */
    public static void main(String[] args) throws java.io.IOException {
        java.io.BufferedReader in = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
        List<Fix> fixes = new ArrayList<>();
        for (String line = in.readLine(); line != null; line = in.readLine()) {
            String[] parts = line.trim().split("\\s+");
            if (parts.length < 4) continue;
            fixes.add(new Fix(
                Long.parseLong(parts[0]),
                Double.parseDouble(parts[1]),
                Double.parseDouble(parts[2]),
                Double.parseDouble(parts[3])
            ));
        }
        System.out.println(of(fixes));
    }
}
