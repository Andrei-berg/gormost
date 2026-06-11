'use client'

/** Full-page skeleton shown during the first data load of a panel */
export function PanelLoader() {
  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto flex flex-col gap-4 animate-pulse">
      <div className="glass rounded-2xl h-16" />
      <div className="glass rounded-2xl h-28" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl h-44" />
        <div className="glass rounded-2xl h-44" />
        <div className="glass rounded-2xl h-44" />
      </div>
    </div>
  )
}

/** Red banner shown when a data load failed — keeps stale data visible, offers retry */
export function DataErrorBanner({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
      style={{ background: 'rgba(248,81,73,0.10)', border: '1px solid rgba(248,81,73,0.35)', color: '#F85149' }}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h16.9a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      </svg>
      <span className="text-[13px] font-medium leading-snug">
        <strong>Не удалось загрузить данные.</strong> {error}
      </span>
      <button
        onClick={onRetry}
        className="ml-auto px-3 py-1 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-opacity hover:opacity-80"
        style={{ background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.4)', color: '#F85149' }}
      >
        Повторить
      </button>
    </div>
  )
}
