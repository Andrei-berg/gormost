# ARCHITECTURE.md — Gormost: Архитектура кодовой базы

## Структура папок

```
gormost/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Корневой layout (HTML, metadata, globals.css)
│   │   ├── page.tsx                # Главная страница (сетка панелей)
│   │   ├── globals.css             # Базовые стили (glassmorphism, scrollbar)
│   │   ├── login/page.tsx          # Вход по таб.номеру + PIN
│   │   ├── admin/page.tsx
│   │   ├── boss/page.tsx
│   │   ├── complaints/page.tsx
│   │   ├── dispatcher/page.tsx
│   │   ├── foreman/page.tsx
│   │   ├── head/page.tsx
│   │   ├── transport/page.tsx
│   │   └── zamporab/page.tsx
│   │
│   ├── components/
│   │   ├── AuthGuard.tsx           # Защита страниц по ролям
│   │   ├── Header.tsx              # Шапка (часы, смена, навигация, логаут)
│   │   ├── KanbanBoard.tsx         # Drag-and-drop доска (общая)
│   │   ├── RequestCard.tsx         # Карточка заявки в канбане
│   │   ├── RequestModal.tsx        # Модалка создания/редактирования заявки
│   │   ├── dispatcher/             # Компоненты диспетчерской
│   │   │   ├── KPICards.tsx
│   │   │   ├── KPIPanel.tsx
│   │   │   ├── KanbanBoard.tsx     # Специализированный канбан
│   │   │   ├── PeopleStats.tsx
│   │   │   ├── ServiceSummary.tsx
│   │   │   ├── TableView.tsx
│   │   │   └── Toolbar.tsx
│   │   ├── boss/
│   │   │   └── OverviewCharts.tsx
│   │   ├── foreman/
│   │   │   └── TaskList.tsx
│   │   ├── head/
│   │   │   └── ServiceStats.tsx
│   │   ├── transport/
│   │   │   ├── TransportRequests.tsx
│   │   │   └── VehicleGrid.tsx
│   │   └── zamporab/
│   │       └── PlanStats.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Singleton клиент Supabase
│   │   ├── api.ts                  # Все запросы к БД (CRUD + статистика)
│   │   ├── auth.ts                 # Логин, сессия, логаут, hasRole
│   │   ├── shifts.ts               # Расчёт смен и форматирование дат
│   │   └── logger.ts               # Запись в таблицу changelog
│   │
│   └── types/
│       └── index.ts                # Все TypeScript-типы + STATUS_CONFIG, PANELS
│
├── supabase/migrations/            # SQL-миграции (создаёт агент, выполняет человек)
├── CLAUDE.md                       # Правила для AI-агента
├── PROJECT.md                      # Описание продукта и бизнес-логики
├── ARCHITECTURE.md                 # Этот файл
├── STATE.md                        # Текущее состояние проекта и планы
└── .env.local                      # Секреты (не в git)
```

---

## Слои приложения

```
Browser
  └─ Next.js (App Router, 'use client')
      └─ page.tsx          ← единственный держатель state
          └─ components/   ← чистые, только props
              └─ lib/api.ts ← все запросы к Supabase
                  └─ Supabase (PostgreSQL)
```

Нет Redux, нет Context, нет глобального state. Каждая страница — изолированный остров.

---

## Паттерн страницы (обязательный)

Каждый `page.tsx` устроен одинаково:

```typescript
'use client'
// 1. Imports
import { useState, useEffect, useCallback } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { Header } from '@/components/Header'
import { fetchRequests, fetchServices } from '@/lib/api'
import type { Request, AuthSession } from '@/types'

// 2. Inner component (получает session от AuthGuard)
function PageContent({ session }: { session: AuthSession }) {
  // 3. State — данные + UI-флаги
  const [requests, setRequests] = useState<Request[]>([])
  const [showModal, setShowModal] = useState(false)

  // 4. loadData — один useCallback, грузит всё параллельно
  const loadData = useCallback(async () => {
    const [reqs, svcs] = await Promise.all([
      fetchRequests(),
      fetchServices(),
    ])
    setRequests(reqs)
  }, [])

  // 5. Эффекты: первичная загрузка + auto-refresh
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30_000)
    return () => clearInterval(interval)
  }, [loadData])

  // 6. Render — только компоненты, никакой логики
  return (
    <div>
      <Header ... />
      <KPICards requests={requests} />
      <KanbanBoard requests={requests} onStatusChange={loadData} />
      {showModal && <RequestModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

// 7. Обёртка AuthGuard — роли здесь
export default function Page() {
  return <AuthGuard roles={['DISPATCHER', 'ADMIN', 'BOSS']}>{(s) => <PageContent session={s} />}</AuthGuard>
}
```

**Правило:** `page.tsx` ≈ 50 строк. Всё остальное — в компонентах.

---

## Поток данных: обновление статуса заявки

```
Пользователь тащит карточку в Канбане
  → KanbanBoard.handleDrop(requestId, newStatus)
  → updateRequestStatus(requestId, newStatus, userId)   ← lib/api.ts
      → supabase.from('requests').update({ status })
      → если IN_PROGRESS → заполняет fact_start
      → если DONE       → заполняет fact_finish
      → logAction('UPDATE_STATUS', ...) → INSERT в changelog
  → page.loadData()                                     ← обновляем весь state
  → React ре-рендерит компоненты
```

---

## Аутентификация

### Поток входа

```
/login/page.tsx
  → loginWithPin(tabNumber, pin)          ← lib/auth.ts
      → fetchUsers WHERE tab_number=? AND is_active=true
      → сравниваем pin_code
      → создаём AuthSession { user_id, role_level, service_id, ... }
      → localStorage.setItem('gormost_session', JSON.stringify(session))
      → logAction('LOGIN')
  → router.push('/')
```

### Защита страниц — AuthGuard

```typescript
// Компонент проверяет сессию синхронно из localStorage
// Если нет сессии → redirect /login
// Если роль не подходит → redirect /
// Если всё ок → рендерит children(session)
```

- Хранение: `localStorage` (ключ `gormost_session`)
- Нет JWT, нет куков, нет серверных сессий
- При логауте: `clearSession()` + логируем LOGOUT

### Матрица ролей → панели

| Панель | Роли |
|--------|------|
| `/dispatcher` | DISPATCHER, ADMIN, BOSS |
| `/zamporab` | ZAMPORAB, ADMIN, BOSS |
| `/foreman` | FOREMAN, ADMIN, BOSS, ZAMPORAB |
| `/head` | HEAD, ADMIN, BOSS |
| `/boss` | BOSS, ADMIN |
| `/transport` | TRANSPORT, ADMIN, BOSS, ZAMPORAB |
| `/complaints` | COMPLAINTS, ADMIN, BOSS, DISPATCHER |
| `/admin` | ADMIN |

---

## Supabase: клиент и API-слой

### Инициализация (`lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```
Один singleton, импортируется из `lib/api.ts`. Нигде больше не создаётся.

### Структура api.ts
```
fetchUsers / createUser / updateUser / deleteUser
fetchServices / createService / ...
fetchCategories / fetchObjects / fetchConstructions / fetchWorkTypes
fetchRequests(filters?) / createRequest / updateRequest / updateRequestStatus
approveRequest(id, role, userId)
fetchAssignments / assignUsers
fetchStaffRequests / createStaffRequest / updateStaffRequestStatus
fetchRemarks / createRemark
fetchChangelog
fetchPeopleStats / fetchRequestStats
```
Каждая write-операция вызывает `logAction()` → пишет в `changelog`.

---

## Система стилей

**Tailwind CSS** — всё стилизуется через utility-классы, никаких отдельных .css файлов.

**Тема:** тёмная, glassmorphism-эффект.

`globals.css` содержит только:
- Базовые стили body (gradient background)
- `.glass` и `.glass-strong` — классы для карточек (backdrop-blur + rgba)
- Кастомный скроллбар

**tailwind.config.ts** расширяет палитру:
```
Цвета служб:   str(violet), eng(yellow), fire(red), vent(cyan), cctv(green)
Цвета статусов: new(yellow), planned(blue), progress(violet), checking(orange), done(green)
Приоритеты:    low(slate), medium(blue), high(orange), critical(red)
Анимации:      slide-down, fade-in, pulse-slow
```

---

## Drag-and-Drop

Библиотека: `@dnd-kit/core` + `@dnd-kit/sortable`

Используется в `KanbanBoard.tsx`:
- Колонки = `DroppableColumn` (DndContext)
- Карточки = `DraggableCard` (useDraggable)
- При drop → вызывает `onStatusChange(requestId, newStatus)`
- Локальный state только для подсветки при hover (dragOver)

---

## Система смен (`lib/shifts.ts`)

```
База: 2 января 2025 = Смена 4
Цикл: каждые 4 дня (1 рабочий + 3 выходных)

getShiftForDate(date) → { shiftNumber, chiefName, isWorking }
getCurrentShift()     → getShiftForDate(today)
getCurrentPeriod()    → 'day' (07:00–19:00) | 'night' (19:00–07:00)
```

---

## Сборка и деплой

```
git push → main
  → GitHub webhook → Vercel
      → npm run build (Next.js)
          → TypeScript check (strict)
          → Tailwind CSS purge
          → Code splitting по страницам
      → Deploy на gormost.vercel.app
```

Env-переменные задаются в Vercel Dashboard (не в .env.local).

**Локально перед коммитом:**
```bash
npm run build    # обязательно — если падает, не коммитим
npm run lint     # проверка ESLint
```

---

## Работа с БД: миграции

Миграции не запускаются автоматически. Процесс:

1. Агент создаёт файл `supabase/migrations/NNN_description.sql`
2. Файл содержит: комментарий (что/зачем) + SQL + rollback-секцию
3. Человек запускает SQL вручную в Supabase SQL Editor
4. Файл коммитится в git как документация

---

## Конфигурационные файлы

| Файл | Содержание |
|------|-----------|
| `next.config.js` | `reactStrictMode: true` — минимальная конфигурация |
| `tailwind.config.ts` | Расширенная палитра + анимации |
| `tsconfig.json` | strict, ES2017, path alias `@/*` → `./src/*` |
| `postcss.config.js` | tailwindcss + autoprefixer |

---

## Типичные ошибки и их причины

| Ошибка | Причина |
|--------|---------|
| Пустой экран после логина | Нет сессии в localStorage или роль не совпадает |
| Заявка не появляется у диспетчера | Не согласована через Зам/Прораб (нет PLANNED) |
| `approved_by_head` не работает | Это `string`, а не `boolean` — хранит user_id |
| Компонент не обновляется | Данные обновляются раз в 30с — нажать Refresh |
| Build падает | TypeScript-ошибка — запустить `npx tsc --noEmit` для деталей |
