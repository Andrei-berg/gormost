'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

interface ConfirmOptions {
  /** Confirm button label, e.g. «Удалить» */
  confirmLabel?: string
  /** Red confirm button for destructive actions (default true) */
  danger?: boolean
  /** Alert mode: single OK button, always resolves true */
  alert?: boolean
}

type ConfirmFn = (message: string, opts?: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(() =>
  Promise.reject(new Error('DialogProvider is not mounted')),
)

/** Promise-based replacement for window.confirm/alert, styled to the app */
export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext)
}

interface DialogState {
  message: string
  opts: ConfirmOptions
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const resolveRef = useRef<(v: boolean) => void>(() => {})

  const confirm = useCallback<ConfirmFn>((message, opts = {}) => {
    return new Promise<boolean>(resolve => {
      resolveRef.current = resolve
      setDialog({ message, opts })
    })
  }, [])

  const close = (value: boolean) => {
    resolveRef.current(value)
    setDialog(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => close(false)} />
          <div className="glass-popup relative z-10 w-full max-w-sm rounded-2xl p-5">
            <div className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
              {dialog.message}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              {!dialog.opts.alert && (
                <button
                  onClick={() => close(false)}
                  className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
                >
                  Отмена
                </button>
              )}
              <button
                autoFocus
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  dialog.opts.alert
                    ? 'bg-white/10 hover:bg-white/15 text-white'
                    : dialog.opts.danger === false
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300'
                    : 'bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300'
                }`}
              >
                {dialog.opts.alert ? 'Понятно' : dialog.opts.confirmLabel ?? 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
