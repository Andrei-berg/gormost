-- 042_journal_daily_plans.sql
-- Журнал планов (этап 1 проекта внедрения): ежедневное планирование объект × служба.
-- WHY: один оператор (BOSS/ADMIN) ежедневно вносит планы → дашборд начальника
-- наполняется реальными данными. Отдельные лёгкие таблицы — воронка согласования
-- work_plans НЕ задействована. Имена с префиксом journal_, т.к. в БД уже есть
-- таблицы objects/categories (каталог конструкций) — коллизию исключаем.

create table if not exists journal_object_categories (
  id          text primary key,
  name        text not null,
  emoji       text not null default '📍',
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists journal_objects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category_id text not null references journal_object_categories(id),
  address     text not null default '',
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_journal_objects_category on journal_objects(category_id);

create table if not exists daily_plan_items (
  id                 uuid primary key default gen_random_uuid(),
  plan_date          date not null,
  shift_type         text not null default 'DAY' check (shift_type in ('DAY','NIGHT')),
  object_id          uuid not null references journal_objects(id) on delete cascade,
  service_id         text not null references services(service_id),
  work_text          text not null,
  required_workers   smallint not null default 0,
  required_foremen   smallint not null default 0,  -- мастера
  required_itr       smallint not null default 0,  -- ИТР (инженерно-технические работники)
  required_vehicles  smallint not null default 0,
  note               text,
  created_by         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_daily_plan_items_date on daily_plan_items(plan_date);

-- Seed object categories (совпадают с константами клиента в data.ts).
insert into journal_object_categories (id, name, emoji, sort_order) values
  ('TUN',   'Туннели',                  '🚇', 1),
  ('HOUSE', 'Кап. ремонт домов',        '🏠', 2),
  ('SOC',   'Соцобъекты',               '🏫', 3),
  ('ROAD',  'Дороги / благоустройство', '🛣️', 4),
  ('PED',   'Пешеходные переходы',      '🚶', 5),
  ('OTHER', 'Прочее',                   '📍', 9)
on conflict (id) do nothing;

-- ============ ROLLBACK ============
-- drop table if exists daily_plan_items;
-- drop table if exists journal_objects;
-- drop table if exists journal_object_categories;
