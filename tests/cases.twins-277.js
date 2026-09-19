/* 2.7.7, этап 10: кириллические двойники в заголовке ИТОГа — латиница.
   «=== ИТОГ УРОКА В7.1 ===» с кириллической В принимается при ожидании B7.1. */

(function () {
  'use strict';

  var MON = '2026-09-14', TUE = '2026-09-15', WED = '2026-09-16',
    THU = '2026-09-17', FRI = '2026-09-18';

  function fresh(stage) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage(stage || 'S1');
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'т', words: [], debts: [], cleared: [],
      warmup: [], checklist: null, stretch: null, writing: '', raw: ''
    }, over || {});
  }

  function itog(header) {
    return [header, 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10', 'Слова: slope — наклон', '=== КОНЕЦ ==='].join('\n');
  }

  /* ============ Э8: SCHOOL_COURSES по умолчанию ============ */


  describe('2.7.7 Э10: кириллические двойники в заголовке — латиница', function () {
    fresh('S0');
    eq(PROMPTS.parse(itog('=== ИТОГ УРОКА В7.1 ==='), 'B7.1').ok, true, 'В7.1 с кириллической В принят за B7.1');
    eq(PROMPTS.parse(itog('=== ИТОГ УРОКА в7.1 ==='), 'B7.1').ok, true, 'и строчная в — тоже');
    eq(PROMPTS.parse(itog('=== ИТОГ УРОКА В53.1 ==='), 'B53.1').ok, true, 'В53.1 → B53.1');
    eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Б7.1 ==='), 'B7.1').ok, true, 'Б7.1 — как было');
    eq(PROMPTS.parse(itog('=== ИТОГ УРОКА К.1 ==='), 'B53.1').ok, true, 'К.1 — как было');

    eq(PROMPTS.parse(itog('=== ИТОГ УРОКА В7.1 ==='), 'B7.10').ok, false, 'В7.1 не выдаёт себя за B7.10');
    eq(PROMPTS.parse(itog('=== ИТОГ УРОКА В7.2 ==='), 'B7.1').ok, false, 'чужой номер — отказ');
    eq(PROMPTS.parse(itog('=== ИТОГ УРОКА К.2 ==='), 'B53.1').ok, false, 'К.2 при ожидании К.1 — отказ');

    var HW = 'HW-2026-09-11-math';
    State.startHw('MHF4U', '2026-09-11', 'B7.1');
    // 2.7.8: подпись ДЗ-урока принимается только в его день
    withToday('2026-09-11', function () {
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА НW-2026-09-11-mаth ==='), HW).ok, true, 'id ДЗ с кириллическими Н и а');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · МНF4U ==='), HW).ok, true, 'код курса с кириллическими М и Н');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ==='), HW).ok, true, 'подпись с карточки — как было');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Домашнее задание школы · MHF4U ==='), HW).ok, true,
        'название из промпта — как было');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · ENG2D ==='), HW).ok, false, 'чужой курс — отказ');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА HW-2026-09-10-math ==='), HW).ok, false, 'ДЗ другого дня — отказ');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА В7.1 ==='), HW).ok, false, 'программный урок за ДЗ не проходит');
    });
  });

  describe('2.7.7 Э10: ни одна подпись не принимается за чужой урок', function () {
    fresh('S0');
    var ids = [];
    CONTENT.allBlocks().forEach(function (b) {
      CONTENT.lessons(b.id).forEach(function (l) { ids.push(l.id || l); });
    });
    ok(ids.length > 50, 'все уроки контента: ' + ids.length);
    var bad = [];
    ids.forEach(function (a) {
      var names = [a, State.lessonLabel(a)];
      ids.forEach(function (b) {
        if (a === b) return;
        names.forEach(function (n) { if (PROMPTS.headerMatches(n, b)) bad.push(n + ' → ' + b); });
      });
    });
    eq(bad, [], 'ложных совпадений между разными уроками нет');
  });

  State.reset();
  State.syncContent();
})();
