/* 2.7.8, Б7: заголовок ИТОГа ДЗ-урока. В подписи «Урок по ДЗ · MHF4U» даты нет —
   она одна у каждого дня по этому курсу. Подпись принимается только у ДЗ-урока
   того дня, которым закрывается итог; ДЗ другого дня — только по id с датой,
   отказ называет ожидаемый id и день. Программные уроки не затронуты. */

(function () {
  'use strict';

  var MON = '2026-09-14', TUE = '2026-09-15';
  var HW = 'HW-2026-09-14-math';
  var OTHER_DAY = 'Заголовок не совпадает: ожидается `=== ИТОГ УРОКА ' + HW +
    ' ===` (Урок по ДЗ · MHF4U, 14 сен): ДЗ другого дня принимается только по id';

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

  function hwMon() {
    fresh();
    var hw = State.startHw('MHF4U', MON, 'B7.1');
    eq(hw && hw.id, HW, 'id ДЗ-урока понедельника — ' + HW);
  }

  describe('2.7.8 Б7: сегодняшний ДЗ-урок — по id и по подписи, как было', function () {
    hwMon();
    withToday(MON, function () {
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА ' + HW + ' ==='), HW).ok, true, 'id принят');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ==='), HW).ok, true, 'подпись с карточки принята');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Домашнее задание школы · MHF4U ==='), HW).ok, true,
        'название из промпта принято');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · МНF4U ==='), HW).ok, true, 'кириллические М и Н в коде курса');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА НW-2026-09-14-mаth ==='), HW).ok, true, 'кириллические Н и а в id');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · ENG2D ==='), HW).ok, false, 'чужой курс — отказ');
      var alien = PROMPTS.parse(itog('=== ИТОГ УРОКА HW-2026-09-11-math ==='), HW);
      eq([alien.ok, alien.error], [false, 'Заголовок не совпадает: ожидается `=== ИТОГ УРОКА ' + HW +
        ' ===` (Урок по ДЗ · MHF4U)'], 'id другого дня — отказ; текст ошибки сегодняшнего ДЗ прежний');
    });
  });

  describe('2.7.8 Б7: ДЗ-урок другого дня — подпись не принимается, отказ называет id', function () {
    hwMon();
    withToday(TUE, function () {
      var lbl = PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ==='), HW);
      eq([lbl.ok, lbl.error], [false, OTHER_DAY], 'подпись с карточки — отказ с id и днём');
      eq(lbl.score, undefined, 'поля итога не разбираются');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Домашнее задание школы · MHF4U ==='), HW).ok, false,
        'название из промпта — отказ');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · МНF4U ==='), HW).ok, false, 'и кириллическая подпись — отказ');

      var id = PROMPTS.parse(itog('=== ИТОГ УРОКА ' + HW + ' ==='), HW);
      eq([id.ok, id.lessonId, id.score], [true, HW, 8], 'id с датой — принят и разобран');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА НW-2026-09-14-mаth ==='), HW).ok, true, 'id с кириллическими двойниками — принят');
      eq(PROMPTS.parse(itog('**=== ИТОГ УРОКА: hw-2026-09-14-MATH'), HW).ok, true, 'регистр, markdown и хвост — как везде');

      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА HW-2026-09-15-math ==='), HW).error, OTHER_DAY, 'id сегодняшнего дня — тот же отказ');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА ==='), HW).error, OTHER_DAY, 'пустой заголовок — тот же отказ');
      eq(PROMPTS.parse('Пройдено: т\nУровень: L2\nСчёт: 8/10', HW).error, OTHER_DAY, 'без заголовка — тот же отказ');
      eq(PROMPTS.headerError(HW), OTHER_DAY, 'headerError без дня берёт State.today()');
    });
  });

  describe('2.7.8 Б7: «сегодня» — день, которым закрывается итог', function () {
    hwMon();
    withToday(TUE, function () {
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ==='), HW, { today: MON }).ok, true,
        'opts.today = день ДЗ — подпись принята, хотя State.today() уже вторник');
    });
    withToday(MON, function () {
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ==='), HW, { today: TUE }).ok, false,
        'opts.today = другой день — отказ, хотя State.today() понедельник');
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ==='), HW, {}).ok, true, 'пустые opts — State.today()');
    });
    eq(PROMPTS.headerMatches('Урок по ДЗ · MHF4U', HW, MON), true, 'headerMatches: подпись в день ДЗ');
    eq(PROMPTS.headerMatches('Урок по ДЗ · MHF4U', HW, TUE), false, 'headerMatches: подпись в другой день');
    eq(PROMPTS.headerMatches(HW, HW, TUE), true, 'headerMatches: id в другой день');
    eq(PROMPTS.headerError(HW, MON), 'Заголовок не совпадает: ожидается `=== ИТОГ УРОКА ' + HW +
      ' ===` (Урок по ДЗ · MHF4U)', 'headerError в день ДЗ — прежний текст');

    // после полуночи, до 04:00, логический день ещё понедельник
    var night = U.today(new Date(2026, 8, 15, 1, 30));
    eq(night, MON, '01:30 вторника — это ещё понедельник');
    withToday(night, function () {
      eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ==='), HW).ok, true, 'подпись после полуночи — принята');
    });
  });

  describe('2.7.8 Б7: программные уроки — подпись в любой день', function () {
    fresh();
    [MON, TUE, '2027-02-14'].forEach(function (iso) {
      withToday(iso, function () {
        eq(PROMPTS.parse(itog('=== ИТОГ УРОКА К.1 ==='), 'B53.1').ok, true, iso + ': К.1 за B53.1');
        eq(PROMPTS.parse(itog('=== ИТОГ УРОКА Б7.1 ==='), 'B7.1', { today: MON }).ok, true, iso + ': Б7.1 за B7.1');
        eq(PROMPTS.parse(itog('=== ИТОГ УРОКА В7.1 ==='), 'B7.1', { today: TUE }).ok, true, iso + ': кириллическая В7.1');
        eq(PROMPTS.parse(itog('=== ИТОГ УРОКА К.2 ==='), 'B53.1').error,
          'Заголовок не совпадает: ожидается `=== ИТОГ УРОКА B53.1 ===` (урок К.1)', iso + ': отказ — прежний текст');
      });
    });
  });

  /* ---------- окно вставки: шторка на кукольном корне ---------- */

  function openPaste(lessonId, opts) {
    var real = UI.sheet, got = null;
    UI.sheet = function (o) { got = o; };
    try { Lesson.openSummary(lessonId, opts); } finally { UI.sheet = real; }
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

  function quiet(fn) {
    var realToast = UI.toast;
    UI.toast = function () { };
    try { fn(); } finally { UI.toast = realToast; }
  }

  describe('2.7.8 Б7: окно вставки ДЗ-урока в его день — подпись принята', function () {
    hwMon();
    quiet(function () {
      withToday(MON, function () {
        var w = openPaste(HW);
        eq(w.paste(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ===')), { error: '', closed: true }, 'подпись принята, шторка закрылась');
        eq([(State.s.hw[HW] || {}).score, (State.s.hw[HW] || {}).date], [8, MON], 'ДЗ-урок закрыт понедельником');
      });
    });
  });

  describe('2.7.8 Б7: шторка открыта до 04:00, итог вставлен после — день шторки', function () {
    hwMon();
    quiet(function () {
      var w = withToday(MON, function () { return openPaste(HW); });
      withToday(TUE, function () {
        eq(w.paste(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ===')), { error: '', closed: true },
          'подпись принята: шторка закрывает понедельник');
        eq((State.s.hw[HW] || {}).date, MON, 'итог лёг понедельником');
      });
    });
  });

  describe('2.7.8 Б7: окно вставки ДЗ-урока другого дня — только id', function () {
    hwMon();
    quiet(function () {
      withToday(TUE, function () {
        var w = openPaste(HW);
        eq(w.paste(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ===')), { error: OTHER_DAY, closed: false },
          'подпись: отказ с id, шторка открыта, текст на месте');
        eq(State.s.hw[HW], undefined, 'ДЗ-урок не закрыт');
        eq(w.paste(itog('=== ИТОГ УРОКА ' + HW + ' ===')), { error: '', closed: true }, 'id с датой — принят');
        eq((State.s.hw[HW] || {}).score, 8, 'ДЗ-урок закрыт');
      });
      // окно с явным днём (opts.date) — судит день окна, а не State.today()
      withToday(MON, function () {
        var FRI_HW = 'HW-2026-09-11-math';
        State.startHw('MHF4U', '2026-09-11', 'B7.1');
        var w2 = openPaste(FRI_HW, { date: MON });
        eq(w2.paste(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ===')).closed, false, 'день окна ≠ дню ДЗ — подпись не проходит');
        var w3 = openPaste(FRI_HW, { date: '2026-09-11' });
        eq(w3.paste(itog('=== ИТОГ УРОКА Урок по ДЗ · MHF4U ===')).closed, true, 'день окна = дню ДЗ — подпись принята');
      });
    });
  });

  State.reset();
  State.syncContent();
  describe('2.8.0 A5: ИТОГ ДЗ другого дня по id — закрывается днём самого ДЗ и с его курсом', function () {
    hwMon();
    var WED = '2026-09-16';
    quiet(function () {
      withToday(WED, function () {
        var w = openPaste(HW);
        eq(w.paste(itog('=== ИТОГ УРОКА ' + HW + ' ===')), { error: '', closed: true }, 'по id — принят');
      });
    });
    var H = State.s.hw[HW] || {};
    eq([H.date, H.course, H.score], [MON, 'MHF4U', 8], 'день ДЗ — понедельник, курс — его курс, не null');
    ok((State.day(MON).lessons || []).indexOf(HW) >= 0, 'урок лёг в понедельник');
    eq(((State.day(WED) || {}).lessons || []).indexOf(HW), -1, 'день шторки (среда) не тронут');
    eq(State.hwOfDay(MON).course, 'MHF4U', 'и день ДЗ помнит курс');
  });

  describe('2.8.0 A5: сегодняшний ДЗ — как было', function () {
    hwMon();
    quiet(function () {
      withToday(MON, function () {
        openPaste(HW).paste(itog('=== ИТОГ УРОКА ' + HW + ' ==='));
      });
    });
    eq([State.s.hw[HW].date, State.s.hw[HW].course], [MON, 'MHF4U'], 'понедельник, MHF4U');
  });

})();
