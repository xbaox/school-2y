/* Карточки SRS-lite (релиз 2.6.0): статусы слова, интервалы,
   «Слова урока», счётчик колоды и фильтр промпта. */

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

  var T = '2026-08-26';

  function bank() {
    fresh();
    State.applySummary('B2.1', summary({
      words: [
        { en: 'slope', ru: 'наклон' },
        { en: 'substitute', ru: 'подставить' },
        { en: 'vertex', ru: 'вершина' }
      ]
    }), { date: '2026-08-25' });
  }

  describe('SRS: new → learning → known за три верных подряд', function () {
    bank();
    eq(State.wordStatus('slope'), 'new', 'слово начинает новым');

    State.gradeWord('slope', true, T);
    eq(State.wordStatus('slope'), 'learning', 'первый верный — в работе');
    State.gradeWord('slope', true, T);
    eq(State.wordStatus('slope'), 'learning', 'второй верный — ещё в работе');
    State.gradeWord('slope', true, T);
    eq(State.wordStatus('slope'), 'known', 'третий верный подряд — выучено');
    eq(State.SRS_TO_KNOWN, 3, 'порог зафиксирован');

    // серия рвётся ошибкой
    bank();
    State.gradeWord('vertex', true, T);
    State.gradeWord('vertex', true, T);
    State.gradeWord('vertex', false, T);
    eq(State.wordStatus('vertex'), 'learning', 'ошибка сбрасывает серию');
    State.gradeWord('vertex', true, T);
    State.gradeWord('vertex', true, T);
    eq(State.wordStatus('vertex'), 'learning', 'считаем заново, двух мало');
    State.gradeWord('vertex', true, T);
    eq(State.wordStatus('vertex'), 'known', 'три подряд после сброса — выучено');
  });

  describe('SRS: интервалы 4 → 10 → 21, затем сон', function () {
    bank();
    eq(State.SRS_INTERVALS, [4, 10, 21], 'интервалы по ТЗ');

    var r;
    State.gradeWord('slope', true, T);
    State.gradeWord('slope', true, T);
    r = State.gradeWord('slope', true, T);
    eq(r.due, '2026-08-30', 'выучено → повтор через 4 дня');
    eq(State.wordResting('slope', T), true, 'до срока слово отдыхает');
    eq(State.wordResting('slope', '2026-08-30'), false, 'в день повтора возвращается');

    r = State.gradeWord('slope', true, '2026-08-30');
    eq(r.due, '2026-09-09', 'верно на повторе → через 10 дней');
    r = State.gradeWord('slope', true, '2026-09-09');
    eq(r.due, '2026-09-30', 'дальше через 21 день');
    r = State.gradeWord('slope', true, '2026-09-30');
    eq(r.due, null, 'все интервалы пройдены — слово спит');
    eq(State.wordStatus('slope'), 'known', 'и остаётся выученным');
    eq(State.wordResting('slope', '2027-01-01'), true, 'спящее слово не всплывает никогда');
  });

  describe('SRS: ошибка на выученном возвращает в learning', function () {
    bank();
    State.gradeWord('slope', true, T);
    State.gradeWord('slope', true, T);
    State.gradeWord('slope', true, T);
    eq(State.wordStatus('slope'), 'known', 'выучено');

    var r = State.gradeWord('slope', false, '2026-08-30');
    eq(r.status, 'learning', 'ошибка вернула в работу');
    eq(r.streak, 0, 'серия обнулена');
    eq(r.due, null, 'интервал снят');
    eq(State.wordResting('slope', '2026-08-30'), false, 'слово снова в колоде');

    // и путь наверх надо пройти заново целиком
    State.gradeWord('slope', true, '2026-08-30');
    State.gradeWord('slope', true, '2026-08-30');
    eq(State.wordStatus('slope'), 'learning', 'двух верных мало');
    State.gradeWord('slope', true, '2026-08-30');
    eq(State.wordStatus('slope'), 'known', 'три — снова выучено');
  });

  describe('SRS: счётчик «активных X · выучено Y»', function () {
    bank();
    eq(State.wordCounts(T), { active: 3, known: 0, total: 3 }, 'вначале все три активны');

    ['slope', 'substitute', 'vertex'].forEach(function (w) {
      State.gradeWord(w, true, T);
    });
    eq(State.wordCounts(T).known, 0, 'один верный ещё ничего не решает');

    for (var i = 0; i < 2; i++) State.gradeWord('slope', true, T);
    eq(State.wordCounts(T), { active: 2, known: 1, total: 3 }, 'выученное ушло из активных');

    // в день повтора выученное слово снова активно, но выученным быть не перестаёт
    eq(State.wordCounts('2026-08-30'), { active: 3, known: 1, total: 3 }, 'в день повтора вернулось');
  });

  describe('SRS: колода не берёт отдыхающие слова', function () {
    bank();
    eq(Cards.deck().length, 3, 'три слова в колоде');
    for (var i = 0; i < 3; i++) State.gradeWord('slope', true, State.today());
    eq(Cards.deck().length, 2, 'выученное из колоды ушло');
    eq(Cards.deck().filter(function (c) { return c.en === 'slope'; }).length, 0, 'именно slope');

    // долги в колоде остаются и оценок не имеют
    State.applySummary('B2.2', summary({ debts: ['путает знак наклона'] }), { date: '2026-08-26' });
    var debts = Cards.deck().filter(function (c) { return c.type === 'debt'; });
    eq(debts.length, 1, 'долг в колоде');
    eq(debts[0].en, undefined, 'у долга нет слова для оценки');
  });

  describe('SRS: выученные слова не уезжают в промпт', function () {
    bank();
    var before = PROMPTS.lesson('B2.2', { today: '2026-08-26' });
    ok(before.indexOf('slope — наклон') > 0, 'пока слово в работе — оно в промпте');

    for (var i = 0; i < 3; i++) State.gradeWord('slope', true, '2026-08-26');
    var after = PROMPTS.lesson('B2.2', { today: '2026-08-26' });
    eq(after.indexOf('slope — наклон'), -1, 'выученное слово из промпта пропало');
    ok(after.indexOf('substitute — подставить') > 0, 'остальные на месте');

    // ошибка вернула слово — вернулось и в промпт
    State.gradeWord('slope', false, '2026-08-26');
    var again = PROMPTS.lesson('B2.2', { today: '2026-08-26' });
    ok(again.indexOf('slope — наклон') > 0, 'вернулось в работу — вернулось и в промпт');
  });

  describe('SRS: «Слова урока» по закрытому уроку', function () {
    bank();
    var w = State.lessonWords('B2.1');
    eq(w.length, 3, 'три слова урока');
    eq(w.map(function (x) { return x.en; }), ['slope', 'substitute', 'vertex'], 'в порядке итога');
    eq(w[0].status, 'new', 'со статусом');

    State.gradeWord('slope', true, T);
    State.gradeWord('slope', true, T);
    eq(State.lessonWords('B2.1')[0].streak, 2, 'серия видна');
    State.gradeWord('slope', true, T);
    var after = State.lessonWords('B2.1')[0];
    eq([after.status, after.due], ['known', '2026-08-30'], 'статус и дата повтора');

    eq(State.lessonWords('B6.1'), [], 'у незакрытого урока слов нет');
  });

  describe('SRS: состояние переживает миграцию', function () {
    var out = State.migrate({ settings: {}, days: {} });
    eq(out.srs, {}, 'у состояния без srs появляется пустая карта');
    var kept = State.migrate({ settings: {}, days: {}, srs: { slope: { status: 'known', streak: 3, step: 0, due: '2026-08-30' } } });
    eq(kept.srs.slope.status, 'known', 'существующие записи не теряются');
    var broken = State.migrate({ settings: {}, days: {}, srs: [1, 2] });
    eq(broken.srs, {}, 'битое поле чинится');
  });
})();
