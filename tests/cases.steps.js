/* Цикл шкалы нагрузки (7.2): паузы отрезками, окно критериев,
   завершённые циклы, откат и человеческая история.
   Находки A-03, A-07, A-17, A-18, A-20, C-23. */

(function () {
  'use strict';

  function school(pos, cycleStart) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.position = pos || 2;
    State.s.step.cycleStart = cycleStart || '2026-09-08';
    State.s.step.pauses = [];
    State.s.step.history = [];
  }

  function pause(from, to, kind) {
    State.s.step.pauses.push({ from: from, to: to, kind: kind || 'deload' });
  }

  describe('цикл A-03: разгрузка не укорачивает цикл', function () {
    school(3, '2026-09-08');

    // без пауз 14-й день цикла — 21 сентября
    eq(StepsFlow.cycleDay('2026-09-21'), 14, 'без пауз цикл закрывается на 14-й день');
    eq(StepsFlow.cycleEnded('2026-09-21'), true, 'и считается законченным');

    // неделя разгрузки внутри цикла: 10–16 сентября
    school(3, '2026-09-08');
    pause('2026-09-10', '2026-09-16', 'deload');
    eq(StepsFlow.pausedDays('2026-09-08', '2026-09-21'), 7, 'семь дней паузы посчитаны');
    eq(StepsFlow.cycleDay('2026-09-21'), 7, 'на 21-е пройдено только 7 дней цикла');
    eq(StepsFlow.cycleEnded('2026-09-21'), false, 'цикл ещё не закончен');
    eq(StepsFlow.cycleDay('2026-09-28'), 14, 'цикл дотягивает те же 14 рабочих дней');
  });

  describe('цикл A-03: истёкшая пауза остаётся в счёте', function () {
    school(3, '2026-09-08');
    State.s.step.deloadFrom = '2026-09-09';
    State.s.step.deloadUntil = '2026-09-15';
    State.s.step.pauses = [{ from: '2026-09-10', to: '2026-09-15', kind: 'deload' }];

    StepsFlow.check();     // прогон после конца разгрузки ничего не обнуляет
    eq(State.s.step.pauses.length, 1, 'отрезок паузы на месте');
    eq(StepsFlow.pausedDays('2026-09-08', '2026-09-21'), 6, 'дни паузы продолжают вычитаться');
    eq(StepsFlow.onDeload('2026-09-21'), false, 'при этом разгрузка уже не действует');
    State.setMode('summer');
  });

  describe('цикл A-03: перекрытие отсрочки и разгрузки считается один раз', function () {
    school(2, '2026-09-08');
    pause('2026-09-10', '2026-09-16', 'snooze');
    pause('2026-09-14', '2026-09-20', 'deload');
    eq(StepsFlow.pausedDays('2026-09-08', '2026-09-30'), 11, 'слитый отрезок 10–20 сентября');
  });

  describe('пауза A-17: отрезок начинается со следующего дня', function () {
    school(2, '2026-09-08');
    State.s.step.cycleStart = '2026-09-08';
    StepsFlow.startDeload(true);           // «сегодня» берётся из State.today()
    var seg = State.s.step.pauses[State.s.step.pauses.length - 1];
    eq(seg.from, U.addDays(State.today(), 1), 'пауза стартует завтра');
    eq(seg.to, State.s.step.deloadUntil, 'и кончается вместе с разгрузкой');
    eq(StepsFlow.inPause(State.today()), false, 'сегодняшний день прожит и в паузу не входит');
    State.setMode('summer');
  });

  describe('критерии A-07: окно — последние 14 непаузных дней', function () {
    school(2, '2026-09-08');
    pause('2026-09-14', '2026-09-20', 'deload');

    var w = StepsFlow.windowDays('2026-09-28', 14);
    eq(w.length, 14, 'в окне ровно 14 дней');
    eq(w.filter(function (d) { return d >= '2026-09-14' && d <= '2026-09-20'; }).length, 0,
      'паузные дни в окно не попали');
    eq(w[13], '2026-09-28', 'окно кончается сегодняшним днём');
    eq(w[0], '2026-09-08', 'и тянется на 14 рабочих дней назад');

    // очки в паузе статистику не разбавляют и не подтягивают
    State.s.days['2026-09-16'] = { level: 'full', addons: [], lessons: [], points: 3 };
    State.s.days['2026-09-22'] = { level: 'min', addons: [], lessons: [], points: 1 };
    var c = StepsFlow.criteria('2026-09-28');
    eq(c.daysWithPoints, 1, 'день внутри паузы в критерий не идёт');
    eq(c.from, '2026-09-08', 'начало окна названо');
    State.setMode('summer');
  });

  describe('циклы A-20: отсрочка завершённым циклом не считается', function () {
    school(2, '2026-09-08');
    State.s.step.history = [
      { date: '2026-09-21', from: 1, to: 2, reason: 'up' },
      { date: '2026-10-05', from: 2, to: 2, reason: 'decline', note: '2 нед.' },
      { date: '2026-10-20', from: 2, to: 3, reason: 'up' },
      { date: '2026-11-03', from: 3, to: 3, reason: 'top' },
      { date: '2026-11-10', from: 3, to: 2, reason: 'auto-down', note: 'streak' },
      { date: '2026-11-12', from: 2, to: 2, reason: 'deload' }
    ];
    eq(StepsFlow.completedCycles(), 3, 'считаются только up и top');
    State.setMode('summer');
  });

  describe('откат A-18: без единого дня с очками ступень не падает', function () {
    school(3, '2026-09-08');
    // дней в истории нет вообще — «серия сломалась» тут неоткуда взяться
    eq(StepsFlow.checkDemotion(), false, 'на пустой истории отката нет');
    eq(State.s.step.position, 3, 'ступень не тронута');

    // появился день с очками — механика включается
    var t = State.today();
    State.s.days[U.addDays(t, -5)] = { level: 'min', addons: [], lessons: [], points: 1 };
    eq(StepsFlow.checkDemotion(), true, 'после трёх пустых дней подряд — откат');
    eq(State.s.step.position, 2, 'ступень опустилась на одну');
    State.setMode('summer');
  });

  describe('история C-23: строки человеческие', function () {
    eq(StepsFlow.histText({ from: 3, to: 2, reason: 'auto-down', note: 'streak' }),
      'серия прервалась: S3 → S2', 'обрыв серии');
    eq(StepsFlow.histText({ from: 3, to: 2, reason: 'auto-down', note: 'score:B2.1' }),
      'два урока ниже 6: S3 → S2', 'два низких счёта');
    eq(StepsFlow.histText({ from: 2, to: 4, reason: 'manual' }), 'вручную: S2 → S4', 'ручная смена');
    eq(StepsFlow.histText({ from: 3, to: 2, reason: 'deload' }), 'разгрузка: S3 → S2', 'разгрузка');
    eq(StepsFlow.histText({ from: 7, to: 7, reason: 'top' }), 'потолок шкалы', 'потолок');
    eq(StepsFlow.histText({ from: 1, to: 2, reason: 'up' }), 'подъём: S1 → S2', 'подъём');
    eq(StepsFlow.histText({ from: 2, to: 2, reason: 'decline', note: '2 нед.' }),
      'отсрочка на 2 нед.', 'отсрочка');
    ok(StepsFlow.histText({ from: 3, to: 2, reason: 'auto-down', note: 'score:B2.1' }).indexOf('score:') < 0,
      'кода причины в тексте нет');
  });

})();
