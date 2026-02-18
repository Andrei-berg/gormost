import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Гормост — Система управления работами',
  description: 'Система управления работами Лефортовского тоннеля',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
