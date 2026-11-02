package ph.para.contributor;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Our own plugins are not found by Capacitor's sync, so they are registered here.
        registerPlugin(NativePermissionsPlugin.class);
        registerPlugin(FixLogPlugin.class);
        registerPlugin(RidePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
