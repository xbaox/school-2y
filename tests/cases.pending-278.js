/* 2.7.8, Б6: «Урок не состоялся» убран. С 2.7.7 незакрытый урок на «Сегодня» —
   строка без кнопок; Lesson.dropLesson никто не звал. Старая отметка dropped
   уважается, новая сборка её не пишет. */

(function () {
  'use strict';

  var MON = '2026-09-14', TUE = '2026-09-15';

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
  }

  describe('2.7.8 Б6: Lesson.dropLesson убран, отметка dropped — только из старых состояний', function () {
    eq(typeof Lesson.dropLesson, 'undefined', 'функции нет');
    eq(Object.keys(Lesson).filter(function (k) { return /drop/i.test(k); }), [], 'и ничего «drop» в Lesson');

    // модули приложения поле dropped не пишут (тесты — не в счёт)
    var writers = (__repoFiles() || []).filter(function (f) {
      return /\.js$/.test(f.path) && !/^tests\//.test(f.path) && /\.dropped\s*=(?!=)|\.dropped\.push\(/.test(f.text);
    }).map(function (f) { return f.path; });
    eq(writers, [], 'ни один модуль не пишет d.dropped');

    // старая отметка гасит строку; без неё строка есть
    fresh();
    State.markPromptCopied('B2.1', MON);
    ok(Lesson.pendingCard(TUE).indexOf('Вчерашний урок не закрыт · Б2.1') > 0, 'без отметки — строка');
    State.day(MON).dropped = ['B2.1'];
    eq(Lesson.findPending(TUE), null, 'с отметкой старой сборки — урока нет');
    eq(Lesson.pendingCard(TUE), '', 'и строки нет');
    eq(State.nextLessonInTrack('math'), 'B2.1', 'урок по-прежнему в очереди');
  });

  State.reset();
  State.syncContent();
})();
