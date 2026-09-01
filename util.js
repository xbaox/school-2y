/* ============================================================
   util.js — даты, форматирование, мелкие помощники DOM.
   Границы дня — 04:00 локального времени (раздел 7.8 ТЗ):
   всё, что сделано до 04:00, относится к прошедшему дню.
   ============================================================ */

window.U = (function () {
  'use strict';

  var DAY_START_HOUR = 4;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /** Date → 'YYYY-MM-DD' (локальная дата, без UTC-сдвигов) */
  function iso(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /** 'YYYY-MM-DD' → Date (локальный полдень, чтобы переход на летнее время не сдвигал день) */
  function parse(s) {
    var p = String(s).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0, 0);
  }

  /** Логическое «сегодня» с учётом границы 04:00. */
  function today(now) {
    var d = now ? new Date(now.getTime()) : new Date();
    if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
    return iso(d);
  }

  /** Момент следующей смены суток (ближайшие 04:00) — для авто-перерисовки. */
  function nextDayBoundary(now) {
    var d = now ? new Date(now.getTime()) : new Date();
    var b = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DAY_START_HOUR, 0, 0, 0);
    if (b.getTime() <= d.getTime()) b.setDate(b.getDate() + 1);
    return b;
  }

  function addDays(isoDate, n) {
    var d = parse(isoDate);
    d.setDate(d.getDate() + n);
    return iso(d);
  }

  /** Целых дней от a до b (b - a). */
  function diffDays(a, b) {
    return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
  }

  /** 1 = понедельник … 7 = воскресенье */
  function weekday(isoDate) {
    var w = parse(isoDate).getDay();
    return w === 0 ? 7 : w;
  }

  /** Понедельник недели, в которую попадает дата. */
  function weekStart(isoDate) {
    return addDays(isoDate, -(weekday(isoDate) - 1));
  }

  var MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  var MONTHS_FULL = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
    'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var WD_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

  /** '2026-08-26' → '26 авг' */
  function fmtShort(isoDate) {
    var d = parse(isoDate);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  /** '2026-08-26' → '26 августа 2026' */
  function fmtLong(isoDate) {
    var d = parse(isoDate);
    return d.getDate() + ' ' + MONTHS_FULL[d.getMonth()] + ' ' + d.getFullYear();
  }

  function fmtWeekday(isoDate) { return WD_SHORT[weekday(isoDate) - 1]; }

  /** '2026-09-08' → '08.09' — короткая метка даты для плашек. */
  function fmtDayMonth(isoDate) {
    var p = String(isoDate).split('-');
    return p[2] + '.' + p[1];
  }

  /** Русское склонение: plural(2,'день','дня','дней') → 'дня' */
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  function days(n) { return n + ' ' + plural(n, 'день', 'дня', 'дней'); }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /** Экранирование для innerHTML. */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /** Делегирование: on(root,'click','[data-act]',fn) */
  function on(root, type, sel, fn) {
    root.addEventListener(type, function (e) {
      var t = e.target.closest(sel);
      if (t && root.contains(t)) fn(e, t);
    });
  }

  /**
   * Ведущий id в тексте НОВОГО долга: «[D-12] », «D-12 — », «№3 », «#3 ».
   *
   * ИИ продолжает нумерацию, которую видит в промпте, и записывает новый долг
   * как «[D-12] Пропускает артикль…». Такой текст ложится в банк вместе с чужим
   * id, а правило 14 контракта велит копировать формулировку долга в «Погашено»
   * дословно — и тогда id внутри текста погасит совсем другой долг.
   * Номера присваивает система (nextDebtId), в тексте им делать нечего.
   */
  var LEAD_ID_RE = /^\s*(?:[[(]\s*D\s*-\s*\d+\s*[\])]|D\s*-\s*\d+|[№#]\s*\d+)\s*[.:)\]—–-]*\s*/i;

  function stripDebtId(text) {
    var out = String(text == null ? '' : text), prev = null;
    while (out !== prev && LEAD_ID_RE.test(out)) { prev = out; out = out.replace(LEAD_ID_RE, ''); }
    return out.trim();
  }

  function shuffle(arr, seed) {
    var a = arr.slice(), s = seed == null ? Math.random() * 1e9 : seed;
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  return {
    DAY_START_HOUR: DAY_START_HOUR,
    iso: iso, parse: parse, today: today, nextDayBoundary: nextDayBoundary,
    addDays: addDays, diffDays: diffDays, weekday: weekday, weekStart: weekStart,
    fmtShort: fmtShort, fmtLong: fmtLong, fmtWeekday: fmtWeekday, fmtDayMonth: fmtDayMonth,
    plural: plural, days: days, uid: uid, clamp: clamp, esc: esc,
    el: el, els: els, on: on, shuffle: shuffle, stripDebtId: stripDebtId
  };
})();
