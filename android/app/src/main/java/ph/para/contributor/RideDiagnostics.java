package ph.para.contributor;

import android.content.Context;
import android.util.Log;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayDeque;
import java.util.Date;
import java.util.Deque;
import java.util.Locale;
import java.util.TimeZone;

/**
 * The ride's own diagnostics log: one line for each thing that went wrong with a ride, or was put
 * right (RideMachine says which). It stays on the phone (files/diagnostics.log) and leaves it only if
 * the contributor chooses to share it (ADR 0004). No place is written in it, only what happened and
 * when. Kept to its last MAX_LINES lines.
 */
final class RideDiagnostics {
    private static final String TAG = "ParaRide";
    private static final String FILE_NAME = "diagnostics.log";
    private static final int MAX_LINES = 300;

    private RideDiagnostics() {}

    private static File fileOf(Context context) {
        return new File(context.getFilesDir(), FILE_NAME);
    }

    /** Adds `note`, with the time and the ride it is about. Never throws: a log must not stop a ride. */
    static synchronized void note(Context context, String recordingId, String note) {
        String line = timeText(System.currentTimeMillis()) + "\t" + recordingId + "\t" + note;
        Log.i(TAG, "diagnostics: " + note);
        File file = fileOf(context);
        try {
            try (FileOutputStream out = new FileOutputStream(file, true)) {
                out.write((line + "\n").getBytes(StandardCharsets.UTF_8));
            }
            if (file.length() > MAX_LINES * 200L) trim(file);
        } catch (IOException unwritable) {
            Log.w(TAG, "The diagnostics log could not be written.", unwritable);
        }
    }

    /** The log, oldest line first; empty when there is none. */
    static synchronized String read(Context context) {
        File file = fileOf(context);
        if (!file.exists()) return "";
        StringBuilder text = new StringBuilder();
        for (String line : lastLines(file)) text.append(line).append('\n');
        return text.toString();
    }

    private static void trim(File file) throws IOException {
        StringBuilder kept = new StringBuilder();
        for (String line : lastLines(file)) kept.append(line).append('\n');
        try (FileOutputStream out = new FileOutputStream(file, false)) {
            out.write(kept.toString().getBytes(StandardCharsets.UTF_8));
        }
    }

    private static Deque<String> lastLines(File file) {
        Deque<String> lines = new ArrayDeque<>();
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.addLast(line);
                if (lines.size() > MAX_LINES) lines.removeFirst();
            }
        } catch (IOException unreadable) {
            Log.w(TAG, "The diagnostics log could not be read.", unreadable);
        }
        return lines;
    }

    private static String timeText(long time) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.ROOT);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(time));
    }
}
