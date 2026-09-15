/* 2.7.8, Б3: подпись пункта «Карточки» на «Сегодня» — состав колоды дня.

   До 2.7.8 подпись считала весь активный банк: «50 слов + 8 долгов», хотя
   колода дня режется кэпом 20 и берёт не больше трёх долгов. Теперь — те же
   числа, что листает человек (State.deckPlan): «5 новых · 3 долга · 12 повторов
   · выучено N». Нулевые части не пишутся; пустая колода — прежняя строка
   «колода пуста — видео ~5 мин». Подпись одна на три места: пункт «Карточки»
   (план «Минималка»), пункт «Минималка» (норма и полная) и шаг минималки. */

(function () {
  'use strict';

  var MON = '2026-09-14';

  function words(n, p) {
    var out = [];
    for (var i = 0; i < n; i++) out.push({ en: p + i, ru: 'с' + i });
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

  var MATH = ['М1 — путает знак', 'М2 — нет ходов', 'М3 — нет единиц'];
  var WRITING = ['П1 — нет тезиса', 'П2 — нет связок', 'П3 — нет вывода'];

  /**
   * Банк: nOld выученных с подошедшим сроком (урок 01.09), nNew новых из
   * последнего итога (11.09), nDebts открытых долгов (до шести: три математики
   * и три письма — у дорожки один открытый долг на категорию, новых за итог
   * не больше трёх). План дня — plan.
   */
  function bank(nOld, nNew, nDebts, plan) {
    fresh();
    if (nOld) {
      var old = words(nOld, 'old');
      State.applySummary('B2.1', sum(old), { date: '2026-09-01' });
      old.forEach(function (w) { State.s.srs[w.en] = { status: 'known', streak: 3, step: 0, due: '2026-09-12' }; });
    }
    if (nDebts > 3) State.applySummary('B1.1', sum([], WRITING.slice(0, nDebts - 3)), { date: '2026-09-10' });
    if (nNew || nDebts) {
      State.applySummary('B2.2', sum(words(nNew, 'new'), MATH.slice(0, Math.min(3, nDebts))), { date: '2026-09-11' });
    }
    State.day(MON, true).plan = plan || 'min';
    App.resetOpen();
    return State.day(MON);
  }

  function item(id) {
    return App.planItems(MON, State.day(MON)).filter(function (x) { return x.id === id; })[0];
  }

  function sub() { return item('cards').sub; }

  describe('2.7.8 Б3: подпись «Карточки» — состав колоды дня, а не банк', function () {
    withToday(MON, function () {
      var d = bank(12, 4, 3);
      var p = State.deckPlan(MON);
      eq([p.fresh, p.debts.length, p.reviews], [4, 3, 12], 'колода: 4 новых, 3 долга, 12 повторов');
      eq(sub(), '4 новых · 3 долга · 12 повторов · выучено 12', 'подпись пункта «Карточки»');
      eq(4 + 3 + 12, Cards.deck(MON).length, 'части в сумме — вся колода листалки');
      ok(App.planBlock(MON, d).indexOf('4 новых · 3 долга · 12 повторов · выучено 12') > 0, 'подпись в разметке плана');
      eq(App.planBlock(MON, d).indexOf('16 слов'), -1, 'прежнего «16 слов + 3 долга» нет');
    });
  });

  describe('2.7.8 Б3: пункт «Минималка» и шаг минималки — та же подпись', function () {
    withToday(MON, function () {
      var d = bank(12, 4, 3, 'norm');
      eq(item('min').sub, '~10–15 мин · 4 новых · 3 долга · 12 повторов · выучено 12', 'подпись пункта «Минималка»');
      var steps = App.minimalSteps(d);
      ok(steps.indexOf('<span>Карточки: 4 новых · 3 долга · 12 повторов · выучено 12 · карточки: 0/10</span>') > 0,
        'шаг минималки: состав и прогресс шага');
      eq(steps.indexOf('повторить'), -1, '«повторить» ушло: в колоде не только повторы');
      ok(steps.indexOf('data-cards') > 0, 'кнопка карточек на месте');

      d.minimalSteps = [true, false];
      ok(App.minimalSteps(d).indexOf('<span>Карточки: 4 новых · 3 долга · 12 повторов · выучено 12</span>') > 0,
        'шаг отмечен — прогресса нет, состав остаётся');
      bank(12, 4, 3, 'full');
      eq(item('min').sub, '~10–15 мин · 4 новых · 3 долга · 12 повторов · выучено 12', 'и на полной');
    });
  });

  describe('2.7.8 Б3: кэп колоды — подпись не больше 20 карточек и трёх долгов', function () {
    withToday(MON, function () {
      bank(30, 8, 6);
      eq([State.activeWords(MON).length, State.openDebts().length], [38, 6], 'в банке 38 активных слов и 6 долгов');
      eq(sub(), '5 новых · 3 долга · 12 повторов · выучено 30', 'в колоде 20: пять мест новым, три долга, остальное повторы');
      eq(sub().indexOf('38'), -1, 'банк в подписи не виден');

      bank(0, 30, 3);
      eq(sub(), '17 новых · 3 долга', 'одни новые: 17 — кэп 20 минус три долга');
      bank(25, 0, 0);
      eq(sub(), '20 повторов · выучено 25', 'одни повторы: 20 из 25 подошедших');
    });
  });

  describe('2.7.8 Б3: склонение', function () {
    withToday(MON, function () {
      bank(1, 1, 1);
      eq(sub(), '1 новое · 1 долг · 1 повтор · выучено 1', 'один');
      bank(2, 2, 2);
      eq(sub(), '2 новых · 2 долга · 2 повтора · выучено 2', 'два');
      bank(4, 3, 4);
      eq(sub(), '3 новых · 3 долга · 4 повтора · выучено 4', 'три и четыре');
      bank(5, 5, 0);
      eq(sub(), '5 новых · 5 повторов · выучено 5', 'пять');
      bank(11, 0, 0);
      eq(sub(), '11 повторов · выучено 11', 'одиннадцать');
      bank(0, 11, 0);
      eq(sub(), '11 новых', 'одиннадцать новых');
    });
  });

  describe('2.7.8 Б3: нулевые части не пишутся (решено самостоятельно)', function () {
    withToday(MON, function () {
      bank(12, 0, 0);
      eq(sub(), '12 повторов · выучено 12', 'только повторы');
      bank(0, 0, 1);
      eq(sub(), '1 долг', 'только долг');
      bank(0, 3, 0);
      eq(sub(), '3 новых', 'только новые — «выучено 0» не пишется');
      bank(0, 3, 2);
      eq(sub(), '3 новых · 2 долга', 'без повторов');
      eq(/(^|· )0 /.test(sub()), false, 'нулей в подписи нет');
    });
  });

  describe('2.7.8 Б3: пустая колода — прежняя строка', function () {
    withToday(MON, function () {
      bank(0, 0, 0);
      eq(sub(), 'колода пуста — видео ~5 мин', 'банк пуст');
      eq(item('cards').body.indexOf('data-cards'), -1, 'кнопки карточек нет');

      var d = bank(12, 0, 0, 'norm');
      Object.keys(State.s.srs).forEach(function (k) { State.s.srs[k].due = '2026-09-20'; });
      eq(State.wordCounts(MON).known, 12, 'выученные есть, но все спят до срока');
      eq(State.deckPlan(MON).words.length, 0, 'колода дня пуста');
      eq(item('min').sub, '~10–15 мин · колода пуста — видео ~5 мин', '«выучено» не пишется');
      ok(App.minimalSteps(d).indexOf('<span>Колода пуста — вместо неё одно видео/аудио на английском ~5 мин</span>') > 0,
        'шаг минималки — видео');
      eq(App.minimalSteps(d).indexOf('data-cards'), -1, 'и без кнопки карточек');
    });
  });

  State.reset();
  State.syncContent();
})();
