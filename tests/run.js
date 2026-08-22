/* ============================================================
   tests/run.js — прогон чистых модулей без браузера:  node tests/run.js
   Модули пишут себя в window; здесь window — обычный объект-контекст.
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

const ctx = { console, Math, Date, JSON, Object, Array, String, Number, parseInt, parseFloat, isNaN };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

/** Модули без DOM-зависимостей — их и проверяем. */
const MODULES = ['util.js', 'doctrine.js', 'pace.js', 'steps.js', 'prompts.js', 'content/registry.js'];

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

ctx.describe = describe; ctx.ok = ok; ctx.eq = eq;

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

console.log('');
if (failures.length) {
  console.log('ПРОВАЛЫ (' + failures.length + '):');
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log('');
}
console.log('Проверок: ' + (pass + fail) + ' · прошло ' + pass + ' · упало ' + fail);
process.exitCode = fail ? 1 : (process.exitCode || 0);
