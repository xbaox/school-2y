/* ============================================================
   steps.js — шкала нагрузки, раздел 7.2 ТЗ.
   Одна линейная шкала из 7 позиций: S1–S4 растят время,
   Г1–Г3 растят сложность при замороженном времени.
   Цифры таблицы переносятся буквально и не пересчитываются.
   Цикл механики (подъём/откат/разгрузка) — ниже, раздел 7.2.
   ============================================================ */

window.STEPS = (function () {
  'use strict';

  /**
   * Таблица 7.2, параметры версии 2.6.0. Позиции 5–7 берут время от S4.
   * Колонки norm и full — бюджет минут на день (уровни дня доктрины),
   * с длительностью урока не связаны и релизом не менялись.
   */
  /**
   * S0 «Старт школы» (ТЗ 2.7.0, п. 4.4) — ступень до шкалы: тридцать минут
   * и восемь заданий, чтобы первая школьная неделя не сорвалась об объём.
   * В нумерации TABLE её нет намеренно: step.position в живом состоянии
   * по-прежнему значит S1…Г3, и сдвигать этот смысл миграцией нельзя.
   */
  var S0 = {
    pos: 0, name: 'S0', title: 'Старт школы',
    norm: 45, full: 75, lesson: 30, qRange: '8',
    layout: '2 разогрев L1 · 4 основа L2 · 1 письмо · 1 стретч ⭐',
    slots: { warm: 2, base: 4, write: 1, stretch: 1 },
    sprintLabel: '~13–15 минут',
    start: 'L1', transfer: '1', ru: '≤40%', note: 'старт школы', special: ''
  };

  var TABLE = [
    {
      pos: 1, name: 'S1', title: 'S1', norm: 45, full: 75, lesson: 35, qRange: '12',
      layout: '2 разогрев L1 · 7 основа L2 · 1 письмо · 2 стретч ⭐',
      slots: { warm: 2, base: 7, write: 1, stretch: 2 },
      start: 'L1', transfer: '1', ru: '≤40%', note: 'шкала пошла', special: ''
    },
    {
      pos: 2, name: 'S2', norm: 55, full: 90, lesson: 40, qRange: '14–16',
      start: 'L1', transfer: '1–2', ru: '≤30%', note: 'больше заданий', special: ''
    },
    {
      pos: 3, name: 'S3', norm: 65, full: 105, lesson: 45, qRange: '16–18',
      start: 'L2', transfer: '2', ru: '≤25%', note: 'старт с L2', special: ''
    },
    {
      pos: 4, name: 'S4', norm: 75, full: 120, lesson: 50, qRange: '18–20',
      start: 'L2', transfer: '2–3', ru: '≤20%', note: 'потолок времени', special: ''
    },
    {
      pos: 5, name: 'Г1', norm: 75, full: 120, lesson: 50, qRange: '18–20',
      start: 'L2', transfer: '3', ru: '≤10%', note: 'время стоит, растёт глубина',
      cemc: true,
      special: 'в математических уроках добавь 1 задачу уровня CEMC ⭐; «перевёртыш» («а что если…») обязателен в каждом уроке'
    },
    {
      pos: 6, name: 'Г2', norm: 75, full: 120, lesson: 50, qRange: '18–20',
      start: 'L2', transfer: '3', ru: '0', note: 'без русского',
      cemc: true,
      special: 'подача без русского (перевод фидбека остаётся!); задачи CEMC ⭐ и в тестах; письменная работа 8–10 предложений'
    },
    {
      pos: 7, name: 'Г3', norm: 75, full: 120, lesson: 50, qRange: '18–20',
      start: 'L2', finish: 'L3', transfer: '3', ru: '0', note: 'экзаменационный темп',
      cemc: true,
      // «финиш на L3» печатает сама строка старта практики — здесь его нет,
      // чтобы требование не приезжало в промпт дважды
      special: 'мини-тесты с таймером в экзаменационном темпе; задание «составь свою задачу и реши»'
    }
  ];

  var MAX = TABLE.length;      // 7 — после Г3 шкала заканчивается
  var MIN = 1;                 // пол шкалы — S1
  var CYCLE_DAYS = 14;
  var SUMMER_PRESET = 2;       // летом генератор использует строку S2

  /* Разгон Фазы 0: до этой даты включительно урок держится коротким
     независимо от позиции шкалы — школа ещё не началась, а двухчасовые
     уроки приводили к брошенным урокам. Дата совпадает с AUTO_SCHOOL_DATE
     минус день: 08.09 шкала стартует с S1 и разгон выключается сам. */
  var RAMP_UNTIL = '2026-09-07';
  var RAMP_LESSON = 35;          // числовое значение для сравнений
  var RAMP_LESSON_LABEL = '30–35';
  var RAMP_Q_RANGE = '10–12';

  function onRamp(todayIso) { return String(todayIso || '') <= RAMP_UNTIL; }

  function row(pos) { return TABLE[U.clamp(pos || 1, MIN, MAX) - 1]; }

  /** Ступень по имени: 'S0' → отдельная строка, остальные — из таблицы. */
  /**
   * Раскладка заданий ступени. У S0 и S1 она задана ТЗ; у S2–Г3 своей нет,
   * и считается по тому же правилу: разогрев 2 · письмо 1 · стретч 2 ·
   * остальное — основа, от нижней границы диапазона заданий.
   */
  function slotsOf(r) {
    if (r.slots) return r.slots;
    var total = parseInt(String(r.qRange).split('–')[0], 10) || 12;
    return { warm: 2, base: Math.max(1, total - 5), write: 1, stretch: 2 };
  }

  function stage(name) {
    if (name === 'S0') return S0;
    for (var i = 0; i < TABLE.length; i++) if (TABLE[i].name === name) return TABLE[i];
    return null;
  }

  /** Все ступени по порядку: S0, S1 … Г3. */
  function stages() { return [S0].concat(TABLE); }

  /** Следующая ступень за этой или null на потолке. */
  function nextStage(name) {
    var list = stages();
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) return list[i + 1] ? list[i + 1].name : null;
    }
    return null;
  }
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
   * mode 'summer' → строка S2 под подписью «Лето»: до старта школы шкала
   * ещё не идёт, и номер ступени на экране только путал.
   */
  /**
   * Параметры для карточки урока и промпта — всегда одни и те же.
   * mode 'summer' → строка S2 под подписью «Лето»: до старта школы шкала
   * ещё не идёт, и номер ступени на экране только путал.
   * stageName (ТЗ 4.4) — названная ступень из state.scale; она главнее
   * позиции, потому что двигается только кнопкой владельца.
   */
  function params(step, todayIso, mode, stageName) {
    var summer = mode !== 'school';
    var named = !summer && stageName ? stage(stageName) : null;
    var pos = summer ? SUMMER_PRESET : effectivePos(step, todayIso);
    var r = named || row(pos);
    var ramp = onRamp(todayIso);
    return {
      pos: named ? named.pos : pos,
      name: r.name,
      title: r.title || r.name,
      layout: r.layout || '',
      slots: slotsOf(r),
      sprintLabel: r.sprintLabel || '',
      stepLabel: summer ? 'Лето' : r.name,
      summer: summer,
      deload: !summer && onDeload(step, todayIso),
      normMin: r.norm,
      fullMin: r.full,
      lessonMin: ramp ? RAMP_LESSON : r.lesson,
      lessonLabel: ramp ? RAMP_LESSON_LABEL : String(r.lesson),
      qRange: ramp ? RAMP_Q_RANGE : r.qRange,
      ramp: ramp,
      startLevel: r.start,
      finishLevel: r.finish || null,
      transfer: r.transfer,
      ru: r.ru,
      cemc: !!r.cemc,
      special: r.special || ''
    };
  }

  /** Строка параметров ступени для Настроек и деталей ступени. */
  function cardLine(p) {
    return p.stepLabel + ' · ~' + p.lessonLabel + '′ · ' + p.qRange +
      ' заданий · старт ' + p.startLevel + ' · перенос ×' + p.transfer + ' · RU ' + p.ru;
  }

  /** Расшифровка колонок строки выше — под ней на экране Настроек. */
  var CARD_LEGEND = 'старт — с какого уровня начинается практика · ' +
    'перенос — сколько задач на применение в новой ситуации · ' +
    'RU — сколько русского в объяснениях';

  /**
   * Строка карточки урока на «Сегодня». Держится синхронной с промптом:
   * те же минуты и то же число заданий, что видит преподаватель в контракте.
   */
  function lessonLine(p) {
    return '~' + p.lessonLabel + '′ · ' + p.qRange + ' заданий · по одному · фото-режим';
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
    RAMP_UNTIL: RAMP_UNTIL, onRamp: onRamp, CARD_LEGEND: CARD_LEGEND,
    S0: S0, stage: stage, stages: stages, nextStage: nextStage, slotsOf: slotsOf,
    row: row, label: label, isTop: isTop,
    onDeload: onDeload, effectivePos: effectivePos,
    params: params, cardLine: cardLine, lessonLine: lessonLine, cycle: cycle
  };
})();
