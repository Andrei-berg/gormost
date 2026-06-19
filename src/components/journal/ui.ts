// Journal — shared style tokens.
// No local theme/skin: classes use the app's CSS variables (--bg-card,
// --text-primary, --border, …) and .glass utilities, so the journal inherits
// the GLOBAL app theme (html.dark ↔ light) with zero JS.

export interface UI {
  card: string
  radius: string
  radiusSm: string
  inset: string
  input: string
  text: string
  textSub: string
  textMuted: string
  hoverText: string
  border: string
  divide: string
  ghostBtn: string
  segActive: string
  segIdle: string
  label: string
}

export const S: UI = {
  card:      'glass rounded-2xl',
  radius:    'rounded-2xl',
  radiusSm:  'rounded-xl',
  inset:     'bg-[var(--bg-card)] border border-[var(--border)]',
  input:
    'rounded-xl px-3 py-2 text-sm outline-none transition-colors w-full ' +
    'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] ' +
    'placeholder:text-[var(--text-faint)] focus:border-[var(--border-strong)]',
  text:      'text-[var(--text-primary)]',
  textSub:   'text-[var(--text-secondary)]',
  textMuted: 'text-[var(--text-muted)]',
  hoverText: 'hover:text-[var(--text-primary)]',
  border:    'border-[var(--border)]',
  divide:    'divide-[var(--border)]',
  ghostBtn:
    'rounded-xl px-3 py-1.5 text-sm transition-colors ' +
    'bg-[var(--bg-card)] hover:bg-[var(--bg-card-strong)] text-[var(--text-secondary)]',
  segActive: 'bg-[var(--bg-card-strong)] text-[var(--text-primary)] shadow',
  segIdle:   'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
  label:     'text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]',
}
