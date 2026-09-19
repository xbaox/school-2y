/* 2.7.8, этап Б4: один помощник учебных дней — U.schoolDay / U.schoolDays /
   U.nextSchoolDay и режим дня State.lessonMode.

   В 2.7.7 учебные дни были пн–пт во всех режимах, и считали их два места
   каждое по-своему: Waterfall.schoolDays (дедлайн заранее) и подпись
   «программный урок … — в понедельник» в app.js. Теперь таблица одна: режим
   «Школа» — пн–пт, «Лето» и «Мост» — дни уроков шаблона недели (пн–сб).
   Режим дня — «Мост» по фазе, иначе переключатель Лето/Школа. В «Школе»
   результаты те же, что в 2.7.7. */

(function () {
  'use strict';

  var MON = '2026-09-14', THU = '2026-09-17', FRI = '2026-09-18', SAT = '2026-09-19', SUN = '2026-09-20';

  /** Счёт 2.7.7 (Waterfall.schoolDays до Б4) — эталон режима «Школа». */
  function legacyDays(from, to) {
    var total = U.diffDays(from, to) + 1;
    if (total <= 0) return 0;
    var n = Math.floor(total / 7) * 5, wd = U.weekday(from);
    for (var i = 0; i < total % 7; i++) if ((wd - 1 + i) % 7 < 5) n++;
    return n;
  }

  /** Подпись 2.7.7 (nextSchoolDayWord до Б4) — эталон режима «Школа». */
  function legacyWord(t) {
    var next = U.addDays(t, 1);
    while (U.weekday(next) > 5) next = U.addDays(next, 1);
    return U.diffDays(t, next) === 1 ? 'завтра' : 'в понедельник';
  }

  /** Счёт перебором дней — эталон любого режима. */
  function byDays(from, to, mode) {
    var n = 0;
    for (var d = from; d <= to; d = U.addDays(d, 1)) if (U.schoolDay(d, mode)) n++;
    return n;
  }

  /**
   * Уроки К закрыты: таблица учебных дней проверяется без субботы, отданной К
   * (2.8.0, A3 — субботу К не считает ни один режим; это — в cases.schooldays-280.js).
   */
  function noK() {
    State.activeLessons('B53').forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: '2026-09-05' }; });
  }

  function fresh(mode) {
    State.reset();
    State.syncContent();
    State.setMode(mode);
    noK();
  }

  // и для сцен ниже, что читают таблицу без fresh
  State.reset();
  State.syncContent();
  noK();

  describe('2.7.8 Б4: учебный день по режиму — одна таблица', function () {
    var week = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return U.addDays(MON, i); });
    function row(mode) { return week.map(function (d) { return U.schoolDay(d, mode); }); }
    eq(row('school'), [true, true, true, true, true, false, false], 'школа: пн–пт');
    eq(row('summer'), [true, true, true, true, true, true, false], 'лето: пн–сб');
    eq(row('bridge'), [true, true, true, true, true, true, false], 'мост: пн–сб');
    eq([row(undefined), row('winter')], [row('school'), row('school')], 'режим не указан или не из таблицы — как школа (счёт 2.7.7)');

    // «дни уроков шаблона» — ровно те, где у Waterfall.WEEK есть дорожка
    var template = [1, 2, 3, 4, 5, 6, 7].filter(function (wd) { return !!Waterfall.WEEK[wd]; });
    eq(template, [1, 2, 3, 4, 5, 6], 'шаблон недели ставит урок пн–сб, воскресенье — радар-день');
    eq([U.SCHOOL_WEEKDAYS.summer, U.SCHOOL_WEEKDAYS.bridge], [template, template], 'лето и мост = дни уроков шаблона недели');
    eq(U.SCHOOL_WEEKDAYS.school, template.filter(function (wd) { return wd !== 6; }), 'школа = шаблон без субботы (К)');
  });

  describe('2.7.8 Б4: U.schoolDays — школа как в 2.7.7, лето и мост с субботой', function () {
    var bad = { school: [], summer: [], bridge: [], none: [] }, pairs = 0;
    for (var a = 0; a < 14; a++) {
      var from = U.addDays(MON, a);
      for (var b = -3; b <= 45; b++) {
        var to = U.addDays(from, b);
        pairs++;
        if (U.schoolDays(from, to, 'school') !== legacyDays(from, to)) bad.school.push(from + '→' + to);
        if (U.schoolDays(from, to) !== legacyDays(from, to)) bad.none.push(from + '→' + to);
        if (U.schoolDays(from, to, 'summer') !== byDays(from, to, 'summer')) bad.summer.push(from + '→' + to);
        if (U.schoolDays(from, to, 'bridge') !== byDays(from, to, 'bridge')) bad.bridge.push(from + '→' + to);
      }
    }
    eq(pairs, 686, 'перебор: 14 стартов × 49 сроков');
    eq(bad, { school: [], summer: [], bridge: [], none: [] },
      'школа и режим без имени совпадают со счётом 2.7.7, лето и мост — с перебором дней');

    eq(U.schoolDays(MON, SUN, 'school'), 5, 'школа: неделя — пять');
    eq(U.schoolDays(MON, SUN, 'summer'), 6, 'лето: неделя — шесть');
    eq(U.schoolDays(SAT, SUN, 'school'), 0, 'школа: сб–вс — ноль');
    eq(U.schoolDays(SAT, SUN, 'bridge'), 1, 'мост: сб–вс — суббота');
    eq(U.schoolDays(MON, '2026-09-27', 'summer'), 12, 'лето: две недели — двенадцать');
    eq(U.schoolDays(SUN, MON, 'summer'), 0, 'срок позади — ноль');
  });

  describe('2.7.8 Б4: U.nextSchoolDay', function () {
    eq([THU, FRI, SAT, SUN].map(function (d) { return U.nextSchoolDay(d, 'school'); }),
      [FRI, '2026-09-21', '2026-09-21', '2026-09-21'], 'школа: чт → пт, пт/сб/вс → пн');
    eq([THU, FRI, SAT, SUN].map(function (d) { return U.nextSchoolDay(d, 'summer'); }),
      [FRI, SAT, '2026-09-21', '2026-09-21'], 'лето: пт → сб, сб/вс → пн');
    eq(U.nextSchoolDay(FRI, 'bridge'), SAT, 'мост: пт → сб');
    eq(U.nextSchoolDay(FRI), '2026-09-21', 'режим не указан — как школа');
  });

  describe('2.7.8 Б4: режим дня — State.lessonMode', function () {
    fresh('school');
    eq([State.lessonMode('2026-09-21'), State.lessonMode('2027-06-28'), State.lessonMode('2027-07-01'),
      State.lessonMode('2027-08-31'), State.lessonMode('2027-09-03'), State.lessonMode('2027-09-10')],
    ['school', 'school', 'bridge', 'bridge', 'bridge', 'school'],
    'школа; мост — по фазе 01.07–31.08.2027 при переключателе «Школа» (и до старта Ф3); Ф3 — снова школа');
    fresh('summer');
    eq([State.lessonMode('2026-08-25'), State.lessonMode('2027-07-15')], ['summer', 'bridge'], 'лето; мост — по фазе и при «Лете»');
  });

  describe('2.7.8 Б4: Waterfall.schoolDays берёт режим дня', function () {
    fresh('school');
    eq(Waterfall.schoolDays(MON, SUN), 5, 'школа — пять');
    eq(Waterfall.schoolDays('2027-07-05', '2027-07-11'), 6, 'неделя моста — шесть и при переключателе «Школа»');
    fresh('summer');
    eq(Waterfall.schoolDays(MON, SUN), 6, 'лето — шесть');
    eq(Waterfall.schoolDays(MON, SUN, 'school'), 5, 'режим передан явно — он главнее');
  });

  describe('2.7.8 Б4: дедлайн заранее — летом суббота в счёт, в школе как 2.7.7', function () {
    function scene(mode) {
      fresh(mode);
      State.s.meta.onboardedAt = '2026-08-22';
      ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach(function (b) {
        State.activeLessons(b).forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: '2026-09-05' }; });
        State.refreshBlockDone(b);
      });
      State.s.tracks.forEach(function (t) { if (!t.embedded) t.lastLessonDate = '2026-09-13'; });
    }
    function text(r) { return r ? r.reason.text : null; }
    withToday('2026-09-15', function () {
      scene('school');
      eq(State.block('B7').deadline, SUN, 'срок Б7 — вс 20.09, в блоке 4 урока');
      eq(text(Waterfall.ruleDeadline(MON)), null, 'школа, пн: 4 урока на 5 будней — молчит (как 2.7.7)');
      eq(text(Waterfall.ruleDeadline('2026-09-15')), 'дедлайн: Б7 через 5 дней, осталось 4 урока',
        'школа, вт: 4 урока на 4 будня — горит (как 2.7.7)');
      scene('summer');
      eq(Waterfall.ruleDeadline('2026-09-15'), null, 'лето, вт: 4 урока на 5 дней (вт–сб) — молчит');
      eq(text(Waterfall.ruleDeadline('2026-09-16')), 'дедлайн: Б7 через 4 дня, осталось 4 урока', 'лето, ср: 4 на 4 (ср–сб) — горит');
    });
  });

  /* ---------- подпись «программный урок … — завтра / в понедельник» ---------- */

  function lessonSub(iso) {
    return App.planItems(iso, State.day(iso)).filter(function (i) { return i.tick === 'lesson'; })[0].sub;
  }

  /** День ДЗ-урока: переехавший урок и хвост подписи после « — ». */
  function tail(iso, mode) {
    return withToday(iso, function () {
      fresh(mode);
      var d = State.day(iso, true);
      d.level = 'norm';
      if (U.weekday(iso) === 7) d.forceLesson = true;
      var cur = Lesson.current(iso);
      State.startHw('MHF4U', iso, cur && cur.lessonId);
      var code = State.lessonLabel(cur.lessonId);
      var sub = lessonSub(iso), head = 'норма закрыта ДЗ-уроком · программный урок ' + code + ' — ';
      return sub.indexOf(head) === 0 ? sub.slice(head.length) : sub;
    });
  }

  describe('2.7.8 Б4: «программный урок … — завтра / в понедельник» по режиму дня', function () {
    var week = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return U.addDays(MON, i); });
    eq(week.map(function (d) { return tail(d, 'school'); }), week.map(legacyWord),
      'школа, пн–вс: подпись та же, что в 2.7.7');
    eq(tail(FRI, 'school'), 'в понедельник', 'школа, пятница — в понедельник');
    eq(tail(THU, 'school'), 'завтра', 'школа, четверг — завтра');
    eq(tail('2026-08-28', 'summer'), 'завтра', 'лето, пятница 28.08 — завтра: суббота — день урока шаблона');
    eq(tail('2026-08-29', 'summer'), 'в понедельник', 'лето, суббота — в понедельник: воскресенье — радар');
    eq(tail('2027-07-02', 'school'), 'завтра', 'мост, пятница 02.07.2027 — завтра, хоть переключатель на «Школе»');
  });

  describe('2.7.8 Б4: дедлайн и подпись читают одну таблицу U.SCHOOL_WEEKDAYS', function () {
    var keep = U.SCHOOL_WEEKDAYS.school;
    var seen = null;
    try {
      // суббота на время проверки — учебный день школы: оба места должны это увидеть
      U.SCHOOL_WEEKDAYS.school = [1, 2, 3, 4, 5, 6];
      seen = [withToday(MON, function () { fresh('school'); return Waterfall.schoolDays(MON, SUN); }), tail(FRI, 'school')];
    } finally {
      U.SCHOOL_WEEKDAYS.school = keep;
    }
    eq(seen, [6, 'завтра'], 'Waterfall.schoolDays и подпись ДЗ-дня меняются вместе с таблицей');
    eq([U.schoolDays(MON, SUN, 'school'), tail(FRI, 'school')], [5, 'в понедельник'], 'таблица возвращена — снова пн–пт');
  });

  describe('2.7.8 Б4: «Кто получает урок дня» — учебные дни по режиму', function () {
    var cond = Waterfall.EXPLAIN[1].cond;
    ok(cond.indexOf('учебных дней до срока (в «Школе» пн–пт, летом и в «Мосту» пн–сб)') > 0, 'условие дедлайна называет учебные дни режимов');
    eq(cond.indexOf('будних'), -1, '«будних дней» ушло');
  });

  State.reset();
  State.syncContent();
})();
