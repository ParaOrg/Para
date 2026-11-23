package ph.para.contributor;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import ph.para.contributor.ride.RideMachine;

/**
 * The phone restarted, or the app was updated, mid-ride (BOOT_COMPLETED, MY_PACKAGE_REPLACED). Both
 * end the app's process and nothing records the ride after them. The ride is not recorded again by
 * itself (the owner's Q94): RideMachine.phoneRestarted marks it cut off, and the card says "Your ride
 * stopped when the phone restarted. Open Para to carry on or save it." A paused or finished ride gets
 * its card back.
 */
public class RideRestartReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }
        long now = System.currentTimeMillis();
        Rides.apply(context, ride -> RideMachine.phoneRestarted(ride, now));
    }
}
