/* 2.7.7, Э7: шаг «Карточки» минималки ставится сам.

   В 2.7.6 шаг засчитывался колодой (10 разных карточек или добитая колода),
   но галочку ставил человек. Теперь её ставит колода — в момент набора, с
   тостом «карточки засчитаны». Снять руками можно, как раньше, и следующая
   карточка снятую галочку не возвращает: ставится только переход
   «не набран → набран». */

(function () {
  'use strict';

  var MON = '2026-09-14', SUN = '2026-09-13';

  function words(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push({ en: 'card' + i, ru: 'к' + i });
    return out;
  }

  function deckOf(n) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    if (n) {
      State.applySummary('B7.1', { score: 8, level: 'L2', topics: 'т', words: words(n), debts: [], cleared: [],
        warmup: [], checklist: null, stretch: null, writing: '', raw: '' }, { date: SUN });
    }
  }

  var said = [];
  function withToasts(fn) {
    var real = UI.toast;
    said = [];
    UI.toast = function (m) { said.push(m); };
    try { fn(); } finally { UI.toast = real; }
  }

  /** Шторка колоды на кукольном корне (как в cases.review-276.js). */
  function openCards() {
    var nodes = {};
    function node(name) {
      return nodes[name] || (nodes[name] = { hidden: false, className: '', innerHTML: '', textContent: '', onclick: null });
    }
    var root = { querySelector: node, addEventListener: function () {}, contains: function () { return true; } };
    var real = UI.sheet;
    UI.sheet = function (o) { if (o.onMount) o.onMount(root, function () {}); };
    try { Cards.open(); } finally { UI.sheet = real; }
    return { next: function () { node('[data-next]').onclick(); } };
  }

  function ms() { return ((State.day(MON) || {}).minimalSteps || [false, false]).slice(); }

  describe('2.7.7 Э7: десятая карточка ставит шаг сама — одна перерисовка, тост', function () {
    withToday(MON, function () {
      withToasts(function () {
        deckOf(20);
        var emits = 0;
        var off = State.subscribe(function () { emits++; });
        try {
          var c = openCards();                    // первая карточка
          for (var i = 0; i < 8; i++) c.next();   // девятая
          eq([State.s.cards.viewedToday, ms(), emits, said.length], [9, [false, false], 0, 0], 'девять — ещё не набрано');
          c.next();
          eq([State.s.cards.viewedToday, ms(), emits], [10, [true, false], 1], 'десятая: шаг поставлен, одна перерисовка');
          eq(said, ['Карточки засчитаны'], 'тост «карточки засчитаны»');
          c.next();
          eq([emits, said.length], [1, 1], 'одиннадцатая — тихо');
        } finally { off(); }
      });
    });
  });

  describe('2.7.7 Э7: снятую руками галочку следующая карточка не возвращает', function () {
    withToday(MON, function () {
      withToasts(function () {
        deckOf(12);
        var c = openCards();
        for (var i = 0; i < 9; i++) c.next();
        eq(ms(), [true, false], 'набрано — поставлено');
        eq(App.setMinimalStep(0, false), true, 'снять можно');
        for (var j = 0; j < 5; j++) c.next();     // дальше по кругу, колода добита
        eq(State.deckDone(MON), true, 'колода добита');
        eq(ms(), [false, false], 'галочка так и снята — ни следующей карточкой, ни добитой колодой');
        eq(said.length, 1, 'второго тоста нет');
        eq(App.setMinimalStep(0, true), true, 'поставить руками снова можно — шаг набран');
      });
    });
  });

  describe('2.7.7 Э7: короткая колода, пересказ, пустая колода, новый день', function () {
    withToday(MON, function () {
      withToasts(function () {
        deckOf(4);
        State.day(MON, true).minimalSteps = [false, true];
        var c = openCards();
        c.next(); c.next();
        eq(ms(), [false, true], 'три из четырёх — нет');
        c.next();
        eq(ms(), [true, true], 'четыре из четырёх — шаг поставлен, пересказ не тронут');
        eq(State.day(MON).level, 'none', 'уровень не выше плана');
      });

      deckOf(0);
      eq(State.autoCardsStep(MON), false, 'пустая колода шаг сама не ставит — вместо неё видео');
      eq(ms(), [false, false], 'и ничего не записано');

      deckOf(12);
      State.s.cards.lastDay = MON; State.s.cards.seen = []; State.s.cards.viewedToday = 3;
      eq(State.autoCardsStep(MON), false, 'не набрано — не ставит');
      State.s.cards.viewedToday = 10;
      eq(State.autoCardsStep(MON), true, 'набрано — ставит');
      eq(State.autoCardsStep(MON), false, 'уже стоит — второй раз не ставит');
    });
    withToday('2026-09-15', function () {
      withToasts(function () {
        var c = openCards();
        for (var i = 0; i < 9; i++) c.next();
        eq(State.day('2026-09-15').minimalSteps, [true, false], 'назавтра счёт с нуля и шаг ставится снова');
        eq(said.length, 1, 'с тостом');
      });
    });
  });

  describe('2.7.7 Э7 + Э4: автоотметка, закрывшая минималку, поднимает рекорд', function () {
    withToday(MON, function () {
      withToasts(function () {
        deckOf(12);
        for (var i = 1; i <= 3; i++) {
          State.s.days[U.addDays(SUN, -i)] = { level: 'min', addons: [], lessons: [], points: 1, minimalSteps: [true, true] };
        }
        State.s.stats.bestStreak = 0;
        State.recount(SUN);
        var before = State.streak();
        State.day(MON, true).minimalSteps = [false, true];
        var c = openCards();
        for (var j = 0; j < 9; j++) c.next();
        eq(State.streak(), before + 1, 'минималка закрыта колодой — серия +1');
        eq(State.s.stats.bestStreak, State.streak(), 'рекорд = серия');
      });
    });
  });

  State.reset();
  State.syncContent();
})();
