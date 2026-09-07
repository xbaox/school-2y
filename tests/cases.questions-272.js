/* 2.7.2, этап 1: карточка «Вопросы в школе», слова разогрева добором,
   правка перевода карточки и радар только по воскресеньям.

   Карточка вопросов — про живой разговор в школе: ответ записывается на
   месте, потому что к вечеру он забыт. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], checklist: null, stretch: null,
      writing: '', raw: ''
    }, over || {});
  }

  function ev() {
    return (State.s.radar || []).filter(function (e) { return e.id === 'q-2026-09-08'; })[0];
  }

  /* ============ 1.1 карточка вопросов ============ */

  describe('2.7.2 вопросы: событие сеется один раз', function () {
    fresh();
    eq(State.s.radar.length, 0, 'радар пуст');
    eq(Radar.seedQuestions(), 1, 'событие посеяно');

    var e = ev();
    ok(!!e, 'оно нашлось по id');
    eq(e.date, '2026-09-08', 'дата');
    eq(e.type, 'questions', 'тип');
    eq(e.title, 'Утро 8.09 — шесть вопросов', 'заголовок');
    eq(e.items.length, 6, 'шесть вопросов');

    eq(Radar.seedQuestions(), 0, 'повторный посев ничего не добавил');
    eq(State.s.radar.length, 1, 'событие по-прежнему одно');

    // правки владельца посев не затирает
    e.items[0].note = 'ответил консультант';
    Radar.seedQuestions();
    eq(ev().items[0].note, 'ответил консультант', 'записанный ответ на месте');
  });

  describe('2.7.2 вопросы: адресаты и тексты дословно', function () {
    fresh();
    Radar.seedQuestions();
    var items = ev().items;
    eq(items.filter(function (q) { return q.who === 'консультанту (guidance)'; }).length, 5,
      'пять вопросов консультанту');
    eq(items[5].who, 'учителю MHF4U', 'шестой — учителю математики');

    ok(items[0].en.indexOf('I have an online e-learning computer science course') === 0,
      'первый вопрос по-английски');
    ok(items[0].ru.indexOf('У меня в расписании онлайн-курс информатики') === 0,
      'и русская строка под ним');
    ok(items[2].en.indexOf('Canadian History (CHC2D)') > 0, 'третий про историю Канады');
    ok(items[3].en.indexOf('Credit Counselling Summary') > 0, 'четвёртый про документы');
    ok(items[4].en.indexOf('40 community involvement hours') > 0, 'пятый про часы');
    ok(items[5].en.indexOf('CSMC math contest') > 0, 'шестой про конкурс');

    ok(items.every(function (q) { return q.done === false && q.note === ''; }),
      'все не отмечены и без ответов');
  });

  describe('2.7.2 вопросы: на «Сегодня» с даты события и пока не всё отмечено', function () {
    fresh();
    Radar.seedQuestions();
    eq(Radar.questionsOnToday('2026-09-07').length, 0, 'до даты события карточки нет');
    eq(Radar.questionsOnToday('2026-09-08').length, 1, 'в день события — есть');
    eq(Radar.questionsOnToday('2026-09-11').length, 1, 'и до 11.09 включительно');
    eq(Radar.questionsOnToday('2026-09-12').length, 0, 'после срока не висит');

    // отметили всё — карточка уходит раньше срока
    ev().items.forEach(function (q) { q.done = true; });
    eq(Radar.questionsOnToday('2026-09-09').length, 0, 'всё спрошено — карточки нет');

    // а в «Радаре» она всегда
    ok(Radar.questionsSection().indexOf('Утро 8.09') > 0, 'в радаре карточка на месте');
  });

  describe('2.7.2 вопросы: карточка показывает всё, что нужно у стойки', function () {
    fresh();
    Radar.seedQuestions();
    var html = Radar.questionsBlock('2026-09-08');
    ok(html.indexOf('консультанту (guidance)') > 0, 'адресат');
    ok(html.indexOf('I have an online e-learning computer science course') > 0, 'английский текст');
    ok(html.indexOf('У меня в расписании онлайн-курс информатики') > 0, 'русская строка');
    ok(html.indexOf('type="checkbox" data-q="q-2026-09-08|0"') > 0, 'чекбокс пункта');
    ok(html.indexOf('data-qnote="q-2026-09-08|0"') > 0, 'поле ответа');
    ok(html.indexOf('ответ одной строкой') > 0, 'подсказка в поле');
    ok(html.indexOf('0 из 6') > 0, 'счётчик');

    // отмеченный пункт и записанный ответ видны в разметке
    ev().items[0].done = true;
    ev().items[0].note = 'ICS3U, Brightspace, дома';
    var html2 = Radar.questionsBlock('2026-09-08');
    ok(html2.indexOf('value="ICS3U, Brightspace, дома"') > 0, 'ответ в поле');
    ok(html2.indexOf('1 из 6') > 0, 'счётчик вырос');
  });

  describe('2.7.2 вопросы: карточка стоит на экране «Сегодня»', function () {
    fresh();
    Radar.seedQuestions();
    withToday('2026-09-08', function () {
      // берём сам экран, а не запись в реестре: она создаётся в boot()
      var html = App.Today.render();
      ok(html.indexOf('Утро 8.09 — шесть вопросов') > 0, 'заголовок карточки на экране');
      ok(html.indexOf('Could I please get a copy of my Credit Counselling Summary') > 0,
        'и вопросы целиком');
    });
    withToday('2026-09-14', function () {
      eq(App.Today.render().indexOf('Утро 8.09'), -1, 'после срока с «Сегодня» ушла');
    });
  });

  /* ============ 1.2 слова разогрева добором ============ */

  describe('2.7.2 разогрев: все слова прошлого урока выучены — добор из предыдущего', function () {
    fresh();
    State.applySummary('B2.1', summary({
      words: [{ en: 'slope', ru: 'наклон' }, { en: 'domain', ru: 'область' }]
    }), { date: '2026-09-01' });
    State.applySummary('B2.2', summary({
      words: [{ en: 'vertex', ru: 'вершина' }]
    }), { date: '2026-09-02' });

    // слово последнего урока выучено — раньше блок оставался пустым
    ['vertex'].forEach(function (w) {
      State.gradeWord(w, true); State.gradeWord(w, true); State.gradeWord(w, true);
    });
    eq(State.wordStatus('vertex'), 'known', 'слово последнего урока выучено');

    var words = State.lastLessonWords('math', 'B2.3').map(function (w) { return w.en; });
    eq(words, ['slope', 'domain'], 'добрали из предыдущего урока дорожки');
  });

  describe('2.7.2 разогрев: набирается до пяти невыученных', function () {
    fresh();
    State.applySummary('B2.1', summary({
      words: [{ en: 'a1', ru: '1' }, { en: 'a2', ru: '2' }, { en: 'a3', ru: '3' }]
    }), { date: '2026-09-01' });
    State.applySummary('B2.2', summary({
      words: [{ en: 'b1', ru: '1' }, { en: 'b2', ru: '2' }, { en: 'b3', ru: '3' }]
    }), { date: '2026-09-02' });

    var w = State.lastLessonWords('math', 'B2.3');
    eq(w.length, 5, 'ровно пять');
    eq(w.slice(0, 3).map(function (x) { return x.en; }), ['b1', 'b2', 'b3'],
      'сначала последний урок');
    eq(w[3].en, 'a1', 'потом добор из предыдущего');

    // чужая дорожка в добор не идёт
    State.applySummary('B1.1', summary({
      words: [{ en: 'w1', ru: '1' }, { en: 'w2', ru: '2' }]
    }), { date: '2026-09-03' });
    ok(State.lastLessonWords('math', 'B2.3').every(function (x) { return x.en.indexOf('w') !== 0; }),
      'слова письма в математику не попали');
  });

  describe('2.7.2 разогрев: доехало до промпта', function () {
    fresh();
    State.setMode('school');
    State.setStage('S0');
    State.applySummary('B7.1', summary({
      words: [{ en: 'degree', ru: 'степень' }]
    }), { date: '2026-09-10' });
    State.gradeWord('degree', true); State.gradeWord('degree', true); State.gradeWord('degree', true);
    State.applySummary('B2.4', summary({
      words: [{ en: 'depreciation', ru: 'обесценивание' }]
    }), { date: '2026-09-09' });

    var p = PROMPTS.lesson('B7.2', { today: '2026-09-14' });
    ok(p.indexOf('depreciation — обесценивание') > 0, 'добранное слово в блоке разогрева');
    eq(p.indexOf('Слов прошлого урока пока нет'), -1, 'пустой строки больше нет');
    State.setMode('summer');
  });

  /* ============ 1.3 правка перевода карточки ============ */

  describe('2.7.2 карточка «to explain»: перевод исправлен', function () {
    var st = State.migrate({
      settings: {}, days: {}, meta: { version: 3 },
      summaries: [{
        lessonId: 'B3.1', date: '2026-09-02', raw: '', parsed: {
          words: [
            { en: 'to explain', ru: 'показать механизм, а не назвать' },
            { en: 'main idea', ru: 'главная мысль' }
          ]
        }
      }]
    });
    var w = st.summaries[0].parsed.words;
    eq(w[0].ru, 'показать, как или почему, по шагам', 'перевод по глоссарию');
    eq(w[1].ru, 'главная мысль', 'соседняя карточка не тронута');

    // повторный прогон ничего не меняет
    var again = State.migrate(JSON.parse(JSON.stringify(st)));
    eq(again.summaries[0].parsed.words[0].ru, 'показать, как или почему, по шагам', 'идемпотентно');

    // карточку с другим переводом не трогаем: чиним ровно ту, что назвал Архитектор
    var other = State.migrate({
      settings: {}, days: {}, meta: { version: 3 },
      summaries: [{
        lessonId: 'B3.1', date: '2026-09-02', raw: '',
        parsed: { words: [{ en: 'to explain', ru: 'свой перевод владельца' }] }
      }]
    });
    eq(other.summaries[0].parsed.words[0].ru, 'свой перевод владельца', 'чужую правку не затираем');
  });

  State.reset();
  State.syncContent();
})();
