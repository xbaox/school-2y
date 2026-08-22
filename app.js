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
      return topRow(t) + badges() + stepCard() + chips(d) + dayLine(t, d) + lessonCard() + ifThenLine(t);
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
      if (window.Lesson) Lesson.mount(host);
      if (window.Radar && Radar.mountToday) Radar.mountToday(host);
    }
  };

  function topRow(t) {
    var st = State.streak();
    var wp = State.weekPoints(t);
    var rk = State.rank(t);
    var nx = State.nextRank(t);
    var rankText = rk ? rk.name : (nx ? 'до «' + nx.rank.name + '» ' + nx.left : '—');
    return '<div class="p-top">' +
      '<span class="streak">🔥 ' + st + '</span>' +
      '<span class="rank">нед: ' + wp + ' pts · ' + U.esc(rankText) + '</span>' +
      '</div>';
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

  /** Карточка урока дня. Водопад и содержимое — этапы 2 и 4. */
  function lessonCard() {
    if (typeof Lesson !== 'undefined' && Lesson.card) return Lesson.card();
    return '<div class="lesson">' +
      '<span class="why w-plan">выбор: ждёт водопада</span>' +
      '<h4>Урок дня появится вместе с программой</h4>' +
      '<div class="meta">Контент Ф0 и выбор предмета подключаются на следующих этапах.</div>' +
      '</div>';
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
    get active() { return active; }
  };
})();

document.addEventListener('DOMContentLoaded', function () { App.boot(); });
