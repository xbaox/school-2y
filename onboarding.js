/* ============================================================
   onboarding.js — первый запуск, 4 шага (раздел 7.8 ТЗ):
   1) Supabase-вход или «пока локально»
   2) перенос духа v1 — серия и рекорд вручную (или с нуля)
   3) зачёт пройденного: уроки Ф0 галочками, без очков и без итогов
   4) подтверждение дат: Лето до 07.09.2026, шкала с 08.09
   ============================================================ */

window.Onboarding = (function () {
  'use strict';

  var step = 1;
  var data = { streak: 0, best: 0, done: {} };
  var root = null;

  function needed() { return !State.s.onboarded; }

  function start() {
    step = 1;
    data = { streak: 0, best: 0, done: {} };
    root = document.createElement('div');
    root.className = 'onb';
    document.body.appendChild(root);
    paint();
  }

  function paint() {
    root.innerHTML =
      '<div class="onb-inner">' +
      '<div class="onb-dots">' + [1, 2, 3, 4].map(function (i) {
        return '<i class="' + (i === step ? 'on' : (i < step ? 'past' : '')) + '"></i>';
      }).join('') + '</div>' +
      screens[step - 1]() +
      '</div>';
    wire();
  }

  var screens = [

    // 1 — облако или локально
    function () {
      return '<div class="eyebrow">шаг 1 из 4</div>' +
        '<h1>Система v2 «Фундамент»</h1>' +
        '<p class="sub">Приложение — мозг, ты — курьер, ИИ-чат — преподаватель. ' +
        'Два копипаста на урок, память системы живёт здесь.</p>' +
        (window.Sync && Sync.available()
          ? '<div class="onb-box">' + Sync.loginFormHtml() + '</div>'
          : '<div class="fnote" style="margin-top:18px">Облачная синхронизация подключается в Настройках. ' +
          'Пока всё живёт в этом браузере — данные не потеряются.</div>') +
        '<div class="btns" style="margin-top:20px">' +
        '<button class="btn pr" data-next>Пока локально</button></div>';
    },

    // 2 — перенос духа v1
    function () {
      return '<div class="eyebrow">шаг 2 из 4</div>' +
        '<h1>Серия из v1</h1>' +
        '<p class="sub">Летом было 29+ дней подряд. Перенеси серию, чтобы счётчик не начинался с нуля — ' +
        'прошедшие дни запишутся как минималки.</p>' +
        '<div class="card" style="margin-top:18px">' +
        '<div class="srow"><div class="k">Текущая серия<span>дней подряд прямо сейчас</span></div>' +
        '<input class="num" type="number" inputmode="numeric" data-streak value="' + data.streak + '"></div>' +
        '<div class="srow"><div class="k">Рекорд<span>лучшая серия за всё время</span></div>' +
        '<input class="num" type="number" inputmode="numeric" data-best value="' + data.best + '"></div>' +
        '</div>' +
        '<div class="btns" style="margin-top:18px">' +
        '<button class="btn pr" data-next>Дальше</button>' +
        '<button class="btn ghost" data-zero>Начать с нуля</button></div>';
    },

    // 3 — зачёт пройденного Ф0
    function () {
      var blocks = State.phaseBlocks('p0');
      var rows = blocks.map(function (id) {
        var lessons = State.blockLessons(id);
        if (!lessons.length) return '';
        return '<div class="onb-block"><div class="onb-bt">' + State.blockLabel(id) + ' · ' +
          U.esc((State.block(id) || {}).title || '') + '</div>' +
          lessons.map(function (l) {
            return '<label class="check"><input type="checkbox" data-done="' + l.id + '"' +
              (data.done[l.id] ? ' checked' : '') + '><span>' + State.lessonNum(l.id) + '. ' +
              U.esc(l.title) + '</span></label>';
          }).join('') + '</div>';
      }).join('');
      var n = Object.keys(data.done).filter(function (k) { return data.done[k]; }).length;
      return '<div class="eyebrow">шаг 3 из 4</div>' +
        '<h1>Что уже пройдено</h1>' +
        '<p class="sub">Отметь уроки Ф0, которые уже сделаны. Они закроются сегодняшним числом — ' +
        'без очков и без итогов, просто чтобы очередь не предлагала их снова.</p>' +
        '<div class="onb-list">' + rows + '</div>' +
        '<div class="btns" style="margin-top:18px">' +
        '<button class="btn pr" data-next>' + (n ? 'Зачесть ' + n + ' и дальше' : 'Ничего не пройдено') + '</button></div>';
    },

    // 4 — подтверждение дат
    function () {
      var pd = State.s.settings.phaseDates;
      return '<div class="eyebrow">шаг 4 из 4</div>' +
        '<h1>Даты</h1>' +
        '<p class="sub">Проверь и подтверди. Всё это правится потом в Настройках и в «Программе».</p>' +
        '<div class="card" style="margin-top:18px">' +
        '<div class="srow"><div class="k">Режим «Лето»<span>минималка + уроки, шкала нагрузки спит</span></div>' +
        '<div class="mono small">до ' + U.fmtShort(pd.p0.end) + '</div></div>' +
        '<div class="srow"><div class="k">Старт шкалы<span>школа начинается со ступени S1</span></div>' +
        '<div class="mono small">' + U.fmtShort(State.AUTO_SCHOOL_DATE) + '</div></div>' +
        '<div class="srow"><div class="k">Дела из плана<span>17 записей: placement, guidance, OSSLT, IELTS, OUAC…</span></div>' +
        '<div class="mono small">будут добавлены</div></div>' +
        '</div>' +
        '<div class="btns" style="margin-top:18px">' +
        '<button class="btn pr" data-finish>Готово — к «Сегодня»</button></div>';
    }
  ];

  function wire() {
    var next = root.querySelector('[data-next]');
    if (next) next.onclick = function () { collect(); step++; paint(); };

    // вход в облако на первом шаге: если в облаке уже есть состояние —
    // забираем его и онбординг больше не нужен
    if (step === 1 && window.Sync && Sync.available() && !Sync.signedIn()) {
      Sync.wireLoginForm(root, function (res) {
        if (res && res.applied) {
          skip();
          UI.toast('Состояние забрано из облака', 'ok', 3600);
        } else {
          step++;
          paint();
        }
      });
    }

    var zero = root.querySelector('[data-zero]');
    if (zero) zero.onclick = function () { data.streak = 0; data.best = 0; step++; paint(); };

    U.on(root, 'change', '[data-done]', function (e, el) {
      data.done[el.dataset.done] = el.checked;
      var btn = root.querySelector('[data-next]');
      var n = Object.keys(data.done).filter(function (k) { return data.done[k]; }).length;
      if (btn) btn.textContent = n ? 'Зачесть ' + n + ' и дальше' : 'Ничего не пройдено';
    });

    var fin = root.querySelector('[data-finish]');
    if (fin) fin.onclick = finish;
  }

  function collect() {
    var s = root.querySelector('[data-streak]');
    var b = root.querySelector('[data-best]');
    if (s) data.streak = Math.max(0, parseInt(s.value, 10) || 0);
    if (b) data.best = Math.max(0, parseInt(b.value, 10) || 0);
  }

  function finish() {
    var today = State.today();

    // серия из v1: прошедшие дни записываются как минималки
    for (var i = 1; i <= data.streak; i++) {
      var date = U.addDays(today, -i);
      if (!State.s.days[date]) {
        State.s.days[date] = { level: 'min', addons: [], lessons: [], points: 1, imported: true };
      }
    }
    State.s.stats.bestStreak = Math.max(data.best, data.streak, State.s.stats.bestStreak || 0);

    // зачёт пройденного: без очков и без итогов
    var tracks = {};
    Object.keys(data.done).forEach(function (id) {
      if (!data.done[id]) return;
      var l = CONTENT.lesson(id);
      if (!l) return;
      State.s.lessons[id] = { done: true, score: null, date: today, granted: true };
      State.s.stats.lessonsDone = (State.s.stats.lessonsDone || 0) + 1;
      State.refreshBlockDone(l.blockId);
      var tr = State.lessonTrack(id);
      if (tr) tracks[tr] = true;
    });
    Object.keys(tracks).forEach(function (tr) { State.touchTrack(tr, today); });

    if (window.Radar) Radar.seedTodos();

    State.s.onboarded = true;
    State.touch();
    close();
    UI.toast('Готово. Следующий урок уже на «Сегодня».', 'ok', 3600);
  }

  function close() {
    if (root) { root.remove(); root = null; }
    App.render();
  }

  /** Пропустить онбординг (например, при восстановлении из облака). */
  function skip() {
    State.s.onboarded = true;
    State.touch(true);
    if (root) close();
  }

  return { needed: needed, start: start, skip: skip, close: close };
})();
