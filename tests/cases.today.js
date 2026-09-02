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
    eq(line(t), 'сегодня: 1 очко · план: карточки + пересказ', 'минималка');

    State.setLevel('norm');
    eq(line(t), 'сегодня: 2 очка · план: минималка + 1 урок', 'норма');

    State.setLevel('full');
    eq(line(t), 'сегодня: 3 очка · план: минималка + 2 урока', 'полная');
  });

  describe('статусная строка: добавки дописываются с итогом', function () {
    fresh();
    var t = State.today();
    State.setLevel('full');
    State.toggleAddon('project');
    eq(line(t),
      'сегодня: 3 очка · план: минималка + 2 урока · + Проект (+2) = 5 очков',
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

    // вчера была учёба: день ещё идёт, ругаться не за что. С 2.7.0 серию
    // держат урок и минималка, поэтому «продуктивное вчера» — это они, не очки
    State.s.days[U.addDays(t, -1)] = { level: 'min', addons: [], lessons: [], points: 1, minimalSteps: [true, true] };
    ok(html().indexOf('mono fire') > 0, 'после продуктивного вчера ноль не красный');
    ok(line(t).indexOf('серия 🔥 1 ждёт') > 0, 'строка показывает живую серию');

    // вчера было пусто — вот теперь красный
    State.s.days[U.addDays(t, -1)] = { level: 'none', addons: [], lessons: [], points: 0 };
    State.s.days[U.addDays(t, -2)] = { level: 'full', addons: [], lessons: ['B1.1'], points: 3 };
    ok(html().indexOf('mono r') > 0, 'вчера пусто — ноль красный');
    eq(line(t), 'сегодня: 0 очков · вчера было пусто — минималка вернёт серию', 'мягкое предупреждение');

    // два пустых позади — текст жёстче
    State.s.days[U.addDays(t, -2)] = { level: 'none', addons: [], lessons: [], points: 0 };
    State.s.days[U.addDays(t, -3)] = { level: 'full', addons: [], lessons: ['B1.1'], points: 3 };
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
    ok(line(t).indexOf('план: минималка + 1 урок') > 0, 'смысл уровня при этом не поехал');
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

  /* ============================================================
     ПЛАН ДНЯ: состав списка, галочки, отметки
     ============================================================ */

  /** План на понедельник — урок в этот день точно есть. */
  var MON = '2026-08-24';
  var SUN = '2026-08-23';

  function plan(level, date, over) {
    fresh();
    var t = date || MON;
    var d = State.day(t, true);
    d.level = level;
    Object.assign(d, over || {});
    State.recount(t);
    if (over && over.open) App.setOpen(over.open); else App.resetOpen();
    return { t: t, d: d, items: App.planItems(t, d), html: App.planBlock(t, d) };
  }

  function ids(p) { return p.items.map(function (x) { return x.id; }); }
  function titles(p) { return p.items.map(function (x) { return x.title; }); }

  describe('план: пусто — список пуст, внутри призыв', function () {
    var p = plan('none');
    eq(ids(p), [], 'пунктов нет');
    ok(p.html.indexOf('Выбери уровень — серия 🔥') > 0, 'мягкий призыв внутри блока');
    ok(p.html.indexOf('data-level="min"') > 0, 'кнопка «Минималка ~10 мин»');
    ok(p.html.indexOf('Минималка ~10 мин') > 0, 'с названием времени');
    eq(p.html.indexOf('data-summary'), -1, 'кнопки итога нет');
    eq(p.html.indexOf('data-copy'), -1, 'кнопки промпта урока нет');
  });

  describe('план: минималка — два пункта, урока нет', function () {
    var p = plan('min');
    eq(ids(p), ['cards', 'retell'], 'карточки и пересказ');
    eq(titles(p), ['Карточки', 'Пересказ 60 сек'], 'названия пунктов');
    eq(p.html.indexOf('data-summary'), -1, 'кнопки итога нет');
    eq(p.html.indexOf('data-copy'), -1, 'кнопки промпта урока нет');
    ok(plan('min', MON, { open: 'retell' }).html.indexOf('data-minprompt') > 0, 'промпт разминки на месте');
    eq(p.items[0].sub, 'колода пуста — видео ~5 мин', 'подпись про пустую колоду');
  });

  describe('план: минималка — подпись карточек считает банк', function () {
    fresh();
    State.applySummary('B1.1', {
      score: 8, level: 'L2', topics: 'x',
      words: [{ en: 'rubric', ru: 'критерии' }, { en: 'submit', ru: 'сдать' }],
      debts: ['путает justify'], cleared: [], warmup: [], writing: '', raw: ''
    }, { date: MON });
    var d = State.day(MON, true);
    d.level = 'min';
    App.resetOpen();
    var items = App.planItems(MON, d);
    eq(items[0].sub, '2 слова + 1 долг', 'реальные числа со склонением');
    ok(App.planBlock(MON, d).indexOf('data-cards') > 0, 'кнопка карточек появилась');
  });

  describe('план: норма — минималка и урок', function () {
    var p = plan('norm', MON, { open: 'l1' });
    eq(ids(p), ['min', 'l1'], 'два пункта');
    // после сжатия Ф0 самый горящий блок — Б2 (дедлайн 27.08), его водопад и берёт
    eq(p.items[1].title.indexOf('Урок: Б2.1 „'), 0, 'после сжатия Ф0 водопад берёт Б2 — у него дедлайн 27.08');
    ok(p.html.indexOf('data-copy') > 0, 'кнопка промпта внутри пункта урока');
    ok(p.html.indexOf('data-summary') > 0, 'кнопка итога внутри пункта урока');
    ok(p.html.indexOf('выбор:') > 0, 'бейдж причины выбора сохранён');
    eq(p.html.indexOf('Перерыв'), -1, 'перерыва в норме нет');
  });

  describe('план: полная — четыре пункта, второй урок заперт', function () {
    var p = plan('full');
    eq(ids(p), ['min', 'l1', 'break', 'l2'], 'минималка, урок 1, перерыв, урок 2');
    ok(p.items[1].title.indexOf('Урок 1: ') === 0, 'первый урок пронумерован');
    eq(p.items[3].title, 'Урок 2: другая дорожка', 'второй пока без темы');
    eq(p.items[3].sub, 'после урока 1', 'и с подписью ожидания');
    eq(p.items[3].locked, true, 'заперт');
    ok(/pitem[^"]*locked/.test(p.html), 'в разметке приглушён');

    // закрыли первый урок — второй ожил
    var after = plan('full', MON, { lessons: ['B1.1'] });
    eq(after.items[1].done, true, 'урок 1 отмечен');
    ok(!after.items[3].locked, 'урок 2 разблокирован');
    ok(after.items[3].title.indexOf('Урок 2: Б') === 0, 'и получил свой урок: ' + after.items[3].title);
    ok(after.items[3].sub.indexOf('другая дорожка') === 0, 'подпись про другую дорожку');
  });

  describe('план: воскресенье — радар первым, уроки по запросу', function () {
    var p = plan('norm', SUN, { open: 'radar' });
    eq(ids(p), ['radar', 'min'], 'радар первым, урочных пунктов нет');
    eq(p.items[0].title, 'Воскресный радар', 'название пункта');
    eq(p.items[0].sub, 'чек-лист недели', 'подпись');
    eq((p.html.match(/data-check=/g) || []).length, 5, 'пять галочек чек-листа прямо в пункте');
    ok(p.html.indexOf('data-force-lesson') > 0, 'ссылка «всё равно хочу урок» внутри блока');

    // попросили урок — урочные пункты появились
    var forced = plan('norm', SUN, { forceLesson: true });
    eq(ids(forced), ['radar', 'min', 'l1'], 'урок добавился после запроса');

    // в будни радара в плане нет
    eq(ids(plan('norm')).indexOf('radar'), -1, 'в понедельник радара в плане нет');
  });

  describe('план: воскресенье — минималка тоже доступна', function () {
    var p = plan('min', SUN);
    eq(ids(p), ['radar', 'cards', 'retell'], 'радар и шаги минималки');
  });

  // в воскресенье урочных пунктов в плане нет вовсе (app.js: раздел 7.8),
  // поэтому кейс про галочку урока обязан идти в будний день
  describe('план: галочка урока ставится только итогом', function () { withToday(MON, function () {
    fresh();
    var t = State.today();
    State.setLevel('norm');

    var before = State.day(t).lessons.length;
    App.tick('lesson');
    eq(State.day(t).lessons.length, before, 'тап по кружку урока ничего не закрывает');

    var d = State.day(t);
    eq(App.planItems(t, d).filter(function (x) { return x.id === 'l1'; })[0].done, false,
      'пункт урока не отмечен');

    // валидный итог — и пункт закрылся
    var sel = Lesson.dayLesson(1, t);
    State.applySummary(sel.lessonId, {
      score: 8, level: 'L2', topics: 'x', words: [], debts: [], cleared: [], warmup: [], writing: '', raw: ''
    }, { date: t });
    eq(App.planItems(t, State.day(t)).filter(function (x) { return x.id === 'l1'; })[0].done, true,
      'после итога пункт отмечен');
  }); });

  // на полном уровне в плане есть перерыв и два урока — но только в будни:
  // в воскресенье первым пунктом идёт радар, а урочных нет вовсе
  describe('план: ручные галочки пишутся в день и переживают перерисовку', function () { withToday(MON, function () {
    fresh();
    var t = State.today();
    State.setLevel('full');

    App.tick('min');
    eq(State.day(t).minimalSteps, [true, true], 'кружок «Минималка» ставит оба шага');
    eq(State.points(t), 3, 'очки не изменились — их дал уровень');

    App.tick('break');
    eq(State.day(t).breakDone, true, 'перерыв отмечен');

    var items = App.planItems(t, State.day(t));
    eq(items[0].done, true, 'минималка отмечена после перерисовки');
    eq(items[2].done, true, 'перерыв отмечен после перерисовки');

    App.tick('min');
    eq(State.day(t).minimalSteps, [false, false], 'повторный тап снимает');
    App.tick('break');
    eq(State.day(t).breakDone, false, 'и перерыв снимается');
    eq(State.points(t), 3, 'очки по-прежнему от уровня');
  }); });

  describe('план: полный чек-лист радара ставит добавку сам', function () {
    fresh();
    var t = State.today();          // tick всегда работает по «сегодня»
    State.setLevel('min');

    eq(Radar.checklistDone(t), false, 'чек-лист пуст');
    eq(State.day(t).addons.indexOf('radar'), -1, 'добавки нет');
    var before = State.points(t);

    App.tick('radar');
    eq(Radar.checklistDone(t), true, 'все пять отмечены');
    ok(State.day(t).addons.indexOf('radar') >= 0, 'добавка radar поставилась сама');
    eq(State.points(t), before + 1, 'и дала своё очко по доктрине');

    App.tick('radar');
    eq(Radar.checklistDone(t), false, 'снятие снимает всё');
    eq(State.day(t).addons.indexOf('radar'), -1, 'и добавку тоже');
    eq(State.points(t), before, 'очко ушло вместе с ней');

    // пункт плана зеленеет от закрытого чек-листа своего дня
    Radar.setChecklistAll(true, SUN);
    var sd = State.day(SUN, true);
    sd.level = 'min';
    eq(App.planItems(SUN, sd)[0].done, true, 'пункт плана зелёный');
  });

  describe('добавки: «Воскресный радар» из чипов убран навсегда', function () {
    fresh();
    var d = State.day(MON, true);
    var html = App.addonChips(d);
    ok(html.indexOf('>Сверх плана</div>') > 0, 'заголовок отдельной строкой и без двоеточия');
    ok(html.indexOf('class="agrid"') > 0, 'чипы лежат в сетке');
    eq(html.indexOf('Воскресный радар'), -1, 'радара среди чипов нет');
    ok(html.indexOf('Доп. урок') > 0, 'остальные добавки на месте');
    eq((html.match(/data-addon=/g) || []).length, 4, 'в сетке всегда четыре добавки');
    eq((html.match(/data-addon=/g) || []).length, State.s.settings.addons.length - 1,
      'чипов на один меньше, чем добавок в доктрине');

    // очки берутся из настроек и печатаются моноширинным
    ok(html.indexOf('<b class="mono">+3</b>') > 0, 'у доп. урока +3');
    ok(html.indexOf('<b class="mono">+2</b>') > 0, 'у остальных +2');
    ok(html.indexOf('К тесту') > 0, 'длинная подпись сокращена для полширины');
    eq(html.indexOf('Подготовка к тесту<'), -1, 'полное название в чип не поехало');
    ok(html.indexOf('aria-label="Подготовка к тесту, +2"') > 0, 'но остаётся в aria-label');

    // правка веса в Настройках сразу видна в подписи
    DOCTRINE.byId(State.s.settings.addons, 'project').points = 4;
    ok(App.addonChips(d).indexOf('<b class="mono">+4</b>') > 0, 'число не захардкожено');
    DOCTRINE.byId(State.s.settings.addons, 'project').points = 2;

    // переименованную добавку сокращать нельзя — это уже слова владельца
    DOCTRINE.byId(State.s.settings.addons, 'test').name = 'Репетиция экзамена';
    ok(App.addonChips(d).indexOf('Репетиция экзамена') > 0, 'своё название показывается целиком');
    DOCTRINE.byId(State.s.settings.addons, 'test').name = 'Подготовка к тесту';

    // сама добавка из доктрины никуда не делась — её ставит чек-лист
    ok(DOCTRINE.byId(State.s.settings.addons, 'radar'), 'в доктрине добавка осталась');

    // и в воскресенье её в чипах тоже нет
    eq(App.addonChips(State.day(SUN, true)).indexOf('Воскресный радар'), -1, 'в вс тоже нет');
  });

  // в воскресенье к минималке добавляется пункт радара, и день закрывается
  // только вместе с ним — этот кейс про будни
  describe('план: закрытый день получает зелёный блок', function () { withToday(MON, function () {
    fresh();
    var t = State.today();
    State.setLevel('min');
    var open = App.planBlock(t, State.day(t));
    eq(/class="plan done"/.test(open), false, 'пока не всё сделано — обычный блок');

    App.tick('m0');
    App.tick('m1');
    var closed = App.planBlock(t, State.day(t));
    ok(/class="plan done"/.test(closed), 'все пункты — блок закрыт');
    ok(closed.indexOf('День закрыт ✓ 1 очко') > 0, 'строка итога дня со склонением');
  }); });

  describe('план: селектор уровня — сегмент-контрол', function () {
    fresh();
    var d = State.day(MON, true);
    d.level = 'norm';
    var html = App.levelSeg(d);
    eq((html.match(/data-level=/g) || []).length, 4, 'четыре сегмента');
    ok(html.indexOf('data-level="norm" aria-pressed="true"') > 0, 'активный отмечен');
    ok(html.indexOf('data-level="min" aria-pressed="false"') > 0, 'остальные — нет');
    eq(html.indexOf('data-addon'), -1, 'добавок в селекторе нет');
  });

  describe('план: раскрыт первый невыполненный пункт', function () {
    var p = plan('full');
    ok(/pitem[^"]*open/.test(p.html), 'какой-то пункт раскрыт');
    // первый невыполненный — минималка
    var first = p.html.slice(p.html.indexOf('pitem'), p.html.indexOf('pitem', 40));
    ok(first.indexOf('open') > 0, 'раскрыт именно первый');

    // минималка сделана — раскрывается урок
    var next = plan('full', MON, { minimalSteps: [true, true] });
    var body = next.html;
    var l1 = body.indexOf('Урок 1');
    ok(body.slice(0, l1).lastIndexOf('open') > body.slice(0, l1).lastIndexOf('pitem done'),
      'после закрытой минималки раскрыт урок 1');
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

  // среда: только в середине недели видны все четыре состояния кружка разом.
  // Раньше кейс подстраивался под живой день и три дня в неделю молча
  // пропускал по одной проверке — теперь их всегда четыре
  describe('кружки дней: закрытый, сегодняшний, пропущенный, будущий', function () { withToday('2026-08-26', function () {
    fresh();
    var t = State.today();
    var ws = U.weekStart(t);
    var idx = U.weekday(t) - 1;

    State.s.days[ws] = { level: 'min', addons: [], lessons: [], points: 1 };
    var html = App.weekDays(t);
    var cells = html.split('<div class="wd ').slice(1).map(function (s) { return s.slice(0, s.indexOf('"')); });

    eq(cells.length, 7, 'семь кружков');
    ok(cells[0].indexOf('f-min') >= 0, 'понедельник залит уровнем минималки');
    ok(cells[idx].indexOf('now') >= 0, 'сегодняшний обведён');
    ok(cells[6].indexOf('future') >= 0, 'воскресенье впереди — контур');
    ok(cells[1].indexOf('miss') >= 0, 'пустой прошедший помечен пропуском');
  }); });

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

})();
