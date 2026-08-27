/* ============================================================
   journal.js — экран «Журнал» (раздел 6.4 ТЗ):
   лента итогов уроков, банк долгов (где создан / где погашен),
   счётчик слов, график очков по неделям и листалка «Карточки».
   ============================================================ */

(function () {
  'use strict';

  var debtFilter = 'open';   // open | closed
  var openSummaries = {};    // индекс итога → раскрыт ли сырой текст

  function render() {
    return '<h1>Журнал</h1>' +
      statsRow() +
      weeksChart() +
      cardsRow() +
      summariesSection() +
      debtsSection();
  }

  function statsRow() {
    var st = State.s.stats || {};
    var words = State.wordBank().length;
    return '<div class="card"><div class="stats3">' +
      stat(words, U.plural(words, 'слово', 'слова', 'слов')) +
      stat(st.lessonsDone || 0,
        U.plural(st.lessonsDone || 0, 'урок закрыт', 'урока закрыто', 'уроков закрыто')) +
      stat(st.bestStreak || 0, 'рекорд серии') +
      '</div></div>';
  }

  function stat(n, label) {
    return '<div class="st"><b class="mono">' + n + '</b><span>' + U.esc(label) + '</span></div>';
  }

  /** График очков по неделям — последние 8 недель. */
  function weeksChart() {
    var end = U.weekStart(State.today());
    var weeks = [];
    for (var i = 7; i >= 0; i--) {
      var ws = U.addDays(end, -7 * i);
      var sum = 0;
      for (var d = 0; d < 7; d++) sum += State.points(U.addDays(ws, d));
      weeks.push({ start: ws, points: sum });
    }
    var max = Math.max(1, Math.max.apply(null, weeks.map(function (w) { return w.points; })));
    var bars = weeks.map(function (w) {
      var h = Math.round(w.points / max * 100);
      var rank = DOCTRINE.rankFor(w.points, State.s.settings.ranks);
      return '<div class="wk" title="' + U.esc(U.fmtShort(w.start) + ' · ' + w.points + ' pts') + '">' +
        '<i style="height:' + Math.max(h, 2) + '%"></i>' +
        '<span class="mono">' + w.points + '</span>' +
        '<em>' + U.fmtShort(w.start).replace(' ', ' ') + '</em>' +
        (rank ? '<u>' + U.esc(rank.name) + '</u>' : '<u>—</u>') +
        '</div>';
    }).join('');
    return '<section class="block"><h2>Очки по неделям</h2>' +
      '<div class="card2 chart">' + bars + '</div></section>';
  }

  function cardsRow() {
    var c = State.s.cards || {};
    var n = (c.lastDay === State.today()) ? (c.viewedToday || 0) : 0;
    var deck = Cards.deck().length;
    var w = State.wordCounts();
    return '<section class="block"><h2>Карточки</h2>' +
      '<p class="lead">Слова из итогов уроков и незакрытые слабые места, старые вперёд. ' +
      'Тап переворачивает, дальше «знал / не знал». Три верных подряд — слово уходит на повтор ' +
      'через 4, 10 и 21 день, потом засыпает и колоду больше не занимает.</p>' +
      '<div class="card rowline">' +
      '<div class="k">В колоде ' + deck + ' ' + U.plural(deck, 'карточка', 'карточки', 'карточек') +
      '<span>слова: активных ' + w.active + ', выучено ' + w.known +
      ' · долги: ' + State.openDebts().length + ' · сегодня ' + n + '</span></div>' +
      '<button class="btn pr" style="width:auto;min-height:44px;padding:0 16px" data-open-cards>Листать</button>' +
      '</div></section>';
  }

  function summariesSection() {
    var list = State.s.summaries.slice().reverse();
    if (!list.length) {
      return '<section class="block"><h2>Итоги уроков</h2>' +
        UI.empty('📓', 'Пока пусто. Закрой первый урок — итог придёт сюда.') + '</section>';
    }
    return '<section class="block"><h2>Итоги уроков</h2><div class="list">' +
      list.map(function (s, i) {
        var p = s.parsed || {};
        var open = openSummaries[i];
        return '<div class="item" data-sum="' + U.esc(i) + '">' +
          '<div class="rowline"><div style="min-width:0">' +
          '<div class="t">' + U.esc(s.lessonId) + ' · ' + U.esc(p.topics || '—') + '</div>' +
          '<div class="s"><span class="mono">' + U.fmtShort(s.date) + '</span> · ' + (p.level || '—') + ' · ' +
          ((p.words || []).length) + ' ' + U.plural((p.words || []).length, 'слово', 'слова', 'слов') +
          ((p.debts || []).length ? ' · +' + p.debts.length + ' ' +
            U.plural(p.debts.length, 'долг', 'долга', 'долгов') : '') + '</div>' +
          '</div><div class="mono ' + scoreClass(p.score) + '">' + (p.score != null ? p.score + '/10' : '—') + '</div></div>' +
          (open ? detail(p) : '') +
          ((open && (p.words || []).length)
            ? '<div class="btn-row" style="margin-top:10px">' +
            '<button class="btn ghost" data-words="' + U.esc(s.lessonId) + '">Слова урока</button></div>'
            : '') +
          '</div>';
      }).join('') + '</div></section>';
  }

  function scoreClass(score) {
    if (score == null) return 'dim';
    return score >= 7.5 ? 'g' : (score >= 6 ? 'y' : 'r');
  }

  function detail(p) {
    var w = (p.words || []).map(function (x) { return U.esc(x.en) + ' — ' + U.esc(x.ru); }).join('; ');
    return '<div class="lessons">' +
      (w ? '<div class="small"><span class="dim">слова:</span> ' + w + '</div>' : '') +
      ((p.debts || []).length ? '<div class="small" style="margin-top:5px"><span class="dim">долги:</span> ' +
        p.debts.map(U.esc).join(' · ') + '</div>' : '') +
      ((p.warmup || []).length ? '<div class="small" style="margin-top:5px"><span class="dim">в разогрев:</span> ' +
        p.warmup.map(U.esc).join(' · ') + '</div>' : '') +
      (p.writing ? '<div class="small" style="margin-top:5px"><span class="dim">письмо:</span> ' + U.esc(p.writing) + '</div>' : '') +
      '</div>';
  }

  function debtsSection() {
    var all = State.s.debts;
    var open = all.filter(function (d) { return d.status === 'open'; });
    var closed = all.filter(function (d) { return d.status !== 'open'; });
    var list = debtFilter === 'open' ? open : closed;

    var head = '<section class="block"><div class="rowline" style="margin-bottom:10px">' +
      '<h2 style="margin:0">Банк долгов</h2>' +
      '<div class="seg"><button data-debt-f="open" aria-pressed="' + (debtFilter === 'open') + '">открытые ' + open.length + '</button>' +
      '<button data-debt-f="closed" aria-pressed="' + (debtFilter === 'closed') + '">закрытые ' + closed.length + '</button></div>' +
      '</div>';

    if (!list.length) {
      return head + UI.empty('🧩', debtFilter === 'open'
        ? 'Открытых долгов нет. Они появятся из «ИТОГА УРОКА».'
        : 'Пока ничего не погашено. Долг закрывается после верных ответов в двух разных уроках.') + '</section>';
    }

    return head + '<div class="list">' + list.map(function (d) {
      var done = State.debtProgress(d);
      var where = U.esc((d.clearedIn || []).join(', ') || 'пока нигде');
      return '<div class="item">' +
        '<div class="t">' + UI.trackDot(d.track || 'eng') +
        (d.did ? ' <span class="mono dim">' + U.esc(d.did) + '</span>' : '') +
        ' ' + U.esc(d.text) + '</div>' +
        '<div class="s">создан в ' + U.esc(d.createdIn) + ' · погашено ' + done + '/2: ' + where +
        (d.status !== 'open' ? ' · закрыт ' + (d.closedDate ? U.fmtShort(d.closedDate) : '') : '') + '</div>' +
        '</div>';
    }).join('') + '</div></section>';
  }

  function uniq(list) {
    var seen = {}, n = [];
    (list || []).forEach(function (x) { if (!seen[x]) { seen[x] = true; n.push(x); } });
    return n;
  }

  function mount(host) {
    U.on(host, 'click', '[data-debt-f]', function (e, el) {
      debtFilter = el.dataset.debtF;
      App.renderScreen('journal');
    });
    U.on(host, 'click', '[data-sum]', function (e, el) {
      var i = el.dataset.sum;
      openSummaries[i] = !openSummaries[i];
      App.renderScreen('journal');
    });
    U.on(host, 'click', '[data-open-cards]', function () { Cards.open(); });
    U.on(host, 'click', '[data-words]', function (e, el) {
      e.stopPropagation();
      Cards.openLessonWords(el.dataset.words);
    });
  }

  App.register('journal', { render: render, mount: mount });
})();

/* ============================================================
   Карточки — листалка минималки (раздел 6.4) с SRS-lite (2.6.0).
   Старые вперёд, тап переворачивает, затем «знал / не знал».
   Три верных подряд — слово выучено и уходит на интервалы
   4 → 10 → 21 день, потом спит. Ошибка на выученном возвращает
   его в работу. Время минималки от этого не растёт: колода,
   наоборот, со временем становится короче.
   Долги оценок не имеют — они закрываются уроками, не карточками.
   ============================================================ */

window.Cards = (function () {
  'use strict';

  var idx = 0, flipped = false;

  function deck() {
    // выученные слова, у которых срок повтора не подошёл, в колоду не берём
    var words = State.activeWords().map(function (w) {
      return {
        type: 'word', en: w.en, key: 'w:' + String(w.en).toLowerCase().trim(),
        front: w.en, back: w.ru,
        meta: U.fmtShort(w.date) + ' · ' + w.lessonId + ' · ' + statusName(State.wordStatus(w.en))
      };
    });
    var debts = State.openDebts().map(function (d) {
      return {
        type: 'debt', key: 'd:' + (d.did || d.id),
        front: (d.did ? d.did + ' · ' : '') + d.text,
        back: 'долг из ' + d.createdIn + ' · погашено ' + State.debtProgress(d) + '/2' +
          ' · отработан в ' + ((d.clearedIn || []).join(', ') || '—'),
        meta: State.trackName(d.track || 'eng')
      };
    });
    return words.concat(debts);
  }

  var STATUS_NAME = { 'new': 'новое', learning: 'в работе', known: 'выучено' };
  function statusName(st) { return STATUS_NAME[st] || 'новое'; }

  function open() {
    idx = 0; flipped = false;
    var list = deck();
    if (!list.length) {
      UI.sheet({
        title: 'Карточки',
        sub: 'Колода пустая.',
        body: UI.empty('🃏', 'Слова приходят из «ИТОГА УРОКА», долги — оттуда же.<br>Закрой первый урок — и колода наполнится.')
      });
      return;
    }
    UI.sheet({
      title: 'Карточки',
      sub: 'Тап по карточке — перевернуть, потом честно отметь себя.',
      body: '<div class="cardbox" data-box></div>' +
        '<div class="btn-row" style="margin-top:12px" data-grade hidden>' +
        '<button class="btn sec" data-know="0">не знал</button>' +
        '<button class="btn pr" data-know="1">знал</button></div>' +
        '<div class="btn-row" style="margin-top:12px" data-move>' +
        '<button class="btn sec" data-prev' + (list.length < 2 ? ' disabled' : '') + '>← назад</button>' +
        '<button class="btn pr" data-next' + (list.length < 2 ? ' disabled' : '') + '>дальше →</button></div>' +
        '<div class="center tiny dim" style="margin-top:10px" data-counter></div>',
      onMount: function (root) {
        var box = root.querySelector('[data-box]');
        var counter = root.querySelector('[data-counter]');
        var grade = root.querySelector('[data-grade]');
        var move = root.querySelector('[data-move]');
        var list2 = list;

        function paint() {
          var c = list2[idx];
          markSeen(c.key);
          box.className = 'cardbox' + (flipped ? ' flip' : '') + (c.type === 'debt' ? ' debt' : '');
          box.innerHTML = '<div class="cb-side">' + U.esc(flipped ? c.back : c.front) + '</div>' +
            '<div class="cb-meta tiny dim">' + U.esc(c.meta || '') + (c.type === 'debt' ? ' · долг' : '') + '</div>';
          // оценка только у слов и только после переворота: оценивать
          // закрытую карточку нечестно, а долг карточкой не закрывается
          var canGrade = flipped && c.type === 'word';
          grade.hidden = !canGrade;
          move.hidden = canGrade;
          var n = State.wordCounts();
          // строка читается без арифметики: у слов и долгов свои счётчики
          counter.textContent = (idx + 1) + ' из ' + list2.length +
            ' · слова: активных ' + n.active + ', выучено ' + n.known +
            ' · долги: ' + State.openDebts().length +
            ' · сегодня ' + count();
        }
        function step(n) {
          if (list2.length < 2) return;
          idx = (idx + n + list2.length) % list2.length;
          flipped = false;
          paint();                       // отметку ставит сам paint, по ключу карточки
        }
        box.onclick = function () { flipped = !flipped; paint(); };
        root.querySelector('[data-prev]').onclick = function () { step(-1); };
        root.querySelector('[data-next]').onclick = function () { step(1); };
        U.on(root, 'click', '[data-know]', function (e, el) {
          var c = list2[idx];
          if (!c || c.type !== 'word') return;
          var was = State.wordStatus(c.en);
          var rec = State.gradeWord(c.en, el.dataset.know === '1');
          if (rec && rec.status === 'known' && was !== 'known') {
            UI.toast('«' + c.en + '» выучено — вернётся через ' + U.days(State.SRS_INTERVALS[0]), 'ok');
          } else if (rec && was === 'known' && rec.status !== 'known') {
            UI.toast('«' + c.en + '» вернулось в работу', '');
          }
          if (list2.length < 2) { flipped = false; paint(); return; }
          step(1);
        });
        paint();
      }
    });
  }

  /**
   * Отмечает карточку показанной сегодня. Считаем УНИКАЛЬНЫЕ карточки:
   * колода кольцевая, и прежний счётчик нажатий давал «сегодня 151» при
   * колоде 80 — число, которое не с чем сравнить.
   * Обнуление — на границе суток; State.today() держит её на 04:00.
   */
  function markSeen(key) {
    if (!key) return;
    var c = State.s.cards || (State.s.cards = { lastDay: null, viewedToday: 0, seen: [] });
    if (!Array.isArray(c.seen)) c.seen = [];
    var t = State.today();
    if (c.lastDay !== t) { c.lastDay = t; c.seen = []; c.viewedToday = 0; }
    if (c.seen.indexOf(key) >= 0) return;        // ту же карточку второй раз не считаем
    c.seen.push(key);
    c.viewedToday = c.seen.length;
    State.touch(true);
  }

  /** Сколько разных карточек посмотрели сегодня. */
  function count() {
    var c = State.s.cards || {};
    return c.lastDay === State.today() ? (c.viewedToday || 0) : 0;
  }

  /**
   * «Слова урока» — все слова закрытого урока со статусами.
   * Открывается из Журнала и с карточки урока на «Сегодня».
   */
  function openLessonWords(lessonId) {
    var words = State.lessonWords(lessonId);
    var l = window.CONTENT ? CONTENT.lesson(lessonId) : null;
    if (!words.length) {
      UI.sheet({
        title: 'Слова урока ' + lessonId,
        sub: l ? l.title : '',
        body: UI.empty('🈳', 'В итоге этого урока слов нет.')
      });
      return;
    }
    var known = words.filter(function (w) { return w.status === 'known'; }).length;
    UI.sheet({
      title: 'Слова урока ' + lessonId,
      sub: (l ? l.title + ' · ' : '') + 'активных ' + (words.length - known) + ' · выучено ' + known,
      body: '<div class="list">' + words.map(function (w) {
        var tail = w.status === 'known'
          ? (w.due ? 'повтор ' + U.fmtShort(w.due) : 'спит')
          : (w.streak ? 'верных подряд: ' + w.streak + ' из ' + State.SRS_TO_KNOWN : 'ещё не отвечалось');
        return '<div class="item"><div class="rowline"><div style="min-width:0">' +
          '<div class="t">' + U.esc(w.en) + ' — ' + U.esc(w.ru) + '</div>' +
          '<div class="s">' + U.esc(tail) + '</div></div>' +
          '<div class="mono ' + (w.status === 'known' ? 'g' : 'dim') + '">' +
          U.esc(statusName(w.status)) + '</div></div></div>';
      }).join('') + '</div>'
    });
  }

  return {
    open: open, deck: deck, count: count, markSeen: markSeen,
    openLessonWords: openLessonWords, statusName: statusName
  };
})();
