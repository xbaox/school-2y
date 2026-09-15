/* 2.7.7, этап 9: ДЗ-урок в пятницу — «в понедельник»; незакрытый урок прошлых дней —
   одной информационной строкой на «Сегодня». */

(function () {
  'use strict';

  var MON = '2026-09-14', TUE = '2026-09-15', WED = '2026-09-16',
    THU = '2026-09-17', FRI = '2026-09-18';

  function fresh(stage) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage(stage || 'S1');
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'т', words: [], debts: [], cleared: [],
      warmup: [], checklist: null, stretch: null, writing: '', raw: ''
    }, over || {});
  }

  function itog(header) {
    return [header, 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10', 'Слова: slope — наклон', '=== КОНЕЦ ==='].join('\n');
  }

  /* ============ Э8: SCHOOL_COURSES по умолчанию ============ */


  function lessonSub(iso) {
    return App.planItems(iso, State.day(iso)).filter(function (i) { return i.tick === 'lesson'; })[0].sub;
  }

  function hwDay(iso, course) {
    fresh('S1');
    State.day(iso, true).level = 'norm';
    var cur = Lesson.current(iso);
    State.startHw(course || 'MHF4U', iso, cur && cur.lessonId);
    return State.lessonLabel(cur.lessonId);
  }

  describe('2.7.7 Э9: переехавший урок — на ближайший учебный день', function () {
    var code = hwDay(FRI);
    eq(lessonSub(FRI), 'норма закрыта ДЗ-уроком · программный урок ' + code + ' — в понедельник',
      'пятница: урок ждёт понедельника, суббота — К');
    eq(lessonSub(FRI).indexOf('завтра'), -1, 'и субботу пятница больше не обещает');

    [MON, TUE, WED, THU].forEach(function (iso) {
      var c = hwDay(iso);
      eq(lessonSub(iso), 'норма закрыта ДЗ-уроком · программный урок ' + c + ' — завтра',
        U.fmtWeekday(iso) + ': завтра учебный день');
    });

    // ИТОГ ДЗ в пятницу подпись не меняет, сделанный урок хвост снимает
    hwDay(FRI);
    var moved = State.hwOfDay(FRI).moved;
    State.applySummary('HW-2026-09-18-math', summary(), { date: FRI });
    ok(/ — в понедельник$/.test(lessonSub(FRI)), 'после ИТОГа ДЗ — по-прежнему понедельник');
    State.applySummary(moved, summary(), { date: FRI });
    eq(lessonSub(FRI), 'норма закрыта ДЗ-уроком', 'урок сделан в пятницу — хвоста нет');
  });

  /* ============ Э9: строка «Вчерашний урок не закрыт» ============ */

  function pendLines(html) {
    return html.match(/<div class="tiny dim center pendline">[^<]*<\/div>/g) || [];
  }

  describe('2.7.7 Э9: незакрытый урок — одна строка над планом, без действий', function () {
    fresh('S1');
    State.markPromptCopied('B2.1', MON);
    withToday(TUE, function () {
      var html = App.Today.render();
      var lines = pendLines(html);
      eq(lines.length, 1, 'строка одна');
      eq(lines[0], '<div class="tiny dim center pendline">Вчерашний урок не закрыт · Б2.1 — остался в очереди</div>',
        'текст: что не закрыто и что урок в очереди');
      ok(html.indexOf(lines[0]) < html.indexOf('<div class="plan'), 'над планом');
      eq(html.indexOf('data-late'), -1, 'кнопки «Вставить итог» прошлым числом нет');
      eq(html.indexOf('data-drop'), -1, 'кнопки «Урок не состоялся» нет');

      // на любом уровне дня, и точки дня строка не трогает
      State.setLevel('min', TUE);
      eq(pendLines(App.Today.render()).length, 1, 'на минималке — тоже');
      eq(State.points(MON), 0, 'вчерашний день без очков — как и был');
    });

    // урок снова скопирован сегодня — им уже занимаются, строка гаснет
    withToday(TUE, function () {
      State.markPromptCopied('B2.1', TUE);
      eq(pendLines(App.Today.render()).length, 0, 'скопирован сегодня — строки нет');
    });

    // старше вчера — с датой; закрыт — строки нет
    fresh('S1');
    State.markPromptCopied('B2.1', MON);
    withToday(THU, function () {
      eq(pendLines(App.Today.render())[0],
        '<div class="tiny dim center pendline">Урок от ' + U.fmtShort(MON) + ' не закрыт · Б2.1 — остался в очереди</div>',
        'три дня назад — с датой');
      State.applySummary('B2.1', summary(), { date: THU });
      eq(pendLines(App.Today.render()).length, 0, 'урок закрыт — строки нет');
    });
  });

  describe('2.7.7 ревью: скопированный сегодня урок не гасит строку старшего незакрытого', function () {
    fresh('S1');
    State.markPromptCopied('B2.1', MON);
    State.markPromptCopied('B8.1', TUE);
    withToday(WED, function () {
      eq(pendLines(App.Today.render())[0],
        '<div class="tiny dim center pendline">Вчерашний урок не закрыт · Б8.1 — остался в очереди</div>', 'сначала ближайший');
      State.markPromptCopied('B8.1', WED);
      eq(Lesson.findPending(WED), { date: MON, lessonId: 'B2.1' }, 'Б8.1 взят сегодня — поиск идёт дальше');
      eq(pendLines(App.Today.render())[0],
        '<div class="tiny dim center pendline">Урок от ' + U.fmtShort(MON) + ' не закрыт · Б2.1 — остался в очереди</div>',
        'строка — про Б2.1');
      State.markPromptCopied('B2.1', WED);
      eq(pendLines(App.Today.render()).length, 0, 'оба взяты сегодня — строки нет');
    });

    // полная вчера: два урока, оба не закрыты; первый взят сегодня — строка про второй
    fresh('S1');
    State.markPromptCopied('B2.1', TUE);
    State.markPromptCopied('B8.1', TUE);
    withToday(WED, function () {
      State.markPromptCopied('B2.1', WED);
      eq(Lesson.findPending(WED), { date: TUE, lessonId: 'B8.1' }, 'второй урок того же дня');
      eq(pendLines(App.Today.render()).length, 1, 'строка осталась');
    });
  });

  describe('2.7.7 Э9: findPending после 2.7.6 — ДЗ-урок не всплывает, действия не навешаны', function () {
    fresh('S1');
    // ДЗ-урок в copied не пишется; даже если попал — закрыть его прошлым числом нельзя
    State.startHw('MHF4U', MON);
    State.markPromptCopied('HW-2026-09-14-math', MON);
    eq(Lesson.findPending(TUE), null, 'ДЗ-урок незакрытым уроком не всплывает');

    // отметка dropped из старых состояний по-прежнему гасит напоминание
    fresh('S1');
    State.markPromptCopied('B2.1', MON);
    State.day(MON).dropped = ['B2.1'];
    eq(Lesson.pendingCard(TUE), '', 'dropped уважается');

    var sels = [], realOn = U.on;
    U.on = function (root, type, sel) { sels.push(sel); };
    try { Lesson.mount(window.fakeNode('section')); } finally { U.on = realOn; }
    eq(sels.filter(function (s) { return s === '[data-late]' || s === '[data-drop]'; }), [],
      'слушателей «Вставить итог»/«Урок не состоялся» больше нет');
  });

  /* ============ Э10: двойники в заголовке ИТОГа ============ */


  State.reset();
  State.syncContent();
})();
