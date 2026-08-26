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

/**
 * Минимальный DOM: ровно столько, сколько нужно ui.js и app.js, чтобы
 * загрузиться и не падать. Слушатели настоящие — на них и проверяется,
 * что делегированные обработчики не копятся при перерисовках.
 */
function fakeNode(tag) {
  const node = {
    tagName: String(tag || 'div').toUpperCase(),
    className: '', innerHTML: '', textContent: '', value: '',
    style: {}, dataset: {}, children: [], _l: {}, _attrs: {},
    classList: {
      add() { }, remove() { }, toggle() { }, contains() { return false; }
    },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
    removeAttribute(k) { delete this._attrs[k]; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
    remove() { },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    contains() { return true; },
    focus() { }, select() { }, setSelectionRange() { }, click() { },
    addEventListener(type, fn) { (this._l[type] = this._l[type] || []).push(fn); },
    removeEventListener(type, fn) { this._l[type] = (this._l[type] || []).filter(x => x !== fn); },
    /** Сколько слушателей типа висит — этим ловится задвоение. */
    listenerCount(type) { return (this._l[type] || []).length; },
    /** Прогоняет событие через всех слушателей, как настоящий bubbling. */
    fire(type, target) { (this._l[type] || []).slice().forEach(fn => fn({ target, preventDefault() { } })); }
  };
  return node;
}
ctx.fakeNode = fakeNode;

ctx.document = {
  addEventListener() { }, removeEventListener() { }, hidden: false,
  body: fakeNode('body'),
  createElement(tag) { return fakeNode(tag); },
  getElementById() { return fakeNode(); },
  querySelector() { return null; },
  querySelectorAll() { return []; }
};
ctx.addEventListener = function () { };
ctx.removeEventListener = function () { };
ctx.innerWidth = 400;
ctx.scrollTo = function () { };

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

vm.createContext(ctx);

/**
 * Модули в порядке зависимостей. Экраны, которым нужен настоящий DOM
 * (program/radar/journal/settings), живут на заглушке выше только косвенно —
 * их сюда не тянем; app.js и ui.js грузим, они нужны для проверки
 * обработчиков и статусной строки.
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
  'ui.js',
  'waterfall.js',
  'stepsflow.js',
  'sync.js',
  'lesson.js',
  'app.js',
  'radar.js',
  // journal.js тянем ради window.Cards: колода и «Слова урока» — часть SRS
  'journal.js'
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
