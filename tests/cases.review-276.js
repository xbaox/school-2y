/* 2.7.6, этап 9: починки по состязательному ревью.

   Восемь подтверждённых находок: подпись кольца дня, откат M4 клиентом 2.7.5,
   правка события без курса, второй урок в день ДЗ-урока, «добитая» колода
   за два нажатия, слова-сироты после «Итог ещё раз», застывший прогресс
   «карточки: n/10» и очередь своей дорожки против сроков (Б12 и Б14). */

(function () {
  'use strict';

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage('S0');
    State.s.onboarded = true;
  }

  function summary(words) {
    return { score: 8, level: 'L2', topics: 'т', words: words || [], debts: [], cleared: [], warmup: [],
      checklist: null, stretch: null, writing: '', raw: '' };
  }

  function quiet(fn) {
    var real = UI.toast, said = [];
    UI.toast = function (m) { said.push(m); };
    try { return { value: fn(), said: said }; } finally { UI.toast = real; }
  }

  describe('2.7.6 ревью: подпись кольца дня — очки из цели, а не имя плана', function () {
    withToday('2026-09-15', function () {
      fresh();
      State.setLevel('norm');
      State.day('2026-09-15').lessons.push('B7.1');
      State.recount('2026-09-15');
      var title = (App.dayRing('2026-09-15').match(/title="([^"]*)"/) || [])[1];
      eq(title, 'очки дня: 2 из 3', 'в подписи числа, не «из norm»');
    });
  });

  describe('2.7.6 ревью: клиент 2.7.5 откатил дела M4 — загрузка 2.7.6 их возвращает', function () {
    withToday('2026-09-14', function () {
      var seed0 = Radar.SEED_TODOS[0], seed2 = Radar.SEED_TODOS[2];
      var st = State.migrate({
        meta: { version: 3, onboardedAt: '2026-08-22', updatedAt: 'X' }, settings: {}, days: {},
        todos: [
          { id: 'mt4vmss1jqr1hf', title: seed0.title, why: seed0.why, due: seed0.due, window: null, source: 'seed', done: false, doneDate: null },
          { id: 'mt4vmss12dy03k', title: seed2.title, why: seed2.why, due: seed2.due, window: null, source: 'seed', done: true, doneDate: '2026-09-14' }
        ]
      });
      eq(st.meta.migrations, ['2.7.6', '2.7.7'], 'маркер записан');
      // так делает Radar.migrateTodos 2.7.5 на следующей загрузке: тексты 2.6.2 поверх M4
      var reverted = clone(st);
      reverted.todos[0].title = seed0.title; reverted.todos[0].why = seed0.why; reverted.todos[0].due = seed0.due;
      reverted.todos[1].why = seed2.why; reverted.todos[1].due = seed2.due;
      var healed = State.migrate(reverted);
      eq(State.migrationReport276(), null, 'шаг 2.7.6 не перезапускался — маркер есть');
      eq([healed.todos[0].title, healed.todos[0].due], [State.M4_TODOS[0].set.title, '2026-09-14'], 'дело guidance — снова M4');
      eq([healed.todos[1].due, healed.todos[1].done], ['2026-10-15', true], 'второе дело — M4, отметка «сделано» цела');

      // своя правка владельца не откатывается
      var own = clone(st);
      own.todos[0].title = 'Guidance: перенесли на вторник';
      eq(State.migrate(own).todos[0].title, 'Guidance: перенесли на вторник', 'правка руками не трогается');
    });
  });

  describe('2.7.6 ревью: событие без курса сохраняется из формы', function () {
    withToday('2026-09-14', function () {
      fresh();
      var ev = { id: 'ev-2026-09-15-volunteer-letter', done: false, course: '', type: 'assignment', date: '2026-09-15', note: 'Письмо' };
      State.s.radar.push(ev);
      var real = UI.sheet, got = null;
      UI.sheet = function (o) { got = o; };
      try { Radar.addEvent(ev); } finally { UI.sheet = real; }
      var fields = {};
      function field(sel, value) { return (fields[sel] = { value: value, textContent: '', focus: function () {}, classList: { add: function () {}, remove: function () {}, toggle: function () {} } }); }
      field('[data-other]', ''); field('[data-date]', '2026-09-16'); field('[data-note]', 'перенёс на среду');
      field('.ev-err', ''); field('[data-cancel]', ''); field('[data-save]', '');
      var closed = false;
      got.onMount({ querySelector: function (s) { return fields[s] || null; }, addEventListener: function () {} }, function () { closed = true; });
      quiet(function () { fields['[data-save]'].onclick(); });
      eq([fields['.ev-err'].textContent, closed], ['', true], 'сохранилось без кода курса');
      eq([ev.course, ev.date, ev.note], ['', '2026-09-16', 'перенёс на среду'], 'дата и заметка обновлены, курс так и пуст');
    });
  });

  describe('2.7.6 ревью: второй урок в день ДЗ-урока закрывается своим ИТОГом', function () {
    withToday('2026-09-15', function () {
      fresh();
      var t = '2026-09-15';
      State.setLevel('full');
      var hw = State.startHw('MHF4U', t, Lesson.current(t).lessonId);
      State.applySummary(hw.id, summary(), { date: t, course: 'MHF4U' });
      var y = Lesson.dayLesson(2, t).lessonId;
      ok(!State.isHw(y) && !!y, 'пункт 2 предлагает программный урок: ' + y);

      // «Скопировать промпт» в пункте 2: после копирования copyPrompt зовёт
      // remember (урок становится уроком дня) и markPromptCopied — здесь синхронно
      Lesson.remember(y, null, t);
      State.markPromptCopied(y, t);
      eq(Lesson.dayLesson(2, t).lessonId, y, 'после копирования пункт 2 держит тот же урок');

      State.applySummary(y, summary(), { date: t });
      var item2 = App.planItems(t, State.day(t)).filter(function (i) { return i.id === 'l2'; })[0];
      eq(Lesson.dayLesson(2, t).lessonId, y, 'закрытый урок остаётся в пункте 2');
      eq(item2.done, true, 'пункт 2 отмечен');
      eq([State.day(t).level, State.points(t)], ['full', 3], 'ДЗ-урок и урок — полная');
    });
  });

  /* ---------- листалка карточек на кукольном корне ---------- */

  function openCards() {
    var nodes = {};
    function node(name) {
      return nodes[name] || (nodes[name] = { hidden: false, className: '', innerHTML: '', textContent: '', onclick: null });
    }
    var root = { querySelector: node, addEventListener: function () {}, contains: function () { return true; } };
    var real = UI.sheet;
    UI.sheet = function (o) { if (o.onMount) o.onMount(root, function () {}); };
    try { Cards.open(); } finally { UI.sheet = real; }
    return { prev: function () { node('[data-prev]').onclick(); }, next: function () { node('[data-next]').onclick(); } };
  }

  function deckOf(n) {
    fresh();
    var words = [];
    for (var i = 0; i < n; i++) words.push({ en: 'card' + i, ru: 'к' + i });
    State.applySummary('B7.1', summary(words), { date: '2026-09-13' });
  }

  describe('2.7.6 ревью: «← назад» с первой карточки не добивает колоду', function () {
    withToday('2026-09-14', function () {
      deckOf(20);
      var c = openCards();
      c.prev();
      c.next();
      eq(State.s.cards.viewedToday, 2, 'показаны две карточки');
      ok(State.s.cards.doneDay !== '2026-09-14', 'колода не отмечена добитой');
      eq(State.cardsStep('2026-09-14').ok, false, 'шаг «Карточки» не засчитан');

      deckOf(12);
      c = openCards();
      for (var i = 0; i < 12; i++) c.next();
      eq(State.s.cards.doneDay, '2026-09-14', 'честный проход всей колоды — добита');
      eq(State.cardsStep('2026-09-14').ok, true, 'и шаг засчитан');
    });
  });

  describe('2.7.6 ревью: набранный шаг «Карточки» перерисовывает «Сегодня»', function () {
    withToday('2026-09-14', function () {
      deckOf(20);
      var emits = 0;
      var off = State.subscribe(function () { emits++; });
      try {
        var c = openCards();
        for (var i = 0; i < 8; i++) c.next();
        eq(emits, 0, 'пока не набрано — тихо');
        c.next();
        eq([State.s.cards.viewedToday, emits], [10, 1], 'десятая карточка — одна перерисовка');
        c.next();
        eq(emits, 1, 'дальше снова тихо');
      } finally { off(); }
    });
  });

  describe('2.7.6 ревью: «Итог ещё раз» с исправленным списком не оставляет слов-сирот', function () {
    withToday('2026-09-14', function () {
      fresh();
      var t = '2026-09-14';
      State.applySummary('B7.1', summary([{ en: 'consecutive integers', ru: 'последовательные целые' }, { en: 'slope', ru: 'наклон' },
        { en: 'vertex', ru: 'вершина' }]), { date: t });
      State.gradeWord('vertex', true, t);
      State.applySummary('B7.1', summary([{ en: 'consecutive', ru: 'последовательные' }, { en: 'slope', ru: 'наклон' }]), { date: t });
      eq(Object.keys(State.s.srs).sort(), ['consecutive', 'slope', 'vertex'], 'нетронутое слово из заменённого итога ушло');
      eq(State.s.stats.wordsTotal, 3, 'счётчик — по SRS');
      ok(State.s.srs.vertex.streak > 0, 'оценённое слово осталось — это история владельца');

      State.applySummary('B7.2', summary([{ en: 'slope', ru: 'наклон' }]), { date: '2026-09-15' });
      State.applySummary('B7.1', summary([{ en: 'consecutive', ru: 'последовательные' }]), { date: t });
      ok(Object.prototype.hasOwnProperty.call(State.s.srs, 'slope'), 'слово, живущее в другом итоге, не снимается');
    });
  });

  describe('2.7.6 ревью: своя дорожка — по сроку блока (Б14 раньше Б12)', function () {
    fresh();
    Object.keys(State.s.blocks).forEach(function (id) {
      var b = State.s.blocks[id];
      if (id === 'B12' || id === 'B14' || !b.deadline || b.deadline > '2026-12-31') return;
      State.activeLessons(id).forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: '2026-11-01' }; });
      State.refreshBlockDone(id);
    });
    State.s.tracks.forEach(function (tr) { if (!tr.embedded) tr.lastLessonDate = '2026-11-01'; });
    eq(Waterfall.nextOwnLesson('write', 'p1'), 'B14.1', 'очередь письма: Б14 (срок 22.11) раньше Б12 (20.12)');
    eq(State.nextLessonInTrack('write'), 'B12.1', 'сквозная очередь дорожки — прежняя, по номеру');
    withToday('2026-11-03', function () {
      var p = Waterfall.pick('2026-11-03');
      eq([p.lessonId, p.reason.kind], ['B14.1', 'plan'], 'вторник по шаблону — Б14.1');
    });
    State.s.tracks.forEach(function (tr) { if (!tr.embedded) tr.lastLessonDate = tr.id === 'write' ? '2026-11-10' : '2026-11-15'; });
    withToday('2026-11-17', function () {
      var p = Waterfall.pick('2026-11-17');
      // 2.7.7 (Э1): четыре урока Б14 на четыре будня — раньше свежести срабатывает дедлайн
      eq([p.lessonId, p.reason.text], ['B14.1', 'дедлайн: Б14 через 5 дней, осталось 4 урока'],
        '17.11 — Б14.1, дедлайном заранее');
    });
  });

  State.reset();
  State.syncContent();
})();
