# Горьмост — Система управления работами

## О проекте
Система управления работами Лефортовского тоннеля (и других объектов ГОРМОСТ).
- **Стек**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS, Supabase (PostgreSQL)
- **Репо**: https://github.com/Andrei-berg/gormost
- **Деплой**: https://gormost.vercel.app (логин: 0000, PIN: 1234)
- **БД**: Supabase project `wwwtsvboqffzbnliuiun`

## Правило: компонентный подход
Андрей хочет добавлять/удалять фичи **без полной переписи кода**.

**Образец структуры — `dispatcher/page.tsx`:**
```
src/app/dispatcher/page.tsx          ← тонкий оркестратор (только state + loadData, ~50 строк)
src/components/dispatcher/
  KPICards.tsx                        ← блок KPI-карточек
  Toolbar.tsx                         ← фильтры + кнопки
  TableView.tsx                       ← таблица заявок
  PeopleStats.tsx                     ← статистика по людям
  ServiceSummary.tsx                  ← таблица по службам
```

**Правила для всех страниц:**
- `page.tsx` = только state + loadData, ~50 строк
- Каждая секция UI = отдельный файл в `src/components/[панель]/`
- Добавить фичу = новый компонент + 1 import в page.tsx
- Убрать фичу = удалить import + файл

## Структура панелей и роли
| Панель | Файл | Роли |
|--------|------|------|
| Диспетчерская | `src/app/dispatcher/page.tsx` | DISPATCHER, ADMIN, BOSS |
| Зам/Прораб | `src/app/zamporab/page.tsx` | ZAMPORAB, ADMIN, BOSS |
| Мастер/Бригадир | `src/app/foreman/page.tsx` | FOREMAN, ADMIN, BOSS, ZAMPORAB |
| Начальник службы | `src/app/head/page.tsx` | HEAD, ADMIN, BOSS |
| Босс (Дашборд) | `src/app/boss/page.tsx` | BOSS, ADMIN |
| Транспорт | `src/app/transport/page.tsx` | TRANSPORT, ADMIN, BOSS, ZAMPORAB |
| Жалобы | `src/app/complaints/page.tsx` | COMPLAINTS, ADMIN, BOSS, DISPATCHER |
| Админ-панель | `src/app/admin/page.tsx` | ADMIN |

## Процесс согласования заявок
```
NEW → (HEAD нажимает "Согласовать") → approved_by_head = userId
    → (ZAMPORAB нажимает "Согласовать") → approved_by_zamporab = true, status = PLANNED
    → Диспетчер видит заявку (фильтр: status != NEW)
    → Заявка уходит в работу: IN_PROGRESS → CHECKING → DONE
```

## Ключевые файлы
- `src/lib/api.ts` — все запросы к Supabase (fetch/create/update/approve)
- `src/lib/auth.ts` — loginWithPin, getSession, logout, hasRole
- `src/lib/shifts.ts` — расчёт смен (авто-определение номера смены)
- `src/types/index.ts` — все TypeScript типы + STATUS_CONFIG, PANELS, SERVICE_META
- `src/components/Header.tsx` — шапка с навигацией (гамбургер-меню)
- `src/components/KanbanBoard.tsx` — канбан (общий для всех панелей)
- `src/components/RequestModal.tsx` — модалка создания/редактирования заявки
- `src/components/AuthGuard.tsx` — защита страниц по ролям

## Типы БД (важно!)
- `approved_by_head: string | null` — хранит user_id (строка)
- `approved_by_zamporab: boolean | null` — булево значение (true/false)
- `approved_by_boss: boolean | null` — булево значение (true/false)

## Службы (SERVICE_META в types/index.ts)
| ID | Название | Эмодзи |
|----|----------|--------|
| SRV-ENG | Инженерные системы | ⚡ |
| SRV-STR | Строительная служба | 🏗️ |
| SRV-FIRE | Пожарная безопасность | 🚒 |
| SRV-VENT | Вентиляция | 💨 |
| SRV-CCTV | Видеонаблюдение | 📹 |

## Команды разработки
```bash
npm run dev      # запуск локально (http://localhost:3000)
npx tsc --noEmit # проверка TypeScript без компиляции
```

## Незавершённые задачи
- [ ] Печать нарядов — ждём шаблоны документов от Андрея с работы
