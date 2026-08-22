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

    eq(line(t), 'сегодня: 0 очков · выбери уровень — серия 🔥 0 ждёт', 'пусто');

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

  describe('статусная строка: красный ноль — только если вчера тоже пусто', function () {
    fresh();
    var t = State.today();
    function html() { return App.dayLine(t, State.day(t) || { level: 'none', addons: [] }); }

    // истории нет — рвать нечего
    ok(html().indexOf('mono fire') > 0, 'у новичка ноль не красный');
    ok(line(t).indexOf('выбери уровень') > 0, 'и текст зовёт, а не ругает');

    // вчера были очки: день ещё идёт, ругаться не за что
    State.s.days[U.addDays(t, -1)] = { level: 'min', addons: [], lessons: [], points: 1 };
    ok(html().indexOf('mono fire') > 0, 'после продуктивного вчера ноль не красный');
    ok(line(t).indexOf('серия 🔥 1 ждёт') > 0, 'строка показывает живую серию');

    // вчера было пусто — вот теперь красный
    State.s.days[U.addDays(t, -1)] = { level: 'none', addons: [], lessons: [], points: 0 };
    State.s.days[U.addDays(t, -2)] = { level: 'full', addons: [], lessons: [], points: 3 };
    ok(html().indexOf('mono r') > 0, 'вчера пусто — ноль красный');
    eq(line(t), 'сегодня: 0 очков · вчера было пусто — минималка вернёт серию', 'мягкое предупреждение');

    // два пустых позади — текст жёстче
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

  /** Слот под чипами на выбранном уровне. Понедельник — урок точно есть. */
  function slot(level, over) {
    fresh();
    var t = '2026-08-24';
    var d = State.day(t, true);
    d.level = level;
    Object.assign(d, over || {});
    State.recount(t);
    return App.daySlot(t, d);
  }

  describe('экран по уровню: пусто — карточки урока нет', function () {
    var html = slot('none');
    ok(html.indexOf('Сегодня пусто') > 0, 'тихая карточка на месте');
    ok(html.indexOf('удержит серию') > 0, 'объясняет, зачем минималка');
    ok(html.indexOf('data-level="min"') > 0, 'кнопка перехода на минималку');
    eq(html.indexOf('class="lesson"'), -1, 'карточки урока нет');
    eq(html.indexOf('data-copy'), -1, 'кнопки «Скопировать промпт» нет');
    eq(html.indexOf('data-summary'), -1, 'кнопки «Вставить итог» нет');
    eq(html.indexOf('data-minprompt'), -1, 'ссылок минималки тоже нет');
    eq(html.indexOf('data-cards'), -1, 'и «Карточки» нет');
    eq(html.indexOf('var(--fire)'), -1, 'ничего оранжевого');
  });

  describe('экран по уровню: минималка — два шага вместо урока', function () {
    var html = slot('min');
    ok(html.indexOf('Минималка') > 0, 'заголовок карточки');
    ok(html.indexOf('~10–15 мин') > 0, 'длительность названа');
    eq(html.indexOf('class="lesson"'), -1, 'карточки урока нет');
    eq(html.indexOf('data-copy'), -1, 'кнопки промпта урока нет');
    eq(html.indexOf('data-summary'), -1, 'кнопки «Вставить итог» нет');

    eq((html.match(/data-mstep=/g) || []).length, 2, 'ровно два шага с чекбоксами');
    ok(html.indexOf('Пересказ вслух: 60 секунд') > 0, 'второй шаг конкретный');
    ok(html.indexOf('data-minprompt') > 0, 'кнопка «Промпт разминки»');
    ok(html.indexOf('Итог урока не нужен') > 0, 'внизу сказано, что итог не требуется');
  });

  describe('экран по уровню: минималка с пустой колодой', function () {
    var html = slot('min');
    ok(html.indexOf('Колода пока пуста') > 0, 'честно про пустую колоду');
    ok(html.indexOf('одно видео/аудио на английском ~5 мин') > 0, 'даёт замену');
    eq(html.indexOf('data-cards'), -1, 'кнопки «Открыть карточки» нет — открывать нечего');

    // наполним банк — первый шаг становится карточками с реальными числами
    State.applySummary('B1.1', {
      score: 8, level: 'L2', topics: 'x',
      words: [{ en: 'rubric', ru: 'критерии' }, { en: 'submit', ru: 'сдать' }],
      debts: ['путает justify'], cleared: [], warmup: [], writing: '', raw: ''
    }, { date: '2026-08-24' });
    var d = State.day('2026-08-24', true);
    d.level = 'min';
    var full = App.daySlot('2026-08-24', d);
    ok(full.indexOf('Карточки: повторить 2 слова + 1 долг') > 0, 'числа реальные и склонённые');
    ok(full.indexOf('data-cards') > 0, 'кнопка «Открыть карточки» появилась');
  });

  describe('экран по уровню: норма — шапка плана плюс урок', function () {
    var html = slot('norm');
    ok(html.indexOf('План: минималка → урок') > 0, 'шапка плана');
    ok(html.indexOf('class="lesson"') > 0, 'карточка урока на месте');
    ok(html.indexOf('data-copy') > 0, 'кнопка промпта есть');
    ok(html.indexOf('data-summary') > 0, 'кнопка итога есть');
    ok(html.indexOf('data-stage-min') > 0, 'этап «минималка» — чекбокс');
    eq((html.match(/class="pstage/g) || []).length, 2, 'два этапа: минималка и урок');
    eq(html.indexOf('перерыв'), -1, 'перерыва в норме нет');
  });

  describe('экран по уровню: полная — четыре этапа и перерыв', function () {
    var html = slot('full');
    ok(html.indexOf('План: минималка → урок 1 → перерыв 5–10 мин без экрана → урок 2 (другая дорожка)') > 0,
      'шапка полной');
    eq((html.match(/class="pstage/g) || []).length, 4, 'четыре этапа');
    ok(html.indexOf('data-stage-break') > 0, 'перерыв отмечается руками');
    ok(html.indexOf('урок 1 из 2 на сегодня') > 0, 'бейдж урока на карточке');
    eq(html.indexOf('pstage hot'), -1, 'до первого итога перерыв не подсвечен');

    // закрыли первый урок — перерыв загорается
    var hot = slot('full', { lessons: ['B1.1'] });
    ok(hot.indexOf('pstage') > 0 && /pstage[^"]*hot/.test(hot), 'после первого урока перерыв подсвечен');
  });

  describe('чек-лист минималки: пишется в days и переживает перерисовку', function () {
    fresh();
    var t = State.today();
    State.setLevel('min');

    App.setMinimalStep(0, true);
    eq(State.day(t).minimalSteps, [true, false], 'первый шаг записан в день');

    // перерисовка берёт отметку из состояния, а не из DOM
    var again = App.daySlot(t, State.day(t));
    eq((again.match(/data-mstep="0" checked/g) || []).length, 1, 'после перерисовки шаг отмечен');
    eq((again.match(/data-mstep="1" checked/g) || []).length, 0, 'второй — нет');

    App.setMinimalStep(1, true);
    eq(State.day(t).minimalSteps, [true, true], 'оба шага записаны');

    // на очки чек-лист не влияет — их дал чип уровня
    eq(State.points(t), 1, 'очки дня остались минималочные');

    App.setMinimalStep(0, false);
    eq(State.day(t).minimalSteps, [false, true], 'снятие тоже пишется');
    eq(State.points(t), 1, 'и снятие очков не трогает');
  });

  describe('чек-лист минималки: этап «минималка» в норме ставит оба шага', function () {
    fresh();
    var t = '2026-08-24';
    var d = State.day(t, true);
    d.level = 'norm';
    d.minimalSteps = [true, true];
    var html = App.daySlot(t, d);
    ok(/pstage on/.test(html), 'этап отмечен, когда оба шага сделаны');

    d.minimalSteps = [true, false];
    ok(!/pstage on[^"]*"[\s\S]{0,80}минималка/.test(App.daySlot(t, d)), 'полшага — этап не закрыт');
  });

  describe('полоса недели: строка ранга в формате v1', function () {
    fresh();
    var t = State.today();
    var ws = U.weekStart(t);
    function text() { return App.weekStrip(t).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

    ok(text().indexOf('0 очков · пока без ранга — до «Искра» ещё 4') === 0, 'пустая неделя');

    State.s.days[ws] = { level: 'full', addons: [], lessons: [], points: 3 };
    State.s.days[U.addDays(ws, 1)] = { level: 'norm', addons: [], lessons: [], points: 2 };
    ok(text().indexOf('5 очков · Искра — до «Ритм» ещё 2') === 0, 'ранг и остаток до следующего');

    State.s.days[U.addDays(ws, 2)] = { level: 'full', addons: ['extra'], lessons: [], points: 6 };
    State.s.days[U.addDays(ws, 3)] = { level: 'full', addons: ['extra', 'club'], lessons: [], points: 8 };
    State.s.days[U.addDays(ws, 4)] = { level: 'full', addons: ['extra'], lessons: [], points: 6 };
    ok(text().indexOf('25 очков · Легенда — потолок недели') === 0, 'выше Легенды рангов нет');
  });

  describe('полоса недели: засечки стоят на порогах рангов', function () {
    fresh();
    var html = App.weekStrip(State.today());
    var lefts = (html.match(/left:[\d.]+%/g) || []).map(function (s) { return parseFloat(s.slice(5)); });
    eq(lefts.length, 6, 'шесть засечек — по числу рангов');
    // пороги 4/7/11/14/17/21 от потолка 21
    eq(lefts.map(function (x) { return Math.round(x); }), [19, 33, 52, 67, 81, 100], 'позиции по порогам');
  });

  describe('кружки дней: закрытый, сегодняшний, пропущенный, будущий', function () {
    fresh();
    var t = State.today();
    var ws = U.weekStart(t);
    var idx = U.weekday(t) - 1;

    State.s.days[ws] = { level: 'min', addons: [], lessons: [], points: 1 };
    var html = App.weekDays(t);
    var cells = html.split('<div class="wd ').slice(1).map(function (s) { return s.slice(0, s.indexOf('"')); });

    eq(cells.length, 7, 'семь кружков');
    ok(cells[0].indexOf('f-min') >= 0 || idx === 0, 'понедельник залит уровнем минималки');
    ok(cells[idx].indexOf('now') >= 0, 'сегодняшний обведён');
    if (idx < 6) ok(cells[6].indexOf('future') >= 0, 'воскресенье впереди — контур');
    if (idx > 1) ok(cells[1].indexOf('miss') >= 0, 'пустой прошедший помечен пропуском');
  });

  describe('кольцо дня: план = верхний уровень плюс добавки', function () {
    fresh();
    eq(App.dayPlan({ level: 'none', addons: [] }), 3, 'без добавок план — полная');
    eq(App.dayPlan({ level: 'min', addons: ['project'] }), 5, 'добавка поднимает план');
    eq(App.dayPlan({ level: 'full', addons: ['extra', 'club'] }), 8, 'две добавки');

    var t = State.today();
    State.setLevel('min');
    ok(App.dayRing(t).indexOf('var(--warn)') > 0, 'минималка — warn');
    State.setLevel('norm');
    ok(App.dayRing(t).indexOf('var(--fire)') > 0, 'норма — fire');
    State.setLevel('full');
    var full = App.dayRing(t);
    ok(full.indexOf('url(#ringgrad)') > 0, 'полная — градиент fire→ok');
    ok(full.indexOf('ring done') > 0, 'план дня выполнен — кольцо замкнулось');
    ok(full.indexOf('stroke-dashoffset="0.0"') > 0, 'дуга полная');
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
