'use client'

import { Capacitor, registerPlugin } from '@capacitor/core'

export type DetectedApp = {
  identifier: string
  name: string
  platform: 'android' | 'ios'
}

type NativeDetector = {
  getInstalledApps: () => Promise<{ apps: DetectedApp[] }>
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

export async function detectInstalledApps(): Promise<
  | { supported: true; apps: DetectedApp[]; note?: string }
  | { supported: false; apps: []; note: string }
> {
  const nativePlugin = Capacitor.isNativePlatform()
    ? registerPlugin<NativeDetector>('InstalledApps')
    : undefined
  const detector = window.FocustNative ?? nativePlugin ?? window.Capacitor?.Plugins?.InstalledApps
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
