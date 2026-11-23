package vn.focust.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

@CapacitorPlugin(name = "InstalledApps")
public class InstalledAppsPlugin extends Plugin {
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
}
