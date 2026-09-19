/* 2.7.6, этап 1: заголовок ИТОГа.

   ИИ печатал «=== ИТОГ УРОКА К.1 ===» — подпись урока с экрана, — а окно
   вставки ждало id B53.1 и отвергало итог целиком. Теперь промпт печатает id
   и просит не подставлять подпись, а окно принимает и то и другое — но только
   для урока, который закрывает. */

(function () {
  'use strict';

  var MON = '2026-09-14', FRI = '2026-09-11';
  var HW = 'HW-2026-09-11-math';

  function fresh() {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage('S0');
  }

  function itog(header) {
    return [header, 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10', 'Слова: slope — наклон', '=== КОНЕЦ ==='].join('\n');
  }

  describe('2.7.6 заголовок ИТОГа: id и подпись ожидаемого урока', function () {
    fresh();
    var a = PROMPTS.parse(itog('=== ИТОГ УРОКА B53.1 ==='), 'B53.1');
    eq([a.ok, a.lessonId], [true, 'B53.1'], 'B53.1 при ожидании B53.1 принят');

    var b = PROMPTS.parse(itog('=== ИТОГ УРОКА К.1 ==='), 'B53.1');
    eq([b.ok, b.lessonId, b.score], [true, 'B53.1', 8], 'К.1 кириллицей принят и разобран как B53.1');

    var c = PROMPTS.parse(itog('=== ИТОГ УРОКА K.1 ==='), 'B53.1');
    eq([c.ok, c.lessonId], [true, 'B53.1'], 'K.1 латиницей принят');

    var d = PROMPTS.parse(itog('=== ИТОГ УРОКА Б7.1 ==='), 'B7.1');
    eq([d.ok, d.lessonId], [true, 'B7.1'], 'Б7.1 → B7.1 принят');

    var e = PROMPTS.parse(itog('=== ИТОГ УРОКА К.1'), 'B53.1');
    eq(e.ok, true, 'хвост «===» необязателен');

    var f = PROMPTS.parse(itog('**===  ИТОГ УРОКА   к.1  ===**'), 'B53.1');
    eq(f.ok, true, 'пробелы, регистр и markdown вокруг не мешают');

    var g = PROMPTS.parse(itog('===ИТОГ УРОКА B7.1==='), 'B7.1');
    eq(g.ok, true, 'без пробелов у маркеров — тоже');

    var h = PROMPTS.parse(itog('=== ИТОГ УРОКА: К.1 ==='), 'B53.1');
    eq(h.ok, true, 'двоеточие после «УРОКА» не мешает');
  });

  describe('2.7.6 заголовок ИТОГа: чужой урок и итог без заголовка — отказ', function () {
    fresh();
    var r = PROMPTS.parse(itog('=== ИТОГ УРОКА B53.2 ==='), 'B53.1');
    eq(r.ok, false, 'B53.2 при ожидании B53.1 отклонён');
    eq(r.error, 'Заголовок не совпадает: ожидается `=== ИТОГ УРОКА B53.1 ===` (урок К.1)',
      'сообщение называет ожидаемый заголовок и подпись урока');
    eq(r.score, undefined, 'поля чужого итога не разбираются');

    var k2 = PROMPTS.parse(itog('=== ИТОГ УРОКА К.2 ==='), 'B53.1');
    eq(k2.ok, false, 'подпись чужого урока (К.2) — тоже отказ');

    var b7 = PROMPTS.parse(itog('=== ИТОГ УРОКА B7.1 ==='), 'B7.10');
    eq(b7.ok, false, 'B7.1 не выдаёт себя за B7.10');

    var none = PROMPTS.parse('Пройдено: т\nУровень: L2\nСчёт: 8/10', 'B53.1');
    eq([none.ok, none.error], [false, 'Заголовок не совпадает: ожидается `=== ИТОГ УРОКА B53.1 ===` (урок К.1)'],
      'без заголовка — тот же отказ');

    var empty = PROMPTS.parse(itog('=== ИТОГ УРОКА ==='), 'B7.1');
    eq([empty.ok, empty.error], [false, 'Заголовок не совпадает: ожидается `=== ИТОГ УРОКА B7.1 ===` (урок Б7.1)'],
      'пустой заголовок — отказ');

    // разбор вне окна вставки (ожидания нет) ведёт себя по-старому
    var free = PROMPTS.parse(itog('=== ИТОГ УРОКА Б3.2 ==='));
    eq([free.ok, free.lessonId], [true, 'B3.2'], 'без ожидания заголовок только читается');
  });

  describe('2.7.6 заголовок ИТОГа: ДЗ-урок — по id и по подписи', function () {
    fresh();
    State.startHw('MHF4U', FRI, 'B7.1');
    eq(State.lessonLabel(HW), 'Урок по ДЗ · MHF4U', 'подпись ДЗ-урока — как на карточке «Сегодня»');

    // 2.7.8: подпись ДЗ-урока принимается только в его день — «сегодня» = FRI
    withToday(FRI, function () {
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА ' + HW + ' ==='), HW).ok, true, 'id ДЗ-урока принят');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ==='), HW).ok, true, 'подпись с карточки принята');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Домашнее задание школы · MHF4U ==='), HW).ok, true,
        'и название урока из его промпта');
      var alien = PROMPTS.parse(itog('=== ИТОГ УРОКА HW-2026-09-10-math ==='), HW);
      eq([alien.ok, alien.error], [false, 'Заголовок не совпадает: ожидается `=== ИТОГ УРОКА ' + HW +
        ' ===` (Урок по ДЗ · MHF4U)'], 'ДЗ другого дня — отказ с подписью ДЗ-урока');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА B7.1 ==='), HW).ok, false, 'программный урок за ДЗ не проходит');
    });
  });

  describe('2.7.6 заголовок ИТОГа: промпт печатает id и запрещает подпись', function () {
    fresh();
    var p = PROMPTS.lesson('B7.1', { today: MON });
    ok(p.split('\n').indexOf('=== ИТОГ УРОКА B7.1 ===') > 0, 'промпт B7.1 содержит строку === ИТОГ УРОКА B7.1 ===');
    ok(p.indexOf('Первую строку — заголовок — скопируй дословно: в нём id урока B7.1; ' +
      'подпись урока (Б7.1) в заголовок не подставляй.') > 0, 'правило рядом с шаблоном');
    ok(p.indexOf('заголовок скопировать дословно, подпись урока не подставлять') > 0, 'и в правиле 18 контракта');

    var k = PROMPTS.lesson('B53.1', { today: MON });
    ok(k.split('\n').indexOf('=== ИТОГ УРОКА B53.1 ===') > 0, 'конкурсный урок — тоже id, не К.1');
    eq(k.indexOf('=== ИТОГ УРОКА К.1'), -1, 'подписи в шаблоне заголовка нет');
  });

  /* ---------- окно вставки: шторка на кукольном корне ---------- */

  function openPaste(lessonId) {
    var real = UI.sheet, got = null;
    UI.sheet = function (o) { got = o; };
    try { Lesson.openSummary(lessonId, { date: MON }); } finally { UI.sheet = real; }
    var nodes = {};
    function node(sel) { return (nodes[sel] = { value: '', textContent: '', innerHTML: '', dataset: {}, focus: function () {} }); }
    ['[data-t]', '.sum-err', '[data-cancel]', '[data-save]'].forEach(node);
    var closed = false;
    got.onMount({ querySelector: function (sel) { return nodes[sel] || null; } }, function () { closed = true; });
    return {
      paste: function (text) {
        nodes['[data-t]'].value = text;
        nodes['.sum-err'].textContent = '';
        nodes['[data-save]'].onclick();
        return { error: nodes['.sum-err'].textContent, closed: closed };
      }
    };
  }

  describe('2.7.6 заголовок ИТОГа: окно вставки при ожидании B53.2', function () {
    fresh();
    State.s.lessons['B53.1'] = { done: true, date: '2026-09-12', score: 8 };
    var realToast = UI.toast;
    UI.toast = function () { };
    try {
      var w = openPaste('B53.2');
      var bad = w.paste(itog('=== ИТОГ УРОКА B53.3 ==='));
      eq(bad, { error: 'Заголовок не совпадает: ожидается `=== ИТОГ УРОКА B53.2 ===` (урок К.2)', closed: false },
        'чужой урок: отказ, шторка открыта, текст на месте');
      eq(!!(State.s.lessons['B53.3'] || {}).done, false, 'чужой урок не закрыт');
      // второе нажатие больше не протаскивает чужой итог
      eq(w.paste(itog('=== ИТОГ УРОКА B53.3 ===')).closed, false, 'повторное нажатие — тот же отказ');

      var good = w.paste(itog('=== ИТОГ УРОКА К.2 ==='));
      eq(good, { error: '', closed: true }, 'заголовок К.2 принят, шторка закрылась');
      eq(!!(State.s.lessons['B53.2'] || {}).done, true, 'урок B53.2 закрыт');
    } finally { UI.toast = realToast; }
  });
})();
