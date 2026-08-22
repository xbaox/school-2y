/* Доктрина (раздел 2 ТЗ) и даты (раздел 7.8). Эти проверки менять нельзя. */

describe('даты: граница дня 04:00', function () {
  eq(U.today(new Date(2026, 7, 22, 3, 59)), '2026-08-21', 'до 04:00 — вчерашний день');
  eq(U.today(new Date(2026, 7, 22, 4, 0)), '2026-08-22', 'в 04:00 — уже сегодня');
  eq(U.today(new Date(2026, 7, 22, 23, 30)), '2026-08-22', 'вечер — сегодня');
  eq(U.addDays('2026-08-31', 1), '2026-09-01', 'переход через месяц');
  eq(U.addDays('2026-01-01', -1), '2025-12-31', 'переход через год назад');
  eq(U.diffDays('2026-08-18', '2026-08-23'), 5, 'разница в днях');
  eq(U.weekday('2026-08-22'), 6, 'суббота = 6');
  eq(U.weekday('2026-08-23'), 7, 'воскресенье = 7');
  eq(U.weekStart('2026-08-23'), '2026-08-17', 'неделя начинается с понедельника');
  eq(U.weekStart('2026-08-17'), '2026-08-17', 'понедельник — сам себе начало');
  eq(U.fmtShort('2026-08-26'), '26 авг', 'короткая дата');
  eq(U.plural(1, 'день', 'дня', 'дней'), 'день', 'склонение 1');
  eq(U.plural(2, 'день', 'дня', 'дней'), 'дня', 'склонение 2');
  eq(U.plural(5, 'день', 'дня', 'дней'), 'дней', 'склонение 5');
  eq(U.plural(11, 'день', 'дня', 'дней'), 'дней', 'склонение 11');
  eq(U.plural(21, 'день', 'дня', 'дней'), 'день', 'склонение 21');
});

describe('доктрина 1: уровни вложенные, очки не суммируются', function () {
  eq(DOCTRINE.dayPoints({ level: 'none', addons: [] }), 0, 'пусто = 0');
  eq(DOCTRINE.dayPoints({ level: 'min', addons: [] }), 1, 'минималка = 1');
  eq(DOCTRINE.dayPoints({ level: 'norm', addons: [] }), 2, 'норма = 2');
  eq(DOCTRINE.dayPoints({ level: 'full', addons: [] }), 3, 'полная = 3');
});

describe('доктрина 2: добавки плюсуются к любому уровню', function () {
  eq(DOCTRINE.dayPoints({ level: 'full', addons: ['extra'] }), 6, 'полная + доп. урок = 3+3');
  eq(DOCTRINE.dayPoints({ level: 'min', addons: ['club'] }), 3, 'минималка + клуб = 1+2');
  eq(DOCTRINE.dayPoints({ level: 'none', addons: ['project'] }), 2, 'пусто + проект = 0+2');
  eq(DOCTRINE.dayPoints({ level: 'norm', addons: ['test', 'radar'] }), 5, 'норма + тест + радар = 2+2+1');
  eq(DOCTRINE.dayPoints({ level: 'full', addons: ['extra', 'club', 'test', 'project', 'radar'] }), 13, 'все добавки');
});

describe('доктрина 3: серия при ≥1 очке, не больше 2 пустых подряд', function () {
  function fromMap(map) { return function (d) { return map[d] || 0; }; }

  eq(DOCTRINE.streak(fromMap({
    '2026-08-22': 2, '2026-08-21': 1, '2026-08-20': 3
  }), '2026-08-22'), 3, 'три дня подряд с очками');

  eq(DOCTRINE.streak(fromMap({
    '2026-08-22': 0, '2026-08-21': 1, '2026-08-20': 2
  }), '2026-08-22'), 2, 'сегодня пусто — серия ещё жива');

  eq(DOCTRINE.streak(fromMap({
    '2026-08-22': 1, '2026-08-21': 0, '2026-08-20': 0, '2026-08-19': 2, '2026-08-18': 2
  }), '2026-08-22'), 3, 'два пустых внутри серию не рвут');

  eq(DOCTRINE.streak(fromMap({
    '2026-08-22': 1, '2026-08-21': 0, '2026-08-20': 0, '2026-08-19': 0, '2026-08-18': 5
  }), '2026-08-22'), 1, 'три пустых подряд рвут серию');

  eq(DOCTRINE.streak(fromMap({}), '2026-08-22'), 0, 'пустая история — ноль');

  eq(DOCTRINE.emptyInRow(fromMap({ '2026-08-21': 0, '2026-08-20': 0, '2026-08-19': 1 }), '2026-08-22'),
    2, 'два пустых дня позади');
});

describe('доктрина 6: ранги недели', function () {
  function fromMap(map) { return function (d) { return map[d] || 0; }; }
  ok(DOCTRINE.rankFor(3) === null, 'ранга нет при 3 очках');
  eq(DOCTRINE.rankFor(4).name, 'Искра', '4+ Искра');
  eq(DOCTRINE.rankFor(6).name, 'Искра', '6 — всё ещё Искра');
  eq(DOCTRINE.rankFor(7).name, 'Ритм', '7+ Ритм');
  eq(DOCTRINE.rankFor(11).name, 'Разгон', '11+ Разгон');
  eq(DOCTRINE.rankFor(14).name, 'Сила', '14+ Сила');
  eq(DOCTRINE.rankFor(17).name, 'Огонь', '17+ Огонь');
  eq(DOCTRINE.rankFor(21).name, 'Легенда', '21+ Легенда');
  eq(DOCTRINE.rankFor(99).name, 'Легенда', 'выше Легенды рангов нет');
  eq(DOCTRINE.nextRank(5).rank.name, 'Ритм', 'следующий после Искры');
  eq(DOCTRINE.nextRank(5).left, 2, 'до Ритма 2 очка');
  ok(DOCTRINE.nextRank(30) === null, 'после Легенды следующего нет');

  // неделя пн–вс
  eq(DOCTRINE.weekPoints(fromMap({
    '2026-08-17': 2, '2026-08-20': 3, '2026-08-23': 1, '2026-08-24': 5
  }), '2026-08-22'), 6, 'считается только пн 17 – вс 23');
});
