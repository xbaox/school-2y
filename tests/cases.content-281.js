/* 2.8.1, часть B: контент — глоссарий (B3) и опорные задания Б11, Б13, Б15, Б16, К.7–К.10 (B4–B5).

   Пакет Архитектора вставлен в content/phase1.js по образцу Б9.1 и К.4: у каждого
   урока Б — пять заданий основы L2 с ключом и марками, стретч L3, письменная работа,
   слова; у К — часть A × 2 и часть B × 1. Названия, сроки, id и порядок блоков прежние.
   Дословность текста сверяется скриптом вне репозитория (см. отчёт 2.8.1). */

(function () {
  'use strict';

  describe('2.8.1 B3: factor theorem по-русски одинаково в глоссарии и в словах Б9.1', function () {
    var g = CONTENT.term('factor theorem');
    ok(/^Теорема о множителе \(о корне\)/.test(g.ru), 'глоссарий: «Теорема о множителе (о корне)»');
    var w = (CONTENT.lesson('B9.1').words || []).filter(function (x) { return x.en === 'factor theorem'; })[0] || {};
    eq(w.ru, 'теорема о множителе (о корне)', 'слова Б9.1');
  });

  var BL = ['B11', 'B13', 'B15', 'B16'];
  var LB = [];
  BL.forEach(function (b) { for (var n = 1; n <= 4; n++) LB.push(b + '.' + n); });
  var LK = ['B53.7', 'B53.8', 'B53.9', 'B53.10'];
  var T = '2026-10-05';

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
  }

  describe('2.8.1 B5: у каждого из 16 уроков Б — пять заданий основы, стретч с ключом и марками, письмо, слова', function () {
    LB.forEach(function (id) {
      var l = CONTENT.lesson(id);
      ok(!!l, id + ': урок на месте');
      var base = l.tasks.filter(function (t) { return t.level === 'L2'; });
      var stretch = l.tasks.filter(function (t) { return t.level === 'L3'; });
      eq([base.length, stretch.length, l.tasks.length], [5, 1, 6], id + ': пять L2 и один стретч L3');
      l.tasks.forEach(function (t, i) {
        ok(!!t.q && !!t.key, id + ' задание ' + (i + 1) + ': условие и ключ');
        ok(typeof t.marks === 'number' && t.marks > 0, id + ' задание ' + (i + 1) + ': марки');
        ok(/Marks: /.test(t.key), id + ' задание ' + (i + 1) + ': в ключе — за что марки');
      });
      ok(/^Writing \(3–4 sentences\): /.test(l.writing), id + ': письменная работа');
      ok((l.words || []).length >= 5 && l.words.every(function (w) { return w.en && w.ru; }), id + ': не меньше пяти слов');
      ok(!!l.focus && !!l.youtube && !!l.goal && !!l.title, id + ': тема, видео, фокус');
      ok(l.terms.length >= 2, id + ': термины есть');
      eq(l.terms.filter(function (k) { return !CONTENT.glossary[k]; }), [], id + ': все термины — в глоссарии');
    });
  });

  describe('2.8.1 B5: К.7–К.10 — часть A, A, B с ключами и марками', function () {
    LK.forEach(function (id) {
      var l = CONTENT.lesson(id);
      eq(l.type, 'contest', id + ': конкурсная суббота');
      eq(l.tasks.map(function (t) { return t.part; }), ['A', 'A', 'B'], id + ': A, A, B');
      l.tasks.forEach(function (t, i) {
        ok(!!t.q && !!t.key && t.marks > 0, id + ' задача ' + (i + 1) + ': условие, ключ, марки');
      });
      ok(/Marks: /.test(l.tasks[2].key), id + ': у части B — разбивка марок');
      ok((l.words || []).length >= 5, id + ': слова');
      ok(!!l.focus && !!l.goal, id + ': фокус и тема');
    });
  });

  describe('2.8.1 B5: id, дедлайны и блоки прежние', function () {
    fresh();
    eq(CONTENT.phaseBlocks('p1').map(function (b) { return b.id; }),
      ['B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B53'], 'блоки Ф1 и их порядок');
    var want = {
      B11: ['Рациональные функции и асимптоты', '2026-11-15', 'math'],
      B12: ['Литературный анализ для ENG2D', '2026-12-20', 'write'],
      B13: ['Тригонометрия: радианы, графики, тождества', '2026-12-13', 'math'],
      B14: ['OSSLT-генеральная', '2026-11-22', 'write'],
      B15: ['Показательные и логарифмические функции', '2027-01-17', 'math'],
      B16: ['Финалы семестра: экзамен MHF4U и итоговые ENG2D', '2027-01-30', 'all'],
      B53: ['Субботы ⭐: задачи CEMC к CSMC 18 ноября', null, 'math']
    };
    Object.keys(want).forEach(function (b) {
      var c = CONTENT.block(b);
      eq([c.title, c.deadline, c.track], want[b], b + ': название, срок, дорожка');
      eq([State.block(b).title, State.block(b).deadline], [want[b][0], want[b][1]], b + ': в состоянии — те же');
    });
    BL.forEach(function (b) {
      eq(CONTENT.lessons(b).map(function (l) { return l.id; }),
        [1, 2, 3, 4].map(function (n) { return b + '.' + n; }), b + ': id уроков');
    });
    eq(CONTENT.lessons('B53').map(function (l) { return l.id; }),
      ['B53.1', 'B53.2', 'B53.3', 'B53.4', 'B53.5', 'B53.6', 'B53.7', 'B53.8', 'B53.9', 'B53.10'], 'К: id уроков');
  });

  describe('2.8.1 B5: уроков с опорными заданиями 18 → 38', function () {
    fresh();
    var n = 0;
    Object.keys(State.s.blocks).forEach(function (b) {
      State.blockLessons(b).forEach(function (l) { if (Array.isArray(l.tasks) && l.tasks.length) n++; });
    });
    eq(n, 38, 'было 18 (2.8.0), стало 38: +16 уроков Б и +4 субботы К');
  });

  describe('2.8.1 B5: промпты печатают все условия, ключи — только в блоке ключей', function () {
    ['S0', 'S1'].forEach(function (stage) {
      fresh();
      State.setStage(stage);
      ['B11.1', 'B13.1', 'B15.1', 'B16.2', 'B53.7'].forEach(function (id) {
        var p = PROMPTS.lesson(id, { today: T });
        var l = CONTENT.lesson(id);
        var keysAt = p.indexOf('=== КЛЮЧИ');
        ok(keysAt > 0, stage + ' ' + id + ': блок ключей есть');
        eq([p.indexOf('придут следующим пакетом'), p.indexOf('Ключей нет')], [-1, -1], stage + ' ' + id + ': фолбэка нет');
        l.tasks.forEach(function (t, i) {
          var at = p.indexOf(t.q);
          ok(at > 0 && at < keysAt, stage + ' ' + id + ': условие ' + (i + 1) + ' — до ключей');
          ok(p.indexOf(t.key) > keysAt, stage + ' ' + id + ': ключ ' + (i + 1) + ' — в блоке ключей');
          eq(p.slice(0, keysAt).indexOf(t.key), -1, stage + ' ' + id + ': ключ ' + (i + 1) + ' — не раньше блока ключей');
        });
      });
    });
  });

  describe('2.8.1 B5: глоссарий — новые термины целиком, без повторов ключей', function () {
    var added = [];
    LB.forEach(function (id) {
      CONTENT.lesson(id).terms.forEach(function (k) { if (added.indexOf(k) < 0) added.push(k); });
    });
    eq(added.length, 32, 'у уроков 32 термина (31 новый и end behaviour)');
    added.forEach(function (key) {
      var g = CONTENT.glossary[key];
      ok(!!g && !!g.en && !!g.def && !!g.ex && !!g.non && !!g.ru, key + ': en, def, ex, non, ru');
    });
    var file = __repoFiles().filter(function (f) { return f.path === 'content/glossary.js'; })[0];
    var keys = (file.text.match(/^ {2}'[^']+': \{/gm) || []).map(function (s) { return s.trim(); });
    eq(keys.filter(function (k, i) { return keys.indexOf(k) !== i; }), [], 'повторных ключей в исходнике нет');
    eq(keys.length, Object.keys(CONTENT.glossary).length, 'сколько записей в файле, столько в глоссарии');
    var eb = CONTENT.glossary['end behaviour'];
    ok(eb.def.indexOf('what f(x) does as x → +∞ and as x → −∞') === 0, 'end behaviour: прежнее определение первым');
    ok(eb.def.indexOf('even degree — same direction both ends; odd — opposite') > 0 && eb.non.indexOf('the y-intercept') > 0,
      'end behaviour: Facts и Non-ex пакета дописаны');
  });

  describe('2.8.1 B4: данные урока B16.1 не тронуты — задания только в контенте', function () {
    fresh();
    State.s.lessons['B16.1'] = { done: true, score: 8, date: '2026-09-10' };
    State.syncContent();
    eq(State.s.lessons['B16.1'], { done: true, score: 8, date: '2026-09-10' }, 'закрытый урок остаётся как был');
    eq(CONTENT.lesson('B16.1').tasks.length, 6, 'а задания у него в контенте есть');
  });

  describe('2.8.1, правки перед тегом: ошибки источника исправлены в пакете и в коде', function () {
    var w = CONTENT.lesson('B11.2').words.filter(function (x) { return x.en === 'denominator'; })[0] || {};
    eq(w.ru, 'знаменатель', 'Б11.2: denominator — знаменатель');
    ok(/^Общее решение и решение на промежутке \(general vs\. restricted solution\)/.test(CONTENT.glossary['general vs. restricted solution'].ru),
      'Б13.4: общее решение и решение на промежутке');
    ok(CONTENT.glossary.period.def.indexOf('2π/|k| for y = sin(kx)') > 0 && CONTENT.glossary.period.ru.indexOf('2π/|k|') > 0,
      'Б13.2: период 2π/|k|');
    ok(CONTENT.glossary['parameters of a sinusoid'].def.indexOf('2π/|k| period') > 0 &&
      CONTENT.glossary['parameters of a sinusoid'].ru.indexOf('2π/|k| — период') > 0, 'Б16.3: период 2π/|k|');
  });

  State.reset();
  State.syncContent();
})();
