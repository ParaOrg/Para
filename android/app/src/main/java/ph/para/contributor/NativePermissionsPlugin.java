package ph.para.contributor;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.location.LocationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.Priority;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * What a recording needs from Android that the page asks for in its own words first: the three
 * permissions, one alias at a time (Capacitor's checkPermissions and
 * requestPermissions({ permissions: [alias] }) do the work; this class declares the aliases), and
 * the phone's Settings. Android asks for "all the time" location (backgroundLocation) apart from
 * the other location permissions, and only after those are granted.
 */
@CapacitorPlugin(
    name = "NativePermissions",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "backgroundLocation",
            strings = { android.Manifest.permission.ACCESS_BACKGROUND_LOCATION }
        ),
        @Permission(
            alias = "notifications",
            strings = { "android.permission.POST_NOTIFICATIONS" }
        )
    }
)
public class NativePermissionsPlugin extends Plugin {
    private static final String TAG = "ParaLocation";
    /** How long the dialog's own result is waited for once the app is back in front. */
    private static final long DIALOG_RESULT_GRACE_MS = 1_000;

    /** Google's "Turn on location?" dialog, and the call waiting for its answer. */
    private ActivityResultLauncher<IntentSenderRequest> locationDialog;
    private PluginCall waitingForDialog = null;

    @Override
    public void load() {
        // Registered as the activity is made, as Android requires: before it is started.
        locationDialog = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> answerDialog(result.getResultCode() == Activity.RESULT_OK)
        );
    }

    /**
     * Whether the phone's location is on, for the page's locate button: "on", or "off" once the
     * person has said no to Google's "Turn on location?" dialog, or when it cannot be shown. A tap
     * with location on answers at once; with it off the dialog shows, and its answer is the
     * answer. "unknown" without Google Play services, for the page to go on as it would on the web.
     */
    @PluginMethod
    public void checkLocationOn(PluginCall call) {
        LocationSettingsRequest request = new LocationSettingsRequest.Builder()
            .addLocationRequest(new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000).build())
            .setAlwaysShow(true)
            .build();
        try {
            LocationServices.getSettingsClient(getActivity())
                .checkLocationSettings(request)
                .addOnSuccessListener(ignored -> answer(call, "on"))
                .addOnFailureListener(error -> {
                    if (!(error instanceof ResolvableApiException)) {
                        answer(call, "off");
                        return;
                    }
                    if (waitingForDialog != null) {
                        // A second tap while the dialog is up: the first one's answer is for both.
                        answer(call, "off");
                        return;
                    }
                    try {
                        waitingForDialog = call;
                        locationDialog.launch(new IntentSenderRequest.Builder(
                            ((ResolvableApiException) error).getResolution().getIntentSender()).build());
                    } catch (RuntimeException couldNotShow) {
                        Log.w(TAG, "The Turn on location dialog could not be shown.", couldNotShow);
                        waitingForDialog = null;
                        answer(call, "off");
                    }
                });
        } catch (RuntimeException noPlayServices) {
            Log.w(TAG, "Location settings could not be read.", noPlayServices);
            answer(call, "unknown");
        }
    }

    /**
     * Back in front with the dialog's answer not come: some phones never deliver it, and the
     * page's tap would wait for good with nothing said. Once the result has had its moment, the
     * phone's own location switch is the answer.
     */
    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (waitingForDialog == null) return;
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (waitingForDialog == null) return;
            LocationManager manager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            answerDialog(manager != null && LocationManagerCompat.isLocationEnabled(manager));
        }, DIALOG_RESULT_GRACE_MS);
    }

    private void answerDialog(boolean isTurnedOn) {
        PluginCall call = waitingForDialog;
        waitingForDialog = null;
        if (call != null) answer(call, isTurnedOn ? "on" : "off");
    }

    private static void answer(PluginCall call, String location) {
        JSObject result = new JSObject();
        result.put("location", location);
        call.resolve(result);
    }
    /**
     * The phone's maker (lower case) and Android version, which decide which permissions exist and
     * whether Keep Para recording applies, whether the phone's location switch is on, and whether
     * Android already lets Para run in the background unrestricted.
     */
    @PluginMethod
    public void deviceInfo(PluginCall call) {
        JSObject state = new JSObject();
        state.put("sdk", Build.VERSION.SDK_INT);
        state.put("manufacturer", Build.MANUFACTURER.toLowerCase(Locale.ROOT));
        LocationManager location = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        state.put("isLocationOn", location != null && LocationManagerCompat.isLocationEnabled(location));
        state.put("isBatteryUnrestricted", isBatteryUnrestricted());
        call.resolve(state);
    }

    /** Whether Android leaves Para out of its battery optimisations: it may run on in the background. */
    private boolean isBatteryUnrestricted() {
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return power != null && power.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    /**
     * Android's own "Let Para always run in the background?" dialog, for a ride that goes on when
     * the app is left (some makers' Android, MIUI's among them, honours it as No restrictions).
     * Answers whether Para is unrestricted once the dialog is closed; at once when it already is,
     * or when the phone has no such dialog.
     */
    @PluginMethod
    public void askBatteryUnrestricted(PluginCall call) {
        if (isBatteryUnrestricted()) {
            answerBattery(call);
            return;
        }
        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            .setData(Uri.fromParts("package", getContext().getPackageName(), null));
        try {
            startActivityForResult(call, intent, "batteryAnswered");
        } catch (RuntimeException noDialog) {
            Log.w(TAG, "The battery dialog could not be shown.", noDialog);
            answerBattery(call);
        }
    }

    @ActivityCallback
    private void batteryAnswered(PluginCall call, ActivityResult result) {
        if (call != null) answerBattery(call);
    }

    private void answerBattery(PluginCall call) {
        JSObject result = new JSObject();
        result.put("isUnrestricted", isBatteryUnrestricted());
        call.resolve(result);
    }

    /** The phone's Location settings, where its switch is; Para's own page if a phone has none. */
    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (android.content.ActivityNotFoundException none) {
            openAppSettings(call);
            return;
        }
        call.resolve();
    }

    /**
     * The makers' own screens that let an app start and run in the background (MIUI's Autostart,
     * and the like), as package and activity, by the group the page names (keep-recording-makers.ts).
     * Not every phone has one, or lets it be opened: each is tried in turn, and Para's own page is
     * the answer when none opens. Samsung's step is in Para's own page (Battery), so it has none.
     */
    private static final Map<String, String[][]> AUTOSTART_SCREENS = new LinkedHashMap<>();
    static {
        AUTOSTART_SCREENS.put("xiaomi", new String[][] {
            {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
        });
        AUTOSTART_SCREENS.put("oppo", new String[][] {
            {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
            {"com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"},
            {"com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"},
            {"com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"},
        });
        AUTOSTART_SCREENS.put("vivo", new String[][] {
            {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"},
            {"com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"},
        });
        AUTOSTART_SCREENS.put("transsion", new String[][] {
            {"com.transsion.phonemaster", "com.cyin.himgr.autostart.AutoStartActivity"},
        });
        AUTOSTART_SCREENS.put("huawei", new String[][] {
            {"com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
            {"com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"},
            {"com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
        });
        AUTOSTART_SCREENS.put("samsung", new String[0][]);
    }

    /**
     * The maker's Autostart screen for Para, the screens of the group the page names ("brand")
     * first; Para's own page if the phone has none. A brand with none of its own (Samsung) goes
     * straight to Para's page; no brand tries every maker's.
     */
    @PluginMethod
    public void openAutostartSettings(PluginCall call) {
        String brand = call.getString("brand", "");
        List<String[]> screens = new ArrayList<>();
        if (AUTOSTART_SCREENS.containsKey(brand)) {
            screens.addAll(Arrays.asList(AUTOSTART_SCREENS.get(brand)));
        } else {
            for (String[][] group : AUTOSTART_SCREENS.values()) screens.addAll(Arrays.asList(group));
        }
        for (String[] screen : screens) {
            Intent intent = new Intent()
                .setClassName(screen[0], screen[1])
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(intent);
                call.resolve();
                return;
            } catch (android.content.ActivityNotFoundException | SecurityException none) {
                // Not on this phone, or not one an app may open: the next one, then Para's page.
            }
        }
        openAppSettings(call);
    }

    /** Para's page in the phone's Settings, where Permissions and Battery are one tap away. */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.fromParts("package", getContext().getPackageName(), null))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
