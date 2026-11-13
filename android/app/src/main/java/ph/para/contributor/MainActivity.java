package ph.para.contributor;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Our own plugins are not found by Capacitor's sync, so they are registered here.
        registerPlugin(NativePermissionsPlugin.class);
        registerPlugin(FixLogPlugin.class);
        registerPlugin(RidePlugin.class);
        registerPlugin(ShareImagePlugin.class);
        super.onCreate(savedInstanceState);
        // Para is light only: the WebView never darkens the page on its own (Android 13+, where it
        // could). The page also says so itself (contribute/index.html, color-scheme).
        WebView webView = getBridge().getWebView();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && webView != null) {
            webView.getSettings().setAlgorithmicDarkeningAllowed(false);
        }
    }
}
