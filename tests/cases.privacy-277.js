/* ============================================================
   2.7.7 · Э11 — личные данные не уходят в публичный репозиторий.
   Люди в посевах, миграциях, контенте, тестах и документах — только
   ролями («учителю MHF4U», «консультанту»). Правила без имён: номера
   кабинетов, e-mail, телефоны. Фамилии и название школы — по локальному
   списку spec/privacy-denylist.txt, которого в репозитории нет.
   ============================================================ */

(function () {
  'use strict';

  /** Кабинет или комната с номером — «каб.», «кабинет», «room», за ними цифры. */
  var ROOM = /(?<!\p{L})(каб\.?|кабинет[а-яё]*|room|rm\.)\s*№?\s*\d{1,4}/iu;
  /** Адрес почты; служебные noreply-адреса git и соавторства — не личные. */
  var EMAIL = /[\p{L}0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}/iu;
  var EMAIL_OK = /noreply/i;
  /** Телефон в формате Северной Америки: код, три и четыре цифры через пробел, точку или дефис. */
  var PHONE = /(?<![\p{L}\d])(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)/u;

  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /** Слово целиком: ловится и внутри id события через дефисы, но не как часть другого слова. */
  function wordRe(w) { return new RegExp('(?<!\\p{L})' + escRe(w) + '(?!\\p{L})', 'iu'); }

  /** → ['путь:строка', …] для строк, где сработало правило. */
  function hits(files, test) {
    var out = [];
    files.forEach(function (f) {
      f.text.split(/\r?\n/).forEach(function (line, i) {
        if (test(line)) out.push(f.path + ':' + (i + 1));
      });
    });
    return out;
  }

  var files = __repoFiles();
  var deny = __denylist().map(wordRe);

  describe('2.7.7 Э11: в файлах репозитория нет личных данных', function () {
    ok(files.length > 40, 'файлы репозитория найдены');
    ok(['radar.js', 'state.js', 'content/phase1.js', 'tests/cases.hotfix-275.js']
      .every(function (p) { return files.some(function (f) { return f.path === p; }); }),
      'посевы, миграции, контент и тесты — в проверке');

    eq(hits(files, function (l) { return ROOM.test(l); }), [], 'номеров кабинетов нет');
    eq(hits(files, function (l) {
      var m = l.match(new RegExp(EMAIL.source, 'giu')) || [];
      return m.some(function (a) { return !EMAIL_OK.test(a); });
    }), [], 'личных e-mail нет');
    eq(hits(files, function (l) { return PHONE.test(l); }), [], 'телефонов нет');
    eq(hits(files, function (l) { return deny.some(function (re) { return re.test(l); }); }), [],
      'фамилий и названия школы из локального списка нет');
  });

  describe('2.7.7 Э11: правила действительно ловят', function () {
    // образцы склеиваются из кусков, чтобы сам файл проверку проходил
    ok(ROOM.test('учителю, ка' + 'б. 7' + '15'), 'кабинет с номером');
    ok(ROOM.test('Roo' + 'm 214'), 'room с номером');
    ok(!ROOM.test('кабинет консультанта'), 'кабинет без номера — не номер');
    ok(EMAIL.test('someone' + '@' + 'school.ca'), 'адрес почты');
    ok(PHONE.test('(416) 5' + '55-0199'), 'телефон');
    ok(!PHONE.test('2026-09-14 · 18.11.2026'), 'даты телефоном не считаются');
    var probe = wordRe('zz' + 'probe');
    ok(probe.test('ev-2026-09-14-zz' + 'probe-csmc'), 'слово из списка в id события');
    ok(!probe.test('zz' + 'probes'), 'но не часть другого слова');
  });
})();
