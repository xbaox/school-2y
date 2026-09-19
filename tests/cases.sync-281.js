/* 2.8.1, часть A: синк без потери данных.

   A1 — lastSyncedAt: updatedAt того состояния, с которым устройство последний
   раз сошлось с облаком. Живёт только в этом браузере, в облако не уходит,
   привязан к аккаунту; метка 2.8.0 («время последнего push») читается как он. */

(function () {
  'use strict';

  var SESSION_KEY = 'study-system-v2-session';
  var SYNCED_KEY = 'study-system-v2-synced';
  var PUSHED_KEY = 'study-system-v2-pushed';

  function session(uid) {
    window.__store[SESSION_KEY] = JSON.stringify({
      access_token: 'tok', refresh_token: 'ref', expires_at: Date.now() + 3600000,
      user_id: uid || 'u1', email: 'a@b.c'
    });
  }

  describe('2.8.1 A1: lastSyncedAt — локальная метка схождения с облаком', function () {
    Sync.signOut();
    delete window.__store[SYNCED_KEY];
    window.__store[PUSHED_KEY] = '2026-09-10T08:00:00.000Z';
    eq(Sync.lastSyncedAt(), '2026-09-10T08:00:00.000Z', 'метка 2.8.0 читается как lastSyncedAt');

    State.reset();
    State.s.meta.updatedAt = '2026-09-11T08:00:00.000Z';
    eq(Sync.hasUnpushed(), true, 'правка после метки — неотправленная');
    State.s.meta.updatedAt = '2026-09-10T08:00:00.000Z';
    eq(Sync.hasUnpushed(), false, 'состояние на метке — всё в облаке');

    ok(JSON.stringify(State.s).indexOf('lastSyncedAt') < 0 && !('synced' in State.s.meta),
      'в состоянии (а значит и в облаке) метки нет');
  });

  describe('2.8.1 A1: метка другого аккаунта не считается', function () {
    Sync.signOut();
    delete window.__store[PUSHED_KEY];
    window.__store[SYNCED_KEY] = JSON.stringify({ user: 'u1', at: '2026-09-12T08:00:00.000Z' });
    navigator.onLine = false;           // только метка: в облако не ходим
    session('u1');
    Sync.init();
    eq(Sync.lastSyncedAt(), '2026-09-12T08:00:00.000Z', 'свой аккаунт — метка на месте');
    Sync.signOut();
    window.__store[SYNCED_KEY] = JSON.stringify({ user: 'u1', at: '2026-09-12T08:00:00.000Z' });
    session('u2');
    Sync.init();
    eq(Sync.lastSyncedAt(), null, 'другой аккаунт — метки нет');
    Sync.signOut();
    delete window.__store[SYNCED_KEY];
    navigator.onLine = true;
  });
})();
