/* 2.7.7, этап 8: курс информатики по умолчанию — ICS3UE с именем из миграции M1. */

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

  describe('2.7.7 Э8: свежая установка — ICS3UE с именем из M1', function () {
    fresh();
    var cs = State.schoolCourses().filter(function (c) { return c.track === 'cs'; });
    eq(cs, [{ code: 'ICS3UE', name: 'Computer Science online — информатика 11 класса, e-learning (Brightspace)',
      track: 'cs', editable: true }], 'курс информатики — ICS3UE, как у M1');
    eq(State.schoolCourse('ICS3U'), null, 'ICS3U в свежем списке нет');
    eq(State.startHw('ICS3UE', TUE).id, 'HW-2026-09-15-cs', 'ДЗ по ICS3UE идёт по дорожке cs');

    // M1 на свежем состоянии — нулевой шаг, а старое состояние приходит к тому же списку
    withToday(TUE, function () {
      State.migrate({ meta: { version: 3, onboardedAt: TUE }, settings: {} });
      eq(State.migrationReport276().m1, 0, 'свежему состоянию M1 нечего переименовывать');

      var old = JSON.parse(JSON.stringify(State.SCHOOL_COURSES));
      old[3] = { code: 'ICS3U', name: 'Computer Science онлайн — информатика, e-learning', track: 'cs', editable: true };
      var st = State.migrate({ meta: { version: 3, onboardedAt: '2026-08-22' }, settings: { schoolCourses: old } });
      eq(st.settings.schoolCourses, State.SCHOOL_COURSES, 'после M1 список старого состояния равен дефолту');
    });
  });

  /* ============ Э9: «программный урок … — в понедельник» ============ */


  State.reset();
  State.syncContent();
})();
