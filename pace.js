/* ============================================================
   pace.js — светофор темпа блока (раздел 7.5 ТЗ).
   Чистый модуль без доступа к состоянию и DOM: на вход цифры,
   на выход цвет и текст. Проверяется тестами (tests/cases.pace.js).

   Формула: осталось_уроков / норматив = сколько дней нужно.
   Норматив: 2 урока в неделю в режиме «Школа», 1 урок в день до школы.
   Летний норматив 1.3 был оптимистичным: жёлтый загорался позже, чем
   надо, и блок успевал протухнуть незаметно.
   Зелёный: запас ≥1 день · Жёлтый: впритык · Красный: не успеть.
   ============================================================ */

window.PACE = (function () {
  'use strict';

  var RATE_SCHOOL = 2 / 7;   // уроков в день
  var RATE_SUMMER = 1;       // уроков в день

  function rate(mode) { return mode === 'school' ? RATE_SCHOOL : RATE_SUMMER; }

  /**
   * status({ remaining, deadline, today, mode })
   *  remaining — сколько уроков блока ещё не закрыто
   *  deadline  — 'YYYY-MM-DD'
   *  today     — 'YYYY-MM-DD' (логическое сегодня, граница 04:00)
   * → { color:'green'|'yellow'|'red', done, overdue, daysLeft, needDays, slack, text }
   */
  function status(o) {
    var remaining = Math.max(0, o.remaining || 0);
    var out = {
      color: 'green', done: false, overdue: false,
      daysLeft: 0, needDays: 0, slack: 0, text: ''
    };

    if (!o.deadline) { out.text = 'без дедлайна'; return out; }

    // дни, которые ещё можно использовать: сегодня и день дедлайна включительно
    var daysLeft = U.diffDays(o.today, o.deadline) + 1;
    out.daysLeft = daysLeft;

    if (remaining === 0) {
      out.done = true;
      out.text = 'блок закрыт';
      return out;
    }

    var need = remaining / rate(o.mode);
    var slack = daysLeft - need;
    out.needDays = need;
    out.slack = slack;

    if (daysLeft <= 0) {
      out.color = 'red';
      out.overdue = true;
      var over = -daysLeft + 1;
      out.text = 'просрочен на ' + U.days(over);
      return out;
    }

    if (slack >= 1) {
      out.color = 'green';
      out.text = 'запас ' + U.days(Math.floor(slack));
    } else if (slack >= 0) {
      out.color = 'yellow';
      out.text = 'впритык';
    } else {
      out.color = 'red';
      out.text = 'не успеть без доп. уроков';
    }
    return out;
  }

  /** Короткая строка для карточки урока: «до 26 авг · 🟢 запас 2 дня». */
  function line(st, deadline) {
    var dot = st.color === 'red' ? '🔴' : (st.color === 'yellow' ? '🟡' : '🟢');
    return 'до ' + U.fmtShort(deadline) + ' · ' + dot + ' ' + st.text;
  }

  return { RATE_SCHOOL: RATE_SCHOOL, RATE_SUMMER: RATE_SUMMER, rate: rate, status: status, line: line };
})();
