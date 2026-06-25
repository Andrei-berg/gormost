'use client'
// WorkerPicker — pick the brigade by name from one service's roster.
// Whole department is shown; people on duty on the given date are highlighted
// and sorted first. Each pick carries a role; a hand-typed name is allowed for
// people not in the roster. Used by the journal (AddItemModal) and the
// work-permit composition (наряд-допуск, strictly own service per приказ п.18.1).
import { useEffect, useMemo, useState } from 'react'
import { fetchUsersWithAssignments } from '@/lib/api-client'
import { isWorkerOnDuty } from '@/lib/shifts'
import type { UserWithAssignment, WorkAssignmentRole, WorkerName } from '@/types'

const ROLES: { value: WorkAssignmentRole; label: string }[] = [
  { value: 'WORKER',    label: 'рабочий' },
  { value: 'BRIGADIER', label: 'бригадир' },
  { value: 'MASTER',    label: 'мастер' },
  { value: 'ITR',       label: 'ИТР' },
  { value: 'DRIVER',    label: 'водитель' },
]

// Guess a sensible default role from the employee's position / HR category.
function defaultRole(u: { position: string | null; category: 'ИТР' | 'рабочий' | null }): WorkAssignmentRole {
  const p = (u.position ?? '').toLowerCase()
  if (p.includes('бригадир')) return 'BRIGADIER'
  if (p.includes('мастер'))   return 'MASTER'
  if (p.includes('водит') || p.includes('машинист')) return 'DRIVER'
  if (u.category === 'ИТР' || p.includes('инженер') || p.includes('начальник')) return 'ITR'
  return 'WORKER'
}

interface Props {
  serviceId: string
  date: string // ISO yyyy-mm-dd — for the on-duty highlight
  value: WorkerName[]
  onChange: (v: WorkerName[]) => void
}

export default function WorkerPicker({ serviceId, date, value, onChange }: Props) {
  const [roster, setRoster] = useState<UserWithAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [hand, setHand] = useState('')

  useEffect(() => {
    let alive = true
    fetchUsersWithAssignments()
      .then(all => { if (alive) setRoster(all.filter(u => u.service_id === serviceId)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [serviceId])

  const onDuty = useMemo(() => {
    const d = new Date(date + 'T00:00:00')
    const map = new Map<string, boolean>()
    for (const u of roster) {
      const a = u.assignment
      map.set(u.user_id, !!(a && a.schedule_code && isWorkerOnDuty(
        { ...a, schedule_code: a.schedule_code }, d,
      )))
    }
    return map
  }, [roster, date])

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase()
    return roster
      .filter(u => !q || u.full_name.toLowerCase().includes(q))
      .sort((a, b) => {
        const da = onDuty.get(a.user_id) ? 0 : 1
        const db = onDuty.get(b.user_id) ? 0 : 1
        return da - db || a.full_name.localeCompare(b.full_name, 'ru')
      })
  }, [roster, query, onDuty])

  const selectedById = useMemo(() => {
    const m = new Map<string, WorkerName>()
    for (const w of value) if (w.user_id) m.set(w.user_id, w)
    return m
  }, [value])

  const toggle = (u: UserWithAssignment) => {
    if (selectedById.has(u.user_id)) {
      onChange(value.filter(w => w.user_id !== u.user_id))
    } else {
      onChange([...value, { user_id: u.user_id, name: u.full_name, role: defaultRole(u) }])
    }
  }

  const setRole = (idx: number, role: WorkAssignmentRole) =>
    onChange(value.map((w, i) => (i === idx ? { ...w, role } : w)))

  const removeAt = (idx: number) => onChange(value.filter((_, i) => i !== idx))

  const addHand = () => {
    const name = hand.trim()
    if (!name) return
    onChange([...value, { user_id: null, name, role: 'WORKER' }])
    setHand('')
  }

  return (
    <div className="space-y-3">
      {/* Selected crew with role selectors */}
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((w, i) => (
            <div key={`${w.user_id ?? 'hand'}-${i}`} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-white/85 truncate">
                {w.name}
                {w.user_id === null && <span className="ml-1 text-[10px] text-white/35">(вписан)</span>}
              </span>
              <select
                value={w.role}
                onChange={e => setRole(i, e.target.value as WorkAssignmentRole)}
                className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/80 outline-none"
              >
                {ROLES.map(r => <option key={r.value} value={r.value} className="text-black">{r.label}</option>)}
              </select>
              <button onClick={() => removeAt(i)} className="text-white/30 hover:text-red-400 text-sm shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Roster search + pick list */}
      <input
        value={query} onChange={e => setQuery(e.target.value)}
        placeholder="поиск по фамилии…"
        className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none"
      />
      <div className="max-h-44 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
        {loading ? (
          <div className="px-3 py-3 text-xs text-white/40">Загрузка состава…</div>
        ) : sorted.length === 0 ? (
          <div className="px-3 py-3 text-xs text-white/40">В службе нет активных сотрудников</div>
        ) : sorted.map(u => {
          const picked = selectedById.has(u.user_id)
          const duty = onDuty.get(u.user_id)
          return (
            <button
              key={u.user_id}
              onClick={() => toggle(u)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${picked ? 'bg-emerald-500/15' : 'hover:bg-white/5'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${duty ? 'bg-emerald-400' : 'bg-white/20'}`} title={duty ? 'на смене' : 'не на смене'} />
              <span className="flex-1 text-sm text-white/85 truncate">{u.full_name}</span>
              {u.position && <span className="text-[10px] text-white/35 truncate max-w-[40%]">{u.position}</span>}
              {picked && <span className="text-emerald-400 text-xs shrink-0">✓</span>}
            </button>
          )
        })}
      </div>

      {/* Hand-typed fallback */}
      <div className="flex gap-2">
        <input
          value={hand} onChange={e => setHand(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHand() } }}
          placeholder="вписать вручную (нет в списке)…"
          className="flex-1 text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none"
        />
        <button onClick={addHand} disabled={!hand.trim()} className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white/80 disabled:opacity-40">＋</button>
      </div>
    </div>
  )
}
