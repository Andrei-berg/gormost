'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

export default function DispatcherPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen p-8">
      <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
        ← Назад к главной
      </Link>
      
      <Header />

      <div className="glass-strong rounded-2xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-5xl">📡</div>
          <div>
            <h2 className="text-3xl font-bold">Диспетчерская</h2>
            <p className="text-slate-400">Центральный узел управления и мониторинг</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">12</div>
            <div className="text-sm text-slate-400">Всего заявок</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-2xl font-bold text-red-400">3</div>
            <div className="text-sm text-slate-400">Проблемы</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">8</div>
            <div className="text-sm text-slate-400">Выполнено</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-400">4</div>
            <div className="text-sm text-slate-400">На линии</div>
          </div>
        </div>

        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-2xl font-bold mb-2">Панель в разработке</h3>
          <p className="text-slate-400">
            Здесь будет канбан-доска по службам с Drag & Drop
          </p>
        </div>
      </div>
    </div>
  );
}
