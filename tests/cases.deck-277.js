/* 2.7.7, этап 3: колода дня делит места, а не раздаёт их по очереди групп.

   До 2.7.7 подошедшие повторы стояли первыми: 14.09 у владельца 21 повтор
   занял все 17 мест слов, и ни одно из 29 слов «в работе» (включая слова
   последнего урока) в колоду не попало. Теперь при кэпе 20 и трёх долгах:
   5 мест — слова последнего урока, затем «в работе», затем прочие новые;
   12 — повторы с наступившим сроком; незанятое отдаётся другой стороне.
   Порядок карточек: резерв → долги → повторы → добор резерва — шаг
   «Карточки» засчитывается на десятой карточке, и в первые десять входят
   5 новых/в работе + 3 долга + 2 повтора. */

(function () {
  'use strict';

  var T = '2026-09-14';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(words, debts) {
    return { score: 8, level: 'L2', topics: 'т', words: words || [], debts: debts || [], cleared: [],
      warmup: [], checklist: null, stretch: null, writing: '', raw: '' };
  }

  function list(n, prefix) {
    var out = [];
    for (var i = 1; i <= n; i++) out.push({ en: prefix + i, ru: 'п' + i });
    return out;
  }

  function setAll(words, rec) {
    words.forEach(function (w) { State.s.srs[w.en] = Object.assign({ status: 'new', streak: 0, step: 0, due: null }, rec); });
  }

  var DEBTS = ['М1 — раз', 'М2 — два', 'М3 — три'];

  /** Каждая карточка колоды одной буквой: F — новое/в работе, R — повтор, D — долг. */
  function kinds(day) {
    return Cards.deck(day).map(function (c) {
      return c.type === 'debt' ? 'D' : (State.wordStatus(c.en) === 'known' ? 'R' : 'F');
    }).join('');
  }

  function ens(ws) { return ws.map(function (w) { return w.en; }); }

  describe('2.7.7 Э3: три долга + 5 новых/в работе + 12 повторов', function () {
    fresh();
    var rev = list(20, 'rev'), work = list(8, 'work'), last = list(3, 'last');
    State.applySummary('B2.1', summary(rev), { date: '2026-09-01' });
    setAll(rev, { status: 'known', streak: 3, due: '2026-09-10' });
    State.applySummary('B2.2', summary(work), { date: '2026-09-05' });
    setAll(work, { status: 'learning' });
    State.applySummary('B2.3', summary(last, DEBTS), { date: '2026-09-12' });

    var p = State.deckPlan(T);
    eq([p.debts.length, p.fresh, p.reviews, p.words.length, p.lead], [3, 5, 12, 17, 5], 'раскладка 3 + 5 + 12');
    var head = ens(p.words.slice(0, p.lead));
    ok(['last1', 'last2', 'last3'].every(function (w) { return head.indexOf(w) >= 0; }), 'все слова последнего урока — в резерве');
    eq(head.filter(function (w) { return /^work/.test(w); }).length, 2, 'остаток резерва — слова в работе');
    eq(kinds(T), 'FFFFFDDDRRRRRRRRRRRR', 'порядок: резерв → долги → повторы');
    eq(kinds(T).slice(0, 10), 'FFFFFDDDRR', 'первые десять карточек — 5 + 3 + 2');
    eq(ens(State.deckPlan(T).words), ens(p.words), 'в пределах дня колода та же');
  });

  describe('2.7.7 Э3: незанятый резерв отдаётся повторам', function () {
    fresh();
    var rev = list(20, 'rev');
    State.applySummary('B2.1', summary(rev), { date: '2026-09-01' });
    setAll(rev, { status: 'known', streak: 3, due: '2026-09-10' });
    State.applySummary('B2.3', summary(list(2, 'last'), DEBTS), { date: '2026-09-12' });
    var p = State.deckPlan(T);
    eq([p.debts.length, p.fresh, p.reviews, p.words.length + p.debts.length], [3, 2, 15, 20], '2 новых — повторов 15');
    eq(kinds(T), 'FFDDDRRRRRRRRRRRRRRR', 'резерв короче — долги сразу за ним');
  });

  describe('2.7.7 Э3: незанятые места повторов отдаются резерву', function () {
    fresh();
    var rev = list(4, 'rev'), work = list(20, 'work');
    State.applySummary('B2.1', summary(rev), { date: '2026-09-01' });
    setAll(rev, { status: 'known', streak: 3, due: '2026-09-10' });
    State.applySummary('B2.2', summary(work, DEBTS), { date: '2026-09-12' });
    var p = State.deckPlan(T);
    eq([p.debts.length, p.fresh, p.reviews, p.lead], [3, 13, 4, 5], '4 повтора — новых 13');
    eq(kinds(T), 'FFFFFDDDRRRRFFFFFFFF', 'добор резерва — после повторов');
  });

  describe('2.7.7 Э3: без долгов — 5 + 15', function () {
    fresh();
    var rev = list(20, 'rev');
    State.applySummary('B2.1', summary(rev), { date: '2026-09-01' });
    setAll(rev, { status: 'known', streak: 3, due: '2026-09-10' });
    State.applySummary('B2.2', summary(list(8, 'last')), { date: '2026-09-12' });
    var p = State.deckPlan(T);
    eq([p.debts.length, p.fresh, p.reviews], [0, 5, 15], 'места долгов — повторам');
  });

  describe('2.7.7 Э3: кто получает места', function () {
    // слова последнего урока: ни разу не оценённые — вперёд оценённых
    fresh();
    var rev = list(20, 'rev');
    State.applySummary('B2.1', summary(rev), { date: '2026-09-01' });
    setAll(rev, { status: 'known', streak: 3, due: '2026-09-10' });
    State.applySummary('B2.2', summary(list(7, 'last'), DEBTS), { date: '2026-09-12' });
    setAll([{ en: 'last1' }, { en: 'last2' }], { status: 'learning', streak: 1 });
    var head = ens(State.deckPlan(T).words.slice(0, 5)).sort();
    eq(head, ['last3', 'last4', 'last5', 'last6', 'last7'], 'пять неоценённых слов урока');

    // в работе: «не знал» последним ответом (streak 0) — вперёд
    fresh();
    State.applySummary('B2.1', summary(rev), { date: '2026-09-01' });
    setAll(rev, { status: 'known', streak: 3, due: '2026-09-10' });
    var work = list(8, 'work');
    State.applySummary('B2.2', summary(work), { date: '2026-09-05' });
    setAll(work, { status: 'learning', streak: 1 });
    ['work2', 'work4', 'work6', 'work7', 'work8'].forEach(function (w) { State.s.srs[w].streak = 0; });
    State.applySummary('B2.3', summary([], DEBTS), { date: '2026-09-12' });
    eq(ens(State.deckPlan(T).words.slice(0, 5)).sort(), ['work2', 'work4', 'work6', 'work7', 'work8'], 'streak 0 — первыми');

    // повторы: самый давний срок первым — шафл мест не разыгрывает
    fresh();
    var old = list(14, 'r');
    State.applySummary('B2.1', summary(old, DEBTS), { date: '2026-09-01' });
    old.forEach(function (w, i) {
      State.s.srs[w.en] = { status: 'known', streak: 3, step: 0, due: U.addDays('2026-08-31', i) };
    });
    var p = State.deckPlan(T);
    eq([p.fresh, p.reviews], [0, 14], 'новых нет — все 14 повторов влезают');
    State.applySummary('B2.2', summary(list(3, 'n')), { date: '2026-09-12' });
    p = State.deckPlan(T);
    eq(p.reviews, 14, '3 новых + 14 повторов + 3 долга = 20');
    State.applySummary('B2.3', summary(list(5, 'm')), { date: '2026-09-13' });
    p = State.deckPlan(T);
    var tail = ens(p.words.slice(p.lead, p.lead + p.reviews));
    eq(p.reviews, 12, 'резерв полон — повторов 12');
    ok(tail.indexOf('r13') < 0 && tail.indexOf('r14') < 0, 'за бортом — два самых поздних срока');
    ok(tail.indexOf('r1') >= 0 && tail.indexOf('r12') >= 0, 'самые давние — в колоде');
  });

  describe('2.7.7 Э3: слова урока, закрытого сегодня, — в колоде сегодня и завтра', function () {
    fresh();
    var rev = list(25, 'rev'), work = list(29, 'work');
    State.applySummary('B2.1', summary(rev), { date: '2026-09-01' });
    setAll(rev, { status: 'known', streak: 3, due: '2026-09-10' });
    State.applySummary('B2.2', summary(work, DEBTS), { date: '2026-09-12' });
    setAll(work, { status: 'learning' });
    var lesson = list(5, 'today');
    State.applySummary('B2.3', summary(lesson), { date: T });
    [T, U.addDays(T, 1)].forEach(function (day) {
      var first10 = Cards.deck(day).slice(0, 10).map(function (c) { return c.en; });
      ok(lesson.every(function (w) { return first10.indexOf(w.en) >= 0; }),
        day + ': все пять слов — в первых десяти карточках');
    });
  });

  describe('2.7.7 Э3: два итога одной датой — последним считается вставленный позже', function () {
    fresh();
    var work = list(10, 'work');
    State.applySummary('B2.1', summary(work), { date: '2026-09-01' });
    setAll(work, { status: 'learning' });
    var rev = list(20, 'rev');
    State.applySummary('B2.2', summary(rev), { date: '2026-09-02' });
    setAll(rev, { status: 'known', streak: 3, due: '2026-09-10' });
    State.applySummary('B2.3', summary(list(5, 'first'), DEBTS), { date: '2026-09-12' });
    State.applySummary('B2.4', summary(list(5, 'second')), { date: '2026-09-12' });
    setAll(list(5, 'first'), { status: 'learning', streak: 1 });
    eq(ens(State.deckPlan(T).words.slice(0, 5)).sort(), ['second1', 'second2', 'second3', 'second4', 'second5'],
      'резерв — словам второго итога');
  });

  State.reset();
  State.syncContent();
})();
