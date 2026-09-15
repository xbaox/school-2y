/* 2.7.6, этап 4: все слова ИТОГа — в колоду, счётчик = размер колоды.

   До 2.7.6 запись SRS появлялась только при оценке карточки. С 2.7.0 колода
   дня режется до 20 карточек, новые слова стоят в ней последними — и 17 слов
   из итогов так и не завелись, а stats.wordsTotal считал банк итогов (140)
   мимо колоды (123). Теперь слово заводится при разборе ИТОГа, а нагрузку
   ограничивает колода дня. */

(function () {
  'use strict';

  var MON = '2026-09-14';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(words) {
    return { score: 8, level: 'L2', topics: 'т', words: words, debts: [], cleared: [], warmup: [],
      checklist: null, stretch: null, writing: '', raw: '' };
  }

  var FIVE = [
    { en: 'Slope', ru: 'наклон' }, { en: ' vertex ', ru: 'вершина' }, { en: 'domain', ru: 'область определения' },
    { en: 'range', ru: 'область значений' }, { en: 'root', ru: 'корень' }
  ];

  describe('2.7.6 Э4: ИТОГ с пятью словами, одно уже в колоде → +4 ключа', function () {
    fresh();
    State.gradeWord('slope', true, MON);
    var known = JSON.stringify(State.s.srs.slope);
    eq(Object.keys(State.s.srs), ['slope'], 'в колоде одно слово');

    var r = State.applySummary('B7.1', summary(FIVE), { date: MON });
    eq(Object.keys(State.s.srs).sort(), ['domain', 'range', 'root', 'slope', 'vertex'], '+4 ключа, нормализованных');
    eq(r.wordsAdded, 4, 'итог сообщает, сколько слов добавлено');
    eq(State.s.stats.wordsTotal, Object.keys(State.s.srs).length, 'wordsTotal = размер SRS');
    eq(State.s.stats.wordsTotal, 5, 'и это пять');
    eq(JSON.stringify(State.s.srs.slope), known, 'запись уже знакомого слова не тронута');
    eq(State.s.srs.vertex, { status: 'new', streak: 0, step: 0, due: null }, 'новое слово — запись формы «новое»');
    eq(State.wordStatus('vertex'), 'new', 'для колоды и разминки оно по-прежнему новое');

    var again = State.applySummary('B7.1', summary(FIVE), { date: MON });
    eq([again.wordsAdded, Object.keys(State.s.srs).length, State.s.stats.wordsTotal], [0, 5, 5],
      'повторная вставка того же итога ключей не плодит');

    State.applySummary('B7.2', summary([{ en: 'ROOT', ru: 'корень' }, { en: 'factor', ru: 'множитель' }]),
      { date: '2026-09-15' });
    eq([Object.keys(State.s.srs).length, State.s.stats.wordsTotal], [6, 6], 'слово другого урока — по тому же ключу');
  });

  describe('2.7.6 Э4: слово попадает в колоду, даже если колода дня его не покажет', function () {
    fresh();
    // 22 выученных слова с подошедшим сроком занимают все места колоды дня
    var bank = [];
    for (var i = 0; i < 22; i++) bank.push({ en: 'due' + i, ru: 'п' + i });
    State.applySummary('B7.1', summary(bank), { date: '2026-09-01' });
    bank.forEach(function (w) { State.s.srs[w.en] = { status: 'known', streak: 3, step: 0, due: '2026-09-10' }; });
    // 2.7.7 (Э3): под слова последнего урока резерв — пять мест; шестое слово ждёт
    var six = ['secant', 'cosecant', 'tangent', 'cotangent', 'sine', 'cosine'];
    State.applySummary('B7.2', summary(six.map(function (en) { return { en: en, ru: 'т' }; })), { date: MON });

    var plan = State.deckPlan(MON);
    var deck = plan.words.map(function (w) { return w.en; });
    eq(plan.words.length, State.DECK_CAP, 'кэп на месте');
    eq(deck.indexOf('cosine'), -1, 'в колоду дня шестое слово не влезло');
    ok(Object.prototype.hasOwnProperty.call(State.s.srs, 'cosine'), 'но в SRS оно есть');
    eq(State.s.stats.wordsTotal, 28, 'и в счётчике тоже');
  });

  describe('2.7.6 Э4: Журнал считает слова по колоде', function () {
    fresh();
    State.applySummary('B7.1', summary(FIVE), { date: MON });
    State.s.srs.extra = { status: 'known', streak: 3, step: 0, due: null };
    var html = App.screen('journal').render();
    ok(html.indexOf('<b class="mono">6</b><span>слов</span>') >= 0, 'шесть ключей SRS — «6 слов»');
    eq(State.wordsTotal(), 6, 'State.wordsTotal() — число ключей SRS');
  });

  State.reset();
  State.syncContent();
})();
