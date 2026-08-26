/* Закрытие урока и стойкость состояния: A-02, A-06, A-08, A-21. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'наклон',
      words: [], debts: [], cleared: [], warmup: [], writing: '', raw: ''
    }, over || {});
  }

  describe('итог A-02: повторная вставка ничего не удваивает', function () {
    fresh();
    // даты живут от State.today(): прибитая константа протухала через три дня
    var t = State.today();
    var p = summary({
      score: 5, words: [{ en: 'slope', ru: 'наклон' }, { en: 'vertex', ru: 'вершина' }],
      debts: ['путает знак наклона']
    });

    var r1 = State.applySummary('B2.1', p, { date: t });
    var r2 = State.applySummary('B2.1', p, { date: t });

    eq(r1.replaced, false, 'первая вставка — новая запись');
    eq(r2.replaced, true, 'вторая заменила её');
    eq(State.s.summaries.length, 1, 'итог в журнале один');
    eq(State.s.debts.length, 1, 'долг заведён один');
    eq(State.s.stats.lessonsDone, 1, 'урок посчитан один раз');
    eq(State.s.stats.wordsTotal, 2, 'слова не удвоились');
    eq((State.s.days[t] || {}).lessons.length, 1, 'в дне урок один');
  });

  describe('итог A-02: повторная вставка не запускает откат', function () {
    fresh();
    State.setMode('school');
    State.s.step.position = 3;
    // вчера с очками — чтобы не сработало правило «серия сломалась»;
    // до привязки к State.today() тест краснел сам собой через три дня
    var t = State.today();
    State.s.days[U.addDays(t, -1)] = { level: 'min', addons: [], lessons: [], points: 1 };

    var p = summary({ score: 4 });
    State.applySummary('B2.1', p, { date: t });
    State.applySummary('B2.1', p, { date: t });

    eq(StepsFlow.checkDemotion(), false, 'один урок дважды — это не два урока подряд');
    eq(State.s.step.position, 3, 'ступень на месте');

    // а два разных урока ниже 6 откат дают
    State.applySummary('B2.2', summary({ score: 5 }), { date: t });
    eq(StepsFlow.checkDemotion(), true, 'два разных урока ниже 6 — откат');
    eq(State.s.step.position, 2, 'ступень опустилась на одну');
    State.setMode('summer');
  });

  describe('итог A-21: wordsTotal — размер банка уникальных слов', function () {
    fresh();
    State.applySummary('B1.1', summary({
      words: [{ en: 'rubric', ru: 'критерии' }, { en: 'submit', ru: 'сдать' }]
    }), { date: '2026-08-19' });
    State.applySummary('B1.2', summary({
      words: [{ en: 'Rubric', ru: 'критерии' }, { en: 'PEEL', ru: 'схема абзаца' }]
    }), { date: '2026-08-20' });

    eq(State.s.stats.wordsTotal, 3, 'повтор «rubric» в банк второй раз не идёт');
    eq(State.wordBank().length, 3, 'счётчик совпал с банком');
  });

  describe('долги A-08: частичное совпадение требует длины и доли', function () {
    fresh();
    State.applySummary('B2.1', summary({
      debts: ['путает знак наклона', 'не переводит per в умножение']
    }), { date: '2026-08-20' });

    ok(State.matchDebt('путает знак наклона', 'math'), 'точное совпадение находится');
    ok(!State.matchDebt('знак', 'math'), 'короткий огрызок долг не гасит');
    ok(!State.matchDebt('per', 'math'), 'три буквы — не совпадение');
    ok(State.matchDebt('путает знак наклона в графике', 'math'), 'близкая по длине строка совпадает');
    ok(!State.matchDebt('квадратное уравнение', 'math'), 'посторонний текст ничего не гасит');
  });

  describe('долг закрывается двумя разными уроками (8.4)', function () {
    fresh();
    State.applySummary('B2.1', summary({ debts: ['путает знак наклона'] }), { date: '2026-08-20' });
    State.applySummary('B2.2', summary({ cleared: ['путает знак наклона'] }), { date: '2026-08-21' });
    eq(State.s.debts[0].status, 'open', 'после одного урока долг ещё открыт');

    // тот же урок второй раз — не второй урок
    State.applySummary('B2.2', summary({ cleared: ['путает знак наклона'] }), { date: '2026-08-21' });
    eq(State.s.debts[0].status, 'open', 'повтор того же урока долг не закрывает');

    State.applySummary('B2.3', summary({ cleared: ['путает знак наклона'] }), { date: '2026-08-22' });
    eq(State.s.debts[0].status, 'closed', 'два разных урока — долг закрыт');
  });

  describe('бейдж C-03: двойного двоеточия нет', function () {
    eq(Lesson.whyText('радар: тест MPM2D через 2 дня'), 'радар · тест MPM2D через 2 дня', 'радар');
    eq(Lesson.whyText('свежесть: Бизнес 6 дней'), 'свежесть · Бизнес 6 дней', 'свежесть');
    eq(Lesson.whyText('шаблон: понедельник — математика'), 'шаблон · понедельник — математика', 'шаблон');
    eq(Lesson.whyText('второй урок: другой дорожки с уроками нет'),
      'второй урок · другой дорожки с уроками нет', 'второй урок');
    eq(Lesson.whyText('воскресенье — радар-день'), 'воскресенье — радар-день', 'без двоеточия — как было');
    eq(Lesson.whyText('светофор: Б2 горит красным: срочно'),
      'светофор · Б2 горит красным: срочно', 'меняется только первое двоеточие');
    eq(Lesson.whyText(null), '', 'пустая причина не роняет бейдж');
  });

  describe('незакрытый урок A-13: окно поиска — семь дней', function () {
    fresh();
    // промпт скопирован три дня назад, итога так и не было
    State.markPromptCopied('B1.1', '2026-08-17');

    var p = Lesson.findPending('2026-08-20');
    ok(p, 'урок трёхдневной давности найден');
    eq(p.lessonId, 'B1.1', 'тот самый урок');
    eq(p.date, '2026-08-17', 'с датой своего дня — закроется ею');

    eq(Lesson.findPending('2026-08-25'), null, 'за пределами окна не тянем');

    // закрытый урок в списке не висит
    fresh();
    State.markPromptCopied('B1.1', '2026-08-19');
    State.applySummary('B1.1', summary(), { date: '2026-08-19' });
    eq(Lesson.findPending('2026-08-20'), null, 'закрытый урок не считается незавершённым');

    // «урок не состоялся» тоже снимает его
    fresh();
    State.markPromptCopied('B1.1', '2026-08-18');
    var d = State.day('2026-08-18', true);
    d.dropped = ['B1.1'];
    eq(Lesson.findPending('2026-08-20'), null, 'отменённый урок больше не всплывает');

    // берём самый свежий из незакрытых
    fresh();
    State.markPromptCopied('B1.1', '2026-08-16');
    State.markPromptCopied('B2.1', '2026-08-19');
    eq(Lesson.findPending('2026-08-20').lessonId, 'B2.1', 'первым показываем ближайший');
  });

  describe('состояние A-06: битый файл не роняет рендер', function () {
    var broken = {
      meta: { updatedAt: '2026-08-20T10:00:00.000Z' },
      settings: { levels: null, addons: 'нет', ranks: [], ifThen: null, phaseDates: null },
      days: { '2026-08-20': { level: 'full', addons: [], lessons: [], points: 3 } },
      lessons: {}, blocks: {}, debts: null, radar: undefined, todos: [], summaries: null,
      tracks: []
    };
    State.replace(broken);

    ok(Array.isArray(State.s.settings.levels) && State.s.settings.levels.length, 'уровни стали массивом с дефолтами');
    ok(Array.isArray(State.s.settings.addons) && State.s.settings.addons.length, 'добавки восстановлены');
    ok(Array.isArray(State.s.settings.ranks) && State.s.settings.ranks.length, 'ранги восстановлены');
    ok(Array.isArray(State.s.settings.ifThen), 'если-то — массив');
    ok(Array.isArray(State.s.debts) && Array.isArray(State.s.summaries), 'долги и итоги — массивы');
    eq(State.s.tracks.length, 5, 'дорожки восстановлены');
    ok(State.s.settings.phaseDates.p0 && State.s.settings.phaseDates.p0.start, 'даты фаз восстановлены');
    eq(State.points('2026-08-20'), 3, 'очки дня считаются на восстановленных уровнях');
    ok(State.s.meta.onboardedAt, 'дата онбординга проставлена миграцией');
  });

  describe('импорт A-06: проверка до замены состояния', function () {
    fresh();
    State.s.stats.bestStreak = 29;

    eq(State.validateImport(null).ok, false, 'пустой файл отклонён');
    eq(State.validateImport([1, 2]).ok, false, 'массив вместо состояния отклонён');
    eq(State.validateImport({ days: {} }).ok, false, 'без настроек отклонён');
    eq(State.validateImport({ settings: {}, days: [] }).ok, false, 'дни массивом отклонены');
    eq(State.validateImport({ settings: {}, days: {}, debts: 'нет' }).ok, false, 'битые долги отклонены');
    eq(State.validateImport({ settings: {}, days: {} }).ok, true, 'минимальный корректный файл принят');
    ok(/[а-я]/.test(State.validateImport(null).error), 'ошибка по-русски');

    eq(State.s.stats.bestStreak, 29, 'проверка ничего не заменила');
  });

})();
