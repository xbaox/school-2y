/* Микрорелиз 2.6.2 «Ясность»: раскрытие и правка дел, миграция текстов,
   копи-аудит. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  /** Состояние со старыми делами — как у владельца до 2.6.2. */
  function oldTodos() {
    fresh();
    State.s.todos = [
      {
        id: 'a1', title: 'Placement-тест: английский + математика', why: 'старый текст',
        due: '2026-08-28', source: 'seed', done: true, doneDate: '2026-08-28'
      },
      {
        id: 'a2', title: 'Встреча с guidance + 7 вопросов', why: 'без Credit Counselling Summary план не финализируется',
        due: '2026-09-11', source: 'seed', done: false, doneDate: null
      },
      {
        id: 'a3', title: 'Узнать дату OSSLT', why: 'осеннее окно 3–30 ноября 2026',
        due: '2026-10-15', source: 'seed', done: true, doneDate: '2026-09-20'
      },
      {
        id: 'u1', title: 'МОЁ ЛИЧНОЕ ДЕЛО', why: 'не трогать',
        due: '2026-12-01', source: 'user', done: false, doneDate: null
      }
    ];
  }

  function byTitle(re) {
    return (State.s.todos || []).filter(function (t) { return re.test(t.title); })[0] || null;
  }

  describe('2.6.2: тексты дел — состав и полнота', function () {
    eq(Radar.SEED_TODOS.length, 17, 'семнадцать дел плана');

    Radar.SEED_TODOS.forEach(function (t) {
      ok(t.title && t.why, t.title + ': есть название и «зачем»');
      ok(t.due || t.window, t.title + ': есть срок — дата или окно');
      ok(t.match, t.title + ': есть ключ миграции');
    });

    var g = Radar.SEED_TODOS[0];
    eq(g.title, 'Guidance: 3 фразы + 9 вопросов', 'первое дело — разговор в guidance');
    eq((g.why.match(/^\d\) /gm) || []).length, 9, 'девять пронумерованных вопросов');
    ok(g.why.indexOf('Credit Counselling Summary') > 0, 'фраза про сводку кредитов');
    ok(g.why.indexOf('сводку зачтённых кредитов') > 0, 'и её русский перевод');
    ok(g.why.indexOf('How many credits will I get for my 10 grades in Russia') > 0, 'вопрос 1 по-английски');
    ok(g.why.indexOf('сколько кредитов зачтут за русскую школу') > 0, 'вопрос 1 по-русски');
    ok(g.why.indexOf('Once my credits are assessed') > 0, 'вопрос 9 по-английски');
    ok(g.why.split('\n').length > 10, 'текст многострочный — переносы несут смысл');

    var cemc = Radar.SEED_TODOS.filter(function (t) { return /CSMC/.test(t.title); })[0];
    ok(cemc, 'дело про конкурс CSMC заведено');
    eq(cemc.due, '2026-09-30', 'срок регистрации');
    ok(cemc.why.indexOf('математический конкурс Университета Ватерлоо') > 0, 'аббревиатура расшифрована');

    // каждая аббревиатура объясняется там же, где впервые появляется
    var pairs = [
      [/OSSLT/, 'провинциальный тест грамотности'],
      [/OUAC/, 'единая онлайн-заявка'],
      [/IELTS/, 'международный экзамен по английскому'],
      [/course outline/, 'листок от учителя']
    ];
    pairs.forEach(function (p) {
      var t = Radar.SEED_TODOS.filter(function (x) { return p[0].test(x.title) || p[0].test(x.why); })[0];
      ok(t && t.why.indexOf(p[1]) > 0, 'термин ' + p[0] + ' расшифрован в «зачем»');
    });
  });

  describe('2.6.2: миграция текстов дел', function () {
    oldTodos();
    var n = Radar.migrateTodos();
    ok(n > 0, 'миграция что-то сделала');

    var g = byTitle(/^Guidance: 3 фразы/);
    ok(g, 'старое «Встреча с guidance + 7 вопросов» переименовано');
    eq(g.id, 'a2', 'это та же запись, а не новая');
    ok(g.why.indexOf('Вопросы (ответы записывать на месте):') > 0, '«зачем» заменён целиком');

    var osslt = byTitle(/^Узнать дату OSSLT/);
    eq([osslt.done, osslt.doneDate], [true, '2026-09-20'], 'статус done и дата закрытия не тронуты');
    ok(osslt.why.indexOf('провинциальный тест грамотности') > 0, 'а текст обновился');

    var user = byTitle(/ЛИЧНОЕ ДЕЛО/);
    eq([user.title, user.why, user.due], ['МОЁ ЛИЧНОЕ ДЕЛО', 'не трогать', '2026-12-01'],
      'пользовательское дело не тронуто ничем');

    var placement = byTitle(/Placement-тест/);
    ok(placement, 'дело вне нового плана осталось на месте');
    eq(placement.why, 'старый текст', 'и его текст тоже');

    ok(byTitle(/CSMC/), 'отсутствовавшее дело создано');
    Radar.SEED_TODOS.forEach(function (seed) {
      ok(byTitle(new RegExp(seed.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
        'дело «' + seed.title + '» есть в списке');
    });

    // идемпотентность: второй прогон ничего не меняет и не плодит дублей
    var count = State.s.todos.length;
    eq(Radar.migrateTodos(), 0, 'повторная миграция ничего не меняет');
    eq(State.s.todos.length, count, 'и не создаёт дублей');
  });

  describe('2.6.2: миграция на чистом состоянии не мешает посеву', function () {
    fresh();
    State.s.todos = [];
    eq(Radar.migrateTodos(), 0, 'пустой список миграция не трогает');
    eq(Radar.seedTodos(), 17, 'его засевает seedTodos');
    eq(Radar.migrateTodos(), 0, 'после посева менять нечего');
  });

  describe('2.6.2: дело сворачивается и раскрывается', function () {
    oldTodos();
    Radar.migrateTodos();
    var g = byTitle(/^Guidance/);

    eq(Radar.whyFirstLine('первая\nвторая\nтретья'), 'первая', 'в свёрнутом виде — только первая строка');
    eq(Radar.whyFirstLine(''), '', 'пустое «зачем» не ломает');

    Radar.setOpen(g.id, false);
    var closed = Radar.todoRow(g);
    ok(closed.indexOf('todo-why1') > 0, 'свёрнуто — однострочный класс');
    eq(closed.indexOf('todo-why"'), -1, 'полного текста в свёрнутом нет');
    ok(closed.indexOf('▸ подробнее') > 0, 'подсказка, что есть продолжение');
    eq(closed.indexOf('data-todo-edit'), -1, 'кнопки правки в свёрнутом нет');
    ok(closed.indexOf('data-todo-open="' + g.id + '"') > 0, 'тело раскрывает, а не правит');
    ok(closed.indexOf('data-todo-done="' + g.id + '"') > 0, 'галочка на месте');

    Radar.setOpen(g.id, true);
    var open = Radar.todoRow(g);
    ok(open.indexOf('todo-why"') > 0, 'раскрыто — полный текст');
    ok(open.indexOf('data-todo-edit="' + g.id + '"') > 0, 'и кнопка «Править»');
    ok(open.indexOf('Править') > 0, 'подписана словом');
    ok(open.indexOf('data-todo-done="' + g.id + '"') > 0, 'галочка никуда не делась');
    ok(open.indexOf('9) ') > 0, 'девятый вопрос виден целиком');

    // короткое «зачем» без переносов не обещает продолжения
    var short = { id: 'x', title: 'т', why: 'коротко', due: null, done: false };
    Radar.setOpen('x', false);
    eq(Radar.todoRow(short).indexOf('подробнее'), -1, 'у короткого текста подсказки нет');
  });

  describe('2.6.2: копи-аудит — ноль жаргона', function () {
    fresh();
    var p = STEPS.params(State.s.step, '2026-08-26', 'summer');
    eq(p.stepLabel, 'Лето', 'слова «пресет» на экране нет');
    eq(STEPS.cardLine(p), 'Лето · ~30–35′ · 10–12 заданий · старт L1 · перенос ×1–2 · RU ≤30%',
      'строка ступени — как в ТЗ');
    ok(STEPS.CARD_LEGEND.indexOf('задач на применение в новой ситуации') > 0,
      '«перенос» подписан');
    ok(STEPS.CARD_LEGEND.indexOf('старт — с какого уровня начинается практика') === 0,
      'и «старт» тоже');

    // «водопад» — внутреннее слово, на экранах его быть не должно
    var screens = [
      App.screen('program').render(),
      App.screen('radar').render(),
      App.screen('journal').render()
    ].join(' ');
    eq(screens.toLowerCase().indexOf('водопад'), -1, 'слова «водопад» в UI нет');
    eq(screens.toLowerCase().indexOf('пресет'), -1, 'и «пресета» нет');
    eq(screens.toLowerCase().indexOf('свапн'), -1, 'и «свапнуть» нет');

    ok(App.screen('program').render().indexOf('Свежесть — сколько дней дорожку не трогали') > 0,
      'свежесть объясняет себя');

    // пустой Радар объясняет, что такое план курса, и зовёт к действию
    State.s.radar = [];
    var radar = App.screen('radar').render();
    ok(radar.indexOf('План курса (course outline)') > 0, 'термин расшифрован');
    ok(radar.indexOf('Добавь первое событие') > 0, 'пустое состояние зовёт к действию');
  });
})();
