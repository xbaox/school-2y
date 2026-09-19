/* ============================================================
   state.js — модель данных (раздел 5 ТЗ), хранение и доктринальные счётчики.
   localStorage — рабочий кэш и полный источник при отсутствии сети.
   Supabase подключается в sync.js (этап 6) поверх этих же данных.
   ============================================================ */

window.State = (function () {
  'use strict';

  var KEY = 'study-system-v2';
  var SCHEMA = 3;
  var APP_VERSION = '2.8.0';

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
    { code: 'О1', track: 'math', name: 'Вход — после видео задан свой вопрос по материалу' },
    // дорожка biz — «Бизнес»: курсы GLC2O и BMI3C, речь в классе и питч
    { code: 'Б1', track: 'biz', name: 'Регистр — формальная речь в классе и в письме: без сленга, полные формы' },
    { code: 'Б2', track: 'biz', name: 'Структура ответа — термин → определение → пример из своего бизнеса' },
    { code: 'Б3', track: 'biz', name: 'Термины точно — markup ≠ margin, revenue ≠ profit, fixed ≠ variable cost' },
    { code: 'Б4', track: 'biz', name: 'Число в аргументе — бизнес-утверждение подкреплено проверяемой цифрой' },
    { code: 'Б5', track: 'biz', name: 'Питч — структура hook → problem → solution → ask, время выдержано' }
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

  /**
   * Точечные правки переводов в банке слов (2.7.2). Карточка живёт в итоге
   * урока, поэтому чинится ремонтом данных, а не файлом контента.
   * Условие — точное совпадение старого перевода: чинится ровно та карточка,
   * которую правил Архитектор, и повторный прогон уже ничего не меняет.
   */
  var WORD_FIXES = [
    { en: 'to explain', from: 'показать механизм, а не назвать', to: 'показать, как или почему, по шагам' }
  ];

  /* ---------- 2.7.6: разовая правка данных (ТЗ 2.7.6 §3) ----------
     Схема остаётся 3. Маркер выполнения — meta.migrations; каждый шаг M1–M6
     сам по себе проверяет, нужен ли он (по id и содержимому), маркер — вторая
     защита. Правка детерминирована и повторяется на каждом устройстве, поэтому
     meta.updatedAt она не двигает (урок 2.7.5). */

  var MIG_276 = '2.7.6';

  /** Состояние, жившее до выпуска: события радара M2 — личный план владельца. */
  var MIG_276_BEFORE = '2026-09-14';

  var M1_CODE_FROM = 'ICS3U', M1_CODE_TO = 'ICS3UE';
  var M1_NAME = 'Computer Science online — информатика 11 класса, e-learning (Brightspace)';

  /**
   * M2. Схема — как у кнопки «+ событие»: {id, done, course, type, date, note}.
   * Поля заголовка у события нет — текст таблицы ТЗ живёт в note, его экран и
   * показывает. Типы — из Radar.TYPES: квиз и тесты (unit test, конкурс CSMC) —
   * оценочные quiz и test; типа «дело/встреча» в 2.7.6 не было —
   * остальные события получили assignment («сдача»: дело к сроку). Курс — как
   * в ТЗ; у событий без курса — пустая строка. 2.7.7 ввёл тип todo, и пять
   * из них переводит в него миграция 2.7.7 (MIG_277_TODO), а не эта таблица:
   * выпущенная миграция не переписывается.
   */
  var M2_EVENTS = [
    { id: 'ev-2026-09-14-guidance', course: '', type: 'assignment', date: '2026-09-14',
      note: 'Записаться к консультанту (Guidance, третий период) — три вопроса в карточке' },
    { id: 'ev-2026-09-14-csmc-registration', course: 'MHF4U', type: 'assignment', date: '2026-09-14',
      note: 'Учитель MHF4U после урока: регистрация на CSMC 18.11 (срок до 30.09)' },
    { id: 'ev-2026-09-15-quiz-mhf4u', course: 'MHF4U', type: 'quiz', date: '2026-09-15',
      note: 'Квиз MHF4U — разделы 1.1–1.3 (таблица 7×9 + модуль)' },
    { id: 'ev-2026-09-15-volunteer-letter', course: '', type: 'assignment', date: '2026-09-15',
      note: 'Письмо координатору волонтёрства (турнир), если не позвала — со школьной почты' },
    { id: 'ev-2026-09-16-ics3ue-zoom', course: 'ICS3UE', type: 'assignment', date: '2026-09-16',
      note: 'ICS3UE: ориентация в Zoom вечером (время — в объявлениях курса)' },
    { id: 'ev-2026-09-17-ics3ue-start', course: 'ICS3UE', type: 'assignment', date: '2026-09-17',
      note: 'ICS3UE: старт занятий, 75–90 мин в третьем периоде' },
    { id: 'ev-2026-09-22-unit-test-mhf4u', course: 'MHF4U', type: 'test', date: '2026-09-22',
      note: 'Unit test MHF4U, Unit 1: functions & notation · properties of graphs · absolute value · piecewise' },
    { id: 'ev-2026-09-25-eng2d-poetry', course: 'ENG2D', type: 'assignment', date: '2026-09-25',
      note: 'ENG2D ≈ до 25.09 (дата по outline, «tentative»): сборник стихов + in-class анализ стихотворения' },
    { id: 'ev-2026-11-18-csmc', course: 'MHF4U', type: 'test', date: '2026-11-18',
      note: 'CSMC — Canadian Senior Mathematics Contest (тренировочный год)' }
  ];

  /* ---------- 2.7.7: разовая правка данных (ТЗ 2.7.7, Э5) ----------
     Маркер — тот же meta.migrations; шаг идёт после 2.7.6 в том же вызове
     migrate, поэтому состояние 2.7.5 проходит обе правки за одну загрузку.
     meta.updatedAt не двигает (урок 2.7.5). */

  var MIG_277 = '2.7.7';

  /**
   * События M2, которые не оценка, а дело к сроку: запись к консультанту,
   * регистрация на конкурс, письмо, ориентация и старт онлайн-курса. Тип
   * todo, курс не трогается. Условие — тип assignment, который дала M2:
   * событие, которому владелец сменил тип руками, не трогается.
   */
  var MIG_277_TODO = [
    'ev-2026-09-14-guidance', 'ev-2026-09-14-csmc-registration', 'ev-2026-09-15-volunteer-letter',
    'ev-2026-09-16-ics3ue-zoom', 'ev-2026-09-17-ics3ue-start'
  ];

  /* ---------- 2.7.8: страна прошлой школы в посевах (ТЗ 2.7.8, B9) ----------
     Посев дел, третий вопрос карточки и «зачем» дела M4 называли страну, где
     училась прошлая школа, а репозиторий публичный: это квазиидентификатор.
     Тексты переписаны («прошлая школа за границей»). Прежних текстов в дереве
     нет — и ничего, вычисленного из них: хэш прежнего текста, который отличается
     от публичного нового одним словом, выдаёт это слово перебором (ревью
     2.7.8). Прежний текст узнаётся по новому с масками: все неизменные куски
     нового текста стоят по порядку, а на месте каждой замены — другая короткая
     вставка. Правленный руками вне этих мест текст не совпадёт и не трогается.
     Маркер — meta.migrations; meta.updatedAt не двигается (урок 2.7.5). */

  var MIG_278 = '2.7.8';

  /**
   * Места замен — фразы новой редакции, в порядке текста: «зачем» дела
   * guidance в посеве (Radar.SEED_TODOS, match 'guidance'), «зачем» дела
   * guidance в M4 (M4_TODOS[0]) и третий вопрос посева карточки
   * (Radar.QUESTIONS_SEED, пункт про CHC2D) — английская и русская строки.
   */
  var QUASI_278 = {
    seedWhy: ['(оригинал + перевод)', 'previous school abroad', 'за прошлую школу за границей', 'зачётом за прошлую школу'],
    m4Why: ['годы за границей'],
    qEn: ['school years abroad'],
    qRu: ['годы за границей']
  };
  var QUASI_GAP = 40;       // вставка на месте замены — несколько слов, не абзац

  /** M3. Карточка вопросов: тип не меняется, пунктов ровно три. */
  var M3_ID = 'q-2026-09-08';
  var M3_TITLE = 'Консультант, пн 14.09 — три вопроса';
  var M3_DATE = '2026-09-14';
  var M3_EN0 = 'Could I get a printed Credit Counselling Summary';
  /** Заголовок, который ставил добор 2.7.5 (radar.js topUpQuestions). */
  var M3_OLD_TITLE = 'Утро 8.09 — восемь вопросов';
  var M3_ITEMS = [
    {
      who: 'консультанту (guidance)',
      en: 'Could I get a printed Credit Counselling Summary? I want to see which credits from my previous school were granted, which compulsory credits I still need (including CHC2D and the two online learning credits — does ICS3UE count as one of them?), and what grade I am officially in.',
      ru: 'Можно ли получить распечатку Credit Counselling Summary? Хочу увидеть, какие кредиты из прошлой школы зачтены, какие обязательные ещё нужны (включая CHC2D — историю Канады — и два онлайн-кредита: идёт ли ICS3UE как один из них), и в каком классе я официально.',
      done: false, note: ''
    },
    {
      who: 'консультанту (guidance)',
      en: 'Community involvement hours: how many hours do I need as a student who joined this school this year, and which form do I use to record them?',
      ru: 'Часы общественной работы: сколько часов нужно мне как пришедшему в этом году и по какой форме их записывать.',
      done: false, note: ''
    },
    {
      who: 'консультанту (guidance)',
      en: 'OSSLT: am I on the list to write it this November, and what is the date?',
      ru: 'OSSLT: я в списке на ноябрь, и какая дата?',
      done: false, note: ''
    }
  ];

  /** M4. Два дела плана — по id; done не трогается. */
  var M4_TODOS = [
    {
      id: 'mt4vmss1jqr1hf',
      set: {
        title: 'Guidance: записаться (пн 14.09, третий период) — три вопроса в Радаре',
        due: '2026-09-14',
        why: 'Ответы — одной строкой в карточку Радара q-2026-09-08 и в окно «Английский + карьера». Credit Counselling Summary закрывает кредиты, годы за границей, официальный класс, онлайн-кредиты; часы общественной работы — норма и форма; OSSLT — в списке ли на ноябрь, дата.'
      }
    },
    {
      id: 'mt4vmss12dy03k',
      set: {
        due: '2026-10-15',
        why: 'Внесено пакетом 2.7.6: квиз 15.09, unit test 22.09, поэзия ENG2D ≈25.09, ICS3UE 16–17.09, CSMC 18.11. Ждём: дата OSSLT (до 15.10), Financial Literacy и конец GLC2O (учитель GLC2O), Unit 2 у учителя MHF4U.'
      }
    }
  ];

  /** M6. День без урока, минималки и радара, записанный «Нормой» (Э6). */
  var M6_DAY = '2026-09-09';

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

  /**
   * У дорожки есть собственные категории? С 2.7.3 своих нет только у cs:
   * информатика идёт онлайн-курсом, и её долги пока ложатся в письмо или
   * математику по префиксу кода.
   */
  function trackHasCats(trackId) {
    if (!trackId || trackId === 'all') return false;
    return DEBT_CATS.some(function (c) { return c.track === trackId; });
  }

  /**
   * Код принадлежит дорожке урока? Для 'all' подходит любой код списка.
   * Дорожки без собственных категорий (biz — живой блок Б5 Ф0, cs) ведут себя
   * как 'all': иначе на таком уроке ИИ не смог бы записать ни одного долга,
   * и реальная ошибка ученика пропала бы молча.
   */
  function catFitsTrack(code, trackId) {
    var c = debtCat(code);
    if (!c) return false;
    if (!trackHasCats(trackId)) return true;
    return c.track === trackId;
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

  /**
   * Курсы школы (ТЗ 2.1). Дорожка курса решает, чьи долги и чьи слова придут
   * в промпт ДЗ-урока. Онлайн-информатика — ICS3UE (подтверждено консультантом,
   * 2.7.6): свежая установка получает ровно то, что миграция M1 записала
   * живому состоянию, — код и имя берутся из тех же констант.
   */
  var SCHOOL_COURSES = [
    { code: 'MHF4U', name: 'Advanced Functions — продвинутые функции, 12 класс', track: 'math' },
    { code: 'ENG2D', name: 'English — английский 10 класса, академический', track: 'write' },
    { code: 'GLC2O', name: 'Career Studies — карьера и планирование', track: 'biz' },
    { code: M1_CODE_TO, name: M1_NAME, track: 'cs', editable: true }
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
        schoolCourses: clone(SCHOOL_COURSES),
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
      // cursor/cursorDay — где остановились сегодня, doneDay — очередь пройдена
      cards: { lastDay: null, viewedToday: 0, seen: [], cursor: 0, cursorDay: null, doneDay: null },
      // SRS-накладка на банк слов: ключ — слово в нижнем регистре.
      // Сами слова живут в итогах уроков, здесь только их судьба.
      srs: {},
      // Какие долги реально ушли в промпт: lessons[urok] — список id урока,
      // min — список разминки. Перезаписывается каждым копированием промпта.
      // По нему «Погашено» проверяется на «этот долг вообще показывали?».
      injected: { min: [], lessons: {} },
      // Ступень нагрузки по имени (ТЗ 4.4). Двигается только кнопкой владельца:
      // автоперехода нет ни вверх, ни по расписанию цикла.
      scale: { stage: null, since: null },
      // Уроки по домашнему заданию школы (ТЗ 2.7.3): id → { date, course,
      // track, score, level }. Отдельно от lessons: программный урок от
      // разбора школьного ДЗ пройденным не становится.
      hw: {},
      // Чек-лист языка (ТЗ 2.2, 4.3): пять пунктов, номера фиксированы.
      // stats[i] = { clean, total } — сколько раз пункт был чист из скольких уроков.
      checklist: { stats: [] },
      // stretchDone — сколько ⭐⭐ взято за всё время: их не считает счёт урока,
      // и без отдельного счётчика взятый стретч нигде не остаётся
      stats: { wordsTotal: 0, lessonsDone: 0, bestStreak: 0, stretchDone: 0 },
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
    if (!out.checklist || typeof out.checklist !== 'object' || Array.isArray(out.checklist)) {
      out.checklist = { stats: [] };
    }
    if (!Array.isArray(out.checklist.stats)) out.checklist.stats = [];

    // ступень по умолчанию — S0 (ТЗ 4.4). Дефолт безусловный, не по версии
    // схемы: иначе состояние, пережившее миграцию v3 до этого релиза,
    // осталось бы без ступени навсегда
    if (!out.scale || typeof out.scale !== 'object' || Array.isArray(out.scale)) {
      out.scale = { stage: null, since: null };
    }
    if (!out.scale.stage || !STEPS.stage(out.scale.stage)) {
      out.scale.stage = 'S0';
      out.scale.since = out.scale.since || today();
    }

    // списки доктрины: пустой или не-массив — берём дефолт целиком
    ['levels', 'addons', 'ranks'].forEach(function (k) {
      if (!Array.isArray(out.settings[k]) || !out.settings[k].length) {
        out.settings[k] = clone(base.settings[k]);
      }
    });
    // правила «если — то» можно вычистить в ноль, но массивом они быть обязаны
    if (!Array.isArray(out.settings.ifThen)) out.settings.ifThen = clone(base.settings.ifThen);
    if (!Array.isArray(out.settings.schoolCourses) || !out.settings.schoolCourses.length) {
      out.settings.schoolCourses = clone(SCHOOL_COURSES);
    }
    if (!out.settings.phaseDates || typeof out.settings.phaseDates !== 'object') out.settings.phaseDates = {};
    out.settings.phaseDates = Object.assign({}, base.settings.phaseDates, out.settings.phaseDates);

    ['blocks', 'lessons', 'days', 'hw'].forEach(function (k) { if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {}; });
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
    repairWords(out);

    // 2.7.0: ремонт банка долгов, источник дедлайнов, чистка слов и достройка
    // минималки у импортированных дней. Разовая правка состояния — отсюда версия.
    if (((o && o.meta && o.meta.version) || 0) < 3) migrateV3(out);

    // A-14: свежесть дорожки без единого урока считается от даты онбординга;
    // у состояний, живших до этого поля, точкой отсчёта становится сегодня
    if (!out.meta.onboardedAt) out.meta.onboardedAt = today();

    // последним: к этому моменту банк долгов уже починен,
    // и в списках показанного останутся только живые открытые долги
    cleanInjected(out);

    // 2.7.6: разовая правка данных владельца. Маркер читаем из сырого o,
    // как версию схемы выше: base.meta из blank() его не подставит
    var done = migrationsOf(o);
    lastMig276 = null;
    if (done.indexOf(MIG_276) < 0) {
      lastMig276 = migrate276(out, o);
      out.meta.migrations = done.concat(MIG_276);
      logMig276(lastMig276);
    }
    heal276(out);
    // счётчик слов — число ключей SRS (Э4): после M5 и долечивания слов
    countWords(out);

    // 2.7.7: после 2.7.6 и в том же вызове — маркер читаем из out, куда
    // 2.7.6 только что дописала свой (состояние 2.7.5 проходит обе правки)
    var done277 = migrationsOf(out);
    lastMig277 = null;
    if (done277.indexOf(MIG_277) < 0) {
      lastMig277 = migrate277(out);
      out.meta.migrations = done277.concat(MIG_277);
      if (lastMig277.todo.length) console.log('[migrate 2.7.7] событий → дело: ' + lastMig277.todo.join(', '));
    }

    // 2.7.8 (B9): после 2.7.7, один раз — под маркером. На каждой загрузке
    // нельзя: маска узнаёт любую короткую вставку на месте замены, и своя
    // правка владельца там откатывалась бы (ревью 2.7.8). Откат дела M4
    // клиентом 2.7.5 чинит healTodos276 — он сравнивает «зачем» после перевода.
    // Отчёт не null, когда маркер дописан сейчас: boot сохраняет без подъёма
    var done278 = migrationsOf(out);
    var fresh278 = done278.indexOf(MIG_278) < 0;
    var rep278 = fresh278 ? migrate278(out) : null;
    lastMig278 = null;
    if (rep278) {
      out.meta.migrations = done278.concat(MIG_278);
      lastMig278 = rep278;
      if (rep278.todos.length || rep278.items.length) {
        console.log('[migrate 2.7.8] тексты без страны: дела ' + (rep278.todos.join(', ') || '—') +
          ' · вопросы ' + (rep278.items.join(', ') || '—'));
      }
    }

    // 2.7.7 (Э4): рекорд серии не ниже текущей серии. Серия выводится из дней,
    // поэтому поправка детерминирована, повторяется на каждом устройстве и
    // updatedAt не двигает: так рекорд сходится с серией и без действий
    // (живая копия 13.09: серия 56 при рекорде 55)
    bumpBestStreakIn(out);

    out.meta.version = SCHEMA;
    return out;
  }

  /* ---------- 2.7.6: миграция данных ---------- */

  var lastMig276 = null;
  var lastMig277 = null;
  var lastMig278 = null;

  /** 2.7.7 (Э5): пять событий M2 → тип todo. → отчёт {todo: [id]} */
  function migrate277(out) {
    var rep = { todo: [] };
    out.radar.forEach(function (e) {
      if (!e || MIG_277_TODO.indexOf(e.id) < 0 || e.type !== 'assignment') return;
      e.type = 'todo';
      rep.todo.push(e.id);
    });
    return rep;
  }

  function squash278(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  /**
   * 2.7.8 (B9): text — прежняя редакция нового fresh? fresh режется по фразам
   * slots на неизменные куски; прежний обязан начинаться первым куском,
   * кончаться последним, средние содержать по порядку, а между кусками — по
   * вставке от 1 до QUASI_GAP знаков. Совпадение с новым — не прежняя.
   * Фразы, которой в fresh нет (смесь версий: старый radar.js), — не прежняя.
   */
  function quasiWas278(text, fresh, slots) {
    if (typeof text !== 'string' || typeof fresh !== 'string') return false;
    var t = squash278(text), n = squash278(fresh);
    if (t === n) return false;
    var fixed = [], pos = 0;
    for (var i = 0; i < slots.length; i++) {
      var at = n.indexOf(slots[i], pos);
      if (at < 0) return false;
      fixed.push(n.slice(pos, at));
      pos = at + slots[i].length;
    }
    fixed.push(n.slice(pos));
    var head = fixed[0], tail = fixed[fixed.length - 1];
    if (t.length < head.length + tail.length + slots.length) return false;
    if (t.slice(0, head.length) !== head || t.slice(t.length - tail.length) !== tail) return false;
    var cur = head.length, end = t.length - tail.length;
    for (var k = 1; k < fixed.length; k++) {
      var j = k === fixed.length - 1 ? end : t.indexOf(fixed[k], cur + 1);
      if (j < 0 || j > end) return false;
      var gap = j - cur;
      if (gap < 1 || gap > QUASI_GAP) return false;
      cur = j + fixed[k].length;
    }
    return true;
  }

  /**
   * 2.7.8 (B9): новые тексты с их местами замен — из посева (Radar) и M4.
   * → {why: [{text, slots}], en: […], ru: […]} или null — смесь версий:
   * посев старого radar.js фраз новой редакции не знает; тогда маркер не
   * ставится, и перевод повторит следующая загрузка
   */
  function quasiMaps278() {
    var R = window.Radar || {};
    var seed = (R.SEED_TODOS || []).filter(function (t) { return t && t.match === 'guidance'; })[0];
    var q = ((R.QUESTIONS_SEED && R.QUESTIONS_SEED.items) || [])[2];
    var maps = { why: [], en: [], ru: [] };
    var mixed = false;
    function put(list, text, slots) {
      if (typeof text !== 'string') { mixed = true; return; }
      var pos = 0;
      slots.forEach(function (sl) { var at = text.indexOf(sl, pos); if (at < 0) mixed = true; else pos = at + sl.length; });
      list.push({ text: text, slots: slots });
    }
    put(maps.why, seed && seed.why, QUASI_278.seedWhy);
    put(maps.why, M4_TODOS[0].set.why, QUASI_278.m4Why);
    put(maps.en, q && q.en, QUASI_278.qEn);
    put(maps.ru, q && q.ru, QUASI_278.qRu);
    return mixed ? null : maps;
  }

  /** Прежняя редакция одного из текстов списка → этот текст; иначе как есть. */
  function quasiText278(maps, list, text) {
    if (!maps || typeof text !== 'string') return text;
    for (var i = 0; i < list.length; i++) {
      if (quasiWas278(text, list[i].text, list[i].slots)) return list[i].text;
    }
    return text;
  }

  /**
   * 2.7.8 (B9): «зачем» дел и строки вопросов прежней редакции → новая.
   * Отметки, ответы, сроки, done не трогаются.
   * → отчёт {todos: [id], items: ['id события#номер пункта']} или null (смесь версий)
   */
  function migrate278(out) {
    var maps = quasiMaps278();
    if (!maps) return null;
    var rep = { todos: [], items: [] };
    out.todos.forEach(function (t) {
      if (!t) return;
      var why = quasiText278(maps, maps.why, t.why);
      if (why === t.why) return;
      t.why = why;
      rep.todos.push(t.id);
    });
    out.radar.forEach(function (e) {
      if (!e || !Array.isArray(e.items)) return;
      e.items.forEach(function (x, i) {
        if (!x) return;
        var en = quasiText278(maps, maps.en, x.en), ru = quasiText278(maps, maps.ru, x.ru);
        if (en === x.en && ru === x.ru) return;
        x.en = en;
        x.ru = ru;
        rep.items.push(e.id + '#' + i);
      });
    });
    return rep;
  }

  function migrationsOf(o) {
    var m = o && o.meta && o.meta.migrations;
    return Array.isArray(m) ? m.slice() : [];
  }

  /** Карточка вопросов уже в форме M3: есть вопрос про Credit Counselling Summary. */
  function isM3Card(e) {
    return !!(e && e.id === M3_ID && Array.isArray(e.items) && e.items.some(function (q) {
      return q && String(q.en || '').indexOf(M3_EN0) === 0;
    }));
  }

  /**
   * M1–M6 по ТЗ 2.7.6 §3. Работает на out (сырое o уже слито в него).
   * Не трогает долги, уроки, итоги, дни кроме 09.09, scale, step, cards, hw.
   * → отчёт {m1, m2, m3, m4, m5, m6}
   */
  function migrate276(out, o) {
    var rep = { m1: 0, m2: [], m3: 0, m4: [], m5: 0, m6: 0 };

    // M1. Курс информатики: ICS3U → ICS3UE. Уже есть ICS3UE — пропуск
    var courses = out.settings.schoolCourses || [];
    var hasNew = courses.some(function (c) { return c && c.code === M1_CODE_TO; });
    if (!hasNew) {
      courses.forEach(function (c) {
        if (!c || c.code !== M1_CODE_FROM || c.track !== 'cs') return;
        c.code = M1_CODE_TO;
        c.name = M1_NAME;
        rep.m1++;
      });
    }

    // M2. События радара — только состоянию, жившему до выпуска, и по id
    var onboarded = o && o.meta && o.meta.onboardedAt;
    if (onboarded && onboarded < MIG_276_BEFORE) {
      M2_EVENTS.forEach(function (row) {
        if (out.radar.some(function (e) { return e && e.id === row.id; })) return;
        out.radar.push({ id: row.id, done: false, course: row.course, type: row.type, date: row.date, note: row.note });
        rep.m2.push(row.id);
      });
    }

    // M3. Карточка вопросов: три пункта, новые дата и заголовок; тип не меняется
    out.radar.forEach(function (e) {
      if (!e || e.id !== M3_ID) return;
      var items = Array.isArray(e.items) ? e.items : [];
      if (items.length === 3 && String((items[0] || {}).en || '').indexOf(M3_EN0) === 0) return;
      e.title = M3_TITLE;
      e.date = M3_DATE;
      e.items = clone(M3_ITEMS);
      rep.m3++;
    });

    // M4. Два дела — по id и только если текст ещё не тот
    M4_TODOS.forEach(function (fix) {
      out.todos.forEach(function (t) {
        if (!t || t.id !== fix.id) return;
        var changed = false;
        Object.keys(fix.set).forEach(function (k) {
          if (t[k] === fix.set[k]) return;
          t[k] = fix.set[k];
          changed = true;
        });
        if (changed) rep.m4.push(fix.id);
      });
    });

    // M5. Слова итогов, которых нет в SRS, — «в работе» с повтором в день миграции
    var due = today();
    out.summaries.slice()
      .sort(function (a, b) {
        var da = (a && a.date) || '', db = (b && b.date) || '';
        return da < db ? -1 : (da > db ? 1 : 0);
      })
      .forEach(function (sum) {
        rep.m5 += enrollWords(out.srs, (sum && sum.parsed && sum.parsed.words) || [], function () {
          return { status: 'learning', step: 0, streak: 0, due: due };
        });
      });

    // M6. 09.09 — «Норма» без урока, минималки и добавок → пусто
    var d9 = out.days[M6_DAY];
    if (d9 && (d9.level || 'none') !== 'none' && !(d9.lessons || []).length &&
      !Array.isArray(d9.minimalSteps) && !(d9.addons || []).length) {
      d9.level = 'none';
      d9.points = 0;
      rep.m6 = 1;
    }
    return rep;
  }

  /**
   * Вне маркера. Клиент 2.7.5 после pull дописывает в карточку M3 вопросы 7–8
   * со старым заголовком (radar.js topUpQuestions) и пушит это в облако —
   * карточка возвращается к трём вопросам M3, отметки и ответы на них целы.
   * Слова итогов, пришедшие с такого клиента без записи SRS, заводятся так же,
   * как их заводит разбор ИТОГа. → сколько правок
   */
  function heal276(out) {
    var n = 0;
    out.radar.forEach(function (e) {
      if (!isM3Card(e)) return;
      var keep = e.items.filter(function (q) {
        return q && M3_ITEMS.some(function (m) { return m.en === q.en; });
      });
      if (keep.length !== e.items.length) { e.items = keep; n++; }
      if (e.title === M3_OLD_TITLE) { e.title = M3_TITLE; n++; }
    });
    out.summaries.forEach(function (sum) {
      n += enrollWords(out.srs, (sum && sum.parsed && sum.parsed.words) || []);
    });
    n += healTodos276(out);
    return n;
  }

  /**
   * Клиент 2.7.5 на каждой загрузке сопоставляет дела плана по подстроке
   * (Radar.migrateTodos без маркера) и возвращает им тексты 2.6.2 — поверх M4,
   * с маркером в состоянии. Такое дело узнаётся точно: название и «зачем»
   * дословно те, что в посеве плана; руками их так не набирают. Тогда M4
   * применяется снова; своё «done» дело сохраняет.
   * 2.7.8 (B9): клиент 2.7.5 возвращает «зачем» редакции 2.7.7, которой в
   * посеве больше нет, — «зачем» сравнивается после перевода в новую редакцию.
   */
  function healTodos276(out) {
    var seeds = (window.Radar && Radar.SEED_TODOS) || [];
    if (!seeds.length) return 0;
    var maps = quasiMaps278();
    var n = 0;
    M4_TODOS.forEach(function (fix) {
      out.todos.forEach(function (t) {
        if (!t || t.id !== fix.id) return;
        var why = maps ? quasiText278(maps, maps.why, t.why) : t.why;
        var reverted = seeds.some(function (seed) { return t.title === seed.title && why === seed.why; });
        if (!reverted) return;
        Object.keys(fix.set).forEach(function (k) { t[k] = fix.set[k]; });
        n++;
      });
    });
    return n;
  }

  function logMig276(rep) {
    console.log('[migrate 2.7.6] M1 курс ' + (rep.m1 ? M1_CODE_FROM + ' → ' + M1_CODE_TO : 'без изменений') +
      ' · M2 событий +' + rep.m2.length + ' · M3 карточка ' + (rep.m3 ? 'обновлена' : 'без изменений') +
      ' · M4 дел ' + rep.m4.length + ' · M5 слов +' + rep.m5 + ' · M6 09.09 ' + (rep.m6 ? '→ пусто' : 'без изменений'));
  }

  /* ---------- 2.6.5: ремонт банка долгов ---------- */

  /**
   * Правит переводы карточек по таблице WORD_FIXES. Не привязана к версии
   * схемы: правка мелкая, а условие точное — второй раз она не срабатывает.
   * → сколько карточек поправлено
   */
  function repairWords(out) {
    var n = 0;
    (out.summaries || []).forEach(function (sum) {
      var list = (sum && sum.parsed && sum.parsed.words) || null;
      if (!Array.isArray(list)) return;
      list.forEach(function (w) {
        WORD_FIXES.forEach(function (fix) {
          if (!w || String(w.en).toLowerCase().trim() !== fix.en) return;
          if (w.ru !== fix.from) return;
          w.ru = fix.to;
          n++;
        });
      });
    });
    return n;
  }

  /**
   * Списки «что ушло в промпт» копятся с 2.6.5 и никогда не чистились:
   * закрытые и поглощённые долги оставались в них навсегда. На матчинг это
   * не влияло — injectedPool и так берёт только open, — но состояние росло.
   * Ключи не удаляем: пустой список урока значит «гасить нечего»,
   * а отсутствие ключа — «ограничения нет», и подмена одного другим
   * разрешила бы «Погашено» больше, чем было показано. Идемпотентна.
   */
  function cleanInjected(out) {
    var open = {};
    (out.debts || []).forEach(function (d) {
      if (d && d.status === 'open') { var k = debtKey(d); if (k) open[k] = true; }
    });
    function keep(list) {
      return (Array.isArray(list) ? list : []).filter(function (id) { return open[id]; });
    }
    out.injected.min = keep(out.injected.min);
    Object.keys(out.injected.lessons).forEach(function (lessonId) {
      out.injected.lessons[lessonId] = keep(out.injected.lessons[lessonId]);
    });
  }

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
      // первым примером идёт живая запись ученика — та, что была до
      // канонического текста. Иначе у семи долгов без поглощённых примеров
      // не осталось бы вовсе, а промпт этапа 4 печатает последний
      if (!keep.examples.length) {
        keep.examples.push({
          lesson: keep.createdIn || null,
          text: keep.text,
          date: lessonDate(keep.createdIn) || 'migration'
        });
      }
      keep.text = row.text;
      if (row.track) keep.track = row.track;

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
      // 2.8.1 (A5): смена выводится из даты и делается на каждом устройстве
      // само — updatedAt не двигается. Иначе устройство, спавшее с лета,
      // на старте становилось «новее» облака и выигрывало конфликт синка
      writeNow();
      return true;
    }
    return false;
  }

  function mode() { return s.settings.mode; }
  function isSchool() { return s.settings.mode === 'school'; }

  /**
   * Режим учебных дней на дату (2.7.8, Б4) — для U.schoolDay, U.schoolDays и
   * U.nextSchoolDay. «Мост» берётся по фазе: переключатель знает только Лето
   * и Школу, а летом 2027 он так и стоит на «Школе». В остальные дни — режим
   * переключателя.
   */
  function lessonMode(iso) {
    return currentPhase(iso) === 'bridge' ? 'bridge' : mode();
  }

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

  /* ---------- 2.7.6 (Э6): план дня и достигнутый уровень ----------
     Сегмент «Уровень дня» — это выбор плана: от него зависит, какие пункты
     показывает «Сегодня» (урок есть только на норме и полной). До 2.7.6 он же
     был уровнем дня и сразу давал очки: 09.09 тап «Норма» записал 2 очка дню
     без урока, минималки и радара. Доктрина 2.1 даёт очки только за
     достигнутый уровень, поэтому план и уровень разведены: day.plan — выбор,
     day.level — не выше достигнутого. У дней до 2.7.6 плана нет: план = уровень. */

  var LEVEL_RANK = { none: 0, min: 1, norm: 2, full: 3 };

  /** План дня: выбранный сегментом уровень. */
  function planOf(d) { return (d && (d.plan || d.level)) || 'none'; }

  /**
   * Что день набрал на деле. Норма — закрытый урок или ДЗ-урок (ИТОГ кладёт id
   * в lessons), полная — два; воскресенье с радаром — норма (радар-день);
   * минималка — оба шага минималки.
   */
  function achievedLevel(d, iso) {
    if (!d) return 'none';
    var n = (d.lessons || []).length;
    if (n >= 2) return 'full';
    if (n >= 1) return 'norm';
    if (U.weekday(iso) === 7 && (d.addons || []).indexOf('radar') >= 0) return 'norm';
    var ms = d.minimalSteps || [];
    return (ms[0] && ms[1]) ? 'min' : 'none';
  }

  /** Уровень дня = план, но не выше достигнутого. Выше плана не поднимается. */
  function settleLevel(d, iso) {
    var plan = planOf(d);
    var got = achievedLevel(d, iso);
    var lvl = (LEVEL_RANK[plan] || 0) <= (LEVEL_RANK[got] || 0) ? plan : got;
    if (lvl === (d.level || 'none')) return false;
    if (!d.plan) d.plan = plan;          // опуская уровень, план не теряем
    d.level = lvl;
    return true;
  }

  function recount(iso) {
    var d = s.days[iso];
    if (!d) return;
    settleLevel(d, iso);
    d.points = DOCTRINE.dayPoints(d, s.settings);
    // 2.7.7 (Э4): рекорд серии — при любом пересчёте дня. До 2.7.7 его
    // поднимали только урок, план и добавки, а минималка и чек-лист радара
    // серию держали молча: 13.09 серия 56 при рекорде 55
    bumpBestStreak();
  }

  /**
   * Выбор плана дня. Повторный тап по активному плану снимает его в «Пусто».
   * Уровень и очки придут, когда план выполнен (recount зовут закрытие урока,
   * шаги минималки и радар).
   */
  function setLevel(levelId, iso) {
    var date = iso || today();
    var d = day(date, true);
    d.plan = (planOf(d) === levelId && levelId !== 'none') ? 'none' : levelId;
    recount(date);
    touch();
  }

  function toggleAddon(addonId, iso) {
    var date = iso || today();
    var d = day(date, true);
    var i = d.addons.indexOf(addonId);
    if (i >= 0) d.addons.splice(i, 1); else d.addons.push(addonId);
    recount(date);
    touch();
  }

  /**
   * Держит ли день серию (ТЗ 1.4). Держат только закрытый урок и выполненная
   * минималка. Добавки (Проект, Клуб, Тест, Доп. урок) очки дают, а серию нет:
   * иначе «Проект» в одиночку заменял учёбу. Исключение — воскресный радар,
   * он часть доктрины, и такой день не пустой.
   */
  function holdsStreak(iso) { return holdsStreakIn(s.days, iso); }

  function holdsStreakIn(days, iso) {
    var d = days && days[iso];
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

  function bumpBestStreak() { return bumpBestStreakIn(s); }

  /**
   * 2.7.7 (Э4): stats.bestStreak = max(рекорд, текущая серия). Зовётся из
   * recount — любой пересчёт дня (урок, шаги минималки, чек-лист радара,
   * добавки, план) — и из migrate при загрузке. → true, если рекорд вырос
   */
  function bumpBestStreakIn(st) {
    if (!st || !st.stats) return false;
    var cur = DOCTRINE.streak(function (iso) { return holdsStreakIn(st.days, iso) ? 1 : 0; }, today());
    if (cur <= (st.stats.bestStreak || 0)) return false;
    st.stats.bestStreak = cur;
    return true;
  }

  /* ---------- ступень нагрузки (ТЗ 4.4) ---------- */

  /** Имя текущей ступени: 'S0' … 'Г3'. */
  function stageName() { return (s.scale && s.scale.stage) || 'S0'; }

  /** Параметры текущей ступени — их видят и карточка урока, и промпт. */
  function stageParams(iso) {
    var t = iso || today();
    return STEPS.params(s.step, t, mode(), stageName());
  }

  /**
   * Готов ли ученик к следующей ступени (ТЗ 4.4): средний счёт последних
   * семи дней ≥ 8 при трёх и более закрытых уроках. Само по себе это ничего
   * не двигает — только зажигает кнопку.
   */
  function readyForNextStage(iso) {
    var t = iso || today();
    var from = U.addDays(t, -6);
    var scores = [];
    Object.keys(s.lessons).forEach(function (id) {
      var l = s.lessons[id];
      if (!l || !l.done || l.score == null || !l.date) return;
      if (l.date < from || l.date > t) return;
      scores.push(l.score);
    });
    if (scores.length < 3) return false;
    var sum = scores.reduce(function (a, b) { return a + b; }, 0);
    return sum / scores.length >= 8;
  }

  /** Следующая ступень, если кнопку показывать пора, иначе null. */
  function nextStageOffer(iso) {
    if (!isSchool()) return null;
    var next = STEPS.nextStage(stageName());
    if (!next) return null;
    return readyForNextStage(iso) ? next : null;
  }

  /** Поднять ступень. Только руками — автоперехода нет (ТЗ 4.4). */
  function setStage(name, iso) {
    if (!STEPS.stage(name)) return false;
    s.scale.stage = name;
    s.scale.since = iso || today();
    // позиция шкалы идёт следом, чтобы цикл и разгрузка не спорили с промптом
    var r = STEPS.stage(name);
    if (r.pos >= STEPS.MIN) s.step.position = r.pos;
    touch();
    return true;
  }


  /* ---------- 2.7.3: урок по домашнему заданию школы ---------- */

  var HW_WEEK_CAP = 3;      // столько ДЗ-уроков в неделю: школа не заменяет программу
  var HW_RE = /^HW-(\d{4}-\d{2}-\d{2})-([a-z]+)$/;

  function schoolCourses() {
    var list = s.settings.schoolCourses;
    return Array.isArray(list) && list.length ? list : SCHOOL_COURSES;
  }

  function schoolCourse(code) {
    var want = String(code || '').toUpperCase().trim();
    var hit = null;
    schoolCourses().forEach(function (c) { if (String(c.code).toUpperCase() === want) hit = c; });
    return hit;
  }

  /** id ДЗ-урока: HW-ДАТА-дорожка. Дорожка в id — чтобы её знал парсер. */
  function hwId(dateIso, trackId) {
    return 'HW-' + (dateIso || today()) + '-' + trackId;
  }

  /** Разбор id ДЗ-урока → { id, date, track } или null. */
  function parseHwId(id) {
    var m = HW_RE.exec(String(id || ''));
    return m ? { id: String(id), date: m[1], track: m[2] } : null;
  }

  function isHw(id) { return !!parseHwId(id); }

  /**
   * Сколько ДЗ-уроков взято на неделе этой даты (неделя с понедельника).
   * Считаем дни, а не записи: взятый урок занимает день сразу, ещё до ИТОГа,
   * иначе лимит обходится тремя незакрытыми уроками подряд.
   */
  function hwWeekCount(todayIso) {
    var t = todayIso || today();
    var from = U.weekStart(t), to = U.addDays(from, 6);
    var days = {};
    Object.keys(s.days || {}).forEach(function (iso) {
      if (s.days[iso] && s.days[iso].hw && iso >= from && iso <= to) days[iso] = 1;
    });
    Object.keys(s.hw || {}).forEach(function (id) {
      var rec = s.hw[id];
      if (rec && rec.date >= from && rec.date <= to) days[rec.date] = 1;
    });
    return Object.keys(days).length;
  }

  /**
   * Можно ли сегодня взять урок по ДЗ (ТЗ 2.1): будни, норма дня ещё не
   * закрыта и на неделе меньше трёх. Школьное ДЗ помогает программе, а не
   * заменяет её — отсюда и кэп, и будни.
   */
  function hwAvailable(todayIso) {
    var t = todayIso || today();
    // 2.8.0 (A3): учебный день — по единой таблице U (в «Школе» пн–пт, как было)
    if (!U.schoolDay(t, lessonMode(t))) return false;
    var d = s.days[t];
    if (d && (d.lessons || []).length) return false;      // норма дня закрыта
    return hwWeekCount(t) < HW_WEEK_CAP;
  }

  /**
   * Заявка на ДЗ-урок: помечаем день и отдаём id. Выбор урока не трогаем.
   * movedLessonId — программный урок, который этим днём переехал на ближайший
   * учебный день (U.nextSchoolDay по режиму дня; в «Школе» — пн–пт).
   * Он запоминается ЗДЕСЬ и больше не пересчитывается: к вечеру выбор дня
   * успевает поменяться (закрыт второй урок, скопирован другой промпт), и
   * подпись «— завтра» начинала называть урок, сделанный сегодня.
   */
  function startHw(courseCode, todayIso, movedLessonId) {
    var t = todayIso || today();
    var c = schoolCourse(courseCode);
    if (!c) return null;
    var id = hwId(t, c.track);
    var d = day(t, true);
    d.hw = id;
    d.hwCourse = c.code;
    // смена курса на том же дне переехавший урок не переписывает
    if (!d.hwMoved && movedLessonId && !isHw(movedLessonId)) d.hwMoved = movedLessonId;
    touch();
    return { id: id, course: c.code, track: c.track, name: c.name, moved: d.hwMoved || null };
  }

  /** Курс сегодняшнего ДЗ-урока или null. */
  function hwOfDay(todayIso) {
    var d = s.days[todayIso || today()];
    if (!d || !d.hw) return null;
    var p = parseHwId(d.hw);
    if (!p) return null;
    // переехавший урок отдаём, только пока он и правда не сделан сегодня
    var moved = d.hwMoved || null;
    if (moved && ((d.lessons || []).indexOf(moved) >= 0 ||
      ((s.lessons[moved] || {}).done && (s.lessons[moved] || {}).date === (todayIso || today())))) {
      moved = null;
    }
    return { id: d.hw, course: d.hwCourse || null, track: p.track, moved: moved };
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

  /**
   * Активная фаза по дате (или последняя начавшаяся). Без аргумента —
   * по сегодняшнему дню; правила водопада передают свой день явно.
   */
  function currentPhase(iso) {
    var t = iso || today(), pd = s.settings.phaseDates, last = PHASES[0].id;
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

    // 2.8.1 (A2): контент выводится из пакета, а не из действий человека, —
    // updatedAt не двигается (как автоотметки 2.7.7–2.7.8). Иначе новый пакет
    // на старте делал устаревшее устройство «новее» облака, и синк считал
    // его неотправленной правкой. Другое устройство применит пакет само.
    if (changed) writeNow();
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
    return PACE.status({ remaining: p.remaining, deadline: b.deadline, today: today(), mode: lessonMode(today()) });
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

  /**
   * Отображаемый номер блока: B12 → Б12. Контент может задать свою подпись
   * полем label — так субботний блок B53 показывается как «К» (ТЗ 3.1).
   */
  function blockLabel(id) {
    var own = window.CONTENT && CONTENT.label ? CONTENT.label(id) : null;
    return own || ('Б' + blockNum(id));
  }

  /**
   * Отображаемая подпись урока: B53.1 → К.1, B7.2 → Б7.2.
   * ДЗ-урок — как на его карточке «Сегодня»: «Урок по ДЗ · MHF4U»
   * (курс неизвестен — имя дорожки).
   */
  function lessonLabel(lessonId) {
    var hwp = parseHwId(lessonId);
    if (hwp) {
      var course = ((s.days || {})[hwp.date] || {}).hwCourse || ((s.hw || {})[hwp.id] || {}).course;
      return 'Урок по ДЗ · ' + (course || trackName(hwp.track));
    }
    var p = String(lessonId).split('.');
    return blockLabel(p[0]) + '.' + (p[1] || '1');
  }

  /** Отображаемый номер урока: B12.3 → урок 3. */
  function lessonNum(lessonId) {
    var p = String(lessonId).split('.');
    return parseInt(p[1], 10) || 0;
  }

  /* ---------- уроки: очередь, свежесть, отметки дня ---------- */

  function lessonTrack(lessonId) {
    // ДЗ-урок дорожку носит в самом id: иначе «Прошлый раз» и доска долгов
    // его не увидят — урока-то в контенте нет
    var hwp = parseHwId(lessonId);
    if (hwp) return hwp.track;
    var l = window.CONTENT ? CONTENT.lesson(lessonId) : null;
    if (!l) return null;
    var b = s.blocks[l.blockId];
    return b ? b.track : null;
  }

  function phaseIndex(phaseId) {
    for (var i = 0; i < PHASES.length; i++) if (PHASES[i].id === phaseId) return i;
    return PHASES.length;
  }

  /**
   * Порядок очереди блоков (2.7.7, Э6): фаза → свои блоки раньше общего →
   * срок блока (без срока — в конце) → номер. Этап 7 пакета 2.7.6 развёл номер
   * и срок у письма (Б12 20.12, Б14 22.11): очередь по номеру отдавала Б12,
   * пока горел Б14. Свои блоки идут ровно порядком водопада —
   * Waterfall.nextOwnLesson зовёт эту же функцию.
   * Общий блок (track: 'all') — в конце фазы (ревью 2.7.7): иначе после снятого
   * или сдвинутого за 30.01 срока своего блока Б16 вставал впереди него — свап
   * предлагал письму финалы MHF4U, а второй урок уходил в «другой дорожки с
   * уроками нет». Общий блок назначают дедлайн и шаблон (2.7.6, Э3), не очередь.
   */
  function compareBlocks(a, b) {
    var ba = s.blocks[a], bb = s.blocks[b];
    var pa = phaseIndex(ba.phase), pb = phaseIndex(bb.phase);
    if (pa !== pb) return pa - pb;
    var aa = ba.track === 'all' ? 1 : 0, ab = bb.track === 'all' ? 1 : 0;
    if (aa !== ab) return aa - ab;
    var da = ba.deadline || '9999', db = bb.deadline || '9999';
    if (da !== db) return da < db ? -1 : 1;
    return blockNum(a) - blockNum(b);
  }

  /**
   * Конкурсный урок блока К (type: 'contest' — тот же признак, что
   * PROMPTS.isContest). 2.7.8 (Б1): его назначает только правило «Суббота ⭐»
   * и ручной свап (отдельная строка К); очередь дорожки его пропускает.
   */
  function isContestLesson(l) { return !!(l && l.type === 'contest'); }

  /**
   * Следующий непройденный урок дорожки (доктрина 5), в порядке compareBlocks.
   * Общий блок (track: 'all') стоит в очереди каждой дорожки; ownOnly — только
   * свои блоки дорожки (Waterfall.nextOwnLesson).
   * 2.7.8 (Б1): уроков К в очереди нет. К считался своим блоком математики
   * без срока: когда свои блоки математики закрыты, шаблон, свежесть, радар,
   * долги и запасные пути отдавали конкурсные задачи в будни. К ждёт субботы
   * (Waterfall.ruleSaturday), вне субботы — State.nextContestLesson и свап.
   */
  function nextLessonInTrack(trackId, phaseId, ownOnly) {
    var ids = Object.keys(s.blocks).sort(compareBlocks);
    for (var i = 0; i < ids.length; i++) {
      var b = s.blocks[ids[i]];
      if (trackId && b.track !== trackId && (ownOnly || b.track !== 'all')) continue;
      if (phaseId && b.phase !== phaseId) continue;
      var list = activeLessons(ids[i]);
      for (var j = 0; j < list.length; j++) {
        if (isContestLesson(list[j])) continue;
        var st = s.lessons[list[j].id];
        if (!st || !st.done) return list[j].id;
      }
    }
    return null;
  }

  /** Следующий непройденный урок вообще (в порядке очереди блоков; без К). */
  function nextLesson() { return nextLessonInTrack(null, null); }

  /**
   * Следующий незакрытый урок К (2.7.8, Б1) — строка К в свапе «Поменять урок».
   * phaseId — только в этой фазе; без него — сквозной, как очередь дорожки.
   */
  function nextContestLesson(phaseId) {
    var ids = Object.keys(s.blocks).sort(compareBlocks);
    for (var i = 0; i < ids.length; i++) {
      if (phaseId && s.blocks[ids[i]].phase !== phaseId) continue;
      var list = activeLessons(ids[i]);
      for (var j = 0; j < list.length; j++) {
        if (!isContestLesson(list[j])) continue;
        var st = s.lessons[list[j].id];
        if (!st || !st.done) return list[j].id;
      }
    }
    return null;
  }

  /**
   * Урок К субботы (2.8.0, A2): открытый К текущей фазы; если в фазе блока К
   * нет или его уроки закрыты — старший незакрытый К прошлых фаз (хвост К после
   * Ф1 иначе не назначался нигде). Будущие фазы не берутся. Тот же урок — у
   * строки К в свапе и у строк «будних уроков нет — К.x в субботу».
   */
  function saturdayContestLesson(iso) {
    var cur = currentPhase(iso);
    var own = nextContestLesson(cur);
    if (own) return own;
    var ci = phaseIndex(cur);
    var ids = Object.keys(s.blocks).sort(compareBlocks);
    for (var i = 0; i < ids.length; i++) {
      if (phaseIndex(s.blocks[ids[i]].phase) >= ci) continue;
      var list = activeLessons(ids[i]);
      for (var j = 0; j < list.length; j++) {
        if (!isContestLesson(list[j])) continue;
        var st = s.lessons[list[j].id];
        if (!st || !st.done) return list[j].id;
      }
    }
    return null;
  }

  /**
   * Сколько суббот займёт К (2.8.0, ревью A3): открытые уроки К текущей фазы и
   * прошлых (будущие фазы суббота не берёт). Каждая суббота — один урок К;
   * после них субботы снова учебные.
   */
  function saturdayContestCount(iso) {
    var ci = phaseIndex(currentPhase(iso)), n = 0;
    Object.keys(s.blocks).forEach(function (id) {
      if (phaseIndex(s.blocks[id].phase) > ci) return;
      activeLessons(id).forEach(function (l) {
        var st = s.lessons[l.id];
        if (isContestLesson(l) && !(st && st.done)) n++;
      });
    });
    return n;
  }

  /** Блок К (первый в очереди блок с конкурсными уроками) или null — строка К в свапе только при нём. */
  function contestBlockId() {
    var ids = Object.keys(s.blocks).sort(compareBlocks);
    for (var i = 0; i < ids.length; i++) if (activeLessons(ids[i]).some(isContestLesson)) return ids[i];
    return null;
  }

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

  /** Форма новой записи SRS — одна на весь код. */
  function newSrsRec() { return { status: 'new', streak: 0, step: 0, due: null }; }

  /**
   * Запись SRS слова. С 2.7.6 слова итога заводятся при разборе ИТОГа
   * (enrollWords); create здесь — страховка для слова без итога.
   */
  function srsRec(en, create) {
    var k = wordKey(en);
    if (!k) return null;
    if (!s.srs[k] && create) { s.srs[k] = newSrsRec(); countWords(s); }
    return s.srs[k] || null;
  }

  /**
   * 2.7.6 (Э4): каждое слово принятого ИТОГа — в SRS ровно один раз, ключ —
   * нормализованный en. До 2.7.6 запись появлялась только при оценке
   * карточки, а колода дня с 2.7.0 режется до 20 карточек, и новые слова
   * стоят в ней последними — 17 слов из итогов так и не завелись.
   * Нагрузку ограничивает колода дня (DECK_CAP), а не вход в SRS.
   * make — фабрика записи (по умолчанию newSrsRec). → сколько ключей добавлено
   */
  function enrollWords(srs, words, make) {
    var n = 0;
    (words || []).forEach(function (w) {
      var k = wordKey(w && w.en);
      if (!k || Object.prototype.hasOwnProperty.call(srs, k)) return;
      srs[k] = (make || newSrsRec)();
      n++;
    });
    return n;
  }

  /** Счётчик слов = число ключей SRS: единственный источник, отдельного счёта нет. */
  function countWords(st) {
    if (!st.stats) st.stats = {};
    st.stats.wordsTotal = Object.keys(st.srs || {}).length;
    return st.stats.wordsTotal;
  }

  function wordsTotal() { return Object.keys(s.srs || {}).length; }

  /** Снять из SRS нетронутые записи слов, которых больше нет ни в одном итоге. */
  function dropOrphanWords(words) {
    if (!words || !words.length) return 0;
    var live = {};
    s.summaries.forEach(function (sum) {
      ((sum && sum.parsed && sum.parsed.words) || []).forEach(function (w) { live[wordKey(w && w.en)] = true; });
    });
    var n = 0;
    words.forEach(function (w) {
      var k = wordKey(w && w.en);
      var r = k && s.srs[k];
      if (!r || live[k]) return;
      if (r.status !== 'new' || r.streak || r.step || r.due) return;   // оценённое слово — история владельца
      delete s.srs[k];
      n++;
    });
    return n;
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


  /* ---------- 2.7.0: колода дня (ТЗ 6) ---------- */

  var DECK_CAP = 20;        // столько карточек в дне — минималка не растёт
  var DECK_DEBTS = 3;       // столько открытых долгов, ротацией по дню
  var DECK_FRESH = 5;       // 2.7.7 (Э3): резерв под новые и «в работе»

  /** Число из даты — сид для шафла: колода дня стабильна в пределах дня. */
  function daySeed(iso) {
    var n = 0, s2 = String(iso || '');
    for (var i = 0; i < s2.length; i++) n = (n * 31 + s2.charCodeAt(i)) % 1000000;
    return n + 1;
  }

  /**
   * Самый свежий итог: наибольшая дата, при равной — вставленный позже.
   * До 2.7.7 сортировка возвращала 1 и на равных датах — какой из двух итогов
   * одного дня «последний», зависело от сортировки.
   */
  function lastSummary() {
    var last = null;
    s.summaries.forEach(function (sum) {
      if (sum && (!last || String(sum.date || '') >= String(last.date || ''))) last = sum;
    });
    return last;
  }

  /**
   * Колода дня. 2.7.7 (Э3): места делятся между группами, а не достаются по
   * очереди групп. До 2.7.7 повторы стояли первыми и при 17+ подошедших
   * занимали всю колоду: слова последнего урока и «в работе» не показывались
   * днями (14.09 у владельца — 17 повторов + 3 долга, ни одного из 29 слов в работе).
   *
   * Кэп 20: до трёх долгов (ротация по дню); DECK_FRESH = 5 мест — новым и «в работе»;
   * остальное (12 при трёх долгах) — выученным с наступившим сроком.
   *  Резерв, по приоритету:
   *   1) слова последнего итога (lastSummary): сначала ни разу не оценённые, потом в работе;
   *   2) в работе — «не знал» последним ответом (streak 0) первыми;
   *   3) прочие новые — по старшинству банка.
   *  Повторы: самый давний срок первым — места не разыгрываются шафлом,
   *   и подошедший повтор не застревает за другими.
   * Незанятый резерв отдаётся повторам, незанятые места повторов — резерву.
   *
   * Порядок карточек (Cards.deck): резерв → долги → повторы → добор резерва.
   * Шаг «Карточки» засчитывается на десятой карточке, поэтому первые десять —
   * 5 новых/в работе + 3 долга + 2 повтора: свежие слова теряют больше всех от
   * пропущенного дня, долги идут ротацией и в SRS не живут, а непоказанный
   * повтор просто остаётся подошедшим назавтра.
   * Выбор — по приоритету; внутри отрезка порядок перемешан сидом от даты:
   * в пределах дня колода стабильна, назавтра — другая.
   * → { words, debts, lead, fresh, reviews, cap }; lead — сколько слов перед долгами.
   */
  function deckPlan(todayIso) {
    var t = todayIso || today();
    var seed = daySeed(t);

    // долги ротацией по дню: каждый день своя тройка, порядок не случайный
    var open = openDebts();
    var debts = [];
    if (open.length) {
      var off = seed % open.length;
      for (var i = 0; i < Math.min(DECK_DEBTS, open.length); i++) {
        debts.push(open[(off + i) % open.length]);
      }
    }
    var slots = Math.max(0, DECK_CAP - debts.length);

    var last = lastSummary();
    var lastKeys = {};
    ((last && last.parsed && last.parsed.words) || []).forEach(function (w) {
      var k = wordKey(w && w.en);
      if (k) lastKeys[k] = true;
    });

    var reviews = [], recentNew = [], recentWork = [], learning = [], rest = [];
    activeWords(t).forEach(function (w, i) {
      var r = srsRec(w.en) || {};
      var st = r.status || 'new';
      var item = { w: w, i: i, due: r.due || '', streak: r.streak || 0 };
      if (st === 'known') reviews.push(item);
      else if (lastKeys[wordKey(w.en)]) (st === 'new' ? recentNew : recentWork).push(item);
      else if (st === 'learning') learning.push(item);
      else rest.push(item);
    });
    function byStreak(a, b) { return a.streak - b.streak || a.i - b.i; }
    recentWork.sort(byStreak);
    learning.sort(byStreak);
    reviews.sort(function (a, b) { return a.due === b.due ? a.i - b.i : (a.due < b.due ? -1 : 1); });
    var fresh = recentNew.concat(recentWork, learning, rest);

    var nFresh = Math.min(DECK_FRESH, fresh.length, slots);
    var nReview = Math.min(reviews.length, slots - nFresh);
    var nExtra = Math.min(fresh.length - nFresh, slots - nFresh - nReview);

    function take(list, from, n, salt) {
      return U.shuffle(list.slice(from, from + n).map(function (x) { return x.w; }), seed + salt);
    }
    var head = take(fresh, 0, nFresh, 1);
    var tail = take(reviews, 0, nReview, 2).concat(take(fresh, nFresh, nExtra, 3));

    return {
      words: head.concat(tail),
      debts: debts,
      lead: head.length,
      fresh: nFresh + nExtra,
      reviews: nReview,
      cap: DECK_CAP
    };
  }

  /* ---------- курсор колоды: очередь пройдена — сессия закрыта ---------- */

  /** Колода сегодня уже пройдена целиком? */
  function deckDone(todayIso) {
    var t = todayIso || today();
    return !!(s.cards && s.cards.doneDay === t);
  }

  /**
   * 2.7.6 (Э5): шаг «Карточки» минималки засчитывается колодой, а не галочкой.
   * doneDay — последний день, когда очередь колоды пройдена до конца;
   * minimalSteps[0] — шаг «Карточки» в плане дня. До 2.7.6 шаг был свободной
   * галочкой. Теперь: сегодня показано ≥10 разных карточек или колода
   * добита (doneDay === сегодня). Колода короче десяти — нужна вся; пустая
   * колода шаг не держит: вместо неё видео (так план и пишет).
   * → { ok, seen, need }
   */
  var CARDS_STEP = 10;

  function cardsStep(todayIso) {
    var t = todayIso || today();
    var plan = deckPlan(t);
    var size = plan.words.length + plan.debts.length;
    var c = s.cards || {};
    // вчерашний счёт не считается: viewedToday обнуляется лениво, при первом показе
    var seen = c.lastDay === t ? (c.viewedToday || 0) : 0;
    var need = Math.min(CARDS_STEP, size);
    return { ok: need === 0 || deckDone(t) || seen >= need, seen: seen, need: need };
  }

  /**
   * 2.7.7 (Э7): шаг «Карточки» ставится сам — в момент, когда cardsStep
   * набран (10 разных карточек или добитая колода). Звать ровно на переходе
   * «не набран → набран»: вызывающий (Cards.markSeen, шаг колоды) помнит, что
   * было до карточки, и зовёт только тогда. Поэтому снятая руками галочка
   * следующей карточкой не возвращается — шаг уже набран, перехода нет.
   * Пустая колода сама шаг не ставит: вместо неё видео, его отмечает человек.
   * 2.7.8 (Б8): шаг ставит и отрисовка «Сегодня» — по состоянию, без перехода.
   * Поэтому снятая руками галочка держится отметкой дня day.cardsUntick
   * (App.setMinimalStep): с ней шаг в этот день сам не ставится ни колодой, ни
   * отрисовкой. opts.derived — отметку ставит отрисовка «Сегодня»: без
   * перерисовки и без сдвига updatedAt (выводится из состояния, как подъём
   * рекорда; устаревшее устройство не должно стать «новее» облака).
   * → true, если отметка поставлена сейчас (день пересчитан, одна перерисовка)
   */
  function autoCardsStep(todayIso, opts) {
    var t = todayIso || today();
    var d0 = day(t);
    if (d0 && ((d0.minimalSteps || [])[0] || d0.cardsUntick)) return false;
    var cs = cardsStep(t);
    if (!cs.ok || !cs.need) return false;
    var d = day(t, true);
    var ms = d.minimalSteps || [];
    d.minimalSteps = [true, !!ms[1]];
    recount(t);
    if (opts && opts.derived) writeNow();
    else touch();
    return true;
  }

  /** Где остановились сегодня: 0, если день новый. */
  function deckCursor(todayIso) {
    var t = todayIso || today();
    if (!s.cards || s.cards.cursorDay !== t) return 0;
    return s.cards.cursor || 0;
  }

  /**
   * Запомнить позицию в колоде дня. opts.done — очередь пройдена целиком:
   * это отдельный признак, а не «курсор доехал до конца», потому что колода
   * кольцевая и по ней можно ходить сколько угодно.
   */
  function setDeckCursor(i, opts) {
    opts = opts || {};
    var t = opts.date || today();
    s.cards.cursorDay = t;
    s.cards.cursor = Math.max(0, i);
    var newlyDone = !!opts.done && s.cards.doneDay !== t;
    if (opts.done) s.cards.doneDay = t;
    // добитая колода засчитывает шаг «Карточки» — план на «Сегодня» перерисуется
    touch(!newlyDone);
    return s.cards.cursor;
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

  /**
   * Слова ПРОШЛОГО урока этой дорожки — ровно они, без добора случайными.
   * Добор тянул в математику «main idea» и «to explain» из урока чтения:
   * повторы по расписанию — дело разминки и колоды, а не разогрева урока.
   */
  var WARM_WORDS = 5;      // столько невыученных слов нужно разогреву

  function lastLessonWords(trackId, excludeLessonId) {
    // отступаем по урокам дорожки назад, пока не наберётся пять невыученных:
    // на математике все слова прошлого урока могли быть уже выучены, и блок
    // разогрева оставался пустым
    var sums = recentSummaries(trackId, 12, excludeLessonId);
    var out = [], seen = {};
    for (var i = 0; i < sums.length && out.length < WARM_WORDS; i++) {
      (((sums[i].parsed) || {}).words || []).forEach(function (w) {
        if (out.length >= WARM_WORDS) return;
        var k = wordKey(w.en);
        if (!k || seen[k] || wordStatus(w.en) === 'known') return;
        seen[k] = true;
        out.push({ en: w.en, ru: w.ru });
      });
    }
    return out;
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
  /**
   * 2.7.0: в промпт урока уходят ВСЕ открытые долги дорожки — окно из пяти
   * FIFO заменено доской по категориям (ТЗ 4.2). Порядок — тот же, что у
   * пометки ПРИОРИТЕТ, чтобы «Засчитано» и внимание смотрели в одну сторону.
   */
  function promptDebts(trackId) {
    var prio = priorityDebts(trackId);
    var rest = openDebts(boardTrack(trackId)).filter(function (d) { return prio.indexOf(d) < 0; });
    return prio.concat(rest);
  }

  /** Разминка: до трёх долгов, тем же правилом внимания (ТЗ 4.5). */
  function warmupDebts() { return priorityDebts(null).slice(0, WARMUP_DEBTS); }


  /* ---------- 2.7.0: долги для промпта (ТЗ 4.2, блок 6) ---------- */

  var PROMPT_PRIORITY = 3;      // столько долгов получают пометку ПРИОРИТЕТ

  /** Категории, по которым строится доска долгов дорожки. */
  function promptCats(trackId) {
    return trackHasCats(trackId) ? catsForTrack(trackId) : DEBT_CATS.slice();
  }

  /**
   * Дорожка для доски долгов. У дорожки без своих категорий (сейчас только cs)
   * долги ложатся под префикс кода — в письмо и математику (см. создание долга
   * в applySummary). Спросить доску по 'cs' значило бы всегда получить «чисто»:
   * категории печатаются все, а долги к ним не приходят, и промпт требует
   * два долга ПРИОРИТЕТ, которых нет. С 2.7.3 это стало достижимо: ДЗ-урок
   * по ICS3UE идёт по дорожке cs.
   */
  function boardTrack(trackId) {
    return trackHasCats(trackId) ? trackId : 'all';
  }

  /**
   * Порядок внимания: сначала долги на «1/2» — им остался один урок до
   * закрытия, потом давно не показывавшиеся. Пометку получают первые три.
   */
  function priorityDebts(trackId) {
    function older(a, b) {
      var x = a.lastInjected || '', y = b.lastInjected || '';
      if (x !== y) return x < y ? -1 : 1;
      var sa = a.shownCount || 0, sb = b.shownCount || 0;
      if (sa !== sb) return sa - sb;
      return 0;
    }
    var open = openDebts(boardTrack(trackId));
    var half = open.filter(function (d) { return debtProgress(d) === 1; }).sort(older);
    var rest = open.filter(function (d) { return debtProgress(d) !== 1; }).sort(older);
    return half.concat(rest).slice(0, PROMPT_PRIORITY);
  }

  /**
   * Доска долгов дорожки: по строке на КАЖДУЮ категорию таксономии — и на
   * открытую, и на чистую. Так преподаватель видит всю карту, а не окно из
   * пяти FIFO, и не может завести долг вне списка.
   * → [{ cat, name, debt, priority }]
   */
  function debtBoard(trackId) {
    var open = openDebts(boardTrack(trackId));
    var byCat = {};
    open.forEach(function (d) { if (d.cat) byCat[d.cat] = d; });
    var prio = {};
    priorityDebts(trackId).forEach(function (d) { prio[d.did] = true; });
    return promptCats(trackId).map(function (c) {
      var d = byCat[c.code] || null;
      return { cat: c.code, name: c.name, debt: d, priority: !!(d && prio[d.did]) };
    });
  }

  /** Последний пример ошибки долга или null. */
  function lastExample(d) {
    var list = (d && d.examples) || [];
    return list.length ? list[list.length - 1] : null;
  }

  function debtKey(d) { return (d && (d.did || d.id)) || null; }

  /**
   * Запоминает, какие долги ушли в промпт. lessonId = null → разминка.
   * Перезаписывается каждым копированием: в работе список из последнего промпта.
   */
  function markInjectedDebts(lessonId, debts, opts) {
    var date = (opts && opts.date) || today();
    var ids = (debts || []).map(debtKey).filter(Boolean);
    // 2.7.0: отметку показа получают только долги с пометкой ПРИОРИТЕТ —
    // те, что реально пошли в работу. Если метить всю доску, «давно не
    // показывавшиеся» совпадут у всех и ротация внимания умрёт.
    var prio = {};
    priorityDebts(lessonId ? lessonTrack(lessonId) : null).forEach(function (d) {
      prio[d.did] = true;
    });
    (debts || []).forEach(function (d) {
      if (!d || !d.did || !prio[d.did]) return;
      d.lastInjected = date;
      d.shownCount = (d.shownCount || 0) + 1;
    });
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


  /* ---------- 2.7.0: разбор строк ИТОГа (ТЗ 2.2) ---------- */

  /**
   * Строка долга обязана начинаться с кода категории: «П3 — пример ошибки».
   * Это и есть корень пакета: ИИ не изобретает, чем ученик болен, а выбирает
   * из закрытого списка. Строка без валидного кода отбрасывается.
   */
  var DEBT_LINE_RE = /^\s*(П\d{1,2}|М\d|О\d|Б\d)\s*[—–-]\s*(.+)$/;

  /**
   * Латинские двойники кириллицы в кодах. «M2» и «М2» неотличимы на глаз,
   * и написанный латиницей код стоил бы ученику потерянного долга.
   */
  function normCode(line) {
    return String(line || '')
      .replace(/^(\s*)M(?=\d)/, '$1М')
      .replace(/^(\s*)O(?=\d)/, '$1О')
      .replace(/^(\s*)P(?=\d)/, '$1П')
      .replace(/^(\s*)B(?=\d)/, '$1Б');
  }

  /** Разбор строки долга → { code, example } или null. */
  function parseDebtLine(line) {
    var m = DEBT_LINE_RE.exec(normCode(U.stripDebtId(line)));
    if (!m) return null;
    var example = String(m[2]).trim();
    return example ? { code: m[1], example: example } : null;
  }

  /** Пять пунктов чек-листа языка: правка статистики на +1 или −1. */
  function applyChecklist(marks, sign) {
    if (!Array.isArray(marks) || !marks.length) return;
    var st = s.checklist.stats;
    marks.forEach(function (clean, i) {
      var rec = st[i] || (st[i] = { clean: 0, total: 0 });
      rec.total += sign;
      if (clean) rec.clean += sign;
      if (rec.total < 0) rec.total = 0;
      if (rec.clean < 0) rec.clean = 0;
    });
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
    var closeDay = date;                  // день, которым закрывают ИТОГ
    var hwp = parseHwId(lessonId);
    // 2.8.0 (A5): ДЗ-урок закрывается днём самого ДЗ (дата — в его id) и с его
    // курсом: ИТОГ ДЗ другого дня, вставленный по id, закрывал день шторки с
    // курсом null. Норму закрывает ДЗ-урок своего дня, а не сегодняшний
    if (hwp) date = hwp.date;
    var l = hwp ? null : (window.CONTENT ? CONTENT.lesson(lessonId) : null);
    if (!l && !hwp) return { ok: false, error: 'Урок не найден' };
    var trackId = lessonTrack(lessonId);

    var wasDone;
    if (hwp) {
      // ДЗ-урок живёт в своём хранилище: программный урок он не закрывает
      var H = s.hw[lessonId] || (s.hw[lessonId] = { date: date, course: null, track: hwp.track });
      wasDone = !!H.score || H.score === 0;
      H.date = date;
      H.track = hwp.track;
      H.course = opts.course || H.course || ((day(date) || {}).hwCourse || null);
      H.score = parsed.score;
      H.level = parsed.level;
    } else {
      var L = s.lessons[lessonId] || (s.lessons[lessonId] = { done: false, score: null, date: null });
      wasDone = L.done;
      L.done = true;
      L.score = parsed.score;
      L.date = date;
    }

    // 2.8.1 (B2): ДЗ-урок прошлого дня — запись, слова и долги ложатся в его
    // день, но уровень, очки и серия того дня не меняются: задним числом
    // день без урока не становится днём с уроком (вопрос 25)
    var pastHw = !!hwp && date < closeDay;
    if (!pastHw) {
      var d = day(date, true);
      if (d.lessons.indexOf(lessonId) < 0) d.lessons.push(lessonId);
      recount(date);
    }

    var record = {
      lessonId: lessonId, date: date, raw: parsed.raw || '',
      parsed: {
        score: parsed.score, level: parsed.level, topics: parsed.topics,
        words: parsed.words || [], debts: parsed.debts || [],
        warmup: parsed.warmup || [], writing: parsed.writing || '',
        checklist: parsed.checklist || null,
        stretch: parsed.stretch == null ? null : !!parsed.stretch
      }
    };
    var at = -1;
    for (var i = s.summaries.length - 1; i >= 0; i--) {
      if (s.summaries[i].lessonId === lessonId && s.summaries[i].date === date) { at = i; break; }
    }
    var replaced = at >= 0;
    // повторная вставка не должна удваивать статистику чек-листа:
    // сначала снимаем вклад прежней записи, потом кладём новый
    if (replaced) applyChecklist(((s.summaries[at] || {}).parsed || {}).checklist, -1);
    applyChecklist(parsed.checklist, 1);
    // тот же приём для стретча: повторная вставка итога счётчик не двигает
    if (replaced && ((s.summaries[at] || {}).parsed || {}).stretch === true) s.stats.stretchDone--;
    if (parsed.stretch === true) s.stats.stretchDone = (s.stats.stretchDone || 0) + 1;
    if (s.stats.stretchDone < 0) s.stats.stretchDone = 0;
    var oldWords = replaced ? (((s.summaries[at] || {}).parsed || {}).words || []) : [];
    if (replaced) s.summaries[at] = record;
    else s.summaries.push(record);
    var wordsAdded = enrollWords(s.srs, record.parsed.words);
    // «Итог ещё раз» с исправленным списком: слово, которое было только в
    // заменённой записи и ни разу не оценивалось, из SRS уходит — иначе оно
    // навсегда в счётчике, а в колоду не попадёт (колода строится из итогов)
    dropOrphanWords(oldWords);

    if (!wasDone) s.stats.lessonsDone = (s.stats.lessonsDone || 0) + 1;

    // 2.7.0 (ТЗ 2.2). Долг приходит только с кодом категории; категория,
    // у которой уже есть открытый долг, даёт повтор, а не второй долг —
    // так дубли и умирают. Строка без валидного кода отбрасывается.
    var created = [], repeated = [], dropped = [], cutNew = 0;
    var NEW_CAP = 3;
    (parsed.debts || []).forEach(function (line) {
      var parsedLine = parseDebtLine(line);
      if (!parsedLine) { dropped.push({ line: line, why: 'нет кода категории' }); return; }
      var code = parsedLine.code, example = parsedLine.example;
      if (!catFitsTrack(code, trackId)) {
        dropped.push({ line: line, why: debtCat(code) ? 'код чужой дорожки' : 'кода нет в таксономии' });
        return;
      }

      var open = null;
      s.debts.forEach(function (d) { if (d.status === 'open' && d.cat === code) open = d; });
      if (open) {
        // тот же урок его и завёл, или повтор уже учтён — это повторная
        // вставка того же итога, а не вторая ошибка
        if (open.createdIn === lessonId || open.failedIn.indexOf(lessonId) >= 0) return;
        open.clearedIn = [];
        open.failedIn.push(lessonId);
        open.examples.push({ lesson: lessonId, text: example, date: date });
        repeated.push(open);
        return;
      }

      if (created.length >= NEW_CAP) { cutNew++; return; }
      var cat = debtCat(code);
      var debt = {
        id: U.uid(), did: nextDebtId(), cat: code,
        // где у дорожки своих категорий нет (all, biz), дорожку долга задаёт
        // префикс кода: П → письмо, М/О → математика
        track: trackHasCats(trackId) ? trackId : cat.track,
        text: cat.name + ' — ' + example,
        createdIn: lessonId, clearedIn: [],
        examples: [{ lesson: lessonId, text: example, date: date }],
        failedIn: [], lastInjected: null, shownCount: 0,
        status: 'open'
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
      // повтор побеждает: категория, названная в «Долгах» этого же итога,
      // не может быть тут же и засчитана
      if (repeated.indexOf(debt) >= 0) { unmatched.push(text); return; }
      if (debt.clearedIn.indexOf(lessonId) < 0) debt.clearedIn.push(lessonId);
      // две строки итога могли смэтчиться в один долг — считаем его один раз
      if (cleared.indexOf(debt) < 0) cleared.push(debt);
      if (uniqueLessons(debt.clearedIn).length >= 2 && debt.status === 'open') {
        debt.status = 'closed';
        debt.closedDate = date;
        closed.push(debt);
      }
    });

    // 2.7.6 (Э4): счётчик слов — число ключей SRS; повторная вставка того же
    // итога ключей не плодит, поэтому и счётчик не удваивается
    countWords(s);

    touchTrack(trackId, date);
    if (l) refreshBlockDone(l.blockId);
    touch();

    // строки событий для уведомления (ТЗ 2.2). Порядок как в ТЗ:
    // засчитанное → повторы → новые → отброшенное
    var notices = [];
    cleared.forEach(function (d) {
      notices.push(d.did + ': ' + debtProgress(d) + '/2' +
        (d.status === 'closed' ? ' → закрыт' : ''));
    });
    repeated.forEach(function (d) {
      notices.push('повтор ' + d.did + ' (' + d.cat + ') — прогресс сброшен');
    });
    created.forEach(function (d) { notices.push('новый долг ' + d.did + ' (' + d.cat + ')'); });
    dropped.forEach(function (x) {
      notices.push('долг без категории отброшен: ' + x.line + ' (' + x.why + ')');
    });
    if (cutNew) notices.push('сверх трёх новых долгов за урок отрезано: ' + cutNew);

    return {
      ok: true, lessonId: lessonId, score: parsed.score, replaced: replaced,
      words: (parsed.words || []).length, wordsAdded: wordsAdded,
      created: created.length, cleared: cleared.length, closed: closed.length,
      repeated: repeated.length, dropped: dropped, cutNew: cutNew,
      unmatched: unmatched, foreign: foreign, notices: notices
    };
  }

  /**
   * Разминка пишет в приложение (ТЗ 2.3). Строка вида
   * «РАЗМИНКА: D-1 ✓ D-10 ✗ · слова 15/15».
   *  ✓ — только ПЕРВОЕ касание и только если долг был в промпте разминки:
   *      закрывающее касание даёт лишь урок;
   *  ✗ — уходит в failedIn с пометкой warmup, прогресс не сбрасывает.
   * Слова не трогаем — их ведёт SRS.
   */
  function applyWarmup(parsed, opts) {
    opts = opts || {};
    var date = opts.date || today();
    var stamp = 'warmup:' + date;
    var pool = s.injected.min || [];
    var touched = [], failed = [], skipped = [], notices = [];

    (parsed.marks || []).forEach(function (mk) {
      var debt = null;
      s.debts.forEach(function (d) { if (d.did === mk.did && d.status === 'open') debt = d; });
      if (!debt) { skipped.push(mk.did); notices.push(mk.did + ': открытого долга с таким id нет'); return; }

      if (!mk.ok) {
        if (debt.failedIn.indexOf(stamp) < 0) debt.failedIn.push(stamp);
        failed.push(debt.did);
        notices.push(debt.did + ': не отработан в разминке — прогресс остался ' + debtProgress(debt) + '/2');
        return;
      }
      if (pool.indexOf(mk.did) < 0) {
        skipped.push(debt.did);
        notices.push(debt.did + ': его не было в промпте разминки — не засчитан');
        return;
      }
      if (uniqueLessons(debt.clearedIn).length) {
        notices.push(debt.did + ': касание уже есть — закрыть может только урок');
        return;
      }
      debt.clearedIn = [stamp];
      touched.push(debt.did);
      notices.push(debt.did + ': 1/2 (разминка)');
    });

    touch();
    return {
      ok: true, date: date, touched: touched, failed: failed,
      skipped: skipped, words: parsed.words || null, notices: notices
    };
  }

  /** Сколько ⭐⭐ взято за всё время. */
  function stretchCount() { return (s.stats && s.stats.stretchDone) || 0; }

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
    migrate: migrate, repairDebts: repairDebts, repairWords: repairWords,
    WORD_FIXES: WORD_FIXES, validateImport: validateImport,
    DEBT_CATS: DEBT_CATS, debtCat: debtCat, catsForTrack: catsForTrack,
    catTrack: catTrack, catFitsTrack: catFitsTrack, trackHasCats: trackHasCats,
    boardTrack: boardTrack,
    migrationReport: function () { return lastV3; },
    migrationReport276: function () { return lastMig276; }, MIG_276: MIG_276, isM3Card: isM3Card,
    migrationReport277: function () { return lastMig277; }, MIG_277: MIG_277, MIG_277_TODO: MIG_277_TODO,
    migrationReport278: function () { return lastMig278; }, MIG_278: MIG_278, QUASI_278: QUASI_278,
    M2_EVENTS: M2_EVENTS, M3_ITEMS: M3_ITEMS, M4_TODOS: M4_TODOS,
    holdsStreak: holdsStreak, streakPoints: streakPoints, bumpBestStreak: bumpBestStreak,
    subscribe: subscribe, emit: emit,
    applyAutoMode: applyAutoMode, mode: mode, isSchool: isSchool, setMode: setMode, lessonMode: lessonMode,
    today: today, day: day, points: points, recount: recount,
    setLevel: setLevel, toggleAddon: toggleAddon,
    planOf: planOf, achievedLevel: achievedLevel, LEVEL_RANK: LEVEL_RANK,
    streak: streak, emptyInRow: emptyInRow, weekPoints: weekPoints, rank: rank, nextRank: nextRank,
    track: track, trackName: trackName,
    phases: phases, phaseName: phaseName, currentPhase: currentPhase,
    syncContent: syncContent, spreadDeadlines: spreadDeadlines,
    block: block, blockLessons: blockLessons, blockProgress: blockProgress,
    blockPace: blockPace, refreshBlockDone: refreshBlockDone,
    setDeadline: setDeadline, shiftPhase: shiftPhase, phaseBlocks: phaseBlocks,
    lessonLabel: lessonLabel,
    stageName: stageName, stageParams: stageParams, setStage: setStage,
    readyForNextStage: readyForNextStage, nextStageOffer: nextStageOffer,
    blockNum: blockNum, blockLabel: blockLabel, lessonNum: lessonNum,
    lessonTrack: lessonTrack, nextLessonInTrack: nextLessonInTrack, nextLesson: nextLesson,
    nextContestLesson: nextContestLesson, contestBlockId: contestBlockId, saturdayContestLesson: saturdayContestLesson,
    saturdayContestCount: saturdayContestCount,
    freshness: freshness, hasTrackHistory: hasTrackHistory, touchTrack: touchTrack,
    markVideoWatched: markVideoWatched, videoWatched: videoWatched,
    markPromptCopied: markPromptCopied, promptCopied: promptCopied,
    recentSummaries: recentSummaries, wordBank: wordBank, oldestWords: oldestWords,
    warmupWords: warmupWords,
    applyWarmup: applyWarmup, parseDebtLine: parseDebtLine, stretchCount: stretchCount,
    SCHOOL_COURSES: SCHOOL_COURSES, HW_WEEK_CAP: HW_WEEK_CAP,
    schoolCourses: schoolCourses, schoolCourse: schoolCourse,
    hwId: hwId, parseHwId: parseHwId, isHw: isHw, hwWeekCount: hwWeekCount,
    hwAvailable: hwAvailable, startHw: startHw, hwOfDay: hwOfDay,
    debtBoard: debtBoard, priorityDebts: priorityDebts, lastExample: lastExample,
    promptCats: promptCats, PROMPT_PRIORITY: PROMPT_PRIORITY,
    deckPlan: deckPlan, deckDone: deckDone, deckCursor: deckCursor,
    cardsStep: cardsStep, CARDS_STEP: CARDS_STEP, autoCardsStep: autoCardsStep,
    setDeckCursor: setDeckCursor, DECK_CAP: DECK_CAP, DECK_DEBTS: DECK_DEBTS, DECK_FRESH: DECK_FRESH,
    recentWords: recentWords, lastLessonWords: lastLessonWords,
    openDebts: openDebts, debtsCount: debtsCount,
    SRS_INTERVALS: SRS_INTERVALS, SRS_TO_KNOWN: SRS_TO_KNOWN,
    wordStatus: wordStatus, wordResting: wordResting, gradeWord: gradeWord,
    activeWords: activeWords, wordCounts: wordCounts, lessonWords: lessonWords,
    enrollWords: enrollWords, countWords: countWords, wordsTotal: wordsTotal,
    matchDebt: matchDebt, matchDebtIn: matchDebtIn,
    debtProgress: debtProgress, similarity: similarity,
    promptDebts: promptDebts, warmupDebts: warmupDebts,
    markInjectedDebts: markInjectedDebts, injectedDebts: injectedDebts,
    injectedPool: injectedPool,
    nextDebtId: nextDebtId, applySummary: applySummary,
    ifThenOfDay: ifThenOfDay
  };
})();
