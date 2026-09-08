/* 2.7.3, п. 2.4: чистка. Вторым уроком дня общий блок не берётся, а списки
   показанных долгов при загрузке теряют всё, что уже не открыто. */

(function () {
  'use strict';

  var WED = '2026-09-16';          // среда фазы Ф1

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], checklist: null, stretch: null,
      writing: '', raw: ''
    }, over || {});
  }

  /* ============ мёртвый код ============ */

  describe('чистка: удалённые функции и поля', function () {
    fresh();
    eq(typeof CONTENT.pack, 'undefined', 'CONTENT.pack убран — вызовов не было');
    eq(typeof CONTENT.hasLessons, 'undefined', 'CONTENT.hasLessons тоже');
    ok(typeof CONTENT.phaseBlocks === 'function', 'а phaseBlocks остался: его зовёт водопад');
    eq(CONTENT.lesson('B2.1').n, undefined, 'мёртвое поле lesson.n больше не пишется');
  });

  /* ============ second(): общий блок ============ */

  describe('второй урок дня: общий блок вторым не берётся', function () {
    fresh();
    var normal = Waterfall.second(WED, 'B1.1');
    ok(!normal || State.lessonTrack(normal.lessonId) !== 'all',
      'в обычный день вторым идёт настоящая дорожка');

    // закрываем в Ф1 всё, кроме общего блока B16 «Финалы семестра»:
    // единственный оставшийся урок — из блока track: 'all'
    var all = null;
    CONTENT.allBlocks().forEach(function (b) {
      if (b.track === 'all') { if (b.phase === 'p1') all = b; return; }
      b.lessons.forEach(function (l) {
        State.s.lessons[l.id] = { done: true, score: 8, date: '2026-09-09' };
      });
    });
    ok(all && all.lessons.length, 'общий блок в фазе есть — есть что проверять');
    eq(State.lessonTrack(all.lessons[0].id), 'all', 'и дорожка у него общая');

    var res = Waterfall.second(WED, 'B2.1');
    ok(!res, 'вторым уроком общий блок не отдаётся — лучше ни одного');
  });

  /* ============ чистка injected при загрузке ============ */

  describe('чистка injected: остаются только открытые долги', function () {
    fresh();
    State.applySummary('B2.1', summary({
      debts: ['М1 — путает знак наклона', 'М2 — теряет знак при переносе']
    }), { date: '2026-09-14' });

    var open = State.openDebts();
    eq(open.length, 2, 'два долга в банке');
    var alive = open[0].did, dead = open[1].did;

    var raw = JSON.parse(JSON.stringify(State.s));
    raw.debts.forEach(function (d) { if (d.did === dead) d.status = 'closed'; });
    raw.injected.min = [alive, dead, 'D-999'];
    raw.injected.lessons['B2.2'] = [alive, dead];
    raw.injected.lessons['B2.3'] = [dead];

    var out = State.migrate(raw);
    eq(out.injected.min, [alive], 'из разминки ушли закрытый и несуществующий');
    eq(out.injected.lessons['B2.2'], [alive], 'из списка урока ушёл закрытый');
    eq(out.injected.lessons['B2.3'], [],
      'пустой список остаётся списком: «гасить нечего» — не то же самое, что «без ограничений»');
    ok('B2.3' in out.injected.lessons, 'ключ урока не удаляется');

    var again = State.migrate(JSON.parse(JSON.stringify(out)));
    eq(again.injected.min, [alive], 'повторный прогон ничего не меняет');
    eq(again.injected.lessons['B2.2'], [alive], 'и списки уроков тоже');
  });
})();
