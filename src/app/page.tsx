'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
  };

  const panels = [
    {
      id: 'dispatcher',
      title: 'Диспетчерская',
      description: 'Центральный узел управления • Мониторинг смены',
      icon: '📡',
      href: '/dispatcher',
      gradient: 'from-blue-600 via-blue-700 to-indigo-800',
      role: 'Начальник смены',
    },
    {
      id: 'zamporab',
      title: 'Зам/Прораб',
      description: 'Планирование смены • Распределение людей',
      icon: '📋',
      href: '/zamporab',
      gradient: 'from-purple-600 via-purple-700 to-indigo-800',
      role: 'Заместитель прораба',
    },
    {
      id: 'master',
      title: 'Мастер/Бригадир',
      description: 'Мои задачи • Выполнение работ',
      icon: '👷',
      href: '/master',
      gradient: 'from-emerald-600 via-teal-700 to-green-800',
      role: 'Мастер участка',
    },
    {
      id: 'service',
      title: 'Начальник службы',
      description: 'План работ службы • Контроль выполнения',
      icon: '🏗️',
      href: '/service',
      gradient: 'from-amber-600 via-yellow-700 to-orange-800',
      role: 'Начальник службы',
    },
    {
      id: 'boss',
      title: 'Босс (Дашборд)',
      description: 'KPI • Статистика • Проблемы • Heatmap',
      icon: '📊',
      href: '/boss',
      gradient: 'from-red-600 via-rose-700 to-pink-800',
      role: 'Начальник участка',
    },
    {
      id: 'transport',
      title: 'Транспорт',
      description: 'Парк машин • Назначение транспорта',
      icon: '🚗',
      href: '/transport',
      gradient: 'from-lime-600 via-green-700 to-emerald-800',
      role: 'Главный механик',
    },
    {
      id: 'complaints',
      title: 'Жалобы',
      description: 'Регистрация жалоб • Обработка обращений',
      icon: '📞',
      href: '/complaints',
      gradient: 'from-violet-600 via-purple-700 to-fuchsia-800',
      role: 'Обработчик жалоб',
    },
    {
      id: 'admin',
      title: 'Админ-панель',
      description: 'Справочники • Объекты • Пользователи',
      icon: '⚙️',
      href: '/admin',
      gradient: 'from-slate-600 via-gray-700 to-zinc-800',
      role: 'Администратор',
    },
  ];

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-8 mb-8 animate-slide-down">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-6xl">🏗️</div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Гормост
              </h1>
              <p className="text-slate-300 mt-1">
                Система управления работами Лефортовского тоннеля
              </p>
            </div>
          </div>
          
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-slate-400 mb-1">Сейчас</p>
            <p className="text-2xl font-bold mb-2">{formatDateTime(currentTime)}</p>
            <div className="flex gap-2">
              <div className="glass rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse-slow"></div>
                SHIFT-DA-3-3
              </div>
              <div className="glass rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                ☀️ ДЕНЬ
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {panels.map((panel, index) => (
          <Link
            key={panel.id}
            href={panel.href}
            className="group relative glass-strong rounded-2xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-white/10"
            style={{
              animationDelay: `${index * 0.1}s`,
              animation: 'fadeIn 0.5s ease-out forwards',
              opacity: 0,
            }}
          >
            {/* Gradient Overlay */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${panel.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
            
            {/* Content */}
            <div className="relative z-10">
              <div className="text-5xl mb-4">{panel.icon}</div>
              <h2 className="text-2xl font-bold mb-2 group-hover:text-white transition-colors">
                {panel.title}
              </h2>
              <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                {panel.description}
              </p>
              <div className="glass rounded-lg px-3 py-1.5 text-xs text-slate-300 inline-block">
                {panel.role}
              </div>
            </div>

            {/* Arrow Icon */}
            <div className="absolute bottom-6 right-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
              →
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-slate-400 text-sm">
        <p>Система управления v1.0 • Лефортовский тоннель • 2026</p>
      </div>
    </div>
  );
}
