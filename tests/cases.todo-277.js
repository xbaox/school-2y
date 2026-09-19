/* 2.7.7, Э5: тип события «дело» (todo) и миграция 2.7.7.

   Запись на конкурс по MHF4U в 2.7.6 была «сдачей», и 14.09 водопад отдал
   день математике причиной «радар: сдача MHF4U сегодня». «Дело» — событие к
   сроку, но не оценка: курс не обязателен, урок дня оно не назначает.
   Миграция 2.7.7 переводит пять событий M2 в todo, курс не трогает. */

(function () {
  'use strict';

  var MON = '2026-09-14';
  var STAMP = '2026-09-13T16:01:36.617Z';
  var TODO_IDS = ['ev-2026-09-14-guidance', 'ev-2026-09-14-csmc-registration', 'ev-2026-09-15-volunteer-letter',
    'ev-2026-09-16-ics3ue-zoom', 'ev-2026-09-17-ics3ue-start'];

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function byId(list, id) { return (list || []).filter(function (x) { return x && x.id === id; })[0]; }
  function quiet(fn) {
    var real = UI.toast, said = [];
    UI.toast = function (m) { said.push(m); };
    try { fn(); } finally { UI.toast = real; }
    return said;
  }

  /** Состояние 2.7.5: маркера нет, онбординг до выпуска 2.7.6 — M2 добавит события. */
  function state275() {
    return {
      meta: { updatedAt: STAMP, version: 3, onboardedAt: '2026-08-22' },
      settings: { mode: 'school', schoolCourses: clone(State.SCHOOL_COURSES) },
      radar: [], todos: [], summaries: [], lessons: {}, srs: {}, days: {}, debts: [], hw: {}
    };
  }

  describe('2.7.7 Э5: тип «дело» в наборе', function () {
    eq(Radar.TYPES.filter(function (t) { return t.id === 'todo'; }), [{ id: 'todo', name: 'дело' }], 'Radar.TYPES: todo · дело');
    eq(Radar.typeName('todo'), 'дело', 'имя типа');
  });

  describe('2.7.7 Э5: прыжок с 2.7.5 — 2.7.6 и 2.7.7 за один migrate', function () {
    withToday('2026-09-13', function () {
      var st = State.migrate(state275());
      eq(st.meta.migrations, ['2.7.6', '2.7.7', '2.7.8'], 'все маркеры, по порядку');
      eq(st.meta.updatedAt, STAMP, 'updatedAt не сдвинут');
      eq(State.migrationReport277().todo, TODO_IDS, 'отчёт: пять событий');
      TODO_IDS.forEach(function (id) {
        var e = byId(st.radar, id), m2 = byId(State.M2_EVENTS, id);
        eq([e.type, e.course, e.date, e.note], ['todo', m2.course, m2.date, m2.note], id + ' → дело, курс и заметка прежние');
      });
      eq(['ev-2026-09-15-quiz-mhf4u', 'ev-2026-09-22-unit-test-mhf4u', 'ev-2026-09-25-eng2d-poetry', 'ev-2026-11-18-csmc']
        .map(function (id) { return byId(st.radar, id).type; }), ['quiz', 'test', 'assignment', 'test'], 'оценочные события не тронуты');

      var twice = State.migrate(clone(st));
      eq(JSON.stringify(twice), JSON.stringify(st), 'второй прогон — нулевой diff');
      eq(State.migrationReport277(), null, 'шаг 2.7.7 не запускался');

      var lost = clone(st);
      lost.meta.migrations = ['2.7.6'];
      var again = State.migrate(lost);
      eq(State.migrationReport277().todo, [], 'без маркера шаг узнаёт себя сам: менять нечего');
      eq(JSON.stringify(again), JSON.stringify(st), 'и состояние то же');
    });
  });

  describe('2.7.7 Э5: состояние после 2.7.6 и правка владельца', function () {
    withToday(MON, function () {
      var src = state275();
      src.meta.migrations = ['2.7.6'];
      src.radar = State.M2_EVENTS.map(function (r) {
        return { id: r.id, done: false, course: r.course, type: r.type, date: r.date, note: r.note };
      });
      byId(src.radar, 'ev-2026-09-14-guidance').type = 'test';           // сменил тип руками
      byId(src.radar, 'ev-2026-09-15-volunteer-letter').done = true;
      var st = State.migrate(src);
      eq(st.meta.migrations, ['2.7.6', '2.7.7', '2.7.8'], 'маркер 2.7.7 дописан (и 2.7.8 следом)');
      eq(State.migrationReport276(), null, '2.7.6 не перезапускалась');
      eq(byId(st.radar, 'ev-2026-09-14-guidance').type, 'test', 'тип, выбранный руками, не тронут');
      eq([byId(st.radar, 'ev-2026-09-15-volunteer-letter').type, byId(st.radar, 'ev-2026-09-15-volunteer-letter').done],
        ['todo', true], 'отметка «прошло» цела');
      eq(State.migrationReport277().todo.length, 4, 'переведено четыре');
    });
  });

  /** Утро 14.09: Ф0 закрыта, дорожки свежие, события радара — как их оставила 2.7.6. */
  function scene(types) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.s.meta.onboardedAt = '2026-08-22';
    ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach(function (b) {
      State.activeLessons(b).forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: '2026-09-12' }; });
      State.refreshBlockDone(b);
    });
    State.s.tracks.forEach(function (t) { if (!t.embedded) t.lastLessonDate = '2026-09-12'; });
    State.s.radar = State.M2_EVENTS.map(function (r) {
      return { id: r.id, done: false, course: r.course, type: types === 'todo' && TODO_IDS.indexOf(r.id) >= 0 ? 'todo' : r.type,
        date: r.date, note: r.note };
    });
  }

  describe('2.7.7 Э5: 14.09 причина — не «радар: сдача MHF4U»', function () {
    withToday(MON, function () {
      scene('2.7.6');
      eq(Waterfall.pick(MON).reason.text, 'радар: сдача MHF4U сегодня', 'до 2.7.7: запись на конкурс — «сдача»');

      scene('todo');
      var r = Waterfall.pick(MON);
      eq([r.lessonId, r.reason.kind, r.reason.text], ['B7.1', 'radar', 'радар: квиз MHF4U завтра'],
        'дело пропущено — день отдаёт квиз 15.09');

      // дело по курсу с дорожкой один на радаре — водопад его не видит
      State.s.radar = State.s.radar.filter(function (e) { return e.type === 'todo'; });
      ok(Waterfall.pick(MON).reason.kind !== 'radar', 'одни дела — правило радара молчит: ' + Waterfall.pick(MON).reason.text);
    });
  });

  describe('2.7.7 Э5: список и форма — курс у дела не обязателен', function () {
    withToday(MON, function () {
      scene('todo');
      var html = App.screen('radar').render();
      ok(html.indexOf('MHF4U · дело') > 0, 'дело с курсом: «MHF4U · дело»');
      ok(html.indexOf('<span class="dotmark dim"></span> дело</div>') > 0, 'дело без курса — только тип');
      eq(html.indexOf('undefined'), -1, 'без «undefined»');

      function open(existing) {
        var real = UI.sheet, got = null;
        UI.sheet = function (o) { got = o; };
        try { Radar.addEvent(existing); } finally { UI.sheet = real; }
        var fields = {}, handlers = {};
        function field(sel, value) {
          return (fields[sel] = { value: value, textContent: '', focus: function () {},
            classList: { add: function () {}, remove: function () {}, toggle: function () {} } });
        }
        field('[data-other]', ''); field('[data-date]', '2026-09-18'); field('[data-note]', 'позвонить');
        field('.ev-err', ''); field('[data-cancel]', ''); field('[data-save]', '');
        var closed = false;
        var root = {
          querySelector: function (s) { return fields[s] || null; },
          querySelectorAll: function () { return []; },
          contains: function () { return true; },
          addEventListener: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); }
        };
        got.onMount(root, function () { closed = true; });
        function chip(attr, value) {
          var el = { dataset: {}, classList: { add: function () {}, remove: function () {} }, setAttribute: function () {} };
          el.dataset[attr] = value;
          var target = { closest: function (sel) { return sel === '[data-' + attr + ']' ? el : null; } };
          handlers.click.forEach(function (fn) { fn({ target: target }); });
        }
        return { body: got.body, fields: fields, chip: chip,
          save: function () { return quiet(function () { fields['[data-save]'].onclick(); }); },
          closed: function () { return closed; } };
      }

      var sh = open();
      ok(sh.body.indexOf('data-course="none"') > 0, 'чип «без курса»');
      ok(sh.body.indexOf('data-type="todo"') > 0, 'чип «дело»');

      var n = State.s.radar.length;
      sh.chip('course', 'none');
      sh.save();
      ok(/только «дело»/.test(sh.fields['.ev-err'].textContent), 'тест без курса не сохраняется: ' + sh.fields['.ev-err'].textContent);
      eq(State.s.radar.length, n, 'и ничего не добавлено');

      sh.chip('type', 'todo');
      var said = sh.save();
      eq(sh.closed(), true, 'дело без курса сохраняется');
      var added = State.s.radar[State.s.radar.length - 1];
      eq([added.type, added.course, added.date, added.note], ['todo', '', '2026-09-18', 'позвонить'], 'запись дела');
      eq(said, ['Событие дело в радаре'], 'тост без пустого кода');

      var ed = open(byId(State.s.radar, 'ev-2026-09-15-volunteer-letter'));
      ok(ed.body.indexOf('data-course="none" aria-pressed="true"') > 0, 'событие без курса открывается на «без курса»');
    });
  });

  State.reset();
  State.syncContent();
})();
