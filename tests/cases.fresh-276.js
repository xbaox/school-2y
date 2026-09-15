/* 2.7.6, этап 3: свежесть дорожек и общий блок.

   10.09 информатика, у которой своих блоков в Ф1 нет, «протухла» на 19 дней,
   и свежесть отдала день финалам Б16 (track: 'all'). Теперь общий блок
   назначают только дедлайн и шаблон недели; радар, свежесть, светофор и
   долги смотрят на свои блоки дорожки. Урок 'all' по-прежнему обновляет
   свежесть всем четырём дорожкам. */

(function () {
  'use strict';

  var THU = '2026-09-10', TUE = '2026-09-15';

  function summary() {
    return { score: 8, level: 'L2', topics: 'т', words: [], debts: [], cleared: [], warmup: [],
      checklist: null, stretch: null, writing: '', raw: '' };
  }

  /** Утро 10.09 живой копии: Ф0 закрыта, Ф1 не начата, уроков информатики не было. */
  function scene() {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.s.meta.onboardedAt = '2026-08-22';
    ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach(function (b) {
      State.activeLessons(b).forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: '2026-08-30' }; });
      State.refreshBlockDone(b);
    });
    var last = { math: '2026-09-08', write: '2026-09-03', cs: null, biz: '2026-08-27' };
    State.s.tracks.forEach(function (t) { if (!t.embedded) t.lastLessonDate = last[t.id]; });
  }

  function closeBlock(id, date) {
    State.activeLessons(id).forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: date }; });
    State.refreshBlockDone(id);
  }

  describe('2.7.6 Э3: 10.09 свежесть не отдаёт день финалам Б16', function () {
    withToday(THU, function () {
      scene();
      eq(State.currentPhase(THU), 'p1', 'Ф1');
      eq(State.freshness('cs', THU), 19, 'информатика «ни разу · 19 дней»');
      eq(State.nextLessonInTrack('cs'), 'B16.1', 'в общей очереди у информатики только общий блок');
      eq(['math', 'write', 'cs', 'biz'].map(function (t) { return Waterfall.nextOwnLesson(t, 'p1'); }),
        ['B7.1', 'B8.1', null, null], 'свои уроки фазы: у cs и biz их нет');
      var r = Waterfall.pick(THU);
      eq(r.lessonId, 'B8.1', 'было B16.1 — стало B8.1: день у письма, своя дорожка с уроком в фазе');
      eq(r.reason.text, 'свежесть: Письмо и чтение 7 дней', 'причина — свежесть письма');
      var s2 = Waterfall.second(THU, r.lessonId);
      eq([s2.lessonId, s2.reason.kind], ['B7.1', 'pace'], 'второй урок — Б7.1 светофором, не общий блок');
    });
  });

  describe('2.7.6 Э3: дорожка без своих уроков в фазе в счёт свежести не входит', function () {
    withToday(THU, function () {
      scene();
      State.track('write').lastLessonDate = '2026-09-09';
      var r = Waterfall.pick(THU);
      ok(r.reason.kind !== 'fresh', 'свежесть молчит, хотя у cs 19 дней, у biz 14 — ' + r.reason.text);
      ok(State.lessonTrack(r.lessonId) !== 'all', 'и общий блок не выбран');
    });
  });

  describe('2.7.6 Э3: урок общего блока по-прежнему обновляет свежесть всем', function () {
    withToday(THU, function () {
      scene();
      State.applySummary('B16.1', summary(), { date: THU });
      eq(['math', 'write', 'cs', 'biz'].map(function (id) { return State.track(id).lastLessonDate; }),
        [THU, THU, THU, THU], 'четыре дорожки получили 10.09');
    });
  });

  describe('2.7.6 Э3: радар, светофор и долги общий блок не назначают', function () {
    withToday(TUE, function () {
      // радар: тест по курсу информатики через два дня — своих уроков у cs в Ф1 нет
      scene();
      ['math', 'write', 'biz'].forEach(function (t) { State.track(t).lastLessonDate = '2026-09-14'; });
      State.track('cs').lastLessonDate = '2026-09-14';
      State.s.radar.push({ id: 'ev-cs', course: 'ICS3U', type: 'test', date: '2026-09-17', note: '', done: false });
      var r = Waterfall.pick(TUE);
      ok(r.reason.kind !== 'radar', 'радар по курсу без своих уроков молчит — ' + r.reason.text);
      ok(State.lessonTrack(r.lessonId) !== 'all', 'общий блок не выбран: ' + r.lessonId);

      // радар по математике берёт свой урок, а не общий блок. 2.7.7 (Э1): у Б7
      // 15.09 четыре урока на четыре будня — дедлайн выше радара; срок на неделю позже
      State.s.blocks.B7.deadline = '2026-09-27';
      State.s.radar.push({ id: 'ev-m', course: 'MHF4U', type: 'quiz', date: TUE, note: '', done: false });
      var m = Waterfall.pick(TUE);
      eq([m.lessonId, m.reason.kind], ['B7.1', 'radar'], 'радар MHF4U → Б7.1');

      // светофор: срок Б16 через три дня горит красным, но общий блок светофор не берёт
      scene();
      ['math', 'write', 'cs', 'biz'].forEach(function (t) { State.track(t).lastLessonDate = '2026-09-14'; });
      State.s.blocks.B16.deadline = '2026-09-18';
      eq(State.blockPace('B16').color, 'red', 'Б16 красный');
      var p = Waterfall.pick(TUE);
      ok(State.lessonTrack(p.lessonId) !== 'all' || p.reason.kind === 'deadline' || p.reason.kind === 'plan',
        'светофор общий блок не назначил: ' + p.lessonId + ' · ' + p.reason.text);

      // долги: у письма шесть открытых, но свои блоки письма в фазе закрыты
      scene();
      ['math', 'write', 'cs', 'biz'].forEach(function (t) { State.track(t).lastLessonDate = '2026-09-14'; });
      ['B8', 'B10', 'B12', 'B14'].forEach(function (b) { closeBlock(b, '2026-09-14'); });
      State.s.blocks.B7.deadline = '2026-12-31';   // светофор Б7 не должен перехватить день раньше долгов
      for (var i = 0; i < 6; i++) {
        State.s.debts.push({ id: 'dw' + i, did: 'D-' + (90 + i), cat: 'П' + ((i % 3) + 1), track: 'write',
          text: 'т', createdIn: 'B8.1', clearedIn: [], failedIn: [], examples: [], status: 'open' });
      }
      eq(Waterfall.nextOwnLesson('write', 'p1'), null, 'своих уроков письма в Ф1 не осталось');
      var d = Waterfall.pick(TUE);
      ok(d.reason.kind !== 'debts', 'правило долгов молчит — ' + d.reason.text);
      ok(State.lessonTrack(d.lessonId) !== 'all' || d.reason.kind === 'plan',
        'общий блок — только шаблоном: ' + d.lessonId + ' · ' + d.reason.text);
    });
  });

  describe('2.7.6 Э3: шаблон недели и дедлайн общий блок по-прежнему берут', function () {
    // четверг: информатика/бизнес по шаблону — у них только общий блок.
    // 2.7.7 (Э2): слот без своих уроков пропускается — пятница, математика;
    // общий блок шаблон отдаёт, когда своих уроков нет ни у одной дорожки
    withToday('2026-09-17', function () {
      scene();
      ['math', 'write', 'cs', 'biz'].forEach(function (t) { State.track(t).lastLessonDate = '2026-09-16'; });
      State.s.blocks.B7.deadline = '2026-12-31';
      var r = Waterfall.pick('2026-09-17');
      eq([r.lessonId, r.reason.kind], ['B9.1', 'plan'], 'четверг без уроков инфы и бизнеса — математика пятницы');
      ['B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B53'].forEach(function (b) { closeBlock(b, '2026-09-16'); });
      r = Waterfall.pick('2026-09-17');
      eq([r.lessonId, r.reason.kind], ['B16.1', 'plan'], 'своих уроков нет ни у кого — шаблон даёт Б16.1');
    });
    withToday(TUE, function () {
      scene();
      ['math', 'write', 'cs', 'biz'].forEach(function (t) { State.track(t).lastLessonDate = '2026-09-14'; });
      State.s.blocks.B16.deadline = '2026-09-14';
      var r = Waterfall.pick(TUE);
      eq([r.lessonId, r.reason.kind], ['B16.1', 'deadline'], 'просроченный Б16 берёт дедлайн');
    });
  });

  describe('2.7.6 Э3: полоски свежести не зовут к дорожке без своих уроков', function () {
    withToday('2026-09-20', function () {
      scene();
      eq([Waterfall.hasLessonsNow('cs'), Waterfall.hasLessonsNow('biz')], [false, false], 'cs и biz — уроков в фазе нет');
      eq([Waterfall.hasLessonsNow('math'), Waterfall.hasLessonsNow('write')], [true, true], 'math и write — есть');
      eq(Waterfall.freshText('biz', 24), 'нет уроков в этой фазе', 'подпись серой полоски');
      ok(Waterfall.EXPLAIN[3].cond.indexOf('свои уроки в фазе') > 0, 'условие свежести в объяснении выбора');
    });
  });

  State.reset();
  State.syncContent();
})();
