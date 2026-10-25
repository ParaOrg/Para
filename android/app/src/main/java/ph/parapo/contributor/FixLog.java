package ph.parapo.contributor;

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
 * service's fixes are appended here as they arrive (ParaPoApplication), and the page imports what
 * it has not stored yet when it wakes, starts or resumes.
 *
 * One file of JSON lines. The first line names the recording the fixes belong to, and a file with
 * no first line (or none at all) means no ride is being recorded, so fixes are dropped. A write
 * goes to the operating system at once, so a killed app loses nothing already received; a line cut
 * short by the kill is skipped when read.
 */
final class FixLog {
    private static final String FILE_NAME = "fixlog.ndjson";

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
        }
    }

    /** Starts logging for a recording; the fixes already logged for the same recording stay. */
    static synchronized void begin(Context context, String recordingId) throws IOException, JSONException {
        File file = fileOf(context);
        if (file.exists() && recordingIdOf(file).equals(recordingId)) return;
        write(file, new JSONObject().put("recordingId", recordingId).toString(), false);
    }

    /** Appends one fix, if a recording is being logged. */
    static synchronized void append(Context context, Location location) {
        File file = fileOf(context);
        if (!file.exists()) return;
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
    static synchronized JSONObject read(Context context) throws IOException, JSONException {
        JSONObject result = new JSONObject();
        JSONArray fixes = new JSONArray();
        result.put("fixes", fixes);
        File file = fileOf(context);
        result.put("recordingId", JSONObject.NULL);
        if (!file.exists()) return result;
        try (BufferedReader reader = new BufferedReader(reader(file))) {
            String first = reader.readLine();
            if (first == null) return result;
            result.put("recordingId", new JSONObject(first).getString("recordingId"));
            String line;
            while ((line = reader.readLine()) != null) {
                try {
                    fixes.put(new JSONObject(line));
                } catch (JSONException cutShort) {
                    // The last line, cut short by a kill.
                }
            }
        } catch (JSONException unreadable) {
            result.put("recordingId", JSONObject.NULL);
        }
        return result;
    }

    /** Stops logging and forgets the fixes. */
    static synchronized void clear(Context context) {
        //noinspection ResultOfMethodCallIgnored
        fileOf(context).delete();
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
