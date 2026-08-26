/* ============================================================
   content/phase0.js — Фаза 0 «Фундамент», Б1–Б6, 24 урока.
   Источник: раздел 9.2 ТЗ. Формат записи урока:
   тема · цель · YouTube-запрос · фокус практики · письмо.

   Релиз 2.6.0 сжал фазу: девять уроков помечены skipped: true — до
   placement-теста и школы 08.09 их уже не успеть, и тянуть их значит
   провалить дедлайны остальных. Skipped-урок невидим для водопада,
   не входит в прогресс блока и не мешает блоку закрыться.
   ============================================================ */

/* Пакет регистрируется сам: если реестр ещё не загрузился, кладём его
   в очередь — порядок тегов <script> в index.html значения не имеет. */
(function (pack) {
  if (window.CONTENT) CONTENT.register(pack);
  else (window.__CONTENT_Q = window.__CONTENT_Q || []).push(pack);
})({
  phase: 'p0',
  blocks: [

    {
      id: 'B1', track: 'write', title: 'Язык учёбы и абзац', deadline: '2026-08-29',
      lessons: [
        {
          title: 'Команды заданий',
          goal: 'понимать любую формулировку задания',
          youtube: 'exam command words explained',
          focus: 'тренажёр инструкций: solve/simplify/evaluate/expand/factor/justify/estimate/sketch/label + due date/rubric/submit/late penalty; смена ролей (студент объясняет ИИ)',
          writing: '5 предложений «мой план на первый день школы»'
        },
        {
          title: 'Абзац PEEL',
          goal: 'писать структурный абзац',
          youtube: 'PEEL paragraph writing',
          focus: 'Point→Evidence→Explain→Link, связки however/therefore/for example/in addition, разбор образца',
          writing: 'абзац "Why I want to study business" + чистовик'
        },
        {
          title: 'Математика по-английски',
          goal: 'проговаривать решение',
          youtube: 'Khan Academy "solving linear equations"',
          focus: 'словарь fraction/numerator/denominator/exponent/square root/isolate/substitute; 8 перемешанных задач (уравнения+дроби+проценты) с проговором каждого шага',
          writing: 'письменное объяснение одного решения 5–8 предложений'
        },
        {
          title: 'Повтор + мини-тест Б1',
          goal: 'порог 80%',
          youtube: null,
          focus: 'смешанный тест: 5 команд, 1 абзац, 4 задачи с проговором; ошибки → долги',
          writing: null
        }
      ]
    },

    {
      id: 'B2', track: 'math', title: 'Линейные уравнения и системы', deadline: '2026-08-27',
      lessons: [
        {
          title: 'Прямая и наклон',
          goal: 'y=mx+b свободно',
          youtube: 'Khan "slope intercept form"',
          focus: 'slope/y-intercept/rate of change; построение и чтение прямых',
          writing: 'объяснение, что такое slope, своими словами'
        },
        {
          title: 'Системы уравнений',
          goal: 'решать двумя способами',
          youtube: 'Khan "systems of equations substitution elimination"',
          focus: 'substitution vs elimination, выбор метода; перемешанные системы',
          writing: 'план решения одной системы по-английски'
        },
        {
          title: 'Текстовые задачи',
          goal: 'переводить слова в уравнения',
          youtube: 'linear equations word problems',
          focus: 'перевод условий (per/each/total/difference), 6 задач вперемешку',
          writing: 'решение одной word problem с объяснением'
        },
        {
          title: 'Повтор + мини-тест Б2',
          goal: '80%',
          youtube: null,
          focus: 'прямые+системы+word problems вперемешку',
          writing: null
        }
      ]
    },

    {
      id: 'B3', track: 'write', title: 'Чтение и письмо OSSLT', deadline: '2026-09-01',
      lessons: [
        {
          title: 'Информационный текст',
          goal: 'главная мысль и детали',
          youtube: 'finding main idea',
          focus: 'main idea vs supporting details; текст с CommonLit, вопросы',
          writing: '3 предложения: главная мысль текста своими словами'
        },
        {
          skipped: true,
          title: 'Новостная заметка',
          goal: 'структура и факт/мнение',
          youtube: 'news report structure',
          focus: 'headline/lead/5W; fact vs opinion',
          writing: 'короткая заметка о своём дне по структуре'
        },
        {
          title: 'Абзац-мнение',
          goal: 'формат OSSLT',
          youtube: 'opinion paragraph OSSLT',
          focus: 'I believe... because... + evidence; связки',
          writing: 'абзац-мнение на школьную тему + чистовик'
        },
        {
          skipped: true,
          title: 'Мини-OSSLT',
          goal: 'примерка формата',
          youtube: 'сайт EQAO, пробник',
          focus: 'чтение+2 письменных задания из пробника; разбор по критериям',
          writing: null
        }
      ]
    },

    {
      id: 'B4', track: 'math', title: 'Квадратичные функции', deadline: '2026-09-03',
      lessons: [
        {
          title: 'Раскрытие и разложение',
          goal: 'expand/factor свободно',
          youtube: 'Khan "factoring quadratics"',
          focus: 'FOIL, common factor, trinomials; перемешанные 10 заданий',
          writing: 'объяснение одного разложения'
        },
        {
          skipped: true,
          title: 'Парабола',
          goal: 'читать график',
          youtube: 'Khan "graphing parabolas vertex"',
          focus: 'parabola/vertex/axis of symmetry/zeros; график↔формула↔таблица↔словами',
          writing: 'описание параболы по-английски (4 представления)'
        },
        {
          title: 'Решение уравнений',
          goal: 'два метода',
          youtube: 'Khan "solving quadratics"',
          focus: 'факторизация и квадратная формула; word problems (мяч, площадь)',
          writing: 'решение одной задачи «как для учителя»'
        },
        {
          skipped: true,
          title: 'Повтор + мини-тест Б4',
          goal: '80%',
          youtube: null,
          focus: 'всё вперемешку + 1 перенос',
          writing: null
        }
      ]
    },

    {
      id: 'B5', track: 'biz', title: 'Маркетинг и речь в классе', deadline: '2026-09-04',
      lessons: [
        {
          skipped: true,
          title: '4P',
          goal: 'словарь маркетинга',
          youtube: 'marketing mix 4Ps explained',
          focus: 'product/price/place/promotion, brand; разбор знакомого бренда',
          writing: 'абзац: 4P любимого продукта'
        },
        {
          skipped: true,
          title: 'Рынок и покупатель',
          goal: 'база исследований',
          youtube: 'target market consumer behaviour basics',
          focus: 'target market, market research, needs vs wants; мини-кейс',
          writing: '5 предложений: кто целевая аудитория твоего проекта'
        },
        {
          title: 'Речь в классе',
          goal: 'говорить и спрашивать',
          youtube: 'classroom phrases asking questions presentation',
          focus: 'вопросы учителю, фразы презентации; 60-сек питч проекта вслух',
          writing: 'тезисы питча (5 строк)'
        },
        {
          skipped: true,
          title: 'Повтор + питч-финал Б5',
          goal: '80% + питч 60 сек без бумажки',
          youtube: null,
          focus: 'словарный тест вперемешку + питч',
          writing: null
        }
      ]
    },

    {
      id: 'B6', track: 'math', title: 'Тригонометрия + генеральный', deadline: '2026-09-07',
      lessons: [
        {
          title: 'Отношения в треугольнике',
          goal: 'sin/cos/tan',
          youtube: 'Khan "basic trigonometry sohcahtoa"',
          focus: 'hypotenuse/opposite/adjacent, SOH-CAH-TOA; 8 задач; ' +
            '⭐ CEMC-стиль (опционально, в самом конце): в прямоугольном треугольнике ' +
            'катеты относятся как 3:4, а гипотенуза равна 20 — найди периметр и объясни, ' +
            'почему ответ не зависит от того, какой катет назвать первым',
          writing: 'объяснение выбора отношения в одной задаче'
        },
        {
          title: 'Решение треугольников',
          goal: 'применять',
          youtube: 'right triangle word problems',
          focus: 'лестница/тень/высота; калькулятор в degree mode; ' +
            '⭐ CEMC-стиль (опционально, в самом конце): лестница длиной 5 м стоит под углом 70° ' +
            'к земле; её нижний конец отодвинули на 1 м — на сколько опустился верхний? ' +
            'Сначала прикинь знак и порядок ответа, потом считай',
          writing: 'решение одной задачи с объяснением'
        },
        {
          skipped: true,
          title: 'Генеральный повтор',
          goal: 'связать всё',
          youtube: null,
          focus: 'марафон вперемешку по Б1–Б5 (15 заданий), долги в приоритете',
          writing: null
        },
        {
          skipped: true,
          title: 'Финальный экзамен Ф0',
          goal: 'зафиксировать уровень',
          youtube: null,
          focus: 'большой смешанный тест: все дорожки + письмо (абзац) + питч; отчёт по фазе; переход в режим «Школа»',
          writing: null
        }
      ]
    }

  ]
});
