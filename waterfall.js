/* ============================================================
   waterfall.js — водопад выбора урока дня (раздел 7.3 ТЗ)
   и свежесть дорожек (7.4).

   Сверху вниз, первое сработавшее правило назначает дорожку:
   0. Суббота ⭐ (конкурсный урок блока К) · 1. Дедлайн блока
   2. Радар (событие ≤3 дней) · 3. Свежесть (≥5 дней без урока)
   4. Светофор (красный блок) · 5. Долги (≥5 открытых)
   6. Шаблон недели. Воскресенье — радар-день, урок не назначается.
   Дорожка без доступных уроков пропускается всеми правилами.
   Общий блок (track: 'all', финалы Б16) назначают только дедлайн и шаблон
   недели: радар, свежесть, светофор и долги смотрят на свои блоки дорожки,
   а шаблон отдаёт общий блок, лишь когда своих уроков в фазе нет ни у кого.
   Уроки К (конкурсные, type: 'contest') назначает только суббота ⭐: очередь
   дорожки их не содержит (State.nextLessonInTrack, 2.7.8), дедлайн и светофор
   блок К пропускают; в свапе К — отдельная строка.
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

  /**
   * Первый незакрытый урок в блоках СВОЕЙ дорожки фазы — общий блок
   * (track: 'all') сюда не входит (2.7.6, Э3). 10.09 информатика, у которой
   * своих блоков в Ф1 нет, забрала день свежестью — и получила финалы Б16:
   * State.nextLessonInTrack пускает блок 'all' в очередь любой дорожки.
   */
  function nextOwnLesson(trackId, phaseId) {
    // 2.7.6 (ревью): свои блоки — по сроку, при равном сроке и без срока — по
    // номеру. 2.7.7 (Э6): тот же порядок нужен и сквозной очереди дорожки
    // (экран «Программа», запасной путь) — одна функция на оба.
    // 2.7.8 (Б1): уроки К своими уроками математики не считаются — дорожка,
    // у которой остался только К, в будних правилах пропускается
    if (!trackId || !phaseId) return null;
    return State.nextLessonInTrack(trackId, phaseId, true);
  }

  /**
   * Учебные дни от from до to включительно: пн–пт. Суббота — день К,
   * воскресенье — радар-день: обычный урок блока в них не планируется.
   */
  function schoolDays(from, to) {
    var total = U.diffDays(from, to) + 1;
    if (total <= 0) return 0;
    var n = Math.floor(total / 7) * 5, wd = U.weekday(from);
    for (var i = 0; i < total % 7; i++) if ((wd - 1 + i) % 7 < 5) n++;
    return n;
  }

  /** «остался 1 урок» · «осталось 3 урока» · «осталось 5 уроков». */
  function leftText(n) {
    return U.plural(n, 'остался', 'осталось', 'осталось') + ' ' + n + ' ' + U.plural(n, 'урок', 'урока', 'уроков');
  }

  function typeName(t) {
    return { test: 'тест', quiz: 'квиз', assignment: 'сдача', exam: 'экзамен', todo: 'дело' }[t] || 'событие';
  }

  function whenText(days) {
    if (days <= 0) return 'сегодня';
    if (days === 1) return 'завтра';
    return 'через ' + U.days(days);
  }

  /* ---------- правила ---------- */

  /**
   * 1. Радар: школьное событие ≤3 дней. Урок — своей дорожки курса, не общий блок.
   * «Дело» (todo, 2.7.7) урок не назначает: запись на конкурс по MHF4U — не
   * сдача, и 14.09 причина «радар: сдача MHF4U сегодня» была ложной.
   */
  function ruleRadar(t, exclude) {
    var events = (State.s.radar || [])
      .filter(function (e) { return e && !e.done && e.type !== 'todo' && e.date >= t && U.diffDays(t, e.date) <= 3; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var phase = State.currentPhase(t);
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      var track = CONTENT.trackForCourse(e.course);
      if (!track || track === exclude) continue;
      var own = nextOwnLesson(track, phase);
      if (!own) continue;
      return {
        track: track,
        lessonId: own,
        reason: {
          kind: 'radar',
          text: 'радар: ' + typeName(e.type) + ' ' + e.course + ' ' + whenText(U.diffDays(t, e.date))
        }
      };
    }
    return null;
  }

  /**
   * 2. Свежесть: дорожка без урока ≥5 дней, у которой в фазе есть свой урок.
   * Дорожка без своих блоков (информатика в Ф1) в счёт свежести не входит, а
   * урок берётся из своего блока: иначе pick() ушёл бы в nextLessonInTrack,
   * где общий блок стоит в очереди каждой дорожки.
   */
  function ruleFreshness(t, exclude) {
    var phase = State.currentPhase(t);
    var best = null, bestDays = -1, bestLesson = null;
    State.s.tracks.forEach(function (tr) {
      if (tr.embedded || tr.id === exclude) return;
      var own = nextOwnLesson(tr.id, phase);
      if (!own) return;
      var f = State.freshness(tr.id, t);
      if (f == null || f < FRESH_RULE_DAYS) return;
      if (f > bestDays) { bestDays = f; best = tr; bestLesson = own; }
    });
    if (!best) return null;
    return {
      track: best.id,
      lessonId: bestLesson,
      reason: { kind: 'fresh', text: 'свежесть: ' + best.name + ' ' + U.days(bestDays) }
    };
  }

  /**
   * Правило 1: у блока дедлайн сегодня или уже позади, а незакрытый урок
   * в нём остался. 2.7.7 (Э1): и заранее — когда незакрытых уроков не меньше,
   * чем учебных дней (пн–пт) от сегодня до срока включительно: 16.09 у Б7
   * (срок вс 20.09) три урока на три будня — ждать просрочки уже поздно.
   * Несколько блоков — ранний срок первым; общий блок (Б16) правило тоже
   * берёт, но не вторым уроком полной. Блок К — нет (2.7.8, Б1): срока у него
   * нет, а срок, поставленный руками, не отдаёт конкурсные задачи в будни.
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
      return (window.CONTENT ? CONTENT.num(a) - CONTENT.num(b) : 0);
    });
    for (var i = 0; i < ids.length; i++) {
      var b = State.s.blocks[ids[i]];
      if (!b.deadline) continue;
      if (b.track === exclude) continue;
      if (contestBlock(ids[i])) continue;
      // общий блок вторым уроком не берётся (second): горящий заранее, он
      // обрывал бы перебор, и второй урок оставался бы пустым
      if (exclude && b.track === 'all') continue;
      var when;
      if (b.deadline <= t) {
        var over = U.diffDays(b.deadline, t);
        when = over > 0 ? ' просрочен на ' + U.days(over) : ' сегодня';
      } else {
        var left = State.blockProgress(ids[i]).remaining;
        if (!left || left < schoolDays(t, b.deadline)) continue;
        when = ' через ' + U.days(U.diffDays(t, b.deadline)) + ', ' + leftText(left);
      }
      var next = nextInBlock(ids[i]);
      if (!next) continue;
      return {
        track: b.track,
        blockId: ids[i],
        lessonId: next,
        reason: { kind: 'deadline', text: 'дедлайн: ' + State.blockLabel(ids[i]) + when }
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
      // общий блок светофор не назначает: его берут дедлайн и шаблон недели;
      // блок К — только суббота (2.7.8, Б1)
      if (b.track === exclude || b.track === 'all' || contestBlock(ids[i])) continue;
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

  /** 4. Долги: дорожка с ≥5 открытыми долгами и своим уроком в фазе. */
  function ruleDebts(t, exclude) {
    var counts = {};
    State.openDebts().forEach(function (d) { counts[d.track] = (counts[d.track] || 0) + 1; });
    var phase = State.currentPhase(t);
    var best = null, bestN = 0, bestLesson = null;
    Object.keys(counts).forEach(function (id) {
      if (id === exclude || counts[id] < DEBTS_RULE_COUNT) return;
      var own = nextOwnLesson(id, phase);
      if (!own) return;
      if (counts[id] > bestN) { bestN = counts[id]; best = id; bestLesson = own; }
    });
    if (!best) return null;
    return {
      track: best,
      lessonId: bestLesson,
      reason: { kind: 'debts', text: 'долги: ' + State.trackName(best) + ' — ' + bestN + ' открытых' }
    };
  }

  /** Дорожки слота дня по шаблону; четверг чередует информатику и бизнес по чётности недели. */
  function slotTracks(iso) {
    var slot = WEEK[U.weekday(iso)];
    if (!slot) return [];
    if (slot !== 'alt') return [slot];
    var evenWeek = Math.abs(U.diffDays('2026-08-17', U.weekStart(iso)) / 7) % 2 === 0;
    return evenWeek ? ['cs', 'biz'] : ['biz', 'cs'];
  }

  function trackLower(id) { return State.trackName(id).toLowerCase(); }

  /**
   * 5. Шаблон недели.
   * 2.7.7 (Э2): дорожка слота без своих незакрытых уроков в фазе пропускается —
   * урок берёт следующая по шаблону дорожка со своими уроками: слоты идут
   * вперёд от сегодняшнего (чт → пт → сб → пн …; у воскресенья дорожки нет).
   * У инфы и бизнеса своих блоков в Ф1 нет, и шаблон отдавал четверг общему
   * блоку — финалам Б16 в начале октября. Общий блок шаблон отдаёт, только
   * когда своих уроков в фазе нет ни у одной дорожки.
   */
  function ruleTemplate(t, exclude) {
    var wd = U.weekday(t);
    var wanted = slotTracks(t).filter(function (x) { return x !== exclude; });
    if (!wanted.length) return null;
    var phase = State.currentPhase(t);
    for (var k = 0; k < 7; k++) {
      var list = k ? slotTracks(U.addDays(t, k)) : wanted;
      for (var i = 0; i < list.length; i++) {
        if (list[i] === exclude) continue;
        var own = nextOwnLesson(list[i], phase);
        if (!own) continue;
        return {
          track: list[i],
          lessonId: own,
          reason: {
            kind: 'plan',
            text: 'шаблон: ' + WD_NAME[wd] + ' — ' +
              (k ? wanted.map(trackLower).join('/') + ' без уроков, дальше ' : '') + trackLower(list[i])
          }
        };
      }
    }
    // своих уроков в фазе нет ни у одной дорожки — общая очередь дорожки
    // слота (pick берёт State.nextLessonInTrack), в ней и общий блок
    var track = firstAvailable(wanted, exclude);
    if (!track) return null;
    return {
      track: track,
      lessonId: null,
      reason: { kind: 'plan', text: 'шаблон: ' + WD_NAME[wd] + ' — ' + trackLower(track) }
    };
  }

  /**
   * Правило 0: суббота ⭐ — день конкурсных задач CEMC.
   * Стоит выше дедлайна намеренно: блок К дедлайна не имеет вовсе, и любое
   * правило ниже забрало бы субботу себе. Конкурсных уроков нет — правило
   * молчит, и суббота идёт как раньше, по шаблону недели.
   */
  function ruleSaturday(t, exclude) {
    if (U.weekday(t) !== 6) return null;
    if (!window.CONTENT) return null;
    var phase = State.currentPhase(t);
    var blocks = CONTENT.phaseBlocks(phase);
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (exclude && b.track === exclude) continue;
      var list = State.activeLessons(b.id);
      for (var j = 0; j < list.length; j++) {
        if (!PROMPTS.isContest(list[j])) continue;
        var st = State.s.lessons[list[j].id];
        if (st && st.done) continue;
        return {
          track: b.track, blockId: b.id, lessonId: list[j].id,
          reason: { kind: 'contest', text: 'суббота ⭐: задачи CEMC' }
        };
      }
    }
    return null;
  }

  var RULES = [ruleSaturday, ruleDeadline, ruleRadar, ruleFreshness, rulePace, ruleDebts, ruleTemplate];

  /** Блок К: в нём есть конкурсные уроки (2.7.8, Б1) — будние правила его не берут. */
  function contestBlock(blockId) {
    return State.activeLessons(blockId).some(PROMPTS.isContest);
  }

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
    if (res && res.lessonId && res.lessonId !== firstLessonId && !isAll(res.lessonId)) {
      // водопад мог свалиться в запасной вариант и вернуть ту же дорожку —
      // бейдж обязан сказать это честно, а не «свободная дорожка»
      if (State.lessonTrack(res.lessonId) === firstTrack) res.reason = NO_OTHER;
      return res;
    }
    var same = State.nextLesson();
    if (!same || same === firstLessonId || isAll(same)) return null;
    // 2.7.7 (ревью): общая очередь ставит свои блоки раньше общего — после
    // урока общего блока отсюда приходит урок другой дорожки (свой блок без
    // срока после Б16; К с 2.7.8 в очередь не входит), и бейдж «другой
    // дорожки нет» про него соврал бы
    return {
      lessonId: same,
      reason: State.lessonTrack(same) === firstTrack ? NO_OTHER : { kind: 'plan', text: 'второй урок: свободная дорожка' }
    };
  }

  /**
   * Урок общего блока (track: 'all' — суббота К). Вторым уроком дня он
   * не берётся: субботний блок сам занимает день целиком, а в полной норме
   * будня «вторая дорожка» обязана быть другой дорожкой, а не общей.
   */
  function isAll(lessonId) {
    return State.lessonTrack(lessonId) === 'all';
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
    // (nextLessonInTrack без фазы) ведёт дальше, но подпись говорит о фазе.
    // 2.7.6: общий блок своим уроком дорожки не считается — тот же предикат,
    // что у свежести, иначе полоска звала бы к дорожке, которую она не назначит.
    // 2.7.8 (Б1): уроки К — тоже: в будни их не назначает ни одно правило
    return nextOwnLesson(trackId, State.currentPhase()) != null;
  }

  /** У дорожки в текущей фазе остались только уроки К — серая полоска так и говорит. */
  function contestOnly(trackId) {
    var k = State.nextContestLesson(State.currentPhase());
    return !!k && State.lessonTrack(k) === trackId;
  }

  function freshText(trackId, days) {
    var tr = State.track(trackId);
    if (tr && tr.embedded) return 'в каждом уроке';
    if (!hasLessonsNow(trackId)) return contestOnly(trackId) ? 'только К по субботам' : 'нет уроков в этой фазе';
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

  /**
   * Строка К в свапе (2.7.8, Б1): очередь математики конкурсных уроков не
   * отдаёт, поэтому К выбирается отдельно — в любой день, как любая дорожка.
   * Уроки К закрыты — строка остаётся, но неактивна: видно, что блок пройден.
   */
  function contestRow() {
    var kb = State.contestBlockId();
    if (!kb) return '';
    var next = State.nextContestLesson();
    var l = next ? CONTENT.lesson(next) : null;
    return '<button class="swap-row" ' + (next ? 'data-pick="' + U.esc(next) + '"' : 'disabled') + '>' +
      '<div class="tname">' + UI.trackDot(State.block(kb).track) + ' ' + U.esc(State.blockLabel(kb)) + ' · субботы ⭐</div>' +
      '<div class="s">' + (l ? U.esc(State.lessonLabel(next) + ' · ' + l.title) : 'уроки К пройдены') + '</div>' +
      '<div class="tdays none">по субботам</div>' +
      '</button>';
  }

  function openSwap() {
    var t = State.today();
    var rows = State.s.tracks.filter(function (tr) { return !tr.embedded; }).map(function (tr) {
      var next = State.nextLessonInTrack(tr.id);
      var l = next ? CONTENT.lesson(next) : null;
      var f = State.freshness(tr.id);
      return '<button class="swap-row" ' + (next ? 'data-pick="' + U.esc(next) + '"' : 'disabled') + '>' +
        '<div class="tname">' + UI.trackDot(tr.id) + ' ' + U.esc(tr.name) + '</div>' +
        '<div class="s">' + (l ? U.esc(State.blockLabel(l.blockId) + ' · ' + l.title) : 'уроков в контенте нет') + '</div>' +
        '<div class="tdays ' + (next && hasLessonsNow(tr.id) ? freshColor(f) : 'none') + '">' +
        U.esc(freshText(tr.id, f)) + '</div>' +
        '</button>';
    }).join('') + contestRow();

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
    {
      kind: 'contest', n: 1, name: 'Суббота ⭐',
      cond: 'суббота, и в фазе остался конкурсный урок; в другие дни К не назначается — только свапом', act: '→ блок К'
    },
    {
      kind: 'deadline', n: 2, name: 'Дедлайн',
      cond: 'срок блока сегодня или позади, урок в нём не закрыт — или незакрытых уроков не меньше, чем будних дней до срока',
      act: '→ этот блок'
    },
    { kind: 'radar', n: 3, name: 'Радар', cond: 'школьный тест или сдача ≤ 3 дней («дело» не в счёт)', act: '→ этот предмет' },
    { kind: 'fresh', n: 4, name: 'Свежесть', cond: 'дорожку не трогали ≥ 5 дней, и у неё есть свои уроки в фазе', act: '→ она' },
    { kind: 'pace', n: 5, name: 'Светофор блока', cond: 'дедлайн блока горит красным', act: '→ этот блок' },
    { kind: 'debts', n: 6, name: 'Долги', cond: '≥ 5 незакрытых слабых мест по дорожке', act: '→ она' },
    {
      kind: 'plan', n: 7, name: 'Шаблон недели',
      cond: 'пн мат · вт письмо · ср мат · чт инфа/бизнес · пт мат · сб письмо ⭐ · вс радар; ' +
        'у дорожки дня нет своих уроков в фазе — следующая по шаблону', act: '→ по шаблону'
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
    hasLessonsNow: hasLessonsNow, nextOwnLesson: nextOwnLesson,
    ruleDeadline: ruleDeadline, ruleSaturday: ruleSaturday, ruleTemplate: ruleTemplate, schoolDays: schoolDays,
    ruleRadar: ruleRadar, ruleFreshness: ruleFreshness, rulePace: rulePace, ruleDebts: ruleDebts,
    EXPLAIN: EXPLAIN,
    FRESH_RULE_DAYS: FRESH_RULE_DAYS, DEBTS_RULE_COUNT: DEBTS_RULE_COUNT, WEEK: WEEK
  };
})();
