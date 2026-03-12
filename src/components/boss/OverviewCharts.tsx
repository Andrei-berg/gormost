'use client'
import type { Request, Service } from '@/types'
import { STATUS_CONFIG, SERVICE_META, PRIORITY_CONFIG } from '@/types'

interface Stats {
  total: number
  byStatus: Record<string, number>
  byService: Record<string, number>
  byPriority: Record<string, number>
}

interface Props {
  stats: Stats
  services: Service[]
  requests: Request[]
}

// ──────────────────────────────────────────────
// Donut Chart (SVG ring)
// ──────────────────────────────────────────────
function DonutChart({ data, centerLabel, centerValue }: {
  data: { label: string; value: number; color: string }[]
  centerLabel: string
  centerValue: string | number
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const cx = 75, cy = 75, r = 56, sw = 17
  const C = 2 * Math.PI * r

  // precompute segments with dashoffset
  const segments: { color: string; segLen: number; offset: number }[] = []
  let cumulative = 0
  for (const d of data) {
    if (!d.value || !total) { cumulative += 0; continue }
    const segLen = (d.value / total) * C
    segments.push({ color: d.color, segLen, offset: -cumulative })
    cumulative += segLen
  }

  return (
    <svg viewBox="0 0 150 150" className="w-full">
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      {total === 0 ? (
        <text x={cx} y={cy + 4} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="11">нет данных</text>
      ) : (
        <>
          {segments.map((seg, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={sw} opacity={0.85}
              strokeDasharray={`${seg.segLen} ${C}`}
              strokeDashoffset={seg.offset}
              transform={`rotate(-90, ${cx}, ${cy})`}
            />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="24"
            fontWeight="bold" fontFamily="ui-monospace,monospace">{centerValue}</text>
          <text x={cx} y={cy + 13} textAnchor="middle" fill="rgba(255,255,255,0.35)"
            fontSize="9" letterSpacing="1.5">{centerLabel}</text>
        </>
      )}
    </svg>
  )
}

// ──────────────────────────────────────────────
// Gauge Arc — completion %
// ──────────────────────────────────────────────
function GaugeArc({ percent }: { percent: number }) {
  const r = 44, cx = 55, cy = 58
  const C = 2 * Math.PI * r
  const arcLen = C * 0.75   // 270° arc, gap at bottom
  const filled = Math.max((percent / 100) * arcLen, 0)

  const color = percent >= 70 ? '#22c55e' : percent >= 40 ? '#f97316' : '#ef4444'

  return (
    <svg viewBox="0 0 110 105" className="w-full">
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={11} strokeLinecap="round"
        strokeDasharray={`${arcLen} ${C}`}
        transform={`rotate(135, ${cx}, ${cy})`}
      />
      {/* fill */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={11} strokeLinecap="round" opacity={0.9}
        strokeDasharray={`${filled} ${C}`}
        transform={`rotate(135, ${cx}, ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="21"
        fontWeight="bold" fontFamily="ui-monospace,monospace">{percent}%</text>
      <text x={cx} y={cy + 19} textAnchor="middle" fill="rgba(255,255,255,0.35)"
        fontSize="8" letterSpacing="1.5">ВЫПОЛНЕНО</text>
    </svg>
  )
}

// ──────────────────────────────────────────────
// Bar Chart (CSS flex bars)
// ──────────────────────────────────────────────
function BarChart({ data, maxH = 90 }: {
  data: { label: string; value: number; color: string; emoji?: string }[]
  maxH?: number
}) {
  const peak = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2" style={{ height: `${maxH + 54}px` }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0 h-full">
          <span className="text-xs font-mono font-bold" style={{ color: d.value ? d.color : 'transparent' }}>
            {d.value}
          </span>
          <div className="w-full rounded-t-md"
            style={{
              height: `${d.value > 0 ? Math.max((d.value / peak) * maxH, 4) : 2}px`,
              backgroundColor: d.color,
              opacity: d.value > 0 ? 0.8 : 0.12,
              transition: 'height 0.6s ease',
            }}
          />
          {d.emoji && <span className="text-sm leading-none">{d.emoji}</span>}
          <span className="text-[9px] text-white/40 text-center leading-tight w-full px-0.5">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// Trend Chart — 7-day sparkline (SVG)
// ──────────────────────────────────────────────
function TrendChart({ requests }: { requests: Request[] }) {
  const W = 500, H = 90, px = 8, py = 8
  const iW = W - px * 2, iH = H - py * 2
  const days = 7

  const labels: string[] = []
  const created: number[] = []
  const done: number[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    labels.push(d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }))
    created.push(requests.filter(r => r.created_at.slice(0, 10) === ds).length)
    done.push(requests.filter(r => r.status === 'DONE' && (r.updated_at || '').slice(0, 10) === ds).length)
  }

  const peak = Math.max(...created, ...done, 1)
  const toX = (i: number) => px + (i / (days - 1)) * iW
  const toY = (v: number) => py + iH - (v / peak) * iH
  const pts = (vals: number[]) => vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '90px' }}>
        {/* grid */}
        {[0.33, 0.66, 1].map((f, i) => (
          <line key={i} x1={px} x2={W - px}
            y1={py + iH * (1 - f)} y2={py + iH * (1 - f)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 5" />
        ))}
        {/* areas */}
        <polygon points={`${toX(0)},${H} ${pts(created)} ${toX(days - 1)},${H}`}
          fill="#3b82f6" opacity="0.08" />
        <polygon points={`${toX(0)},${H} ${pts(done)} ${toX(days - 1)},${H}`}
          fill="#22c55e" opacity="0.08" />
        {/* lines */}
        <polyline points={pts(created)} fill="none"
          stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={pts(done)} fill="none"
          stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* dots */}
        {created.map((v, i) => <circle key={`c${i}`} cx={toX(i)} cy={toY(v)} r="3.5" fill="#3b82f6" />)}
        {done.map((v, i) => <circle key={`d${i}`} cx={toX(i)} cy={toY(v)} r="3.5" fill="#22c55e" />)}
      </svg>
      <div className="flex justify-between mt-1 px-1">
        {labels.map((l, i) => (
          <span key={i} className="text-[10px] text-white/30">{l}</span>
        ))}
      </div>
      <div className="flex gap-5 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-px bg-blue-500" />
          <span className="text-xs text-white/50">Создано</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-px bg-green-500" />
          <span className="text-xs text-white/50">Выполнено</span>
        </div>
        <div className="ml-auto text-xs text-white/25 italic">7 дней</div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Horizontal segmented bar — urgency
// ──────────────────────────────────────────────
function UrgencyBar({ requests }: { requests: Request[] }) {
  const emergency = requests.filter(r => r.urgency === 'EMERGENCY').length
  const urgent    = requests.filter(r => r.urgency === 'URGENT').length
  const normal    = requests.filter(r => r.urgency === 'NORMAL').length
  const total     = emergency + urgent + normal || 1

  const segments = [
    { label: 'Аварийная', value: emergency, color: '#ef4444' },
    { label: 'Срочная',   value: urgent,    color: '#f97316' },
    { label: 'Обычная',   value: normal,    color: '#3b82f6' },
  ]

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {segments.map((s, i) => (
          <div key={i} className="rounded-sm transition-all duration-700"
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color, opacity: 0.8 }}
          />
        ))}
      </div>
      <div className="flex gap-4">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color, opacity: 0.8 }} />
            <span className="text-xs text-white/50">{s.label}</span>
            <span className="text-xs font-mono font-bold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export default function OverviewCharts({ stats, services, requests }: Props) {
  const statusData = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    label: cfg.label,
    value: stats.byStatus[key] || 0,
    color: cfg.color,
  }))

  const priorityData = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(key => ({
    label: PRIORITY_CONFIG[key].label,
    value: stats.byPriority[key] || 0,
    color: PRIORITY_CONFIG[key].color,
  }))

  const serviceData = services.map(svc => {
    const meta = SERVICE_META[svc.service_id]
    return {
      label: svc.service_name,
      value: stats.byService[svc.service_id] || 0,
      color: meta?.color || '#64748b',
      emoji: meta?.emoji,
    }
  })

  const donePercent = stats.total > 0
    ? Math.round(((stats.byStatus['DONE'] || 0) / stats.total) * 100)
    : 0

  return (
    <div className="space-y-4">

      {/* Row 1: Donut + Gauge + Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Status donut */}
        <div className="glass rounded-2xl p-5">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Статусы заявок</p>
          <div className="flex items-center gap-3">
            <div className="w-[130px] flex-shrink-0">
              <DonutChart data={statusData} centerLabel="ВСЕГО" centerValue={stats.total} />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              {statusData.map(d => (
                <div key={d.label} className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-white/60 truncate flex-1">{d.label}</span>
                  <span className="text-xs font-mono font-bold text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Completion gauge */}
        <div className="glass rounded-2xl p-5 flex flex-col items-center justify-between">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 self-start">Выполнение</p>
          <GaugeArc percent={donePercent} />
          <p className="text-xs text-white/30 mt-1">
            {stats.byStatus['DONE'] || 0} из {stats.total} заявок
          </p>
        </div>

        {/* Priority bars */}
        <div className="glass rounded-2xl p-5">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Приоритеты</p>
          <BarChart data={priorityData} maxH={80} />
        </div>

      </div>

      {/* Row 2: Trend + Urgency */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* 7-day trend (2/3 width) */}
        <div className="glass rounded-2xl p-5 sm:col-span-2">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Динамика за 7 дней</p>
          <TrendChart requests={requests} />
        </div>

        {/* Urgency bar */}
        <div className="glass rounded-2xl p-5 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Срочность</p>
          <UrgencyBar requests={requests} />
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wider">В работе сейчас</p>
            <div className="text-3xl font-mono font-bold text-violet-400">
              {stats.byStatus['IN_PROGRESS'] || 0}
            </div>
            <p className="text-xs text-white/30">активных заявок</p>
          </div>
        </div>

      </div>

      {/* Row 3: By service */}
      <div className="glass rounded-2xl p-5">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Нагрузка по службам</p>
        <BarChart data={serviceData} maxH={100} />
      </div>

    </div>
  )
}
