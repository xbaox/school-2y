/* 2.7.8, Б2: слова в ИТОГе — 3–5, никогда не больше пяти, только термины курса
   Онтарио. Предел живёт в промпте (шаблон [ФИНАЛ] и правило 18 контракта):
   парсер число слов не режет — лишнее слово ИИ ложится в SRS, как раньше. */

(function () {
  'use strict';

  var MON = '2026-09-14';
  var RULE = 'В строке «Слова» — от 3 до 5 терминов, никогда не больше пяти; только термины курса Онтарио ' +
    'по теме урока, общих английских слов там нет.';
  var TEMPLATE = 'Слова (3–5): термин — перевод; термин — перевод; ...';
  var RULE18 = 'слова 3–5, никогда не больше пяти, — только термины курса Онтарио';

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage('S0');
  }

  function lines(p) { return p.split('\n'); }

  /** Проверки текста про слова — одни на обычный, конкурсный и ДЗ-урок. */
  function wordsContract(p, id, name) {
    var ls = lines(p);
    var fin = ls.indexOf('[ФИНАЛ] — выдай «ИТОГ УРОКА» строго в этом формате, без лишнего текста внутри блока:');
    var head = ls.indexOf('=== ИТОГ УРОКА ' + id + ' ===');
    var rule = ls.indexOf(RULE);
    var tpl = ls.indexOf(TEMPLATE);
    ok(fin > 0 && head > fin, name + ': [ФИНАЛ] и заголовок на месте');
    ok(rule > fin && rule < head, name + ': правило слов — в [ФИНАЛ], до шаблона итога');
    ok(tpl > head && tpl < ls.indexOf('=== КОНЕЦ ===', head), name + ': строка «Слова (3–5)» — внутри шаблона');
    ok(p.indexOf(RULE18) > 0, name + ': правило 18 контракта — 3–5 и только термины курса');
    ok(p.indexOf('слов не больше пяти.') > 0, name + ': самопроверка перед ИТОГом — не больше пяти');
    eq(p.indexOf('Слова (6–8)'), -1, name + ': старой нормы 6–8 нет');
    eq(p.indexOf('Слова (3–6)'), -1, name + ': конкурсной 3–6 нет');
    eq(p.indexOf('слова 6–8'), -1, name + ': и в контракте нет');
    eq(p.indexOf('двух понятий'), -1, name + ': «не больше двух понятий» снято — слова и есть термины');
  }

  describe('2.7.8 Б2: ИТОГ обычного урока — слова 3–5, только термины курса', function () {
    fresh();
    withToday(MON, function () {
      wordsContract(PROMPTS.lesson('B7.1', { today: MON }), 'B7.1', 'B7.1');
    });
  });

  describe('2.7.8 Б2: конкурсный урок — та же норма 3–5', function () {
    fresh();
    withToday(MON, function () {
      var k = PROMPTS.lesson('B53.1', { today: MON });
      wordsContract(k, 'B53.1', 'B53.1');
      ok(k.indexOf('Чек-лист: —') > 0 && k.indexOf('Письмо: —') > 0, 'прочие строки конкурсного шаблона прежние');
    });
  });

  describe('2.7.8 Б2: ДЗ-урок — та же норма 3–5', function () {
    fresh();
    withToday(MON, function () {
      var hw = State.startHw('MHF4U', MON, 'B7.1');
      wordsContract(PROMPTS.lesson(hw.id, { today: MON }), hw.id, 'ДЗ');
    });
  });

  describe('2.7.8 Б2: контракт v3 сам по себе', function () {
    var c = PROMPTS.contractV3();
    var at18 = c.indexOf('\n18. ИТОГ');
    ok(at18 > 0 && c.indexOf('\n18. ИТОГ — строго по шаблону из [ФИНАЛ], все строки; заголовок скопировать дословно, ' +
      'подпись урока не подставлять; без ИТОГа урок не засчитан; ' + RULE18 + '; долги с кодами;') === at18,
      'правило 18: заголовок, слова 3–5 и долги — в одной строке');
    ok(c.indexOf('11. Термины и определения — только из [ГЛОССАРИЙ] и терминологии класса Онтарио') > 0,
      'правило 11 о терминах — прежнее');
    eq(PROMPTS.finalBlock('B7.1', false).split('\n').filter(function (l) { return /^\s*Слова/.test(l); }), [TEMPLATE],
      'в [ФИНАЛ] полем «Слова» начинается только строка шаблона');
    // правило, скопированное ИИ сразу под заголовок, не становится полем «Слова»
    var echo = PROMPTS.parse(['=== ИТОГ УРОКА B7.1 ===', RULE, 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10',
      '=== КОНЕЦ ==='].join('\n'), 'B7.1');
    eq([echo.ok, echo.words], [true, []], 'строка правила под заголовком слов не добавляет');
    eq(PROMPTS.finalBlock('B53.1', true).indexOf(TEMPLATE) > 0, true, 'конкурсный [ФИНАЛ] — та же строка');
    // ни в [ФИНАЛ] (обычном и конкурсном), ни в контракте старых диапазонов нет вовсе
    [['обычный [ФИНАЛ]', PROMPTS.finalBlock('B7.1', false)], ['конкурсный [ФИНАЛ]', PROMPTS.finalBlock('B53.1', true)],
      ['контракт', c]].forEach(function (pair) {
      eq([pair[1].indexOf('6–8'), pair[1].indexOf('3–6')], [-1, -1], pair[0] + ': ни «6–8», ни «3–6»');
    });
  });

  describe('2.7.8 Б2: парсер число слов не режет', function () {
    function itog(words) {
      return ['=== ИТОГ УРОКА B7.1 ===', 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10', words, '=== КОНЕЦ ==='].join('\n');
    }
    var eight = PROMPTS.parse(itog('Слова (3–5): a — раз; b — два; c — три; d — четыре; e — пять; f — шесть; g — семь; h — восемь'), 'B7.1');
    eq([eight.ok, eight.words.length], [true, 8], 'восемь слов при норме 3–5 — все восемь дошли');
    var one = PROMPTS.parse(itog('Слова (3–5): slope — наклон'), 'B7.1');
    eq([one.ok, one.words], [true, [{ en: 'slope', ru: 'наклон' }]], 'одно слово — тоже итог');
    var none = PROMPTS.parse(itog('Слова (3–5): нет'), 'B7.1');
    eq([none.ok, none.words.length], [true, 0], 'слов нет — урок всё равно закрывается');
    var old = PROMPTS.parse(itog('Слова (6–8): slope — наклон; vertex — вершина'), 'B7.1');
    eq(old.words.length, 2, 'итог по старому шаблону (6–8) читается');

    fresh();
    withToday(MON, function () {
      var res = State.applySummary('B7.1', eight, { date: MON });
      eq([res.ok, res.words], [true, 8], 'applySummary заводит все восемь слов');
    });
  });

  describe('2.7.8 Б2: разминка не про ИТОГ — строка слов прежняя', function () {
    fresh();
    withToday(MON, function () {
      var m = PROMPTS.minimal({ today: MON });
      eq(m.indexOf('Слова (3–5)'), -1, 'в промпте минималки нормы итога нет');
      ok(/слова \d+\/\d+»/.test(m), 'строка «РАЗМИНКА: … · слова N/N» на месте');
    });
  });

  State.reset();
  State.syncContent();
})();
