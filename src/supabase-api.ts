'use client'

import { supabaseApiKey, supabaseUrl } from './supabase-info'

export type AppUserView = {
  id: string
  email: string
  name: string
  username: string
  focusMinutes: number
  streak: number
}

export type WalletView = {
  balance: number
  ownedPlantIds: string[]
  dailyRewardClaimed: boolean
}

export type GoalSettingsView = {
  dailyMinutes: number
  monthlyHours: number
}

export type NotificationSettingsView = {
  focusRewards: boolean
  dailyRewards: boolean
  shopUpdates: boolean
}

export type AppNotificationView = {
  id: string
  category: 'focus' | 'daily' | 'shop' | 'system'
  title: string
  message: string
  createdAt: string
  read: boolean
}

export type FocusProgressView = {
  dailyMinutes: number
  monthlyMinutes: number
  weeklyMinutes: number
  dailyHistory: { date: string; minutes: number }[]
}

export type StudyTaskView = {
  id: string
  name: string
  durationMinutes: number
}

export type FocusAppView = {
  id: string
  identifier: string
  name: string
  platform: 'android' | 'ios'
  group: 'red' | 'yellow' | 'green'
}

export type RankingEntry = {
  id: string
  name: string
  username: string
  focusMinutes: number
  streak: number
  rank: number
  tier: string
  nextTier: string | null
  minutesToNext: number
  progress: number
}

export type RankingView = {
  top: RankingEntry[]
  current: RankingEntry | null
  tiers: { name: string; minMinutes: number }[]
}

type Session = {
  access_token: string
  refresh_token: string
  expires_at?: number
}

const endpoint = `${supabaseUrl}/functions/v1/make-server-23149b0b`
const sessionKey = 'focust-supabase-session'

const readSession = (): Session | null => {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(window.localStorage.getItem(sessionKey) ?? 'null') as Session | null
  } catch {
    return null
  }
}

const saveSession = (session: Session | null) => {
  if (session) window.localStorage.setItem(sessionKey, JSON.stringify(session))
  else window.localStorage.removeItem(sessionKey)
}

async function request<T>(path: string, init?: RequestInit, authenticated = true): Promise<T> {
  const session = readSession()
  if (!supabaseApiKey) {
    throw new Error('Thiếu cấu hình NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY trong file .env.')
  }
  const response = await fetch(`${endpoint}/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${
        authenticated && session?.access_token ? session.access_token : supabaseApiKey
      }`,
      ...init?.headers,
    },
  })
  const body = await response.text()
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    if (!response.ok) {
      throw new Error(
        body
          ? `${body} (HTTP ${response.status})`
          : `Supabase trả về lỗi HTTP ${response.status}.`,
      )
    }
    throw new Error(`Supabase trả về phản hồi không hợp lệ (HTTP ${response.status}).`)
  }
  if (!response.ok) {
    const errorMessage =
      typeof payload === 'object' && payload !== null && 'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : typeof payload === 'object' && payload !== null && 'message' in payload &&
            typeof payload.message === 'string'
          ? payload.message
          : `Supabase trả về lỗi HTTP ${response.status}.`
    throw new Error(errorMessage)
  }
  return payload as T
}

export const hasSupabaseSession = () => Boolean(readSession()?.access_token)

export async function signupAppUser(input: {
  email: string
  name: string
  password: string
  username: string
}) {
  try {
    const result = await request<{ user: AppUserView; session: Session }>(
      'auth/signup',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      false,
    )
    saveSession(result.session)
    return { success: true as const, data: result.user }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Không thể tạo tài khoản.',
    }
  }
}

export async function loginAppUser(input: { password: string; username: string }) {
  try {
    const result = await request<{ user: AppUserView; session: Session }>(
      'auth/login',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      false,
    )
    saveSession(result.session)
    return { success: true as const, data: result.user }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Không thể đăng nhập.',
    }
  }
}

export const logoutAppUser = async () => {
  saveSession(null)
  return { success: true as const }
}

export async function requestPasswordReset(email: string) {
  try {
    await request('auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }, false)
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Không thể gửi email.',
    }
  }
}

export const getBootstrap = () =>
  request<{
    user: AppUserView
    tasks: StudyTaskView[]
    apps: FocusAppView[]
    ranking: RankingView
    wallet: WalletView
    goals: GoalSettingsView
    notificationSettings: NotificationSettingsView
    notifications: AppNotificationView[]
    focusProgress: FocusProgressView
    favoritePlantIds: string[]
  }>('bootstrap')

export const getNotifications = async () => {
  const result = await request<{ notifications: AppNotificationView[] }>('notifications')
  return result.notifications
}

export async function updateFavoritePlants(plantIds: string[]) {
  try {
    const result = await request<{ favoritePlantIds: string[] }>('garden/favorites', {
      method: 'PUT',
      body: JSON.stringify({ plantIds }),
    })
    return { success: true as const, data: result.favoritePlantIds }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Chưa thể cập nhật cây yêu thích.',
    }
  }
}

export async function updateAccountProfile(input: { name: string; username: string }) {
  try {
    const result = await request<{ user: AppUserView }>('account/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    return { success: true as const, data: result.user }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Chưa thể cập nhật hồ sơ.',
    }
  }
}

export async function updateGoalSettings(input: GoalSettingsView) {
  try {
    const result = await request<{ goals: GoalSettingsView }>('account/goals', {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    return { success: true as const, data: result.goals }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Chưa thể lưu mục tiêu.',
    }
  }
}

export async function updateNotificationSettings(input: NotificationSettingsView) {
  try {
    const result = await request<{ settings: NotificationSettingsView }>(
      'account/notification-settings',
      { method: 'PUT', body: JSON.stringify(input) },
    )
    return { success: true as const, data: result.settings }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Chưa thể lưu cài đặt thông báo.',
    }
  }
}

export async function markNotificationRead(id: string) {
  const result = await request<{ notifications: AppNotificationView[] }>(
    `notifications/${encodeURIComponent(id)}/read`,
    { method: 'PUT' },
  )
  return result.notifications
}

export async function markAllNotificationsRead() {
  const result = await request<{ notifications: AppNotificationView[] }>(
    'notifications/read-all',
    { method: 'POST' },
  )
  return result.notifications
}

export async function purchasePlant(plantId: string) {
  try {
    const result = await request<{ wallet: WalletView; plant: { id: string; name: string; price: number } }>(
      'shop/purchase',
      { method: 'POST', body: JSON.stringify({ plantId }) },
    )
    return { success: true as const, data: result }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Chưa thể mua cây.',
    }
  }
}

export async function claimDailyReward() {
  try {
    const result = await request<{ wallet: WalletView; reward: number }>(
      'rewards/daily',
      { method: 'POST' },
    )
    return { success: true as const, data: result }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Chưa thể nhận quà hằng ngày.',
    }
  }
}

export async function createStudyTask(input: { name: string; durationMinutes: number }) {
  try {
    const result = await request<{ task: StudyTaskView }>('tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return { success: true as const, data: result.task }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Chưa thể lưu môn học.',
    }
  }
}

export async function updateStudyTask(input: {
  id: string
  name: string
  durationMinutes: number
}) {
  try {
    const result = await request<{ task: StudyTaskView }>(`tasks/${encodeURIComponent(input.id)}`, {
      method: 'PUT',
      body: JSON.stringify({ name: input.name, durationMinutes: input.durationMinutes }),
    })
    return { success: true as const, data: result.task }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Chưa thể cập nhật môn học.',
    }
  }
}

export async function updateFocusAppGroup(input: { id: string; group: FocusAppView['group'] }) {
  try {
    const result = await request<{ app: FocusAppView }>(
      `apps/${encodeURIComponent(input.id)}/group`,
      {
        method: 'PUT',
        body: JSON.stringify({ group: input.group }),
      },
    )
    return { success: true as const, data: result.app }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Chưa thể chuyển nhóm ứng dụng.',
    }
  }
}

export async function syncDetectedApps(
  apps: { identifier: string; name: string; platform: 'android' | 'ios' }[],
) {
  const result = await request<{ apps: FocusAppView[] }>('apps/detected', {
    method: 'POST',
    body: JSON.stringify({ apps }),
  })
  return result.apps
}

export const recordFocusSession = (input: {
  minutes: number
  taskId: string
  plantId: string | null
}) =>
  request<{
    profile: AppUserView
    ranking: RankingView
    wallet: WalletView
    coinsAdded: number
    focusProgress: FocusProgressView
  }>(
    'focus-sessions',
    {
    method: 'POST',
    body: JSON.stringify(input),
    },
  )
