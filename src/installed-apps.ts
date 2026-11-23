'use client'

import { Capacitor, registerPlugin } from '@capacitor/core'

export type DetectedApp = {
  identifier: string
  name: string
  platform: 'android' | 'ios'
}

type TrackedApp = {
  identifier: string
  name: string
  group: 'red' | 'yellow'
}

type NativeDetector = {
  getInstalledApps: () => Promise<{ apps: DetectedApp[] }>
  getMonitoringPermissions?: () => Promise<{
    usageAccess: boolean
    notificationsEnabled: boolean
  }>
  openUsageAccessSettings?: () => Promise<void>
  openNotificationSettings?: () => Promise<void>
  startFocusAppMonitoring?: (options: {
    apps: TrackedApp[]
    durationSeconds: number
  }) => Promise<{ started: boolean; message?: string }>
  stopFocusAppMonitoring?: () => Promise<void>
}

declare global {
  interface Window {
    FocustNative?: NativeDetector
    Capacitor?: {
      Plugins?: {
        InstalledApps?: NativeDetector
      }
      getPlatform?: () => string
    }
  }
}

const getNativeDetector = () => {
  if (!Capacitor.isNativePlatform()) return undefined
  return registerPlugin<NativeDetector>('InstalledApps')
}

export async function detectInstalledApps(): Promise<
  | { supported: true; apps: DetectedApp[]; note?: string }
  | { supported: false; apps: []; note: string }
> {
  const detector =
    window.FocustNative ?? getNativeDetector() ?? window.Capacitor?.Plugins?.InstalledApps
  if (!detector) {
    return {
      supported: false,
      apps: [],
      note: 'Tính năng quét chỉ hoạt động trong bản Focust native. Trình duyệt không được phép đọc danh sách ứng dụng trên điện thoại.',
    }
  }

  const result = await detector.getInstalledApps()
  const platform = Capacitor.getPlatform()
  return {
    supported: true,
    apps: result.apps,
    note:
      platform === 'ios'
        ? 'iOS chỉ trả về các ứng dụng thuộc danh mục URL scheme được khai báo trước.'
        : undefined,
  }
}

export async function getAppMonitoringPermissions() {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') {
    return {
      supported: true,
      platform,
      usageAccess: false,
      notificationsEnabled: false,
      note: 'iOS cần automation riêng trong Phím tắt cho từng ứng dụng.',
    }
  }
  if (platform !== 'android' || !Capacitor.isNativePlatform()) {
    return {
      supported: false,
      platform,
      usageAccess: false,
      notificationsEnabled: false,
      note: 'Theo dõi ứng dụng chỉ hoạt động trong bản Android native.',
    }
  }

  const detector = getNativeDetector()
  if (!detector?.getMonitoringPermissions) {
    throw new Error('Bản Android cần được cập nhật để theo dõi ứng dụng.')
  }
  return {
    supported: true,
    platform,
    ...(await detector.getMonitoringPermissions()),
  }
}

export async function openUsageAccessSettings() {
  const detector = getNativeDetector()
  if (!detector?.openUsageAccessSettings) {
    throw new Error('Bản Android cần được cập nhật để mở quyền Usage access.')
  }
  await detector.openUsageAccessSettings()
}

export async function openAppNotificationSettings() {
  const detector = getNativeDetector()
  if (!detector?.openNotificationSettings) {
    throw new Error('Bản Android cần được cập nhật để mở cài đặt thông báo.')
  }
  await detector.openNotificationSettings()
}

export async function startFocusAppMonitoring(
  apps: { identifier: string; name: string; group: 'red' | 'yellow' | 'green' }[],
  durationSeconds: number,
) {
  const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'
  if (platform === 'ios') {
    return {
      started: false,
      message: 'iOS dùng automation Phím tắt riêng cho từng ứng dụng.',
    }
  }
  if (platform !== 'android' || !Capacitor.isNativePlatform()) {
    return { started: false, message: 'Theo dõi tự động chỉ hoạt động trên Android native.' }
  }

  const detector = getNativeDetector()
  if (!detector?.startFocusAppMonitoring) {
    throw new Error('Hãy cập nhật bản Android để bật theo dõi ứng dụng.')
  }
  const trackedApps = apps
    .filter((app): app is typeof app & { group: 'red' | 'yellow' } => app.group !== 'green')
    .map(({ identifier, name, group }) => ({ identifier, name, group }))
  return detector.startFocusAppMonitoring({ apps: trackedApps, durationSeconds })
}

export async function stopFocusAppMonitoring() {
  if (Capacitor.getPlatform() !== 'android' || !Capacitor.isNativePlatform()) return
  const detector = getNativeDetector()
  if (!detector?.stopFocusAppMonitoring) {
    throw new Error('Hãy cập nhật bản Android để dừng theo dõi ứng dụng.')
  }
  await detector.stopFocusAppMonitoring()
}
