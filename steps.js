/* ============================================================
   steps.js — шкала нагрузки, раздел 7.2 ТЗ.
   Одна линейная шкала из 7 позиций: S1–S4 растят время,
   Г1–Г3 растят сложность при замороженном времени.
   Цифры таблицы переносятся буквально и не пересчитываются.
   Цикл механики (подъём/откат/разгрузка) — ниже, раздел 7.2.
   ============================================================ */

window.STEPS = (function () {
  'use strict';

  /** Таблица 7.2. Позиции 5–7 берут время от S4. */
  var TABLE = [
    {
      pos: 1, name: 'S1', norm: 45, full: 75, lesson: 30, minQ: 25,
      start: 'L1', transfer: '1', ru: '≤40%', note: 'старт школы', special: ''
    },
    {
      pos: 2, name: 'S2', norm: 55, full: 90, lesson: 40, minQ: 28,
      start: 'L1', transfer: '1–2', ru: '≤30%', note: 'больше вопросов', special: ''
    },
    {
      pos: 3, name: 'S3', norm: 65, full: 105, lesson: 50, minQ: 30,
      start: 'L2', transfer: '2', ru: '≤25%', note: 'старт с L2', special: ''
    },
    {
      pos: 4, name: 'S4', norm: 75, full: 120, lesson: 50, minQ: 33,
      start: 'L2', transfer: '2–3', ru: '≤20%', note: 'потолок времени', special: ''
    },
    {
      pos: 5, name: 'Г1', norm: 75, full: 120, lesson: 50, minQ: 35,
      start: 'L2', transfer: '3', ru: '≤10%', note: 'время стоит, растёт глубина',
      cemc: true,
      special: 'в математических уроках добавь 1 задачу уровня CEMC ⭐; «перевёртыш» («а что если…») обязателен в каждом уроке'
    },
    {
      pos: 6, name: 'Г2', norm: 75, full: 120, lesson: 50, minQ: 35,
      start: 'L2', transfer: '3', ru: '0', note: 'без русского',
      cemc: true,
      special: 'русский → 0 (только по моей явной просьбе); задачи CEMC ⭐ и в блок-тестах; письменная работа 8–10 предложений'
    },
    {
      pos: 7, name: 'Г3', norm: 75, full: 120, lesson: 50, minQ: 35,
      start: 'L2', finish: 'L3', transfer: '3', ru: '0', note: 'экзаменационный темп',
      cemc: true,
      special: 'финиш на L3 обязателен; мини-тесты с таймером в экзаменационном темпе; задание «составь свою задачу и реши»'
    }
  ];

  var MAX = TABLE.length;      // 7 — после Г3 шкала заканчивается
  var MIN = 1;                 // пол шкалы — S1
  var CYCLE_DAYS = 14;
  var SUMMER_PRESET = 2;       // летом генератор использует строку S2

  function row(pos) { return TABLE[U.clamp(pos || 1, MIN, MAX) - 1]; }
  function label(pos) { return row(pos).name; }
  function isTop(pos) { return U.clamp(pos, MIN, MAX) >= MAX; }

  /** Действует ли сейчас разгрузка. */
  function onDeload(step, todayIso) {
    return !!(step && step.deloadUntil && todayIso <= step.deloadUntil);
  }

  /** Фактическая позиция с учётом разгрузки (ниже S1 не опускается). */
  function effectivePos(step, todayIso) {
    var p = U.clamp((step && step.position) || 1, MIN, MAX);
    if (onDeload(step, todayIso)) p = Math.max(MIN, p - 1);
    return p;
  }

  /**
   * Параметры для карточки урока и промпта — всегда одни и те же.
   * mode 'summer' → пресет S2, подпись «Лето (пресет S2)».
   */
  function params(step, todayIso, mode) {
    var summer = mode !== 'school';
    var pos = summer ? SUMMER_PRESET : effectivePos(step, todayIso);
    var r = row(pos);
    return {
      pos: pos,
      name: r.name,
      stepLabel: summer ? 'Лето (пресет S2)' : r.name,
      summer: summer,
      deload: !summer && onDeload(step, todayIso),
      normMin: r.norm,
      fullMin: r.full,
      lessonMin: r.lesson,
      minQuestions: r.minQ,
      startLevel: r.start,
      finishLevel: r.finish || null,
      transfer: r.transfer,
      ru: r.ru,
      cemc: !!r.cemc,
      special: r.special || ''
    };
  }

  /** Строка параметров ступени для карточки урока (раздел 6.1 «г»). */
  function cardLine(p) {
    return p.stepLabel + ' · ~' + p.lessonMin + ' мин · ≥' + p.minQuestions +
      ' вопросов · старт ' + p.startLevel + ' · перенос ×' + p.transfer + ' · RU ' + p.ru;
  }

  /* ---------- цикл: подъём, отсрочка, откат, разгрузка ---------- */

  /** День цикла 1..14 и прогресс. */
  function cycle(step, todayIso) {
    if (!step || !step.cycleStart) return { day: 0, total: CYCLE_DAYS, pct: 0, ended: false, paused: false };
    var paused = !!(step.snoozeUntil && todayIso <= step.snoozeUntil) || onDeload(step, todayIso);
    var day = U.clamp(U.diffDays(step.cycleStart, todayIso) + 1, 1, CYCLE_DAYS);
    return {
      day: day, total: CYCLE_DAYS,
      pct: Math.round(day / CYCLE_DAYS * 100),
      ended: !paused && U.diffDays(step.cycleStart, todayIso) + 1 >= CYCLE_DAYS,
      paused: paused
    };
  }

  return {
    TABLE: TABLE, MAX: MAX, MIN: MIN, CYCLE_DAYS: CYCLE_DAYS, SUMMER_PRESET: SUMMER_PRESET,
    row: row, label: label, isTop: isTop,
    onDeload: onDeload, effectivePos: effectivePos,
    params: params, cardLine: cardLine, cycle: cycle
  };
})();
