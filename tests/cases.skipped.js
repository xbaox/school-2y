/* Сжатие Фазы 0 (релиз 2.6.0): пропущенные уроки, новые дедлайны,
   светофоры под норматив «1 урок в день» и конкурсный урок. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  var SKIPPED = ['B3.2', 'B3.4', 'B4.2', 'B4.4', 'B5.1', 'B5.2', 'B5.4', 'B6.3', 'B6.4'];
  var KEPT = ['B1.3', 'B1.4', 'B2.4', 'B3.1', 'B3.3', 'B4.1', 'B4.3', 'B5.3', 'B6.1', 'B6.2'];

  describe('сжатие Ф0: пропущены ровно девять уроков', function () {
    fresh();
    var all = [];
    ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach(function (b) {
      State.blockLessons(b).forEach(function (l) { if (l.skipped) all.push(l.id); });
    });
    eq(all, SKIPPED, 'список пропущенных совпадает с ТЗ');

    KEPT.forEach(function (id) {
      eq(State.isSkipped(id), false, id + ' остаётся в программе');
    });
    // пять уроков начала Ф0 тоже не пропущены — они уже пройдены в проде
    ['B1.1', 'B1.2', 'B2.1', 'B2.2', 'B2.3'].forEach(function (id) {
      eq(State.isSkipped(id), false, id + ' не помечен пропущенным');
    });
  });

  describe('сжатие Ф0: прогресс блока считает только живые уроки', function () {
    fresh();
    eq(State.blockProgress('B1').total, 4, 'в Б1 пропусков нет — все четыре');
    eq(State.blockProgress('B3').total, 2, 'в Б3 осталось два урока');
    eq(State.blockProgress('B3').skipped, 2, 'и два пропущено');
    eq(State.blockProgress('B5').total, 1, 'в Б5 остался один урок');
    eq(State.blockProgress('B6').total, 2, 'в Б6 осталось два');

    // блок закрывается по живым урокам, пропущенные его не держат
    State.applySummary('B5.3', {
      score: 8, level: 'L2', topics: 'питч', words: [], debts: [], cleared: [],
      warmup: [], writing: '', raw: ''
    }, { date: '2026-08-26' });
    eq(State.blockProgress('B5').remaining, 0, 'живых уроков не осталось');
    eq(State.block('B5').done, true, 'Б5 закрыт, хотя три урока пропущены');
  });

  describe('сжатие Ф0: водопад пропущенные не назначает', function () {
    fresh();
    // закрываем всё, что стоит перед пропущенными в Б3
    var sum = {
      score: 8, level: 'L2', topics: 'x', words: [], debts: [], cleared: [],
      warmup: [], writing: '', raw: ''
    };
    ['B1.1', 'B1.2', 'B1.3', 'B1.4'].forEach(function (id) {
      State.applySummary(id, sum, { date: '2026-08-26' });
    });
    eq(State.nextLessonInTrack('write'), 'B3.1', 'после Б1 — первый живой урок Б3');

    State.applySummary('B3.1', sum, { date: '2026-08-26' });
    eq(State.nextLessonInTrack('write'), 'B3.3', 'B3.2 пропущен — сразу B3.3');

    State.applySummary('B3.3', sum, { date: '2026-08-26' });
    // B3.4 пропущен → в Ф0 на дорожке письма уроков не осталось.
    // Сквозная очередь при этом ведёт дальше, в Ф1: с 2.7.0 у Б8 есть уроки
    eq(State.nextLessonInTrack('write', 'p0'), null, 'B3.4 пропущен — уроков Ф0 на письме нет');
    eq(State.nextLessonInTrack('write'), 'B8.1', 'а очередь без фазы ведёт к первому уроку Б8');
    eq(State.block('B3').done, true, 'и Б3 закрыт');

    eq(Waterfall.nextInBlock('B4'), 'B4.1', 'в Б4 первый живой — B4.1');
    State.applySummary('B4.1', sum, { date: '2026-08-26' });
    eq(Waterfall.nextInBlock('B4'), 'B4.3', 'B4.2 пропущен — следующий B4.3');
    State.applySummary('B4.3', sum, { date: '2026-08-26' });
    eq(Waterfall.nextInBlock('B4'), null, 'B4.4 пропущен — в блоке пусто');
  });

  describe('сжатие Ф0: новые дедлайны и миграция', function () {
    fresh();
    eq(State.block('B1').deadline, '2026-08-29', 'Б1 → 29.08');
    eq(State.block('B2').deadline, '2026-08-27', 'Б2 → 27.08');
    eq(State.block('B3').deadline, '2026-09-01', 'Б3 → 01.09');
    eq(State.block('B4').deadline, '2026-09-03', 'Б4 → 03.09');
    eq(State.block('B5').deadline, '2026-09-04', 'Б5 → 04.09');
    eq(State.block('B6').deadline, '2026-09-07', 'Б6 → 07.09');

    // старое состояние со старыми дедлайнами обновляется один раз
    var old = State.migrate({
      settings: {}, days: {},
      meta: { version: 1 },
      blocks: {
        B1: { phase: 'p0', track: 'write', title: 'x', deadline: '2026-08-23', done: false },
        B6: { phase: 'p0', track: 'math', title: 'y', deadline: '2026-09-07', done: false },
        B7: { phase: 'p1', track: 'math', title: 'z', deadline: '2026-09-20', done: false }
      }
    });
    eq(old.blocks.B1.deadline, '2026-08-29', 'дедлайн Б1 подтянулся');
    eq(old.blocks.B7.deadline, '2026-09-20', 'блоки Ф1 миграция не трогает');
    eq(old.meta.version, 3, 'версия схемы поднята');

    // после миграции ручной дедлайн уже не затирается
    old.blocks.B1.deadline = '2026-08-31';
    var again = State.migrate(old);
    eq(again.blocks.B1.deadline, '2026-08-31', 'повторная миграция ручную правку не сносит');
  });

  describe('сжатие Ф0: светофоры зелёные при одном уроке в день', function () {
    fresh();
    eq(PACE.rate('summer'), 1, 'норматив до школы — 1 урок в день');

    // реальное положение на 26.08: пять уроков начала Ф0 уже закрыты
    var t = '2026-08-26';
    var sum = {
      score: 8, level: 'L2', topics: 'x', words: [], debts: [], cleared: [],
      warmup: [], writing: '', raw: ''
    };
    ['B1.1', 'B1.2', 'B2.1', 'B2.2', 'B2.3'].forEach(function (id) {
      State.applySummary(id, sum, { date: '2026-08-25' });
    });

    eq(['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map(function (id) {
      return State.blockProgress(id).remaining;
    }), [2, 1, 2, 2, 1, 2], 'осталось десять живых уроков — ровно список ТЗ');

    ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach(function (id) {
      var b = State.block(id);
      var st = PACE.status({
        remaining: State.blockProgress(id).remaining,
        deadline: b.deadline, today: t, mode: 'summer'
      });
      eq(st.color, 'green', id + ' зелёный на ' + t + ' (' + st.text + ')');
    });

    // прицельно: два живых урока Б6 до 07.09 — большой запас
    var b6 = PACE.status({ remaining: 2, deadline: '2026-09-07', today: t, mode: 'summer' });
    eq(b6.color, 'green', 'Б6: 2 урока за 13 дней — зелёный');
    // а вот три урока за два дня уже не успеть
    eq(PACE.status({ remaining: 3, deadline: '2026-08-27', today: t, mode: 'summer' }).color, 'red',
      '3 урока за 2 дня — красный, как и должно быть при норме 1 в день');
  });

  describe('сжатие Ф0: CEMC ⭐ в фокусе Б6.1 и Б6.2', function () {
    fresh();
    ['B6.1', 'B6.2'].forEach(function (id) {
      var l = CONTENT.lesson(id);
      ok(l.focus.indexOf('⭐ CEMC-стиль') > 0, id + ': задача CEMC ⭐ в фокусе');
      ok(l.focus.indexOf('опционально, в самом конце') > 0, id + ': она опциональная и в конце');
    });
    var p = PROMPTS.lesson('B6.1', { today: '2026-08-26' });
    ok(p.indexOf('⭐ CEMC-стиль') > 0, 'и уезжает в промпт вместе с фокусом');
  });

  describe('каркас Ф1: блоки переименованы', function () {
    fresh();
    eq(State.block('B7').title, 'Многочлены-1: язык функций, преобразования, графики, деление', 'Б7');
    eq(State.block('B8').title, 'Чтение: главная мысль, вывод, язык фидбека учителя', 'Б8');
    eq(State.block('B9').title, 'Многочлены-2: теорема о корне, уравнения, неравенства', 'Б9');
    eq(State.block('B10').title, 'Абзац-мнение и новостная заметка: формат OSSLT', 'Б10');
    eq(State.block('B11').title, 'Рациональные функции и асимптоты', 'Б11');
    eq(State.block('B12').title, 'Литературный анализ для ENG2D', 'Б12');
    eq(State.block('B13').title, 'Тригонометрия: радианы, графики, тождества', 'Б13');
    eq(State.block('B14').title, 'OSSLT-генеральная', 'Б14');
    eq(State.block('B15').title, 'Показательные и логарифмические функции', 'Б15');
    eq(State.block('B16').title, 'Финалы семестра: экзамен MHF4U и итоговые ENG2D', 'Б16');
    eq(State.blockLessons('B7').length, 4, 'уроки Ф1 приехали пакетом «Корень»');
    // Б12 сменил дорожку вместе с заголовком: маркетинг уехал в Ф2
    eq(State.block('B12').track, 'write', 'Б12 переехал на дорожку письма');
  });

  describe('конкурсный урок: движок понимает type: \'contest\'', function () {
    fresh();
    // с 2.7.0 конкурсные уроки настоящие — блок К (B53), мутировать
    // живой объект контента больше не нужно
    var l = CONTENT.lesson('B53.1');

    var p = PROMPTS.lesson('B53.1', { today: '2026-08-26' });
    ok(PROMPTS.isContest(l), 'урок опознан как конкурсный');
    ok(p.indexOf('[ЭТАПЫ КОНКУРСНОГО УРОКА]') > 0, 'этапы заменены на упрощённые');
    eq(p.indexOf('[ЭТАПЫ УРОКА]'), -1, 'обычных этапов нет');
    ok(p.indexOf('Задачи 2 и 3 — тем же циклом, строго по одной.') > 0, 'три задачи по одной');
    ok(p.indexOf('полное авторское решение со всеми шагами') > 0, 'полные решения');
    ok(p.indexOf('всего заданий 3.') > 0, 'контракт согласован: заданий ровно три');
    ok(p.indexOf('формат: конкурсный урок') > 0, 'строка контекста объясняет формат');
    eq(p.indexOf('Письменная работа урока'), -1, 'письма в конкурсном уроке нет');
    eq(p.indexOf('Видео просмотрено'), -1, 'видео тоже нет');

    // формат итога тот же
    ok(p.indexOf('=== ИТОГ УРОКА B53.1 ===') > 0, 'итог по обычному формату');
    ok(p.indexOf('Засчитано: ') > 0, 'со всеми полями');
    ok(p.indexOf('[КОНТРАКТ ПРЕПОДАВАТЕЛЯ — 16 правил') > 0, 'контракт на месте');

    eq(PROMPTS.isContest(CONTENT.lesson('B2.1')), false, 'обычный урок конкурсным не считается');
  });
})();
