'use client'
import { useState, useEffect, useMemo } from 'react'
import type { UserWithAssignment, ShiftPhase, Service, EnrichedEmployee } from '@/types'
import { fetchAllCurrentStatuses } from '@/lib/api'
import { buildStroevayaRows, type StroevayaRow } from './printForms'

interface Props {
  users: UserWithAssignment[]
  phases: ShiftPhase[]
  services: Service[]
}

const TODAY = new Date().toISOString().split('T')[0]

function Cell({ val, accent }: { val: number; accent?: string }) {
  if (!val) return <td className="px-2 py-2 text-center text-white/15 text-xs">—</td>
  return (
    <td className={`px-2 py-2 text-center text-sm font-semibold ${accent ?? 'text-white/80'}`}>
      {val}
    </td>
  )
}

export default function StroevayaView({ users, phases, services }: Props) {
  const [dateStr, setDateStr]                     = useState(TODAY)
  const [enriched, setEnriched]                   = useState<EnrichedEmployee[] | null>(null)
  const [loading, setLoading]                     = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchAllCurrentStatuses().then(eu => {
      setEnriched(eu)
      setLoading(false)
    })
  }, [])

  const { rows, totals } = useMemo(() => {
    if (!enriched) return { rows: [] as StroevayaRow[], totals: null as StroevayaRow | null }
    return buildStroevayaRows(enriched, users, phases, services, dateStr, false)
  }, [enriched, users, phases, services, dateStr])

  const dateFormatted = new Date(dateStr + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-3">
      {/* Строевая toolbar */}
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-white/80">🪖 Строевая записка</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Дата:</span>
          <input
            type="date"
            value={dateStr}
            onChange={e => setDateStr(e.target.value)}
            className="form-input text-sm px-2 py-1"
          />
        </div>
        {!loading && enriched && (
          <span className="text-xs text-white/30 ml-auto">{dateFormatted}</span>
        )}
      </div>

      {loading && (
        <div className="text-center text-white/30 py-16 text-sm">Загрузка статусов...</div>
      )}

      {!loading && enriched && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-[11px] uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium w-40">Участок</th>
                  <th className="px-2 py-3 text-center font-medium">Штат</th>
                  <th className="px-2 py-3 text-center font-medium">ИТР</th>
                  <th className="px-2 py-3 text-center font-medium">Рабочие</th>
                  <th className="px-2 py-3 text-center font-medium border-l border-white/10 text-amber-400/70">Больн.</th>
                  <th className="px-2 py-3 text-center font-medium text-amber-400/70">Отгул</th>
                  <th className="px-2 py-3 text-center font-medium text-amber-400/70">Отпуск</th>
                  <th className="px-2 py-3 text-center font-medium text-amber-400/70">Учеб.</th>
                  <th className="px-2 py-3 text-center font-medium text-amber-400/70">Декрет</th>
                  <th className="px-2 py-3 text-center font-medium text-amber-400/70">Командир.</th>
                  <th className="px-2 py-3 text-center font-medium text-red-400/70">СВО</th>
                  <th className="px-2 py-3 text-center font-medium text-red-400/70">Мобил.</th>
                  <th className="px-2 py-3 text-center font-medium border-l border-white/10 text-sky-400/70">День</th>
                  <th className="px-2 py-3 text-center font-medium text-indigo-400/70">Ночь</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map(r => (
                  <tr key={r.serviceId} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2.5 text-white/70 text-sm font-medium">{r.serviceName}</td>
                    <Cell val={r.total} accent="text-white/90 font-bold" />
                    <Cell val={r.itr} />
                    <Cell val={r.workers} />
                    <Cell val={r.bolnichniy}   accent="text-amber-400/80" />
                    <Cell val={r.otgul}        accent="text-amber-400/80" />
                    <Cell val={r.otpusk}       accent="text-amber-400/80" />
                    <Cell val={r.uchebniy}     accent="text-amber-400/80" />
                    <Cell val={r.dekret}       accent="text-amber-400/80" />
                    <Cell val={r.komandirovka} accent="text-amber-400/80" />
                    <Cell val={r.svoMoscow + r.svoRegion} accent="text-red-400/80" />
                    <Cell val={r.mobilizovan}  accent="text-red-400/80" />
                    <Cell val={r.day}   accent="text-sky-400/90 font-bold" />
                    <Cell val={r.night} accent="text-indigo-400/90 font-bold" />
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t-2 border-white/20 bg-white/5">
                    <td className="px-4 py-2.5 text-white/90 text-sm font-bold">ИТОГО</td>
                    <td className="px-2 py-2.5 text-center text-sm font-bold text-white">{totals.total || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-semibold text-white/70">{totals.itr || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-semibold text-white/70">{totals.workers || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-semibold text-amber-400/90">{totals.bolnichniy   || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-semibold text-amber-400/90">{totals.otgul        || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-semibold text-amber-400/90">{totals.otpusk       || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-semibold text-amber-400/90">{totals.uchebniy     || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-semibold text-amber-400/90">{totals.dekret       || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-semibold text-amber-400/90">{totals.komandirovka || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-semibold text-red-400/90">{(totals.svoMoscow + totals.svoRegion) || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-semibold text-red-400/90">{totals.mobilizovan   || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-bold text-sky-400">{totals.day   || '—'}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-bold text-indigo-400">{totals.night || '—'}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
