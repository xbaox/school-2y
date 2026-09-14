/* 2.7.6, этап 6: уровень дня не выше достигнутого.

   09.09 записан тапом «Норма» в сегменте «Уровень дня»: сегмент сразу писал
   уровень и давал 2 очка дню без урока, минималки и радара. Сегмент — это
   выбор плана (урок в плане есть только на норме и полной), поэтому запрет
   на сам тап заблокировал бы урок. План и уровень разведены: day.plan —
   выбор, day.level — не выше достигнутого; очки — за уровень (доктрина 2.1). */

(function () {
  'use strict';

  var TUE = '2026-09-15', SUN = '2026-09-13';

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.s.onboarded = true;
  }

  function summary() {
    return { score: 8, level: 'L2', topics: 'т', words: [], debts: [], cleared: [], warmup: [],
      checklist: null, stretch: null, writing: '', raw: '' };
  }

  describe('2.7.6 Э6: норму нельзя записать дню без урока и без радара', function () {
    withToday(TUE, function () {
      fresh();
      State.setLevel('norm');
      var d = State.day(TUE);
      eq([d.plan, d.level, d.points], ['norm', 'none', 0], 'тап «Норма»: план — норма, уровень — пусто, 0 очков');
      State.setLevel('full');
      eq([State.day(TUE).plan, State.day(TUE).level], ['full', 'none'], 'полная — тоже только план');
      State.setLevel('min');
      eq([State.day(TUE).plan, State.day(TUE).level], ['min', 'none'], 'минималка без шагов — не записана');
      ok(App.planItems(TUE, State.day(TUE)).some(function (i) { return i.tick === 'm0'; }),
        'план при этом показывает шаги минималки');

      State.setLevel('norm');
      ok(App.planItems(TUE, State.day(TUE)).some(function (i) { return i.tick === 'lesson'; }),
        'и пункт урока — взять урок ничто не мешает');
      eq(State.achievedLevel(State.day(TUE), TUE), 'none', 'достигнуто — ничего');
    });
  });

  describe('2.7.6 Э6: норма и полная — закрытым уроком или ДЗ-уроком', function () {
    withToday(TUE, function () {
      fresh();
      State.setLevel('full');
      State.applySummary('B7.1', summary(), { date: TUE });
      eq([State.day(TUE).level, State.points(TUE)], ['norm', 2], 'один урок при плане «полная» — норма, 2 очка');
      State.applySummary('B8.1', summary(), { date: TUE });
      eq([State.day(TUE).level, State.points(TUE)], ['full', 3], 'второй урок — полная, 3 очка');

      fresh();
      State.startHw('MHF4U', TUE, 'B7.1');
      State.setLevel('norm');
      eq(State.day(TUE).level, 'none', 'ДЗ-урок взят, ИТОГа нет — уровня нет');
      State.applySummary('HW-2026-09-15-math', summary(), { date: TUE, course: 'MHF4U' });
      eq([State.day(TUE).level, State.points(TUE)], ['norm', 2], 'ИТОГ ДЗ-урока — норма');

      fresh();
      State.setLevel('min');
      State.applySummary('B7.1', summary(), { date: TUE });
      eq(State.day(TUE).level, 'min', 'выше плана уровень не поднимается');
    });
  });

  describe('2.7.6 Э6: минималка — только при обоих шагах', function () {
    withToday(TUE, function () {
      fresh();
      State.setLevel('min');
      App.setMinimalStep(1, true);
      eq([State.day(TUE).level, State.points(TUE)], ['none', 0], 'один шаг из двух — не минималка');
      App.setMinimalStep(0, true);
      eq([State.day(TUE).level, State.points(TUE)], ['min', 1], 'оба шага — минималка, 1 очко');
      App.setMinimalStep(1, false);
      eq([State.day(TUE).level, State.points(TUE)], ['none', 0], 'снятый шаг опускает уровень');
      eq(State.day(TUE).plan, 'min', 'а план остаётся');
    });
  });

  describe('2.7.6 Э6: радар-день получает норму через добавку «радар»', function () {
    withToday(SUN, function () {
      fresh();
      State.setLevel('norm');
      eq(State.day(SUN).level, 'none', 'воскресенье без чек-листа — уровня нет');
      Radar.setChecklistAll(true, SUN);
      eq([State.day(SUN).level, State.points(SUN)], ['norm', 3], 'чек-лист закрыт — норма и +1 радара');
      ok(State.holdsStreak(SUN), 'и день держит серию');

      // форма 30.08 / 06.09 / 13.09 из экспорта: норма, радар, минималка, уроков нет
      State.s.days['2026-08-30'] = { level: 'norm', addons: ['radar'], points: 3, lessons: [], minimalSteps: [true, true] };
      State.recount('2026-08-30');
      eq(State.s.days['2026-08-30'], { level: 'norm', addons: ['radar'], points: 3, lessons: [], minimalSteps: [true, true] },
        'радарные воскресенья экспорта при пересчёте не меняются');

      // в будни добавка радара нормы не даёт
      State.s.days[TUE] = { level: 'norm', addons: ['radar'], points: 3, lessons: [] };
      State.recount(TUE);
      eq([State.s.days[TUE].level, State.s.days[TUE].plan], ['none', 'norm'], 'будний «радар» — не радар-день');
    });
  });

  describe('2.7.6 Э6: день формы 09.09 и 11.09 при пересчёте', function () {
    withToday(SUN, function () {
      fresh();
      State.s.days['2026-09-09'] = { level: 'norm', addons: [], points: 2, lessons: [] };
      State.recount('2026-09-09');
      eq(State.s.days['2026-09-09'], { level: 'none', addons: [], points: 0, lessons: [], plan: 'norm' },
        '09.09: уровень — пусто, 0 очков, выбранный план сохранён');
      ok(!State.holdsStreak('2026-09-09'), 'серию он и раньше не держал');

      var fri = { hw: 'HW-2026-09-11-math', level: 'min', addons: [], points: 1, hwMoved: 'B7.1',
        lessons: [], hwCourse: 'MHF4U', minimalSteps: [true, true] };
      State.s.days['2026-09-11'] = JSON.parse(JSON.stringify(fri));
      State.recount('2026-09-11');
      eq(State.s.days['2026-09-11'], fri, '11.09 (минималка + незакрытый ДЗ-урок) не меняется');
    });
  });

  State.reset();
  State.syncContent();
})();
