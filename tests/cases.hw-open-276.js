/* 2.7.6, Э2: ДЗ-урок начат и не закрыт — день 11.09 из экспорта 13.09.
   Сцена повторяет форму живого дня: hw взят кнопкой, промпт был, ИТОГа нет,
   state.hw пуст, уровень дня — минималка. */

(function () {
  'use strict';

  var FRI = '2026-09-11', SAT = '2026-09-12', SUN = '2026-09-13', MON = '2026-09-14';
  var HW = 'HW-2026-09-11-math';
  var LIVE_DAY = {
    hw: HW, level: 'min', addons: [], points: 1, hwMoved: 'B7.1',
    lessons: [], hwCourse: 'MHF4U', minimalSteps: [true, true]
  };

  function summary() {
    return { score: 8, level: 'L2', topics: 'т', words: [], debts: [], cleared: [],
      warmup: [], checklist: null, stretch: null, writing: '', raw: '' };
  }

  /** Живое положение на 13.09: Б1–Б6 закрыты, Б7 не начат, свежесть как в экспорте. */
  function scene() {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach(function (b) {
      State.activeLessons(b).forEach(function (l) {
        State.applySummary(l.id, summary(), { date: '2026-09-08' });
      });
    });
    State.track('math').lastLessonDate = SAT;
    ['write', 'cs', 'biz'].forEach(function (t) { State.track(t).lastLessonDate = '2026-09-10'; });
    State.s.days[FRI] = JSON.parse(JSON.stringify(LIVE_DAY));
  }

  describe('Э2.1: начатый ДЗ-урок не поднимает уровень дня', function () {
    scene();
    // кнопка на дне-минималке пишет только hw-поля
    delete State.s.days[FRI].hw; delete State.s.days[FRI].hwCourse; delete State.s.days[FRI].hwMoved;
    var res = withToday(FRI, function () { return State.startHw('MHF4U', FRI, 'B7.1'); });
    var got = State.s.days[FRI];
    function sorted(o) { return Object.keys(o).sort().map(function (k) { return [k, o[k]]; }); }
    eq(sorted(got), sorted(LIVE_DAY), 'день после кнопки — ровно как в экспорте');
    eq(res.moved, 'B7.1', 'переехавший урок — Б7.1');
    eq([State.day(FRI).level, State.points(FRI)], ['min', 1], '11.09: минималка, 1 очко');
    eq(State.s.hw[HW], undefined, 'в state.hw записи нет');
    eq(State.day(FRI).lessons, [], 'в уроках дня ДЗ-урока нет');
    var done = State.s.stats.lessonsDone;
    ok(State.holdsStreak(FRI), 'серию держит минималка');
    State.s.days[FRI].minimalSteps = [false, false];
    ok(!State.holdsStreak(FRI), 'а сам начатый ДЗ-урок серию не держит');
    State.s.days[FRI].minimalSteps = [true, true];
    eq(State.s.stats.lessonsDone, done, 'счётчик закрытых уроков не тронут');
    eq(App.planItems(FRI, State.day(FRI)).filter(function (i) { return i.tick === 'lesson'; }), [],
      'на минималке пункта «Урок» нет — и «норма закрыта» не пишется');
  });

  describe('Э2.2: сдвинутый Б7.1 возвращается в водопад', function () {
    scene();
    ok(!(State.s.lessons['B7.1'] || {}).done, 'Б7.1 не пройден');
    eq(Waterfall.nextInBlock('B7'), 'B7.1', 'и остаётся следующим в блоке');
    withToday(MON, function () {
      eq(State.block('B7').deadline, '2026-09-20', 'дедлайн Б7 — 20.09');
      eq(Waterfall.ruleDeadline(MON), null, 'правило дедлайна до срока молчит (cases.deadline.js)');
      var p = Waterfall.pick(MON);
      eq(p.lessonId, 'B7.1', '14.09 — Б7.1');
      eq(p.reason.kind, 'pace', 'причина — светофор Б7 (дедлайн 20.09 при 4 уроках)');
    });
    withToday('2026-09-21', function () {
      eq(Waterfall.pick('2026-09-21').reason.text, 'дедлайн: Б7 просрочен на 1 день',
        'правило дедлайна берёт Б7 первым будним днём после срока');
    });

    // hwMoved — только подпись: выбор на следующих днях от него не зависит
    var dates = [SAT, SUN, MON, '2026-09-15', '2026-09-16', '2026-09-18', '2026-09-19', '2026-09-21'];
    function picks() {
      return dates.map(function (iso) {
        return withToday(iso, function () {
          var r = Waterfall.pick(iso);
          return r && (r.lessonId || 'sunday') + '/' + r.reason.kind;
        });
      });
    }
    var a = picks();
    delete State.s.days[FRI].hwMoved; delete State.s.days[FRI].hw;
    eq(picks(), a, 'без hw и hwMoved на 11.09 выбор тот же');
  });

  describe('Э2.3: лимит недели считает начатые ДЗ-уроки', function () {
    scene();
    eq(State.s.hw, {}, 'закрытых ДЗ-уроков нет');
    eq(State.hwWeekCount(FRI), 1, 'неделя 7–13.09: начатый 11.09 уже занял слот');
    eq(State.hwWeekCount(SUN), 1, 'и до конца недели');
    eq(State.hwWeekCount(MON), 0, 'новая неделя — с нуля');
    State.startHw('ENG2D', '2026-09-08');
    State.startHw('GLC2O', '2026-09-09');
    eq(State.hwWeekCount('2026-09-10'), 3, 'три начатых без единого ИТОГа — это три');
    ok(!State.hwAvailable('2026-09-10'), 'четвёртый не даётся');
  });

  describe('Э2.4: Журнал показывает 11.09 как незакрытый ДЗ-урок', function () {
    scene();
    withToday(SUN, function () {
      var html = App.screen('journal').render();
      ok(html.indexOf('ДЗ-урок не закрыт') >= 0, 'строка «ДЗ-урок не закрыт» есть');
      ok(html.indexOf(U.fmtShort(FRI)) >= 0, 'с датой 11.09');
      eq(html.indexOf('итог принят'), -1, 'и не как принятый итог');
      eq(State.s.summaries.filter(function (s) { return s.lessonId === HW; }).length, 0,
        'итога ДЗ-урока нет — проведённым он не показан');
    });
  });

  describe('Э2.5: день 11.09 никто не переписывает', function () {
    scene();
    var before = JSON.stringify(State.s.days[FRI]);
    ['2026-09-11', SAT, SUN, MON, '2026-09-15', '2026-09-21'].forEach(function (iso) {
      withToday(iso, function () {
        App.Today.render(); App.screen('journal').render(); App.hwOffer(iso);
        Lesson.current(iso); Lesson.findPending(iso); State.streak();
      });
    });
    withToday(MON, function () {
      State.setLevel('norm', MON);
      State.applySummary('B7.1', summary(), { date: MON });
    });
    withToday('2026-09-15', function () { State.startHw('MHF4U', '2026-09-15', 'B7.2'); });
    Object.keys(State.s.days).forEach(function (d) { State.recount(d); });
    State.replace(JSON.parse(JSON.stringify(State.s)), true);
    eq(JSON.stringify(State.s.days[FRI]), before, '11.09 без изменений');
    eq(Lesson.findPending(MON), null, 'и «незакрытым уроком» 11.09 не всплывает');
  });
})();
