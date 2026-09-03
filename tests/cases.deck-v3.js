/* 2.7.0 «Корень», этап 6: колода дня.

   Минималка не растёт не потому, что банк слов сокращается — он не
   сокращается, — а потому, что у колоды дня есть кэп и порядок групп. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], checklist: null, writing: '', raw: ''
    }, over || {});
  }

  function words(n, prefix) {
    var out = [];
    for (var i = 1; i <= n; i++) out.push({ en: (prefix || 'w') + i, ru: 'перевод ' + i });
    return out;
  }

  var T = '2026-09-14';

  describe('2.7.0 колода: кэп держит день коротким', function () {
    fresh();
    // тридцать слов и семь долгов — банк заведомо больше колоды
    State.applySummary('B2.1', summary({ words: words(12, 'a') }), { date: '2026-09-10' });
    State.applySummary('B2.2', summary({ words: words(12, 'b') }), { date: '2026-09-11' });
    State.applySummary('B2.3', summary({
      words: words(6, 'c'),
      debts: ['М1 — раз', 'М2 — два', 'М3 — три']
    }), { date: '2026-09-12' });

    var plan = State.deckPlan(T);
    eq(State.wordCounts().total, 30, 'в банке тридцать слов');
    eq(plan.debts.length, 3, 'долгов ровно три');
    eq(plan.words.length + plan.debts.length, State.DECK_CAP, 'а в колоде дня — кэп');
    eq(Cards.deck(T).length, State.DECK_CAP, 'столько же карточек и на экране');
  });

  describe('2.7.0 колода: банк меньше кэпа — берём всё', function () {
    fresh();
    State.applySummary('B2.1', summary({
      words: words(4, 'w'), debts: ['М1 — раз']
    }), { date: '2026-09-12' });
    var plan = State.deckPlan(T);
    eq(plan.words.length, 4, 'все слова');
    eq(plan.debts.length, 1, 'и единственный долг');
  });

  describe('2.7.0 колода: порядок групп', function () {
    fresh();
    State.applySummary('B2.1', summary({ words: words(3, 'old') }), { date: '2026-09-01' });
    State.applySummary('B2.2', summary({ words: words(2, 'last') }), { date: '2026-09-12' });

    // old1 выучено и срок повтора подошёл; old2 в работе с ошибкой
    State.gradeWord('old1', true); State.gradeWord('old1', true); State.gradeWord('old1', true);
    State.s.srs['old1'].due = '2026-09-13';       // срок наступил
    State.gradeWord('old2', true);                 // learning, streak 1
    State.gradeWord('old3', true);
    State.gradeWord('old3', false);                // learning, streak 0 — «не знал»

    var plan = State.deckPlan(T);
    var order = plan.words.map(function (w) { return w.en; });
    eq(order[0], 'old1', 'первым — подошедший повтор');
    ok(order.indexOf('old3') < order.indexOf('old2'),
      'в работе: последний «не знал» впереди');
    ok(order.indexOf('last1') > order.indexOf('old2'), 'слова последнего урока — после работы');
  });

  describe('2.7.0 колода: долги ротацией по дню, только открытые', function () {
    fresh();
    State.applySummary('B2.1', summary({
      debts: ['М1 — раз', 'М2 — два', 'М3 — три']
    }), { date: '2026-09-10' });
    State.applySummary('B2.2', summary({
      debts: ['М4 — четыре', 'М5 — пять', 'М6 — шесть']
    }), { date: '2026-09-11' });
    eq(State.openDebts().length, 6, 'шесть открытых долгов');

    // закрытый и поглощённый в колоду не идут
    State.s.debts[0].status = 'closed';
    State.s.debts[1].status = 'merged';
    var open = State.openDebts().map(function (d) { return d.did; });
    var plan = State.deckPlan(T);
    eq(plan.debts.length, 3, 'в колоде три долга');
    ok(plan.debts.every(function (d) { return open.indexOf(d.did) >= 0; }),
      'и все они открытые');

    // ротация: другой день — другая тройка
    var a = State.deckPlan('2026-09-14').debts.map(function (d) { return d.did; });
    var b = State.deckPlan('2026-09-15').debts.map(function (d) { return d.did; });
    ok(a.join() !== b.join(), 'назавтра тройка другая');
  });

  describe('2.7.0 колода: в пределах дня состав стабилен', function () {
    fresh();
    State.applySummary('B2.1', summary({ words: words(10, 'w') }), { date: '2026-09-12' });
    var a = State.deckPlan(T).words.map(function (w) { return w.en; });
    var b = State.deckPlan(T).words.map(function (w) { return w.en; });
    eq(a, b, 'дважды за день — одна и та же колода');
    var c = State.deckPlan('2026-09-15').words.map(function (w) { return w.en; });
    ok(a.join() !== c.join(), 'а назавтра порядок другой');
  });

  describe('2.7.0 колода: курсор и признак пройденной очереди', function () {
    fresh();
    State.applySummary('B2.1', summary({ words: words(5, 'w') }), { date: '2026-09-12' });
    eq(State.deckCursor(T), 0, 'новый день — с начала');
    eq(State.deckDone(T), false, 'и очередь не пройдена');

    State.setDeckCursor(3, { date: T });
    eq(State.deckCursor(T), 3, 'позиция запомнена');
    eq(State.deckDone(T), false, 'но очередь ещё идёт');

    State.setDeckCursor(0, { done: true, date: T });
    eq(State.deckDone(T), true, 'очередь пройдена');

    // назавтра всё сначала
    eq(State.deckCursor('2026-09-15'), 0, 'курсор нового дня — ноль');
    eq(State.deckDone('2026-09-15'), false, 'и очередь снова открыта');
  });

  describe('2.7.0 колода: обещания «сокращается» больше нет', function () {
    fresh();
    State.applySummary('B2.1', summary({ words: words(3, 'w') }), { date: '2026-09-12' });
    var d = State.day(State.today(), true);
    d.level = 'min';
    var plan = App.planItems(State.today(), d);
    var cards = plan.filter(function (x) { return x.id === 'cards'; })[0];
    ok(cards, 'пункт карточек в плане есть');
    eq(cards.body.indexOf('а сокращается'), -1, 'обещания сокращения нет');
    ok(cards.body.indexOf('не больше ' + State.DECK_CAP + ' карточек') > 0, 'вместо него — кэп');
  });

  describe('2.7.0 колода: на карточке долга виден код категории', function () {
    fresh();
    State.applySummary('B2.1', summary({ debts: ['М2 — ходы не записаны'] }), { date: '2026-09-12' });
    var card = Cards.deck(T).filter(function (c) { return c.type === 'debt'; })[0];
    ok(card, 'карточка долга есть');
    ok(card.front.indexOf('D-1 · М2 · ') === 0, 'id, код категории и текст');
  });

  State.reset();
  State.syncContent();
})();
