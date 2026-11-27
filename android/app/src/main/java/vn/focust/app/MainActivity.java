package vn.focust.app;

import android.os.Bundle;
import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(InstalledAppsPlugin.class);
        super.onCreate(savedInstanceState);
        handleRedAppNotificationIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleRedAppNotificationIntent(intent);
    }

    private void handleRedAppNotificationIntent(Intent intent) {
        if (intent == null || !FocusAppMonitorService.ACTION_LEAVE_RED_APP.equals(intent.getAction())) return;
        Intent serviceIntent = new Intent(this, FocusAppMonitorService.class)
            .setAction(FocusAppMonitorService.ACTION_LEAVE_RED_APP)
            .putExtra(
                FocusAppMonitorService.EXTRA_ALERT_NOTIFICATION_ID,
                intent.getIntExtra(FocusAppMonitorService.EXTRA_ALERT_NOTIFICATION_ID, 0)
            );
        startService(serviceIntent);
        intent.setAction(null);
    }
}
