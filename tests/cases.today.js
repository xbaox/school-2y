/* Статусная строка дня и индикатор «урок N из 2» на «Сегодня». */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
    State.s.onboarded = true;
  }

  /** Текст статусной строки без разметки. */
  function line(iso) {
    var d = State.day(iso || State.today()) || { level: 'none', addons: [], lessons: [] };
    return App.dayLine(iso || State.today(), d).replace(/<[^>]+>/g, '');
  }

  describe('статусная строка: уровень объясняет себя', function () {
    fresh();
    var t = State.today();

    eq(line(t), 'сегодня: 0 очков · пустой день рвёт серию', 'пусто');

    State.setLevel('min');
    eq(line(t), 'сегодня: 1 очко · база дня: карточки + аудио', 'минималка');

    State.setLevel('norm');
    eq(line(t), 'сегодня: 2 очка · минималка + 1 урок', 'норма');

    State.setLevel('full');
    eq(line(t), 'сегодня: 3 очка · минималка + 2 урока (второй — другая дорожка)', 'полная');
  });

  describe('статусная строка: добавки дописываются с итогом', function () {
    fresh();
    var t = State.today();
    State.setLevel('full');
    State.toggleAddon('project');
    eq(line(t),
      'сегодня: 3 очка · минималка + 2 урока (второй — другая дорожка) · + Проект (+2) = 5 очков',
      'полная + проект');

    State.toggleAddon('radar');
    ok(line(t).indexOf('+ Проект (+2) + Воскресный радар (+1) = 6 очков') > 0,
      'две добавки складываются');

    // добавка без выбранного уровня не должна утверждать, что день пустой
    State.setLevel('full');   // снимаем «полную» повторным тапом
    eq(State.day(t).level, 'none', 'повторный тап по уровню снимает его');
    ok(line(t).indexOf('уровень дня не выбран') > 0, 'при добавках без уровня текст честный');
    ok(line(t).indexOf('пустой день рвёт серию') < 0, 'про рваную серию не врём');
  });

  describe('статусная строка: ноль подсвечивается только при живой серии', function () {
    fresh();
    var t = State.today();
    // истории нет — первый день без очков ничего не рвёт
    ok(App.dayLine(t, State.day(t) || { level: 'none', addons: [] }).indexOf('mono fire') > 0,
      'у новичка ноль не красный');

    State.s.days[U.addDays(t, -1)] = { level: 'min', addons: [], lessons: [], points: 1 };
    ok(App.dayLine(t, State.day(t) || { level: 'none', addons: [] }).indexOf('mono r') > 0,
      'при живой серии ноль красный');

    // два пустых позади — текст жёстче
    State.s.days[U.addDays(t, -1)] = { level: 'none', addons: [], lessons: [], points: 0 };
    State.s.days[U.addDays(t, -2)] = { level: 'none', addons: [], lessons: [], points: 0 };
    State.s.days[U.addDays(t, -3)] = { level: 'full', addons: [], lessons: [], points: 3 };
    eq(line(t), 'сегодня: 0 очков · серия на грани — хватит минималки', 'серия на грани');
  });

  describe('статусная строка: очки берутся из настроек, а не из текста', function () {
    fresh();
    var t = State.today();
    // владелец правит вес уровня в Настройках — строка обязана это отразить
    DOCTRINE.byId(State.s.settings.levels, 'norm').points = 4;
    State.setLevel('norm');
    State.recount(t);
    ok(line(t).indexOf('сегодня: 4 очка') === 0, 'вес уровня взят из настроек');
    ok(line(t).indexOf('минималка + 1 урок') > 0, 'смысл уровня при этом не поехал');
  });

  describe('карточка урока: «урок N из 2» только у полной', function () {
    eq(Lesson.ofDayLine('B1.1', { level: 'norm', lessons: [] }), '', 'у нормы ничего не пишем');
    eq(Lesson.ofDayLine('B1.1', { level: 'min', lessons: [] }), '', 'у минималки тоже');
    eq(Lesson.ofDayLine('B1.1', { level: 'none', lessons: [] }), '', 'и у пусто');

    var first = Lesson.ofDayLine('B1.1', { level: 'full', lessons: [] });
    ok(first.indexOf('урок 1 из 2 на сегодня') > 0, 'первый урок полной');

    var second = Lesson.ofDayLine('B2.1', { level: 'full', lessons: ['B1.1'] });
    ok(second.indexOf('урок 2 из 2') > 0, 'после закрытия первого — второй');
    ok(second.indexOf('на сегодня') < 0, 'у второго хвоста «на сегодня» нет');

    // уже закрытый первый урок остаётся первым, а не съезжает во второй
    var reopened = Lesson.ofDayLine('B1.1', { level: 'full', lessons: ['B1.1', 'B2.1'] });
    ok(reopened.indexOf('урок 1 из 2') > 0, 'закрытый первый остаётся первым');

    // третий урок дня (доп. урок) не даёт «3 из 2»
    var third = Lesson.ofDayLine('B3.1', { level: 'full', lessons: ['B1.1', 'B2.1'] });
    ok(third.indexOf('урок 2 из 2') > 0, 'счётчик не выходит за двойку');
  });

  describe('карточка урока: строка живёт в самой карточке', function () {
    fresh();
    var t = State.today();
    State.setLevel('full');
    ok(Lesson.card().indexOf('урок 1 из 2 на сегодня') > 0, 'при полной строка на карточке есть');
    State.setLevel('norm');
    eq(Lesson.card().indexOf('из 2 на сегодня'), -1, 'при норме её нет');
  });

})();
