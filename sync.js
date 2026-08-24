/* ============================================================
   sync.js — облачная синхронизация через Supabase (раздел 3 ТЗ).

   Без SDK и CDN: голый fetch по REST и Auth эндпоинтам, чтобы офлайн
   ничего не тянул из сети.

   Логика: при загрузке — pull, если облако новее локального updatedAt;
   при изменениях — push с debounce 2 сек; оффлайн — очередь, догоняет
   при появлении сети; конфликт — побеждает более поздний updatedAt.
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

  var SESSION_KEY = 'study-system-v2-session';
  /** Метка последнего успешного push. Переживает закрытие вкладки — по ней
      при следующем запуске видно, что локальные правки ещё не уехали. */
  var PUSHED_KEY = 'study-system-v2-pushed';
  /** Метка «вход отвалился». Переживает перезагрузку: сессия при этом стёрта,
      и без метки протухший вход выглядел бы как «просто не подключено» —
      человек продолжал бы работать, думая что синхронизация идёт. */
  var LOST_KEY = 'study-system-v2-authlost';
  var PUSH_DEBOUNCE = 2000;

  var session = null;      // { access_token, refresh_token, expires_at, user_id, email }
  var timer = null;
  var pending = false;     // очередь: есть несохранённые изменения
  var busy = false;
  var status = 'off';      // off | idle | syncing | queued | error
  var lost = false;        // вход недействителен — это не отсутствие сети
  var lastSync = null;
  var lastError = null;
  var listeners = [];

  function available() { return !!(URL_BASE && ANON_KEY); }
  function signedIn() { return !!(session && session.access_token); }

  /** Все сравнения времён — только через Date.parse: строки ISO из разных
      источников (локальная правка, столбец updated_at) сравнивать как текст нельзя. */
  function ts(v) {
    var n = Date.parse(v || '');
    return isNaN(n) ? 0 : n;
  }

  function lastPushedAt() {
    try { return localStorage.getItem(PUSHED_KEY) || null; } catch (e) { return null; }
  }

  function setLastPushedAt(iso) {
    try {
      if (iso) localStorage.setItem(PUSHED_KEY, iso);
      else localStorage.removeItem(PUSHED_KEY);
    } catch (e) { /* приватный режим — переживём */ }
  }

  /** Есть ли локальные правки, которые ещё не уехали в облако. */
  function hasUnpushed() {
    return ts(State.s.meta.updatedAt) > ts(lastPushedAt());
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
      email: session && session.email, authLost: lost
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

  function refreshToken() {
    if (!session || !session.refresh_token) return Promise.reject(authError());
    return req('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', noAuth: true, body: { refresh_token: session.refresh_token }
    }).then(function (r) {
      if (r.ok) return r.json();
      // 400/401/403 — токен отозван или протух насовсем: вход больше не действует.
      // Всё остальное (5xx, шлюз) временно, входа не касается.
      if (r.status === 400 || r.status === 401 || r.status === 403) throw authError();
      throw new Error('Облако не ответило (ошибка ' + r.status + ')');
    }).then(function (j) { saveSession(fromAuth(j)); });
  }

  /** Обновляет токен, если он вот-вот истечёт. */
  function ensureToken() {
    if (!signedIn()) return Promise.reject(new Error('нет сессии'));
    if (session.expires_at && Date.now() < session.expires_at - 60000) return Promise.resolve();
    return refreshToken().catch(function (e) {
      // протухший refresh на старте — тот же отвалившийся вход, что и 401:
      // раньше он молча оседал строкой статуса в Настройках и наружу не выходил
      throw (e && e.auth) ? sessionLost() : e;
    });
  }

  /** Облако перестало узнавать вход: сессию гасим, дальше решает пользователь. */
  function sessionLost() {
    saveSession(null);
    setLastPushedAt(null);
    pending = false;
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
  function authed(path, opts) {
    return ensureToken()
      .then(function () { return req(path, opts); })
      .then(function (r) {
        if (r.status !== 401) return r;
        return refreshToken().then(
          function () { return req(path, opts); },
          // связь могла отвалиться ровно между 401 и refresh — это не выход
          function (e) { throw (e && e.auth) ? sessionLost() : e; }
        ).then(function (r2) {
          if (r2.status === 401) throw sessionLost();
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
      saveSession(fromAuth(j));
      setAuthLost(false);
      setStatus('idle');
      return pull();
    }).catch(function (e) {
      setStatus('error', e.message);
      throw e;
    });
  }

  function signOut() {
    if (signedIn()) req('/auth/v1/logout', { method: 'POST' }).catch(function () { });
    saveSession(null);
    setLastPushedAt(null);
    setAuthLost(false);
    pending = false;
    lastSync = null;
    setStatus('off');
  }

  /* ---------- pull / push ---------- */

  /** Забирает облачное состояние; заменяет локальное, только если оно новее. */
  function pull(force) {
    if (!signedIn()) return Promise.resolve({ ok: false, reason: 'нет входа' });
    setStatus('syncing');
    return authed('/rest/v1/app_state?user_id=eq.' + encodeURIComponent(session.user_id) +
      '&select=state,updated_at&limit=1').then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          console.error('[sync] pull', r.status, t);
          throw new Error('Облако не отдало состояние (ошибка ' + r.status + ')');
        });
      }
      return r.json();
    }).then(function (rows) {
      var row = rows && rows[0];
      if (!row || !row.state || !row.state.meta) {
        setStatus('idle');
        // в облаке пусто — отдаём своё, если оно не пустое
        if (hasLocalData()) push();
        return { ok: true, applied: false, empty: true };
      }
      var cloudAt = row.state.meta.updatedAt || row.updated_at || '';
      var localAt = State.s.meta.updatedAt || '';
      if (force || ts(cloudAt) > ts(localAt)) {
        State.replace(row.state);
        setLastPushedAt(cloudAt);          // ровно это состояние в облаке и лежит
        State.syncContent();               // новый пакет контента — уже локальная правка
        lastSync = new Date().toISOString();
        setStatus('idle');
        if (window.App) App.render();
        return { ok: true, applied: true, at: cloudAt };
      }
      lastSync = new Date().toISOString();
      setStatus('idle');
      // конфликт решает более поздний updatedAt: локальное новее — отдаём его
      if (ts(localAt) > ts(cloudAt)) push();
      return { ok: true, applied: false, at: cloudAt };
    }).catch(function (e) {
      if (!e.authLost) setStatus(navigator.onLine ? 'error' : 'queued', e.message);
      return { ok: false, error: e.message };
    });
  }

  /** Отправляет локальное состояние в облако (upsert по user_id). */
  function push() {
    if (!signedIn()) return Promise.resolve({ ok: false });
    if (busy) { pending = true; return Promise.resolve({ ok: false, busy: true }); }
    if (!navigator.onLine) { pending = true; setStatus('queued'); return Promise.resolve({ ok: false, offline: true }); }

    busy = true;
    setStatus('syncing');
    var stamp = State.s.meta.updatedAt || new Date().toISOString();
    return authed('/rest/v1/app_state?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: [{ user_id: session.user_id, state: State.s, updated_at: stamp }]
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          console.error('[sync] push', r.status, t);
          throw new Error('Облако не приняло состояние (ошибка ' + r.status + ')');
        });
      }
      busy = false;
      setLastPushedAt(stamp);
      lastSync = new Date().toISOString();
      setStatus('idle');
      if (pending) { pending = false; return push(); }
      return { ok: true };
    }).catch(function (e) {
      busy = false;
      if (e.authLost) return { ok: false, error: e.message };
      pending = true;                       // не уехало — остаётся в очереди
      setStatus(navigator.onLine ? 'error' : 'queued', e.message);
      return { ok: false, error: e.message };
    });
  }

  /** Дёргается из State.touch() при каждом изменении. */
  function onLocalChange() {
    if (!signedIn()) return;
    pending = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      pending = false;
      push();
    }, PUSH_DEBOUNCE);
    if (status === 'idle') setStatus('queued');
  }

  /** Догоняем очередь при появлении сети и при возврате на вкладку. */
  function flush() {
    if (!signedIn() || !navigator.onLine) return;
    if (pending || status === 'queued' || status === 'error') push();
  }

  /**
   * Старт. Если локальная правка пережила закрытие вкладки (updatedAt новее
   * метки последнего push) — сначала отдаём её, иначе забираем облако
   * по правилу «новее побеждает».
   */
  function init() {
    loadSession();
    loadAuthLost();
    // слушатели ставим всегда: вход может случиться позже, из Настроек или
    // онбординга, и очередь должна догоняться без перезапуска приложения
    bindNetworkListeners();
    // метка живёт до нового входа: перезапуск приложения протухший вход
    // не чинит, и плашка на «Сегодня» обязана вернуться вместе с ним
    if (!signedIn()) { setStatus(lost ? 'error' : 'off', lost ? AUTH_LOST : null); return; }
    setAuthLost(false);
    setStatus('idle');
    if (navigator.onLine && lastPushedAt() && hasUnpushed()) push();
    else pull();
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
      pull();
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
    init: init, signIn: signIn, signOut: signOut, pull: pull, push: push,
    onLocalChange: onLocalChange, flush: flush, onChange: onChange,
    lastPushedAt: lastPushedAt, hasUnpushed: hasUnpushed,
    loginFormHtml: loginFormHtml, wireLoginForm: wireLoginForm,
    get email() { return session && session.email; }
  };
})();
