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

/* ---------- 2.8.1 A2–A5: облако-муляж и два устройства ---------- */

/**
 * Облако-муляж ведёт себя как PostgREST: GET отдаёт строку, POST без слияния
 * на занятую строку — 409, PATCH меняет строку только при совпадении
 * updated_at из фильтра (иначе 0 строк). holdNext() придерживает следующий
 * ответ данных, пока тест его не отпустит (release), — так проверяется гонка.
 */
window.__cloud281 = (function () {
  'use strict';
  var C = { row: null, writes: 0, gets: 0, held: [], holdAt: {}, n: 0, token: 'ok' };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function res(st, j) { return Promise.resolve(window.__res(st, j)); }

  C.reset = function (row) {
    C.row = row ? clone(row) : null;
    C.writes = 0; C.gets = 0; C.held = []; C.holdAt = {}; C.n = 0; C.token = 'ok';
  };

  C.put = function (st) { C.row = { state: clone(st), updated_at: st.meta.updatedAt }; };

  function answer(url, o) {
    var m = (o && o.method) || 'GET';
    if (url.indexOf('/auth/v1/token') >= 0) {
      if (C.token === 'dead') return res(400, { error: 'invalid_grant' });
      return res(200, {
        access_token: 'tok-' + (++C.n), refresh_token: 'ref', expires_in: 3600,
        user: { id: 'u1', email: 'a@b.c' }
      });
    }
    if (url.indexOf('/auth/v1/logout') >= 0) return res(204, {});
    if (C.token === 'expired' || C.token === 'dead') return res(401, { message: 'JWT expired' });
    if (m === 'GET') {
      C.gets++;
      return res(200, C.row ? [clone(C.row)] : []);
    }
    var body = JSON.parse(o.body);
    if (m === 'POST') {
      if (C.row) return res(409, { code: '23505' });
      C.row = { state: body[0].state, updated_at: body[0].updated_at };
      C.writes++;
      return res(201, {});
    }
    if (m === 'PATCH') {
      var f = /[?&]updated_at=eq\.([^&]*)/.exec(url);
      var want = f ? decodeURIComponent(f[1]) : null;
      if (!C.row || C.row.updated_at !== want) return res(200, []);
      C.row = { state: body.state, updated_at: body.updated_at };
      C.writes++;
      return res(200, [{ updated_at: body.updated_at }]);
    }
    return res(405, {});
  }

  /** Номер запроса к данным (не к входу) — для holdNext. */
  var dataN = 0;
  C.fetch = function (url, o) {
    if (url.indexOf('/auth/v1/') < 0) {
      dataN++;
      if (C.holdAt[dataN]) {
        return new Promise(function (resolve) {
          C.held.push(function () { resolve(answer(url, o)); });
        });
      }
    }
    return answer(url, o);
  };
  C.dataCount = function () { return dataN; };
  C.holdNext = function (k) { C.holdAt[dataN + (k || 1)] = true; };
  C.release = function () { var h = C.held.shift(); if (h) h(); };

  return C;
})();

(function () {
  'use strict';

  var CL = window.__cloud281;
  var STORE = window.__store;
  var SNAP_KEY = 'study-system-v2-snapshots';
  var CONFLICT_KEY = 'study-system-v2-conflict';

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms || 10); }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /** Устройство — своё localStorage целиком (состояние, сессия, метки, снимки). */
  var cur = null;
  function device(name) { return { name: name, store: {} }; }

  function saveCur() {
    if (!cur) return;
    State.save();
    cur.store = {};
    Object.keys(STORE).forEach(function (k) { cur.store[k] = STORE[k]; });
  }

  /** Переход на другое устройство: его хранилище, State.load, Sync.init. */
  function use(dev, noInit) {
    saveCur();
    Sync.signOut();
    Object.keys(STORE).forEach(function (k) { delete STORE[k]; });
    Object.keys(dev.store).forEach(function (k) { STORE[k] = dev.store[k]; });
    cur = dev;
    State.load();
    if (!noInit) Sync.init();
  }

  function session() {
    return JSON.stringify({
      access_token: 'tok', refresh_token: 'ref', expires_at: Date.now() + 3600000,
      user_id: 'u1', email: 'a@b.c'
    });
  }

  /** Правка человека в заданное время: updatedAt ставится явно, чтобы порядок не зависел от мс. */
  function edit(at, fn) {
    fn(State.s);
    State.touch(true);
    State.s.meta.updatedAt = at;
    State.save();
  }

  var realRender = null, realToast = null;
  function begin() {
    realRender = App.render; App.render = function () {};
    realToast = UI.toast; UI.toast = function () {};
    navigator.onLine = true;
    window.__fetch = CL.fetch;
    window.__calls.length = 0;
    cur = null;
  }
  function end() {
    Sync.signOut();
    App.render = realRender; UI.toast = realToast;
    window.__fetch = null;
    navigator.onLine = true;
    Object.keys(STORE).forEach(function (k) { delete STORE[k]; });
    State.reset();
  }
  function guard(fn) {
    return function () {
      begin();
      return Promise.resolve().then(fn).then(end, function (e) { end(); throw e; });
    };
  }

  /** Стартовое облако: онбординг пройден, рекорд — метка содержимого. */
  function base(at, best) {
    var s = State.blank();
    s.onboarded = true;
    s.meta.updatedAt = at;
    s.stats.bestStreak = best;
    return s;
  }

  /** Устройство, которое уже сошлось с облаком на состоянии st. */
  function synced(name, st) {
    var d = device(name);
    d.store['study-system-v2'] = JSON.stringify(st);
    d.store['study-system-v2-session'] = session();
    d.store['study-system-v2-synced'] = JSON.stringify({ user: 'u1', at: st.meta.updatedAt });
    return d;
  }

  function writesSince(n) {
    return window.__calls.slice(n).filter(function (c) {
      return (c.method === 'POST' || c.method === 'PATCH') && c.url.indexOf('/rest/v1/app_state') >= 0;
    });
  }

  function banner() { return App.cloudAlert().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

  window.__sync281 = {
    CL: CL, wait: wait, clone: clone, device: device, use: use, edit: edit, guard: guard,
    base: base, synced: synced, writesSince: writesSince, banner: banner, saveCur: saveCur,
    session: session, cur: function () { return cur; }
  };

  describe('2.8.1 A2: любой заход начинается с чтения облака', function () {
    defer('init с неотправленной правкой — сначала GET, потом условная запись', guard(function () {
      var st = base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      use(synced('A', st), true);
      edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 6; });
      window.__calls.length = 0;
      Sync.init();
      return Sync.whenIdle().then(function () {
        var data = window.__calls.filter(function (c) { return c.url.indexOf('/rest/v1/') >= 0; });
        eq(data.map(function (c) { return c.method; }), ['GET', 'PATCH'], 'чтение, потом запись');
        ok(/updated_at=eq\./.test(data[1].url), 'запись условная — по прочитанному updated_at');
        eq(CL.row.state.stats.bestStreak, 6, 'правка в облаке');
        eq(Sync.lastSyncedAt(), '2026-09-10T09:00:00.000Z', 'lastSyncedAt = отправленное состояние');
      });
    }));

    defer('«Отправить сейчас» и flush (сеть вернулась, вкладка) — тоже с чтения', guard(function () {
      var st = base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      use(synced('A', st));
      return Sync.sync().then(function () {
        window.__calls.length = 0;
        edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 7; });
        return Sync.push();
      }).then(function () {
        eq(window.__calls[0].method, 'GET', '«Отправить сейчас» начинается с чтения');
        window.__calls.length = 0;
        edit('2026-09-10T10:00:00.000Z', function (s) { s.stats.bestStreak = 8; });
        Sync.flush();
        return Sync.sync();
      }).then(function () {
        eq(window.__calls[0].method, 'GET', 'flush — тоже');
        eq(CL.row.state.stats.bestStreak, 8, 'всё уехало');
      });
    }));
  });

  describe('2.8.1 A2: одновременная правка — снимок, плашка, ничего не потеряно', function () {
    defer('облако новее — рабочим облако, своё в снимке', guard(function () {
      var st = base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      var a = synced('A', st), b = synced('B', st);

      // A правит офлайн, B правит позже и успевает в облако
      use(a, true);
      edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 11; });
      use(b);
      return Sync.sync().then(function () {
        edit('2026-09-10T09:30:00.000Z', function (s) { s.stats.bestStreak = 22; });
        return Sync.sync();
      }).then(function () {
        eq(CL.row.state.stats.bestStreak, 22, 'B в облаке');
        use(a);
        return Sync.sync();
      }).then(function () {
        eq(State.s.stats.bestStreak, 22, 'рабочим стало состояние с большим updatedAt (B)');
        var sn = Sync.snapshots();
        eq(sn.length, 1, 'один снимок');
        eq([sn[0].side, sn[0].updatedAt, sn[0].state.stats.bestStreak],
          ['local', '2026-09-10T09:00:00.000Z', 11], 'в снимке — правка A целиком');
        ok(!!sn[0].savedAt && !!sn[0].device, 'у снимка дата и устройство');
        eq(CL.row.state.stats.bestStreak, 22, 'облако не тронуто');
        eq(Sync.state().conflict, true, 'признак конфликта');
        ok(banner().indexOf('Синк: два устройства правили одно и то же — копия сохранена, Настройки → Конфликты синка') >= 0,
          'плашка на «Сегодня»');
      });
    }));

    defer('своё новее — рабочим своё, облако в снимке, своё уехало', guard(function () {
      var st = base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      var a = synced('A', st), b = synced('B', st);
      use(b);
      return Sync.sync().then(function () {
        edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 22; });
        return Sync.sync();
      }).then(function () {
        use(a, true);
        edit('2026-09-10T09:30:00.000Z', function (s) { s.stats.bestStreak = 11; });
        Sync.init();
        return Sync.sync();
      }).then(function () {
        eq(State.s.stats.bestStreak, 11, 'рабочим осталось своё — оно новее');
        eq(CL.row.state.stats.bestStreak, 11, 'и уехало в облако');
        var sn = Sync.snapshots();
        eq([sn.length, sn[0].side, sn[0].state.stats.bestStreak], [1, 'cloud', 22], 'правка B — в снимке');
        ok(/^устройство · /.test(sn[0].device), 'снимок облака называет устройство, которое его записало');
        ok(banner().indexOf('Конфликты синка') >= 0, 'плашка');
      });
    }));

    defer('плашку открыли — она уходит, снимки остаются', guard(function () {
      STORE[CONFLICT_KEY] = '1';
      STORE[SNAP_KEY] = JSON.stringify([{ id: 'x', side: 'local', updatedAt: 'z', device: 'd', savedAt: 'z',
        state: base('2026-01-01T00:00:00.000Z', 1) }]);
      ok(banner().length > 0, 'плашка есть');
      Sync.ackConflict();
      eq(banner(), '', 'плашки нет');
      eq(Sync.snapshots().length, 1, 'снимок на месте');
    }));

    defer('снимков не больше трёх, повторный не копится', guard(function () {
      var st = base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      use(synced('A', st), true);
      var chain = Promise.resolve();
      [1, 2, 3, 4].forEach(function (i) {
        chain = chain.then(function () {
          // другое устройство пишет в облако позже, A правил своё раньше — A проигрывает
          CL.put(base('2026-09-1' + i + 'T12:00:00.000Z', 100 + i));
          edit('2026-09-1' + i + 'T11:00:00.000Z', function (s) { s.stats.bestStreak = i; });
          Sync.init();
          return Sync.sync();
        });
      });
      return chain.then(function () {
        eq(Sync.snapshots().map(function (x) { return x.state.stats.bestStreak; }), [4, 3, 2],
          'последние три, новые сверху');
        // тот же проигрыш той же правки ещё раз — без дубля
        STORE['study-system-v2-synced'] = JSON.stringify({ user: 'u1', at: '2026-09-01T00:00:00.000Z' });
        State.s.meta.updatedAt = '2026-09-14T11:00:00.000Z'; State.s.stats.bestStreak = 4; State.save();
        CL.put(base('2026-09-15T12:00:00.000Z', 105));
        Sync.init();
        return Sync.sync();
      }).then(function () {
        eq(Sync.snapshots().map(function (x) { return x.state.stats.bestStreak; }), [4, 3, 2], 'дубль не лёг');
      });
    }));

    defer('снимок некуда сохранить — ни замены, ни записи', guard(function () {
      var st = base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      use(synced('A', st), true);
      edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 11; });
      CL.put(base('2026-09-10T10:00:00.000Z', 22));
      var realSet = localStorage.setItem;
      localStorage.setItem = function (k, v) {
        if (k === SNAP_KEY) { var e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
        return realSet.call(this, k, v);
      };
      Sync.init();
      return Sync.sync().then(function (r) {
        localStorage.setItem = realSet;
        eq(State.s.stats.bestStreak, 11, 'своё не заменено облаком');
        eq(CL.row.state.stats.bestStreak, 22, 'облако не затёрто');
        eq(Sync.state().status, 'error', 'ошибка видна в статусе');
        ok(r && r.ok === false, 'заход не удался');
      }, function (e) { localStorage.setItem = realSet; throw e; });
    }));
  });

  describe('2.8.1 A2: облако поменялось, но старше своего — тоже конфликт', function () {
    defer('старый клиент записал устаревшее — не берём, отдаём своё, его — в снимок', guard(function () {
      var st = base('2026-09-12T08:00:00.000Z', 30);
      CL.reset(); CL.put(st);
      use(synced('A', st));
      return Sync.sync().then(function () {
        // клиент до 2.8.1 пишет в облако не глядя: состояние недельной давности
        CL.put(base('2026-09-05T08:00:00.000Z', 3));
        return Sync.sync();
      }).then(function () {
        eq(State.s.stats.bestStreak, 30, 'своё осталось');
        eq(CL.row.state.stats.bestStreak, 30, 'облако восстановлено');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 3, 'записанное старым клиентом — в снимке');
      });
    }));
  });

  describe('2.8.1 A2: гонка записи — условный PATCH', function () {
    defer('облако поменяли, пока шло чтение, — решение по тому, что прочитано', guard(function () {
      var st = base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      use(synced('A', st), true);
      edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 11; });
      CL.holdNext();                  // придержим чтение
      Sync.init();
      return wait(5).then(function () {
        CL.put(base('2026-09-10T08:30:00.000Z', 22));   // другое устройство пишет прямо сейчас
        CL.release();
        return Sync.sync();
      }).then(function () {
        eq(CL.row.state.stats.bestStreak, 11, 'своё новее — уехало');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 22, 'чужая правка — в снимке');
      });
    }));

    defer('PATCH проиграл гонку — перечитали и не затёрли чужое', guard(function () {
      var st = base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      use(synced('A', st), true);
      edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 11; });
      var patched = false;
      window.__fetch = function (url, o) {
        // ровно перед первой записью A другое устройство успевает записать своё
        if (!patched && o && o.method === 'PATCH') {
          patched = true;
          CL.put(base('2026-09-10T10:00:00.000Z', 33));
        }
        return CL.fetch(url, o);
      };
      Sync.init();
      return Sync.sync().then(function () {
        eq(CL.row.state.stats.bestStreak, 33, 'чужая запись в облаке цела');
        eq(State.s.stats.bestStreak, 33, 'чужое новее — рабочим стало оно');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 11, 'своя правка — в снимке');
      });
    }));

    defer('пустое облако заняли раньше — POST 409, перечитали', guard(function () {
      CL.reset();
      var d = device('A');
      d.store['study-system-v2-session'] = session();
      use(d, true);
      edit('2026-09-10T09:00:00.000Z', function (s) { s.onboarded = true; s.stats.bestStreak = 11; });
      var posted = false;
      window.__fetch = function (url, o) {
        if (!posted && o && o.method === 'POST' && url.indexOf('/rest/v1/') >= 0) {
          posted = true;
          CL.put(base('2026-09-10T10:00:00.000Z', 44));
        }
        return CL.fetch(url, o);
      };
      Sync.init();
      return Sync.sync().then(function () {
        eq(CL.row.state.stats.bestStreak, 44, 'чужая первая запись цела');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 11, 'своё — в снимке');
      });
    }));
  });
})();
