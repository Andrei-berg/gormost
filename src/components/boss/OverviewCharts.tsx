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

// ── Donut Chart ────────────────────────────────────────────────────
function DonutChart({ data, total }: {
  data: { label: string; value: number; color: string }[]
  total: number
}) {
  const cx = 21, cy = 21, r = 15.9155, sw = 6

  const segments: { color: string; dashArray: string; dashOffset: string }[] = []
  let cumulative = 0
  for (const d of data) {
    const pct = total > 0 ? (d.value / total) * 100 : 0
    segments.push({
      color: d.color,
      dashArray: `${pct} ${100 - pct}`,
      dashOffset: `${25 - cumulative}`,
    })
    cumulative += pct
  }

  return (
    <div className="flex flex-col items-center gap-4 flex-1 justify-center">
      <div className="relative" style={{ width: 200, height: 200 }}>
        <svg viewBox="0 0 42 42" width="200" height="200">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={sw} />
          {total === 0 ? null : segments.map((seg, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={sw}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              transform="rotate(-90 21 21)"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-bold text-white leading-none">{total}</span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mt-1">заявок</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
        {data.slice(0, -1).map(d => (
          <div key={d.label} className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
            <span className="text-white/50 flex-1 min-w-0">{d.label}</span>
            <span className="font-mono font-bold text-white">{d.value}</span>
          </div>
        ))}
        {data.slice(-1).map(d => (
          <div key={d.label} className="col-span-2 flex items-center gap-2 text-[11px] pt-1.5 mt-0.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
            <span className="text-white/80 font-semibold flex-1">{d.label}</span>
            <span className="font-mono font-bold" style={{ color: d.color }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


function GaugeWithSub({ percent, done, total }: { percent: number; done: number; total: number }) {
  const r = 42, cx = 50, cy = 50
  const C = 2 * Math.PI * r
  const color = percent >= 70 ? '#3FB950' : percent >= 40 ? '#F97316' : '#EF4444'
  const offset = C - (percent / 100) * C

  return (
    <div className="flex flex-col items-center gap-3 flex-1 justify-center">
      <div className="relative" style={{ width: 220, height: 220 }}>
        <svg viewBox="0 0 100 100" width="220" height="220">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke-dashoffset 0.8s ease' }}
          />
          <circle cx={cx} cy={cy} r={34} fill="none" stroke={`${color}14`} strokeWidth={1} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-bold leading-none" style={{ fontSize: 48, color, letterSpacing: '-0.02em' }}>
            {percent}<span className="text-[26px] opacity-70">%</span>
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold mt-1.5 font-mono" style={{ color: `${color}CC` }}>
            Выполнено
          </span>
        </div>
      </div>
      <p className="text-[13px] text-white/50">
        <b className="text-white font-semibold">{done}</b> из <b className="text-white font-semibold">{total}</b> заявок закрыто
      </p>
      <div className="flex justify-between w-full text-[10px] text-white/30 font-mono pt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span>0%</span><span>25%</span><span>50%</span><span>75%</span>
        <span style={{ color, fontWeight: 700 }}>100%</span>
      </div>
    </div>
  )
}

// ── Priority Bars (vertical) ───────────────────────────────────────
function PriorityBars({ data }: { data: { label: string; value: number; color: string }[] }) {
  const peak = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-flex-end gap-4 justify-center flex-1 pt-4 pb-2" style={{ alignItems: 'flex-end' }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-2" style={{ minWidth: 48 }}>
          <div className="relative" style={{ width: 36, height: 140 }}>
            <div className="absolute bottom-0 left-0 right-0 rounded-t-md"
              style={{
                height: d.value > 0 ? `${Math.max((d.value / peak) * 120, 6)}px` : 4,
                background: d.value > 0 ? d.color : `${d.color}28`,
                boxShadow: d.value > 0 ? `inset 0 -2px 0 rgba(0,0,0,0.2)` : undefined,
                transition: 'height 0.6s ease',
              }}
            />
            {d.value > 0 && (
              <span className="absolute font-mono text-sm font-bold text-white"
                style={{
                  bottom: `${Math.max((d.value / peak) * 120, 6) + 6}px`,
                  left: '50%', transform: 'translateX(-50%)',
                }}>
                {d.value}
              </span>
            )}
          </div>
          <span className="text-[11px] text-center font-medium" style={{ color: d.value > 0 ? d.color : 'rgba(255,255,255,0.3)' }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Trend Line Chart ───────────────────────────────────────────────
function TrendChart({ requests }: { requests: Request[] }) {
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
  const W = 700, H = 180
  const padL = 10, padR = 10, padT = 20, padB = 30
  const iW = W - padL - padR
  const iH = H - padT - padB

  const toX = (i: number) => padL + (i / (days - 1)) * iW
  const toY = (v: number) => padT + iH - (v / peak) * iH

  const amberPts = created.map((v, i) => `${toX(i)},${toY(v)}`).join(' L ')
  const greenPts = done.map((v, i) => `${toX(i)},${toY(v)}`).join(' L ')
  const amberFill = `M ${toX(0)},${toY(created[0])} L ${amberPts} L ${toX(days-1)},${H} L ${toX(0)},${H} Z`
  const totalCreated = created.reduce((a, b) => a + b, 0)
  const totalDone = done.reduce((a, b) => a + b, 0)
  const closeRate = totalCreated > 0 ? Math.round((totalDone / totalCreated) * 100) : 0

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div style={{ flex: 1, minHeight: 180 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 180, display: 'block' }}>
          <defs>
            <linearGradient id="gAmber" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#F0A500" stopOpacity="0.6" />
              <stop offset="1" stopColor="#F0A500" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* gridlines */}
          {[padT, padT + iH * 0.33, padT + iH * 0.66, padT + iH].map((y, i) => (
            <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          ))}
          {/* amber area */}
          <path d={amberFill} fill="url(#gAmber)" opacity={0.25} />
          {/* amber line */}
          <path d={`M ${toX(0)},${toY(created[0])} L ${amberPts}`} fill="none"
            stroke="#F0A500" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(240,165,0,0.45))' }} />
          {/* green line */}
          <path d={`M ${toX(0)},${toY(done[0])} L ${greenPts}`} fill="none"
            stroke="#3FB950" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(63,185,80,0.45))' }} />
          {/* amber dots */}
          {created.map((v, i) => (
            <circle key={`a${i}`} cx={toX(i)} cy={toY(v)} r={i === days - 1 ? 4 : 3}
              fill="#F0A500" stroke={i === days - 1 ? '#fff' : undefined} strokeWidth={i === days - 1 ? 1.5 : undefined} />
          ))}
          {/* green dots */}
          {done.map((v, i) => (
            <circle key={`g${i}`} cx={toX(i)} cy={toY(v)} r={i === days - 1 ? 4 : 3}
              fill="#3FB950" stroke={i === days - 1 ? '#fff' : undefined} strokeWidth={i === days - 1 ? 1.5 : undefined} />
          ))}
          {/* x-axis labels */}
          <g fontFamily="JetBrains Mono, monospace" fontSize={10} textAnchor="middle">
            {labels.map((l, i) => (
              <text key={i} x={toX(i)} y={H - 4}
                fill={i === days - 1 ? '#fff' : 'rgba(255,255,255,0.4)'}
                fontWeight={i === days - 1 ? 700 : 400}>
                {l}
              </text>
            ))}
          </g>
        </svg>
      </div>
      <div className="flex items-center gap-4 pt-2 text-[11px]"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded" style={{ background: '#F0A500' }} />
          <span className="text-white/50">Создано</span>
          <b className="font-mono text-white">{totalCreated}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded" style={{ background: '#3FB950' }} />
          <span className="text-white/50">Выполнено</span>
          <b className="font-mono text-white">{totalDone}</b>
        </span>
        <span className="ml-auto text-white/30 font-mono">
          Δ {totalCreated - totalDone > 0 ? '+' : ''}{totalCreated - totalDone > 0 ? (totalCreated - totalDone) : totalDone - totalCreated < 0 ? totalDone - totalCreated : 0} · {closeRate}% закрытия
        </span>
      </div>
    </div>
  )
}

// ── Urgency stacked bar ────────────────────────────────────────────
function UrgencyBar({ requests }: { requests: Request[] }) {
  const emergency = requests.filter(r => r.urgency === 'EMERGENCY').length
  const urgent    = requests.filter(r => r.urgency === 'URGENT').length
  const normal    = requests.filter(r => !r.urgency || r.urgency === 'NORMAL').length
  const active    = requests.filter(r => r.status === 'IN_PROGRESS').length

  const segments = [
    { label: 'Аварийная', value: emergency, color: '#F85149' },
    { label: 'Срочная',   value: urgent,    color: '#F97316' },
    { label: 'Обычная',   value: normal,    color: 'rgba(100,116,139,0.55)', textColor: 'rgba(255,255,255,0.85)' },
  ]

  return (
    <div className="flex flex-col gap-4 flex-1 justify-center">
      <div className="flex h-8 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
        {segments.map((s, i) => (
          <div key={i} className="flex items-center justify-center font-mono text-xs font-bold"
            style={{
              flex: s.value,
              background: s.color,
              color: (s as { textColor?: string }).textColor || '#fff',
              minWidth: s.value > 0 ? 20 : 0,
            }}>
            {s.value > 0 ? s.value : null}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="flex-1 text-white/70">{s.label}</span>
            <span className="font-mono font-bold" style={{ color: (s as { textColor?: string }).textColor ? '#fff' : s.color }}>{s.value}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] pt-2.5 text-white/40"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: active === 0 ? '#3FB950' : '#F0A500' }}>●</span>
        <b className="text-white/60">{active} активных заявок сейчас</b>
        {active === 0 && <span>· все закрыты</span>}
      </div>
    </div>
  )
}

// ── Service load (horizontal progress bars) ────────────────────────
function ServiceLoad({ services, stats }: { services: Service[]; stats: Stats }) {
  const maxVal = Math.max(...services.map(s => stats.byService[s.service_id] || 0), 1)
  const unitLabel = (n: number) => n === 1 ? 'заявка' : n >= 2 && n <= 4 ? 'заявки' : 'заявок'

  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {services.map(svc => {
        const meta = SERVICE_META[svc.service_id]
        const count = stats.byService[svc.service_id] || 0
        const color = meta?.color || '#64748B'
        const pct = (count / maxVal) * 100
        const isEmpty = count === 0
        return (
          <div key={svc.service_id}
            className="grid items-center gap-2.5 text-xs"
            style={{ gridTemplateColumns: '22px 56px 1fr auto auto' }}>
            <span className="text-base leading-none" style={{ opacity: isEmpty ? 0.4 : 1 }}>
              {meta?.emoji || '🔧'}
            </span>
            <span className="font-mono text-[10px] font-bold tracking-wider"
              style={{ color: isEmpty ? 'rgba(255,255,255,0.3)' : color }}>
              {svc.service_id.replace('SRV-', '')}
            </span>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${isEmpty ? 2 : pct}%`, background: color, opacity: isEmpty ? 0.3 : 1 }} />
            </div>
            <span className="font-mono font-bold text-right"
              style={{ color: isEmpty ? 'rgba(255,255,255,0.3)' : '#fff', minWidth: 18 }}>
              {count}
            </span>
            <span className="text-white/30 whitespace-nowrap">{isEmpty ? '—' : unitLabel(count)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────
export default function OverviewCharts({ stats, services, requests }: Props) {
  const statusData = (['NEW', 'PLANNED', 'IN_PROGRESS', 'CHECKING', 'DONE'] as const).map(key => ({
    label: STATUS_CONFIG[key]?.label ?? key,
    value: stats.byStatus[key] || 0,
    color: STATUS_CONFIG[key]?.color ?? '#64748b',
  }))

  const priorityData = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(key => ({
    label: PRIORITY_CONFIG[key].label,
    value: stats.byPriority[key] || 0,
    color: PRIORITY_CONFIG[key].color,
  }))

  const doneCount = stats.byStatus['DONE'] || 0
  const donePercent = stats.total > 0 ? Math.round((doneCount / stats.total) * 100) : 0

  return (
    <div className="space-y-3.5">

      {/* Row 1: Donut + Gauge + Priority */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>

        <div className="glass rounded-2xl p-4 flex flex-col gap-3" style={{ minHeight: 280 }}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono">
              📊 Статусы заявок
            </span>
            <span className="ml-auto text-[10px] text-white/30 font-mono">{stats.total} заявок · смена</span>
          </div>
          <DonutChart data={statusData} total={stats.total} />
        </div>

        <div className="glass rounded-2xl p-4 flex flex-col gap-3" style={{ minHeight: 280 }}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono">
              ✓ Выполнение
            </span>
            <span className="ml-auto text-[10px] text-white/30 font-mono">смена</span>
          </div>
          <GaugeWithSub percent={donePercent} done={doneCount} total={stats.total} />
        </div>

        <div className="glass rounded-2xl p-4 flex flex-col gap-3" style={{ minHeight: 280 }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono">
              ⚑ Приоритеты
            </span>
            <span className="text-[10px] text-white/30 font-mono">{stats.total} заявок</span>
          </div>
          <PriorityBars data={priorityData} />
          <div className="flex justify-between text-[10px] text-white/30 font-mono pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span>← наивысший</span>
            <span>низший →</span>
          </div>
        </div>
      </div>

      {/* Row 2: Trend + Urgency */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1.1fr 1fr' }}>

        <div className="glass rounded-2xl p-4 flex flex-col gap-3" style={{ minHeight: 240 }}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono">
              📈 Динамика за 7 дней
            </span>
          </div>
          <TrendChart requests={requests} />
        </div>

        <div className="glass rounded-2xl p-4 flex flex-col gap-3" style={{ minHeight: 240 }}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono">
              ⏱ Срочность
            </span>
            <span className="ml-auto text-[10px] text-white/30 font-mono">всего · {stats.total}</span>
          </div>
          <UrgencyBar requests={requests} />
        </div>
      </div>

      {/* Row 3: Service load */}
      <div className="glass rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono">
            🔧 Нагрузка по службам
          </span>
          <span className="ml-auto text-[10px] text-white/30 font-mono">{stats.total} заявок · {services.length} служб</span>
        </div>
        <ServiceLoad services={services} stats={stats} />
      </div>

    </div>
  )
}
