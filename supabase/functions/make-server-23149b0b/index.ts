import { createClient } from 'jsr:@supabase/supabase-js@2.49.8'
import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import * as kv from './kv_store.ts'

type Group = 'red' | 'yellow' | 'green'
type Profile = {
  id: string
  email: string
  name: string
  username: string
  focusMinutes: number
  streak: number
  isVip?: boolean
  lastFocusDay?: string
}
type StudyTask = { id: string; name: string; durationMinutes: number }
type FocusApp = {
  id: string
  identifier: string
  name: string
  platform: 'android' | 'ios'
  group: Group
}
type Wallet = { balance: number; ownedPlantIds: string[]; dailyRewardClaimed: boolean }
type DemoAccountData = {
  user: Omit<Profile, 'email'>
  tasks: StudyTask[]
  apps: FocusApp[]
  wallet: Wallet
  goals: GoalSettings
  notificationSettings: NotificationSettings
  notifications: AppNotification[]
  focusProgress: FocusProgress
  favoritePlantIds: string[]
}

const app = new Hono()
const prefix = '/make-server-23149b0b'
const starterTasks = [
  { id: 'task-advanced-math', name: 'Toán cao cấp', durationMinutes: 45 },
  { id: 'task-english', name: 'Tiếng Anh', durationMinutes: 30 },
  { id: 'task-web', name: 'Lập trình Web', durationMinutes: 60 },
]
const tiers = [
  { name: 'Cố nông', minMinutes: 0 },
  { name: 'Bần nông', minMinutes: 300 },
  { name: 'Trung nông', minMinutes: 900 },
  { name: 'Phú nông', minMinutes: 1800 },
  { name: 'Địa chủ', minMinutes: 3600 },
  { name: 'Quý tộc', minMinutes: 7200 },
  { name: 'Hoàng tộc', minMinutes: 12000 },
  { name: 'Vua chúa', minMinutes: 20000 },
] as const

const shopPlants = [
  { id: 'morning_sprout', name: 'Mầm ban mai', price: 250 },
  { id: 'green_pine', name: 'Tùng xanh', price: 480 },
  { id: 'silver_leaf', name: 'Lá bạc', price: 700 },
] as const
const vipPlantIds = ['night_sakura', 'golden_ancient', 'aurora_forest'] as const
const hasVipPlantAccess = (isVip: boolean | undefined, plantId: string) =>
  isVip === true && vipPlantIds.some((vipPlantId) => vipPlantId === plantId)
type GoalSettings = { dailyMinutes: number; monthlyHours: number }
type NotificationSettings = { focusRewards: boolean; dailyRewards: boolean; shopUpdates: boolean }
type AppNotification = {
  id: string
  category: 'focus' | 'daily' | 'shop' | 'system'
  title: string
  message: string
  createdAt: string
  read: boolean
}
type DailyFocusSummary = { date: string; minutes: number }
type FocusProgress = {
  dailyMinutes: number
  monthlyMinutes: number
  weeklyMinutes: number
  dailyHistory: DailyFocusSummary[]
}

const getTodayDateKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

const shiftDateKey = (dateKey: string, offset: number) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10)
}

const getPreviousDateKey = (dateKey: string) => shiftDateKey(dateKey, -1)

const defaultGoals: GoalSettings = { dailyMinutes: 180, monthlyHours: 60 }
const defaultNotificationSettings: NotificationSettings = {
  focusRewards: true,
  dailyRewards: true,
  shopUpdates: true,
}

const parseUserIdList = (value: string | undefined) =>
  [...new Set((value ?? '').split(',').map((id) => id.trim()).filter(Boolean))]

const getDemoTargetIds = () => {
  const configuredIds = Deno.env.get('DEMO_USER_IDS')
  return parseUserIdList(configuredIds ?? Deno.env.get('DEMO_USER_ID'))
}

const getDemoAdminIds = () => {
  const configuredIds = Deno.env.get('DEMO_ADMIN_USER_IDS')
  return parseUserIdList(configuredIds ?? Deno.env.get('DEMO_USER_ID'))
}

const isDemoAdmin = (userId: string) => getDemoAdminIds().includes(userId)

const getGoals = async (userId: string): Promise<GoalSettings> =>
  ((await kv.get(`goals:${userId}`)) as GoalSettings | undefined) ?? defaultGoals

const getNotificationSettings = async (userId: string): Promise<NotificationSettings> =>
  ((await kv.get(`notification-settings:${userId}`)) as NotificationSettings | undefined) ??
  defaultNotificationSettings

const getNotifications = async (userId: string): Promise<AppNotification[]> =>
  ((await kv.get(`notifications:${userId}`)) as AppNotification[] | undefined) ?? []

const getFavoritePlantIds = async (userId: string): Promise<string[]> => {
  const saved = await kv.get(`favorite-plants:${userId}`)
  return Array.isArray(saved)
    ? saved.filter((plantId): plantId is string => typeof plantId === 'string')
    : []
}

const addNotification = async (
  userId: string,
  category: AppNotification['category'],
  title: string,
  message: string,
) => {
  const settings = await getNotificationSettings(userId)
  const enabled =
    category === 'focus'
      ? settings.focusRewards
      : category === 'daily'
        ? settings.dailyRewards
        : category === 'shop'
          ? settings.shopUpdates
          : true
  if (!enabled) return
  const previous = await getNotifications(userId)
  const notification: AppNotification = {
    id: crypto.randomUUID(),
    category,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  }
  await kv.set(`notifications:${userId}`, [notification, ...previous].slice(0, 50))
}

const getFocusHistory = async (userId: string): Promise<DailyFocusSummary[]> => {
  const saved = await kv.get(`focus-history:${userId}`)
  if (!Array.isArray(saved)) return []
  return saved.filter(
    (entry): entry is DailyFocusSummary =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof entry.date === 'string' &&
      typeof entry.minutes === 'number' &&
      Number.isFinite(entry.minutes),
  )
}

const getFocusProgress = async (userId: string): Promise<FocusProgress> => {
  const today = getTodayDateKey()
  const month = today.slice(0, 7)
  const [saved, history] = await Promise.all([
    kv.get(`focus-progress:${userId}`) as Promise<
      { day: string; month: string; dailyMinutes: number; monthlyMinutes: number } | undefined
    >,
    getFocusHistory(userId),
  ])
  const minutesByDate = new Map(history.map((entry) => [entry.date, entry.minutes]))
  const dailyHistory = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(today, index - 6)
    return { date, minutes: minutesByDate.get(date) ?? 0 }
  })
  return {
    dailyMinutes: saved?.day === today ? saved.dailyMinutes : 0,
    monthlyMinutes: saved?.month === month ? saved.monthlyMinutes : 0,
    weeklyMinutes: dailyHistory.reduce((total, entry) => total + entry.minutes, 0),
    dailyHistory,
  }
}

app.use('*', logger(console.log))
app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  }),
)

const adminClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const publicClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)

const normalizeUsername = (value: unknown) => {
  if (typeof value !== 'string') return null
  const username = value.trim().toLowerCase()
  return /^[a-z0-9._-]{3,24}$/.test(username) ? username : null
}

const getWallet = async (userId: string): Promise<Wallet> => {
  const client = adminClient()
  const { error: insertError } = await client
    .from('focust_wallets')
    .upsert({ user_id: userId, balance: 1280 }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (insertError) throw insertError

  const claimDate = getTodayDateKey()
  const [
    { data: wallet, error: walletError },
    { data: plants, error: plantsError },
    { data: claim, error: claimError },
  ] =
    await Promise.all([
      client.from('focust_wallets').select('balance').eq('user_id', userId).single(),
      client.from('focust_user_plants').select('plant_id').eq('user_id', userId),
      client
        .from('focust_daily_claims')
        .select('claim_date')
        .eq('user_id', userId)
        .eq('claim_date', claimDate)
        .maybeSingle(),
    ])
  if (walletError) throw walletError
  if (plantsError) throw plantsError
  if (claimError) throw claimError
  return {
    balance: wallet.balance as number,
    ownedPlantIds: (plants ?? []).map((plant) => plant.plant_id as string),
    dailyRewardClaimed: Boolean(claim),
  }
}

const canUsePlant = async (userId: string, plantId: string) => {
  const wallet = await getWallet(userId)
  if (wallet.ownedPlantIds.includes(plantId)) return true
  const profile = (await kv.get(`profile:${userId}`)) as Profile | undefined
  return hasVipPlantAccess(profile?.isVip, plantId)
}

const currentUser = async (c: any) => {
  const authorization = c.req.header('Authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await publicClient().auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

const requireUser = async (c: any) => {
  const user = await currentUser(c)
  if (!user) return { response: c.json({ error: 'Phiên đăng nhập đã hết hạn.' }, 401) }
  const profile = (await kv.get(`profile:${user.id}`)) as Profile | undefined
  if (!profile) return { response: c.json({ error: 'Không tìm thấy hồ sơ.' }, 404) }
  return { user, profile }
}

const getDemoAccountData = async (userId: string): Promise<DemoAccountData | null> => {
  const profile = (await kv.get(`profile:${userId}`)) as Profile | undefined
  if (!profile) return null
  const [tasks, apps, wallet, goals, notificationSettings, notifications, focusProgress, favoritePlantIds] =
    await Promise.all([
      kv.get(`tasks:${userId}`),
      kv.get(`apps:${userId}`),
      getWallet(userId),
      getGoals(userId),
      getNotificationSettings(userId),
      getNotifications(userId),
      getFocusProgress(userId),
      getFavoritePlantIds(userId),
    ])
  return {
      user: {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        focusMinutes: profile.focusMinutes,
        streak: profile.streak,
        isVip: profile.isVip === true,
        ...(profile.lastFocusDay ? { lastFocusDay: profile.lastFocusDay } : {}),
      },
    tasks: Array.isArray(tasks) ? tasks as StudyTask[] : starterTasks,
    apps: Array.isArray(apps) ? apps as FocusApp[] : [],
    wallet,
    goals,
    notificationSettings,
    notifications,
    focusProgress,
    favoritePlantIds,
  }
}

const tierProgress = (minutes: number) => {
  let currentIndex = 0
  for (let index = tiers.length - 1; index >= 0; index -= 1) {
    if (minutes >= tiers[index].minMinutes) {
      currentIndex = index
      break
    }
  }
  const tier = tiers[Math.max(0, currentIndex)]
  const nextTier = tiers[currentIndex + 1] ?? null
  return {
    tier: tier.name,
    nextTier: nextTier?.name ?? null,
    minutesToNext: nextTier ? Math.max(0, nextTier.minMinutes - minutes) : 0,
    progress: nextTier
      ? Math.round(((minutes - tier.minMinutes) / (nextTier.minMinutes - tier.minMinutes)) * 100)
      : 100,
  }
}

const buildRanking = async (currentProfile?: Profile) => {
  const profiles = (await kv.getByPrefix('profile:')) as Profile[]
  const entries = profiles
    .filter(
      (profile) =>
        typeof profile?.id === 'string' &&
        typeof profile.name === 'string' &&
        typeof profile.username === 'string' &&
        Number.isFinite(profile.focusMinutes),
    )
    .sort((a, b) => b.focusMinutes - a.focusMinutes)
    .map((entry, index) => ({
      id: entry.id,
      name: entry.name,
      username: entry.username,
      focusMinutes: entry.focusMinutes,
      streak: entry.streak,
      rank: index + 1,
      ...tierProgress(entry.focusMinutes),
    }))
  const current = currentProfile ? entries.find((entry) => entry.id === currentProfile.id) : null
  return { top: entries.slice(0, 100), current, tiers }
}

app.get(`${prefix}/health`, (c) => c.json({ status: 'ok' }))

app.post(`${prefix}/auth/signup`, async (c) => {
  const body = await c.req.json()
  const username = normalizeUsername(body.username)
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (
    !username ||
    name.length < 2 ||
    name.length > 50 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof body.password !== 'string' ||
    body.password.length < 8
  ) {
    return c.json({ error: 'Thông tin đăng ký chưa hợp lệ.' }, 400)
  }
  if (await kv.get(`username:${username}`)) {
    return c.json({ error: 'Tên đăng nhập đã được sử dụng.' }, 409)
  }
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: { name, username },
  })
  if (error || !data.user) return c.json({ error: 'Email đã được sử dụng.' }, 409)
  const profile: Profile = {
    id: data.user.id,
    email,
    name,
    username,
    focusMinutes: 0,
    streak: 0,
    isVip: false,
  }
  await kv.mset(
    [`profile:${profile.id}`, `username:${username}`, `tasks:${profile.id}`, `apps:${profile.id}`],
    [profile, { email, userId: profile.id }, starterTasks, []],
  )
  const login = await publicClient().auth.signInWithPassword({ email, password: body.password })
  if (login.error || !login.data.session)
    return c.json({ error: 'Tài khoản đã tạo nhưng chưa thể đăng nhập.' }, 500)
  return c.json({ user: profile, session: login.data.session })
})

app.post(`${prefix}/auth/login`, async (c) => {
  const body = await c.req.json()
  const username = normalizeUsername(body.username)
  const mapping = username
    ? ((await kv.get(`username:${username}`)) as { email: string; userId: string } | undefined)
    : undefined
  if (!mapping || typeof body.password !== 'string') {
    return c.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, 401)
  }
  const { data, error } = await publicClient().auth.signInWithPassword({
    email: mapping.email,
    password: body.password,
  })
  if (error || !data.session)
    return c.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, 401)
  const profile = await kv.get(`profile:${data.user.id}`)
  return c.json({ user: profile, session: data.session })
})

app.post(`${prefix}/auth/forgot`, async (c) => {
  const body = await c.req.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await publicClient().auth.resetPasswordForEmail(email)
  }
  return c.json({ success: true })
})

app.get(`${prefix}/bootstrap`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  let tasks = await kv.get(`tasks:${auth.user.id}`)
  if (!Array.isArray(tasks)) {
    tasks = starterTasks
    await kv.set(`tasks:${auth.user.id}`, tasks)
  }
  const [
    apps,
    ranking,
    wallet,
    goals,
    notificationSettings,
    notifications,
    focusProgress,
    favoritePlantIds,
  ] =
    await Promise.all([
      kv.get(`apps:${auth.user.id}`),
      buildRanking(auth.profile),
      getWallet(auth.user.id),
      getGoals(auth.user.id),
      getNotificationSettings(auth.user.id),
      getNotifications(auth.user.id),
      getFocusProgress(auth.user.id),
      getFavoritePlantIds(auth.user.id),
    ])
  return c.json({
    user: { ...auth.profile, isVip: auth.profile.isVip === true },
    tasks,
    apps: apps ?? [],
    ranking,
    wallet,
    goals,
    notificationSettings,
    notifications,
    focusProgress,
    favoritePlantIds,
    demoMode: isDemoAdmin(auth.user.id),
  })
})

app.get(`${prefix}/demo/accounts`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  if (!isDemoAdmin(auth.user.id))
    return c.json({ error: 'Chức năng này chỉ dành cho quản trị viên demo.' }, 403)

  const accounts = await Promise.all(
    getDemoTargetIds().map(async (id) => {
      const profile = (await kv.get(`profile:${id}`)) as Profile | undefined
      return profile
        ? { id: profile.id, name: profile.name, username: profile.username }
        : null
    }),
  )
  return c.json({ accounts: accounts.filter((account) => account !== null) })
})

app.get(`${prefix}/demo/accounts/:id`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  if (!isDemoAdmin(auth.user.id))
    return c.json({ error: 'Chức năng này chỉ dành cho quản trị viên demo.' }, 403)
  const targetId = c.req.param('id')
  if (!getDemoTargetIds().includes(targetId))
    return c.json({ error: 'Tài khoản này không nằm trong danh sách demo được quản lý.' }, 403)
  const account = await getDemoAccountData(targetId)
  if (!account) return c.json({ error: 'Không tìm thấy tài khoản demo.' }, 404)
  return c.json({ account })
})

app.put(`${prefix}/demo/accounts/:id`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  if (!isDemoAdmin(auth.user.id))
    return c.json({ error: 'Chức năng này chỉ dành cho quản trị viên demo.' }, 403)
  const targetId = c.req.param('id')
  if (!getDemoTargetIds().includes(targetId))
    return c.json({ error: 'Tài khoản này không nằm trong danh sách demo được quản lý.' }, 403)

  const existingProfile = (await kv.get(`profile:${targetId}`)) as Profile | undefined
  if (!existingProfile) return c.json({ error: 'Không tìm thấy tài khoản demo.' }, 404)
  const body = await c.req.json()
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return c.json({ error: 'Dữ liệu demo không hợp lệ.' }, 400)

  const userInput = body.user
  const name =
    typeof userInput?.name === 'string' ? userInput.name.trim().replace(/\s+/g, ' ') : ''
  const username = normalizeUsername(userInput?.username)
  const focusMinutes = userInput?.focusMinutes
  const streak = userInput?.streak
  if (
    name.length < 2 ||
    name.length > 50 ||
    !username ||
    !Number.isInteger(focusMinutes) ||
    focusMinutes < 0 ||
    focusMinutes > 2_000_000_000 ||
    !Number.isInteger(streak) ||
    streak < 0 ||
    streak > 36500 ||
    typeof userInput?.isVip !== 'boolean'
  ) {
    return c.json({ error: 'Tên, tên đăng nhập hoặc thống kê tài khoản không hợp lệ.' }, 400)
  }

  const goalsInput = body.goals
  const dailyMinutes = goalsInput?.dailyMinutes
  const monthlyHours = goalsInput?.monthlyHours
  if (
    !Number.isInteger(dailyMinutes) ||
    dailyMinutes < 15 ||
    dailyMinutes > 1440 ||
    !Number.isInteger(monthlyHours) ||
    monthlyHours < 1 ||
    monthlyHours > 744
  ) {
    return c.json({ error: 'Mục tiêu học tập không hợp lệ.' }, 400)
  }

  const walletInput = body.wallet
  if (
    !Number.isInteger(walletInput?.balance) ||
    walletInput.balance < 0 ||
    walletInput.balance > 2_000_000_000 ||
    typeof walletInput.dailyRewardClaimed !== 'boolean' ||
    !Array.isArray(walletInput.ownedPlantIds) ||
    walletInput.ownedPlantIds.some(
      (id: unknown) => typeof id !== 'string' || !shopPlants.some((plant) => plant.id === id),
    )
  ) {
    return c.json({ error: 'Ví hoặc danh sách cây đã mua không hợp lệ.' }, 400)
  }
  const ownedPlantIds = [...new Set(walletInput.ownedPlantIds as string[])]

  const notificationSettings = body.notificationSettings
  if (
    typeof notificationSettings?.focusRewards !== 'boolean' ||
    typeof notificationSettings?.dailyRewards !== 'boolean' ||
    typeof notificationSettings?.shopUpdates !== 'boolean'
  ) {
    return c.json({ error: 'Cài đặt thông báo không hợp lệ.' }, 400)
  }

  const dailyHistoryInput = body.focusProgress?.dailyHistory
  if (!Array.isArray(dailyHistoryInput) || dailyHistoryInput.length !== 7)
    return c.json({ error: 'Cần nhập đủ dữ liệu cho 7 ngày gần nhất.' }, 400)
  const today = getTodayDateKey()
  const expectedDates = Array.from({ length: 7 }, (_, index) =>
    shiftDateKey(today, index - 6),
  )
  const dailyHistory: DailyFocusSummary[] = []
  for (const [index, item] of dailyHistoryInput.entries()) {
    if (
      typeof item !== 'object' ||
      item === null ||
      Array.isArray(item) ||
      item.date !== expectedDates[index] ||
      !Number.isInteger(item.minutes) ||
      item.minutes < 0 ||
      item.minutes > 1440
    ) {
      return c.json({ error: 'Ngày hoặc số phút trong lịch sử không hợp lệ.' }, 400)
    }
    dailyHistory.push({ date: item.date, minutes: item.minutes })
  }

  const tasks = body.tasks
  if (
    !Array.isArray(tasks) ||
    tasks.length > 100 ||
    tasks.some(
      (task: any) =>
        !task ||
        typeof task.id !== 'string' ||
        task.id.length < 1 ||
        task.id.length > 100 ||
        typeof task.name !== 'string' ||
        task.name.trim().length < 2 ||
        task.name.trim().length > 50 ||
        !Number.isInteger(task.durationMinutes) ||
        task.durationMinutes < 1 ||
        task.durationMinutes > 1440,
    ) ||
    new Set(tasks.map((task: StudyTask) => task.id)).size !== tasks.length
  ) {
    return c.json({ error: 'Danh sách môn học không hợp lệ.' }, 400)
  }

  const apps = body.apps
  if (
    !Array.isArray(apps) ||
    apps.length > 250 ||
    apps.some(
      (item: any) =>
        !item ||
        typeof item.id !== 'string' ||
        item.id.length < 1 ||
        item.id.length > 180 ||
        typeof item.identifier !== 'string' ||
        item.identifier.length < 1 ||
        item.identifier.length > 180 ||
        typeof item.name !== 'string' ||
        item.name.trim().length < 1 ||
        item.name.trim().length > 80 ||
        !['android', 'ios'].includes(item.platform) ||
        !['red', 'yellow', 'green'].includes(item.group),
    ) ||
    new Set(apps.map((item: FocusApp) => item.id)).size !== apps.length
  ) {
    return c.json({ error: 'Danh sách ứng dụng không hợp lệ.' }, 400)
  }

  const notifications = body.notifications
  if (
    !Array.isArray(notifications) ||
    notifications.length > 50 ||
    notifications.some(
      (item: any) =>
        !item ||
        typeof item.id !== 'string' ||
        item.id.length < 1 ||
        item.id.length > 100 ||
        !['focus', 'daily', 'shop', 'system'].includes(item.category) ||
        typeof item.title !== 'string' ||
        item.title.trim().length < 1 ||
        item.title.length > 120 ||
        typeof item.message !== 'string' ||
        item.message.trim().length < 1 ||
        item.message.length > 500 ||
        typeof item.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(item.createdAt)) ||
        typeof item.read !== 'boolean',
    ) ||
    new Set(notifications.map((item: AppNotification) => item.id)).size !== notifications.length
  ) {
    return c.json({ error: 'Danh sách thông báo không hợp lệ.' }, 400)
  }

  const isVip = userInput.isVip
  const favoritePlantIds = body.favoritePlantIds
  if (
    !Array.isArray(favoritePlantIds) ||
    favoritePlantIds.some(
      (id: unknown) =>
        typeof id !== 'string' ||
        (!ownedPlantIds.includes(id) && !hasVipPlantAccess(isVip, id)),
    )
  ) {
    return c.json({ error: 'Cây yêu thích phải thuộc danh sách cây đã mua.' }, 400)
  }

  const usernameMapping = (await kv.get(`username:${username}`)) as
    | { userId: string; email: string }
    | undefined
  if (usernameMapping && usernameMapping.userId !== targetId)
    return c.json({ error: 'Tên đăng nhập đã được tài khoản khác sử dụng.' }, 409)

  const history = await getFocusHistory(targetId)
  const editedDates = new Set(expectedDates)
  const updatedHistory = [
    ...history.filter((entry) => !editedDates.has(entry.date)),
    ...dailyHistory,
  ]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-365)
  const month = today.slice(0, 7)
  const profile: Profile = {
    ...existingProfile,
    name,
    username,
    focusMinutes,
    streak,
    isVip,
    ...(streak > 0 ? { lastFocusDay: today } : { lastFocusDay: undefined }),
  }
  const focusProgress = {
    day: today,
    month,
    dailyMinutes: dailyHistory.find((entry) => entry.date === today)?.minutes ?? 0,
    monthlyMinutes: updatedHistory
      .filter((entry) => entry.date.startsWith(month))
      .reduce((total, entry) => total + entry.minutes, 0),
  }
  const entries = [
    { key: `profile:${targetId}`, value: profile },
    { key: `tasks:${targetId}`, value: tasks },
    { key: `apps:${targetId}`, value: apps },
    { key: `goals:${targetId}`, value: { dailyMinutes, monthlyHours } },
    { key: `notification-settings:${targetId}`, value: notificationSettings },
    { key: `notifications:${targetId}`, value: notifications },
    { key: `favorite-plants:${targetId}`, value: [...new Set(favoritePlantIds)] },
    { key: `focus-history:${targetId}`, value: updatedHistory },
    { key: `focus-progress:${targetId}`, value: focusProgress },
  ]
  const { error: saveError } = await adminClient().rpc('focust_update_demo_account', {
    p_user_id: targetId,
    p_email: existingProfile.email,
    p_old_username: existingProfile.username,
    p_new_username: username,
    p_entries: entries,
    p_wallet_balance: walletInput.balance,
    p_owned_plant_ids: ownedPlantIds,
    p_daily_reward_claimed: walletInput.dailyRewardClaimed,
    p_claim_date: today,
  })
  if (saveError) {
    console.error('Demo account update failed:', saveError.message)
    return c.json({ error: 'Không thể lưu dữ liệu demo. Hãy kiểm tra migration mới nhất đã được áp dụng.' }, 500)
  }

  const account = await getDemoAccountData(targetId)
  if (!account) return c.json({ error: 'Đã lưu nhưng không thể tải lại tài khoản demo.' }, 500)
  return c.json({ account, ranking: await buildRanking(profile) })
})

app.put(`${prefix}/account/profile`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const body = await c.req.json()
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const username = normalizeUsername(body.username)
  if (name.length < 2 || name.length > 50 || !username)
    return c.json({ error: 'Tên hoặc tên đăng nhập không hợp lệ.' }, 400)

  const existing = (await kv.get(`username:${username}`)) as
    | { userId: string; email: string }
    | undefined
  if (existing && existing.userId !== auth.user.id)
    return c.json({ error: 'Tên đăng nhập đã được sử dụng.' }, 409)

  const profile: Profile = { ...auth.profile, name, username }
  await kv.mset(
    [`profile:${auth.user.id}`, `username:${username}`],
    [profile, { email: profile.email, userId: profile.id }],
  )
  if (username !== auth.profile.username) await kv.del(`username:${auth.profile.username}`)
  return c.json({ user: profile })
})

app.put(`${prefix}/account/demo-stats`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  if (!isDemoAdmin(auth.user.id) || !getDemoTargetIds().includes(auth.user.id))
    return c.json({ error: 'Chức năng này chỉ dành cho tài khoản demo được cấu hình.' }, 403)

  const body = await c.req.json()
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return c.json({ error: 'Dữ liệu demo không hợp lệ.' }, 400)
  const streak = body.streak
  if (typeof streak !== 'number' || !Number.isInteger(streak) || streak < 0 || streak > 36500)
    return c.json({ error: 'Streak phải là số nguyên từ 0 đến 36500.' }, 400)
  if (!Array.isArray(body.dailyHistory) || body.dailyHistory.length !== 7)
    return c.json({ error: 'Cần nhập đủ dữ liệu cho 7 ngày gần nhất.' }, 400)

  const today = getTodayDateKey()
  const expectedDates = Array.from({ length: 7 }, (_, index) =>
    shiftDateKey(today, index - 6),
  )
  const dailyHistory: DailyFocusSummary[] = []
  for (const [index, item] of body.dailyHistory.entries()) {
    if (
      typeof item !== 'object' ||
      item === null ||
      Array.isArray(item) ||
      item.date !== expectedDates[index] ||
      typeof item.minutes !== 'number' ||
      !Number.isInteger(item.minutes) ||
      item.minutes < 0 ||
      item.minutes > 1440
    ) {
      return c.json({ error: 'Ngày hoặc số phút trong lịch sử không hợp lệ.' }, 400)
    }
    dailyHistory.push({ date: item.date, minutes: item.minutes })
  }

  const history = await getFocusHistory(auth.user.id)
  const editedDates = new Set(expectedDates)
  const oldWindowMinutes = history
    .filter((entry) => editedDates.has(entry.date))
    .reduce((total, entry) => total + entry.minutes, 0)
  const newWindowMinutes = dailyHistory.reduce((total, entry) => total + entry.minutes, 0)
  const focusMinutes = auth.profile.focusMinutes + newWindowMinutes - oldWindowMinutes
  if (focusMinutes < 0)
    return c.json({ error: 'Tổng thời gian tập trung không thể nhỏ hơn 0.' }, 400)

  const updatedHistory = [
    ...history.filter((entry) => !editedDates.has(entry.date)),
    ...dailyHistory,
  ]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-365)
  const profile: Profile = {
    ...auth.profile,
    focusMinutes,
    streak,
    ...(streak > 0 ? { lastFocusDay: today } : { lastFocusDay: undefined }),
  }
  const month = today.slice(0, 7)
  const focusProgress = {
    day: today,
    month,
    dailyMinutes: dailyHistory.find((entry) => entry.date === today)?.minutes ?? 0,
    monthlyMinutes: updatedHistory
      .filter((entry) => entry.date.startsWith(month))
      .reduce((total, entry) => total + entry.minutes, 0),
  }
  await kv.mset(
    [
      `profile:${auth.user.id}`,
      `focus-history:${auth.user.id}`,
      `focus-progress:${auth.user.id}`,
    ],
    [profile, updatedHistory, focusProgress],
  )

  return c.json({
    profile,
    ranking: await buildRanking(profile),
    focusProgress: await getFocusProgress(auth.user.id),
  })
})

app.get(`${prefix}/account/goals`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  return c.json({ goals: await getGoals(auth.user.id) })
})

app.put(`${prefix}/account/goals`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const body = await c.req.json()
  const dailyMinutes = Number(body.dailyMinutes)
  const monthlyHours = Number(body.monthlyHours)
  if (
    !Number.isInteger(dailyMinutes) ||
    dailyMinutes < 15 ||
    dailyMinutes > 1440 ||
    !Number.isInteger(monthlyHours) ||
    monthlyHours < 1 ||
    monthlyHours > 744
  ) {
    return c.json({ error: 'Mục tiêu học tập không hợp lệ.' }, 400)
  }
  const goals = { dailyMinutes, monthlyHours }
  await kv.set(`goals:${auth.user.id}`, goals)
  return c.json({ goals })
})

app.get(`${prefix}/account/notification-settings`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  return c.json({ settings: await getNotificationSettings(auth.user.id) })
})

app.put(`${prefix}/account/notification-settings`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const body = await c.req.json()
  if (
    typeof body.focusRewards !== 'boolean' ||
    typeof body.dailyRewards !== 'boolean' ||
    typeof body.shopUpdates !== 'boolean'
  ) {
    return c.json({ error: 'Cài đặt thông báo không hợp lệ.' }, 400)
  }
  const settings: NotificationSettings = {
    focusRewards: body.focusRewards,
    dailyRewards: body.dailyRewards,
    shopUpdates: body.shopUpdates,
  }
  await kv.set(`notification-settings:${auth.user.id}`, settings)
  return c.json({ settings })
})

app.put(`${prefix}/garden/favorites`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const body = await c.req.json()
  const requestedPlantIds: unknown = body?.plantIds
  if (!Array.isArray(requestedPlantIds)) {
    return c.json({ error: 'Danh sách cây yêu thích không hợp lệ.' }, 400)
  }
  const plantIds: string[] = []
  for (const plantId of requestedPlantIds) {
    if (typeof plantId !== 'string')
      return c.json({ error: 'Danh sách cây yêu thích không hợp lệ.' }, 400)
    if (!plantIds.includes(plantId)) plantIds.push(plantId)
  }
  const wallet = await getWallet(auth.user.id)
  if (
    plantIds.some(
      (plantId) =>
        !wallet.ownedPlantIds.includes(plantId) &&
        !hasVipPlantAccess(auth.profile.isVip, plantId),
    )
  ) {
    return c.json({ error: 'Chỉ có thể đánh dấu cây đã sở hữu.' }, 400)
  }
  await kv.set(`favorite-plants:${auth.user.id}`, plantIds)
  return c.json({ favoritePlantIds: plantIds })
})

app.get(`${prefix}/notifications`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  return c.json({ notifications: await getNotifications(auth.user.id) })
})

app.post(`${prefix}/notifications/read-all`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const notifications = (await getNotifications(auth.user.id)).map((item) => ({
    ...item,
    read: true,
  }))
  await kv.set(`notifications:${auth.user.id}`, notifications)
  return c.json({ notifications })
})

app.put(`${prefix}/notifications/:id/read`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const id = c.req.param('id')
  const notifications = await getNotifications(auth.user.id)
  const index = notifications.findIndex((item) => item.id === id)
  if (index < 0) return c.json({ error: 'Không tìm thấy thông báo.' }, 404)
  notifications[index] = { ...notifications[index], read: true }
  await kv.set(`notifications:${auth.user.id}`, notifications)
  return c.json({ notifications })
})

app.post(`${prefix}/shop/purchase`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const body = await c.req.json()
  const plant = shopPlants.find((item) => item.id === body.plantId)
  if (!plant) return c.json({ error: 'Cây không hợp lệ.' }, 400)

  const { data, error } = await adminClient().rpc('focust_purchase_plant', {
    p_user_id: auth.user.id,
    p_plant_id: plant.id,
  })
  if (error) throw error
  if (!data?.ok) {
    if (data?.reason === 'already_owned') return c.json({ error: 'Bạn đã sở hữu cây này.' }, 409)
    if (data?.reason === 'insufficient_funds')
      return c.json({ error: 'Bạn không đủ Xu để mua cây này.' }, 400)
    return c.json({ error: 'Không thể mua cây này.' }, 400)
  }
  await addNotification(
    auth.user.id,
    'shop',
    'Mua cây thành công',
    `${plant.name} đã được thêm vào khu vườn của bạn.`,
  )
  return c.json({ wallet: await getWallet(auth.user.id), plant })
})

app.post(`${prefix}/rewards/daily`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const { data, error } = await adminClient().rpc('focust_claim_daily_reward', {
    p_user_id: auth.user.id,
  })
  if (error) throw error
  if (!data?.ok) {
    return c.json(
      { error: 'Bạn đã nhận quà hôm nay.', wallet: await getWallet(auth.user.id) },
      409,
    )
  }
  await addNotification(auth.user.id, 'daily', 'Quà điểm danh', 'Bạn vừa nhận 200 Xu điểm danh.')
  return c.json({ wallet: await getWallet(auth.user.id), reward: data.reward })
})

app.post(`${prefix}/tasks`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const body = await c.req.json()
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const durationMinutes = Number(body.durationMinutes)
  if (
    name.length < 2 ||
    name.length > 50 ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 1440
  ) {
    return c.json({ error: 'Môn học hoặc thời lượng không hợp lệ.' }, 400)
  }
  const tasks = ((await kv.get(`tasks:${auth.user.id}`)) ?? []) as StudyTask[]
  const task: StudyTask = { id: crypto.randomUUID(), name, durationMinutes }
  await kv.set(`tasks:${auth.user.id}`, [...tasks, task])
  return c.json({ task })
})

app.put(`${prefix}/tasks/:id`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const body = await c.req.json()
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const durationMinutes = Number(body.durationMinutes)
  if (
    name.length < 2 ||
    name.length > 50 ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 1440
  ) {
    return c.json({ error: 'Môn học hoặc thời lượng không hợp lệ.' }, 400)
  }
  const tasks = ((await kv.get(`tasks:${auth.user.id}`)) ?? []) as StudyTask[]
  const index = tasks.findIndex((task) => task.id === c.req.param('id'))
  if (index < 0) return c.json({ error: 'Không tìm thấy môn học.' }, 404)
  const task = { ...tasks[index], name, durationMinutes }
  tasks[index] = task
  await kv.set(`tasks:${auth.user.id}`, tasks)
  return c.json({ task })
})

app.post(`${prefix}/apps/detected`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const body = await c.req.json()
  const incoming = Array.isArray(body.apps) ? body.apps.slice(0, 250) : []
  const previous = ((await kv.get(`apps:${auth.user.id}`)) ?? []) as any[]
  const previousGroups = new Map(previous.map((item) => [item.identifier, item.group]))
  const apps = incoming
    .filter((item: any) => typeof item?.identifier === 'string' && typeof item?.name === 'string')
    .map((item: any) => ({
      id: item.identifier.slice(0, 180),
      identifier: item.identifier.slice(0, 180),
      name: item.name.trim().slice(0, 80),
      platform: item.platform === 'ios' ? 'ios' : 'android',
      group: (previousGroups.get(item.identifier) ?? 'green') as Group,
    }))
  await kv.set(`apps:${auth.user.id}`, apps)
  return c.json({ apps })
})

app.put(`${prefix}/apps/:id/group`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const body = await c.req.json()
  if (!['red', 'yellow', 'green'].includes(body.group))
    return c.json({ error: 'Nhóm không hợp lệ.' }, 400)
  const apps = ((await kv.get(`apps:${auth.user.id}`)) ?? []) as any[]
  const index = apps.findIndex((item) => item.id === c.req.param('id'))
  if (index < 0) return c.json({ error: 'Không tìm thấy ứng dụng.' }, 404)
  apps[index] = { ...apps[index], group: body.group }
  await kv.set(`apps:${auth.user.id}`, apps)
  return c.json({ app: apps[index] })
})

app.post(`${prefix}/focus-sessions`, async (c) => {
  const auth = await requireUser(c)
  if ('response' in auth) return auth.response
  const body = await c.req.json()
  const requestedMinutes = Number(body.minutes)
  if (!Number.isInteger(requestedMinutes) || requestedMinutes < 1 || requestedMinutes > 1440)
    return c.json({ error: 'Thời lượng không hợp lệ.' }, 400)
  const minutes = requestedMinutes
  const taskId = typeof body.taskId === 'string' ? body.taskId : ''
  const tasks = ((await kv.get(`tasks:${auth.user.id}`)) ?? []) as StudyTask[]
  const task = tasks.find((item) => item.id === taskId)
  if (!task) return c.json({ error: 'Vui lòng chọn môn học đã lưu.' }, 400)
  if (body.plantId != null && typeof body.plantId !== 'string')
    return c.json({ error: 'Cây đã chọn không hợp lệ.' }, 400)
  const plantId = typeof body.plantId === 'string' ? body.plantId : null
  if (plantId && !(await canUsePlant(auth.user.id, plantId)))
    return c.json({ error: 'Cây đã chọn không thuộc khu vườn của bạn.' }, 400)

  const today = getTodayDateKey()
  const previousDay = getPreviousDateKey(today)
  const streak =
    auth.profile.lastFocusDay === today
      ? auth.profile.streak
      : auth.profile.lastFocusDay === previousDay
        ? auth.profile.streak + 1
        : 1
  const totalFocusMinutes = auth.profile.focusMinutes + minutes
  const profile: Profile = {
    ...auth.profile,
    focusMinutes: totalFocusMinutes,
    streak,
    lastFocusDay: today,
  }
  await kv.set(`profile:${profile.id}`, profile)
  const storedSessions = await kv.get(`focus-sessions:${auth.user.id}`)
  const sessions = Array.isArray(storedSessions) ? storedSessions : []
  await kv.set(`focus-sessions:${auth.user.id}`, [
    ...sessions,
    {
      id: crypto.randomUUID(),
      taskId: task.id,
      taskName: task.name,
      taskDurationMinutes: task.durationMinutes,
      plantId,
      minutes,
      completedAt: new Date().toISOString(),
    },
  ].slice(-500))
  const day = today
  const month = day.slice(0, 7)
  const previousProgress = (await kv.get(`focus-progress:${auth.user.id}`)) as
    | { day: string; month: string; dailyMinutes: number; monthlyMinutes: number }
    | undefined
  await kv.set(`focus-progress:${auth.user.id}`, {
    day,
    month,
    dailyMinutes: (previousProgress?.day === day ? previousProgress.dailyMinutes : 0) + minutes,
    monthlyMinutes:
      (previousProgress?.month === month ? previousProgress.monthlyMinutes : 0) + minutes,
  })
  const previousHistory = await getFocusHistory(auth.user.id)
  const todayMinutes =
    (previousHistory.find((entry) => entry.date === day)?.minutes ?? 0) + minutes
  const focusHistory = [
    ...previousHistory.filter((entry) => entry.date !== day),
    { date: day, minutes: todayMinutes },
  ]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-365)
  await kv.set(`focus-history:${auth.user.id}`, focusHistory)
  const coinsAdded =
    (Math.floor(totalFocusMinutes / 25) - Math.floor(auth.profile.focusMinutes / 25)) * 10
  const { error: rewardError } = await adminClient().rpc('focust_add_focus_coins', {
    p_user_id: auth.user.id,
    p_amount: coinsAdded,
  })
  if (rewardError) throw rewardError
  await addNotification(
    auth.user.id,
    'focus',
    'Hoàn thành phiên tập trung',
    `${task.name}: ${minutes} phút. ${coinsAdded > 0 ? `Bạn đã nhận thêm ${coinsAdded} Xu. ` : ''}Chuỗi hiện tại: ${streak} ngày.`,
  )
  const focusProgress = await getFocusProgress(auth.user.id)

  return c.json({
    profile,
    ranking: await buildRanking(profile),
    wallet: await getWallet(auth.user.id),
    coinsAdded,
    focusProgress,
  })
})

app.get(`${prefix}/ranking`, async (c) => {
  const user = await currentUser(c)
  const profile = user
    ? ((await kv.get(`profile:${user.id}`)) as Profile | undefined)
    : undefined
  return c.json(await buildRanking(profile))
})

Deno.serve(app.fetch)
