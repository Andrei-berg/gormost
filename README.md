# 🏗️ Гормост - Система управления работами

Система управления работами Лефортовского тоннеля

## 🚀 Быстрый старт

### 1. Распаковка проекта

```bash
tar -xzf Gormost_ready.tar.gz
cd gormost-ready
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка Supabase

Создайте файл `.env.local`:

```bash
cp .env.example .env.local
```

Заполните переменные окружения:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Настройка базы данных

1. Откройте Supabase SQL Editor
2. Скопируйте содержимое файла `supabase_migration.sql` (из предыдущего проекта)
3. Выполните SQL
4. Убедитесь, что все таблицы созданы и RLS включен

### 5. Запуск проекта

```bash
npm run dev
```

Откройте http://localhost:3000

## 📦 Деплой через Git

### Первый раз (инициализация):

```bash
git init
git add .
git commit -m "Initial commit: Gormost v1.0"
git branch -M main
git remote add origin https://github.com/your-username/gormost.git
git push -u origin main
```

### Последующие обновления:

```bash
git add .
git commit -m "your message"
git push
```

## 🎨 Структура панелей

- 📡 **Диспетчерская** - Центральный узел управления
- 📋 **Зам/Прораб** - Планирование смены
- 👷 **Мастер/Бригадир** - Мои задачи
- 🏗️ **Начальник службы** - План работ службы
- 📊 **Босс (Дашборд)** - KPI и статистика
- 🚗 **Транспорт** - Парк машин
- 📞 **Жалобы** - Обработка обращений
- ⚙️ **Админ-панель** - Справочники

## 🛠️ Технологии

- **Next.js 16.1.1** - React фреймворк
- **TypeScript 5.9.3** - Типизация
- **Tailwind CSS 3.4.0** - Стилизация
- **Supabase 2.47.10** - Backend
- **@dnd-kit** - Drag & Drop

## 📅 Информация о смене

Текущая дата: **21.01.2026**  
Текущая смена: **Смена 4 (Станишевский А.В.)**  
Время: **07:00-19:00** (ДЕНЬ)

## 📄 Лицензия

© 2026 Гормост. Все права защищены.
