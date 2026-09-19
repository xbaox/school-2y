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
    C.writes = 0; C.gets = 0; C.held = []; C.holdAt = {}; C.n = 0; C.token = 'ok'; C.user = 'u1';
  };

  C.put = function (st) { C.row = { state: clone(st), updated_at: st.meta.updatedAt }; };

  function answer(url, o) {
    var m = (o && o.method) || 'GET';
    if (url.indexOf('/auth/v1/token') >= 0) {
      if (C.token === 'dead') return res(400, { error: 'invalid_grant' });
      return res(200, {
        access_token: 'tok-' + (++C.n), refresh_token: 'ref', expires_in: 3600,
        user: { id: C.user || 'u1', email: 'a@b.c' }
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
        // 'now' — ответ собран в момент запроса и только доставляется позже
        var early = C.holdAt[dataN] === 'now' ? answer(url, o) : null;
        return new Promise(function (resolve) {
          C.held.push(function () { resolve(early || answer(url, o)); });
        });
      }
    }
    return answer(url, o);
  };
  C.dataCount = function () { return dataN; };
  C.holdNext = function (k, mode) { C.holdAt[dataN + (k || 1)] = mode || true; };
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

/* ---------- 2.8.1 A3: Настройки → «Конфликты синка» ---------- */
(function () {
  'use strict';
  var T = window.__sync281, CL = T.CL;

  function settingsText() {
    return App.screen('settings').render().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  }

  /** Конфликт, в котором этот браузер проиграл: правка 11 — в снимке, рабочее — 22. */
  function lostConflict() {
    var st = T.base('2026-09-10T08:00:00.000Z', 5);
    CL.reset(); CL.put(st);
    T.use(T.synced('A', st), true);
    T.edit('2026-09-10T09:00:00.000Z', function (s) {
      s.stats.bestStreak = 11;
      s.days['2026-09-10'] = { level: 'min', addons: [], lessons: [], points: 1 };
    });
    CL.put(T.base('2026-09-10T10:00:00.000Z', 22));
    Sync.init();
    return Sync.whenIdle();
  }

  describe('2.8.1 A3: раздел «Конфликты синка»', function () {
    defer('пусто — раздел есть и так и говорит', T.guard(function () {
      var t = settingsText();
      ok(t.indexOf('Конфликты синка') >= 0, 'раздел на месте');
      ok(t.indexOf('Конфликтов не было.') >= 0, 'пустой список сказан словами');
      ok(App.screen('settings').render().indexOf('data-conflicts') >= 0, 'якорь для плашки');
    }));

    defer('снимок — строка с устройством, датами и двумя кнопками', T.guard(function () {
      return lostConflict().then(function () {
        var html = App.screen('settings').render();
        var t = settingsText();
        var id = Sync.snapshots()[0].id;
        ok(t.indexOf('Правки этого браузера') >= 0, 'чья копия');
        ok(t.indexOf('устройство · ') >= 0, 'устройство');
        ok(/правка \d/.test(t) && /сохранена \d/.test(t), 'даты правки и сохранения');
        ok(t.indexOf('1 день') >= 0, 'объём копии');
        ok(html.indexOf('data-snap-dl="' + id + '"') >= 0, '«Скачать JSON»');
        ok(html.indexOf('data-snap-use="' + id + '"') >= 0, '«Сделать рабочим»');
      });
    }));

    defer('«Скачать JSON» — снимок целиком', T.guard(function () {
      return lostConflict().then(function () {
        var f = Sync.snapshotFile(Sync.snapshots()[0].id);
        ok(/^study-v2-snapshot-\d{4}-\d{2}-\d{2}-\d{4}\.json$/.test(f.name), 'имя файла: ' + f.name);
        var st = JSON.parse(f.text);
        eq([st.stats.bestStreak, st.meta.updatedAt, !!st.days['2026-09-10']],
          [11, '2026-09-10T09:00:00.000Z', true], 'в файле — проигравшее состояние');
        eq(State.validateImport(st).ok, true, 'файл годится для «Загрузить JSON»');
        eq(Sync.snapshotFile('нет-такого'), null, 'чужой id — ничего');
      });
    }));

    defer('«Сделать рабочим» — снимок становится состоянием и уходит в облако с новым updatedAt', T.guard(function () {
      var before = null;
      return lostConflict().then(function () {
        eq(State.s.stats.bestStreak, 22, 'сейчас рабочее — облако');
        before = Date.now();
        ok(Sync.restoreSnapshot(Sync.snapshots()[0].id), 'восстановление прошло');
        eq(State.s.stats.bestStreak, 11, 'рабочим стал снимок');
        ok(!!State.s.days['2026-09-10'], 'целиком, с днями');
        ok(Date.parse(State.s.meta.updatedAt) >= before - 5, 'updatedAt новый');
        eq(Sync.state().conflict, false, 'плашка снята');
        return Sync.whenIdle();
      }).then(function () {
        eq(CL.row.state.stats.bestStreak, 11, 'снимок уехал в облако');
        eq(CL.row.state.meta.updatedAt, State.s.meta.updatedAt, 'с новым updatedAt');
        var sn = Sync.snapshots();
        eq(sn.map(function (x) { return [x.side, x.state.stats.bestStreak]; }), [['working', 22]],
          'бывшее рабочее заняло место снимка — ничего не потеряно');
        eq(Sync.lastSyncedAt(), State.s.meta.updatedAt, 'сошлись с облаком');
      });
    }));

    defer('«Сделать рабочим» без входа — локально, уйдёт после входа', T.guard(function () {
      return lostConflict().then(function () {
        var id = Sync.snapshots()[0].id;
        Sync.signOut();
        var w0 = CL.writes;
        ok(Sync.restoreSnapshot(id), 'восстановление прошло');
        eq([State.s.stats.bestStreak, CL.writes], [11, w0], 'локально — да, в облако — нет');
        eq(Sync.hasUnpushed(), true, 'правка ждёт отправки');
      });
    }));
  });
})();

/* ---------- 2.8.1 A4: истёкший вход — правки остаются и уезжают после входа ---------- */
(function () {
  'use strict';
  var T = window.__sync281, CL = T.CL;

  function signInAgain() {
    CL.token = 'ok';
    return Sync.signIn('a@b.c', 'pass').then(function () { return Sync.whenIdle(); });
  }

  /** A сошёлся с облаком, правит; вход отваливается на первом же заходе. */
  function lostWithEdits() {
    var st = T.base('2026-09-10T08:00:00.000Z', 5);
    CL.reset(); CL.put(st);
    var d = T.synced('A', st);
    d.store['study-system-v2-session'] = JSON.stringify({
      access_token: 'tok', refresh_token: 'ref', expires_at: Date.now() - 1000, user_id: 'u1', email: 'a@b.c'
    });
    T.use(d, true);
    T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 11; });
    CL.token = 'dead';
    Sync.init();
    return Sync.whenIdle();
  }

  describe('2.8.1 A4: истёкший вход', function () {
    defer('вход отвалился — правки на месте, метка схождения цела', T.guard(function () {
      return lostWithEdits().then(function () {
        eq([Sync.signedIn(), Sync.authLost()], [false, true], 'вход потерян, плашка');
        eq(State.s.stats.bestStreak, 11, 'правка на месте');
        eq(Sync.lastSyncedAt(), '2026-09-10T08:00:00.000Z', 'lastSyncedAt не стёрт');
        eq(Sync.hasUnpushed(), true, 'правка числится неотправленной');
        eq(CL.row.state.stats.bestStreak, 5, 'облако не тронуто');
      });
    }));

    defer('правки без входа копятся; после входа — чтение, потом отправка', T.guard(function () {
      return lostWithEdits().then(function () {
        T.edit('2026-09-10T09:30:00.000Z', function (s) { s.stats.bestStreak = 12; });
        window.__calls.length = 0;
        return signInAgain();
      }).then(function () {
        var data = window.__calls.filter(function (c) { return c.url.indexOf('/rest/v1/') >= 0; });
        eq(data.map(function (c) { return c.method; }), ['GET', 'PATCH'], 'чтение, потом запись');
        eq([State.s.stats.bestStreak, CL.row.state.stats.bestStreak], [12, 12], 'правки уехали');
        eq(Sync.snapshots().length, 0, 'конфликта не было');
        eq(Sync.authLost(), false, 'плашка ушла');
      });
    }));

    defer('пока входа не было, другое устройство писало раньше — своё побеждает, чужое в снимке', T.guard(function () {
      return lostWithEdits().then(function () {
        CL.put(T.base('2026-09-10T08:30:00.000Z', 22));
        return signInAgain();
      }).then(function () {
        eq([State.s.stats.bestStreak, CL.row.state.stats.bestStreak], [11, 11], 'своё в облаке');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 22, 'чужое — в снимке');
      });
    }));

    defer('другое устройство писало позже — облако рабочее, но своё не пропало', T.guard(function () {
      return lostWithEdits().then(function () {
        CL.put(T.base('2026-09-10T10:00:00.000Z', 22));
        return signInAgain();
      }).then(function () {
        eq(State.s.stats.bestStreak, 22, 'рабочим стало облако');
        eq(Sync.snapshots()[0].side, 'local', 'своё — в снимке');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 11, 'целиком');
        ok(T.banner().indexOf('Конфликты синка') >= 0, 'плашка конфликта');
      });
    }));

    defer('вход отвалился посреди записи — ничего не заменено, после входа уехало', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st), true);
      T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 11; });
      window.__fetch = function (url, o) {
        // чтение прошло, а на записи токен уже не узнают, refresh отбит
        if (o && o.method === 'PATCH') CL.token = 'dead';
        return CL.fetch(url, o);
      };
      Sync.init();
      return Sync.whenIdle().then(function () {
        eq([Sync.signedIn(), State.s.stats.bestStreak, CL.row.state.stats.bestStreak], [false, 11, 5],
          'вход потерян, своё на месте, облако прежнее');
        window.__fetch = CL.fetch;
        return signInAgain();
      }).then(function () {
        eq(CL.row.state.stats.bestStreak, 11, 'после входа правка уехала');
      });
    }));

    defer('перезапуск без входа ничего не отправляет и ничего не забирает', T.guard(function () {
      return lostWithEdits().then(function () {
        var n = window.__calls.length;
        Sync.init();
        Sync.flush();
        return Sync.sync();
      }).then(function (r) {
        eq(r.ok, false, 'без входа заход не идёт');
        eq(State.s.stats.bestStreak, 11, 'своё на месте');
      });
    }));
  });
})();

/* ---------- 2.8.1 A5: два устройства, офлайн, устаревший ответ ---------- */
(function () {
  'use strict';
  var T = window.__sync281, CL = T.CL;

  describe('2.8.1 A5: два устройства по очереди — без конфликта', function () {
    defer('A → B → A: каждое берёт чужое и отдаёт своё, снимков нет', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      var a = T.synced('A', st), b = T.synced('B', st);
      T.use(a);
      return Sync.whenIdle().then(function () {
        T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 6; s.days['2026-09-10'] = { level: 'min', addons: [], lessons: [], points: 1 }; });
        return Sync.sync();
      }).then(function () {
        T.use(b);
        return Sync.whenIdle();
      }).then(function () {
        eq([State.s.stats.bestStreak, !!State.s.days['2026-09-10']], [6, true], 'B взял правку A');
        T.edit('2026-09-11T09:00:00.000Z', function (s) { s.stats.bestStreak = 7; s.days['2026-09-11'] = { level: 'min', addons: [], lessons: [], points: 1 }; });
        return Sync.sync();
      }).then(function () {
        T.use(a);
        return Sync.whenIdle();
      }).then(function () {
        eq([State.s.stats.bestStreak, Object.keys(State.s.days).sort()], [7, ['2026-09-10', '2026-09-11']],
          'A взял правку B, своё — на месте');
        eq(Sync.snapshots().length, 0, 'снимков нет');
        eq(Sync.state().conflict, false, 'плашки нет');
        eq(CL.writes, 2, 'в облако — ровно две записи');
        eq(Sync.lastSyncedAt(), '2026-09-11T09:00:00.000Z', 'A сошёлся с облаком');
      });
    }));
  });

  describe('2.8.1 A5: офлайн-правки → сеть → чтение первым', function () {
    defer('без сети — ни одного запроса, очередь; сеть вернулась — GET, потом запись', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        navigator.onLine = false;
        window.__calls.length = 0;
        T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 11; });
        Sync.flush();
        return Sync.sync();
      }).then(function (r) {
        eq([r.ok, r.offline, window.__calls.length, Sync.state().status], [false, true, 0, 'queued'],
          'офлайн: запросов нет, статус — очередь');
        navigator.onLine = true;
        Sync.flush();                     // так зовёт обработчик события online
        return Sync.whenIdle();
      }).then(function () {
        var data = window.__calls.filter(function (c) { return c.url.indexOf('/rest/v1/') >= 0; });
        eq(data.map(function (c) { return c.method; }), ['GET', 'PATCH'], 'первым — чтение облака');
        eq(CL.row.state.stats.bestStreak, 11, 'офлайн-правка уехала');
      });
    }));

    defer('пока был офлайн, другое устройство записало позже — своё в снимке', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        navigator.onLine = false;
        T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 11; });
        CL.put(T.base('2026-09-10T12:00:00.000Z', 22));
        navigator.onLine = true;
        Sync.flush();
        return Sync.whenIdle();
      }).then(function () {
        eq([State.s.stats.bestStreak, CL.row.state.stats.bestStreak], [22, 22], 'рабочим — более позднее');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 11, 'офлайн-правка не пропала — в снимке');
      });
    }));
  });

  describe('2.8.1 A5: ответ прошлого захода не применяется к новому', function () {
    defer('чтение до выхода пришло после нового входа — выброшено', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(T.base('2026-09-10T09:00:00.000Z', 22));
      var d = T.synced('A', st);
      T.use(d, true);
      CL.holdNext(1, 'now');            // ответ с рекордом 22 застрянет в сети
      Sync.init();
      return T.wait(5).then(function () {
        Sync.signOut();
        CL.put(T.base('2026-09-10T10:00:00.000Z', 33));
        return Sync.signIn('a@b.c', 'pass');
      }).then(function () {
        return Sync.whenIdle();
      }).then(function () {
        eq(State.s.stats.bestStreak, 33, 'новый заход взял свежее облако');
        CL.release();                   // старый ответ наконец доехал
        return T.wait(10);
      }).then(function () {
        eq(State.s.stats.bestStreak, 33, 'старый ответ ничего не заменил');
        eq(Sync.lastSyncedAt(), '2026-09-10T10:00:00.000Z', 'и метку не сдвинул');
        eq(Sync.state().status, 'idle', 'статус не испорчен');
      });
    }));

    defer('401 из прошлого захода не гасит новый вход', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st), true);
      CL.holdNext(1);                   // чтение застрянет; ответ соберётся при отпуске
      Sync.init();
      return T.wait(5).then(function () {
        Sync.signOut();
        return Sync.signIn('a@b.c', 'pass');
      }).then(function () {
        return Sync.whenIdle();
      }).then(function () {
        CL.token = 'dead';              // старый запрос получит 401, refresh отбит
        CL.release();
        return T.wait(10);
      }).then(function () {
        CL.token = 'ok';
        eq([Sync.signedIn(), Sync.authLost()], [true, false], 'новый вход жив, плашки нет');
      });
    }));

    defer('правка во время чтения — облако её не затирает', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(T.base('2026-09-10T09:00:00.000Z', 22));
      T.use(T.synced('A', st), true);
      CL.holdNext(1);
      Sync.init();
      return T.wait(5).then(function () {
        // своих правок на момент запроса не было; человек правит, пока ответ в пути
        T.edit('2026-09-10T09:30:00.000Z', function (s) { s.stats.bestStreak = 11; });
        CL.release();
        return Sync.whenIdle();
      }).then(function () {
        eq([State.s.stats.bestStreak, CL.row.state.stats.bestStreak], [11, 11],
          'решение по состоянию на момент ответа: своё новее — рабочее и в облаке');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 22, 'облачное — в снимке');
      });
    }));
  });

  describe('2.8.1 A5: устройство 2.7.7 со старыми данными не затирает облако', function () {
    function oldDevice(pushed) {
      var old = T.base('2026-09-05T08:00:00.000Z', 3);
      // старый пакет контента: подпись блока, которую новый пакет перепишет
      old.blocks = { B9: { phase: 'P1', track: 'math', title: 'старое', deadline: null, done: false, note: 'старая подпись' } };
      var d = T.device('old');
      d.store['study-system-v2'] = JSON.stringify(old);
      d.store['study-system-v2-session'] = T.session();
      if (pushed) d.store['study-system-v2-pushed'] = pushed;       // метка 2.7.7
      return d;
    }

    function boot() {
      // как App.boot, без экрана: загрузка, миграции, контент, посев
      State.load();
      State.applyAutoMode();
      State.syncContent();
      if (Radar.migrateTodos) Radar.migrateTodos();
      if (Radar.seedQuestions) Radar.seedQuestions();
      Sync.init();
      return Sync.whenIdle();
    }

    // c[3] — облако записано 2.8.1 (есть meta.base); без base — клиентом до 2.8.1,
    // и тогда своё ложится страховочным снимком даже без неотправленных правок
    [['метка 2.7.7 = его updatedAt, облако от 2.8.1', '2026-09-05T08:00:00.000Z', false, true],
      ['метка 2.7.7 = его updatedAt, облако от 2.8.0', '2026-09-05T08:00:00.000Z', true, false],
      ['метка 2.7.7 старше — были неотправленные правки', '2026-09-01T08:00:00.000Z', true, true],
      ['метки нет вовсе', null, true, true]].forEach(function (c) {
      defer(c[0], T.guard(function () {
        var cloud = T.base('2026-09-18T20:00:00.000Z', 57);
        if (c[3]) { cloud.meta.base = '2026-09-17T20:00:00.000Z'; cloud.meta.writtenAt = cloud.meta.updatedAt; }
        cloud.days['2026-09-18'] = { level: 'min', addons: [], lessons: [], points: 1 };
        CL.reset(); CL.put(cloud);
        var before = JSON.stringify(CL.row);
        T.use(oldDevice(c[1]), true);
        window.__calls.length = 0;
        return boot().then(function () {
          eq(window.__calls.filter(function (x) { return x.url.indexOf('/rest/v1/') >= 0; })[0].method, 'GET',
            'первый запрос — чтение');
          eq(JSON.stringify(CL.row), before, 'облако не тронуто');
          eq(CL.writes, 0, 'записей нет');
          eq([State.s.stats.bestStreak, !!State.s.days['2026-09-18']], [57, true], 'устройство взяло облако');
          eq(Sync.snapshots().length ? Sync.snapshots()[0].state.stats.bestStreak : null, c[2] ? 3 : null,
            c[2] ? 'старое своё — в снимке' : 'снимка нет — нечего было терять');
        });
      }));
    });
  });
})();

/* ---------- 2.8.1 A5: правки старта, выводимые из пакета, даты и дней, updatedAt не двигают ---------- */
(function () {
  'use strict';
  var STAMP = '2026-09-01T00:00:00.000Z';

  function quiet(fn) {
    var real = UI.toast, pushes = 0, realSync = Sync.onLocalChange;
    UI.toast = function () {};
    Sync.onLocalChange = function () { pushes++; };
    try { fn(); } finally { UI.toast = real; Sync.onLocalChange = realSync; }
    return pushes;
  }

  describe('2.8.1 A5: старт устройства не делает его «новее» облака', function () {
    withToday('2026-09-19', function () {
      State.reset();
      State.syncContent();
      State.s.blocks.B11.note = 'подпись прошлого пакета';
      State.s.meta.updatedAt = STAMP;
      var pushes = quiet(function () { eq(State.syncContent(), true, 'пакет переписал подпись блока'); });
      eq([State.s.meta.updatedAt, pushes], [STAMP, 0], 'контент: updatedAt на месте, синк не дёрнут');

      State.reset();
      State.s.settings.mode = 'summer';
      State.s.settings.autoSchoolDone = false;
      State.s.meta.updatedAt = STAMP;
      pushes = quiet(function () { eq(State.applyAutoMode(), true, 'режим сменился на «Школу»'); });
      eq([State.mode(), State.s.meta.updatedAt, pushes], ['school', STAMP, 0], 'автосмена режима: updatedAt на месте');

      // серия держалась, потом четыре пустых дня (чужие дни ещё не забраны)
      State.reset();
      State.syncContent();
      State.setMode('school');
      State.s.step.position = 3;
      State.s.step.cycleStart = '2026-09-08';
      ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14'].forEach(function (d) {
        State.s.days[d] = { level: 'min', addons: [], lessons: [], points: 1, minimalSteps: [true, true] };
        State.recount(d);
      });
      State.s.meta.updatedAt = STAMP;
      pushes = quiet(function () { StepsFlow.check(); });
      eq(State.s.step.position, 2, 'автооткат ступени случился');
      eq([State.s.meta.updatedAt, pushes], [STAMP, 0], 'автооткат: updatedAt на месте, синк не дёрнут');
      State.reset();
    });
  });
})();

/* ---------- 2.8.1, ревью части A: находки трёх проверяющих ---------- */
(function () {
  'use strict';
  var T = window.__sync281, CL = T.CL, STORE = window.__store;

  describe('2.8.1 ревью A: новое устройство входит — пустое не перебивает облако', function () {
    defer('онбординг: вход на пустом устройстве забирает облако, даже если оно «старше»', T.guard(function () {
      var yesterday = new Date(Date.now() - 86400000).toISOString();
      CL.reset(); CL.put(T.base(yesterday, 22));
      var d = T.device('new');
      T.use(d, true);
      State.reset();                      // blank(): updatedAt = сейчас, позже облака
      ok(Date.parse(State.s.meta.updatedAt) > Date.parse(yesterday), 'пустое «новее» облака');
      return Sync.signIn('a@b.c', 'pass').then(function (res) {
        eq(res.applied, true, 'онбординг узнаёт, что состояние забрано (res.applied)');
        eq([State.s.stats.bestStreak, CL.row.state.stats.bestStreak, CL.writes], [22, 22, 0],
          'облако взято и не тронуто');
        eq(Sync.snapshots().length, 0, 'снимков нет — терять было нечего');
      });
    }));
  });

  describe('2.8.1 ревью A: перекос часов не прячет правку', function () {
    defer('облако пришло из «будущего» — правка по местным часам всё равно неотправленная', T.guard(function () {
      var st = T.base(new Date(Date.now() - 2 * 86400000).toISOString(), 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('B', st));
      return Sync.whenIdle().then(function () {
        // устройство A спешит на сутки: его запись несёт завтрашнее время
        var future = new Date(Date.now() + 86400000).toISOString();
        var c = T.base(future, 22); c.meta.base = st.meta.updatedAt;
        CL.put(c);
        return Sync.sync();
      }).then(function () {
        eq(State.s.stats.bestStreak, 22, 'B взял облако');
        State.s.stats.bestStreak = 99;
        State.touch(true);                // правка человека по местным часам
        ok(Date.parse(State.s.meta.updatedAt) > Date.parse(Sync.lastSyncedAt()), 'updatedAt правки позже метки');
        eq(Sync.hasUnpushed(), true, 'правка числится неотправленной');
        return Sync.sync();
      }).then(function () {
        eq(CL.row.state.stats.bestStreak, 99, 'и уехала в облако');
      });
    }));
  });

  describe('2.8.1 ревью A: две вкладки одного браузера', function () {
    defer('соседняя вкладка записала новее — эта перечитывает, а не затирает', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        // вкладка B (память этой) держит старое; вкладка A пишет на диск и в облако
        var a = JSON.parse(STORE['study-system-v2']);
        a.stats.bestStreak = 33;
        a.days['2026-09-10'] = { level: 'min', addons: [], lessons: [], points: 1 };
        a.meta.updatedAt = '2026-09-10T09:00:00.000Z';
        a.meta.base = st.meta.updatedAt;
        STORE['study-system-v2'] = JSON.stringify(a);
        CL.put(a);
        STORE['study-system-v2-synced'] = JSON.stringify({ user: 'u1', at: a.meta.updatedAt });
        eq(State.s.stats.bestStreak, 5, 'в памяти этой вкладки — старое');
        Sync.onStorage({ key: 'study-system-v2' });
        eq([State.s.stats.bestStreak, !!State.s.days['2026-09-10']], [33, true], 'событие storage — перечитали');
        State.s.stats.bestStreak = 34;
        State.touch(true);
        return Sync.sync();
      }).then(function () {
        eq([CL.row.state.stats.bestStreak, !!CL.row.state.days['2026-09-10']], [34, true],
          'правка этой вкладки легла поверх свежего, день соседней цел');
      });
    }));

    defer('событие не дошло — заход сам сверяет память с диском', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        var a = JSON.parse(STORE['study-system-v2']);
        a.stats.bestStreak = 33;
        a.meta.updatedAt = '2026-09-10T09:00:00.000Z';
        a.meta.base = st.meta.updatedAt;
        STORE['study-system-v2'] = JSON.stringify(a);
        CL.put(a);
        STORE['study-system-v2-synced'] = JSON.stringify({ user: 'u1', at: a.meta.updatedAt });
        return Sync.sync();
      }).then(function () {
        eq([State.s.stats.bestStreak, CL.writes], [33, 0], 'старое из памяти в облако не ушло');
      });
    }));
  });

  describe('2.8.1 ревью A: запись клиента до 2.8.1 (без meta.base)', function () {
    defer('облако новее, своих правок нет — своё всё равно снимком (без плашки)', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 9);
      st.days['2026-09-10'] = { level: 'min', addons: [], lessons: [], points: 1 };
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        CL.put(T.base('2026-09-12T08:00:00.000Z', 1));   // 2.8.0 из кэша записал старое не глядя
        return Sync.sync();
      }).then(function () {
        eq(State.s.stats.bestStreak, 1, 'облако применено — правило «новее побеждает»');
        var sn = Sync.snapshots();
        eq([sn.length, sn[0].side, sn[0].state.stats.bestStreak, !!sn[0].state.days['2026-09-10']],
          [1, 'safety', 9, true], 'своё — страховочным снимком целиком');
        eq(Sync.state().conflict, false, 'плашки нет — это страховка, а не конфликт');
      });
    }));

    defer('запись 2.8.1 несёт meta.base и meta.device', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st), true);
      T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 6; });
      Sync.init();
      return Sync.whenIdle().then(function () {
        eq(CL.row.state.meta.base, '2026-09-10T08:00:00.000Z', 'base — облако, поверх которого легла запись');
        ok(!!CL.row.state.meta.device, 'device — кто писал');
        eq(State.s.meta.base, undefined, 'в локальное состояние base не пишется');
      });
    }));
  });

  describe('2.8.1 ревью A: вход под другой почтой', function () {
    defer('данные первого аккаунта не льются во второй — облако второго берётся, своё снимком', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 3);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        T.edit('2026-09-11T08:00:00.000Z', function (s) { s.stats.bestStreak = 4; });
        Sync.signOut();
        var other = T.base('2026-09-01T08:00:00.000Z', 42);
        other.meta.base = 'empty';
        CL.put(other);                    // облако второго аккаунта (старше)
        CL.user = 'u2';
        return Sync.signIn('b@b.c', 'pass');
      }).then(function (res) {
        eq([CL.row.state.stats.bestStreak, CL.writes], [42, 0], 'облако второго аккаунта не тронуто');
        eq([State.s.stats.bestStreak, res.applied, res.account], [42, true, true], 'рабочим стало оно');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 4, 'данные первого — снимком');
        eq(Sync.lastSyncedAt(), '2026-09-01T08:00:00.000Z', 'метка теперь второго аккаунта');
      });
    }));
  });

  describe('2.8.1 ревью A: зависший запрос, повтор после ошибки, человеческие тексты', function () {
    defer('запрос без ответа — таймаут, очередь, заходы не встают', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      var realReq = Sync.limits.req, realBpm = Sync.limits.bytesPerMs;
      Sync.limits.req = 20;
      T.use(T.synced('A', st), true);
      T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 6; });
      var hang = true;
      window.__fetch = function (url, o) {
        if (hang && url.indexOf('/rest/v1/') >= 0) return new Promise(function () {});   // ответа не будет
        return CL.fetch(url, o);
      };
      Sync.init();
      return Sync.whenIdle().then(function () {
        eq([Sync.state().status, Sync.state().error], ['queued', 'Нет связи с облаком — повторю сам'],
          'таймаут — очередь с человеческим текстом');
        hang = false;
        return Sync.sync();
      }).then(function () {
        Sync.limits.req = realReq; Sync.limits.bytesPerMs = realBpm;
        eq(CL.row.state.stats.bestStreak, 6, 'следующий заход прошёл');
      }, function (e) { Sync.limits.req = realReq; Sync.limits.bytesPerMs = realBpm; throw e; });
    }));

    defer('облако ответило ошибкой — заход повторится сам', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      var realBase = Sync.limits.retryBase;
      Sync.limits.retryBase = 15;
      T.use(T.synced('A', st), true);
      T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 6; });
      var broken = true;
      window.__fetch = function (url, o) {
        if (broken && o && o.method === 'PATCH') return Promise.resolve(window.__res(503, { msg: 'gateway' }));
        return CL.fetch(url, o);
      };
      Sync.init();
      return Sync.whenIdle().then(function () {
        eq([Sync.state().status, Sync.state().error], ['error', 'Облако не приняло состояние (ошибка 503)'],
          'ошибка видна');
        broken = false;
        return T.wait(80);
      }).then(function () {
        return Sync.whenIdle();
      }).then(function () {
        Sync.limits.retryBase = realBase;
        eq([CL.row.state.stats.bestStreak, Sync.state().status], [6, 'idle'], 'повтор сам отправил правку');
      }, function (e) { Sync.limits.retryBase = realBase; throw e; });
    }));

    defer('fetch упал при «есть сеть» — не «Failed to fetch», а очередь', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st), true);
      window.__fetch = function (url) {
        if (url.indexOf('/rest/v1/') >= 0) return Promise.reject(new TypeError('Failed to fetch'));
        return CL.fetch(url);
      };
      Sync.init();
      return Sync.whenIdle().then(function () {
        eq([Sync.state().status, Sync.state().error], ['queued', 'Нет связи с облаком — повторю сам'], 'человеческий текст');
      });
    }));

    defer('вход: нет сети и шлюз с HTML — человеческие тексты', T.guard(function () {
      CL.reset();
      T.use(T.device('X'), true);
      window.__fetch = function () { return Promise.reject(new TypeError('Failed to fetch')); };
      return Sync.signIn('a@b.c', 'p').then(function () { ok(false, 'вход не должен пройти'); }, function (e) {
        eq(e.message, 'Нет связи с облаком — проверь сеть и повтори', 'нет сети');
        window.__fetch = function () {
          return Promise.resolve({ ok: false, status: 502,
            text: function () { return Promise.resolve('<html>Bad gateway</html>'); },
            json: function () { return Promise.reject(new SyntaxError('Unexpected token <')); } });
        };
        return Sync.signIn('a@b.c', 'p');
      }).then(function () { ok(false, 'вход не должен пройти'); }, function (e) {
        eq(e.message, 'Не вышло войти (ошибка 502). Проверь связь и повтори', 'шлюз 502 с HTML');
      });
    }));

    defer('вход прервали выходом — статус «не подключено», а не ошибка', T.guard(function () {
      CL.reset();
      T.use(T.device('X'), true);
      var release = null;
      window.__fetch = function () {
        return new Promise(function (r) { release = function () { r(window.__res(400, { error: 'invalid_grant' })); }; });
      };
      var p = Sync.signIn('a@b.c', 'p').then(null, function (e) { return e; });
      return T.wait(5).then(function () {
        Sync.signOut();
        release();
        return p;
      }).then(function (e) {
        eq(e.message, 'Вход прерван — повтори', 'текст для формы');
        eq(Sync.state().status, 'off', 'статус не испорчен');
      });
    }));
  });

  describe('2.8.1 ревью A: память браузера не приняла облако', function () {
    defer('состояние не записалось — всё как было, метка не ставится', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        var c = T.base('2026-09-11T08:00:00.000Z', 22); c.meta.base = st.meta.updatedAt;
        CL.put(c);
        var realSet = localStorage.setItem;
        localStorage.setItem = function (k, v) {
          if (k === 'study-system-v2') { var e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
          return realSet.call(this, k, v);
        };
        return Sync.sync().then(function (r) { localStorage.setItem = realSet; return r; },
          function (e) { localStorage.setItem = realSet; throw e; });
      }).then(function (r) {
        eq(r.ok, false, 'заход не удался');
        eq([State.s.stats.bestStreak, Sync.lastSyncedAt()], [5, '2026-09-10T08:00:00.000Z'],
          'в памяти — прежнее, метка — прежняя');
        eq(JSON.parse(STORE['study-system-v2']).stats.bestStreak, 5, 'на диске — прежнее');
        eq(Sync.state().status, 'error', 'ошибка видна');
      });
    }));
  });
})();

/* ---------- 2.8.1, ревью части A, второй круг ---------- */
(function () {
  'use strict';
  var T = window.__sync281, CL = T.CL, STORE = window.__store;

  /** Облако, записанное 2.8.1 поверх base. */
  function by281(at, best, base) {
    var c = T.base(at, best);
    c.meta.base = base; c.meta.writtenAt = at;
    return c;
  }

  describe('2.8.1 ревью A-2: тело ответа не пришло — таймаут, а не вечное «синхронизирую»', function () {
    defer('заголовки пришли, тело нет', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      var realReq = Sync.limits.req, realBpm = Sync.limits.bytesPerMs;
      Sync.limits.req = 20;
      Sync.limits.bytesPerMs = 1e9;           // без надбавки за размер тела
      T.use(T.synced('A', st), true);
      T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 6; });
      var stall = true;
      window.__fetch = function (url, o) {
        if (stall && url.indexOf('/rest/v1/') >= 0) {
          return Promise.resolve({ ok: true, status: 200, text: function () { return new Promise(function () {}); } });
        }
        return CL.fetch(url, o);
      };
      Sync.init();
      return Sync.whenIdle().then(function () {
        eq(Sync.state().status, 'queued', 'заход закончился очередью');
        stall = false;
        return Sync.sync();
      }).then(function () {
        Sync.limits.req = realReq; Sync.limits.bytesPerMs = realBpm;
        eq(CL.row.state.stats.bestStreak, 6, 'следующий заход прошёл');
      }, function (e) { Sync.limits.req = realReq; Sync.limits.bytesPerMs = realBpm; throw e; });
    }));
  });

  describe('2.8.1 ревью A-2: запись легла, ответ опоздал — не ложный конфликт', function () {
    defer('PATCH прошёл, ответ по таймауту; правка после — просто отправляется', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      var realReq = Sync.limits.req, realBpm = Sync.limits.bytesPerMs;
      Sync.limits.req = 20;
      Sync.limits.bytesPerMs = 1e9;           // без надбавки за размер тела
      T.use(T.synced('A', st), true);
      T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 6; });
      var late = true;
      window.__fetch = function (url, o) {
        if (late && o && o.method === 'PATCH') {
          late = false;
          CL.fetch(url, o);               // облако запись приняло
          return new Promise(function () {});   // а ответ не дошёл
        }
        return CL.fetch(url, o);
      };
      Sync.init();
      return Sync.whenIdle().then(function () {
        eq(CL.row.state.stats.bestStreak, 6, 'в облаке — наша запись');
        T.edit('2026-09-10T09:05:00.000Z', function (s) { s.stats.bestStreak = 7; });
        return Sync.sync();
      }).then(function (r) {
        Sync.limits.req = realReq; Sync.limits.bytesPerMs = realBpm;
        eq([r.conflict, CL.row.state.stats.bestStreak], [undefined, 7], 'правка уехала без конфликта');
        eq([Sync.snapshots().length, Sync.state().conflict], [0, false], 'ни снимка, ни плашки');
      }, function (e) { Sync.limits.req = realReq; Sync.limits.bytesPerMs = realBpm; throw e; });
    }));
  });

  describe('2.8.1 ревью A-2: соседняя вкладка записала более старое', function () {
    defer('«Забрать из облака» в соседней вкладке — эта перечитывает и не отдаёт своё обратно', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 6; });
        // соседняя вкладка забрала облако (updatedAt старше) и записала его на диск
        STORE['study-system-v2'] = JSON.stringify(st);
        Sync.onStorage({ key: 'study-system-v2' });
        eq(State.s.stats.bestStreak, 5, 'перечитали — на диске теперь облако');
        return Sync.sync();
      }).then(function () {
        eq(CL.row.state.stats.bestStreak, 5, 'своё старое обратно не ушло');
      });
    }));

    defer('своя несохранённая правка — чужая запись ложится снимком', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        State.s.stats.bestStreak = 6;
        State.touch(true);                // запись на диск — через 150 мс
        var other = T.base('2026-09-10T09:30:00.000Z', 44);
        STORE['study-system-v2'] = JSON.stringify(other);
        Sync.onStorage({ key: 'study-system-v2' });
        eq(State.s.stats.bestStreak, 6, 'своя правка в памяти цела');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 44, 'запись соседней вкладки — снимком');
        return T.wait(200);
      });
    }));

    defer('соседняя вкладка вышла — эта тоже', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        delete STORE['study-system-v2-session'];
        Sync.onStorage({ key: 'study-system-v2-session' });
        eq([Sync.signedIn(), Sync.state().status], [false, 'off'], 'вход погашен и здесь');
      });
    }));
  });

  describe('2.8.1 ревью A-2: признак записи 2.8.1 — writtenAt === updatedAt', function () {
    defer('клиент до 2.8.1 унёс meta.base и правил — снимок страховки на месте', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 9);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        var old = by281('2026-09-11T08:00:00.000Z', 1, 'x');
        old.meta.updatedAt = '2026-09-12T08:00:00.000Z';   // его правка сдвинула updatedAt
        CL.put(old);
        return Sync.sync();
      }).then(function () {
        eq([State.s.stats.bestStreak, Sync.snapshots().length], [1, 1], 'облако взято, своё — снимком');
      });
    }));

    defer('запись 2.8.1 — без страховочного снимка; служебные поля в локальное не идут', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 9);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        var c = by281('2026-09-11T08:00:00.000Z', 10, st.meta.updatedAt);
        c.meta.device = 'Mac · Safari · abcd';
        CL.put(c);
        return Sync.sync();
      }).then(function () {
        eq([State.s.stats.bestStreak, Sync.snapshots().length], [10, 0], 'взято без снимка');
        eq([State.s.meta.base, State.s.meta.device, State.s.meta.writtenAt], [undefined, undefined, undefined],
          'base, device, writtenAt в локальном состоянии нет');
        eq(JSON.parse(STORE['study-system-v2']).meta.base, undefined, 'и на диске тоже');
      });
    }));
  });

  describe('2.8.1 ревью A-2: онбординг без входа, потом вход из Настроек', function () {
    defer('метки нет, своё почти пустое и «новее» — рабочим облако, своё снимком', T.guard(function () {
      var cloud = by281('2026-09-01T08:00:00.000Z', 42, 'empty');
      CL.reset(); CL.put(cloud);
      T.use(T.device('new'), true);
      State.reset();
      State.s.onboarded = true;
      State.touch(true);
      State.save();
      return Sync.signIn('a@b.c', 'pass').then(function () {
        eq([State.s.stats.bestStreak, CL.row.state.stats.bestStreak, CL.writes], [42, 42, 0], 'облако рабочее и не тронуто');
        eq(Sync.snapshots()[0].side, 'local', 'своё — снимком');
      });
    }));
  });
})();

/* ---------- 2.8.1, ревью части A, третий круг ---------- */
(function () {
  'use strict';
  var T = window.__sync281, CL = T.CL, STORE = window.__store;

  describe('2.8.1 ревью A-3: одинаковый updatedAt на двух устройствах — не схождение', function () {
    defer('облако «из будущего», оба правят — правка A не теряется', T.guard(function () {
      var future = new Date(Date.now() + 86400000).toISOString();
      var c0 = T.base(future, 5);
      CL.reset(); CL.put(c0);
      var a = T.synced('A', c0), b = T.synced('B', c0);
      T.use(a);
      return Sync.whenIdle().then(function () {
        State.s.stats.bestStreak = 11; State.touch(true);     // A: C0 + 1
        return Sync.sync();
      }).then(function () {
        eq(CL.row.state.stats.bestStreak, 11, 'A в облаке');
        T.use(b, true);
        State.s.stats.bestStreak = 22; State.touch(true);     // B: тоже C0 + 1
        eq(State.s.meta.updatedAt, CL.row.state.meta.updatedAt, 'штампы совпали');
        Sync.init();
        return Sync.whenIdle();
      }).then(function () {
        var all = [State.s.stats.bestStreak, CL.row.state.stats.bestStreak]
          .concat(Sync.snapshots().map(function (x) { return x.state.stats.bestStreak; }));
        ok(all.indexOf(11) >= 0 && all.indexOf(22) >= 0, 'обе правки целы (рабочее, облако или снимок): ' + all.join(','));
        ok(Sync.snapshots().length >= 1 && Sync.state().conflict, 'снимок и плашка');
      });
    }));
  });

  describe('2.8.1 ревью A-3: страховочные снимки не вытесняют копию конфликта', function () {
    defer('копия конфликта и три записи клиента 2.8.0', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st), true);
      T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 11; });
      CL.put(T.base('2026-09-10T10:00:00.000Z', 22));
      Sync.init();
      var chain = Sync.whenIdle();
      [1, 2, 3].forEach(function (i) {
        chain = chain.then(function () {
          CL.put(T.base('2026-09-1' + i + 'T12:00:00.000Z', 30 + i));   // 2.8.0 пишет не глядя
          return Sync.sync();
        });
      });
      return chain.then(function () {
        var sn = Sync.snapshots();
        ok(sn.some(function (x) { return x.side === 'local' && x.state.stats.bestStreak === 11; }), 'копия конфликта на месте');
        eq(sn.filter(function (x) { return x.side === 'safety'; }).length, 1, 'страховочная — одна');
        ok(sn.length <= 3, 'не больше трёх');
      });
    }));
  });

  describe('2.8.1 ревью A-3: первый вход на устройстве с настоящими данными', function () {
    defer('облако старше — рабочим остаётся своё, облако снимком', T.guard(function () {
      CL.reset(); CL.put(T.base('2026-01-10T08:00:00.000Z', 3));
      T.use(T.device('X'), true);
      T.edit('2026-09-10T08:00:00.000Z', function (s) {
        s.onboarded = true; s.stats.bestStreak = 40;
        s.days['2026-09-10'] = { level: 'min', addons: [], lessons: [], points: 1 };
      });
      return Sync.signIn('a@b.c', 'pass').then(function () {
        eq([State.s.stats.bestStreak, CL.row.state.stats.bestStreak], [40, 40], 'своё рабочее и в облаке');
        eq(Sync.snapshots()[0].state.stats.bestStreak, 3, 'облако — снимком');
      });
    }));
  });

  describe('2.8.1 ревью A-3: запись соседней вкладки в окно сохранения — с плашкой', function () {
    defer('снимок «соседняя вкладка» и плашка', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      T.use(T.synced('A', st));
      return Sync.whenIdle().then(function () {
        State.s.stats.bestStreak = 6;
        State.touch(true);
        STORE['study-system-v2'] = JSON.stringify(T.base('2026-09-10T09:30:00.000Z', 44));
        Sync.onStorage({ key: 'study-system-v2' });
        var sn = Sync.snapshots()[0];
        eq([sn.side, sn.device, sn.state.stats.bestStreak], ['tab', 'соседняя вкладка этого браузера', 44], 'снимок');
        eq(Sync.state().conflict, true, 'плашка');
        return T.wait(200);
      });
    }));
  });

  describe('2.8.1 ревью A-3: метка попытки не снимается, пока облако на её базе', function () {
    defer('чужой заход во время записи не превращает опоздавший ответ в конфликт', T.guard(function () {
      var st = T.base('2026-09-10T08:00:00.000Z', 5);
      CL.reset(); CL.put(st);
      var realReq = Sync.limits.req, realBpm = Sync.limits.bytesPerMs;
      Sync.limits.req = 20;
      Sync.limits.bytesPerMs = 1e9;           // без надбавки за размер тела
      T.use(T.synced('A', st), true);
      T.edit('2026-09-10T09:00:00.000Z', function (s) { s.stats.bestStreak = 6; });
      var late = true;
      window.__fetch = function (url, o) {
        if (late && o && o.method === 'PATCH') {
          late = false;
          var body = o.body;
          setTimeout(function () { CL.fetch(url, { method: 'PATCH', body: body }); }, 30);  // ляжет позже
          return new Promise(function () {});
        }
        return CL.fetch(url, o);
      };
      Sync.init();
      return Sync.whenIdle().then(function () {
        // другая вкладка успела прочитать облако на базе — метка должна пережить
        var a = JSON.parse(STORE['study-system-v2-attempt'] || 'null');
        ok(!!a, 'метка попытки есть');
        return T.wait(60);
      }).then(function () {
        T.edit('2026-09-10T09:05:00.000Z', function (s) { s.stats.bestStreak = 7; });
        return Sync.sync();
      }).then(function (r) {
        Sync.limits.req = realReq; Sync.limits.bytesPerMs = realBpm;
        eq([r.conflict, CL.row.state.stats.bestStreak, Sync.snapshots().length], [undefined, 7, 0], 'без ложного конфликта');
      }, function (e) { Sync.limits.req = realReq; Sync.limits.bytesPerMs = realBpm; throw e; });
    }));
  });
})();
