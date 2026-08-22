# Система v2 «Фундамент»

PWA-трекер двухлетней учебной программы. Наследник `english-summer` (v1).
ТЗ, дизайн-референс и рабочий контекст лежат локально в `spec/` и намеренно
не входят в репозиторий — там личные данные владельца.

Схема работы: **приложение — мозг, пользователь — курьер, ИИ-чат — преподаватель.**
Приложение собирает промпт урока → пользователь вставляет его в чат с ИИ →
проводит урок → копирует «ИТОГ УРОКА» обратно. Два копипаста на урок.

## Запуск локально

Любой статический сервер из корня репозитория:

```bash
python -m http.server 5173
```

Открыть `http://localhost:5173`. Сборки нет: vanilla JS + HTML + CSS.

## Тесты

Чистые модули (доктрина, даты, светофор темпа, шкала нагрузки, парсер итога)
проверяются без браузера:

```bash
node tests/run.js
```

## Деплой

GitHub Pages: Settings → Pages → Source `main`, папка `/ (root)`.
Все пути относительные (`./`), поэтому приложение работает в подпапке `/<имя-репо>/`.

**При каждом деплое поднимать `VERSION` в [`sw.js`](sw.js)** — иначе телефон
продолжит показывать старую версию из офлайн-кэша.

Если после обновления иконка на экране «Домой» в iOS выглядит странно
(старая картинка, чужое имя, белый квадрат) — удалить ярлык и поставить
приложение заново через «Поделиться» → «На экран Домой». iOS кэширует
иконку и имя на момент установки и сама их не обновляет.

## Структура

| файл | что делает |
|---|---|
| `doctrine.js` | раздел 2 ТЗ: уровни, очки, серия, ранги. **Не менять.** |
| `state.js` | модель данных (раздел 5), localStorage, блоки и уроки |
| `pace.js` | светофор темпа блока (7.5) |
| `steps.js` | таблица шкалы нагрузки (7.2), чистые расчёты |
| `stepsflow.js` | цикл ступеней: подъём, отсрочка, откат, разгрузка |
| `waterfall.js` | водопад выбора урока (7.3) и свежесть дорожек (7.4) |
| `prompts.js` | генератор промптов и парсер «ИТОГА УРОКА» (раздел 8) |
| `lesson.js` | карточка урока дня и умная primary-кнопка (7.8) |
| `app.js` | роутер табов и экран «Сегодня» |
| `program.js` · `radar.js` · `journal.js` · `settings.js` | остальные экраны |
| `onboarding.js` | первый запуск, 4 шага |
| `sync.js` | Supabase: вход, синхронизация, офлайн-очередь |
| `content/phase0.js … phase5.js` | пакеты контента по фазам |

## Добавить новый пакет контента

1. Заполнить `blocks` в нужном файле `content/phaseN.js` по формату `phase0.js`.
2. Поднять `VERSION` в `sw.js`.
3. Закоммитить и запушить — приложение подхватит блоки и уроки само,
   пользовательские дедлайны и прогресс не затрутся.

## Облако (Supabase)

Синхронизация — на голом `fetch`, без SDK и CDN, чтобы офлайн ничего не тянул
из сети. Схема таблицы и политики RLS:

```sql
create table if not exists public.app_state (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint app_state_user_unique unique (user_id)
);

alter table public.app_state enable row level security;

create policy "app_state_select_own" on public.app_state
  for select using (auth.uid() = user_id);
create policy "app_state_insert_own" on public.app_state
  for insert with check (auth.uid() = user_id);
create policy "app_state_update_own" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "app_state_delete_own" on public.app_state
  for delete using (auth.uid() = user_id);
```

Пользователь заводится вручную в Authentication → Users (email + пароль,
Auto Confirm). Регистрации в приложении нет: пользователь один.

Правила синхронизации: при загрузке — pull, если облако новее локального
`updatedAt`; при изменениях — push с debounce 2 секунды; без сети изменения
копятся в очереди и уходят при появлении связи; конфликт решает более поздний
`updatedAt`. `anon`-ключ в `sync.js` публичный по назначению — доступ к данным
закрывают политики RLS выше.

## Резервная копия

Настройки → «Скачать JSON». Файл содержит всё состояние целиком.
Работает и без облака.
