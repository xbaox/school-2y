/* v2.6.4: дедлайн блока — первый приоритет выбора урока. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary() {
    return {
      score: 8, level: 'L2', topics: 'т', words: [], debts: [],
      cleared: [], warmup: [], writing: '', raw: ''
    };
  }

  /** Живое состояние 27.08: закрыты пять уроков начала Ф0, Б2.4 висит. */
  function scene() {
    fresh();
    ['B1.1', 'B1.2', 'B2.1', 'B2.2', 'B2.3'].forEach(function (id) {
      State.applySummary(id, summary(), { date: '2026-08-25' });
    });
  }

  var T = '2026-08-27';   // четверг; дедлайн Б2 — ровно этот день

  describe('2.6.4: дедлайн сегодня забирает урок', function () {
    scene();
    eq(State.block('B2').deadline, T, 'у Б2 дедлайн сегодня');
    eq(Waterfall.nextInBlock('B2'), 'B2.4', 'и в нём остался незакрытый урок');

    // до релиза сюда дотягивался только светофор, а он ловит лишь красный
    var st = PACE.status({ remaining: 1, deadline: T, today: T, mode: 'summer' });
    eq(st.color, 'yellow', 'один урок в последний день — «впритык», не красный');

    var r = Waterfall.ruleDeadline(T);
    ok(r, 'правило сработало');
    eq(r.lessonId, 'B2.4', 'взяло незакрытый урок горящего блока');
    eq(r.reason.kind, 'deadline', 'причина — дедлайн');
    eq(r.reason.text, 'дедлайн: Б2 сегодня', 'ярлык называет блок и срок');
    eq(Lesson.whyText(r.reason.text), 'дедлайн · Б2 сегодня', 'на бейдже — «выбор: дедлайн · Б2 сегодня»');

    var pick = Waterfall.pick(T, { force: true });
    eq(pick.lessonId, 'B2.4', 'весь выбор дня отдан горящему блоку');
    eq(pick.reason.kind, 'deadline', 'и причина та же');
  });

  describe('2.6.4: просроченный дедлайн — тот же приоритет', function () {
    scene();
    var late = '2026-08-30';        // через три дня после дедлайна Б2
    var r = Waterfall.ruleDeadline(late);
    eq(r.lessonId, 'B2.4', 'просроченный блок тоже забирает урок');
    eq(r.reason.text, 'дедлайн: Б2 просрочен на 3 дня', 'ярлык считает дни просрочки');

    // и Б1 просрочен на день позже — очередь по дате дедлайна
    var later = '2026-09-02';
    eq(State.block('B1').deadline, '2026-08-29', 'у Б1 дедлайн позже, чем у Б2');
    eq(Waterfall.ruleDeadline(later).lessonId, 'B2.4', 'первым идёт блок с более ранним сроком');

    State.applySummary('B2.4', summary(), { date: later });
    eq(Waterfall.ruleDeadline(later).lessonId, 'B1.3', 'закрыли Б2 — очередь дошла до Б1');
  });

  describe('2.6.4: дедлайн далеко — старое поведение сохраняется', function () {
    scene();
    var early = '2026-08-26';       // за день до дедлайна Б2
    eq(Waterfall.ruleDeadline(early), null, 'правило молчит, пока срок не наступил');

    var pick = Waterfall.pick(early, { force: true });
    ok(pick.reason.kind !== 'deadline', 'выбор делают прежние правила: ' + pick.reason.kind);

    // блок без дедлайна правило тоже не трогает
    var keep = State.block('B2').deadline;
    State.setDeadline('B2', null);
    eq(Waterfall.ruleDeadline(T), null, 'блок без дедлайна не горит');
    State.setDeadline('B2', keep);

    // закрытый блок не поднимает тревогу, даже если срок прошёл
    State.applySummary('B2.4', summary(), { date: T });
    eq(Waterfall.ruleDeadline(T), null, 'все уроки блока закрыты — правило молчит');
  });

  describe('2.6.4: два блока с дедлайном сегодня', function () {
    scene();
    State.setDeadline('B1', T);     // теперь горят и Б1, и Б2
    eq([State.block('B1').deadline, State.block('B2').deadline], [T, T], 'оба срока — сегодня');

    var r = Waterfall.ruleDeadline(T);
    eq(r.lessonId, 'B1.3', 'при равных сроках первым идёт младший блок');
    eq(r.reason.text, 'дедлайн: Б1 сегодня', 'ярлык про него же');

    // второй урок полной берёт другую дорожку — и там снова горящий блок
    var second = Waterfall.second(T, 'B1.3');
    eq(second.lessonId, 'B2.4', 'вторым идёт горящий блок другой дорожки');
    eq(second.reason.kind, 'deadline', 'и тоже по дедлайну');

    // закрыли Б1 — очередь переходит к Б2
    State.applySummary('B1.3', summary(), { date: T });
    State.applySummary('B1.4', summary(), { date: T });
    eq(Waterfall.ruleDeadline(T).lessonId, 'B2.4', 'дальше горит Б2');
  });

  describe('2.6.4: правило встало первым и объясняет себя', function () {
    fresh();
    var html = Waterfall.fullBars();       // просто чтобы модуль был жив
    ok(html, 'модуль водопада отвечает');

    // порядок правил виден в шторке «Кто получает урок дня».
    // С 2.7.0 первой стоит суббота ⭐: блок К дедлайна не имеет вовсе,
    // и любое правило ниже забрало бы субботу себе
    var kinds = ['contest', 'deadline', 'radar', 'fresh', 'pace', 'debts', 'plan'];
    eq(Waterfall.EXPLAIN.map(function (r) { return r.kind; }), kinds, 'суббота ⭐, за ней дедлайн');
    eq(Waterfall.EXPLAIN.map(function (r) { return r.n; }), [1, 2, 3, 4, 5, 6, 7], 'нумерация подряд');
    eq(Waterfall.EXPLAIN[1].name, 'Дедлайн', 'дедлайн называется понятно');
    ok(Waterfall.EXPLAIN[1].cond.indexOf('срок блока сегодня или позади') === 0, 'условие описано');
  });
})();
