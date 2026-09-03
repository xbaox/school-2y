/* ============================================================
   waterfall.js — водопад выбора урока дня (раздел 7.3 ТЗ)
   и свежесть дорожек (7.4).

   Сверху вниз, первое сработавшее правило назначает дорожку:
   1. Радар (событие ≤3 дней) · 2. Свежесть (≥5 дней без урока)
   3. Светофор (красный блок) · 4. Долги (≥5 открытых)
   5. Шаблон недели. Воскресенье — радар-день, урок не назначается.
   Дорожка без доступных уроков пропускается всеми правилами.
   ============================================================ */

window.Waterfall = (function () {
  'use strict';

  var FRESH_RULE_DAYS = 5;    // правило 2: дорожка без урока ≥5 дней
  var DEBTS_RULE_COUNT = 5;   // правило 4: ≥5 открытых долгов

  /** Шаблон недели: пн мат · вт письмо · ср мат · чт инфа/бизнес · пт мат · сб письмо ⭐ · вс радар. */
  var WEEK = {
    1: 'math', 2: 'write', 3: 'math', 4: 'alt', 5: 'math', 6: 'write', 7: null
  };
  var WD_NAME = { 1: 'понедельник', 2: 'вторник', 3: 'среда', 4: 'четверг', 5: 'пятница', 6: 'суббота', 7: 'воскресенье' };

  /* ---------- вспомогательное ---------- */

  function available(trackId) { return State.nextLessonInTrack(trackId) != null; }

  function firstAvailable(trackIds, exclude) {
    for (var i = 0; i < trackIds.length; i++) {
      var t = trackIds[i];
      if (!t || t === exclude) continue;
      if (available(t)) return t;
    }
    return null;
  }

  function typeName(t) {
    return { test: 'тест', quiz: 'квиз', assignment: 'сдача', exam: 'экзамен' }[t] || 'событие';
  }

  function whenText(days) {
    if (days <= 0) return 'сегодня';
    if (days === 1) return 'завтра';
    return 'через ' + U.days(days);
  }

  /* ---------- правила ---------- */

  /** 1. Радар: школьное событие ≤3 дней. */
  function ruleRadar(t, exclude) {
    var events = (State.s.radar || [])
      .filter(function (e) { return !e.done && e.date >= t && U.diffDays(t, e.date) <= 3; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      var track = CONTENT.trackForCourse(e.course);
      if (!track || track === exclude || !available(track)) continue;
      return {
        track: track,
        reason: {
          kind: 'radar',
          text: 'радар: ' + typeName(e.type) + ' ' + e.course + ' ' + whenText(U.diffDays(t, e.date))
        }
      };
    }
    return null;
  }

  /** 2. Свежесть: дорожка без урока ≥5 дней. */
  function ruleFreshness(t, exclude) {
    var best = null, bestDays = -1;
    State.s.tracks.forEach(function (tr) {
      if (tr.embedded || tr.id === exclude) return;
      var f = State.freshness(tr.id, t);
      if (f == null || f < FRESH_RULE_DAYS) return;
      if (!available(tr.id)) return;
      if (f > bestDays) { bestDays = f; best = tr; }
    });
    if (!best) return null;
    return {
      track: best.id,
      reason: { kind: 'fresh', text: 'свежесть: ' + best.name + ' ' + U.days(bestDays) }
    };
  }

  /** 3. Светофор: блок с красным темпом. */
  /**
   * Правило 1: у блока дедлайн сегодня или уже позади, а незакрытый урок
   * в нём остался.
   *
   * Раньше горящий дедлайн влиял на выбор только через светофор (правило 3),
   * а тот ловит лишь красный. Блок с одним оставшимся уроком и дедлайном
   * сегодня — «впритык», то есть жёлтый: 27.08 приложение отдало день
   * бизнесу, пока у Б2 истекал срок с незакрытым Б2.4. Срок, наступивший
   * сегодня, — самый жёсткий сигнал в системе, поэтому он идёт первым.
   */
  function ruleDeadline(t, exclude) {
    var ids = Object.keys(State.s.blocks).sort(function (a, b) {
      var da = State.s.blocks[a].deadline || '9999', db = State.s.blocks[b].deadline || '9999';
      // раньше дедлайн — раньше очередь; при равных берём младший блок
      if (da !== db) return da < db ? -1 : 1;
      return CONTENT.num(a) - CONTENT.num(b);
    });
    for (var i = 0; i < ids.length; i++) {
      var b = State.s.blocks[ids[i]];
      if (!b.deadline || b.deadline > t) continue;
      if (b.track === exclude) continue;
      var next = nextInBlock(ids[i]);
      if (!next) continue;
      var over = U.diffDays(b.deadline, t);
      return {
        track: b.track,
        blockId: ids[i],
        lessonId: next,
        reason: {
          kind: 'deadline',
          text: 'дедлайн: ' + State.blockLabel(ids[i]) +
            (over > 0 ? ' просрочен на ' + U.days(over) : ' сегодня')
        }
      };
    }
    return null;
  }

  function rulePace(t, exclude) {
    var ids = Object.keys(State.s.blocks).sort(function (a, b) {
      var da = State.s.blocks[a].deadline || '9999', db = State.s.blocks[b].deadline || '9999';
      return da < db ? -1 : (da > db ? 1 : 0);
    });
    for (var i = 0; i < ids.length; i++) {
      var b = State.s.blocks[ids[i]];
      if (b.track === exclude) continue;
      var st = State.blockPace(ids[i]);
      if (!st || st.color !== 'red' || st.done) continue;
      var next = nextInBlock(ids[i]);
      if (!next) continue;
      return {
        track: b.track,
        blockId: ids[i],
        lessonId: next,
        reason: { kind: 'pace', text: 'светофор: ' + State.blockLabel(ids[i]) + ' горит красным' }
      };
    }
    return null;
  }

  /** 4. Долги: дорожка с ≥5 открытыми долгами. */
  function ruleDebts(t, exclude) {
    var counts = {};
    State.openDebts().forEach(function (d) { counts[d.track] = (counts[d.track] || 0) + 1; });
    var best = null, bestN = 0;
    Object.keys(counts).forEach(function (id) {
      if (id === exclude || counts[id] < DEBTS_RULE_COUNT) return;
      if (!available(id)) return;
      if (counts[id] > bestN) { bestN = counts[id]; best = id; }
    });
    if (!best) return null;
    return {
      track: best,
      reason: { kind: 'debts', text: 'долги: ' + State.trackName(best) + ' — ' + bestN + ' открытых' }
    };
  }

  /** 5. Шаблон недели. Четверг чередует информатику и бизнес по чётности недели. */
  function ruleTemplate(t, exclude) {
    var wd = U.weekday(t);
    var slot = WEEK[wd];
    if (!slot) return null;
    var wanted;
    if (slot === 'alt') {
      var evenWeek = Math.abs(U.diffDays('2026-08-17', U.weekStart(t)) / 7) % 2 === 0;
      wanted = evenWeek ? ['cs', 'biz'] : ['biz', 'cs'];
    } else {
      wanted = [slot];
    }
    var track = firstAvailable(wanted, exclude);
    if (!track) return null;
    return {
      track: track,
      reason: { kind: 'plan', text: 'шаблон: ' + WD_NAME[wd] + ' — ' + State.trackName(track).toLowerCase() }
    };
  }

  var RULES = [ruleDeadline, ruleRadar, ruleFreshness, rulePace, ruleDebts, ruleTemplate];

  /** Следующий незакрытый урок блока; пропущенные водопад не назначает. */
  function nextInBlock(blockId) {
    var list = State.activeLessons(blockId);
    for (var i = 0; i < list.length; i++) {
      var st = State.s.lessons[list[i].id];
      if (!st || !st.done) return list[i].id;
    }
    return null;
  }

  /**
   * Выбор урока дня.
   * opts.exclude — дорожка первого урока (для второго урока полной)
   * opts.force   — игнорировать воскресный радар-день
   * → { lessonId, reason } | { sunday:true, reason } | null
   */
  function pick(todayIso, opts) {
    opts = opts || {};
    var t = todayIso || State.today();
    var d = State.day(t) || {};

    if (U.weekday(t) === 7 && !opts.force && !opts.exclude && !d.forceLesson) {
      return { sunday: true, reason: { kind: 'plan', text: 'воскресенье — радар-день' } };
    }

    for (var i = 0; i < RULES.length; i++) {
      var res = RULES[i](t, opts.exclude);
      if (!res) continue;
      var lessonId = res.lessonId || State.nextLessonInTrack(res.track);
      if (!lessonId) continue;
      return { lessonId: lessonId, reason: res.reason, track: res.track };
    }

    // fallback: правила молчат — берём следующий непройденный, дорожка любая
    var any = null;
    if (opts.exclude) {
      var tracks = State.s.tracks.filter(function (x) { return !x.embedded && x.id !== opts.exclude; });
      for (var j = 0; j < tracks.length && !any; j++) any = State.nextLessonInTrack(tracks[j].id);
    }
    if (!any) any = State.nextLesson();
    if (!any) return null;
    return {
      lessonId: any,
      reason: {
        kind: 'plan',
        text: opts.exclude ? 'второй урок: свободная дорожка' : 'следующий по программе'
      }
    };
  }

  var NO_OTHER = { kind: 'plan', text: 'второй урок: другой дорожки с уроками нет' };

  /** Второй урок полной: другая дорожка; если другой нет — разрешается та же (7.8). */
  function second(todayIso, firstLessonId) {
    var t = todayIso || State.today();
    var firstTrack = State.lessonTrack(firstLessonId);
    var res = pick(t, { exclude: firstTrack, force: true });
    if (res && res.lessonId && res.lessonId !== firstLessonId) {
      // водопад мог свалиться в запасной вариант и вернуть ту же дорожку —
      // бейдж обязан сказать это честно, а не «свободная дорожка»
      if (State.lessonTrack(res.lessonId) === firstTrack) res.reason = NO_OTHER;
      return res;
    }
    var same = State.nextLesson();
    if (!same || same === firstLessonId) return null;
    return { lessonId: same, reason: NO_OTHER };
  }

  /* ---------- свежесть ---------- */

  /** Цвет свежести: 0–3 зелёный · 4–5 жёлтый · ≥6 красный (7.4). */
  function freshColor(days) {
    if (days == null) return 'dim';
    if (days <= 3) return 'g';
    if (days <= 5) return 'y';
    return 'r';
  }

  /**
   * Есть ли у дорожки хоть один доступный урок прямо сейчас.
   * У информатики уроки появятся только в Ф2 — до тех пор жёлтая
   * «ни разу · 5 дней» звала к действию, которого нет: водопад эту
   * дорожку всё равно пропускает.
   */
  function hasLessonsNow(trackId) {
    // именно в текущей фазе — так и написано в подписи. Сквозная очередь
    // (nextLessonInTrack без фазы) ведёт дальше, но подпись говорит о фазе
    return State.nextLessonInTrack(trackId, State.currentPhase()) != null;
  }

  function freshText(trackId, days) {
    var tr = State.track(trackId);
    if (tr && tr.embedded) return 'в каждом уроке';
    if (!hasLessonsNow(trackId)) return 'нет уроков в этой фазе';
    if (days == null) return 'уроков не было';
    // дорожка без единого урока считается от онбординга — число честное,
    // но подписать его надо так, чтобы не выглядело пропущенным уроком
    if (!State.hasTrackHistory(trackId)) return days ? 'ни разу · ' + U.days(days) : 'ни разу';
    if (days === 0) return 'сегодня ✓';
    return U.days(days);
  }

  /** Мини-полоски на «Сегодня». */
  function miniBars() {
    return '<div class="mini">' + State.s.tracks.map(function (tr) {
      if (tr.embedded) return '<i class="bg-g" style="opacity:.35" title="' + U.esc(tr.name) + ' — в каждом уроке"></i>';
      var f = State.freshness(tr.id);
      var c = hasLessonsNow(tr.id) ? freshColor(f) : 'dim';
      var bg = c === 'r' ? 'bg-r' : (c === 'y' ? 'bg-y' : (c === 'g' ? 'bg-g' : ''));
      return '<i class="' + bg + '" style="' + (bg ? '' : 'background:var(--line)') + '" title="' +
        U.esc(tr.name + ' — ' + freshText(tr.id, f)) + '"></i>';
    }).join('') + '</div>';
  }

  /** Полные полоски для «Программы» и шторки свапа. */
  function fullBars(activeTrack) {
    return '<div class="card fresh">' + State.s.tracks.map(function (tr) {
      var f = State.freshness(tr.id);
      // дорожка без доступных уроков — серая, без цвета срочности
      var idle = !tr.embedded && !hasLessonsNow(tr.id);
      var c = tr.embedded ? 'g' : (idle ? 'none' : freshColor(f));
      var pct = tr.embedded ? 100 : (idle || f == null ? 100 : U.clamp(Math.round(f / 7 * 100), 6, 100));
      var bg = c === 'r' ? 'bg-r' : (c === 'y' ? 'bg-y' : (c === 'g' ? 'bg-g' : ''));
      var dim = tr.embedded || idle || f == null ? 'opacity:.35' : '';
      return '<div class="trow' + (activeTrack === tr.id ? ' on' : '') + '" data-track="' + U.esc(tr.id) + '">' +
        '<div class="tname">' + UI.trackDot(tr.id) + ' ' + U.esc(tr.name) + '</div>' +
        '<div class="tbar"><i class="' + bg + '" style="width:' + pct + '%;' + dim +
        (bg ? '' : 'background:var(--line)') + '"></i></div>' +
        '<div class="tdays ' + c + '">' + U.esc(freshText(tr.id, f)) + '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- ручной свап ---------- */

  function openSwap() {
    var t = State.today();
    var rows = State.s.tracks.filter(function (tr) { return !tr.embedded; }).map(function (tr) {
      var next = State.nextLessonInTrack(tr.id);
      var l = next ? CONTENT.lesson(next) : null;
      var f = State.freshness(tr.id);
      return '<button class="swap-row" ' + (next ? 'data-pick="' + U.esc(next) + '"' : 'disabled') + '>' +
        '<div class="tname">' + UI.trackDot(tr.id) + ' ' + U.esc(tr.name) + '</div>' +
        '<div class="s">' + (l ? U.esc(State.blockLabel(l.blockId) + ' · ' + l.title) : 'уроков в контенте нет') + '</div>' +
        '<div class="tdays ' + (next ? freshColor(f) : 'none') + '">' +
        U.esc(freshText(tr.id, f)) + '</div>' +
        '</button>';
    }).join('');

    UI.sheet({
      title: 'Поменять урок',
      sub: 'Выбор твой: возьми любую дорожку. Замена запишется в статистику — по ней видно, ' +
        'как часто правило выбора урока приходится обходить.',
      body: '<div class="swap-list">' + rows + '</div>',
      onMount: function (root, close) {
        U.on(root, 'click', '[data-pick]', function (e, el) {
          var lessonId = el.dataset.pick;
          var d = State.day(t, true);
          d.pick = lessonId;
          d.pickReason = { kind: 'swap', text: 'свап: выбрано вручную' };
          d.swapped = true;
          State.touch();
          close();
          UI.toast('Урок дня: ' + lessonId, 'ok');
        });
      }
    });
  }

  /* ---------- объяснение выбора: правило выбора урока ---------- */

  var EXPLAIN = [
    { kind: 'deadline', n: 1, name: 'Дедлайн', cond: 'срок блока сегодня или позади, урок в нём не закрыт', act: '→ этот блок' },
    { kind: 'radar', n: 2, name: 'Радар', cond: 'школьный тест или сдача ≤ 3 дней', act: '→ этот предмет' },
    { kind: 'fresh', n: 3, name: 'Свежесть', cond: 'дорожку не трогали ≥ 5 дней', act: '→ она' },
    { kind: 'pace', n: 4, name: 'Светофор блока', cond: 'дедлайн блока горит красным', act: '→ этот блок' },
    { kind: 'debts', n: 5, name: 'Долги', cond: '≥ 5 незакрытых слабых мест по дорожке', act: '→ она' },
    {
      kind: 'plan', n: 6, name: 'Шаблон недели',
      cond: 'пн мат · вт письмо · ср мат · чт инфа/бизнес · пт мат · сб письмо ⭐ · вс радар', act: '→ по шаблону'
    }
  ];

  function explain(activeKind) {
    var rows = EXPLAIN.map(function (r, i) {
      var on = r.kind === activeKind;
      return '<div class="frow' + (on ? ' on' : '') + '">' +
        '<div class="fnum"><div class="n">' + r.n + '</div>' +
        (i < EXPLAIN.length - 1 ? '<div class="stem"></div>' : '') + '</div>' +
        '<div class="fbody"><div class="fcard">' +
        '<div class="cond"><b>' + r.name + '</b><span>' + U.esc(r.cond) + '</span></div>' +
        '<div class="act">' + r.act + '</div></div></div></div>';
    }).join('');

    UI.sheet({
      title: 'Кто получает урок дня',
      sub: 'Приложение идёт сверху вниз и останавливается на первом сработавшем правиле. ' +
        'Поменять дорожку вручную можно всегда — решаешь ты.',
      body: '<div class="flow">' + rows + '</div>' +
        '<div class="fnote"><b>Полная = 2 урока:</b> второй берёт следующее сработавшее правило — ' +
        'всегда другая дорожка.</div>' +
        '<div class="fnote">Дорожка — один из пяти предметов программы: математика, письмо и чтение, ' +
        'информатика, бизнес, академический английский.</div>' +
        '<div style="margin-top:12px">' + fullBars() + '</div>'
    });
  }

  return {
    pick: pick, second: second, nextInBlock: nextInBlock, openSwap: openSwap, explain: explain,
    miniBars: miniBars, fullBars: fullBars, freshColor: freshColor, freshText: freshText,
    hasLessonsNow: hasLessonsNow, ruleDeadline: ruleDeadline, EXPLAIN: EXPLAIN,
    FRESH_RULE_DAYS: FRESH_RULE_DAYS, DEBTS_RULE_COUNT: DEBTS_RULE_COUNT, WEEK: WEEK
  };
})();
