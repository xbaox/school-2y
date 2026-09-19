/* ============================================================
   sync.js — облачная синхронизация через Supabase (раздел 3 ТЗ).

   Без SDK и CDN: голый fetch по REST и Auth эндпоинтам, чтобы офлайн
   ничего не тянул из сети.

   2.8.1 (часть A) — синк без потери данных. Любой заход (старт, таймер
   после правки, сеть вернулась, возврат на вкладку, кнопки Настроек)
   начинается с чтения облака и решает по lastSyncedAt — updatedAt того
   состояния, с которым устройство последний раз сошлось с облаком:
   - облако не менялось — отдаём локальные правки, если они есть;
   - облако новее, своих правок нет — берём облако;
   - облако новее и свои правки есть — конфликт: рабочим остаётся состояние
     с большим updatedAt, проигравшее целиком ложится в снимки этого
     браузера (последние три), на «Сегодня» — плашка.
   Запись в облако условная: строка меняется, только если в ней всё ещё то,
   что прочитано в начале захода. Иначе между чтением и записью успело
   записать другое устройство — заход повторяется с чтения.
   localStorage остаётся рабочим кэшем и полным источником без сети.

   anon-ключ публичный по назначению: доступ к данным закрывают
   политики RLS (см. spec/ и README) — строка app_state видна только
   своему auth.uid().
   ============================================================ */

window.Sync = (function () {
  'use strict';

  var URL_BASE = 'https://myvhwicdrqfzvsirkonh.supabase.co';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dmh3aWNkcnFmenZzaXJrb25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNDczODUsImV4cCI6MjEwMjgyMzM4NX0.9rlTwojhssYBugaldfwn_3Dmf54mBit0km9pN54ZmE8';

  /** Тексты наружу — только человеческие; сырые ответы уходят в console.error. */
  var AUTH_LOST = 'Облако не узнало вход — зайди заново';
  var RACE_LOST = 'Облако меняют с другого устройства прямо сейчас — повторю позже';
  var SNAP_FULL = 'Два устройства правили одно и то же, а копию сохранить некуда — ' +
    'память браузера полна. Скачай JSON в «Резервной копии»';

  var SESSION_KEY = 'study-system-v2-session';
  /** 2.8.1 (A1): lastSyncedAt — updatedAt того состояния, с которым устройство
      последний раз сошлось с облаком (успешный pull или push). Живёт только
      в этом браузере и в облако не уходит: { user, at }. Переживает закрытие
      вкладки — по ней видно, что локальные правки ещё не уехали. */
  var SYNCED_KEY = 'study-system-v2-synced';
  /** Метка 2.8.0 и раньше — время последнего push. Читается один раз как
      lastSyncedAt, пока новой метки нет, и убирается при первой записи. */
  var PUSHED_KEY = 'study-system-v2-pushed';
  /** Метка «вход отвалился». Переживает перезагрузку: сессия при этом стёрта,
      и без метки протухший вход выглядел бы как «просто не подключено» —
      человек продолжал бы работать, думая что синхронизация идёт. */
  var LOST_KEY = 'study-system-v2-authlost';
  /** 2.8.1 (A2): снимки проигравших в конфликте состояний — только локально. */
  var SNAP_KEY = 'study-system-v2-snapshots';
  /** Конфликт случился, а плашку на «Сегодня» ещё не открывали. */
  var CONFLICT_KEY = 'study-system-v2-conflict';
  /** Короткая метка этого браузера: снимок называет устройство. */
  var DEVICE_KEY = 'study-system-v2-device';
  var SNAP_MAX = 3;
  /** Сколько раз подряд заход проигрывает гонку записи, прежде чем отложиться. */
  var RACE_TRIES = 3;
  var PUSH_DEBOUNCE = 2000;

  var session = null;      // { access_token, refresh_token, expires_at, user_id, email }
  var timer = null;
  var status = 'off';      // off | idle | syncing | queued | error
  var lost = false;        // вход недействителен — это не отсутствие сети
  var lastSync = null;
  var lastError = null;
  var listeners = [];

  /** Эпоха входа: растёт на каждом входе и выходе. Ответ, пришедший из
      прошлой эпохи, к новому заходу не применяется. */
  var epoch = 0;
  var running = null;      // промис идущего захода — заходы не перекрываются
  var again = false;       // за время захода попросили ещё один

  function available() { return !!(URL_BASE && ANON_KEY); }
  function signedIn() { return !!(session && session.access_token); }

  /** Все сравнения времён — только через Date.parse: строки ISO из разных
      источников (локальная правка, столбец updated_at) сравнивать как текст нельзя. */
  function ts(v) {
    var n = Date.parse(v || '');
    return isNaN(n) ? 0 : n;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /**
   * С каким состоянием устройство последний раз сошлось с облаком. Метка
   * другого аккаунта не считается: вход под другой почтой — другое облако.
   */
  function lastSyncedAt() {
    var uid = session && session.user_id;
    try {
      var raw = localStorage.getItem(SYNCED_KEY);
      if (!raw) return localStorage.getItem(PUSHED_KEY) || null;
      var o = JSON.parse(raw);
      if (!o || !o.at) return null;
      if (uid && o.user && o.user !== uid) return null;
      return o.at;
    } catch (e) { return null; }
  }

  function setLastSyncedAt(iso) {
    try {
      localStorage.removeItem(PUSHED_KEY);
      if (iso) localStorage.setItem(SYNCED_KEY, JSON.stringify({ user: (session && session.user_id) || null, at: iso }));
      else localStorage.removeItem(SYNCED_KEY);
    } catch (e) { /* приватный режим — переживём */ }
  }

  /**
   * Есть ли локальные правки, которые ещё не уехали в облако. Устройство,
   * ни разу не сходившееся с облаком, считает своими правками всё, что у него
   * есть: пустое состояние не в счёт.
   */
  function hasUnpushed() {
    var at = lastSyncedAt();
    if (!at) return hasLocalData();
    return ts(State.s.meta.updatedAt) > ts(at);
  }

  /** Есть ли вообще что отдавать: пустое состояние облако затирать не должно. */
  function hasLocalData() {
    var s = State.s;
    return !!(s.onboarded || (s.summaries && s.summaries.length) ||
      Object.keys(s.days || {}).length);
  }

  function state() {
    return {
      status: status, lastSync: lastSync, error: lastError,
      email: session && session.email, authLost: lost, conflict: conflictPending()
    };
  }

  function onChange(fn) { listeners.push(fn); }
  function emit() {
    listeners.forEach(function (f) { try { f(state()); } catch (e) { console.error(e); } });
    // перерисовываем «Настройки» только когда вход уже сделан: иначе смена
    // статуса снесёт форму входа вместе с введённым текстом и сообщением об ошибке
    if (window.App && App.active === 'settings' && signedIn()) App.renderScreen('settings');
  }

  function setStatus(s, err) {
    status = s;
    lastError = err || null;
    emit();
  }

  /* ---------- устройство и снимки ---------- */

  /** «iPhone · Safari · k3f9» — по снимку видно, чья это была правка. */
  function deviceLabel() {
    var id = null;
    try {
      id = localStorage.getItem(DEVICE_KEY);
      if (!id) { id = Math.random().toString(36).slice(2, 6); localStorage.setItem(DEVICE_KEY, id); }
    } catch (e) { id = id || '—'; }
    var ua = (window.navigator && navigator.userAgent) || '';
    var os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' :
      /Macintosh|Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'устройство';
    var br = /Edg\//.test(ua) ? 'Edge' : /Firefox\/|FxiOS/.test(ua) ? 'Firefox' :
      /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
    return os + (br ? ' · ' + br : '') + ' · ' + id;
  }

  function snapshots() {
    try {
      var list = JSON.parse(localStorage.getItem(SNAP_KEY) || '[]');
      return Array.isArray(list) ? list.filter(function (x) { return x && x.state && x.state.meta; }) : [];
    } catch (e) { return []; }
  }

  /** Запись списка; false — память браузера не приняла. */
  function writeSnapshots(list) {
    try {
      if (list.length) localStorage.setItem(SNAP_KEY, JSON.stringify(list));
      else localStorage.removeItem(SNAP_KEY);
      return true;
    } catch (e) {
      console.error('[sync] снимок не сохранился', e);
      return false;
    }
  }

  /**
   * side: 'local' — проиграло состояние этого браузера, 'cloud' — облака,
   * 'working' — рабочее, отложенное кнопкой «Сделать рабочим».
   */
  function snapEntry(st, side) {
    var meta = (st && st.meta) || {};
    return {
      id: 'sn' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      savedAt: new Date().toISOString(),
      updatedAt: meta.updatedAt || null,
      side: side,
      device: side === 'cloud' ? (meta.device || 'другое устройство') : deviceLabel(),
      state: st
    };
  }

  /**
   * Кладёт проигравшее состояние в начало списка, держит последние три.
   * Тот же снимок (сторона и updatedAt) второй раз не копится. false —
   * сохранить некуда: тогда конфликт не разрешается вовсе, ничего не теряем.
   */
  function addSnapshot(st, side) {
    var e = snapEntry(clone(st), side);
    var list = snapshots().filter(function (x) {
      return !(x.side === side && ts(x.updatedAt) === ts(e.updatedAt));
    });
    list.unshift(e);
    return writeSnapshots(list.slice(0, SNAP_MAX));
  }

  function conflictPending() {
    try { return localStorage.getItem(CONFLICT_KEY) === '1'; } catch (e) { return false; }
  }

  function setConflict(v) {
    try {
      if (v) localStorage.setItem(CONFLICT_KEY, '1');
      else localStorage.removeItem(CONFLICT_KEY);
    } catch (e) { /* приватный режим — переживём */ }
  }

  /** Плашку открыли — снимки на месте, напоминание больше не нужно. */
  function ackConflict() {
    if (!conflictPending()) return;
    setConflict(false);
    emit();
  }

  /**
   * «Сделать рабочим»: снимок становится локальным состоянием и уходит в
   * облако с новым updatedAt. Рабочее состояние не выбрасывается — оно
   * занимает место снимка в списке, так что ни одна копия не вытесняется.
   */
  function restoreSnapshot(id) {
    var list = snapshots();
    var snap = null;
    list.forEach(function (x) { if (x.id === id) snap = x; });
    if (!snap) return false;
    var rest = list.filter(function (x) { return x.id !== id; });
    rest.unshift(snapEntry(clone(State.s), 'working'));
    if (!writeSnapshots(rest.slice(0, SNAP_MAX))) return false;
    // новый updatedAt строго позже всего, что устройство знает: часы могут
    // отставать, и «сейчас» оказалось бы старше облака — копия снова проиграла бы
    var floor = Math.max(ts(State.s.meta.updatedAt), ts(lastSyncedAt()));
    State.replace(clone(snap.state), true);
    State.syncContent();
    if (window.Radar && Radar.seedQuestions) Radar.seedQuestions();
    State.touch(true);             // это теперь свежая правка
    if (ts(State.s.meta.updatedAt) <= floor) {
      State.s.meta.updatedAt = new Date(floor + 1).toISOString();
      State.save();
    }
    setConflict(false);
    emit();
    if (signedIn()) sync();
    return true;
  }

  /** «Скачать JSON» снимка: то же, что резервная копия, но из снимка. */
  function snapshotFile(id) {
    var snap = null;
    snapshots().forEach(function (x) { if (x.id === id) snap = x; });
    if (!snap) return null;
    var d = new Date(snap.savedAt);
    var stamp = isNaN(d) ? 'копия' : U.iso(d) + '-' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2);
    return { name: 'study-v2-snapshot-' + stamp + '.json', text: JSON.stringify(snap.state, null, 2) };
  }

  /* ---------- сессия ---------- */

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      session = raw ? JSON.parse(raw) : null;
    } catch (e) { session = null; }
    return session;
  }

  function saveSession(s) {
    session = s;
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* приватный режим — переживём */ }
  }

  /** Новая эпоха: всё, что было в полёте, больше ничего не решает. */
  function newEpoch() {
    epoch++;
    running = null;
    again = false;
    if (timer) { clearTimeout(timer); timer = null; }
  }

  /**
   * Вход недействителен: облако перестало принимать refresh-токен.
   * Отдельный признак, а не «нет сессии»: у никогда не входившего его нет,
   * а у отвалившегося он есть — и по нему «Сегодня» рисует плашку.
   */
  function authLost() { return lost; }

  function setAuthLost(v) {
    lost = !!v;
    try {
      if (lost) localStorage.setItem(LOST_KEY, '1');
      else localStorage.removeItem(LOST_KEY);
    } catch (e) { /* приватный режим — переживём */ }
  }

  function loadAuthLost() {
    try { lost = localStorage.getItem(LOST_KEY) === '1'; } catch (e) { lost = false; }
    return lost;
  }

  /**
   * Отказ именно авторизации. Сетевая беда и 5xx сюда не попадают: по ним
   * вход гасить нельзя, иначе выпадение связи выглядело бы как выход
   * из облака, а очередь и так догоняет сама.
   */
  function authError() {
    var e = new Error(AUTH_LOST);
    e.auth = true;
    return e;
  }

  /** Ответ из прошлой эпохи: молча выходим, ничего не трогая. */
  function staleError() {
    var e = new Error('устаревший ответ');
    e.stale = true;
    return e;
  }

  function fromAuth(json) {
    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Date.now() + (json.expires_in || 3600) * 1000,
      user_id: json.user && json.user.id,
      email: json.user && json.user.email
    };
  }

  /* ---------- запросы ---------- */

  function req(path, opts) {
    opts = opts || {};
    var headers = { apikey: ANON_KEY, 'Content-Type': 'application/json' };
    Object.keys(opts.headers || {}).forEach(function (k) { headers[k] = opts.headers[k]; });
    if (session && session.access_token && !opts.noAuth) {
      headers.Authorization = 'Bearer ' + session.access_token;
    }
    return fetch(URL_BASE + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
  }

  function refreshToken(my) {
    if (!session || !session.refresh_token) return Promise.reject(authError());
    return req('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', noAuth: true, body: { refresh_token: session.refresh_token }
    }).then(function (r) {
      if (my !== epoch) throw staleError();
      if (r.ok) return r.json();
      // 400/401/403 — токен отозван или протух насовсем: вход больше не действует.
      // Всё остальное (5xx, шлюз) временно, входа не касается.
      if (r.status === 400 || r.status === 401 || r.status === 403) throw authError();
      throw new Error('Облако не ответило (ошибка ' + r.status + ')');
    }).then(function (j) {
      // пока ждали, вошли заново: чужой ответ новую сессию не перезаписывает
      if (my !== epoch) throw staleError();
      saveSession(fromAuth(j));
    });
  }

  /** Обновляет токен, если он вот-вот истечёт. */
  function ensureToken(my) {
    if (!signedIn()) return Promise.reject(new Error('нет сессии'));
    if (session.expires_at && Date.now() < session.expires_at - 60000) return Promise.resolve();
    return refreshToken(my).catch(function (e) {
      // протухший refresh на старте — тот же отвалившийся вход, что и 401:
      // раньше он молча оседал строкой статуса в Настройках и наружу не выходил
      throw (e && e.auth) ? sessionLost(my) : e;
    });
  }

  /**
   * Облако перестало узнавать вход: сессию гасим, дальше решает пользователь.
   * 2.8.1 (A4): lastSyncedAt остаётся — по нему после нового входа видно,
   * какие правки не уехали, и заход отдаст их, а не заменит облаком.
   */
  function sessionLost(my) {
    if (my !== undefined && my !== epoch) return staleError();
    saveSession(null);
    newEpoch();
    setAuthLost(true);          // до setStatus: слушатели уже спрашивают признак
    setStatus('error', AUTH_LOST);
    // emit() рисует «Настройки» только для вошедшего — тут дорисовываем сами
    if (window.App && App.active === 'settings') App.renderScreen('settings');
    var e = new Error(AUTH_LOST);
    e.authLost = true;
    return e;
  }

  /**
   * Запрос с авторизацией. На 401 — ровно один refresh и повтор;
   * повторный отказ означает, что вход больше не действует.
   */
  function authed(path, opts, my) {
    return ensureToken(my)
      .then(function () {
        if (my !== epoch) throw staleError();
        return req(path, opts);
      })
      .then(function (r) {
        if (my !== epoch) throw staleError();
        if (r.status !== 401) return r;
        return refreshToken(my).then(
          function () { return req(path, opts); },
          // связь могла отвалиться ровно между 401 и refresh — это не выход
          function (e) { throw (e && e.auth) ? sessionLost(my) : e; }
        ).then(function (r2) {
          if (my !== epoch) throw staleError();
          if (r2.status === 401) throw sessionLost(my);
          return r2;
        });
      });
  }

  /* ---------- вход и выход ---------- */

  /** Ответ сервера наружу не показываем — только то, что можно сделать. */
  function loginError(status) {
    if (status === 400 || status === 401) return 'Почта или пароль не подошли';
    if (status === 422) return 'Проверь почту и пароль — что-то в них не так';
    if (status === 429) return 'Слишком много попыток — подожди минуту и повтори';
    return 'Не вышло войти (ошибка ' + status + '). Проверь связь и повтори';
  }

  function signIn(email, password) {
    setStatus('syncing');
    newEpoch();
    var my = epoch;
    return req('/auth/v1/token?grant_type=password', {
      method: 'POST', noAuth: true, body: { email: email, password: password }
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) {
          console.error('[sync] signIn', r.status, j);
          throw new Error(loginError(r.status));
        }
        return j;
      });
    }).then(function (j) {
      if (my !== epoch) throw staleError();
      newEpoch();
      saveSession(fromAuth(j));
      setAuthLost(false);
      setStatus('idle');
      // после входа — тот же заход: сначала облако, потом свои правки
      return sync();
    }).catch(function (e) {
      // вход прервали выходом или вторым входом — старый ответ ничего не решает
      if (e.stale) throw new Error('Вход прерван — повтори');
      setStatus('error', e.message);
      throw e;
    });
  }

  /** lastSyncedAt не стирается: при входе в тот же аккаунт он снова в деле. */
  function signOut() {
    if (signedIn()) req('/auth/v1/logout', { method: 'POST' }).catch(function () { });
    newEpoch();
    saveSession(null);
    setAuthLost(false);
    lastSync = null;
    setStatus('off');
  }

  /* ---------- заход: чтение облака, решение, условная запись ---------- */

  /**
   * Один заход синка. Заходы не перекрываются: попросили во время захода —
   * ещё один пройдёт следом. force — «Забрать из облака»: облако берётся
   * всегда, неотправленные правки при этом ложатся в снимки.
   */
  function sync(opts) {
    opts = opts || {};
    if (!signedIn()) return Promise.resolve({ ok: false, reason: 'нет входа' });
    if (!navigator.onLine) {
      setStatus('queued');
      return Promise.resolve({ ok: false, offline: true });
    }
    if (running) {
      if (opts.force) return running.then(function () { return sync(opts); });
      again = true;
      return running;
    }
    var my = epoch;
    var p = round(opts, my, 0).then(function (res) {
      if (running === p) running = null;
      if (my === epoch && again) { again = false; return sync(); }
      return res;
    });
    running = p;
    return p;
  }

  /** Промис, который сбудется, когда заходов в полёте не останется. */
  function whenIdle() {
    return running ? running.then(whenIdle, whenIdle) : Promise.resolve();
  }

  function stale() { return { ok: false, stale: true }; }

  function done(res) {
    lastSync = new Date().toISOString();
    setStatus('idle');
    return res;
  }

  function round(opts, my, tries) {
    setStatus('syncing');
    return authed('/rest/v1/app_state?user_id=eq.' + encodeURIComponent(session.user_id) +
      '&select=state,updated_at&limit=1', null, my).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          console.error('[sync] pull', r.status, t);
          throw new Error('Облако не отдало состояние (ошибка ' + r.status + ')');
        });
      }
      return r.json();
    }).then(function (rows) {
      if (my !== epoch) return stale();
      return decide(rows && rows[0], opts, my, tries);
    }).catch(function (e) {
      if (e.stale || my !== epoch) return stale();
      if (!e.authLost) setStatus(navigator.onLine ? 'error' : 'queued', e.message);
      return { ok: false, error: e.message };
    });
  }

  /** Решение по прочитанному — с локальным состоянием на момент ответа. */
  function decide(row, opts, my, tries) {
    var cloud = row && row.state && row.state.meta ? row.state : null;
    if (!cloud) {
      // в облаке пусто — отдаём своё, если оно не пустое
      if (!hasLocalData()) return done({ ok: true, applied: false, empty: true });
      return send(row, opts, my, tries, { empty: true });
    }

    var cloudAt = cloud.meta.updatedAt || row.updated_at || '';
    var localAt = State.s.meta.updatedAt || '';
    var synced = lastSyncedAt();
    var unsent = hasUnpushed();

    if (opts.force) {
      // «Забрать из облака» — облако берётся, но свои неотправленные правки
      // молча не пропадают
      var saved = false;
      if (unsent && ts(localAt) !== ts(cloudAt)) {
        if (!addSnapshot(State.s, 'local')) return full();
        saved = true;
      }
      apply(cloud, cloudAt);
      return done({ ok: true, applied: true, at: cloudAt, saved: saved });
    }

    var changed = !synced || ts(cloudAt) !== ts(synced);
    if (!changed) {
      if (!unsent) return done({ ok: true, applied: false, at: cloudAt });
      return send(row, opts, my, tries, {});
    }
    // одна и та же правка (тот же updatedAt) — это не конфликт, а схождение
    if (ts(localAt) === ts(cloudAt)) {
      setLastSyncedAt(cloudAt);
      return done({ ok: true, applied: false, at: cloudAt });
    }
    // облако поменялось и оно новее, своих правок нет — берём облако.
    // Поменялось, но старше нашего — его записал кто-то со старым состоянием
    // (клиент до 2.8.1 пишет не глядя): это тоже конфликт, иначе потеря
    // из облака молча доехала бы и сюда
    if (!unsent && ts(cloudAt) > ts(localAt)) {
      apply(cloud, cloudAt);
      return done({ ok: true, applied: true, at: cloudAt });
    }

    // конфликт: рабочим остаётся состояние с большим updatedAt
    if (ts(localAt) > ts(cloudAt)) {
      if (!addSnapshot(cloud, 'cloud')) return full();
      setConflict(true);
      return send(row, opts, my, tries, { conflict: true });
    }
    if (!addSnapshot(State.s, 'local')) return full();
    setConflict(true);
    apply(cloud, cloudAt);
    return done({ ok: true, applied: true, at: cloudAt, conflict: true });
  }

  function full() {
    setStatus('error', SNAP_FULL);
    return { ok: false, error: SNAP_FULL };
  }

  /** Облако становится локальным состоянием. */
  function apply(cloud, cloudAt) {
    State.replace(cloud);
    setLastSyncedAt(cloudAt);          // ровно это состояние в облаке и лежит
    // контент и посев выводятся из пакета и updatedAt не двигают
    State.syncContent();
    // облако могло приехать с состоянием до посева карточки вопросов —
    // достраиваем его тут же, иначе пункты вернутся только к следующей загрузке
    if (window.Radar && Radar.seedQuestions) Radar.seedQuestions();
    if (window.App) App.render();
  }

  /**
   * Условная запись. Строка есть — PATCH только при том updated_at, что
   * прочитан в начале захода (0 строк в ответе — нас опередили); строки нет —
   * вставка без слияния (409 — нас опередили). Проиграли гонку — заход
   * повторяется с чтения.
   */
  function send(row, opts, my, tries, extra) {
    var body = clone(State.s);
    var stamp = body.meta.updatedAt || new Date().toISOString();
    body.meta.updatedAt = stamp;
    body.meta.device = deviceLabel();
    var q;
    if (row) {
      var cond = row.updated_at == null ? 'is.null' : 'eq.' + encodeURIComponent(row.updated_at);
      q = authed('/rest/v1/app_state?user_id=eq.' + encodeURIComponent(session.user_id) +
        '&updated_at=' + cond + '&select=updated_at', {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: { state: body, updated_at: stamp }
      }, my).then(function (r) {
        if (r.ok) return r.json().then(function (j) { return Array.isArray(j) && j.length > 0; });
        return fail(r);
      });
    } else {
      q = authed('/rest/v1/app_state', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: [{ user_id: session.user_id, state: body, updated_at: stamp }]
      }, my).then(function (r) {
        if (r.ok) return true;
        if (r.status === 409) return false;
        return fail(r);
      });
    }
    return q.then(function (won) {
      if (my !== epoch) return stale();
      if (!won) {
        if (tries + 1 >= RACE_TRIES) throw new Error(RACE_LOST);
        return round(opts, my, tries + 1);
      }
      setLastSyncedAt(stamp);
      var res = { ok: true, pushed: true, at: stamp };
      Object.keys(extra || {}).forEach(function (k) { res[k] = extra[k]; });
      return done(res);
    });
  }

  function fail(r) {
    return r.text().then(function (t) {
      console.error('[sync] push', r.status, t);
      throw new Error('Облако не приняло состояние (ошибка ' + r.status + ')');
    });
  }

  /** «Забрать из облака». */
  function pull(force) { return sync({ force: !!force }); }

  /** «Отправить сейчас» — тоже начинается с чтения облака. */
  function push() { return sync(); }

  /** Дёргается из State.touch() при каждом изменении. */
  function onLocalChange() {
    if (!signedIn()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      sync();
    }, PUSH_DEBOUNCE);
    if (status === 'idle') setStatus('queued');
  }

  /** Догоняем облако при появлении сети и при возврате на вкладку. */
  function flush() {
    if (!signedIn() || !navigator.onLine) return;
    sync();
  }

  /** Старт: заход, как и любой другой, начинается с чтения облака. */
  function init() {
    loadSession();
    loadAuthLost();
    // слушатели ставим всегда: вход может случиться позже, из Настроек или
    // онбординга, и очередь должна догоняться без перезапуска приложения
    bindNetworkListeners();
    // метка живёт до нового входа: перезапуск приложения протухший вход
    // не чинит, и плашка на «Сегодня» обязана вернуться вместе с ним
    if (!signedIn()) { setStatus(lost ? 'error' : 'off', lost ? AUTH_LOST : null); return; }
    newEpoch();
    setAuthLost(false);
    setStatus('idle');
    sync();
  }

  var bound = false;

  function bindNetworkListeners() {
    if (bound) return;
    bound = true;
    window.addEventListener('online', function () {
      if (!signedIn()) return;
      UI.toast('Сеть вернулась — догоняю облако', '', 2200);
      flush();
    });
    window.addEventListener('offline', function () {
      if (signedIn()) setStatus('queued');
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden || !signedIn()) return;
      flush();
    });
  }

  /* ---------- форма входа (онбординг и настройки) ---------- */

  function loginFormHtml() {
    return '<div class="login">' +
      '<input class="txt" type="email" autocomplete="username" inputmode="email" data-email placeholder="почта">' +
      '<input class="txt" style="margin-top:8px" type="password" autocomplete="current-password" data-pass placeholder="пароль">' +
      '<div class="login-err tiny r" style="margin-top:8px"></div>' +
      '<button class="btn pr" style="margin-top:10px" data-signin>Войти в облако</button>' +
      '</div>';
  }

  /** Привязывает обработчики к форме внутри root. cb(result) — после успеха. */
  function wireLoginForm(root, cb) {
    var btn = root.querySelector('[data-signin]');
    if (!btn) return;
    var err = root.querySelector('.login-err');
    btn.onclick = function () {
      var email = (root.querySelector('[data-email]').value || '').trim();
      var pass = root.querySelector('[data-pass]').value || '';
      if (!email || !pass) { err.textContent = 'Введи почту и пароль'; return; }
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Вхожу…';
      signIn(email, pass).then(function (res) {
        UI.toast('Вход выполнен', 'ok');
        if (cb) cb(res || {});
      }).catch(function (e) {
        err.textContent = e.message;
        btn.disabled = false;
        btn.textContent = 'Войти в облако';
      });
    };
  }

  function statusText() {
    if (!signedIn()) return 'не подключено';
    if (status === 'syncing') return 'синхронизирую…';
    if (status === 'queued') return navigator.onLine ? 'ждёт отправки' : 'офлайн — очередь';
    if (status === 'error') return 'ошибка: ' + (lastError || 'неизвестно');
    if (lastSync) {
      var d = new Date(lastSync);
      return 'синхронизировано в ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    }
    return 'подключено';
  }

  return {
    available: available, signedIn: signedIn, authLost: authLost,
    state: state, status: statusText,
    init: init, signIn: signIn, signOut: signOut, pull: pull, push: push, sync: sync, whenIdle: whenIdle,
    onLocalChange: onLocalChange, flush: flush, onChange: onChange,
    lastSyncedAt: lastSyncedAt, lastPushedAt: lastSyncedAt, hasUnpushed: hasUnpushed,
    snapshots: snapshots, snapshotFile: snapshotFile, restoreSnapshot: restoreSnapshot, deviceLabel: deviceLabel,
    conflictPending: conflictPending, ackConflict: ackConflict,
    loginFormHtml: loginFormHtml, wireLoginForm: wireLoginForm,
    get email() { return session && session.email; }
  };
})();
