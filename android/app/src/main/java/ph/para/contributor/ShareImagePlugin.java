package ph.para.contributor;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * Hands a PNG the page drew (the ride's summary card) to Android's share sheet. The WebView has no
 * Web Share, so the page sends the picture here: it is written to the app's cache, which the
 * manifest's FileProvider already serves (res/xml/file_paths.xml), and shared from there.
 */
@CapacitorPlugin(name = "ShareImage")
public class ShareImagePlugin extends Plugin {
    @PluginMethod
    public void share(PluginCall call) {
        String base64 = call.getString("base64");
        String fileName = call.getString("fileName");
        String title = call.getString("title", "");
        // Only a plain file name: the page names it, but nothing may write outside shared/.
        if (base64 == null || fileName == null || !fileName.matches("[A-Za-z0-9._-]+\\.png")) {
            call.reject("base64 and a .png fileName are required.");
            return;
        }
        File dir = new File(getContext().getCacheDir(), "shared");
        File file = new File(dir, fileName);
        try {
            if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("no cache folder");
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(Base64.decode(base64, Base64.DEFAULT));
            }
        } catch (IOException | IllegalArgumentException error) {
            call.reject("The picture could not be saved for sharing.", error);
            return;
        }
        Uri uri = FileProvider.getUriForFile(
            getContext(), getContext().getPackageName() + ".fileprovider", file);
        Intent send = new Intent(Intent.ACTION_SEND)
            .setType("image/png")
            .putExtra(Intent.EXTRA_STREAM, uri)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        // The chooser shows a preview of the picture only when it can read it too.
        send.setClipData(ClipData.newRawUri(title, uri));
        Intent chooser = Intent.createChooser(send, title);
        getActivity().runOnUiThread(() -> getActivity().startActivity(chooser));
        // Android does not say whether the rider picked an app, so opening the sheet is the answer.
        call.resolve();
    }
}
