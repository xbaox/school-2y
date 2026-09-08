/* 2.7.3, этап 2: урок по домашнему заданию школы, категории долгов «Бизнес»
   и раскладка ступеней целиком.

   ДЗ-урок помогает программе, а не заменяет её: отсюда будни, лимит трёх на
   неделе и отдельное хранилище — программный урок пройденным он не делает. */

(function () {
  'use strict';

  // неделя 14–20.09.2026: понедельник … воскресенье. Разгон Ф0 к ней уже
  // закончился, поэтому цифры ступени приходят настоящие
  var MON = '2026-09-14', TUE = '2026-09-15', WED = '2026-09-16',
    THU = '2026-09-17', FRI = '2026-09-18', SAT = '2026-09-19';
  var NEXT_MON = '2026-09-21';
  var HW_TUE = 'HW-2026-09-15-math';

  function fresh(stage) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage(stage || 'S1');
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'производные',
      words: [], debts: [], cleared: [], warmup: [], checklist: null, stretch: null,
      writing: '', raw: ''
    }, over || {});
  }

  /* ============ 2.1: курсы школы ============ */

  describe('ДЗ-урок: курсы школы и их дорожки', function () {
    fresh();
    var list = State.schoolCourses();
    eq(list.length, 4, 'курсов четыре');
    eq(list.map(function (c) { return c.code; }), ['MHF4U', 'ENG2D', 'GLC2O', 'ICS3U'],
      'коды по умолчанию');
    eq(list.map(function (c) { return c.track; }), ['math', 'write', 'biz', 'cs'],
      'дорожки по умолчанию');
    list.forEach(function (c) {
      ok(c.name && c.name.indexOf('—') > 0, 'код ' + c.code + ' расшифрован');
    });
    ok(State.schoolCourse('ICS3U').editable, 'код онлайн-информатики правится владельцем');

    eq((State.schoolCourse('mhf4u') || {}).track, 'math', 'код ищется без учёта регистра');
    eq(State.schoolCourse('CHC2D'), null, 'чужого курса в списке нет');

    // список живёт в настройках: владелец правит код информатики после
    // разговора с консультантом, и правка переживает перезагрузку
    ok(Array.isArray(State.s.settings.schoolCourses), 'список лежит в настройках');
  });

  /* ============ 2.1: кнопка и лимит трёх на неделе ============ */

  describe('ДЗ-урок: кнопка, счётчик и лимит трёх', function () {
    fresh();
    eq(State.hwWeekCount(TUE), 0, 'неделя пустая');
    ok(State.hwAvailable(TUE), 'во вторник урок по ДЗ доступен');

    var res = State.startHw('MHF4U', TUE);
    eq([res.id, res.course, res.track], [HW_TUE, 'MHF4U', 'math'], 'id несёт дату и дорожку');
    eq(State.day(TUE).hw, HW_TUE, 'день помечен');
    eq(State.day(TUE).hwCourse, 'MHF4U', 'и курс записан');
    eq(State.day(TUE).pick, undefined, 'выбор программного урока кнопка не трогает');
    eq(State.hwWeekCount(TUE), 1, 'счётчик недели вырос сразу, не дожидаясь ИТОГа');

    State.startHw('ENG2D', WED);
    State.startHw('GLC2O', THU);
    eq(State.hwWeekCount(FRI), 3, 'три взятых дня на неделе');
    ok(!State.hwAvailable(FRI), 'четвёртый на этой неделе не даётся');
    eq(State.hwWeekCount(NEXT_MON), 0, 'следующая неделя считается заново');
    ok(State.hwAvailable(NEXT_MON), 'и снова доступна');

    eq(State.startHw('CHC2D', FRI), null, 'курса вне списка нет — заявки тоже');
  });

  describe('ДЗ-урок: выходные и закрытая норма дня', function () {
    fresh();
    ok(!State.hwAvailable(SAT), 'в субботу ДЗ-урока нет');
    eq(App.hwOffer(SAT), '', 'и кнопки на «Сегодня» тоже');

    fresh();
    State.applySummary('B7.1', summary(), { date: MON });
    ok(!State.hwAvailable(MON), 'норма дня закрыта — ДЗ-урок не предлагается');
    eq(App.hwOffer(MON), '', 'кнопка исчезла');
  });

  describe('ДЗ-урок: кнопка на «Сегодня»', function () {
    fresh();
    var free = App.hwOffer(TUE);
    ok(free.indexOf('Урок по ДЗ') > 0, 'кнопка есть');
    ok(free.indexOf('ДЗ-уроков на неделе: 0/3') > 0, 'счётчик виден');
    eq(free.indexOf('disabled'), -1, 'и она активна');

    State.startHw('MHF4U', TUE);
    var taken = App.hwOffer(TUE);
    ok(taken.indexOf('MHF4U') > 0, 'взятый урок называет курс');
    ok(taken.indexOf('data-copy="' + HW_TUE + '"') > 0, 'кнопка промпта на месте');
    ok(taken.indexOf('data-summary="' + HW_TUE + '"') > 0, 'и приём итога тоже');
    ok(taken.indexOf('ДЗ-уроков на неделе: 1/3') > 0, 'счётчик обновился');

    State.applySummary(HW_TUE, summary({ score: 9 }), { date: TUE });
    var closed = App.hwOffer(TUE);
    ok(closed.indexOf('итог принят · 9/10') > 0, 'после ИТОГа карточка показывает счёт');
    eq(closed.indexOf('data-summary'), -1, 'и второй раз итог не просит');

    fresh();
    State.startHw('MHF4U', TUE);
    State.startHw('ENG2D', WED);
    State.startHw('GLC2O', THU);
    var full = App.hwOffer(FRI);
    ok(full.indexOf('disabled') > 0, 'на четвёртом дне кнопка неактивна');
    ok(full.indexOf('на этой неделе больше нельзя') > 0, 'и объясняет почему');
  });

  /* ============ 2.1: промпт ДЗ-урока ============ */

  describe('ДЗ-урок: промпт собран из блока [ДЗ]', function () {
    fresh('S1');
    State.startHw('MHF4U', TUE);
    var p = PROMPTS.lesson(HW_TUE, { today: TUE });

    ok(p.indexOf('Формат: урок по домашнему заданию школы — курс MHF4U ' +
      '(Advanced Functions — продвинутые функции, 12 класс)') > 0, 'строка формата с расшифровкой');
    ok(p.indexOf('[ДЗ]') > 0, 'блок [ДЗ] на месте');
    ok(p.indexOf('Ученик присылает домашнее задание первым сообщением (фото или текст).') > 0,
      'и начинается он дословно по ТЗ');
    ok(p.indexOf('решаешь все сам до выдачи, про себя, ничего не показывая') > 0,
      'преподаватель решает всё до выдачи');
    ok(p.indexOf('основа — задания ДЗ по счёту ступени (7 штук)') > 0,
      'счёт основы берётся у ступени S1');

    // блоки контракта названы в нём же по имени, поэтому ищем в теле промпта
    var body = p.slice(p.lastIndexOf('[КОНТЕКСТ]'));
    eq(body.indexOf('[ОПОРНЫЕ ЗАДАНИЯ]'), -1, 'опорных заданий у ДЗ нет');
    eq(body.indexOf('[КЛЮЧИ]'), -1, 'и ключей тоже: они в голове преподавателя');
    eq(body.indexOf('[ТЕКСТ]'), -1, 'и текста урока нет');

    ok(p.indexOf('[ГЛОССАРИЙ]') > 0, 'глоссарий приходит запасной, по дорожке');
    ok(p.indexOf('[ЭТАПЫ УРОКА — ступень S1') > 0, 'этапы — как у ступени');
    ok(p.indexOf('=== ИТОГ УРОКА ' + HW_TUE + ' ===') > 0, 'в ИТОГе стоит id ДЗ-урока');
    ok(p.indexOf('КОНТРАКТ ПРЕПОДАВАТЕЛЯ v3') > 0, 'контракт на месте');
    eq(p.indexOf('Блок:'), -1, 'блока у ДЗ-урока нет — и в контекст он не лезет');
  });

  describe('ДЗ-урок: доска долгов — своей дорожки', function () {
    fresh('S1');
    State.applySummary('B2.1', summary({ debts: ['М1 — путает знак наклона'] }), { date: MON });
    State.applySummary('B1.1', summary({ debts: ['П3 — путает however и therefore'] }), { date: MON });

    State.startHw('MHF4U', TUE);
    var p = PROMPTS.lesson(HW_TUE, { today: TUE });
    ok(p.indexOf('путает знак наклона') > 0, 'долг математики в промпте ДЗ');
    eq(p.indexOf('however и therefore'), -1, 'долг письма не подмешан');
  });

  /* ============ 2.1: разбор ИТОГа ============ */

  describe('ДЗ-урок: разбор ИТОГа', function () {
    fresh('S1');
    State.startHw('MHF4U', TUE);
    var res = State.applySummary(HW_TUE, summary({
      score: 9, level: 'L3',
      words: [{ en: 'derivative', ru: 'производная' }],
      debts: ['М2 — теряет знак при переносе']
    }), { date: TUE });

    ok(res.ok, 'итог принят');
    var rec = State.s.hw[HW_TUE];
    eq([rec.date, rec.course, rec.track, rec.score, rec.level],
      [TUE, 'MHF4U', 'math', 9, 'L3'], 'запись state.hw заполнена целиком');

    eq(State.s.lessons[HW_TUE], undefined, 'в программных уроках ДЗ не появляется');
    ok(State.day(TUE).lessons.indexOf(HW_TUE) >= 0, 'но норму дня закрывает');
    eq(State.s.stats.lessonsDone, 1, 'и в счётчик закрытых уроков идёт');
    eq(State.track('math').lastLessonDate, TUE, 'свежесть дорожки сброшена');

    var open = State.openDebts().map(function (d) { return d.cat; });
    ok(open.indexOf('М2') >= 0, 'долг из ДЗ-урока лёг в банк');
    eq(State.wordBank('math').length, 1, 'слово ушло в колоду дорожки');

    eq(State.lessonTrack(HW_TUE), 'math', 'дорожка ДЗ-урока читается из id');
    var last = State.recentSummaries('math', 1)[0];
    eq(last.lessonId, HW_TUE, '«Прошлый раз» видит ДЗ-урок');
  });

  describe('ДЗ-урок: программный урок остаётся непройденным', function () {
    fresh('S1');
    var planned = State.nextLessonInTrack('math');
    State.startHw('MHF4U', TUE);
    State.applySummary(HW_TUE, summary(), { date: TUE });

    ok(!(State.s.lessons[planned] || {}).done, 'программный урок математики не помечен пройденным');
    eq(State.nextLessonInTrack('math'), planned, 'и остаётся следующим на завтра');
    eq(State.day(TUE).pick, undefined, 'выбор урока дня не переписан');
  });

  /* ============ 2.2: категории долгов «Бизнес» ============ */

  describe('долги: категории дорожки «Бизнес»', function () {
    fresh();
    var biz = State.catsForTrack('biz');
    eq(biz.map(function (c) { return c.code; }), ['Б1', 'Б2', 'Б3', 'Б4', 'Б5'],
      'пять категорий бизнеса');
    ok(State.debtCat('Б3').name.indexOf('markup ≠ margin') > 0, 'Б3 названа примером');
    ok(State.debtCat('Б5').name.indexOf('hook → problem → solution → ask') > 0,
      'Б5 описывает структуру питча');

    eq(State.catTrack('Б1'), 'biz', 'код Б ведёт на дорожку бизнеса');
    ok(State.catFitsTrack('Б4', 'biz'), 'и подходит своей дорожке');
    ok(!State.catFitsTrack('Б4', 'math'), 'а математике — нет');

    ok(State.trackHasCats('biz'), 'у бизнеса теперь свои категории');
    ok(!State.trackHasCats('cs'), 'фолбэк «как all» остался только у информатики');

    var line = State.parseDebtLine('B3 — путает markup и margin');
    eq([line.code, line.example], ['Б3', 'путает markup и margin'],
      'латинская B в коде исправляется на кириллическую');
    eq(State.debtCat('Б6'), null, 'Б6 в таксономии нет: категорий бизнеса ровно пять');
  });

  /* ============ 2.3: раскладка ступеней в промпте ============ */

  describe('ступени: стретч обязателен на Г1–Г3', function () {
    fresh('S2');
    var s2 = PROMPTS.lesson('B2.1', { today: TUE });
    ok(s2.indexOf('всегда предлагается: «⭐⭐ или закрываем?»') > 0, 'на S2 стретч предлагается');

    fresh('Г1');
    var g1 = PROMPTS.lesson('B2.1', { today: TUE });
    ok(g1.indexOf('на этой ступени обязателен: спрашивать не нужно, отказа нет') > 0,
      'на Г1 стретч обязателен');
    ok(g1.indexOf('стретч ⭐⭐ обязателен, не по желанию') > 0, 'и «Особое» говорит то же');
    ok(g1.indexOf('одно задание основы — уровня CEMC ⭐') > 0, 'одно задание основы — уровня CEMC');
  });

  describe('ступени: экзаменационная пятница на Г3', function () {
    var LINE = 'Сегодня пятница — экзаменационный режим: 8 заданий на время, ' +
      'без подсказок и образцов; разбор после ИТОГа.';

    fresh('Г3');
    ok(PROMPTS.lesson('B2.1', { today: FRI }).indexOf(LINE) > 0, 'в пятницу режим включён');
    eq(PROMPTS.lesson('B2.1', { today: THU }).indexOf(LINE), -1, 'в четверг — нет');

    fresh('Г2');
    eq(PROMPTS.lesson('B2.1', { today: FRI }).indexOf(LINE), -1, 'на Г2 экзаменационных пятниц нет');
  });
})();
