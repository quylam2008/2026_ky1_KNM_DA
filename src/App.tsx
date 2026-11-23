'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { detectInstalledApps } from './installed-apps'
import {
  createStudyTask,
  claimDailyReward,
  getBootstrap,
  getNotifications,
  hasSupabaseSession,
  loginAppUser,
  logoutAppUser,
  purchasePlant,
  recordFocusSession,
  requestPasswordReset,
  signupAppUser,
  syncDetectedApps,
  markAllNotificationsRead,
  markNotificationRead,
  updateFocusAppGroup,
  updateAccountProfile,
  updateFavoritePlants,
  updateGoalSettings,
  updateNotificationSettings,
  updateStudyTask,
  type AppUserView,
  type AppNotificationView,
  type FocusAppView as FocusApp,
  type FocusProgressView,
  type GoalSettingsView,
  type NotificationSettingsView,
  type RankingView,
  type StudyTaskView as StudyTask,
  type WalletView,
} from './supabase-api'

type Page = 'home' | 'ranking' | 'garden' | 'shop' | 'account'
type AuthPage = 'login' | 'signup' | 'forgot'
type AccountSection = 'profile' | 'goals' | 'devices' | 'notifications'
type NotificationContextValue = { unreadCount: number; streak: number; onOpen: () => void }
const NotificationContext = createContext<NotificationContextValue | null>(null)
const normalizeFocusProgress = (
  progress?: Partial<FocusProgressView> | null,
): FocusProgressView => ({
  dailyMinutes: progress?.dailyMinutes ?? 0,
  monthlyMinutes: progress?.monthlyMinutes ?? 0,
  weeklyMinutes: progress?.weeklyMinutes ?? 0,
  dailyHistory: progress?.dailyHistory ?? [],
})
type IconName =
  | 'home'
  | 'leaf'
  | 'store'
  | 'user'
  | 'bell'
  | 'flame'
  | 'star'
  | 'plus'
  | 'chevron'
  | 'clock'
  | 'target'
  | 'coin'
  | 'lock'
  | 'logout'
  | 'mail'
  | 'eye'
  | 'arrow'
  | 'shield'
  | 'check'
  | 'x'
  | 'trophy'
  | 'scan'

const icons: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4C11 4 5 9 5 16c0 2 1 4 3 5" />
      <path d="M4 20c4-7 9-10 16-16M13 14c2 0 4 1 5 2" />
    </>
  ),
  store: (
    <>
      <path d="M4 9h16l-1-5H5L4 9Z" />
      <path d="M5 9v11h14V9M9 20v-6h6v6" />
      <path d="M4 9c0 2 3 3 4 0 0 2 3 3 4 0 0 2 3 3 4 0 0 2 3 3 4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.6-5 3.2-7 8-7s7.4 2 8 7" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  flame: (
    <path d="M13 22c4-1 7-4 7-9 0-3-2-7-5-9 0 3-2 5-3 6 0-3-2-6-4-7 0 4-4 7-4 12 0 4 3 7 7 7-2-1-3-3-2-5 1 1 2 1 3 1-1-3 1-5 2-7 1 3 4 5 3 11Z" />
  ),
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 8.5c-.6-.7-1.5-1-2.5-1-1.4 0-2.5.8-2.5 2 0 3 5 1 5 4 0 1.1-1 2-2.5 2-1.1 0-2.1-.4-2.8-1.2M12 5.5v13" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3-6 10-6 10 6 10 6-3 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  arrow: (
    <>
      <path d="m15 18-6-6 6-6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <rect x="8" y="8" width="8" height="8" rx="2" />
    </>
  ),
}

function Icon({
  name,
  size = 20,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  )
}

function Tree({
  variant = 0,
  size = 80,
  muted = false,
}: {
  variant?: number
  size?: number
  muted?: boolean
}) {
  const palettes = [
    ['#1f6f4a', '#75ad73', '#e0a95b'],
    ['#356a55', '#b4d58b', '#d8a15e'],
    ['#235d4c', '#80b9a0', '#d69668'],
    ['#1c5741', '#d7b465', '#c07b51'],
  ]
  const [dark, light, accent] = palettes[variant % palettes.length]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={muted ? 'grayscale opacity-45' : ''}
      aria-hidden="true"
    >
      <ellipse cx="50" cy="91" rx="28" ry="5" fill="#113d2c" opacity=".1" />
      <path d="M48 82V44h5v38" fill="#815c3e" />
      <path
        d="M51 56c-6-8-14-9-20-11M51 63c7-8 14-8 20-10"
        stroke="#815c3e"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="50" cy="35" r="22" fill={dark} />
      <circle cx="33" cy="44" r="14" fill={light} />
      <circle cx="68" cy="45" r="16" fill={light} />
      <circle cx="63" cy="25" r="13" fill={accent} opacity=".9" />
      <circle cx="43" cy="22" r="12" fill={dark} />
      <circle cx="38" cy="42" r="2" fill="#fff" opacity=".55" />
      <circle cx="65" cy="41" r="2.5" fill="#fff" opacity=".5" />
    </svg>
  )
}

function AppLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`grid h-10 w-10 place-items-center rounded-2xl ${light ? 'bg-white/15 text-white' : 'bg-[#e6f0e6] text-[#174d38]'}`}
      >
        <Icon name="leaf" size={23} />
      </div>
      <span
        className={`font-serif text-[24px] font-semibold tracking-[-.04em] ${light ? 'text-white' : 'text-[#143f30]'}`}
      >
        Focust
      </span>
    </div>
  )
}

function AuthScreen({
  page,
  setPage,
  onAuthenticated,
}: {
  page: AuthPage
  setPage: (p: AuthPage) => void
  onAuthenticated: (user: AppUserView) => void
}) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const content = {
    login: {
      eyebrow: 'Chào mừng trở lại',
      title: 'Tập trung hôm nay,\ntrưởng thành ngày mai.',
      button: 'Đăng nhập',
    },
    signup: {
      eyebrow: 'Bắt đầu hành trình',
      title: 'Gieo một thói quen,\nươm cả tương lai.',
      button: 'Tạo tài khoản',
    },
    forgot: {
      eyebrow: 'Khôi phục tài khoản',
      title: 'Đừng lo, hành trình\nvẫn đang chờ bạn.',
      button: 'Gửi liên kết',
    },
  }[page]
  return (
    <main className="auth-shell min-h-[100dvh] bg-[#edf1ed] text-[#163d2f]">
      <section className="relative mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col overflow-x-hidden overflow-y-auto bg-[#f8faf6] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] shadow-2xl sm:px-7 sm:pb-8 sm:pt-7">
        <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-[#d9e9d8]" />
        <div className="absolute right-3 top-20 opacity-90">
          <Tree size={120} variant={1} />
        </div>
        <div className="relative z-10">
          {page !== 'login' ? (
            <button
              onClick={() => setPage('login')}
              className="mb-8 grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm"
              aria-label="Quay lại"
            >
              <Icon name="arrow" />
            </button>
          ) : (
            <AppLogo />
          )}
        </div>
        <div className="relative z-10 mt-auto mb-7 pt-[clamp(4rem,14dvh,8rem)] sm:mb-9 sm:pt-52">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.22em] text-[#79907f]">
            {content.eyebrow}
          </p>
          <h1 className="whitespace-pre-line font-serif text-3xl font-semibold leading-[1.08] tracking-[-.04em] sm:text-[38px]">
            {content.title}
          </h1>
        </div>
        <form
          className="relative z-10 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (page === 'forgot') {
              setPending(true)
              setError('')
              const result = await requestPasswordReset(email)
              setPending(false)
              setError(
                result.success
                  ? 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.'
                  : result.error,
              )
              return
            }
            if (page === 'signup' && password !== confirmPassword) {
              setError('Mật khẩu nhập lại chưa khớp.')
              return
            }
            setPending(true)
            setError('')
            const result =
              page === 'signup'
                ? await signupAppUser({ email, name, password, username })
                : await loginAppUser({ password, username })
            setPending(false)
            if (!result.success) {
              setError(result.error)
              return
            }
            onAuthenticated(result.data)
          }}
        >
          {page === 'signup' && (
            <Field
              icon="user"
              placeholder="Họ và tên"
              value={name}
              onChange={setName}
              autoComplete="name"
            />
          )}
          {page !== 'forgot' && (
            <Field
              icon="user"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={setUsername}
              autoComplete="username"
            />
          )}
          {(page === 'signup' || page === 'forgot') && (
            <Field
              icon="mail"
              placeholder="Email của bạn"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
          )}
          {page !== 'forgot' && (
            <Field
              icon="lock"
              placeholder="Mật khẩu"
              value={password}
              onChange={setPassword}
              autoComplete={page === 'signup' ? 'new-password' : 'current-password'}
              type={showPassword ? 'text' : 'password'}
              action={
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#738078] transition-colors hover:bg-[#edf3ed]"
                >
                  <Icon name="eye" size={18} />
                </button>
              }
            />
          )}
          {page === 'signup' && (
            <Field
              icon="lock"
              placeholder="Nhập lại mật khẩu"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
          )}
          {page === 'login' && (
            <div className="flex justify-end pb-2">
              <button
                type="button"
                onClick={() => setPage('forgot')}
                className="text-xs font-semibold text-[#285f49]"
              >
                Quên mật khẩu?
              </button>
            </div>
          )}
          {page === 'forgot' && (
            <p className="pb-2 text-sm leading-6 text-[#718078]">
              Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu tới email đã đăng ký của bạn.
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-[#fff0ed] px-3 py-2 text-xs text-[#b3574a]">
              {error}
            </p>
          )}
          <button
            disabled={pending}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#174d38] text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,77,56,.2)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {pending ? 'Đang xử lý...' : content.button}
            <Icon name="chevron" size={18} />
          </button>
        </form>
        <p className="relative z-10 mt-6 text-center text-sm text-[#738078]">
          {page === 'login'
            ? 'Chưa có tài khoản? '
            : page === 'signup'
              ? 'Đã có tài khoản? '
              : 'Bạn đã nhớ mật khẩu? '}
          <button
            onClick={() => setPage(page === 'login' ? 'signup' : 'login')}
            className="font-bold text-[#174d38]"
          >
            {page === 'login' ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </p>
      </section>
    </main>
  )
}

function Field({
  icon,
  placeholder,
  type = 'text',
  action,
  autoComplete,
  value,
  onChange,
}: {
  icon: IconName
  placeholder: string
  type?: string
  action?: ReactNode
  autoComplete?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#dfe7df] bg-white px-4 text-[#8a978f] transition-colors focus-within:border-[#4f8068] focus-within:ring-4 focus-within:ring-[#e5efe5]">
      <Icon name={icon} size={19} />
      <input
        className="min-w-0 flex-1 bg-transparent text-sm text-[#173e2f] outline-none placeholder:text-[#9ba69f]"
        type={type}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
      {action}
    </div>
  )
}

function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const notifications = useContext(NotificationContext)
  return (
    <header className="flex items-center justify-between px-5 pb-4 pt-5">
      <div>
        {title ? (
          <>
            <p className="text-xs font-medium text-[#819087]">{subtitle}</p>
            <h1 className="font-serif text-[28px] font-semibold tracking-[-.04em] text-[#173e2f]">
              {title}
            </h1>
          </>
        ) : (
          <AppLogo />
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-10 items-center gap-1.5 rounded-full bg-[#fff2dc] px-3 text-[#b36a2e]">
          <Icon name="flame" size={18} />
          <b className="text-xs">{notifications?.streak ?? 0}</b>
        </div>
        <button
          type="button"
          onClick={notifications?.onOpen}
          aria-label={
            notifications?.unreadCount
              ? `Thông báo, ${notifications.unreadCount} chưa đọc`
              : 'Thông báo'
          }
          className="relative grid h-10 w-10 place-items-center rounded-full border border-[#e2e9e2] bg-white text-[#315442]"
        >
          <Icon name="bell" size={19} />
          {Boolean(notifications?.unreadCount) && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#de6a55] px-1 text-[9px] font-bold text-white">
              {notifications!.unreadCount > 9 ? '9+' : notifications!.unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

function TimerCard({
  tasks,
  ownedPlantIds,
  onSessionComplete,
  onTaskCreated,
  onTaskUpdated,
}: {
  tasks: StudyTask[]
  ownedPlantIds: string[]
  onSessionComplete: (minutes: number, taskId: string, plantId: string | null) => void
  onTaskCreated: (task: StudyTask) => void
  onTaskUpdated: (task: StudyTask) => void
}) {
  const [minutes, setMinutes] = useState(tasks[0]?.durationMinutes ?? 45)
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(minutes * 60)
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? '')
  const [showAdd, setShowAdd] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customHours, setCustomHours] = useState(0)
  const [customMinutes, setCustomMinutes] = useState(45)
  const [plantId, setPlantId] = useState(ownedPlantIds[0] ?? '')
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskDuration, setNewTaskDuration] = useState('45')
  const [editingTaskId, setEditingTaskId] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const ownedPlants = plantCatalog.filter((plant) => ownedPlantIds.includes(plant.id))
  useEffect(() => {
    if (taskId && tasks.some((task) => task.id === taskId)) return
    const firstTask = tasks[0]
    setTaskId(firstTask?.id ?? '')
    if (firstTask) {
      setMinutes(firstTask.durationMinutes)
      setRemaining(firstTask.durationMinutes * 60)
    }
  }, [taskId, tasks])
  useEffect(() => {
    if (!ownedPlantIds.includes(plantId)) setPlantId(ownedPlantIds[0] ?? '')
  }, [ownedPlantIds, plantId])
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000)
    return () => window.clearInterval(id)
  }, [running])
  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false)
      onSessionComplete(minutes, taskId, plantId || null)
    }
  }, [minutes, onSessionComplete, plantId, remaining, running, taskId])
  const display =
    remaining >= 3600
      ? `${String(Math.floor(remaining / 3600)).padStart(2, '0')}:${String(Math.floor((remaining % 3600) / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
      : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
  const timerProgress = Math.max(0, Math.min(1, (minutes * 60 - remaining) / (minutes * 60)))
  const applyCustomTime = () => {
    const total = Math.max(1, Math.min(1439, customHours * 60 + customMinutes))
    setMinutes(total)
    setRemaining(total * 60)
    setShowCustom(false)
  }
  const saveTask = async () => {
    setSaving(true)
    setSaveError('')
    const taskInput = {
      name: newTaskName,
      durationMinutes: Number(newTaskDuration),
    }
    const result = editingTaskId
      ? await updateStudyTask({ id: editingTaskId, ...taskInput })
      : await createStudyTask(taskInput)
    setSaving(false)
    if (!result.success) {
      setSaveError(result.error)
      return
    }
    if (editingTaskId) onTaskUpdated(result.data)
    else onTaskCreated(result.data)
    setTaskId(result.data.id)
    setMinutes(result.data.durationMinutes)
    setRemaining(result.data.durationMinutes * 60)
    setEditingTaskId('')
    setNewTaskName('')
    setNewTaskDuration('45')
    setShowAdd(false)
  }
  return (
    <section className="mx-5 overflow-hidden rounded-[30px] bg-[#174d38] px-5 pb-5 pt-5 text-white shadow-[0_16px_36px_rgba(21,69,50,.18)]">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.19em] text-white/55">
            Phiên tập trung
          </p>
          <h2 className="mt-1 font-serif text-[22px] font-medium">
            {running ? 'Đang lớn lên...' : 'Sẵn sàng gieo hạt?'}
          </h2>
        </div>
        <div className="rounded-xl bg-white/10 p-2">
          <Icon name="leaf" size={20} />
        </div>
      </div>
      <div className="flex items-center justify-center py-2">
        <div
          className="timer-ring relative grid h-[184px] w-[184px] place-items-center rounded-full"
          style={{
            background: `conic-gradient(#d8b666 0deg ${timerProgress * 360}deg, rgba(255,255,255,.12) ${timerProgress * 360}deg 360deg)`,
          }}
        >
          <div className="absolute inset-[11px] rounded-full bg-[#174d38]" />
          <div className="relative z-10 text-center">
            <div
              className={`${remaining >= 3600 ? 'text-[31px]' : 'text-[40px]'} font-semibold tabular-nums tracking-[-.04em]`}
            >
              {display}
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[.16em] text-white/50">
              {remaining >= 3600 ? 'giờ : phút : giây' : 'phút : giây'}
            </p>
          </div>
        </div>
      </div>
      {!running && (
        <div className="mb-4">
          <div className="grid grid-cols-4 gap-2">
            {[25, 45, 60].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setMinutes(v)
                  setRemaining(v * 60)
                  setShowCustom(false)
                }}
                className={`rounded-xl py-2 text-[11px] font-semibold transition ${minutes === v && !showCustom ? 'bg-white text-[#174d38]' : 'bg-white/8 text-white/70'}`}
              >
                {v === 60 ? '1 giờ' : `${v} phút`}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`rounded-xl py-2 text-[11px] font-semibold transition ${showCustom ? 'bg-white text-[#174d38]' : 'bg-white/8 text-white/70'}`}
            >
              Tùy chỉnh
            </button>
          </div>
          {showCustom && (
            <div className="mt-2 flex items-end gap-2 rounded-2xl bg-white/10 p-3">
              <label className="min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-wider text-white/55">
                Giờ
                <input
                  value={customHours}
                  onChange={(e) =>
                    setCustomHours(Math.max(0, Math.min(23, Number(e.target.value))))
                  }
                  type="number"
                  min="0"
                  max="23"
                  className="mt-1.5 h-10 w-full rounded-xl bg-white/10 px-3 text-center text-sm font-bold text-white outline-none focus:bg-white/15"
                />
              </label>
              <span className="pb-3 text-white/40">:</span>
              <label className="min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-wider text-white/55">
                Phút
                <input
                  value={customMinutes}
                  onChange={(e) =>
                    setCustomMinutes(Math.max(0, Math.min(59, Number(e.target.value))))
                  }
                  type="number"
                  min="0"
                  max="59"
                  className="mt-1.5 h-10 w-full rounded-xl bg-white/10 px-3 text-center text-sm font-bold text-white outline-none focus:bg-white/15"
                />
              </label>
              <button
                onClick={applyCustomTime}
                className="grid h-10 w-11 place-items-center rounded-xl bg-[#d7b565] text-[#173e2f]"
                aria-label="Áp dụng thời gian"
              >
                <Icon name="check" size={18} />
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex overflow-hidden rounded-2xl bg-white/10">
        <label className="flex min-w-0 flex-[.8] items-center border-r border-white/10 px-3">
          <Icon name="leaf" size={15} className="mr-1.5 text-[#d7b565]" />
          <select
            disabled={running}
            value={plantId}
            onChange={(e) => setPlantId(e.target.value)}
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[11px] font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ownedPlants.length ? (
              ownedPlants.map((plant) => (
                <option className="text-[#173e2f]" key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))
            ) : (
              <option className="text-[#173e2f]" value="">
                Chưa có cây trong Khu vườn
              </option>
            )}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 items-center border-r border-white/10 px-3">
          <span className="mr-2 h-2 w-2 shrink-0 rounded-full bg-[#d7b565]" />
          <select
            disabled={running || tasks.length === 0}
            value={taskId}
            onChange={(e) => {
              const selectedTask = tasks.find((item) => item.id === e.target.value)
              setTaskId(e.target.value)
              if (selectedTask) {
                setMinutes(selectedTask.durationMinutes)
                setRemaining(selectedTask.durationMinutes * 60)
                setShowCustom(false)
              }
            }}
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[11px] font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tasks.length === 0 && (
              <option className="text-[#173e2f]" value="">
                Thêm môn học
              </option>
            )}
            {tasks.map((t) => (
              <option className="text-[#173e2f]" key={t.id} value={t.id}>
                {t.name} · {t.durationMinutes} phút
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={running}
          onClick={() => {
            if (!showAdd) {
              setEditingTaskId('')
              setNewTaskName('')
              setNewTaskDuration('45')
              setSaveError('')
            }
            setShowAdd(!showAdd)
          }}
          className="grid w-11 shrink-0 place-items-center border-r border-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Thêm môn học"
        >
          <Icon name={showAdd ? 'x' : 'plus'} size={17} />
        </button>
        <button
          disabled={!running && !taskId}
          onClick={() => {
            setShowAdd(false)
            if (!running && remaining === 0) setRemaining(minutes * 60)
            setRunning(!running)
          }}
          className="bg-[#d7b565] px-4 text-[11px] font-bold text-[#173e2f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? 'Tạm dừng' : remaining === 0 ? 'Phiên mới' : 'Bắt đầu'}
        </button>
      </div>
      {showAdd && !running && (
        <div className="mt-3 rounded-2xl bg-white/10 p-2">
          <p className="mb-2 px-1 text-[10px] font-bold text-white/75">
            {editingTaskId ? 'Chỉnh sửa task đã lưu' : 'Thêm task mới'}
          </p>
          <div className="grid grid-cols-[1fr_82px_44px] gap-2">
            <input
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              maxLength={50}
              className="min-w-0 rounded-xl bg-white/10 px-3 text-xs outline-none placeholder:text-white/45"
              placeholder="Tên môn học"
            />
            <label className="relative">
              <input
                value={newTaskDuration}
                onChange={(e) => setNewTaskDuration(e.target.value)}
                type="number"
                min="1"
                max="1440"
                className="h-10 w-full rounded-xl bg-white/10 px-2 pr-7 text-xs outline-none"
              />
              <span className="absolute right-2 top-3 text-[8px] text-white/45">ph</span>
            </label>
            <button
              disabled={saving}
              onClick={saveTask}
              className="grid h-10 place-items-center rounded-xl bg-[#d7b565] text-[#173e2f] disabled:opacity-50"
              aria-label={editingTaskId ? 'Lưu chỉnh sửa task' : 'Lưu task mới'}
            >
              <Icon name="check" size={17} />
            </button>
          </div>
          {saveError && <p className="px-1 pt-2 text-[10px] text-[#ffd0c7]">{saveError}</p>}
          {tasks.length > 0 && (
            <div className="mt-3 max-h-36 space-y-1 overflow-y-auto border-t border-white/10 pt-2">
              {tasks.map((savedTask) => (
                <div
                  key={savedTask.id}
                  className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-[10px]">
                    {savedTask.name} · {savedTask.durationMinutes} phút
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditingTaskId(savedTask.id)
                      setNewTaskName(savedTask.name)
                      setNewTaskDuration(String(savedTask.durationMinutes))
                      setSaveError('')
                    }}
                    className="rounded-lg bg-white/10 px-2 py-1 text-[9px] font-bold disabled:opacity-50"
                  >
                    Sửa
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function AppGroups({
  apps,
  onChange,
  onDetected,
  onWarn,
}: {
  apps: FocusApp[]
  onChange: (app: FocusApp) => void
  onDetected: (apps: FocusApp[]) => void
  onWarn: (type: 'yellow' | 'red', name: string) => void
}) {
  const [managing, setManaging] = useState(false)
  const [selectedId, setSelectedId] = useState(String(apps[0]?.id ?? ''))
  const [group, setGroup] = useState<FocusApp['group']>(apps[0]?.group ?? 'green')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [scanNote, setScanNote] = useState('')
  const groups = [
    { key: 'red', label: 'Đỏ', note: 'Chặn hoàn toàn', color: '#cf6757', bg: '#fff0ed' },
    { key: 'yellow', label: 'Vàng', note: 'Nhắc nhở', color: '#c89637', bg: '#fff7e6' },
    { key: 'green', label: 'Xanh', note: 'Được phép', color: '#4d8a69', bg: '#edf6ef' },
  ]
  const moveApp = async () => {
    setSaving(true)
    setError('')
    const result = await updateFocusAppGroup({ id: selectedId, group })
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    onChange(result.data)
  }
  const scanApps = async () => {
    setSaving(true)
    setError('')
    try {
      const result = await detectInstalledApps()
      setScanNote(result.note ?? '')
      if (!result.supported) return
      const detected = await syncDetectedApps(result.apps)
      onDetected(detected)
    } catch {
      setError('Chưa thể quét ứng dụng trên thiết bị.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <section className="px-5 pt-7">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold tracking-[-.02em] text-[#173e2f]">
          Vùng tập trung
        </h2>
        <div className="flex items-center gap-3">
          <button
            disabled={saving}
            onClick={scanApps}
            className="flex items-center gap-1 text-[11px] font-bold text-[#4d765f]"
          >
            <Icon name="scan" size={14} />
            Quét máy
          </button>
          <button
            onClick={() => setManaging(!managing)}
            className="text-[11px] font-bold text-[#4d765f]"
          >
            {managing ? 'Hoàn tất' : 'Tùy chỉnh'}
          </button>
        </div>
      </div>
      {scanNote && (
        <p className="mt-2 rounded-xl bg-[#edf3e9] px-3 py-2 text-[10px] leading-4 text-[#557163]">
          {scanNote}
        </p>
      )}
      {managing && (
        <div className="mt-3 rounded-[20px] border border-[#dfe7df] bg-white p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7c8b82]">
            Chuyển ứng dụng
          </p>
          <div className="flex overflow-hidden rounded-xl bg-[#f0f4ef]">
            <select
              value={selectedId}
              onChange={(e) => {
                const id = e.target.value
                setSelectedId(id)
                setGroup(apps.find((app) => String(app.id) === id)?.group ?? 'green')
              }}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-xs font-semibold outline-none"
            >
              {apps.map((app) => (
                <option key={app.id} value={String(app.id)}>
                  {app.name}
                </option>
              ))}
            </select>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as FocusApp['group'])}
              className="border-l border-[#dce4dc] bg-transparent px-2 py-3 text-[10px] font-bold outline-none"
            >
              <option value="red">Đỏ</option>
              <option value="yellow">Vàng</option>
              <option value="green">Xanh</option>
            </select>
            <button
              disabled={saving || !selectedId}
              onClick={moveApp}
              className="grid w-11 place-items-center bg-[#174d38] text-white disabled:opacity-50"
            >
              <Icon name="check" size={16} />
            </button>
          </div>
          <p className="mt-2 text-[9px] leading-4 text-[#87938c]">
            Mỗi ứng dụng chỉ xuất hiện trong một vùng màu.
          </p>
          {error && <p className="mt-1 text-[10px] text-[#b3574a]">{error}</p>}
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {groups.map((g, gi) => (
          <div
            key={g.label}
            className="rounded-[20px] border border-black/[.04] p-3"
            style={{ background: g.bg }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: g.color }}>
                {g.label}
              </span>
              <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
            </div>
            <p className="mb-3 text-[9px] leading-tight text-[#7b857f]">{g.note}</p>
            <div className="flex flex-wrap -space-x-1">
              {apps
                .filter((app) => app.group === g.key)
                .slice(0, 5)
                .map((app, i) => (
                  <button
                    key={app.id}
                    title={app.name}
                    onClick={() => gi < 2 && onWarn(gi === 0 ? 'red' : 'yellow', app.name)}
                    className="grid h-7 w-7 place-items-center rounded-lg border-2 border-white text-[9px] font-black text-white shadow-sm"
                    style={{ background: i % 2 ? g.color : '#315e69' }}
                  >
                    {app.name[0]?.toUpperCase()}
                  </button>
                ))}
              {apps.filter((app) => app.group === g.key).length === 0 && (
                <span className="text-[9px] text-[#8a968f]">Chưa quét</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="font-serif text-xl font-semibold tracking-[-.02em] text-[#173e2f]">{title}</h2>
  )
}

function Goals({
  goals,
  progress,
  tasks,
}: {
  goals: GoalSettingsView
  progress: FocusProgressView
  tasks: StudyTask[]
}) {
  const dailyHours = Math.floor(progress.dailyMinutes / 60)
  const dailyRemainder = progress.dailyMinutes % 60
  const dailyGoalHours = Math.floor(goals.dailyMinutes / 60)
  const dailyGoalRemainder = goals.dailyMinutes % 60
  const dailyPercent = Math.min(100, Math.round((progress.dailyMinutes / goals.dailyMinutes) * 100))
  return (
    <section className="px-5 pt-7">
      <SectionTitle title="Mục tiêu" />
      <div className="mt-3 rounded-[24px] border border-[#e5ebe4] bg-white p-4 shadow-[0_8px_26px_rgba(37,68,51,.05)]">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f1e8] text-[#2e684d]">
            <Icon name="target" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs">
              <b>Hôm nay</b>
              <span className="font-semibold text-[#557163]">
                {dailyHours}h {String(dailyRemainder).padStart(2, '0')} / {dailyGoalHours}h{' '}
                {dailyGoalRemainder ? String(dailyGoalRemainder).padStart(2, '0') : ''}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8ede8]">
              <div
                className="h-full rounded-full bg-[#39785a]"
                style={{ width: `${dailyPercent}%` }}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#edf0ec] pt-4">
          <div>
            <p className="text-[10px] text-[#8a968f]">Mục tiêu tháng</p>
            <b className="mt-1 block text-sm">
              {(progress.monthlyMinutes / 60).toFixed(1)} / {goals.monthlyHours} giờ
            </b>
          </div>
          <div>
            <p className="text-[10px] text-[#8a968f]">Task nổi bật</p>
            <b className="mt-1 block truncate text-sm">
              {tasks[0]?.name ?? 'Chưa có môn học'}
            </b>
          </div>
        </div>
      </div>
    </section>
  )
}

function Progress({
  progress,
  dailyGoalMinutes,
  streak,
}: {
  progress: FocusProgressView
  dailyGoalMinutes: number
  streak: number
}) {
  const history = progress.dailyHistory ?? []
  const weeklyGoalMinutes = dailyGoalMinutes * 7
  const weeklyCompletion = weeklyGoalMinutes
    ? Math.min(100, Math.round((progress.weeklyMinutes / weeklyGoalMinutes) * 100))
    : 0
  const maxMinutes = Math.max(dailyGoalMinutes, ...history.map((entry) => entry.minutes), 1)
  return (
    <section className="px-5 pb-8 pt-7">
      <SectionTitle title="Tiến độ 7 ngày" />
      <div className="mt-3 rounded-[24px] bg-[#eef3ed] p-4">
        <div className="flex h-[112px] items-end justify-between gap-2">
          {history.map((entry) => {
            const date = new Date(`${entry.date}T12:00:00+07:00`)
            const dayLabel = new Intl.DateTimeFormat('vi-VN', {
              weekday: 'short',
              timeZone: 'Asia/Ho_Chi_Minh',
            })
              .format(date)
              .replace('.', '')
            const barHeight = entry.minutes
              ? Math.max(6, Math.round((entry.minutes / maxMinutes) * 100))
              : 3
            return (
              <div
                key={entry.date}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                aria-label={`${dayLabel}: ${entry.minutes} phút`}
                title={`${dayLabel}: ${entry.minutes} phút`}
              >
                <div className="flex h-[80px] w-full items-end rounded-t-lg bg-white/70">
                  <div
                    className={`w-full rounded-t-lg ${
                      entry.minutes >= dailyGoalMinutes ? 'bg-[#174d38]' : 'bg-[#80a889]'
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                <span className="text-[9px] capitalize text-[#819087]">{dayLabel}</span>
              </div>
            )
          })}
        </div>
        {!progress.weeklyMinutes && (
          <p className="mt-3 text-center text-[10px] text-[#819087]">
            Hoàn thành một phiên để bắt đầu biểu đồ.
          </p>
        )}
        <div className="mt-4 grid grid-cols-3 divide-x divide-[#d6dfd6] text-center">
          <div>
            <b className="font-serif text-lg">{(progress.weeklyMinutes / 60).toFixed(1)}h</b>
            <p className="mt-1 text-[9px] text-[#819087]">7 ngày qua</p>
          </div>
          <div>
            <b className="font-serif text-lg">{weeklyCompletion}%</b>
            <p className="mt-1 text-[9px] text-[#819087]">Mục tiêu tuần</p>
          </div>
          <div>
            <b className="font-serif text-lg">{streak}</b>
            <p className="mt-1 text-[9px] text-[#819087]">Ngày streak</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Home({
  apps,
  goals,
  focusProgress,
  name,
  streak,
  ownedPlantIds,
  onAppChanged,
  onAppsDetected,
  onSessionComplete,
  onTaskCreated,
  onTaskUpdated,
  tasks,
  onWarn,
}: {
  apps: FocusApp[]
  goals: GoalSettingsView
  focusProgress: FocusProgressView
  name: string
  streak: number
  ownedPlantIds: string[]
  onAppChanged: (app: FocusApp) => void
  onAppsDetected: (apps: FocusApp[]) => void
  onSessionComplete: (minutes: number, taskId: string, plantId: string | null) => void
  onTaskCreated: (task: StudyTask) => void
  onTaskUpdated: (task: StudyTask) => void
  tasks: StudyTask[]
  onWarn: (type: 'yellow' | 'red', name: string) => void
}) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Chào buổi sáng,' : hour < 18 ? 'Chào buổi chiều,' : 'Chào buổi tối,'
  return (
    <>
      <Header />
      <div className="px-5 pb-3">
        <p className="text-xs text-[#829087]">{greeting}</p>
        <h1 className="font-serif text-[29px] font-semibold tracking-[-.04em] text-[#173e2f]">
          {name}
        </h1>
      </div>
      <TimerCard
        tasks={tasks}
        ownedPlantIds={ownedPlantIds}
        onSessionComplete={onSessionComplete}
        onTaskCreated={onTaskCreated}
        onTaskUpdated={onTaskUpdated}
      />
      <AppGroups apps={apps} onChange={onAppChanged} onDetected={onAppsDetected} onWarn={onWarn} />
      <Goals goals={goals} progress={focusProgress} tasks={tasks} />
      <Progress progress={focusProgress} dailyGoalMinutes={goals.dailyMinutes} streak={streak} />
    </>
  )
}

function Ranking({ ranking }: { ranking: RankingView }) {
  const current = ranking.current
  const medals = [
    'bg-[#f7df9b] text-[#76510c]',
    'bg-[#dce3e1] text-[#4f625b]',
    'bg-[#e7c2a2] text-[#794421]',
  ]
  return (
    <>
      <Header title="Bảng xếp hạng" subtitle="TOP 100 NGƯỜI GIEO RỪNG" />
      <section className="px-5 pb-10">
        {current && (
          <div className="overflow-hidden rounded-[28px] bg-[#174d38] p-5 text-white shadow-[0_16px_34px_rgba(23,77,56,.2)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/55">
                  Vị trí hiện tại
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <b className="font-serif text-4xl">#{current.rank}</b>
                  <span className="mb-1 rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold">
                    {current.tier}
                  </span>
                </div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d7b565] text-[#173e2f]">
                <Icon name="trophy" size={25} />
              </div>
            </div>
            <div className="mt-5 flex justify-between text-[10px]">
              <span>{current.focusMinutes.toLocaleString('vi-VN')} phút tập trung</span>
              <span>
                {current.nextTier
                  ? `Còn ${current.minutesToNext.toLocaleString('vi-VN')} phút đến ${current.nextTier}`
                  : 'Đã đạt cấp cao nhất'}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#d7b565]"
                style={{ width: `${current.progress}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-5 rounded-[24px] bg-[#eef3ed] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold">Lộ trình cấp bậc</h2>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#7d8b83]">
              Tổng thời gian
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ranking.tiers.map((tier, index) => (
              <div
                key={tier.name}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 ${current?.tier === tier.name ? 'bg-[#174d38] text-white' : 'bg-white text-[#315140]'}`}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-black ${current?.tier === tier.name ? 'bg-[#d7b565] text-[#173e2f]' : 'bg-[#e5eee4]'}`}
                >
                  {index + 1}
                </span>
                <div>
                  <b className="block text-[11px]">{tier.name}</b>
                  <span
                    className={`text-[8px] ${current?.tier === tier.name ? 'text-white/60' : 'text-[#8b968f]'}`}
                  >
                    {tier.minMinutes === 0
                      ? 'Khởi đầu'
                      : `${(tier.minMinutes / 60).toLocaleString('vi-VN')} giờ`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 items-end gap-2">
          {[ranking.top[1], ranking.top[0], ranking.top[2]].map(
            (entry, index) =>
              entry && (
                <article
                  key={entry.id}
                  className={`rounded-[22px] border border-[#e3e9e2] bg-white px-2 pb-4 pt-3 text-center shadow-sm ${index === 1 ? 'min-h-[164px]' : 'min-h-[146px]'}`}
                >
                  <span
                    className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-sm font-black ${medals[index === 1 ? 0 : index === 0 ? 1 : 2]}`}
                  >
                    {entry.rank}
                  </span>
                  <div className="mx-auto mt-3 grid h-11 w-11 place-items-center rounded-full bg-[#e5efe4] font-bold text-[#285b43]">
                    {entry.name
                      .split(/\s+/)
                      .slice(-2)
                      .map((part) => part[0])
                      .join('')}
                  </div>
                  <h3 className="mt-2 truncate text-xs font-bold">{entry.name}</h3>
                  <p className="mt-1 text-[9px] text-[#89958d]">
                    {entry.focusMinutes.toLocaleString('vi-VN')} phút
                  </p>
                </article>
              ),
          )}
        </div>
        <div className="mt-5 overflow-hidden rounded-[24px] border border-[#e5ebe4] bg-white">
          {ranking.top.slice(3).map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 border-b border-[#eef1ed] px-4 py-3 last:border-0 ${current?.id === entry.id ? 'bg-[#edf5ea]' : ''}`}
            >
              <span className="w-7 text-center text-xs font-black text-[#75847b]">
                {entry.rank}
              </span>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#edf2ec] text-[10px] font-bold text-[#416650]">
                {entry.name
                  .split(/\s+/)
                  .slice(-2)
                  .map((part) => part[0])
                  .join('')}
              </div>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-xs">{entry.name}</b>
                <span className="text-[9px] text-[#8b968f]">
                  {entry.tier} · {entry.streak} ngày
                </span>
              </div>
              <b className="text-[10px] text-[#315f49]">
                {entry.focusMinutes.toLocaleString('vi-VN')}p
              </b>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

const plantCatalog = [
  { id: 'morning_sprout', name: 'Mầm ban mai', price: 250, variant: 1, vip: false, rare: false },
  { id: 'green_pine', name: 'Tùng xanh', price: 480, variant: 0, vip: false, rare: false },
  { id: 'silver_leaf', name: 'Lá bạc', price: 700, variant: 2, vip: false, rare: false },
  { id: 'night_sakura', name: 'Sakura đêm', price: 0, variant: 3, vip: true, rare: true },
  { id: 'golden_ancient', name: 'Cổ thụ vàng', price: 0, variant: 1, vip: true, rare: true },
  { id: 'aurora_forest', name: 'Rừng cực quang', price: 0, variant: 2, vip: true, rare: true },
] as const

function Garden({
  ownedPlantIds,
  favoritePlantIds,
  onToggleFavorite,
}: {
  ownedPlantIds: string[]
  favoritePlantIds: string[]
  onToggleFavorite: (plantId: string) => Promise<void>
}) {
  const [filter, setFilter] = useState('Tất cả')
  const [pendingPlantId, setPendingPlantId] = useState('')
  const ownedPlants = plantCatalog.filter((plant) => ownedPlantIds.includes(plant.id))
  const visiblePlants =
    filter === 'Hiếm'
      ? ownedPlants.filter((plant) => plant.rare)
      : filter === 'Yêu thích'
        ? ownedPlants.filter((plant) => favoritePlantIds.includes(plant.id))
        : ownedPlants
  return (
    <>
      <Header title="Khu vườn" subtitle="BỘ SƯU TẬP CỦA BẠN" />
      <section className="px-5 pb-8">
        <div className="relative mt-1 overflow-hidden rounded-[28px] bg-[#174d38] p-5 text-white">
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-[.18em] text-white/55">Khu rừng của bạn</p>
            <div className="mt-2 font-serif text-3xl">{ownedPlants.length} cây</div>
            <p className="mt-1 text-xs text-white/60">Cây đã mua sẽ được lưu trong tài khoản</p>
          </div>
          <div className="absolute -bottom-6 right-1">
            <Tree size={125} variant={1} />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          {['Tất cả', 'Hiếm', 'Yêu thích'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${filter === f ? 'bg-[#174d38] text-white' : 'bg-[#edf1ec] text-[#6b7b72]'}`}
            >
              {f}
            </button>
          ))}
        </div>
        {visiblePlants.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
          {visiblePlants.map((plant) => (
            <article
              key={plant.id}
              className="relative overflow-hidden rounded-[24px] border border-[#e5ebe4] bg-white p-3 text-center shadow-[0_5px_18px_rgba(38,67,51,.04)]"
            >
              <button
                type="button"
                aria-label={
                  favoritePlantIds.includes(plant.id)
                    ? `Bỏ ${plant.name} khỏi yêu thích`
                    : `Đánh dấu ${plant.name} yêu thích`
                }
                aria-pressed={favoritePlantIds.includes(plant.id)}
                disabled={Boolean(pendingPlantId)}
                onClick={async () => {
                  setPendingPlantId(plant.id)
                  try {
                    await onToggleFavorite(plant.id)
                  } finally {
                    setPendingPlantId('')
                  }
                }}
                className={`absolute left-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-sm disabled:opacity-60 ${
                  favoritePlantIds.includes(plant.id) ? 'text-[#d06a56]' : 'text-[#8b978f]'
                }`}
              >
                <Icon
                  name="star"
                  size={17}
                  className={favoritePlantIds.includes(plant.id) ? 'fill-current' : ''}
                />
              </button>
              {plant.rare && (
                <span className="absolute right-2 top-2 rounded-full bg-[#f7e8c6] px-2 py-1 text-[8px] font-bold text-[#9a6b25]">
                  HIẾM
                </span>
              )}
              <div className="mx-auto grid h-28 place-items-center rounded-[18px] bg-[#f0f4ed]">
                <Tree size={95} variant={plant.variant} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-[#214b39]">{plant.name}</h3>
              <p className="mt-1 text-[10px] text-[#8a968f]">Đã sở hữu</p>
            </article>
          ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#819087]">
            {filter === 'Yêu thích'
              ? 'Bạn chưa đánh dấu cây yêu thích.'
              : filter === 'Hiếm' && ownedPlants.length > 0
                ? 'Khu vườn chưa có cây hiếm.'
                : 'Chưa có cây trong bộ sưu tập. Ghé cửa hàng để mua cây đầu tiên nhé.'}
          </p>
        )}
      </section>
    </>
  )
}

function Shop({
  onVip,
  wallet,
  onWalletChange,
  onNotify,
  onNotificationsChanged,
}: {
  onVip: () => void
  wallet: WalletView
  onWalletChange: (wallet: WalletView) => void
  onNotify: (message: string) => void
  onNotificationsChanged: () => void
}) {
  const [tab, setTab] = useState<'coin' | 'vip'>('coin')
  const [pendingId, setPendingId] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')
  const buyPlant = async (plantId: string) => {
    setPendingId(plantId)
    setError('')
    const result = await purchasePlant(plantId)
    setPendingId('')
    if (!result.success) {
      setError(result.error)
      return
    }
    onWalletChange(result.data.wallet)
    onNotificationsChanged()
    onNotify(`Đã mua ${result.data.plant.name}! Cây đã được thêm vào khu vườn.`)
  }
  const claimReward = async () => {
    setClaiming(true)
    setError('')
    const result = await claimDailyReward()
    setClaiming(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    onWalletChange(result.data.wallet)
    onNotificationsChanged()
    onNotify(`Đã nhận ${result.data.reward} Xu điểm danh hôm nay!`)
  }
  return (
    <>
      <Header title="Cửa hàng" subtitle="ƯƠM MẦM MỚI" />
      <section className="px-5 pb-8">
        <div className="flex items-center justify-between rounded-[24px] bg-[#eaf1e8] p-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#75877c]">Số dư hiện tại</p>
            <div className="mt-1 flex items-center gap-2 text-xl font-bold text-[#214b39]">
              <Icon name="coin" size={20} className="text-[#c68f35]" />{' '}
              {wallet.balance.toLocaleString('vi-VN')} Xu
            </div>
          </div>
          <button
            disabled={claiming || wallet.dailyRewardClaimed}
            onClick={claimReward}
            className="rounded-xl bg-white px-3 py-2 text-[10px] font-bold text-[#315f49] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {wallet.dailyRewardClaimed ? 'Đã nhận hôm nay' : claiming ? 'Đang nhận...' : 'Nhận 200 Xu'}
          </button>
        </div>
        <div className="my-5 grid grid-cols-2 rounded-2xl bg-[#edf1ec] p-1">
          {[
            ['coin', 'Bằng Xu'],
            ['vip', 'Đặc biệt VIP'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k as 'coin' | 'vip')}
              className={`rounded-xl py-2.5 text-xs font-bold ${tab === k ? 'bg-white text-[#174d38] shadow-sm' : 'text-[#7c8981]'}`}
            >
              {l}
            </button>
          ))}
        </div>
        {tab === 'vip' && (
          <div className="relative mb-4 overflow-hidden rounded-[24px] bg-[#173f31] p-5 text-white">
            <div className="relative z-10 max-w-[220px]">
              <span className="text-[9px] font-bold tracking-[.18em] text-[#dbc274]">
                FOCUST VIP
              </span>
              <h3 className="mt-2 font-serif text-2xl">Mở khóa khu rừng diệu kỳ</h3>
              <button
                onClick={onVip}
                className="mt-4 rounded-xl bg-[#dbc274] px-4 py-2.5 text-[10px] font-bold text-[#173f31]"
              >
                Khám phá gói VIP
              </button>
            </div>
            <div className="absolute -bottom-5 -right-1">
              <Tree size={115} variant={3} />
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-[#fff0ed] px-3 py-2 text-xs text-[#b3574a]">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {plantCatalog
            .filter((plant) => (tab === 'vip' ? plant.vip : !plant.vip))
            .map((plant) => {
              const owned = wallet.ownedPlantIds.includes(plant.id)
              return (
              <article key={plant.id} className="rounded-[23px] border border-[#e4eae3] bg-white p-3">
                <div className="relative grid h-28 place-items-center rounded-[17px] bg-[#f1f4ee]">
                  <Tree size={90} variant={plant.variant} />
                  {plant.vip && (
                    <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-[#a3762e]">
                      <Icon name="lock" size={13} />
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#214b39]">{plant.name}</h3>
                <button
                  disabled={pendingId === plant.id || owned}
                  onClick={() => (plant.vip ? onVip() : void buyPlant(plant.id))}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-[#eef3ed] py-2 text-[10px] font-bold text-[#37634d] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {plant.vip ? (
                    'Mở bằng VIP'
                  ) : owned ? (
                    'Đã sở hữu'
                  ) : pendingId === plant.id ? (
                    'Đang mua...'
                  ) : (
                    <>
                      <Icon name="coin" size={13} className="text-[#bd8936]" />
                      {plant.price} Xu
                    </>
                  )}
                </button>
              </article>
              )
            })}
        </div>
      </section>
    </>
  )
}

function Account({
  onLogout,
  onVip,
  user,
  wallet,
  goals,
  notificationSettings,
  onProfileUpdated,
  onGoalsUpdated,
  onNotificationSettingsUpdated,
}: {
  onLogout: () => void
  onVip: () => void
  user: AppUserView
  wallet: WalletView
  goals: GoalSettingsView
  notificationSettings: NotificationSettingsView
  onProfileUpdated: (user: AppUserView) => void
  onGoalsUpdated: (goals: GoalSettingsView) => void
  onNotificationSettingsUpdated: (settings: NotificationSettingsView) => void
}) {
  const [activeSection, setActiveSection] = useState<AccountSection | null>(null)
  const initials = user.name
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  if (activeSection) {
    return (
      <AccountDetail
        section={activeSection}
        user={user}
        goals={goals}
        notificationSettings={notificationSettings}
        onBack={() => setActiveSection(null)}
        onProfileUpdated={onProfileUpdated}
        onGoalsUpdated={onGoalsUpdated}
        onNotificationSettingsUpdated={onNotificationSettingsUpdated}
      />
    )
  }
  return (
    <>
      <Header title="Tài khoản" subtitle="KHÔNG GIAN CỦA BẠN" />
      <section className="px-5 pb-10">
        <div className="flex items-center gap-4 rounded-[26px] bg-white p-4 shadow-[0_8px_28px_rgba(35,66,49,.06)]">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#dcebdd] font-serif text-2xl font-bold text-[#275a43]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl font-semibold">{user.name}</h2>
            <p className="truncate text-xs text-[#839087]">
              @{user.username} · {user.email}
            </p>
            <span className="mt-2 inline-block rounded-full bg-[#edf3e9] px-2 py-1 text-[9px] font-bold text-[#4e745f]">
              THÀNH VIÊN XANH
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[22px] bg-[#fff6e7] p-4">
            <Icon name="coin" className="text-[#b9812e]" />
            <b className="mt-3 block text-lg">{wallet.balance.toLocaleString('vi-VN')}</b>
            <p className="text-[9px] text-[#8c816d]">Số dư Xu</p>
          </div>
          <div className="rounded-[22px] bg-[#eaf2e8] p-4">
            <Icon name="clock" className="text-[#3f7258]" />
            <b className="mt-3 block text-lg">{Math.floor(user.focusMinutes / 60)}h</b>
            <p className="text-[9px] text-[#748279]">Tập trung</p>
          </div>
          <div className="rounded-[22px] bg-[#fff2dc] p-4">
            <Icon name="flame" className="text-[#b36a2e]" />
            <b className="mt-3 block text-lg">{user.streak}</b>
            <p className="text-[9px] text-[#8c694d]">Ngày liên tục</p>
          </div>
        </div>
        <button
          onClick={onVip}
          className="relative mt-4 flex w-full items-center overflow-hidden rounded-[24px] bg-[#173f31] p-5 text-left text-white"
        >
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d4b663] text-[#173f31]">
            <Icon name="shield" />
          </div>
          <div className="ml-3 flex-1">
            <b className="font-serif text-lg">Nâng cấp Focust VIP</b>
            <p className="text-[10px] text-white/55">Mở khóa cây hiếm và báo cáo sâu</p>
          </div>
          <Icon name="chevron" size={18} />
        </button>
        <div className="mt-5 overflow-hidden rounded-[22px] border border-[#e5ebe4] bg-white">
          {[
            ['profile', 'Hồ sơ cá nhân', 'user'],
            ['goals', 'Mục tiêu học tập', 'target'],
            ['devices', 'Thiết bị IoT', 'shield'],
            ['notifications', 'Cài đặt thông báo', 'bell'],
          ].map(([section, title, icon]) => (
              <button
                key={section}
                onClick={() => setActiveSection(section as AccountSection)}
                className="flex w-full items-center border-b border-[#eef1ed] px-4 py-4 text-left text-sm last:border-0"
              >
                <span className="mr-3 grid h-8 w-8 place-items-center rounded-xl bg-[#f0f4ef] text-[#4d715e]">
                  <Icon name={icon as IconName} size={16} />
                </span>
                <span className="flex-1 font-semibold text-[#315140]">{title}</span>
                <Icon name="chevron" size={16} className="text-[#9aa49e]" />
              </button>
            ))}
        </div>
        <button
          onClick={onLogout}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#efd9d5] py-4 text-sm font-bold text-[#b3574a]"
        >
          <Icon name="logout" size={18} />
          Đăng xuất
        </button>
        <p className="mt-5 text-center text-[9px] text-[#a0aaa4]">
          Focust v1.0.0 · Đồng bộ với Forest Pot
        </p>
      </section>
    </>
  )
}

function AccountDetail({
  section,
  user,
  goals,
  notificationSettings,
  onBack,
  onProfileUpdated,
  onGoalsUpdated,
  onNotificationSettingsUpdated,
}: {
  section: AccountSection
  user: AppUserView
  goals: GoalSettingsView
  notificationSettings: NotificationSettingsView
  onBack: () => void
  onProfileUpdated: (user: AppUserView) => void
  onGoalsUpdated: (goals: GoalSettingsView) => void
  onNotificationSettingsUpdated: (settings: NotificationSettingsView) => void
}) {
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [dailyMinutes, setDailyMinutes] = useState(String(goals.dailyMinutes))
  const [monthlyHours, setMonthlyHours] = useState(String(goals.monthlyHours))
  const [settings, setSettings] = useState(notificationSettings)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const title = {
    profile: 'Hồ sơ cá nhân',
    goals: 'Mục tiêu học tập',
    devices: 'Thiết bị IoT',
    notifications: 'Cài đặt thông báo',
  }[section]

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')
    if (section === 'profile') {
      const result = await updateAccountProfile({ name, username })
      setPending(false)
      if (!result.success) {
        setError(result.error)
        return
      }
      onProfileUpdated(result.data)
      onBack()
      return
    }
    if (section === 'goals') {
      const result = await updateGoalSettings({
        dailyMinutes: Number(dailyMinutes),
        monthlyHours: Number(monthlyHours),
      })
      setPending(false)
      if (!result.success) {
        setError(result.error)
        return
      }
      onGoalsUpdated(result.data)
      onBack()
      return
    }
    if (section === 'notifications') {
      const result = await updateNotificationSettings(settings)
      setPending(false)
      if (!result.success) {
        setError(result.error)
        return
      }
      onNotificationSettingsUpdated(result.data)
      onBack()
    }
  }

  return (
    <>
      <Header title={title} subtitle="TÀI KHOẢN" />
      <section className="px-5 pb-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-xs font-bold text-[#557163]"
        >
          <Icon name="arrow" size={16} />
          Quay lại tài khoản
        </button>
        {section === 'devices' ? (
          <div className="rounded-[24px] border border-[#e5ebe4] bg-white p-5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf3e9] text-[#3d7055]">
              <Icon name="shield" size={22} />
            </div>
            <h2 className="mt-4 font-serif text-lg font-semibold">Chưa kết nối thiết bị</h2>
            <p className="mt-2 text-sm leading-6 text-[#748279]">
              Tích hợp thiết bị thật đang chờ thông tin hãng, model và giao thức kết nối (Wi-Fi,
              Bluetooth/BLE hoặc MQTT). Khi có thông tin, có thể nối thiết bị tại đây.
            </p>
            <p className="mt-4 rounded-xl bg-[#f2f5ef] p-3 text-xs leading-5 text-[#6d7f73]">
              Việc quét ứng dụng trên điện thoại trong mục Home không phải chức năng kết nối IoT.
            </p>
          </div>
        ) : (
          <form
            onSubmit={save}
            className="space-y-4 rounded-[24px] border border-[#e5ebe4] bg-white p-5"
          >
            {section === 'profile' && (
              <>
                <label className="block text-xs font-semibold text-[#557163]">
                  Họ và tên
                  <input
                    className="mt-2 h-12 w-full rounded-xl border border-[#dfe7df] px-3 text-sm text-[#173e2f] outline-none focus:border-[#4f8068] focus:ring-4 focus:ring-[#e5efe5]"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    maxLength={50}
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-[#557163]">
                  Tên đăng nhập
                  <input
                    className="mt-2 h-12 w-full rounded-xl border border-[#dfe7df] px-3 text-sm text-[#173e2f] outline-none focus:border-[#4f8068] focus:ring-4 focus:ring-[#e5efe5]"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    minLength={3}
                    maxLength={24}
                    pattern="[A-Za-z0-9._\\-]+"
                    required
                  />
                </label>
                <div className="text-xs text-[#8a968f]">
                  Email đăng nhập: <span className="font-semibold">{user.email}</span>
                </div>
              </>
            )}
            {section === 'goals' && (
              <>
                <label className="block text-xs font-semibold text-[#557163]">
                  Mục tiêu mỗi ngày (phút)
                  <input
                    className="mt-2 h-12 w-full rounded-xl border border-[#dfe7df] px-3 text-sm text-[#173e2f] outline-none focus:border-[#4f8068] focus:ring-4 focus:ring-[#e5efe5]"
                    type="number"
                    min={15}
                    max={1440}
                    step={15}
                    value={dailyMinutes}
                    onChange={(event) => setDailyMinutes(event.target.value)}
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-[#557163]">
                  Mục tiêu mỗi tháng (giờ)
                  <input
                    className="mt-2 h-12 w-full rounded-xl border border-[#dfe7df] px-3 text-sm text-[#173e2f] outline-none focus:border-[#4f8068] focus:ring-4 focus:ring-[#e5efe5]"
                    type="number"
                    min={1}
                    max={744}
                    value={monthlyHours}
                    onChange={(event) => setMonthlyHours(event.target.value)}
                    required
                  />
                </label>
              </>
            )}
            {section === 'notifications' && (
              <>
                {([
                  ['focusRewards', 'Phiên tập trung và Xu thưởng'],
                  ['dailyRewards', 'Quà điểm danh hằng ngày'],
                  ['shopUpdates', 'Mua cây và cập nhật cửa hàng'],
                ] as const).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f7f3] px-3 py-3 text-sm text-[#315140]"
                  >
                    {label}
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(event) =>
                        setSettings((current) => ({ ...current, [key]: event.target.checked }))
                      }
                      className="h-5 w-5 accent-[#174d38]"
                    />
                  </label>
                ))}
                <p className="rounded-xl bg-[#fff7e6] p-3 text-xs leading-5 text-[#8a6a2c]">
                  Đây là thông báo trong ứng dụng. Push khi ứng dụng đóng cần cấu hình FCM/APNs và
                  Web Push; Supabase hiện chỉ lưu dữ liệu.
                </p>
              </>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-[#fff0ed] px-3 py-2 text-xs text-[#b3574a]">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="h-12 w-full rounded-xl bg-[#174d38] text-sm font-bold text-white disabled:opacity-55"
            >
              {pending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        )}
      </section>
    </>
  )
}

function BottomNav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const items: [Page, IconName, string][] = [
    ['home', 'home', 'Home'],
    ['ranking', 'trophy', 'Xếp hạng'],
    ['garden', 'leaf', 'Index'],
    ['shop', 'store', 'Shop'],
    ['account', 'user', 'Tài khoản'],
  ]
  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-[#e8ece7] bg-white/95 px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      {items.map(([p, i, l]) => (
        <button
          key={p}
          onClick={() => setPage(p)}
          className={`flex flex-col items-center gap-1 py-1 text-[8px] font-semibold ${page === p ? 'text-[#174d38]' : 'text-[#94a099]'}`}
        >
          <span
            className={`grid h-8 w-11 place-items-center rounded-full ${page === p ? 'bg-[#e2ede2]' : ''}`}
          >
            <Icon name={i} size={18} />
          </span>
          {l}
        </button>
      ))}
    </nav>
  )
}

function AppNotice({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3500)
    return () => window.clearTimeout(timer)
  }, [message, onClose])
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 top-[calc(1rem+env(safe-area-inset-top))] z-[70] mx-auto flex max-w-[420px] items-center gap-3 rounded-2xl bg-[#174d38] px-4 py-3 text-sm font-semibold text-white shadow-xl"
    >
      <Icon name="check" size={18} className="shrink-0 text-[#d8bb64]" />
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng thông báo"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  )
}

function WarningModal({
  type,
  app,
  onClose,
}: {
  type: 'yellow' | 'red'
  app: string
  onClose: () => void
}) {
  const red = type === 'red'
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#112d23]/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-[30px] bg-[#fbfcf9] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${red ? 'bg-[#fde9e5] text-[#bc574a]' : 'bg-[#fff3da] text-[#b37a24]'}`}
        >
          {red ? <Tree size={58} variant={0} muted /> : <Icon name="clock" size={28} />}
        </div>
        <div className="mt-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9aa39d]">
            {red ? 'Vùng đỏ' : 'Vùng vàng'}
          </p>
          <h2 className="mt-2 font-serif text-[26px] font-semibold text-[#173e2f]">
            {red ? 'Cây đang héo dần' : 'Bạn thật sự muốn rời đi?'}
          </h2>
          <p className="mx-auto mt-2 max-w-[310px] text-sm leading-6 text-[#758079]">
            {red
              ? `Bạn vừa mở ${app}. Quay lại tập trung ngay để bảo vệ cây non của mình.`
              : `${app} có thể làm gián đoạn phiên học. Hãy dành một nhịp để nhớ lại mục tiêu hôm nay.`}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="rounded-2xl bg-[#174d38] py-3.5 text-xs font-bold text-white"
          >
            Dừng lại
          </button>
          <button
            onClick={onClose}
            className="rounded-2xl border border-[#e0e5df] bg-white py-3.5 text-xs font-bold text-[#6f7b74]"
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  )
}

function VipModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#112d23]/60 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] overflow-hidden rounded-[30px] bg-[#173f31] p-6 text-white"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10"
        >
          <Icon name="x" size={17} />
        </button>
        <div className="absolute -right-5 top-2 opacity-80">
          <Tree size={150} variant={3} />
        </div>
        <p className="text-[10px] font-bold tracking-[.2em] text-[#d8bb64]">FOCUST VIP</p>
        <h2 className="relative mt-3 max-w-[230px] font-serif text-3xl leading-tight">
          Khu rừng không giới hạn
        </h2>
        <div className="relative mt-7 space-y-3">
          {['Mở toàn bộ cây hiếm', 'Thống kê học tập chuyên sâu', 'Đồng bộ nhiều thiết bị IoT'].map(
            (x) => (
              <div key={x} className="flex items-center gap-3 text-xs">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[#d8bb64]">
                  <Icon name="check" size={14} />
                </span>
                {x}
              </div>
            ),
          )}
        </div>
        <button className="relative mt-6 w-full rounded-2xl bg-[#d8bb64] py-4 text-sm font-bold text-[#173f31]">
          Nâng cấp · 59.000đ / tháng
        </button>
      </div>
    </div>
  )
}

function NotificationCenter({
  notifications,
  onClose,
  onRead,
  onReadAll,
}: {
  notifications: AppNotificationView[]
  onClose: () => void
  onRead: (id: string) => void
  onReadAll: () => void
}) {
  const unreadCount = notifications.filter((notification) => !notification.read).length
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/35"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] w-full max-w-[460px] flex-col rounded-t-[28px] bg-[#f8faf6] pb-[max(16px,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e6ebe5] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[.18em] text-[#839087]">CẬP NHẬT</p>
            <h2 id="notifications-title" className="mt-1 text-lg font-bold text-[#173e2f]">
              Thông báo
            </h2>
          </div>
          <button
            type="button"
            disabled={!unreadCount}
            onClick={onReadAll}
            className="text-xs font-semibold text-[#4f8068] disabled:text-[#aeb8b0]"
          >
            Đánh dấu đã đọc
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {notifications.length ? (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => !notification.read && onRead(notification.id)}
                  className={`w-full rounded-2xl border p-4 text-left ${
                    notification.read
                      ? 'border-[#e8ece7] bg-white'
                      : 'border-[#d7e5d7] bg-[#eff6ed]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        notification.read ? 'bg-transparent' : 'bg-[#4f8068]'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-[#244b38]">
                        {notification.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#6f7e74]">
                        {notification.message}
                      </span>
                      <time
                        className="mt-2 block text-[10px] text-[#9aa59d]"
                        dateTime={notification.createdAt}
                      >
                        {new Date(notification.createdAt).toLocaleString('vi-VN')}
                      </time>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center text-center text-sm text-[#839087]">
              Bạn chưa có thông báo nào.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default function FocustApp() {
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AppUserView | null>(null)
  const [wallet, setWallet] = useState<WalletView | null>(null)
  const [authPage, setAuthPage] = useState<AuthPage>('login')
  const [page, setPage] = useState<Page>('home')
  const [warning, setWarning] = useState<{ type: 'yellow' | 'red'; app: string } | null>(null)
  const [vip, setVip] = useState(false)
  const [notice, setNotice] = useState('')
  const [tasks, setTasks] = useState<StudyTask[]>([])
  const [apps, setApps] = useState<FocusApp[]>([])
  const [ranking, setRanking] = useState<RankingView | null>(null)
  const [goals, setGoals] = useState<GoalSettingsView>({ dailyMinutes: 180, monthlyHours: 60 })
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsView>({
    focusRewards: true,
    dailyRewards: true,
    shopUpdates: true,
  })
  const [notifications, setNotifications] = useState<AppNotificationView[]>([])
  const [favoritePlantIds, setFavoritePlantIds] = useState<string[]>([])
  const [focusProgress, setFocusProgress] =
    useState<FocusProgressView>(normalizeFocusProgress())
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const loadData = useCallback(async () => {
    try {
      const data = await getBootstrap()
      setUser(data.user)
      setWallet(data.wallet)
      setTasks(data.tasks)
      setApps(data.apps)
      setRanking(data.ranking)
      setGoals(data.goals ?? { dailyMinutes: 180, monthlyHours: 60 })
      setNotificationSettings(
        data.notificationSettings ?? { focusRewards: true, dailyRewards: true, shopUpdates: true },
      )
      setNotifications(data.notifications ?? [])
      setFocusProgress(normalizeFocusProgress(data.focusProgress))
      setFavoritePlantIds(data.favoritePlantIds ?? [])
      setAuthed(true)
    } catch {
      await logoutAppUser()
      setAuthed(false)
      setUser(null)
      setWallet(null)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    if (hasSupabaseSession()) void loadData()
    else setLoading(false)
  }, [loadData])
  const refreshNotifications = useCallback(async () => {
    try {
      setNotifications(await getNotifications())
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Chưa thể tải thông báo.')
    }
  }, [])
  const completeSession = useCallback(
    async (minutes: number, taskId: string, plantId: string | null) => {
      try {
        const result = await recordFocusSession({ minutes, taskId, plantId })
        setUser(result.profile)
        setRanking(result.ranking)
        setWallet(result.wallet)
        setFocusProgress(normalizeFocusProgress(result.focusProgress))
        void refreshNotifications()
        setNotice(
          result.coinsAdded > 0
            ? `Hoàn thành phiên học! Bạn nhận ${result.coinsAdded} Xu.`
            : 'Đã lưu phiên học. Cần tập trung đủ 25 phút để nhận Xu.',
        )
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Chưa thể lưu phiên học.')
      }
    },
    [refreshNotifications],
  )
  const markRead = useCallback(async (id: string) => {
    try {
      setNotifications(await markNotificationRead(id))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Chưa thể cập nhật thông báo.')
    }
  }, [])
  const markReadAll = useCallback(async () => {
    try {
      setNotifications(await markAllNotificationsRead())
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Chưa thể cập nhật thông báo.')
    }
  }, [])
  const toggleFavoritePlant = useCallback(
    async (plantId: string) => {
      const nextFavoriteIds = favoritePlantIds.includes(plantId)
        ? favoritePlantIds.filter((id) => id !== plantId)
        : [...favoritePlantIds, plantId]
      const result = await updateFavoritePlants(nextFavoriteIds)
      if (!result.success) {
        setNotice(result.error)
        return
      }
      setFavoritePlantIds(result.data)
      setNotice(
        result.data.includes(plantId)
          ? 'Đã thêm cây vào danh sách yêu thích.'
          : 'Đã bỏ cây khỏi danh sách yêu thích.',
      )
    },
    [favoritePlantIds],
  )
  const body = useMemo(
    () =>
      page === 'home' ? (
        <Home
          apps={apps}
          goals={goals}
          focusProgress={focusProgress}
          name={user?.name ?? ''}
          streak={user?.streak ?? 0}
          ownedPlantIds={wallet?.ownedPlantIds ?? []}
          tasks={tasks}
          onAppChanged={(changed) =>
            setApps((current) => current.map((app) => (app.id === changed.id ? changed : app)))
          }
          onAppsDetected={setApps}
          onSessionComplete={completeSession}
          onTaskCreated={(task) => setTasks((current) => [...current, task])}
          onTaskUpdated={(updatedTask) =>
            setTasks((current) =>
              current.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
            )
          }
          onWarn={(type, app) => setWarning({ type, app })}
        />
      ) : page === 'ranking' && ranking ? (
        <Ranking ranking={ranking} />
      ) : page === 'garden' ? (
        <Garden
          ownedPlantIds={wallet?.ownedPlantIds ?? []}
          favoritePlantIds={favoritePlantIds}
          onToggleFavorite={toggleFavoritePlant}
        />
      ) : page === 'shop' ? (
        wallet ? (
          <Shop
            wallet={wallet}
            onWalletChange={setWallet}
            onNotify={setNotice}
            onNotificationsChanged={refreshNotifications}
            onVip={() => setVip(true)}
          />
        ) : (
          <>
            <Header title="Cửa hàng" subtitle="ƯƠM MẦM MỚI" />
            <section className="px-5">
              <p role="alert" className="rounded-2xl bg-[#fff0ed] p-4 text-sm text-[#9e4c42]">
                Cửa hàng cần cập nhật database và Edge Function Supabase trước khi sử dụng.
              </p>
            </section>
          </>
        )
      ) : user ? (
        <Account
          user={user}
          wallet={wallet ?? { balance: 0, ownedPlantIds: [], dailyRewardClaimed: false }}
          goals={goals}
          notificationSettings={notificationSettings}
          onProfileUpdated={(profile) => {
            setUser(profile)
            setNotice('Hồ sơ đã được cập nhật.')
          }}
          onGoalsUpdated={(nextGoals) => {
            setGoals(nextGoals)
            setNotice('Mục tiêu học tập đã được cập nhật.')
          }}
          onNotificationSettingsUpdated={(settings) => {
            setNotificationSettings(settings)
            setNotice('Cài đặt thông báo đã được cập nhật.')
          }}
          onLogout={async () => {
            await logoutAppUser()
            setUser(null)
            setWallet(null)
            setAuthed(false)
          }}
          onVip={() => setVip(true)}
        />
      ) : null,
    [
      apps,
      completeSession,
      focusProgress,
      favoritePlantIds,
      goals,
      notificationSettings,
      page,
      ranking,
      refreshNotifications,
      tasks,
      toggleFavoritePlant,
      user,
      wallet,
    ],
  )
  const notificationContext = useMemo(
    () => ({
      unreadCount: notifications.filter((notification) => !notification.read).length,
      streak: user?.streak ?? 0,
      onOpen: () => setNotificationsOpen(true),
    }),
    [notifications, user?.streak],
  )
  if (loading)
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#edf1ed] text-[#174d38]">
        <div className="text-center">
          <AppLogo />
          <p className="mt-4 text-xs text-[#7d8c83]">Đang kết nối Supabase...</p>
        </div>
      </main>
    )
  if (!authed || !user)
    return (
      <AuthScreen
        page={authPage}
        setPage={setAuthPage}
        onAuthenticated={() => {
          setLoading(true)
          void loadData()
          setPage('home')
        }}
      />
    )
  return (
    <NotificationContext.Provider value={notificationContext}>
      <main className="min-h-[100dvh] bg-[#edf1ed] text-[#173e2f]">
        <div className="app-shell mx-auto min-h-[100dvh] max-w-[460px] bg-[#f8faf6] shadow-2xl">
          <div className="min-h-[calc(100dvh-70px)]">{body}</div>
          <BottomNav page={page} setPage={setPage} />
        </div>
        {notice && <AppNotice message={notice} onClose={() => setNotice('')} />}
        {warning && <WarningModal {...warning} onClose={() => setWarning(null)} />}
        {vip && <VipModal onClose={() => setVip(false)} />}
        {notificationsOpen && (
          <NotificationCenter
            notifications={notifications}
            onClose={() => setNotificationsOpen(false)}
            onRead={(id) => void markRead(id)}
            onReadAll={() => void markReadAll()}
          />
        )}
      </main>
    </NotificationContext.Provider>
  )
}
