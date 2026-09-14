/* 2.7.6, этап 5: шаг «Карточки» минималки и cards.doneDay.

   doneDay — последний день, когда очередь колоды пройдена до конца;
   minimalSteps[0] — шаг «Карточки» в плане дня. До 2.7.6 шаг был свободной
   галочкой, к колоде не привязанной: серию можно было держать, не открыв ни
   одной карточки. Теперь шаг засчитывается при ≥10 просмотренных сегодня
   или добитой колоде; до этого план пишет «карточки: n/10». */

(function () {
  'use strict';

  var MON = '2026-09-14', SUN = '2026-09-13';

  function words(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push({ en: 'w' + i, ru: 'с' + i });
    return out;
  }

  /** Колода из n слов (долгов нет), счётчик просмотров — как оставил Cards.markSeen. */
  function scene(n, seen, lastDay) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    if (n) {
      State.applySummary('B7.1', { score: 8, level: 'L2', topics: 'т', words: words(n), debts: [], cleared: [],
        warmup: [], checklist: null, stretch: null, writing: '', raw: '' }, { date: SUN });
    }
    State.s.cards.lastDay = lastDay || MON;
    State.s.cards.viewedToday = seen || 0;
    State.s.cards.seen = [];
    for (var i = 0; i < (seen || 0); i++) State.s.cards.seen.push('w:w' + i);
    return State.day(MON, true);
  }

  function quiet(fn) {
    var real = UI.toast, said = [];
    UI.toast = function (m) { said.push(m); };
    try { fn(); } finally { UI.toast = real; }
    return said;
  }

  describe('2.7.6 Э5: карточки 3 из 10 — шаг не ставится, план пишет прогресс', function () {
    withToday(MON, function () {
      var d = scene(12, 3);
      eq(State.cardsStep(MON), { ok: false, seen: 3, need: 10 }, 'колода 12, просмотрено 3 — нужно 10');
      var said = quiet(function () { eq(App.setMinimalStep(0, true), false, 'галочка «Карточки» отклонена'); });
      eq(!!(State.day(MON).minimalSteps || [])[0], false, 'шаг не записан');
      ok(/Карточки: 3\/10/.test(said[0] || ''), 'тост называет прогресс: ' + said[0]);
      ok(App.minimalSteps(d).indexOf('карточки: 3/10') > 0, 'текст шага минималки — «карточки: 3/10»');
      d.level = 'min';
      ok(App.planItems(MON, d)[0].body.indexOf('карточки: 3/10') > 0, 'и тело пункта «Карточки»');

      quiet(function () { App.tick('m0'); });
      eq(!!(State.day(MON).minimalSteps || [])[0], false, 'кружок пункта тоже не ставит');

      quiet(function () { App.tick('min'); });
      eq(State.day(MON).minimalSteps || [false, false], [false, false], 'кружок «Минималка» не ставит ни одного шага из двух');

      eq(App.setMinimalStep(1, true), true, 'пересказ ставится как раньше');
    });
  });

  describe('2.7.6 Э5: десять просмотров или добитая колода — шаг засчитан', function () {
    withToday(MON, function () {
      scene(12, 10);
      eq(State.cardsStep(MON).ok, true, '10 из 12 просмотрено');
      eq(App.setMinimalStep(0, true), true, 'галочка ставится');
      eq(State.day(MON).minimalSteps[0], true, 'шаг записан');
      ok(App.minimalSteps(State.day(MON)).indexOf('карточки:') < 0, 'прогресса после отметки нет');

      scene(12, 2);
      State.s.cards.doneDay = MON;
      eq(State.cardsStep(MON), { ok: true, seen: 2, need: 10 }, 'doneDay = сегодня — засчитано при двух просмотрах');
      eq(App.setMinimalStep(0, true), true, 'галочка ставится');

      scene(12, 2);
      State.s.cards.doneDay = SUN;
      eq(State.cardsStep(MON).ok, false, 'вчерашний doneDay сегодня не засчитывает');
    });
  });

  describe('2.7.6 Э5: короткая, пустая и вчерашняя колода', function () {
    withToday(MON, function () {
      scene(4, 3);
      eq(State.cardsStep(MON), { ok: false, seen: 3, need: 4 }, 'колода из четырёх — нужна вся');
      State.s.cards.viewedToday = 4;
      eq(State.cardsStep(MON).ok, true, 'четыре из четырёх — засчитано');

      scene(0, 0);
      eq(State.cardsStep(MON), { ok: true, seen: 0, need: 0 }, 'пустая колода шаг не держит — вместо неё видео');
      eq(App.setMinimalStep(0, true), true, 'галочка ставится');

      scene(12, 16, SUN);
      eq(State.cardsStep(MON), { ok: false, seen: 0, need: 10 }, 'вчерашние 16 просмотров сегодня — ноль');
    });
  });

  describe('2.7.6 Э5: снять можно всегда, отмеченный шаг не отбирается', function () {
    withToday(MON, function () {
      var d = scene(12, 0);
      d.minimalSteps = [true, true];
      quiet(function () { App.tick('m0'); });
      eq(State.day(MON).minimalSteps, [false, true], 'снятие не проверяет колоду');

      d = scene(12, 0);
      d.minimalSteps = [true, false];
      var said = quiet(function () { App.tick('min'); });
      eq(State.day(MON).minimalSteps, [true, true], 'уже отмеченные карточки не отбираются при «Минималке»');
      eq(said.length, 0, 'и тоста нет');
    });
  });

  State.reset();
  State.syncContent();
})();
