/* ============================================================
   app.js — роутер табов, экран «Сегодня», запуск приложения.
   Экраны регистрируются через App.register(id, {render, mount}).
   ============================================================ */

window.App = (function () {
  'use strict';

  var TABS = [
    { id: 'today', ic: '🔥', name: 'Сегодня' },
    { id: 'program', ic: '🗺', name: 'Программа' },
    { id: 'radar', ic: '📡', name: 'Радар' },
    { id: 'journal', ic: '📓', name: 'Журнал' },
    { id: 'settings', ic: '⚙️', name: 'Настройки' }
  ];

  var screens = {};
  var mounted = {};      // id экрана → делегированные слушатели уже навешаны
  var active = 'today';
  var booted = false;

  function register(id, screen) {
    screens[id] = screen;
    mounted[id] = false;
    if (booted) renderScreen(id);
  }

  function isSplit() {
    return window.innerWidth >= 900 && (active === 'today' || active === 'program');
  }

  function go(id) {
    if (!TABS.some(function (t) { return t.id === id; })) return;
    active = id;
    document.body.classList.toggle('split', isSplit());
    U.els('.screen').forEach(function (el) {
      el.classList.toggle('active', el.dataset.screen === id);
    });
    U.els('.tabbar button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.tab === id));
    });
    renderScreen(id);
    if (isSplit()) renderScreen(id === 'today' ? 'program' : 'today');
    window.scrollTo(0, 0);
  }

  /**
   * Слушатели экрана делегированные и висят на самой секции, а секция живёт
   * всю сессию — меняется только её innerHTML. Поэтому mount() зовём ровно
   * один раз за экран: иначе каждая перерисовка добавляла бы ещё один
   * одинаковый обработчик, и один тап давал бы N срабатываний.
   * Всё, что надо перевешивать после подмены разметки (прямые onclick
   * на конкретных узлах), живёт в необязательном update().
   */
  function renderScreen(id) {
    var host = U.el('.screen[data-screen="' + id + '"]');
    if (!host) return;
    var sc = screens[id];
    if (!sc) { host.innerHTML = stub(id); return; }
    host.innerHTML = sc.render();
    if (!mounted[id] && sc.mount) {
      sc.mount(host);
      mounted[id] = true;
    }
    if (sc.update) sc.update(host);
  }

  /** Перерисовать активный экран (и соседний в двухколоночном режиме). */
  function render() {
    renderScreen(active);
    if (isSplit()) renderScreen(active === 'today' ? 'program' : 'today');
    renderTabAlerts();
  }

  function stub(id) {
    var t = TABS.filter(function (x) { return x.id === id; })[0];
    return '<h1>' + U.esc(t ? t.name : id) + '</h1>' +
      UI.empty('🧱', 'Экран собирается на следующем этапе.');
  }

  /** Красная точка на табе (горящие дела/радар) — наполняется на этапе 5. */
  function renderTabAlerts() {
    var btn = U.el('.tabbar button[data-tab="radar"]');
    if (!btn) return;
    var n = (typeof Radar !== 'undefined' && Radar.burningCount) ? Radar.burningCount() : 0;
    btn.classList.toggle('has-alert', n > 0);
  }

  /* ============================================================
     Экран «Сегодня»
     ============================================================ */

  var Today = {
    render: function () {
      var t = State.today();
      var d = State.day(t) || { level: 'none', addons: [], lessons: [] };
      return topRow(t) + weekStrip(t) + badges() + stepCard() +
        levelSeg(d) + planBlock(t, d) + addonChips(d) +
        freshBars() + ifThenLine(t);
    },
    mount: function (host) {
      // сегмент-контрол: повторный тап по активному уровню его не снимает
      U.on(host, 'click', '[data-level]', function (e, el) {
        var id = el.dataset.level;
        if (((State.day(State.today()) || {}).level || 'none') === id) return;
        openItem = null;                       // новый уровень — новый первый пункт
        flash(id);
        State.setLevel(id);
      });
      U.on(host, 'click', '[data-addon]', function (e, el) {
        flash(el.dataset.addon);
        State.toggleAddon(el.dataset.addon);
      });
      U.on(host, 'click', '[data-step]', function () { StepsFlow.openDetails(); });

      // аккордеон плана: раскрыт один пункт за раз
      U.on(host, 'click', '[data-open]', function (e, el) {
        var id = el.dataset.open;
        openItem = (resolveOpen(planItems(State.today(), State.day(State.today()) || {})) === id) ? '' : id;
        renderScreen('today');
      });
      U.on(host, 'click', '[data-tick]', function (e, el) { tick(el.dataset.tick); });

      // отметки внутри раскрытых пунктов: память дня, очков не дают
      U.on(host, 'change', '[data-mstep]', function (e, el) {
        setMinimalStep(+el.dataset.mstep, el.checked);
      });
      U.on(host, 'change', '[data-check]', function (e, el) {
        if (window.Radar) Radar.toggleCheck(+el.dataset.check);
      });

      if (window.Lesson) Lesson.mount(host);
      if (window.Radar && Radar.mountToday) Radar.mountToday(host);
    }
  };

  function topRow(t) {
    var st = State.streak();
    return '<div class="p-top">' +
      '<span class="streak">🔥 ' + st + ' <em>' +
      U.plural(st, 'день', 'дня', 'дней') + ' подряд</em></span>' +
      dayRing(t) +
      '</div>';
  }

  /* ---------- кольцо дня ---------- */

  var RING_R = 20.5;                          // диаметр 44px при обводке 3px
  var RING_C = 2 * Math.PI * RING_R;
  var ringWasDone = false;

  /**
   * План дня = максимальный уровень доктрины плюс отмеченные добавки;
   * кольцо замыкается только на полной со всеми выбранными добавками,
   * то есть показывает, сколько ещё можно взять сегодня.
   */
  function dayPlan(d) {
    var top = (State.s.settings.levels || []).reduce(function (m, l) {
      return Math.max(m, l.points || 0);
    }, 0);
    var extra = (d.addons || []).reduce(function (n, id) {
      var a = DOCTRINE.byId(State.s.settings.addons, id);
      return n + (a ? (a.points || 0) : 0);
    }, 0);
    return Math.max(1, top + extra);
  }

  function dayRing(t) {
    var d = State.day(t) || { level: 'none', addons: [] };
    var have = State.points(t);
    var plan = dayPlan(d);
    var pct = U.clamp(have / plan, 0, 1);
    var done = have > 0 && have >= plan;
    var justDone = done && !ringWasDone;
    ringWasDone = done;

    var stroke = d.level === 'min' ? 'var(--warn)'
      : (d.level === 'full' ? 'url(#ringgrad)' : 'var(--fire)');

    return '<div class="ring' + (done ? ' done' : '') + (justDone ? ' pulse' : '') +
      '" title="' + U.esc('очки дня: ' + have + ' из ' + plan) + '">' +
      '<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="ringgrad" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="var(--fire)"/>' +
      '<stop offset="100%" stop-color="var(--ok)"/></linearGradient></defs>' +
      '<circle class="ring-bg" cx="22" cy="22" r="' + RING_R + '"/>' +
      '<circle class="ring-arc" cx="22" cy="22" r="' + RING_R +
      '" stroke-dasharray="' + RING_C.toFixed(1) +
      '" stroke-dashoffset="' + (RING_C * (1 - pct)).toFixed(1) +
      '" style="stroke:' + stroke + '"/>' +
      '</svg>' +
      '<b class="mono">' + have + '</b>' +
      '</div>';
  }

  /* ---------- полоса недели и кружки дней ---------- */

  /**
   * Очки недели к следующему рангу: заливка идёт до потолка шкалы рангов,
   * засечки стоят на порогах — видно и текущий ранг, и всю лестницу.
   */
  function weekStrip(t) {
    var wp = State.weekPoints(t);
    var ranks = (State.s.settings.ranks || []).slice()
      .sort(function (a, b) { return a.min - b.min; });
    var top = ranks.length ? ranks[ranks.length - 1].min : 0;
    var pct = top ? U.clamp(Math.round(wp / top * 100), 0, 100) : 0;

    var rk = State.rank(t);
    var nx = State.nextRank(t);
    var text = wp + ' ' + U.plural(wp, 'очко', 'очка', 'очков') + ' · ' +
      (nx
        ? (rk ? rk.name : 'пока без ранга') + ' — до «' + nx.rank.name + '» ещё ' + nx.left
        : (rk ? rk.name : '—') + ' — потолок недели');

    var ticks = ranks.map(function (r) {
      if (!top) return '';
      return '<i class="' + (wp >= r.min ? 'on' : '') + '" style="left:' +
        U.clamp(r.min / top * 100, 0, 100) + '%" title="' + U.esc(r.name + ' · ' + r.min) + '"></i>';
    }).join('');

    return '<div class="week">' +
      '<div class="wbar"><span style="width:' + pct + '%"></span>' + ticks + '</div>' +
      '<div class="wtext">' + U.esc(text) + '</div>' +
      weekDays(t) +
      '</div>';
  }

  var WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

  /** Семь кружков пн–вс: индикатор, не навигация. */
  function weekDays(t) {
    var start = U.weekStart(t);
    var cells = '';
    for (var i = 0; i < 7; i++) {
      var date = U.addDays(start, i);
      var pts = State.points(date);
      var day = State.s.days[date];
      var lvl = (day && day.level) || 'none';
      var cls = [];
      if (pts > 0) cls.push('f-' + (lvl === 'none' ? 'min' : lvl));
      if (date === t) cls.push('now');
      else if (date > t) cls.push('future');
      else if (pts <= 0) cls.push('miss');
      cells += '<div class="wd ' + cls.join(' ') + '" title="' +
        U.esc(WD[i] + ' ' + U.fmtShort(date) + ' · ' + pts + ' ' +
          U.plural(pts, 'очко', 'очка', 'очков')) + '">' +
        '<i></i><span>' + WD[i] + '</span></div>';
    }
    return '<div class="wdays">' + cells + '</div>';
  }

  /** Компактные бейджи: горящие дела (раздел 6.3). */
  function badges() {
    return window.Radar ? Radar.todayBadge() : '';
  }

  /** Плашка ступени (раздел 7.2). Тап открывает детали цикла и историю. */
  function stepCard() {
    if (!State.isSchool()) {
      // летом слева режим, справа — когда просыпается шкала; сам пресет S2
      // виден строкой параметров на карточке урока и в Настройках
      return '<button class="p-step" data-step>' +
        '<span class="s">Лето</span>' +
        '<span class="s muted">шкала с ' + U.fmtDayMonth(State.AUTO_SCHOOL_DATE) + '</span>' +
        '</button>';
    }
    var s = State.s.step;
    var pos = STEPS.effectivePos(s, State.today());
    var dayN = StepsFlow.cycleDay(State.today());
    var pct = Math.round(dayN / STEPS.CYCLE_DAYS * 100);
    var paused = StepsFlow.isPaused();
    return '<button class="p-step" data-step>' +
      '<span class="s">Ступень ' + U.esc(STEPS.label(pos)) +
      (StepsFlow.onDeload() ? ' · разгрузка' : '') + '</span>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<span class="s muted">день ' + dayN + '/' + STEPS.CYCLE_DAYS +
      (paused ? ' ⏸' : '') + '</span>' +
      '</button>';
  }

  /**
   * Подтверждение выбора. Смена уровня немедленно перерисовывает экран,
   * то есть сам нажатый узел исчезает — поэтому класс анимации ставится
   * не на элемент, а помечается id и выдаётся уже при отрисовке нового чипа.
   * Анимация одноразовая, снимать её потом не нужно.
   */
  var FLASH_MS = 400;
  var flashed = { id: null, at: 0 };

  function flash(id) { flashed = { id: id, at: Date.now() }; }
  function flashing(id) { return flashed.id === id && Date.now() - flashed.at < FLASH_MS; }

  /* ---------- селектор уровня и добавки ---------- */

  /**
   * Уровень дня — сегмент-контрол, единственный переключатель экрана.
   * Повторный тап по активному сегменту ничего не снимает: «ничего»
   * здесь называется «Пусто» и выбирается явно.
   */
  function levelSeg(d) {
    var cur = d.level || 'none';
    return '<div class="seg lvlseg" role="group" aria-label="Уровень дня">' +
      State.s.settings.levels.map(function (l) {
        var on = cur === l.id;
        return '<button data-level="' + U.esc(l.id) + '" aria-pressed="' + on + '"' +
          (flashing(l.id) ? ' class="pop"' : '') + '>' + U.esc(l.name) + '</button>';
      }).join('') + '</div>';
  }

  /**
   * Добавки — мелкими чипами под планом: это не план, а то, что сверх него.
   * «Воскресный радар» сюда не попадает никогда — он пункт плана в воскресенье
   * и ставится сам, когда закрыт чек-лист недели.
   */
  /**
   * Короткие подписи для сетки: «Подготовка к тесту» в полширины на 320px
   * не помещается. Сокращаем только собственную формулировку доктрины —
   * если владелец переименовал добавку в Настройках, показываем его слова.
   */
  var ADDON_SHORT = { test: 'К тесту' };

  function addonLabel(a) {
    var def = DOCTRINE.byId(DOCTRINE.ADDONS, a.id);
    var short = ADDON_SHORT[a.id];
    return (short && def && def.name === a.name) ? short : a.name;
  }

  function addonChips(d) {
    var list = State.s.settings.addons.filter(function (a) { return a.id !== 'radar'; });
    if (!list.length) return '';
    return '<div class="addons">' +
      '<div class="alabel">Сверх плана</div>' +
      '<div class="agrid">' + list.map(function (a) {
        var on = (d.addons || []).indexOf(a.id) >= 0;
        return '<button class="chip addon' + (on ? ' on' : '') +
          (flashing(a.id) ? ' pop' : '') + '" data-addon="' + U.esc(a.id) +
          '" aria-pressed="' + on + '" aria-label="' + U.esc(a.name + ', +' + a.points) + '">' +
          '<span class="an">' + U.esc(addonLabel(a)) + '</span>' +
          '<b class="mono">+' + a.points + '</b></button>';
      }).join('') + '</div></div>';
  }

  /* ============================================================
     ПЛАН ДНЯ — главный блок экрана.
     Один вертикальный список: что именно сделать сегодня. Состав
     определяет уровень дня, раскрыт один пункт за раз.
     ============================================================ */

  var openItem = null;    // null — авто: раскрыт первый невыполненный

  function planBlock(t, d) {
    var items = planItems(t, d);
    var allDone = items.length > 0 && items.every(function (it) { return it.done; });
    var openId = resolveOpen(items);

    var body = items.length
      ? items.map(function (it) { return planRow(it, openId); }).join('')
      : emptyPlan(t);

    return '<div class="plan' + (allDone ? ' done' : '') + '">' +
      body + sundayEscape(t, d) + planStatus(t, d, allDone) + '</div>';
  }

  /** Раскрыт первый невыполненный пункт, пока владелец не решил иначе. */
  function resolveOpen(items) {
    if (openItem !== null) return openItem;
    for (var i = 0; i < items.length; i++) {
      if (!items[i].done && !items[i].locked) return items[i].id;
    }
    return '';
  }

  /** Пункт списка: кружок, строка, раскрывающееся тело. */
  function planRow(it, openId) {
    var open = !it.locked && it.id === openId && !!it.body;
    var cls = 'pitem' + (it.done ? ' done' : '') + (it.locked ? ' locked' : '') + (open ? ' open' : '');

    var dot = '<button class="pdot" data-tick="' + U.esc(it.tick || 'none') +
      '" aria-pressed="' + !!it.done + '" aria-label="' +
      U.esc((it.done ? 'Снять отметку: ' : 'Отметить: ') + it.title) + '">' +
      (it.done ? '✓' : '') + '</button>';

    var row = '<button class="prow" data-open="' + U.esc(it.id) +
      '" aria-expanded="' + open + '"' + (it.locked || !it.body ? ' disabled' : '') + '>' +
      '<span class="ptext"><span class="pt">' + U.esc(it.title) + '</span>' +
      (it.sub ? '<span class="ps">' + U.esc(it.sub) + '</span>' : '') + '</span>' +
      (it.locked || !it.body ? '' : '<span class="pchev">' + (open ? '▾' : '▸') + '</span>') +
      '</button>';

    return '<div class="' + cls + '">' + dot + row +
      (open ? '<div class="pbody">' + it.body + '</div>' : '') + '</div>';
  }

  /**
   * Состав плана по уровню дня.
   * Воскресенье добавляет пункт радара первым; урочные пункты в этот день
   * появляются только после «всё равно хочу урок» (раздел 7.8).
   */
  function planItems(t, d) {
    var out = [];
    var level = d.level || 'none';
    var sunday = U.weekday(t) === 7;
    var wantLesson = !sunday || !!(d.forceLesson || d.pick);

    if (sunday) out.push(radarItem(t, d));
    if (level === 'none') return out;

    if (level === 'min') {
      out.push(cardsItem(d), retellItem(d));
      return out;
    }

    out.push(minimalItem(d));
    if (!wantLesson) return out;

    var full = level === 'full';
    out.push(lessonItem(1, t, d, full));
    if (full) {
      out.push(breakItem(d));
      out.push(lessonItem(2, t, d, true));
    }
    return out;
  }

  /* ---------- пункты плана ---------- */

  function deckCounts() {
    return { words: State.wordBank().length, debts: State.openDebts().length };
  }

  function cardsSub() {
    var c = deckCounts();
    if (!c.words && !c.debts) return 'колода пуста — видео ~5 мин';
    return c.words + ' ' + U.plural(c.words, 'слово', 'слова', 'слов') +
      (c.debts ? ' + ' + c.debts + ' ' + U.plural(c.debts, 'долг', 'долга', 'долгов') : '');
  }

  function cardsItem(d) {
    var ms = d.minimalSteps || [];
    var c = deckCounts();
    return {
      id: 'cards', tick: 'm0', title: 'Карточки', sub: cardsSub(), done: !!ms[0],
      body: (c.words || c.debts)
        ? '<p class="pnote">Старые вперёд, тап переворачивает. Без оценок «знаю / не знаю» — ' +
        'минималке хватает просмотра.</p>' +
        '<button class="btn sec pact" data-cards>Открыть карточки</button>'
        : '<p class="pnote">Колода наполнится из «ИТОГА УРОКА»: слова и долги приходят оттуда. ' +
        'Пока её нет — одно видео или аудио на английском, минут на пять.</p>'
    };
  }

  function retellItem(d) {
    var ms = d.minimalSteps || [];
    return {
      id: 'retell', tick: 'm1', title: 'Пересказ 60 сек', sub: 'вслух, по видео или аудио',
      done: !!ms[1],
      body: '<p class="pnote">Итог урока не нужен — минималка закрывается уровнем дня.</p>' +
        '<button class="btn sec pact" data-minprompt>Промпт разминки</button>'
    };
  }

  /** На норме и полной оба шага минималки сворачиваются в один пункт. */
  function minimalItem(d) {
    var ms = d.minimalSteps || [];
    return {
      id: 'min', tick: 'min', title: 'Минималка', sub: '~10–15 мин · ' + cardsSub(),
      done: !!(ms[0] && ms[1]),
      body: minimalSteps(d)
    };
  }

  function minimalSteps(d) {
    var done = d.minimalSteps || [];
    var c = deckCounts();
    var steps = [
      {
        text: (c.words || c.debts)
          ? 'Карточки: повторить ' + cardsSub()
          : 'Колода пуста — вместо неё одно видео/аудио на английском ~5 мин',
        act: (c.words || c.debts)
          ? '<button class="btn sec pact" data-cards>Открыть карточки</button>' : ''
      },
      {
        text: 'Пересказ вслух: 60 секунд по видео/аудио',
        act: '<button class="btn sec pact" data-minprompt>Промпт разминки</button>'
      }
    ];
    return '<div class="msteps">' + steps.map(function (s, i) {
      return '<div class="mstep' + (done[i] ? ' on' : '') + '">' +
        '<label class="check"><input type="checkbox" data-mstep="' + i + '"' +
        (done[i] ? ' checked' : '') + '><span>' + U.esc(s.text) + '</span></label>' +
        (s.act ? '<div class="macts">' + s.act + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  function breakItem(d) {
    var lessons = (d.lessons || []).length;
    return {
      id: 'break', tick: 'break', title: 'Перерыв 5–10 мин без экрана',
      sub: lessons >= 1 && !d.breakDone ? 'сейчас — до второго урока' : 'между уроками',
      done: !!d.breakDone, hot: lessons >= 1 && !d.breakDone,
      body: '<p class="pnote">Тихий отдых после учёбы улучшает консолидацию памяти — ' +
        'лента её съедает. Встать, вода, окно, движение.</p>'
    };
  }

  /**
   * Урок. Галочка ставится только валидным «ИТОГОМ УРОКА»: тап по кружку
   * об этом и говорит. Второй урок ждёт, пока закрыт первый.
   */
  function lessonItem(n, t, d, full) {
    var lessons = d.lessons || [];
    var done = lessons.length >= n;
    var locked = n === 2 && lessons.length < 1;
    var head = full ? 'Урок ' + n : 'Урок';

    if (locked) {
      return {
        id: 'l2', tick: 'lesson', title: head + ': другая дорожка',
        sub: 'после урока 1', done: false, locked: true, body: ''
      };
    }

    var sel = Lesson.dayLesson(n, t);
    if (!sel) {
      return {
        id: 'l' + n, tick: 'lesson', title: head, sub: 'уроков в контенте не осталось',
        done: done,
        body: '<p class="pnote">Уроки текущих фаз закрыты. Следующий пакет контента добавит новые.</p>'
      };
    }

    var l = CONTENT.lesson(sel.lessonId);
    var b = (l && State.block(l.blockId)) || {};
    var code = l ? State.blockLabel(l.blockId) + '.' + State.lessonNum(sel.lessonId) : sel.lessonId;

    return {
      id: 'l' + n, tick: 'lesson',
      title: head + ': ' + code + ' „' + (l ? l.title : '') + '“',
      sub: (n === 2 && full ? 'другая дорожка · ' : '') + State.trackName(b.track),
      done: done,
      body: Lesson.card({
        lessonId: sel.lessonId, reason: sel.reason, today: t,
        minRow: false, freshBars: false, ofDay: false, bare: true
      })
    };
  }

  /** Воскресный радар — пункт плана, а не добавка в чипах. */
  function radarItem(t, d) {
    var done = window.Radar ? Radar.checklistDone(t) : false;
    var state = window.Radar ? Radar.checklistState(t) : [];
    var list = window.Radar ? Radar.CHECKLIST : [];
    var body = '<p class="pnote">Пять пунктов. Закрыл все — добавка +1 к дню ставится сама.</p>' +
      list.map(function (text, i) {
        return '<label class="check"><input type="checkbox" data-check="' + U.esc(i) + '"' +
          (state[i] ? ' checked' : '') + '><span>' + U.esc(text) + '</span></label>';
      }).join('');
    return {
      id: 'radar', tick: 'radar', title: 'Воскресный радар', sub: 'чек-лист недели',
      done: done, body: body
    };
  }

  /* ---------- пустой план, хвост и статус ---------- */

  function emptyPlan(t) {
    return '<div class="pempty">' +
      '<div class="pe-t">Выбери уровень — серия 🔥 ' + State.streak() + ' ждёт</div>' +
      '<button class="btn sec" data-level="min">Минималка ~10 мин</button>' +
      '</div>';
  }

  /** В воскресенье урок не назначается, но право на него остаётся (7.8). */
  function sundayEscape(t, d) {
    if (U.weekday(t) !== 7) return '';
    if (d.forceLesson || d.pick) return '';
    var level = d.level || 'none';
    if (level !== 'norm' && level !== 'full') return '';
    return '<div class="center"><button class="linkbtn" data-force-lesson>всё равно хочу урок</button></div>';
  }

  function planStatus(t, d, allDone) {
    if (allDone) {
      var p = State.points(t);
      return '<div class="pstatus done">День закрыт ✓ ' + p + ' ' +
        U.plural(p, 'очко', 'очка', 'очков') + '</div>';
    }
    return '<div class="pstatus">' + dayLine(t, d) + '</div>';
  }

  function setMinimalStep(i, on) {
    var d = State.day(State.today(), true);
    d.minimalSteps = d.minimalSteps || [false, false];
    d.minimalSteps[i] = !!on;
    State.touch();
  }

  /** Тап по кружку пункта. Уроки руками не отмечаются — только итогом. */
  function tick(id) {
    var t = State.today();
    var d = State.day(t, true);
    if (id === 'lesson') {
      UI.toast('Урок закрывается «ИТОГОМ УРОКА» — открой пункт и вставь его', '', 3200);
      return;
    }
    if (id === 'm0' || id === 'm1') { setMinimalStep(id === 'm0' ? 0 : 1, !(d.minimalSteps || [])[id === 'm0' ? 0 : 1]); return; }
    if (id === 'min') {
      var ms = d.minimalSteps || [];
      var on = !(ms[0] && ms[1]);
      setMinimalStep(0, on);
      setMinimalStep(1, on);
      return;
    }
    if (id === 'break') { d.breakDone = !d.breakDone; State.touch(); return; }
    if (id === 'radar' && window.Radar) { Radar.setChecklistAll(!Radar.checklistDone(t), t); }
  }

  /**
   * Что уровень значит на деле (раздел 7.1 ТЗ). Ключи — id уровней доктрины;
   * названия уровней владелец правит в Настройках, смысл — нет.
   */
  var LEVEL_HINT = {
    none: 'выбери уровень — серия ждёт',
    min: 'план: карточки + пересказ',
    norm: 'план: минималка + 1 урок',
    full: 'план: минималка + 2 урока'
  };

  function dayLine(t, d) {
    var levelId = d.level || 'none';
    var lvl = DOCTRINE.byId(State.s.settings.levels, levelId);
    var lvlPoints = lvl ? (lvl.points || 0) : 0;
    var total = State.points(t);

    var addons = (d.addons || []).map(function (id) {
      return DOCTRINE.byId(State.s.settings.addons, id);
    }).filter(Boolean);

    // день ещё не прошёл: красным ноль становится, только если пустым
    // было и вчера — иначе приложение ругается на ровном месте.
    // У новичка серии ещё не было: рвать нечего, пугать не за что.
    var hasHistory = Object.keys(State.s.days).some(function (k) { return State.points(k) > 0; });
    var empty = hasHistory ? State.emptyInRow() : 0;
    var risky = total === 0 && empty >= 1;

    var num = '<b class="mono ' + (risky ? 'r' : 'fire') + '">' + lvlPoints + '</b>';
    var head = 'сегодня: ' + num + ' ' + U.plural(lvlPoints, 'очко', 'очка', 'очков');

    var desc = LEVEL_HINT[levelId] || '';
    if (levelId === 'none') {
      if (addons.length) desc = 'уровень дня не выбран';
      else if (empty >= DOCTRINE.MAX_EMPTY_IN_ROW) desc = 'серия на грани — хватит минималки';
      else if (empty === 1) desc = 'вчера было пусто — минималка вернёт серию';
      else desc = 'выбери уровень — серия 🔥 ' + State.streak() + ' ждёт';
    }

    var tail = '';
    if (addons.length) {
      tail = ' · ' + addons.map(function (a) {
        return '+ ' + U.esc(a.name) + ' (+' + a.points + ')';
      }).join(' ') + ' = <b class="mono fire">' + total + '</b> ' +
        U.plural(total, 'очко', 'очка', 'очков');
    }

    return '<div class="dayline">' + head + ' · ' + U.esc(desc) + tail + '</div>';
  }
  /** Мини-полоски свежести живут под планом: это фон дня, а не его пункт. */
  function freshBars() {
    return window.Waterfall ? Waterfall.miniBars() : '';
  }

  function ifThenLine(t) {
    var r = State.ifThenOfDay(t);
    return r ? '<div class="ifthen">если ' + U.esc(r.text) + '</div>' : '';
  }

  /* ============================================================
     Запуск
     ============================================================ */

  function buildShell() {
    var nav = U.el('.tabbar');
    nav.innerHTML = TABS.map(function (t) {
      return '<button data-tab="' + t.id + '" role="tab" aria-selected="' + (t.id === active) + '">' +
        '<span class="ic">' + t.ic + '</span>' + t.name + '<span class="dot"></span></button>';
    }).join('');
    U.on(nav, 'click', 'button[data-tab]', function (e, b) { go(b.dataset.tab); });

    var host = U.el('#screens');
    host.innerHTML = TABS.map(function (t) {
      return '<section class="screen" data-screen="' + t.id + '"></section>';
    }).join('');
  }

  /** Перерисовка на границе суток 04:00 (раздел 7.8). */
  function scheduleDayRollover() {
    var ms = U.nextDayBoundary().getTime() - Date.now() + 2000;
    setTimeout(function () {
      if (window.StepsFlow) StepsFlow.check();
      render();
      scheduleDayRollover();
    }, Math.max(ms, 5000));
  }

  function boot() {
    State.load();
    State.applyAutoMode();
    State.syncContent();
    register('today', Today);
    buildShell();
    booted = true;
    go('today');
    if (window.StepsFlow) StepsFlow.check();
    if (window.Onboarding && Onboarding.needed()) Onboarding.start();
    State.subscribe(function () { render(); });
    window.addEventListener('resize', function () {
      var was = document.body.classList.contains('split');
      var now = isSplit();
      if (was !== now) go(active);
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) render();
    });
    scheduleDayRollover();
    registerSW();
    if (window.Sync && Sync.available()) Sync.init();
  }

  /* ---------- PWA ---------- */

  var swVersion = null;

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', function () {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            // тост уезжает через шесть секунд, а обновиться надо обязательно —
            // поэтому стойкая плашка с кнопкой
            UI.banner('sw-update', {
              kind: 'ok',
              text: 'Новая версия готова.',
              dismissible: false,
              action: {
                label: 'Перезагрузить',
                onClick: function () { location.reload(); }
              }
            });
          }
        });
      });
    }).catch(function (e) { console.warn('service worker не зарегистрировался:', e); });

    navigator.serviceWorker.addEventListener('message', function (e) {
      if (!e.data || !e.data.version) return;
      swVersion = e.data.version;
      // «Настройки» могли отрисоваться раньше ответа — обновим строку версии
      if (active === 'settings') renderScreen('settings');
    });

    // при первой установке controller ещё пуст: ждём готовности воркера,
    // иначе в Настройках навсегда остаётся «не активен»
    navigator.serviceWorker.ready.then(function (reg) {
      var sw = navigator.serviceWorker.controller || reg.active;
      if (sw) sw.postMessage('version');
    }).catch(function () { /* воркера нет — так и напишем */ });
  }

  function version() { return swVersion; }

  return {
    TABS: TABS, register: register, go: go, render: render, renderScreen: renderScreen,
    boot: boot, version: version,
    dayLine: dayLine, LEVEL_HINT: LEVEL_HINT,
    weekStrip: weekStrip, weekDays: weekDays, dayRing: dayRing, dayPlan: dayPlan,
    planBlock: planBlock, planItems: planItems, levelSeg: levelSeg, addonChips: addonChips,
    minimalSteps: minimalSteps, setMinimalStep: setMinimalStep, tick: tick,
    resetOpen: function () { openItem = null; },
    setOpen: function (id) { openItem = id; },
    get active() { return active; }
  };
})();

document.addEventListener('DOMContentLoaded', function () { App.boot(); });
