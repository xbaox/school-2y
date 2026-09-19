/* 2.7.6, этап 7: дедлайны и подписи блоков Ф1.

   OSSLT — конец ноября 2026: Б14 (генеральная) переезжает на 22.11, Б12
   (литературный анализ ENG2D) — на 20.12. Подписи Б9–Б15 ссылаются на пакеты
   2.8.0 и 2.8.1. У блоков deadlineSource: content — приложение переписывает
   сроки само, ручной срок не трогается. */

(function () {
  'use strict';

  var P1N = ['B9', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15'];

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
  }

  describe('2.7.6 Э7: сроки Ф1 после загрузки', function () {
    fresh();
    eq(State.block('B14').deadline, '2026-11-22', 'Б14 → 22.11');
    eq(State.block('B12').deadline, '2026-12-20', 'Б12 → 20.12');
    eq(State.block('B7').deadline, '2026-09-20', 'Б7 не менялся');
    eq([State.block('B12').deadlineSource, State.block('B14').deadlineSource], ['content', 'content'],
      'источник срока — контент');
  });

  describe('2.7.6 Э7: старое состояние получает новые сроки, ручной срок не трогается', function () {
    State.replace({
      meta: { version: 3 }, settings: {}, days: {}, debts: [], summaries: [], lessons: {},
      blocks: {
        B12: { phase: 'p1', track: 'write', title: 'x', deadline: '2026-11-29', done: false, deadlineSource: 'content' },
        B14: { phase: 'p1', track: 'write', title: 'y', deadline: '2026-12-20', done: false, deadlineSource: 'content' }
      }
    }, true);
    State.syncContent();
    eq([State.block('B12').deadline, State.block('B14').deadline], ['2026-12-20', '2026-11-22'],
      'контентные сроки 2.7.5 переписаны');

    State.replace({
      meta: { version: 3 }, settings: {}, days: {}, debts: [], summaries: [], lessons: {},
      blocks: { B14: { phase: 'p1', track: 'write', title: 'y', deadline: '2026-12-01', done: false, deadlineSource: 'user' } }
    }, true);
    State.syncContent();
    eq(State.block('B14').deadline, '2026-12-01', 'срок, заданный владельцем, неприкосновенен');
  });

  describe('2.7.6 Э7: подписи блоков', function () {
    fresh();
    eq(P1N.filter(function (id) { return /пакет 2\.7/.test(State.block(id).note); }), [], 'ссылок на пакеты 2.7.x нет');
    ok(P1N.every(function (id) { return State.block(id).note === CONTENT.block(id).note; }), 'подписи доехали в состояние');
    // 2.8.0: подписи Б9 и Б10 — по разделу «Что ещё меняется контентом» пакета
    eq(State.block('B9').note, 'Опорные задания и глоссарий — есть (2.8.0).', 'Б9');
    eq(State.block('B10').note, 'Материалы OSSLT — из окна английского, пакет 2.8.0б. ' +
      'OSSLT — конец ноября 2026, точная дата до 15.10.', 'Б10 (2.8.0, A7: дата OSSLT вернулась)');
    eq([State.block('B11').note, State.block('B13').note], ['Опорные задания — пакет 2.8.1.', 'Опорные задания — пакет 2.8.1.'],
      'Б11 и Б13');
    eq(State.block('B12').note, 'Пьеса и роман в ENG2D идут до 18.12, экзамен в конце января. Опорные задания — пакет 2.8.1.', 'Б12');
    eq(State.block('B14').note, 'OSSLT — конец ноября 2026 (outline ENG2D); точная дата до 15.10. Если раньше 25.11 — ' +
      'дедлайн блока 15.11. Опорные задания — пакет 2.8.1.', 'Б14');
    ok(/пакет 2\.8\.1\.$/.test(State.block('B15').note), 'Б15');
  });

  describe('2.7.6 Э7: ноябрь–декабрь — Б14 раньше Б12', function () {
    fresh();
    // закрыто всё со сроком до конца года, кроме Б12 и Б14
    Object.keys(State.s.blocks).forEach(function (id) {
      var b = State.s.blocks[id];
      if (id === 'B12' || id === 'B14' || !b.deadline || b.deadline > '2026-12-31') return;
      State.activeLessons(id).forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: '2026-11-01' }; });
      State.refreshBlockDone(id);
    });
    // 2.7.7 (Э1): дедлайн заранее — четыре урока Б14 на четыре будня с 17.11
    withToday('2026-11-16', function () { eq(Waterfall.ruleDeadline('2026-11-16'), null, '16.11 — пять будней на четыре урока'); });
    withToday('2026-11-17', function () {
      eq(Waterfall.ruleDeadline('2026-11-17').reason.text, 'дедлайн: Б14 через 5 дней, осталось 4 урока', '17.11 — горит заранее');
    });
    withToday('2026-11-21', function () {
      eq(Waterfall.ruleDeadline('2026-11-21').reason.text, 'дедлайн: Б14 через 1 день, осталось 4 урока',
        '21.11 (сб) — будней до срока нет, правило горит');
    });
    withToday('2026-11-22', function () {
      eq(Waterfall.ruleDeadline('2026-11-22').reason.text, 'дедлайн: Б14 сегодня', '22.11 — срок Б14');
    });
    withToday('2026-11-23', function () {
      var p = Waterfall.pick('2026-11-23');
      eq([p.lessonId, p.reason.text], ['B14.1', 'дедлайн: Б14 просрочен на 1 день'], '23.11 → Б14.1 (было: Б12.1 «светофор: Б12 горит красным»)');
    });
    withToday('2026-12-14', function () {
      eq(Waterfall.pick('2026-12-14').lessonId, 'B14.1', '14.12 → всё ещё Б14 (было: Б12.1, просрочен на 15 дней)');
    });
    State.activeLessons('B14').forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: '2026-11-30' }; });
    State.refreshBlockDone('B14');
    withToday('2026-12-14', function () { eq(Waterfall.ruleDeadline('2026-12-14'), null, 'Б14 закрыт, у Б12 срок 20.12'); });
    withToday('2026-12-21', function () {
      eq(Waterfall.pick('2026-12-21').reason.text, 'дедлайн: Б12 просрочен на 1 день', '21.12 → Б12');
    });
  });

  State.reset();
  State.syncContent();
})();
