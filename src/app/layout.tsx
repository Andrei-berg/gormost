import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/ThemeContext'
import { DialogProvider } from '@/components/ConfirmDialog'

export const metadata: Metadata = {
  title: 'Гормост — Система управления работами',
  description: 'Система управления работами Лефортовского тоннеля',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Runs synchronously before paint — prevents flash of wrong theme */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('gormost-theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark');})()`
        }} />
      </head>
      <body>
        <ThemeProvider>
          <DialogProvider>{children}</DialogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
