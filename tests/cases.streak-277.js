/* 2.7.7, Э4: рекорд серии при любом пересчёте дня.

   stats.bestStreak поднимали только закрытие урока, план и добавки. Шаги
   минималки и воскресный чек-лист радара серию держат, но рекорд не трогали:
   на живой копии 13.09 серия 56 при рекорде 55. Теперь рекорд поднимает
   State.recount (любой пересчёт дня), а при загрузке — State.migrate, не
   двигая meta.updatedAt. */

(function () {
  'use strict';

  var MON = '2026-09-14', SUN = '2026-09-13';

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /** n дней подряд, закрытых минималкой, до дня before (не включая). */
  function heldDays(before, n) {
    var days = {};
    for (var i = 1; i <= n; i++) {
      days[U.addDays(before, -i)] = { level: 'min', plan: 'min', addons: [], lessons: [], points: 1, minimalSteps: [true, true] };
    }
    return days;
  }

  function scene(today, n, best) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.days = heldDays(today, n);
    State.s.stats.bestStreak = best;
  }

  function quiet(fn) {
    var real = UI.toast;
    UI.toast = function () {};
    try { return fn(); } finally { UI.toast = real; }
  }

  describe('2.7.7 Э4: шаги минималки поднимают рекорд', function () {
    withToday(MON, function () {
      scene(MON, 5, 5);
      eq(State.streak(), 5, 'серия 5');
      quiet(function () { App.setMinimalStep(1, true); });
      eq(State.s.stats.bestStreak, 5, 'один шаг из двух серию не продлил');
      quiet(function () { App.setMinimalStep(0, true); });    // колода пустая — шаг не отклоняется
      eq([State.streak(), State.s.stats.bestStreak], [6, 6], 'минималка закрыта: серия 6 = рекорд 6');
      quiet(function () { App.setMinimalStep(0, false); });
      eq([State.streak(), State.s.stats.bestStreak], [5, 6], 'снятый шаг рекорд не отбирает');
    });
  });

  describe('2.7.7 Э4: воскресный чек-лист радара поднимает рекорд', function () {
    withToday(SUN, function () {
      scene(SUN, 5, 5);
      quiet(function () { Radar.setChecklistAll(true, SUN); });
      eq([State.streak(), State.s.stats.bestStreak], [6, 6], 'кружок «Воскресный радар»: серия 6 = рекорд 6');

      scene(SUN, 5, 5);
      quiet(function () { for (var i = 0; i < Radar.CHECKLIST.length; i++) Radar.toggleCheck(i, SUN); });
      eq([State.streak(), State.s.stats.bestStreak], [6, 6], 'пять галочек по одной — то же');
    });
  });

  describe('2.7.7 Э4: план, добавка и урок — через тот же пересчёт', function () {
    withToday(MON, function () {
      scene(MON, 5, 0);
      State.setLevel('norm');
      eq(State.s.stats.bestStreak, 5, 'план');

      scene(MON, 5, 0);
      State.toggleAddon('project');
      eq(State.s.stats.bestStreak, 5, 'добавка');

      scene(MON, 5, 0);
      State.recount(U.addDays(MON, -1));
      eq(State.s.stats.bestStreak, 5, 'пересчёт любого дня (Настройки пересчитывают все)');

      scene(MON, 5, 5);
      State.applySummary('B7.1', { score: 8, level: 'L2', topics: 'т', words: [], debts: [], cleared: [], warmup: [],
        checklist: null, stretch: null, writing: '', raw: '' }, { date: MON });
      eq([State.streak(), State.s.stats.bestStreak], [6, 6], 'закрытый урок');
    });
  });

  describe('2.7.7 Э4: загрузка сводит рекорд с серией и не двигает updatedAt', function () {
    var STAMP = '2026-09-13T16:01:36.617Z';
    // форма живой копии 13.09: 55 дней минималкой, 13.09 — воскресный радар без минималки
    function src(best) {
      var days = heldDays(SUN, 55);
      days[SUN] = { level: 'norm', addons: ['radar'], lessons: [], points: 1, checklist: [true, true, true, true, true] };
      return { meta: { updatedAt: STAMP, version: 3, onboardedAt: '2026-09-20', migrations: ['2.7.6', '2.7.7'] },
        settings: { mode: 'school' }, days: days, stats: { wordsTotal: 0, lessonsDone: 0, bestStreak: best, stretchDone: 0 } };
    }
    withToday(SUN, function () {
      var st = State.migrate(src(55));
      eq(st.stats.bestStreak, 56, 'рекорд 55 → 56');
      eq(st.meta.updatedAt, STAMP, 'updatedAt не сдвинут');
      eq(JSON.stringify(State.migrate(clone(st))), JSON.stringify(st), 'второй прогон — нулевой diff');
      eq(State.migrate(src(99)).stats.bestStreak, 99, 'рекорд выше серии не трогается');

      State.replace(src(55), true);
      eq([State.streak(), State.s.stats.bestStreak], [56, 56], 'после replace (импорт, pull): серия 56 = рекорд 56');
      eq(State.s.meta.updatedAt, STAMP, 'и updatedAt прежний');
    });
    withToday(MON, function () {
      eq(State.migrate(src(55)).stats.bestStreak, 56, 'назавтра, пока день пуст, — тоже 56');
    });
  });

  State.reset();
  State.syncContent();
})();
