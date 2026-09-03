/* 2.7.0 «Корень», этап 2: разбор ИТОГа v3 и разминка (ТЗ 2.1–2.3).

   Корень пакета проверяется здесь: долг рождается только из кода таксономии,
   категория с открытым долгом даёт повтор, а не дубль, и никакие слова ИИ
   не закрывают долг иначе как двумя разными уроками. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], checklist: null, writing: '', raw: ''
    }, over || {});
  }

  function open(track) { return State.openDebts(track); }
  function byDid(did) {
    var f = null;
    State.s.debts.forEach(function (d) { if (d.did === did) f = d; });
    return f;
  }

  /* ============ 2.1 шаблон ИТОГа v3 ============ */

  describe('2.7.0 шаблон: ИТОГ печатается в форме v3', function () {
    fresh();
    var p = PROMPTS.lesson('B2.1', { today: '2026-08-26' });
    ok(p.indexOf('Слова (6–8): ') > 0, 'слов 6–8, а не 8–12');
    ok(p.indexOf('Засчитано: ') > 0, 'поле называется «Засчитано»');
    ok(p.indexOf('Чек-лист: 1✓ 2✓ 3✗ 4✓ 5✓') > 0, 'строка чек-листа языка');
    ok(p.indexOf('код категории — короткий пример ошибки') > 0, 'долги требуют кода');
    eq(p.indexOf('Погашено:'), -1, 'старого имени поля в шаблоне нет');
  });

  /* ============ 2.2 долги: код обязателен ============ */

  describe('2.7.0 итог: строка без кода категории отброшена', function () {
    fresh();
    var res = State.applySummary('B2.1', summary({
      debts: ['путает знак наклона', 'М1 — не дочитал условие']
    }), { date: '2026-08-20' });
    eq(res.created, 1, 'заведён только долг с кодом');
    eq(res.dropped.length, 1, 'строка без кода отброшена');
    eq(res.dropped[0].line, 'путает знак наклона', 'и названа целиком');
    ok(res.notices.some(function (n) { return n.indexOf('долг без категории отброшен') === 0; }),
      'уведомление про отброшенную строку есть');
    eq(open('math').length, 1, 'в банке один долг');
    eq(open('math')[0].cat, 'М1', 'с кодом из строки');
  });

  describe('2.7.0 итог: код чужой дорожки не проходит', function () {
    fresh();
    var res = State.applySummary('B2.1', summary({
      debts: ['П3 — Explain не разбирает Evidence']
    }), { date: '2026-08-20' });
    eq(res.created, 0, 'долг письма на уроке математики не заводится');
    eq(res.dropped[0].why, 'код чужой дорожки', 'причина названа');

    // П11 по форме код, но такой категории в списке нет
    var r2 = State.applySummary('B1.1', summary({ debts: ['П11 — выдуманный код'] }), { date: '2026-08-20' });
    eq(r2.created, 0, 'кода вне таксономии не бывает');
    eq(r2.dropped[0].why, 'кода нет в таксономии', 'и причина другая');

    // а что вовсе не похоже на код — отбрасывается раньше, по форме строки
    var r3 = State.applySummary('B1.1', summary({ debts: ['Ж9 — не код вовсе'] }), { date: '2026-08-20' });
    eq(r3.dropped[0].why, 'нет кода категории', 'форма строки проверяется первой');
  });

  describe('2.7.0 итог: текст долга собирается из категории и примера', function () {
    fresh();
    State.applySummary('B2.1', summary({ debts: ['М2 — 450 превратилось в 449'] }), { date: '2026-08-20' });
    var d = open('math')[0];
    eq(d.cat, 'М2', 'категория');
    eq(d.text, State.debtCat('М2').name + ' — 450 превратилось в 449', 'название категории плюс пример');
    eq(d.track, 'math', 'дорожка урока');
    eq(d.createdIn, 'B2.1', 'урок создания');
    eq(d.clearedIn, [], 'касаний нет');
    eq(d.examples, [{ lesson: 'B2.1', text: '450 превратилось в 449', date: '2026-08-20' }],
      'пример — то, что написал ИИ, без названия категории');
    eq(d.failedIn, [], 'провалов нет');
    eq(d.shownCount, 0, 'в промпт ещё не показывали');
  });

  describe('2.7.0 итог: латиница в коде не стоит ученику долга', function () {
    fresh();
    // «M2» и «М2» неотличимы на глаз; латинский код не должен всё уронить
    State.applySummary('B2.1', summary({ debts: ['M2 — ходы не записаны'] }), { date: '2026-08-20' });
    eq(open('math').length, 1, 'долг заведён');
    eq(open('math')[0].cat, 'М2', 'код приведён к кириллице');
  });

  /* ============ 2.2 повтор вместо дубля ============ */

  describe('2.7.0 итог: категория с открытым долгом даёт повтор, а не второй долг', function () {
    fresh();
    State.applySummary('B2.1', summary({ debts: ['М2 — ходы не записаны'] }), { date: '2026-08-20' });
    var d = open('math')[0];
    State.applySummary('B2.2', summary({ cleared: [d.text] }), { date: '2026-08-21' });
    eq(State.debtProgress(d), 1, 'касание есть: 1/2');

    var res = State.applySummary('B2.3', summary({
      debts: ['М2 — снова без записи, задание 4']
    }), { date: '2026-08-22' });
    eq(res.created, 0, 'второй долг той же категории не заводится');
    eq(res.repeated, 1, 'это повтор');
    eq(open('math').length, 1, 'в банке по-прежнему один долг категории');
    eq(State.debtProgress(d), 0, 'прогресс сброшен');
    eq(d.clearedIn, [], 'касания стёрты');
    eq(d.failedIn, ['B2.3'], 'урок записан в провалы');
    eq(d.examples.length, 2, 'пример добавлен к прежним');
    eq(d.examples[1].text, 'снова без записи, задание 4', 'именно новый');
    ok(res.notices.indexOf('повтор ' + d.did + ' (М2) — прогресс сброшен') >= 0, 'уведомление о повторе');
  });

  describe('2.7.0 итог: повторная вставка того же итога ничего не ломает', function () {
    fresh();
    var p = summary({ debts: ['М2 — ходы не записаны', 'М3 — ответ одним числом'] });
    State.applySummary('B2.1', p, { date: '2026-08-20' });
    var before = JSON.stringify(State.s.debts);
    State.applySummary('B2.1', p, { date: '2026-08-20' });
    eq(JSON.stringify(State.s.debts), before, 'банк долгов не изменился');
    eq(open('math').length, 2, 'долгов по-прежнему два');

    // и настоящий повтор из другого урока не удваивается повторной вставкой
    var rep = summary({ debts: ['М2 — снова без записи'] });
    State.applySummary('B2.2', rep, { date: '2026-08-21' });
    var afterFirst = JSON.stringify(State.s.debts);
    State.applySummary('B2.2', rep, { date: '2026-08-21' });
    eq(JSON.stringify(State.s.debts), afterFirst, 'второй прогон повтора ничего не добавил');
  });

  describe('2.7.0 итог: две строки одной категории в одном итоге — один долг', function () {
    fresh();
    var res = State.applySummary('B2.1', summary({
      debts: ['М2 — ходы не записаны', 'М2 — и во втором задании тоже']
    }), { date: '2026-08-20' });
    eq(res.created, 1, 'заведён один долг');
    eq(open('math').length, 1, 'в банке один');
  });

  /* ============ 2.2 кэп трёх новых ============ */

  describe('2.7.0 итог: за урок не больше трёх новых долгов', function () {
    fresh();
    var res = State.applySummary('B2.1', summary({
      debts: ['М1 — раз', 'М2 — два', 'М3 — три', 'М4 — четыре', 'М5 — пять']
    }), { date: '2026-08-20' });
    eq(res.created, 3, 'заведено ровно три');
    eq(res.cutNew, 2, 'два отрезаны');
    eq(open('math').map(function (d) { return d.cat; }), ['М1', 'М2', 'М3'], 'первые три по порядку');
    ok(res.notices.some(function (n) { return n.indexOf('сверх трёх') === 0; }), 'уведомление про кэп');

    // повторы кэп не тратят: он про НОВЫЕ долги
    var res2 = State.applySummary('B2.2', summary({
      debts: ['М1 — повтор', 'М2 — повтор', 'М3 — повтор', 'М6 — новый']
    }), { date: '2026-08-21' });
    eq(res2.repeated, 3, 'три повтора');
    eq(res2.created, 1, 'и один новый — кэп не съеден повторами');
    eq(res2.cutNew, 0, 'ничего не отрезано');
  });

  /* ============ 2.2 «Засчитано» ============ */

  describe('2.7.0 итог: «Погашено» принимается как алиас «Засчитано»', function () {
    fresh();
    State.applySummary('B2.1', summary({ debts: ['М2 — ходы не записаны'] }), { date: '2026-08-20' });
    var text = [
      '=== ИТОГ УРОКА B2.2 ===', 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10',
      'Погашено: [D-1]', '=== КОНЕЦ ==='
    ].join('\n');
    var p = PROMPTS.parse(text);
    ok(p.ok, 'итог разобран');
    eq(p.cleared, ['[D-1]'], 'старое имя поля прочитано');

    var v3 = PROMPTS.parse(text.replace('Погашено:', 'Засчитано:'));
    eq(v3.cleared, ['[D-1]'], 'новое имя — так же');
  });

  describe('2.7.0 итог: «Засчитано» держит точку с запятой, «Долги» — нет', function () {
    var p = PROMPTS.parse([
      '=== ИТОГ УРОКА B2.2 ===', 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10',
      'Долги: М1 — метод; язык ответа; форма',
      'Засчитано: [D-1]; [D-2]',
      '=== КОНЕЦ ==='
    ].join('\n'));
    eq(p.debts, ['М1 — метод; язык ответа; форма'], 'долг остался одной строкой');
    eq(p.cleared, ['[D-1]', '[D-2]'], 'засчитанное разделилось по «;»');
  });

  describe('2.7.0 итог: повтор побеждает «Засчитано» в том же итоге', function () {
    fresh();
    State.applySummary('B2.1', summary({ debts: ['М2 — ходы не записаны'] }), { date: '2026-08-20' });
    var d = byDid('D-1');
    State.applySummary('B2.2', summary({ cleared: [d.text] }), { date: '2026-08-21' });
    eq(State.debtProgress(d), 1, '1/2 после первого урока');

    // ИИ и пожаловался на категорию, и тут же попросил её засчитать
    var res = State.applySummary('B2.3', summary({
      debts: ['М2 — снова без записи'], cleared: ['D-1']
    }), { date: '2026-08-22' });
    eq(res.repeated, 1, 'повтор учтён');
    eq(res.cleared, 0, 'а засчитывание отвергнуто');
    eq(d.status, 'open', 'долг открыт');
    eq(State.debtProgress(d), 0, 'и прогресс сброшен, а не закрыт');
  });

  describe('2.7.0 итог: слова ИИ долг не закрывают — только два разных урока', function () {
    fresh();
    State.applySummary('B2.1', summary({ debts: ['М2 — ходы не записаны'] }), { date: '2026-08-20' });
    var d = byDid('D-1');

    State.applySummary('B2.2', summary({ cleared: ['[D-1] долг закрыт, погашен полностью'] }), { date: '2026-08-21' });
    eq(d.status, 'open', 'после первого урока открыт, что бы ИИ ни написал');
    eq(State.debtProgress(d), 1, '1/2');

    State.applySummary('B2.2', summary({ cleared: ['[D-1]'] }), { date: '2026-08-21' });
    eq(State.debtProgress(d), 1, 'тот же урок второй раз прогресс не двигает');

    var res = State.applySummary('B2.3', summary({ cleared: ['[D-1]'] }), { date: '2026-08-22' });
    eq(d.status, 'closed', 'второй разный урок — закрыт');
    eq(d.closedDate, '2026-08-22', 'с датой');
    ok(res.notices.indexOf('D-1: 2/2 → закрыт') >= 0, 'событие о закрытии');
  });

  /* ============ 2.2 чек-лист языка ============ */

  describe('2.7.0 итог: строка чек-листа копится в статистику', function () {
    fresh();
    var p = PROMPTS.parse([
      '=== ИТОГ УРОКА B2.1 ===', 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10',
      'Чек-лист: 1✓ 2✓ 3✗ 4✓ 5✓', '=== КОНЕЦ ==='
    ].join('\n'));
    eq(p.checklist, [true, true, false, true, true], 'пять пунктов разобраны');

    State.applySummary('B2.1', p, { date: '2026-08-20' });
    eq(State.s.checklist.stats[2], { clean: 0, total: 1 }, 'третий пункт: 0 из 1');
    eq(State.s.checklist.stats[0], { clean: 1, total: 1 }, 'первый: 1 из 1');

    // повторная вставка того же итога статистику не удваивает
    State.applySummary('B2.1', p, { date: '2026-08-20' });
    eq(State.s.checklist.stats[0], { clean: 1, total: 1 }, 'после повторной вставки — по-прежнему 1 из 1');

    // второй урок добавляет свой прогон
    var p2 = PROMPTS.parse([
      '=== ИТОГ УРОКА B2.2 ===', 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10',
      'Чек-лист: 1✗ 2✓ 3✓ 4✓ 5✓', '=== КОНЕЦ ==='
    ].join('\n'));
    State.applySummary('B2.2', p2, { date: '2026-08-21' });
    eq(State.s.checklist.stats[0], { clean: 1, total: 2 }, 'первый пункт: 1 из 2');
    eq(State.s.checklist.stats[2], { clean: 1, total: 2 }, 'третий: 1 из 2');
  });

  describe('2.7.0 итог: без строки чек-листа ничего не пишем', function () {
    fresh();
    var p = PROMPTS.parse([
      '=== ИТОГ УРОКА B2.1 ===', 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10', '=== КОНЕЦ ==='
    ].join('\n'));
    eq(p.checklist, null, 'поля нет — null');
    State.applySummary('B2.1', p, { date: '2026-08-20' });
    eq(State.s.checklist.stats, [], 'статистика пуста');
  });

  /* ============ 2.2 слова 6–8 ============ */

  describe('2.7.0 итог: парсер не режет слова', function () {
    var p = PROMPTS.parse([
      '=== ИТОГ УРОКА B2.1 ===', 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10',
      'Слова (6–8): a — раз; b — два; c — три; d — четыре; e — пять; f — шесть; g — семь; h — восемь',
      '=== КОНЕЦ ==='
    ].join('\n'));
    eq(p.words.length, 8, 'восемь слов дошли целиком');
  });

  /* ============ 2.3 разминка ============ */

  describe('2.7.0 разминка: строка разбирается', function () {
    var w = PROMPTS.parseWarmup('РАЗМИНКА: D-1 ✓ D-10 ✗ · слова 15/15');
    ok(w.ok, 'строка разобрана');
    eq(w.marks, [{ did: 'D-1', ok: true }, { did: 'D-10', ok: false }], 'две отметки');
    eq(w.words, { done: 15, total: 15 }, 'слова прочитаны, но их SRS ведёт сам');
    ok(PROMPTS.isWarmup('РАЗМИНКА: D-1 ✓'), 'префикс опознан');
    ok(!PROMPTS.isWarmup('=== ИТОГ УРОКА B2.1 ==='), 'итог — не разминка');
    ok(!PROMPTS.parseWarmup('РАЗМИНКА: слова 15/15').ok, 'без единого долга — ошибка');
  });

  describe('2.7.0 разминка: ✓ ставит первое касание и только показанному долгу', function () {
    fresh();
    State.applySummary('B2.1', summary({
      debts: ['М2 — ходы не записаны', 'М3 — ответ одним числом']
    }), { date: '2026-08-20' });
    var d1 = byDid('D-1'), d2 = byDid('D-2');
    State.markInjectedDebts(null, [d1]);      // в промпт разминки ушёл только первый

    var res = State.applyWarmup(PROMPTS.parseWarmup('РАЗМИНКА: D-1 ✓ D-2 ✓'), { date: '2026-09-03' });
    eq(res.touched, ['D-1'], 'касание получил только показанный долг');
    eq(d1.clearedIn, ['warmup:2026-09-03'], 'касание помечено разминкой');
    eq(State.debtProgress(d1), 1, '1/2');
    eq(d2.clearedIn, [], 'непоказанный долг не тронут');
    ok(res.notices.some(function (n) { return n.indexOf('D-2: его не было в промпте') === 0; }),
      'и про него сказано');
  });

  describe('2.7.0 разминка: ✓ не закрывает долг — закрывает только урок', function () {
    fresh();
    State.applySummary('B2.1', summary({ debts: ['М2 — ходы не записаны'] }), { date: '2026-08-20' });
    var d = byDid('D-1');
    State.markInjectedDebts(null, [d]);

    State.applyWarmup(PROMPTS.parseWarmup('РАЗМИНКА: D-1 ✓'), { date: '2026-09-03' });
    eq(State.debtProgress(d), 1, 'первое касание — разминочное');

    // второе разминочное касание ничего не даёт: закрывающее — только урок
    var res = State.applyWarmup(PROMPTS.parseWarmup('РАЗМИНКА: D-1 ✓'), { date: '2026-09-04' });
    eq(d.status, 'open', 'долг открыт');
    eq(d.clearedIn, ['warmup:2026-09-03'], 'вторая разминка касание не добавила');
    eq(res.touched, [], 'и ничего не засчитано');
    ok(res.notices.some(function (n) { return n.indexOf('касание уже есть') > 0; }), 'сказано почему');

    // а урок — закрывает: разминочное касание считается одним «уроком»
    State.applySummary('B2.2', summary({ cleared: ['[D-1]'] }), { date: '2026-09-04' });
    eq(d.status, 'closed', 'разминка плюс урок — два разных касания, долг закрыт');
    eq(State.debtProgress(d), 2, '2/2');
  });

  describe('2.7.0 разминка: ✗ пишет провал и прогресс не сбрасывает', function () {
    fresh();
    State.applySummary('B2.1', summary({ debts: ['М2 — ходы не записаны'] }), { date: '2026-08-20' });
    var d = byDid('D-1');
    State.applySummary('B2.2', summary({ cleared: [d.text] }), { date: '2026-08-21' });
    eq(State.debtProgress(d), 1, 'касание от урока');

    var res = State.applyWarmup(PROMPTS.parseWarmup('РАЗМИНКА: D-1 ✗'), { date: '2026-09-03' });
    eq(d.failedIn, ['warmup:2026-09-03'], 'провал помечен разминкой');
    eq(State.debtProgress(d), 1, 'прогресс на месте — разминка его не рушит');
    eq(res.failed, ['D-1'], 'событие о провале');
    eq(d.clearedIn, ['B2.2'], 'касание урока не тронуто');
  });

  describe('2.7.0 разминка: слова не трогаем', function () {
    fresh();
    State.applySummary('B2.1', summary({
      words: [{ en: 'slope', ru: 'наклон' }], debts: ['М2 — ходы не записаны']
    }), { date: '2026-08-20' });
    var srsBefore = JSON.stringify(State.s.srs);
    State.markInjectedDebts(null, [byDid('D-1')]);
    State.applyWarmup(PROMPTS.parseWarmup('РАЗМИНКА: D-1 ✓ · слова 15/15'), { date: '2026-09-03' });
    eq(JSON.stringify(State.s.srs), srsBefore, 'SRS ведёт карточки сам');
  });

  /* ============ дорожка без своих категорий ============ */

  describe('2.7.0 итог: на дорожке без своих категорий подходит любой код', function () {
    fresh();
    // biz — живой блок Б5 в Ф0; своих категорий у дорожки в таксономии нет
    eq(State.trackHasCats('biz'), false, 'у biz категорий нет');
    eq(State.trackHasCats('write'), true, 'у письма есть');
    var res = State.applySummary('B5.1', summary({
      debts: ['П6 — ярлык вместо предложения', 'М1 — не дочитал условие']
    }), { date: '2026-08-20' });
    eq(res.created, 2, 'оба долга записаны, а не потеряны');
    eq(byDid('D-1').track, 'write', 'дорожку задал префикс кода');
    eq(byDid('D-2').track, 'math', 'и второму тоже');
  });

  // следующим наборам — чистое состояние
  State.reset();
  State.syncContent();
})();
