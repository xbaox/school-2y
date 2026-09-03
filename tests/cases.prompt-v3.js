/* 2.7.0 «Корень», этап 4: промпт урока v3 (ТЗ 4.1–4.6).

   Главная проверка пакета: порядок блоков. Ключи стоят последними не для
   красоты — ключ, прочитанный раньше попытки, обесценивает урок. */

(function () {
  'use strict';

  function school(stage) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage(stage || 'S0');
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], checklist: null, writing: '', raw: ''
    }, over || {});
  }

  var T = '2026-09-14';       // понедельник внутри Ф1

  /**
   * Тело промпта без контракта: контракт называет блоки по именам
   * ([ГЛОССАРИЙ], [КЛЮЧИ] и прочие), и искать заголовки надо после него.
   */
  // именно lastIndexOf: правило 2 контракта тоже называет [КОНТЕКСТ]
  function body(p) { return p.slice(p.lastIndexOf('[КОНТЕКСТ]')); }

  /** Позиции блоков в теле промпта — по ним и проверяется порядок. */
  function order(p, marks) {
    var b = body(p);
    return marks.map(function (m) { return b.indexOf(m); });
  }
  function ascending(list) {
    for (var i = 1; i < list.length; i++) if (list[i] <= list[i - 1]) return false;
    return true;
  }

  /* ============ 4.2 порядок блоков ============ */

  describe('2.7.0 промпт B7.1: одиннадцать блоков в порядке ТЗ', function () {
    school('S0');
    var p = PROMPTS.lesson('B7.1', { today: T });

    ok(p.indexOf('КОНТРАКТ ПРЕПОДАВАТЕЛЯ v3') < p.lastIndexOf('[КОНТЕКСТ]'), 'контракт первым');
    var marks = [
      '[КОНТЕКСТ]',
      '[ГЛОССАРИЙ]',
      '[ОПОРНЫЕ ЗАДАНИЯ]',
      '[ДОЛГИ ',
      '[ЧЕК-ЛИСТ ЯЗЫКА] —',
      '[РАЗОГРЕВ]',
      '[ЭТАПЫ УРОКА]',
      '[ФИНАЛ]',
      '=== КЛЮЧИ'
    ];
    var pos = order(p, marks);
    marks.forEach(function (m, i) { ok(pos[i] >= 0, 'блок «' + m.trim() + '» на месте'); });
    ok(ascending(pos), 'и все они идут в порядке ТЗ 4.2');

    // у Б7 текста для чтения нет — блок [ТЕКСТ] не печатается пустым
    eq(p.indexOf('[ТЕКСТ]'), -1, 'пустого блока текста нет');
    // ключи — строго последний блок промпта
    ok(p.indexOf('=== КЛЮЧИ') > p.lastIndexOf('[ФИНАЛ]'), 'ключи после финала');
    eq(p.slice(p.indexOf('=== КЛЮЧИ')).indexOf('[ЭТАПЫ'), -1, 'после ключей блоков нет');
  });

  describe('2.7.0 промпт B7.1: ступень S0 и контракт v3', function () {
    school('S0');
    var p = PROMPTS.lesson('B7.1', { today: T });
    ok(p.indexOf('Ступень: S0 «Старт школы» — 8 заданий = ' +
      '2 разогрев L1 · 4 основа L2 · 1 письмо · 1 стретч ⭐; спринты ~13–15 минут.') > 0,
      'строка ступени S0 целиком');
    ok(p.indexOf('Блок: Б7 «Многочлены-1') > 0, 'блок подписан по-русски');
    ok(p.indexOf('Урок: Б7.1 «Язык функций') > 0, 'и урок тоже');
    eq(p.indexOf('Погашено'), -1, 'слова «Погашено» в промпте нет нигде');
    ok(p.indexOf('Засчитано: ') > 0, 'вместо него — «Засчитано»');
  });

  describe('2.7.0 промпт B7.1: глоссарий печатается дословно', function () {
    school('S0');
    var p = PROMPTS.lesson('B7.1', { today: T });
    var g = CONTENT.term('domain');
    ok(p.indexOf('– ' + g.en + ' — ' + g.def + '. Example: ' + g.ex + '. Not: ' + g.non + '. RU: ' + g.ru) > 0,
      'запись глоссария в формате ТЗ 4.2');
    ok(p.indexOf('используй эти определения дословно') > 0, 'и требование не сочинять своих');
    // все шесть терминов урока
    CONTENT.lesson('B7.1').terms.forEach(function (k) {
      ok(p.indexOf('– ' + CONTENT.term(k).en + ' — ') > 0, 'термин ' + k + ' развёрнут');
    });
  });

  describe('2.7.0 промпт B7.1: опорные задания без ключей, ключи — в конце', function () {
    school('S0');
    var p = PROMPTS.lesson('B7.1', { today: T });
    var tasks = CONTENT.lesson('B7.1').tasks;
    var beforeKeys = p.slice(0, p.indexOf('=== КЛЮЧИ'));
    var keys = p.slice(p.indexOf('=== КЛЮЧИ'));

    ok(p.indexOf('Основа 1. (L1, 1 marks) ' + tasks[0].q) > 0, 'первое задание с уровнем и баллами');
    ok(p.indexOf('  /  RU: ' + tasks[0].ru) > 0, 'с русской строкой');
    ok(p.indexOf('  /  проверяет: ' + tasks[0].probe) > 0, 'и с кодом долга, который оно проверяет');
    ok(p.indexOf('Стретч ⭐ (L3, 3 marks) ' + tasks[4].q) > 0, 'стретч отдельной строкой');

    tasks.forEach(function (t, i) {
      eq(beforeKeys.indexOf(t.key), -1, 'ключ задания ' + (i + 1) + ' в теле промпта не светится');
      ok(keys.indexOf(t.key) > 0, 'а в блоке ключей есть');
    });
    ok(keys.indexOf('Основа 1: ') === keys.indexOf('Основа 1: '), 'ключи подписаны по заданиям');
    ok(keys.indexOf('Стретч: ') > 0, 'и стретч подписан');
    ok(keys.indexOf('Письмо: ' + CONTENT.lesson('B7.1').writing) > 0, 'критерии письма тоже здесь');
    ok(keys.indexOf('ученик не читает') > 0, 'и заголовок предупреждает');
  });

  describe('2.7.0 промпт B8.1: текст для чтения печатается целиком', function () {
    school('S0');
    var p = PROMPTS.lesson('B8.1', { today: T });
    var l = CONTENT.lesson('B8.1');
    var b = body(p);
    ok(b.indexOf('[ТЕКСТ]') > 0, 'блок текста есть');
    ok(b.indexOf(l.text) > 0, 'и текст целиком');
    ok(b.indexOf('[ТЕКСТ]') < b.indexOf('[ОПОРНЫЕ ЗАДАНИЯ]'), 'текст стоит до заданий');
  });

  describe('2.7.0 промпт: без заданий контент говорит об этом прямо', function () {
    school('S0');
    var p = PROMPTS.lesson('B9.1', { today: T });      // задания Б9 приедут в 2.7.1
    ok(p.indexOf('опорные задания придут следующим пакетом контента; ' +
      'вести по фокусу, 4 основных задания') > 0, 'честная строка вместо выдуманных заданий');
    ok(p.indexOf('Ключей нет: опорных заданий в этом пакете контента ещё нет.') > 0,
      'и в ключах — то же самое');
  });

  /* ============ 4.2 блок 6: доска долгов ============ */

  describe('2.7.0 промпт: доска долгов — строка на каждую категорию', function () {
    school('S0');
    State.applySummary('B7.1', summary({
      debts: ['М2 — 450 превратилось в 449', 'М3 — ответ одним числом']
    }), { date: '2026-09-13' });
    var p = PROMPTS.lesson('B7.2', { today: T });
    var tail = p.slice(p.indexOf('[ДОЛГИ '));
    var board = tail.slice(0, tail.indexOf(String.fromCharCode(10, 10)));

    eq(board.split(String.fromCharCode(10)).length - 1, State.promptCats('math').length,
      'строк ровно столько, сколько категорий дорожки');
    ok(board.indexOf('М2 Ходы записаны') > 0, 'категория названа целиком');
    ok(board.indexOf('· ОТКРЫТ D-1 · 0/2 · последний пример: «450 превратилось в 449» (B7.1)') > 0,
      'открытый долг со счётом касаний и последним примером');
    ok(board.indexOf('М7 Определение термина') > 0 && board.indexOf('· чисто') > 0,
      'а свободная категория помечена «чисто»');
    eq(board.indexOf('П1 '), -1, 'категорий чужой дорожки на доске нет');
  });

  describe('2.7.0 промпт: ПРИОРИТЕТ получают не больше трёх долгов', function () {
    school('S0');
    State.applySummary('B7.1', summary({
      debts: ['М1 — раз', 'М2 — два', 'М3 — три']
    }), { date: '2026-09-10' });
    State.applySummary('B7.2', summary({
      debts: ['М4 — четыре', 'М5 — пять', 'М6 — шесть']
    }), { date: '2026-09-11' });
    var p = PROMPTS.lesson('B7.3', { today: T });
    eq((p.match(/← ПРИОРИТЕТ/g) || []).length, 3, 'ровно три пометки');
    ok(p.indexOf('За урок проверь не меньше двух долгов с пометкой ПРИОРИТЕТ') > 0,
      'и требование их отработать');
  });

  describe('2.7.0 промпт: «1/2» идут в приоритет первыми', function () {
    school('S0');
    State.applySummary('B7.1', summary({
      debts: ['М1 — раз', 'М2 — два', 'М3 — три']
    }), { date: '2026-09-10' });
    // у второго долга появилось касание — он ближе всех к закрытию
    State.applySummary('B7.2', summary({ cleared: ['[D-2]'] }), { date: '2026-09-11' });
    eq(State.debtProgress(State.openDebts('math')[1]), 1, 'у D-2 касание есть');
    eq(State.priorityDebts('math')[0].did, 'D-2', 'он и получает приоритет первым');
  });

  /* ============ 4.3 чек-лист языка ============ */

  describe('2.7.0 промпт: чек-лист языка — пять пунктов из ТЗ 4.3', function () {
    school('S0');
    var p = PROMPTS.lesson('B8.1', { today: T });
    eq(PROMPTS.LANG_CHECKLIST.length, 5, 'пунктов ровно пять');
    PROMPTS.LANG_CHECKLIST.forEach(function (line, i) {
      ok(p.indexOf(line) > 0, 'пункт ' + (i + 1) + ' напечатан дословно');
      eq(line.indexOf(String(i + 1) + '. '), 0, 'и номер у него фиксированный');
    });
    ok(p.indexOf('напечатай его ученику перед письменным заданием') > 0, 'когда его показывать');
    ok(p.indexOf('Ошибки чек-листа — не долги') > 0, 'и что ошибки чек-листа не долги');
  });

  /* ============ 4.6 конкурсный урок ============ */

  describe('2.7.0 промпт К.1: конкурсный урок', function () {
    school('S0');
    var p = PROMPTS.lesson('B53.1', { today: T });
    var l = CONTENT.lesson('B53.1');

    ok(p.indexOf('КОНТРАКТ ПРЕПОДАВАТЕЛЯ v3') > 0, 'контракт тот же');
    ok(p.indexOf('Урок: К.1 «К.1 · Алгебра') > 0, 'урок подписан как К.1');
    ok(p.indexOf('Формат: конкурсный урок') > 0, 'формат назван');
    ok(p.indexOf('[ЗАДАЧИ]') > 0, 'задачи напечатаны');
    ok(p.indexOf('1. Часть A (2 marks) — короткий ответ. ' + l.tasks[0].q) > 0, 'часть A — короткий ответ');
    ok(p.indexOf('3. Часть B (6 marks) — полное решение с записью ходов. ') > 0, 'часть B — с ходами');
    ok(p.indexOf('[ЭТАПЫ КОНКУРСНОГО УРОКА]') > 0, 'этапы конкурсные');

    // ни письма, ни видео, ни чек-листа, ни разогрева
    var b = body(p);
    eq(b.indexOf('[ЧЕК-ЛИСТ ЯЗЫКА] —'), -1, 'чек-листа языка в конкурсном уроке нет');
    eq(b.indexOf('[РАЗОГРЕВ]'), -1, 'разогрева тоже');
    eq(p.indexOf('Письменная работа урока'), -1, 'и письма');
    ok(p.indexOf('Письмо: —') > 0, 'в ИТОГе письмо прочерком');

    // ключи — в конце и только там
    var beforeKeys = p.slice(0, p.indexOf('=== КЛЮЧИ'));
    l.tasks.forEach(function (t, i) {
      eq(beforeKeys.indexOf(t.key), -1, 'ключ задачи ' + (i + 1) + ' не светится в теле');
    });
    ok(p.slice(p.indexOf('=== КЛЮЧИ')).indexOf('Задача 1 (часть A): ') > 0, 'ключи подписаны по задачам');
  });

  /* ============ 4.5 промпт разминки ============ */

  describe('2.7.0 промпт разминки: долги, запрет слов и одна строка ответа', function () {
    school('S0');
    State.applySummary('B7.1', summary({
      words: [{ en: 'domain', ru: 'область определения' }],
      debts: ['М1 — раз', 'М2 — два', 'М3 — три']
    }), { date: '2026-09-13' });
    var p = PROMPTS.minimal({ today: T });

    ok(p.indexOf('D-1 (М1)') > 0, 'долг с id и кодом категории');
    ok(p.indexOf('· 0/2') > 0, 'и со счётом касаний');
    ok(p.indexOf('Определения — только дословно из строки долга.') > 0, 'определения не сочиняются');
    ok(p.indexOf('Слов «закрыт / погашен» не писать.') > 0, 'закрывать долг словами нельзя');
    ok(p.indexOf('«РАЗМИНКА: D-1 ✓ D-10 ✗ · слова 15/15»; ученик вставит только её.') > 0,
      'последняя строка ответа задана дословно');

    // в разминку уходит не больше трёх долгов
    eq(State.warmupDebts().length, 3, 'долгов ровно три');
  });

  /* ============ 4.4 кнопка «Стало легко» ============ */

  describe('2.7.0 ступень: кнопка «Стало легко» и ручной подъём', function () {
    school('S0');
    eq(State.stageName(), 'S0', 'по умолчанию S0');
    eq(State.nextStageOffer(T), null, 'без уроков кнопки нет');

    // три урока со средним ≥ 8 за последние семь дней
    ['B7.1', 'B7.2', 'B7.3'].forEach(function (id, i) {
      State.applySummary(id, summary({ score: 9 }), { date: U.addDays(T, -2 - i) });
    });
    eq(State.readyForNextStage(T), true, 'условие выполнено');
    eq(State.nextStageOffer(T), 'S1', 'кнопка предлагает S1');
    ok(App.stageOffer(T).indexOf('Стало легко → S1') > 0, 'и она есть на экране');

    // автоперехода нет: пока не нажали, ступень прежняя
    eq(State.stageName(), 'S0', 'сама по себе ступень не поднялась');

    State.setStage('S1', T);
    eq(State.stageName(), 'S1', 'после нажатия — S1');
    eq(State.s.scale.since, T, 'с датой перехода');
    eq(State.nextStageOffer(T), 'S2', 'дальше та же кнопка предложит S2');
    var p = PROMPTS.lesson('B7.4', { today: T });
    ok(p.indexOf('Ступень: S1 — 12 заданий') > 0, 'и промпт стал длиннее');
    State.setMode('summer');
  });

  describe('2.7.0 ступень: двух уроков для кнопки мало', function () {
    school('S0');
    ['B7.1', 'B7.2'].forEach(function (id, i) {
      State.applySummary(id, summary({ score: 10 }), { date: U.addDays(T, -1 - i) });
    });
    eq(State.readyForNextStage(T), false, 'нужно не меньше трёх закрытых уроков');

    // три урока, но средний ниже восьми
    school('S0');
    ['B7.1', 'B7.2', 'B7.3'].forEach(function (id, i) {
      State.applySummary(id, summary({ score: 7 }), { date: U.addDays(T, -1 - i) });
    });
    eq(State.readyForNextStage(T), false, 'средний счёт ниже восьми — кнопки нет');
    eq(App.stageOffer(T), '', 'на экране пусто');

    // старые уроки в окно семи дней не попадают
    school('S0');
    ['B7.1', 'B7.2', 'B7.3'].forEach(function (id, i) {
      State.applySummary(id, summary({ score: 10 }), { date: U.addDays(T, -20 - i) });
    });
    eq(State.readyForNextStage(T), false, 'уроки трёхнедельной давности не считаются');
    State.setMode('summer');
  });

  describe('2.7.0 ступень: автоподъёма по циклу больше нет', function () {
    school('S0');
    State.s.step.position = 2;
    State.s.step.cycleStart = '2026-08-25';        // цикл давно закончился
    var before = State.stageName();
    StepsFlow.check();
    eq(State.stageName(), before, 'конец цикла ступень не поднял');
    State.setMode('summer');
  });

  State.reset();
  State.syncContent();
})();
