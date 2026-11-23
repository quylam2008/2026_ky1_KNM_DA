package vn.focust.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class FocusAppMonitorService extends Service {
    public static final String ACTION_START = "vn.focust.app.START_APP_MONITOR";
    public static final String ACTION_STOP = "vn.focust.app.STOP_APP_MONITOR";
    public static final String EXTRA_APPS = "apps";
    public static final String EXTRA_DURATION_SECONDS = "durationSeconds";

    private static final String SERVICE_CHANNEL_ID = "focust_focus_monitor";
    private static final String ALERT_CHANNEL_ID = "focust_app_alerts";
    private static final int SERVICE_NOTIFICATION_ID = 4310;
    private static final long POLL_INTERVAL_MS = 1000;
    private static final long ALERT_COOLDOWN_MS = 15000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, TrackedApp> trackedApps = new HashMap<>();
    private final Map<String, Long> lastAlerts = new HashMap<>();
    private UsageStatsManager usageStatsManager;
    private long lastQueryTime;
    private long expiresAt;

    private final Runnable poller = new Runnable() {
        @Override
        public void run() {
            long now = System.currentTimeMillis();
            if (now >= expiresAt) {
                stopSelf();
                return;
            }
            inspectUsageEvents(now);
            handler.postDelayed(this, POLL_INTERVAL_MS);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!ACTION_START.equals(intent.getAction())) return START_NOT_STICKY;

        try {
            parseTrackedApps(intent.getStringExtra(EXTRA_APPS));
        } catch (JSONException error) {
            stopSelf();
            return START_NOT_STICKY;
        }

        int durationSeconds = intent.getIntExtra(EXTRA_DURATION_SECONDS, 0);
        if (trackedApps.isEmpty() || durationSeconds <= 0) {
            stopSelf();
            return START_NOT_STICKY;
        }

        expiresAt = System.currentTimeMillis() + durationSeconds * 1000L;
        lastQueryTime = System.currentTimeMillis();
        startAsForeground();
        handler.removeCallbacks(poller);
        handler.post(poller);
        return START_NOT_STICKY;
    }

    private void parseTrackedApps(String json) throws JSONException {
        trackedApps.clear();
        if (json == null) return;
        JSONArray apps = new JSONArray(json);
        for (int i = 0; i < apps.length(); i++) {
            JSONObject item = apps.getJSONObject(i);
            String identifier = item.optString("identifier");
            String group = item.optString("group");
            if (identifier.isEmpty() || (!"red".equals(group) && !"yellow".equals(group))) continue;
            trackedApps.put(identifier, new TrackedApp(item.optString("name", identifier), group));
        }
    }

    private void startAsForeground() {
        Notification notification = buildNotification(
            "Focust đang theo dõi ứng dụng",
            "Chỉ hoạt động trong phiên tập trung này.",
            SERVICE_CHANNEL_ID,
            true
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                SERVICE_NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            );
        } else {
            startForeground(SERVICE_NOTIFICATION_ID, notification);
        }
    }

    private void inspectUsageEvents(long now) {
        if (usageStatsManager == null || now <= lastQueryTime) return;
        UsageEvents events = usageStatsManager.queryEvents(lastQueryTime, now);
        if (events == null) {
            lastQueryTime = now;
            return;
        }

        UsageEvents.Event event = new UsageEvents.Event();
        while (events.hasNextEvent()) {
            events.getNextEvent(event);
            int eventType = event.getEventType();
            boolean foregroundEvent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? eventType == UsageEvents.Event.ACTIVITY_RESUMED
                : eventType == UsageEvents.Event.MOVE_TO_FOREGROUND;
            if (!foregroundEvent) continue;

            TrackedApp app = trackedApps.get(event.getPackageName());
            if (app != null) postAppAlert(event.getPackageName(), app, now);
        }
        lastQueryTime = now;
    }

    private void postAppAlert(String packageName, TrackedApp app, long now) {
        Long lastAlert = lastAlerts.get(packageName);
        if (lastAlert != null && now - lastAlert < ALERT_COOLDOWN_MS) return;
        lastAlerts.put(packageName, now);

        String title = "red".equals(app.group)
            ? "Ứng dụng ngoài vùng tập trung"
            : "Nhắc bạn quay lại tập trung";
        String body = "red".equals(app.group)
            ? app.name + " thuộc vùng Đỏ bạn đã chọn."
            : app.name + " thuộc vùng Vàng bạn đã chọn.";
        int notificationId = 5000 + (packageName.hashCode() & 0x3fff);
        ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE))
            .notify(notificationId, buildNotification(title, body, ALERT_CHANNEL_ID, false));
    }

    private Notification buildNotification(
        String title,
        String body,
        String channelId,
        boolean ongoing
    ) {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = launchIntent == null ? null : PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, channelId)
            : new Notification.Builder(this);
        builder
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setOnlyAlertOnce(true)
            .setOngoing(ongoing)
            .setAutoCancel(!ongoing);
        if (pendingIntent != null) builder.setContentIntent(pendingIntent);
        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel serviceChannel = new NotificationChannel(
            SERVICE_CHANNEL_ID,
            "Theo dõi phiên tập trung",
            NotificationManager.IMPORTANCE_LOW
        );
        serviceChannel.setDescription("Trạng thái theo dõi ứng dụng trong phiên tập trung.");
        NotificationChannel alertChannel = new NotificationChannel(
            ALERT_CHANNEL_ID,
            "Nhắc nhở ứng dụng",
            NotificationManager.IMPORTANCE_HIGH
        );
        alertChannel.setDescription("Cảnh báo khi mở ứng dụng trong vùng Đỏ hoặc Vàng.");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(serviceChannel);
            manager.createNotificationChannel(alertChannel);
        }
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(poller);
        trackedApps.clear();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static final class TrackedApp {
        final String name;
        final String group;

        TrackedApp(String name, String group) {
            this.name = name;
            this.group = group;
        }
    }
}
