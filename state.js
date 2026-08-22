/* ============================================================
   state.js — модель данных (раздел 5 ТЗ), хранение и доктринальные счётчики.
   localStorage — рабочий кэш и полный источник при отсутствии сети.
   Supabase подключается в sync.js (этап 6) поверх этих же данных.
   ============================================================ */

window.State = (function () {
  'use strict';

  var KEY = 'study-system-v2';
  var SCHEMA = 1;
  var APP_VERSION = '2.0.0';

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
  var PHASE_DATES = {
    p0: { start: '2026-08-18', end: '2026-09-07' },
    p1: { start: '2026-09-08', end: '2027-01-31' },
    p2: { start: '2027-02-01', end: '2027-06-26' },
    bridge: { start: '2027-07-01', end: '2027-08-31' },
    p3: { start: '2027-09-07', end: '2028-01-31' },
    p4: { start: '2028-02-01', end: '2028-06-24' }
  };

  var PHASES = [
    { id: 'p0', name: 'Ф0 «Фундамент»' },
    { id: 'p1', name: 'Ф1 «Семестр 1»' },
    { id: 'p2', name: 'Ф2 «Семестр 2»' },
    { id: 'bridge', name: 'Мост «Лето-2027»' },
    { id: 'p3', name: 'Ф3 «Год 2, семестр 1»' },
    { id: 'p4', name: 'Ф4 «Год 2, семестр 2»' }
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
      meta: { updatedAt: new Date().toISOString(), version: SCHEMA },
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
        deloadUntil: null,
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

  /** Дополняет загруженное состояние недостающими полями (совместимость версий). */
  function migrate(o) {
    var base = blank();
    var out = Object.assign({}, base, o);
    out.meta = Object.assign({}, base.meta, o.meta || {});
    out.settings = Object.assign({}, base.settings, o.settings || {});
    out.settings.phaseDates = Object.assign({}, base.settings.phaseDates, (o.settings || {}).phaseDates || {});
    out.step = Object.assign({}, base.step, o.step || {});
    out.cards = Object.assign({}, base.cards, o.cards || {});
    out.stats = Object.assign({}, base.stats, o.stats || {});
    ['blocks', 'lessons', 'days'].forEach(function (k) { if (!out[k] || typeof out[k] !== 'object') out[k] = {}; });
    ['debts', 'radar', 'todos', 'summaries', 'tracks'].forEach(function (k) { if (!Array.isArray(out[k])) out[k] = clone(base[k]); });
    out.meta.version = SCHEMA;
    return out;
  }

  function writeNow() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); }
    catch (e) { console.error('Не удалось сохранить состояние:', e); }
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
    blank: blank, load: load, touch: touch, save: writeNow, replace: replace, reset: reset,
    subscribe: subscribe, emit: emit,
    applyAutoMode: applyAutoMode, mode: mode, isSchool: isSchool, setMode: setMode,
    today: today, day: day, points: points, recount: recount,
    setLevel: setLevel, toggleAddon: toggleAddon,
    streak: streak, emptyInRow: emptyInRow, weekPoints: weekPoints, rank: rank, nextRank: nextRank,
    track: track, trackName: trackName,
    phases: phases, phaseName: phaseName, currentPhase: currentPhase,
    ifThenOfDay: ifThenOfDay
  };
})();
