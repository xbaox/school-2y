/* Облачная синхронизация (раздел 3 ТЗ): очередь переживает закрытие вкладки,
   сравнение времён через Date.parse, вход по 401. Находки A-01, A-23, A-04. */

(function () {
  'use strict';

  var SESSION_KEY = 'study-system-v2-session';
  var PUSHED_KEY = 'study-system-v2-pushed';

  /** Чистый стенд: сессия есть, состояние пустое, вызовы fetch обнулены. */
  function stand(opts) {
    opts = opts || {};
    Sync.signOut();                       // гасим очередь предыдущего стенда
    window.__store[SESSION_KEY] = JSON.stringify({
      access_token: 'tok', refresh_token: 'ref',
      expires_at: Date.now() + 3600000, user_id: 'u1', email: 'a@b.c'
    });
    if (opts.pushedAt) window.__store[PUSHED_KEY] = opts.pushedAt;
    else delete window.__store[PUSHED_KEY];
    State.reset();
    State.s.meta.updatedAt = opts.localAt;
    State.s.onboarded = true;
    State.s.days['2026-08-20'] = { level: 'min', addons: [], lessons: [], points: 1 };
    window.__calls.length = 0;
    navigator.onLine = opts.onLine !== false;
  }

  function cloudRow(updatedAt, marker) {
    var s = State.blank();
    s.meta.updatedAt = updatedAt;
    s.onboarded = true;
    s.stats.bestStreak = marker;
    return [{ state: s, updated_at: updatedAt }];
  }

  describe('синк A-01: локальная правка переживает закрытие вкладки', function () {
    defer('init отдаёт непушенное', function () {
      // вчера отправили в облако, потом правили офлайн — метка push осталась старой
      stand({ pushedAt: '2026-08-20T10:00:00.000Z', localAt: '2026-08-21T09:00:00.000Z' });
      window.__fetch = function () { return Promise.resolve(window.__res(201, {})); };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        var posts = window.__calls.filter(function (c) {
          return c.method === 'POST' && c.url.indexOf('/rest/v1/app_state') >= 0;
        });
        var gets = window.__calls.filter(function (c) { return c.method === 'GET'; });
        eq(posts.length, 1, 'при старте ушёл push');
        eq(gets.length, 0, 'pull за ним не побежал');
        eq(State.s.meta.updatedAt, '2026-08-21T09:00:00.000Z', 'локальное состояние цело');
        eq(Sync.lastPushedAt(), '2026-08-21T09:00:00.000Z', 'метка push обновилась');
      });
    });
  });

  describe('синк A-01: чистое локальное забирает облако', function () {
    defer('init тянет pull', function () {
      // всё, что было локально, уже отправлено: метка push = updatedAt
      stand({ pushedAt: '2026-08-20T10:00:00.000Z', localAt: '2026-08-20T10:00:00.000Z' });
      window.__fetch = function (url, o) {
        if ((o && o.method) === 'POST') return Promise.resolve(window.__res(201, {}));
        return Promise.resolve(window.__res(200, cloudRow('2026-08-22T08:00:00.000Z', 42)));
      };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        var gets = window.__calls.filter(function (c) { return c.method === 'GET'; });
        ok(gets.length >= 1, 'при старте ушёл pull');
        eq(State.s.stats.bestStreak, 42, 'облачное состояние применено');
        eq(Sync.lastPushedAt(), '2026-08-22T08:00:00.000Z', 'метка push подтянулась к облачной');
      });
    });
  });

  describe('синк A-23: времена сравниваются через Date.parse', function () {
    defer('смещение зоны не путает порядок', function () {
      // «новее» по тексту, но раньше по времени: +03:00 против Z
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z' });
      window.__fetch = function (url, o) {
        if ((o && o.method) === 'POST') return Promise.resolve(window.__res(201, {}));
        return Promise.resolve(window.__res(200, cloudRow('2026-08-22T11:30:00.000+03:00', 7)));
      };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        eq(State.s.stats.bestStreak, 0, 'облако в 08:30 UTC старше локального 09:00 — не применили');
        var posts = window.__calls.filter(function (c) { return c.method === 'POST'; });
        eq(posts.length, 1, 'зато локальное новее — отдали его');
      });
    });
  });

  describe('синк: пустое облако получает локальное', function () {
    defer('push после пустого pull', function () {
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z' });
      window.__fetch = function (url, o) {
        if ((o && o.method) === 'POST') return Promise.resolve(window.__res(201, {}));
        return Promise.resolve(window.__res(200, []));
      };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        var posts = window.__calls.filter(function (c) { return c.method === 'POST'; });
        eq(posts.length, 1, 'в пустое облако ушло локальное состояние');
      });
    });
  });

})();
