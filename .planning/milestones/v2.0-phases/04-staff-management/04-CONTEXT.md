# Phase 04: Staff Management — Context

**Gathered:** 2026-03-05
**Status:** Ready for planning
**Source:** HR interview (2026-03-05) + файлы штата/смен/строевой + дизайн-документ

---

<domain>
## Phase Boundary

Phase 04 строит полный слой данных для HR-модуля и предоставляет UI для управления
жизненным циклом сотрудника. Ничего из строевой записки и отчётов — это Phase 05.

**Входные данные:**
- `roster-merged.json` — 270 сотрудников (уже собран в .planning/)
- `hr-data-model.md` — полный дизайн схемы БД
- Существующая таблица `users` + `employee_status`

**Выходные данные после Phase 04:**
- Расширенная `users` + 4 новые таблицы (professions, employee_positions, schedules, employee_assignments)
- Импортированные 270 сотрудников с профессиями, графиками и сменами
- Расширенные статусы (6 новых типов)
- Функция `resolveShiftForDate()` для вычисления день/ночь/не работает
- Employee detail card в /hr (клик по имени)
- ADMIN: форма найма / увольнения / перевода

</domain>

---

<decisions>
## Locked Decisions (from HR interview)

### Структура ФИО
- Хранить раздельно: `last_name`, `first_name`, `middle_name`
- Поле `full_name` оставить для обратной совместимости (backward compat)
- При создании нового сотрудника собирать full_name из трёх частей

### Профессии и разряды
- Таблица `professions`: `name` + `grade` + `category` (ИТР/рабочий)
- Каноническое название — из файла штатного расписания (не из файла смен)
- Разряд — отдельное поле, не часть названия профессии
- Примеры: "Дорожный рабочий" + "3 разряд" | "Главный механик" + NULL
- ИТР — должности без разряда (или "1 категория" для Инженеров)

### История должностей (SCD Type 2)
- Таблица `employee_positions`: одна строка с `ended_at IS NULL` = текущая
- При переводе: старая запись получает `ended_at = today`, создаётся новая
- Partial unique index: `(user_id) WHERE ended_at IS NULL`
- change_reason: 'прием' | 'перевод' | 'повышение' | 'понижение' | 'совмещение'

### Графики работы
- 6 типов: сутки/3, 5/2, 3/3, 6/6, 15/15, 1/3
- сутки/3 и 1/3 — is_shift_based=true (привязаны к номеру смены 1-4)
- default_day_night: night (сутки/3, 1/3) | day (5/2, 3/3, 6/6 не-водители) | alternating (водители 6/6 и 15/15 — Phase водителей, пока skip)

### Назначение на смену
- Таблица `employee_assignments`: один активный ряд на сотрудника (ended_at IS NULL)
- shift_num: 1-4 для сутки/3 и 1/3, NULL для остальных
- rotation_group: '1', '2', '2_1' для 15/15
- foreman_name: имя бригадира смены (текстовое поле)
- shift_reference_date: опорная дата для расчёта "работает ли сегодня"

### Опорные даты смен (КРИТИЧНО — сегодня 5 марта 2026 работает смена 3)
- Смена 1 (Чекин А.В.):      reference_date = 2026-03-07
- Смена 2 (Максимов И.Н.):   reference_date = 2026-03-08
- Смена 3 (Кожин В.М.):      reference_date = 2026-03-05
- Смена 4 (Станишевский А.В.): reference_date = 2026-03-06
- Формула: days_since_reference % 4 === 0 → сотрудник работает (ночь)

### Категории сотрудников
- Два значения: 'ИТР' и 'рабочий'
- 'Бригада №1' в файле смен = просто метка "рабочий", не структурная единица
- Категория используется в строевой записке и штатном расписании

### Статусы — расширение
Существующие остаются. Добавить:
- `Komandirovka` — Командировка
- `Uchebniy_otpusk` — Учебный отпуск
- `Dekret` — Декрет / отпуск по уходу за ребёнком
- `Mobilizovan` — Мобилизован (был сотрудником, призвали)
- `SVO` — Ушёл по контракту (договор приостановлен)
- `Troydoustroyen_s_SVO` — Вернулся с СВО, принят снова
- НЕ показывать кнопку Uvolen как статус — это lifecycle event (fireEmployee), не ежедневный статус

### СВО-статистика
- Поле `svo_type` на users: 'мобилизован' | 'контракт' | 'через_регион'
- Статистика выводится в строевой записке (Phase 05), но данные собираем здесь
- Трудоустроен с СВО = отдельный статус Troydoustroyen_s_SVO в employee_status

### Инвалидность
- `is_disabled` BOOLEAN + `disability_group` SMALLINT (1/2/3) + `disability_notes` TEXT
- disability_notes = производственные ограничения (что нельзя делать), не медицинский диагноз
- Используется для предупреждения при назначении на наряд (Phase 05+)
- Не блокировать назначение, только предупреждать

### Парковщики
- `participates_in_stroyevaya = false` — не участвуют в строевой записке
- В остальном обычные сотрудники

### Водители
- На паузе до доработки страницы гл. механика
- В назначении хранить `is_driver = true` для будущего специального расчёта день/ночь
- Пока day/night для водителей = 'day' (заглушка)

### Employee Detail Card (UI)
- Открывается кликом по имени в /hr
- Показывает: ФИО, профессия+разряд, категория, график, смена, телефон, email,
  дата приёма, испытательный срок (если активен), инвалидность (если есть)
- История должностей: список переводов с датами
- Последние 10 назначений на заявки (из request_assignments)
- ADMIN видит кнопки: "Уволить", "Перевести на должность"

### Hire/Dismiss UI (ADMIN only)
- Найм: модальная форма, поля ФИО, профессия, категория, телефон, дата приёма, испытательный срок
- Увольнение: подтверждение с датой увольнения, сотрудник переходит в секцию "Уволенные"
- Перевод: выбор новой профессии + причина + дата

### Импорт данных
- 270 сотрудников из `.planning/roster-merged.json`
- SQL seed-миграция (не скрипт!) — чтобы была версионируемость
- Профессии берутся из поля `profession` (из штатного файла)
- Имя разбивается на last_name/first_name/middle_name по пробелам (3 части)
- Пустые scheduleId для 46 ИТР без графика → назначается 5/2 по умолчанию

</decisions>

---

<specifics>
## Specific Implementation Details

### Таблица `professions` — сид-данные
Извлечены из штатного файла. Уникальный ключ: (name, grade).
Примерно 45 профессий. Полный список в roster-merged.json (поле profession).

### Таблица `schedules` — сид-данные
```
code        name                    work  rest  day_night   shift_based
сутки/3     Суточный                1     3     night       true
5/2         Пятидневка              5     2     day         false
3/3         Трёхдневная вахта       3     3     day         false
6/6         Шестидневная вахта      6     6     day         false
15/15       Полумесячная вахта      15    15    day         false
1/3         Диспетчерский суточный  1     3     night       true
```

### resolveShiftForDate — логика по типам
- сутки/3: `(date - reference_date) % 4 === 0` → working, NIGHT
- 5/2: weekday → working, DAY
- 3/3: `(date - reference_date) % 6 < 3` → working, DAY
- 1/3: `(date - reference_date) % 4 === 0` → working, NIGHT
- 6/6: `(date - reference_date) % 12 < 6` → working, DAY (non-driver placeholder)
- 15/15(1): day_of_month ∈ [1..15] → working, DAY
- 15/15(2): day_of_month ∈ [16..end] → working, DAY
- 15/15(2_1): `days_since_reference % 30 < 15` → working, DAY

### Расположение новых компонентов
- `src/components/hr/EmployeeDetailCard.tsx` — детальная карточка
- `src/components/hr/HireModal.tsx` — форма найма
- `src/components/hr/DismissModal.tsx` — подтверждение увольнения
- `src/components/hr/TransferModal.tsx` — перевод на должность
- `src/lib/shifts.ts` — добавить `resolveShiftForDate()` (уже существует)
- `supabase/migrations/` — 3 миграции + 2 seed-файла

### Существующий код, который надо расширить
- `EmployeeStatusType` в types/index.ts — добавить 6 новых значений
- `EMPLOYEE_STATUS_CONFIG` — добавить конфиг для 6 новых статусов
- `EmployeeCard.tsx` — добавить новые кнопки статусов (не все показываются всем)
- `fetchEnrichedEmployees()` в api.ts — добавить JOIN с employee_assignments и professions
- `hireEmployee()` / `fireEmployee()` в api.ts — расширить с новыми полями

### Доступ к карточке
- Клик по имени сотрудника в ServiceSection открывает EmployeeDetailCard
- Модальное окно или side panel (на усмотрение плейнера)
- ZAMPORAB, HEAD, ADMIN, BOSS — могут открыть карточку (read)
- Только ADMIN — видит кнопки изменения (hire/dismiss/transfer)

</specifics>

---

<deferred>
## Deferred (не в Phase 04)

- Строевая записка — Phase 05 (логика resolveShiftForDate готова, вывод позже)
- Штатное расписание — Phase 05
- Карточка водителя / привязка к технике — при доработке страницы гл. механика
- Диспетчеры 1/3 — опорные даты уточнить у HR, placeholder пока
- Зимние мобильные бригады — отдельная фича
- Оставшиеся ~91 сотрудник (больничные/отпуска/СВО не в файле смен) — ручной ввод через Admin
- Предупреждение при назначении инвалида на наряд — Phase 05+
</deferred>

---

*Phase: 04-staff-management*
*Context gathered: 2026-03-05 via HR interview + data analysis*
