/* 2.8.1, правки перед тегом: поле track у урока перекрывает дорожку блока.

   Б16 — блок «все дорожки» (название прежнее), а его уроки по пакету 2.8.1 —
   MHF4U: у Б16.1–Б16.4 track: 'math'. Промпт («Дорожка», пункт CEMC, [ДОЛГИ],
   ключ письма), свежесть при закрытии, колода и свап берут дорожку урока;
   уроки без поля — как раньше. */

(function () {
  'use strict';

  var T = '2026-10-05';

  function fresh(stage) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage(stage || 'S1');
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'повтор', words: [{ en: 'end behaviour', ru: 'поведение на концах' }],
      debts: [], cleared: [], warmup: [], checklist: null, stretch: null, writing: '', raw: ''
    }, over || {});
  }

  /** Коды категорий из блока [ДОЛГИ …] промпта. */
  function debtCodes(p) {
    var a = p.indexOf('[ДОЛГИ ');
    var block = p.slice(a, p.indexOf('\n\n', a) > 0 ? p.indexOf('\n\n', a) : undefined).split('\n').slice(1);
    return block.map(function (l) { return (/^(\S+) /.exec(l) || [])[1]; }).filter(Boolean);
  }

  describe('2.8.1 дорожка урока: у Б16.1–Б16.4 — math, блок Б16 — прежний «все»', function () {
    ['B16.1', 'B16.2', 'B16.3', 'B16.4'].forEach(function (id) {
      eq([CONTENT.lesson(id).track, State.lessonTrack(id), State.lessonBlockTrack(id)], ['math', 'math', 'all'], id);
    });
    eq([CONTENT.block('B16').track, CONTENT.block('B16').title], ['all', 'Финалы семестра: экзамен MHF4U и итоговые ENG2D'],
      'блок: дорожка и название прежние');
    eq(State.lessonTrack('B9.1'), 'math', 'урок без поля — дорожка блока');
    eq(State.lessonTrack('B8.1'), 'write', 'и у письма тоже');
  });

  describe('2.8.1 дорожка урока: промпт Б16.2 — математика', function () {
    ['S0', 'S1', 'S3'].forEach(function (stage) {
      fresh(stage);
      var p = PROMPTS.lesson('B16.2', { today: T });
      var m = PROMPTS.lesson('B11.1', { today: T });
      ok(p.indexOf('Дорожка: Математика · ') > 0, stage + ': «Дорожка: Математика»');
      eq(p.indexOf('Дорожка: Все дорожки'), -1, stage + ': не «Все дорожки»');
      ok(p.indexOf('[ДОЛГИ математика]') > 0, stage + ': [ДОЛГИ математика]');
      var codes = debtCodes(p);
      // О1 — общая категория, она есть у любого математического урока (и у Б11.1)
      ok(codes.length > 0 && codes.every(function (c) { return /^[МО]/.test(c); }) &&
        codes.filter(function (c) { return /^М/.test(c); }).length >= 8,
        stage + ': в [ДОЛГАХ] — М (и общая О1), без П и Б: ' + codes.join(' '));
      eq(codes, debtCodes(m), stage + ': те же категории, что у Б11.1');
      // пункт CEMC и ключ письма — как у любого математического урока той же ступени
      var cemc = function (x) { return x.indexOf('CEMC') >= 0; };
      eq(cemc(p), cemc(m), stage + ': пункт CEMC — как у Б11.1');
      eq([p.indexOf('1 — математически верно') >= 0, p.indexOf('1 — чек-лист языка чист') >= 0],
        [m.indexOf('1 — математически верно') >= 0, m.indexOf('1 — чек-лист языка чист') >= 0],
        stage + ': ключ письма — как у Б11.1 (математический)');
    });
  });

  describe('2.8.1 дорожка урока: закрытие Б16.2 освежает только математику, долги и слова — математики', function () {
    fresh();
    ['write', 'cs', 'biz'].forEach(function (id) { State.track(id).lastLessonDate = '2026-09-01'; });
    State.track('math').lastLessonDate = '2026-09-01';
    var r = State.applySummary('B16.2', summary({ debts: ['М2 — знак при переносе', 'П3 — артикль'] }), { date: T });
    ok(r.ok, 'ИТОГ принят');
    eq(['math', 'write', 'cs', 'biz'].map(function (id) { return State.track(id).lastLessonDate; }),
      [T, '2026-09-01', '2026-09-01', '2026-09-01'], 'свежесть — только математики');
    eq(State.s.debts.map(function (d) { return [d.cat, d.track]; }), [['М2', 'math']], 'долг М завёлся по математике');
    eq(r.dropped.map(function (x) { return x.why; }), ['код чужой дорожки'], 'П3 — чужая дорожка, отброшен');
    var w = State.wordBank().filter(function (x) { return x.en === 'end behaviour'; })[0] || {};
    eq(w.track, 'math', 'колода: слово урока — дорожки математики');
    eq(State.recentSummaries('math', 1)[0].lessonId, 'B16.2', '«прошлый раз» математики видит Б16.2');
    eq(State.recentSummaries('write', 3).filter(function (x) { return x.lessonId === 'B16.2'; }).length, 0,
      'а письма — нет');
  });

  describe('2.8.1 дорожка урока: свап — уроки Б16 только в строке математики', function () {
    fresh();
    // свои блоки Ф1 закрыты — в очереди остаётся только общий Б16
    CONTENT.allBlocks().forEach(function (b) {
      if (b.id === 'B16' || (b.phase !== 'p0' && b.phase !== 'p1')) return;
      CONTENT.lessons(b.id).forEach(function (l) { State.s.lessons[l.id] = { done: true, score: 8, date: '2026-10-01' }; });
    });
    eq(['math', 'write', 'cs', 'biz'].map(function (t) { return State.nextLessonInTrack(t, null, false, true); }),
      ['B16.1', null, null, null], 'свап: Б16.1 — у математики, у остальных уроков нет');
    eq(['math', 'write', 'cs', 'biz'].map(function (t) { return State.nextLessonInTrack(t); }),
      ['B16.1', 'B16.1', 'B16.1', 'B16.1'], 'очередь водопада (без флага) — как раньше');
  });

  describe('2.8.1 дорожка урока: поле, равное дорожке блока, промпт не меняет', function () {
    ['B7.1', 'B9.2', 'B53.4'].forEach(function (id) {
      fresh('S1');
      var before = PROMPTS.lesson(id, { today: T });
      var l = CONTENT.lesson(id);
      l.track = State.block(l.blockId).track;
      var after = PROMPTS.lesson(id, { today: T });
      delete l.track;
      eq(after === before, true, id + ': посимвольно тот же промпт');
    });
  });

  State.reset();
  State.syncContent();
})();
