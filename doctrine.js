/* ============================================================
   doctrine.js — РАЗДЕЛ 2 ТЗ. НЕПРИКОСНОВЕННО.
   Эти правила перенесены из v1 и не подлежат изменению
   ни при каких рефакторингах:

   1. Уровни дня вложенные: Пусто → Минималка (1) → Норма (2) → Полная (3).
      Очки начисляются только за достигнутый уровень (не суммируются между уровнями).
   2. Добавки плюсуются к любому уровню:
      Доп. урок +3 · Клуб +2 · Подготовка к тесту +2 · Проект +2 · Воскресный радар +1.
   3. Серия живёт при ≥1 очке в день. Правило: не больше 2 пустых дней подряд.
   4. Догонять марафонами не нужно — пропуск не отрабатывается, серия просто продолжается.
   5. Уроки не привязаны к календарю: закрытие урока открывает следующий непройденный.
   6. Ранги недели: Искра 4+ · Ритм 7+ · Разгон 11+ · Сила 14+ · Огонь 17+ · Легенда 21+.
      Пороги и названия редактируемы в настройках.
   7. Минималка не растёт никогда (10–15 мин). Её работа — серия, не объём.

   Значения ниже — дефолты; пользователь правит их в Настройках,
   но структура правил не меняется.
   ============================================================ */

window.DOCTRINE = (function () {
  'use strict';

  /** Уровни дня. Вложенные: очки не суммируются, берётся достигнутый уровень. */
  var LEVELS = [
    { id: 'none', name: 'Пусто', points: 0 },
    { id: 'min', name: 'Минималка', points: 1 },
    { id: 'norm', name: 'Норма', points: 2 },
    { id: 'full', name: 'Полная', points: 3 }
  ];

  /** Добавки. Плюсуются к любому уровню, в том числе к «Пусто». */
  var ADDONS = [
    { id: 'extra', name: 'Доп. урок', points: 3 },
    { id: 'club', name: 'Клуб', points: 2 },
    { id: 'test', name: 'Подготовка к тесту', points: 2 },
    { id: 'project', name: 'Проект', points: 2 },
    { id: 'radar', name: 'Воскресный радар', points: 1 }
  ];

  /** Ранги недели по сумме очков. */
  var RANKS = [
    { id: 'spark', name: 'Искра', min: 4 },
    { id: 'rhythm', name: 'Ритм', min: 7 },
    { id: 'boost', name: 'Разгон', min: 11 },
    { id: 'power', name: 'Сила', min: 14 },
    { id: 'fire', name: 'Огонь', min: 17 },
    { id: 'legend', name: 'Легенда', min: 21 }
  ];

  /** Максимум пустых дней подряд, при котором серия ещё жива (правило 3). */
  var MAX_EMPTY_IN_ROW = 2;

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /**
   * Очки дня = очки достигнутого уровня + сумма добавок.
   * day: { level:'none'|'min'|'norm'|'full', addons:[id] }
   */
  function dayPoints(day, settings) {
    if (!day) return 0;
    var levels = (settings && settings.levels) || LEVELS;
    var addons = (settings && settings.addons) || ADDONS;
    var lvl = byId(levels, day.level || 'none');
    var p = lvl ? (lvl.points || 0) : 0;
    (day.addons || []).forEach(function (id) {
      var a = byId(addons, id);
      if (a) p += a.points || 0;
    });
    return p;
  }

  /**
   * Серия. Идём назад от «сегодня»:
   *  – день с очками ≥1 продлевает серию;
   *  – пустой день серию не ломает, пока подряд их не больше двух;
   *  – сегодняшний пустой день не считается (он ещё не закончился).
   * getPoints(isoDate) → число очков за день.
   */
  function streak(getPoints, todayIso, limitDays) {
    var limit = limitDays || 1200;
    var cur = todayIso;
    if (getPoints(cur) <= 0) cur = U.addDays(cur, -1); // сегодня ещё в процессе
    var count = 0, empty = 0;
    for (var i = 0; i < limit; i++) {
      var p = getPoints(cur);
      if (p > 0) { count++; empty = 0; }
      else {
        empty++;
        if (empty > MAX_EMPTY_IN_ROW) break;
      }
      cur = U.addDays(cur, -1);
    }
    return count;
  }

  /** Сколько пустых дней подряд прямо сейчас (для предупреждения «серия под угрозой»). */
  function emptyInRow(getPoints, todayIso) {
    var cur = U.addDays(todayIso, -1), n = 0;
    while (n <= MAX_EMPTY_IN_ROW + 1 && getPoints(cur) <= 0) { n++; cur = U.addDays(cur, -1); }
    return n;
  }

  /** Очки за неделю (пн–вс), в которую попадает дата. */
  function weekPoints(getPoints, isoDate) {
    var start = U.weekStart(isoDate), sum = 0;
    for (var i = 0; i < 7; i++) sum += getPoints(U.addDays(start, i));
    return sum;
  }

  /** Ранг по очкам недели. Возвращает объект ранга или null. */
  function rankFor(points, ranks) {
    var list = ranks || RANKS, best = null;
    for (var i = 0; i < list.length; i++) {
      if (points >= list[i].min && (!best || list[i].min > best.min)) best = list[i];
    }
    return best;
  }

  /** Следующий ранг и сколько до него очков. */
  function nextRank(points, ranks) {
    var list = (ranks || RANKS).slice().sort(function (a, b) { return a.min - b.min; });
    for (var i = 0; i < list.length; i++) if (points < list[i].min) {
      return { rank: list[i], left: list[i].min - points };
    }
    return null;
  }

  return {
    LEVELS: LEVELS, ADDONS: ADDONS, RANKS: RANKS, MAX_EMPTY_IN_ROW: MAX_EMPTY_IN_ROW,
    byId: byId, dayPoints: dayPoints, streak: streak, emptyInRow: emptyInRow,
    weekPoints: weekPoints, rankFor: rankFor, nextRank: nextRank
  };
})();
