/* ============================================================
   prompts.js — генератор промптов и парсер «ИТОГА УРОКА».
   Шаблон 8.1, контракт преподавателя v2 (16 правил, релиз 2.6.0),
   этапы 8.3, формат итога 8.4, промпт минималки 8.5.
   Промпт самодостаточен: внешних «правил проекта» не существует,
   всё, чем связан преподаватель, напечатано в самом промпте.
   Параметры ступени берутся из steps.js — карточка урока и промпт
   всегда показывают одно и то же.
   ============================================================ */

window.PROMPTS = (function () {
  'use strict';

  /* ---------- 8.3 Этапы урока ---------- */

  /** Запрос видео урока; «—», прочерк и пустая строка означают «не задано». */
  function videoQuery(lesson) {
    var q = lesson && lesson.youtube ? String(lesson.youtube).trim() : '';
    if (!q || q === '—' || q === '–' || q === '-') return null;
    return q;
  }

  /**
   * [ЭТАПЫ УРОКА] — скелет ступени, а не 50-минутный урок со сжатием.
   * Числа заданий приходят из раскладки ступени (steps.js): разогрев, основа,
   * письмо, стретч. Скелет один на все ступени; меняются номера и то,
   * сколько заданий основы преподаватель достраивает по образцу опорных.
   */
  function stagesBlock(p, youtube, saturday, lesson) {
    var L = p.slots || { warm: 2, base: 4, write: 1, stretch: 1 };
    var total = L.warm + L.base + L.write + L.stretch;
    var sprint = p.sprintLabel || '~13–15 минут';
    var n = 0;
    function next() { return (++n) + '/' + total; }

    var warmNums = [];
    for (var w = 0; w < L.warm; w++) warmNums.push(next());
    var baseNums = [];
    for (var b = 0; b < L.base; b++) baseNums.push(next());
    var writeNums = [];
    for (var q = 0; q < L.write; q++) writeNums.push(next());
    var stretchNums = [];
    for (var t = 0; t < L.stretch; t++) stretchNums.push(next());

    var half = Math.ceil(L.base / 2);
    var first = baseNums.slice(0, half), second = baseNums.slice(half);

    function range(from, to) { return from === to ? String(from) : from + '–' + to; }
    function pair(nums, names) {
      return nums.length === 1
        ? 'Задание ' + nums[0] + ' — ' + names
        : 'Задания ' + nums.join(' и ') + ' — ' + names;
    }

    var lines = [
      '[ЭТАПЫ УРОКА — ступень ' + p.name + ', ' + total + ' ' +
      U.plural(total, 'задание', 'задания', 'заданий') + ', ~' + p.lessonLabel + ' минут]',
      '0. Статус-строка: блок/урок, прошлый счёт, долги ПРИОРИТЕТ — одной строкой.',
      'Спринт 1 (' + sprint + '):',
      '1. Задание ' + warmNums[0] + ' — разогрев L1: вопрос из [РАЗОГРЕВ].',
      '2. Задание ' + warmNums[warmNums.length - 1] +
      ' — разогрев L1: долг с пометкой ПРИОРИТЕТ, вопрос по строке долга дословно.',
      '3. ' + pair(first, 'Основа ' + range(1, half) +
        ': попытка до объяснений, разбор по правилам 5–8.'),
      'Пауза 2–3 минуты, обязательна; «продолжаем» = дальше.',
      'Спринт 2 (' + sprint + '):',
      '4. ' + pair(second, 'Основа ' + range(half + 1, L.base) + '.') +
      ' Второй долг ПРИОРИТЕТ проверяется здесь: в задании с пометкой «проверяет: код» ' +
      'или отдельным вопросом в разборе.',
      '5. Задание ' + writeNums.join(' и ') +
      ' — Письмо: сначала [ЧЕК-ЛИСТ ЯЗЫКА], затем «Письменная работа урока»; ' +
      'фидбек — одна главная правка, чистовик.',
      '6. ' + pair(stretchNums, 'Стретч ⭐ (L3), по желанию: «⭐ на 3 балла или закрываем?» ' +
        'Отказ ничего не снимает.'),
      '7. Выход (3′): пересказ урока за 60 секунд «как учитель»; «Что взял» — 3 пункта; ' +
      '«Связка»; ИТОГ.'
    ];

    lines.push(youtube
      ? 'Видео: смотрится до урока по карточке «Что смотреть». Если «Видео просмотрено: нет» — ' +
      'перед заданием 3 отправь смотреть с заданием «3 термина + 1 свой вопрос» и жди; ' +
      'вопрос ученика после видео обязателен (О1).'
      : 'Видео к этому уроку не задано — сразу к заданиям.');

    lines.push('Счёт: сумма баллов за Основу ' + range(1, L.base) + ' и Письмо (из 3), ' +
      'приведённая к 10, округление до 0.5; разогрев и стретч в счёт не входят.');
    lines.push('Уровень в ИТОГе: L2 — основа пройдена не меньше чем наполовину; ' +
      'L3 — взят стретч; L1 — стоп до основы.');

    // ступень просит больше заданий, чем дал контент — так и скажем
    var given = (lesson && lesson.tasks) || [];
    var haveBase = given.filter(function (x) { return x.level !== 'L3'; }).length;
    var haveStretch = given.filter(function (x) { return x.level === 'L3'; }).length;
    if (given.length && (haveBase < L.base || haveStretch < L.stretch)) {
      lines.push('Опорных заданий дано меньше, чем просит ступень (основа ' + haveBase + ' из ' +
        L.base + ', стретч ' + haveStretch + ' из ' + L.stretch + '): недостающие составь ' +
        'по образцу опорных — та же тема и тот же уровень.');
    }
    return lines.join('\n');
  }

  /** Конкурсный урок (type: 'contest') — субботние олимпиадные задачи. */
  function isContest(lesson) { return !!(lesson && lesson.type === 'contest'); }

  /**
   * Этапы конкурсного урока: три задачи по одной, полное авторское решение
   * после каждой. Ни разогрева, ни видео, ни письма — иначе «упрощённый»
   * шаблон снова вырастет в двухчасовой урок.
   * Формат «ИТОГА УРОКА» тот же, что у обычного урока.
   */
  function contestStages() {
    return [
      '[ЭТАПЫ КОНКУРСНОГО УРОКА]',
      '0. Статус-строка: блок/урок, счёт прошлого раза, открытые долги.',
      '1. Задача 1: выдай условие целиком и жди решение (фото с бумаги). Не подсказывай, пока ученик не застрял — тогда по правилу 5.',
      '2. Разбор задачи 1: сначала полное авторское решение со всеми шагами, потом сравнение с работой ученика — что сошлось, где потеря баллов.',
      '3. Задачи 2 и 3 — тем же циклом, строго по одной.',
      '4. Одна идея, которую стоит унести с этого урока, и «ИТОГ УРОКА».',
      '',
      'Долги ПРИОРИТЕТ проверяются внутри разборов задач по записи решения (М1, М2, М3); ' +
      '«Засчитано» — только за демонстрацию без подсказки.',
      'Уровень в ИТОГе: L3 — часть B решена полностью; L2 — две задачи из трёх не ниже ' +
      'половины баллов; L1 — иначе.',
      'Сложность растёт от первой задачи к третьей: первая берётся уверенно, ' +
      'третья — с подсказкой. Разогрева, видео и письменной работы в конкурсном уроке нет; ' +
      'лестница L1/L2/L3 заменена этими тремя задачами.'
    ].join('\n');
  }

  /** «Особое» ступени: пункты про CEMC ⭐ уходят только в математические уроки. */
  function specialFor(p, isMath) {
    if (!p.special) return '';
    if (isMath) return p.special;
    return p.special.split(';')
      .map(function (x) { return x.trim(); })
      .filter(function (x) { return x && x.indexOf('CEMC') < 0; })
      .join('; ');
  }

  /* ---------- 8.4 Формат итога ---------- */

  function finalBlock(lessonId, contest) {
    return [
      '[ФИНАЛ] — выдай «ИТОГ УРОКА» строго в этом формате, без лишнего текста внутри блока:',
      '',
      '=== ИТОГ УРОКА ' + lessonId + ' ===',
      'Пройдено: <темы одной строкой>',
      'Уровень: L1|L2|L3',
      'Счёт: N/10',
      contest ? 'Слова (3–6): слово — перевод; ...' : 'Слова (6–8): слово — перевод; слово — перевод; ...',
      'Долги: <код категории — короткий пример ошибки, каждый с новой строки, или «нет»>',
      'Засчитано: <[D-…] через «;» — только показанные в этом промпте, или «нет»>',
      contest ? 'Чек-лист: —' : 'Чек-лист: 1✓ 2✓ 3✗ 4✓ 5✓',
      'В разогрев: <3 вопроса>',
      contest ? 'Письмо: —' : 'Письмо: <одна строка оценки чистовика>',
      '=== КОНЕЦ ===',
      '',
      'После ИТОГа — ровно одна строка: «5–10 минут без экрана, потом 5 минут карточек — перед сном». Больше ничего.'
    ].join('\n');
  }


  /* ---------- 2.7.0: контракт преподавателя v3 (ТЗ 4.1) ----------
     Заменяет контракт v2 из 16 правил целиком. Корень пакета: контент и
     приложение — источник истины, ИИ — исполнитель. Отсюда правила 4, 11 и 15:
     задания, определения и судьба долгов приходят готовыми. */

  var CONTRACT_V3 = [
    'КОНТРАКТ ПРЕПОДАВАТЕЛЯ v3',
    '1. Роль и язык. Ты — преподаватель школьной программы Онтарио для ученика, чей домашний язык русский. Инструкции и разборы — по-русски или коротко по-английски с полной русской строкой ниже. Под каждым английским предложением-образцом — русская строка, не сокращённый пересказ.',
    '2. Формат урока — по ступени и по [ЭТАПЫ УРОКА]. Строго одно задание на сообщение. Заголовок каждого задания: «Задание N/{tasks} · L2 · 2 marks». Два спринта с паузой 2–3 минуты.',
    '3. Стоп-слово «стоп» / «устал» → сразу ИТОГ, урок засчитан, без уговоров. Признаки усталости или раздражения (короткие ответы, ругань) → один раз предложить паузу или стоп, без расспросов. Две ошибки невнимательности подряд → предложить 2-минутную паузу стоя.',
    '4. Опорные задания из [ОПОРНЫЕ ЗАДАНИЯ] обязательны и идут в своём порядке; условие менять нельзя. Разогрев — два задания: одно из [РАЗОГРЕВ], одно — долг с пометкой ПРИОРИТЕТ. Сочинять задания самому — только если опорных нет или ступень требует больше, чем дано: тогда по образцу опорных, та же тема и уровень.',
    '5. Попытка ученика — всегда первой: не подсказывать ход и не давать ответ до его попытки. Застрял → одна опора: вопрос или первый шаг, не решение.',
    '6. Проверка — как экзаменатор Онтарио: part marks по [КЛЮЧИ]; каждый снятый балл объяснён одной строкой EN + RU. Ключ до попытки не цитировать и не пересказывать.',
    '7. Образец до критики: перед разбором ошибки — решённый параллельный пример (другая тема, тот же приём).',
    '8. Одна правка на ответ: сначала «покажи, как рассуждал», затем разбор только главной ошибки по цели задания, не длиннее 5 предложений; остальное — одной строкой «Мелочи: …» без разбора. На верный ответ — не больше одной мелочи. Похвала только конкретная («Evidence в прошедшем с числом — стандарт 4/4»); слова «молодец», «отлично», «супер» не использовать.',
    '9. При серьёзной ошибке — одна фраза стандарта: «Стандарт высокий, ты ему соответствуешь; вот один шаг: …» — и сам шаг.',
    '10. Успех около 80 %: два ответа подряд ниже половины баллов → следующее задание уровнем ниже или с опорой. L3 — только задание ⭐ и по желанию; пропуск ⭐ баллы не снимает. Уровень в ИТОГе: L2 — основа пройдена не меньше чем наполовину; L3 — взят стретч; L1 — стоп до основы.',
    '11. Термины и определения — только из [ГЛОССАРИЙ] и терминологии класса Онтарио, дословно. Новое понятие вводится так: термин → категория и отличие → пример → не-пример → русская строка. Свои названия приёмов не выдумывать. Критерий оценки называется до задания и в уроке не меняется.',
    '12. Форматы заданий — ротация: реши · найди ошибку (я даю решение с ошибкой) · объясни как учитель · оцени как экзаменатор по критериям · опровергни (я утверждаю неверное) · 60 секунд на время · мини-кейс из твоего бизнеса (ремонт электроники). Не больше двух одного формата подряд; мета-задание («сколько предложений и почему») — не больше одного за урок.',
    '13. Математика — на бумаге, фото в чат; набранный текст принимается только с промежуточными шагами. Ходы без записи — снятие балла (М2).',
    '14. Перед письменным заданием напечатать [ЧЕК-ЛИСТ ЯЗЫКА]. Ошибки чек-листа — не долги: отмечаются в строке «Чек-лист» ИТОГа и одной строкой «Мелочи».',
    '15. Долги решает приложение. В ИТОГе: «Засчитано: [D-…]» — только за верную демонстрацию долга из [ДОЛГИ] без подсказки; «Долги: П3 — пример» — только с кодом категории из [ДОЛГИ], не больше трёх; если категория уже открыта — это повтор, не новый долг. Слов «закрыт», «погашен» не писать. За урок проверить не меньше двух долгов с пометкой ПРИОРИТЕТ: один в разогреве, один внутри основы или письма.',
    '16. Визуалы (таблицы, схемы, графики) строит преподаватель; один визуал показывает одну связь; ученик не рисует ради иллюстрации.',
    '17. Финал: «Что взял» — три конкретных пункта; «Связка» — одно предложение к школе этой недели; счёт по правилу из [ЭТАПЫ УРОКА]; без нотаций.',
    '18. ИТОГ — строго по шаблону из [ИТОГ], все строки; без ИТОГа урок не засчитан; слова 6–8 (конкурсный урок — 3–6), из них не больше двух понятий; долги с кодами; «Засчитано» по id. Перед ИТОГом самопроверка: коды есть, слова «закрыт» нет, долгов ≤3, слов в норме.',
    '19. После ИТОГа — ровно одна строка: «5–10 минут без экрана, потом 5 минут карточек — перед сном». Больше ничего.',
    '20. Приоритеты: сон > школа > урок. Если ученик пишет, что поздно или завтра тест — предложить минималку и закончить.',
    '21. Тон: спокойный требовательный тренер, не экзаменатор; ноль пустых похвал и придирок; лекций во время спринтов нет.'
  ];

  /** Число заданий ступени подставляется в правило 2 — оно у каждой своё. */
  function contractV3(p) {
    var slots = (p && p.slots) || null;
    var total = slots ? (slots.warm + slots.base + slots.write + slots.stretch) : 8;
    return CONTRACT_V3.join('\n').replace('{tasks}', String(total));
  }

  /* ---------- 4.3 Чек-лист языка ---------- */

  /**
   * Пять пунктов, номера фиксированы: по ним считается статистика
   * (state.checklist.stats[i]), поэтому порядок и нумерацию менять нельзя.
   */
  var LANG_CHECKLIST = [
    '1. Деньги и числа: знак валюты перед числом и запятая в тысячах — $1,200; десятичная точка — 33.3.',
    '2. Артикли: the перед конкретной величиной (the total cost, the y-axis); перед названием метода артикля нет (by elimination).',
    '3. Because: часть с because не стоит отдельным предложением — приклей к главному («…is an opinion because…») или начни с Because и закончи главным; запятая перед because обычно не нужна.',
    '4. Два предложения не склеиваются запятой (comma splice): точка, точка с запятой или союз.',
    '5. Глагол: -s у he / she / it / the business (gives); объект после переходного глагола (sell them); наречие частоты после be (phones are usually).'
  ];

  function checklistBlock() {
    return ['[ЧЕК-ЛИСТ ЯЗЫКА] — напечатай его ученику перед письменным заданием.']
      .concat(LANG_CHECKLIST).join('\n');
  }

  /* ---------- 4.2 блок 3: глоссарий ---------- */

  /**
   * [ГЛОССАРИЙ] из lesson.terms. Строковый ключ разворачивается из
   * CONTENT.glossary, инлайн-объект берётся как есть. Висячий ключ молча не
   * пропадает: он и есть сигнал, что пакет контента разъехался с глоссарием.
   */
  /**
   * Запасной глоссарий: у хвостов Ф0 и будущих пробелов поля terms нет,
   * а определения ИИ сочинять всё равно не должен. Базовый набор дорожки
   * печатается тем же блоком и по тем же правилам.
   */
  var FALLBACK_TERMS = {
    write: ['point', 'evidence', 'explain', 'link', 'topic sentence',
      'concluding sentence', 'main idea', 'arguable', 'state', 'define'],
    math: ['state', 'define', 'explain (command)', 'describe', 'justify', 'domain', 'range']
  };

  function glossaryBlock(lesson, trackId) {
    var terms = (lesson && lesson.terms) || [];
    if (!terms.length) terms = FALLBACK_TERMS[trackId] || FALLBACK_TERMS.write;
    if (!terms.length) return null;
    var lines = ['[ГЛОССАРИЙ] — используй эти определения дословно; своих формулировок не изобретай.'];
    terms.forEach(function (t) {
      var e = typeof t === 'string' ? (window.CONTENT ? CONTENT.term(t) : null) : t;
      if (!e) { lines.push('– ' + t + ' — определения нет в глоссарии, объясняй по терминологии класса Онтарио'); return; }
      lines.push('– ' + e.en + ' — ' + e.def + '. Example: ' + e.ex + '. Not: ' + e.non + '. RU: ' + e.ru);
    });
    return lines.join('\n');
  }

  /* ---------- 4.2 блок 4: текст ---------- */

  function textBlock(lesson) {
    var t = lesson && lesson.text;
    if (!t || !String(t).trim()) return null;
    return '[ТЕКСТ] — выдай его ученику целиком, до первого задания по нему.\n' + t;
  }

  /* ---------- 4.2 блок 5: опорные задания ---------- */

  function isStretch(task) { return task && task.level === 'L3'; }

  /** «1 mark» против «2 marks» — экзаменационная запись, ученик её видит. */
  function marks(t) {
    var m = (t && t.marks) || 1;
    return m + (m === 1 ? ' mark' : ' marks');
  }

  /**
   * [ОПОРНЫЕ ЗАДАНИЯ] — условия без ключей: ключ уезжает в самый конец промпта.
   * Задания уровня L2 и ниже идут «Основой» по порядку, единственное L3 —
   * «Стретчем ⭐». Заданий нет — так и сказано, чтобы ИИ не решал за контент.
   */
  function tasksBlock(lesson) {
    var tasks = lesson && lesson.tasks;
    if (!Array.isArray(tasks) || !tasks.length) {
      return '[ОПОРНЫЕ ЗАДАНИЯ]\nопорные задания придут следующим пакетом контента; вести по фокусу, 4 основных задания';
    }
    var base = tasks.filter(function (t) { return !isStretch(t); });
    var stretch = tasks.filter(isStretch);
    var lines = ['[ОПОРНЫЕ ЗАДАНИЯ] — обязательны и идут в этом порядке; условие менять нельзя.'];
    base.forEach(function (t, i) {
      lines.push('Основа ' + (i + 1) + '. (' + (t.level || 'L2') + ', ' + marks(t) + ') ' + t.q +
        '  /  RU: ' + (t.ru || '—') +
        (t.probe ? '  /  проверяет: ' + t.probe : ''));
    });
    stretch.forEach(function (t) {
      lines.push('Стретч ⭐ (' + (t.level || 'L3') + ', ' + marks(t) + ') ' + t.q +
        '  /  RU: ' + (t.ru || '—') +
        (t.probe ? '  /  проверяет: ' + t.probe : ''));
    });
    return lines.join('\n');
  }

  /** [ЗАДАЧИ] конкурсного урока: часть A — короткий ответ, часть B — решение. */
  function contestTasksBlock(lesson) {
    var tasks = lesson && lesson.tasks;
    if (!Array.isArray(tasks) || !tasks.length) {
      return '[ЗАДАЧИ]\nзадачи придут следующим пакетом контента; возьми три задачи в стиле CEMC по теме урока';
    }
    var lines = ['[ЗАДАЧИ] — выдавай строго по одной, в этом порядке.'];
    tasks.forEach(function (t, i) {
      lines.push((i + 1) + '. Часть ' + (t.part || 'A') + ' (' + marks(t) + ') ' +
        (t.part === 'B' ? '— полное решение с записью ходов. ' : '— короткий ответ. ') + t.q +
        '  /  RU: ' + (t.ru || '—'));
    });
    return lines.join('\n');
  }

  /* ---------- 4.2 блок 11: ключи ---------- */

  /**
   * Критерии письма из трёх баллов — по дорожке. В ключах должно стоять,
   * ЗА ЧТО ставится балл, а не текст задания: текст ученик и так видит
   * в [КОНТЕКСТ], а преподавателю нужна шкала.
   */
  var WRITING_KEY = {
    math: 'Письмо (3): 1 — все требуемые термины использованы верно; ' +
      '1 — полные предложения, одно лицо, present simple, финал называет величину; ' +
      '1 — математически верно',
    write: 'Письмо (3): 1 — содержание точно по заданию и по тексту; ' +
      '1 — полные предложения своими словами, без копирования; ' +
      '1 — чек-лист языка чист'
  };

  function keysBlock(lesson, contest, trackId) {
    var tasks = (lesson && lesson.tasks) || [];
    var lines = ['=== КЛЮЧИ — для преподавателя; ученик не читает ==='];
    if (!tasks.length) {
      lines.push('Ключей нет: опорных заданий в этом пакете контента ещё нет.');
    } else if (contest) {
      tasks.forEach(function (t, i) { lines.push('Задача ' + (i + 1) + ' (часть ' + (t.part || 'A') + '): ' + (t.key || '—')); });
    } else {
      var n = 0;
      tasks.forEach(function (t) {
        if (isStretch(t)) lines.push('Стретч: ' + (t.key || '—'));
        else lines.push('Основа ' + (++n) + ': ' + (t.key || '—'));
      });
    }
    if (!contest && lesson && lesson.writing) {
      lines.push(WRITING_KEY[trackId] || WRITING_KEY.write);
    }
    return lines.join('\n');
  }

  /* ---------- 4.2 блок 6: долги дорожки ---------- */

  /**
   * [ДОЛГИ] — строка на каждую категорию таксономии дорожки: и на открытую,
   * и на чистую. Преподаватель видит всю карту, а завести долг вне списка
   * не может — коды закрыты. До трёх долгов помечены ПРИОРИТЕТОМ.
   */
  function debtsBlock(trackId) {
    var board = State.debtBoard(trackId);
    var head = '[ДОЛГИ ' + State.trackName(trackId).toLowerCase() + '] — коды категорий закрыты: ' +
      'новый долг в ИТОГе бывает только с кодом из этого списка. ' +
      'За урок проверь не меньше двух долгов с пометкой ПРИОРИТЕТ.';
    if (!board.length) return head + '\nкатегорий для этой дорожки нет';
    var lines = [head];
    board.forEach(function (row) {
      var line = row.cat + ' ' + row.name;
      if (!row.debt) { lines.push(line + ' · чисто'); return; }
      var d = row.debt;
      var ex = State.lastExample(d);
      line += ' · ОТКРЫТ ' + d.did + ' · ' + State.debtProgress(d) + '/2';
      if (ex && ex.text) line += ' · последний пример: «' + ex.text + '»' + (ex.lesson ? ' (' + ex.lesson + ')' : '');
      if (row.priority) line += ' ← ПРИОРИТЕТ';
      lines.push(line);
    });
    return lines.join('\n');
  }

  /* ---------- 4.2 блок 2: контекст ---------- */

  /** «Прошлый раз» — три последних итога дорожки, как и было. */
  function lastTimeLine(trackId, lessonId) {
    var sums = State.recentSummaries(trackId, 3, lessonId);
    if (!sums.length) return 'Прошлый раз: это первый урок дорожки.';
    return 'Прошлый раз: ' + sums.map(function (s) {
      var p = s.parsed || {};
      return s.lessonId + ' (' + U.fmtShort(s.date) + ') ' +
        (p.score != null ? p.score + '/10' : 'без счёта') +
        (p.level ? ', ' + p.level : '') +
        (p.topics ? ' — ' + p.topics : '');
    }).join(' · ');
  }

  /** Строка ступени для [КОНТЕКСТ] (ТЗ 4.2). */
  function stageLine(p) {
    var s = p.slots;
    var total = s ? (s.warm + s.base + s.write + s.stretch) : parseInt(p.qRange, 10) || 0;
    var layout = p.layout ? p.layout : p.qRange + ' заданий';
    return 'Ступень: ' + p.stepLabel + (p.title && p.title !== p.name ? ' «' + p.title + '»' : '') +
      ' — ' + total + ' ' + U.plural(total, 'задание', 'задания', 'заданий') +
      ' = ' + layout + '; спринты ' + (p.sprintLabel || '~' + Math.round(p.lessonMin / 2) + ' минут') + '.';
  }

  /** Конкурсный урок ступени не имеет: у него свой формат (ТЗ 4.6). */
  var CONTEST_LINE = 'Формат: конкурсный урок ⭐ — три задачи (A, A, B), ~30–40 минут, ' +
    'без разогрева, письма и стретча; счёт = сумма баллов, максимум 10.';

  /* ---------- 4.2 блок 8: разогрев ---------- */

  function warmupBlock(trackId, lessonId) {
    var sums = State.recentSummaries(trackId, 1, lessonId);
    var qs = sums.length ? ((sums[0].parsed || {}).warmup || []) : [];
    qs = qs.filter(function (q) { return q && String(q).trim(); });
    var words = State.lastLessonWords(trackId, lessonId);
    var lines = ['[РАЗОГРЕВ] — два задания в начале урока: отсюда и из долгов с пометкой ПРИОРИТЕТ.'];
    lines.push(qs.length
      ? 'Вопросы из прошлого итога: ' + qs.join('; ')
      : 'Вопросов из прошлого итога нет — возьми оба задания из долгов с пометкой ПРИОРИТЕТ.');
    lines.push(words.length
      ? 'Слова прошлого урока (вплети в вопросы): ' + words.map(function (w) { return w.en + ' — ' + w.ru; }).join('; ')
      : 'Слов прошлого урока пока нет.');
    return lines.join('\n');
  }

  /* ---------- 8.1 Полный промпт урока ---------- */

  /**
   * lessonPrompt(lessonId, opts)
   *  opts.today       — логическая дата (по умолчанию State.today())
   */
  function lessonPrompt(lessonId, opts) {
    opts = opts || {};
    var todayIso = opts.today || State.today();
    var lesson = CONTENT.lesson(lessonId);
    if (!lesson) return null;

    var blockId = lesson.blockId;
    var block = State.block(blockId) || {};
    var trackId = block.track || 'eng';
    var p = STEPS.params(State.s.step, todayIso, State.mode(), State.stageName());
    var contest = isContest(lesson);
    // в конкурсном уроке заданий ровно три — контракт должен говорить то же,
    // что этапы, иначе правило 2 будет спорить с шаблоном
    if (contest) p = Object.assign({}, p, { qRange: '3' });
    var videoDone = State.videoWatched(lessonId, todayIso) ? 'да' : 'нет';
    var saturday = U.weekday(todayIso) === 6;
    var youtube = videoQuery(lesson);

    // CEMC ⭐ — математическая олимпиадная задача: в письме и бизнесе ей нечего делать
    var isMath = trackId === 'math';
    var cemcFlag = (p.cemc && isMath) ? ', плюс 1 задача уровня CEMC ⭐' : '';
    var specialText = specialFor(p, isMath);
    var special = specialText ? '\nОсобое на этой ступени: ' + specialText + '.' : '';
    var ruLine = p.ru === '0'
      ? 'Доля русского: 0 (русский выключен; включается только по явной просьбе).'
      : 'Доля русского: ' + p.ru + ' (только для новых терминов и грамматики; остальное — английский).';

    // Порядок блоков — ТЗ 4.2, и он не случайный: контракт первым, ключи
    // последними. Ключ, увиденный раньше попытки, обесценивает урок.
    var gloss = glossaryBlock(lesson, trackId);
    var text = textBlock(lesson);
    return [
      'Ты — мой персональный преподаватель школьной программы Онтарио.',
      'Веди урок строго по контракту ниже и по блокам этого промпта.',
      '',
      contractV3(p),
      '',
      '[КОНТЕКСТ]',
      'Фаза: ' + State.phaseName(block.phase) + ' · Блок: ' + State.blockLabel(blockId) + ' «' + (block.title || '') +
      '» · Урок: ' + State.lessonLabel(lessonId) + ' «' + lesson.title + '»',
      'Дорожка: ' + State.trackName(trackId) + ' · Цель урока: ' + (lesson.goal || '—'),
      contest ? CONTEST_LINE : stageLine(p),
      // «Доля русского» осталась только там, где она что-то меняет — на Г1+;
      // на S0–S4 её место занял человеческий язык правила 1
      contest ? null : (p.ru === '0' || p.ru === '≤10%'
        ? ruLine + special
        : 'Язык: задания и образцы — по-английски, инструкции и разборы — по-русски (правило 1).' + special),
      youtube && !contest ? 'Видео просмотрено: ' + videoDone + ' («' + youtube + '»)' : null,
      lesson.focus ? 'Фокус практики: ' + lesson.focus : null,
      lesson.writing && !contest ? 'Письменная работа урока: ' + lesson.writing : null,
      lastTimeLine(trackId, lessonId),
      '',
      gloss,
      gloss ? '' : null,
      text,
      text ? '' : null,
      contest ? contestTasksBlock(lesson) : tasksBlock(lesson),
      '',
      debtsBlock(trackId),
      '',
      contest ? null : checklistBlock(),
      contest ? null : '',
      contest ? null : warmupBlock(trackId, lessonId),
      contest ? null : '',
      contest ? contestStages() : stagesBlock(p, youtube, saturday),
      '',
      finalBlock(lessonId, contest),
      '',
      keysBlock(lesson, contest, trackId)
    ].filter(function (l) { return l !== null; }).join('\n');
  }

  /* ---------- 8.5 Промпт минималки ---------- */

  /**
   * Шаблон 8.5. Пустые блоки не печатаются: пока банк слов и долгов пуст,
   * просить ИИ гонять «слов пока нет» — значит тратить разминку впустую.
   * Нумерация пересчитывается по оставшимся пунктам.
   *
   * Слова берём по расписанию повторов (warmupWords), а не по возрасту:
   * oldestWords SRS не смотрел и гнал в разминку одни и те же пятнадцать
   * выученных слов каждый день. Пункт с пересказом печатается всегда —
   * поэтому промпт не бывает пустым, даже когда сегодня повторять нечего.
   */
  function minimalPrompt(opts) {
    var todayIso = (opts && opts.today) || State.today();
    var words = State.warmupWords(15, todayIso);
    var debts = State.warmupDebts();
    var lines = ['Разминка ~10 минут, без урока и без «ИТОГА».'];
    var n = 0;

    if (words.length) {
      lines.push(++n + ') Слова вперемешку, по одному, EN↔RU: ' +
        words.map(function (w) { return w.en + ' — ' + w.ru; }).join('; '));
    }
    if (debts.length) {
      lines.push(++n + ') Долги — по одному короткому вопросу на каждый:');
      debts.forEach(function (d) {
        lines.push('   ' + d.did + ' (' + (d.cat || '—') + ') ' + d.text +
          ' · ' + State.debtProgress(d) + '/2');
      });
    }
    lines.push(++n + ') ' + (n === 1 ? 'Прими' : 'Затем прими') +
      ' мой 60-секундный пересказ сегодняшнего видео/аудио и задай 2 вопроса по нему.');
    lines.push('Темп быстрый, объяснения — одной строкой.');
    // ТЗ 4.5: разминка тоже пишет в приложение, и пишет ровно одной строкой
    lines.push('Определения — только дословно из строки долга. ' +
      'Слов «закрыт / погашен» не писать.');
    // образец строится из настоящих id этой разминки и настоящего числа слов:
    // выдуманный D-10 в образце учил ИИ писать то, чего в промпте не было
    var sample = (debts.length
      ? debts.map(function (d) { return d.did + ' ✓'; }).join(' ')
      : 'D-… ✓') + ' · слова ' + words.length + '/' + words.length;
    lines.push('Последняя строка ответа — одна: «РАЗМИНКА: ' + sample +
      '»; ✓ или ✗ проставь сам, ученик вставит только её.');

    return lines.join('\n');
  }

  /* ============================================================
     Парсер «ИТОГА УРОКА» (раздел 8.4)
     ============================================================ */

  var FIELDS = [
    { key: 'topics', re: /^\s*Пройдено\s*:?\s*/i },
    { key: 'level', re: /^\s*Уровень\s*:?\s*/i },
    { key: 'score', re: /^\s*Сч[ёе]т\s*:?\s*/i },
    { key: 'words', re: /^\s*Слова\s*(\([^)]*\))?\s*:?\s*/i },
    { key: 'debts', re: /^\s*Долги\s*:?\s*/i },
    // «Погашено» — имя поля до 2.7.0; принимаем ещё два релиза (ТЗ 2.2)
    { key: 'cleared', re: /^\s*(?:Засчитано|Погашено)\s*:?\s*/i },
    { key: 'checklist', re: /^\s*Чек-?\s*лист\s*(?:языка)?\s*:?\s*/i },
    { key: 'warmup', re: /^\s*В\s*разогрев\s*:?\s*/i },
    { key: 'writing', re: /^\s*Письмо\s*:?\s*/i }
  ];

  /**
   * Снимает markdown-обвес строки: ведущие «#» и цитату, обрамляющие
   * «*», «_», «`» — в том числе вокруг названия поля («**Счёт:** 7/10»).
   * Содержимое не трогаем: дефисы и подчёркивания внутри слов остаются.
   */
  function unmark(line) {
    return String(line)
      .replace(/^\s*>?\s*#{1,6}\s*/, '')
      .replace(/^\s*[*_`]{1,3}\s*/, '')
      .replace(/\s*[*_`]{1,3}\s*$/, '')
      .replace(/^([^:]{1,32}?)[*_`]{1,3}\s*:/, '$1:')
      .replace(/^([^:]{1,32}?:)[*_`]{1,3}/, '$1');
  }

  function isEmptyWord(s) {
    var t = String(s).trim().toLowerCase().replace(/[.;,]+$/, '');
    return !t || t === 'нет' || t === '-' || t === '—' || t === '–' || t === 'none';
  }

  /**
   * Разбивает многострочное поле на элементы — ТОЛЬКО по переводам строк.
   *
   * Раньше здесь стояло ещё и `.replace(/\s(\d+)[).]\s/g, '\n')`, которое
   * должно было срезать нумерацию «1) … 2) …», но било по всему телу поля:
   * любые «пробел + цифры + точка-или-скобка + пробел» становились границей
   * элемента, а само число исчезало. В проде «что даёт 2x − 3y = 0. Объясни»
   * превращалось в «что даёт 2x − 3y =» и «Объясни» — вопрос без правой
   * части уезжал в разогрев следующего урока и оставался там навсегда.
   * Ломались все четыре списочных поля: слова, долги, погашено, разогрев.
   *
   * Цена отказа — нумерация в одну строку («1) a 2) b») останется одним
   * элементом. Это косметика: строка читается целиком и информации не теряет.
   * Разрыв формулы терял её безвозвратно.
   *
   * Точка с запятой разделителем остаётся: так эти поля и пишет ИИ
   * («слово — перевод; слово — перевод», «что такое slope?; как найти y-intercept?»),
   * и внутри формулы её не бывает — математике она не вредит.
   */
  function toList(raw, byLinesOnly) {
    if (!raw) return [];
    return String(raw)
      .split(byLinesOnly ? /\r?\n/ : /\r?\n|;/)
      .map(function (x) {
        return x
          // маркер списка требует пробела после себя, иначе «-3 < x < 5»
          // теряет знак минуса
          .replace(/^\s*[-–—•*]\s+/, '')
          .replace(/^\s*\d+[).]\s+/, '')
          .trim();
      })
      .filter(function (x) { return x && !isEmptyWord(x); });
  }

  var TICK_RE = /[\u2713\u2714+]/;          // ✓ ✔ +
  var CROSS_RE = /[\u2717\u2718\u00d7xX-]/;  // ✗ ✘ × x -

  /**
   * «Чек-лист: 1✓ 2✓ 3✗ 4✓ 5✓» → [true,true,false,true,true].
   * Номера пунктов фиксированы (ТЗ 4.3), по ним и считается статистика,
   * поэтому читаем именно «номер + знак», а не порядок знаков в строке.
   * Строки нет или знаков нет — возвращаем null: ничего не пишем.
   */
  function parseChecklist(raw) {
    if (!raw) return null;
    var out = [], found = 0;
    var re = /([1-5])\s*([\u2713\u2714+\u2717\u2718\u00d7xX-])/g;
    var m;
    while ((m = re.exec(String(raw)))) {
      var i = parseInt(m[1], 10) - 1;
      if (out[i] !== undefined) continue;      // повтор номера — берём первый
      out[i] = TICK_RE.test(m[2]);
      found++;
    }
    if (!found) return null;
    for (var j = 0; j < 5; j++) if (out[j] === undefined) out[j] = false;
    return out.slice(0, 5);
  }

  var WARMUP_RE = /^\s*РАЗМИНКА\s*:/i;

  /** Вставленный текст — отчёт разминки, а не итог урока? */
  function isWarmup(text) { return WARMUP_RE.test(String(text || '')); }

  /**
   * «РАЗМИНКА: D-1 ✓ D-10 ✗ · слова 15/15» (ТЗ 2.3).
   * → { ok, error, marks:[{did, ok}], words:{done,total}|null, raw }
   */
  function parseWarmup(text) {
    var src = String(text || '').trim();
    if (!isWarmup(src)) {
      return { ok: false, error: 'Строка разминки начинается с «РАЗМИНКА:».', marks: [] };
    }
    var body = src.replace(WARMUP_RE, '');
    var marks = [], seen = {};
    var re = /\bD-(\d+)\s*([\u2713\u2714+\u2717\u2718\u00d7xX])/gi;
    var m;
    while ((m = re.exec(body))) {
      var did = 'D-' + m[1];
      if (seen[did]) continue;                 // первый знак по долгу и решает
      seen[did] = true;
      marks.push({ did: did, ok: TICK_RE.test(m[2]) });
    }
    var w = /слова\s*(\d+)\s*\/\s*(\d+)/i.exec(body);
    if (!marks.length) {
      return {
        ok: false, marks: [],
        error: 'В строке разминки нет ни одного долга вида «D-1 ✓» или «D-1 ✗».'
      };
    }
    return {
      ok: true, marks: marks, raw: src,
      words: w ? { done: parseInt(w[1], 10), total: parseInt(w[2], 10) } : null
    };
  }

  /**
   * parse(text) → { ok, error, lessonId, topics, level, score, words:[{en,ru}],
   *                 debts:[], cleared:[], warmup:[], checklist:[bool]|null, writing, raw }
   */
  function parse(text) {
    var src = String(text || '');
    var startRe = /===\s*ИТОГ\s+УРОКА\s*([^\s=]*)\s*===/i;
    var m = startRe.exec(src);
    if (!m) {
      return { ok: false, error: 'Не вижу формата: нужен блок «=== ИТОГ УРОКА … ===». Попроси ИИ повторить итог по шаблону.' };
    }

    var from = m.index + m[0].length;
    var endRe = /===\s*КОНЕЦ\s*===/i;
    var rest = src.slice(from);
    var em = endRe.exec(rest);
    var body = em ? rest.slice(0, em.index) : rest;

    var out = {
      ok: false, error: null,
      lessonId: (m[1] || '').trim().replace(/^Б/i, 'B') || null,
      topics: '', level: null, score: null,
      words: [], debts: [], cleared: [], warmup: [], checklist: null, writing: '',
      raw: (em ? src.slice(m.index, from + em.index + em[0].length) : src.slice(m.index)).trim()
    };

    // построчный разбор с поддержкой многострочных полей
    var buf = {};
    var cur = null;
    body.split(/\r?\n/).forEach(function (raw) {
      var line = unmark(raw);
      var matched = false;
      for (var i = 0; i < FIELDS.length; i++) {
        if (FIELDS[i].re.test(line)) {
          cur = FIELDS[i].key;
          buf[cur] = line.replace(FIELDS[i].re, '');
          matched = true;
          break;
        }
      }
      if (!matched && cur) buf[cur] = (buf[cur] ? buf[cur] + '\n' : '') + line;
    });

    out.topics = (buf.topics || '').trim().replace(/\s+/g, ' ');
    out.writing = (buf.writing || '').trim().replace(/\s+/g, ' ');

    // уровень — только литеральный L1|L2|L3: незаполненный шаблон
    // «Уровень: L1|L2|L3» не должен читаться как L1
    var lv = /^\s*L\s*([123])\s*$/i.exec(buf.level || '');
    if (lv) out.level = 'L' + lv[1];

    // счёт — строго формат N/10; «N/10» из шаблона отклоняется
    var sc = /^\s*(\d{1,2}(?:[.,]\d+)?)\s*\/\s*10\b/.exec(buf.score || '');
    if (sc) {
      var n = parseFloat(sc[1].replace(',', '.'));
      if (!isNaN(n) && n >= 0 && n <= 10) out.score = Math.round(n * 10) / 10;
    }

    out.words = toList(buf.words).map(function (item) {
      var parts = item.split(/\s+[—–-]\s+|\s*[—–]\s*/);
      var en = (parts[0] || '').trim();
      var ru = (parts.slice(1).join(' — ') || '').trim();
      return { en: en, ru: ru };
    }).filter(function (w) { return w.en; });

    // ведущий [D-…] в тексте нового долга — выдумка ИИ, а не часть формулировки;
    // в «Погашено» id наоборот якорь — там строка остаётся как есть
    // 2.7.0 (ТЗ 2.2): долг — одна строка целиком. Точка с запятой внутри
    // примера ошибки («метод; язык ответа») больше не рвёт его надвое.
    // «Засчитано» и остальные списки точку с запятой по-прежнему держат.
    out.debts = toList(buf.debts, true).map(U.stripDebtId).filter(Boolean);
    out.cleared = toList(buf.cleared);
    out.warmup = toList(buf.warmup);
    out.checklist = parseChecklist(buf.checklist);

    if (out.score == null || !out.level) {
      out.error = 'В итоге не хватает ' +
        (out.score == null && !out.level ? 'счёта и уровня' : (out.score == null ? 'счёта' : 'уровня')) +
        '. Попроси ИИ повторить итог по шаблону.';
      return out;
    }

    out.ok = true;
    return out;
  }

  return {
    lesson: lessonPrompt, minimal: minimalPrompt, parse: parse, video: videoQuery,
    parseWarmup: parseWarmup, isWarmup: isWarmup, parseChecklist: parseChecklist,
    stagesBlock: stagesBlock, contestStages: contestStages, isContest: isContest,
    contractV3: contractV3, finalBlock: finalBlock,
    glossaryBlock: glossaryBlock, textBlock: textBlock, tasksBlock: tasksBlock,
    contestTasksBlock: contestTasksBlock, keysBlock: keysBlock,
    checklistBlock: checklistBlock, LANG_CHECKLIST: LANG_CHECKLIST,
    debtsBlock: debtsBlock, warmupBlock: warmupBlock, stageLine: stageLine
  };
})();
