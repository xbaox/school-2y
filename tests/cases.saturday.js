/* 2.7.0 «Корень», этап 5: правило «Суббота ⭐» — конкурсный урок блока К.

   Суббота стоит выше дедлайна намеренно: у блока К дедлайна нет вовсе,
   и любое правило ниже забрало бы этот день себе. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], checklist: null, writing: '', raw: ''
    }, over || {});
  }

  var SAT = '2026-09-12';     // суббота внутри Ф1
  var MON = '2026-09-14';     // понедельник
  var SUN = '2026-09-13';     // воскресенье — радар-день

  describe('2.7.0 суббота: конкурсный урок забирает день', function () {
    fresh();
    eq(U.weekday(SAT), 6, 'это суббота');
    var r = Waterfall.ruleSaturday(SAT);
    ok(r, 'правило сработало');
    eq(r.lessonId, 'B53.1', 'первый незакрытый конкурсный урок');
    eq(r.blockId, 'B53', 'блок К');
    eq(r.reason.kind, 'contest', 'причина — конкурс');
    eq(r.reason.text, 'суббота ⭐: задачи CEMC', 'и подпись');

    var pick = Waterfall.pick(SAT);
    eq(pick.lessonId, 'B53.1', 'весь выбор дня отдан блоку К');
    eq(pick.reason.kind, 'contest', 'причина та же');
    eq(Lesson.whyText(pick.reason.text), 'суббота ⭐ · задачи CEMC', 'на бейдже читается');
  });

  describe('2.7.0 суббота: закрытые уроки К пропускаются по порядку', function () {
    fresh();
    State.applySummary('B53.1', summary(), { date: '2026-09-05' });
    eq(Waterfall.ruleSaturday(SAT).lessonId, 'B53.2', 'следующий по порядку');

    State.applySummary('B53.2', summary(), { date: '2026-09-05' });
    eq(Waterfall.ruleSaturday(SAT).lessonId, 'B53.3', 'и дальше');
  });

  describe('2.7.0 суббота: без конкурсных уроков правило молчит', function () {
    fresh();
    // закрываем весь блок К
    State.activeLessons('B53').forEach(function (l) {
      State.applySummary(l.id, summary(), { date: '2026-09-05' });
    });
    eq(Waterfall.ruleSaturday(SAT), null, 'правило молчит');

    // и суббота идёт как раньше — по шаблону недели (сб — письмо ⭐)
    var pick = Waterfall.pick(SAT);
    ok(pick && pick.lessonId, 'урок всё равно назначен');
    eq(pick.reason.kind === 'contest', false, 'но уже не конкурсный');
  });

  describe('2.7.0 суббота: правило действует только в субботу', function () {
    fresh();
    eq(Waterfall.ruleSaturday(MON), null, 'в понедельник молчит');
    eq(Waterfall.ruleSaturday(SUN), null, 'в воскресенье тоже');
    eq(Waterfall.ruleSaturday('2026-09-11'), null, 'и в пятницу');

    // воскресенье по-прежнему радар-день
    var sun = Waterfall.pick(SUN);
    eq(sun.sunday, true, 'воскресенье — радар-день, как и было');

    // будни выбираются как раньше: конкурсный урок в них не всплывает
    var mon = Waterfall.pick(MON);
    ok(mon.lessonId && mon.lessonId.indexOf('B53') !== 0, 'в понедельник урок не из блока К');
  });

  describe('2.7.0 суббота: горящий дедлайн субботу не отбирает', function () {
    fresh();
    // Б7 просрочен, урок в нём остался — в будни он забрал бы день
    State.setDeadline('B7', '2026-09-01');
    eq(Waterfall.pick(MON).reason.kind, 'deadline', 'в понедельник день у дедлайна');
    eq(Waterfall.pick(SAT).lessonId, 'B53.1', 'а в субботу — у блока К');
  });

  describe('2.7.0 суббота: блок К не мешает будням и дедлайнам', function () {
    fresh();
    // у блока К нет дедлайна — правило дедлайна его не видит
    eq(State.block('B53').deadline, null, 'дедлайна у К нет');
    var ids = Object.keys(State.s.blocks).filter(function (id) {
      return State.s.blocks[id].deadline === null;
    });
    ok(ids.indexOf('B53') >= 0, 'и это единственный такой блок Ф1');
    var r = Waterfall.ruleDeadline(MON);
    ok(!r || r.blockId !== 'B53', 'правило дедлайна блок К не назначает');
  });

  describe('2.7.0 суббота: конкурсный урок в очереди дорожки не всплывает', function () {
    fresh();
    // nextLessonInTrack не трогали: B53 сортируется последним
    ok(String(State.nextLessonInTrack('math')).indexOf('B53') !== 0,
      'обычные уроки математики идут раньше конкурсных');
  });

  State.reset();
  State.syncContent();
})();
