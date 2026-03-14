# Гормост — Система управления работами тоннеля

Веб-приложение для управления работами Лефортовского тоннеля ГБУ «Гормост».

**Deploy:** https://gormost.vercel.app (логин: 0000, PIN: 1234)
**Repo:** https://github.com/Andrei-berg/gormost

---

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # заполни переменные Supabase
npm run dev                  # http://localhost:3000
```

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### База данных

Запустить миграции в Supabase SQL Editor по порядку:

```
supabase/migrations/
  001_add_hr_module.sql
  002_add_hr_fields_to_users.sql
  003_add_work_planning_module.sql
  004_add_vehicle_status_tracking.sql
  005_add_staff_management_schema.sql
  006_seed_professions_and_schedules.sql
  007_seed_employees.sql
  008_fix_seeded_employee_services.sql
  009_seed_role_users.sql
  010_fix_rls_policies.sql
  011_work_plan_approval_and_execution.sql
  012_shift_roster_and_work_assignments.sql   ← последняя
```

---

## Стек технологий

| Технология | Версия | Назначение |
|-----------|--------|-----------|
| Next.js | 16.1.1 | React фреймворк (App Router) |
| TypeScript | 5.9.3 | Типизация |
| Tailwind CSS | 3.4.0 | Стили |
| Supabase | 2.47.10 | PostgreSQL + Auth + RLS |
| @dnd-kit | — | Drag & Drop канбан |
| Vercel | — | Деплой (auto от main) |

---

## Панели и роли

| Панель | URL | Роли |
|--------|-----|------|
| Диспетчерская | `/dispatcher` | DISPATCHER, ADMIN, BOSS |
| Зам/Прораб | `/zamporab` | ZAMPORAB, ADMIN, BOSS |
| Мастер участка | `/foreman` | FOREMAN, ADMIN, BOSS, ZAMPORAB |
| Начальник службы | `/head` | HEAD, ADMIN, BOSS |
| Начальник участка | `/boss` | BOSS, ADMIN |
| Главный инженер | `/chief` | CHIEF_ENGINEER, ADMIN, BOSS |
| Транспорт | `/transport` | TRANSPORT, ADMIN, BOSS, ZAMPORAB |
| Жалобы | `/complaints` | COMPLAINTS, ADMIN, BOSS, DISPATCHER |
| Админ | `/admin` | ADMIN |

---

## Поток согласования планов работ

```
Нач. службы (до 16:00)
  └─ создаёт план работ: позиции + нужно людей/машин
        ↓ статус: DRAFT → SUBMITTED
Гл. инженер
  └─ согласовывает план
        ↓ статус: APPROVED
Зампрораб
  └─ может редактировать позиции и подтверждает
        ↓ статус: PLANNED
Начальник (совещание 16:30)
  └─ утверждает все планы
        ↓ статус: BOSS_CONFIRMED
Мастер участка (после совещания)
  └─ назначает людей поимённо на каждую позицию
        ↓ статус: ASSIGNED
  └─ запускает план в работу
        ↓ статус: IN_PROGRESS → DONE
```

---

## Система смен

4 коллектива, ротация «сутки через трое». Якорь: **11 марта 2026 = Смена 1**.

| График | Логика |
|--------|--------|
| 1/3, сутки/3 | только когда их смена дежурит (раз в 4 дня) |
| 5/2 | будние дни + их смена дежурит |
| 3/3 | 3 рабочих / 3 выходных, скользящий цикл |
| 6/6 | 6 рабочих / 6 выходных, скользящий цикл |
| 15/15 | 1–15 числа или 16–конец месяца |

Настройка в Админ → **Смены**: каждому сотруднику задаётся коллектив (1–4), график и якорная дата цикла.

---

## Назначение бригад

После утверждения начальником мастер участка в панели **Бригады** (вкладка `/foreman`):
- видит все утверждённые планы своей службы
- для каждой позиции плана назначает сотрудников поимённо из тех, кто сегодня на смене
- роли: Рабочий / Бригадир / Мастер / Водитель
- счётчик нужно/назначено (👷 2/3, 🦺 1/1)
- после назначения → статус ASSIGNED → В работу

---

## Ключевые файлы

```
src/
  app/                        ← страницы (тонкие оркестраторы ~50 строк)
  components/
    admin/ShiftTab.tsx         ← управление расписанием смен
    boss/WorkPlansMeeting.tsx  ← совещание, утверждение планов
    foreman/BrigadeAssigner.tsx← назначение людей на бригады
    head/PlanCard.tsx          ← карточка плана нач. службы
    zamporab/ZamporabPlanCard.tsx ← редактирование плана зампрорабом
    ShiftRoster.tsx            ← виджет состава смены (общий)
  lib/
    api.ts                     ← все Supabase запросы
    shifts.ts                  ← расчёт смен + isWorkerOnDuty()
    auth.ts                    ← loginWithPin, getSession
  types/index.ts               ← все TypeScript типы
supabase/migrations/           ← SQL миграции (запускать по порядку)
```

---

## Разработка

```bash
npm run dev          # dev server
npm run build        # production build (обязательно перед коммитом)
npm run lint         # линтер
npx tsc --noEmit     # проверка типов
```

---

© 2026 ГБУ «Гормост». Все права защищены.
