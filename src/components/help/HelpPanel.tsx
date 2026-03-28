'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import WorkflowStatusBar from './WorkflowStatusBar'
import type { WorkPlanStatus } from '@/types'

export interface HelpSection {
  title: string
  emoji: string
  items: { q: string; a: string }[]
}

interface Props {
  panelTitle: string
  panelEmoji: string
  sections: HelpSection[]
  currentStatus?: WorkPlanStatus
  showWorkflow?: boolean
}

export default function HelpPanel({ panelTitle, panelEmoji, sections, currentStatus, showWorkflow = false }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 border border-white/12 text-white/50 hover:text-white/80 text-xs transition-all"
      title="Справка по панели"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Справка
    </button>
  )

  if (!mounted) return trigger

  return (
    <>
      {trigger}

      {mounted && createPortal(
        <>
          {/* Backdrop */}
          {open && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9980]"
              onClick={() => setOpen(false)}
            />
          )}

          {/* Drawer — light theme */}
          <div
            className={`fixed top-0 right-0 h-full w-full max-w-sm z-[9981] flex flex-col
              transition-transform duration-300 ease-out
              ${open ? 'translate-x-0' : 'translate-x-full'}
            `}
            style={{
              background: '#f8fafc',
              borderLeft: '1px solid #e2e8f0',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 flex-shrink-0 bg-white">
              <span className="text-2xl">{panelEmoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800">{panelTitle}</div>
                <div className="text-xs text-slate-400">Справочная информация</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Workflow status */}
              {showWorkflow && currentStatus && (
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                    Цикл согласования
                  </div>
                  <WorkflowStatusBar
                    currentStatus={currentStatus}
                    compact={false}
                    showRoles={true}
                  />
                </div>
              )}

              {/* FAQ sections */}
              {sections.map((section, si) => (
                <div key={si}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{section.emoji}</span>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{section.title}</div>
                  </div>
                  <div className="space-y-1">
                    {section.items.map((item, qi) => {
                      const idx = si * 100 + qi
                      const expanded = expandedIdx === idx
                      return (
                        <div key={qi} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                            onClick={() => setExpandedIdx(expanded ? null : idx)}
                          >
                            <svg
                              className={`w-3.5 h-3.5 text-slate-300 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-xs text-slate-700 font-medium leading-snug">{item.q}</span>
                          </button>
                          {expanded && (
                            <div className="px-8 pb-3 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
                              {item.a}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-slate-200 bg-white">
              <div className="text-[10px] text-slate-300 text-center">
                Горmost — система управления работами тоннеля
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
