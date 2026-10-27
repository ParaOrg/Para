package ph.para.contributor;

import android.content.Context;
import android.location.Location;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * The ride's fixes, kept natively. Android freezes the page's JavaScript about five minutes after
 * the screen goes off, so the page cannot be the only place a fix is written: the location
 * service's fixes are appended here as they arrive (ParaApplication), and the page imports what
 * it has not stored yet when it wakes, starts or resumes.
 *
 * One file of JSON lines. The first line names the recording the fixes belong to, and a file with
 * no first line (or none at all) means no ride is being recorded, so fixes are dropped. A write
 * goes to the operating system at once, so a killed app loses nothing already received; a line cut
 * short by the kill is skipped when read.
 */
final class FixLog {
    private static final String FILE_NAME = "fixlog.ndjson";

    // Set by end() and cleared by begin(): a stopped recording takes no more fixes. Only ever
    // true in a process that is still running, and a process that died has no service to log for.
    private static boolean isSealed = false;

    private FixLog() {}

    private static File fileOf(Context context) {
        return new File(context.getFilesDir(), FILE_NAME);
    }

    // Not FileReader(File, Charset): that constructor needs Android 13, and the app runs on 7.
    private static InputStreamReader reader(File file) throws IOException {
        return new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8);
    }

    private static void write(File file, String line, boolean isAppend) throws IOException {
        try (FileOutputStream out = new FileOutputStream(file, isAppend)) {
            out.write((line + "\n").getBytes(StandardCharsets.UTF_8));
            // At one fix a second this is cheap, and it keeps the fix through a crash of the phone.
            out.getFD().sync();
        }
    }

    /** Starts logging for a recording; the fixes already logged for the same recording stay. */
    static synchronized void begin(Context context, String recordingId) throws IOException, JSONException {
        isSealed = false;
        File file = fileOf(context);
        if (file.exists() && recordingIdOf(file).equals(recordingId)) return;
        write(file, new JSONObject().put("recordingId", recordingId).toString(), false);
    }

    /** Appends one fix, if a recording is being logged. */
    static synchronized void append(Context context, Location location) {
        File file = fileOf(context);
        if (isSealed || !file.exists()) return;
        try {
            JSONObject line = new JSONObject()
                .put("time", location.getTime())
                .put("lng", location.getLongitude())
                .put("lat", location.getLatitude());
            if (location.hasAccuracy()) line.put("accuracyM", location.getAccuracy());
            write(file, line.toString(), true);
        } catch (IOException | JSONException ignored) {
            // The page still gets this fix live; losing it here must not stop the service.
        }
    }

    /** The recording being logged and its fixes, or a null recording when none is. */
    static JSONObject read(Context context) throws IOException, JSONException {
        String text;
        synchronized (FixLog.class) {
            File file = fileOf(context);
            text = file.exists() ? readText(file) : "";
        }
        JSONObject result = new JSONObject();
        JSONArray fixes = new JSONArray();
        result.put("fixes", fixes);
        result.put("recordingId", JSONObject.NULL);
        String[] lines = text.split("\n");
        if (lines.length == 0 || lines[0].isEmpty()) return result;
        try {
            result.put("recordingId", new JSONObject(lines[0]).getString("recordingId"));
        } catch (JSONException unreadable) {
            return result;
        }
        for (int index = 1; index < lines.length; index++) {
            try {
                fixes.put(new JSONObject(lines[index]));
            } catch (JSONException cutShort) {
                // The last line, cut short by a kill.
            }
        }
        return result;
    }

    /**
     * Ends the recording's log at the Stop: the fixes after it (the service goes on until the page
     * has let it go) are dropped, and no more are taken until begin() starts it again.
     */
    static synchronized void end(Context context, long time) throws IOException, JSONException {
        isSealed = true;
        File file = fileOf(context);
        if (!file.exists()) return;
        String[] lines = readText(file).split("\n");
        StringBuilder kept = new StringBuilder();
        for (int index = 0; index < lines.length; index++) {
            if (lines[index].isEmpty()) continue;
            try {
                if (index > 0 && new JSONObject(lines[index]).getLong("time") > time) continue;
            } catch (JSONException cutShort) {
                continue;
            }
            kept.append(lines[index]).append("\n");
        }
        try (FileOutputStream out = new FileOutputStream(file, false)) {
            out.write(kept.toString().getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
        }
    }

    /** Stops logging and forgets the fixes. */
    static synchronized void clear(Context context) {
        //noinspection ResultOfMethodCallIgnored
        fileOf(context).delete();
    }

    private static String readText(File file) throws IOException {
        try (BufferedReader reader = new BufferedReader(reader(file))) {
            StringBuilder text = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) text.append(line).append("\n");
            return text.toString();
        }
    }

    private static String recordingIdOf(File file) {
        try (BufferedReader reader = new BufferedReader(reader(file))) {
            String first = reader.readLine();
            return first == null ? "" : new JSONObject(first).getString("recordingId");
        } catch (IOException | JSONException unreadable) {
            return "";
        }
    }
}
