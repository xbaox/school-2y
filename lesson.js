/* ============================================================
   lesson.js — карточка урока дня на «Сегодня» (раздел 6.1)
   и поток «скопировал промпт → провёл урок → вставил итог» (7.8).
   Выбор урока пока простой: следующий непройденный по программе;
   на этапе 4 его заменяет водопад (waterfall.js).
   ============================================================ */

window.Lesson = (function () {
  'use strict';

  /* ---------- выбор урока дня ---------- */

  function pick(todayIso) {
    if (window.Waterfall && Waterfall.pick) return Waterfall.pick(todayIso);
    var id = State.nextLesson();
    return id ? { lessonId: id, reason: { kind: 'plan', text: 'следующий по программе' } } : null;
  }

  /**
   * Урок, который сейчас показывает карточка.
   * Закрытый урок остаётся на экране до конца дня (раздел 7.8:
   * «Урок закрыт ✓» / «Второй урок: скопировать промпт»).
   */
  function current(todayIso) {
    var date = todayIso || State.today();
    var d = State.day(date);
    if (d && d.pick) {
      return { lessonId: d.pick, reason: d.pickReason || { kind: 'plan', text: 'урок дня' } };
    }
    if (d && d.lessons && d.lessons.length) {
      return {
        lessonId: d.lessons[d.lessons.length - 1],
        reason: d.pickReason || { kind: 'plan', text: 'урок дня' }
      };
    }
    return pick(date);
  }

  /** Запомнить выбор дня, чтобы бейдж причины и карточка не «прыгали». */
  function remember(lessonId, reason, dateIso) {
    var date = dateIso || State.today();
    var d = State.day(date, true);
    if (d.pick === lessonId && d.pickReason) return;
    d.pick = lessonId;
    d.pickReason = reason || { kind: 'plan', text: 'следующий по программе' };
    State.touch(true);
  }

  /**
   * Бейдж уже начинается со слова «выбор:», поэтому второе двоеточие
   * внутри причины читается как обрыв: «выбор: радар: тест…».
   */
  function whyText(text) {
    return String(text == null ? '' : text).replace(': ', ' · ');
  }

  function isDone(lessonId) {
    var st = State.s.lessons[lessonId];
    return !!(st && st.done);
  }

  /**
   * Какой это урок дня: индекс в списке закрытых сегодня, а для ещё не
   * закрытого — следующий по счёту.
   */
  function dayIndex(lessonId, d) {
    var list = (d && d.lessons) || [];
    var i = list.indexOf(lessonId);
    return (i >= 0 ? i : list.length) + 1;
  }

  /**
   * Строка «урок N из 2» — только у полной: там два урока и порядок важен
   * (между ними обязательный перерыв, второй — другой дорожки).
   * У нормы урок один, и писать «1 из 1» — шум.
   */
  function ofDayLine(lessonId, d) {
    if (!d || d.level !== 'full') return '';
    var n = Math.min(dayIndex(lessonId, d), 2);
    return '<div class="ofday">урок ' + n + ' из 2' + (n === 1 ? ' на сегодня' : '') + '</div>';
  }

  /* ---------- карточка ---------- */

  /**
   * Урок дня по номеру: закрытый берётся из дня, будущий — у водопада.
   * → { lessonId, reason } | null
   */
  function dayLesson(n, todayIso) {
    var t = todayIso || State.today();
    var d = State.day(t) || {};
    var list = d.lessons || [];

    if (list.length >= n) {
      var id = list[n - 1];
      return { lessonId: id, reason: d.pickReason || { kind: 'plan', text: 'урок дня' } };
    }
    if (n === 1) {
      var sel = current(t);
      return sel && sel.lessonId ? sel : null;
    }
    var first = list[0] || (current(t) || {}).lessonId;
    if (!first) return null;
    return window.Waterfall ? Waterfall.second(t, first) : null;
  }

  /**
   * card(opts) — карточка урока.
   *  opts.lessonId/reason — какой именно урок рисуем (иначе — урок дня);
   *  opts.bare      — без собственной рамки: карточка живёт внутри пункта плана;
   *  opts.minRow    — печатать ли строку «Карточки · Промпт минималки»;
   *  opts.freshBars — печатать ли мини-полоски свежести;
   *  opts.ofDay     — печатать ли бейдж «урок N из 2».
   * Незакрытый урок прошлых дней живёт отдельно, в pendingCard().
   */
  function card(opts) {
    opts = opts || {};
    var minRow = opts.minRow !== false;
    var bars = opts.freshBars !== false;
    var withOfDay = opts.ofDay !== false;
    var bare = !!opts.bare;
    var todayIso = opts.today || State.today();
    var sel = opts.lessonId
      ? { lessonId: opts.lessonId, reason: opts.reason || { kind: 'plan', text: 'урок дня' } }
      : current(todayIso);
    if (!sel) return emptyCard();
    if (sel.sunday) return sundayCard(sel);

    var lessonId = sel.lessonId;
    var lesson = CONTENT.lesson(lessonId);
    if (!lesson) return emptyCard();

    var blockId = lesson.blockId;
    var b = State.block(blockId) || {};
    var p = STEPS.params(State.s.step, todayIso, State.mode());
    var pr = State.blockProgress(blockId);
    var pace = State.blockPace(blockId);
    var d = State.day(todayIso) || { lessons: [], addons: [] };
    var closedToday = d.lessons.indexOf(lessonId) >= 0 || isDone(lessonId);

    // дедлайн и радар — красные: оба означают «срок уже здесь»
    var whyClass = (sel.reason.kind === 'radar' || sel.reason.kind === 'deadline') ? '' :
      (sel.reason.kind === 'fresh' ? 'w-fresh' : (sel.reason.kind === 'swap' ? 'w-swap' : 'w-plan'));

    var pos = State.lessonNum(lessonId);
    var place = State.trackName(b.track) + ' · ' + State.blockLabel(blockId) + ' „' + U.esc(b.title) + '“ · урок ' +
      pos + '/' + (pr.total || 4);

    var debts = State.debtsCount(b.track);
    var last = State.recentSummaries(b.track, 1, lessonId)[0];
    var lastScore = last && last.parsed && last.parsed.score != null
      ? 'прошлый урок дорожки: ' + last.parsed.score + '/10' : 'прошлых уроков дорожки нет';

    return '<div class="lesson' + (bare ? ' bare' : '') + '">' +
      '<button class="why ' + whyClass + '" data-why="' + U.esc(sel.reason.kind) +
      '" aria-label="Почему выбран этот урок">выбор: ' +
      U.esc(whyText(sel.reason.text)) + ' ⓘ</button>' +
      '<div class="place">' + UI.trackDot(b.track) + ' ' + place + '</div>' +
      (withOfDay ? ofDayLine(lessonId, d) : '') +
      '<h4>' + U.esc(lesson.title) + '</h4>' +
      '<div class="meta">цель: ' + U.esc(lesson.goal || '—') + '</div>' +
      '<div class="params">' + U.esc(STEPS.lessonLine(p)) + '</div>' +
      (b.deadline ? '<div class="meta mono">' +
        U.esc(pace ? PACE.line(pace, b.deadline) : 'до ' + U.fmtShort(b.deadline)) + '</div>' : '') +
      (PROMPTS.video(lesson) ? '<div class="meta">▶ YouTube: «' + U.esc(PROMPTS.video(lesson)) + '»</div>' : '') +
      buttons(lessonId, closedToday, todayIso) +
      '<div class="foot">' + U.esc(debtLine(debts)) + ' · ' + U.esc(lastScore) + '</div>' +
      swapLink() +
      (bars && window.Waterfall ? Waterfall.miniBars() : '') +
      (minRow ? minimalRow() : '') +
      '</div>';
  }

  /** «1 долг», а не «долгов по дорожке: 1». */
  function debtLine(n) {
    if (!n) return 'долгов по дорожке нет';
    return 'по дорожке ' + n + ' ' + U.plural(n, 'открытый долг', 'открытых долга', 'открытых долгов');
  }

  function emptyCard() {
    return '<div class="lesson">' +
      UI.empty('🎉', 'Уроки текущих фаз закрыты.<br>Следующий пакет контента добавит новые.') +
      minimalRow() +
      '</div>';
  }

  /** Воскресенье — радар-день: урока нет, только минималка и чек-лист (7.8). */
  function sundayCard(sel) {
    return '<div class="lesson">' +
      '<span class="why w-plan">выбор: ' + U.esc(whyText(sel.reason.text)) + '</span>' +
      '<h4>Радар-день</h4>' +
      '<div class="meta">Урок не назначается. Пройдись по чек-листу недели — он даёт добавку +1.</div>' +
      '<div class="btns">' +
      '<button class="btn pr" data-checklist>Открыть чек-лист</button>' +
      '</div>' +
      '<div class="center" style="margin-top:10px">' +
      '<button class="linkbtn" data-force-lesson>всё равно хочу урок</button></div>' +
      (window.Waterfall ? Waterfall.miniBars() : '') +
      minimalRow() +
      '</div>';
  }

  var PENDING_WINDOW = 7;   // сколько дней назад ищем незакрытый урок

  /**
   * Незавершённый урок (7.8): промпт скопирован, итог не вставлен
   * до 04:00 следующего дня. Ищем не только вчера: после пары дней
   * без приложения незакрытый урок иначе тихо пропадал.
   */
  function findPending(todayIso) {
    for (var back = 1; back <= PENDING_WINDOW; back++) {
      var date = U.addDays(todayIso, -back);
      var d = State.s.days[date];
      if (!d || !d.copied || !d.copied.length) continue;
      var open = d.copied.filter(function (id) {
        var st = State.s.lessons[id];
        return (!st || !st.done) &&
          (d.lessons || []).indexOf(id) < 0 &&
          (d.dropped || []).indexOf(id) < 0;
      });
      if (open.length) return { date: date, lessonId: open[0] };
    }
    return null;
  }

  function unfinished(todayIso) {
    var p = findPending(todayIso);
    if (!p) return '';
    var l = CONTENT.lesson(p.lessonId);
    var back = U.diffDays(p.date, todayIso);
    return '<div class="card2 pending">' +
      '<div class="t">' + (back === 1 ? 'Вчерашний урок не закрыт' :
        'Урок от ' + U.esc(U.fmtShort(p.date)) + ' не закрыт') + '</div>' +
      '<div class="s">' + U.esc(p.lessonId + (l ? ' · ' + l.title : '')) + '</div>' +
      '<div class="btn-row" style="margin-top:10px">' +
      '<button class="btn sec" data-drop="' + U.esc(p.lessonId) + '" data-date="' + U.esc(p.date) + '">Урок не состоялся</button>' +
      '<button class="btn pr" data-late="' + U.esc(p.lessonId) + '" data-date="' + U.esc(p.date) + '">Вставить итог</button>' +
      '</div></div>';
  }

  /** Умная primary-кнопка: всегда ровно одна (раздел 7.8). */
  function buttons(lessonId, closed, todayIso) {
    var copied = State.promptCopied(lessonId, todayIso);
    var d = State.day(todayIso) || { level: 'none', lessons: [] };
    // у уроков-повторов видео нет: кнопке «Что смотреть» там нечего открывать
    var hasVideo = !!PROMPTS.video(CONTENT.lesson(lessonId));
    var watch = hasVideo ? '<button class="btn sec" data-watch="' + U.esc(lessonId) + '">Что смотреть</button>' : '';
    var html = '<div class="btns">';

    if (closed) {
      var pts = State.points(todayIso);
      var hasWords = State.lessonWords(lessonId).length > 0;
      var second = null;
      if (d.level === 'full' && d.lessons.length < 2) {
        var res = window.Waterfall ? Waterfall.second(todayIso, lessonId) : null;
        second = res ? res.lessonId : State.nextLesson();
      }
      if (second && second !== lessonId) {
        html += '<button class="btn pr" data-second="' + U.esc(second) + '">Второй урок: скопировать промпт</button>';
      } else {
        html += '<button class="btn pr" disabled>Урок закрыт ✓ · ' + pts + ' ' +
          U.plural(pts, 'очко', 'очка', 'очков') + '</button>';
      }
      if (hasWords) {
        html += '<button class="btn sec" data-lesson-words="' + U.esc(lessonId) + '">Слова урока</button>';
      }
      html += '<button class="btn sec" data-summary="' + U.esc(lessonId) + '">Итог ещё раз</button>';
    } else if (copied) {
      html += '<button class="btn pr" data-summary="' + U.esc(lessonId) + '">Вставить итог урока</button>';
      html += '<button class="btn sec" data-copy="' + U.esc(lessonId) + '">Скопировать ещё раз</button>';
      html += watch;
    } else {
      html += '<button class="btn pr" data-copy="' + U.esc(lessonId) + '">Скопировать промпт</button>';
      html += watch;
      html += '<button class="btn sec" data-summary="' + U.esc(lessonId) + '">Вставить итог урока</button>';
    }
    return html + '</div>';
  }

  function swapLink() {
    return '<div class="center" style="margin-top:10px">' +
      '<button class="linkbtn" data-swap>поменять урок</button></div>';
  }

  /** Строка минималки (раздел 6.1): карточки + промпт минималки. */
  function minimalRow() {
    var c = State.s.cards || {};
    var n = (c.lastDay === State.today()) ? (c.viewedToday || 0) : 0;
    return '<div class="minrow">' +
      '<button class="linkbtn" data-cards>Карточки' + (n ? ' · сегодня ' + n : '') + '</button>' +
      '<span class="dim">·</span>' +
      '<button class="linkbtn" data-minprompt>Промпт минималки</button>' +
      '</div>';
  }

  /* ---------- действия ---------- */

  function mount(host) {
    U.on(host, 'click', '[data-copy]', function (e, el) { copyPrompt(el.dataset.copy); });
    U.on(host, 'click', '[data-second]', function (e, el) { startSecond(el.dataset.second); });
    U.on(host, 'click', '[data-watch]', function (e, el) { watch(el.dataset.watch); });
    U.on(host, 'click', '[data-summary]', function (e, el) { openSummary(el.dataset.summary); });
    U.on(host, 'click', '[data-minprompt]', function () {
      var debts = State.warmupDebts();
      Promise.resolve(UI.copy(PROMPTS.minimal(), 'Промпт минималки скопирован'))
        .then(function (ok) { if (ok) State.markInjectedDebts(null, debts); });
    });
    U.on(host, 'click', '[data-cards]', function () {
      if (window.Cards) Cards.open();
    });
    U.on(host, 'click', '[data-why]', function (e, el) {
      if (window.Waterfall) Waterfall.explain(el.dataset.why);
    });
    U.on(host, 'click', '[data-swap]', function () {
      if (window.Waterfall && Waterfall.openSwap) Waterfall.openSwap();
    });
    U.on(host, 'click', '[data-force-lesson]', function () {
      var d = State.day(State.today(), true);
      d.forceLesson = true;
      State.touch();
    });
    U.on(host, 'click', '[data-checklist]', function () {
      if (window.Radar && Radar.openChecklist) Radar.openChecklist();
      else UI.toast('Чек-лист появится вместе с радаром');
    });
    U.on(host, 'click', '[data-lesson-words]', function (e, el) {
      if (window.Cards) Cards.openLessonWords(el.dataset.lessonWords);
    });
    U.on(host, 'click', '[data-late]', function (e, el) {
      openSummary(el.dataset.late, { date: el.dataset.date });
    });
    U.on(host, 'click', '[data-drop]', function (e, el) {
      dropLesson(el.dataset.drop, el.dataset.date);
      UI.toast('Урок вернулся в очередь. Без штрафа.', 'ok');
    });
  }

  /**
   * «Урок не состоялся» (7.8): промпт скопировали, но урок не провели.
   * Урок возвращается в очередь без штрафа — done не ставится, очки дня
   * не трогаются, напоминание гаснет. Отметка живёт на дне, а не на уроке:
   * бросить его сегодня и провести завтра — нормальный сценарий.
   */
  function dropLesson(lessonId, dateIso) {
    var d = State.day(dateIso || State.today(), true);
    d.dropped = d.dropped || [];
    if (d.dropped.indexOf(lessonId) < 0) d.dropped.push(lessonId);
    if (d.pick === lessonId) { d.pick = null; d.pickReason = null; }
    State.touch();
    return d;
  }

  var COPY_GUARD_MS = 700;   // палец на телефоне легко срабатывает дважды
  var lastCopyAt = 0;

  function tooSoon() {
    var now = Date.now();
    if (now - lastCopyAt < COPY_GUARD_MS) return true;
    lastCopyAt = now;
    return false;
  }

  /**
   * Урок считается начатым только после того, как промпт реально лёг в буфер:
   * если браузер буфер не отдал, открывается шторка ручного копирования,
   * а отметка «скопировано» не ставится — иначе на «Сегодня» появлялась
   * кнопка «Вставить итог» для урока, промпта которого нет.
   */
  /** Дорожка урока — так же, как её берёт lessonPrompt: из блока урока. */
  function trackOf(lessonId) {
    var l = CONTENT.lesson(lessonId);
    var b = l ? State.block(l.blockId) : null;
    return (b && b.track) || 'eng';
  }

  function copyPrompt(lessonId) {
    if (tooSoon()) return;
    var text = PROMPTS.lesson(lessonId);
    if (!text) { UI.toast('Не нашёл этот урок в контенте', 'bad'); return; }
    var sel = current();
    Promise.resolve(UI.copy(text, 'Промпт урока скопирован — вставь его в чат с ИИ'))
      .then(function (ok) {
        if (!ok) return;
        remember(lessonId, sel && sel.lessonId === lessonId ? sel.reason : null);
        State.markPromptCopied(lessonId);
        // список долгов этого промпта — по нему потом судится «Погашено».
        // Пишем только после реального копирования: не скопировал — не показывал
        State.markInjectedDebts(lessonId, State.promptDebts(trackOf(lessonId)));
      });
  }

  function startSecond(lessonId) {
    if (Date.now() - lastCopyAt < COPY_GUARD_MS) return;
    var date = State.today();
    var d = State.day(date, true);
    d.pick = lessonId;
    d.pickReason = { kind: 'plan', text: 'второй урок полной' };
    State.touch(true);
    copyPrompt(lessonId);
  }

  function watch(lessonId) {
    var l = CONTENT.lesson(lessonId);
    if (!l) return;
    var q = PROMPTS.video(l);
    if (!q) {
      UI.toast('У этого урока видео нет — сразу к попытке');
      return;
    }
    State.markVideoWatched(lessonId);
    var url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
    UI.sheet({
      title: 'Что смотреть',
      sub: 'Задание на просмотр: 3 термина + 1 вопрос. Просмотр в длительность урока не входит.',
      body:
        '<div class="card2 mono small" style="word-break:break-word">' + U.esc(q) + '</div>' +
        '<div class="btn-row" style="margin-top:12px">' +
        '<button class="btn sec" data-q>Скопировать запрос</button>' +
        '<a class="btn pr" href="' + U.esc(url) + '" target="_blank" rel="noopener">Открыть YouTube</a>' +
        '</div>',
      onMount: function (root) {
        root.querySelector('[data-q]').onclick = function () { UI.copy(q, 'Запрос скопирован'); };
      }
    });
  }

  /* ---------- вставка итога ---------- */

  function openSummary(lessonId, opts) {
    opts = opts || {};
    var date = opts.date || State.today();
    UI.sheet({
      title: 'Итог урока ' + lessonId,
      sub: 'Вставь блок целиком — от «=== ИТОГ УРОКА» до «=== КОНЕЦ ===».' +
        (opts.date && opts.date !== State.today() ? ' Закроется числом ' + U.fmtShort(date) + '.' : ''),
      body:
        '<textarea class="txt" data-t placeholder="=== ИТОГ УРОКА ' + U.esc(lessonId) + ' ===&#10;Пройдено: …"></textarea>' +
        '<div class="sum-err tiny r" style="margin-top:8px"></div>' +
        '<div class="btn-row" style="margin-top:10px">' +
        '<button class="btn sec" data-cancel>Отмена</button>' +
        '<button class="btn pr" data-save>Закрыть урок</button></div>',
      onMount: function (root, close) {
        var ta = root.querySelector('[data-t]');
        var err = root.querySelector('.sum-err');
        setTimeout(function () { ta.focus(); }, 80);
        root.querySelector('[data-cancel]').onclick = close;
        root.querySelector('[data-save]').onclick = function () {
          var parsed = PROMPTS.parse(ta.value);
          if (!parsed.ok) {
            err.textContent = parsed.error;
            return;
          }
          if (parsed.lessonId && parsed.lessonId !== lessonId) {
            err.innerHTML = 'В итоге стоит урок ' + U.esc(parsed.lessonId) + ', а закрываем ' +
              U.esc(lessonId) + '. Проверь — или нажми «Закрыть урок» ещё раз, чтобы всё равно засчитать.';
            if (!ta.dataset.warned) { ta.dataset.warned = '1'; return; }
          }
          // шторку закрываем только после успеха: иначе вставленный текст
          // пропадал вместе с ней, а урок оставался незакрытым
          var res = State.applySummary(lessonId, parsed, { date: date });
          if (!res.ok) {
            err.textContent = res.error || 'Не получилось закрыть урок — текст на месте, попробуй ещё раз';
            return;
          }
          close();
          var miss = (res.unmatched || []).length;
          var alien = res.foreign || [];
          UI.toast('Урок ' + lessonId + ' закрыт · ' + res.score + '/10 · ' +
            res.words + ' ' + U.plural(res.words, 'слово', 'слова', 'слов') +
            (res.created ? ' · ' + res.created + ' ' + U.plural(res.created, 'долг', 'долга', 'долгов') : '') +
            (res.cleared ? ' · погашено ' + res.cleared : '') +
            (res.closed ? ' · закрыто ' + res.closed : ''), 'ok', 4200);
          // строки «Погашено», не легшие ни на один долг, показываем отдельно —
          // иначе они пропадают, а студент думает, что долг отработан.
          // Чужой id — отдельная строка: долг существует, но в этом уроке его
          // не показывали, и «не сопоставлено» про него соврало бы
          if (miss || alien.length) {
            var parts = [];
            if (alien.length) parts.push('не из этого урока: ' + alien.length +
              ' (' + alien.join(', ') + ')');
            if (miss) parts.push('не сопоставлено: ' + miss + ' ' +
              U.plural(miss, 'строка', 'строки', 'строк'));
            UI.toast('«Погашено» — ' + parts.join(' · ') + '. Проверь id', '', 6000);
          }
        };
      }
    });
  }

  return {
    pick: pick, current: current, remember: remember, card: card, mount: mount,
    openSummary: openSummary, copyPrompt: copyPrompt, isDone: isDone,
    findPending: findPending, dropLesson: dropLesson,
    PENDING_WINDOW: PENDING_WINDOW, whyText: whyText,
    ofDayLine: ofDayLine, dayIndex: dayIndex, pendingCard: unfinished, dayLesson: dayLesson
  };
})();
