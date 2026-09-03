/* 2.7.0 «Корень», этап 3: формат контента v3, глоссарий, блок суббот.

   Контент — источник истины: определения, тексты и опорные задания приходят
   готовыми, приложение их не сочиняет и не правит. Здесь проверяется, что
   пакет доехал целиком и в той форме, которую ждут промпты этапа 4. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  var P1 = ['B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B53'];

  /* ============ глоссарий ============ */

  describe('2.7.0 контент: глоссарий зарегистрирован', function () {
    var keys = Object.keys(CONTENT.glossary);
    ok(keys.length >= 40, 'ключей не меньше сорока (' + keys.length + ')');
    ok(!!CONTENT.term('evidence'), 'термин находится по ключу');
    eq(CONTENT.term('нет такого'), null, 'чужого ключа нет');

    // у каждой записи все пять полей: промпт печатает их дословно
    var bad = keys.filter(function (k) {
      var t = CONTENT.glossary[k];
      return !t.en || !t.def || !t.ex || !t.non || !t.ru;
    });
    eq(bad, [], 'у каждой записи есть en, def, ex, non и русская строка');
  });

  describe('2.7.0 контент: все ключи terms существуют в глоссарии', function () {
    var missing = [];
    P1.forEach(function (b) {
      CONTENT.lessons(b).forEach(function (l) {
        (l.terms || []).forEach(function (t) {
          if (typeof t !== 'string') return;          // инлайн-объект проверять нечего
          if (!CONTENT.term(t)) missing.push(l.id + ' → ' + t);
        });
      });
    });
    eq(missing, [], 'ни одной висячей ссылки на глоссарий');
  });

  describe('2.7.0 контент: реестр отдаёт поля урока как есть', function () {
    // реестр ничего не нормализует: что положил Архитектор, то и придёт
    var l = CONTENT.lesson('B7.1');
    ok(Array.isArray(l.terms) && typeof l.terms[0] === 'string', 'terms — массив ключей');
    eq(l.text, null, 'text отдан как null, а не подменён пустой строкой');
    eq(l.tasks[0].level, 'L1', 'уровень задания на месте');
    eq(l.tasks[0].probe, 'М3', 'probe на месте');
    ok(!!l.tasks[0].key, 'ключ на месте');

    var c = CONTENT.lesson('B53.1');
    eq(c.type, 'contest', 'тип урока не тронут');
    eq(c.tasks[0].part, 'A', 'часть задачи не тронута');
    eq(c.text, undefined, 'чего в пакете нет, того реестр не выдумывает');
  });

  /* ============ Б7 и Б8: полные уроки ============ */

  ['B7', 'B8'].forEach(function (b) {
    describe('2.7.0 контент: ' + b + ' — четыре урока с заданиями', function () {
      var list = CONTENT.lessons(b);
      eq(list.length, 4, 'четыре урока');
      list.forEach(function (l) {
        ok((l.terms || []).length > 0, l.id + ': термины есть');
        ok(!!l.writing, l.id + ': письменная работа есть');
        ok(Array.isArray(l.tasks) && l.tasks.length === 5, l.id + ': пять опорных заданий');

        var levels = l.tasks.map(function (t) { return t.level; });
        eq(levels.filter(function (x) { return x === 'L3'; }).length, 1, l.id + ': ровно один стретч L3');
        eq(levels.filter(function (x) { return x === 'L1' || x === 'L2'; }).length, 4,
          l.id + ': четыре задания уровня L2 или ниже');

        l.tasks.forEach(function (t, i) {
          ok(!!t.q, l.id + ' задание ' + (i + 1) + ': условие');
          ok(!!t.ru, l.id + ' задание ' + (i + 1) + ': русская строка');
          ok(!!t.key, l.id + ' задание ' + (i + 1) + ': ключ');
          ok(typeof t.marks === 'number' && t.marks > 0, l.id + ' задание ' + (i + 1) + ': marks');
        });
      });
    });
  });

  describe('2.7.0 контент: у каждого урока Б8 есть текст для чтения', function () {
    CONTENT.lessons('B8').forEach(function (l) {
      ok(typeof l.text === 'string' && l.text.length > 200, l.id + ': текст на месте');
    });
    // у Б7 текста нет — это математика
    eq(CONTENT.lesson('B7.1').text, null, 'у Б7.1 текста нет, и это нормально');
  });

  describe('2.7.0 контент: probe у задания — код таксономии', function () {
    var bad = [];
    ['B7', 'B8'].forEach(function (b) {
      CONTENT.lessons(b).forEach(function (l) {
        (l.tasks || []).forEach(function (t) {
          if (!t.probe) return;                        // поле необязательное
          if (!State.debtCat(t.probe)) bad.push(l.id + ' → ' + t.probe);
        });
      });
    });
    eq(bad, [], 'все probe ссылаются на живые категории долгов');
  });

  /* ============ блок К: субботы ============ */

  describe('2.7.0 контент: блок К — десять конкурсных уроков', function () {
    var list = CONTENT.lessons('B53');
    eq(list.length, 10, 'десять уроков');
    ok(list.every(function (l) { return l.type === 'contest'; }), 'все конкурсные');
    ok(list.every(function (l) { return PROMPTS.isContest(l); }), 'и движок их такими считает');
    eq(CONTENT.block('B53').deadline, null, 'у блока К дедлайна нет');
    eq(CONTENT.block('B53').label, 'К', 'подпись блока — К');
  });

  describe('2.7.0 контент: К.1–К.3 укомплектованы задачами', function () {
    ['B53.1', 'B53.2', 'B53.3'].forEach(function (id) {
      var l = CONTENT.lesson(id);
      ok(Array.isArray(l.tasks) && l.tasks.length === 3, id + ': три задачи');
      l.tasks.forEach(function (t, i) {
        ok(!!t.key, id + ' задача ' + (i + 1) + ': ключ');
        ok(t.part === 'A' || t.part === 'B', id + ' задача ' + (i + 1) + ': часть A или B');
        ok(!!t.q && !!t.ru, id + ' задача ' + (i + 1) + ': условие и русская строка');
      });
      eq(l.tasks.filter(function (t) { return t.part === 'B'; }).length, 1, id + ': ровно одна часть B');
    });
    // К.4–К.10 приедут пакетами 2.7.1 и 2.7.2
    eq(CONTENT.lesson('B53.4').tasks, null, 'у К.4 задач пока нет — и это ожидаемо');
  });

  describe('2.7.0 контент: подпись блока К доезжает до уроков', function () {
    fresh();
    eq(State.blockLabel('B53'), 'К', 'блок подписан К');
    eq(State.lessonLabel('B53.1'), 'К.1', 'первый урок — К.1');
    eq(State.lessonLabel('B53.10'), 'К.10', 'десятый — К.10');
    eq(State.blockLabel('B7'), 'Б7', 'у блока без подписи всё по-старому');
    eq(State.lessonLabel('B7.2'), 'Б7.2', 'и у его уроков');
  });

  /* ============ форма пакета ============ */

  describe('2.7.0 контент: у всех уроков всех фаз есть заголовок', function () {
    var noTitle = [];
    CONTENT.allBlocks().forEach(function (b) {
      (b.lessons || []).forEach(function (l) {
        if (!l.title || !String(l.title).trim()) noTitle.push(l.id);
      });
    });
    eq(noTitle, [], 'lesson.title есть везде — фолбэка в промпте нет');
  });

  describe('2.7.0 контент: блоки Ф1 доехали в состояние', function () {
    fresh();
    P1.forEach(function (id) {
      ok(!!State.block(id), id + ' есть в состоянии');
      eq(State.block(id).phase, 'p1', id + ' в первой фазе');
    });
    eq(State.block('B53').deadline, null, 'у блока К срока нет — суббота вне дедлайнов');
    eq(State.block('B53').deadlineSource, undefined, 'и источника тоже');
  });

  describe('2.7.0 контент: пакет без phase по-прежнему отбрасывается', function () {
    var before = CONTENT.allBlocks().length;
    CONTENT.register({ blocks: [{ id: 'B901', track: 'math', title: 'ничей', lessons: [] }] });
    eq(CONTENT.allBlocks().length, before, 'блок без фазы в реестр не попал');
    eq(CONTENT.block('B901'), null, 'и по id не находится');
  });

  State.reset();
  State.syncContent();
})();
