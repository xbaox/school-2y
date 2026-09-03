/* Тело промпта по ТЗ (раздел 8.1) и память дорожки 'all'.
   Находки B-02, B-04, B-06, B-07, B-08, B-10, B-11, A-14, A-19. */

(function () {
  'use strict';

  function fresh(mode, pos) {
    State.reset();
    State.syncContent();
    if (mode === 'school') {
      State.setMode('school');
      State.s.step.position = pos || 1;
      State.s.step.cycleStart = '2026-09-08';
      // с 2.7.0 ступень названа в state.scale и двигается только кнопкой;
      // позиция шкалы сама по себе промпт больше не задаёт
      State.setStage(STEPS.label(pos || 1));
    }
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], writing: '', raw: ''
    }, over || {});
  }

  describe('промпт B-02: урок без видео', function () {
    fresh();
    // B1.4 «Повтор + мини-тест Б1» — youtube: null
    var p = PROMPTS.lesson('B1.4', { today: '2026-08-22' });
    ok(p.indexOf('Видео к этому уроку не задано — сразу к заданиям.') > 0,
      'этапы говорят «видео нет»');
    eq(p.indexOf('Видео просмотрено'), -1, 'строки «Видео просмотрено» нет');
    eq(p.indexOf('подбери сам короткое видео'), -1, 'ИИ не просят выдумывать видео');

    var withVideo = PROMPTS.lesson('B1.1', { today: '2026-08-22' });
    ok(withVideo.indexOf('Видео просмотрено: нет') > 0, 'у урока с видео строка на месте');
    ok(withVideo.indexOf('Видео: смотрится до урока по карточке «Что смотреть»') > 0,
      'и правило про видео в этапах');
    ok(withVideo.indexOf('вопрос ученика после видео обязателен (О1)') > 0,
      'вход по видео проверяет долг О1');
  });

  describe('промпт B-10: этапы задаёт ступень, а не сжатие 50-минутного урока', function () {
    fresh('school', 1);
    State.setStage('S0');
    var s0 = PROMPTS.lesson('B1.1', { today: '2026-09-10' });
    ok(s0.indexOf('[ЭТАПЫ УРОКА — ступень S0, 8 заданий, ~30 минут]') > 0, 'шапка этапов S0');
    ok(s0.indexOf('1. Задание 1/8 — разогрев L1: вопрос из [РАЗОГРЕВ].') > 0, 'первое задание');
    ok(s0.indexOf('6. Задание 8/8 — Стретч ⭐ (L3), по желанию') > 0, 'стретч последним');
    ok(s0.indexOf('Счёт: сумма баллов за Основу 1–4 и Письмо (из 3)') > 0, 'правило счёта');

    State.setStage('S1');
    var s1 = PROMPTS.lesson('B1.1', { today: '2026-09-10' });
    ok(s1.indexOf('[ЭТАПЫ УРОКА — ступень S1, 12 заданий, ~35 минут]') > 0, 'шапка этапов S1');
    ok(s1.indexOf('Задания 11/12 и 12/12 — Стретч ⭐') > 0, 'два стретча');
    ok(s1.indexOf('Счёт: сумма баллов за Основу 1–7') > 0, 'и основа шире');

    // старого 50-минутного текста и сжатия больше нет ни на одной ступени
    eq(s1.indexOf('сжимай пропорционально'), -1, 'сжатия нет');
    eq(s1.indexOf('Разбивка заданий: разогрев'), -1, 'мягкой разбивки тоже');

    fresh('school', 4);
    var s4 = PROMPTS.lesson('B1.1', { today: '2026-09-10' });
    eq(s4.indexOf('сжимай пропорционально'), -1, 'сжимать больше нечего ни на одной ступени');
    ok(s4.indexOf('[ЭТАПЫ УРОКА — ступень S4') > 0, 'а шапка называет ступень');
    State.setMode('summer');
  });

  describe('промпт B-06: CEMC ⭐ только в математике', function () {
    fresh('school', 5);         // Г1 — на этой ступени появляется CEMC
    var math = PROMPTS.lesson('B2.1', { today: '2026-09-10' });   // дорожка math
    var write = PROMPTS.lesson('B1.1', { today: '2026-09-10' });  // дорожка write

    ok(math.indexOf('CEMC ⭐') > 0, 'в математике CEMC есть');
    ok(math.indexOf('Особое на этой ступени') > 0, 'строка «Особое» на месте');
    ok(math.indexOf('перевёртыш') > 0, 'и остальное «Особое» тоже');

    eq(write.indexOf('плюс 1 задача уровня CEMC'), -1, 'в письме флага CEMC нет');
    ok(write.indexOf('Особое на этой ступени') > 0, 'строка «Особое» осталась (вердикт B-09)');
    ok(write.indexOf('перевёртыш') > 0, 'непрофильные пункты «Особого» сохранились');
    var writeSpecial = write.slice(write.indexOf('Особое на этой ступени'));
    eq(writeSpecial.slice(0, writeSpecial.indexOf('\n')).indexOf('CEMC'), -1,
      'в «Особом» письма про CEMC ни слова');
    // старая лестница L1→L2→L3 из этапов ушла: уровни задаёт раскладка ступени
    eq(write.indexOf('L3 перенос/«что если»/CEMC ⭐'), -1, 'старого этапа 5 нет');
    ok(write.indexOf('Стретч ⭐ (L3), по желанию') > 0, 'L3 теперь стретч по желанию');
    State.setMode('summer');
  });

  describe('контракт v3: двадцать правил дословно', function () {
    fresh();
    var p = PROMPTS.lesson('B2.1', { today: '2026-08-26' });

    ok(p.indexOf('КОНТРАКТ ПРЕПОДАВАТЕЛЯ v3') > 0, 'заголовок контракта');
    for (var i = 1; i <= 21; i++) {
      ok(p.indexOf('\n' + i + '. ') > 0, 'правило ' + i + ' на месте');
    }
    eq(p.indexOf('\n22. '), -1, 'двадцать второго правила нет');
    // число заданий в правиле 2 берётся у ступени: летом это пресет S2 (14)
    ok(p.indexOf('«Задание N/14 · L2 · 2 marks»') > 0, 'летний пресет даёт 14');
    fresh('school', 1);
    State.setStage('S0');
    ok(PROMPTS.lesson('B2.1', { today: '2026-09-10' }).indexOf('«Задание N/8 · L2 · 2 marks»') > 0,
      'а S0 — восемь');
    State.setMode('summer');

    // корень пакета: контент и приложение решают, ИИ исполняет
    ok(p.indexOf('Строго одно задание на сообщение') > 0, 'по одному заданию');
    ok(p.indexOf('Опорные задания из [ОПОРНЫЕ ЗАДАНИЯ] обязательны') > 0, 'задания из контента');
    ok(p.indexOf('Термины и определения — только из [ГЛОССАРИЙ]') > 0, 'определения из глоссария');
    ok(p.indexOf('Долги решает приложение') > 0, 'долги — не его дело');
    ok(p.indexOf('Слов «закрыт», «погашен» не писать') > 0, 'закрывать долги словами запрещено');
    ok(p.indexOf('Ключ до попытки не цитировать') > 0, 'ключи не раскрываются заранее');
    ok(p.indexOf('Стоп-слово «стоп» / «устал»') > 0, 'стоп-слово');

    // контракта v2 в промпте не осталось
    eq(p.indexOf('[КОНТРАКТ ПРЕПОДАВАТЕЛЯ — 16 правил'), -1, 'старого заголовка нет');
    eq(p.indexOf('Пачки заданий запрещены'), -1, 'формулировок v2 нет');
    eq(p.indexOf('правила проекта'), -1, 'ссылок на внешние правила нет');
  });

  describe('контракт v3: ступень задаёт объём урока', function () {
    fresh('school', 1);
    State.setStage('S0');
    var s0 = PROMPTS.lesson('B2.1', { today: '2026-09-10' });
    ok(s0.indexOf('Ступень: S0 «Старт школы» — 8 заданий = ' +
      '2 разогрев L1 · 4 основа L2 · 1 письмо · 1 стретч ⭐; спринты ~13–15 минут.') > 0,
      'строка ступени S0 собрана целиком');
    ok(s0.indexOf('Два спринта с паузой 2–3 минуты') > 0, 'ритм — в правиле 2 контракта');

    State.setStage('S1');
    var s1 = PROMPTS.lesson('B2.1', { today: '2026-09-10' });
    ok(s1.indexOf('Ступень: S1 — 12 заданий = ' +
      '2 разогрев L1 · 7 основа L2 · 1 письмо · 2 стретч ⭐') > 0, 'а на S1 — двенадцать');
    State.setMode('summer');
  });

  describe('контракт v3: русская строка обязательна на любой ступени', function () {
    fresh('school', 1);
    var s1 = PROMPTS.lesson('B2.1', { today: '2026-09-10' });
    ok(s1.indexOf('Язык: задания и образцы — по-английски, инструкции и разборы — ' +
      'по-русски (правило 1).') > 0, 'на S0–S4 в контексте человеческая строка про язык');
    eq(s1.indexOf('Доля русского:'), -1, 'а доли в процентах нет');
    ok(s1.indexOf('Под каждым английским предложением-образцом — русская строка') > 0,
      'правило 1 контракта требует русскую строку всегда');
    State.setMode('summer');
  });

  describe('промпт B-07: на Г2–Г3 русский выключен', function () {
    fresh('school', 6);         // Г2 → RU 0
    var p = PROMPTS.lesson('B2.1', { today: '2026-09-10' });
    ok(p.indexOf('Доля русского: 0 (русский выключен; включается только по явной просьбе).') > 0,
      'строка контекста говорит по-человечески');
    ok(p.indexOf('Под каждым английским предложением-образцом — русская строка') > 0,
      'но русская строка под образцом остаётся и на Г2');
    eq(p.indexOf('в пределах 0'), -1, 'формулировки «в пределах 0» больше нет');
    State.setMode('summer');
  });

  describe('промпт B-11: «финиш L3» печатается один раз', function () {
    fresh('school', 7);         // Г3
    var p = PROMPTS.lesson('B2.1', { today: '2026-09-10' });
    // строка старта практики убрана из [КОНТЕКСТ] (правка 4b): уровни
    // называет раскладка ступени, а «финиш L3» остаётся в «Особом» Г3
    eq(p.indexOf('(финиш на L3 обязателен)'), -1, 'строки старта практики больше нет');
    ok(p.indexOf('мини-тесты с таймером') > 0, '«Особое» Г3 на месте');
    ok(p.indexOf('Стретч ⭐ (L3)') > 0, 'L3 приходит стретчем');
    eq(p.indexOf('задач на перенос:'), -1, 'и переноса в контексте нет');
    State.setMode('summer');
  });

  describe('память B-08: долги — только своей дорожки', function () {
    fresh();
    State.applySummary('B1.1', summary({ debts: ['П3 — путает however и therefore'] }), { date: '2026-08-19' });
    State.applySummary('B2.1', summary({ debts: ['М1 — путает знак наклона'] }), { date: '2026-08-20' });

    var math = PROMPTS.lesson('B2.2', { today: '2026-08-21' });
    ok(math.indexOf('путает знак наклона') > 0, 'свой долг в промпте');
    eq(math.indexOf('however и therefore'), -1, 'чужой долг не подмешан');

    // у дорожки без долгов доска всё равно печатается — но вся «чисто»,
    // и ни один чужой долг в неё не подмешан
    var cs = PROMPTS.lesson('B5.1', { today: '2026-08-21' });   // дорожка biz, своих долгов нет
    // именно блок, а не упоминание [ДОЛГИ] в правиле 15 контракта;
    // границей служит пустая строка после доски
    var tail = cs.slice(cs.indexOf('[ДОЛГИ '));
    var board = tail.slice(0, tail.indexOf(String.fromCharCode(10, 10)));
    eq(board.indexOf('ОТКРЫТ'), -1, 'пусто значит «чисто» по всем категориям');
    ok(board.indexOf('· чисто') > 0, 'и это прямо написано');
    eq(State.debtsCount('biz'), 0, 'счётчик долгов дорожки тоже честный');
    eq(State.debtsCount('math'), 1, 'и у математики свой');
  });

  describe('память B-04: дорожка all память не фильтрует', function () {
    fresh();
    State.applySummary('B1.1', summary({
      topics: 'команды заданий', words: [{ en: 'rubric', ru: 'критерии' }], debts: ['П3 — путает however']
    }), { date: '2026-08-19' });
    State.applySummary('B2.1', summary({
      topics: 'наклон', words: [{ en: 'slope', ru: 'наклон' }], debts: ['М1 — путает знак наклона']
    }), { date: '2026-08-20' });

    // B16 — блок track:'all' (финалы семестра); уроков в каркасе нет,
    // поэтому память проверяем прямо через State
    var all = State.recentSummaries('all', 3);
    eq(all.length, 2, 'в память all идут итоги любых дорожек');
    eq(State.openDebts('all').length, 2, 'и долги всех дорожек');

    var wordsAll = State.recentWords('all');
    ok(wordsAll.length >= 2, 'слова тоже без фильтра дорожки');

    // а итог урока track:'all' виден каждой дорожке
    State.s.blocks['B16'] = { phase: 'p1', track: 'all', title: 'Финалы', deadline: '2027-01-30', done: false };
    State.s.summaries.push({
      lessonId: 'B16.1', date: '2026-08-21',
      parsed: { score: 9, level: 'L3', topics: 'финал вперемешку', words: [], debts: [], warmup: [] }
    });
    var oldLesson = CONTENT.lesson;
    CONTENT.lesson = function (id) { return id === 'B16.1' ? { id: 'B16.1', blockId: 'B16' } : oldLesson(id); };
    var forMath = State.recentSummaries('math', 3);
    CONTENT.lesson = oldLesson;
    ok(forMath.some(function (x) { return x.lessonId === 'B16.1'; }),
      'финал вперемешку попадает в память математики');
  });

  // подпись свежести смотрит на текущую фазу — кейс про Ф0 в ней и живёт
  describe('свежесть A-14: дорожка без уроков считается от онбординга', function () { withToday('2026-08-24', function () {
    fresh();
    State.s.meta.onboardedAt = '2026-08-18';

    eq(State.freshness('biz', '2026-08-18'), 0, 'в день онбординга свежесть нулевая');
    eq(State.freshness('biz', '2026-08-21'), 3, 'через три дня — три');
    eq(Waterfall.freshColor(State.freshness('biz', '2026-08-18')), 'g',
      'в первый день дорожка зелёная — правило 2 выбор не перехватывает');
    eq(Waterfall.freshColor(State.freshness('biz', '2026-08-24')), 'r', 'через шесть дней — красная');
    ok(State.freshness('biz', '2026-08-23') >= Waterfall.FRESH_RULE_DAYS,
      'на пятый день правило 2 уже срабатывает');
    eq(State.hasTrackHistory('biz'), false, 'уроков на дорожке всё ещё не было');
    ok(Waterfall.freshText('biz', 5).indexOf('ни разу') === 0, 'подпись честная');

    // после первого урока считаем от него
    State.touchTrack('biz', '2026-08-22');
    eq(State.freshness('biz', '2026-08-24'), 2, 'дальше отсчёт от последнего урока');
    eq(State.hasTrackHistory('biz'), true, 'история появилась');
  }); });

  describe('водопад A-19: второй урок при единственной дорожке', function () {
    fresh();
    // закрываем всё, кроме математики: другой дорожки с уроками не остаётся
    Object.keys(State.s.blocks).forEach(function (id) {
      var b = State.s.blocks[id];
      if (b.track === 'math') return;
      State.blockLessons(id).forEach(function (l) {
        State.s.lessons[l.id] = { done: true, score: 8, date: '2026-08-20' };
      });
    });
    // первый урок дня уже закрыт — второй ищется после него
    State.s.lessons['B2.1'] = { done: true, score: 8, date: '2026-08-24' };

    var res = Waterfall.second('2026-08-24', 'B2.1');
    ok(res && res.lessonId, 'второй урок всё-таки нашёлся');
    eq(State.lessonTrack(res.lessonId), 'math', 'он той же дорожки — других нет');
    eq(res.reason.text, 'второй урок: другой дорожки с уроками нет', 'бейдж говорит правду');
  });

  describe('подписи B-16 + A-12: летом на экранах не спорят S1 и пресет S2', function () {
    eq(U.fmtDayMonth('2026-09-08'), '08.09', 'короткая метка даты старта шкалы');
    var summer = STEPS.params({ position: 1 }, '2026-08-22', 'summer');
    eq(summer.stepLabel, 'Лето', 'строка параметров не поминает «пресет»');
    eq(STEPS.cardLine(summer),
      'Лето · ~30–35′ · 10–12 заданий · старт L1 · перенос ×1–2 · RU ≤30%',
      'та же строка, что в Настройках слева (22.08 — разгон Ф0)');
    var school = STEPS.params({ position: 1 }, '2026-09-10', 'school');
    eq(school.stepLabel, 'S1', 'после 08.09 подпись обычная');
  });

  describe('маппинг B-03: ESLEO — это ESL', function () {
    eq(CONTENT.trackForCourse('ESLEO'), 'write', 'ESLEO ведёт на дорожку письма');
    eq(CONTENT.COURSES_NO_TRACK.indexOf('ESLEO'), -1, 'из списка «водопад не назначает» убран');
    ok(CONTENT.trackForCourse('PAF3O') === null, 'фитнес по-прежнему вне маппинга');
  });

  describe('контент B-14: пакет может приехать раньше реестра', function () {
    window.__CONTENT_Q = [{
      phase: 'p4', blocks: [{
        id: 'B99', track: 'math', title: 'Пакет из очереди',
        lessons: [{ title: 'Урок из очереди', goal: 'проверить очередь' }]
      }]
    }];
    var n = CONTENT.drainQueue();
    eq(n, 1, 'очередь разобрана');
    ok(CONTENT.block('B99'), 'блок зарегистрирован');
    eq(CONTENT.lesson('B99.1').title, 'Урок из очереди', 'урок получил id по порядку');
    eq(CONTENT.drainQueue(), 0, 'повторный разбор пустой очереди безопасен');
  });

})();
