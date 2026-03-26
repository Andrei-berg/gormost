# HR Data Model Design
*Версия 1.0 — на основе файлов штата, смен и ответов HR*

---

## Принципы проектирования

1. **Не дублировать** — `users` уже есть, расширяем его, не создаём `employees`
2. **История без потерь** — переводы, смена профессии, изменение графика → append-only лог
3. **Присутствие по умолчанию** — если нет записи статуса, сотрудник считается на работе (уже реализовано)
4. **Расчёт, не хранение** — "работает ли сегодня день/ночь" вычисляется по дате, не хранится
5. **Источник правды** — профессия из штатного расписания (не из файла смен)

---

## 1. Расширение таблицы `users`

Существующие поля: `user_id`, `tab_number`, `full_name`, `position`, `role_level`,
`service_id`, `is_active`, `phone`, `date_hired`, `date_fired`

**Добавить:**

```sql
-- ФИО отдельно (для документов, отчётов)
last_name       TEXT,                          -- Фамилия
first_name      TEXT,                          -- Имя
middle_name     TEXT,                          -- Отчество

-- Контакт
email           TEXT,                          -- необязательно

-- Кадровые поля
category        TEXT CHECK (category IN ('ИТР', 'рабочий')),
probation_start DATE,                          -- начало испытательного срока
probation_end   DATE,                          -- окончание испытательного срока

-- Особые отметки
is_disabled          BOOLEAN DEFAULT false,
disability_group     SMALLINT CHECK (disability_group IN (1, 2, 3)),
disability_notes     TEXT,                     -- ограничения по видам работ
has_many_children    BOOLEAN DEFAULT false,

-- СВО
svo_type        TEXT CHECK (svo_type IN ('мобилизован', 'контракт', 'через_регион')),

-- Строевая записка
participates_in_stroyevaya  BOOLEAN DEFAULT true  -- false для парковщиков
```

### Примечания
- `full_name` остаётся для обратной совместимости; при вводе нового сотрудника собирается из last/first/middle
- `category` — ИТР или рабочий; определяет попадание в соответствующую строку строевой записки
- `disability_notes` — не диагноз, а ограничения: "нельзя поднимать тяжести > 10 кг", "работа только в помещении"
- `svo_type` заполняется когда `currentStatus = Mobilizovan` или `SVO`; нужен для статистики

---

## 2. Расширение типа `EmployeeStatusType`

**Текущие:** `Na_rabote`, `Otgul`, `Bolnichniy`, `Otpusk`, `Uvolen`

**Добавить:**

```typescript
| 'Komandirovka'         // Командировка
| 'Uchebniy_otpusk'      // Учебный отпуск
| 'Dekret'               // Декрет / отпуск по уходу за ребёнком
| 'Mobilizovan'          // Мобилизован (был сотрудником, мобилизовали)
| 'SVO'                  // Ушёл на СВО по контракту (договор приостановлен)
| 'Troydoustroyen_s_SVO' // Вернулся с СВО, трудоустроен снова
```

**Логика `Uvolen`** остаётся как событийная метка (пишется при `fireEmployee`),
но в EmployeeCard не показывается как "текущий статус" — вместо этого `is_active = false`.

### Конфиг для новых статусов
```typescript
Komandirovka:         { label: 'Командировка',     color: '#8b5cf6', bg: 'bg-violet-500/20 border-violet-500/30' },
Uchebniy_otpusk:      { label: 'Учебный отпуск',   color: '#3b82f6', bg: 'bg-blue-500/20 border-blue-500/30' },
Dekret:               { label: 'Декрет',            color: '#ec4899', bg: 'bg-pink-500/20 border-pink-500/30' },
Mobilizovan:          { label: 'Мобилизован',       color: '#dc2626', bg: 'bg-red-700/20 border-red-700/30' },
SVO:                  { label: 'СВО',               color: '#991b1b', bg: 'bg-red-900/20 border-red-900/30' },
Troydoustroyen_s_SVO: { label: 'Вернулся с СВО',   color: '#16a34a', bg: 'bg-green-700/20 border-green-700/30' },
```

---

## 3. Новая таблица `professions`

Справочник должностей и профессий. Источник правды — файл штата.

```sql
CREATE TABLE professions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                    -- "Дорожный рабочий", "Главный механик"
  grade       TEXT,                             -- "3 разряд", "1 категория", NULL для ИТР без разряда
  category    TEXT NOT NULL CHECK (category IN ('ИТР', 'рабочий')),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (name, COALESCE(grade, ''))
);
```

**Примеры строк:**
| name | grade | category |
|------|-------|----------|
| Дорожный рабочий | 3 разряд | рабочий |
| Слесарь-сантехник | 5 разряд | рабочий |
| Электромонтажник по сигнализации, централизации и блокировке | 5 разряд | рабочий |
| Инженер | 1 категория | ИТР |
| Главный механик | NULL | ИТР |
| Начальник участка | NULL | ИТР |

*Из файлов данных — ~45 уникальных профессий/должностей по Лефортово.*

---

## 4. Новая таблица `employee_positions` (история должностей)

Медленно меняющееся измерение (SCD Type 2). Хранит всю историю переводов.

```sql
CREATE TABLE employee_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(user_id),
  profession_id   UUID NOT NULL REFERENCES professions(id),
  started_at      DATE NOT NULL,
  ended_at        DATE,                          -- NULL = текущая должность
  change_reason   TEXT CHECK (change_reason IN (
                    'прием', 'перевод', 'повышение', 'понижение', 'совмещение'
                  )),
  notes           TEXT,
  created_by      UUID REFERENCES users(user_id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Только одна запись с ended_at IS NULL на сотрудника
CREATE UNIQUE INDEX employee_positions_current
  ON employee_positions (user_id)
  WHERE ended_at IS NULL;
```

**API:**
- `getCurrentPosition(userId)` → `employee_positions JOIN professions WHERE ended_at IS NULL`
- `getPositionHistory(userId)` → все записи, сортировка по `started_at DESC`
- `transferEmployee(userId, newProfessionId, reason)` → закрыть старую (`ended_at = today`), открыть новую

---

## 5. Новая таблица `schedules` (справочник графиков)

```sql
CREATE TABLE schedules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  work_days           SMALLINT NOT NULL,
  rest_days           SMALLINT NOT NULL,
  default_day_night   TEXT NOT NULL CHECK (default_day_night IN ('night', 'day', 'alternating')),
  is_shift_based      BOOLEAN DEFAULT false,    -- true = привязан к номеру смены
  created_at          TIMESTAMPTZ DEFAULT now()
);
```

**Начальные данные:**
| code | name | work | rest | day_night | shift_based |
|------|------|------|------|-----------|-------------|
| сутки/3 | Суточный | 1 | 3 | night | true |
| 5/2 | Пятидневка | 5 | 2 | day | false |
| 3/3 | Трёхдневка | 3 | 3 | day | false |
| 6/6 | Шестидневная вахта | 6 | 6 | day | false |
| 15/15 | Полумесячная вахта | 15 | 15 | day | false |
| 1/3 | Диспетчерский суточный | 1 | 3 | night | true |

*Водители на 6/6 и 15/15 — частный случай, помечается на уровне назначения.*

---

## 6. Новая таблица `employee_assignments` (назначение на график/смену)

```sql
CREATE TABLE employee_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(user_id),
  schedule_id           UUID NOT NULL REFERENCES schedules(id),
  shift_num             SMALLINT,               -- 1-4 для сутки/3 и 1/3, NULL для остальных
  rotation_group        TEXT,                   -- '1', '2', '2_1' для 15/15
  foreman_name          TEXT,                   -- Чекин А.В., Максимов И.Н., ...
  shift_reference_date  DATE,                   -- опорная дата для расчёта "работает ли сегодня"
  is_driver             BOOLEAN DEFAULT false,  -- водитель: day/night alternating
  started_at            DATE NOT NULL,
  ended_at              DATE,
  created_by            UUID REFERENCES users(user_id),
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX employee_assignments_current
  ON employee_assignments (user_id)
  WHERE ended_at IS NULL;
```

---

## 7. Логика расчёта "работает ли сегодня и день/ночь"

Функция `resolveShiftForDate(assignment, date)` → `{ isWorking: bool, shift_type: 'DAY'|'NIGHT'|null }`

### По типу графика:

**`сутки/3`** (смены 1–4, всегда ночь)
```
days_elapsed = date - shift_reference_date
is_working = days_elapsed % 4 === 0
shift_type = 'NIGHT'
```

**`5/2`** (ИТР, прорабы — всегда день)
```
is_working = date.dayOfWeek not in [SAT, SUN]
shift_type = 'DAY'
```

**`3/3`** (всегда день)
```
days_elapsed = date - shift_reference_date
is_working = days_elapsed % 6 < 3
shift_type = 'DAY'
```

**`1/3`** (диспетчеры суточники — ночь по смене)
```
days_elapsed = date - shift_reference_date
is_working = days_elapsed % 4 === 0
shift_type = 'NIGHT'
```

**`6/6`** (вахта)
```
days_elapsed = date - shift_reference_date
period_day = days_elapsed % 12
is_working = period_day < 6
shift_type = is_driver
  ? (floor(days_elapsed / 15) % 2 === 0 ? 'NIGHT' : 'DAY')
  : 'DAY'
```

**`15/15`** (вахта, с учётом группы ротации)
```
rotation_group '1'   → is_working = day_of_month ∈ [1..15]
rotation_group '2'   → is_working = day_of_month ∈ [16..end]
rotation_group '2_1' → смотрим по shift_reference_date: работает 15 дней с ref_date
shift_type = is_driver
  ? (floor(days_since_ref / 15) % 2 === 0 ? 'NIGHT' : 'DAY')
  : 'DAY'
```

### Финальный алгоритм строевой записки на дату D:
```
for each active employee:
  1. get current assignment → schedule, shift_num, rotation_group, is_driver, ref_date
  2. check current status → if != Na_rabote → попадает в соотв. строку (больничный/отпуск/СВО/...)
  3. if Na_rabote → resolveShiftForDate(assignment, D)
     - is_working=true → добавить в count_day или count_night
     - is_working=false → отдых (не считается в строевой)
  4. if participates_in_stroyevaya=false → не включать (парковщики)
```

---

## 8. Статистика СВО

Данные для строевой записки по СВО:

```sql
-- По штату (СВО всего):
SELECT count(*) FROM users
WHERE svo_type IS NOT NULL AND is_active = false;

-- Разбивка по типу:
SELECT svo_type, count(*) FROM users
WHERE svo_type IS NOT NULL GROUP BY svo_type;

-- Вернулись с СВО и трудоустроены:
SELECT count(*) FROM employee_status
WHERE status = 'Troydoustroyen_s_SVO';

-- Уволенные после СВО (is_active=false, svo_type IS NOT NULL, нет статуса Troydoustroyen):
SELECT count(*) FROM users u
WHERE u.svo_type IS NOT NULL
  AND u.is_active = false
  AND NOT EXISTS (
    SELECT 1 FROM employee_status es
    WHERE es.user_id = u.user_id AND es.status = 'Troydoustroyen_s_SVO'
  );
```

---

## 9. Инвалиды — управление нагрузкой

**Лучшая практика (Disability Management):** хранить не медицинский диагноз,
а производственные ограничения — что сотрудник НЕ может делать.

В `disability_notes` храним в свободном тексте:
> "Ограничения по ВТЭК: нельзя поднимать > 10 кг, противопоказан шум > 70 дБ, только закрытые помещения"

Применение в системе:
- При формировании бригады на наряд-задание (Phase 05) — показывать предупреждение
- В штатном расписании — ИТР/HR видит плашку "Имеет ограничения"
- Не блокировать назначение, только предупреждать (окончательное решение — за мастером/HR)

---

## 10. Организационная структура (бригады)

**Постоянные смены** (на всё время работы сотрудника):
- `shift_num` 1–4 в таблице `employee_assignments`
- Бригадир смены = `foreman_name`

**Временные бригады** (на конкретный наряд):
- Формируются в `WorkPlanItem.workers[]` (уже реализовано)
- `Бригада №1` в файле смен = просто метка "рабочий", не структурная единица
- Мобильные зимние бригады (1 и 2 для снегоуборки) → Phase 05 или отдельная фича

**"Бригадир" vs "Мастер":**
- Бригадир = старший рабочий в смене (foreman_name в assignments)
- Мастер = ИТР, назначается на ответственные работы через WorkPlan

---

## 11. Миграция данных

### Источники:
- `roster-merged.json` (270 сотрудников) — уже собран
- Ручное добавление остальных ~91 (больничные, отпуска, СВО) — через Admin-панель

### Порядок загрузки:
1. Заполнить `schedules` (6 строк, справочник)
2. Заполнить `professions` (~45 уникальных из файла штата)
3. Для каждого из 270 в roster.json:
   - Найти/создать `users` запись по tab_number
   - Проставить `category`, `last_name`, `first_name`, `middle_name`, `phone`
   - Создать `employee_positions` запись (profession + hire_date)
   - Создать `employee_assignments` запись (schedule + shift + rotation_group)
4. СВО-статусы проставить вручную по данным HR

---

## 12. Опорные даты смен (сутки/3)

**Известно:** 5 марта 2026 работает смена №3 (Кожин В.М.).
Цикл 4 смены по очереди, каждая 1 сутки через 3 отдыха:

| Смена | Бригадир | reference_date | Следующий выход |
|-------|----------|----------------|-----------------|
| 1 | Чекин А.В. | 2026-03-07 | 7 марта |
| 2 | Максимов И.Н. | 2026-03-08 | 8 марта |
| 3 | Кожин В.М. | **2026-03-05** | 5 марта (сегодня) |
| 4 | Станишевский А.В. | 2026-03-06 | 6 марта |

**Формула:** `days_since_reference % 4 === 0` → работает (ночь).

Диспетчеры 1/3 — отдельный цикл, уточнить у HR.

## 13. Открытые вопросы (не блокируют Phase 04)

- **Водители** — специфика карточки, привязка к технике → Phase "доработка гл. механика"
- **Диспетчеры 1/3** — нужна `shift_reference_date`; уточнить у HR опорные даты
- **Зимние мобильные бригады** — структура и логика назначения
- **Импорт остальных 91** — HR заполняет вручную или ещё один файл?
- **СНИЛС/ИНН** — решено не хранить; если понадобится, добавить через миграцию

---

## Summary — что создаём в Phase 04

| Что | Тип изменения |
|-----|---------------|
| Поля в `users` (11 новых) | ALTER TABLE (миграция) |
| `professions` | CREATE TABLE + seed data |
| `employee_positions` | CREATE TABLE |
| `schedules` | CREATE TABLE + seed data |
| `employee_assignments` | CREATE TABLE |
| `EmployeeStatusType` (6 новых) | TypeScript + enum в БД |
| `resolveShiftForDate()` | Новая функция в lib/shifts.ts |
| Скрипт импорта из roster.json | Одноразовая миграция данных |
