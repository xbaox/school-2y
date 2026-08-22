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
        chips(d) + dayLine(t, d) + daySlot(t, d) + ifThenLine(t);
    },
    mount: function (host) {
      U.on(host, 'click', '[data-level]', function (e, el) {
        flash(el.dataset.level);
        State.setLevel(el.dataset.level);
      });
      U.on(host, 'click', '[data-addon]', function (e, el) {
        flash(el.dataset.addon);
        State.toggleAddon(el.dataset.addon);
      });
      U.on(host, 'click', '[data-step]', function () { StepsFlow.openDetails(); });

      // отметки минималки и перерыва: память дня, очков не дают
      U.on(host, 'change', '[data-mstep]', function (e, el) {
        setMinimalStep(+el.dataset.mstep, el.checked);
      });
      U.on(host, 'change', '[data-stage-min]', function (e, el) {
        setMinimalStep(0, el.checked);
        setMinimalStep(1, el.checked);
      });
      U.on(host, 'change', '[data-stage-break]', function (e, el) {
        State.day(State.today(), true).breakDone = el.checked;
        State.touch();
      });
      U.on(host, 'click', '[data-stage-open]', function () {
        var d = State.day(State.today()) || {};
        var ms = d.minimalSteps || [];
        minOpen = !(minOpen === null ? !(ms[0] && ms[1]) : minOpen);
        renderScreen('today');
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

  function chips(d) {
    var html = '<div class="chips">';
    State.s.settings.levels.forEach(function (l) {
      var on = d.level === l.id;
      html += '<button class="chip' + (on ? ' on' : '') + (flashing(l.id) ? ' pop' : '') +
        '" data-level="' + U.esc(l.id) + '" aria-pressed="' + on + '">' + U.esc(l.name) + '</button>';
    });
    State.s.settings.addons.forEach(function (a) {
      var on = (d.addons || []).indexOf(a.id) >= 0;
      html += '<button class="chip addon' + (on ? ' on' : '') + (flashing(a.id) ? ' pop' : '') +
        '" data-addon="' + U.esc(a.id) + '" aria-pressed="' + on + '">+ ' + U.esc(a.name) + '</button>';
    });
    return html + '</div>';
  }

  /**
   * Что уровень значит на деле (раздел 7.1 ТЗ). Ключи — id уровней доктрины;
   * названия уровней владелец правит в Настройках, смысл — нет.
   */
  var LEVEL_HINT = {
    none: 'пустой день рвёт серию',
    min: 'база дня: карточки + аудио',
    norm: 'минималка + 1 урок',
    full: 'минималка + 2 урока (второй — другая дорожка)'
  };

  function dayLine(t, d) {
    var levelId = d.level || 'none';
    var lvl = DOCTRINE.byId(State.s.settings.levels, levelId);
    var lvlPoints = lvl ? (lvl.points || 0) : 0;
    var total = State.points(t);

    var addons = (d.addons || []).map(function (id) {
      return DOCTRINE.byId(State.s.settings.addons, id);
    }).filter(Boolean);

    // «грозит стать пустым» — только у того, у кого серия есть: у новичка
    // первый день без очков ничего не рвёт
    var hasHistory = Object.keys(State.s.days).some(function (k) { return State.points(k) > 0; });
    var risky = total === 0 && hasHistory;

    var num = '<b class="mono ' + (risky ? 'r' : 'fire') + '">' + lvlPoints + '</b>';
    var head = 'сегодня: ' + num + ' ' + U.plural(lvlPoints, 'очко', 'очка', 'очков');

    var desc = LEVEL_HINT[levelId] || '';
    if (levelId === 'none' && addons.length) desc = 'уровень дня не выбран';
    else if (levelId === 'none' && risky && State.emptyInRow() >= DOCTRINE.MAX_EMPTY_IN_ROW) {
      desc = 'серия на грани — хватит минималки';
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

  /* ============================================================
     Что показывать под чипами: экран перестраивается под уровень дня.
     Смысл — показать то, что делают на этом уровне, и ничего сверх:
     карточка урока на минималке делала минималку неотличимой от нормы.
     ============================================================ */

  function daySlot(t, d) {
    if (typeof Lesson === 'undefined' || !Lesson.card) {
      return '<div class="lesson">' +
        '<span class="why w-plan">выбор: ждёт водопада</span>' +
        '<h4>Урок дня появится вместе с программой</h4></div>';
    }

    var pending = Lesson.pendingCard(t);      // незакрытый урок прошлых дней — на любом уровне
    var sel = Lesson.current(t);

    // радар-день: урока нет ни на одном уровне, прятать нечего
    if (sel && sel.sunday) return pending + Lesson.card({ today: t });

    var level = d.level || 'none';
    if (level === 'none') return pending + emptyDayCard(t);
    if (level === 'min') return pending + minimalCard(t, d);
    return pending + planHeader(t, d) + Lesson.card({ minRow: false, today: t });
  }

  /** Пусто: ничего оранжевого — один тихий шаг обратно в серию. */
  function emptyDayCard(t) {
    var st = State.streak();
    return '<div class="card quiet">' +
      '<div class="qt">Сегодня пусто</div>' +
      '<div class="qs">Минималка займёт ~10 минут и удержит серию 🔥 ' + st + '</div>' +
      '<button class="btn sec" data-level="min">Перейти на минималку</button>' +
      '</div>';
  }

  /** Минималка: два конкретных шага и ни одной кнопки урока. */
  function minimalCard(t, d) {
    return '<div class="card mincard">' +
      '<div class="mhead"><b>Минималка</b><span class="mono">~10–15 мин</span></div>' +
      minimalSteps(d) +
      '<div class="mnote">Итог урока не нужен — минималка закрывается чипом.</div>' +
      '</div>';
  }

  /**
   * Два шага минималки. Отметки живут в days[date].minimalSteps и на очки
   * не влияют: очки за минималку уже дал чип уровня (доктрина, правило 1).
   */
  function minimalSteps(d) {
    var done = d.minimalSteps || [];
    var words = State.wordBank().length;
    var debts = State.openDebts().length;

    var first = (words || debts)
      ? {
        text: 'Карточки: повторить ' + words + ' ' + U.plural(words, 'слово', 'слова', 'слов') +
          (debts ? ' + ' + debts + ' ' + U.plural(debts, 'долг', 'долга', 'долгов') : ''),
        act: '<button class="btn sec mact" data-cards>Открыть карточки</button>'
      }
      : {
        text: 'Колода пока пуста — она наполнится из итогов уроков. ' +
          'Вместо неё: одно видео/аудио на английском ~5 мин',
        act: ''
      };

    var second = {
      text: 'Пересказ вслух: 60 секунд по видео/аудио',
      act: '<button class="btn sec mact" data-minprompt>Промпт разминки</button>'
    };

    return '<div class="msteps">' + [first, second].map(function (s, i) {
      return '<div class="mstep' + (done[i] ? ' on' : '') + '">' +
        '<label class="check"><input type="checkbox" data-mstep="' + i + '"' +
        (done[i] ? ' checked' : '') + '><span>' + U.esc(s.text) + '</span></label>' +
        (s.act ? '<div class="macts">' + s.act + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /**
   * Шапка плана дня для нормы и полной: цепочка этапов и отметки по ним.
   * Уроки отмечаются сами — закрытием итога; минималка и перерыв руками.
   */
  var minOpen = null;      // null — решает состояние: не сделана → раскрыта

  function planHeader(t, d) {
    var full = d.level === 'full';
    var lessons = (d.lessons || []).length;
    var ms = d.minimalSteps || [];
    var minDone = !!(ms[0] && ms[1]);
    var open = minOpen === null ? !minDone : minOpen;

    var chain = full
      ? 'План: минималка → урок 1 → перерыв 5–10 мин без экрана → урок 2 (другая дорожка)'
      : 'План: минималка → урок';

    var rows = '<div class="pstage' + (minDone ? ' on' : '') + '">' +
      '<label class="check"><input type="checkbox" data-stage-min' + (minDone ? ' checked' : '') +
      '><span>минималка</span></label>' +
      '<button class="pchev" data-stage-open aria-expanded="' + open +
      '" aria-label="Показать шаги минималки">' + (open ? '▾' : '▸') + '</button></div>' +
      (open ? '<div class="psub">' + minimalSteps(d) + '</div>' : '');

    if (full) {
      rows += stageRow('урок 1', lessons >= 1);
      var hot = lessons >= 1 && !d.breakDone;
      rows += '<div class="pstage' + (d.breakDone ? ' on' : '') + (hot ? ' hot' : '') + '">' +
        '<label class="check"><input type="checkbox" data-stage-break' +
        (d.breakDone ? ' checked' : '') + '><span>перерыв 5–10 мин без экрана</span></label></div>';
      rows += stageRow('урок 2 (другая дорожка)', lessons >= 2);
    } else {
      rows += stageRow('урок', lessons >= 1);
    }

    return '<div class="plan"><div class="plan-t mono">' + U.esc(chain) + '</div>' + rows + '</div>';
  }

  function setMinimalStep(i, on) {
    var d = State.day(State.today(), true);
    d.minimalSteps = d.minimalSteps || [false, false];
    d.minimalSteps[i] = !!on;
    State.touch();
  }

  /** Этап-урок отмечается только итогом — руками его не поставить. */
  function stageRow(text, done) {
    return '<div class="pstage auto' + (done ? ' on' : '') + '">' +
      '<label class="check"><input type="checkbox" disabled' + (done ? ' checked' : '') +
      '><span>' + U.esc(text) + '</span></label></div>';
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
    daySlot: daySlot, minimalSteps: minimalSteps, planHeader: planHeader,
    setMinimalStep: setMinimalStep,
    get active() { return active; }
  };
})();

document.addEventListener('DOMContentLoaded', function () { App.boot(); });
