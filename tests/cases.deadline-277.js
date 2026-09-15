/* 2.7.7, этап 1: правило «дедлайн» заранее.

   Правило ждало, пока срок наступит: у Б7 (срок вс 20.09) последний шанс
   закрыть блок вовремя приходил тогда, когда уроков оставалось больше, чем
   будней. Теперь оно горит и заранее — когда незакрытых уроков не меньше,
   чем учебных дней (пн–пт) от сегодня до срока включительно. Сцена повторяет
   живую копию: Ф0 закрыта, Ф1 не начата. */

(function () {
  'use strict';

  function closeLessons(ids, date) {
    ids.forEach(function (id) { State.s.lessons[id] = { done: true, score: 8, date: date }; });
    ids.forEach(function (id) { State.refreshBlockDone(id.split('.')[0]); });
  }
  function closeBlock(id, date) { closeLessons(State.activeLessons(id).map(function (l) { return l.id; }), date); }

  function fresh(last) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.meta.onboardedAt = '2026-08-22';
    ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach(function (b) { closeBlock(b, '2026-09-05'); });
    State.s.tracks.forEach(function (t) { if (!t.embedded) t.lastLessonDate = last || '2026-09-13'; });
  }

  function why(r) { return r ? [r.lessonId, r.reason.kind, r.reason.text] : null; }

  describe('2.7.7 Э1: учебные дни до срока — пн–пт, оба конца включительно', function () {
    // 2.7.8 (Б4): счёт идёт по режиму дня, пн–пт — это режим «Школа»; набор
    // перед этим мог оставить «Лето» (State.reset), где суббота учебная
    State.reset();
    State.syncContent();
    State.setMode('school');
    eq(Waterfall.schoolDays('2026-09-14', '2026-09-20'), 5, 'пн 14.09 → вс 20.09: пять будней');
    eq(Waterfall.schoolDays('2026-09-16', '2026-09-20'), 3, 'ср → вс: ср, чт, пт');
    eq(Waterfall.schoolDays('2026-09-18', '2026-09-20'), 1, 'пт → вс: только пятница');
    eq(Waterfall.schoolDays('2026-09-19', '2026-09-20'), 0, 'сб → вс: суббота (К) и воскресенье (радар) не в счёт');
    eq(Waterfall.schoolDays('2026-09-14', '2026-09-14'), 1, 'срок сегодня, будний день — один');
    eq(Waterfall.schoolDays('2026-09-14', '2026-09-27'), 10, 'две недели — десять');
    eq(Waterfall.schoolDays('2027-01-26', '2027-01-30'), 4, 'вт 26.01 → сб 30.01: четыре');
    eq(Waterfall.schoolDays('2026-09-20', '2026-09-14'), 0, 'срок позади — ноль');
  });

  describe('2.7.7 Э1: Б7 (срок вс 20.09) — дедлайн заранее', function () {
    withToday('2026-09-16', function () {
      fresh('2026-09-13');
      eq(State.block('B7').deadline, '2026-09-20', 'срок Б7 — воскресенье');
      eq(Waterfall.ruleDeadline('2026-09-14'), null, '14.09: 4 урока на 5 будней — молчит');
      eq(why(Waterfall.ruleDeadline('2026-09-15')), ['B7.1', 'deadline', 'дедлайн: Б7 через 5 дней, осталось 4 урока'],
        '15.09: 4 урока на 4 будня');

      closeLessons(['B7.1'], '2026-09-14');
      State.track('math').lastLessonDate = '2026-09-14';
      State.track('write').lastLessonDate = '2026-09-10';
      eq(why(Waterfall.pick('2026-09-16')), ['B7.2', 'deadline', 'дедлайн: Б7 через 4 дня, осталось 3 урока'],
        '16.09, закрыт только B7.1 → B7.2');

      closeLessons(['B7.2'], '2026-09-15');
      State.track('math').lastLessonDate = '2026-09-15';
      eq(Waterfall.ruleDeadline('2026-09-16'), null, '16.09, закрыты B7.1–B7.2: 2 урока на 3 будня — молчит');
      eq(why(Waterfall.pick('2026-09-16')), ['B8.1', 'fresh', 'свежесть: Письмо и чтение 6 дней'], '→ B8.1 свежестью');
      eq(why(Waterfall.pick('2026-09-17')), ['B7.3', 'deadline', 'дедлайн: Б7 через 3 дня, осталось 2 урока'],
        '17.09, закрыты B7.1–B7.2 → B7.3');

      closeLessons(['B7.3'], '2026-09-17');
      eq(why(Waterfall.pick('2026-09-18')), ['B7.4', 'deadline', 'дедлайн: Б7 через 2 дня, остался 1 урок'],
        '18.09, закрыты B7.1–B7.3 → B7.4');
      eq(Waterfall.ruleDeadline('2026-09-19').reason.text, 'дедлайн: Б7 через 1 день, остался 1 урок', 'сб 19.09 — правило горит');
      eq(Waterfall.pick('2026-09-19').reason.kind, 'contest', 'но субботу по-прежнему берёт К');
      ok(Waterfall.pick('2026-09-20').sunday, 'вс 20.09 — радар-день');
      eq(Waterfall.pick('2026-09-20', { force: true }).reason.text, 'дедлайн: Б7 сегодня', 'по желанию — «сегодня», как раньше');
    });
  });

  describe('2.7.7 Э1: несколько блоков — ранний срок первым, просрочка раньше «заранее»', function () {
    withToday('2026-09-16', function () {
      fresh('2026-09-15');
      closeLessons(['B7.1'], '2026-09-14');
      State.s.blocks.B8.deadline = '2026-09-17';
      eq(why(Waterfall.ruleDeadline('2026-09-16')), ['B8.1', 'deadline', 'дедлайн: Б8 через 1 день, осталось 4 урока'],
        'горят Б7 (20.09) и Б8 (17.09) — первым Б8');
      State.s.blocks.B9.deadline = '2026-09-15';
      eq(Waterfall.ruleDeadline('2026-09-16').reason.text, 'дедлайн: Б9 просрочен на 1 день', 'просроченный Б9 — ещё раньше');

      fresh('2026-09-15');
      State.s.blocks.B8.deadline = '2026-09-20';
      eq(Waterfall.ruleDeadline('2026-09-17').blockId, 'B7', 'равные сроки — младший номер');
      closeLessons(['B7.1'], '2026-09-17');
      eq(why(Waterfall.second('2026-09-17', 'B7.1')), ['B8.1', 'deadline', 'дедлайн: Б8 через 3 дня, осталось 4 урока'],
        'второй урок — Б8 дедлайном');
    });
  });

  describe('2.7.7 Э1: блок без срока и закрытый блок не горят', function () {
    withToday('2026-09-18', function () {
      fresh('2026-09-15');
      State.setDeadline('B7', null);
      eq(Waterfall.ruleDeadline('2026-09-18'), null, 'Б7 без срока — молчит');
      State.setDeadline('B7', '2026-09-20');
      closeBlock('B7', '2026-09-17');
      eq(Waterfall.ruleDeadline('2026-09-19'), null, 'Б7 закрыт — молчит');
    });
  });

  describe('2.7.7 Э1: общий блок под правило подпадает (26.01.2027)', function () {
    withToday('2027-01-26', function () {
      fresh('2027-01-24');
      ['B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B53'].forEach(function (b) { closeBlock(b, '2027-01-10'); });
      eq(why(Waterfall.pick('2027-01-26')), ['B16.1', 'deadline', 'дедлайн: Б16 через 4 дня, осталось 4 урока'],
        'вт 26.01, свои блоки Ф1 закрыты: 4 урока Б16 на 4 будня → B16.1');
      // на живой копии B16.1 закрыт 10.09: три урока на четыре будня — урок тот же Б16, но шаблоном
      closeLessons(['B16.1'], '2026-09-10');
      eq(Waterfall.ruleDeadline('2027-01-26'), null, 'закрыт B16.1 — 26.01 дедлайн ещё молчит');
      ok(/^B16\./.test(Waterfall.pick('2027-01-26').lessonId), 'а урок дня всё равно Б16');
      eq(Waterfall.pick('2027-01-27').reason.text, 'дедлайн: Б16 через 3 дня, осталось 3 урока', 'с 27.01 — дедлайном');
    });
  });

  describe('2.7.7 Э1: общий блок вторым уроком не глушит правила ниже', function () {
    withToday('2026-09-15', function () {
      fresh('2026-09-14');
      State.s.blocks.B7.deadline = '2026-09-27';
      State.s.blocks.B16.deadline = '2026-09-18';
      eq(Waterfall.ruleDeadline('2026-09-15').blockId, 'B16', 'первым уроком Б16 горит заранее');
      closeLessons(['B7.1'], '2026-09-15');
      var r = Waterfall.second('2026-09-15', 'B7.1');
      ok(r && r.lessonId && !/^B16\./.test(r.lessonId), 'второй урок — не пустой и не общий блок: ' + (r && r.lessonId));
    });
  });

  State.reset();
  State.syncContent();
})();
