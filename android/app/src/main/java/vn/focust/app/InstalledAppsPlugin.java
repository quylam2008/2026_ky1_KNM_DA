package vn.focust.app;

import android.content.Intent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.app.AppOpsManager;
import android.app.NotificationManager;
import android.net.Uri;
import android.os.Process;
import android.provider.Settings;
import android.os.Build;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "InstalledApps")
public class InstalledAppsPlugin extends Plugin {
    private BroadcastReceiver usbReceiver;

    @Override
    public void load() {
        super.load();
        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        usbReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                notifyListeners("usbDevicesChanged", createUsbDevicesResult());
            }
        };
        ContextCompat.registerReceiver(
            getContext(),
            usbReceiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED
        );
    }

    @Override
    protected void handleOnDestroy() {
        if (usbReceiver != null) {
            getContext().unregisterReceiver(usbReceiver);
            usbReceiver = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        PackageManager packageManager = getContext().getPackageManager();
        Intent launcherIntent = new Intent(Intent.ACTION_MAIN, null);
        launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);

        List<ResolveInfo> launchableApps;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            launchableApps = packageManager.queryIntentActivities(
                launcherIntent,
                PackageManager.ResolveInfoFlags.of(0)
            );
        } else {
            launchableApps = packageManager.queryIntentActivities(launcherIntent, 0);
        }

        JSArray apps = new JSArray();
        for (ResolveInfo info : launchableApps) {
            String identifier = info.activityInfo.packageName;
            if (identifier.equals(getContext().getPackageName())) continue;
            JSObject app = new JSObject();
            app.put("identifier", identifier);
            app.put("name", info.loadLabel(packageManager).toString());
            app.put("platform", "android");
            apps.put(app);
        }

        JSObject result = new JSObject();
        result.put("apps", apps);
        call.resolve(result);
    }

    @PluginMethod
    public void getUsbDevices(PluginCall call) {
        call.resolve(createUsbDevicesResult());
    }

    private JSObject createUsbDevicesResult() {
        PackageManager packageManager = getContext().getPackageManager();
        boolean usbHostSupported = packageManager.hasSystemFeature(PackageManager.FEATURE_USB_HOST);
        UsbManager usbManager = (UsbManager) getContext().getSystemService(getContext().USB_SERVICE);
        JSArray devices = new JSArray();

        if (usbManager != null) {
            for (Map.Entry<String, UsbDevice> entry : usbManager.getDeviceList().entrySet()) {
                UsbDevice device = entry.getValue();
                JSObject item = new JSObject();
                item.put("deviceName", entry.getKey());
                item.put("manufacturerName", safeUsbName(device.getManufacturerName()));
                item.put("productName", safeUsbName(device.getProductName()));
                item.put("vendorId", device.getVendorId());
                item.put("productId", device.getProductId());
                item.put("deviceClass", device.getDeviceClass());
                item.put("interfaceCount", device.getInterfaceCount());
                item.put("permissionGranted", usbManager.hasPermission(device));
                devices.put(item);
            }
        }

        JSObject result = new JSObject();
        result.put("usbHostSupported", usbHostSupported);
        result.put("devices", devices);
        return result;
    }

    @PluginMethod
    public void getMonitoringPermissions(PluginCall call) {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(getContext().APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            getContext().getPackageName()
        );
        NotificationManager notifications =
            (NotificationManager) getContext().getSystemService(getContext().NOTIFICATION_SERVICE);
        JSObject result = new JSObject();
        result.put("usageAccess", mode == AppOpsManager.MODE_ALLOWED);
        result.put("notificationsEnabled", notifications.areNotificationsEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void openUsageAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            intent = new Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName())
            );
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void startFocusAppMonitoring(PluginCall call) {
        JSArray apps = call.getArray("apps");
        int durationSeconds = call.getInt("durationSeconds", 0);
        if (apps == null || apps.length() == 0) {
            resolveMonitorStart(call, false, "Thêm ứng dụng vào vùng Đỏ hoặc Vàng để bật nhắc nhở.");
            return;
        }
        if (durationSeconds <= 0) {
            call.reject("Thời lượng phiên tập trung không hợp lệ.");
            return;
        }

        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(getContext().APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            getContext().getPackageName()
        );
        if (mode != AppOpsManager.MODE_ALLOWED) {
            resolveMonitorStart(call, false, "Hãy bật quyền Usage access trong mục Vùng tập trung.");
            return;
        }

        NotificationManager notifications =
            (NotificationManager) getContext().getSystemService(getContext().NOTIFICATION_SERVICE);
        if (!notifications.areNotificationsEnabled()) {
            resolveMonitorStart(call, false, "Hãy bật quyền thông báo cho Focust trong cài đặt Android.");
            return;
        }

        Intent intent = new Intent(getContext(), FocusAppMonitorService.class);
        intent.setAction(FocusAppMonitorService.ACTION_START);
        intent.putExtra(FocusAppMonitorService.EXTRA_APPS, apps.toString());
        intent.putExtra(FocusAppMonitorService.EXTRA_DURATION_SECONDS, Math.min(durationSeconds, 24 * 60 * 60));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        resolveMonitorStart(call, true, null);
    }

    @PluginMethod
    public void stopFocusAppMonitoring(PluginCall call) {
        Intent intent = new Intent(getContext(), FocusAppMonitorService.class);
        intent.setAction(FocusAppMonitorService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void consumeRedAppResetRequest(PluginCall call) {
        android.content.SharedPreferences preferences = getContext().getSharedPreferences(
            FocusAppMonitorService.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        );
        String appName = preferences.getString(FocusAppMonitorService.PENDING_RED_APP_RESET_KEY, "");
        preferences.edit().remove(FocusAppMonitorService.PENDING_RED_APP_RESET_KEY).apply();
        JSObject result = new JSObject();
        result.put("appName", appName == null ? "" : appName);
        call.resolve(result);
    }

    private void resolveMonitorStart(PluginCall call, boolean started, String message) {
        JSObject result = new JSObject();
        result.put("started", started);
        if (message != null) result.put("message", message);
        call.resolve(result);
    }

    private String safeUsbName(String name) {
        return name == null ? "" : name;
    }
}
