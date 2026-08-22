/* ============================================================
   tests/run.js — прогон модулей без браузера:  node tests/run.js
   Модули пишут себя в window; здесь window — обычный объект-контекст.
   Для модулей с побочными эффектами (state.js, sync.js) контекст
   доносит минимальные заглушки браузера: localStorage, navigator,
   document, fetch, таймеры и UI.
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number,
  parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
  setTimeout, clearTimeout, setInterval, clearInterval
};
ctx.window = ctx;
ctx.globalThis = ctx;

/* ---------- заглушки браузера ---------- */

/** localStorage в памяти: state.js и sync.js пишут в него на каждом шаге. */
const store = {};
ctx.localStorage = {
  getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; },
  clear() { Object.keys(store).forEach(k => delete store[k]); }
};
ctx.__store = store;

ctx.navigator = { onLine: true };
ctx.document = { addEventListener() { }, removeEventListener() { }, hidden: false };
ctx.addEventListener = function () { };
ctx.removeEventListener = function () { };

/** fetch подменяется тестами: ctx.__fetch = (url, opts) => Promise<Response>. */
ctx.__calls = [];
ctx.__fetch = null;
ctx.fetch = function (url, opts) {
  ctx.__calls.push({ url: url, method: (opts && opts.method) || 'GET', body: opts && opts.body });
  if (ctx.__fetch) return ctx.__fetch(url, opts);
  return Promise.reject(new Error('fetch не подменён в тесте'));
};

/** Ответ в стиле fetch — тестам хватает этих полей. */
ctx.__res = function (status, json) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: function () { return Promise.resolve(json); },
    text: function () { return Promise.resolve(JSON.stringify(json)); }
  };
};

/** UI — заглушка: тосты, шторки и баннеры только записываются. */
ctx.__ui = { toasts: [], sheets: [], banners: [] };
ctx.UI = {
  toast(text, kind) { ctx.__ui.toasts.push({ text: text, kind: kind }); },
  sheet(opts) { ctx.__ui.sheets.push(opts); return null; },
  close() { },
  confirm(opts) { ctx.__ui.sheets.push(opts); },
  prompt(opts) { ctx.__ui.sheets.push(opts); },
  banner(id, opts) { ctx.__ui.banners.push({ id: id, opts: opts }); },
  dismissBanner(id) { ctx.__ui.banners = ctx.__ui.banners.filter(b => b.id !== id); },
  empty(ic, text) { return String(text); },
  trackBadge(id) { return String(id); },
  trackDot(id) { return String(id); },
  lightClass(c) { return c === 'red' ? 'r' : (c === 'yellow' ? 'y' : 'g'); },
  lightDot(c) { return c === 'red' ? '🔴' : (c === 'yellow' ? '🟡' : '🟢'); },
  copy() { return Promise.resolve(true); }
};

vm.createContext(ctx);

/**
 * Модули в порядке зависимостей. Экраны (app.js, lesson.js и прочие)
 * держат DOM в теле функций рендера — их сюда не тянем.
 */
const MODULES = [
  'util.js',
  'doctrine.js',
  'pace.js',
  'steps.js',
  'content/registry.js',
  'content/phase0.js',
  'content/phase1.js',
  'state.js',
  'prompts.js',
  'waterfall.js',
  'stepsflow.js',
  'sync.js',
  'lesson.js'
];

for (const f of MODULES) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;            // модуль ещё не собран — этап впереди
  try {
    vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f });
  } catch (e) {
    console.error('Не загрузился модуль ' + f + ': ' + e.message);
    process.exitCode = 1;
  }
}

/* ---------- микро-фреймворк ---------- */

let pass = 0, fail = 0, group = '';
const failures = [];
const deferred = [];

function describe(name, fn) { group = name; fn(); }

function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; failures.push(group + ' → ' + name); }
}

function eq(actual, expected, name) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) pass++;
  else { fail++; failures.push(group + ' → ' + name + '\n      получено: ' + a + '\n      ожидалось: ' + b); }
}

/** Асинхронная проверка: fn возвращает промис, итог печатается после всех. */
function defer(name, fn) { deferred.push({ name: name, group: group, fn: fn }); }

ctx.describe = describe; ctx.ok = ok; ctx.eq = eq; ctx.defer = defer;

/* ---------- наборы проверок ---------- */

const CASES = fs.readdirSync(__dirname)
  .filter(f => /^cases\..*\.js$/.test(f))
  .sort();

for (const f of CASES) {
  const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
  try {
    vm.runInContext(src, ctx, { filename: f });
  } catch (e) {
    fail++;
    failures.push(f + ' → упал с ошибкой: ' + e.message + '\n' + (e.stack || ''));
  }
}

/* ---------- итог ---------- */

(async function () {
  for (const d of deferred) {
    group = d.group;
    try { await d.fn(); }
    catch (e) {
      fail++;
      failures.push(d.group + ' → ' + d.name + ' упал с ошибкой: ' + e.message);
    }
  }

  console.log('');
  if (failures.length) {
    console.log('ПРОВАЛЫ (' + failures.length + '):');
    failures.forEach(f => console.log('  ✗ ' + f));
    console.log('');
  }
  console.log('Проверок: ' + (pass + fail) + ' · прошло ' + pass + ' · упало ' + fail);
  process.exitCode = fail ? 1 : (process.exitCode || 0);
})();
