'use client'

import { useState } from 'react'

interface Props {
  year: number
  month: number
  serviceId?: string
}

type Format = 'xml' | 'csv' | 'night_pay_csv'

const FORMATS: { id: Format; label: string; hint: string; color: string }[] = [
  {
    id:    'xml',
    label: 'XML (1С:ЗУП)',
    hint:  'Загрузить через «Обмен данными» в 1С:ЗУП 3.x',
    color: 'bg-blue-600 hover:bg-blue-500',
  },
  {
    id:    'csv',
    label: 'CSV (Excel Т-13)',
    hint:  'Открыть в Excel или загрузить вручную в 1С',
    color: 'bg-emerald-700 hover:bg-emerald-600',
  },
  {
    id:    'night_pay_csv',
    label: 'CSV Ночные',
    hint:  'Список ночных часов для расчёта доплаты 35%',
    color: 'bg-indigo-700 hover:bg-indigo-600',
  },
]

const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
]

export default function TimesheetExport({ year, month, serviceId }: Props) {
  const [loading, setLoading] = useState<Format | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const download = async (fmt: Format) => {
    setLoading(fmt)
    setError(null)
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month), format: fmt })
      if (serviceId) params.set('serviceId', serviceId)

      const res = await fetch(`/api/timesheet/export?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      const mm   = String(month).padStart(2, '0')
      const ext  = fmt === 'xml' ? 'xml' : 'csv'
      a.download = `tabel_${year}_${mm}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message ?? 'Ошибка загрузки')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white/90">
            Экспорт в 1С / Excel
          </p>
          <p className="text-xs text-white/50 mt-0.5">
            {MONTH_NAMES[month - 1]} {year} · Табель Т-13 · СУРВ
          </p>
        </div>
        <span className="text-2xl select-none">📤</span>
      </div>

      {/* Кнопки форматов */}
      <div className="flex flex-wrap gap-2">
        {FORMATS.map(f => (
          <button
            key={f.id}
            onClick={() => download(f.id)}
            disabled={loading !== null}
            title={f.hint}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium text-white
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${f.color}
            `}
          >
            {loading === f.id ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin"/>
                Генерация...
              </span>
            ) : (
              `⬇ ${f.label}`
            )}
          </button>
        ))}
      </div>

      {/* Ошибка */}
      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Инструкция */}
      <details className="group">
        <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 select-none">
          Как загрузить в 1С:ЗУП
        </summary>
        <div className="mt-2 text-xs text-white/50 space-y-1 pl-2 border-l border-white/10">
          <p>1. Скачайте файл <span className="text-white/70">XML (1С:ЗУП)</span></p>
          <p>2. В 1С: <span className="text-white/70">ЗУП → Администрирование → Обмен данными → Загрузить из файла</span></p>
          <p>3. Выберите скачанный <span className="text-white/70">.xml</span> файл</p>
          <p>4. 1С создаст документ <span className="text-white/70">«Табель учёта рабочего времени»</span></p>
          <p className="text-white/30 pt-1">
            Переходящие смены отмечены кодом <span className="text-white/50">ЯХ</span> (= «Я» в 1С)
            с атрибутом ПереходящаяСмена=true.
            Ночные часы: 22:00–06:00 по ТК РФ ст.96.
          </p>
        </div>
      </details>
    </div>
  )
}
