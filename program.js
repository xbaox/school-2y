/* ============================================================
   program.js — экран «Программа» (раздел 6.2 ТЗ).
   Фазы → блоки: название, дорожка, дедлайн, светофор темпа,
   прогресс уроков (●●○○). Тап по блоку — уроки, темы, статусы, счёт.
   Дедлайны редактируются; «сдвинуть фазу» двигает все дедлайны фазы.
   ============================================================ */

(function () {
  'use strict';

  var openBlocks = {};      // blockId → раскрыт ли список уроков
  var openPhases = null;    // phaseId → раскрыта ли фаза (null = ещё не считали)

  function ensurePhaseState() {
    if (openPhases) return;
    openPhases = {};
    var cur = State.currentPhase();
    State.phases().forEach(function (p) { openPhases[p.id] = (p.id === cur); });
  }

  /**
   * Счётчик шапки считает по контенту, а не по ключам state.lessons:
   * в состоянии, пережившем сжатие Ф0, ещё лежат записи пропущенных уроков,
   * и шапка обещала 24 урока против «5/15» в прогрессе блоков ниже.
   */
  function contentCounts() {
    var total = 0, skipped = 0, done = 0;
    Object.keys(State.s.blocks).forEach(function (id) {
      State.blockLessons(id).forEach(function (l) {
        if (l.skipped) { skipped++; return; }
        total++;
        var st = State.s.lessons[l.id];
        if (st && st.done) done++;
      });
    });
    return { total: total, skipped: skipped, done: done };
  }

  function render() {
    ensurePhaseState();
    var totalBlocks = Object.keys(State.s.blocks).length;
    var c = contentCounts();

    return '<h1>Программа</h1>' +
      '<p class="lead">' + totalBlocks + ' ' + U.plural(totalBlocks, 'блок', 'блока', 'блоков') +
      ' · в контенте ' + c.total + ' ' + U.plural(c.total, 'урок', 'урока', 'уроков') +
      (c.skipped ? ' · ' + c.skipped + ' ' + U.plural(c.skipped, 'пропущен', 'пропущено', 'пропущено') : '') +
      ' · закрыто ' + c.done +
      '. Дедлайны редактируются, фазу можно сдвинуть целиком.</p>' +
      '<section class="block"><h2>Свежесть дорожек</h2>' +
      '<p class="lead">Свежесть — сколько дней дорожку не трогали. Сбрасывает её только полноценный ' +
      'урок, минималка не считается. 0–3 дня зелёный · 4–5 жёлтый · 6+ красный.</p>' +
      (window.Waterfall ? Waterfall.fullBars() : '') + '</section>' +
      State.phases().map(phaseSection).join('');
  }

  function phaseSection(p) {
    var ids = State.phaseBlocks(p.id);
    var pd = State.s.settings.phaseDates[p.id] || {};
    var isOpen = openPhases[p.id];
    var cur = State.currentPhase() === p.id;

    var tot = 0, dn = 0;
    ids.forEach(function (id) {
      var pr = State.blockProgress(id);
      tot += pr.total; dn += pr.done;
    });

    var head =
      '<div class="ph-head" role="button" tabindex="0" aria-expanded="' + !!isOpen +
      '" data-phase-toggle="' + U.esc(p.id) + '">' +
      '<div>' +
      '<h2>' + U.esc(p.name) + (cur ? ' <span class="tag on">сейчас</span>' : '') + '</h2>' +
      '<div class="small dim">' +
      (pd.start ? U.fmtShort(pd.start) + ' – ' + U.fmtShort(pd.end) + ' · ' : '') +
      ids.length + ' ' + U.plural(ids.length, 'блок', 'блока', 'блоков') +
      (tot ? ' · ' + dn + '/' + tot + ' ' + U.plural(tot, 'урок', 'урока', 'уроков') : ' · уроки придут пакетом') +
      '</div>' +
      (p.milestone ? '<div class="tiny fire ph-mile">' + U.esc(p.milestone) + '</div>' : '') +
      '</div>' +
      '<span class="chev">' + (isOpen ? '▾' : '▸') + '</span>' +
      '</div>';

    if (!isOpen) return '<section class="block phase">' + head + '</section>';

    var body = ids.map(blockRow).join('') +
      '<button class="btn ghost" data-shift="' + U.esc(p.id) + '">сдвинуть фазу</button>';

    return '<section class="block phase">' + head + '<div class="list" style="margin-top:8px">' + body + '</div></section>';
  }

  function blockRow(id) {
    var b = State.block(id);
    var pr = State.blockProgress(id);
    var st = State.blockPace(id);
    var isOpen = openBlocks[id];

    var light = st
      ? '<span class="' + UI.lightClass(st.color) + '">' + UI.lightDot(st.color) + ' ' + U.esc(st.text) + '</span>'
      : '<span class="dim">уроки придут пакетом</span>';

    // закрытые уроки — цветом своей дорожки: по колонке точек видно,
    // какие предметы двигаются, а какие стоят
    var dots = '';
    for (var i = 0; i < pr.total; i++) {
      dots += i < pr.done
        ? '<b class="on t-' + U.esc(b.track) + '">●</b>'
        : '<b class="off">○</b>';
    }

    // полоска прогресса блока — она же несёт контраст: точки мелкие
    var bar = pr.total
      ? '<div class="blbar"><i class="t-' + U.esc(b.track) + '" style="width:' +
      Math.round(pr.done / pr.total * 100) + '%"></i></div>'
      : '';

    var head =
      '<div class="bl-head" role="button" tabindex="0" aria-expanded="' + !!isOpen +
      '" data-block-toggle="' + U.esc(id) + '">' +
      '<div style="min-width:0">' +
      '<div class="bl-t">' + UI.trackDot(b.track) + ' ' + State.blockLabel(id) + ' · ' + U.esc(b.title) + '</div>' +
      '<div class="small muted bl-s">' +
      (b.deadline ? '<span class="mono">до ' + U.fmtShort(b.deadline) + '</span> · ' : '') + light + '</div>' +
      (b.note ? '<div class="tiny dim">' + U.esc(b.note) + '</div>' : '') +
      '</div>' +
      '<div class="prog mono">' + (dots || '<span class="dim tiny">—</span>') + '</div>' +
      '</div>';

    if (!isOpen) return '<div class="item bl">' + head + bar + '</div>';

    return '<div class="item bl open">' + head + bar + lessonsList(id) +
      '<div class="btn-row" style="margin-top:10px">' +
      '<button class="btn ghost" data-deadline="' + U.esc(id) +
      '" aria-label="Изменить дедлайн блока">✏️ дедлайн</button>' +
      '</div></div>';
  }

  function lessonsList(id) {
    var list = State.blockLessons(id);
    if (!list.length) {
      return '<div class="fnote" style="margin-top:10px">Уроки этого блока придут пакетом контента. ' +
        'Тема и дедлайн уже стоят в плане.</div>';
    }
    return '<div class="lessons">' + list.map(function (l) {
      var st = State.s.lessons[l.id] || {};
      // пропущенный урок не прячем: план должен объяснять, почему блок
      // закрывается раньше, чем кончились строчки
      var mark = l.skipped ? '<span class="dim">–</span>'
        : (st.done ? '<span class="g">✓</span>' : '<span class="dim">○</span>');
      var score = st.done && st.score != null ? '<span class="mono tiny">' + st.score + '/10</span>' : '';
      var tail = l.skipped
        ? '<span class="tiny dim"> — пропущен: сжатие Ф0</span>'
        : '<span class="tiny dim"> — ' + U.esc(l.goal || '') + '</span>';
      return '<div class="lrow' + (l.skipped ? ' skip' : '') + '">' +
        '<span class="lm">' + mark + '</span>' +
        '<span class="lt">' + State.lessonNum(l.id) + '. ' + U.esc(l.title) + tail + '</span>' +
        score + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- действия ---------- */

  function mount(host) {
    // role="button" обязан слушаться клавиатуры так же, как настоящая кнопка
    U.on(host, 'keydown', '[data-phase-toggle],[data-block-toggle]', function (e, el) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      el.click();
    });

    U.on(host, 'click', '[data-phase-toggle]', function (e, el) {
      var id = el.dataset.phaseToggle;
      openPhases[id] = !openPhases[id];
      App.renderScreen('program');
    });

    U.on(host, 'click', '[data-block-toggle]', function (e, el) {
      var id = el.dataset.blockToggle;
      openBlocks[id] = !openBlocks[id];
      App.renderScreen('program');
    });

    U.on(host, 'click', '[data-deadline]', function (e, el) {
      e.stopPropagation();
      editDeadline(el.dataset.deadline);
    });

    U.on(host, 'click', '[data-shift]', function (e, el) {
      e.stopPropagation();
      shiftPhase(el.dataset.shift);
    });
  }

  function editDeadline(id) {
    var b = State.block(id);
    if (!b) return;
    UI.sheet({
      title: 'Дедлайн ' + State.blockLabel(id),
      sub: b.title,
      body:
        '<input class="txt" type="date" data-d value="' + U.esc(b.deadline || '') + '">' +
        '<div class="btn-row" style="margin-top:12px">' +
        '<button class="btn sec" data-cancel>Отмена</button>' +
        '<button class="btn pr" data-save>Сохранить</button></div>',
      onMount: function (root, close) {
        root.querySelector('[data-cancel]').onclick = close;
        root.querySelector('[data-save]').onclick = function () {
          var v = root.querySelector('[data-d]').value;
          close();
          State.setDeadline(id, v);
          UI.toast('Дедлайн ' + State.blockLabel(id) + ' — ' + (v ? U.fmtShort(v) : 'снят'), 'ok');
        };
      }
    });
  }

  function shiftPhase(phaseId) {
    UI.sheet({
      title: 'Сдвинуть ' + U.esc(State.phaseName(phaseId)),
      sub: 'На сколько дней двигаем все дедлайны блоков фазы? Минус — раньше.',
      body:
        '<div class="btn-row"><button class="btn sec" data-preset="-7">−7</button>' +
        '<button class="btn sec" data-preset="7">+7</button>' +
        '<button class="btn sec" data-preset="14">+14</button></div>' +
        '<input class="txt mono" style="margin-top:10px;text-align:center" type="number" data-n value="7">' +
        '<div class="btn-row" style="margin-top:12px">' +
        '<button class="btn sec" data-cancel>Отмена</button>' +
        '<button class="btn pr" data-save>Сдвинуть</button></div>',
      onMount: function (root, close) {
        var inp = root.querySelector('[data-n]');
        U.els('[data-preset]', root).forEach(function (b) {
          b.onclick = function () { inp.value = b.dataset.preset; };
        });
        root.querySelector('[data-cancel]').onclick = close;
        root.querySelector('[data-save]').onclick = function () {
          var n = parseInt(inp.value, 10) || 0;
          close();
          var moved = State.shiftPhase(phaseId, n);
          UI.toast(moved
            ? 'Сдвинуто ' + moved + ' ' + U.plural(moved, 'блок', 'блока', 'блоков')
            : 'Нечего двигать', moved ? 'ok' : '');
        };
      }
    });
  }

  App.register('program', { render: render, mount: mount, counts: contentCounts });
})();
