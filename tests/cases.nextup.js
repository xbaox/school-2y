/* Микрорелиз 2.6.3: хвост «Сегодня» — блок «Дальше». */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary() {
    return {
      score: 8, level: 'L2', topics: 'тема', words: [], debts: [],
      cleared: [], warmup: [], writing: '', raw: ''
    };
  }

  // 2026-08-26 — среда, 2026-08-29 — суббота, 2026-08-30 — воскресенье
  var WED = '2026-08-26';
  var SAT = '2026-08-29';

  describe('2.6.3: «Дальше» на обычном дне — следующий непройденный урок', function () {
    fresh();
    eq(U.weekday(WED), 3, 'среда');

    var line = App.nextUp(WED);
    ok(line.indexOf('Дальше: ') === 0, 'строка начинается с «Дальше: »');
    ok(/^Дальше: [^·]+ · Б\d+\.\d+ „.+“$/.test(line), 'формат «дорожка · код · название»: ' + line);

    // это ровно тот урок, который назначило бы правило выбора
    var pick = Waterfall.pick(WED, { force: true });
    var l = CONTENT.lesson(pick.lessonId);
    ok(line.indexOf(l.title) > 0, 'название взято у выбранного урока');
    ok(line.indexOf(State.blockLabel(l.blockId) + '.' + State.lessonNum(pick.lessonId)) > 0,
      'и его код');
    ok(line.indexOf(State.trackName(State.block(l.blockId).track)) > 0, 'и дорожка');

    // превью ничего не меняет: ни дня, ни отметок
    var before = JSON.stringify(State.s.days);
    App.nextUp(WED);
    App.nextUp(WED);
    eq(JSON.stringify(State.s.days), before, 'состояние дня не тронуто');
    eq((State.s.days[WED] || {}).pick, undefined, 'урок дня не назначен');

    // закрыли этот урок — «Дальше» показывает уже следующий
    State.applySummary(pick.lessonId, summary(), { date: WED });
    var after = App.nextUp(WED);
    ok(after !== line, 'после закрытия строка сменилась');
    eq(after.indexOf(CONTENT.lesson(pick.lessonId).title), -1, 'закрытого урока в ней нет');
  });

  describe('2.6.3: «Дальше» в субботу — про воскресный радар-день', function () {
    fresh();
    eq(U.weekday(SAT), 6, 'суббота');
    eq(U.weekday(U.addDays(SAT, 1)), 7, 'а завтра воскресенье');

    eq(App.nextUp(SAT), 'Завтра — радар-день: урока нет, чек-лист даёт +1',
      'вместо урока — предупреждение про радар-день');

    // и это важнее превью: уроки в программе есть, но завтра их не будет
    ok(Waterfall.pick(SAT, { force: true }).lessonId, 'урок для показа существует');

    // в само воскресенье завтра уже понедельник — обычное превью
    ok(App.nextUp('2026-08-30').indexOf('Дальше: ') === 0, 'в воскресенье строка обычная');
  });

  describe('2.6.3: «Дальше» при закрытой фазе', function () {
    fresh();
    // закрываем все живые уроки Ф0
    Object.keys(State.s.blocks).forEach(function (b) {
      State.activeLessons(b).forEach(function (l) {
        State.applySummary(l.id, summary(), { date: WED });
      });
    });
    eq(State.nextLesson(), null, 'непройденных уроков не осталось');

    eq(App.nextUp(WED), 'Фаза закрыта — Ф1 стартует 08.09',
      'говорим, что и когда начнётся');

    // в субботу правило про радар-день всё равно первое
    eq(App.nextUp(SAT), 'Завтра — радар-день: урока нет, чек-лист даёт +1',
      'воскресенье важнее закрытой фазы');
  });

  describe('2.6.3: «Дальше» стоит в хвосте экрана и не кликается', function () {
    fresh();
    State.s.onboarded = true;
    // берём сам экран, а не запись в реестре: cases.handlers.js её подменяет
    var html = App.Today.render();
    ok(html && html.length > 200, 'экран «Сегодня» отрисовался');
    ok(html.indexOf('<div class="nextup">') > 0, 'блок на экране');
    ok(html.lastIndexOf('nextup') > html.lastIndexOf('ifthen'), 'и он последний в потоке');
    var tail = html.slice(html.lastIndexOf('<div class="nextup">'));
    eq(tail.indexOf('<button'), -1, 'внутри нет кнопок');
    eq(tail.indexOf('data-'), -1, 'и ни одного обработчика');
  });
})();
