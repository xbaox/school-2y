/* 2.7.8, Б8: автоотметка «Карточки» на отрисовке «Сегодня» ждёт ответа облака.

   Отметка двигает meta.updatedAt, а синк решает «кто новее» по нему. Старт
   приложения рисует «Сегодня» раньше Sync.init, возврат на экран — раньше pull.
   Автоматическая правка на устаревшем устройстве сделала бы его «новее» облака
   и затёрла бы чужие изменения. Поэтому, пока вошедший синк в этом заходе не
   получил ответа, отрисовка шаг не ставит (колода — действие человека — ставит). */

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

  describe('2.7.8 Б8: без ответа облака отрисовка шаг не ставит', function () {
    var real = Sync.settled;
    try {
      var t = ready();
      Sync.settled = function () { return false; };
      eq(quiet(function () { return App.autoCards(t); }), false, 'синк не ответил — не ставит');
      eq([ms(t), State.s.meta.updatedAt], [[false, false], STAMP], 'ни отметки, ни сдвига updatedAt');
      eq(State.cardsStep(t).ok, true, 'при том что шаг набран');

      Sync.settled = function () { return true; };
      eq(quiet(function () { return App.autoCards(t); }), true, 'ответил — ставит');
      eq(ms(t), [true, false], 'отметка есть');
      ok(State.s.meta.updatedAt !== STAMP, 'правка ушла в updatedAt — её и отправит синк');
    } finally { Sync.settled = real; }
  });

  describe('2.7.8 Б8: колода — действие человека — ставит шаг и без ответа облака', function () {
    var real = Sync.settled;
    try {
      var t = ready();
      State.s.cards.seen = State.s.cards.seen.slice(0, 9);
      State.s.cards.viewedToday = 9;
      Sync.settled = function () { return false; };
      var ok1 = quiet(function () { return State.autoCardsStep(t); });
      eq(ok1, false, 'девять — не набрано');
      State.s.cards.seen.push('w:sync9');
      State.s.cards.viewedToday = 10;
      eq(quiet(function () { return State.autoCardsStep(t); }), true, 'десятая в колоде — шаг ставится');
    } finally { Sync.settled = real; }
  });

  describe('2.7.8 Б8: без входа ждать нечего', function () {
    Sync.signOut();
    eq(Sync.settled(), true, 'нет входа — автоотметка разрешена');
  });

  describe('2.7.8 Б8: вход — до ответа pull ждём, после ответа «Сегодня» перерисован и шаг поставлен', function () {
    defer('pull придержан, потом отпущен', function () {
      Sync.signOut();
      delete window.__store[SESSION_KEY];
      delete window.__store[PUSHED_KEY];
      navigator.onLine = true;
      var t = ready();
      var release = null, renders = 0;
      var realRender = App.render;
      App.render = function () { renders++; quiet(function () { App.autoCards(t); }); };
      window.__calls.length = 0;
      window.__fetch = function (url, o) {
        if (url.indexOf('/auth/v1/token') >= 0) {
          return Promise.resolve(window.__res(200, {
            access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user: { id: 'u1', email: 'a@b.c' }
          }));
        }
        if ((o && o.method) === 'POST') return Promise.resolve(window.__res(201, {}));
        // облако старше локального: pull ничего не применит
        var cloud = State.blank();
        cloud.meta.updatedAt = '1999-01-01T00:00:00.000Z';
        return new Promise(function (r) { release = function () { r(window.__res(200, [{ state: cloud, updated_at: cloud.meta.updatedAt }])); }; });
      };
      var done = Sync.signIn('a@b.c', 'pw');
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        ok(!!release, 'pull ушёл и ждёт ответа');
        eq(Sync.settled(), false, 'до ответа — не устоялось');
        eq(quiet(function () { return App.autoCards(t); }), false, 'отрисовка до ответа шаг не ставит');
        eq(ms(t), [false, false], 'отметки нет');
        release();
        return done;
      }).then(function () {
        return new Promise(function (r) { setTimeout(r, 20); });
      }).then(function () {
        eq(Sync.settled(), true, 'облако ответило');
        ok(renders >= 1, 'ответ без применения сам перерисовал «Сегодня»');
        eq(ms(t), [true, false], 'и шаг поставлен после ответа');
      }).then(function () {
        App.render = realRender;
        window.__fetch = null;
        Sync.signOut();
      }, function (e) {
        App.render = realRender;
        window.__fetch = null;
        Sync.signOut();
        throw e;
      });
    });
  });
})();
