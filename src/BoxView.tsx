import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

interface BoxState {
  user_id?: string
  signal_color: 'idle' | 'green' | 'yellow' | 'red'
  tree_state: 'seed' | 'growing' | 'completed' | 'withered'
  model_key: string
  progress_percent: number
}

const TREE_INFO: Record<string, { name: string; color: string; emoji: string }> = {
  tree_sprout: { name: 'Cây Mầm Xanh', color: '#4ade80', emoji: '🌱' },
  tree_pine: { name: 'Cây Thông Noel', color: '#22c55e', emoji: '🌲' },
  tree_sakura: { name: 'Cây Hoa Anh Đào', color: '#f472b6', emoji: '🌸' },
  tree_crystal_vip: { name: 'Cây Pha Lê Hoàng Kim (VIP)', color: '#38bdf8', emoji: '💎' },
  tree_dragon_vip: { name: 'Cây Rồng Cổ Thụ (VIP)', color: '#facc15', emoji: '🐉' },
}

export default function BoxView() {
  const [box, setBox] = useState<BoxState>({
    signal_color: 'idle',
    tree_state: 'seed',
    model_key: 'tree_sprout',
    progress_percent: 0,
  })
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const uidFromUrl = params.get('uid')

    async function loadInitialBox() {
      if (uidFromUrl) {
        const { data } = await supabase
          .from('box_status')
          .select('*')
          .eq('user_id', uidFromUrl)
          .single()
        if (data) setBox(data as BoxState)
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) {
        const { data } = await supabase
          .from('box_status')
          .select('*')
          .eq('user_id', authData.user.id)
          .single()
        if (data) setBox(data as BoxState)
        return
      }

      // Nếu mở trực tiếp /box trên thiết bị phụ không đăng nhập, lấy bản ghi mới nhất
      const { data } = await supabase
        .from('box_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      if (data) setBox(data as BoxState)
    }

    loadInitialBox()

    // Lắng nghe thay đổi Realtime từ bảng box_status trên Supabase
    const channel = supabase
      .channel('box_3d_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'box_status' },
        (payload) => {
          const newRow = payload.new as BoxState
          if (!newRow) return
          if (uidFromUrl && newRow.user_id !== uidFromUrl) return
          setBox(newRow)
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const signalStyles = {
    idle: {
      border: 'border-cyan-500/50 shadow-[0_0_60px_rgba(6,182,212,0.3)]',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      label: 'CHẾ ĐỘ CHỜ (IDLE)',
      ledColor: '#06b6d4',
    },
    green: {
      border: 'border-emerald-500 shadow-[0_0_90px_rgba(16,185,129,0.7)]',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400',
      label: 'TÍN HIỆU XANH • ĐANG TẬP TRUNG',
      ledColor: '#10b981',
    },
    yellow: {
      border: 'border-amber-400 shadow-[0_0_90px_rgba(251,191,36,0.8)] animate-pulse',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400',
      label: 'TÍN HIỆU VÀNG • CẢNH BÁO XAO NHÃNG',
      ledColor: '#f59e0b',
    },
    red: {
      border: 'border-rose-600 shadow-[0_0_100px_rgba(225,29,72,0.9)]',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500',
      label: 'TÍN HIỆU ĐỎ • THẤT BẠI / CÂY HÉO',
      ledColor: '#e11d48',
    },
  }

  const currentSignal = signalStyles[box.signal_color] || signalStyles.idle
  const treeMeta = TREE_INFO[box.model_key] || TREE_INFO.tree_sprout

  // Tính kích thước cây theo tiến độ (0% -> 100%)
  const scaleValue =
    box.tree_state === 'seed'
      ? 0.65
      : box.tree_state === 'completed'
      ? 1.25
      : box.tree_state === 'withered'
      ? 0.85
      : 0.7 + (box.progress_percent / 100) * 0.5

  return (
    <div
      className={`min-h-screen bg-black text-white flex flex-col items-center justify-between p-6 border-[10px] transition-all duration-500 ${currentSignal.border}`}
    >
      {/* Thanh trạng thái LED trên cùng */}
      <div className="w-full max-w-md flex items-center justify-between">
        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${currentSignal.badge}`}>
          {currentSignal.label}
        </span>
        <span className="text-xs text-neutral-400 flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              connected ? 'bg-emerald-400 animate-ping' : 'bg-neutral-600'
            }`}
          />
          {connected ? 'Realtime Online' : 'Đang kết nối...'}
        </span>
      </div>

      {/* Khu vực chiếu cây 3D Hologram (Nền đen tuyệt đối để phản chiếu qua lăng kính) */}
      <div className="relative flex flex-col items-center justify-center my-auto">
        {/* Vòng sáng 3D dưới gốc cây */}
        <div
          className="w-64 h-64 rounded-full flex items-center justify-center relative transition-all duration-700"
          style={{
            background: `radial-gradient(circle, ${
              box.tree_state === 'withered' ? '#7f1d1d44' : `${treeMeta.color}33`
            } 0%, transparent 70%)`,
          }}
        >
          {/* Vòng quỹ đạo Hologram */}
          <div
            className="absolute inset-4 rounded-full border border-dashed animate-spin"
            style={{
              animationDuration: '14s',
              borderColor: box.tree_state === 'withered' ? '#ef444466' : `${treeMeta.color}66`,
            }}
          />

          {/* Hình ảnh cây 3D thay đổi theo trạng thái */}
          <div
            className="transition-all duration-700 flex flex-col items-center select-none"
            style={{
              transform: `scale(${scaleValue}) ${
                box.tree_state === 'withered' ? 'rotate(18deg)' : 'rotate(0deg)'
              }`,
              filter:
                box.tree_state === 'withered'
                  ? 'grayscale(90%) brightness(0.65)'
                  : `drop-shadow(0 0 25px ${treeMeta.color})`,
            }}
          >
            <span className="text-8xl leading-none">
              {box.tree_state === 'withered'
                ? '🥀'
                : box.tree_state === 'seed'
                ? '🌰'
                : treeMeta.emoji}
            </span>
          </div>
        </div>

        {/* Thông tin trạng thái cây */}
        <div className="text-center mt-6 space-y-1">
          <h2 className="text-xl font-bold tracking-wide text-white">{treeMeta.name}</h2>
          <p className="text-sm text-neutral-400">
            {box.tree_state === 'seed' && 'Sẵn sàng gieo hạt trên điện thoại...'}
            {box.tree_state === 'growing' && `Đang phát triển: ${box.progress_percent}%`}
            {box.tree_state === 'completed' && 'Hoàn thành! Cây đã trưởng thành 100%'}
            {box.tree_state === 'withered' && 'Cây đã héo do mở ứng dụng vi phạm!'}
          </p>
        </div>
      </div>

      {/* Thanh tiến độ & Tín hiệu phần cứng dưới đáy */}
      <div className="w-full max-w-md space-y-3">
        <div className="w-full bg-neutral-900 rounded-full h-3 overflow-hidden border border-neutral-800">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${box.progress_percent}%`,
              backgroundColor: currentSignal.ledColor,
            }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
          <span>LED_SIGNAL: {box.signal_color.toUpperCase()}</span>
          <span>STATE: {box.tree_state.toUpperCase()}</span>
          <span>PROGRESS: {box.progress_percent}%</span>
        </div>
      </div>
    </div>
  )
}