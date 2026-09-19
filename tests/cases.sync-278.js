/* 2.7.8, Б8: автоотметка «Карточки» на отрисовке «Сегодня» и синк.

   Синк решает «кто новее» по meta.updatedAt, а старт приложения рисует
   «Сегодня» раньше Sync.init. Отметка отрисовки выводится из состояния дня и
   updatedAt не двигает (как подъём рекорда, 2.7.7 Э4): иначе устаревшее
   устройство стало бы «новее» облака и затёрло бы чужие изменения. Отметка
   колоды — действие человека — двигает его, как любая правка. */

(function () {
  'use strict';

  var SESSION_KEY = 'study-system-v2-session';
  var PUSHED_KEY = 'study-system-v2-pushed';
  var STAMP = '2000-01-01T00:00:00.000Z';

  function words(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push({ en: 'sync' + i, ru: 'с' + i });
    return out;
  }

  /** Колода из 12 слов, сегодня просмотрено 10, план «минималка» — шаг набран, не отмечен. */
  function ready() {
    var t = State.today();
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.onboarded = true;
    State.applySummary('B7.1', { score: 8, level: 'L2', topics: 'т', words: words(12), debts: [], cleared: [],
      warmup: [], checklist: null, stretch: null, writing: '', raw: '' }, { date: U.addDays(t, -3) });
    State.s.cards.lastDay = t;
    State.s.cards.seen = [];
    for (var i = 0; i < 10; i++) State.s.cards.seen.push('w:sync' + i);
    State.s.cards.viewedToday = 10;
    State.day(t, true).plan = 'min';
    State.s.meta.updatedAt = STAMP;
    return t;
  }

  function ms(t) { return ((State.day(t) || {}).minimalSteps || [false, false]).slice(); }

  function quiet(fn) {
    var real = UI.toast;
    UI.toast = function () {};
    try { return fn(); } finally { UI.toast = real; }
  }

  describe('2.7.8 Б8: отметка отрисовки — без сдвига updatedAt и без отправки', function () {
    var t = ready();
    var pushes = 0, real = Sync.onLocalChange;
    Sync.onLocalChange = function () { pushes++; };
    try {
      eq(quiet(function () { return App.autoCards(t); }), true, 'шаг поставлен');
      eq([ms(t), State.s.meta.updatedAt, pushes], [[true, false], STAMP, 0], 'updatedAt на месте, синк не дёрнут');
    } finally { Sync.onLocalChange = real; }
  });

  describe('2.7.8 Б8: отметка колоды — действие человека — двигает updatedAt', function () {
    var t = ready();
    var pushes = 0, real = Sync.onLocalChange;
    Sync.onLocalChange = function () { pushes++; };
    try {
      eq(quiet(function () { return State.autoCardsStep(t); }), true, 'шаг поставлен колодой');
      ok(State.s.meta.updatedAt !== STAMP && pushes === 1, 'updatedAt сдвинут, синк получил правку');
    } finally { Sync.onLocalChange = real; }
  });

  describe('2.7.8 Б8: устройство со старыми данными — отрисовка до Sync.init не мешает забрать облако', function () {
    defer('старт с сохранённым входом, облако новее', function () {
      Sync.signOut();
      navigator.onLine = true;
      var t = ready();
      window.__store[SESSION_KEY] = JSON.stringify({
        access_token: 'tok', refresh_token: 'ref', expires_at: Date.now() + 3600000, user_id: 'u1', email: 'a@b.c'
      });
      window.__store[PUSHED_KEY] = STAMP;              // всё своё уже в облаке
      var realRender = App.render;
      App.render = function () {};
      window.__calls.length = 0;
      window.__fetch = function (url, o) {
        if ((o && o.method) === 'POST') return Promise.resolve(window.__res(201, {}));
        var cloud = State.blank();
        cloud.meta.updatedAt = '2001-01-01T00:00:00.000Z';   // другое устройство писало позже
        cloud.onboarded = true;
        cloud.stats.bestStreak = 77;
        return Promise.resolve(window.__res(200, [{ state: cloud, updated_at: cloud.meta.updatedAt }]));
      };
      eq(quiet(function () { return App.autoCards(t); }), true, 'первая отрисовка ставит шаг');
      eq([State.s.meta.updatedAt, Sync.hasUnpushed()], [STAMP, false], 'но отдавать нечего');
      Sync.init();
      return new Promise(function (r) { setTimeout(r, 30); }).then(function () {
        eq(window.__calls.map(function (c) { return c.method; })[0], 'GET', 'init тянет облако, а не пишет в него');
        eq(State.s.stats.bestStreak, 77, 'облачное состояние применено — чужие правки целы');
        return new Promise(function (r) { setTimeout(r, 30); });
      }).then(function () {
        App.render = realRender; window.__fetch = null; Sync.signOut();
      }, function (e) {
        App.render = realRender; window.__fetch = null; Sync.signOut(); throw e;
      });
    });
  });
})();
