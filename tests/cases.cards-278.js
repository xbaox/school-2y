/* 2.7.8, Б8: шаг «Карточки» минималки — по состоянию (подпись пункта, Б3, —
   в cases.decktext-278.js).

   Б8. Шаг «Карточки» ставится по состоянию на каждой отрисовке «Сегодня», а не
   только на переходе внутри листалки (2.7.7): сегодня, план не «Пусто», колода
   шаг набрала, шаг не отмечен и сегодня не снят руками. Снятие руками — отметка
   дня day.cardsUntick; её уважают и отрисовка, и колода; поставленный руками
   шаг отметку снимает. Отметка отрисовки тихая (без второй перерисовки), тост — один. */

(function () {
  'use strict';

  var MON = '2026-09-14', SUN = '2026-09-13', TUE = '2026-09-15', THU = '2026-09-10';

  function words(n, p) {
    var out = [];
    for (var i = 0; i < n; i++) out.push({ en: (p || 'card') + i, ru: 'к' + i });
    return out;
  }

  function sum(ws, debts) {
    return { score: 8, level: 'L2', topics: 'т', words: ws || [], debts: debts || [], cleared: [],
      warmup: [], checklist: null, stretch: null, writing: '', raw: '' };
  }

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
  }

  /** Банк: nOld выученных с подошедшим сроком, nNew новых из последнего итога, nDebts долгов. */
  function bank(nOld, nNew, nDebts) {
    fresh();
    if (nOld) {
      var old = words(nOld, 'old');
      State.applySummary('B2.1', sum(old), { date: '2026-09-01' });
      old.forEach(function (w) { State.s.srs[w.en] = { status: 'known', streak: 3, step: 0, due: '2026-09-12' }; });
    }
    var codes = ['М1 — раз', 'М2 — два', 'М3 — три'];
    if (nNew || nDebts) State.applySummary('B2.2', sum(words(nNew, 'new'), codes.slice(0, nDebts)), { date: '2026-09-11' });
  }

  /** Колода из n слов, просмотрено seen, план дня plan (без плана — дня нет). */
  function scene(n, seen, plan, iso) {
    var t = iso || MON;
    fresh();
    if (n) State.applySummary('B7.1', sum(words(n)), { date: THU });
    State.s.cards.lastDay = t;
    State.s.cards.seen = [];
    for (var i = 0; i < (seen || 0); i++) State.s.cards.seen.push('w:card' + i);
    State.s.cards.viewedToday = seen || 0;
    if (plan) State.day(t, true).plan = plan;
    return State.day(t);
  }

  var said = [];
  function withToasts(fn) {
    var real = UI.toast;
    said = [];
    UI.toast = function (m) { said.push(m); };
    try { fn(); } finally { UI.toast = real; }
  }

  function ms(iso) { return ((State.day(iso || MON) || {}).minimalSteps || [false, false]).slice(); }

  function cardsItem(iso) {
    var t = iso || MON;
    return App.planItems(t, State.day(t)).filter(function (x) { return x.id === 'cards'; })[0];
  }

  /** Шторка колоды на кукольном корне (как в cases.cards-277.js). */
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

  var STAMP = '2000-01-01T00:00:00.000Z';

  /* ---------------- Б8: шаг по состоянию на отрисовке ---------------- */

  describe('2.7.8 Б8: отрисовка «Сегодня» ставит набранный шаг — тихо, с одним тостом', function () {
    withToday(MON, function () {
      withToasts(function () {
        scene(12, 10, 'min');
        State.s.meta.updatedAt = STAMP;
        var emits = 0;
        var off = State.subscribe(function () { emits++; });
        try {
          var html = App.Today.render();
          eq(ms(), [true, false], 'шаг «Карточки» поставлен');
          eq(said, ['Карточки засчитаны'], 'тост');
          eq(emits, 0, 'без второй перерисовки: render → touch → render не бывает');
          eq(State.s.meta.updatedAt, STAMP, 'updatedAt не сдвинут: отметка выводится из состояния дня');
          ok(JSON.parse(window.__store['study-system-v2']).days[MON].minimalSteps[0] === true,
            'и сохранена локально — в облако уйдёт со следующей правкой');
          eq(cardsItem().done, true, 'пункт отмечен');
          eq(html.indexOf('карточки: 10/'), -1, 'разметка уже видит отметку — прогресса нет');

          State.s.meta.updatedAt = STAMP;
          App.Today.render(); App.Today.render();
          eq([said.length, emits, State.s.meta.updatedAt], [1, 0, STAMP], 'дальше — ни тоста, ни правки');
        } finally { off(); }
      });
    });
  });

  describe('2.7.8 Б8: когда отрисовка шаг не ставит', function () {
    withToday(MON, function () {
      withToasts(function () {
        scene(12, 10);
        App.Today.render();
        eq(State.s.days[MON], undefined, 'дня нет — не ставит и день не создаёт');

        scene(12, 10, 'none');
        App.Today.render();
        eq(ms(), [false, false], 'план «Пусто» — шага карточек в плане нет');

        scene(12, 3, 'min');
        App.Today.render();
        eq(ms(), [false, false], '3 из 10 — не набрано');

        scene(0, 0, 'norm');
        App.Today.render();
        eq(ms(), [false, false], 'пустая колода — видео отмечает человек');

        scene(12, 10, 'min', SUN);
        State.day(SUN).plan = 'min';
        App.Today.render();
        eq(ms(SUN), [false, false], 'вчерашний день с набранной колодой не трогается');
        eq(said.length, 0, 'тостов нет');
      });
    });
    withToday(SUN, function () {
      withToasts(function () {
        scene(12, 10, 'none', SUN);
        App.Today.render();
        eq(ms(SUN), [false, false], 'воскресенье без плана — только радар, шага нет');
        scene(12, 10, 'min', SUN);
        App.Today.render();
        eq(ms(SUN), [true, false], 'воскресенье с минималкой — ставит, как колода 2.7.7');
      });
    });
  });

  describe('2.7.8 Б8: снятый руками шаг — отметка дня, её уважают отрисовка и колода', function () {
    withToday(MON, function () {
      withToasts(function () {
        scene(12, 10, 'min');
        App.Today.render();
        eq(ms(), [true, false], 'поставлен отрисовкой');

        var emits = 0;
        var off = State.subscribe(function () { emits++; });
        try {
          eq(App.setMinimalStep(0, false), true, 'снять можно');
          eq([State.day(MON).cardsUntick, emits], [true, 1], 'отметка дня — в той же правке, одна перерисовка');
        } finally { off(); }
        App.Today.render(); App.Today.render(); App.Today.render();
        eq(ms(), [false, false], 'отрисовка шаг не возвращает');
        var c = openCards();
        for (var i = 0; i < 12; i++) c.next();
        eq(State.deckDone(MON), true, 'колода добита');
        eq(ms(), [false, false], 'и добитая колода не возвращает');
        eq(said.length, 1, 'второго тоста нет');

        eq(App.setMinimalStep(0, true), true, 'поставить руками можно');
        eq('cardsUntick' in State.day(MON), false, 'поставленный руками шаг отметку снимает');
        App.setMinimalStep(0, false);
        eq(State.day(MON).cardsUntick, true, 'снова снят — отметка снова');
      });
    });
  });

  describe('2.7.8 Б8: снятый до набора шаг колода на переходе не ставит (2.7.7 ставила)', function () {
    withToday(MON, function () {
      withToasts(function () {
        scene(12, 0, 'min');
        State.day(MON).minimalSteps = [true, false];      // отмечен видео, пока колода была пустой
        App.setMinimalStep(0, false);
        eq(State.cardsStep(MON).ok, false, 'колода не набрана');
        ok(cardsItem().body.indexOf('шаг снят руками: отметь его') > 0, 'подсказка не обещает «засчитается сам»');
        var c = openCards();
        for (var i = 0; i < 9; i++) c.next();
        eq([State.cardsStep(MON).ok, ms()], [true, [false, false]], 'десятая карточка — переход есть, отметки нет');
        App.Today.render();
        eq([ms(), said.length], [[false, false], 0], 'и отрисовка не ставит, тостов нет');
        eq(cardsItem().body.indexOf('засчитается сам'), -1, 'прогресса и обещания нет');
      });
    });
  });

  describe('2.7.8 Б8: кружок «Минималка» — та же отметка', function () {
    withToday(MON, function () {
      withToasts(function () {
        scene(12, 10, 'norm');
        App.Today.render();
        App.tick('m1');
        eq(ms(), [true, true], 'оба шага');
        App.tick('min');
        eq([ms(), State.day(MON).cardsUntick], [[false, false], true], 'кружок снял оба — отметка дня');
        App.Today.render();
        eq(ms(), [false, false], 'отрисовка не ставит');
        App.tick('min');
        eq([ms(), 'cardsUntick' in State.day(MON)], [[true, true], false], 'кружок поставил оба — отметки нет');
      });
    });
  });

  describe('2.7.8 Б8: отметка живёт один день', function () {
    withToasts(function () {
      withToday(MON, function () {
        scene(12, 10, 'min');
        App.setMinimalStep(0, true);
        App.setMinimalStep(0, false);
        eq(State.day(MON).cardsUntick, true, 'понедельник снят руками');
      });
      withToday(TUE, function () {
        State.s.cards.lastDay = TUE;
        State.s.cards.viewedToday = 10;
        State.day(TUE, true).plan = 'min';
        App.Today.render();
        eq(ms(TUE), [true, false], 'во вторник набранный шаг ставится снова');
        eq(ms(MON), [false, false], 'понедельник не тронут');
      });
    });
  });

  describe('2.7.8 Б8: без перехода в колоде — синк и укоротившаяся колода', function () {
    withToday(MON, function () {
      withToasts(function () {
        // другое устройство: карточки просмотрены там, пересказ отмечен, план — норма
        scene(12, 10, 'norm');
        var other = JSON.parse(JSON.stringify(State.s));
        other.days[MON].minimalSteps = [false, true];
        fresh();
        State.replace(other, true);
        App.Today.render();
        eq(ms(), [true, true], 'пришло синком — отрисовка ставит');
        eq([State.day(MON).level, State.points(MON)], ['min', 1], 'уровень — достигнутый (минималка), не план');
        eq(said.length, 1, 'один тост');

        // 9 из 12 просмотрено, три непоказанных слова ушли на интервал — колода 9, шаг набран
        scene(12, 9, 'min');
        eq(State.cardsStep(MON).ok, false, 'девять из десяти');
        ['card9', 'card10', 'card11'].forEach(function (en) {
          State.s.srs[en] = { status: 'known', streak: 3, step: 0, due: '2026-09-18' };
        });
        eq(State.cardsStep(MON), { ok: true, seen: 9, need: 9 }, 'колода укоротилась — набрано без карточки');
        App.Today.render();
        eq(ms(), [true, false], 'отрисовка ставит');
      });
    });
  });

  describe('2.7.8 Б8: колода и отрисовка вместе — одна отметка, один тост', function () {
    withToday(MON, function () {
      withToasts(function () {
        scene(20, 0, 'min');
        var c = openCards();
        for (var i = 0; i < 9; i++) c.next();
        eq([ms(), said.length], [[true, false], 1], 'десятая карточка — отметка колодой');
        App.Today.render();
        eq(said.length, 1, 'отрисовка второго тоста не даёт');
      });
      eq(State.autoCardsStep(MON), false, 'State.autoCardsStep: уже стоит — нет');
      scene(12, 10, 'min');
      State.day(MON).cardsUntick = true;
      eq([State.autoCardsStep(MON), ms()], [false, [false, false]], 'State.autoCardsStep: снят руками — нет');
      delete State.day(MON).cardsUntick;
      var emits = 0;
      var off = State.subscribe(function () { emits++; });
      try {
        var at = State.s.meta.updatedAt = STAMP;
        eq([State.autoCardsStep(MON, { derived: true }), emits, State.s.meta.updatedAt], [true, 0, at],
          'derived — без перерисовки и без сдвига updatedAt');
        App.setMinimalStep(0, true);
        State.day(MON).minimalSteps = [false, false];
        emits = 0;
        State.s.meta.updatedAt = STAMP;
        eq([State.autoCardsStep(MON), emits], [true, 1], 'колода — одна перерисовка, как в 2.7.7');
        ok(State.s.meta.updatedAt !== STAMP, 'и сдвиг updatedAt: это действие человека');
      } finally { off(); }
    });
  });

  State.reset();
  State.syncContent();
})();
