/* 2.8.0, C1–C2: контент Б9.1–Б9.4 и К.4–К.6.

   Пакет Архитектора вставлен в content/phase1.js по образцу Б7.1 и К.1:
   у каждого урока Б9 — пять заданий основы с ключом и марками и стретч L3,
   у К — часть A × 2 и часть B × 1; у всех — слова урока. Ключи блоков,
   дедлайны и порядок блоков прежние. */

(function () {
  'use strict';

  var B9 = ['B9.1', 'B9.2', 'B9.3', 'B9.4'];
  var K = ['B53.4', 'B53.5', 'B53.6'];
  var T = '2026-10-05';

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
  }

  describe('2.8.0 C2: Б9 — у каждого урока пять заданий основы и стретч', function () {
    B9.forEach(function (id) {
      var l = CONTENT.lesson(id);
      ok(!!l, id + ': урок на месте');
      var base = l.tasks.filter(function (t) { return t.level !== 'L3'; });
      var stretch = l.tasks.filter(function (t) { return t.level === 'L3'; });
      eq([base.length, stretch.length], [5, 1], id + ': пять заданий основы и один стретч');
      l.tasks.forEach(function (t, i) {
        ok(!!t.q && !!t.key, id + ' задание ' + (i + 1) + ': условие и ключ');
        ok(typeof t.marks === 'number' && t.marks > 0, id + ' задание ' + (i + 1) + ': марки');
        ok(/Marks: /.test(t.key), id + ' задание ' + (i + 1) + ': в ключе — за что даются марки');
      });
      ok(base.every(function (t) { return t.level === 'L2'; }), id + ': основа — уровень L2');
      ok(l.terms.length >= 3, id + ': термины есть');
      eq(l.terms.filter(function (k) { return !CONTENT.glossary[k]; }), [], id + ': все термины — в глоссарии');
      ok(!!l.focus && !!l.youtube && !!l.writing, id + ': фокус, видео-запрос, письмо');
    });
  });

  describe('2.8.0 C2: К.4–К.6 — часть A × 2 и часть B × 1 с ключами', function () {
    K.forEach(function (id) {
      var l = CONTENT.lesson(id);
      eq(l.type, 'contest', id + ': конкурсный урок');
      eq(l.tasks.map(function (t) { return t.part; }), ['A', 'A', 'B'], id + ': A, A, B');
      l.tasks.forEach(function (t, i) {
        ok(!!t.q && !!t.key && t.marks > 0, id + ' задача ' + (i + 1) + ': условие, ключ, марки');
      });
      ok(/Marks: /.test(l.tasks[2].key), id + ': у части B — разбивка марок');
    });
  });

  describe('2.8.0 C2: слова урока — не меньше пяти', function () {
    B9.concat(K).forEach(function (id) {
      var w = CONTENT.lesson(id).words || [];
      ok(w.length >= 5, id + ': слов ' + w.length);
      eq(w.filter(function (x) { return !x.en || !x.ru; }), [], id + ': у каждого слова en и ru');
    });
  });

  describe('2.8.0 C2: id, дедлайны и порядок блоков прежние', function () {
    fresh();
    eq(CONTENT.lessons('B9').map(function (l) { return l.id; }), B9, 'уроки Б9 — B9.1–B9.4');
    eq(CONTENT.lessons('B53').slice(3, 6).map(function (l) { return l.id; }), K, 'К.4–К.6 — B53.4–B53.6');
    eq(CONTENT.lessons('B53').length, 10, 'в К по-прежнему десять уроков');
    eq([CONTENT.block('B9').deadline, CONTENT.block('B10').deadline, CONTENT.block('B53').deadline],
      ['2026-10-18', '2026-11-01', null], 'дедлайны Б9, Б10, К');
    eq(State.lessonLabel('B53.4'), 'К.4', 'подпись К.4');
    var p1 = Object.keys(State.s.blocks).filter(function (id) { return State.s.blocks[id].phase === 'p1'; });
    eq(p1.sort(), ['B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B53', 'B7', 'B8', 'B9'], 'блоки Ф1 те же');
    eq(State.block('B9').note, 'Опорные задания и глоссарий — есть (2.8.0).', 'подпись Б9 доехала в состояние');
  });

  describe('2.8.0 C2: уроков с опорными заданиями стало на 7 больше', function () {
    fresh();
    var n = 0;
    Object.keys(State.s.blocks).forEach(function (b) {
      State.blockLessons(b).forEach(function (l) { if (Array.isArray(l.tasks) && l.tasks.length) n++; });
    });
    eq(n, 11 + 7, 'было 11 (Б7, Б8, К.1–К.3), стало 18');
  });

  describe('2.8.0 C2: промпты B9.1 и B53.4 печатают задания и ключи', function () {
    fresh();
    State.setStage('S1');
    var p = PROMPTS.lesson('B9.1', { today: T });
    var l = CONTENT.lesson('B9.1');
    eq(p.indexOf('опорные задания придут следующим пакетом'), -1, 'B9.1: фолбэка нет');
    l.tasks.forEach(function (t, i) {
      ok(p.indexOf(t.q) > 0, 'B9.1: условие задания ' + (i + 1) + ' в промпте');
      ok(p.indexOf(t.key) > p.indexOf('=== КЛЮЧИ'), 'B9.1: ключ ' + (i + 1) + ' — в блоке ключей, после условий');
    });
    ok(p.indexOf('Стретч ⭐ (L3, 4 marks)') > 0, 'B9.1: стретч с марками');
    ok(p.indexOf('integral zero theorem') < 0 && p.indexOf('remainder theorem —') > 0, 'B9.1: глоссарий урока');

    var c = PROMPTS.lesson('B53.4', { today: T });
    var k = CONTENT.lesson('B53.4');
    eq(c.indexOf('задачи придут следующим пакетом'), -1, 'B53.4: фолбэка нет');
    k.tasks.forEach(function (t, i) {
      ok(c.indexOf(t.q) > 0, 'B53.4: условие задачи ' + (i + 1) + ' в промпте');
      ok(c.indexOf(t.key) > c.indexOf('=== КЛЮЧИ'), 'B53.4: ключ ' + (i + 1) + ' — в блоке ключей');
    });
  });

  describe('2.8.0 C2: глоссарий — новые термины целиком, без повторов ключей', function () {
    ['integral zero theorem', 'rational zero theorem', 'factor fully', 'sum and difference of cubes',
      'family of polynomial functions', 'sign chart', 'interval notation', 'boundary point'].forEach(function (key) {
      var g = CONTENT.glossary[key];
      ok(!!g && !!g.en && !!g.def && !!g.ex && !!g.non && !!g.ru, key + ': en, def, ex, non, ru');
    });
    var file = __repoFiles().filter(function (f) { return f.path === 'content/glossary.js'; })[0];
    ok(!!file, 'исходник глоссария прочитан');
    var keys = (file.text.match(/^ {2}'[^']+': \{/gm) || []).map(function (s) { return s.trim(); });
    eq(keys.filter(function (k, i) { return keys.indexOf(k) !== i; }), [], 'повторных ключей в исходнике нет');
    eq(keys.length, Object.keys(CONTENT.glossary).length, 'сколько записей в файле, столько в глоссарии');
  });

  State.reset();
  State.syncContent();
})();
