/* ============================================================
   stepsflow.js — цикл шкалы нагрузки (раздел 7.2 ТЗ):
   14-дневный цикл, предложение подъёма по 4 критериям, отсрочка
   1–4 недели, автоматический откат, разгрузка (ручная и каждый
   4-й цикл), ручной override. Летом шкала неактивна.
   Таблица цифр и чистая математика — в steps.js.
   ============================================================ */

window.StepsFlow = (function () {
  'use strict';

  var DELOAD_DAYS = 7;
  var DELOAD_EVERY_CYCLES = 4;

  function step() { return State.s.step; }

  /* ---------- пауза цикла ---------- */

  /** Пересечение двух отрезков дат в днях. */
  function overlap(aFrom, aTo, bFrom, bTo) {
    if (!aFrom || !aTo) return 0;
    var from = aFrom > bFrom ? aFrom : bFrom;
    var to = aTo < bTo ? aTo : bTo;
    var n = U.diffDays(from, to) + 1;
    return n > 0 ? n : 0;
  }

  /**
   * Дней паузы внутри отрезка: отсрочка и разгрузка ставят счётчик
   * цикла на паузу (не сбрасывают). Пересечение считаем один раз.
   */
  function pausedDays(from, to) {
    var s = step();
    var a = overlap(s.snoozeFrom, s.snoozeUntil, from, to);
    var b = overlap(s.deloadFrom, s.deloadUntil, from, to);
    var both = 0;
    if (s.snoozeFrom && s.deloadFrom) {
      var f = s.snoozeFrom > s.deloadFrom ? s.snoozeFrom : s.deloadFrom;
      var t = (s.snoozeUntil || '') < (s.deloadUntil || '') ? s.snoozeUntil : s.deloadUntil;
      both = overlap(f, t, from, to);
    }
    return Math.max(0, a + b - both);
  }

  /** День цикла 1..14 с учётом пауз. */
  function cycleDay(todayIso) {
    var s = step();
    var t = todayIso || State.today();
    if (!s.cycleStart) return 0;
    var raw = U.diffDays(s.cycleStart, t) + 1;
    return U.clamp(raw - pausedDays(s.cycleStart, t), 1, STEPS.CYCLE_DAYS);
  }

  function isPaused(todayIso) {
    var s = step(), t = todayIso || State.today();
    return !!((s.snoozeUntil && t <= s.snoozeUntil) || (s.deloadUntil && t <= s.deloadUntil));
  }

  function cycleEnded(todayIso) {
    var t = todayIso || State.today();
    return !!step().cycleStart && !isPaused(t) && cycleDay(t) >= STEPS.CYCLE_DAYS;
  }

  function completedCycles() {
    return (step().history || []).filter(function (h) {
      return h.reason === 'up' || h.reason === 'decline' || h.reason === 'top';
    }).length;
  }

  /* ---------- критерии подъёма (4 штуки) ---------- */

  /**
   * criteria() → { daysWithPoints, avgScore, lessonsCounted, reds, ok }
   * Окно — текущий цикл: от cycleStart до сегодня.
   */
  function criteria(todayIso) {
    var t = todayIso || State.today();
    var from = step().cycleStart || U.addDays(t, -13);

    var daysWithPoints = 0;
    for (var d = from; d <= t; d = U.addDays(d, 1)) {
      if (State.points(d) > 0) daysWithPoints++;
    }

    var scores = State.s.summaries
      .filter(function (s) { return s.date >= from && s.date <= t && s.parsed && s.parsed.score != null; })
      .map(function (s) { return s.parsed.score; });
    var avg = scores.length ? scores.reduce(function (a, b) { return a + b; }, 0) / scores.length : null;

    var reds = Object.keys(State.s.blocks).filter(function (id) {
      var st = State.blockPace(id);
      return st && st.color === 'red' && !st.done;
    });

    return {
      from: from,
      daysWithPoints: daysWithPoints,
      okDays: daysWithPoints >= 10,
      avgScore: avg,
      lessonsCounted: scores.length,
      okScore: avg != null && avg >= 7.5,
      reds: reds,
      okReds: reds.length === 0
    };
  }

  /* ---------- смена позиции ---------- */

  function setPosition(next, reason, note) {
    var s = step();
    var from = s.position;
    var to = U.clamp(next, STEPS.MIN, STEPS.MAX);
    if (to === from && reason !== 'deload') return false;
    s.position = to;
    s.history = s.history || [];
    var entry = { date: State.today(), from: from, to: to, reason: reason };
    if (note) entry.note = note;
    s.history.push(entry);
    State.touch();
    return true;
  }

  function restartCycle(reason, note) {
    var s = step();
    s.cycleStart = State.today();
    s.snoozeUntil = null;
    s.snoozeFrom = null;
    s.history = s.history || [];
    s.history.push({ date: State.today(), from: s.position, to: s.position, reason: reason, note: note || '' });
    State.touch();
  }

  function promote() {
    var s = step();
    var from = s.position;
    var next = U.clamp(from + 1, STEPS.MIN, STEPS.MAX);
    s.position = next;
    s.cycleStart = State.today();
    s.snoozeUntil = null; s.snoozeFrom = null;
    s.history = s.history || [];
    s.history.push({ date: State.today(), from: from, to: next, reason: 'up' });
    State.touch();
    maybeAutoDeload();
    UI.toast('Ступень ' + STEPS.label(next) + '. Новый цикл пошёл.', 'ok', 3600);
  }

  /** «Не сейчас» → отсрочка 1–4 недели, цикл на паузе. */
  function snooze(weeks) {
    var s = step();
    var t = State.today();
    s.snoozeFrom = t;
    s.snoozeUntil = U.addDays(t, 7 * (weeks || 2));
    s.history = s.history || [];
    s.history.push({ date: t, from: s.position, to: s.position, reason: 'decline', note: weeks + ' нед.' });
    State.touch();
    maybeAutoDeload();
    UI.toast('Вернусь к вопросу ' + U.fmtShort(s.snoozeUntil) + '. Цикл на паузе.', 'ok', 3600);
  }

  /** Разгрузка: позиция −1 на 7 дней, потом автоматический возврат. */
  function startDeload(silent) {
    var s = step();
    var t = State.today();
    s.deloadFrom = t;
    s.deloadUntil = U.addDays(t, DELOAD_DAYS - 1);
    s.history = s.history || [];
    s.history.push({ date: t, from: s.position, to: Math.max(STEPS.MIN, s.position - 1), reason: 'deload' });
    State.touch();
    if (!silent) {
      UI.toast('Неделя разгрузки: ' + STEPS.label(STEPS.effectivePos(s, t)) +
        ' до ' + U.fmtShort(s.deloadUntil) + '. Рост происходит в восстановлении.', 'ok', 4200);
    }
  }

  function maybeAutoDeload() {
    var n = completedCycles();
    if (n > 0 && n % DELOAD_EVERY_CYCLES === 0 && !StepsFlow.onDeload()) {
      startDeload(true);
      UI.toast('Каждый 4-й цикл — разгрузка. Неделя на ' +
        STEPS.label(STEPS.effectivePos(step(), State.today())) + '.', 'ok', 4200);
    }
  }

  /* ---------- автоматический откат ---------- */

  /** Серия сломалась ИЛИ два урока подряд <6/10 → позиция −1, без драмы. */
  function checkDemotion() {
    if (!State.isSchool()) return false;
    var s = step();
    if (s.position <= STEPS.MIN) return false;
    var t = State.today();

    // 1) серия сломалась: три пустых дня подряд
    var empty = DOCTRINE.emptyInRow(State.points, t);
    if (empty > DOCTRINE.MAX_EMPTY_IN_ROW) {
      var breakStart = U.addDays(t, -empty);
      var already = (s.history || []).some(function (h) {
        return h.reason === 'auto-down' && h.note === 'streak' && h.date >= breakStart;
      });
      if (!already) {
        setPosition(s.position - 1, 'auto-down', 'streak');
        UI.toast('Серия прервалась — ступень ' + STEPS.label(s.position) + '. Это настройка, не провал.', '', 4200);
        return true;
      }
    }

    // 2) два урока подряд <6/10 — обязательно два РАЗНЫХ урока,
    //    повторная вставка одного итога откат не запускает
    var last2 = State.s.summaries.slice(-2);
    var twoDistinct = last2.length === 2 && last2[0].lessonId !== last2[1].lessonId;
    if (twoDistinct && last2.every(function (x) { return x.parsed && x.parsed.score != null && x.parsed.score < 6; })) {
      var note = 'score:' + last2[1].lessonId;
      var done = (s.history || []).some(function (h) { return h.reason === 'auto-down' && h.note === note; });
      if (!done) {
        setPosition(s.position - 1, 'auto-down', note);
        UI.toast('Два урока подряд ниже 6 — ступень ' + STEPS.label(s.position) + '. Без драмы.', '', 4200);
        return true;
      }
    }
    return false;
  }

  /* ---------- регулярная проверка ---------- */

  function onDeload(todayIso) { return STEPS.onDeload(step(), todayIso || State.today()); }

  /** Вызывается при загрузке и на смене суток. */
  function check() {
    var s = step();
    var t = State.today();

    // конец разгрузки — позиция возвращается сама
    if (s.deloadUntil && t > s.deloadUntil) {
      s.deloadUntil = null;
      s.deloadFrom = null;
      State.touch(true);
      UI.toast('Разгрузка закончилась — ступень ' + STEPS.label(s.position) + '.', 'ok');
    }

    if (!State.isSchool()) return;              // летом шкала неактивна
    if (!s.cycleStart) { s.cycleStart = t; State.touch(true); }

    // конец отсрочки — просто снимаем паузу, дальше обычная проверка цикла
    if (s.snoozeUntil && t > s.snoozeUntil) {
      s.snoozeUntil = null;
      s.snoozeFrom = null;
      State.touch(true);
    }

    if (checkDemotion()) return;
    if (cycleEnded(t)) offerPromotion();
  }

  /* ---------- шторка предложения ---------- */

  function offerPromotion() {
    var s = step();
    var t = State.today();

    // потолок: после Г3 предложений подъёма нет — цикл просто начинается заново
    if (STEPS.isTop(s.position)) {
      restartCycle('top');
      maybeAutoDeload();
      UI.toast('Г3 — потолок шкалы. Дальше растёт материал, не ступень.', '', 4200);
      return;
    }

    var c = criteria(t);
    var next = STEPS.label(s.position + 1);
    var rows = [
      row(c.okDays, 'дней с очками ' + c.daysWithPoints + ' из 14', 'нужно ≥10'),
      row(c.okScore, 'средний счёт ' + (c.avgScore == null ? '—' : c.avgScore.toFixed(1)), 'нужно ≥7.5'),
      row(c.okReds, c.reds.length ? 'красных блоков: ' + c.reds.length : 'красных светофоров нет', 'нужно 0')
    ].join('');

    var canAuto = c.okDays && c.okScore && c.okReds;

    UI.sheet({
      title: 'Цикл закончен · ' + STEPS.label(s.position) + ' → ' + next,
      sub: canAuto ? 'Три критерия из четырёх — да. Остался сон.'
        : 'Критерии выполнены не все. Решаешь ты — можно поднять всё равно.',
      body:
        '<div class="crit">' + rows + '</div>' +
        '<label class="sleepbox"><input type="checkbox" data-sleep><span>сон 8–10 ч держится</span></label>' +
        '<div class="btns" style="margin-top:14px">' +
        '<button class="btn pr" data-up>Поднять до ' + next + '</button>' +
        '<button class="btn sec" data-later>Не сейчас</button>' +
        '</div>' +
        '<div class="snooze hidden">' +
        '<div class="sheet-sub" style="margin-top:14px">Вернуться к вопросу через:</div>' +
        '<div class="btn-row">' +
        [1, 2, 3, 4].map(function (w) {
          return '<button class="btn sec' + (w === 2 ? ' pick' : '') + '" data-w="' + w + '">' + w + ' нед.</button>';
        }).join('') +
        '</div><button class="btn pr" style="margin-top:10px" data-snooze>Отложить</button></div>',
      dismissible: false,
      onMount: function (root, close) {
        var sleep = root.querySelector('[data-sleep]');
        var weeks = 2;
        root.querySelector('[data-up]').onclick = function () {
          if (!sleep.checked) {
            UI.toast('Отметь «сон 8–10 ч держится» — это четвёртый критерий', '', 3200);
            return;
          }
          close(); promote();
        };
        root.querySelector('[data-later]').onclick = function () {
          root.querySelector('.snooze').classList.remove('hidden');
          root.querySelector('[data-later]').classList.add('hidden');
          root.querySelector('[data-up]').classList.add('hidden');
        };
        U.els('[data-w]', root).forEach(function (b) {
          b.onclick = function () {
            weeks = +b.dataset.w;
            U.els('[data-w]', root).forEach(function (x) { x.classList.remove('pick'); });
            b.classList.add('pick');
          };
        });
        root.querySelector('[data-snooze]').onclick = function () { close(); snooze(weeks); };
      }
    });
  }

  function row(ok, text, need) {
    return '<div class="crow"><span class="' + (ok ? 'g' : 'y') + '">' + (ok ? '✓' : '·') + '</span>' +
      '<span class="ct">' + U.esc(text) + '</span><span class="dim tiny">' + U.esc(need) + '</span></div>';
  }

  /* ---------- детали ступени (тап по плашке) ---------- */

  function openDetails() {
    var s = step();
    var t = State.today();
    var p = STEPS.params(s, t, State.mode());
    var c = State.isSchool() ? criteria(t) : null;
    var hist = (s.history || []).slice(-6).reverse();

    var body =
      stairs(p.pos) +
      '<div class="card2 mono small">' + U.esc(STEPS.cardLine(p)) + '</div>' +
      (State.isSchool()
        ? '<div class="srow"><div class="k">День цикла<span>пауза при отсрочке и разгрузке</span></div>' +
        '<div class="mono">' + cycleDay(t) + '/' + STEPS.CYCLE_DAYS + (isPaused(t) ? ' ⏸' : '') + '</div></div>' +
        '<div class="srow"><div class="k">Дней с очками</div><div class="mono ' + (c.okDays ? 'g' : '') + '">' +
        c.daysWithPoints + '/14</div></div>' +
        '<div class="srow"><div class="k">Средний счёт</div><div class="mono ' + (c.okScore ? 'g' : '') + '">' +
        (c.avgScore == null ? '—' : c.avgScore.toFixed(1)) + '</div></div>' +
        '<div class="srow"><div class="k">Красные блоки</div><div class="mono ' + (c.okReds ? 'g' : 'r') + '">' +
        c.reds.length + '</div></div>'
        : '<div class="fnote">Летом шкала спит. Старт с S1 — ' + U.fmtLong(State.AUTO_SCHOOL_DATE) + '.</div>') +
      '<div class="btns" style="margin-top:12px">' +
      (State.isSchool() ? '<button class="btn sec" data-deload>Неделя экзаменов — разгрузка</button>' : '') +
      '<button class="btn ghost" data-manual>Изменить ступень вручную</button>' +
      '</div>' +
      (hist.length
        ? '<div class="sheet-sub" style="margin-top:14px">История</div><div class="hist">' +
        hist.map(function (h) {
          return '<div class="hrow"><span class="mono tiny dim">' + U.fmtShort(h.date) + '</span>' +
            '<span>' + U.esc(histText(h)) + '</span></div>';
        }).join('') + '</div>'
        : '');

    UI.sheet({
      title: 'Ступень ' + p.stepLabel,
      sub: 'Приоритет выше любой ступени: сон и проекты. Если ступень их ест — ступень вниз.',
      body: body,
      onMount: function (root, close) {
        var dl = root.querySelector('[data-deload]');
        if (dl) dl.onclick = function () { close(); startDeload(); };
        root.querySelector('[data-manual]').onclick = function () { close(); openManual(); };
      }
    });
  }

  /** Лестница ступеней — компонент из mechanics-v2.html. */
  function stairs(active) {
    var max = 120;
    var bars = STEPS.TABLE.slice(0, 4).map(function (r) {
      var on = r.pos === active;
      return '<div class="step' + (on ? ' now' : '') + '">' +
        '<div class="bars">' +
        '<div class="bar norm" style="height:' + Math.round(r.norm / max * 100) + 'px"><span class="v">' + r.norm + '’</span></div>' +
        '<div class="bar full" style="height:' + Math.round(r.full / max * 100) + 'px"><span class="v">' + r.full + '’</span></div>' +
        '</div><div class="name">' + r.name + '</div><div class="note">' + U.esc(r.note) + '</div></div>';
    }).join('');
    var depthOn = active >= 5;
    var depth = '<div class="step depth' + (depthOn ? ' now' : '') + '">' +
      '<div class="bars"><div class="bar deep" style="height:100px"><span>⏸ ↑</span></div></div>' +
      '<div class="name">' + (depthOn ? STEPS.label(active) : 'Г1–Г3') + '</div>' +
      '<div class="note">время стоит,<br>растёт глубина</div></div>';
    return '<div class="stairs">' + bars + depth +
      '<div class="rope"></div><div class="rope-label">минималка · 15’ · константа</div></div>' +
      '<div class="card rope-rule" style="margin-bottom:12px">' +
      '<div class="ic">🪢</div><div><b>Правило нуля: минималка не растёт никогда.</b> ' +
      'Её работа — не объём, а серия. Растут норма, полная и глубина уроков.</div></div>';
  }

  function histText(h) {
    var names = {
      up: 'подъём', decline: 'отсрочка', 'auto-down': 'откат', deload: 'разгрузка',
      manual: 'вручную', top: 'потолок Г3'
    };
    var t = names[h.reason] || h.reason;
    if (h.from !== h.to) t += ': ' + STEPS.label(h.from) + ' → ' + STEPS.label(h.to);
    if (h.note) t += ' (' + h.note + ')';
    return t;
  }

  /** Ручной override (Настройки, доступен всегда). */
  function openManual() {
    var s = step();
    UI.sheet({
      title: 'Ступень вручную',
      sub: 'Ручной override доступен всегда. Новая ступень применяется со следующего скопированного промпта.',
      body: '<div class="steplist">' + STEPS.TABLE.map(function (r) {
        return '<button class="step-opt' + (r.pos === s.position ? ' on' : '') + '" data-pos="' + r.pos + '">' +
          '<b class="mono">' + r.name + '</b>' +
          '<span class="mono tiny">~' + r.lesson + '\' · ≥' + r.minQ + ' вопр. · старт ' + r.start +
          ' · перенос ×' + r.transfer + ' · RU ' + r.ru + '</span>' +
          '<em>' + U.esc(r.note) + '</em></button>';
      }).join('') + '</div>',
      onMount: function (root, close) {
        U.on(root, 'click', '[data-pos]', function (e, el) {
          close();
          if (setPosition(+el.dataset.pos, 'manual')) {
            UI.toast('Ступень ' + STEPS.label(+el.dataset.pos), 'ok');
          }
        });
      }
    });
  }

  return {
    check: check, criteria: criteria, cycleDay: cycleDay, isPaused: isPaused,
    cycleEnded: cycleEnded, completedCycles: completedCycles, pausedDays: pausedDays,
    promote: promote, snooze: snooze, startDeload: startDeload, setPosition: setPosition,
    checkDemotion: checkDemotion,
    onDeload: onDeload, offerPromotion: offerPromotion, openDetails: openDetails, openManual: openManual
  };
})();
