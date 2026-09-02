/* 2.7.0 «Корень», этап 1: таксономия долгов, ремонт банка миграцией v3,
   источник дедлайна и правило серии.

   Банк долгов воспроизведён по слепку владельца от 02.09: те же id, дорожки,
   уроки создания и касания. Тексты — заглушки: канонические формулировки
   приходят из таблицы миграции, а личные записи ученика в репозитории
   хранить незачем. Цифры контроля — из ТЗ 1.2. */

(function () {
  'use strict';

  var LESSON_DATES = {
    'B1.1': '2026-08-23', 'B1.2': '2026-08-24', 'B1.3': '2026-08-29', 'B1.4': '2026-09-01',
    'B2.1': '2026-08-23', 'B2.2': '2026-08-24', 'B2.3': '2026-08-25', 'B2.4': '2026-08-28',
    'B3.1': '2026-09-02', 'B5.3': '2026-08-27'
  };

  /* did, дорожка, статус, касания, урок создания */
  var BANK = [
    ['D-1', 'write', 'open', ['B1.4'], 'B1.1'],
    ['D-2', 'write', 'open', ['B1.4'], 'B1.1'],
    ['D-3', 'write', 'open', ['B1.4'], 'B1.1'],
    ['D-4', 'write', 'closed', ['B1.4', 'B3.1'], 'B1.1'],
    ['D-5', 'math', 'open', ['B2.4'], 'B2.1'],
    ['D-6', 'math', 'open', ['B2.4'], 'B2.1'],
    ['D-8', 'math', 'open', ['B2.4'], 'B2.1'],
    ['D-9', 'math', 'open', ['B2.4'], 'B2.1'],
    ['D-10', 'write', 'open', ['B1.4'], 'B1.2'],
    ['D-11', 'write', 'open', [], 'B1.2'],
    ['D-12', 'write', 'open', [], 'B1.2'],
    ['D-13', 'write', 'open', [], 'B1.2'],
    ['D-14', 'write', 'open', [], 'B1.2'],
    ['D-15', 'math', 'open', ['B2.4'], 'B2.2'],
    ['D-16', 'math', 'open', [], 'B2.2'],
    ['D-17', 'math', 'open', [], 'B2.2'],
    ['D-18', 'math', 'open', [], 'B2.2'],
    ['D-19', 'math', 'open', [], 'B2.2'],
    ['D-20', 'math', 'open', [], 'B2.3'],
    ['D-21', 'math', 'open', [], 'B2.3'],
    ['D-22', 'math', 'open', [], 'B2.3'],
    ['D-23', 'math', 'open', [], 'B2.3'],
    ['D-24', 'math', 'open', [], 'B2.3'],
    ['D-25', 'biz', 'open', [], 'B5.3'],
    ['D-26', 'biz', 'open', [], 'B5.3'],
    ['D-27', 'biz', 'open', [], 'B5.3'],
    ['D-28', 'biz', 'open', [], 'B5.3'],
    ['D-29', 'math', 'open', [], 'B2.4'],
    ['D-30', 'math', 'open', [], 'B2.4'],
    ['D-31', 'math', 'open', [], 'B2.4'],
    ['D-32', 'math', 'open', [], 'B2.4'],
    ['D-33', 'math', 'open', [], 'B2.4'],
    ['D-34', 'write', 'open', [], 'B1.3'],
    ['D-35', 'write', 'open', [], 'B1.3'],
    ['D-36', 'write', 'open', [], 'B1.3'],
    ['D-37', 'write', 'open', [], 'B1.4'],
    ['D-38', 'write', 'open', [], 'B1.4'],
    ['D-39', 'write', 'open', [], 'B1.4'],
    ['D-40', 'write', 'open', [], 'B1.4'],
    ['D-41', 'write', 'open', [], 'B1.4'],
    ['D-42', 'write', 'open', [], 'B3.1'],
    ['D-43', 'write', 'open', [], 'B3.1'],
    ['D-44', 'write', 'open', [], 'B3.1']
  ];

  /** Слепок владельца до пакета «Корень»: 43 долга, схема 2. */
  function bank(extra) {
    var lessons = {};
    Object.keys(LESSON_DATES).forEach(function (id) {
      lessons[id] = { done: true, score: 8, date: LESSON_DATES[id] };
    });
    var st = {
      meta: { version: 2 },
      settings: {}, days: {}, lessons: lessons, blocks: {}, summaries: [], srs: {},
      stats: { wordsTotal: 0 },
      debts: BANK.map(function (r, i) {
        var d = {
          id: 'u' + i, did: r[0], track: r[1], status: r[2],
          clearedIn: r[3].slice(), createdIn: r[4], text: 'запись ученика ' + r[0]
        };
        if (r[2] === 'closed') d.closedDate = '2026-09-02';
        return d;
      })
    };
    return Object.assign(st, extra || {});
  }

  function find(state, did) {
    return state.debts.filter(function (d) { return d.did === did; })[0] || null;
  }
  function byStatus(state, st) {
    return state.debts.filter(function (d) { return d.status === st; });
  }
  function dids(list) { return list.map(function (d) { return d.did; }).sort(); }

  /* ============ 1.1 таксономия ============ */

  describe('2.7.0 таксономия: закрытый список категорий', function () {
    eq(State.DEBT_CATS.length, 19, 'девятнадцать категорий');
    var codes = State.DEBT_CATS.map(function (c) { return c.code; });
    var uniq = {};
    codes.forEach(function (c) { uniq[c] = true; });
    eq(Object.keys(uniq).length, 19, 'коды не повторяются');
    eq(State.catsForTrack('write').length, 10, 'на письме десять');
    eq(State.catsForTrack('math').length, 9, 'на математике девять');
    eq(State.catsForTrack('all').length, 19, 'дорожка all берёт обе');
    eq(State.catsForTrack().length, 19, 'без дорожки — тоже обе');
    ok(State.DEBT_CATS.every(function (c) { return c.name && c.name.length > 10; }),
      'у каждой категории есть человеческое название');
  });

  describe('2.7.0 таксономия: код знает свою дорожку', function () {
    eq(State.catTrack('П3'), 'write', 'П → письмо');
    eq(State.catTrack('М2'), 'math', 'М → математика');
    eq(State.catTrack('О1'), 'math', 'О1 (вход по видео) — математика');
    eq(State.catTrack('П99'), null, 'выдуманный код дорожки не имеет');
    eq(State.debtCat('П11'), null, 'кода вне списка нет');
    ok(!!State.debtCat('П10'), 'двузначный П10 читается как П10, не как П1');
    eq(State.debtCat('П10').track, 'write', 'и он с письма');
  });

  describe('2.7.0 таксономия: код принадлежит дорожке урока', function () {
    ok(State.catFitsTrack('П3', 'write'), 'свой код подходит');
    ok(!State.catFitsTrack('П3', 'math'), 'чужой — нет');
    ok(State.catFitsTrack('П3', 'all'), 'на дорожке all подходит любой');
    ok(State.catFitsTrack('М1', 'all'), 'и математический тоже');
    ok(!State.catFitsTrack('Ж1', 'all'), 'кода вне списка не бывает даже на all');
  });

  /* ============ 1.2 ремонт банка ============ */

  var out = State.migrate(bank());

  describe('2.7.0 миграция v3: контроль ТЗ 1.2', function () {
    eq(out.meta.version, 3, 'схема поднята до 3');
    eq(out.debts.length, 43, 'ни один долг не потерян — статусы, а не удаление');
    eq(byStatus(out, 'open').length, 14, 'открытых долгов 14');
    eq(byStatus(out, 'closed').length, 2, 'закрытых 2');
    eq(byStatus(out, 'checklist').length, 13, 'в чек-листе языка 13');
    eq(byStatus(out, 'merged').length, 13, 'поглощённых 13');
    eq(byStatus(out, 'deleted').length, 1, 'удалён 1');

    var open = byStatus(out, 'open');
    eq(dids(open.filter(function (d) { return d.track === 'write'; })),
      ['D-1', 'D-10', 'D-11', 'D-12', 'D-13', 'D-25', 'D-44'].sort(), 'семь на письме');
    eq(dids(open.filter(function (d) { return d.track === 'math'; })),
      ['D-15', 'D-17', 'D-19', 'D-21', 'D-5', 'D-8', 'D-9'].sort(), 'семь на математике');

    var half = open.filter(function (d) { return State.debtProgress(d) === 1; });
    eq(dids(half), ['D-1', 'D-10', 'D-15', 'D-5', 'D-8', 'D-9'].sort(), 'на «1/2» — шесть');
  });

  describe('2.7.0 миграция v3: в одной категории не бывает двух открытых', function () {
    var seen = {}, dupes = [];
    byStatus(out, 'open').forEach(function (d) {
      if (seen[d.cat]) dupes.push(d.cat); else seen[d.cat] = d.did;
    });
    eq(dupes, [], 'дубли категорий убиты структурно');
    ok(byStatus(out, 'open').every(function (d) { return !!State.debtCat(d.cat); }),
      'у каждого открытого долга валидный код категории');
  });

  describe('2.7.0 миграция v3: слияние сохраняет старейший id и примеры', function () {
    var d1 = find(out, 'D-1');
    eq(d1.cat, 'П7', 'категория из таблицы');
    eq(d1.text.indexOf('Баллы → объём'), 0, 'текст канонический');
    eq(d1.clearedIn, ['B1.4'], 'касания объединены по уникальным урокам');
    eq(d1.examples.length, 1, 'текст поглощённого стал примером');
    eq(d1.examples[0].text, 'запись ученика D-2', 'именно его формулировка');
    eq(d1.examples[0].lesson, 'B1.1', 'с уроком, где ошибка поймана');
    eq(d1.examples[0].date, '2026-08-23', 'и с датой этого урока');

    var d2 = find(out, 'D-2');
    eq(d2.status, 'merged', 'поглощённый долг помечен');
    eq(d2.mergedInto, 'D-1', 'и знает, куда ушёл');

    var d8 = find(out, 'D-8');
    eq(d8.examples.length, 4, 'D-8 поглотил четыре');
    eq(d8.clearedIn, ['B2.4'], 'касание одно: у поглощённых их не было');
    eq(State.debtProgress(d8), 1, 'значит 1/2');
  });

  describe('2.7.0 миграция v3: D-25 переезжает на дорожку письма', function () {
    var d = find(out, 'D-25');
    eq(d.track, 'write', 'дорожка biz исчезла вместе с блоком Б12');
    eq(d.cat, 'П6', 'категория — полные предложения');
    eq(d.examples.length, 3, 'три поглощённых долга стали примерами');
    eq(byStatus(out, 'open').filter(function (x) { return x.track === 'biz'; }).length, 0,
      'открытых долгов на biz не осталось');
  });

  describe('2.7.0 миграция v3: чек-лист, удаление, ручное закрытие', function () {
    eq(find(out, 'D-14').status, 'checklist', 'третье лицо -s — не долг, а чек-лист');
    eq(find(out, 'D-41').status, 'checklist', 'десятичная запятая — тоже');
    eq(State.openDebts().indexOf(find(out, 'D-14')), -1, 'из открытых чек-лист исключён');

    var dead = find(out, 'D-31');
    eq(dead.status, 'deleted', 'ложный долг удалён');
    eq(dead.reason, 'ложное правило', 'с причиной');

    var d3 = find(out, 'D-3');
    eq(d3.status, 'closed', 'D-3 закрыт вручную');
    eq(d3.closedDate, '2026-09-02', 'с датой закрытия');
    ok(d3.note.indexOf('B1.4') === 0, 'и с пояснением, чем отработан');
    eq(find(out, 'D-4').status, 'closed', 'D-4 как был закрыт, так и остался');
  });

  describe('2.7.0 миграция v3: новые поля есть у каждого долга', function () {
    ok(out.debts.every(function (d) { return Array.isArray(d.examples); }), 'examples');
    ok(out.debts.every(function (d) { return Array.isArray(d.failedIn); }), 'failedIn');
    ok(out.debts.every(function (d) { return d.lastInjected === null || typeof d.lastInjected === 'string'; }), 'lastInjected');
    ok(out.debts.every(function (d) { return d.shownCount === 0; }), 'shownCount');
  });

  describe('2.7.0 миграция v3: повторный прогон меняет ноль', function () {
    var one = State.migrate(bank());
    var two = State.migrate(JSON.parse(JSON.stringify(one)));
    eq(JSON.stringify(two), JSON.stringify(one), 'второй прогон идентичен первому');
    var three = State.migrate(JSON.parse(JSON.stringify(two)));
    eq(JSON.stringify(three), JSON.stringify(two), 'третий тоже');
    // и сам исходник, прогнанный дважды, даёт тот же результат (updatedAt
    // ставит blank() по часам — сравниваем всё остальное)
    function stable(st) { var c = JSON.parse(JSON.stringify(st)); c.meta.updatedAt = ''; return JSON.stringify(c); }
    eq(stable(State.migrate(bank())), stable(one), 'миграция детерминирована');
  });

  describe('2.7.0 миграция v3: долг вне таблиц не тронут', function () {
    var src = bank();
    src.debts.push({
      id: 'z1', did: 'D-60', track: 'math', status: 'open',
      clearedIn: ['B2.1'], createdIn: 'B2.1', text: 'долг следующего семестра'
    });
    var st = State.migrate(src);
    var d = find(st, 'D-60');
    eq(d.text, 'долг следующего семестра', 'текст не тронут');
    eq(d.status, 'open', 'статус не тронут');
    eq(d.clearedIn, ['B2.1'], 'касания не тронуты');
    eq(d.cat, undefined, 'категории у него нет — её присвоит парсер этапа 2');
  });

  describe('2.7.0 миграция v3: отчёт «было → стало»', function () {
    State.migrate(bank());
    var rep = State.migrationReport();
    eq(rep.debts.beforeTotal, 43, 'было 43');
    eq(rep.debts.before.open, 42, 'из них открытых 42');
    eq(rep.debts.before.closed, 1, 'и один закрытый');
    eq([rep.debts.after.open, rep.debts.after.closed, rep.debts.after.checklist,
      rep.debts.after.merged, rep.debts.after.deleted], [14, 2, 13, 13, 1],
      'стало: open · closed · checklist · merged · deleted');
    eq(rep.debts.progress1.length, 6, 'шесть на 1/2');
    eq(rep.debts.missing, [], 'все id таблиц нашлись в банке');
    eq(rep.cats.duplicates, [], 'дублей категорий нет');
  });

  /* ============ 1.2 ремонт слов ============ */

  describe('2.7.0 миграция v3: карточки-мусор вычищены', function () {
    var src = bank();
    src.summaries = [{
      lessonId: 'B3.1', date: '2026-09-02', raw: '', parsed: {
        words: [
          { en: 'main idea', ru: 'главная мысль' },
          { en: 'coverage test', ru: 'сколько строк накрывает' },
          { en: 'approximate fact', ru: 'приблизительный факт' },
          { en: 'conclusion drawn from', ru: 'вывод, сделанный из' },
          { en: 'topic', ru: 'тема' }
        ]
      }
    }];
    src.srs = { 'main idea': { status: 'learning', streak: 1 }, 'coverage test': { status: 'new', streak: 0 } };
    src.stats = { wordsTotal: 5 };
    var st = State.migrate(src);
    eq(st.summaries[0].parsed.words.map(function (w) { return w.en; }), ['main idea', 'topic'],
      'выдуманные термины ушли из банка слов');
    eq(Object.keys(st.srs).sort(), ['main idea'], 'и из накладки SRS');
    eq(st.stats.wordsTotal, 2, 'счётчик слов пересчитан по живому банку');
    var again = State.migrate(JSON.parse(JSON.stringify(st)));
    eq(again.stats.wordsTotal, 2, 'повторный прогон ничего не меняет');
  });

  /* ============ 1.3 источник дедлайна ============ */

  describe('2.7.0 дедлайны: миграция размечает источник', function () {
    var st = State.migrate(bank({
      blocks: {
        B7: { phase: 'p1', track: 'math', title: 'x', deadline: '2026-09-20', done: false },
        B8: { phase: 'p1', track: 'write', title: 'y', deadline: '2026-09-13', done: false },
        B1: { phase: 'p0', track: 'write', title: 'z', deadline: '2026-08-29', done: false },
        B99: { phase: 'p1', track: 'math', title: 'без срока', deadline: null, done: false }
      }
    }));
    eq(st.blocks.B7.deadlineSource, 'content', 'совпал с контентным — значит его поставил контент');
    eq(st.blocks.B8.deadlineSource, 'user', 'не совпал — считаем, что срок двигали руками');
    eq(st.blocks.B1.deadlineSource, 'content', 'Ф0 сверяется с P0_DEADLINES');
    eq(st.blocks.B99.deadlineSource, undefined, 'срока нет — источника тоже');
  });

  describe('2.7.0 дедлайны: контент переписывает свой же срок', function () {
    State.replace({
      meta: { version: 3 }, settings: {}, days: {}, debts: [], summaries: [], lessons: {},
      blocks: { B7: { phase: 'p1', track: 'math', title: 'x', deadline: '2026-09-13', done: false, deadlineSource: 'content' } }
    }, true);
    State.syncContent();
    eq(State.block('B7').deadline, '2026-09-20', 'новый пакет контента доехал до пользователя');
    eq(State.block('B7').deadlineSource, 'content', 'источник остался контентным');
  });

  describe('2.7.0 дедлайны: руками поставленное контент не трогает', function () {
    ['user', 'shift'].forEach(function (src) {
      State.replace({
        meta: { version: 3 }, settings: {}, days: {}, debts: [], summaries: [], lessons: {},
        blocks: { B7: { phase: 'p1', track: 'math', title: 'x', deadline: '2026-09-13', done: false, deadlineSource: src } }
      }, true);
      State.syncContent();
      eq(State.block('B7').deadline, '2026-09-13', 'источник «' + src + '» неприкосновенен');
      eq(State.block('B7').deadlineSource, src, 'и метка не сменилась');
    });
  });

  describe('2.7.0 дедлайны: ручная правка и сдвиг фазы метят источник', function () {
    State.reset();
    State.syncContent();
    eq(State.block('B7').deadlineSource, 'content', 'на чистой установке срок ставит контент');

    State.setDeadline('B7', '2026-10-01');
    eq(State.block('B7').deadlineSource, 'user', 'ручная правка — user');
    State.syncContent();
    eq(State.block('B7').deadline, '2026-10-01', 'и контент её больше не переписывает');

    State.shiftPhase('p1', 3);
    eq(State.block('B8').deadlineSource, 'shift', 'сдвиг фазы — shift');
    eq(State.block('B8').deadline, '2026-10-07', 'дата сдвинулась на три дня');
    State.syncContent();
    eq(State.block('B8').deadline, '2026-10-07', 'и контент её не вернул');
  });

  /* ============ 1.4 серия ============ */

  describe('2.7.0 серия: держат урок и минималка, а не очки', function () {
    State.reset();
    var t = State.today();
    var y = U.addDays(t, -1);

    State.s.days[y] = { level: 'full', addons: ['project'], lessons: [], points: 5 };
    ok(!State.holdsStreak(y), 'день с «Проектом», без урока и без минималки — пустой');

    State.s.days[y] = { level: 'min', addons: ['club', 'test', 'extra'], lessons: [], points: 8 };
    ok(!State.holdsStreak(y), 'клуб, тест и доп. урок очки дают, а серию не держат');

    State.s.days[y] = { level: 'min', addons: [], lessons: [], points: 1, minimalSteps: [true, true] };
    ok(State.holdsStreak(y), 'выполненная минималка держит');

    State.s.days[y] = { level: 'min', addons: [], lessons: [], points: 1, minimalSteps: [true, false] };
    ok(!State.holdsStreak(y), 'половина минималки — не минималка');

    State.s.days[y] = { level: 'none', addons: [], lessons: ['B1.1'], points: 0 };
    ok(State.holdsStreak(y), 'закрытый урок держит даже без выбранного уровня');

    // радар-день — именно воскресенье; y — произвольный день недели, тут нужны даты
    State.s.days['2026-09-13'] = { level: 'none', addons: ['radar'], lessons: [], points: 1 };
    ok(State.holdsStreak('2026-09-13'), 'воскресный радар — исключение доктрины, такой день не пустой');
    State.s.days['2026-09-09'] = { level: 'none', addons: ['radar'], lessons: [], points: 1 };
    ok(!State.holdsStreak('2026-09-09'), 'радар в среду очки даёт, а серию не держит');
  });

  describe('2.7.0 серия: добавки больше не тянут её в одиночку', function () {
    State.reset();
    var t = State.today();
    // четыре дня подряд одни добавки: очки есть, учёбы нет
    for (var i = 1; i <= 4; i++) {
      State.s.days[U.addDays(t, -i)] = { level: 'none', addons: ['project'], lessons: [], points: 2 };
    }
    eq(State.streak(), 0, 'серия на одних добавках не живёт');
    // не weekPoints: неделя считается пн–вс, и в понедельник все четыре дня
    // уезжают в прошлую неделю — проверка ловила бы день недели, а не правило
    ok(State.points(U.addDays(t, -1)) > 0, 'но очки за них по-прежнему начисляются');

    // тот же ряд, но с минималкой — серия жива
    for (var j = 1; j <= 4; j++) {
      State.s.days[U.addDays(t, -j)].minimalSteps = [true, true];
    }
    eq(State.streak(), 4, 'минималка держит все четыре дня');
  });

  describe('2.7.0 серия: два пустых дня подряд её ещё не рвут', function () {
    State.reset();
    var t = State.today();
    State.s.days[U.addDays(t, -1)] = { level: 'none', addons: [], lessons: [], points: 0 };
    State.s.days[U.addDays(t, -2)] = { level: 'none', addons: ['project'], lessons: [], points: 2 };
    State.s.days[U.addDays(t, -3)] = { level: 'norm', addons: [], lessons: ['B1.1'], points: 2 };
    State.s.days[U.addDays(t, -4)] = { level: 'min', addons: [], lessons: [], points: 1, minimalSteps: [true, true] };
    eq(State.streak(), 2, 'два дня учёбы за двумя пустыми — правило доктрины цело');
    eq(State.emptyInRow(), 2, 'и пустых подряд ровно два');
  });

  describe('2.7.0 миграция v3: импортированным дням достроена минималка', function () {
    var st = State.migrate(bank({
      days: {
        '2026-07-19': { level: 'min', addons: [], points: 1, lessons: [], imported: true },
        '2026-07-20': { level: 'norm', addons: [], points: 2, lessons: [] },
        '2026-07-21': { level: 'none', addons: [], points: 0, lessons: [] },
        '2026-07-22': { level: 'min', addons: [], points: 1, lessons: [], minimalSteps: [false, false] }
      }
    }));
    eq(st.days['2026-07-19'].minimalSteps, [true, true],
      'у дня из v1 поля не было, а уровень «Минималка» и значил, что она сделана');
    eq(st.days['2026-07-20'].minimalSteps, undefined,
      'день без пометки imported не трогаем: это может быть сегодняшний, ещё не прожитый');
    eq(st.days['2026-07-21'].minimalSteps, undefined, 'пустой день остаётся пустым');
    eq(st.days['2026-07-22'].minimalSteps, [false, false], 'уже проставленное не переписываем');
    eq(State.migrationReport().days.minimalBackfilled, 1, 'достроен ровно один день');
  });

  describe('2.7.0 серия: откат ступени судит по тому же правилу, что экран «Сегодня»', function () {
    // до 2.7.0 stepsflow считал разрыв по очкам, и одна добавка в день делала
    // откат «серия прервалась» недостижимым — правило 1.4 обходилось изнутри
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.step.position = 3;
    var t = State.today();
    // учёба четыре дня назад: история есть, и пустых подряд ровно три
    State.s.days[U.addDays(t, -4)] = { level: 'min', addons: [], lessons: [], points: 1, minimalSteps: [true, true] };
    // три дня подряд одни добавки: очки идут, учёбы нет
    [1, 2, 3].forEach(function (i) {
      State.s.days[U.addDays(t, -i)] = { level: 'none', addons: ['project'], lessons: [], points: 2 };
    });
    eq(State.emptyInRow(), 3, 'три пустых дня подряд');
    eq(StepsFlow.checkDemotion(), true, 'ступень откатилась: серия прервалась');
    eq(State.s.step.position, 2, 'на одну вниз');
    State.setMode('summer');
  });

  describe('2.7.0 серия: перенесённая онбордингом серия жива', function () {
    // онбординг пишет дни ПОСЛЕ миграции — достроить их некому,
    // поэтому минималку он обязан проставлять сам
    State.reset();
    var t = State.today();
    for (var i = 1; i <= 5; i++) {
      State.s.days[U.addDays(t, -i)] = { level: 'min', addons: [], lessons: [], points: 1, imported: true, minimalSteps: [true, true] };
    }
    eq(State.streak(), 5, 'пять перенесённых дней держат серию');
    eq(State.emptyInRow(), 0, 'и ни одного пустого дня позади');
    // тот же день без минималки — ровно то, что онбординг писал до 2.7.0
    delete State.s.days[U.addDays(t, -1)].minimalSteps;
    ok(!State.holdsStreak(U.addDays(t, -1)),
      'без minimalSteps перенесённый день серию не держит — потому onboarding.js их и ставит');
  });
  // экраны дальше по алфавиту получают чистое состояние
  State.reset();
  State.syncContent();
})();
