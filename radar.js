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
    { id: 'quiz', name: 'мини-тест' },
    { id: 'assignment', name: 'сдача' },
    { id: 'exam', name: 'экзамен' }
  ];

  /** Пять пунктов воскресного чек-листа (раздел 6.3). */
  var CHECKLIST = [
    'пройтись по планам курсов от учителей',
    'добавить в Радар новые даты тестов и сдач',
    'глянуть светофоры блоков в «Программе»',
    'глянуть незакрытые слабые места в «Журнале»',
    'выбрать день, когда возьмёшь два урока'
  ];

  var showPast = false;
  var showArchive = false;
  var openTodos = {};        // id дела → раскрыто ли «зачем»

  /* ---------- предзаполненные дела (раздел 9.5) ---------- */

  /**
   * Предзаполненные дела (раздел 9.5). Тексты — редакция 2.6.2: каждое дело
   * объясняет себя без внешнего словаря, аббревиатуры расшифрованы, у дела
   * с разговором в guidance выписаны все фразы и вопросы целиком.
   * match — подстрока для миграции: по ней дело узнаётся в старом состоянии.
   */
  var SEED_TODOS = [
    {
      title: "Guidance: 3 фразы + 9 вопросов",
      why: "Записаться в первые школьные дни. С собой: аттестат 9 кл (RU+EN), табель 10 кл, лист-схему с обводками ESLEO и MHF4U, шпаргалку.\n\nОткрытие: \"I'm planning to graduate in June 2028 and apply to university for September 2028. I need a two-year plan.\" — выпуск июнь 2028, нужен двухлетний план.\n\"Could I get my Credit Counselling Summary and my OST on paper, please?\" — сводку зачтённых кредитов и официальный транскрипт на бумаге.\n\"If my credit count puts me in Grade 11, I'd prefer to be registered as Grade 11.\" — если по кредитам выходит 11 класс, предпочитаю так и записаться.\n\nВопросы (ответы записывать на месте):\n1) \"How many credits will I get for my 10 grades in Russia, and which compulsory credits do I still need?\" — сколько кредитов зачтут за русскую школу и какие обязательные остались.\n2) \"How many credits should I take each year to graduate in June 2028?\" — сколько курсов брать в год.\n3) \"My placement is ESLEO, so I'll earn one ESL credit. How are my other compulsory English credits covered?\" — чем закрываются остальные обязательные английские кредиты: зачётом за Россию или курсами.\n4) \"Can I start MHF4U in semester one, as the assessment centre recommended?\" — можно ли продвинутые функции с первого семестра.\n5) \"When do I write the OSSLT — this November or in spring?\" — когда пишу провинциальный тест грамотности.\n6) \"After ESLEO, can I take ENG4U directly, without NBE3U?\" — можно ли после ESLEO сразу английский 12 класса; просто узнать опцию.\n7) \"Does the two online-learning-credits requirement apply to me? Can my parent sign the opt-out form?\" — про 2 обязательных онлайн-кредита; взять бланк отказа, подписывает взрослый.\n8) \"How many community involvement hours do I need — the full 40 or fewer, as a transfer student?\" — сколько волонтёрских часов лично мне; взять бланк учёта.\n9) \"Once my credits are assessed, can we rebuild my timetable?\" — пересобрать расписание после зачёта кредитов.",
      due: "2026-09-11",
      match: "guidance"
    },
    {
      title: "Начать волонтёрство",
      why: "Для диплома нужны волонтёрские часы: обычно 40, сколько именно тебе — ответ guidance (вопрос 8). Считается бесплатная помощь организациям: библиотека, школьные мероприятия, фудбанк. Часы пишутся на школьный бланк с подписью организации. Начатое в сентябре не горит в мае.",
      due: "2026-09-30",
      match: "волонтёрство"
    },
    {
      title: "Внести планы курсов семестра 1 в радар",
      why: "План курса (course outline) — листок от учителя в первую неделю: темы по порядку и даты всех тестов и сдач. Все даты → Радар («+ событие»). Фото всех листков → Архитектору: по ним он подгонит домашнюю программу под школьную.",
      due: "2026-09-12",
      match: "семестра 1 в радар"
    },
    {
      title: "Узнать дату OSSLT",
      why: "OSSLT — провинциальный тест грамотности, обязателен для диплома. Осеннее окно 3–30 ноября 2026. Ответ даст guidance (вопрос 5): если пишешь в ноябре — блок подготовки сдвинется раньше, сказать Архитектору.",
      due: "2026-10-15",
      match: "узнать дату osslt"
    },
    {
      title: "CEMC: записаться на CSMC",
      why: "CSMC — математический конкурс Университета Ватерлоо, 18 ноября 2026 (тренировочный год; зачётные для заявки — в 2027/28). Регистрацию объявляют в классе. Тихо до 10 октября — подойти к учителю математики самому: \"I'd like to write the CSMC in November — how do I register?\" Конкурсы усиливают заявку Waterloo (анкета AIF).",
      due: "2026-09-30",
      match: "csmc"
    },
    {
      title: "Выбор курсов года 2",
      why: "Решить шестой курс двенадцатого класса: EWC4U (писательское мастерство) или запасные CHY4U (история) / CLN4U (право) / HSE4M (равенство). Решается с Архитектором по прогрессу английского.",
      due: null, window: "февраль 2027",
      match: "выбор курсов года 2"
    },
    {
      title: "Внести планы курсов семестра 2 в радар",
      why: "То же, что осенью: даты из планов новых четырёх курсов → Радар, фото → Архитектору.",
      due: "2027-02-12",
      match: "семестра 2 в радар"
    },
    {
      title: "OSSLT весной",
      why: "Окно 30 марта – 19 апреля 2027 — если не писал в ноябре или не сдал.",
      due: null, window: "март–апрель 2027",
      match: "osslt весной"
    },
    {
      title: "Регистрация летней школы",
      why: "По текущему плану НЕ нужна: ESLEO уже в семестре 1 (дело осталось со старого плана, когда старт был с низкого уровня ESL). Если сетка года 1 идёт как задумано — просто закрой галочкой.",
      due: null, window: "конец апреля 2027",
      match: "регистрация летней школы"
    },
    {
      title: "Старт подготовки к IELTS",
      why: "IELTS — международный экзамен по английскому. Цель 7.0 — порог Schulich, остальным университетам хватит ниже. Старт — диагностика в летнем блоке.",
      due: "2027-07-15",
      match: "подготовки к ielts"
    },
    {
      title: "Внести планы курсов семестра 1 (год 2) в радар",
      why: "Оценки этого полугодия уходят прямо в заявки — даты заносить в первую же неделю.",
      due: "2027-09-17",
      match: "семестра 1 (год 2)"
    },
    {
      title: "Создать аккаунт OUAC и начать заявку",
      why: "OUAC — единая онлайн-заявка во все университеты Онтарио. Открывается в сентябре 2027: создать аккаунт, внести 5 программ, заполнять по частям.",
      due: "2027-10-15",
      match: "аккаунт ouac"
    },
    {
      title: "Сдать IELTS",
      why: "Результаты нужны к заявкам в январе; запись на дату — за месяц.",
      due: null, window: "октябрь–ноябрь 2027",
      match: "сдать ielts"
    },
    {
      title: "Supplementary-заявки пяти школ",
      why: "Доп. анкеты сверх OUAC: Kira (видеоинтервью Rotman) · анкета Schulich · PSE (Smith) · эссе AEO (Ivey) · AIF (Waterloo — сюда проекты, электроника и конкурсы). Кормятся твоими реальными проектами — вести список заранее.",
      due: null, window: "ноябрь 2027 – январь 2028",
      match: "supplementary"
    },
    {
      title: "Дедлайн OUAC",
      why: "Подать до этой даты = равное рассмотрение во всех университетах Онтарио.",
      due: "2028-01-15",
      match: "дедлайн ouac"
    },
    {
      title: "Внести планы курсов семестра 2 (год 2) в радар",
      why: "Финальная четвёрка из шестёрки — все даты в Радар.",
      due: "2028-02-11",
      match: "семестра 2 (год 2)"
    },
    {
      title: "Принять оффер",
      why: "Офферы приходят февраль–май. Выбрать университет и подтвердить до 1 июня.",
      due: "2028-06-01",
      match: "принять оффер"
    }
  ];

  /** Нормализация для сравнения названий: регистр и лишние пробелы не в счёт. */
  function normTitle(t) { return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  /**
   * Миграция текстов дел. Совпавшее по подстроке названия дело из плана
   * получает новые название, «зачем» и срок; статус done и дата закрытия
   * остаются, пользовательские дела не трогаются вовсе. Отсутствующие
   * создаются. Идемпотентна: match подобран так, что новое название тоже
   * ему удовлетворяет.
   */
  function migrateTodos() {
    var todos = State.s.todos || [];
    if (!todos.length) return 0;          // пустой список засеет seedTodos
    var used = {}, changed = 0;

    SEED_TODOS.forEach(function (seed) {
      var key = normTitle(seed.match || seed.title);
      var hit = null;
      todos.forEach(function (t) {
        if (hit || used[t.id] || t.source !== 'seed') return;
        if (normTitle(t.title).indexOf(key) >= 0) hit = t;
      });

      if (hit) {
        used[hit.id] = true;
        var same = hit.title === seed.title && hit.why === seed.why &&
          (hit.due || null) === (seed.due || null) &&
          (hit.window || null) === (seed.window || null);
        if (same) return;
        hit.title = seed.title;
        hit.why = seed.why;
        hit.due = seed.due || null;
        hit.window = seed.window || null;
        changed++;
        return;
      }

      todos.push({
        id: U.uid(), title: seed.title, why: seed.why,
        due: seed.due || null, window: seed.window || null,
        source: 'seed', done: false, doneDate: null
      });
      changed++;
    });

    if (changed) State.touch(true);
    return changed;
  }

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

  /**
   * Отметить или снять весь чек-лист разом — тап по кружку пункта плана
   * «Воскресный радар». Добавка +1 ставится и снимается вместе с ним.
   */
  function setChecklistAll(on, dateIso) {
    var date = dateIso || State.today();
    var d = State.day(date, true);
    d.checklist = CHECKLIST.map(function () { return !!on; });
    var has = d.addons.indexOf('radar') >= 0;
    if (on && !has) d.addons.push('radar');
    if (!on && has) d.addons.splice(d.addons.indexOf('radar'), 1);
    State.recount(date);
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
        return '<label class="check"><input type="checkbox" data-check="' + U.esc(i) + '"' +
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
      '<button class="btn pr" style="width:auto;min-height:44px;padding:0 14px" data-add-event>+ событие</button></div>';

    if (!upcoming.length && !past.length) {
      return head + UI.empty('📡', 'Радар пустой.<br>План курса (course outline) — листок от учителя ' +
        'с датами всех тестов; раздают в первую неделю.<br>Добавь первое событие, когда получишь.',
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
      '<div class="rowline">' +
      '<button class="rowbody" data-event-edit="' + U.esc(e.id) + '">' +
      '<div class="t">' + (track ? UI.trackDot(track) + ' ' : '<span class="dotmark dim"></span> ') +
      U.esc(e.course) + ' · ' + U.esc(type) + '</div>' +
      '<div class="s mono ' + cls + '">' + U.fmtShort(e.date) + ' · ' +
      (left < 0 ? 'прошло' : (left === 0 ? 'сегодня' : (left === 1 ? 'завтра' : 'через ' + U.days(left)))) +
      (track ? '' : ' · уроки по нему не назначаются') +
      (e.note ? ' · ' + U.esc(e.note) : '') + '</div></button>' +
      '<button class="rmini" data-event-done="' + U.esc(e.id) + '" aria-label="' +
      (e.done ? 'Вернуть событие в список' : 'Отметить событие пройденным') + '">' +
      (e.done ? '↺' : '✓') + '</button>' +
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
      '<button class="btn pr" style="width:auto;min-height:44px;padding:0 14px" data-add-todo>+ дело</button></div>' +
      '<p class="lead">Важное, не на один день. Висит, пока не нажата галочка.</p>';

    if (!active.length && !archive.length) {
      return head + UI.empty('🎯', 'Дел пока нет. Дело — это важное не на один день: ' +
        'разговор в guidance, волонтёрство, дедлайн заявки.',
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

  /** Первая строка «зачем» — она и остаётся видна в свёрнутом деле. */
  function whyFirstLine(why) {
    return String(why || '').split('\n')[0].trim();
  }

  /**
   * Дело: свёрнуто — название, срок и первая строка «зачем».
   * Тап по телу раскрывает полный текст: у дел вроде «9 вопросов guidance»
   * он многострочный, и переносы строк там несут смысл — печатаем как есть.
   * Правка ушла из тапа по телу на явную кнопку: раскрыть хочется часто,
   * а редактировать — редко.
   */
  function todoRow(t) {
    var cls = t.done ? 'dim' : dueClass(t.due);
    var open = !!openTodos[t.id];
    var why = String(t.why || '');
    var multi = why.indexOf('\n') >= 0 || why.length > 90;

    return '<div class="item ' + (t.done ? 'off' : '') + '">' +
      '<div class="rowline">' +
      '<button class="rowbody" data-todo-open="' + U.esc(t.id) + '" aria-expanded="' + open + '">' +
      '<div class="t">' + U.esc(t.title) + '</div>' +
      '<div class="s mono ' + cls + '">' +
      U.esc(t.done ? 'закрыто ' + (t.doneDate ? U.fmtShort(t.doneDate) : '') : dueText(t)) + '</div>' +
      (why
        ? (open
          ? '<div class="s dim todo-why">' + U.esc(why) + '</div>'
          : '<div class="s dim todo-why1">' + U.esc(whyFirstLine(why)) + '</div>')
        : '') +
      (why && multi && !open ? '<div class="tiny dim todo-more">▸ подробнее</div>' : '') +
      '</button>' +
      '<button class="rmini" data-todo-done="' + U.esc(t.id) + '" aria-label="' +
      (t.done ? 'Вернуть дело из архива' : 'Закрыть дело и убрать в архив') + '">' +
      (t.done ? '↺' : '✓') + '</button>' +
      '</div>' +
      (open
        ? '<div class="btn-row" style="margin-top:10px">' +
        '<button class="btn ghost" data-todo-edit="' + U.esc(t.id) + '">✏️ Править</button></div>'
        : '') +
      '</div>';
  }

  /* ---------- шторки добавления ---------- */

  function addEvent(existing) {
    var courses = Object.keys(CONTENT.COURSE_TRACK).concat(CONTENT.COURSES_NO_TRACK);
    var def = existing ? existing.date : U.addDays(State.today(), 7);
    var known = existing ? courses.indexOf(existing.course) >= 0 : true;
    var startCourse = existing ? (known ? existing.course : 'other') : courses[0];
    var startType = existing ? existing.type : TYPES[0].id;
    UI.sheet({
      title: existing ? 'Событие радара' : 'Новое событие',
      sub: 'Код курса — как он записан в твоём расписании. Тип, дата. Заметка — по желанию.',
      body:
        '<div class="chips" data-courses>' + courses.map(function (c) {
          return '<button class="chip' + (c === startCourse ? ' on' : '') + '" data-course="' + U.esc(c) +
            '" aria-pressed="' + (c === startCourse) + '">' + U.esc(c) + '</button>';
        }).join('') + '<button class="chip' + (startCourse === 'other' ? ' on' : '') +
        '" data-course="other" aria-pressed="' + (startCourse === 'other') + '">свой…</button></div>' +
        '<input class="txt' + (startCourse === 'other' ? '' : ' hidden') + '" data-other placeholder="код курса" value="' +
        (startCourse === 'other' ? U.esc(existing.course) : '') + '">' +
        '<div class="chips" data-types>' + TYPES.map(function (x) {
          return '<button class="chip' + (x.id === startType ? ' on' : '') + '" data-type="' + U.esc(x.id) +
            '" aria-pressed="' + (x.id === startType) + '">' + U.esc(x.name) + '</button>';
        }).join('') + '</div>' +
        '<input class="txt" type="date" data-date value="' + U.esc(def) + '">' +
        '<input class="txt" style="margin-top:8px" data-note placeholder="заметка (не обязательно)" value="' +
        U.esc((existing && existing.note) || '') + '">' +
        '<div class="ev-err tiny r" style="margin-top:8px"></div>' +
        '<div class="btn-row" style="margin-top:12px">' +
        '<button class="btn sec" data-cancel>Отмена</button>' +
        '<button class="btn pr" data-save>' + (existing ? 'Сохранить' : 'Добавить') + '</button></div>',
      onMount: function (root, close) {
        var course = startCourse;
        var type = startType;
        var other = root.querySelector('[data-other]');
        var err = root.querySelector('.ev-err');
        U.on(root, 'click', '[data-course]', function (e, el) {
          U.els('[data-course]', root).forEach(function (x) {
            x.classList.remove('on');
            x.setAttribute('aria-pressed', 'false');
          });
          el.classList.add('on');
          el.setAttribute('aria-pressed', 'true');
          course = el.dataset.course;
          other.classList.toggle('hidden', course !== 'other');
          if (course === 'other') other.focus();
        });
        U.on(root, 'click', '[data-type]', function (e, el) {
          U.els('[data-type]', root).forEach(function (x) {
            x.classList.remove('on');
            x.setAttribute('aria-pressed', 'false');
          });
          el.classList.add('on');
          el.setAttribute('aria-pressed', 'true');
          type = el.dataset.type;
        });
        root.querySelector('[data-cancel]').onclick = close;
        root.querySelector('[data-save]').onclick = function () {
          var code = course === 'other' ? (other.value || '').trim().toUpperCase() : course;
          if (!code) {
            err.textContent = 'Впиши код курса — по нему приложение находит дорожку.';
            other.focus();
            return;
          }
          var item = existing || { id: U.uid(), done: false };
          item.course = code;
          item.type = type;
          item.date = root.querySelector('[data-date]').value || def;
          item.note = (root.querySelector('[data-note]').value || '').trim();
          if (!existing) State.s.radar.push(item);
          State.touch();
          close();
          UI.toast(existing ? 'Событие ' + code + ' обновлено' : 'Событие ' + code + ' в радаре', 'ok');
        };
      }
    });
  }

  function addTodo(existing) {
    var t = existing || { title: '', why: '', due: '', window: '' };
    UI.sheet({
      title: existing ? 'Дело' : 'Новое дело',
      sub: 'Название · зачем · срок. Срок — дата или окно словами.',
      body:
        '<input class="txt" data-title placeholder="название" value="' + U.esc(t.title) + '">' +
        // «зачем» бывает списком в десяток строк — однострочное поле его резало
        '<textarea class="txt txt-why" style="margin-top:8px" data-why ' +
        'placeholder="зачем это нужно; можно в несколько строк">' + U.esc(t.why) + '</textarea>' +
        '<div class="seg" style="margin-top:10px" data-mode>' +
        '<button data-m="date" aria-pressed="' + (!t.window) + '">дата</button>' +
        '<button data-m="window" aria-pressed="' + (!!t.window) + '">окно</button></div>' +
        '<input class="txt' + (t.window ? ' hidden' : '') + '" style="margin-top:8px" type="date" data-due value="' + U.esc(t.due || '') + '">' +
        '<input class="txt' + (t.window ? '' : ' hidden') + '" style="margin-top:8px" data-window placeholder="например: конец апреля 2027" value="' + U.esc(t.window || '') + '">' +
        '<div class="todo-err tiny r" style="margin-top:8px"></div>' +
        '<div class="btn-row" style="margin-top:12px">' +
        '<button class="btn sec" data-cancel>Отмена</button>' +
        '<button class="btn pr" data-save>Сохранить</button></div>',
      onMount: function (root, close) {
        var mode = t.window ? 'window' : 'date';
        var err = root.querySelector('.todo-err');
        U.on(root, 'click', '[data-m]', function (e, el) {
          mode = el.dataset.m;
          U.els('[data-m]', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === el)); });
          root.querySelector('[data-due]').classList.toggle('hidden', mode !== 'date');
          root.querySelector('[data-window]').classList.toggle('hidden', mode !== 'window');
        });
        root.querySelector('[data-cancel]').onclick = close;
        root.querySelector('[data-save]').onclick = function () {
          var title = (root.querySelector('[data-title]').value || '').trim();
          if (!title) {
            err.textContent = 'Впиши название — по нему дело видно в списке.';
            root.querySelector('[data-title]').focus();
            return;
          }
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
    // тап по телу раскрывает «зачем», правка — отдельной кнопкой внутри
    U.on(host, 'click', '[data-todo-open]', function (e, el) {
      var id = el.dataset.todoOpen;
      openTodos[id] = !openTodos[id];
      App.renderScreen('radar');
    });
    U.on(host, 'click', '[data-todo-edit]', function (e, el) {
      e.stopPropagation();
      var t = (State.s.todos || []).filter(function (x) { return x.id === el.dataset.todoEdit; })[0];
      if (t) addTodo(t);
    });
    U.on(host, 'click', '[data-event-edit]', function (e, el) {
      var ev = (State.s.radar || []).filter(function (x) { return x.id === el.dataset.eventEdit; })[0];
      if (ev) addEvent(ev);
    });
    U.on(host, 'click', '[data-seed-todos]', function () {
      var n = seedTodos();
      State.touch();
      UI.toast(n ? 'Добавлено ' + n + ' ' + U.plural(n, 'дело', 'дела', 'дел') : 'Список уже загружен', 'ok');
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
    todoRow: todoRow, whyFirstLine: whyFirstLine, migrateTodos: migrateTodos,
    isOpen: function (id) { return !!openTodos[id]; },
    setOpen: function (id, on) { openTodos[id] = !!on; },
    seedTodos: seedTodos, burningCount: burningCount, todayBadge: todayBadge,
    dueClass: dueClass, dueText: dueText, openChecklist: openChecklist,
    checklistDone: checklistDone, checklistState: checklistState,
    toggleCheck: toggleCheck, setChecklistAll: setChecklistAll,
    mountToday: mountToday, addEvent: addEvent, addTodo: addTodo
  };
})();
