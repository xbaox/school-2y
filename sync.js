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
  /** Сеть или облако не ответили вовсе (fetch упал, ответ не пришёл). */
  var NET_DOWN = 'Нет связи с облаком — повторю сам';
  var NO_SPACE = 'Память браузера полна — облачное состояние не легло. Скачай JSON в «Резервной копии»';
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
  /** req — запрос без ответа дольше этого считается сетевой бедой (иначе один
      зависший fetch держал бы все следующие заходы); retry — повтор после
      ошибки: 30 с, 1, 2, 4 мин, дальше раз в 5 мин. Тесты их укорачивают. */
  var LIMITS = { req: 20000, retryBase: 30000, retryMax: 300000, bytesPerMs: 2 };

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
  var retryTimer = null;
  var retryN = 0;
  /** updatedAt записи, ответ на которую не дошёл (таймаут, обрыв): облако с
      этим штампом — наше собственное, а не чужая правка. */
  var ATTEMPT_KEY = 'study-system-v2-attempt';

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

  /** Метка схождения стоит от другого аккаунта: вход под другой почтой. */
  function foreignMarker() {
    var uid = session && session.user_id;
    try {
      var o = JSON.parse(localStorage.getItem(SYNCED_KEY) || 'null');
      return !!(uid && o && o.user && o.user !== uid);
    } catch (e) { return false; }
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
      device: side === 'cloud' ? (meta.device || 'другое устройство') :
        (side === 'tab' ? 'соседняя вкладка этого браузера' : deviceLabel()),
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
    return writeSnapshots(trim(list));
  }

  /**
   * Три последние копии. Страховочная ('safety': облако записала версия до
   * 2.8.1) — не больше одной и уходит первой: она не должна вытеснять копию
   * настоящего конфликта, о которой говорит плашка.
   */
  function trim(list) {
    var seenSafety = false;
    var out = list.filter(function (x) {
      if (x.side !== 'safety') return true;
      if (seenSafety) return false;
      seenSafety = true;
      return true;
    });
    if (out.length > SNAP_MAX && seenSafety) {
      out = out.filter(function (x) { return x.side !== 'safety'; });
    }
    return out.slice(0, SNAP_MAX);
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
    var before = clone(State.s);
    if (!State.replace(clone(snap.state), true)) {
      State.replace(before, true);
      writeSnapshots(list);
      return false;
    }
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
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    retryN = 0;
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
    var e = herr(AUTH_LOST);
    e.auth = true;
    return e;
  }

  /** Ответ из прошлой эпохи: молча выходим, ничего не трогая. */
  function staleError() {
    var e = new Error('устаревший ответ');
    e.stale = true;
    return e;
  }

  /** Ошибка с человеческим текстом — её можно показывать как есть. */
  function herr(msg) {
    var e = new Error(msg);
    e.human = true;
    return e;
  }

  /** Незнакомые ошибки (fetch, разбор JSON, обрыв) наружу не выходят. */
  function humanText(e) { return e && e.human ? e.message : NET_DOWN; }

  /** Таймер, который не держит процесс (в браузере unref нет — это для тестов под node). */
  function later(fn, ms) {
    var t = setTimeout(fn, ms);
    if (t && t.unref) t.unref();
    return t;
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
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = null;
    var sent = fetch(URL_BASE + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined
    });
    var timeout = new Promise(function (resolve, reject) {
      t = later(function () {
        if (ctrl) { try { ctrl.abort(); } catch (e) { /* уже закрыт */ } }
        reject(new Error('timeout'));
      }, LIMITS.req + (opts.body ? Math.round(JSON.stringify(opts.body).length / LIMITS.bytesPerMs) : 0));
    });
    // таймаут покрывает и чтение тела: заголовки могут прийти, а тело — нет,
    // и заход висел бы в «синхронизирую…» до перезагрузки
    var whole = sent.then(function (r) {
      return r.text().then(function (text) {
        return {
          ok: r.ok, status: r.status,
          text: function () { return Promise.resolve(text); },
          json: function () { return Promise.resolve().then(function () { return JSON.parse(text); }); }
        };
      });
    });
    return Promise.race([whole, timeout]).then(
      function (r) { clearTimeout(t); return r; },
      function (e) { clearTimeout(t); throw e; });
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
      throw herr('Облако не ответило (ошибка ' + r.status + ')');
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
    var e = herr(AUTH_LOST);
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
      // шлюз может ответить HTML-страницей — разбор не должен выйти наружу
      return r.json().then(null, function () { return null; }).then(function (j) {
        if (!r.ok) {
          console.error('[sync] signIn', r.status, j);
          throw herr(loginError(r.status));
        }
        if (!j || !j.access_token) throw herr('Облако ответило непонятно — повтори вход');
        return j;
      });
    }).then(function (j) {
      if (my !== epoch) throw staleError();
      newEpoch();
      my = epoch;
      saveSession(fromAuth(j));
      setAuthLost(false);
      setStatus('idle');
      // после входа — тот же заход: сначала облако, потом свои правки
      return sync();
    }).catch(function (e) {
      // вход прервали выходом или вторым входом — старый ответ ничего не решает
      if (e.stale || my !== epoch) throw herr('Вход прерван — повтори');
      var msg = e.human ? e.message : 'Нет связи с облаком — проверь сеть и повтори';
      setStatus('error', msg);
      throw herr(msg);
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
    retryN = 0;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    setStatus('idle');
    return res;
  }

  /** После ошибки заход повторится сам: событие online может и не прийти. */
  function scheduleRetry() {
    if (retryTimer || !signedIn()) return;
    var delay = Math.min(LIMITS.retryBase * Math.pow(2, retryN), LIMITS.retryMax);
    var my = epoch;
    retryN++;
    retryTimer = later(function () {
      retryTimer = null;
      if (my === epoch) sync();
    }, delay);
  }

  /**
   * Вторая вкладка того же браузера могла записать состояние поновее того,
   * что лежит в памяти этой: решать надо по свежему, иначе старое из памяти
   * ушло бы в облако поверх правок соседней вкладки.
   */
  function reloadIfNewerOnDisk() {
    try {
      var raw = localStorage.getItem(State.KEY);
      if (!raw || !State.diskStamp) return false;
      var disk = JSON.parse(raw);
      var at = disk && disk.meta && disk.meta.updatedAt;
      // на диске то, что эта вкладка сама записала или прочла, — никто не писал
      if (ts(at) === ts(State.diskStamp())) return false;
      // соседняя вкладка записала — неважно, новее или старее («Забрать из
      // облака», другой аккаунт кладут и более старое). Своей несохранённой
      // правки нет — перечитываем; есть — чужое не выбрасываем, а в снимок
      if (ts(State.s.meta.updatedAt) !== ts(State.diskStamp())) {
        if (addSnapshot(disk, 'tab')) setConflict(true);
        return false;
      }
      State.load();
      if (window.App) App.render();
      return true;
    } catch (e) { return false; }
  }

  function round(opts, my, tries) {
    setStatus('syncing');
    return authed('/rest/v1/app_state?user_id=eq.' + encodeURIComponent(session.user_id) +
      '&select=state,updated_at&limit=1', null, my).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          console.error('[sync] pull', r.status, t);
          throw herr('Облако не отдало состояние (ошибка ' + r.status + ')');
        });
      }
      return r.json();
    }).then(function (rows) {
      if (my !== epoch) return stale();
      return decide(rows && rows[0], opts, my, tries);
    }).catch(function (e) {
      if (e.stale || my !== epoch) return stale();
      if (e.authLost) return { ok: false, error: e.message };
      var msg = humanText(e);
      // облако ответило ошибкой — видно строкой; не ответило вовсе — очередь
      setStatus(e.human && navigator.onLine ? 'error' : 'queued', msg);
      scheduleRetry();
      return { ok: false, error: msg };
    });
  }

  /** Решение по прочитанному — с локальным состоянием на момент ответа. */
  function decide(row, opts, my, tries) {
    // соседняя вкладка могла записать новее, чем лежит в памяти этой
    reloadIfNewerOnDisk();
    var cloud = row && row.state && row.state.meta ? row.state : null;
    var cloudAt = cloud ? (cloud.meta.updatedAt || row.updated_at || '') : '';
    var localAt = State.s.meta.updatedAt || '';

    // запись, ответ на которую не дошёл, всё-таки легла: облако — наше
    var attempt = readAttempt();
    if (attempt && cloud && ts(attempt.at) === ts(cloudAt) && (attempt.rev || null) === (cloud.meta.rev || null)) {
      setLastSyncedAt(cloudAt);
      writeAttempt(null);
    } else if (attempt && !(cloud && ts(attempt.base) === ts(cloudAt))) {
      // облако ушло дальше базы попытки — попытка не легла; пока оно на базе,
      // запись может быть ещё в полёте (другой вкладки) — метку не трогаем
      writeAttempt(null);
    }

    // вход под другой почтой: здешнее состояние — чужого аккаунта. В чужое
    // облако его не льём: берём облако этого аккаунта, своё — снимком
    if (foreignMarker()) {
      if (!cloud) return send(row, cloudAt, opts, my, tries, { empty: true, account: true });
      var keep = hasLocalData() && ts(localAt) !== ts(cloudAt);
      if (keep && !addSnapshot(State.s, 'local')) return full();
      if (!apply(cloud, cloudAt)) return noSpace();
      if (keep) setConflict(true);
      return done({ ok: true, applied: true, at: cloudAt, account: true });
    }

    if (!cloud) {
      // в облаке пусто — отдаём своё, если оно не пустое
      if (!hasLocalData()) return done({ ok: true, applied: false, empty: true });
      return send(row, cloudAt, opts, my, tries, { empty: true });
    }

    // своего нет вовсе (новое устройство, онбординг) — облако берётся всегда:
    // пустое состояние со свежим updatedAt не должно перебить настоящее
    if (!hasLocalData()) {
      if (!apply(cloud, cloudAt)) return noSpace();
      return done({ ok: true, applied: true, at: cloudAt });
    }

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
      if (!apply(cloud, cloudAt)) return noSpace();
      return done({ ok: true, applied: true, at: cloudAt, saved: saved });
    }

    var changed = !synced || ts(cloudAt) !== ts(synced);
    if (!changed) {
      if (!unsent) return done({ ok: true, applied: false, at: cloudAt });
      return send(row, cloudAt, opts, my, tries, {});
    }
    // одна и та же правка (тот же updatedAt и та же метка правки) — схождение
    if (ts(localAt) === ts(cloudAt) && (State.s.meta.rev || null) === (cloud.meta.rev || null)) {
      setLastSyncedAt(cloudAt);
      return done({ ok: true, applied: false, at: cloudAt });
    }
    // облако поменялось и оно новее, своих правок нет — берём облако.
    // Поменялось, но старше нашего — его записал кто-то со старым состоянием
    // (клиент до 2.8.1 пишет не глядя): это тоже конфликт, иначе потеря
    // из облака молча доехала бы и сюда
    if (!unsent && ts(cloudAt) > ts(localAt)) {
      // 2.8.1 пишет в meta.base, поверх какого облака легла запись. Нет base —
      // писал клиент до 2.8.1, не глядя в облако: то, что у нас есть, могло
      // в его запись не попасть. Своё — снимком, без плашки: это страховка
      if (!writtenBy281(cloud) && !addSnapshot(State.s, 'safety')) return full();
      if (!apply(cloud, cloudAt)) return noSpace();
      return done({ ok: true, applied: true, at: cloudAt });
    }

    // конфликт: рабочим остаётся состояние с большим updatedAt. Устройство,
    // ни разу не сходившееся с этим облаком (онбординг без входа, потом вход
    // из Настроек), своих «правок поверх облака» не имеет — рабочим облако
    if ((synced || realLocal()) && ts(localAt) > ts(cloudAt)) {
      if (!addSnapshot(cloud, 'cloud')) return full();
      setConflict(true);
      return send(row, cloudAt, opts, my, tries, { conflict: true });
    }
    if (!addSnapshot(State.s, 'local')) return full();
    if (!apply(cloud, cloudAt)) return noSpace();
    setConflict(true);
    return done({ ok: true, applied: true, at: cloudAt, conflict: true });
  }

  /** Запись сделана 2.8.1 — её meta.base можно верить. */
  function writtenBy281(st) {
    var m = (st && st.meta) || {};
    return !!(m.base && m.writtenAt && ts(m.writtenAt) === ts(m.updatedAt));
  }

  /** Настоящие данные — дни или итоги (не один пройденный онбординг). */
  function realLocal() {
    var s = State.s;
    return !!((s.summaries && s.summaries.length) || Object.keys(s.days || {}).length);
  }

  function readAttempt() {
    try {
      var a = JSON.parse(localStorage.getItem(ATTEMPT_KEY) || 'null');
      return a && a.at ? a : null;
    } catch (e) { return null; }
  }

  function writeAttempt(v) {
    try {
      if (v) localStorage.setItem(ATTEMPT_KEY, JSON.stringify(v));
      else localStorage.removeItem(ATTEMPT_KEY);
    } catch (e) { /* приватный режим — переживём */ }
  }

  function full() {
    setStatus('error', SNAP_FULL);
    return { ok: false, error: SNAP_FULL };
  }

  function noSpace() {
    setStatus('error', NO_SPACE);
    return { ok: false, error: NO_SPACE };
  }

  /**
   * Облако становится локальным состоянием. false — память браузера его не
   * приняла: тогда всё возвращается как было и метка схождения не ставится,
   * иначе после перезагрузки устройство считало бы себя сошедшимся со
   * состоянием, которого у него нет.
   */
  function apply(cloud, cloudAt) {
    var before = clone(State.s);
    if (!State.replace(clone(cloud), true)) {
      State.replace(before, true);
      return false;
    }
    setLastSyncedAt(cloudAt);          // ровно это состояние в облаке и лежит
    // служебные поля записи — облачные: в экспорт, снимки и чужой push
    // (клиент до 2.8.1 отдал бы их обратно как свои) они не идут
    delete State.s.meta.base;
    delete State.s.meta.device;
    delete State.s.meta.writtenAt;
    State.save();
    // контент и посев выводятся из пакета и updatedAt не двигают
    State.syncContent();
    // облако могло приехать с состоянием до посева карточки вопросов —
    // достраиваем его тут же, иначе пункты вернутся только к следующей загрузке
    if (window.Radar && Radar.seedQuestions) Radar.seedQuestions();
    State.emit();
    if (window.App) App.render();
    return true;
  }

  /**
   * Условная запись. Строка есть — PATCH только при том updated_at, что
   * прочитан в начале захода (0 строк в ответе — нас опередили); строки нет —
   * вставка без слияния (409 — нас опередили). Проиграли гонку — заход
   * повторяется с чтения. meta.base — updatedAt облака, поверх которого
   * легла запись; meta.device — кто писал (для снимков на других устройствах).
   */
  function send(row, cloudAt, opts, my, tries, extra) {
    var body = clone(State.s);
    var stamp = body.meta.updatedAt || new Date().toISOString();
    body.meta.updatedAt = stamp;
    body.meta.device = deviceLabel();
    body.meta.base = cloudAt || 'empty';
    // writtenAt === updatedAt — признак записи 2.8.1: клиент до 2.8.1, забравший
    // такое состояние, при своей правке сдвинет updatedAt, и признак пропадёт
    body.meta.writtenAt = stamp;
    writeAttempt({ at: stamp, rev: body.meta.rev || null, base: cloudAt || '' });
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
        if (tries + 1 >= RACE_TRIES) throw herr(RACE_LOST);
        return round(opts, my, tries + 1);
      }
      writeAttempt(null);
      setLastSyncedAt(stamp);
      var res = { ok: true, pushed: true, at: stamp };
      Object.keys(extra || {}).forEach(function (k) { res[k] = extra[k]; });
      return done(res);
    });
  }

  function fail(r) {
    return r.text().then(function (t) {
      console.error('[sync] push', r.status, t);
      throw herr('Облако не приняло состояние (ошибка ' + r.status + ')');
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
    window.addEventListener('storage', onStorage);
  }

  /**
   * Соседняя вкладка того же браузера записала состояние, снимки или плашку.
   * Состояние поновее — перечитываем, иначе старое из памяти этой вкладки
   * со следующей правкой легло бы поверх (и ушло бы в облако).
   */
  function onStorage(e) {
    if (!e || !e.key) return;
    if (e.key === State.KEY) {
      if (reloadIfNewerOnDisk()) emit();
      return;
    }
    if (e.key === SESSION_KEY) {
      // соседняя вкладка вошла, вышла или сменила аккаунт — берём её сессию,
      // всё, что было в полёте у этой, больше ничего не решает
      loadSession();
      loadAuthLost();
      newEpoch();
      if (signedIn()) { setStatus('idle'); sync(); } else setStatus(lost ? 'error' : 'off', lost ? AUTH_LOST : null);
      return;
    }
    if (e.key === SNAP_KEY || e.key === CONFLICT_KEY) emit();
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
    onStorage: onStorage, limits: LIMITS,
    snapshots: snapshots, snapshotFile: snapshotFile, restoreSnapshot: restoreSnapshot, deviceLabel: deviceLabel,
    conflictPending: conflictPending, ackConflict: ackConflict,
    loginFormHtml: loginFormHtml, wireLoginForm: wireLoginForm,
    get email() { return session && session.email; }
  };
})();
