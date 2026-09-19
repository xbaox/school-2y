/* 2.7.8, Б5: «Программа» — под полоской свежести каждой дорожки строка
   «следующий: Б14.1 · …» из той же очереди, что у свапа «Поменять урок»
   (State.nextLessonInTrack без фазы). */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.meta.onboardedAt = '2026-08-22';
  }
  function closeLessons(ids, date) {
    ids.forEach(function (id) { State.s.lessons[id] = { done: true, score: 8, date: date }; });
    ids.forEach(function (id) { State.refreshBlockDone(id.split('.')[0]); });
  }
  function closeBlock(id, date) { closeLessons(State.activeLessons(id).map(function (l) { return l.id; }), date); }
  function closeWhere(pred, date) {
    Object.keys(State.s.blocks).forEach(function (id) { if (pred(State.s.blocks[id], id)) closeBlock(id, date); });
  }
  function title(id) { return CONTENT.lesson(id).title; }
  function line(id) { return Waterfall.nextLine(id); }
  function swapRows() {
    var got = null, real = UI.sheet;
    UI.sheet = function (o) { got = o; };
    try { Waterfall.openSwap(); } finally { UI.sheet = real; }
    return (got.body.match(/data-pick="[^"]+"/g) || []).map(function (x) { return x.slice(11, -1); });
  }
  var TRACKS = ['math', 'write', 'cs', 'biz'];

  describe('2.7.8 Б5: сентябрь — строка «следующий» у каждой дорожки', function () {
    withToday('2026-09-15', function () {
      fresh();
      closeWhere(function (b) { return b.phase === 'p0'; }, '2026-09-07');
      eq(line('math'), 'следующий: Б7.1 · ' + title('B7.1'), 'математика — Б7.1');
      eq(line('write'), 'следующий: Б8.1 · ' + title('B8.1'), 'письмо — Б8.1');
      // 2.8.1: уроки Б16 — математика (дорожка урока), информатике их не предлагают
      eq(line('cs'), 'следующий: уроков в контенте нет',
        'информатика: своих уроков в Ф1 нет, уроки общего блока — математические');
      eq(line('biz'), line('cs'), 'бизнес — так же');
      eq(line('eng'), '', 'встроенной дорожке строка не нужна');

      // та же очередь, что у свапа: тап по дорожке даёт урок из строки
      var picks = swapRows();
      TRACKS.forEach(function (t) {
        var id = State.nextLessonInTrack(t, null, false, true);
        if (!id) { eq(line(t), 'следующий: уроков в контенте нет', t + ': урока нет — и строка так говорит'); return; }
        ok(line(t).indexOf('следующий: ' + State.lessonLabel(id) + ' · ') === 0, t + ': строка — State.nextLessonInTrack');
        ok(picks.indexOf(id) >= 0, t + ': и этот урок предлагает свап');
      });

      var html = App.screen('program').render();
      TRACKS.forEach(function (t) {
        ok(html.indexOf('<div class="trow hasnext" data-track="' + t + '">') > 0, t + ': строка дорожки с «следующим»');
        ok(html.indexOf('<div class="tnext">' + U.esc(line(t)) + '</div>') > 0, t + ': текст строки на экране');
      });
      eq((html.match(/class="tnext"/g) || []).length, 4, 'строк «следующий» — четыре');
      ok(html.indexOf('<div class="trow" data-track="eng">') > 0, 'академический английский — без строки');
      ok(html.indexOf('нет уроков в этой фазе') > 0, 'подпись свежести у информатики прежняя');
      ok(html.indexOf('Под дорожкой — её следующий урок: его же предлагает «поменять урок».') > 0,
        'строка объяснена в подписи секции');
      ok(html.indexOf('Свежесть — сколько дней дорожку не трогали') > 0, 'прежняя подпись на месте');
    });
  });

  describe('2.7.8 Б5: очередь по сроку — Б14 раньше Б12; К не в очереди; общий блок последним', function () {
    withToday('2026-11-02', function () {
      fresh();
      closeWhere(function (b, id) {
        return id !== 'B12' && id !== 'B14' && !!b.deadline && b.deadline <= '2026-12-31';
      }, '2026-11-01');
      eq(line('write'), 'следующий: Б14.1 · ' + title('B14.1'), 'письмо: Б14 (срок 22.11) раньше Б12 (20.12)');
      eq(line('math'), 'следующий: Б15.1 · ' + title('B15.1'), 'математика: Б15');
      closeLessons(['B14.1', 'B15.1'], '2026-11-02');
      eq([line('write'), line('math')], ['следующий: Б14.2 · ' + title('B14.2'), 'следующий: Б15.2 · ' + title('B15.2')],
        'закрытый урок открывает следующий');
      closeBlock('B15', '2026-11-02');
      // Б1 пакета 2.7.8: К в очереди дорожки нет — у него своя строка свапа
      eq(line('math'), 'следующий: Б16.1 · ' + title('B16.1') + ' · общий блок',
        'своих не осталось — общий блок; открытый К строку не занимает');
      eq(State.nextContestLesson() != null, true, 'К при этом открыт');
    });
  });

  describe('2.7.8 Б5: урок следующей фазы — с её именем; пустая очередь', function () {
    withToday('2026-08-24', function () {
      fresh();
      ['B2', 'B4', 'B6'].forEach(function (id) { closeBlock(id, '2026-08-23'); });
      eq(Waterfall.hasLessonsNow('math'), false, 'в Ф0 у математики уроков не осталось');
      eq(line('math'), 'следующий: Б7.1 · ' + title('B7.1') + ' · Ф1 «Семестр 1»',
        'строка ведёт в Ф1 и называет фазу');
      eq(line('write').indexOf(' · Ф1'), -1, 'у письма урок текущей фазы — без имени фазы');

      closeWhere(function () { return true; }, '2026-08-23');
      TRACKS.forEach(function (t) {
        eq(line(t), 'следующий: уроков в контенте нет', t + ': очередь пуста — как у свапа');
      });
      eq((App.screen('program').render().match(/class="tnext"/g) || []).length, 4, 'строки остаются на экране');
    });
  });

  describe('2.7.8 Б5: «Кто получает урок дня» строку «следующий» не получает', function () {
    withToday('2026-09-15', function () {
      fresh();
      eq(Waterfall.fullBars().indexOf('tnext'), -1, 'полоски без opts — как раньше');
      eq(Waterfall.fullBars().indexOf('hasnext'), -1, 'и без класса');
      var got = null, real = UI.sheet;
      UI.sheet = function (o) { got = o; };
      try { Waterfall.explain('plan'); } finally { UI.sheet = real; }
      ok(got.body.indexOf('class="card fresh"') > 0, 'в шторке полоски есть');
      eq(got.body.indexOf('tnext'), -1, 'а строки «следующий» нет');
    });
  });

  State.reset();
  State.syncContent();
})();
