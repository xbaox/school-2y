/* 2.7.8, этап Б1: уроки К — только по субботам.

   К считался своим блоком математики без срока: когда свои блоки математики
   закрыты, шаблон недели, свежесть, радар, долги и запасные пути выбора
   отдавали конкурсные задачи в будни. Теперь урок К назначает только правило
   «Суббота ⭐» (оно не менялось); очередь дорожки уроков К не содержит,
   дедлайн и светофор блок К пропускают, а в свапе «Поменять урок» К —
   отдельная строка. */

(function () {
  'use strict';

  var MON = '2026-09-21', TUE = '2026-09-22', WED = '2026-09-23', THU = '2026-09-24',
    FRI = '2026-09-25', SAT = '2026-09-26', SUN = '2026-09-27';
  var WEEKDAYS = [MON, TUE, WED, THU, FRI];
  var MATH_OWN = ['B7', 'B9', 'B11', 'B13', 'B15'];
  var ALL_OWN = ['B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15'];

  function closeLessons(ids, date) {
    ids.forEach(function (id) { State.s.lessons[id] = { done: true, score: 8, date: date }; });
    ids.forEach(function (id) { State.refreshBlockDone(id.split('.')[0]); });
  }
  function closeBlock(id, date) { closeLessons(State.activeLessons(id).map(function (l) { return l.id; }), date); }

  function summary() {
    return {
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], checklist: null, writing: '', raw: ''
    };
  }

  /** Школа, Ф0 закрыта; blocks — закрыть ещё и эти; все дорожки трогали 19.09. */
  function scene(blocks) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.meta.onboardedAt = '2026-08-22';
    ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].concat(blocks || []).forEach(function (b) { closeBlock(b, '2026-09-19'); });
    State.s.tracks.forEach(function (t) { if (!t.embedded) t.lastLessonDate = '2026-09-19'; });
  }

  function isK(id) { return /^B53\./.test(String(id || '')); }
  function idOf(r) { return r && r.lessonId ? r.lessonId : null; }

  function swapSheet() {
    var got = null, real = UI.sheet;
    UI.sheet = function (o) { got = o; };
    try { Waterfall.openSwap(); } finally { UI.sheet = real; }
    return got;
  }
  function picks(body) {
    return (body.match(/data-pick="[^"]+"/g) || []).map(function (x) { return x.slice(11, -1); });
  }

  describe('2.7.8 Б1: свои блоки математики закрыты — будни без К, суббота с К', function () {
    var got = [];
    WEEKDAYS.forEach(function (d) {
      withToday(d, function () {
        scene(MATH_OWN);
        var first = Waterfall.pick(d);
        ok(first && first.lessonId, U.fmtWeekday(d) + ': урок дня есть — ' + idOf(first));
        var before = first && first.lessonId ? Waterfall.second(d, first.lessonId) : null;
        // второй урок после ИТОГа первого — запасной путь second() идёт в общую очередь
        State.applySummary(first.lessonId, summary(), { date: d });
        var after = Lesson.dayLesson(2, d);
        got.push([U.fmtWeekday(d), isK(idOf(first)), isK(idOf(before)), isK(idOf(after))]);
      });
    });
    eq(got, [['пн', false, false, false], ['вт', false, false, false], ['ср', false, false, false],
      ['чт', false, false, false], ['пт', false, false, false]],
    'пн–пт: ни первый, ни второй урок (до и после ИТОГа первого) не из блока К');

    withToday(MON, function () {
      scene(MATH_OWN);
      eq(Waterfall.pick(MON).reason.text, 'шаблон: понедельник — математика без уроков, дальше письмо и чтение',
        'пн: слот математики — у неё остался только К, урок берёт письмо');
      eq(idOf(Lesson.current(MON)), 'B8.1', 'карточка «Сегодня» — тот же урок');
    });
    withToday(SAT, function () {
      scene(MATH_OWN);
      var r = Waterfall.pick(SAT);
      eq([r.lessonId, r.reason.kind, r.reason.text], ['B53.1', 'contest', 'суббота ⭐: задачи CEMC'], 'суббота — К, как раньше');
      ok(!isK(idOf(Waterfall.second(SAT, 'B53.1'))), 'второй урок субботы — не второй К');
    });
    withToday(SUN, function () {
      scene(MATH_OWN);
      ok(Waterfall.pick(SUN).sunday, 'воскресенье — радар-день');
      ok(!isK(idOf(Waterfall.pick(SUN, { force: true }))), '«всё равно хочу урок» в воскресенье — не К');
    });
  });

  describe('2.7.8 Б1: неделя подряд — каждый урок закрывается тем же днём', function () {
    function week(blocks) {
      var log = [];
      withToday(MON, function () { scene(blocks); });
      [MON, TUE, WED, THU, FRI, SAT, SUN].forEach(function (d) {
        withToday(d, function () {
          if (U.weekday(d) === 7) State.day(d, true).forceLesson = true;
          var ids = [];
          [1, 2].forEach(function (n) {
            var r = Lesson.dayLesson(n, d);
            if (!r || !r.lessonId) return;
            ids.push(r.lessonId);
            State.applySummary(r.lessonId, summary(), { date: d });
          });
          log.push([U.fmtWeekday(d), ids.filter(isK).length, ids.length]);
        });
      });
      return log;
    }
    var log = week(MATH_OWN);
    eq(log.filter(function (x) { return x[0] !== 'сб' && x[1]; }), [], 'свои блоки математики закрыты: ни одного К вне субботы');
    eq(log.filter(function (x) { return x[0] === 'сб'; })[0][1], 1, 'суббота — один урок К');
    ok(log.filter(function (x) { return x[0] !== 'сб' && x[0] !== 'вс'; }).every(function (x) { return x[2] > 0; }),
      'в каждый будний день урок был — у письма свои блоки');

    log = week(ALL_OWN.concat(['B16']));
    eq(log.map(function (x) { return x[2]; }), [0, 0, 0, 0, 0, 1, 0], 'остался только К: будни и воскресенье пустые, суббота — К');
    eq(log[5][1], 1, 'и это урок К');
  });

  describe('2.7.8 Б1: каждое будничное правило пропускает К', function () {
    withToday(MON, function () {
      scene(MATH_OWN);
      eq(State.nextLessonInTrack('math'), 'B16.1', 'очередь математики: после своих блоков — общий Б16, не К');
      eq(State.nextLessonInTrack('math', 'p1', true), null, 'своих уроков математики в фазе нет');
      eq(Waterfall.nextOwnLesson('math', 'p1'), null, 'и у водопада');
      ok(!isK(State.nextLesson()), 'общая очередь — без К');
      eq([State.nextContestLesson(), State.nextContestLesson('p1'), State.nextContestLesson('p2')], ['B53.1', 'B53.1', null],
        'К — своей очередью, в фазе Ф1');
      eq(State.contestBlockId(), 'B53', 'блок К — B53');

      eq(idOf(Waterfall.ruleTemplate(FRI)), 'B8.1', 'шаблон пт: математика без уроков → письмо субботы');
      eq(Waterfall.ruleTemplate(FRI).reason.text, 'шаблон: пятница — математика без уроков, дальше письмо и чтение', 'и причина');

      State.track('math').lastLessonDate = '2026-09-10';
      eq(Waterfall.ruleFreshness(MON), null, 'свежесть: математика 11 дней, но у неё только К — молчит');

      State.s.radar.push({ id: 'ev-k278', course: 'MHF4U', type: 'test', date: TUE, note: '', done: false });
      eq(Waterfall.ruleRadar(MON), null, 'радар: тест MHF4U завтра — у математики только К, молчит');

      for (var i = 0; i < 5; i++) State.s.debts.push({ did: 'D-9' + i, id: 'k278-' + i, track: 'math', status: 'open', text: 'долг ' + i });
      eq(Waterfall.ruleDebts(MON), null, 'долги: пять открытых по математике — молчит');

      ok(!isK(idOf(Waterfall.pick(MON))), 'выбор дня при всех этих сигналах — не К');
    });
  });

  describe('2.7.8 Б1: срок у К, поставленный руками, в будни К не отдаёт', function () {
    withToday(MON, function () {
      scene(MATH_OWN);
      State.setDeadline('B53', WED);
      var r = Waterfall.ruleDeadline(MON);
      ok(!r || r.blockId !== 'B53', 'дедлайн заранее: 10 уроков К на 3 будня — не К');
      eq(Waterfall.rulePace(MON), null, 'светофор: К красный — не назначает');
      ok(!isK(idOf(Waterfall.pick(MON))), 'урок дня — не К');
    });
    withToday(THU, function () {
      scene(MATH_OWN);
      State.setDeadline('B53', WED);
      var r = Waterfall.ruleDeadline(THU);
      ok(!r || r.blockId !== 'B53', 'просроченный К — тоже не К');
      ok(!isK(idOf(Waterfall.pick(THU))), 'урок дня — не К');
    });
    withToday(SAT, function () {
      scene(MATH_OWN);
      State.setDeadline('B53', WED);
      eq(Waterfall.pick(SAT).lessonId, 'B53.1', 'суббота — К');
    });
  });

  describe('2.7.8 Б1: запасные пути — общий блок, затем пусто; К не приходит', function () {
    withToday(TUE, function () {
      scene(ALL_OWN);
      var r = Waterfall.pick(TUE);
      eq([r.lessonId, r.reason.text], ['B16.1', 'шаблон: вторник — письмо и чтение'], 'своих уроков нет ни у кого — общий блок шаблоном');
      eq(Waterfall.second(TUE, 'B16.1'), null, 'второй урок: остались общий блок и К — пусто, не К');

      closeBlock('B16', '2026-09-19');
      eq(Waterfall.pick(TUE), null, 'Б16 закрыт: в будни урока нет — не «следующий по программе» К.1');
      eq(Waterfall.pick(TUE, { exclude: 'write', force: true }), null, 'и запасной путь второго урока');
      eq(State.nextLesson(), null, 'общая очередь пуста');
      eq(State.nextContestLesson(), 'B53.1', 'а К ждёт субботы');
      eq(Lesson.current(TUE), null, 'карточка «Сегодня» урока не назначает');
    });
    withToday(SUN, function () {
      scene(ALL_OWN.concat(['B16']));
      State.day(SUN, true).forceLesson = true;
      eq(Waterfall.pick(SUN), null, 'воскресенье, «всё равно хочу урок» — не К');
    });
    withToday(SAT, function () {
      scene(ALL_OWN.concat(['B16']));
      eq(Waterfall.pick(SAT).lessonId, 'B53.1', 'суббота — К');
    });
  });

  describe('2.7.8 Б1: полоски свежести — у математики только К', function () {
    withToday(MON, function () {
      scene(MATH_OWN);
      eq(Waterfall.hasLessonsNow('math'), false, 'будних уроков у математики нет');
      eq(Waterfall.freshText('math', 2), 'только К по субботам', 'подпись серой полоски называет К');
      eq(Waterfall.hasLessonsNow('write'), true, 'у письма уроки есть');
      eq(Waterfall.freshText('cs', 2), 'нет уроков в этой фазе', 'у информатики — прежняя подпись');
      var bars = Waterfall.fullBars();
      ok(bars.indexOf('только К по субботам') > 0 && bars.indexOf('tdays none') > 0, 'полная полоска — серая, с подписью');
      closeBlock('B53', '2026-09-19');
      eq(Waterfall.freshText('math', 2), 'нет уроков в этой фазе', 'К пройден — прежняя подпись');
    });
  });

  describe('2.7.8 Б1: свап — К отдельной строкой', function () {
    withToday(MON, function () {
      scene(MATH_OWN);
      var o = swapSheet();
      eq(picks(o.body), ['B16.1', 'B8.1', 'B16.1', 'B16.1', 'B53.1'], 'строки дорожек без К, последняя — К');
      ok(o.body.indexOf('К · субботы ⭐') > 0, 'строка подписана');
      ok(o.body.indexOf('К.1 · Алгебра: уравнения, системы, линейные модели') > 0, 'и называет урок');

      // выбор строки К в будни — ручной, и он записывается как свап
      var el = { dataset: { pick: 'B53.1' } };
      var root = fakeNode('div');
      o.onMount(root, function () { });
      root.fire('click', { closest: function () { return el; } });
      var d = State.day(MON);
      eq([d.pick, d.swapped, d.pickReason.kind], ['B53.1', true, 'swap'], 'К выбран вручную');
      eq(Lesson.current(MON).lessonId, 'B53.1', 'и стоит уроком дня');

      closeBlock('B53', '2026-09-19');
      o = swapSheet();
      eq(picks(o.body), ['B16.1', 'B8.1', 'B16.1', 'B16.1'], 'К пройден — выбрать нечего');
      ok(o.body.indexOf('<button class="swap-row" disabled><div class="tname">') >= 0 &&
        o.body.indexOf('уроки К пройдены') > 0, 'строка К остаётся неактивной');
    });
    withToday(MON, function () {
      scene([]);
      var o = swapSheet();
      eq(picks(o.body), ['B7.1', 'B8.1', 'B16.1', 'B16.1', 'B53.1'], 'свои уроки математики открыты — строка К всё равно последней');
    });
  });

  describe('2.7.8 Б1: суббота и объяснение выбора', function () {
    withToday(SAT, function () {
      scene([]);
      eq(Waterfall.pick(SAT).lessonId, 'B53.1', 'свои уроки математики открыты — суббота всё равно К');
      ok(!isK(State.nextLessonInTrack('math')), 'очередь математики — свои блоки');
    });
    ok(Waterfall.EXPLAIN[0].cond.indexOf('в другие дни К не назначается') > 0, 'правило «Суббота ⭐» объясняет будни');
  });

  State.reset();
  State.syncContent();
  describe('2.7.8 ревью: будний день, остался только К — «Сегодня» и «Программа» говорят «в субботу», свап под рукой', function () {
    withToday(TUE, function () {
      scene(ALL_OWN.concat(['B16']));
      State.day(TUE, true).level = 'norm';
      var k = State.nextContestLesson('p1');
      ok(isK(k), 'К открыт: ' + k);
      var code = State.lessonLabel(k), title = CONTENT.lesson(k).title;
      eq(Waterfall.pick(TUE), null, 'будни К не отдают');
      var l1 = App.planItems(TUE, State.day(TUE)).filter(function (x) { return x.id === 'l1'; })[0];
      eq(l1.sub, 'будних уроков нет — ' + code + ' в субботу', 'пункт урока — не «фаза закрыта»');
      ok(l1.body.indexOf('data-swap') >= 0, 'в пункте кнопка свапа — строка К в нём');
      eq(App.nextUp(TUE), 'Дальше: будних уроков нет · ' + code + ' „' + title + '“ — в субботу', 'строка «Дальше»');
      eq(Waterfall.nextLine('math'), 'следующий: только К по субботам · ' + code + ' · ' + title, '«Программа»: у математики — К');
      eq(Waterfall.nextLine('write'), 'следующий: уроков в контенте нет', 'у письма К нет');

      closeBlock('B53', TUE);
      l1 = App.planItems(TUE, State.day(TUE)).filter(function (x) { return x.id === 'l1'; })[0];
      eq(l1.sub, 'уроков в контенте не осталось', 'К закрыт — прежний пункт');
      eq(Waterfall.nextLine('math'), 'следующий: уроков в контенте нет', 'и прежняя строка');
      ok(App.nextUp(TUE).indexOf('Фаза закрыта') === 0, 'и прежняя строка «Дальше»');
    });
  });

  describe('2.8.0 A2: К прошлой фазы — суббота берёт старший незакрытый; свап, «Программа» и «Сегодня» — тот же урок', function () {
    withToday('2027-02-06', function () {
      scene(ALL_OWN.concat(['B16']));
      closeLessons(['B53.1', 'B53.2'], '2027-01-30');
      eq(State.currentPhase(), 'p2', 'идёт Ф2, блока К в ней нет');
      eq(State.saturdayContestLesson(), 'B53.3', 'старший незакрытый К прошлой фазы — К.3');
      var r = Waterfall.pick('2027-02-06');
      eq([r.lessonId, r.reason.text], ['B53.3', 'суббота ⭐: задачи CEMC'], 'суббота Ф2 берёт К.3');
      var rows = picks(swapSheet().body);
      eq(rows[rows.length - 1], 'B53.3', 'строка К в свапе — тот же урок');
      eq(Waterfall.nextLine('math'), 'следующий: только К по субботам · К.3 · ' + CONTENT.lesson('B53.3').title,
        '«Программа» — тот же урок');
      eq(Waterfall.second('2027-02-06', 'B53.3'), null, 'вторым уроком К не берётся');
    });
    withToday('2027-02-09', function () {
      eq(Waterfall.pick('2027-02-09'), null, 'в будни Ф2 К не назначается');
      State.day('2027-02-09', true).level = 'norm';
      var l1 = App.planItems('2027-02-09', State.day('2027-02-09')).filter(function (x) { return x.id === 'l1'; })[0];
      eq(l1.sub, 'будних уроков нет — К.3 в субботу', '«Сегодня» — тот же урок');
    });
    withToday('2027-02-13', function () {
      closeBlock('B53', '2027-02-06');
      eq([State.saturdayContestLesson(), Waterfall.pick('2027-02-13')], [null, null], 'К закрыт — суббота молчит');
      eq(Waterfall.nextLine('math'), 'следующий: уроков в контенте нет', 'и «Программа» — прежняя строка');
    });
  });

  describe('2.8.0 A2: в Ф1 суббота по-прежнему берёт К текущей фазы', function () {
    withToday(SAT, function () {
      scene();
      eq(State.saturdayContestLesson(), State.nextContestLesson('p1'), 'К текущей фазы первым');
      eq(Waterfall.pick(SAT).lessonId, 'B53.1', 'суббота — К.1');
    });
  });

})();
