'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

export default function TransportPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen p-8">
      <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">← Назад</Link>
      <Header />
      <div className="glass-strong rounded-2xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-5xl">🚗</div>
          <div><h2 className="text-3xl font-bold">Транспорт</h2><p className="text-slate-400">Парк машин и назначение</p></div>
        </div>
        <div className="text-center py-20"><div className="text-8xl mb-6">🚧</div><h3 className="text-3xl font-bold mb-4">Панель в разработке</h3><p className="text-slate-400 text-lg mb-8">Функционал будет добавлен в следующих версиях</p><Link href="/" className="glass rounded-xl px-6 py-3 inline-block hover:scale-105 transition-transform">Вернуться на главную</Link></div>
      </div>
    </div>
  );
}
