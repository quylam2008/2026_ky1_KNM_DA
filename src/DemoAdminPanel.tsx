'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  getDemoAccount,
  getDemoAccounts,
  updateDemoAccount,
  type DemoAccountView,
  type DemoAccountSummaryView,
  type RankingView,
} from './supabase-api'

const plants = [
  { id: 'morning_sprout', name: 'Mầm ban mai' },
  { id: 'green_pine', name: 'Tùng xanh' },
  { id: 'silver_leaf', name: 'Lá bạc' },
]
const vipPlants = [
  { id: 'night_sakura', name: 'Sakura đêm' },
  { id: 'golden_ancient', name: 'Cổ thụ vàng' },
  { id: 'aurora_forest', name: 'Rừng cực quang' },
]

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-[#dfe7df] bg-white px-3 text-sm text-[#173e2f] outline-none focus:border-[#4f8068] focus:ring-4 focus:ring-[#e5efe5]'
const labelClass = 'block text-xs font-semibold text-[#557163]'

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className={labelClass}>
      {label}
      {children}
    </label>
  )
}

export default function DemoAdminPanel({
  onUpdated,
}: {
  onUpdated: (result: { account: DemoAccountView; ranking: RankingView }) => void
}) {
  const [accounts, setAccounts] = useState<DemoAccountSummaryView[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [account, setAccount] = useState<DemoAccountView | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [taskName, setTaskName] = useState('')
  const [taskDuration, setTaskDuration] = useState('45')
  const [appIdentifier, setAppIdentifier] = useState('')
  const [appName, setAppName] = useState('')
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationCategory, setNotificationCategory] =
    useState<DemoAccountView['notifications'][number]['category']>('system')

  useEffect(() => {
    let active = true
    getDemoAccounts()
      .then(({ accounts: items }) => {
        if (!active) return
        setAccounts(items)
        if (items[0]) setSelectedId(items[0].id)
        else setLoading(false)
      })
      .catch((loadError) => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Chưa thể tải tài khoản demo.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    setLoading(true)
    setError('')
    getDemoAccount(selectedId)
      .then(({ account: result }) => {
        if (active) setAccount(result)
      })
      .catch((loadError) => {
        if (active) {
          setAccount(null)
          setError(loadError instanceof Error ? loadError.message : 'Chưa thể tải tài khoản demo.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedId])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!account || !selectedId) return
    setPending(true)
    setError('')
    const result = await updateDemoAccount(selectedId, account)
    setPending(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setAccount(result.data.account)
    setAccounts((current) =>
      current.map((item) =>
        item.id === result.data.account.user.id
          ? {
              ...item,
              name: result.data.account.user.name,
              username: result.data.account.user.username,
            }
          : item,
      ),
    )
    onUpdated(result.data)
  }

  const updateAccount = (update: (current: DemoAccountView) => DemoAccountView) =>
    setAccount((current) => (current ? update(current) : current))

  const addTask = () => {
    const name = taskName.trim()
    const durationMinutes = Number(taskDuration)
    if (!account || name.length < 2 || !Number.isInteger(durationMinutes)) return
    updateAccount((current) => ({
      ...current,
      tasks: [...current.tasks, { id: crypto.randomUUID(), name, durationMinutes }],
    }))
    setTaskName('')
  }

  const addApp = () => {
    const identifier = appIdentifier.trim()
    const name = appName.trim()
    if (!account || !identifier || !name) return
    if (account.apps.some((app) => app.id === identifier || app.identifier === identifier)) {
      setError('Mã ứng dụng này đã có trong danh sách.')
      return
    }
    updateAccount((current) => ({
      ...current,
      apps: [
        ...current.apps,
        { id: identifier, identifier, name, platform: 'android', group: 'green' },
      ],
    }))
    setAppIdentifier('')
    setAppName('')
    setError('')
  }

  const addNotification = () => {
    const title = notificationTitle.trim()
    const message = notificationMessage.trim()
    if (!account || !title || !message) return
    updateAccount((current) => ({
      ...current,
      notifications: [
        {
          id: crypto.randomUUID(),
          category: notificationCategory,
          title,
          message,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...current.notifications,
      ].slice(0, 50),
    }))
    setNotificationTitle('')
    setNotificationMessage('')
  }

  if (loading) {
    return <p className="rounded-2xl bg-white p-5 text-sm text-[#748279]">Đang tải dữ liệu demo...</p>
  }

  if (!accounts.length) {
    return (
      <p className="rounded-2xl bg-white p-5 text-sm leading-6 text-[#748279]">
        Chưa có tài khoản trong danh sách demo. Hãy kiểm tra secret DEMO_USER_IDS.
      </p>
    )
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-4 rounded-[24px] border border-[#e5ebe4] bg-white p-5">
        <p className="rounded-xl bg-[#fff7e6] p-3 text-xs leading-5 text-[#8a6a2c]">
          Chọn tài khoản demo để chỉnh dữ liệu trong ứng dụng. Email và mật khẩu đăng nhập không
          được thay đổi.
        </p>
        <Field label="Tài khoản demo">
          <select
            className={inputClass}
            value={selectedId}
            onChange={(event) => {
              setAccount(null)
              setSelectedId(event.target.value)
            }}
          >
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} (@{item.username})
              </option>
            ))}
          </select>
        </Field>
        {account && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tên hiển thị">
                <input
                  className={inputClass}
                  value={account.user.name}
                  minLength={2}
                  maxLength={50}
                  onChange={(event) =>
                    updateAccount((current) => ({
                      ...current,
                      user: { ...current.user, name: event.target.value },
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Tên đăng nhập">
                <input
                  className={inputClass}
                  value={account.user.username}
                  minLength={3}
                  maxLength={24}
                  pattern="[A-Za-z0-9._\-]+"
                  onChange={(event) =>
                    updateAccount((current) => ({
                      ...current,
                      user: { ...current.user, username: event.target.value },
                    }))
                  }
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tổng thời gian tập trung (phút)">
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  max={2000000000}
                  value={account.user.focusMinutes}
                  onChange={(event) =>
                    updateAccount((current) => ({
                      ...current,
                      user: { ...current.user, focusMinutes: Number(event.target.value) },
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Streak (ngày)">
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  max={36500}
                  value={account.user.streak}
                  onChange={(event) =>
                    updateAccount((current) => ({
                      ...current,
                      user: { ...current.user, streak: Number(event.target.value) },
                    }))
                  }
                  required
                />
              </Field>
            </div>
            <label className="flex items-center justify-between rounded-xl bg-[#f5f7f3] px-3 py-3 text-sm font-semibold text-[#315140]">
              Kích hoạt VIP
              <input
                type="checkbox"
                checked={account.user.isVip === true}
                onChange={(event) =>
                  updateAccount((current) => ({
                    ...current,
                    user: { ...current.user, isVip: event.target.checked },
                    favoritePlantIds: event.target.checked
                      ? current.favoritePlantIds
                      : current.favoritePlantIds.filter(
                          (id) => !vipPlants.some((plant) => plant.id === id),
                        ),
                  }))
                }
                className="h-5 w-5 accent-[#174d38]"
              />
            </label>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-xs font-semibold text-[#557163]">
                Lịch sử tập trung 7 ngày gần nhất (phút)
              </legend>
              {account.focusProgress.dailyHistory.map((entry, index) => (
                <label
                  key={entry.date}
                  className="flex items-center justify-between gap-3 text-xs font-medium text-[#557163]"
                >
                  {new Intl.DateTimeFormat('vi-VN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    timeZone: 'Asia/Ho_Chi_Minh',
                  }).format(new Date(`${entry.date}T12:00:00+07:00`))}
                  <input
                    className="h-10 w-24 rounded-xl border border-[#dfe7df] px-3 text-right text-sm text-[#173e2f] outline-none focus:border-[#4f8068]"
                    type="number"
                    min={0}
                    max={1440}
                    value={entry.minutes}
                    onChange={(event) =>
                      updateAccount((current) => ({
                        ...current,
                        focusProgress: {
                          ...current.focusProgress,
                          dailyHistory: current.focusProgress.dailyHistory.map((day, dayIndex) =>
                            dayIndex === index
                              ? { ...day, minutes: Number(event.target.value) }
                              : day,
                          ),
                        },
                      }))
                    }
                    required
                  />
                </label>
              ))}
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mục tiêu ngày (phút)">
                <input
                  className={inputClass}
                  type="number"
                  min={15}
                  max={1440}
                  value={account.goals.dailyMinutes}
                  onChange={(event) =>
                    updateAccount((current) => ({
                      ...current,
                      goals: { ...current.goals, dailyMinutes: Number(event.target.value) },
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Mục tiêu tháng (giờ)">
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={744}
                  value={account.goals.monthlyHours}
                  onChange={(event) =>
                    updateAccount((current) => ({
                      ...current,
                      goals: { ...current.goals, monthlyHours: Number(event.target.value) },
                    }))
                  }
                  required
                />
              </Field>
            </div>
            <Field label="Số dư Xu">
              <input
                className={inputClass}
                type="number"
                min={0}
                max={2000000000}
                value={account.wallet.balance}
                onChange={(event) =>
                  updateAccount((current) => ({
                    ...current,
                    wallet: { ...current.wallet, balance: Number(event.target.value) },
                  }))
                }
                required
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-semibold text-[#557163]">Cây đã sở hữu</legend>
              {plants.map((plant) => (
                <label
                  key={plant.id}
                  className="flex items-center justify-between rounded-xl bg-[#f5f7f3] px-3 py-3 text-sm text-[#315140]"
                >
                  {plant.name}
                  <input
                    type="checkbox"
                    checked={account.wallet.ownedPlantIds.includes(plant.id)}
                    onChange={(event) =>
                      updateAccount((current) => {
                        const owned = new Set(current.wallet.ownedPlantIds)
                        if (event.target.checked) owned.add(plant.id)
                        else owned.delete(plant.id)
                        const ownedPlantIds = [...owned]
                        return {
                          ...current,
                          wallet: { ...current.wallet, ownedPlantIds },
                          favoritePlantIds: current.favoritePlantIds.filter((id) =>
                            ownedPlantIds.includes(id),
                          ),
                        }
                      })
                    }
                    className="h-5 w-5 accent-[#174d38]"
                  />
                </label>
              ))}
            </fieldset>
            <label className="flex items-center justify-between rounded-xl bg-[#f5f7f3] px-3 py-3 text-sm text-[#315140]">
              Đã nhận quà điểm danh hôm nay
              <input
                type="checkbox"
                checked={account.wallet.dailyRewardClaimed}
                onChange={(event) =>
                  updateAccount((current) => ({
                    ...current,
                    wallet: { ...current.wallet, dailyRewardClaimed: event.target.checked },
                  }))
                }
                className="h-5 w-5 accent-[#174d38]"
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-semibold text-[#557163]">
                Cây yêu thích
              </legend>
              {[...plants, ...(account.user.isVip ? vipPlants : [])]
                .filter(
                  (plant) =>
                    account.wallet.ownedPlantIds.includes(plant.id) ||
                    (account.user.isVip === true &&
                      vipPlants.some((vipPlant) => vipPlant.id === plant.id)),
                )
                .map((plant) => (
                  <label
                    key={plant.id}
                    className="flex items-center justify-between rounded-xl bg-[#f5f7f3] px-3 py-3 text-sm text-[#315140]"
                  >
                    {plant.name}
                    <input
                      type="checkbox"
                      checked={account.favoritePlantIds.includes(plant.id)}
                      onChange={(event) =>
                        updateAccount((current) => ({
                          ...current,
                          favoritePlantIds: event.target.checked
                            ? [...current.favoritePlantIds, plant.id]
                            : current.favoritePlantIds.filter((id) => id !== plant.id),
                        }))
                      }
                      className="h-5 w-5 accent-[#174d38]"
                    />
                  </label>
                ))}
            </fieldset>
          </>
        )}
      </div>

      {account && (
        <>
          <section className="space-y-3 rounded-[24px] border border-[#e5ebe4] bg-white p-5">
            <h3 className="font-serif text-base font-semibold text-[#173e2f]">Môn học / nhiệm vụ</h3>
            {account.tasks.map((task, index) => (
              <div key={task.id} className="grid grid-cols-[1fr_80px_36px] items-center gap-2">
                <input
                  className={inputClass}
                  value={task.name}
                  aria-label="Tên môn học"
                  onChange={(event) =>
                    updateAccount((current) => ({
                      ...current,
                      tasks: current.tasks.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name: event.target.value } : item,
                      ),
                    }))
                  }
                  required
                />
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={1440}
                  value={task.durationMinutes}
                  aria-label="Thời lượng môn học"
                  onChange={(event) =>
                    updateAccount((current) => ({
                      ...current,
                      tasks: current.tasks.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, durationMinutes: Number(event.target.value) }
                          : item,
                      ),
                    }))
                  }
                  required
                />
                <button
                  type="button"
                  className="h-9 rounded-lg bg-[#fff0ed] text-sm font-bold text-[#b3574a]"
                  aria-label="Xóa môn học"
                  onClick={() =>
                    updateAccount((current) => ({
                      ...current,
                      tasks: current.tasks.filter((item) => item.id !== task.id),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_80px_72px] items-end gap-2">
              <Field label="Thêm môn học">
                <input
                  className={inputClass}
                  value={taskName}
                  maxLength={50}
                  onChange={(event) => setTaskName(event.target.value)}
                />
              </Field>
              <Field label="Phút">
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={1440}
                  value={taskDuration}
                  onChange={(event) => setTaskDuration(event.target.value)}
                />
              </Field>
              <button
                type="button"
                onClick={addTask}
                className="h-11 rounded-xl bg-[#eaf2e8] text-xs font-bold text-[#315140]"
              >
                Thêm
              </button>
            </div>
          </section>

          <section className="space-y-3 rounded-[24px] border border-[#e5ebe4] bg-white p-5">
            <h3 className="font-serif text-base font-semibold text-[#173e2f]">Ứng dụng bị giới hạn</h3>
            {account.apps.map((app, index) => (
              <div key={app.id} className="space-y-2 rounded-xl bg-[#f5f7f3] p-3">
                <input
                  className="h-10 w-full rounded-lg border border-[#dfe7df] bg-white px-3 text-sm"
                  value={app.name}
                  maxLength={80}
                  aria-label={`Tên ứng dụng ${app.name}`}
                  onChange={(event) =>
                    updateAccount((current) => ({
                      ...current,
                      apps: current.apps.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name: event.target.value } : item,
                      ),
                    }))
                  }
                  required
                />
                <div className="flex items-center gap-2">
                  <select
                    className="h-10 min-w-0 flex-1 rounded-lg border border-[#dfe7df] bg-white px-2 text-xs"
                    value={app.platform}
                    aria-label={`Nền tảng ứng dụng ${app.name}`}
                    onChange={(event) =>
                      updateAccount((current) => ({
                        ...current,
                        apps: current.apps.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, platform: event.target.value as typeof item.platform }
                            : item,
                        ),
                      }))
                    }
                  >
                    <option value="android">Android</option>
                    <option value="ios">iOS</option>
                  </select>
                  <select
                    className="h-10 min-w-0 flex-1 rounded-lg border border-[#dfe7df] bg-white px-2 text-xs"
                    value={app.group}
                    aria-label={`Nhóm ứng dụng ${app.name}`}
                    onChange={(event) =>
                      updateAccount((current) => ({
                        ...current,
                        apps: current.apps.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, group: event.target.value as typeof item.group }
                            : item,
                        ),
                      }))
                    }
                  >
                    <option value="red">Đỏ - chặn</option>
                    <option value="yellow">Vàng - cảnh báo</option>
                    <option value="green">Xanh - cho phép</option>
                  </select>
                  <button
                    type="button"
                    className="h-9 w-8 shrink-0 rounded-lg bg-[#fff0ed] text-sm font-bold text-[#b3574a]"
                    aria-label={`Xóa ${app.name}`}
                    onClick={() =>
                      updateAccount((current) => ({
                        ...current,
                        apps: current.apps.filter((item) => item.id !== app.id),
                      }))
                    }
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Mã ứng dụng">
                <input
                  className={inputClass}
                  value={appIdentifier}
                  maxLength={180}
                  onChange={(event) => setAppIdentifier(event.target.value)}
                />
              </Field>
              <Field label="Tên ứng dụng">
                <input
                  className={inputClass}
                  value={appName}
                  maxLength={80}
                  onChange={(event) => setAppName(event.target.value)}
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={addApp}
              className="h-10 w-full rounded-xl bg-[#eaf2e8] text-xs font-bold text-[#315140]"
            >
              Thêm ứng dụng Android
            </button>
          </section>

          <section className="space-y-3 rounded-[24px] border border-[#e5ebe4] bg-white p-5">
            <h3 className="font-serif text-base font-semibold text-[#173e2f]">Thông báo</h3>
            {account.notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 rounded-xl bg-[#f5f7f3] p-3"
              >
                <div className="flex min-w-0 flex-1 items-start gap-2 text-xs text-[#315140]">
                  <input
                    type="checkbox"
                    checked={notification.read}
                    aria-label="Đã đọc"
                    onChange={(event) =>
                      updateAccount((current) => ({
                        ...current,
                        notifications: current.notifications.map((item) =>
                          item.id === notification.id
                            ? { ...item, read: event.target.checked }
                            : item,
                        ),
                      }))
                    }
                    className="mt-0.5 h-4 w-4 accent-[#174d38]"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      className="h-9 w-full rounded-lg border border-[#dfe7df] bg-white px-2 text-xs"
                      value={notification.title}
                      maxLength={120}
                      aria-label="Tiêu đề thông báo"
                      onChange={(event) =>
                        updateAccount((current) => ({
                          ...current,
                          notifications: current.notifications.map((item) =>
                            item.id === notification.id
                              ? { ...item, title: event.target.value }
                              : item,
                          ),
                        }))
                      }
                      required
                    />
                    <textarea
                      className="min-h-16 w-full rounded-lg border border-[#dfe7df] bg-white p-2 text-xs leading-5"
                      value={notification.message}
                      maxLength={500}
                      aria-label="Nội dung thông báo"
                      onChange={(event) =>
                        updateAccount((current) => ({
                          ...current,
                          notifications: current.notifications.map((item) =>
                            item.id === notification.id
                              ? { ...item, message: event.target.value }
                              : item,
                          ),
                        }))
                      }
                      required
                    />
                    <select
                      className="h-9 rounded-lg border border-[#dfe7df] bg-white px-2 text-xs"
                      value={notification.category}
                      aria-label="Loại thông báo"
                      onChange={(event) =>
                        updateAccount((current) => ({
                          ...current,
                          notifications: current.notifications.map((item) =>
                            item.id === notification.id
                              ? {
                                  ...item,
                                  category: event.target
                                    .value as typeof item.category,
                                }
                              : item,
                          ),
                        }))
                      }
                    >
                      <option value="focus">Tập trung</option>
                      <option value="daily">Điểm danh</option>
                      <option value="shop">Cửa hàng</option>
                      <option value="system">Hệ thống</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm font-bold text-[#b3574a]"
                  aria-label="Xóa thông báo"
                  onClick={() =>
                    updateAccount((current) => ({
                      ...current,
                      notifications: current.notifications.filter(
                        (item) => item.id !== notification.id,
                      ),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Loại thông báo">
                <select
                  className={inputClass}
                  value={notificationCategory}
                  onChange={(event) =>
                    setNotificationCategory(
                      event.target.value as typeof notificationCategory,
                    )
                  }
                >
                  <option value="focus">Tập trung</option>
                  <option value="daily">Điểm danh</option>
                  <option value="shop">Cửa hàng</option>
                  <option value="system">Hệ thống</option>
                </select>
              </Field>
              <Field label="Tiêu đề">
                <input
                  className={inputClass}
                  value={notificationTitle}
                  maxLength={120}
                  onChange={(event) => setNotificationTitle(event.target.value)}
                />
              </Field>
            </div>
            <Field label="Nội dung thông báo">
              <input
                className={inputClass}
                value={notificationMessage}
                maxLength={500}
                onChange={(event) => setNotificationMessage(event.target.value)}
              />
            </Field>
            <button
              type="button"
              onClick={addNotification}
              className="h-10 w-full rounded-xl bg-[#eaf2e8] text-xs font-bold text-[#315140]"
            >
              Thêm thông báo
            </button>
          </section>

          <section className="space-y-3 rounded-[24px] border border-[#e5ebe4] bg-white p-5">
            <h3 className="font-serif text-base font-semibold text-[#173e2f]">Cài đặt thông báo</h3>
            {([
              ['focusRewards', 'Phiên tập trung và Xu thưởng'],
              ['dailyRewards', 'Quà điểm danh hằng ngày'],
              ['shopUpdates', 'Cửa hàng'],
            ] as const).map(([key, title]) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-xl bg-[#f5f7f3] px-3 py-3 text-sm text-[#315140]"
              >
                {title}
                <input
                  type="checkbox"
                  checked={account.notificationSettings[key]}
                  onChange={(event) =>
                    updateAccount((current) => ({
                      ...current,
                      notificationSettings: {
                        ...current.notificationSettings,
                        [key]: event.target.checked,
                      },
                    }))
                  }
                  className="h-5 w-5 accent-[#174d38]"
                />
              </label>
            ))}
          </section>
        </>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-[#fff0ed] px-3 py-2 text-xs text-[#b3574a]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || loading || !account}
        className="h-12 w-full rounded-xl bg-[#174d38] text-sm font-bold text-white disabled:opacity-55"
      >
        {pending ? 'Đang lưu...' : 'Lưu toàn bộ dữ liệu'}
      </button>
    </form>
  )
}
