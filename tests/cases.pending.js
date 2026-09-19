/* Этап 7.3 (релиз 2.6.0): незавершённый урок на живом кейсе B2.4 —
   промпт скопирован 26.08, урок брошен на середине, итога нет.
   2.7.8: «Урок не состоялся» (Lesson.dropLesson) убран — старая отметка dropped
   уважается, урок закрывается обычным ИТОГом сегодняшним числом. */

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
    // в этот день выбран уровень «норма» и сделана минималка. С 2.7.6 очки
    // даёт достигнутый уровень: урок не закрыт — день набрал минималку
    var d = State.day(COPIED, true);
    d.level = 'norm';
    d.minimalSteps = [true, true];
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
    ok(card.indexOf('Б2.4') > 0, 'с подписью урока, как в плане');
    // 2.7.7: одна информационная строка — кнопок и действий нет
    eq(card.indexOf('<button'), -1, 'кнопок нет');
    eq(card.indexOf('data-drop'), -1, '«Урок не состоялся» ушёл');
    eq(card.indexOf('data-late'), -1, 'и «Вставить итог» тоже');

    // окно поиска — неделя, не только вчера
    ok(Lesson.findPending('2026-09-01') !== null, 'через пять дней напоминание ещё живо');
    eq(Lesson.findPending('2026-09-05'), null, 'за пределами окна — уже нет');
    eq(Lesson.PENDING_WINDOW, 7, 'окно семь дней');
  });

  describe('брошенный урок: старая отметка «Урок не состоялся» — урок в очереди без штрафа', function () {
    scene();
    var before = State.points(COPIED);
    eq(before, 1, 'норма в плане, урок не закрыт — очко за сделанную минималку');

    // 2.7.8: Lesson.dropLesson убран — кнопки не было с 2.7.7. Отметку dropped,
    // оставленную старой сборкой, кладём на день руками
    eq(typeof Lesson.dropLesson, 'undefined', 'Lesson.dropLesson убран');
    State.s.days[COPIED].dropped = ['B2.4'];

    eq(State.points(COPIED), before, 'очки дня не изменились — штрафа нет');
    eq(State.s.lessons['B2.4'].done, false, 'урок не закрыт');
    eq(State.s.summaries.length, 5, 'итог не появился');
    eq(State.s.stats.lessonsDone, 5, 'счётчик закрытых уроков не вырос');

    eq(Lesson.pendingCard(NEXT), '', 'напоминание погасло');
    eq(Lesson.findPending(NEXT), null, 'и больше не находится');

    // главное: урок в очереди, и водопад снова его предложит
    eq(State.nextLessonInTrack('math'), 'B2.4', 'B2.4 снова следующий по математике');
    eq(Waterfall.nextInBlock('B2'), 'B2.4', 'и внутри блока Б2 тоже');
    eq(State.blockProgress('B2').remaining, 1, 'блок по-прежнему ждёт один урок');
    eq(State.block('B2').done, false, 'и не считается закрытым');
  });

  function itog() {
    return {
      score: 7, level: 'L2', topics: 'повтор', words: [], debts: [], cleared: [],
      warmup: [], writing: '', raw: ''
    };
  }

  describe('брошенный урок: закрывается обычным ИТОГом сегодняшним числом', function () {
    // 2.7.8 (ТЗ 7.8): строка без кнопок; урок остался в очереди, и его ИТОГ
    // вставляется как обычно — днём вставки, не днём копирования
    scene();
    var res = State.applySummary('B2.4', itog(), { date: NEXT });
    eq(res.ok, true, 'итог принят');
    eq(State.s.lessons['B2.4'].done, true, 'урок закрыт');
    eq(State.s.lessons['B2.4'].date, NEXT, 'числом вставки, а не днём копирования');
    eq(State.s.days[NEXT].lessons, ['B2.4'], 'урок лёг в сегодняшний день');
    eq(State.s.days[COPIED].lessons, [], 'вчерашний день урока не получил');
    eq(State.points(COPIED), 1, 'и очков вчерашнего дня не прибавилось');
    eq(Lesson.findPending(NEXT), null, 'незакрытого урока больше нет');
    eq(Lesson.pendingCard(NEXT), '', 'строка погасла');
    eq(State.block('B2').done, true, 'и блок Б2 закрылся');

    // старая отметка dropped закрытию не мешает
    scene();
    State.s.days[COPIED].dropped = ['B2.4'];
    res = State.applySummary('B2.4', itog(), { date: NEXT });
    eq([res.ok, State.s.lessons['B2.4'].done], [true, true], 'урок с отметкой dropped закрывается так же');
  });
})();
