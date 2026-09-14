/* 2.7.6, этап 8: миграция данных 2.7.6 (ТЗ 2.7.6 §3).

   Фикстура повторяет форму состояния владельца на 13.09, но не его данные:
   карточка вопросов и дела — из посева приложения, слова и дни условные.
   Схема остаётся 3, маркер — meta.migrations; каждый шаг M1–M6 сам проверяет,
   нужен ли он, поэтому второй прогон — нулевой diff и без маркера. */

(function () {
  'use strict';

  var STAMP = '2026-09-13T16:01:36.617Z';

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /** Карточка вопросов, как её посеял и добрал 2.7.5: восемь пунктов. */
  function card8() {
    State.reset();
    Radar.seedQuestions();
    var e = clone(State.s.radar.filter(function (x) { return x.id === 'q-2026-09-08'; })[0]);
    e.items[0].done = true;
    return e;
  }

  function seedTodo(id, i) {
    var t = Radar.SEED_TODOS[i];
    return { id: id, due: t.due || null, why: t.why, done: false, title: t.title, source: 'seed', window: null, doneDate: null };
  }

  function owner() {
    var courses = clone(State.SCHOOL_COURSES);
    return {
      meta: { updatedAt: STAMP, version: 3, onboardedAt: '2026-08-22' },
      settings: { mode: 'school', schoolCourses: courses },
      radar: [card8()],
      todos: [seedTodo('mt4vmss1jqr1hf', 0), seedTodo('t-vol', 1), seedTodo('mt4vmss12dy03k', 2)],
      summaries: [
        { lessonId: 'B6.2', date: '2026-09-08', raw: '', parsed: { score: 8, level: 'L2',
          words: [{ en: 'angle of elevation', ru: 'угол подъёма' }, { en: 'Inverse Sine ', ru: 'арксинус' }] } },
        { lessonId: 'B53.1', date: '2026-09-12', raw: '', parsed: { score: 9, level: 'L3',
          words: [{ en: 'consecutive', ru: 'последовательные' }, { en: 'angle of elevation', ru: 'угол подъёма' }] } }
      ],
      lessons: { 'B6.2': { done: true, score: 8, date: '2026-09-08' }, 'B53.1': { done: true, score: 9, date: '2026-09-12' } },
      srs: { 'angle of elevation': { status: 'known', streak: 3, step: 0, due: '2026-09-20' } },
      stats: { wordsTotal: 3, lessonsDone: 2, bestStreak: 55, stretchDone: 1 },
      days: {
        '2026-09-08': { level: 'norm', addons: [], points: 2, lessons: ['B6.2'], minimalSteps: [true, true] },
        '2026-09-09': { level: 'norm', addons: [], points: 2, lessons: [] },
        '2026-09-11': { hw: 'HW-2026-09-11-math', level: 'min', addons: [], points: 1, hwMoved: 'B7.1', lessons: [],
          hwCourse: 'MHF4U', minimalSteps: [true, true] },
        '2026-09-13': { level: 'norm', addons: ['radar'], points: 3, lessons: [], minimalSteps: [true, true] }
      },
      debts: [], hw: {}, cards: { lastDay: '2026-09-13', viewedToday: 16, seen: [], cursor: 15, cursorDay: '2026-09-13', doneDay: '2026-09-12' },
      scale: { stage: 'S0', since: '2026-09-02' }
    };
  }

  function byId(list, id) { return (list || []).filter(function (x) { return x && x.id === id; })[0]; }

  describe('2.7.6 миграция: M1–M6 на состоянии формы владельца', function () {
    withToday('2026-09-13', function () {
      var src = owner();
      var raw = clone(src);
      var st = State.migrate(src);
      var rep = State.migrationReport276();

      eq(st.meta.migrations, ['2.7.6'], 'маркер выполнения записан');
      eq(st.meta.version, 3, 'схема осталась третьей');
      eq(st.meta.updatedAt, STAMP, 'updatedAt миграция не двигает');

      // M1
      var cs = st.settings.schoolCourses.filter(function (c) { return c.track === 'cs'; });
      eq(cs.length, 1, 'курс информатики один');
      eq([cs[0].code, cs[0].name, cs[0].editable],
        ['ICS3UE', 'Computer Science online — информатика 11 класса, e-learning (Brightspace)', true], 'M1: ICS3UE');

      // M2
      eq(rep.m2.length, 9, 'M2: девять событий');
      eq(st.radar.length, 10, 'радар: девять событий и карточка');
      var quiz = byId(st.radar, 'ev-2026-09-15-quiz-mhf4u');
      eq(quiz, { id: 'ev-2026-09-15-quiz-mhf4u', done: false, course: 'MHF4U', type: 'quiz', date: '2026-09-15',
        note: 'Квиз MHF4U — разделы 1.1–1.3 (таблица 7×9 + модуль)' }, 'схема события — как у «+ событие»');
      ok(st.radar.every(function (e) {
        return e.type === 'questions' || Radar.TYPES.some(function (t) { return t.id === e.type; });
      }), 'новых типов событий нет');
      eq(byId(st.radar, 'ev-2026-09-14-guidance').course, '', 'у записи к консультанту курса нет');
      eq(CONTENT.trackForCourse(byId(st.radar, 'ev-2026-09-16-ics3ue-zoom').course), 'cs', 'ICS3UE → информатика');
      eq(CONTENT.trackForCourse(byId(st.radar, 'ev-2026-09-25-eng2d-poetry').course), 'write', 'ENG2D → письмо');

      // M3
      var q = byId(st.radar, 'q-2026-09-08');
      eq([q.type, q.title, q.date, q.items.length], ['questions', 'Консультант, пн 14.09 — три вопроса', '2026-09-14', 3],
        'M3: тип тот же, заголовок, дата, три пункта');
      eq(q.items.map(function (x) { return [x.who, x.done, x.note]; }),
        [['консультанту (guidance)', false, ''], ['консультанту (guidance)', false, ''], ['консультанту (guidance)', false, '']],
        'кому, не отмечено, поле ответа пустое');
      ok(q.items[0].en.indexOf('Could I get a printed Credit Counselling Summary?') === 0, 'первый — Credit Counselling Summary');
      eq(q.items[2].ru, 'OSSLT: я в списке на ноябрь, и какая дата?', 'третий — OSSLT');

      // M4
      var g = byId(st.todos, 'mt4vmss1jqr1hf'), o = byId(st.todos, 'mt4vmss12dy03k');
      eq([g.title, g.due, g.done], ['Guidance: записаться (пн 14.09, третий период) — три вопроса в Радаре', '2026-09-14', false],
        'M4: дело guidance');
      ok(g.why.indexOf('Ответы — одной строкой в карточку Радара q-2026-09-08') === 0, 'и его «зачем»');
      eq([o.title, o.due], [Radar.SEED_TODOS[2].title, '2026-10-15'], 'M4: второе дело — срок, название прежнее');
      ok(o.why.indexOf('Внесено пакетом 2.7.6') === 0, 'и его «зачем»');
      eq(byId(st.todos, 't-vol'), raw.todos[1], 'чужое дело не тронуто');

      // M5
      eq(Object.keys(st.srs).sort(), ['angle of elevation', 'consecutive', 'inverse sine'], 'M5: слова итогов в SRS по ключу');
      eq(st.srs['inverse sine'], { status: 'learning', step: 0, streak: 0, due: '2026-09-13' }, 'форма записи по ТЗ');
      eq(st.srs['angle of elevation'], raw.srs['angle of elevation'], 'выученное слово не тронуто');
      eq(st.stats.wordsTotal, 3, 'wordsTotal = размер SRS');

      // M6
      eq([st.days['2026-09-09'].level, st.days['2026-09-09'].points], ['none', 0], 'M6: 09.09 → пусто, 0 очков');
      ['2026-09-08', '2026-09-11', '2026-09-13'].forEach(function (d) {
        eq(st.days[d], raw.days[d], 'день ' + d + ' не тронут');
      });

      // не трогать
      ['summaries', 'lessons', 'debts', 'hw', 'cards', 'scale'].forEach(function (k) {
        eq(st[k], raw[k], k + ' не тронуты');
      });
      eq([st.stats.lessonsDone, st.stats.bestStreak, st.stats.stretchDone], [2, 55, 1], 'статистика, кроме счётчика слов, прежняя');
    });
  });

  describe('2.7.6 миграция: второй прогон — нулевой diff, с маркером и без', function () {
    withToday('2026-09-13', function () {
      var once = State.migrate(owner());
      var twice = State.migrate(clone(once));
      eq(JSON.stringify(twice), JSON.stringify(once), 'второй прогон ничего не меняет');
      eq(State.migrationReport276(), null, 'и сам шаг 2.7.6 не запускался');

      // маркер потерян (например, старое устройство пушнуло без него) — шаги узнают себя сами
      var lost = clone(once);
      delete lost.meta.migrations;
      var again = State.migrate(lost);
      var r = State.migrationReport276();
      eq([r.m1, r.m2.length, r.m3, r.m4.length, r.m5, r.m6], [0, 0, 0, 0, 0, 0], 'без маркера ни один шаг не сработал');
      eq(JSON.stringify(again), JSON.stringify(once), 'и состояние то же');

      // на следующий день второй прогон тоже нулевой: день миграции в SRS не переписывается
      withToday('2026-09-14', function () {
        eq(JSON.stringify(State.migrate(clone(once))), JSON.stringify(once), 'назавтра — тот же результат');
      });
    });
  });

  describe('2.7.6 миграция: полная загрузка дважды — карточка и дела не откатываются', function () {
    withToday('2026-09-13', function () {
      function boot(src) {
        State.replace(clone(src), true);
        State.syncContent();
        Radar.migrateTodos();
        Radar.seedQuestions();
        var c = clone(State.s);
        c.meta.updatedAt = '';        // его двигает syncContent: сроки Б12/Б14 (этап 7)
        return c;
      }
      var b1 = boot(owner());
      var b2 = boot(b1);
      eq(JSON.stringify(b2), JSON.stringify(b1), 'вторая загрузка — нулевой diff');
      eq(byId(b1.radar, 'q-2026-09-08').items.length, 3, 'добор 2.7.5 карточку не раздул');
      eq(byId(b1.radar, 'q-2026-09-08').title, 'Консультант, пн 14.09 — три вопроса', 'и заголовок не вернул');
      eq(byId(b1.todos, 'mt4vmss1jqr1hf').title, 'Guidance: записаться (пн 14.09, третий период) — три вопроса в Радаре',
        'migrateTodos не откатил M4');
      eq(byId(b1.todos, 'mt4vmss12dy03k').due, '2026-10-15', 'и срок второго дела');
      eq(Radar.migrateTodos(), 0, 'после 2.7.6 дела плана не переписываются');
      // push отправляет State.s целиком — маркер уезжает в облако вместе с состоянием,
      // и pull на втором устройстве шаг 2.7.6 уже не запускает
      eq(State.s.meta.migrations, ['2.7.6'], 'маркер лежит в состоянии, которое уходит в облако');
      State.replace(clone(State.s), true);
      eq(State.migrationReport276(), null, 'приехавшее с маркером состояние повторно не мигрирует');
    });
  });

  describe('2.7.6 миграция: клиент 2.7.5 дописал карточку — следующая загрузка её чинит', function () {
    withToday('2026-09-14', function () {
      var st = State.migrate(owner());
      var q = byId(st.radar, 'q-2026-09-08');
      q.items[0].done = true;
      q.items[0].note = 'распечатку дадут в среду';
      // так делает topUpQuestions 2.7.5 после pull: +2 пункта и старый заголовок
      var old = card8();
      q.items.push(clone(old.items[6]), clone(old.items[7]));
      q.title = 'Утро 8.09 — восемь вопросов';

      var fixed = State.migrate(clone(st));
      var fq = byId(fixed.radar, 'q-2026-09-08');
      eq(fq.items.length, 3, 'снова три пункта');
      eq(fq.title, 'Консультант, пн 14.09 — три вопроса', 'заголовок M3');
      eq([fq.items[0].done, fq.items[0].note], [true, 'распечатку дадут в среду'], 'отметка и ответ целы');
      eq(fixed.meta.migrations, ['2.7.6'], 'маркер один');
    });
  });

  describe('2.7.6 миграция: гонка — событие уже добавлено руками', function () {
    withToday('2026-09-13', function () {
      var src = owner();
      src.radar.push({ id: 'ev-2026-09-15-quiz-mhf4u', done: true, course: 'MHF4U', type: 'quiz', date: '2026-09-15', note: 'моя заметка' });
      var st = State.migrate(src);
      eq(st.radar.filter(function (e) { return e.id === 'ev-2026-09-15-quiz-mhf4u'; }).length, 1, 'дубля нет');
      eq(byId(st.radar, 'ev-2026-09-15-quiz-mhf4u').note, 'моя заметка', 'заметка владельца цела');
      eq(st.radar.length, 10, 'всего десять записей');
    });
  });

  describe('2.7.6 миграция: чужое и свежее состояние', function () {
    withToday('2026-09-20', function () {
      var src = owner();
      delete src.meta.onboardedAt;
      var st = State.migrate(src);
      eq(st.radar.length, 1, 'без даты онбординга до выпуска личные события не добавляются');
      eq(st.settings.schoolCourses[3].code, 'ICS3UE', 'а переименование курса — да');

      var late = owner();
      late.meta.onboardedAt = '2026-09-20';
      eq(State.migrate(late).radar.length, 1, 'онбординг после выпуска — тоже без событий');

      // день 09.09 с минималкой или добавкой — не аномалия, M6 его не трогает
      var busy = owner();
      busy.days['2026-09-09'].minimalSteps = [true, false];
      eq(State.migrate(busy).days['2026-09-09'].level, 'norm', 'с шагами минималки — не трогается');
      var addon = owner();
      addon.days['2026-09-09'].addons = ['project'];
      eq(State.migrate(addon).days['2026-09-09'].level, 'norm', 'с добавкой — не трогается');

      var has = owner();
      has.settings.schoolCourses.push({ code: 'ICS3UE', name: 'x', track: 'cs', editable: true });
      eq(State.migrate(has).settings.schoolCourses.filter(function (c) { return c.code === 'ICS3U'; }).length, 1,
        'ICS3UE уже есть — M1 пропускается');
    });
  });

  describe('2.7.6 миграция: карточка на «Сегодня» 14.09 и события в «Радаре»', function () {
    withToday('2026-09-14', function () {
      State.replace(owner(), true);
      State.syncContent();
      Radar.seedQuestions();
      eq(Radar.questionsOnToday('2026-09-13').length, 0, '13.09 — рано');
      eq(Radar.questionsOnToday('2026-09-14').length, 1, '14.09 — карточка на «Сегодня»');
      eq(Radar.questionsOnToday('2026-09-15').length, 0, '15.09 — только в «Радаре»');
      ok(App.screen('radar').render().indexOf('Консультант, пн 14.09 — три вопроса') > 0, 'в «Радаре» — всегда');
      var html = App.screen('radar').render();
      ok(html.indexOf('Записаться к консультанту (Guidance, третий период)') > 0, 'текст события — в заметке');
      eq(html.indexOf('undefined'), -1, 'событие без курса не печатает «undefined»');
    });
  });

  State.reset();
  State.syncContent();
})();
