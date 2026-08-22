/* ============================================================
   radar.js — экран «Радар и дела» (раздел 6.3 ТЗ).
   Две секции на одном табе: события школы (курс, тип, дата, заметка)
   и дела (название · для чего · срок). Плюс воскресный чек-лист из
   пяти пунктов, закрытие которого даёт добавку +1.
   ============================================================ */

window.Radar = (function () {
  'use strict';

  var TYPES = [
    { id: 'test', name: 'тест' },
    { id: 'quiz', name: 'квиз' },
    { id: 'assignment', name: 'сдача' },
    { id: 'exam', name: 'экзамен' }
  ];

  /** Пять пунктов воскресного чек-листа (раздел 6.3). */
  var CHECKLIST = [
    'пройтись по планам курсов',
    'добавить новые даты',
    'глянуть светофоры',
    'глянуть долги',
    'выбрать день полной на неделе'
  ];

  var showPast = false;
  var showArchive = false;

  /* ---------- предзаполненные дела (раздел 9.5) ---------- */

  var SEED_TODOS = [
    {
      title: 'Placement-тест: английский + математика',
      why: 'результат задаёт стартовый уровень ESL — каждый уровень выше = сэкономленный семестр на пути к ENG4U (английский 12)',
      due: '2026-08-28'
    },
    {
      title: 'Встреча с guidance + 7 вопросов',
      why: 'без Credit Counselling Summary план не финализируется; вопросы: сколько кредитов зачли и какие обязательные висят · каким годом входа записан · уровень ESL по placement · семестровка ли школа и семестры MPM2D/MCR3U · когда пишу OSSLT · разрешают ли ESLEO→ENG4U · про 2 онлайн-кредита',
      due: '2026-09-11'
    },
    {
      title: 'Начать волонтёрство',
      why: '40 часов — требование диплома; начатое в сентябре не болит в мае',
      due: '2026-09-30'
    },
    {
      title: 'Внести планы курсов семестра 1 в радар',
      why: 'учителя раздают course outlines в первую неделю — это все даты оценок',
      due: '2026-09-12'
    },
    {
      title: 'Узнать дату OSSLT',
      why: 'осеннее окно 3–30 ноября 2026; тест грамотности — требование диплома',
      due: '2026-10-15'
    },
    {
      title: 'Выбор курсов года 2',
      why: 'решить шестой курс: EWC4U или CHY4U/CLN4U/HSE4M',
      due: null, window: 'февраль 2027'
    },
    {
      title: 'Внести планы курсов семестра 2 в радар',
      why: 'то же самое для новых 4 курсов',
      due: '2027-02-12'
    },
    {
      title: 'OSSLT весной',
      why: 'окно 30 марта – 19 апреля 2027, если не писал осенью',
      due: null, window: 'март–апрель 2027'
    },
    {
      title: 'Регистрация летней школы',
      why: 'ESLEO, если placement был средним',
      due: null, window: 'конец апреля 2027'
    },
    {
      title: 'Старт подготовки к IELTS',
      why: 'цель 7.0 — порог Schulich, остальным хватит',
      due: '2027-07-15'
    },
    {
      title: 'Внести планы курсов семестра 1 (год 2) в радар',
      why: 'полугодие, оценки которого уйдут в заявки',
      due: '2027-09-17'
    },
    {
      title: 'Создать аккаунт OUAC и начать заявку',
      why: 'открывается в сентябре 2027',
      due: '2027-10-15'
    },
    {
      title: 'Сдать IELTS',
      why: 'результаты нужны к заявкам',
      due: null, window: 'октябрь–ноябрь 2027'
    },
    {
      title: 'Supplementary-заявки пяти школ',
      why: 'Kira (Rotman) · анкета Schulich · PSE (Smith) · эссе AEO (Ivey) · AIF (Waterloo); кормятся проектами',
      due: null, window: 'ноябрь 2027 – январь 2028'
    },
    {
      title: 'Дедлайн OUAC',
      why: 'равное рассмотрение всех университетов Онтарио',
      due: '2028-01-15'
    },
    {
      title: 'Внести планы курсов семестра 2 (год 2) в радар',
      why: 'финальная четвёрка шестёрки',
      due: '2028-02-11'
    },
    {
      title: 'Принять оффер',
      why: 'выбрать университет',
      due: '2028-06-01'
    }
  ];

  /** Заполняет список дел при онбординге. Повторно не дублирует. */
  function seedTodos() {
    if ((State.s.todos || []).some(function (t) { return t.source === 'seed'; })) return 0;
    SEED_TODOS.forEach(function (t) {
      State.s.todos.push({
        id: U.uid(), title: t.title, why: t.why,
        due: t.due || null, window: t.window || null,
        source: 'seed', done: false, doneDate: null
      });
    });
    State.touch(true);
    return SEED_TODOS.length;
  }

  /* ---------- подсветка сроков ---------- */

  /** Цвет по сроку: ≤3 дней красный · ≤14 жёлтый · дальше обычный. */
  function dueClass(due, todayIso) {
    if (!due) return '';
    var left = U.diffDays(todayIso || State.today(), due);
    if (left <= 3) return 'r';
    if (left <= 14) return 'y';
    return '';
  }

  function dueText(t) {
    if (!t.due) return t.window ? 'окно: ' + t.window : 'без срока';
    var left = U.diffDays(State.today(), t.due);
    if (left < 0) return U.fmtShort(t.due) + ' · просрочено на ' + U.days(-left);
    if (left === 0) return U.fmtShort(t.due) + ' · сегодня';
    if (left === 1) return U.fmtShort(t.due) + ' · завтра';
    return U.fmtShort(t.due) + ' · через ' + U.days(left);
  }

  /** Сколько дел «горит» (срок ≤3 дней) — для бейджа на «Сегодня». */
  function burningCount() {
    var t = State.today();
    return (State.s.todos || []).filter(function (x) {
      return !x.done && x.due && U.diffDays(t, x.due) <= 3;
    }).length;
  }

  /** Компактный бейдж на «Сегодня»; тап ведёт на таб. */
  function todayBadge() {
    var n = burningCount();
    if (!n) return '';
    return '<button class="burn" data-goto-radar>дела: ' + n + ' ' +
      U.plural(n, 'горит', 'горят', 'горят') + ' →</button>';
  }

  /* ---------- воскресный чек-лист ---------- */

  function checklistState(dateIso) {
    var d = State.day(dateIso || State.today());
    return (d && d.checklist) || [];
  }

  function checklistDone(dateIso) {
    var c = checklistState(dateIso);
    return c.length === CHECKLIST.length && c.every(Boolean);
  }

  function toggleCheck(i, dateIso) {
    var date = dateIso || State.today();
    var d = State.day(date, true);
    d.checklist = d.checklist || [];
    while (d.checklist.length < CHECKLIST.length) d.checklist.push(false);
    d.checklist[i] = !d.checklist[i];

    // закрытие чек-листа даёт добавку +1 (раздел 6.3)
    var full = d.checklist.every(Boolean);
    var has = d.addons.indexOf('radar') >= 0;
    if (full && !has) {
      d.addons.push('radar');
      State.recount(date);
      UI.toast('Чек-лист закрыт · добавка +1', 'ok');
    } else if (!full && has) {
      d.addons.splice(d.addons.indexOf('radar'), 1);
      State.recount(date);
    }
    State.touch();
  }

  function checklistCard() {
    var t = State.today();
    var isSunday = U.weekday(t) === 7;
    var c = checklistState(t);
    var done = c.filter(Boolean).length;
    return '<section class="block"><h2>Воскресный чек-лист' +
      (isSunday ? ' <span class="tag on">сегодня</span>' : '') + '</h2>' +
      '<p class="lead">Пять пунктов. Закрыл все — добавка +1 к дню.</p>' +
      '<div class="card">' + CHECKLIST.map(function (text, i) {
        return '<label class="check"><input type="checkbox" data-check="' + i + '"' +
          (c[i] ? ' checked' : '') + '><span>' + U.esc(text) + '</span></label>';
      }).join('') +
      '<div class="tiny dim center" style="margin-top:8px">' + done + ' из ' + CHECKLIST.length +
      (checklistDone(t) ? ' · добавка засчитана' : '') + '</div>' +
      '</div></section>';
  }

  function openChecklist() {
    App.go('radar');
    setTimeout(function () {
      var el = U.el('.screen[data-screen="radar"] .check');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    }, 60);
  }

  /* ---------- экран ---------- */

  function render() {
    return '<h1>Радар и дела</h1>' +
      checklistCard() +
      eventsSection() +
      todosSection();
  }

  function eventsSection() {
    var t = State.today();
    var all = (State.s.radar || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var upcoming = all.filter(function (e) { return !e.done && e.date >= t; });
    var past = all.filter(function (e) { return e.done || e.date < t; });

    var head = '<section class="block"><div class="rowline" style="margin-bottom:10px">' +
      '<h2 style="margin:0">События школы</h2>' +
      '<button class="btn pr" style="width:auto;padding:8px 14px" data-add-event>+ событие</button></div>';

    if (!upcoming.length && !past.length) {
      return head + UI.empty('📡', 'Радар пустой.<br>Course outline раздают в первую неделю — оттуда все даты.',
        '<button class="btn sec" data-add-event>Добавь первое событие радара</button>') + '</section>';
    }

    var list = upcoming.length
      ? '<div class="list">' + upcoming.map(eventRow).join('') + '</div>'
      : '<div class="fnote">Ближайших событий нет.</div>';

    var pastBlock = past.length
      ? '<button class="btn ghost" data-toggle-past>' + (showPast ? '▾' : '▸') + ' прошедшие и закрытые (' + past.length + ')</button>' +
      (showPast ? '<div class="list">' + past.map(eventRow).join('') + '</div>' : '')
      : '';

    return head + list + pastBlock + '</section>';
  }

  function eventRow(e) {
    var t = State.today();
    var left = U.diffDays(t, e.date);
    var cls = e.done ? 'dim' : (left <= 3 && left >= 0 ? 'r' : (left < 0 ? 'dim' : ''));
    var track = CONTENT.trackForCourse(e.course);
    var type = (TYPES.filter(function (x) { return x.id === e.type; })[0] || { name: e.type }).name;
    return '<div class="item ' + (e.done ? 'off' : '') + '">' +
      '<div class="rowline"><div style="min-width:0">' +
      '<div class="t">' + (track ? UI.trackDot(track) + ' ' : '<span class="dotmark dim"></span> ') +
      U.esc(e.course) + ' · ' + U.esc(type) + '</div>' +
      '<div class="s ' + cls + '">' + U.fmtShort(e.date) + ' · ' +
      (left < 0 ? 'прошло' : (left === 0 ? 'сегодня' : (left === 1 ? 'завтра' : 'через ' + U.days(left)))) +
      (track ? '' : ' · водопад не назначает') +
      (e.note ? ' · ' + U.esc(e.note) : '') + '</div></div>' +
      '<button class="rmini" data-event-done="' + e.id + '">' + (e.done ? '↺' : '✓') + '</button>' +
      '</div></div>';
  }

  function todosSection() {
    var active = (State.s.todos || []).filter(function (x) { return !x.done; })
      .sort(function (a, b) {
        var da = a.due || '9999-99-99', db = b.due || '9999-99-99';
        return da < db ? -1 : (da > db ? 1 : 0);
      });
    var archive = (State.s.todos || []).filter(function (x) { return x.done; })
      .sort(function (a, b) { return (b.doneDate || '') < (a.doneDate || '') ? -1 : 1; });

    var head = '<section class="block"><div class="rowline" style="margin-bottom:10px">' +
      '<h2 style="margin:0">Дела</h2>' +
      '<button class="btn pr" style="width:auto;padding:8px 14px" data-add-todo>+ дело</button></div>' +
      '<p class="lead">Важное, не на один день. Висит, пока не нажата галочка.</p>';

    if (!active.length && !archive.length) {
      return head + UI.empty('🎯', 'Дел пока нет.',
        '<button class="btn sec" data-seed-todos>Загрузить список из плана</button>') + '</section>';
    }

    var list = active.length
      ? '<div class="list">' + active.map(todoRow).join('') + '</div>'
      : '<div class="fnote">Все дела закрыты. Это хороший знак.</div>';

    var arch = archive.length
      ? '<button class="btn ghost" data-toggle-arch>' + (showArchive ? '▾' : '▸') + ' архив (' + archive.length + ')</button>' +
      (showArchive ? '<div class="list">' + archive.map(todoRow).join('') + '</div>' : '')
      : '';

    return head + list + arch + '</section>';
  }

  function todoRow(t) {
    var cls = t.done ? 'dim' : dueClass(t.due);
    return '<div class="item ' + (t.done ? 'off' : '') + '">' +
      '<div class="rowline"><div style="min-width:0">' +
      '<div class="t">' + U.esc(t.title) + '</div>' +
      '<div class="s ' + cls + '">' + U.esc(t.done ? 'закрыто ' + (t.doneDate ? U.fmtShort(t.doneDate) : '') : dueText(t)) + '</div>' +
      '<div class="s dim">' + U.esc(t.why || '') + '</div>' +
      '</div>' +
      '<button class="rmini" data-todo-done="' + t.id + '">' + (t.done ? '↺' : '✓') + '</button>' +
      '</div></div>';
  }

  /* ---------- шторки добавления ---------- */

  function addEvent() {
    var courses = Object.keys(CONTENT.COURSE_TRACK).concat(CONTENT.COURSES_NO_TRACK);
    var def = U.addDays(State.today(), 7);
    UI.sheet({
      title: 'Событие радара',
      sub: 'Курс, тип, дата. Заметка — по желанию.',
      body:
        '<div class="chips" data-courses>' + courses.map(function (c, i) {
          return '<button class="chip' + (i === 0 ? ' on' : '') + '" data-course="' + c + '">' + c + '</button>';
        }).join('') + '<button class="chip" data-course="other">свой…</button></div>' +
        '<input class="txt hidden" data-other placeholder="код курса">' +
        '<div class="chips" data-types>' + TYPES.map(function (x, i) {
          return '<button class="chip' + (i === 0 ? ' on' : '') + '" data-type="' + x.id + '">' + x.name + '</button>';
        }).join('') + '</div>' +
        '<input class="txt" type="date" data-date value="' + def + '">' +
        '<input class="txt" style="margin-top:8px" data-note placeholder="заметка (не обязательно)">' +
        '<div class="btn-row" style="margin-top:12px">' +
        '<button class="btn sec" data-cancel>Отмена</button>' +
        '<button class="btn pr" data-save>Добавить</button></div>',
      onMount: function (root, close) {
        var course = Object.keys(CONTENT.COURSE_TRACK)[0];
        var type = TYPES[0].id;
        var other = root.querySelector('[data-other]');
        U.on(root, 'click', '[data-course]', function (e, el) {
          U.els('[data-course]', root).forEach(function (x) { x.classList.remove('on'); });
          el.classList.add('on');
          course = el.dataset.course;
          other.classList.toggle('hidden', course !== 'other');
          if (course === 'other') other.focus();
        });
        U.on(root, 'click', '[data-type]', function (e, el) {
          U.els('[data-type]', root).forEach(function (x) { x.classList.remove('on'); });
          el.classList.add('on');
          type = el.dataset.type;
        });
        root.querySelector('[data-cancel]').onclick = close;
        root.querySelector('[data-save]').onclick = function () {
          var code = course === 'other' ? (other.value || '').trim().toUpperCase() : course;
          if (!code) { other.focus(); return; }
          State.s.radar.push({
            id: U.uid(), course: code, type: type,
            date: root.querySelector('[data-date]').value || def,
            note: (root.querySelector('[data-note]').value || '').trim(),
            done: false
          });
          State.touch();
          close();
          UI.toast('Событие ' + code + ' в радаре', 'ok');
        };
      }
    });
  }

  function addTodo(existing) {
    var t = existing || { title: '', why: '', due: '', window: '' };
    UI.sheet({
      title: existing ? 'Дело' : 'Новое дело',
      sub: 'Название · для чего · срок. Срок — дата или окно словами.',
      body:
        '<input class="txt" data-title placeholder="название" value="' + U.esc(t.title) + '">' +
        '<input class="txt" style="margin-top:8px" data-why placeholder="для чего" value="' + U.esc(t.why) + '">' +
        '<div class="seg" style="margin-top:10px" data-mode>' +
        '<button data-m="date" aria-pressed="' + (!t.window) + '">дата</button>' +
        '<button data-m="window" aria-pressed="' + (!!t.window) + '">окно</button></div>' +
        '<input class="txt' + (t.window ? ' hidden' : '') + '" style="margin-top:8px" type="date" data-due value="' + U.esc(t.due || '') + '">' +
        '<input class="txt' + (t.window ? '' : ' hidden') + '" style="margin-top:8px" data-window placeholder="например: конец апреля 2027" value="' + U.esc(t.window || '') + '">' +
        '<div class="btn-row" style="margin-top:12px">' +
        '<button class="btn sec" data-cancel>Отмена</button>' +
        '<button class="btn pr" data-save>Сохранить</button></div>',
      onMount: function (root, close) {
        var mode = t.window ? 'window' : 'date';
        U.on(root, 'click', '[data-m]', function (e, el) {
          mode = el.dataset.m;
          U.els('[data-m]', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === el)); });
          root.querySelector('[data-due]').classList.toggle('hidden', mode !== 'date');
          root.querySelector('[data-window]').classList.toggle('hidden', mode !== 'window');
        });
        root.querySelector('[data-cancel]').onclick = close;
        root.querySelector('[data-save]').onclick = function () {
          var title = (root.querySelector('[data-title]').value || '').trim();
          if (!title) { root.querySelector('[data-title]').focus(); return; }
          var item = existing || { id: U.uid(), source: 'user', done: false, doneDate: null };
          item.title = title;
          item.why = (root.querySelector('[data-why]').value || '').trim();
          item.due = mode === 'date' ? (root.querySelector('[data-due]').value || null) : null;
          item.window = mode === 'window' ? ((root.querySelector('[data-window]').value || '').trim() || null) : null;
          if (!existing) State.s.todos.push(item);
          State.touch();
          close();
          UI.toast(existing ? 'Дело обновлено' : 'Дело добавлено', 'ok');
        };
      }
    });
  }

  /* ---------- события экрана ---------- */

  function mount(host) {
    U.on(host, 'change', '[data-check]', function (e, el) { toggleCheck(+el.dataset.check); });
    U.on(host, 'click', '[data-add-event]', function () { addEvent(); });
    U.on(host, 'click', '[data-add-todo]', function () { addTodo(); });
    U.on(host, 'click', '[data-seed-todos]', function () {
      var n = seedTodos();
      State.touch();
      UI.toast(n ? 'Добавлено дел: ' + n : 'Список уже загружен', 'ok');
    });
    U.on(host, 'click', '[data-toggle-past]', function () { showPast = !showPast; App.renderScreen('radar'); });
    U.on(host, 'click', '[data-toggle-arch]', function () { showArchive = !showArchive; App.renderScreen('radar'); });

    U.on(host, 'click', '[data-event-done]', function (e, el) {
      var ev = State.s.radar.filter(function (x) { return x.id === el.dataset.eventDone; })[0];
      if (!ev) return;
      ev.done = !ev.done;
      State.touch();
    });

    U.on(host, 'click', '[data-todo-done]', function (e, el) {
      var t = State.s.todos.filter(function (x) { return x.id === el.dataset.todoDone; })[0];
      if (!t) return;
      t.done = !t.done;
      t.doneDate = t.done ? State.today() : null;
      State.touch();
      UI.toast(t.done ? 'В архив: ' + t.title : 'Вернул в дела', 'ok');
    });
  }

  /** Бейдж «дела: N горят» на «Сегодня». */
  function mountToday(host) {
    U.on(host, 'click', '[data-goto-radar]', function () { App.go('radar'); });
  }

  App.register('radar', { render: render, mount: mount });

  return {
    CHECKLIST: CHECKLIST, SEED_TODOS: SEED_TODOS, TYPES: TYPES,
    seedTodos: seedTodos, burningCount: burningCount, todayBadge: todayBadge,
    dueClass: dueClass, dueText: dueText, openChecklist: openChecklist,
    checklistDone: checklistDone, mountToday: mountToday, addEvent: addEvent, addTodo: addTodo
  };
})();
