/* ============================================================
   state.js — модель данных (раздел 5 ТЗ), хранение и доктринальные счётчики.
   localStorage — рабочий кэш и полный источник при отсутствии сети.
   Supabase подключается в sync.js (этап 6) поверх этих же данных.
   ============================================================ */

window.State = (function () {
  'use strict';

  var KEY = 'study-system-v2';
  var SCHEMA = 2;
  var APP_VERSION = '2.5.0';

  /** Дата автоматической смены режима Лето → Школа (раздел 5, 7.2). */
  var AUTO_SCHOOL_DATE = '2026-09-08';

  var TRACKS = [
    { id: 'math', name: 'Математика', lastLessonDate: null },
    { id: 'write', name: 'Письмо и чтение', lastLessonDate: null },
    { id: 'cs', name: 'Информатика', lastLessonDate: null },
    { id: 'biz', name: 'Бизнес', lastLessonDate: null },
    { id: 'eng', name: 'Академ. английский', lastLessonDate: null, embedded: true }
  ];

  /** Дефолтные даты фаз (раздел 9.1), редактируются в Настройках. */
  /** Дедлайны Ф0 после сжатия фазы (релиз 2.6.0) — источник миграции. */
  var P0_DEADLINES = {
    B1: '2026-08-29', B2: '2026-08-27', B3: '2026-09-01',
    B4: '2026-09-03', B5: '2026-09-04', B6: '2026-09-07'
  };

  var PHASE_DATES = {
    p0: { start: '2026-08-18', end: '2026-09-07' },
    p1: { start: '2026-09-08', end: '2027-01-31' },
    p2: { start: '2027-02-01', end: '2027-06-26' },
    bridge: { start: '2027-07-01', end: '2027-08-31' },
    p3: { start: '2027-09-07', end: '2028-01-31' },
    p4: { start: '2028-02-01', end: '2028-06-24' }
  };

  var PHASES = [
    { id: 'p0', name: 'Ф0 «Фундамент»', milestone: 'веха: placement-тест 25.08' },
    { id: 'p1', name: 'Ф1 «Семестр 1»' },
    { id: 'p2', name: 'Ф2 «Семестр 2»' },
    { id: 'bridge', name: 'Мост «Лето-2027»' },
    { id: 'p3', name: 'Ф3 «Год 2, семестр 1»' },
    { id: 'p4', name: 'Ф4 «Год 2, семестр 2»' }
  ];

  /**
   * Карта блоков Ф2–Ф4 (раздел 9.4 ТЗ) — названия и дорожки для экрана «Программа».
   * Уроки этих фаз придут пакетами content/phase2.js … phase5.js; пока пакет пуст,
   * блок виден в программе, но уроков не содержит.
   * Дедлайны раскладываются равномерно по датам фазы (блок ≈ 2 недели)
   * и дальше редактируются вручную.
   */
  var LATER_BLOCKS = [
    { id: 'B17', phase: 'p2', track: 'math', title: 'Функции и f(x)' },
    { id: 'B18', phase: 'p2', track: 'cs', title: 'Python-1' },
    { id: 'B19', phase: 'p2', track: 'math', title: 'Преобразования графиков' },
    { id: 'B20', phase: 'p2', track: 'write', title: 'OSSLT-весна' },
    { id: 'B21', phase: 'p2', track: 'math', title: 'Показательные' },
    { id: 'B22', phase: 'p2', track: 'cs', title: 'Python-2' },
    { id: 'B23', phase: 'p2', track: 'math', title: 'Последовательности и процент' },
    { id: 'B24', phase: 'p2', track: 'write', title: 'Эссе из 5 абзацев' },
    { id: 'B25', phase: 'p2', track: 'math', title: 'Триг. функции и тождества' },
    { id: 'B26', phase: 'p2', track: 'all', title: 'Финалы года' },

    { id: 'B27', phase: 'bridge', track: 'write', title: 'IELTS-диагностика' },
    { id: 'B28', phase: 'bridge', track: 'math', title: 'Многочлены (MHF4U)' },
    { id: 'B29', phase: 'bridge', track: 'write', title: 'Роман + дневник (NBE3U)' },
    { id: 'B30', phase: 'bridge', track: 'math', title: 'Комбинаторика (MDM4U)' },
    { id: 'B31', phase: 'bridge', track: 'math', title: 'Логарифмы' },
    { id: 'B32', phase: 'bridge', track: 'biz', title: 'Заявочный фундамент' },

    { id: 'B33', phase: 'p3', track: 'write', title: 'Эссе-анализ' },
    { id: 'B34', phase: 'p3', track: 'math', title: 'Полиномы и рациональные' },
    { id: 'B35', phase: 'p3', track: 'write', title: 'IELTS-интенсив' },
    { id: 'B36', phase: 'p3', track: 'math', title: 'Статистика' },
    { id: 'B37', phase: 'p3', track: 'math', title: 'Логарифмы и показательные' },
    { id: 'B38', phase: 'p3', track: 'biz', title: 'Заявки-1 (OUAC)' },
    { id: 'B39', phase: 'p3', track: 'math', title: 'Радианы и тождества' },
    { id: 'B40', phase: 'p3', track: 'math', title: 'Вероятность' },
    { id: 'B41', phase: 'p3', track: 'write', title: 'Заявки-2 (Kira/эссе)' },
    { id: 'B42', phase: 'p3', track: 'all', title: 'Финалы полугодия' },

    { id: 'B43', phase: 'p4', track: 'write', title: 'Анализ литературы' },
    { id: 'B44', phase: 'p4', track: 'math', title: 'Пределы и производная' },
    { id: 'B45', phase: 'p4', track: 'write', title: 'Шекспир' },
    { id: 'B46', phase: 'p4', track: 'math', title: 'Производные: оптимум' },
    { id: 'B47', phase: 'p4', track: 'biz', title: 'Менеджмент (BOH4M)' },
    { id: 'B48', phase: 'p4', track: 'math', title: 'Векторы' },
    { id: 'B49', phase: 'p4', track: 'cs', title: 'Исследовательская работа' },
    { id: 'B50', phase: 'p4', track: 'math', title: 'Прямые и плоскости' },
    { id: 'B51', phase: 'p4', track: 'math', title: 'Генеральный мат-повтор' },
    { id: 'B52', phase: 'p4', track: 'all', title: 'Финалы года' }
  ];

  /** Если-то правила (раздел 7.6), дефолт. */
  var IF_THEN = [
    { id: 'it1', text: 'пришёл из школы и поел → открываю ДЗ' },
    { id: 'it2', text: 'день рушится → минималка перед сном' },
    { id: 'it3', text: 'застрял на задаче 10 минут → записываю в долги и иду дальше' }
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function blank() {
    return {
      meta: { updatedAt: new Date().toISOString(), version: SCHEMA, onboardedAt: U.today() },
      settings: {
        mode: 'summer',
        autoSchoolDone: false,
        levels: clone(DOCTRINE.LEVELS),
        addons: clone(DOCTRINE.ADDONS),
        ranks: clone(DOCTRINE.RANKS),
        ifThen: clone(IF_THEN),
        phaseDates: clone(PHASE_DATES)
      },
      step: {
        position: 1,
        cycleStart: null,
        snoozeUntil: null,
        snoozeFrom: null,      // начало отсрочки — чтобы считать паузу цикла
        deloadUntil: null,
        deloadFrom: null,      // начало разгрузки — то же
        pauses: [],            // отрезки пауз {from,to,kind}: цикл на паузе, не сброшен
        history: []
      },
      tracks: clone(TRACKS),
      blocks: {},
      lessons: {},
      days: {},
      debts: [],
      radar: [],
      todos: [],
      summaries: [],
      cards: { lastDay: null, viewedToday: 0 },
      // SRS-накладка на банк слов: ключ — слово в нижнем регистре.
      // Сами слова живут в итогах уроков, здесь только их судьба.
      srs: {},
      stats: { wordsTotal: 0, lessonsDone: 0, bestStreak: 0 },
      onboarded: false
    };
  }

  var s = blank();
  var listeners = [];
  var saveTimer = null;

  /* ---------- хранение ---------- */

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        s = migrate(parsed);
      } catch (e) {
        console.warn('Состояние повреждено, стартуем с чистого:', e);
        s = blank();
      }
    }
    return s;
  }

  /**
   * Дополняет загруженное состояние недостающими полями (совместимость версий).
   * Всё, что рендер и доктрина считают массивом или объектом, приводится к нему
   * с дефолтами: битый или урезанный файл не должен ронять экран.
   */
  function migrate(o) {
    var base = blank();
    var out = Object.assign({}, base, o || {});
    out.meta = Object.assign({}, base.meta, (o && o.meta) || {});
    out.settings = Object.assign({}, base.settings, (o && o.settings) || {});
    out.step = Object.assign({}, base.step, (o && o.step) || {});
    out.cards = Object.assign({}, base.cards, (o && o.cards) || {});
    if (!out.srs || typeof out.srs !== 'object' || Array.isArray(out.srs)) out.srs = {};
    out.stats = Object.assign({}, base.stats, (o && o.stats) || {});

    // списки доктрины: пустой или не-массив — берём дефолт целиком
    ['levels', 'addons', 'ranks'].forEach(function (k) {
      if (!Array.isArray(out.settings[k]) || !out.settings[k].length) {
        out.settings[k] = clone(base.settings[k]);
      }
    });
    // правила «если — то» можно вычистить в ноль, но массивом они быть обязаны
    if (!Array.isArray(out.settings.ifThen)) out.settings.ifThen = clone(base.settings.ifThen);
    if (!out.settings.phaseDates || typeof out.settings.phaseDates !== 'object') out.settings.phaseDates = {};
    out.settings.phaseDates = Object.assign({}, base.settings.phaseDates, out.settings.phaseDates);

    ['blocks', 'lessons', 'days'].forEach(function (k) { if (!out[k] || typeof out[k] !== 'object') out[k] = {}; });
    ['debts', 'radar', 'todos', 'summaries', 'tracks'].forEach(function (k) { if (!Array.isArray(out[k])) out[k] = clone(base[k]); });
    if (!out.tracks.length) out.tracks = clone(base.tracks);
    if (!Array.isArray(out.step.history)) out.step.history = [];

    // A-03: паузы цикла живут отрезками. У состояний, знавших только пару
    // «текущих» полей, отрезок восстанавливается из них — иначе прожитая
    // разгрузка после миграции укоротила бы цикл.
    if (!Array.isArray(out.step.pauses)) {
      out.step.pauses = [];
      if (out.step.snoozeFrom && out.step.snoozeUntil) {
        out.step.pauses.push({ from: U.addDays(out.step.snoozeFrom, 1), to: out.step.snoozeUntil, kind: 'snooze' });
      }
      if (out.step.deloadFrom && out.step.deloadUntil) {
        out.step.pauses.push({ from: U.addDays(out.step.deloadFrom, 1), to: out.step.deloadUntil, kind: 'deload' });
      }
    }

    // 2.6.0: новые дедлайны Фазы 0. Пользовательский дедлайн обычно не
    // затирается, но сжатие фазы — это как раз пересмотр сроков, и сделать
    // его надо ровно один раз: отсюда версия схемы.
    if (((o && o.meta && o.meta.version) || 0) < 2) {
      Object.keys(P0_DEADLINES).forEach(function (id) {
        if (out.blocks[id]) out.blocks[id].deadline = P0_DEADLINES[id];
      });
    }

    // 2.6.0: короткий id долга. Существующие долги получают D-1, D-2… по
    // порядку создания — массив s.debts и есть этот порядок.
    var seq = 0;
    out.debts.forEach(function (d) {
      var m = /^D-(\d+)$/.exec(String((d && d.did) || ''));
      if (m) seq = Math.max(seq, parseInt(m[1], 10));
    });
    out.debts.forEach(function (d) {
      if (d && !d.did) d.did = 'D-' + (++seq);
    });

    // A-14: свежесть дорожки без единого урока считается от даты онбординга;
    // у состояний, живших до этого поля, точкой отсчёта становится сегодня
    if (!out.meta.onboardedAt) out.meta.onboardedAt = today();

    out.meta.version = SCHEMA;
    return out;
  }

  /**
   * Проверка файла ДО замены состояния (импорт JSON).
   * → { ok:true } | { ok:false, error:'по-русски, что делать' }
   */
  function validateImport(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, error: 'Это не файл состояния. Выбери study-v2-*.json из «Скачать JSON».' };
    }
    if (!data.settings || typeof data.settings !== 'object') {
      return { ok: false, error: 'В файле нет настроек — похоже, это не состояние приложения.' };
    }
    if (!data.days || typeof data.days !== 'object' || Array.isArray(data.days)) {
      return { ok: false, error: 'В файле нет дней — похоже, это не состояние приложения.' };
    }
    var listy = ['debts', 'radar', 'todos', 'summaries'];
    for (var i = 0; i < listy.length; i++) {
      var k = listy[i];
      if (data[k] != null && !Array.isArray(data[k])) {
        return { ok: false, error: 'Поле «' + k + '» в файле испорчено. Возьми другую копию.' };
      }
    }
    if (data.lessons != null && (typeof data.lessons !== 'object' || Array.isArray(data.lessons))) {
      return { ok: false, error: 'Список уроков в файле испорчен. Возьми другую копию.' };
    }
    return { ok: true };
  }

  var quotaHit = false;

  function isQuotaError(e) {
    if (!e) return false;
    return e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 || e.code === 1014;
  }

  function writeNow() {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      quotaHit = false;
    } catch (e) {
      console.error('Не удалось сохранить состояние:', e);
      // память браузера кончилась: молча терять прогресс нельзя —
      // предупреждение висит, пока владелец не скачает копию
      if (isQuotaError(e) && !quotaHit) {
        quotaHit = true;
        if (window.UI && UI.banner) {
          UI.banner('quota', {
            kind: 'bad',
            text: 'Память браузера переполнена — скачай JSON в Настройках.',
            action: { label: 'В Настройки', onClick: function () { if (window.App) App.go('settings'); } }
          });
        }
      }
    }
  }

  /** Пометить изменение: обновить updatedAt, сохранить, уведомить подписчиков. */
  function touch(silent) {
    s.meta.updatedAt = new Date().toISOString();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveTimer = null; writeNow(); }, 150);
    if (!silent) emit();
    if (window.Sync && Sync.onLocalChange) Sync.onLocalChange();
  }

  function emit() { listeners.forEach(function (fn) { try { fn(s); } catch (e) { console.error(e); } }); }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  /** Полная замена состояния (импорт JSON, pull из облака). */
  function replace(next, silent) {
    s = migrate(next);
    writeNow();
    if (!silent) emit();
  }

  function reset() { s = blank(); writeNow(); emit(); }

  /* ---------- режим Лето / Школа ---------- */

  /** Автосмена режима 2026-09-08 (один раз; дальше решает ручной переключатель). */
  function applyAutoMode() {
    var t = today();
    if (!s.settings.autoSchoolDone && t >= AUTO_SCHOOL_DATE) {
      s.settings.mode = 'school';
      s.settings.autoSchoolDone = true;
      if (!s.step.cycleStart) s.step.cycleStart = AUTO_SCHOOL_DATE;
      touch(true);
      return true;
    }
    return false;
  }

  function mode() { return s.settings.mode; }
  function isSchool() { return s.settings.mode === 'school'; }

  function setMode(m) {
    if (m !== 'summer' && m !== 'school') return;
    s.settings.mode = m;
    if (m === 'school' && !s.step.cycleStart) s.step.cycleStart = today();
    if (today() >= AUTO_SCHOOL_DATE) s.settings.autoSchoolDone = true;
    touch();
  }

  /* ---------- дни, уровни, очки ---------- */

  function today() { return U.today(); }

  function day(iso, create) {
    var d = s.days[iso];
    if (!d && create) {
      d = s.days[iso] = { level: 'none', addons: [], lessons: [], points: 0 };
    }
    return d || null;
  }

  function points(iso) {
    var d = s.days[iso];
    return d ? DOCTRINE.dayPoints(d, s.settings) : 0;
  }

  function recount(iso) {
    var d = s.days[iso];
    if (d) d.points = DOCTRINE.dayPoints(d, s.settings);
  }

  /** Выбор уровня дня. Повторный тап по активному уровню снимает его в «Пусто». */
  function setLevel(levelId, iso) {
    var date = iso || today();
    var d = day(date, true);
    d.level = (d.level === levelId && levelId !== 'none') ? 'none' : levelId;
    recount(date);
    bumpBestStreak();
    touch();
  }

  function toggleAddon(addonId, iso) {
    var date = iso || today();
    var d = day(date, true);
    var i = d.addons.indexOf(addonId);
    if (i >= 0) d.addons.splice(i, 1); else d.addons.push(addonId);
    recount(date);
    bumpBestStreak();
    touch();
  }

  function streak() { return DOCTRINE.streak(points, today()); }
  function emptyInRow() { return DOCTRINE.emptyInRow(points, today()); }
  function weekPoints(iso) { return DOCTRINE.weekPoints(points, iso || today()); }
  function rank(iso) { return DOCTRINE.rankFor(weekPoints(iso), s.settings.ranks); }
  function nextRank(iso) { return DOCTRINE.nextRank(weekPoints(iso), s.settings.ranks); }

  function bumpBestStreak() {
    var cur = DOCTRINE.streak(points, today());
    if (cur > (s.stats.bestStreak || 0)) s.stats.bestStreak = cur;
  }

  /* ---------- дорожки ---------- */

  function track(id) {
    for (var i = 0; i < s.tracks.length; i++) if (s.tracks[i].id === id) return s.tracks[i];
    return null;
  }

  function trackName(id) {
    var t = track(id);
    return t ? t.name : (id === 'all' ? 'Все дорожки' : id);
  }

  /* ---------- фазы ---------- */

  function phases() { return PHASES; }

  function phaseName(id) {
    for (var i = 0; i < PHASES.length; i++) if (PHASES[i].id === id) return PHASES[i].name;
    return id;
  }

  /** Активная фаза по сегодняшней дате (или последняя начавшаяся). */
  function currentPhase() {
    var t = today(), pd = s.settings.phaseDates, last = PHASES[0].id;
    for (var i = 0; i < PHASES.length; i++) {
      var id = PHASES[i].id, d = pd[id];
      if (!d) continue;
      if (t >= d.start && t <= d.end) return id;
      if (t > d.end) last = id;
      if (t < d.start) return last;
    }
    return last;
  }

  /* ---------- блоки и уроки ---------- */

  /**
   * Сводит контент с состоянием: блоки из пакетов + карта поздних фаз → state.blocks,
   * уроки пакетов → state.lessons. Пользовательские данные (дедлайн, done, счёт)
   * никогда не затираются; названия и дорожки приходят из контента.
   * Вызывается при каждом старте — новый пакет контента подхватывается сам.
   */
  function syncContent() {
    var changed = false;

    function upsert(id, meta) {
      var b = s.blocks[id];
      if (!b) {
        s.blocks[id] = {
          phase: meta.phase, track: meta.track, title: meta.title,
          deadline: meta.deadline || null, done: false
        };
        if (meta.note) s.blocks[id].note = meta.note;
        changed = true;
        return;
      }
      if (meta.title && b.title !== meta.title) { b.title = meta.title; changed = true; }
      if (meta.track && b.track !== meta.track) { b.track = meta.track; changed = true; }
      if (meta.phase && b.phase !== meta.phase) { b.phase = meta.phase; changed = true; }
      if (meta.note && b.note !== meta.note) { b.note = meta.note; changed = true; }
      if (!b.deadline && meta.deadline) { b.deadline = meta.deadline; changed = true; }
    }

    // 1) блоки из пакетов контента
    if (window.CONTENT) {
      CONTENT.allBlocks().forEach(function (b) {
        upsert(b.id, { phase: b.phase, track: b.track, title: b.title, deadline: b.deadline, note: b.note });
      });
    }

    // 2) карта поздних фаз с равномерными дедлайнами
    var byPhase = {};
    LATER_BLOCKS.forEach(function (b) { (byPhase[b.phase] = byPhase[b.phase] || []).push(b); });
    Object.keys(byPhase).forEach(function (ph) {
      var list = byPhase[ph];
      var dates = spreadDeadlines(ph, list.length);
      list.forEach(function (b, i) {
        upsert(b.id, { phase: b.phase, track: b.track, title: b.title, deadline: dates[i] });
      });
    });

    // 3) уроки пакетов
    if (window.CONTENT) {
      CONTENT.allBlocks().forEach(function (b) {
        b.lessons.forEach(function (l) {
          if (l.skipped) return;
          if (!s.lessons[l.id]) {
            s.lessons[l.id] = { done: false, score: null, date: null };
            changed = true;
          }
        });
      });
    }

    // пакет мог пометить урок пропущенным — блок от этого может стать
    // закрытым, поэтому флаг done пересчитываем на каждом старте
    Object.keys(s.blocks).forEach(function (id) {
      var b = s.blocks[id];
      var p = blockProgress(id);
      var done = p.total > 0 && p.remaining === 0;
      if (b.done !== done) { b.done = done; changed = true; }
    });

    if (changed) touch(true);
    return changed;
  }

  /** Равномерные дедлайны внутри фазы: последний совпадает с концом фазы. */
  function spreadDeadlines(phaseId, count) {
    var pd = s.settings.phaseDates[phaseId];
    var out = [];
    if (!pd || !count) return out;
    var len = U.diffDays(pd.start, pd.end);
    for (var i = 0; i < count; i++) {
      out.push(U.addDays(pd.start, Math.round((i + 1) * len / count)));
    }
    return out;
  }

  function block(id) { return s.blocks[id] || null; }

  /** Уроки блока из контента, по порядку — включая пропущенные. */
  function blockLessons(blockId) {
    return window.CONTENT ? CONTENT.lessons(blockId) : [];
  }

  /**
   * Урок помечен «пропущен» в пакете контента (релиз 2.6.0, сжатие Ф0).
   * Такой урок не считается в прогрессе и статистике, водопад его не
   * назначает, и блок закрывается, когда закрыты все НЕ пропущенные.
   * Флаг живёт в контенте, а не в состоянии: контент в БД не хранится,
   * и следующий пакет фазы может решить иначе, ничего не мигрируя.
   */
  function isSkipped(lessonId) {
    var l = window.CONTENT ? CONTENT.lesson(lessonId) : null;
    return !!(l && l.skipped);
  }

  /** Уроки блока, которые реально надо пройти. */
  function activeLessons(blockId) {
    return blockLessons(blockId).filter(function (l) { return !l.skipped; });
  }

  /** { total, done, remaining, skipped } по урокам блока; пропущенные не в счёт. */
  function blockProgress(blockId) {
    var all = blockLessons(blockId);
    var list = all.filter(function (l) { return !l.skipped; });
    var done = 0;
    list.forEach(function (l) { if (s.lessons[l.id] && s.lessons[l.id].done) done++; });
    return {
      total: list.length, done: done, remaining: list.length - done,
      skipped: all.length - list.length
    };
  }

  /** Светофор темпа блока. null — если уроков ещё нет (контент не выпущен). */
  function blockPace(blockId) {
    var b = s.blocks[blockId];
    if (!b) return null;
    var p = blockProgress(blockId);
    if (!p.total) return null;
    return PACE.status({ remaining: p.remaining, deadline: b.deadline, today: today(), mode: mode() });
  }

  /** Пересчитать флаг done блока (все уроки закрыты). */
  function refreshBlockDone(blockId) {
    var b = s.blocks[blockId];
    if (!b) return;
    var p = blockProgress(blockId);
    b.done = p.total > 0 && p.remaining === 0;
  }

  function setDeadline(blockId, isoDate) {
    var b = s.blocks[blockId];
    if (!b) return;
    b.deadline = isoDate || null;
    touch();
  }

  /** Сдвинуть все дедлайны фазы на N дней (раздел 6.2). */
  function shiftPhase(phaseId, days) {
    if (!days) return 0;
    var n = 0;
    Object.keys(s.blocks).forEach(function (id) {
      var b = s.blocks[id];
      if (b.phase === phaseId && b.deadline) { b.deadline = U.addDays(b.deadline, days); n++; }
    });
    if (n) touch();
    return n;
  }

  /** Блоки фазы по порядку номеров. */
  function phaseBlocks(phaseId) {
    return Object.keys(s.blocks)
      .filter(function (id) { return s.blocks[id].phase === phaseId; })
      .sort(function (a, b) { return blockNum(a) - blockNum(b); });
  }

  function blockNum(id) { return parseInt(String(id).replace(/\D/g, ''), 10) || 0; }

  /** Отображаемый номер блока: B12 → Б12. */
  function blockLabel(id) { return 'Б' + blockNum(id); }

  /** Отображаемый номер урока: B12.3 → урок 3. */
  function lessonNum(lessonId) {
    var p = String(lessonId).split('.');
    return parseInt(p[1], 10) || 0;
  }

  /* ---------- уроки: очередь, свежесть, отметки дня ---------- */

  function lessonTrack(lessonId) {
    var l = window.CONTENT ? CONTENT.lesson(lessonId) : null;
    if (!l) return null;
    var b = s.blocks[l.blockId];
    return b ? b.track : null;
  }

  /** Следующий непройденный урок дорожки (доктрина 5). Блоки — по порядку номеров. */
  function nextLessonInTrack(trackId, phaseId) {
    var ids = Object.keys(s.blocks).sort(function (a, b) { return blockNum(a) - blockNum(b); });
    for (var i = 0; i < ids.length; i++) {
      var b = s.blocks[ids[i]];
      if (trackId && b.track !== trackId && b.track !== 'all') continue;
      if (phaseId && b.phase !== phaseId) continue;
      var list = activeLessons(ids[i]);
      for (var j = 0; j < list.length; j++) {
        var st = s.lessons[list[j].id];
        if (!st || !st.done) return list[j].id;
      }
    }
    return null;
  }

  /** Следующий непройденный урок вообще (по порядку блоков). */
  function nextLesson() { return nextLessonInTrack(null, null); }

  /**
   * Свежесть дорожки в днях.
   * Дорожка без единого урока считается от даты онбординга: «максимальной»
   * её делать нельзя — иначе правило 2 водопада в первый же день перехватило бы
   * выбор у радара и светофора. null — только если и точки отсчёта нет.
   */
  function freshness(trackId, todayIso) {
    var t = track(trackId);
    if (!t) return null;
    var from = t.lastLessonDate || s.meta.onboardedAt;
    if (!from) return null;
    return Math.max(0, U.diffDays(from, todayIso || today()));
  }

  /** Был ли на дорожке хоть один урок — свежесть без истории подписывается иначе. */
  function hasTrackHistory(trackId) {
    var t = track(trackId);
    return !!(t && t.lastLessonDate);
  }

  /** Отметить дорожку пройденной сегодня. track:'all' обновляет все четыре (раздел 7.4). */
  function touchTrack(trackId, dateIso) {
    var date = dateIso || today();
    var ids = trackId === 'all' ? ['math', 'write', 'cs', 'biz'] : [trackId];
    ids.forEach(function (id) {
      var t = track(id);
      if (t && (!t.lastLessonDate || t.lastLessonDate < date)) t.lastLessonDate = date;
    });
  }

  function markVideoWatched(lessonId, dateIso) {
    var d = day(dateIso || today(), true);
    d.videos = d.videos || [];
    if (d.videos.indexOf(lessonId) < 0) d.videos.push(lessonId);
    touch();
  }

  function videoWatched(lessonId, dateIso) {
    var d = s.days[dateIso || today()];
    return !!(d && d.videos && d.videos.indexOf(lessonId) >= 0);
  }

  /** Промпт скопирован — урок считается начатым (раздел 7.8, незавершённый урок). */
  function markPromptCopied(lessonId, dateIso) {
    var d = day(dateIso || today(), true);
    d.copied = d.copied || [];
    if (d.copied.indexOf(lessonId) < 0) d.copied.push(lessonId);
    touch();
  }

  function promptCopied(lessonId, dateIso) {
    var d = s.days[dateIso || today()];
    return !!(d && d.copied && d.copied.indexOf(lessonId) >= 0);
  }

  /* ---------- итоги, слова, долги ---------- */

  /**
   * Последние n итогов дорожки, свежие первыми.
   * Уроки блоков track:'all' (финалы вперемешку) касаются всех дорожек —
   * их итоги видит любая дорожка. Сама дорожка 'all' память не фильтрует.
   */
  function recentSummaries(trackId, n, excludeLessonId) {
    var out = [];
    var filter = trackId && trackId !== 'all';
    for (var i = s.summaries.length - 1; i >= 0 && out.length < (n || 3); i--) {
      var sum = s.summaries[i];
      if (excludeLessonId && sum.lessonId === excludeLessonId) continue;
      if (filter) {
        var lt = lessonTrack(sum.lessonId);
        if (lt !== trackId && lt !== 'all') continue;
      }
      out.push(sum);
    }
    return out;
  }

  /* ---------- карточки: SRS-lite (релиз 2.6.0) ---------- */

  /**
   * Слово живёт тремя статусами: new → learning → known.
   * Три верных подряд делают слово выученным, ошибка на выученном
   * возвращает его в learning. Выученное всплывает через 4, затем 10,
   * затем 21 день — и после третьего повтора засыпает совсем.
   * Это и есть «пенсия» для слов: колода перестаёт расти бесконечно.
   */
  var SRS_INTERVALS = [4, 10, 21];
  var SRS_TO_KNOWN = 3;          // верных подряд до статуса «выучено»

  function wordKey(en) { return String(en || '').toLowerCase().trim(); }

  /** Запись SRS слова; создаётся лениво, чтобы не плодить мусор. */
  function srsRec(en, create) {
    var k = wordKey(en);
    if (!k) return null;
    if (!s.srs[k] && create) s.srs[k] = { status: 'new', streak: 0, step: 0, due: null };
    return s.srs[k] || null;
  }

  function wordStatus(en) {
    var r = srsRec(en);
    return (r && r.status) || 'new';
  }

  /** Выученное слово, у которого срок повтора ещё не подошёл (или спит). */
  function wordResting(en, todayIso) {
    var r = srsRec(en);
    if (!r || r.status !== 'known') return false;
    if (!r.due) return true;                       // отработало все интервалы — спит
    return r.due > (todayIso || today());
  }

  /**
   * Оценка карточки: ok = «знал», иначе «не знал».
   * → запись SRS слова после оценки.
   */
  function gradeWord(en, ok, todayIso) {
    var r = srsRec(en, true);
    if (!r) return null;
    var t = todayIso || today();

    if (!ok) {
      // ошибка на выученном возвращает слово в работу с чистого листа
      r.status = 'learning';
      r.streak = 0;
      r.step = 0;
      r.due = null;
      touch();
      return r;
    }

    r.streak = (r.streak || 0) + 1;

    if (r.status === 'known') {
      // очередной успешный повтор двигает слово по интервалам к пенсии
      r.step = (r.step || 0) + 1;
      r.due = r.step < SRS_INTERVALS.length ? U.addDays(t, SRS_INTERVALS[r.step]) : null;
    } else if (r.streak >= SRS_TO_KNOWN) {
      r.status = 'known';
      r.step = 0;
      r.due = U.addDays(t, SRS_INTERVALS[0]);
    } else {
      r.status = 'learning';
    }

    touch();
    return r;
  }

  /** Слова, которые сегодня нужно повторять: новые, в работе и подошедшие. */
  function activeWords(todayIso) {
    var t = todayIso || today();
    return wordBank().filter(function (w) { return !wordResting(w.en, t); });
  }

  /** Счётчик колоды: «активных X · выучено Y». */
  function wordCounts(todayIso) {
    var bank = wordBank();
    var t = todayIso || today();
    var known = 0;
    bank.forEach(function (w) { if (wordStatus(w.en) === 'known') known++; });
    return {
      active: bank.filter(function (w) { return !wordResting(w.en, t); }).length,
      known: known,
      total: bank.length
    };
  }

  /** Слова конкретного урока из его итога, со статусами. */
  function lessonWords(lessonId) {
    var out = [], seen = {};
    s.summaries.forEach(function (sum) {
      if (sum.lessonId !== lessonId) return;
      ((sum.parsed && sum.parsed.words) || []).forEach(function (w) {
        var k = wordKey(w.en);
        if (!k || seen[k]) return;
        seen[k] = true;
        var r = srsRec(w.en);
        out.push({
          en: w.en, ru: w.ru,
          status: (r && r.status) || 'new',
          streak: (r && r.streak) || 0,
          due: (r && r.due) || null
        });
      });
    });
    return out;
  }

  /** Все слова из итогов, старые первыми, без повторов. */
  function wordBank() {
    var seen = {}, out = [];
    s.summaries.slice().sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); })
      .forEach(function (sum) {
        ((sum.parsed && sum.parsed.words) || []).forEach(function (w) {
          var key = String(w.en || '').toLowerCase().trim();
          if (!key || seen[key]) return;
          seen[key] = true;
          out.push({ en: w.en, ru: w.ru, date: sum.date, lessonId: sum.lessonId, track: lessonTrack(sum.lessonId) });
        });
      });
    return out;
  }

  /** 15 слов с самой давней датой появления (раздел 8.5). */
  function oldestWords(n) { return wordBank().slice(0, n || 15); }

  /** Слова двух последних уроков дорожки + 5 случайных старых, вперемешку (раздел 8.1). */
  function recentWords(trackId, excludeLessonId) {
    var sums = recentSummaries(trackId, 2, excludeLessonId);
    var recent = [], keys = {};
    sums.forEach(function (sum) {
      ((sum.parsed && sum.parsed.words) || []).forEach(function (w) {
        var k = wordKey(w.en);
        // выученное слово в промпт не идёт: разминать его заново — трата урока
        if (!k || keys[k] || wordStatus(w.en) === 'known') return;
        keys[k] = true;
        recent.push({ en: w.en, ru: w.ru });
      });
    });
    var old = wordBank().filter(function (w) {
      return !keys[wordKey(w.en)] && wordStatus(w.en) !== 'known';
    });
    var picked = U.shuffle(old).slice(0, 5).map(function (w) { return { en: w.en, ru: w.ru }; });
    return U.shuffle(recent.concat(picked));
  }

  /**
   * Открытые долги. С дорожкой — строго её собственные: добора чужими нет,
   * пусто значит пусто (иначе в промпт математики уезжали долги письма).
   * Дорожка 'all' и вызов без дорожки берут все.
   */
  function openDebts(trackId) {
    var list = s.debts.filter(function (d) { return d.status === 'open'; });
    if (!trackId || trackId === 'all') return list;
    return list.filter(function (d) { return d.track === trackId; });
  }

  function debtsCount(trackId) { return openDebts(trackId).length; }

  function normText(t) {
    return String(t || '').toLowerCase().replace(/[«»"'`.,;:!?()—–-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var PARTIAL_MIN_LEN = 4;      // короче — совпадение случайное
  var SIM_MIN = 0.85;           // порог похожести для текстового фолбэка
  var DEBT_ID_RE = /\bD-(\d+)\b/i;

  /** Биграммы строки — сырьё для коэффициента Дайса. */
  function bigrams(str) {
    var out = [];
    for (var i = 0; i < str.length - 1; i++) out.push(str.slice(i, i + 2));
    return out;
  }

  /**
   * Похожесть двух нормализованных строк, 0..1 (коэффициент Дайса по
   * биграммам символов). Устойчив к опечаткам и окончаниям, при этом
   * «знак наклона» и «путает знак наклона при отрицательном k» получают
   * низкий балл — короткий огрызок чужой долг не закрывает.
   */
  function similarity(a, b) {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    var A = bigrams(a), B = bigrams(b), map = {}, hit = 0;
    A.forEach(function (g) { map[g] = (map[g] || 0) + 1; });
    B.forEach(function (g) { if (map[g] > 0) { map[g]--; hit++; } });
    return 2 * hit / (A.length + B.length);
  }

  /** Следующий короткий id долга: D-1, D-2… Номера не переиспользуются. */
  function nextDebtId() {
    var max = 0;
    s.debts.forEach(function (d) {
      var m = /^D-(\d+)$/.exec(String(d.did || ''));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'D-' + (max + 1);
  }

  /**
   * Ищет открытый долг, соответствующий строке «Погашено» (раздел 8.4).
   * Два яруса, в этом порядке:
   *  1) короткий id «D-7» из строки — самый надёжный якорь, текст рядом
   *     с ним уже не важен: ИИ перефразирует формулировки, id — нет;
   *  2) нормализованный текст — формулировка долга целиком внутри строки
   *     (дословная копия) либо похожесть ≥0.85.
   * Старые ярусы «вхождение при ratio ≥0.5» и «пословно ≥0.6» убраны:
   * реальные перефразы они всё равно не ловили, а чужой долг закрыть могли.
   */
  function matchDebt(text, trackId) {
    var raw = String(text || '');
    var open = s.debts.filter(function (d) { return d.status === 'open'; });

    var m = DEBT_ID_RE.exec(raw);
    if (m) {
      var wantId = 'D-' + m[1];
      var byId = null;
      open.forEach(function (d) { if (d.did === wantId) byId = d; });
      if (byId) return byId;
      // id не нашёлся (опечатка или уже закрытый долг) — пробуем текст
    }

    var want = normText(raw.replace(DEBT_ID_RE, ' '));
    if (want.length < PARTIAL_MIN_LEN) return null;

    var best = null, bestScore = 0;
    open.forEach(function (d) {
      var have = normText(d.text);
      if (have.length < PARTIAL_MIN_LEN) return;
      var score = 0;
      if (have === want) score = 1;
      // формулировка долга целиком внутри строки — ИИ скопировал её дословно
      // и дописал «— отработано»; обратное направление безопасным не бывает,
      // его судит только похожесть
      else if (want.indexOf(have) >= 0) score = have.length / want.length;
      else {
        var sim = similarity(have, want);
        if (sim >= SIM_MIN) score = sim;
      }
      if (!score) return;
      var beatsOnTrack = score === bestScore && best && best.track !== trackId && d.track === trackId;
      if (score > bestScore || beatsOnTrack) { bestScore = score; best = d; }
    });
    return best;
  }

  /** Прогресс погашения долга: сколько разных уроков из нужных двух. */
  function debtProgress(d) {
    return Math.min(2, uniqueLessons((d && d.clearedIn) || []).length);
  }

  function uniqueLessons(list) {
    var seen = {}, out = [];
    (list || []).forEach(function (x) { if (!seen[x]) { seen[x] = true; out.push(x); } });
    return out;
  }

  /**
   * Применяет разобранный «ИТОГ УРОКА» (раздел 8.4): закрывает урок,
   * разносит слова, создаёт и гасит долги, обновляет свежесть дорожки.
   * Долг закрывается только когда отметки пришли из двух разных уроков.
   *
   * Идемпотентна: тот же урок за ту же дату заменяет свою запись,
   * а не плодит вторую. Повторная вставка одного итога ничего не удваивает
   * и не выглядит для механики ступеней как два разных урока.
   */
  function applySummary(lessonId, parsed, opts) {
    opts = opts || {};
    var date = opts.date || today();
    var l = window.CONTENT ? CONTENT.lesson(lessonId) : null;
    if (!l) return { ok: false, error: 'Урок не найден' };
    var trackId = lessonTrack(lessonId);

    var L = s.lessons[lessonId] || (s.lessons[lessonId] = { done: false, score: null, date: null });
    var wasDone = L.done;
    L.done = true;
    L.score = parsed.score;
    L.date = date;

    var d = day(date, true);
    if (d.lessons.indexOf(lessonId) < 0) d.lessons.push(lessonId);
    recount(date);

    var record = {
      lessonId: lessonId, date: date, raw: parsed.raw || '',
      parsed: {
        score: parsed.score, level: parsed.level, topics: parsed.topics,
        words: parsed.words || [], debts: parsed.debts || [],
        warmup: parsed.warmup || [], writing: parsed.writing || ''
      }
    };
    var at = -1;
    for (var i = s.summaries.length - 1; i >= 0; i--) {
      if (s.summaries[i].lessonId === lessonId && s.summaries[i].date === date) { at = i; break; }
    }
    var replaced = at >= 0;
    if (replaced) s.summaries[at] = record;
    else s.summaries.push(record);

    if (!wasDone) s.stats.lessonsDone = (s.stats.lessonsDone || 0) + 1;

    // долг заводим только новый: тот же текст из того же урока — уже в банке
    var created = [];
    (parsed.debts || []).forEach(function (text) {
      var key = normText(text);
      var dup = s.debts.some(function (x) {
        return x.createdIn === lessonId && normText(x.text) === key;
      });
      if (dup) return;
      var debt = {
        id: U.uid(), did: nextDebtId(), track: trackId, text: text,
        createdIn: lessonId, clearedIn: [], status: 'open'
      };
      s.debts.push(debt);
      created.push(debt);
    });

    var cleared = [], closed = [], unmatched = [];
    (parsed.cleared || []).forEach(function (text) {
      var debt = matchDebt(text, trackId);
      // молча глотать нечитаемое «Погашено» нельзя: студент должен увидеть,
      // что строка не легла ни на один долг, и поправить id
      if (!debt) { unmatched.push(text); return; }
      if (debt.clearedIn.indexOf(lessonId) < 0) debt.clearedIn.push(lessonId);
      // две строки итога могли смэтчиться в один долг — считаем его один раз
      if (cleared.indexOf(debt) < 0) cleared.push(debt);
      if (uniqueLessons(debt.clearedIn).length >= 2 && debt.status === 'open') {
        debt.status = 'closed';
        debt.closedDate = date;
        closed.push(debt);
      }
    });

    // A-21: счётчик слов — это размер банка уникальных en, а не сумма приходов;
    // пересчёт здесь держит его честным при повторной вставке и правках
    s.stats.wordsTotal = wordBank().length;

    touchTrack(trackId, date);
    refreshBlockDone(l.blockId);
    bumpBestStreak();
    touch();

    return {
      ok: true, lessonId: lessonId, score: parsed.score, replaced: replaced,
      words: (parsed.words || []).length,
      created: created.length, cleared: cleared.length, closed: closed.length,
      unmatched: unmatched
    };
  }

  /* ---------- если-то правило дня (раздел 7.6) ---------- */

  function ifThenOfDay(iso) {
    var list = (s.settings.ifThen || []).filter(function (r) { return r.text && r.text.trim(); });
    if (!list.length) return null;
    return list[(U.weekday(iso || today()) - 1) % list.length];
  }

  return {
    KEY: KEY, SCHEMA: SCHEMA, APP_VERSION: APP_VERSION, AUTO_SCHOOL_DATE: AUTO_SCHOOL_DATE,
    PHASE_DATES: PHASE_DATES, PHASES: PHASES,
    get s() { return s; },
    P0_DEADLINES: P0_DEADLINES,
    isSkipped: isSkipped, activeLessons: activeLessons,
    blank: blank, load: load, touch: touch, save: writeNow, replace: replace, reset: reset,
    migrate: migrate, validateImport: validateImport,
    subscribe: subscribe, emit: emit,
    applyAutoMode: applyAutoMode, mode: mode, isSchool: isSchool, setMode: setMode,
    today: today, day: day, points: points, recount: recount,
    setLevel: setLevel, toggleAddon: toggleAddon,
    streak: streak, emptyInRow: emptyInRow, weekPoints: weekPoints, rank: rank, nextRank: nextRank,
    track: track, trackName: trackName,
    phases: phases, phaseName: phaseName, currentPhase: currentPhase,
    syncContent: syncContent, spreadDeadlines: spreadDeadlines,
    block: block, blockLessons: blockLessons, blockProgress: blockProgress,
    blockPace: blockPace, refreshBlockDone: refreshBlockDone,
    setDeadline: setDeadline, shiftPhase: shiftPhase, phaseBlocks: phaseBlocks,
    blockNum: blockNum, blockLabel: blockLabel, lessonNum: lessonNum,
    lessonTrack: lessonTrack, nextLessonInTrack: nextLessonInTrack, nextLesson: nextLesson,
    freshness: freshness, hasTrackHistory: hasTrackHistory, touchTrack: touchTrack,
    markVideoWatched: markVideoWatched, videoWatched: videoWatched,
    markPromptCopied: markPromptCopied, promptCopied: promptCopied,
    recentSummaries: recentSummaries, wordBank: wordBank, oldestWords: oldestWords,
    recentWords: recentWords, openDebts: openDebts, debtsCount: debtsCount,
    SRS_INTERVALS: SRS_INTERVALS, SRS_TO_KNOWN: SRS_TO_KNOWN,
    wordStatus: wordStatus, wordResting: wordResting, gradeWord: gradeWord,
    activeWords: activeWords, wordCounts: wordCounts, lessonWords: lessonWords,
    matchDebt: matchDebt, debtProgress: debtProgress, similarity: similarity,
    nextDebtId: nextDebtId, applySummary: applySummary,
    ifThenOfDay: ifThenOfDay
  };
})();
