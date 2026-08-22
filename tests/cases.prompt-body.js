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
    ok(p.indexOf('видео к этому уроку не задано — сразу 2 проверочных вопроса') > 0,
      'этап 3 переписан под «видео нет»');
    eq(p.indexOf('Видео просмотрено'), -1, 'строки «Видео просмотрено» нет');
    eq(p.indexOf('Просмотр видео в длительность урока не входит'), -1, 'и про длительность видео молчим');
    eq(p.indexOf('подбери сам короткое видео'), -1, 'ИИ не просят выдумывать видео');

    var withVideo = PROMPTS.lesson('B1.1', { today: '2026-08-22' });
    ok(withVideo.indexOf('Видео просмотрено: нет') > 0, 'у урока с видео строка на месте');
    ok(withVideo.indexOf('exam command words explained') > 0, 'запрос видео в этапе 3');
    ok(withVideo.indexOf('Просмотр видео в длительность урока не входит') > 0, 'и правило про длительность');
  });

  describe('промпт B-10: сжатие таймингов только при уроке короче 50 минут', function () {
    fresh('school', 1);         // S1 → урок 30 минут
    var s1 = PROMPTS.lesson('B1.1', { today: '2026-09-10' });
    ok(s1.indexOf('сжимай пропорционально') > 0, 'на 30 минутах сжимаем');
    ok(s1.indexOf('письмо — 3–5 предложений') > 0, 'и письмо короче');

    fresh('school', 3);         // S3 → урок 50 минут
    var s3 = PROMPTS.lesson('B1.1', { today: '2026-09-10' });
    eq(s3.indexOf('сжимай пропорционально'), -1, 'на 50 минутах сжимать нечего');
    ok(s3.indexOf('Просмотр видео в длительность урока не входит') > 0,
      'а строка про видео от длительности не зависит');
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
    // формулировка этапа 5 — дословный текст ТЗ 8.3, её трогать нельзя
    ok(write.indexOf('L3 перенос/«что если»/CEMC ⭐') > 0, 'этап 5 остался как в ТЗ');
    State.setMode('summer');
  });

  describe('промпт B-07: на Г2–Г3 русский выключен', function () {
    fresh('school', 6);         // Г2 → RU 0
    var p = PROMPTS.lesson('B2.1', { today: '2026-09-10' });
    ok(p.indexOf('Доля русского: 0 (русский выключен; включается только по явной просьбе).') > 0,
      'строка контекста говорит по-человечески');
    ok(p.indexOf('8. Русский — 0 (русский выключен; включается только по явной просьбе).') > 0,
      'правило 8 контракта — тем же текстом');
    eq(p.indexOf('в пределах 0'), -1, 'формулировки «в пределах 0» больше нет');
    State.setMode('summer');
  });

  describe('промпт B-11: «финиш L3» печатается один раз', function () {
    fresh('school', 7);         // Г3
    var p = PROMPTS.lesson('B2.1', { today: '2026-09-10' });
    var n = p.split('L3').length - 1;
    ok(p.indexOf('(финиш на L3 обязателен)') > 0, 'требование в строке старта практики');
    eq(p.indexOf('финиш на L3 обязателен; мини-тесты'), -1, 'в «Особом» дубля нет');
    ok(p.indexOf('мини-тесты с таймером') > 0, 'остальное «Особое» на месте');
    ok(n <= 3, 'L3 не размножился по промпту (' + n + ')');
    State.setMode('summer');
  });

  describe('память B-08: долги — только своей дорожки', function () {
    fresh();
    State.applySummary('B1.1', summary({ debts: ['путает however и therefore'] }), { date: '2026-08-19' });
    State.applySummary('B2.1', summary({ debts: ['путает знак наклона'] }), { date: '2026-08-20' });

    var math = PROMPTS.lesson('B2.2', { today: '2026-08-21' });
    ok(math.indexOf('путает знак наклона') > 0, 'свой долг в промпте');
    eq(math.indexOf('however и therefore'), -1, 'чужой долг не подмешан');

    // у дорожки без долгов — честное «нет», а не добор чужими
    var cs = PROMPTS.lesson('B5.1', { today: '2026-08-21' });   // дорожка biz, долгов нет
    ok(cs.indexOf('Открытые долги (проработай в разогреве и практике): нет') > 0,
      'пусто значит «нет»');
    eq(State.debtsCount('biz'), 0, 'счётчик долгов дорожки тоже честный');
    eq(State.debtsCount('math'), 1, 'и у математики свой');
  });

  describe('память B-04: дорожка all память не фильтрует', function () {
    fresh();
    State.applySummary('B1.1', summary({
      topics: 'команды заданий', words: [{ en: 'rubric', ru: 'критерии' }], debts: ['путает however']
    }), { date: '2026-08-19' });
    State.applySummary('B2.1', summary({
      topics: 'наклон', words: [{ en: 'slope', ru: 'наклон' }], debts: ['путает знак наклона']
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

  describe('свежесть A-14: дорожка без уроков считается от онбординга', function () {
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
  });

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
    eq(summer.stepLabel, 'Лето (пресет S2)', 'строка параметров называет пресет');
    eq(STEPS.cardLine(summer),
      'Лето (пресет S2) · ~40 мин · ≥28 вопросов · старт L1 · перенос ×1–2 · RU ≤30%',
      'та же строка, что в Настройках слева');
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
