'use client';

import { useEffect, useState } from 'react';
import { getCurrentShift } from '@/lib/shifts';

export default function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const shift = getCurrentShift(currentTime);

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

  return (
    <div className="glass-strong rounded-2xl p-6 mb-6 animate-slide-down">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🏗️</div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Гормост
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Лефортовский тоннель
            </p>
          </div>
        </div>
        
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-slate-400 mb-1">Сейчас</p>
          <p className="text-xl font-bold mb-2">{formatDateTime(currentTime)}</p>
          <div className="flex gap-2">
            <div className="glass rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse-slow"></div>
              Смена {shift.shiftNo}
            </div>
            <div className="glass rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
              {shift.shiftType === 'DAY' ? '☀️ ДЕНЬ' : '🌙 НОЧЬ'}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{shift.shiftChief}</p>
        </div>
      </div>
    </div>
  );
}
