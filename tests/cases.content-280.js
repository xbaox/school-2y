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
    // 2.8.1: ещё 20 (Б11, Б13, Б15, Б16, К.7–К.10) — счёт 18 → 38 проверяет cases.content-281
    eq(n, 11 + 7 + 20, 'было 11 (Б7, Б8, К.1–К.3), с 2.8.0 — 18, с 2.8.1 — 38');
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

  describe('2.8.0 ревью: на S0 мест основы четыре — пятое опорное задание запасное, не «обязательное»', function () {
    fresh();
    State.setStage('S0');
    var p = PROMPTS.lesson('B9.1', { today: T });
    var l = CONTENT.lesson('B9.1');
    ok(p.indexOf('Основа 4. (L2, 3 marks) ' + l.tasks[3].q) > 0, 'четыре задания — основа');
    ok(p.indexOf('Запасное 1. (L2, 4 marks) ' + l.tasks[4].q) > 0, 'пятое — запасное');
    eq(p.indexOf('Основа 5.'), -1, '«Основы 5» нет');
    ok(p.indexOf('Запасные опорные задания (1) — сверх мест ступени: после стретча, ' +
      'если осталось время; в счёт не входят.') > 0, 'план урока говорит, куда оно идёт');
    ok(p.indexOf('Запасное 1: ' + l.tasks[4].key) > p.indexOf('=== КЛЮЧИ'), 'и ключ подписан так же');
    ok(p.indexOf('Счёт: сумма баллов за Основу 1–4') > 0, 'счёт — по местам ступени, как раньше');

    State.setStage('S1');
    var p1 = PROMPTS.lesson('B9.1', { today: T });
    eq([p1.indexOf('Запасное'), p1.indexOf('Запасные опорные')], [-1, -1], 'на S1 мест хватает — запасных нет');
  });

  describe('2.8.0 ревью: у заданий без русской строки «RU: —» не печатается', function () {
    fresh();
    State.setStage('S0');
    eq(PROMPTS.lesson('B9.1', { today: T }).indexOf('RU: —'), -1, 'B9.1');
    eq(PROMPTS.lesson('B53.4', { today: T }).indexOf('RU: —'), -1, 'B53.4');
    ok(PROMPTS.lesson('B7.1', { today: T }).indexOf('  /  RU: ' + CONTENT.lesson('B7.1').tasks[0].ru) > 0,
      'у Б7 русская строка на месте');
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

  describe('2.8.0 A7: пять прежних записей глоссария дополнены картами Фрейера пакета', function () {
    var G = CONTENT.glossary;
    var cards = {
      'remainder theorem': ['works only for linear divisors x − a; no division needed to find the remainder',
        'P(x) = x² + 1 divided by x − 2 → remainder P(2) = 5', 'dividing by x² − 4 — the theorem does not apply directly'],
      'factor theorem': ['two directions — a zero gives a factor, a factor gives a zero; used to start factoring cubics',
        'P(1) = 0 → x − 1 is a factor', 'P(1) = 4 → x − 1 is not a factor, but x − 1 is still a divisor with remainder 4'],
      'division terms': ['with degree of remainder less than degree of divisor; checks any division',
        'x³ − 7x + 6 = (x − 1)(x² + x − 6) + 0', 'impossible, the remainder must be a constant'],
      'zero': ['"root" is said about the equation, "zero" about the function',
        'x = 5 is a root of x² − 25 = 0', 'x = 0 is not a root of x² − 25 = 0 (it gives −25)'],
      'multiplicity': ['the degree equals the sum of multiplicities',
        '(x + 2)²(x − 3): zero −2 has order 2 (bounce), 3 has order 1 (cross)', 'the number of zeros is not the order']
    };
    Object.keys(cards).forEach(function (k) {
      var g = G[k], c = cards[k];
      ok(g.def.indexOf(c[0]) >= 0, k + ': Def и Facts карты в def');
      ok(g.ex.indexOf(c[1]) >= 0, k + ': Ex карты');
      ok(g.non.indexOf(c[2]) >= 0, k + ': Non-ex карты');
    });
    ok(G['factor theorem'].def.indexOf('(x − a) is a factor of p(x) if and only if p(a) = 0; ') === 0, 'прежнее определение сохранено первым');
    ok(G.zero.ru.indexOf('Root — о корне уравнения, zero — о нуле функции.') > 0, 'zero: root — о корне уравнения');
    eq(G.zero.ru.indexOf('говорят zero, не root'), -1, 'прежней фразы нет');
  });

  describe('2.8.0 A7: письменная работа Б9 и подпись Б10 — дословно', function () {
    eq(CONTENT.lessons('B9').map(function (l) { return l.writing; }), [
      'Writing (3–4 sentences): explain how the remainder theorem lets you check whether x − a is a factor without dividing.',
      'Writing (3–4 sentences): describe the steps you take to factor a cubic fully, starting from the integral zero theorem.',
      'Writing (3–4 sentences): explain what the multiplicity of a zero tells you about the graph; give one example.',
      'Writing (3–4 sentences): explain to a classmate how to build and read a sign chart.'
    ], 'четыре урока');
    eq(CONTENT.block('B10').note, 'Материалы OSSLT — из окна английского, пакет 2.8.0б. OSSLT — конец ноября 2026, точная дата до 15.10.',
      'подпись Б10');
    fresh();
    State.setStage('S0');
    ok(PROMPTS.lesson('B9.4', { today: T }).indexOf('Письменная работа урока: Writing (3–4 sentences): explain to a classmate') > 0,
      'письменная работа доехала в промпт');
  });

  State.reset();
  State.syncContent();
})();
