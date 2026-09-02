/* ============================================================
   state.js — модель данных (раздел 5 ТЗ), хранение и доктринальные счётчики.
   localStorage — рабочий кэш и полный источник при отсутствии сети.
   Supabase подключается в sync.js (этап 6) поверх этих же данных.
   ============================================================ */

window.State = (function () {
  'use strict';

  var KEY = 'study-system-v2';
  var SCHEMA = 3;
  var APP_VERSION = '2.6.5';

  /** Дата автоматической смены режима Лето → Школа (раздел 5, 7.2). */
  var AUTO_SCHOOL_DATE = '2026-09-08';

  var TRACKS = [
    { id: 'math', name: 'Математика', lastLessonDate: null },
    { id: 'write', name: 'Письмо и чтение', lastLessonDate: null },
    { id: 'cs', name: 'Информатика', lastLessonDate: null },
    { id: 'biz', name: 'Бизнес', lastLessonDate: null },
    { id: 'eng', name: 'Академ. английский', lastLessonDate: null, embedded: true }
  ];

  /** Дефолтные даты фаз (раздел 9.1), редактируются в Настройках. */
  /** Дедлайны Ф0 после сжатия фазы (релиз 2.6.0) — источник миграции. */
  var P0_DEADLINES = {
    B1: '2026-08-29', B2: '2026-08-27', B3: '2026-09-01',
    B4: '2026-09-03', B5: '2026-09-04', B6: '2026-09-07'
  };

  /* ---------- 2.7.0: таксономия долгов (ТЗ 1.1) ---------- */

  /**
   * Закрытый список категорий долга. Корень пакета «Корень»: ИИ больше не
   * сочиняет, чем ученик болен, — он выбирает код из этого списка.
   * Долг без валидного `cat` создать нельзя, и в одной категории не бывает
   * двух открытых долгов — дубли убиты структурно.
   * Список правит только Архитектор через ТЗ; из UI он недоступен.
   */
  var DEBT_CATS = [
    // дорожка write — «Письмо и чтение»
    { code: 'П1', track: 'write', name: 'Point — спорное утверждение с глаголом, не тема и не цель' },
    { code: 'П2', track: 'write', name: 'Evidence — проверяемый факт: прошедшее время, число, источник' },
    { code: 'П3', track: 'write', name: 'Explain — разбор именно Evidence («this shows that…»), не пересказ Point' },
    { code: 'П4', track: 'write', name: 'Link — возврат к Point без обобщений и новых фактов' },
    { code: 'П5', track: 'write', name: 'Главная мысль текста — предложение с глаголом, накрывающее весь текст' },
    { code: 'П6', track: 'write', name: 'Полные предложения — без ярлыков, фрагментов после двоеточия, голых формул' },
    { code: 'П7', track: 'write', name: 'Баллы → объём: число идей и предложений = число marks; формат под команду' },
    { code: 'П8', track: 'write', name: 'Команда — ответ строго под command word (state / define / explain / assess…)' },
    { code: 'П9', track: 'write', name: 'Весь вопрос — все части и все требования (длина, язык, форма)' },
    { code: 'П10', track: 'write', name: 'Вывод из текста (inference) — опирается на конкретную строку текста' },
    // дорожка math — «Математика»
    { code: 'М1', track: 'math', name: 'Требования условия — метод, язык ответа, форма («без цифр»), конкретный вопрос' },
    { code: 'М2', track: 'math', name: 'Ходы записаны, запись читаема — иначе теряются part marks' },
    { code: 'М3', track: 'math', name: 'Форма ответа — пара (x, y), единицы, знак, округление как просили' },
    { code: 'М4', track: 'math', name: 'Параметры словами — m и b: знак, единицы, смысл («m = −4 L per hour, which is the rate…»)' },
    { code: 'М5', track: 'math', name: 'Объяснение решения — одно лицо, present simple, полные предложения, финал называет величину' },
    { code: 'М6', track: 'math', name: 'Проверка ответа по условию — домен, здравый смысл, подстановка' },
    { code: 'М7', track: 'math', name: 'Определение термина (define) — категория + отличие, не пример и не число' },
    { code: 'М8', track: 'math', name: 'Полнота — все части вопроса, вторая половина не брошена' },
    { code: 'О1', track: 'math', name: 'Вход — после видео задан свой вопрос по материалу' }
  ];

  /**
   * Ремонт банка долгов, миграция схемы 2 → 3 (ТЗ 1.2).
   * `did` — долг, который остаётся (старейший id); `absorbs` — поглощаемые;
   * `text` — канонический текст; `track` — дорожка, если её меняют.
   * Тексты поглощённых уходят в `examples`: это живые примеры ошибки,
   * и терять их вместе с дублями нельзя.
   */
  var DEBT_MERGE_V3 = [
    { did: 'D-1', cat: 'П7', absorbs: ['D-2'], text: 'Баллы → объём: число идей и предложений не совпадает с числом marks; формат ответа не переносится с одной команды на другую' },
    { did: 'D-10', cat: 'П2', absorbs: [], text: 'Evidence не факт: будущее время / без числа / без источника («I can buy» вместо «Last month I sold 14…»)' },
    { did: 'D-11', cat: 'П3', absorbs: ['D-43'], text: 'Explain не разбирает Evidence: после факта нет «this shows that…», объясняется Point' },
    { did: 'D-12', cat: 'П4', absorbs: [], text: 'Link уходит в обобщение или добавляет новый факт вместо возврата к Point' },
    { did: 'D-13', cat: 'П1', absorbs: ['D-37'], text: 'Point — тема или цель вместо спорного утверждения с глаголом' },
    { did: 'D-44', cat: 'П5', absorbs: [], text: 'Главная мысль записана как тема без глагола' },
    { did: 'D-25', cat: 'П6', absorbs: ['D-30', 'D-35', 'D-42'], track: 'write', text: 'Ярлык, фрагмент после двоеточия или голая формула вместо полного предложения' },
    { did: 'D-5', cat: 'М4', absorbs: ['D-6', 'D-24'], text: 'm и b словами: теряется знак, единицы или смысл (нужно: m = −4 L per hour, which is the rate…)' },
    { did: 'D-8', cat: 'М1', absorbs: ['D-16', 'D-22', 'D-28', 'D-33'], text: 'Требования условия не выполнены: метод / язык ответа / «без цифр» / конкретный вопрос' },
    { did: 'D-15', cat: 'М3', absorbs: [], text: 'Ответ системы одним числом вместо пары (x, y); форма ответа не как просили' },
    { did: 'D-17', cat: 'М5', absorbs: [], text: 'В объяснении решения плавает лицо и время (I would → Add → We\'ll)' },
    { did: 'D-19', cat: 'М2', absorbs: ['D-23'], text: 'Ходы не записаны или запись нечитаема (450 → 449) — потеря part marks' },
    { did: 'D-21', cat: 'М8', absorbs: [], text: 'Отвечает на первую половину вопроса, вторую бросает' },
    { did: 'D-9', cat: 'О1', absorbs: [], text: 'После видео не задан свой вопрос по материалу' }
  ];

  /** Не долги, а чек-лист языка: из открытых, из колоды и из промпта вон (ТЗ 1.2). */
  var DEBT_CHECKLIST_V3 = [
    'D-14', 'D-18', 'D-20', 'D-26', 'D-27', 'D-29', 'D-32',
    'D-34', 'D-36', 'D-38', 'D-39', 'D-40', 'D-41'
  ];

  /** Ложный долг: правило про артикль после «is called» выдумано (ТЗ 1.2). */
  var DEBT_DELETED_V3 = [{ did: 'D-31', reason: 'ложное правило' }];

  /** Закрывается вручную: отработан уроком и тремя разминками (ТЗ 1.2). */
  var DEBT_CLOSED_V3 = [
    { did: 'D-3', closedDate: '2026-09-02', note: 'B1.4 + три разминки 30.08–02.09' }
  ];

  /** Карточки-мусор из B3.1: выдуманные или бессмысленные термины (ТЗ 1.2). */
  var JUNK_WORDS_V3 = ['coverage test', 'approximate fact', 'conclusion drawn from'];

  /** Категория по коду или null. */
  function debtCat(code) {
    var want = String(code || '').trim();
    for (var i = 0; i < DEBT_CATS.length; i++) if (DEBT_CATS[i].code === want) return DEBT_CATS[i];
    return null;
  }

  /** Категории дорожки; 'all' и пусто — обе дорожки (Б16). */
  function catsForTrack(trackId) {
    if (!trackId || trackId === 'all') return DEBT_CATS.slice();
    return DEBT_CATS.filter(function (c) { return c.track === trackId; });
  }

  /** Дорожка кода категории: П → write, М/О → math. */
  function catTrack(code) {
    var c = debtCat(code);
    return c ? c.track : null;
  }

  /** Код принадлежит дорожке урока? Для 'all' подходит любой код списка. */
  function catFitsTrack(code, trackId) {
    var c = debtCat(code);
    if (!c) return false;
    return !trackId || trackId === 'all' || c.track === trackId;
  }

  var PHASE_DATES = {
    p0: { start: '2026-08-18', end: '2026-09-07' },
    p1: { start: '2026-09-08', end: '2027-01-31' },
    p2: { start: '2027-02-01', end: '2027-06-26' },
    bridge: { start: '2027-07-01', end: '2027-08-31' },
    p3: { start: '2027-09-07', end: '2028-01-31' },
    p4: { start: '2028-02-01', end: '2028-06-24' }
  };

  var PHASES = [
    { id: 'p0', name: 'Ф0 «Фундамент»', milestone: 'веха: placement-тест 25.08' },
    { id: 'p1', name: 'Ф1 «Семестр 1»' },
    { id: 'p2', name: 'Ф2 «Семестр 2»' },
    { id: 'bridge', name: 'Мост «Лето-2027»' },
    { id: 'p3', name: 'Ф3 «Год 2, семестр 1»' },
    { id: 'p4', name: 'Ф4 «Год 2, семестр 2»' }
  ];

  /**
   * Карта блоков Ф2–Ф4 (раздел 9.4 ТЗ) — названия и дорожки для экрана «Программа».
   * Уроки этих фаз придут пакетами content/phase2.js … phase5.js; пока пакет пуст,
   * блок виден в программе, но уроков не содержит.
   * Дедлайны раскладываются равномерно по датам фазы (блок ≈ 2 недели)
   * и дальше редактируются вручную.
   */
  var LATER_BLOCKS = [
    { id: 'B17', phase: 'p2', track: 'math', title: 'Функции и f(x)' },
    { id: 'B18', phase: 'p2', track: 'cs', title: 'Python-1' },
    { id: 'B19', phase: 'p2', track: 'math', title: 'Преобразования графиков' },
    { id: 'B20', phase: 'p2', track: 'write', title: 'OSSLT-весна' },
    { id: 'B21', phase: 'p2', track: 'math', title: 'Показательные' },
    { id: 'B22', phase: 'p2', track: 'cs', title: 'Python-2' },
    { id: 'B23', phase: 'p2', track: 'math', title: 'Последовательности и процент' },
    { id: 'B24', phase: 'p2', track: 'write', title: 'Эссе из 5 абзацев' },
    { id: 'B25', phase: 'p2', track: 'math', title: 'Триг. функции и тождества' },
    { id: 'B26', phase: 'p2', track: 'all', title: 'Финалы года' },

    { id: 'B27', phase: 'bridge', track: 'write', title: 'IELTS-диагностика' },
    { id: 'B28', phase: 'bridge', track: 'math', title: 'Многочлены (MHF4U)' },
    { id: 'B29', phase: 'bridge', track: 'write', title: 'Роман + дневник (NBE3U)' },
    { id: 'B30', phase: 'bridge', track: 'math', title: 'Комбинаторика (MDM4U)' },
    { id: 'B31', phase: 'bridge', track: 'math', title: 'Логарифмы' },
    { id: 'B32', phase: 'bridge', track: 'biz', title: 'Заявочный фундамент' },

    { id: 'B33', phase: 'p3', track: 'write', title: 'Эссе-анализ' },
    { id: 'B34', phase: 'p3', track: 'math', title: 'Полиномы и рациональные' },
    { id: 'B35', phase: 'p3', track: 'write', title: 'IELTS-интенсив' },
    { id: 'B36', phase: 'p3', track: 'math', title: 'Статистика' },
    { id: 'B37', phase: 'p3', track: 'math', title: 'Логарифмы и показательные' },
    { id: 'B38', phase: 'p3', track: 'biz', title: 'Заявки-1 (OUAC)' },
    { id: 'B39', phase: 'p3', track: 'math', title: 'Радианы и тождества' },
    { id: 'B40', phase: 'p3', track: 'math', title: 'Вероятность' },
    { id: 'B41', phase: 'p3', track: 'write', title: 'Заявки-2 (Kira/эссе)' },
    { id: 'B42', phase: 'p3', track: 'all', title: 'Финалы полугодия' },

    { id: 'B43', phase: 'p4', track: 'write', title: 'Анализ литературы' },
    { id: 'B44', phase: 'p4', track: 'math', title: 'Пределы и производная' },
    { id: 'B45', phase: 'p4', track: 'write', title: 'Шекспир' },
    { id: 'B46', phase: 'p4', track: 'math', title: 'Производные: оптимум' },
    { id: 'B47', phase: 'p4', track: 'biz', title: 'Менеджмент (BOH4M)' },
    { id: 'B48', phase: 'p4', track: 'math', title: 'Векторы' },
    { id: 'B49', phase: 'p4', track: 'cs', title: 'Исследовательская работа' },
    { id: 'B50', phase: 'p4', track: 'math', title: 'Прямые и плоскости' },
    { id: 'B51', phase: 'p4', track: 'math', title: 'Генеральный мат-повтор' },
    { id: 'B52', phase: 'p4', track: 'all', title: 'Финалы года' }
  ];

  /** Если-то правила (раздел 7.6), дефолт. */
  var IF_THEN = [
    { id: 'it1', text: 'пришёл из школы и поел → открываю ДЗ' },
    { id: 'it2', text: 'день рушится → минималка перед сном' },
    { id: 'it3', text: 'застрял на задаче 10 минут → записываю в долги и иду дальше' }
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function blank() {
    return {
      meta: { updatedAt: new Date().toISOString(), version: SCHEMA, onboardedAt: U.today() },
      settings: {
        mode: 'summer',
        autoSchoolDone: false,
        levels: clone(DOCTRINE.LEVELS),
        addons: clone(DOCTRINE.ADDONS),
        ranks: clone(DOCTRINE.RANKS),
        ifThen: clone(IF_THEN),
        phaseDates: clone(PHASE_DATES)
      },
      step: {
        position: 1,
        cycleStart: null,
        snoozeUntil: null,
        snoozeFrom: null,      // начало отсрочки — чтобы считать паузу цикла
        deloadUntil: null,
        deloadFrom: null,      // начало разгрузки — то же
        pauses: [],            // отрезки пауз {from,to,kind}: цикл на паузе, не сброшен
        history: []
      },
      tracks: clone(TRACKS),
      blocks: {},
      lessons: {},
      days: {},
      debts: [],
      radar: [],
      todos: [],
      summaries: [],
      // seen — ключи карточек, показанных сегодня. Считаем уникальные:
      // «сегодня 151» при колоде 80 означало число нажатий на «дальше»,
      // а не сколько карточек человек посмотрел.
      cards: { lastDay: null, viewedToday: 0, seen: [] },
      // SRS-накладка на банк слов: ключ — слово в нижнем регистре.
      // Сами слова живут в итогах уроков, здесь только их судьба.
      srs: {},
      // Какие долги реально ушли в промпт: lessons[urok] — список id урока,
      // min — список разминки. Перезаписывается каждым копированием промпта.
      // По нему «Погашено» проверяется на «этот долг вообще показывали?».
      injected: { min: [], lessons: {} },
      stats: { wordsTotal: 0, lessonsDone: 0, bestStreak: 0 },
      onboarded: false
    };
  }

  var s = blank();
  var listeners = [];
  var saveTimer = null;

  /* ---------- хранение ---------- */

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        s = migrate(parsed);
      } catch (e) {
        console.warn('Состояние повреждено, стартуем с чистого:', e);
        s = blank();
      }
    }
    return s;
  }

  /**
   * Дополняет загруженное состояние недостающими полями (совместимость версий).
   * Всё, что рендер и доктрина считают массивом или объектом, приводится к нему
   * с дефолтами: битый или урезанный файл не должен ронять экран.
   */
  function migrate(o) {
    var base = blank();
    var out = Object.assign({}, base, o || {});
    out.meta = Object.assign({}, base.meta, (o && o.meta) || {});
    out.settings = Object.assign({}, base.settings, (o && o.settings) || {});
    out.step = Object.assign({}, base.step, (o && o.step) || {});
    out.cards = Object.assign({}, base.cards, (o && o.cards) || {});
    // состояние до 2.6.4 считало нажатия: набора нет, а число несопоставимо
    // с новым смыслом — начинаем счёт заново. Смотрим в исходные данные,
    // а не в результат слияния: пустой набор туда уже подставил blank().
    var rawCards = (o && o.cards) || {};
    out.cards.seen = Array.isArray(rawCards.seen) ? rawCards.seen.slice() : [];
    if (!Array.isArray(rawCards.seen)) out.cards.viewedToday = 0;
    if (!out.srs || typeof out.srs !== 'object' || Array.isArray(out.srs)) out.srs = {};

    // 2.6.5: список показанных долгов. У состояний до 2.6.5 его нет — значит,
    // промпт копировался старой версией и ограничивать «Погашено» нечем:
    // пустой lessons[] читается как «ограничения нет» (см. injectedPool).
    if (!out.injected || typeof out.injected !== 'object' || Array.isArray(out.injected)) {
      out.injected = { min: [], lessons: {} };
    }
    if (!Array.isArray(out.injected.min)) out.injected.min = [];
    if (!out.injected.lessons || typeof out.injected.lessons !== 'object' ||
      Array.isArray(out.injected.lessons)) out.injected.lessons = {};
    out.stats = Object.assign({}, base.stats, (o && o.stats) || {});

    // списки доктрины: пустой или не-массив — берём дефолт целиком
    ['levels', 'addons', 'ranks'].forEach(function (k) {
      if (!Array.isArray(out.settings[k]) || !out.settings[k].length) {
        out.settings[k] = clone(base.settings[k]);
      }
    });
    // правила «если — то» можно вычистить в ноль, но массивом они быть обязаны
    if (!Array.isArray(out.settings.ifThen)) out.settings.ifThen = clone(base.settings.ifThen);
    if (!out.settings.phaseDates || typeof out.settings.phaseDates !== 'object') out.settings.phaseDates = {};
    out.settings.phaseDates = Object.assign({}, base.settings.phaseDates, out.settings.phaseDates);

    ['blocks', 'lessons', 'days'].forEach(function (k) { if (!out[k] || typeof out[k] !== 'object') out[k] = {}; });
    ['debts', 'radar', 'todos', 'summaries', 'tracks'].forEach(function (k) { if (!Array.isArray(out[k])) out[k] = clone(base[k]); });
    if (!out.tracks.length) out.tracks = clone(base.tracks);
    if (!Array.isArray(out.step.history)) out.step.history = [];

    // A-03: паузы цикла живут отрезками. У состояний, знавших только пару
    // «текущих» полей, отрезок восстанавливается из них — иначе прожитая
    // разгрузка после миграции укоротила бы цикл.
    if (!Array.isArray(out.step.pauses)) {
      out.step.pauses = [];
      if (out.step.snoozeFrom && out.step.snoozeUntil) {
        out.step.pauses.push({ from: U.addDays(out.step.snoozeFrom, 1), to: out.step.snoozeUntil, kind: 'snooze' });
      }
      if (out.step.deloadFrom && out.step.deloadUntil) {
        out.step.pauses.push({ from: U.addDays(out.step.deloadFrom, 1), to: out.step.deloadUntil, kind: 'deload' });
      }
    }

    // 2.6.0: новые дедлайны Фазы 0. Пользовательский дедлайн обычно не
    // затирается, но сжатие фазы — это как раз пересмотр сроков, и сделать
    // его надо ровно один раз: отсюда версия схемы.
    if (((o && o.meta && o.meta.version) || 0) < 2) {
      Object.keys(P0_DEADLINES).forEach(function (id) {
        if (out.blocks[id]) out.blocks[id].deadline = P0_DEADLINES[id];
      });
    }

    // 2.6.0: короткий id долга. Существующие долги получают D-1, D-2… по
    // порядку создания — массив s.debts и есть этот порядок.
    var seq = 0;
    out.debts.forEach(function (d) {
      var m = /^D-(\d+)$/.exec(String((d && d.did) || ''));
      if (m) seq = Math.max(seq, parseInt(m[1], 10));
    });
    out.debts.forEach(function (d) {
      if (d && !d.did) d.did = 'D-' + (++seq);
    });

    repairDebts(out);

    // 2.7.0: ремонт банка долгов, источник дедлайнов, чистка слов и достройка
    // минималки у импортированных дней. Разовая правка состояния — отсюда версия.
    if (((o && o.meta && o.meta.version) || 0) < 3) migrateV3(out);

    // A-14: свежесть дорожки без единого урока считается от даты онбординга;
    // у состояний, живших до этого поля, точкой отсчёта становится сегодня
    if (!out.meta.onboardedAt) out.meta.onboardedAt = today();

    out.meta.version = SCHEMA;
    return out;
  }

  /* ---------- 2.6.5: ремонт банка долгов ---------- */

  /**
   * Чинит три следа от того, что ИИ сам придумывал номера долгов, и один след
   * от парсера. Идемпотентна: каждый шаг проверяет форму до правки, повторный
   * прогон меняет ноль. → отчёт { reopened:[], cleaned:[], merged:[] }
   */
  function repairDebts(out) {
    var report = { reopened: [], cleaned: [], merged: [] };
    var debts = out.debts || [];
    function byDid(did) {
      var found = null;
      debts.forEach(function (d) { if (d && d.did === did) found = d; });
      return found;
    }

    // 1. Ложное погашение D-11 уроком B1.3. В промпте B1.3 стояли D-1..D-4 и
    //    D-10; ИИ продолжил нумерацию сам и написал «Погашено: [D-11] …».
    //    matchDebt нашёл долг по id и засчитал ему касание, которого не было.
    //    Правка точечная — это ремонт известного случая, а не общее правило:
    //    B1.4 тоже выдумывал номера для новых долгов, но гасил ровно те пять,
    //    что видел, и трогать его нельзя. Отпечаток — id, урок создания и
    //    сам текст итога.
    var false11 = byDid('D-11');
    var b13 = (out.summaries || []).filter(function (x) { return x.lessonId === 'B1.3'; })[0];
    if (false11 && false11.createdIn === 'B1.2' &&
      (false11.clearedIn || []).indexOf('B1.3') >= 0 &&
      b13 && String(b13.raw || '').indexOf('[D-11]') >= 0) {
      false11.clearedIn = false11.clearedIn.filter(function (x) { return x !== 'B1.3'; });
      if (false11.status === 'closed' && uniqueLessons(false11.clearedIn).length < 2) {
        false11.status = 'open';
        delete false11.closedDate;
      }
      report.reopened.push('D-11');
    }

    // 2. Выдуманные [D-…] внутри текстов долгов. Правило 14 велит копировать
    //    формулировку в «Погашено» дословно — и такой текст погасил бы чужой
    //    долг. С 2.6.5 парсер их срезает, здесь чистим уже накопленное.
    debts.forEach(function (d) {
      if (!d || !d.text) return;
      var clean = U.stripDebtId(d.text);
      if (clean && clean !== d.text) {
        d.text = clean;
        report.cleaned.push(d.did || d.id);
      }
    });

    // 3. D-6 и D-7 — один долг, разрезанный парсером по точке с запятой внутри
    //    шаблона «m = …; b = …». Огрызок D-6 закрылся сам (короткий текст целиком
    //    попал в перефраз ИИ), а его вторая половина осталась висеть. Склеиваем
    //    обратно: текст собираем из половин, чтобы вернуть исходную строку
    //    символ в символ; остаётся старший id, состояние берём у открытой половины.
    var d6 = byDid('D-6'), d7 = byDid('D-7');
    if (d6 && d7 && /^Шаблон «m = /.test(d6.text) && /^b = /.test(d7.text)) {
      d6.text = d6.text + '; ' + d7.text;
      d6.status = d7.status;
      d6.clearedIn = (d7.clearedIn || []).slice();
      if (d7.closedDate) d6.closedDate = d7.closedDate; else delete d6.closedDate;
      out.debts = debts.filter(function (d) { return d !== d7; });
      report.merged.push('D-6+D-7');
    }

    return report;
  }

  /* ---------- 2.7.0: миграция схемы 2 → 3 (ТЗ 1.2–1.4) ---------- */

  /** Отчёт последней миграции v3 — для тестов и прогона на копии экспорта. */
  var lastV3 = null;

  /** Контентный дедлайн блока: Ф0 — из P0_DEADLINES, остальное — из пакета. */
  function contentDeadline(blockId) {
    if (P0_DEADLINES[blockId]) return P0_DEADLINES[blockId];
    var b = window.CONTENT ? CONTENT.block(blockId) : null;
    return (b && b.deadline) || null;
  }

  /**
   * Знает ли блок хоть один пакет контента. Блоки Ф2–Ф4 (LATER_BLOCKS) не знает
   * никто: их сроки раздаёт spreadDeadlines, и источник у них 'spread'.
   */
  function contentKnowsBlock(blockId) {
    if (P0_DEADLINES[blockId]) return true;
    return !!(window.CONTENT && CONTENT.block(blockId));
  }

  /**
   * Ремонт банка долгов, источник дедлайнов и правило серии (ТЗ 1.2–1.4).
   * Идемпотентна дважды: снаружи её запирает версия схемы, внутри каждый шаг
   * проверяет форму до правки — повторный прогон меняет ноль.
   * → отчёт «было → стало», он же уходит в консоль.
   */
  function migrateV3(out) {
    var rep = {
      debts: { before: {}, after: {}, missing: [], merged: [], progress1: [] },
      blocks: { content: 0, user: 0, spread: 0, none: 0 },
      words: { fromSummaries: 0, fromSrs: 0, wordsTotal: [0, 0] },
      days: { minimalBackfilled: 0 },
      cats: { duplicates: [] }
    };
    var debts = out.debts || [];

    function countBy(list) {
      var acc = {};
      list.forEach(function (d) { var k = (d && d.status) || 'open'; acc[k] = (acc[k] || 0) + 1; });
      return acc;
    }
    rep.debts.before = countBy(debts);
    rep.debts.beforeTotal = debts.length;

    var byDid = {};
    debts.forEach(function (d) { if (d && d.did) byDid[d.did] = d; });

    /** Дата урока из состояния — ею подписывается пример ошибки. */
    function lessonDate(lessonId) {
      var l = lessonId && out.lessons && out.lessons[lessonId];
      return (l && l.date) || null;
    }

    // 0) поля новой схемы — у каждого долга, включая закрытые и поглощённые:
    //    UI и промпт обращаются к ним без оглядки на статус
    debts.forEach(function (d) {
      if (!d) return;
      if (!Array.isArray(d.examples)) d.examples = [];
      if (!Array.isArray(d.failedIn)) d.failedIn = [];
      if (!Object.prototype.hasOwnProperty.call(d, 'lastInjected')) d.lastInjected = null;
      if (typeof d.shownCount !== 'number') d.shownCount = 0;
      if (!Array.isArray(d.clearedIn)) d.clearedIn = [];
    });

    // 1) слияние дублей по таблице Архитектора
    DEBT_MERGE_V3.forEach(function (row) {
      var keep = byDid[row.did];
      if (!keep) { rep.debts.missing.push(row.did); return; }
      keep.cat = row.cat;
      keep.text = row.text;
      if (row.track) keep.track = row.track;
      // собственный текст долга — первый пример. Без него у семи долгов без
      // поглощённых примеров не было бы вовсе, а промпт печатает последний
      if (!keep.examples.length) {
        keep.examples.push({
          lesson: keep.createdIn || null,
          text: row.text,
          date: lessonDate(keep.createdIn) || 'migration'
        });
      }

      (row.absorbs || []).forEach(function (did) {
        var gone = byDid[did];
        if (!gone || gone.status === 'merged') return;   // уже поглощён — повтор ничего не делает
        rep.debts.merged.push(did + '→' + row.did);
        keep.examples.push({
          lesson: gone.createdIn || null,
          text: gone.text,
          date: lessonDate(gone.createdIn)
        });
        (gone.clearedIn || []).forEach(function (x) {
          if (keep.clearedIn.indexOf(x) < 0) keep.clearedIn.push(x);
        });
        gone.status = 'merged';
        gone.mergedInto = row.did;
      });

      // объединение могло дать два разных урока — тогда долг закрывается честно
      var uniq = uniqueLessons(keep.clearedIn);
      if (uniq.length >= 2) {
        keep.status = 'closed';
        if (!keep.closedDate) {
          var dates = uniq.map(lessonDate).filter(Boolean).sort();
          keep.closedDate = dates.length ? dates[dates.length - 1] : null;
        }
      } else {
        keep.status = 'open';
        delete keep.closedDate;
      }
      if (uniq.length === 1 && keep.status === 'open') rep.debts.progress1.push(keep.did);
    });

    // 2) чек-лист языка: это не долги, а привычки правописания
    DEBT_CHECKLIST_V3.forEach(function (did) {
      var d = byDid[did];
      if (!d) { rep.debts.missing.push(did); return; }
      d.status = 'checklist';
      delete d.closedDate;
    });

    // 3) ложный долг: правила, которого нет в языке, ученик не должен «гасить»
    DEBT_DELETED_V3.forEach(function (row) {
      var d = byDid[row.did];
      if (!d) { rep.debts.missing.push(row.did); return; }
      d.status = 'deleted';
      d.reason = row.reason;
    });

    // 4) закрытие вручную — отработано уроком и разминками
    DEBT_CLOSED_V3.forEach(function (row) {
      var d = byDid[row.did];
      if (!d) { rep.debts.missing.push(row.did); return; }
      d.status = 'closed';
      d.closedDate = row.closedDate;
      d.note = row.note;
    });

    rep.debts.after = countBy(out.debts || []);
    rep.debts.afterTotal = (out.debts || []).length;

    // контроль ТЗ 1.1: в одной категории не бывает двух открытых
    var seenCat = {};
    (out.debts || []).forEach(function (d) {
      if (!d || d.status !== 'open' || !d.cat) return;
      if (seenCat[d.cat]) rep.cats.duplicates.push(d.cat + ': ' + seenCat[d.cat] + ' + ' + d.did);
      else seenCat[d.cat] = d.did;
    });

    // 5) источник дедлайна блока (ТЗ 1.3). Совпал с контентным — значит его
    //    поставил контент и следующий пакет вправе его переписать; всё прочее
    //    считаем поставленным руками и не трогаем.
    Object.keys(out.blocks || {}).forEach(function (id) {
      var b = out.blocks[id];
      if (!b || b.deadlineSource) return;
      if (!b.deadline) { rep.blocks.none++; return; }
      if (!contentKnowsBlock(id)) {
        // Ф2–Ф4: срок раздан spreadDeadlines, руками его никто не ставил
        b.deadlineSource = 'spread';
      } else {
        var c = contentDeadline(id);
        b.deadlineSource = (c && c === b.deadline) ? 'content' : 'user';
      }
      rep.blocks[b.deadlineSource]++;
    });

    // 6) карточки-мусор. Банк слов живёт в итогах, накладка SRS — рядом:
    //    вычистить надо оба, иначе слово вернётся из итога на следующий день.
    var junk = {};
    JUNK_WORDS_V3.forEach(function (w) { junk[w] = true; });
    (out.summaries || []).forEach(function (sum) {
      var list = (sum && sum.parsed && sum.parsed.words) || null;
      if (!Array.isArray(list)) return;
      var kept = list.filter(function (w) { return !junk[String((w && w.en) || '').toLowerCase().trim()]; });
      if (kept.length !== list.length) {
        rep.words.fromSummaries += list.length - kept.length;
        sum.parsed.words = kept;
      }
    });
    Object.keys(out.srs || {}).forEach(function (k) {
      if (junk[String(k).toLowerCase().trim()]) { delete out.srs[k]; rep.words.fromSrs++; }
    });

    // счётчик слов — размер банка уникальных en (A-21), после чистки он другой
    rep.words.wordsTotal[0] = (out.stats && out.stats.wordsTotal) || 0;
    var seenW = {};
    (out.summaries || []).forEach(function (sum) {
      (((sum && sum.parsed) || {}).words || []).forEach(function (w) {
        var k = String((w && w.en) || '').toLowerCase().trim();
        if (k) seenW[k] = true;
      });
    });
    out.stats.wordsTotal = Object.keys(seenW).length;
    rep.words.wordsTotal[1] = out.stats.wordsTotal;

    // 7) серия (ТЗ 1.4): день держат урок и минималка, а не добавки. У дней,
    //    импортированных из v1, поля minimalSteps нет вовсе — а уровень дня
    //    там и означал, что минималка сделана. Без этой достройки новое
    //    правило объявило бы пустыми десятки честно прожитых дней.
    Object.keys(out.days || {}).forEach(function (iso) {
      var d = out.days[iso];
      if (!d || Array.isArray(d.minimalSteps)) return;
      if (!d.imported) return;      // только дни из v1: там уровень и значил «минималка сделана»
      d.minimalSteps = [true, true];
      rep.days.minimalBackfilled++;
    });

    lastV3 = rep;
    logV3(rep);
    return rep;
  }

  /** Сводка «было → стало» в консоль — требование ТЗ 0.3. */
  function logV3(rep) {
    function line(acc) {
      return Object.keys(acc).sort().map(function (k) { return k + ' ' + acc[k]; }).join(' · ') || '—';
    }
    console.log('[migrate v3] долги: ' + rep.debts.beforeTotal + ' (' + line(rep.debts.before) + ')' +
      ' → ' + rep.debts.afterTotal + ' (' + line(rep.debts.after) + ')');
    console.log('[migrate v3] на 1/2: ' + rep.debts.progress1.length +
      ' [' + rep.debts.progress1.join(', ') + ']' +
      ' · дубли категорий: ' + (rep.cats.duplicates.length || 'нет') +
      (rep.debts.missing.length ? ' · не найдены: ' + rep.debts.missing.join(', ') : ''));
    console.log('[migrate v3] дедлайны: content ' + rep.blocks.content + ' · user ' + rep.blocks.user +
      ' · spread ' + rep.blocks.spread + ' · без срока ' + rep.blocks.none);
    console.log('[migrate v3] слова: −' + rep.words.fromSummaries + ' из итогов · −' + rep.words.fromSrs +
      ' из SRS · банк ' + rep.words.wordsTotal[0] + ' → ' + rep.words.wordsTotal[1] +
      ' · дней с достроенной минималкой: ' + rep.days.minimalBackfilled);
  }

  /**
   * Проверка файла ДО замены состояния (импорт JSON).
   * → { ok:true } | { ok:false, error:'по-русски, что делать' }
   */
  function validateImport(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, error: 'Это не файл состояния. Выбери study-v2-*.json из «Скачать JSON».' };
    }
    if (!data.settings || typeof data.settings !== 'object') {
      return { ok: false, error: 'В файле нет настроек — похоже, это не состояние приложения.' };
    }
    if (!data.days || typeof data.days !== 'object' || Array.isArray(data.days)) {
      return { ok: false, error: 'В файле нет дней — похоже, это не состояние приложения.' };
    }
    var listy = ['debts', 'radar', 'todos', 'summaries'];
    for (var i = 0; i < listy.length; i++) {
      var k = listy[i];
      if (data[k] != null && !Array.isArray(data[k])) {
        return { ok: false, error: 'Поле «' + k + '» в файле испорчено. Возьми другую копию.' };
      }
    }
    if (data.lessons != null && (typeof data.lessons !== 'object' || Array.isArray(data.lessons))) {
      return { ok: false, error: 'Список уроков в файле испорчен. Возьми другую копию.' };
    }
    return { ok: true };
  }

  var quotaHit = false;

  function isQuotaError(e) {
    if (!e) return false;
    return e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 || e.code === 1014;
  }

  function writeNow() {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      quotaHit = false;
    } catch (e) {
      console.error('Не удалось сохранить состояние:', e);
      // память браузера кончилась: молча терять прогресс нельзя —
      // предупреждение висит, пока владелец не скачает копию
      if (isQuotaError(e) && !quotaHit) {
        quotaHit = true;
        if (window.UI && UI.banner) {
          UI.banner('quota', {
            kind: 'bad',
            text: 'Память браузера переполнена — скачай JSON в Настройках.',
            action: { label: 'В Настройки', onClick: function () { if (window.App) App.go('settings'); } }
          });
        }
      }
    }
  }

  /** Пометить изменение: обновить updatedAt, сохранить, уведомить подписчиков. */
  function touch(silent) {
    s.meta.updatedAt = new Date().toISOString();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveTimer = null; writeNow(); }, 150);
    if (!silent) emit();
    if (window.Sync && Sync.onLocalChange) Sync.onLocalChange();
  }

  function emit() { listeners.forEach(function (fn) { try { fn(s); } catch (e) { console.error(e); } }); }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  /** Полная замена состояния (импорт JSON, pull из облака). */
  function replace(next, silent) {
    s = migrate(next);
    writeNow();
    if (!silent) emit();
  }

  function reset() { s = blank(); writeNow(); emit(); }

  /* ---------- режим Лето / Школа ---------- */

  /** Автосмена режима 2026-09-08 (один раз; дальше решает ручной переключатель). */
  function applyAutoMode() {
    var t = today();
    if (!s.settings.autoSchoolDone && t >= AUTO_SCHOOL_DATE) {
      s.settings.mode = 'school';
      s.settings.autoSchoolDone = true;
      if (!s.step.cycleStart) s.step.cycleStart = AUTO_SCHOOL_DATE;
      touch(true);
      return true;
    }
    return false;
  }

  function mode() { return s.settings.mode; }
  function isSchool() { return s.settings.mode === 'school'; }

  function setMode(m) {
    if (m !== 'summer' && m !== 'school') return;
    s.settings.mode = m;
    if (m === 'school' && !s.step.cycleStart) s.step.cycleStart = today();
    if (today() >= AUTO_SCHOOL_DATE) s.settings.autoSchoolDone = true;
    touch();
  }

  /* ---------- дни, уровни, очки ---------- */

  function today() { return U.today(); }

  function day(iso, create) {
    var d = s.days[iso];
    if (!d && create) {
      d = s.days[iso] = { level: 'none', addons: [], lessons: [], points: 0 };
    }
    return d || null;
  }

  function points(iso) {
    var d = s.days[iso];
    return d ? DOCTRINE.dayPoints(d, s.settings) : 0;
  }

  function recount(iso) {
    var d = s.days[iso];
    if (d) d.points = DOCTRINE.dayPoints(d, s.settings);
  }

  /** Выбор уровня дня. Повторный тап по активному уровню снимает его в «Пусто». */
  function setLevel(levelId, iso) {
    var date = iso || today();
    var d = day(date, true);
    d.level = (d.level === levelId && levelId !== 'none') ? 'none' : levelId;
    recount(date);
    bumpBestStreak();
    touch();
  }

  function toggleAddon(addonId, iso) {
    var date = iso || today();
    var d = day(date, true);
    var i = d.addons.indexOf(addonId);
    if (i >= 0) d.addons.splice(i, 1); else d.addons.push(addonId);
    recount(date);
    bumpBestStreak();
    touch();
  }

  /**
   * Держит ли день серию (ТЗ 1.4). Держат только закрытый урок и выполненная
   * минималка. Добавки (Проект, Клуб, Тест, Доп. урок) очки дают, а серию нет:
   * иначе «Проект» в одиночку заменял учёбу. Исключение — воскресный радар,
   * он часть доктрины, и такой день не пустой.
   */
  function holdsStreak(iso) {
    var d = s.days[iso];
    if (!d) return false;
    if ((d.lessons || []).length) return true;
    var ms = d.minimalSteps || [];
    if (ms[0] && ms[1]) return true;
    // именно воскресный: чек-лист радара отмечается в любой день, и без этой
    // проверки лазейка «Проекта» просто переехала бы на радар
    return U.weekday(iso) === 7 && (d.addons || []).indexOf('radar') >= 0;
  }

  /** Очки для серии: доктрина смотрит только «больше нуля». */
  function streakPoints(iso) { return holdsStreak(iso) ? 1 : 0; }

  function streak() { return DOCTRINE.streak(streakPoints, today()); }
  function emptyInRow() { return DOCTRINE.emptyInRow(streakPoints, today()); }
  function weekPoints(iso) { return DOCTRINE.weekPoints(points, iso || today()); }
  function rank(iso) { return DOCTRINE.rankFor(weekPoints(iso), s.settings.ranks); }
  function nextRank(iso) { return DOCTRINE.nextRank(weekPoints(iso), s.settings.ranks); }

  function bumpBestStreak() {
    var cur = DOCTRINE.streak(streakPoints, today());
    if (cur > (s.stats.bestStreak || 0)) s.stats.bestStreak = cur;
  }

  /* ---------- дорожки ---------- */

  function track(id) {
    for (var i = 0; i < s.tracks.length; i++) if (s.tracks[i].id === id) return s.tracks[i];
    return null;
  }

  function trackName(id) {
    var t = track(id);
    return t ? t.name : (id === 'all' ? 'Все дорожки' : id);
  }

  /* ---------- фазы ---------- */

  function phases() { return PHASES; }

  function phaseName(id) {
    for (var i = 0; i < PHASES.length; i++) if (PHASES[i].id === id) return PHASES[i].name;
    return id;
  }

  /** Активная фаза по сегодняшней дате (или последняя начавшаяся). */
  function currentPhase() {
    var t = today(), pd = s.settings.phaseDates, last = PHASES[0].id;
    for (var i = 0; i < PHASES.length; i++) {
      var id = PHASES[i].id, d = pd[id];
      if (!d) continue;
      if (t >= d.start && t <= d.end) return id;
      if (t > d.end) last = id;
      if (t < d.start) return last;
    }
    return last;
  }

  /* ---------- блоки и уроки ---------- */

  /**
   * Сводит контент с состоянием: блоки из пакетов + карта поздних фаз → state.blocks,
   * уроки пакетов → state.lessons. Пользовательские данные (дедлайн, done, счёт)
   * никогда не затираются; названия и дорожки приходят из контента.
   * Вызывается при каждом старте — новый пакет контента подхватывается сам.
   */
  function syncContent() {
    var changed = false;

    /**
     * source — кто даёт срок: 'content' (пакет фазы) или 'spread' (раздача по
     * датам фазы для блоков Ф2–Ф4). Оба переписываются свободно; неприкосновенны
     * только 'user' и 'shift' (ТЗ 1.3).
     */
    function upsert(id, meta, source) {
      var src = source || 'content';
      var b = s.blocks[id];
      if (!b) {
        s.blocks[id] = {
          phase: meta.phase, track: meta.track, title: meta.title,
          deadline: meta.deadline || null, done: false
        };
        if (meta.deadline) s.blocks[id].deadlineSource = src;
        if (meta.note) s.blocks[id].note = meta.note;
        changed = true;
        return;
      }
      if (meta.title && b.title !== meta.title) { b.title = meta.title; changed = true; }
      if (meta.track && b.track !== meta.track) { b.track = meta.track; changed = true; }
      if (meta.phase && b.phase !== meta.phase) { b.phase = meta.phase; changed = true; }
      if (meta.note && b.note !== meta.note) { b.note = meta.note; changed = true; }
      // 2.7.0 (ТЗ 1.3): раньше контент дописывал срок только в пустое место, и
      // новый пакет до пользователя не доезжал. Теперь пакет переписывает свой
      // же срок; поставленное руками ('user') и сдвиг фазы ('shift') неприкосновенны.
      if (meta.deadline && b.deadlineSource !== 'user' && b.deadlineSource !== 'shift') {
        if (b.deadline !== meta.deadline) {
          b.deadline = meta.deadline;
          changed = true;
        }
        // метка обязана называть того, кто срок и правда даёт: иначе свежая
        // установка и мигрированное состояние разъедутся на ровном месте
        if (b.deadlineSource !== src) { b.deadlineSource = src; changed = true; }
      }
    }

    // 1) блоки из пакетов контента
    if (window.CONTENT) {
      CONTENT.allBlocks().forEach(function (b) {
        upsert(b.id, { phase: b.phase, track: b.track, title: b.title, deadline: b.deadline, note: b.note });
      });
    }

    // 2) карта поздних фаз с равномерными дедлайнами
    var byPhase = {};
    LATER_BLOCKS.forEach(function (b) { (byPhase[b.phase] = byPhase[b.phase] || []).push(b); });
    Object.keys(byPhase).forEach(function (ph) {
      var list = byPhase[ph];
      var dates = spreadDeadlines(ph, list.length);
      list.forEach(function (b, i) {
        upsert(b.id, { phase: b.phase, track: b.track, title: b.title, deadline: dates[i] }, 'spread');
      });
    });

    // 3) уроки пакетов
    if (window.CONTENT) {
      CONTENT.allBlocks().forEach(function (b) {
        b.lessons.forEach(function (l) {
          if (l.skipped) return;
          if (!s.lessons[l.id]) {
            s.lessons[l.id] = { done: false, score: null, date: null };
            changed = true;
          }
        });
      });
    }

    // пакет мог пометить урок пропущенным — блок от этого может стать
    // закрытым, поэтому флаг done пересчитываем на каждом старте
    Object.keys(s.blocks).forEach(function (id) {
      var b = s.blocks[id];
      var p = blockProgress(id);
      var done = p.total > 0 && p.remaining === 0;
      if (b.done !== done) { b.done = done; changed = true; }
    });

    if (changed) touch(true);
    return changed;
  }

  /** Равномерные дедлайны внутри фазы: последний совпадает с концом фазы. */
  function spreadDeadlines(phaseId, count) {
    var pd = s.settings.phaseDates[phaseId];
    var out = [];
    if (!pd || !count) return out;
    var len = U.diffDays(pd.start, pd.end);
    for (var i = 0; i < count; i++) {
      out.push(U.addDays(pd.start, Math.round((i + 1) * len / count)));
    }
    return out;
  }

  function block(id) { return s.blocks[id] || null; }

  /** Уроки блока из контента, по порядку — включая пропущенные. */
  function blockLessons(blockId) {
    return window.CONTENT ? CONTENT.lessons(blockId) : [];
  }

  /**
   * Урок помечен «пропущен» в пакете контента (релиз 2.6.0, сжатие Ф0).
   * Такой урок не считается в прогрессе и статистике, водопад его не
   * назначает, и блок закрывается, когда закрыты все НЕ пропущенные.
   * Флаг живёт в контенте, а не в состоянии: контент в БД не хранится,
   * и следующий пакет фазы может решить иначе, ничего не мигрируя.
   */
  function isSkipped(lessonId) {
    var l = window.CONTENT ? CONTENT.lesson(lessonId) : null;
    return !!(l && l.skipped);
  }

  /** Уроки блока, которые реально надо пройти. */
  function activeLessons(blockId) {
    return blockLessons(blockId).filter(function (l) { return !l.skipped; });
  }

  /** { total, done, remaining, skipped } по урокам блока; пропущенные не в счёт. */
  function blockProgress(blockId) {
    var all = blockLessons(blockId);
    var list = all.filter(function (l) { return !l.skipped; });
    var done = 0;
    list.forEach(function (l) { if (s.lessons[l.id] && s.lessons[l.id].done) done++; });
    return {
      total: list.length, done: done, remaining: list.length - done,
      skipped: all.length - list.length
    };
  }

  /** Светофор темпа блока. null — если уроков ещё нет (контент не выпущен). */
  function blockPace(blockId) {
    var b = s.blocks[blockId];
    if (!b) return null;
    var p = blockProgress(blockId);
    if (!p.total) return null;
    return PACE.status({ remaining: p.remaining, deadline: b.deadline, today: today(), mode: mode() });
  }

  /** Пересчитать флаг done блока (все уроки закрыты). */
  function refreshBlockDone(blockId) {
    var b = s.blocks[blockId];
    if (!b) return;
    var p = blockProgress(blockId);
    b.done = p.total > 0 && p.remaining === 0;
  }

  function setDeadline(blockId, isoDate) {
    var b = s.blocks[blockId];
    if (!b) return;
    b.deadline = isoDate || null;
    b.deadlineSource = 'user';        // руками — значит контент сюда не лезет
    touch();
  }

  /** Сдвинуть все дедлайны фазы на N дней (раздел 6.2). */
  function shiftPhase(phaseId, days) {
    if (!days) return 0;
    var n = 0;
    Object.keys(s.blocks).forEach(function (id) {
      var b = s.blocks[id];
      if (b.phase === phaseId && b.deadline) {
        b.deadline = U.addDays(b.deadline, days);
        b.deadlineSource = 'shift';   // сдвиг фазы — тоже решение владельца
        n++;
      }
    });
    if (n) touch();
    return n;
  }

  /** Блоки фазы по порядку номеров. */
  function phaseBlocks(phaseId) {
    return Object.keys(s.blocks)
      .filter(function (id) { return s.blocks[id].phase === phaseId; })
      .sort(function (a, b) { return blockNum(a) - blockNum(b); });
  }

  function blockNum(id) { return parseInt(String(id).replace(/\D/g, ''), 10) || 0; }

  /** Отображаемый номер блока: B12 → Б12. */
  function blockLabel(id) { return 'Б' + blockNum(id); }

  /** Отображаемый номер урока: B12.3 → урок 3. */
  function lessonNum(lessonId) {
    var p = String(lessonId).split('.');
    return parseInt(p[1], 10) || 0;
  }

  /* ---------- уроки: очередь, свежесть, отметки дня ---------- */

  function lessonTrack(lessonId) {
    var l = window.CONTENT ? CONTENT.lesson(lessonId) : null;
    if (!l) return null;
    var b = s.blocks[l.blockId];
    return b ? b.track : null;
  }

  /** Следующий непройденный урок дорожки (доктрина 5). Блоки — по порядку номеров. */
  function nextLessonInTrack(trackId, phaseId) {
    var ids = Object.keys(s.blocks).sort(function (a, b) { return blockNum(a) - blockNum(b); });
    for (var i = 0; i < ids.length; i++) {
      var b = s.blocks[ids[i]];
      if (trackId && b.track !== trackId && b.track !== 'all') continue;
      if (phaseId && b.phase !== phaseId) continue;
      var list = activeLessons(ids[i]);
      for (var j = 0; j < list.length; j++) {
        var st = s.lessons[list[j].id];
        if (!st || !st.done) return list[j].id;
      }
    }
    return null;
  }

  /** Следующий непройденный урок вообще (по порядку блоков). */
  function nextLesson() { return nextLessonInTrack(null, null); }

  /**
   * Свежесть дорожки в днях.
   * Дорожка без единого урока считается от даты онбординга: «максимальной»
   * её делать нельзя — иначе правило 2 водопада в первый же день перехватило бы
   * выбор у радара и светофора. null — только если и точки отсчёта нет.
   */
  function freshness(trackId, todayIso) {
    var t = track(trackId);
    if (!t) return null;
    var from = t.lastLessonDate || s.meta.onboardedAt;
    if (!from) return null;
    return Math.max(0, U.diffDays(from, todayIso || today()));
  }

  /** Был ли на дорожке хоть один урок — свежесть без истории подписывается иначе. */
  function hasTrackHistory(trackId) {
    var t = track(trackId);
    return !!(t && t.lastLessonDate);
  }

  /** Отметить дорожку пройденной сегодня. track:'all' обновляет все четыре (раздел 7.4). */
  function touchTrack(trackId, dateIso) {
    var date = dateIso || today();
    var ids = trackId === 'all' ? ['math', 'write', 'cs', 'biz'] : [trackId];
    ids.forEach(function (id) {
      var t = track(id);
      if (t && (!t.lastLessonDate || t.lastLessonDate < date)) t.lastLessonDate = date;
    });
  }

  function markVideoWatched(lessonId, dateIso) {
    var d = day(dateIso || today(), true);
    d.videos = d.videos || [];
    if (d.videos.indexOf(lessonId) < 0) d.videos.push(lessonId);
    touch();
  }

  function videoWatched(lessonId, dateIso) {
    var d = s.days[dateIso || today()];
    return !!(d && d.videos && d.videos.indexOf(lessonId) >= 0);
  }

  /** Промпт скопирован — урок считается начатым (раздел 7.8, незавершённый урок). */
  function markPromptCopied(lessonId, dateIso) {
    var d = day(dateIso || today(), true);
    d.copied = d.copied || [];
    if (d.copied.indexOf(lessonId) < 0) d.copied.push(lessonId);
    touch();
  }

  function promptCopied(lessonId, dateIso) {
    var d = s.days[dateIso || today()];
    return !!(d && d.copied && d.copied.indexOf(lessonId) >= 0);
  }

  /* ---------- итоги, слова, долги ---------- */

  /**
   * Последние n итогов дорожки, свежие первыми.
   * Уроки блоков track:'all' (финалы вперемешку) касаются всех дорожек —
   * их итоги видит любая дорожка. Сама дорожка 'all' память не фильтрует.
   */
  function recentSummaries(trackId, n, excludeLessonId) {
    var out = [];
    var filter = trackId && trackId !== 'all';
    for (var i = s.summaries.length - 1; i >= 0 && out.length < (n || 3); i--) {
      var sum = s.summaries[i];
      if (excludeLessonId && sum.lessonId === excludeLessonId) continue;
      if (filter) {
        var lt = lessonTrack(sum.lessonId);
        if (lt !== trackId && lt !== 'all') continue;
      }
      out.push(sum);
    }
    return out;
  }

  /* ---------- карточки: SRS-lite (релиз 2.6.0) ---------- */

  /**
   * Слово живёт тремя статусами: new → learning → known.
   * Три верных подряд делают слово выученным, ошибка на выученном
   * возвращает его в learning. Выученное всплывает через 4, затем 10,
   * затем 21 день — и после третьего повтора засыпает совсем.
   * Это и есть «пенсия» для слов: колода перестаёт расти бесконечно.
   */
  var SRS_INTERVALS = [4, 10, 21];
  var SRS_TO_KNOWN = 3;          // верных подряд до статуса «выучено»

  function wordKey(en) { return String(en || '').toLowerCase().trim(); }

  /** Запись SRS слова; создаётся лениво, чтобы не плодить мусор. */
  function srsRec(en, create) {
    var k = wordKey(en);
    if (!k) return null;
    if (!s.srs[k] && create) s.srs[k] = { status: 'new', streak: 0, step: 0, due: null };
    return s.srs[k] || null;
  }

  function wordStatus(en) {
    var r = srsRec(en);
    return (r && r.status) || 'new';
  }

  /** Выученное слово, у которого срок повтора ещё не подошёл (или спит). */
  function wordResting(en, todayIso) {
    var r = srsRec(en);
    if (!r || r.status !== 'known') return false;
    if (!r.due) return true;                       // отработало все интервалы — спит
    return r.due > (todayIso || today());
  }

  /**
   * Оценка карточки: ok = «знал», иначе «не знал».
   * → запись SRS слова после оценки.
   */
  function gradeWord(en, ok, todayIso) {
    var r = srsRec(en, true);
    if (!r) return null;
    var t = todayIso || today();

    if (!ok) {
      // ошибка на выученном возвращает слово в работу с чистого листа
      r.status = 'learning';
      r.streak = 0;
      r.step = 0;
      r.due = null;
      touch();
      return r;
    }

    r.streak = (r.streak || 0) + 1;

    if (r.status === 'known') {
      // очередной успешный повтор двигает слово по интервалам к пенсии
      r.step = (r.step || 0) + 1;
      r.due = r.step < SRS_INTERVALS.length ? U.addDays(t, SRS_INTERVALS[r.step]) : null;
    } else if (r.streak >= SRS_TO_KNOWN) {
      r.status = 'known';
      r.step = 0;
      r.due = U.addDays(t, SRS_INTERVALS[0]);
    } else {
      r.status = 'learning';
    }

    touch();
    return r;
  }

  /** Слова, которые сегодня нужно повторять: новые, в работе и подошедшие. */
  function activeWords(todayIso) {
    var t = todayIso || today();
    return wordBank().filter(function (w) { return !wordResting(w.en, t); });
  }

  /** Счётчик колоды: «активных X · выучено Y». */
  function wordCounts(todayIso) {
    var bank = wordBank();
    var t = todayIso || today();
    var known = 0;
    bank.forEach(function (w) { if (wordStatus(w.en) === 'known') known++; });
    return {
      active: bank.filter(function (w) { return !wordResting(w.en, t); }).length,
      known: known,
      total: bank.length
    };
  }

  /** Слова конкретного урока из его итога, со статусами. */
  function lessonWords(lessonId) {
    var out = [], seen = {};
    s.summaries.forEach(function (sum) {
      if (sum.lessonId !== lessonId) return;
      ((sum.parsed && sum.parsed.words) || []).forEach(function (w) {
        var k = wordKey(w.en);
        if (!k || seen[k]) return;
        seen[k] = true;
        var r = srsRec(w.en);
        out.push({
          en: w.en, ru: w.ru,
          status: (r && r.status) || 'new',
          streak: (r && r.streak) || 0,
          due: (r && r.due) || null
        });
      });
    });
    return out;
  }

  /** Все слова из итогов, старые первыми, без повторов. */
  function wordBank() {
    var seen = {}, out = [];
    s.summaries.slice().sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); })
      .forEach(function (sum) {
        ((sum.parsed && sum.parsed.words) || []).forEach(function (w) {
          var key = String(w.en || '').toLowerCase().trim();
          if (!key || seen[key]) return;
          seen[key] = true;
          out.push({ en: w.en, ru: w.ru, date: sum.date, lessonId: sum.lessonId, track: lessonTrack(sum.lessonId) });
        });
      });
    return out;
  }

  /** 15 слов с самой давней датой появления (раздел 8.5). */
  function oldestWords(n) { return wordBank().slice(0, n || 15); }

  /**
   * Слова разминки (раздел 8.5) — по расписанию повторов, а не по возрасту.
   *
   * До 2.6.5 разминка звала oldestWords(15), а он SRS не смотрит вовсе: в промпт
   * каждый день уезжали одни и те же пятнадцать самых старых слов, все давно
   * выученные и со сроком повтора в будущем. Список был константным навсегда —
   * банк отсортирован по дате урока и не сокращается.
   *
   * Порядок групп:
   *  1) подошедшие повторы (known, срок наступил) — самый давний срок первым;
   *  2) слова в работе; те, где последний ответ был «не знал», — первыми
   *     (ошибка обнуляет streak, поэтому streak 0 у learning и означает
   *     «последним ответом было не знал»);
   *  3) остальные активные — новые, по старшинству банка.
   * Выученное с ненаступившим сроком не берётся: activeWords его уже отсеял.
   */
  function warmupWords(n, todayIso) {
    var t = todayIso || today();
    var due = [], learning = [], fresh = [];
    activeWords(t).forEach(function (w, i) {
      var r = srsRec(w.en);
      var item = { en: w.en, ru: w.ru, i: i, due: (r && r.due) || '', streak: (r && r.streak) || 0 };
      if (r && r.status === 'known') due.push(item);
      else if (r && r.status === 'learning') learning.push(item);
      else fresh.push(item);
    });
    due.sort(function (a, b) { return a.due === b.due ? a.i - b.i : (a.due < b.due ? -1 : 1); });
    learning.sort(function (a, b) { return a.streak === b.streak ? a.i - b.i : a.streak - b.streak; });
    return due.concat(learning, fresh).slice(0, n || 15)
      .map(function (w) { return { en: w.en, ru: w.ru }; });
  }

  /** Слова двух последних уроков дорожки + 5 случайных старых, вперемешку (раздел 8.1). */
  function recentWords(trackId, excludeLessonId) {
    var sums = recentSummaries(trackId, 2, excludeLessonId);
    var recent = [], keys = {};
    sums.forEach(function (sum) {
      ((sum.parsed && sum.parsed.words) || []).forEach(function (w) {
        var k = wordKey(w.en);
        // выученное слово в промпт не идёт: разминать его заново — трата урока
        if (!k || keys[k] || wordStatus(w.en) === 'known') return;
        keys[k] = true;
        recent.push({ en: w.en, ru: w.ru });
      });
    });
    var old = wordBank().filter(function (w) {
      return !keys[wordKey(w.en)] && wordStatus(w.en) !== 'known';
    });
    var picked = U.shuffle(old).slice(0, 5).map(function (w) { return { en: w.en, ru: w.ru }; });
    return U.shuffle(recent.concat(picked));
  }

  /**
   * Открытые долги. С дорожкой — строго её собственные: добора чужими нет,
   * пусто значит пусто (иначе в промпт математики уезжали долги письма).
   * Дорожка 'all' и вызов без дорожки берут все.
   */
  function openDebts(trackId) {
    var list = s.debts.filter(function (d) { return d.status === 'open'; });
    if (!trackId || trackId === 'all') return list;
    return list.filter(function (d) { return d.track === trackId; });
  }

  function debtsCount(trackId) { return openDebts(trackId).length; }

  /* ---------- какие долги ушли в промпт (2.6.5) ---------- */

  var PROMPT_DEBTS = 5;         // столько долгов дорожки уходит в промпт урока
  var WARMUP_DEBTS = 3;         // столько — в промпт разминки, дорожки любые

  /**
   * Отбор долгов для промптов — один на всех.
   * Раньше срез 5 и срез 3 жили прямо в prompts.js; теперь их зовёт и то место,
   * где мы запоминаем показанное. Иначе списки разъедутся и защита «Погашено»
   * начнёт отвергать долги, которые ИИ честно видел.
   */
  function promptDebts(trackId) { return openDebts(trackId).slice(0, PROMPT_DEBTS); }
  function warmupDebts() { return openDebts().slice(0, WARMUP_DEBTS); }

  function debtKey(d) { return (d && (d.did || d.id)) || null; }

  /**
   * Запоминает, какие долги ушли в промпт. lessonId = null → разминка.
   * Перезаписывается каждым копированием: в работе список из последнего промпта.
   */
  function markInjectedDebts(lessonId, debts) {
    var ids = (debts || []).map(debtKey).filter(Boolean);
    if (lessonId) s.injected.lessons[lessonId] = ids;
    else s.injected.min = ids;
    touch();
    return ids;
  }

  /** Что было показано по уроку: его список плюс список разминки. */
  function injectedDebts(lessonId) {
    var own = (lessonId && s.injected.lessons[lessonId]) || null;
    if (!own) return null;                       // промпт копировали до 2.6.5
    var out = own.slice();
    (s.injected.min || []).forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); });
    return out;
  }

  /**
   * Открытые долги, которые урок имел право гасить, или null — если промпт
   * этого урока копировался старой версией и списка нет. null означает
   * «проверять нечем», и матчинг работает по-старому: молча отвергать всё
   * подряд после обновления было бы хуже самой дыры.
   */
  function injectedPool(lessonId) {
    var ids = injectedDebts(lessonId);
    if (!ids) return null;
    return s.debts.filter(function (d) {
      return d.status === 'open' && ids.indexOf(debtKey(d)) >= 0;
    });
  }

  function normText(t) {
    return String(t || '').toLowerCase().replace(/[«»"'`.,;:!?()—–-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var PARTIAL_MIN_LEN = 4;      // короче — совпадение случайное
  var SIM_MIN = 0.85;           // порог похожести для текстового фолбэка
  var DEBT_ID_RE = /\bD-(\d+)\b/i;

  /** Биграммы строки — сырьё для коэффициента Дайса. */
  function bigrams(str) {
    var out = [];
    for (var i = 0; i < str.length - 1; i++) out.push(str.slice(i, i + 2));
    return out;
  }

  /**
   * Похожесть двух нормализованных строк, 0..1 (коэффициент Дайса по
   * биграммам символов). Устойчив к опечаткам и окончаниям, при этом
   * «знак наклона» и «путает знак наклона при отрицательном k» получают
   * низкий балл — короткий огрызок чужой долг не закрывает.
   */
  function similarity(a, b) {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    var A = bigrams(a), B = bigrams(b), map = {}, hit = 0;
    A.forEach(function (g) { map[g] = (map[g] || 0) + 1; });
    B.forEach(function (g) { if (map[g] > 0) { map[g]--; hit++; } });
    return 2 * hit / (A.length + B.length);
  }

  /** Следующий короткий id долга: D-1, D-2… Номера не переиспользуются. */
  function nextDebtId() {
    var max = 0;
    s.debts.forEach(function (d) {
      var m = /^D-(\d+)$/.exec(String(d.did || ''));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'D-' + (max + 1);
  }

  /**
   * Ищет открытый долг, соответствующий строке «Погашено» (раздел 8.4).
   * Два яруса, в этом порядке:
   *  1) короткий id «D-7» из строки — самый надёжный якорь, текст рядом
   *     с ним уже не важен: ИИ перефразирует формулировки, id — нет;
   *  2) нормализованный текст — формулировка долга целиком внутри строки
   *     (дословная копия) либо похожесть ≥0.85.
   * Старые ярусы «вхождение при ratio ≥0.5» и «пословно ≥0.6» убраны:
   * реальные перефразы они всё равно не ловили, а чужой долг закрыть могли.
   */
  function matchDebt(text, trackId) {
    return matchDebtIn(text, trackId, s.debts.filter(function (d) { return d.status === 'open'; }));
  }

  /**
   * Тот же матчинг, но по заданному набору долгов.
   * С 2.6.5 «Погашено» урока судится по набору из его промпта: оба яруса,
   * и id, и текст ≥0.85, ищут только среди показанного. Без этого ИИ,
   * продолживший нумерацию сам, гасил долг, которого в промпте не было.
   */
  function matchDebtIn(text, trackId, open) {
    var raw = String(text || '');
    open = open || [];

    var m = DEBT_ID_RE.exec(raw);
    if (m) {
      var wantId = 'D-' + m[1];
      var byId = null;
      open.forEach(function (d) { if (d.did === wantId) byId = d; });
      if (byId) return byId;
      // id не нашёлся (опечатка или уже закрытый долг) — пробуем текст
    }

    var want = normText(raw.replace(DEBT_ID_RE, ' '));
    if (want.length < PARTIAL_MIN_LEN) return null;

    var best = null, bestScore = 0;
    open.forEach(function (d) {
      var have = normText(d.text);
      if (have.length < PARTIAL_MIN_LEN) return;
      var score = 0;
      if (have === want) score = 1;
      // формулировка долга целиком внутри строки — ИИ скопировал её дословно
      // и дописал «— отработано»; обратное направление безопасным не бывает,
      // его судит только похожесть
      else if (want.indexOf(have) >= 0) score = have.length / want.length;
      else {
        var sim = similarity(have, want);
        if (sim >= SIM_MIN) score = sim;
      }
      if (!score) return;
      var beatsOnTrack = score === bestScore && best && best.track !== trackId && d.track === trackId;
      if (score > bestScore || beatsOnTrack) { bestScore = score; best = d; }
    });
    return best;
  }

  /** Прогресс погашения долга: сколько разных уроков из нужных двух. */
  function debtProgress(d) {
    return Math.min(2, uniqueLessons((d && d.clearedIn) || []).length);
  }

  function uniqueLessons(list) {
    var seen = {}, out = [];
    (list || []).forEach(function (x) { if (!seen[x]) { seen[x] = true; out.push(x); } });
    return out;
  }

  /**
   * Применяет разобранный «ИТОГ УРОКА» (раздел 8.4): закрывает урок,
   * разносит слова, создаёт и гасит долги, обновляет свежесть дорожки.
   * Долг закрывается только когда отметки пришли из двух разных уроков.
   *
   * Идемпотентна: тот же урок за ту же дату заменяет свою запись,
   * а не плодит вторую. Повторная вставка одного итога ничего не удваивает
   * и не выглядит для механики ступеней как два разных урока.
   */
  function applySummary(lessonId, parsed, opts) {
    opts = opts || {};
    var date = opts.date || today();
    var l = window.CONTENT ? CONTENT.lesson(lessonId) : null;
    if (!l) return { ok: false, error: 'Урок не найден' };
    var trackId = lessonTrack(lessonId);

    var L = s.lessons[lessonId] || (s.lessons[lessonId] = { done: false, score: null, date: null });
    var wasDone = L.done;
    L.done = true;
    L.score = parsed.score;
    L.date = date;

    var d = day(date, true);
    if (d.lessons.indexOf(lessonId) < 0) d.lessons.push(lessonId);
    recount(date);

    var record = {
      lessonId: lessonId, date: date, raw: parsed.raw || '',
      parsed: {
        score: parsed.score, level: parsed.level, topics: parsed.topics,
        words: parsed.words || [], debts: parsed.debts || [],
        warmup: parsed.warmup || [], writing: parsed.writing || ''
      }
    };
    var at = -1;
    for (var i = s.summaries.length - 1; i >= 0; i--) {
      if (s.summaries[i].lessonId === lessonId && s.summaries[i].date === date) { at = i; break; }
    }
    var replaced = at >= 0;
    if (replaced) s.summaries[at] = record;
    else s.summaries.push(record);

    if (!wasDone) s.stats.lessonsDone = (s.stats.lessonsDone || 0) + 1;

    // долг заводим только новый: тот же текст из того же урока — уже в банке
    var created = [];
    (parsed.debts || []).forEach(function (text) {
      var key = normText(text);
      var dup = s.debts.some(function (x) {
        return x.createdIn === lessonId && normText(x.text) === key;
      });
      if (dup) return;
      var debt = {
        id: U.uid(), did: nextDebtId(), track: trackId, text: text,
        createdIn: lessonId, clearedIn: [], status: 'open'
      };
      s.debts.push(debt);
      created.push(debt);
    });

    var cleared = [], closed = [], unmatched = [], foreign = [];
    // урок гасит только то, что сам показывал; pool === null — промпт копировали
    // до 2.6.5, судить не по чему, работаем по всему банку как раньше
    var pool = injectedPool(lessonId);
    (parsed.cleared || []).forEach(function (text) {
      var debt = pool ? matchDebtIn(text, trackId, pool) : matchDebt(text, trackId);
      if (!debt) {
        // долг существует, но в промпте этого урока его не было — это чужой id,
        // а не мусор: показываем отдельно, иначе «не сопоставлено» врёт
        var outside = pool ? matchDebt(text, trackId) : null;
        if (outside) foreign.push(outside.did || outside.id);
        // молча глотать нечитаемое «Погашено» нельзя: студент должен увидеть,
        // что строка не легла ни на один долг, и поправить id
        else unmatched.push(text);
        return;
      }
      if (debt.clearedIn.indexOf(lessonId) < 0) debt.clearedIn.push(lessonId);
      // две строки итога могли смэтчиться в один долг — считаем его один раз
      if (cleared.indexOf(debt) < 0) cleared.push(debt);
      if (uniqueLessons(debt.clearedIn).length >= 2 && debt.status === 'open') {
        debt.status = 'closed';
        debt.closedDate = date;
        closed.push(debt);
      }
    });

    // A-21: счётчик слов — это размер банка уникальных en, а не сумма приходов;
    // пересчёт здесь держит его честным при повторной вставке и правках
    s.stats.wordsTotal = wordBank().length;

    touchTrack(trackId, date);
    refreshBlockDone(l.blockId);
    bumpBestStreak();
    touch();

    return {
      ok: true, lessonId: lessonId, score: parsed.score, replaced: replaced,
      words: (parsed.words || []).length,
      created: created.length, cleared: cleared.length, closed: closed.length,
      unmatched: unmatched, foreign: foreign
    };
  }

  /* ---------- если-то правило дня (раздел 7.6) ---------- */

  function ifThenOfDay(iso) {
    var list = (s.settings.ifThen || []).filter(function (r) { return r.text && r.text.trim(); });
    if (!list.length) return null;
    return list[(U.weekday(iso || today()) - 1) % list.length];
  }

  return {
    KEY: KEY, SCHEMA: SCHEMA, APP_VERSION: APP_VERSION, AUTO_SCHOOL_DATE: AUTO_SCHOOL_DATE,
    PHASE_DATES: PHASE_DATES, PHASES: PHASES,
    get s() { return s; },
    P0_DEADLINES: P0_DEADLINES,
    isSkipped: isSkipped, activeLessons: activeLessons,
    blank: blank, load: load, touch: touch, save: writeNow, replace: replace, reset: reset,
    migrate: migrate, repairDebts: repairDebts, validateImport: validateImport,
    DEBT_CATS: DEBT_CATS, debtCat: debtCat, catsForTrack: catsForTrack,
    catTrack: catTrack, catFitsTrack: catFitsTrack,
    migrationReport: function () { return lastV3; },
    holdsStreak: holdsStreak, streakPoints: streakPoints,
    subscribe: subscribe, emit: emit,
    applyAutoMode: applyAutoMode, mode: mode, isSchool: isSchool, setMode: setMode,
    today: today, day: day, points: points, recount: recount,
    setLevel: setLevel, toggleAddon: toggleAddon,
    streak: streak, emptyInRow: emptyInRow, weekPoints: weekPoints, rank: rank, nextRank: nextRank,
    track: track, trackName: trackName,
    phases: phases, phaseName: phaseName, currentPhase: currentPhase,
    syncContent: syncContent, spreadDeadlines: spreadDeadlines,
    block: block, blockLessons: blockLessons, blockProgress: blockProgress,
    blockPace: blockPace, refreshBlockDone: refreshBlockDone,
    setDeadline: setDeadline, shiftPhase: shiftPhase, phaseBlocks: phaseBlocks,
    blockNum: blockNum, blockLabel: blockLabel, lessonNum: lessonNum,
    lessonTrack: lessonTrack, nextLessonInTrack: nextLessonInTrack, nextLesson: nextLesson,
    freshness: freshness, hasTrackHistory: hasTrackHistory, touchTrack: touchTrack,
    markVideoWatched: markVideoWatched, videoWatched: videoWatched,
    markPromptCopied: markPromptCopied, promptCopied: promptCopied,
    recentSummaries: recentSummaries, wordBank: wordBank, oldestWords: oldestWords,
    warmupWords: warmupWords,
    recentWords: recentWords, openDebts: openDebts, debtsCount: debtsCount,
    SRS_INTERVALS: SRS_INTERVALS, SRS_TO_KNOWN: SRS_TO_KNOWN,
    wordStatus: wordStatus, wordResting: wordResting, gradeWord: gradeWord,
    activeWords: activeWords, wordCounts: wordCounts, lessonWords: lessonWords,
    matchDebt: matchDebt, matchDebtIn: matchDebtIn,
    debtProgress: debtProgress, similarity: similarity,
    promptDebts: promptDebts, warmupDebts: warmupDebts,
    markInjectedDebts: markInjectedDebts, injectedDebts: injectedDebts,
    injectedPool: injectedPool,
    nextDebtId: nextDebtId, applySummary: applySummary,
    ifThenOfDay: ifThenOfDay
  };
})();
