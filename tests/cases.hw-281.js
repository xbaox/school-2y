/* 2.8.1, B2: ИТОГ ДЗ-урока прошлого дня (вопрос 25 отчёта 2.8.0).
   Запись, слова и долги ложатся в день самого ДЗ; уровень, очки и серия того
   дня не меняются — задним числом день без урока не становится днём с уроком. */

(function () {
  'use strict';

  var MON = '2026-09-14', TUE = '2026-09-15', WED = '2026-09-16';
  var HW = 'HW-' + MON + '-math';

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage('S1');
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'деление многочленов',
      words: [{ en: 'quotient', ru: 'частное' }, { en: 'divisor', ru: 'делитель' }],
      debts: ['М2 — знак остатка при делении'], cleared: [], warmup: [], checklist: null, stretch: null,
      writing: '', raw: ''
    }, over || {});
  }

  function dayView(iso) {
    var d = State.day(iso) || {};
    return { level: d.level || 'none', points: d.points || 0, lessons: (d.lessons || []).slice() };
  }

  describe('2.8.1 B2: ИТОГ ДЗ прошлого дня — запись в свой день, уровень и серия того дня прежние', function () {
    fresh();
    withToday(MON, function () {
      State.startHw('MHF4U', MON);
      State.day(MON, true).plan = 'norm';
    });
    // вторник — урок программы, серия держится; понедельник — без урока
    State.day(TUE, true).minimalSteps = [true, true];
    State.recount(TUE);
    var before = dayView(MON);
    var best = State.s.stats.bestStreak;
    var streak = withToday(WED, function () { return State.streak(); });

    var r = withToday(WED, function () { return State.applySummary(HW, summary(), { date: WED }); });
    ok(r.ok, 'ИТОГ принят');

    eq(dayView(MON), before, 'уровень, очки и уроки понедельника не изменились');
    eq(State.s.stats.bestStreak, best, 'рекорд серии тот же');
    eq(withToday(WED, function () { return State.streak(); }), streak, 'серия та же');
    eq(dayView(WED).lessons, [], 'день шторки не тронут');

    var rec = State.s.summaries.filter(function (x) { return x.lessonId === HW; });
    eq(rec.map(function (x) { return x.date; }), [MON], 'запись — понедельником');
    eq([State.s.hw[HW].date, State.s.hw[HW].score, State.s.hw[HW].course], [MON, 8, 'MHF4U'], 'ДЗ-урок закрыт своим днём');
    ok(!!State.s.srs.quotient && !!State.s.srs.divisor, 'слова урока — в колоде');
    var debt = State.s.debts.filter(function (d) { return d.createdIn === HW; })[0] || {};
    eq([debt.cat, (debt.examples || [])[0] && debt.examples[0].date], ['М2', MON], 'долг заведён, пример датирован понедельником');
  });

  describe('2.8.1 B2: сегодняшний ДЗ-урок — норму дня закрывает, как было', function () {
    fresh();
    withToday(MON, function () {
      State.startHw('MHF4U', MON);
      State.day(MON, true).plan = 'norm';
      State.applySummary(HW, summary(), { date: MON });
    });
    ok(dayView(MON).lessons.indexOf(HW) >= 0, 'урок лёг в день');
    ok(dayView(MON).points > 0, 'и дал очки');
  });
})();
