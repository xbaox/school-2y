/* 2.7.8, Б9: страна прошлой школы в посевах — квазиидентификатор.

   Посев дела guidance, третий вопрос карточки и «зачем» дела M4 называли
   страну прошлой школы, а репозиторий публичный. Тексты переписаны («прошлая
   школа за границей»); прежняя редакция в данных узнаётся по новому тексту с
   масками на местах замен (State.QUASI_278) и переписывается миграцией 2.7.8.

   Прежних текстов в этом файле нет — ни целиком, ни кусками, ни их хэшей, ни
   даже их оборотов. Механизм проверяется на условной прежней редакции: каждое
   место замены в новом тексте подменено меткой «ВСТАВКА-n». */

(function () {
  'use strict';

  var STAMP = '2026-09-13T16:01:36.617Z';
  var MIGS_277 = ['2.7.6', '2.7.7'];
  var MIGS_278 = ['2.7.6', '2.7.7', '2.7.8'];

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function byId(list, id) { return (list || []).filter(function (x) { return x && x.id === id; })[0]; }
  function hasOld(text) { return /ВСТАВКА-\d/.test(String(text)); }

  function seedGuidance() { return Radar.SEED_TODOS.filter(function (t) { return t.match === 'guidance'; })[0]; }
  function seedQ3() { return Radar.QUESTIONS_SEED.items[2]; }

  /** Условная прежняя редакция: места замен нового текста → метки. */
  function masked(text, slots, from) {
    var n = from;
    slots.forEach(function (sl) {
      if (text.split(sl).length !== 2) throw new Error('не одно вхождение: ' + sl);
      text = text.replace(sl, 'ВСТАВКА-' + (n++));
    });
    return text;
  }
  function old277() {
    var q = seedQ3(), Q = State.QUASI_278;
    return {
      seedWhy: masked(seedGuidance().why, Q.seedWhy, 1),
      m4Why: masked(State.M4_TODOS[0].set.why, Q.m4Why, 5),
      qEn: masked(q.en, Q.qEn, 6),
      qRu: masked(q.ru, Q.qRu, 7)
    };
  }

  describe('2.7.8 Б9: в дереве нет ничего, вычисленного из прежних текстов', function () {
    var q = seedQ3();
    var texts = { seedWhy: seedGuidance().why, m4Why: State.M4_TODOS[0].set.why, qEn: q.en, qRu: q.ru };
    eq(Object.keys(State.QUASI_278).sort(), ['m4Why', 'qEn', 'qRu', 'seedWhy'], 'четыре текста с местами замен');
    Object.keys(State.QUASI_278).forEach(function (k) {
      var slots = State.QUASI_278[k], pos = 0;
      ok(Array.isArray(slots) && slots.length > 0, k + ': места замен — список фраз');
      slots.forEach(function (sl) {
        var at = texts[k].indexOf(sl, pos);
        ok(at >= pos, k + ': «' + sl + '» — фраза нового текста, по порядку');
        pos = at + sl.length;
      });
    });
    eq(JSON.stringify(State.QUASI_278).match(/[0-9a-f]{8}/g), null, 'ни хэшей, ни длин прежних текстов');
    eq(typeof U.fingerprint, 'undefined', 'отпечатков нет');
    eq(App.mixedBundle(), [], 'полная сборка: смесь версий не видна');
  });

  describe('2.7.8 Б9: тексты посева и M4 — новая редакция', function () {
    var g = seedGuidance(), q = seedQ3(), m4 = State.M4_TODOS[0].set.why;
    ok(g.why.indexOf('How many credits will I get for my previous school abroad, and which compulsory credits do I still need?') > 0,
      'вопрос 1 guidance по-английски');
    ok(g.why.indexOf('сколько кредитов зачтут за прошлую школу за границей') > 0, 'и по-русски');
    ok(g.why.indexOf('зачётом за прошлую школу или курсами') > 0, 'вопрос 3 guidance');
    ok(g.why.indexOf('аттестат 9 кл (оригинал + перевод)') > 0, 'документы — без языка оригинала');
    ok(q.en.indexOf('How were my school years abroad counted') > 0, 'третий вопрос карточки по-английски');
    ok(q.ru.indexOf('Как зачтены мои годы за границей') > 0, 'и по-русски');
    ok(m4.indexOf('закрывает кредиты, годы за границей, официальный класс') > 0, '«зачем» M4');
    eq((g.why.match(/^\d\) /gm) || []).length, 9, 'в guidance по-прежнему девять вопросов');
    var o = old277();
    Object.keys(o).forEach(function (k) { ok(hasOld(o[k]), 'условная прежняя редакция ' + k + ' — с метками'); });
  });

  describe('2.7.8 Б9: свежий посев — сразу новая редакция', function () {
    State.reset();
    State.syncContent();
    Radar.seedTodos();
    Radar.seedQuestions();
    var st = State.migrate(clone(State.s));
    var g = st.todos.filter(function (t) { return t.title === seedGuidance().title; })[0];
    eq(g.why, seedGuidance().why, 'дело guidance — новая редакция');
    eq(hasOld(JSON.stringify({ todos: st.todos, radar: st.radar })), false, 'прежней редакции нет');
    eq(State.migrationReport278(), { todos: [], items: [] }, 'переписывать нечего');
  });

  /** Состояние 2.7.7 формы владельца: дело M4 прежней редакции, карточка M3. */
  function owner277() {
    var o = old277();
    var card = { id: 'q-2026-09-08', type: 'questions', title: 'Консультант, пн 14.09 — три вопроса', date: '2026-09-14',
      items: clone(State.M3_ITEMS) };
    card.items[0].done = true;
    card.items[0].note = 'распечатку дадут в среду';
    return {
      meta: { updatedAt: STAMP, version: 3, onboardedAt: '2026-08-22', migrations: MIGS_277.slice() },
      settings: { mode: 'school', schoolCourses: clone(State.SCHOOL_COURSES) },
      radar: [card],
      todos: [
        { id: 'mt4vmss1jqr1hf', title: State.M4_TODOS[0].set.title, why: o.m4Why, due: '2026-09-14', window: null,
          source: 'seed', done: true, doneDate: '2026-09-14' },
        { id: 'mt4vmss12dy03k', title: Radar.SEED_TODOS[2].title, why: State.M4_TODOS[1].set.why, due: '2026-10-15', window: null,
          source: 'seed', done: false, doneDate: null },
        { id: 't-own', title: seedGuidance().title, why: o.seedWhy + '\nСпросить ещё про OSSLT.', due: '2026-09-11', window: null,
          source: 'seed', done: false, doneDate: null },
        { id: 't-user', title: 'Моё дело', why: 'не трогать', due: null, window: null, source: 'user', done: false, doneDate: null }
      ],
      summaries: [], lessons: {}, srs: {}, days: {}, debts: [], hw: {}
    };
  }

  describe('2.7.8 Б9: миграция на состоянии 2.7.7 формы владельца', function () {
    withToday('2026-09-15', function () {
      var src = owner277(), raw = clone(src);
      var st = State.migrate(src);
      eq(st.meta.migrations, MIGS_278, 'маркер 2.7.8 дописан после 2.7.7');
      eq(st.meta.updatedAt, STAMP, 'updatedAt не сдвинут');
      eq(State.migrationReport278(), { todos: ['mt4vmss1jqr1hf'], items: [] }, 'отчёт: одно дело, вопросов нет');
      var g = byId(st.todos, 'mt4vmss1jqr1hf');
      eq(g.why, State.M4_TODOS[0].set.why, '«зачем» M4 — новая редакция');
      eq([g.title, g.due, g.done, g.doneDate], [raw.todos[0].title, '2026-09-14', true, '2026-09-14'],
        'название, срок и отметка «сделано» целы');
      eq(byId(st.todos, 'mt4vmss12dy03k'), raw.todos[1], 'второе дело M4 не тронуто');
      eq(byId(st.todos, 't-own'), raw.todos[2], 'дело, правленное руками вне мест замены, не тронуто');
      eq(byId(st.todos, 't-user'), raw.todos[3], 'дело владельца не тронуто');
      eq(byId(st.radar, 'q-2026-09-08'), raw.radar[0], 'карточка M3 не тронута: отметка и ответ на месте');

      var twice = State.migrate(clone(st));
      eq(JSON.stringify(twice), JSON.stringify(st), 'второй прогон — нулевой diff');
      eq(State.migrationReport278(), null, 'и отчёта нет: маркер есть');
    });
  });

  describe('2.7.8 Б9: своя правка на месте замены после 2.7.8 не откатывается', function () {
    withToday('2026-09-17', function () {
      var st = State.migrate(owner277());
      var own = clone(st);
      byId(own.todos, 'mt4vmss1jqr1hf').why = State.M4_TODOS[0].set.why.replace('годы за границей', '9–10 класс, свои слова');
      // своя карточка вопросов (карточку M3 миграция держит в трёх пунктах)
      own.radar.push({ id: 'q-own', type: 'questions', title: 'Свои вопросы', date: '2026-09-18', items: [
        { who: 'консультанту', en: seedQ3().en.replace('school years abroad', 'my own words here'), ru: seedQ3().ru, done: false, note: '' }
      ] });
      var after = State.migrate(clone(own));
      eq(JSON.stringify(after), JSON.stringify(own), 'маркер 2.7.8 есть — перевод не повторяется, правки на месте');
      eq(State.migrationReport278(), null, 'и отчёта нет');
    });
  });

  describe('2.7.8 Б9: прыжок с 2.7.5 — 2.7.6, 2.7.7 и 2.7.8 за один migrate', function () {
    withToday('2026-09-13', function () {
      var o = old277();
      var src = owner277();
      delete src.meta.migrations;
      // так дело guidance лежало в 2.7.5: посев — название и «зачем» прежней редакции
      src.todos[0] = { id: 'mt4vmss1jqr1hf', title: seedGuidance().title, why: o.seedWhy, due: '2026-09-11', window: null,
        source: 'seed', done: false, doneDate: null };
      var st = State.migrate(src);
      eq(st.meta.migrations, MIGS_278, 'все три маркера, по порядку');
      var g = byId(st.todos, 'mt4vmss1jqr1hf');
      eq([g.title, g.why, g.due], [State.M4_TODOS[0].set.title, State.M4_TODOS[0].set.why, '2026-09-14'],
        'M4 кладёт сразу новую редакцию');
      eq(State.migrationReport278(), { todos: [], items: [] }, '2.7.8 переписывать уже нечего');
      eq(st.todos.filter(function (t) { return hasOld(t.why); }).map(function (t) { return t.id; }), ['t-own'],
        'прежняя редакция осталась только в деле, правленном руками');
    });
  });

  describe('2.7.8 Б9: клиент 2.7.5 откатил дело M4 после 2.7.8 — загрузка чинит', function () {
    withToday('2026-09-16', function () {
      var o = old277();
      var st = State.migrate(owner277());
      // Radar.migrateTodos 2.7.5: название и «зачем» посева — прежней редакции
      var reverted = clone(st);
      reverted.todos[0].title = seedGuidance().title;
      reverted.todos[0].why = o.seedWhy;
      reverted.todos[0].due = seedGuidance().due;
      var healed = State.migrate(reverted);
      var g = byId(healed.todos, 'mt4vmss1jqr1hf');
      eq([g.title, g.why, g.due, g.done], [State.M4_TODOS[0].set.title, State.M4_TODOS[0].set.why, '2026-09-14', true],
        'healTodos276 узнал откат по маскам: снова M4, новая редакция, отметка цела');
      eq(healed.meta.migrations, MIGS_278, 'маркеры не задвоены');
    });
  });

  describe('2.7.8 Б9: свежая установка 2.7.6–2.7.7 — посев дел и карточка из восьми пунктов', function () {
    withToday('2026-09-20', function () {
      var o = old277();
      State.reset();
      State.syncContent();
      Radar.seedTodos();
      Radar.seedQuestions();
      var src = clone(State.s);
      src.meta.migrations = MIGS_277.slice();
      src.meta.updatedAt = STAMP;
      var gid = src.todos.filter(function (t) { return t.title === seedGuidance().title; })[0].id;
      src.todos.forEach(function (t) { if (t.id === gid) t.why = o.seedWhy; });
      var card = byId(src.radar, 'q-2026-09-08');
      eq(card.items.length, 8, 'карточка посева с добором — восемь пунктов');
      card.items[2].en = o.qEn;
      card.items[2].ru = o.qRu;
      card.items[2].done = true;
      card.items[2].note = 'зачли 16 кредитов';

      var st = State.migrate(clone(src));
      eq(State.migrationReport278(), { todos: [gid], items: ['q-2026-09-08#2'] }, 'отчёт: дело guidance и третий вопрос');
      eq(byId(st.todos, gid).why, seedGuidance().why, '«зачем» — новая редакция посева');
      var q = byId(st.radar, 'q-2026-09-08');
      eq([q.items[2].en, q.items[2].ru, q.items[2].done, q.items[2].note],
        [seedQ3().en, seedQ3().ru, true, 'зачли 16 кредитов'], 'вопрос — новая редакция, отметка и ответ целы');
      eq(q.items.length, 8, 'пунктов по-прежнему восемь');
      ok(!hasOld(JSON.stringify(st)), 'прежней редакции в состоянии нет');
      eq(JSON.stringify(State.migrate(clone(st))), JSON.stringify(st), 'второй прогон — нулевой diff');

      // полная загрузка: добор карточки ничего не дописывает, дела плана не переписываются
      State.replace(clone(st), true);
      eq([Radar.migrateTodos(), Radar.seedQuestions()], [0, 0], 'migrateTodos и seedQuestions ничего не делают');
      eq(byId(State.s.radar, 'q-2026-09-08').items.length, 8, 'карточка не раздута');
      eq(JSON.stringify(State.s.radar), JSON.stringify(st.radar), 'радар после загрузки тот же');
    });
  });

  describe('2.7.8 Б9: смесь версий — старый radar.js', function () {
    withToday('2026-09-15', function () {
      var o = old277(), st;
      // radar.js 2.7.7 при state.js 2.7.8: фраз новой редакции в посеве нет —
      // шаг пропускается целиком, маркер не ставится
      var g = seedGuidance(), newWhy = g.why;
      var src = owner277();
      src.todos[2].why = o.seedWhy;
      try {
        g.why = o.seedWhy;
        st = State.migrate(src);
      } finally { g.why = newWhy; }
      eq(st.meta.migrations, MIGS_277, 'маркер 2.7.8 не поставлен');
      eq(State.migrationReport278(), null, 'и отчёта нет');
      eq(byId(st.todos, 'mt4vmss1jqr1hf').why, o.m4Why, 'ничего не переписано');
      var next = State.migrate(clone(st));
      eq(next.meta.migrations, MIGS_278, 'с новым radar.js — маркер следующей загрузкой');
      eq([byId(next.todos, 't-own').why, byId(next.todos, 'mt4vmss1jqr1hf').why],
        [seedGuidance().why, State.M4_TODOS[0].set.why], 'и тексты переписаны');
    });
  });

  State.reset();
  State.syncContent();
})();
