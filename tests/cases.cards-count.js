/* v2.6.4: «сегодня» в карточках — уникальные карточки за день. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function bank() {
    fresh();
    State.applySummary('B2.1', {
      score: 7, level: 'L2', topics: 'т',
      words: [{ en: 'slope', ru: 'наклон' }, { en: 'vertex', ru: 'вершина' }],
      debts: ['путает знак наклона'], cleared: [], warmup: [], writing: '', raw: ''
    }, { date: '2026-08-25' });
    State.s.cards = { lastDay: State.today(), viewedToday: 0, seen: [] };
  }

  describe('2.6.4: у каждой карточки колоды есть стабильный ключ', function () {
    bank();
    var deck = Cards.deck();
    eq(deck.length, 3, 'два слова и один долг');
    deck.forEach(function (c) { ok(c.key, 'у карточки «' + c.front + '» есть ключ'); });

    var keys = deck.map(function (c) { return c.key; });
    eq(keys.filter(function (k, i) { return keys.indexOf(k) !== i; }), [], 'ключи не повторяются');
    ok(keys.indexOf('w:slope') >= 0, 'слово — по нормализованному написанию');
    ok(keys.filter(function (k) { return k.indexOf('d:') === 0; }).length === 1, 'долг — по своему id');

    // ключ слова не зависит от регистра: та же карточка после правки итога
    eq(deck.filter(function (c) { return c.en === 'slope'; })[0].key, 'w:slope', 'нижний регистр');
  });

  describe('2.6.4: повторный показ той же карточки не считается', function () {
    bank();
    eq(Cards.count(), 0, 'день начинается с нуля');

    Cards.markSeen('w:slope');
    eq(Cards.count(), 1, 'первая карточка');
    Cards.markSeen('w:slope');
    Cards.markSeen('w:slope');
    eq(Cards.count(), 1, 'та же карточка ещё дважды — по-прежнему 1');

    Cards.markSeen('w:vertex');
    eq(Cards.count(), 2, 'вторая карточка');
    Cards.markSeen('d:D-1');
    eq(Cards.count(), 3, 'долг считается наравне со словом');

    // кольцевая колода: второй круг ничего не добавляет
    ['w:slope', 'w:vertex', 'd:D-1'].forEach(Cards.markSeen);
    eq(Cards.count(), 3, 'второй круг по колоде счётчик не двигает');
    eq(State.s.cards.viewedToday, State.s.cards.seen.length, 'число и набор не расходятся');

    // счётчик не может обогнать колоду — ровно этого не хватало «сегодня 151»
    ok(Cards.count() <= Cards.deck().length, 'сегодня ≤ размера колоды');

    Cards.markSeen('');
    Cards.markSeen(null);
    eq(Cards.count(), 3, 'пустой ключ ничего не портит');
  });

  describe('2.6.4: обнуление на границе суток', function () {
    bank();
    ['w:slope', 'w:vertex', 'd:D-1'].forEach(Cards.markSeen);
    eq(Cards.count(), 3, 'за день посмотрели три');

    var real = U.today;
    U.today = function () { return U.addDays(real(), 1); };
    eq(Cards.count(), 0, 'на новый день счётчик показывает ноль');
    Cards.markSeen('w:slope');
    eq(Cards.count(), 1, 'и считает заново — вчерашние карточки не в счёт');
    eq(State.s.cards.seen, ['w:slope'], 'старый набор очищен');
    U.today = real;

    // граница суток — 04:00, её держит U.today
    eq(U.today(new Date(2026, 7, 28, 3, 30)), '2026-08-27', 'в 03:30 логическое сегодня — вчерашнее');
    eq(U.today(new Date(2026, 7, 28, 4, 30)), '2026-08-28', 'после 04:00 — новое');
  });

  describe('2.6.4: старое состояние переезжает на новый счёт', function () {
    // до 2.6.4 считались нажатия: набора нет, число несопоставимо
    var out = State.migrate({
      settings: {}, days: {},
      cards: { lastDay: '2026-08-27', viewedToday: 151 }
    });
    eq(out.cards.seen, [], 'набор заведён пустым');
    eq(out.cards.viewedToday, 0, 'счёт начинается заново');
    eq(out.cards.lastDay, '2026-08-27', 'дата дня сохранена');

    // а уже переехавшее состояние не сбрасывается
    var kept = State.migrate({
      settings: {}, days: {},
      cards: { lastDay: '2026-08-27', viewedToday: 2, seen: ['w:slope', 'd:D-1'] }
    });
    eq([kept.cards.viewedToday, kept.cards.seen.length], [2, 2], 'уже посчитанное остаётся');
  });

  describe('2.6.4: строка читается без арифметики', function () {
    bank();
    Cards.markSeen('w:slope');
    var html = App.screen('journal').render();
    var line = html.slice(html.indexOf('В колоде'), html.indexOf('В колоде') + 140);
    ok(line.indexOf('В колоде 3 карточки') === 0, 'размер колоды');
    ok(line.indexOf('слова: активных 2, выучено 0') > 0, 'слова со своими числами');
    ok(line.indexOf('долги: 1') > 0, 'долги отдельно — они в колоде, но не в «активных»');
    ok(line.indexOf('сегодня 1') > 0, 'и уникальные карточки за день');
    // 2 слова + 1 долг = 3 карточки: числа сходятся без пояснений
    eq(State.wordCounts().active + State.openDebts().length, Cards.deck().length,
      'слова плюс долги дают размер колоды');
  });
})();
