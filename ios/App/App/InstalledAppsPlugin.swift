import Capacitor
import UIKit

@objc(InstalledAppsPlugin)
public class InstalledAppsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InstalledAppsPlugin"
    public let jsName = "InstalledApps"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getInstalledApps", returnType: CAPPluginReturnPromise)
    ]

    private let catalog: [(scheme: String, name: String)] = [
        ("youtube", "YouTube"),
        ("instagram", "Instagram"),
        ("tiktok", "TikTok"),
        ("googlechrome", "Chrome"),
        ("googledrive", "Google Drive"),
        ("notion", "Notion"),
        ("spotify", "Spotify"),
        ("fb", "Facebook"),
        ("twitter", "X"),
        ("zalo", "Zalo"),
        ("msteams", "Microsoft Teams"),
        ("zoomus", "Zoom")
    ]

    @objc func getInstalledApps(_ call: CAPPluginCall) {
        let apps = catalog.compactMap { item -> [String: String]? in
            guard
                let url = URL(string: "\(item.scheme)://"),
                UIApplication.shared.canOpenURL(url)
            else { return nil }
            return [
                "identifier": item.scheme,
                "name": item.name,
                "platform": "ios"
            ]
        }
        call.resolve(["apps": apps])
    }
}
