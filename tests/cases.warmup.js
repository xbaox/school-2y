/* 2.6.5, этап 1: разминка по сроку повтора.
   До 2.6.5 minimalPrompt звал oldestWords(15) и гнал в промпт одни и те же
   пятнадцать самых старых слов — все выученные, со сроком в будущем. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], writing: '', raw: ''
    }, over || {});
  }

  /** Банк: три старых слова из B2.1 и три свежих из B2.2. */
  function bank() {
    fresh();
    State.applySummary('B2.1', summary({
      words: [
        { en: 'slope', ru: 'наклон' },
        { en: 'domain', ru: 'область определения' },
        { en: 'vertex', ru: 'вершина' }
      ]
    }), { date: '2026-08-20' });
    State.applySummary('B2.2', summary({
      words: [
        { en: 'radius', ru: 'радиус' },
        { en: 'factor', ru: 'множитель' },
        { en: 'root', ru: 'корень' }
      ]
    }), { date: '2026-08-25' });
  }

  function names(list) { return list.map(function (w) { return w.en; }); }

  describe('2.6.5: выученное с ненаступившим сроком в разминку не идёт', function () {
    bank();
    eq(names(State.warmupWords(15, '2026-08-26')),
      ['slope', 'domain', 'vertex', 'radius', 'factor', 'root'],
      'пока никто не выучен — весь банк по старшинству');

    // slope выучен 26.08 → срок 30.08
    for (var i = 0; i < 3; i++) State.gradeWord('slope', true, '2026-08-26');
    eq(State.wordStatus('slope'), 'known', 'slope выучен');
    eq(names(State.warmupWords(15, '2026-08-26')).indexOf('slope'), -1,
      'в день выучивания срок ещё не подошёл — слова в разминке нет');
    eq(names(State.warmupWords(15, '2026-08-29')).indexOf('slope'), -1,
      'за день до срока — всё ещё нет');
    ok(names(State.warmupWords(15, '2026-08-30')).indexOf('slope') >= 0,
      'в день срока — вернулось');
  });

  describe('2.6.5: порядок групп — подошедшие, потом в работе, потом новые', function () {
    bank();
    // domain и vertex доводим до «выучено» в разные дни: сроки разойдутся
    var i;
    for (i = 0; i < 3; i++) State.gradeWord('vertex', true, '2026-08-26');   // срок 30.08
    for (i = 0; i < 3; i++) State.gradeWord('domain', true, '2026-08-27');   // срок 31.08
    // slope в работе с последним «не знал», radius — в работе с двумя верными
    State.gradeWord('radius', true, '2026-08-27');
    State.gradeWord('radius', true, '2026-08-27');
    State.gradeWord('slope', true, '2026-08-27');
    State.gradeWord('slope', false, '2026-08-27');

    eq(names(State.warmupWords(15, '2026-09-01')),
      ['vertex', 'domain', 'slope', 'radius', 'factor', 'root'],
      'сначала подошедшие по давности срока, потом «не знал», потом остальные');
  });

  describe('2.6.5: «не знал» вперёд внутри группы «в работе»', function () {
    bank();
    State.gradeWord('slope', true, '2026-08-26');
    State.gradeWord('slope', true, '2026-08-26');     // streak 2
    State.gradeWord('domain', true, '2026-08-26');    // streak 1
    State.gradeWord('vertex', true, '2026-08-26');
    State.gradeWord('vertex', false, '2026-08-26');   // streak 0 — последний ответ «не знал»

    var got = names(State.warmupWords(15, '2026-08-26'));
    eq(got.slice(0, 3), ['vertex', 'domain', 'slope'],
      'streak 0 → 1 → 2: последний «не знал» первым');
  });

  describe('2.6.5: потолок 15 слов', function () {
    fresh();
    var many = [];
    for (var i = 0; i < 25; i++) many.push({ en: 'w' + i, ru: 'п' + i });
    State.applySummary('B2.1', summary({ words: many }), { date: '2026-08-20' });
    eq(State.warmupWords(15, '2026-08-26').length, 15, 'ровно 15');
    eq(State.warmupWords(5, '2026-08-26').length, 5, 'параметр уважается');
  });

  describe('2.6.5: промпт разминки не пуст, когда повторять нечего', function () {
    bank();
    // выучиваем весь банк — активных слов не остаётся
    ['slope', 'domain', 'vertex', 'radius', 'factor', 'root'].forEach(function (w) {
      for (var i = 0; i < 3; i++) State.gradeWord(w, true, '2026-08-26');
    });
    eq(State.warmupWords(15, '2026-08-26').length, 0, 'сегодня повторять нечего');

    var text = PROMPTS.minimal({ today: '2026-08-26' });
    ok(text.indexOf('Разминка ~10 минут') === 0, 'шапка на месте');
    ok(text.indexOf('60-секундный пересказ') > 0, 'пересказ печатается всегда — промпт не пуст');
    eq(text.indexOf('slope — наклон'), -1, 'выученных слов в промпте нет');
  });

  describe('2.6.5: промпт разминки берёт слова по сроку, а не по возрасту', function () {
    bank();
    // старые слова B2.1 выучены и отдыхают, свежие из B2.2 — в работе
    ['slope', 'domain', 'vertex'].forEach(function (w) {
      for (var i = 0; i < 3; i++) State.gradeWord(w, true, '2026-08-26');
    });
    var text = PROMPTS.minimal({ today: '2026-08-26' });
    eq(text.indexOf('slope — наклон'), -1, 'старое выученное в промпт не уехало');
    ok(text.indexOf('radius — радиус') > 0, 'а активное — уехало');
  });
})();
