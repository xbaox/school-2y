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
  var active = 'today';
  var booted = false;

  function register(id, screen) {
    screens[id] = screen;
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

  function renderScreen(id) {
    var host = U.el('.screen[data-screen="' + id + '"]');
    if (!host) return;
    var sc = screens[id];
    if (!sc) { host.innerHTML = stub(id); return; }
    host.innerHTML = sc.render();
    if (sc.mount) sc.mount(host);
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
      return topRow(t) + stepCard() + chips(d) + dayLine(t, d) + lessonCard() + ifThenLine(t);
    },
    mount: function (host) {
      U.on(host, 'click', '[data-level]', function (e, el) {
        State.setLevel(el.dataset.level);
      });
      U.on(host, 'click', '[data-addon]', function (e, el) {
        State.toggleAddon(el.dataset.addon);
      });
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

  /** Плашка ступени. Полная механика — этап 4; здесь режим и позиция из state. */
  function stepCard() {
    if (!State.isSchool()) {
      return '<div class="p-step">' +
        '<span class="s">Лето</span>' +
        '<span class="s" style="color:var(--dim)">шкала с 08.09</span>' +
        '</div>';
    }
    var pos = State.s.step.position || 1;
    var name = (typeof Steps !== 'undefined' && Steps.label) ? Steps.label(pos) : ('S' + pos);
    var dayN = 1, pct = 0;
    if (State.s.step.cycleStart) {
      dayN = U.clamp(U.diffDays(State.s.step.cycleStart, State.today()) + 1, 1, 14);
      pct = Math.round(dayN / 14 * 100);
    }
    return '<div class="p-step">' +
      '<span class="s">Ступень ' + U.esc(name) + '</span>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<span class="s" style="color:var(--dim)">день ' + dayN + '/14</span>' +
      '</div>';
  }

  function chips(d) {
    var html = '<div class="chips">';
    State.s.settings.levels.forEach(function (l) {
      html += '<button class="chip' + (d.level === l.id ? ' on' : '') + '" data-level="' + U.esc(l.id) + '">' +
        U.esc(l.name) + '</button>';
    });
    State.s.settings.addons.forEach(function (a) {
      var on = (d.addons || []).indexOf(a.id) >= 0;
      html += '<button class="chip addon' + (on ? ' on' : '') + '" data-addon="' + U.esc(a.id) + '">+ ' +
        U.esc(a.name) + '</button>';
    });
    return html + '</div>';
  }

  function dayLine(t, d) {
    var p = State.points(t);
    var lvl = DOCTRINE.byId(State.s.settings.levels, d.level || 'none');
    var parts = [];
    parts.push('сегодня: ' + p + ' ' + U.plural(p, 'очко', 'очка', 'очков'));
    if (lvl && lvl.id !== 'none') parts.push(lvl.name.toLowerCase());
    var warn = '';
    var hasHistory = Object.keys(State.s.days).some(function (k) { return State.points(k) > 0; });
    if (p === 0 && hasHistory) {
      var er = State.emptyInRow();
      if (er >= DOCTRINE.MAX_EMPTY_IN_ROW) warn = ' <span class="r">· серия на грани, хватит минималки</span>';
      else if (er === 1) warn = ' <span class="y">· вчера было пусто</span>';
    }
    return '<div class="small muted" style="margin:-4px 0 12px">' +
      U.esc(parts.join(' · ')) + warn + '</div>';
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
    setTimeout(function () { render(); scheduleDayRollover(); }, Math.max(ms, 5000));
  }

  function boot() {
    State.load();
    State.applyAutoMode();
    State.syncContent();
    register('today', Today);
    buildShell();
    booted = true;
    go('today');
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
  }

  return {
    TABS: TABS, register: register, go: go, render: render, renderScreen: renderScreen,
    boot: boot,
    get active() { return active; }
  };
})();

document.addEventListener('DOMContentLoaded', function () { App.boot(); });
