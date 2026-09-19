/* 2.8.0, A3: суббота, отданная К, — не учебный день ни в каком режиме.

   Правило «Суббота ⭐» берёт К (текущей фазы, без него — хвост прошлых). Тогда
   урок блока в субботу не встанет, и U.schoolDay её не считает: дедлайн
   заранее, подпись «— завтра / — в понедельник», доступность ДЗ-урока и
   светофор. В «Школе» субботы в таблице и так нет — там ничего не меняется. */

(function () {
  'use strict';

  var MON = '2026-09-14', THU = '2026-09-17', FRI = '2026-09-18', SAT = '2026-09-19', SUN = '2026-09-20';

  function fresh(mode) {
    State.reset();
    State.syncContent();
    State.setMode(mode);
    State.s.meta.onboardedAt = '2026-08-22';
    ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach(function (b) {
      State.activeLessons(b).forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: '2026-09-05' }; });
      State.refreshBlockDone(b);
    });
    State.s.tracks.forEach(function (t) { if (!t.embedded) t.lastLessonDate = '2026-09-13'; });
  }
  function closeK() {
    State.activeLessons('B53').forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: '2026-09-12' }; });
  }

  describe('2.8.0 A3: суббота К — не учебный день ни в каком режиме', function () {
    withToday(MON, function () {
      fresh('summer');
      ok(!!State.saturdayContestLesson(SAT), 'К в Ф1 открыт');
      eq(['school', 'summer', 'bridge'].map(function (m) { return U.schoolDay(SAT, m); }), [false, false, false],
        'суббота с К — не учебная');
      eq(['school', 'summer', 'bridge'].map(function (m) { return U.schoolDays(MON, SUN, m); }), [5, 5, 5],
        'неделя — пять учебных дней в любом режиме');
      eq(U.nextSchoolDay(FRI, 'summer'), '2026-09-21', 'после пятницы — понедельник');
      closeK();
      eq(State.saturdayContestLesson(SAT), null, 'К закрыт');
      eq([U.schoolDay(SAT, 'summer'), U.schoolDays(MON, SUN, 'summer'), U.nextSchoolDay(FRI, 'summer')],
        [true, 6, SAT], 'летом суббота снова учебная');
      eq([U.schoolDay(SAT, 'school'), U.schoolDays(MON, SUN, 'school')], [false, 5], 'в «Школе» — как было');
    });
  });

  describe('2.8.0 A3: «Лето» в Ф1 — дедлайн заранее субботу К не считает', function () {
    withToday(THU, function () {
      fresh('summer');
      ['B7.1', 'B7.2'].forEach(function (id) { State.s.lessons[id] = { done: true, score: 8, date: '2026-09-15' }; });
      eq(Waterfall.schoolDays(THU, SUN), 2, 'чт–вс: учебных — чт и пт');
      var r = Waterfall.ruleDeadline(THU);
      eq(r && r.reason.text, 'дедлайн: Б7 через 3 дня, осталось 2 урока', '2 урока на 2 учебных дня — горит');
      closeK();
      eq(Waterfall.ruleDeadline(THU), null, 'без К суббота учебная: 2 урока на 3 дня — молчит');
    });
  });

  describe('2.8.0 A3: подпись ДЗ-дня в пятницу летом при К — «в понедельник»', function () {
    withToday(FRI, function () {
      fresh('summer');
      var d = State.day(FRI, true);
      d.level = 'norm';
      var cur = Lesson.current(FRI);
      State.startHw('MHF4U', FRI, cur && cur.lessonId);
      var sub = App.planItems(FRI, State.day(FRI)).filter(function (i) { return i.tick === 'lesson'; })[0].sub;
      ok(/ — в понедельник$/.test(sub), 'суббота отдана К: ' + sub);
    });
  });

  describe('2.8.0 A3: ДЗ-урок — по единой таблице учебных дней', function () {
    fresh('school');
    eq([MON, FRI, SAT, SUN].map(function (d) { return State.hwAvailable(d); }), [true, true, false, false],
      'в «Школе» — пн–пт, как было');
    fresh('summer');
    eq(State.hwAvailable(SAT), false, 'летом суббота с К — нет');
    closeK();
    eq(State.hwAvailable(SAT), true, 'летом суббота без К — учебный день');
  });

  describe('2.8.0 A3: светофор — учебные дни по режиму дня', function () {
    withToday(THU, function () {
      fresh('school');
      ['B7.1', 'B7.2', 'B7.3'].forEach(function (id) { State.s.lessons[id] = { done: true, score: 8, date: '2026-09-15' }; });
      var p = State.blockPace('B7');
      eq([p.daysLeft, p.color], [2, 'red'],
        'Б7: 1 урок, до вс 20.09 учебных — чт и пт; по норме 2/5 урок — это 2,5 учебных дня: красный');
      State.s.lessons['B7.4'] = { done: false };
      State.s.blocks.B7.deadline = '2026-09-22';
      eq([State.blockPace('B7').daysLeft, State.blockPace('B7').color], [4, 'green'], 'до вт 22.09 — четыре учебных дня: запас');
    });
  });

  State.reset();
  State.syncContent();
})();
