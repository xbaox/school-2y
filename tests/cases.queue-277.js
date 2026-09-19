/* 2.7.7, этап 6: одна очередь блоков — по сроку, потом по номеру.

   Водопад (Waterfall.nextOwnLesson) с 2.7.6 шёл по сроку блока, а сквозная
   очередь дорожки (State.nextLessonInTrack: свап «Поменять урок», запасной
   путь выбора, State.nextLesson) — по номеру. После обмена сроков Б12/Б14
   они расходились. Теперь это одна функция: фаза → свои блоки раньше общего →
   срок (без срока — в конце) → номер. */

(function () {
  'use strict';

  function closeLessons(ids, date) {
    ids.forEach(function (id) { State.s.lessons[id] = { done: true, score: 8, date: date }; });
    ids.forEach(function (id) { State.refreshBlockDone(id.split('.')[0]); });
  }
  function closeBlock(id, date) { closeLessons(State.activeLessons(id).map(function (l) { return l.id; }), date); }

  describe('2.7.7 Э6: ноябрь — у письма следующий Б14.1, не Б12.1', function () {
    State.reset();
    State.syncContent();
    State.setMode('school');
    Object.keys(State.s.blocks).forEach(function (id) {
      var b = State.s.blocks[id];
      if (id === 'B12' || id === 'B14' || !b.deadline || b.deadline > '2026-12-31') return;
      closeBlock(id, '2026-11-01');
    });
    eq(State.nextLessonInTrack('write'), 'B14.1', 'сквозная очередь письма: Б14 (срок 22.11) раньше Б12 (20.12)');
    eq(State.nextLessonInTrack('write', 'p1'), Waterfall.nextOwnLesson('write', 'p1'), 'та же очередь, что у водопада');
    eq(State.nextLesson(), 'B14.1', 'и общая очередь');
    eq(State.nextLessonInTrack('math'), 'B15.1', 'математика: Б15 (17.01)');
    closeBlock('B15', '2026-11-02');
    // 2.7.8 (Б1): уроков К в очереди нет — их назначает только суббота
    eq(State.nextLessonInTrack('math'), 'B16.1', 'затем общий Б16: К в очереди дорожки не стоит');
    eq(Waterfall.nextOwnLesson('math', 'p1'), null, 'у водопада своих уроков математики нет — К не в счёт');
    eq(State.nextContestLesson('p1'), 'B53.1', 'К — своей очередью');
    closeBlock('B53', '2026-11-02');
    eq(State.nextLessonInTrack('math'), 'B16.1', 'своих не осталось — общий блок Б16');
    eq(Waterfall.nextOwnLesson('math', 'p1'), null, 'своя очередь общий блок не берёт');
  });

  /* Ревью 2.7.7: срок своего блока снят (или сдвинут за 30.01) — общий блок
     Б16 не встаёт впереди него ни в очереди дорожки, ни в свапе, ни во втором
     уроке полной. */
  function november(edit) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.meta.onboardedAt = '2026-08-22';
    Object.keys(State.s.blocks).forEach(function (id) {
      var b = State.s.blocks[id];
      if (b.phase !== 'p0' && b.phase !== 'p1') return;
      if (['B11', 'B12', 'B14', 'B16', 'B53'].indexOf(id) >= 0) return;
      closeBlock(id, '2026-10-30');
    });
    edit();
    State.s.tracks.forEach(function (t) { if (!t.embedded) t.lastLessonDate = '2026-11-01'; });
  }
  function swapRows() {
    var got = null, real = UI.sheet;
    UI.sheet = function (o) { got = o; };
    try { Waterfall.openSwap(); } finally { UI.sheet = real; }
    return (got.body.match(/data-pick="[^"]+"/g) || []).map(function (x) { return x.slice(11, -1); });
  }

  describe('2.7.7 ревью: срок Б12 снят — очередь письма не отдаёт Б16', function () {
    withToday('2026-11-02', function () {
      november(function () { closeBlock('B14', '2026-10-30'); State.setDeadline('B12', null); });
      eq(State.nextLessonInTrack('write'), 'B12.1', 'письмо: свой Б12 без срока раньше общего Б16');
      eq(State.nextLessonInTrack('write'), Waterfall.nextOwnLesson('write', 'p1'), 'та же очередь, что у водопада');
      // 2.8.1: уроки Б16 — математика, информатике и бизнесу свап их не предлагает
      eq(swapRows(), ['B11.1', 'B12.1', 'B53.1'],
        'свап: у письма Б12, у информатики и бизнеса уроков нет; 2.7.8 — строка К последней');
      var first = Waterfall.pick('2026-11-02');
      eq([first.lessonId, first.reason.text], ['B11.1', 'шаблон: понедельник — математика'], 'первый урок');
      var two = Waterfall.second('2026-11-02', 'B11.1');
      eq([two.lessonId, two.reason.text], ['B12.1', 'второй урок: свободная дорожка'], 'второй — письмо, а не «другой дорожки нет»');
      closeLessons(['B11.1'], '2026-11-02');
      two = Waterfall.second('2026-11-02', 'B11.1');
      eq([two.lessonId, two.reason.text], ['B12.1', 'второй урок: свободная дорожка'], 'и после закрытия первого');
      closeBlock('B11', '2026-11-02');
      eq(State.nextLesson(), 'B12.1', 'общая очередь: свои блоки фазы раньше общего');
    });
  });

  /* 2.7.8 (Б1): К в запасной путь не попадает — сцена та же, но другим уроком
     дорожки остаётся Б11 без срока (срок снят руками). */
  describe('2.7.7 ревью: второй урок после просроченного Б16 — бейдж по дорожке урока', function () {
    withToday('2027-02-09', function () {
      november(function () {
        ['B12', 'B14'].forEach(function (b) { closeBlock(b, '2027-01-29'); });
        State.setDeadline('B11', null);
      });
      State.s.tracks.forEach(function (t) { if (!t.embedded) t.lastLessonDate = '2027-02-08'; });
      var first = Waterfall.pick('2027-02-09');
      eq([first.lessonId, first.reason.kind], ['B16.1', 'deadline'], 'первый — просроченный общий блок');
      var two = Waterfall.second('2027-02-09', first.lessonId);
      eq([two.lessonId, State.lessonTrack(two.lessonId), two.reason.text], ['B11.1', 'math', 'второй урок: свободная дорожка'],
        'второй — Б11 другой дорожки, а не «другой дорожки нет»');
      eq(Waterfall.second('2027-02-09', 'B11.1'), null, 'после Б11: остались Б11 и общий блок — второго урока нет');
      closeBlock('B11', '2027-01-29');
      eq(Waterfall.second('2027-02-09', first.lessonId), null, '2.7.8: остались К и общий блок — К вторым уроком не приходит');
    });
  });

  describe('2.7.7 ревью: срок Б14 сдвинут за 30.01 — очередь письма не отдаёт Б16', function () {
    withToday('2026-11-02', function () {
      november(function () { closeBlock('B12', '2026-10-30'); State.setDeadline('B14', '2027-02-05'); });
      eq(State.nextLessonInTrack('write'), 'B14.1', 'письмо: Б14 (05.02) раньше общего Б16 (30.01)');
      eq(swapRows()[1], 'B14.1', 'свап письма — Б14');
      eq(Waterfall.second('2026-11-02', 'B11.1').lessonId, 'B14.1', 'второй урок — письмо');
    });
  });

  describe('2.7.7 Э6: фаза идёт раньше срока — блок без срока не уезжает в конец программы', function () {
    State.reset();
    State.syncContent();
    State.setDeadline('B1', null);
    eq(State.nextLessonInTrack('write'), 'B3.1', 'в своей фазе блок без срока — после блоков со сроком');
    closeBlock('B3', '2026-08-30');
    eq(State.nextLessonInTrack('write'), 'B1.1', 'но раньше блоков следующей фазы: Ф0 → Ф1 (не B8.1)');
  });

  State.reset();
  State.syncContent();
})();
