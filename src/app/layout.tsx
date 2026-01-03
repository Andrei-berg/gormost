import './globals.css'

export const metadata = {
  title: 'Горmost',
  description: 'Лефортовский тоннель',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
