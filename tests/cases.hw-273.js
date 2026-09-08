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

  /** Как это делает App.openHw: переехавший урок берётся из выбора дня. */
  function takeHw(course, iso) {
    var cur = (window.Lesson && Lesson.current(iso)) || {};
    return State.startHw(course, iso, cur.lessonId);
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

    var res = takeHw('MHF4U', TUE);
    eq([res.id, res.course, res.track], [HW_TUE, 'MHF4U', 'math'], 'id несёт дату и дорожку');
    eq(State.day(TUE).hw, HW_TUE, 'день помечен');
    eq(State.day(TUE).hwCourse, 'MHF4U', 'и курс записан');
    eq(State.day(TUE).pick, undefined, 'выбор программного урока кнопка не трогает');
    eq(State.hwWeekCount(TUE), 1, 'счётчик недели вырос сразу, не дожидаясь ИТОГа');

    takeHw('ENG2D', WED);
    takeHw('GLC2O', THU);
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

    takeHw('MHF4U', TUE);
    var taken = App.hwOffer(TUE);
    ok(taken.indexOf('MHF4U') > 0, 'взятый урок называет курс');
    ok(taken.indexOf('data-copy="' + HW_TUE + '"') > 0, 'кнопка промпта на месте');
    ok(taken.indexOf('data-summary="' + HW_TUE + '"') > 0, 'и приём итога тоже');
    ok(taken.indexOf('ДЗ-уроков на неделе: 1/3') > 0, 'счётчик обновился');

    ok(taken.indexOf('Не тот курс? Сменить') > 0, 'до итога курс можно переиграть');

    State.applySummary(HW_TUE, summary({ score: 9 }), { date: TUE });
    var closed = App.hwOffer(TUE);
    ok(closed.indexOf('итог принят · 9/10') > 0, 'после ИТОГа карточка показывает счёт');
    eq(closed.indexOf('data-summary'), -1, 'и второй раз итог не просит');
    eq(closed.indexOf('Не тот курс?'), -1, 'и курс уже не меняется');

    // счёт 0 — такой же закрытый урок, как и любой другой
    fresh();
    takeHw('MHF4U', TUE);
    State.applySummary(HW_TUE, summary({ score: 0, level: 'L1' }), { date: TUE });
    var zero = App.hwOffer(TUE);
    ok(zero.indexOf('итог принят · 0/10') > 0, 'урок, закрытый нулём, тоже закрыт');
    eq(zero.indexOf('data-summary'), -1, 'и повторного итога не просит');

    fresh();
    takeHw('MHF4U', TUE);
    takeHw('ENG2D', WED);
    takeHw('GLC2O', THU);
    var full = App.hwOffer(FRI);
    ok(full.indexOf('disabled') > 0, 'на четвёртом дне кнопка неактивна');
    ok(full.indexOf('на этой неделе больше нельзя') > 0, 'и объясняет почему');
  });

  /* ============ 2.1: промпт ДЗ-урока ============ */

  describe('ДЗ-урок: промпт собран из блока [ДЗ]', function () {
    fresh('S1');
    takeHw('MHF4U', TUE);
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

    // имя блока стоит и в правиле 11 контракта, поэтому ищем в теле промпта
    // и по содержимому: маркер сам по себе прошёл бы и с пустым глоссарием
    ok(body.indexOf('[ГЛОССАРИЙ]') > 0, 'глоссарий приходит запасной, по дорожке');
    ok(body.indexOf('domain — the set of all input values') > 0,
      'и в нём настоящие термины математики, а не пустая шапка');
    ok(p.indexOf('[ЭТАПЫ УРОКА — ступень S1') > 0, 'этапы — как у ступени');
    ok(p.indexOf('=== ИТОГ УРОКА ' + HW_TUE + ' ===') > 0, 'в ИТОГе стоит id ДЗ-урока');
    ok(p.indexOf('КОНТРАКТ ПРЕПОДАВАТЕЛЯ v3') > 0, 'контракт на месте');
    eq(p.indexOf('Блок:'), -1, 'блока у ДЗ-урока нет — и в контекст он не лезет');
  });

  describe('ДЗ-урок: доска долгов — своей дорожки', function () {
    fresh('S1');
    State.applySummary('B2.1', summary({ debts: ['М1 — путает знак наклона'] }), { date: MON });
    State.applySummary('B1.1', summary({ debts: ['П3 — путает however и therefore'] }), { date: MON });

    takeHw('MHF4U', TUE);
    var p = PROMPTS.lesson(HW_TUE, { today: TUE });
    ok(p.indexOf('путает знак наклона') > 0, 'долг математики в промпте ДЗ');
    eq(p.indexOf('however и therefore'), -1, 'долг письма не подмешан');
  });

  /* ============ 2.1: разбор ИТОГа ============ */

  describe('ДЗ-урок: разбор ИТОГа', function () {
    fresh('S1');
    takeHw('MHF4U', TUE);
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
    takeHw('MHF4U', TUE);
    State.applySummary(HW_TUE, summary(), { date: TUE });

    ok(!(State.s.lessons[planned] || {}).done, 'программный урок математики не помечен пройденным');
    eq(State.nextLessonInTrack('math'), planned, 'и остаётся следующим на завтра');
    eq(State.day(TUE).pick, undefined, 'выбор урока дня не переписан');
  });

  /* ============ 2.1: критерии письма и стретч по желанию ============ */

  describe('ДЗ-урок: критерии письма в конце промпта', function () {
    fresh('S1');
    takeHw('MHF4U', TUE);
    var p = PROMPTS.lesson(HW_TUE, { today: TUE });

    var MATH = 'Письмо (3): 1 — все требуемые термины использованы верно; ' +
      '1 — полные предложения, одно лицо, present simple, финал называет величину; ' +
      '1 — математически верно';
    ok(p.indexOf('=== КРИТЕРИИ ПИСЬМА ===') > 0, 'блок критериев есть');
    ok(p.indexOf(MATH) > 0, 'три балла письма — те же, что в [КЛЮЧИ] обычного урока математики');
    ok(p.indexOf('=== КРИТЕРИИ ПИСЬМА ===') > p.indexOf('=== КОНЕЦ ==='),
      'и стоят в самом конце, после шаблона ИТОГа');
    eq(p.indexOf('=== КЛЮЧИ'), -1, 'а ключей как не было, так и нет');

    // дорожка решает, какие три балла печатать — точно так же, как в [КЛЮЧИ]
    fresh('S1');
    takeHw('ENG2D', WED);
    var w = PROMPTS.lesson('HW-2026-09-16-write', { today: WED });
    ok(w.indexOf('1 — содержание точно по заданию и по тексту') > 0,
      'у письма — свои три балла');
    eq(w.indexOf('математически верно'), -1, 'и математический критерий туда не попал');

    fresh('S1');
    takeHw('GLC2O', THU);
    var b = PROMPTS.lesson('HW-2026-09-17-biz', { today: THU });
    ok(b.indexOf('1 — содержание точно по заданию и по тексту') > 0,
      'у бизнеса своей строки нет — берётся запасная, как и в [КЛЮЧИ]');
  });

  describe('ДЗ-урок: стретч ⭐⭐ всегда по желанию', function () {
    var FREE = 'всегда предлагается: «⭐⭐ или закрываем?»';
    var MUST = 'на этой ступени обязателен';

    ['Г1', 'Г2', 'Г3'].forEach(function (stage) {
      fresh(stage);
      var prog = PROMPTS.lesson('B2.1', { today: WED });
      ok(prog.indexOf(MUST) > 0, 'в программном уроке ' + stage + ' стретч обязателен');

      takeHw('MHF4U', WED);
      var hw = PROMPTS.lesson('HW-2026-09-16-math', { today: WED });
      ok(hw.indexOf(FREE) > 0, 'а в ДЗ-уроке ' + stage + ' — по желанию');
      eq(hw.indexOf(MUST), -1, 'и требования в этапах нет');
      eq(hw.indexOf('стретч ⭐⭐ обязателен'), -1, 'и в «Особом» ' + stage + ' тоже нет');
      // остальное «Особое» ступени остаётся: снята только обязательность стретча
      ok(hw.indexOf('одно задание основы — уровня CEMC ⭐') > 0,
        'задание уровня CEMC на ' + stage + ' осталось');
    });

    fresh('S2');
    takeHw('MHF4U', WED);
    ok(PROMPTS.lesson('HW-2026-09-16-math', { today: WED }).indexOf(FREE) > 0,
      'на нижних ступенях ничего не меняется');
  });

  /* ============ ДЗ-урок и остальной экран ============ */

  describe('пункт «Урок» гаснет на дне с ДЗ-уроком', function () {
    fresh('S1');
    State.day(TUE, true).level = 'norm';       // без уровня пунктов урока в плане нет
    var planned = App.planItems(TUE, State.day(TUE)).filter(function (i) {
      return i.tick === 'lesson';
    })[0];

    takeHw('MHF4U', TUE);
    State.applySummary(HW_TUE, summary({ score: 8 }), { date: TUE });

    var items = App.planItems(TUE, State.day(TUE) || {});
    var l1 = items.filter(function (i) { return i.tick === 'lesson'; })[0];

    // 2.7.4: пункт гаснет — норму закрыл ДЗ-урок, программный переехал
    eq(l1.sub, 'норма закрыта ДЗ-уроком · программный урок Б2.1 — завтра',
      'подпись называет и причину, и переехавший урок');
    ok(l1.done, 'пункт закрыт: норма дня выполнена');
    eq(l1.body, '', 'тела у пункта нет');
    eq(l1.body.indexOf('data-copy='), -1, 'кнопки промпта программного урока нет');
    ok(planned.title.indexOf('Б2.1') > 0, 'а до ДЗ-урока пункт называл именно этот урок');

    eq(l1.title.indexOf('HW-'), -1, 'сырой id ДЗ-урока в заголовок не попадает');
    eq(String(l1.sub).indexOf('undefined'), -1, 'и подпись не «undefined»');
    eq(l1.body.indexOf('Уроки текущих фаз закрыты'), -1,
      'и тело пункта не врёт, что уроки кончились');

    // норма дня при этом закрыта — ради этого id и кладётся в day.lessons
    ok(State.day(TUE).lessons.indexOf(HW_TUE) >= 0, 'ДЗ-урок остаётся в дне');
    ok(!State.hwAvailable(TUE), 'и второй ДЗ-урок в этот день не даётся');

    eq(Lesson.current(TUE).lessonId.indexOf('HW-'), -1,
      'карточка урока по-прежнему знает программный урок');

    // «Полная / Второй урок» — единственный путь к уроку в такой день,
    // и ДЗ-урок снимает с него замок «после урока 1»
    State.day(TUE).level = 'full';
    var l2 = App.planItems(TUE, State.day(TUE)).filter(function (i) {
      return i.tick === 'lesson';
    })[1];
    ok(!l2.locked, 'второй урок разблокирован: первый урок дня уже был');
    eq(String(l2.sub).indexOf('после урока 1'), -1, 'и замок про него не пишет');
  });

  describe('пункт «Урок»: ДЗ взят, но итога ещё нет', function () {
    fresh('S1');
    State.day(TUE, true).level = 'norm';
    takeHw('MHF4U', TUE);

    var l1 = App.planItems(TUE, State.day(TUE)).filter(function (i) {
      return i.tick === 'lesson';
    })[0];
    ok(l1.sub.indexOf('норма закрыта ДЗ-уроком') === 0, 'пункт гаснет с самого выбора курса');
    ok(l1.sub.indexOf('программный урок Б2.1 — завтра') > 0, 'и называет переехавший урок');
    ok(!l1.done, 'но галочки нет: итог ещё не вставлен');
    eq(l1.body, '', 'и промпт программного урока не предлагается');
  });

  describe('пункт «Урок»: имя переехавшего урока не дрейфует', function () {
    // подпись «— завтра» называется в момент заявки и дальше не пересчитывается:
    // к вечеру выбор дня успевает поменяться, и она начинала называть урок,
    // сделанный сегодня или ведущийся прямо сейчас
    function sub(iso) {
      return App.planItems(iso, State.day(iso)).filter(function (i) {
        return i.tick === 'lesson';
      })[0].sub;
    }

    fresh('S1');
    var d = State.day(TUE, true);
    d.level = 'full';
    var planned = Lesson.current(TUE).lessonId;
    takeHw('MHF4U', TUE);
    State.applySummary(HW_TUE, summary({ score: 8 }), { date: TUE });
    ok(sub(TUE).indexOf('программный урок Б2.1 — завтра') > 0, 'сразу после ИТОГа ДЗ — Б2.1');

    // ученик копирует промпт второго урока: выбор дня переехал на B1.1
    Lesson.remember('B1.1', { kind: 'plan', text: 'второй урок полной' }, TUE);
    eq(State.day(TUE).pick, 'B1.1', 'выбор дня действительно сменился');
    ok(sub(TUE).indexOf('программный урок Б2.1 — завтра') > 0,
      'подпись по-прежнему называет Б2.1, а не урок, который ведётся сейчас');
    eq(sub(TUE).indexOf('Б1.1'), -1, 'ведущийся урок в «— завтра» не попадает');

    // а если переехавший урок всё-таки сделан сегодня — обещать его нечестно
    State.applySummary(planned, summary(), { date: TUE });
    eq(sub(TUE), 'норма закрыта ДЗ-уроком', 'хвост «— завтра» исчезает: урок сделан сегодня');

    // смена курса на том же дне переехавший урок не переписывает
    fresh('S1');
    State.day(WED, true).level = 'norm';
    takeHw('MHF4U', WED);
    var first = State.hwOfDay(WED).moved;
    Lesson.remember('B1.1', { kind: 'plan', text: 'другой' }, WED);
    takeHw('ENG2D', WED);
    eq(State.hwOfDay(WED).moved, first, 'переехавший урок остался прежним');
  });

  /* ============ 2.7.4: конкурсный урок и длина спринта ============ */

  describe('конкурсный урок: контракт знает про три задачи', function () {
    fresh('S1');
    var p = PROMPTS.lesson('B53.1', { today: SAT });

    ok(p.indexOf('Заголовок каждого задания: «Задание N/3 · L2 · 2 marks»') > 0,
      'правило 2 печатает N/3, а не число ступени');
    eq(p.indexOf('Задание N/12'), -1, 'раскладки ступени S1 в контракте нет');
    ok(p.indexOf('[ЭТАПЫ КОНКУРСНОГО УРОКА]') > 0, 'этапы конкурсные');
    ok(p.indexOf('три задачи (A, A, B)') > 0, 'и формат тот же — три задачи');

    // у программного урока той же ступени число прежнее
    var prog = PROMPTS.lesson('B2.1', { today: TUE });
    ok(prog.indexOf('«Задание N/12 · L2 · 2 marks»') > 0, 'программный урок S1 — 12 заданий');
  });

  describe('длина спринта называется одинаково в обоих местах', function () {
    [['S0', '~13–15 минут'], ['S1', '~17 минут'], ['S2', '~20 минут'],
      ['S3', '~22 минуты'], ['S4', '~25 минут'], ['Г1', '~25 минут'],
      ['Г2', '~25 минут'], ['Г3', '~25 минут']].forEach(function (pair) {
      var stage = pair[0], label = pair[1];
      eq(STEPS.stage(stage).sprintLabel, label, 'у ' + stage + ' своя длина спринта');

      fresh(stage);
      var p = PROMPTS.lesson('B2.1', { today: TUE });
      ok(p.indexOf('спринты ' + label + '.') > 0,
        stage + ': строка ступени называет ' + label);
      ok(p.indexOf('Спринт 1 (' + label + ')') > 0,
        stage + ': и «Спринт 1» называет то же самое');
      ok(p.indexOf('Спринт 2 (' + label + ')') > 0,
        stage + ': и «Спринт 2» тоже');
    });

    // до 2.7.4 строка ступени считала половину урока, а этапы брали запасное
    fresh('S1');
    var s1 = PROMPTS.lesson('B2.1', { today: TUE });
    eq(s1.indexOf('спринты ~18 минут'), -1, 'старого расчёта «половина урока» больше нет');
    eq(s1.indexOf('Спринт 1 (~13–15 минут)'), -1, 'и запасного значения на S1 тоже');
  });

  describe('долги дорожки без своих категорий (ДЗ по информатике)', function () {
    fresh('S1');
    var HW_CS = 'HW-2026-09-15-cs';
    takeHw('ICS3U', TUE);
    State.applySummary(HW_CS, summary({
      debts: ['М2 — не показывает ходы', 'П6 — ярлык вместо предложения']
    }), { date: TUE });

    eq(State.openDebts().length, 2, 'долги с урока информатики заведены');
    eq(State.openDebts('cs').length, 0,
      'но своей дорожки у них нет: код решает, что М — математика, П — письмо');

    // доска обязана их показать, иначе контракт требует ПРИОРИТЕТ-долгов,
    // которых на экране нет
    var board = State.debtBoard('cs');
    var open = board.filter(function (r) { return r.debt; }).map(function (r) { return r.cat; });
    eq(open, ['П6', 'М2'], 'доска информатики показывает оба долга');
    eq(State.priorityDebts('cs').length, 2, 'и оба получают ПРИОРИТЕТ');

    takeHw('ICS3U', WED);
    var p = PROMPTS.lesson('HW-2026-09-16-cs', { today: WED });
    ok(p.indexOf('не показывает ходы') > 0, 'долг математики в промпте ДЗ по информатике');
    ok(p.indexOf('ярлык вместо предложения') > 0, 'и долг письма тоже');
    ok(p.indexOf('ПРИОРИТЕТ') > 0, 'пометка ПРИОРИТЕТ на месте — контракту есть что проверять');
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
