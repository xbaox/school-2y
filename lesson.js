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

  function isDone(lessonId) {
    var st = State.s.lessons[lessonId];
    return !!(st && st.done);
  }

  /* ---------- карточка ---------- */

  function card() {
    var todayIso = State.today();
    var pending = unfinished(todayIso);
    var sel = current(todayIso);
    if (!sel) return pending + emptyCard();
    if (sel.sunday) return pending + sundayCard(sel);

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

    var whyClass = sel.reason.kind === 'radar' ? '' :
      (sel.reason.kind === 'fresh' ? 'w-fresh' : (sel.reason.kind === 'swap' ? 'w-swap' : 'w-plan'));

    var pos = State.lessonNum(lessonId);
    var place = State.trackName(b.track) + ' · ' + State.blockLabel(blockId) + ' „' + U.esc(b.title) + '“ · урок ' +
      pos + '/' + (pr.total || 4);

    var debts = State.debtsCount(b.track);
    var last = State.recentSummaries(b.track, 1, lessonId)[0];
    var lastScore = last && last.parsed && last.parsed.score != null
      ? 'прошлый урок дорожки: ' + last.parsed.score + '/10' : 'прошлых уроков дорожки нет';

    return pending +
      '<div class="lesson">' +
      '<button class="why ' + whyClass + '" data-why="' + U.esc(sel.reason.kind) + '">выбор: ' +
      U.esc(sel.reason.text) + ' ⓘ</button>' +
      '<div class="place">' + UI.trackDot(b.track) + ' ' + place + '</div>' +
      '<h4>' + U.esc(lesson.title) + '</h4>' +
      '<div class="meta">цель: ' + U.esc(lesson.goal || '—') + '</div>' +
      '<div class="params">' + U.esc(STEPS.cardLine(p)) + '</div>' +
      (b.deadline ? '<div class="meta">' + U.esc(pace ? PACE.line(pace, b.deadline) : 'до ' + U.fmtShort(b.deadline)) + '</div>' : '') +
      (lesson.youtube ? '<div class="meta">▶ YouTube: «' + U.esc(lesson.youtube) + '»</div>' : '') +
      buttons(lessonId, closedToday, todayIso) +
      '<div class="foot">долгов по дорожке: ' + debts + ' · ' + U.esc(lastScore) + '</div>' +
      swapLink() +
      freshBars() +
      minimalRow() +
      '</div>';

    function freshBars() { return window.Waterfall ? Waterfall.miniBars() : ''; }
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
      '<span class="why w-plan">выбор: ' + U.esc(sel.reason.text) + '</span>' +
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
    var html = '<div class="btns">';

    if (closed) {
      var pts = State.points(todayIso);
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
      html += '<button class="btn sec" data-summary="' + U.esc(lessonId) + '">Итог ещё раз</button>';
    } else if (copied) {
      html += '<button class="btn pr" data-summary="' + U.esc(lessonId) + '">Вставить итог урока</button>';
      html += '<button class="btn sec" data-copy="' + U.esc(lessonId) + '">Скопировать ещё раз</button>';
      html += '<button class="btn sec" data-watch="' + U.esc(lessonId) + '">Что смотреть</button>';
    } else {
      html += '<button class="btn pr" data-copy="' + U.esc(lessonId) + '">Скопировать промпт</button>';
      html += '<button class="btn sec" data-watch="' + U.esc(lessonId) + '">Что смотреть</button>';
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
      UI.copy(PROMPTS.minimal(), 'Промпт минималки скопирован');
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
    U.on(host, 'click', '[data-late]', function (e, el) {
      openSummary(el.dataset.late, { date: el.dataset.date });
    });
    U.on(host, 'click', '[data-drop]', function (e, el) {
      var prev = el.dataset.date;
      var d = State.day(prev, true);
      d.dropped = d.dropped || [];
      if (d.dropped.indexOf(el.dataset.drop) < 0) d.dropped.push(el.dataset.drop);
      if (d.pick === el.dataset.drop) { d.pick = null; d.pickReason = null; }
      State.touch();
      UI.toast('Урок вернулся в очередь. Без штрафа.', 'ok');
    });
  }

  function copyPrompt(lessonId) {
    var text = PROMPTS.lesson(lessonId);
    if (!text) { UI.toast('Не нашёл этот урок в контенте', 'bad'); return; }
    UI.copy(text, 'Промпт урока скопирован — вставь его в чат с ИИ');
    var sel = current();
    remember(lessonId, sel && sel.lessonId === lessonId ? sel.reason : null);
    State.markPromptCopied(lessonId);
  }

  function startSecond(lessonId) {
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
    State.markVideoWatched(lessonId);
    var q = l.youtube;
    if (!q) {
      UI.toast('У этого урока видео нет — сразу к попытке');
      return;
    }
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
          UI.toast('Урок ' + lessonId + ' закрыт · ' + res.score + '/10 · ' +
            res.words + ' ' + U.plural(res.words, 'слово', 'слова', 'слов') +
            (res.created ? ' · ' + res.created + ' ' + U.plural(res.created, 'долг', 'долга', 'долгов') : '') +
            (res.closed ? ' · погашено ' + res.closed : ''), 'ok', 4200);
        };
      }
    });
  }

  return {
    pick: pick, current: current, remember: remember, card: card, mount: mount,
    openSummary: openSummary, copyPrompt: copyPrompt, isDone: isDone,
    findPending: findPending, PENDING_WINDOW: PENDING_WINDOW
  };
})();
