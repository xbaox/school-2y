/* 2.7.5 — хотфикс: два вопроса в карточку «Вопросы в школе» и одна ступень
   на всех экранах.

   Событие q-2026-09-08 живёт у владельца с 8.09: пересевать его нельзя,
   потеряются отметки и записанные ответы, — поэтому пункты дописываются. */

(function () {
  'use strict';

  var T = '2026-09-08';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function ev() {
    return (State.s.radar || []).filter(function (e) { return e.id === 'q-2026-09-08'; })[0];
  }

  /** Состояние 2.7.2: карточка посеяна шестью пунктами, добора ещё не было. */
  function seedSix() {
    fresh();
    Radar.seedQuestions();
    var e = ev();
    e.items = e.items.slice(0, 6);
    e.title = 'Утро 8.09 — шесть вопросов';
    return e;
  }

  var EN7 = 'I already have my TDSB student number. How do I activate my student account — ' +
    'the TDSB email/Google account, the student portal, and Brightspace for the online course? ' +
    'Where do I set my password, and whom do I contact if I cannot log in?';
  var RU7 = 'У меня уже есть номер ученика TDSB. Как активировать учётную запись — ' +
    'почту/Google-аккаунт TDSB, портал ученика и Brightspace для онлайн-курса? ' +
    'Где задать пароль и к кому обращаться, если не получается войти?';
  var EN8 = 'For the online course: when does it start, what is the weekly workload and ' +
    'deadline schedule, are there live sessions at a set time or is it fully self-paced, ' +
    'and can I work on it in the school library during my spare period?';
  var RU8 = 'По онлайн-курсу: когда он начинается, какая нагрузка и дедлайны по неделям, ' +
    'есть ли занятия онлайн в назначенное время или всё в своём темпе, и можно ли делать ' +
    'его в школьной библиотеке в свободный период?';

  describe('2.7.5 вопросы: седьмой и восьмой дословно', function () {
    fresh();
    Radar.seedQuestions();
    var items = ev().items;

    eq(items.length, 8, 'в карточке восемь пунктов');
    eq(items[6].who, 'консультанту или в офис школы', 'адресат седьмого');
    eq(items[6].en, EN7, 'английский текст седьмого дословно');
    eq(items[6].ru, RU7, 'и русская строка под ним');
    eq(items[7].who, 'консультанту', 'адресат восьмого');
    eq(items[7].en, EN8, 'английский текст восьмого дословно');
    eq(items[7].ru, RU8, 'и русская строка под ним');

    eq([items[6].done, items[6].note, items[7].done, items[7].note], [false, '', false, ''],
      'оба не отмечены и без ответов');
    eq(ev().title, 'Утро 8.09 — восемь вопросов', 'заголовок называет восемь');
  });

  describe('2.7.5 вопросы: добор в уже посеянную карточку', function () {
    var e = seedSix();
    e.items[0].done = true;
    e.items[0].note = 'ответил консультант';
    e.items[3].note = 'транскрипт заберу в пятницу';

    eq(Radar.seedQuestions(), 0, 'событие не пересевается — оно уже есть');
    var after = ev();
    eq(after.items.length, 8, 'пункты добрались до восьми');
    eq(after.items[6].en, EN7, 'седьмой дописан');
    eq(after.items[7].en, EN8, 'и восьмой');
    eq(after.title, 'Утро 8.09 — восемь вопросов', 'заголовок обновлён');

    // главное: чужая работа не потеряна
    eq(after.items[0].done, true, 'отметка на первом пункте цела');
    eq(after.items[0].note, 'ответил консультант', 'и записанный ответ тоже');
    eq(after.items[3].note, 'транскрипт заберу в пятницу', 'ответ на четвёртом на месте');
    eq(after.items.slice(0, 6).map(function (q) { return q.en; }).length, 6,
      'первые шесть на своих местах');
  });

  describe('2.7.5 вопросы: добор идемпотентен', function () {
    seedSix();
    Radar.seedQuestions();
    var once = JSON.stringify(ev());
    Radar.seedQuestions();
    Radar.seedQuestions();
    eq(JSON.stringify(ev()), once, 'три прогона подряд дают одно и то же');
    eq(ev().items.length, 8, 'и пунктов по-прежнему восемь');
    eq(State.s.radar.length, 1, 'событие одно');

    // счёт разошёлся (пункт удалён вручную) — по тексту дубли всё равно не лезут
    var e = ev();
    e.items.splice(2, 1);
    eq(e.items.length, 7, 'семь пунктов, из них седьмой и восьмой уже есть');
    Radar.seedQuestions();
    var ens = ev().items.map(function (q) { return q.en; });
    eq(ens.filter(function (x) { return x === EN7; }).length, 1, 'седьмой не удвоился');
    eq(ens.filter(function (x) { return x === EN8; }).length, 1, 'и восьмой тоже');
  });

  describe('2.7.5 вопросы: добор не делает состояние «новее»', function () {
    // touch поднимает meta.updatedAt, и синк на первой же загрузке считает
    // отставшее устройство самым свежим: оно уходит в push и затирает облако
    seedSix();
    State.s.meta.updatedAt = '2020-01-01T00:00:00.000Z';
    eq(Radar.seedQuestions(), 0, 'событие уже есть — только добор');
    eq(ev().items.length, 8, 'пункты добраны');
    eq(State.s.meta.updatedAt, '2020-01-01T00:00:00.000Z',
      'а отметка изменения осталась прежней — устройство не «помолодело»');

    // первый посев на чистом состоянии — тоже локальная запись
    fresh();
    State.s.meta.updatedAt = '2020-01-01T00:00:00.000Z';
    eq(Radar.seedQuestions(), 1, 'событие посеяно');
    eq(State.s.meta.updatedAt, '2020-01-01T00:00:00.000Z', 'и посев отметку не двигает');

    // а настоящая правка — двигает, иначе синк перестал бы работать вовсе
    State.s.radar[0].items[0].note = 'ответ';
    State.touch(true);
    ok(State.s.meta.updatedAt > '2020-01-01T00:00:00.000Z', 'запись ответа отметку двигает');
  });

  describe('2.7.5 вопросы: восемь пунктов на экране', function () {
    fresh();
    Radar.seedQuestions();
    withToday(T, function () {
      var html = App.Today.render();
      ok(html.indexOf('Утро 8.09 — восемь вопросов') > 0, 'заголовок на «Сегодня»');
      ok(html.indexOf('0 из 8') > 0, 'счётчик знает про восемь');
      ok(html.indexOf('How do I activate my student account') > 0, 'седьмой вопрос на экране');
      ok(html.indexOf('can I work on it in the school library') > 0, 'и восьмой');
      ok(html.indexOf('портал ученика и Brightspace') > 0, 'русская строка седьмого');
      ok(html.indexOf('в школьной библиотеке в свободный период') > 0, 'и восьмого');
    });
    ok(Radar.questionsSection().indexOf('How do I activate my student account') > 0,
      'в «Радаре» новые вопросы тоже есть');
  });

  /* ============ карточке вопросов нельзя сменить тип ============ */

  /**
   * Шторка живёт в UI.sheet, которому в наборе не на чем строить DOM.
   * Подменяем sheet, ловим opts и катаем onMount по кукольному корню:
   * ему нужны querySelector и addEventListener, больше ничего.
   */
  function openSheet(existing) {
    var real = UI.sheet, got = null;
    UI.sheet = function (o) { got = o; };
    try { Radar.addEvent(existing); } finally { UI.sheet = real; }

    var fields = {};
    function field(sel, value) { return (fields[sel] = { value: value, textContent: '', focus: function () {} }); }
    field('[data-title]', (existing && existing.title) || '');
    field('[data-date]', (existing && existing.date) || '');
    field('[data-note]', (existing && existing.note) || '');
    field('.ev-err', '');
    field('[data-cancel]', '');
    field('[data-save]', '');
    field('[data-other]', '');
    var root = {
      addEventListener: function () {},
      querySelector: function (sel) { return fields[sel] || null; }
    };
    var closed = false;
    got.onMount(root, function () { closed = true; });
    return {
      opts: got, body: got.body, fields: fields,
      save: function () { fields['[data-save]'].onclick(); },
      closed: function () { return closed; },
      err: function () { return fields['.ev-err'].textContent; }
    };
  }

  describe('карточка вопросов: тип сменить нельзя', function () {
    fresh();
    Radar.seedQuestions();
    var sh = openSheet(ev());

    eq(sh.opts.title, 'Карточка вопросов', 'шторка называет себя карточкой вопросов');
    ok(sh.opts.sub.indexOf('Тип у карточки вопросов не меняется') > 0, 'и объясняет почему');

    // все чипы типа заблокированы
    var chips = sh.body.match(/<button class="chip[^>]*data-type="[^"]*"[^>]*>/g) || [];
    eq(chips.length, Radar.TYPES.length, 'чипы типов на месте');
    ok(chips.every(function (c) { return c.indexOf('disabled') > 0; }), 'и все неактивны');
    ok(sh.body.indexOf('<button class="chip on" disabled aria-pressed="true">вопросы</button>') > 0,
      'текущий тип показан отдельным неактивным чипом');
    ok(sh.body.indexOf('Тип карточки вопросов не меняется.') > 0, 'подпись под чипами');

    // курса у такого события нет — вместо чипов курса поле заголовка
    ok(sh.body.indexOf('data-title') > 0, 'заголовок редактируется');
    eq(sh.body.indexOf('data-course'), -1, 'чипов курса нет');
    ok(sh.body.indexOf('value="Утро 8.09 — восемь вопросов"') > 0, 'и в поле стоит текущий заголовок');
    ok(sh.body.indexOf('type="date" data-date') > 0, 'дата редактируется');
  });

  describe('карточка вопросов: сохранение правит заголовок и дату, не тип', function () {
    fresh();
    Radar.seedQuestions();
    var e = ev();
    e.items[0].done = true;
    e.items[0].note = 'ответил консультант';

    var sh = openSheet(e);
    sh.fields['[data-title]'].value = 'Вопросы в школе — понедельник';
    sh.fields['[data-date]'].value = '2026-09-09';
    sh.save();

    var after = ev();
    eq(after.type, 'questions', 'тип остался questions');
    eq(after.title, 'Вопросы в школе — понедельник', 'заголовок обновлён');
    eq(after.date, '2026-09-09', 'и дата тоже');
    eq(after.course, undefined, 'курс такому событию не приписывается');
    eq(after.items.length, 8, 'пункты на месте');
    eq(after.items[0].done, true, 'отметка цела');
    eq(after.items[0].note, 'ответил консультант', 'и записанный ответ');
    ok(sh.closed(), 'шторка закрылась');

    // карточка никуда не делась — ради этого всё и затевалось
    eq(Radar.questionsOnToday('2026-09-09').length, 1, 'и осталась на «Сегодня»');
    ok(Radar.questionsSection().indexOf('Вопросы в школе — понедельник') > 0, 'и в «Радаре»');
  });

  describe('карточка вопросов: пустой заголовок не сохраняется', function () {
    fresh();
    Radar.seedQuestions();
    var sh = openSheet(ev());
    sh.fields['[data-title]'].value = '   ';
    sh.save();
    ok(sh.err().indexOf('Заголовок нужен') === 0, 'шторка объясняет, чего не хватает');
    ok(!sh.closed(), 'и не закрывается');
    eq(ev().title, 'Утро 8.09 — восемь вопросов', 'заголовок не тронут');
  });

  describe('обычному событию радара тип по-прежнему меняется', function () {
    fresh();
    State.s.radar.push({ id: 'ev-1', course: 'MHF4U', type: 'test', date: '2026-10-01', note: '', done: false });
    var sh = openSheet(State.s.radar[0]);

    eq(sh.opts.title, 'Событие радара', 'обычная шторка');
    ok(sh.body.indexOf('data-course') > 0, 'чипы курса на месте');
    var chips = sh.body.match(/<button class="chip[^>]*data-type="[^"]*"[^>]*>/g) || [];
    ok(chips.every(function (c) { return c.indexOf('disabled') < 0; }), 'и чипы типа активны');
    eq(sh.body.indexOf('Тип карточки вопросов не меняется.'), -1, 'подписи про вопросы нет');
  });

  /* ============ ступень: один источник на всех экранах ============ */

  describe('2.7.5 ступень: Настройки, карточка и промпт называют одну ступень', function () {
    fresh();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage('S0');

    // у S0 pos 0, а step.position ниже S1 не опускается — на этом расхождении
    // Настройки и печатали числа чужой ступени
    eq(State.stageName(), 'S0', 'ступень S0');
    ok(STEPS.effectivePos(State.s.step, '2026-09-14') >= 1, 'а позиция осталась не нулевой');

    withToday('2026-09-14', function () {
      var html = App.screen('settings').render();
      ok(html.indexOf('S0 · ~30′ · 8 заданий') > 0, 'Настройки печатают числа S0');
      eq(html.indexOf('S1 · ~35′'), -1, 'и чужой ступени в них нет');

      var card = Lesson.card({ today: '2026-09-14' });
      ok(card.indexOf('8 заданий') > 0, 'карточка урока — те же 8 заданий');

      var p = PROMPTS.lesson('B2.1', { today: '2026-09-14' });
      ok(p.indexOf('[ЭТАПЫ УРОКА — ступень S0') > 0, 'и промпт называет ту же ступень');
      ok(p.indexOf('Ступень: S0 «Старт школы» — 8 заданий') > 0, 'с тем же числом заданий');

      // плашка в шапке «Сегодня» — четвёртое место, где ступень называется
      var today = App.Today.render();
      ok(today.indexOf('Ступень S0') > 0, 'плашка в шапке тоже говорит S0');
      eq(today.indexOf('Ступень S1'), -1, 'и чужой ступени в шапке нет');
    });
  });

  describe('2.7.5 ступень: S1 после подъёма — тоже одна на всех', function () {
    fresh();
    State.setMode('school');
    State.s.step.cycleStart = '2026-09-08';
    State.setStage('S1');

    withToday('2026-09-14', function () {
      var html = App.screen('settings').render();
      ok(html.indexOf('S1 · ~35′ · 12 заданий') > 0, 'Настройки печатают числа S1');
      var p = PROMPTS.lesson('B2.1', { today: '2026-09-14' });
      ok(p.indexOf('[ЭТАПЫ УРОКА — ступень S1') > 0, 'и промпт тот же');
    });
  });

  describe('2.7.5 ступень: летом бейдж по-прежнему «Лето»', function () {
    fresh();
    State.setMode('summer');
    withToday('2026-08-26', function () {
      var html = App.screen('settings').render();
      ok(html.indexOf('<div class="mono">Лето</div>') > 0,
        'бейдж говорит «Лето», а не имя ступени');
      // цифры летом даёт разгон Ф0, а не строка ступени — проверяем подпись
      ok(html.indexOf('Сейчас<span>Лето · ') > 0, 'и строка параметров начинается с «Лето»');
      eq(html.indexOf('Сейчас<span>S'), -1, 'имени ступени в летней строке нет');
    });
  });
})();
