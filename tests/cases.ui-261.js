/* Полировка UI 2.6.1: счётчик шапки «Программы», дорожка без уроков
   в текущей фазе и единый стиль строки колоды.

   Замечание про изоляцию: cases.prompt-body.js регистрирует синтетический
   блок B99 с одним уроком math, и он остаётся в CONTENT до конца прогона.
   Поэтому здесь считаем по Фазе 0 явно, а не по абсолютным итогам. */

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

  var P0 = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];

  /** Тот же подсчёт, что в шапке, но только по блокам Ф0. */
  function p0Counts() {
    var total = 0, skipped = 0, done = 0;
    P0.forEach(function (id) {
      State.blockLessons(id).forEach(function (l) {
        if (l.skipped) { skipped++; return; }
        total++;
        var st = State.s.lessons[l.id];
        if (st && st.done) done++;
      });
    });
    return { total: total, skipped: skipped, done: done };
  }

  describe('2.6.1: счётчик шапки «Программы» исключает пропущенные', function () {
    fresh();
    var counts = App.screen('program').counts;
    ok(typeof counts === 'function', 'экран отдаёт свой счётчик');

    var c = p0Counts();
    eq([c.total, c.skipped, c.done], [15, 9, 0], 'Ф0: 15 живых, 9 пропущено, 0 закрыто');
    eq(c.total + c.skipped, 24, 'вместе — те самые 24 урока пакета');

    ['B1.1', 'B1.2', 'B2.1', 'B2.2', 'B2.3'].forEach(function (id) {
      State.applySummary(id, summary(), { date: '2026-08-25' });
    });
    eq(p0Counts().done, 5, 'закрыто пять');

    // общий счётчик шапки считает по контенту, а не по ключам state.lessons:
    // в состоянии, пережившем сжатие Ф0, ещё лежат записи пропущенных уроков,
    // и шапка обещала 24 урока против «5/15» в прогрессе блоков ниже
    var before = counts();
    State.s.lessons['B5.1'] = { done: true, score: 9, date: '2026-08-10' };
    State.s.lessons['B6.4'] = { done: true, score: 9, date: '2026-08-10' };
    eq(counts(), before, 'записи пропущенных уроков счётчик не двигают');
    eq(counts().skipped, 9, 'пропущенные считаются отдельно');
    ok(counts().total < Object.keys(State.s.lessons).length,
      'в контенте меньше уроков, чем ключей в состоянии — как и должно быть после сжатия');
  });

  describe('2.6.1: дорожка без уроков в текущей фазе', function () {
    fresh();
    // информатика: её блоки есть, но уроков в них пока нет — они будут в Ф2
    eq(Waterfall.hasLessonsNow('cs'), false, 'у информатики уроков сейчас нет');
    eq(Waterfall.freshText('cs', State.freshness('cs')), 'нет уроков в этой фазе',
      'подпись не зовёт к действию, которого нет');

    // бизнес не трогаем — у него есть B5.3
    eq(Waterfall.hasLessonsNow('biz'), true, 'у бизнеса урок есть');
    ok(Waterfall.freshText('biz', State.freshness('biz')).indexOf('нет уроков') < 0,
      'у бизнеса обычная подпись свежести');
    eq(Waterfall.hasLessonsNow('math'), true, 'и у математики');

    // серая строка, а не жёлтая: цвет срочности снимается
    var bars = Waterfall.fullBars();
    ok(bars.indexOf('tdays none') > 0, 'строка получает класс none');
    ok(bars.indexOf('нет уроков в этой фазе') > 0, 'и текст');
    // у дорожки с уроками подпись прежняя
    ok(bars.indexOf('tdays g') > 0 || bars.indexOf('tdays y') > 0, 'живые дорожки цветные');

    // когда уроки кончатся и у математики — она тоже станет серой
    Object.keys(State.s.blocks).forEach(function (b) {
      State.activeLessons(b).forEach(function (l) {
        State.applySummary(l.id, summary(), { date: '2026-08-26' });
      });
    });
    eq(Waterfall.hasLessonsNow('math'), false, 'уроков не осталось');
    eq(Waterfall.freshText('math', 0), 'нет уроков в этой фазе', 'та же подпись вместо «сегодня ✓»');
  });

  describe('2.6.1: строка колоды без «просмотрено:»', function () {
    fresh();
    State.applySummary('B2.1', summary({
      words: [{ en: 'slope', ru: 'наклон' }, { en: 'vertex', ru: 'вершина' }]
    }), { date: '2026-08-25' });
    // 2.6.4: счётчик дня — набор уникальных карточек, а не число нажатий
    State.s.cards = { lastDay: State.today(), viewedToday: 2, seen: ['w:slope', 'w:vertex'] };

    var html = App.screen('journal').render();
    // 2.6.4: у слов и долгов свои счётчики, «сегодня» считает уникальные карточки
    ok(html.indexOf('слова: активных 2, выучено 0 · долги: 0 · сегодня 2') > 0,
      'единый стиль строки: ' + html.slice(html.indexOf('В колоде'), html.indexOf('В колоде') + 120));
    eq(html.indexOf('просмотрено:'), -1, 'старой формулировки нет');
  });
})();
