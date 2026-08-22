/* ============================================================
   prompts.js — генератор промптов и парсер «ИТОГА УРОКА».
   Раздел 8 ТЗ реализован буквально: шаблон 8.1, контракт из 12 правил
   8.2, этапы 8.3, формат итога 8.4, промпт минималки 8.5.
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

  function stagesBlock(p, youtube, saturday) {
    var lines = [
      '[ЭТАПЫ УРОКА]',
      '0. Статус-строка: блок/урок, счёт прошлого раза, открытые долги.',
      '1. Разогрев (7’, 6–8 вопросов: 3 из прошлого итога, 2–3 из долгов, 1–2 старых).',
      '2. Попытка (5–7’): реальная задача новой темы до объяснений; минимум два подхода; не спасать.',
      youtube
        ? '3. Вход: видео «' + youtube + '» (если не смотрел — отправь смотреть с заданием «3 термина + 1 вопрос»), затем 2 проверочных вопроса + ответ на вопрос студента.'
        : '3. Вход: видео к этому уроку не задано — сразу 2 проверочных вопроса + ответ на вопрос студента.',
      '4. Разбор дырок (7–10’, 4–6 вопросов): объяснять только то, чего не хватило в попытке, кусками ≤5 предложений, «почему этот шаг?» спрашивать студента.',
      '5. Практика-лестница (15–20’, ≥10 заданий, вперемешку — никакие 2 подряд одним способом): L1 база → L2 школьный уровень → L3 перенос/«что если»/CEMC ⭐.',
      '6. Письмо (10’): мат-дорожки — объяснение одного решения по-английски 5–8 предложений «как для учителя»; гуманитарные — абзац PEEL или фрагмент по теме. Фидбек ≤3 типов ошибок → чистовик.',
      '7. Выход (4’): 60-секундный пересказ «как учитель» + 8–12 карточек (слова + ошибки).',
      '8. «Связка» (1 предложение: как тема связана с известным) + ИТОГ УРОКА.'
    ];
    lines.push('');
    // сжимать нечего, если урок и так 50-минутный (раздел 8.1)
    if (p.lessonMin < 50) {
      lines.push('Тайминги выше — ориентир для 50-минутного урока. Этот урок ~' + p.lessonMin +
        ' мин: сжимай пропорционально, минимумы контракта не снижай' +
        (p.lessonMin <= 40 ? '; письмо — 3–5 предложений вместо 5–8' : '') + '.');
    }
    if (youtube) {
      lines.push('Просмотр видео в длительность урока не входит (это пауза между этапами 2 и 4), ' +
        'проверочные вопросы этапа 3 — входят.');
    }
    if (saturday) {
      lines.push('Суббота ⭐: заверши практику одним challenge-заданием уровня L3.');
    }
    return lines.join('\n');
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

  /* ---------- 8.2 Контракт преподавателя (12 правил) ---------- */

  function contractBlock(p, indexOfDay) {
    return [
      '[КОНТРАКТ]',
      '1. Веди строго по этапам 0–8, ни один не пропускается.',
      '2. Никогда не решай за студента; после любого объяснения — сразу вопрос.',
      '3. Объяснение — не длиннее 5 предложений за раз.',
      '4. Минимумы: разогрев ≥6 вопросов; практика ≥10 заданий; всего за урок ≥' + p.minQuestions + ' вопросов.',
      '5. Ошибка → обязательный ритуал: «покажи, как рассуждал» → микрообъяснение → 2 задачи того же типа до двух подряд верных → долг в итог.',
      '6. Дальше по лестнице — только после двух подряд верных на текущем уровне. Урок не закрывается без взятого L2.',
      '7. Студенту легко → не разжёвывай: поднимай уровень, давай перевёртыши «а что если», задачи на перенос.',
      p.ru === '0'
        ? '8. Русский — 0 (русский выключен; включается только по явной просьбе).'
        : '8. Русский — только для новых терминов/грамматики, в пределах ' + p.ru + '.',
      '9. Письменная работа обязательна; фидбек ≤3 типов ошибок; чистовик обязателен.',
      '10. Перерывы: это ' + indexOfDay + '-й урок дня. Если 1-й из двух — в конце скажи сделать перерыв 5–10 мин без экрана и только потом открывать второй урок. При 2 ошибках невнимательности подряд предложи 2-минутную паузу стоя.',
      '11. Тон живой, без канцелярита. Раз в ~10 минут меняй формат: роль-реверс (студент объясняет тебе), мини-челлендж на время, пример из реального бизнеса или проектов студента. Похвала конкретная — за шаг рассуждения, а не «молодец» вообще.',
      '12. Финал — «ИТОГ УРОКА» строго по формату. Без него урок не засчитывается.'
    ].join('\n');
  }

  /* ---------- 8.4 Формат итога ---------- */

  function finalBlock(lessonId) {
    return [
      '[ФИНАЛ] — выдай «ИТОГ УРОКА» строго в этом формате, без лишнего текста внутри блока:',
      '',
      '=== ИТОГ УРОКА ' + lessonId + ' ===',
      'Пройдено: <темы одной строкой>',
      'Уровень: L1|L2|L3',
      'Счёт: N/10',
      'Слова (8–12): слово — перевод; ...',
      'Долги: <новые слабые места, каждый с новой строки, или «нет»>',
      'Погашено: <долги, отработанные в этом уроке (два верных подряд), или «нет»>',
      'В разогрев: <3 вопроса>',
      'Письмо: <одна строка оценки чистовика>',
      '=== КОНЕЦ ===',
      '',
      'После итога добавь одну строку: «5 минут карточек — перед сном».'
    ].join('\n');
  }

  /* ---------- память ---------- */

  /**
   * [ПАМЯТЬ] раздела 8.1.
   * Дорожка 'all' (Б16, Б26, Б42, Б52 — финалы вперемешку) память не фильтрует:
   * туда идут три последних итога и слова любых дорожек и долги всех дорожек.
   * У обычной дорожки долги — только свои, добора чужими нет: пусто → «нет».
   */
  function memoryBlock(trackId, lessonId) {
    var sums = State.recentSummaries(trackId, 3, lessonId);
    var sumText = sums.length
      ? sums.map(function (s) {
        var p = s.parsed || {};
        var warm = (p.warmup || []).filter(function (q) { return q && String(q).trim(); });
        return '\n  – ' + s.lessonId + ' (' + U.fmtShort(s.date) + '): ' +
          (p.score != null ? p.score + '/10' : 'без счёта') +
          (p.level ? ', ' + p.level : '') +
          (p.topics ? ' — ' + p.topics : '') +
          // «В разогрев» прошлого итога — это и есть первые вопросы этого урока (8.4)
          (warm.length ? '\n      в разогрев: ' + warm.join('; ') : '');
      }).join('')
      : 'пока нет — это первый урок дорожки';

    var debts = State.openDebts(trackId).slice(0, 5);
    var debtText = debts.length
      ? debts.map(function (d) { return '\n  – ' + d.text + ' (из ' + d.createdIn + ')'; }).join('')
      : 'нет';

    var words = State.recentWords(trackId, lessonId);
    var wordText = words.length
      ? words.map(function (w) { return w.en + ' — ' + w.ru; }).join('; ')
      : 'ещё не набраны';

    return [
      '[ПАМЯТЬ]',
      'Итоги последних уроков: ' + sumText,
      'Открытые долги (проработай в разогреве и практике): ' + debtText,
      'Слова последних уроков (вплети в вопросы): ' + wordText
    ].join('\n');
  }

  /* ---------- 8.1 Полный промпт урока ---------- */

  /**
   * lessonPrompt(lessonId, opts)
   *  opts.today       — логическая дата (по умолчанию State.today())
   *  opts.indexOfDay  — какой это урок дня: 1 или 2
   */
  function lessonPrompt(lessonId, opts) {
    opts = opts || {};
    var todayIso = opts.today || State.today();
    var lesson = CONTENT.lesson(lessonId);
    if (!lesson) return null;

    var blockId = lesson.blockId;
    var block = State.block(blockId) || {};
    var trackId = block.track || 'eng';
    var p = STEPS.params(State.s.step, todayIso, State.mode());
    var indexOfDay = opts.indexOfDay || ((State.day(todayIso) || { lessons: [] }).lessons.length + 1);
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

    return [
      'Ты — мой персональный преподаватель. Веди урок строго по этапам и контракту ниже.',
      'Я изучаю английский как второй язык и школьную программу Онтарио; объясняй просто.',
      '',
      '[КОНТЕКСТ]',
      'Фаза: ' + State.phaseName(block.phase) + ' · Блок: ' + blockId + ' «' + (block.title || '') +
      '» · Урок: ' + lessonId + ' «' + lesson.title + '»',
      'Дорожка: ' + State.trackName(trackId) + ' · Цель урока: ' + (lesson.goal || '—'),
      'Ступень нагрузки: ' + p.stepLabel + ' → длительность ~' + p.lessonMin +
      ' мин, минимум вопросов за урок: ' + p.minQuestions + ',',
      'старт практики с уровня ' + p.startLevel +
      (p.finishLevel ? ' (финиш на ' + p.finishLevel + ' обязателен)' : '') +
      ', задач на перенос: ' + p.transfer + cemcFlag + '.',
      ruLine + special,
      youtube ? 'Видео просмотрено: ' + videoDone + ' («' + youtube + '»)' : null,
      lesson.focus ? 'Фокус практики: ' + lesson.focus : null,
      lesson.writing ? 'Письменная работа урока: ' + lesson.writing : null,
      '',
      memoryBlock(trackId, lessonId),
      '',
      stagesBlock(p, youtube, saturday),
      '',
      contractBlock(p, indexOfDay),
      '',
      finalBlock(lessonId)
    ].filter(function (l) { return l !== null; }).join('\n');
  }

  /* ---------- 8.5 Промпт минималки ---------- */

  /**
   * Шаблон 8.5. Пустые блоки не печатаются: пока банк слов и долгов пуст,
   * просить ИИ гонять «слов пока нет» — значит тратить разминку впустую.
   * Нумерация пересчитывается по оставшимся пунктам.
   */
  function minimalPrompt() {
    var words = State.oldestWords(15);
    var debts = State.openDebts().slice(0, 3);
    var lines = ['Разминка ~10 минут, без урока и без «ИТОГА».'];
    var n = 0;

    if (words.length) {
      lines.push(++n + ') Слова вперемешку, по одному, EN↔RU: ' +
        words.map(function (w) { return w.en + ' — ' + w.ru; }).join('; '));
    }
    if (debts.length) {
      lines.push(++n + ') Долги — по одному короткому вопросу на каждый: ' +
        debts.map(function (d) { return d.text; }).join('; '));
    }
    lines.push(++n + ') ' + (n === 1 ? 'Прими' : 'Затем прими') +
      ' мой 60-секундный пересказ сегодняшнего видео/аудио и задай 2 вопроса по нему.');
    lines.push('Темп быстрый, объяснения — одной строкой.');

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
    { key: 'cleared', re: /^\s*Погашено\s*:?\s*/i },
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

  /** Разбивает многострочное поле на элементы: по строкам, «;» и нумерации «2)». */
  function toList(raw) {
    if (!raw) return [];
    return String(raw)
      .replace(/\s(\d+)[).]\s/g, '\n')
      .split(/\r?\n|;/)
      .map(function (x) { return x.replace(/^\s*[-–—•*]\s*/, '').replace(/^\s*\d+[).]\s*/, '').trim(); })
      .filter(function (x) { return x && !isEmptyWord(x); });
  }

  /**
   * parse(text) → { ok, error, lessonId, topics, level, score, words:[{en,ru}],
   *                 debts:[], cleared:[], warmup:[], writing, raw }
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
      words: [], debts: [], cleared: [], warmup: [], writing: '',
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

    out.debts = toList(buf.debts);
    out.cleared = toList(buf.cleared);
    out.warmup = toList(buf.warmup);

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
    stagesBlock: stagesBlock, contractBlock: contractBlock, finalBlock: finalBlock
  };
})();
