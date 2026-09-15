/* 2.7.7, этап 6: одна очередь блоков — по сроку, потом по номеру.

   Водопад (Waterfall.nextOwnLesson) с 2.7.6 шёл по сроку блока, а сквозная
   очередь дорожки (State.nextLessonInTrack: свап «Поменять урок», запасной
   путь выбора, State.nextLesson) — по номеру. После обмена сроков Б12/Б14
   они расходились. Теперь это одна функция: фаза → срок (без срока — в конце
   фазы) → номер. */

(function () {
  'use strict';

  function closeLessons(ids, date) {
    ids.forEach(function (id) { State.s.lessons[id] = { done: true, score: 8, date: date }; });
    ids.forEach(function (id) { State.refreshBlockDone(id.split('.')[0]); });
  }
  function closeBlock(id, date) { closeLessons(State.activeLessons(id).map(function (l) { return l.id; }), date); }

  describe('2.7.7 Э6: ноябрь — у письма следующий Б14.1, не Б12.1', function () {
    State.reset();
    State.syncContent();
    State.setMode('school');
    Object.keys(State.s.blocks).forEach(function (id) {
      var b = State.s.blocks[id];
      if (id === 'B12' || id === 'B14' || !b.deadline || b.deadline > '2026-12-31') return;
      closeBlock(id, '2026-11-01');
    });
    eq(State.nextLessonInTrack('write'), 'B14.1', 'сквозная очередь письма: Б14 (срок 22.11) раньше Б12 (20.12)');
    eq(State.nextLessonInTrack('write', 'p1'), Waterfall.nextOwnLesson('write', 'p1'), 'та же очередь, что у водопада');
    eq(State.nextLesson(), 'B14.1', 'и общая очередь');
    eq(State.nextLessonInTrack('math'), 'B15.1', 'математика: Б15 (17.01)');
    closeBlock('B15', '2026-11-02');
    eq(State.nextLessonInTrack('math'), 'B16.1', 'затем общий блок Б16 (30.01)');
    eq(Waterfall.nextOwnLesson('math', 'p1'), 'B53.1', 'своя очередь общий блок пропускает — К без срока');
    closeBlock('B16', '2026-11-02');
    eq(State.nextLessonInTrack('math'), 'B53.1', 'К без срока — в конце фазы');
  });

  describe('2.7.7 Э6: фаза идёт раньше срока — блок без срока не уезжает в конец программы', function () {
    State.reset();
    State.syncContent();
    State.setDeadline('B1', null);
    eq(State.nextLessonInTrack('write'), 'B3.1', 'в своей фазе блок без срока — после блоков со сроком');
    closeBlock('B3', '2026-08-30');
    eq(State.nextLessonInTrack('write'), 'B1.1', 'но раньше блоков следующей фазы: Ф0 → Ф1 (не B8.1)');
  });

  State.reset();
  State.syncContent();
})();
