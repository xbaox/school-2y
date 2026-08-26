/* Этап 7.3 (релиз 2.6.0): незавершённый урок на живом кейсе B2.4 —
   промпт скопирован 26.08, урок брошен на середине, итога нет. */

(function () {
  'use strict';

  var COPIED = '2026-08-26';   // день, когда промпт скопировали и урок бросили
  var NEXT = '2026-08-27';     // следующее утро

  function scene() {
    State.reset();
    State.syncContent();
    // до этого закрыты пять уроков начала Ф0 — реальное положение дел
    var sum = {
      score: 8, level: 'L2', topics: 'x', words: [], debts: [], cleared: [],
      warmup: [], writing: '', raw: ''
    };
    ['B1.1', 'B1.2', 'B2.1', 'B2.2', 'B2.3'].forEach(function (id) {
      State.applySummary(id, sum, { date: '2026-08-25' });
    });
    // и в этот день выбран уровень «норма» — очко за него уже начислено
    var d = State.day(COPIED, true);
    d.level = 'norm';
    State.recount(COPIED);
    State.markPromptCopied('B2.4', COPIED);
    return d;
  }

  describe('брошенный урок: назавтра видно напоминание', function () {
    scene();
    var p = Lesson.findPending(NEXT);
    eq(p, { date: COPIED, lessonId: 'B2.4' }, 'B2.4 опознан как незакрытый');

    var card = Lesson.pendingCard(NEXT);
    ok(card.indexOf('Вчерашний урок не закрыт') > 0, 'заголовок про вчера');
    ok(card.indexOf('B2.4') > 0, 'с номером урока');
    ok(card.indexOf('data-drop="B2.4"') > 0, 'кнопка «Урок не состоялся»');
    ok(card.indexOf('data-late="B2.4"') > 0, 'и кнопка «Вставить итог»');

    // окно поиска — неделя, не только вчера
    ok(Lesson.findPending('2026-09-01') !== null, 'через пять дней напоминание ещё живо');
    eq(Lesson.findPending('2026-09-05'), null, 'за пределами окна — уже нет');
    eq(Lesson.PENDING_WINDOW, 7, 'окно семь дней');
  });

  describe('брошенный урок: «Урок не состоялся» возвращает его в очередь без штрафа', function () {
    scene();
    var before = State.points(COPIED);
    eq(before, 2, 'за выбранный уровень «норма» — два очка доктрины');

    Lesson.dropLesson('B2.4', COPIED);

    eq(State.points(COPIED), before, 'очки дня не изменились — штрафа нет');
    eq(State.s.days[COPIED].dropped, ['B2.4'], 'урок помечен несостоявшимся');
    eq(State.s.lessons['B2.4'].done, false, 'урок не закрыт');
    eq(State.s.summaries.length, 5, 'итог не появился');
    eq(State.s.stats.lessonsDone, 5, 'счётчик закрытых уроков не вырос');

    eq(Lesson.pendingCard(NEXT), '', 'напоминание погасло');
    eq(Lesson.findPending(NEXT), null, 'и больше не находится');

    // главное: урок вернулся в очередь и водопад снова его предложит
    eq(State.nextLessonInTrack('math'), 'B2.4', 'B2.4 снова следующий по математике');
    eq(Waterfall.nextInBlock('B2'), 'B2.4', 'и внутри блока Б2 тоже');
    eq(State.blockProgress('B2').remaining, 1, 'блок по-прежнему ждёт один урок');
    eq(State.block('B2').done, false, 'и не считается закрытым');
  });

  describe('брошенный урок: повторная отметка ничего не ломает', function () {
    scene();
    Lesson.dropLesson('B2.4', COPIED);
    Lesson.dropLesson('B2.4', COPIED);
    eq(State.s.days[COPIED].dropped, ['B2.4'], 'в списке он один');

    // а если урок всё-таки провели позже — обычное закрытие работает
    var res = State.applySummary('B2.4', {
      score: 7, level: 'L2', topics: 'повтор', words: [], debts: [], cleared: [],
      warmup: [], writing: '', raw: ''
    }, { date: NEXT });
    eq(res.ok, true, 'итог принят');
    eq(State.s.lessons['B2.4'].done, true, 'урок закрыт');
    eq(State.block('B2').done, true, 'и блок Б2 закрылся');
  });
})();
