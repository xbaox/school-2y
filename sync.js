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

  var SESSION_KEY = 'study-system-v2-session';
  var PUSH_DEBOUNCE = 2000;

  var session = null;      // { access_token, refresh_token, expires_at, user_id, email }
  var timer = null;
  var pending = false;     // очередь: есть несохранённые изменения
  var busy = false;
  var status = 'off';      // off | idle | syncing | queued | error
  var lastSync = null;
  var lastError = null;
  var listeners = [];

  function available() { return !!(URL_BASE && ANON_KEY); }
  function signedIn() { return !!(session && session.access_token); }
  function state() { return { status: status, lastSync: lastSync, error: lastError, email: session && session.email }; }

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

  /** Обновляет токен, если он вот-вот истечёт. */
  function ensureToken() {
    if (!signedIn()) return Promise.reject(new Error('нет сессии'));
    if (session.expires_at && Date.now() < session.expires_at - 60000) return Promise.resolve();
    return req('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', noAuth: true, body: { refresh_token: session.refresh_token }
    }).then(function (r) {
      if (!r.ok) throw new Error('сессия истекла');
      return r.json();
    }).then(function (j) { saveSession(fromAuth(j)); });
  }

  /* ---------- вход и выход ---------- */

  function signIn(email, password) {
    setStatus('syncing');
    return req('/auth/v1/token?grant_type=password', {
      method: 'POST', noAuth: true, body: { email: email, password: password }
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) {
          var msg = r.status === 400
            ? 'Почта или пароль не подошли'
            : (j.msg || j.error_description || j.message || 'Не вышло войти');
          throw new Error(msg);
        }
        return j;
      });
    }).then(function (j) {
      saveSession(fromAuth(j));
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
    pending = false;
    lastSync = null;
    setStatus('off');
  }

  /* ---------- pull / push ---------- */

  /** Забирает облачное состояние; заменяет локальное, только если оно новее. */
  function pull(force) {
    if (!signedIn()) return Promise.resolve({ ok: false, reason: 'нет входа' });
    setStatus('syncing');
    return ensureToken().then(function () {
      return req('/rest/v1/app_state?user_id=eq.' + encodeURIComponent(session.user_id) +
        '&select=state,updated_at&limit=1');
    }).then(function (r) {
      if (!r.ok) throw new Error('облако ответило ' + r.status);
      return r.json();
    }).then(function (rows) {
      var row = rows && rows[0];
      if (!row || !row.state || !row.state.meta) {
        setStatus('idle');
        return { ok: true, applied: false, empty: true };
      }
      var cloudAt = row.state.meta.updatedAt || row.updated_at || '';
      var localAt = State.s.meta.updatedAt || '';
      if (force || cloudAt > localAt) {
        State.replace(row.state);
        State.syncContent();
        lastSync = new Date().toISOString();
        setStatus('idle');
        if (window.App) App.render();
        return { ok: true, applied: true, at: cloudAt };
      }
      lastSync = new Date().toISOString();
      setStatus('idle');
      return { ok: true, applied: false, at: cloudAt };
    }).catch(function (e) {
      setStatus(navigator.onLine ? 'error' : 'queued', e.message);
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
    var snapshot = State.s;
    return ensureToken().then(function () {
      return req('/rest/v1/app_state?on_conflict=user_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: [{
          user_id: session.user_id,
          state: snapshot,
          updated_at: snapshot.meta.updatedAt || new Date().toISOString()
        }]
      });
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) { throw new Error('облако ответило ' + r.status + ': ' + t.slice(0, 120)); });
      }
      busy = false;
      lastSync = new Date().toISOString();
      setStatus('idle');
      if (pending) { pending = false; return push(); }
      return { ok: true };
    }).catch(function (e) {
      busy = false;
      pending = true;
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

  function init() {
    loadSession();
    if (!signedIn()) { setStatus('off'); return; }
    setStatus('idle');
    pull();

    window.addEventListener('online', function () {
      UI.toast('Сеть вернулась — догоняю облако', '', 2200);
      flush();
    });
    window.addEventListener('offline', function () { setStatus('queued'); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
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
    available: available, signedIn: signedIn, state: state, status: statusText,
    init: init, signIn: signIn, signOut: signOut, pull: pull, push: push,
    onLocalChange: onLocalChange, flush: flush, onChange: onChange,
    loginFormHtml: loginFormHtml, wireLoginForm: wireLoginForm,
    get email() { return session && session.email; }
  };
})();
