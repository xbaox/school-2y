/* ============================================================
   content/phase1.js — Фаза 1 «Семестр 1», Б7–Б16 + блок К (субботы).
   Пакет v2.7.0 «Корень». Заменяет каркас 2.6.0 целиком.

   Формат урока (ТЗ v2.7.0, этап 3.1):
     title, goal, youtube, focus, writing        — как в phase0.js
     terms   — ключи content/glossary.js (или инлайн {en, ru, def, ex, non})
     text    — текст для чтения / условие большой задачи, или null
     tasks   — опорные задания: Б7–Б8 — 4 уровня L1–L2 + 1 стретч L3;
               с 2.8.0 — 5 заданий основы L2 + 1 стретч L3
               { q, ru, marks, level, key, probe }  (probe — код категории долга;
               ru и probe необязательны: в 2.8.0 задания только по-английски)
               null = задания придут следующим пакетом контента
     words   — слова урока [{ en, ru }] (с 2.8.0)
     type: 'contest' — субботний урок: 3 задачи { part, q, ru, marks, key }

   Заполнено сейчас: Б7, Б8 (все поля), К.1–К.3; пакет 2.8.0 — Б9, К.4–К.6.
   Б10–Б16 и К.7–К.10 — структура; tasks/text/terms приедут:
     2.8.0б: Б10 (материалы OSSLT)
     2.8.1: Б11–Б16, К.7–К.10
   Все тексты для чтения написаны для урока; цифры в них условные.
   ============================================================ */

(function (pack) {
  if (window.CONTENT) CONTENT.register(pack);
  else (window.__CONTENT_Q = window.__CONTENT_Q || []).push(pack);
})({
  phase: 'p1',
  blocks: [

    /* ================= Б7 · математика ================= */
    {
      id: 'B7', track: 'math', title: 'Многочлены-1: язык функций, преобразования, графики, деление', deadline: '2026-09-20',
      note: 'Поддержка MHF4U (Advanced Functions — продвинутые функции, 12 класс), первые недели курса.',
      lessons: [
        {
          title: 'Язык функций: f(x), область, степень, концы графика',
          goal: 'читать и писать функции по-английски; степень, старший коэффициент, поведение на концах',
          youtube: 'polynomial functions end behavior degree leading coefficient',
          focus: 'function notation f(x); domain и range в записи Онтарио {x ∈ R | …}; degree, leading coefficient; end behaviour степенных функций xⁿ: чётная/нечётная степень, знак a',
          writing: '3 предложения по-английски: описать end behaviour функции f(x) = −2x³ + x, используя слова degree, leading coefficient, end behaviour',
          terms: ['function notation', 'domain', 'range', 'degree', 'leading coefficient', 'end behaviour'],
          text: null,
          tasks: [
            { level: 'L1', marks: 1, probe: 'М3',
              q: 'f(x) = 2x² − 3x + 1. Find f(−2).',
              ru: 'Найди f(−2). Запиши подстановку, не только ответ.',
              key: 'f(−2) = 2(4) − 3(−2) + 1 = 8 + 6 + 1 = 15. Ответ 15. Балл за верное значение с показанной подстановкой.' },
            { level: 'L2', marks: 2, probe: 'М1',
              q: 'State the degree and the leading coefficient of p(x) = 5x − 4x⁴ + x². [2 marks]',
              ru: 'Назови степень и старший коэффициент. Команда state — без объяснений.',
              key: 'degree 4 (1 mark); leading coefficient −4 (1 mark). Ловушка: слагаемые не по порядку; старший — тот, где x⁴. Объяснение сверх state не штрафуется, но и не нужно.' },
            { level: 'L2', marks: 2, probe: 'М5',
              q: 'Describe the end behaviour of f(x) = −x³ + 2x. Use the form "as x → …, f(x) → …".',
              ru: 'Опиши поведение на концах в форме «as x → …, f(x) → …». Оба конца.',
              key: 'as x → −∞, f(x) → +∞ (1); as x → +∞, f(x) → −∞ (1). Причина: нечётная степень, старший коэффициент отрицательный. Один конец — 1 балл.' },
            { level: 'L2', marks: 2, probe: 'М3',
              q: 'State the domain and the range of g(x) = x² + 3. Use set notation. [2 marks]',
              ru: 'Область определения и область значений в записи множеств {x ∈ R | …}.',
              key: 'domain {x ∈ R} (1); range {y ∈ R | y ≥ 3} (1). «Все числа» словами — принять с мелочью про запись; y > 3 (строго) — минус балл.' },
            { level: 'L3', marks: 3, probe: 'М8',
              q: 'A polynomial function has degree 3 and its graph goes from the top-left to the bottom-right. Is the leading coefficient positive or negative? Justify in two sentences, then give one example of such a function.',
              ru: '⭐ По желанию. Степень 3, график идёт из левого верха в правый низ. Знак старшего коэффициента? Обоснуй двумя предложениями и приведи пример.',
              key: 'negative (1); нечётная степень → концы в разные стороны, вправо вниз ⇒ a < 0 (1); пример f(x) = −x³ или любое −ax³ + … (1).' }
          ]
        },
        {
          title: 'Преобразования графиков и обратные функции',
          goal: '(x + 2)² против x² + 2; y = a·f(k(x − d)) + c; обратная функция через перестановку x и y',
          youtube: 'transformations of functions shifts reflections stretches; inverse functions',
          focus: 'y = a·f(k(x − d)) + c: горизонтальный/вертикальный сдвиг, отражение, растяжение/сжатие; порядок преобразований; inverse: swap x and y, solve for y; ограничение области',
          writing: '3–4 предложения по-английски: объясни разницу между y = (x + 2)² и y = x² + 2 (horizontal shift left 2 vs vertical shift up 2), с эталонной терминологией',
          terms: ['translation', 'vertical stretch', 'reflection', 'inverse function'],
          text: null,
          tasks: [
            { level: 'L1', marks: 1, probe: 'М1',
              q: 'The graph of y = x² is shifted 2 units to the left. Write the equation of the new graph.',
              ru: 'График y = x² сдвинули на 2 влево. Запиши уравнение.',
              key: 'y = (x + 2)². Частая ошибка: (x − 2)². Балл только за верный знак.' },
            { level: 'L2', marks: 2, probe: 'М5',
              q: 'Describe, in order, how the graph of y = x² becomes y = −(x − 1)² + 4. Name each transformation.',
              ru: 'Опиши по порядку, как из y = x² получается y = −(x − 1)² + 4. Назови каждое преобразование словами.',
              key: 'reflection in the x-axis; shift right 1; shift up 4 (порядок: сдвиг вправо 1 → отражение → вверх 4, либо отражение первым — оба принять). Все три названы (1), направления верные (1). Вершина (1, 4).' },
            { level: 'L2', marks: 2, probe: 'М2',
              q: 'f(x) = 3x − 6. Find f⁻¹(x). Show the step where you swap x and y.',
              ru: 'Найди обратную функцию. Обязательно покажи шаг перестановки x и y.',
              key: 'y = 3x − 6 → x = 3y − 6 → 3y = x + 6 → y = (x + 6)/3. f⁻¹(x) = (x + 6)/3 = x/3 + 2. Шаг перестановки показан (1), результат (1). Без шага — только 1.' },
            { level: 'L2', marks: 2, probe: 'М8',
              q: 'The point (2, 5) lies on the graph of y = f(x). State the corresponding point on (a) y = f(x − 3) + 1 and (b) y = f⁻¹(x). [2 marks]',
              ru: 'Точка (2, 5) на графике f. Назови соответствующую точку (а) на y = f(x − 3) + 1, (б) на графике обратной функции. Обе части!',
              key: '(a) (5, 6): x + 3, y + 1 (1). (b) (5, 2): координаты меняются местами (1). Проверка М8: обе части отвечены.' },
            { level: 'L3', marks: 3, probe: 'М5',
              q: 'g(x) = x² for x ≥ 0. Find g⁻¹(x), state its domain, and explain in one sentence why the restriction x ≥ 0 was needed.',
              ru: '⭐ По желанию. Найди обратную к g(x) = x² при x ≥ 0, укажи её область определения и объясни одним предложением, зачем понадобилось ограничение.',
              key: 'g⁻¹(x) = √x (1); domain {x ∈ R | x ≥ 0} (1); без ограничения x² не взаимно однозначна (fails the horizontal line test), обратной функции не было бы (1).' }
          ]
        },
        {
          title: 'Графики многочленов: нули, кратность, набросок',
          goal: 'по разложению нарисовать график; по графику написать уравнение',
          youtube: 'graphing polynomial functions zeros multiplicity end behavior',
          focus: 'zeros из разложения; multiplicity (order) 1/2/3 → crosses / bounces / flattens; end behaviour; набросок; уравнение по графику через точку для a',
          writing: '3 предложения по-английски: описать график f(x) = (x − 1)²(x + 3) по шагам: zeros, что график делает у каждого нуля, end behaviour',
          terms: ['zero', 'multiplicity', 'turning point', 'polynomial function'],
          text: null,
          tasks: [
            { level: 'L1', marks: 1, probe: 'М3',
              q: 'State the zeros of f(x) = (x + 4)(x − 2)(x − 5).',
              ru: 'Назови нули функции.',
              key: '−4, 2, 5. Ловушка: знаки. Все три — 1 балл.' },
            { level: 'L2', marks: 2, probe: 'М8',
              q: 'For f(x) = (x − 1)²(x + 3): state the order of each zero and describe what the graph does at each zero.',
              ru: 'Для каждого нуля: кратность и что делает график (пересекает / касается).',
              key: 'x = 1: order 2, graph bounces (touches) (1); x = −3: order 1, graph crosses (1).' },
            { level: 'L2', marks: 3, probe: 'М2',
              q: 'Sketch f(x) = −(x + 2)(x − 1)². Mark the zeros, the y-intercept and show the end behaviour. Send a photo.',
              ru: 'Набросок на бумаге: нули, пересечение с осью y, поведение на концах. Фото в чат.',
              key: 'zeros −2 (crosses), 1 (bounces) (1); y-intercept f(0) = −(2)(1) = −2 → (0, −2) (1); степень 3, старший коэффициент −1: as x → −∞, f → +∞; as x → +∞, f → −∞ (1).' },
            { level: 'L2', marks: 2, probe: 'М2',
              q: 'A cubic function has zeros −1 and 2 (order 2) and passes through (0, 8). Find its equation in factored form.',
              ru: 'Кубическая функция с нулями −1 и 2 (кратность 2) проходит через (0, 8). Найди уравнение в разложенном виде.',
              key: 'f(x) = a(x + 1)(x − 2)² (1); f(0) = a·1·4 = 4a = 8 → a = 2; f(x) = 2(x + 1)(x − 2)² (1).' },
            { level: 'L3', marks: 2, probe: 'М6',
              q: 'What is the maximum number of turning points of a degree-5 polynomial? Can a degree-4 polynomial have exactly 2 turning points? Justify briefly.',
              ru: '⭐ По желанию. Максимум точек поворота у многочлена степени 5? Может ли многочлен степени 4 иметь ровно 2 точки поворота? Кратко обоснуй.',
              key: '4 (1). Нет: у чётной степени оба конца в одну сторону, поэтому число точек поворота нечётное — 1 или 3 (1).' }
          ]
        },
        {
          title: 'Деление многочленов, теорема об остатке + мини-тест Б7',
          goal: 'деление столбиком и синтетическое; остаток = p(a); проверка делимое = делитель × частное + остаток; повтор блока',
          youtube: 'polynomial long division synthetic division remainder theorem',
          focus: 'long division: dividend, divisor, quotient, remainder; synthetic division для (x − a); remainder theorem p(a); factor theorem как следствие; мини-тест по 7.1–7.3 в разогреве',
          writing: 'Объяснение решения 4–5 предложений по-английски: как разделить x³ − 2x² − 5x + 6 на x − 3 и что означает остаток (первое лицо, present simple, финал называет величину)',
          terms: ['division terms', 'remainder theorem', 'synthetic division', 'factor theorem'],
          text: null,
          tasks: [
            { level: 'L1', marks: 1, probe: 'М1',
              q: 'Use the remainder theorem to find the remainder when p(x) = x³ − 4x + 1 is divided by x − 2. Do not divide.',
              ru: 'Найди остаток по теореме об остатке. Делить нельзя — это требование условия.',
              key: 'p(2) = 8 − 8 + 1 = 1. Остаток 1. Если ученик делил столбиком — ответ верный, но М1 (требование «не делить») отмечается.' },
            { level: 'L2', marks: 3, probe: 'М2',
              q: 'Divide x³ − 2x² − 5x + 6 by x − 3 using long division. Then write the result in the form dividend = divisor × quotient + remainder.',
              ru: 'Раздели столбиком, затем запиши: делимое = делитель × частное + остаток.',
              key: 'quotient x² + x − 2, remainder 0 (1 за запись деления, 1 за частное); x³ − 2x² − 5x + 6 = (x − 3)(x² + x − 2) + 0 (1). Проверка: (x − 3)(x² + x − 2) = x³ + x² − 2x − 3x² − 3x + 6 ✓.' },
            { level: 'L2', marks: 2, probe: 'М2',
              q: 'Use synthetic division to divide 2x³ + x² − 7x + 3 by x + 1. State the quotient and the remainder.',
              ru: 'Синтетическое деление на x + 1 (a = −1). Назови частное и остаток.',
              key: 'row 2, 1, −7, 3 with a = −1: 2 · −1 → 1 − 2 = −1; −1 · −1 = 1 → −7 + 1 = −6; −6 · −1 = 6 → 3 + 6 = 9. Quotient 2x² − x − 6 (1), remainder 9 (1). Проверка: p(−1) = −2 + 1 + 7 + 3 = 9 ✓. Ловушка: a = −1, не +1.' },
            { level: 'L2', marks: 2, probe: 'М6',
              q: 'When p(x) = x³ + kx − 6 is divided by x − 2, the remainder is 4. Find k and check your answer.',
              ru: 'Найди k и проверь ответ подстановкой.',
              key: 'p(2) = 8 + 2k − 6 = 2 + 2k = 4 → k = 1 (1); проверка: 8 + 2 − 6 = 4 ✓ (1). Без проверки — М6.' },
            { level: 'L3', marks: 3, probe: 'М2',
              q: 'p(x) = x³ − 7x + 6. Show that x − 1 is a factor, then factor p(x) completely.',
              ru: '⭐ По желанию. Покажи, что x − 1 — множитель, и разложи многочлен полностью.',
              key: 'p(1) = 1 − 7 + 6 = 0 ⇒ (x − 1) — множитель (1); деление: x² + x − 6 (1); (x − 1)(x + 3)(x − 2) (1). Проверка: (x − 1)(x² + x − 6) = x³ − 7x + 6 ✓.' }
          ]
        }
      ]
    },

    /* ================= Б8 · письмо и чтение ================= */
    {
      id: 'B8', track: 'write', title: 'Чтение: главная мысль, вывод, язык фидбека учителя', deadline: '2026-10-04',
      note: 'Поддержка ENG2D (английский 10 класса, академический): чтение — слабейшее место, читаем каждый урок.',
      lessons: [
        {
          title: 'Информационный текст: главная мысль и детали',
          goal: 'главная мысль как предложение с глаголом; деталь против мысли; пересказ своими словами',
          youtube: 'main idea and supporting details reading',
          focus: 'main idea = topic + что автор о нём говорит; supporting details (факты, примеры, числа); paraphrase без копирования; продолжение B3.1',
          writing: '3 предложения по-английски: главная мысль текста своими словами + две детали, которые её поддерживают (без копирования фраз текста)',
          terms: ['topic', 'main idea', 'supporting detail', 'paraphrase'],
          text: '(Текст написан для урока; цифры условные.)\n\nFive years ago, a refurbished phone was something people bought only when they could not afford a new one. Today the picture is different. Refurbished phones — used phones that have been tested, repaired and cleaned by professionals — are one of the fastest-growing parts of the mobile market. In Canada, sales of refurbished devices grew by about 15 percent last year, while sales of new phones stayed flat.\n\nThere are two main reasons for this change. The first is price: a refurbished phone usually costs 30 to 50 percent less than the same model new. The second is trust. Large sellers now test every device on more than thirty points, from battery health to camera focus, and most offer a warranty of at least twelve months. A buyer no longer has to gamble.\n\nEnvironmental concerns also play a role. Producing one new smartphone creates roughly 60 kilograms of carbon emissions, most of it during manufacturing. Keeping a phone in use for two more years cuts its environmental cost almost in half.\n\nStill, not every deal is a good one. Experts advise buyers to check three things before paying: the return policy, the battery capacity, and whether the phone is locked to a carrier. A cheap phone that cannot be returned is not cheap at all.',
          tasks: [
            { level: 'L1', marks: 1, probe: 'П8',
              q: 'Identify the topic of the text in 3–5 words.',
              ru: 'Назови тему текста (3–5 слов, без глагола — это тема, не мысль).',
              key: 'the refurbished phone market / buying refurbished phones. Предложение с глаголом здесь — ошибка команды identify (П8), балл всё равно 1, если тема верна; отметить.' },
            { level: 'L2', marks: 2, probe: 'П5',
              q: 'State the main idea of the whole text in one full sentence.',
              ru: 'Главная мысль всего текста одним полным предложением с глаголом.',
              key: 'Например: Refurbished phones have become a serious, trusted alternative to new phones because they are cheaper and now come with testing and warranties. Полное предложение с глаголом (1); накрывает весь текст, а не один абзац (1). «Refurbished phones are cheaper» — только один абзац → 1.' },
            { level: 'L2', marks: 2, probe: 'П6',
              q: 'Give two supporting details from the text that support the main idea. Use your own words, in full sentences.',
              ru: 'Две детали-поддержки своими словами, полными предложениями (не ярлыками).',
              key: 'Любые две: цена ниже на 30–50 %; проверка по 30+ пунктам; гарантия от 12 месяцев; рост продаж 15 %. По баллу за деталь, если своими словами и полным предложением. Скопированная фраза — 0.5.' },
            { level: 'L2', marks: 2, probe: 'П10',
              q: 'Read this sentence from paragraph 2: "Large sellers now test every device on more than thirty points." Is it a main idea or a supporting detail? Explain how you know in one sentence.',
              ru: 'Это главная мысль или деталь? Объясни одним предложением, как ты определил.',
              key: 'Supporting detail (1): конкретный факт с числом, который поддерживает мысль абзаца о доверии (1).' },
            { level: 'L3', marks: 2, probe: 'П10',
              q: 'The writer ends with a warning. State the warning in your own words and explain why the writer included it.',
              ru: '⭐ По желанию. Автор заканчивает предупреждением. Сформулируй его своими словами и объясни, зачем оно автору.',
              key: 'Предупреждение: проверить возврат, батарею и привязку к оператору — дешёвый телефон без возврата не выгоден (1). Зачем: уравновесить аргумент, сделать совет практичным / показать честность автора (1).' }
          ]
        },
        {
          title: 'Вывод из текста (inference) с опорой на строку',
          goal: 'делать вывод, которого нет в тексте дословно, и доказывать его строкой из текста',
          youtube: 'making inferences reading strategy',
          focus: 'inference = подсказка из текста + что я знаю → вывод; цитировать строку («In paragraph 2 the author writes…»); факт против вывода; не «вычитывать» лишнего',
          writing: '3 предложения по-английски: один вывод из текста + строка, на которую он опирается + «this shows that…»',
          terms: ['inference', 'cite', 'fact vs opinion'],
          text: '(Рассказ написан для урока.)\n\nMarco unlocked the shop at 8:40, twenty minutes before opening, as he had every day for eleven years. The sign in the window still said "Phones & Laptops Repaired While You Wait", although lately most customers left their devices and came back the next day. He counted the repair tickets from Friday: four screens, two batteries, one laptop that "just stopped". He put the laptop aside. Those were never quick.\n\nAt 9:05 a woman came in holding a phone in a plastic bag. She did not put it on the counter. "It fell in the sink," she said. "Only for a second." Marco nodded and asked when. "Yesterday morning," she said, and looked at the floor. He turned the phone over; the charging port had a thin white line of dried minerals. "Yesterday morning," he repeated, and wrote "Thursday?" on the ticket.\n\n"Can you save the photos?" she asked. It was the first question she had asked. Marco had heard it a thousand times, and it was never really about the phone.',
          tasks: [
            { level: 'L1', marks: 1, probe: 'П9',
              q: 'How long has Marco worked at the shop? Quote the words that tell you.',
              ru: 'Сколько лет Марко работает в мастерской? Процитируй слова, из которых это ясно. Две части вопроса.',
              key: 'eleven years — "as he had every day for eleven years". Это факт, не вывод. Обе части (число + цитата) — 1 балл; без цитаты — 0.5.' },
            { level: 'L2', marks: 2, probe: 'П10',
              q: 'The sign says "Repaired While You Wait". What can you infer about how the business has changed? Support your inference with a line from the text.',
              ru: 'Что можно сделать вывод о том, как изменился бизнес? Опора на строку текста обязательна.',
              key: 'Вывод: ремонт стал дольше / устройства сложнее, вывеска устарела (1). Опора: "lately most customers left their devices and came back the next day" (1).' },
            { level: 'L2', marks: 2, probe: 'П10',
              q: 'Marco writes "Thursday?" on the ticket although the woman said "yesterday morning". What does he infer, and which two clues lead him to it?',
              ru: 'Что Марко понял и какие две подсказки его к этому привели?',
              key: 'Вывод: телефон намок раньше, чем говорит клиентка (1). Подсказки: "thin white line of dried minerals" — минералы высыхают не за день; "looked at the floor" — признак неловкости (1 за две подсказки, 0.5 за одну).' },
            { level: 'L2', marks: 2, probe: 'П6',
              q: '"It was never really about the phone." What does the author mean? Answer in one or two full sentences.',
              ru: 'Что имеет в виду автор? Одно-два полных предложения.',
              key: 'Клиентам важны не устройство, а данные и воспоминания (фотографии) (1); полные предложения, не ярлык (1).' },
            { level: 'L3', marks: 2, probe: 'П10',
              q: 'Is the statement "Marco is a patient man" a fact from the text or an inference? Justify with evidence.',
              ru: '⭐ По желанию. «Марко — терпеливый человек» — факт из текста или вывод? Обоснуй с опорой на текст.',
              key: 'Inference (1): в тексте этого не сказано; опора — "nodded and asked when", "had heard it a thousand times", не спорит с клиенткой (1).' }
          ]
        },
        {
          title: 'Язык фидбека учителя и рубрика Онтарио',
          goal: 'читать комментарии учителя и рубрику (категории и уровни 1–4), понимать, что именно исправить',
          youtube: 'Ontario achievement chart levels explained',
          focus: 'Achievement chart: Knowledge & Understanding, Thinking, Communication, Application; Level 3 = provincial standard; типичные пометки: vague, elaborate, run-on, fragment, awkward, cite, unclear thesis, expand, proofread, R; что каждая требует сделать',
          writing: 'Ответ учителю на комментарий: 2–3 предложения по-английски в вежливом регистре — что именно ты исправишь и как',
          terms: ['rubric', 'achievement levels', 'vague', 'run-on', 'fragment', 'cite'],
          text: '(Абзац ученика и пометки учителя написаны для урока.)\n\nSTUDENT PARAGRAPH\n[1] In the story the main character changes a lot. [2] He is a different person by the end, this is because of the things that happen to him. [3] For example he loses his job and his friend leaves. [4] Many people think the author wants to show something about life. [5] In conclusion, the character changes because of his experiences and this is important.\n\nTEACHER COMMENTS (in the margin)\n[1] Topic sentence — which story? Name the text and the author.\n[2] run-on (comma splice)\n[3] cite your evidence — where in the text? Quote or give the chapter.\n[4] vague — elaborate. WHAT does the author show?\n[5] Conclusion repeats the topic sentence. Communication: Level 2. See me.',
          tasks: [
            { level: 'L1', marks: 1, probe: 'П8',
              q: 'Define "Level 3" in the Ontario system in one sentence.',
              ru: 'Дай определение уровня 3 одним предложением (команда define — общее значение).',
              key: 'Level 3 is the provincial standard, roughly 70–79 % (1). «Хорошая оценка» без стандарта — 0.5.' },
            { level: 'L2', marks: 2, probe: 'П9',
              q: 'The teacher wrote "vague — elaborate" next to sentence [4]. What is the problem, and what exactly must the student add? Answer in two sentences.',
              ru: 'В чём проблема предложения [4] и что именно нужно добавить? Два предложения — две части вопроса.',
              key: 'Проблема: слишком общо — "something about life", "many people" ни о чём (1). Добавить: конкретно, что показывает автор (тема как утверждение), и чьё это мнение (1).' },
            { level: 'L2', marks: 2, probe: 'П6',
              q: 'Sentence [2] is a run-on. Rewrite it correctly in one sentence.',
              ru: 'Перепиши [2] правильно одним предложением.',
              key: 'Например: He is a different person by the end because of the things that happen to him. / …by the end; this is because… Убрана склейка запятой (1); смысл сохранён, полное предложение (1).' },
            { level: 'L2', marks: 2, probe: 'П9',
              q: 'The rubric category "Communication" — what does it assess? Name one thing in this paragraph that lowers the Communication mark.',
              ru: 'Что оценивает категория Communication? Назови одну вещь в абзаце, которая снижает эту оценку. Две части.',
              key: 'Communication: ясность, организация, грамматика и пунктуация, терминология (1). Пример: run-on в [2], размытые слова в [4], повтор в [5] (1).' },
            { level: 'L3', marks: 2, probe: 'П2',
              q: 'Rewrite sentence [3] so that it answers the comment "cite your evidence". Invent a plausible detail (chapter or quotation) — the form matters, not the story.',
              ru: '⭐ По желанию. Перепиши [3] так, чтобы оно отвечало на пометку «cite your evidence»: с указанием главы или цитаты. Деталь можно придумать — важна форма.',
              key: 'Например: For example, in chapter 4 he loses his job, and by chapter 7 his only friend "stops answering his calls". Указано место (1); факт конкретный, полное предложение (1).' }
          ]
        },
        {
          title: 'Пересказ своими словами (summary) + мини-тест Б8',
          goal: 'summary 4–5 предложений: только главное, своими словами, без мнения; повтор блока',
          youtube: 'how to write a summary paragraph',
          focus: 'summary = главная мысль + ключевые детали по порядку, своими словами, без мнения, около четверти длины; summary против opinion против paraphrase; мини-тест: main idea, inference, язык фидбека',
          writing: 'Summary текста в 4–5 предложениях по-английски, без «I think» и без деталей второго плана',
          terms: ['summary', 'main idea', 'fact vs opinion', 'paraphrase'],
          text: '(Текст написан для урока; цифры условные.)\n\nEvery rechargeable battery is slowly dying from the day it is made. Inside a lithium-ion cell, ions move from one electrode to the other each time the phone is charged and used. Each cycle leaves behind tiny chemical changes, like a road that develops small cracks with every car that passes. After about 500 full cycles, a typical phone battery holds only 80 percent of its original charge.\n\nHeat is the biggest enemy. A battery kept at 40 degrees loses capacity roughly twice as fast as one kept at 25. This is why a phone left on a car dashboard in summer, or used for gaming while charging, ages faster than the same phone used gently. Charging habits matter too: keeping a battery between 20 and 80 percent puts less stress on the electrodes than repeatedly draining it to zero.\n\nManufacturers know this. Most modern phones include software that slows charging overnight and reports "battery health" as a percentage. For a repair technician, that number is the first thing to check on a used phone: a device at 78 percent health will need a new battery within a year.\n\nAging is inevitable. How fast it happens is a choice.',
          tasks: [
            { level: 'L1', marks: 1, probe: 'П9',
              q: 'How many main points does the text make? List each one in 3–5 words.',
              ru: 'Сколько главных пунктов в тексте? Перечисли каждый в 3–5 словах. Обе части.',
              key: 'Три-четыре: batteries age with every cycle; heat speeds up aging; charging habits matter; manufacturers add protection / health number. Число + список (1); 2 или 6 пунктов — 0.5.' },
            { level: 'L2', marks: 2, probe: 'П9',
              q: 'Which sentence belongs in a summary and which does not? (a) "Lithium-ion batteries lose capacity because of chemical changes at the electrodes." (b) "I think phone companies should make batteries replaceable." Explain.',
              ru: 'Какое предложение уместно в summary, какое нет, и почему? Обе части.',
              key: '(a) — уместно: главная мысль текста своими словами (1). (b) — нет: мнение, которого в тексте нет (1).' },
            { level: 'L2', marks: 3, probe: 'П6',
              q: 'Write the summary: 4–5 sentences, your own words, no opinion.',
              ru: 'Напиши summary: 4–5 предложений, своими словами, без мнения. Это и есть письмо урока.',
              key: 'Критерии: все главные пункты, по порядку (1); своими словами, без копирования (1); без мнения, полные предложения, 4–5 штук (1). Длина 6+ предложений — минус 0.5 (П9).' },
            { level: 'L2', marks: 2, probe: 'П5',
              q: 'State the main idea of paragraph 2 in one sentence. Is your sentence a fact from the text or an inference?',
              ru: 'Главная мысль абзаца 2 одним предложением. Это факт из текста или вывод? Две части.',
              key: 'Heat and charging habits decide how fast a battery ages (1). Это факт: сказано прямо ("Heat is the biggest enemy") (1).' },
            { level: 'L3', marks: 2, probe: 'П10',
              q: 'The text ends: "Aging is inevitable. How fast it happens is a choice." Infer the author\'s attitude to battery aging and support it with a phrase from the text.',
              ru: '⭐ По желанию. Каково отношение автора к старению батарей? Вывод + фраза-опора.',
              key: 'Автор практичен и оптимистичен: старение неизбежно, но пользователь управляет скоростью (1); опора: "How fast it happens is a choice" или "puts less stress on the electrodes" (1).' }
          ]
        }
      ]
    },

    /* ================= Б9 · математика ================= */
    {
      id: 'B9', track: 'math', title: 'Многочлены-2: теорема о корне, уравнения, неравенства', deadline: '2026-10-18',
      note: 'Опорные задания и глоссарий — есть (2.8.0).',
      lessons: [
        {
          title: 'Теоремы об остатке и о множителе',
          goal: 'Remainder and factor theorems',
          youtube: 'MHF4U remainder theorem factor theorem',
          focus: 'remainder theorem; factor theorem; finding an unknown coefficient from a remainder; using the factor theorem to start factoring',
          writing: 'Writing (3–4 sentences): explain how the remainder theorem lets you check whether x − a is a factor without dividing.',
          terms: ['remainder theorem', 'factor theorem', 'division terms'],
          text: null,
          tasks: [
            { level: 'L2', marks: 2,
              q: 'Use the remainder theorem to find the remainder when P(x) = 2x³ − 5x² + 3x − 7 is divided by x − 3.',
              key: 'P(3) = 54 − 45 + 9 − 7 = 11. Marks: 1 for P(3) set up, 1 for the value.' },
            { level: 'L2', marks: 2,
              q: 'Use the factor theorem to decide whether x + 2 is a factor of P(x) = x³ + 4x² + x − 6. Show the calculation.',
              key: 'P(−2) = −8 + 16 − 2 − 6 = 0, so yes, x + 2 is a factor. Marks: 1 for evaluating at −2 (not +2), 1 for the conclusion.' },
            { level: 'L2', marks: 2,
              q: 'Find k so that x − 1 is a factor of 3x³ + kx² − 5x + 4.',
              key: 'P(1) = 3 + k − 5 + 4 = k + 2 = 0 → k = −2. Marks: 1 for P(1) = 0, 1 for k.' },
            { level: 'L2', marks: 3,
              q: 'When P(x) = x³ + ax² − 4x + 3 is divided by x − 2, the remainder is 7. Find a.',
              key: 'P(2) = 8 + 4a − 8 + 3 = 4a + 3 = 7 → a = 1. Marks: 1 for P(2) = 7, 1 for the equation, 1 for a.' },
            { level: 'L2', marks: 4,
              q: 'P(x) = x³ − 7x + 6. (a) Show that x − 1 is a factor. (b) Divide and factor P(x) fully.',
              key: '(a) P(1) = 1 − 7 + 6 = 0. (b) x³ − 7x + 6 = (x − 1)(x² + x − 6) = (x − 1)(x + 3)(x − 2). Marks: 1 for (a), 2 for the quotient x² + x − 6, 1 for the full factoring.' },
            { level: 'L3', marks: 4,
              q: 'A polynomial P(x) leaves remainder 5 when divided by x − 1 and remainder −1 when divided by x + 2. Find the remainder when P(x) is divided by (x − 1)(x + 2).',
              key: 'the remainder has degree < 2, so R(x) = ax + b; R(1) = a + b = 5, R(−2) = −2a + b = −1; subtract: 3a = 6 → a = 2, b = 3 → R(x) = 2x + 3. Marks: 1 for R(x) = ax + b, 1 for each equation, 1 for the answer.' }
          ],
          words: [
            { en: 'remainder theorem', ru: 'теорема об остатке' },
            { en: 'factor theorem', ru: 'теорема о множителе (о корне)' },
            { en: 'divisor', ru: 'делитель' },
            { en: 'quotient', ru: 'частное' },
            { en: 'remainder', ru: 'остаток' },
            { en: 'to divide evenly', ru: 'делиться нацело' }
          ]
        },
        {
          title: 'Полное разложение многочленов',
          goal: 'Factoring polynomials fully',
          youtube: 'MHF4U factoring polynomials integral zero theorem',
          focus: 'integral zero theorem; rational zero theorem; factoring by grouping; difference and sum of cubes; factoring degree 3–4 fully',
          writing: 'Writing (3–4 sentences): describe the steps you take to factor a cubic fully, starting from the integral zero theorem.',
          terms: ['integral zero theorem', 'rational zero theorem', 'factor fully', 'sum and difference of cubes'],
          text: null,
          tasks: [
            { level: 'L2', marks: 3,
              q: 'P(x) = x³ − 2x² − 5x + 6. (a) List all possible integer zeros. (b) Find one zero and factor P(x) fully.',
              key: '(a) ±1, ±2, ±3, ±6. (b) P(1) = 0 → (x − 1)(x² − x − 6) = (x − 1)(x − 3)(x + 2). Marks: 1 for the list, 1 for a zero, 1 for the full factoring.' },
            { level: 'L2', marks: 3,
              q: 'Factor fully by grouping: x³ + 3x² − 4x − 12.',
              key: 'x²(x + 3) − 4(x + 3) = (x + 3)(x² − 4) = (x + 3)(x − 2)(x + 2). Marks: 1 for grouping, 1 for (x + 3)(x² − 4), 1 for the full factoring.' },
            { level: 'L2', marks: 4,
              q: 'Factor fully: 2x³ − 3x² − 11x + 6.',
              key: 'candidates ±1, ±2, ±3, ±6, ±1/2, ±3/2; P(3) = 54 − 27 − 33 + 6 = 0; quotient 2x² + 3x − 2 = (2x − 1)(x + 2); answer (x − 3)(2x − 1)(x + 2). Marks: 1 for candidates, 1 for the zero, 1 for the quotient, 1 for the full factoring.' },
            { level: 'L2', marks: 2,
              q: 'Factor fully: 8x³ − 27.',
              key: 'difference of cubes, a = 2x, b = 3: (2x − 3)(4x² + 6x + 9). Marks: 1 for the linear factor, 1 for the quadratic.' },
            { level: 'L2', marks: 3,
              q: 'Factor fully: x⁴ − 5x² + 4.',
              key: 'treat as a quadratic in x²: (x² − 1)(x² − 4) = (x − 1)(x + 1)(x − 2)(x + 2). Marks: 1 for the substitution idea, 1 for (x² − 1)(x² − 4), 1 for the full factoring.' },
            { level: 'L3', marks: 5,
              q: 'Factor fully: x⁴ − 2x³ − 7x² + 8x + 12.',
              key: 'P(−1) = 1 + 2 − 7 − 8 + 12 = 0 → divide by x + 1: x³ − 3x² − 4x + 12; group: x²(x − 3) − 4(x − 3) = (x − 3)(x² − 4); answer (x + 1)(x − 3)(x − 2)(x + 2). Marks: 1 for a zero, 2 for the cubic quotient, 1 for grouping, 1 for the full factoring.' }
          ],
          words: [
            { en: 'integral zero theorem', ru: 'теорема о целом корне' },
            { en: 'rational zero theorem', ru: 'теорема о рациональном корне' },
            { en: 'to factor fully', ru: 'разложить полностью' },
            { en: 'grouping', ru: 'группировка' },
            { en: 'difference of cubes', ru: 'разность кубов' },
            { en: 'constant term', ru: 'свободный член' },
            { en: 'leading coefficient', ru: 'старший коэффициент' }
          ]
        },
        {
          title: 'Уравнения, корни, кратность',
          goal: 'Polynomial equations, roots, multiplicity',
          youtube: 'MHF4U solving polynomial equations multiplicity',
          focus: 'solving polynomial equations by factoring; roots and their multiplicity (order); behaviour of the graph at a zero (cross or bounce); family of polynomial functions from given zeros and a point',
          writing: 'Writing (3–4 sentences): explain what the multiplicity of a zero tells you about the graph; give one example.',
          terms: ['zero', 'multiplicity', 'family of polynomial functions'],
          text: null,
          tasks: [
            { level: 'L2', marks: 3,
              q: 'Solve x³ − 4x² − 5x = 0.',
              key: 'x(x² − 4x − 5) = x(x − 5)(x + 1) = 0 → x = 0, 5, −1. Marks: 1 for the common factor x, 1 for the factoring, 1 for all three roots.' },
            { level: 'L2', marks: 4,
              q: 'Solve 2x³ + x² − 8x − 4 = 0.',
              key: 'grouping: x²(2x + 1) − 4(2x + 1) = (2x + 1)(x² − 4) = (2x + 1)(x − 2)(x + 2) → x = −1/2, 2, −2. Marks: 1 for grouping, 1 for the three factors, 2 for the roots (all three).' },
            { level: 'L2', marks: 3,
              q: 'Solve x⁴ − 13x² + 36 = 0.',
              key: '(x² − 4)(x² − 9) = 0 → x = ±2, ±3. Marks: 1 for the quadratic-in-x² idea, 1 for the factors, 1 for all four roots.' },
            { level: 'L2', marks: 4,
              q: 'A polynomial function of degree 3 has zeros −2 (order 2) and 3, and its graph passes through (1, 18). Write the equation in factored form.',
              key: 'f(x) = a(x + 2)²(x − 3); f(1) = a · 9 · (−2) = −18a = 18 → a = −1; f(x) = −(x + 2)²(x − 3). Marks: 1 for the factored family with (x + 2)², 1 for substituting the point, 1 for a, 1 for the final equation.' },
            { level: 'L2', marks: 4,
              q: 'Solve x³ + 2x² − 9x − 18 = 0. For each root state its multiplicity and whether the graph crosses or bounces at that x-intercept.',
              key: 'x²(x + 2) − 9(x + 2) = (x + 2)(x − 3)(x + 3) → x = −3, −2, 3, each of order 1, the graph crosses at all three. Marks: 1 for grouping, 1 for the roots, 1 for the multiplicities, 1 for cross/bounce.' },
            { level: 'L3', marks: 5,
              q: 'Find all real solutions of x⁴ + x³ − 7x² − x + 6 = 0.',
              key: 'P(1) = 0 and P(−1) = 0 → divide by x² − 1: x⁴ + x³ − 7x² − x + 6 = (x² − 1)(x² + x − 6) = (x − 1)(x + 1)(x + 3)(x − 2) → x = 1, −1, −3, 2. Marks: 1 for each of the two easy zeros, 2 for the quotient x² + x − 6, 1 for the full set of roots.' }
          ],
          words: [
            { en: 'root', ru: 'корень (уравнения)' },
            { en: 'zero', ru: 'нуль (функции)' },
            { en: 'multiplicity', ru: 'кратность' },
            { en: 'order', ru: 'порядок (кратность)' },
            { en: 'to bounce off', ru: 'коснуться и отскочить (об оси)' },
            { en: 'to cross', ru: 'пересечь' },
            { en: 'family of functions', ru: 'семейство функций' }
          ]
        },
        {
          title: 'Многочленные неравенства',
          goal: 'Polynomial inequalities',
          youtube: 'MHF4U polynomial inequalities interval table',
          focus: 'solving factored inequalities with a sign chart (interval table); interval notation; inequalities that need factoring first; strict and non-strict inequalities; a modelling inequality with a restricted domain',
          writing: 'Writing (3–4 sentences): explain to a classmate how to build and read a sign chart.',
          terms: ['sign chart', 'interval notation', 'boundary point'],
          text: null,
          tasks: [
            { level: 'L2', marks: 3,
              q: 'Solve (x − 1)(x + 3) > 0. Give the answer in interval notation.',
              key: 'zeros −3 and 1; the product is positive outside them: (−∞, −3) ∪ (1, ∞). Marks: 1 for the boundary points, 1 for the correct intervals, 1 for the notation with round brackets.' },
            { level: 'L2', marks: 4,
              q: 'Solve x³ − 4x ≤ 0.',
              key: 'x(x − 2)(x + 2) ≤ 0; signs: x < −2: −; −2 < x < 0: +; 0 < x < 2: −; x > 2: +; include the zeros: (−∞, −2] ∪ [0, 2]. Marks: 1 for factoring, 1 for the sign chart, 1 for the intervals, 1 for the square brackets.' },
            { level: 'L2', marks: 4,
              q: 'Solve x³ + 2x² − 9x − 18 > 0.',
              key: '(x + 3)(x + 2)(x − 3) > 0; signs: x < −3: −; −3 < x < −2: +; −2 < x < 3: −; x > 3: +; answer (−3, −2) ∪ (3, ∞). Marks: 1 for factoring, 1 for the sign chart, 2 for the answer (both pieces).' },
            { level: 'L2', marks: 3,
              q: 'Solve (x − 2)²(x + 1) < 0.',
              key: '(x − 2)² ≥ 0 and is 0 only at x = 2; the product is negative when x + 1 < 0 and x ≠ 2, so (−∞, −1); note that x = 2 gives 0, which is not < 0. Marks: 1 for the even-order factor, 1 for the interval, 1 for excluding x = 2 correctly (or noting it does not matter here).' },
            { level: 'L2', marks: 4,
              q: 'A box has dimensions x cm, (x + 2) cm and (x − 1) cm, where x > 1. For which values of x is the volume less than 30 cm³?',
              key: 'x(x + 2)(x − 1) < 30 → x³ + x² − 2x − 30 < 0; x = 3 is a zero: (x − 3)(x² + 4x + 10) < 0; the quadratic has discriminant 16 − 40 < 0, so it is always positive → x − 3 < 0 → x < 3; with the domain: 1 < x < 3. Marks: 1 for the inequality, 1 for the zero x = 3, 1 for the always-positive quadratic, 1 for the domain restriction.' },
            { level: 'L3', marks: 4,
              q: 'Solve x⁴ − 5x² + 4 ≤ 0.',
              key: '(x − 1)(x + 1)(x − 2)(x + 2) ≤ 0; signs: |x| > 2: +; 1 < |x| < 2: −; |x| < 1: +; answer [−2, −1] ∪ [1, 2]. Marks: 1 for factoring, 1 for the sign chart, 2 for the answer (both pieces, square brackets).' }
          ],
          words: [
            { en: 'inequality', ru: 'неравенство' },
            { en: 'interval notation', ru: 'интервальная запись' },
            { en: 'sign chart', ru: 'таблица знаков' },
            { en: 'boundary point', ru: 'граничная точка' },
            { en: 'test point', ru: 'пробная точка' },
            { en: 'union (∪)', ru: 'объединение' },
            { en: 'strict / non-strict inequality', ru: 'строгое / нестрогое неравенство' }
          ]
        }
      ]
    },

    /* ================= Б10 · письмо и чтение ================= */
    {
      id: 'B10', track: 'write', title: 'Абзац-мнение и новостная заметка: формат OSSLT', deadline: '2026-11-01',
      note: 'Материалы OSSLT — из окна английского, пакет 2.8.0б. OSSLT — конец ноября 2026, точная дата до 15.10.',
      lessons: [
        { title: 'Абзац-мнение: структура', goal: 'topic sentence с мнением + 2 причины с поддержкой + concluding sentence', youtube: 'OSSLT opinion paragraph structure', focus: 'I believe / In my opinion + because; связки First, Second, Finally; поддержка каждой причины примером', writing: 'Абзац-мнение на школьную тему, 6–8 предложений + чистовик', terms: [], text: null, tasks: null },
        { title: 'Новостная заметка: заголовок, lead, 5W', goal: 'структура news report: headline, lead с who/what/where/when/why, «перевёрнутая пирамида», цитаты, нейтральный тон', youtube: 'OSSLT news report how to write', focus: 'факты первыми, мнение автора отсутствует; цитата с указанием говорящего; прошедшее время', writing: 'Заметка по картинке-заданию OSSLT, 3 абзаца', terms: [], text: null, tasks: null },
        { title: 'Вопросы OSSLT по чтению: выбор и краткий ответ', goal: 'multiple choice и open response: как читают текст под вопросы', youtube: 'OSSLT reading multiple choice strategies', focus: 'ключевые слова вопроса → место в тексте; полный ответ 2–3 предложениями с опорой на текст', writing: 'Два open-response ответа по тексту', terms: [], text: null, tasks: null },
        { title: 'Практика на время + мини-тест Б10', goal: 'абзац-мнение за 20 минут; повтор блока', youtube: 'OSSLT time management', focus: 'план 2 минуты → текст 15 → проверка 3; чек-лист языка перед сдачей', writing: 'Абзац-мнение на время', terms: [], text: null, tasks: null }
      ]
    },

    /* ================= Б11 · математика ================= */
    {
      id: 'B11', track: 'math', title: 'Рациональные функции и асимптоты', deadline: '2026-11-15',
      note: 'Опорные задания и глоссарий — есть (2.8.1).',
      lessons: [
        {
          title: 'Функции вида 1/(…)',
          goal: 'Reciprocal functions',
          youtube: 'MHF4U reciprocal functions asymptotes',
          focus: 'reciprocal of a linear and of a quadratic; domain; vertical and horizontal asymptotes; intercepts; sign of a reciprocal',
          writing: 'Writing (3–4 sentences): explain why a reciprocal function has a vertical asymptote where its denominator is zero, and what happens to the graph near it.',
          terms: ['vertical asymptote', 'horizontal asymptote'],
          text: null,
          tasks: [
            { level: 'L2', marks: 3,
              q: 'f(x) = 1/(x − 3). State the domain, the vertical asymptote, the horizontal asymptote and the y-intercept.',
              key: 'x ≠ 3; x = 3; y = 0; (0, −1/3). Marks: 1 domain + VA, 1 HA, 1 y-intercept.' },
            { level: 'L2', marks: 3,
              q: 'g(x) = 1/(x² − 4). State the domain and all vertical asymptotes.',
              key: 'x ≠ ±2; x = 2 and x = −2; HA y = 0. Marks: 1 factoring, 1 both asymptotes, 1 domain.' },
            { level: 'L2', marks: 3,
              q: 'h(x) = 1/(x² + 4). Explain why the graph has no vertical asymptote; state the horizontal asymptote and the maximum value.',
              key: 'x² + 4 > 0 for all x, so the denominator is never 0; HA y = 0; maximum 1/4 at x = 0. Marks: 1 reason, 1 HA, 1 maximum.' },
            { level: 'L2', marks: 2,
              q: 'f(x) = 1/(2x + 5). Find x such that f(x) = −1.',
              key: '2x + 5 = −1 → x = −3. Marks: 1 equation, 1 answer.' },
            { level: 'L2', marks: 2,
              q: 'Write a reciprocal function with vertical asymptote x = −2 and y-intercept 1/2.',
              key: 'f(x) = 1/(x + 2) (f(0) = 1/2). Marks: 1 asymptote, 1 intercept check.' },
            { level: 'L3', marks: 4,
              q: 'f(x) = 1/(x² − 6x + 8). Find the vertical asymptotes and the intervals where f(x) > 0.',
              key: '(x − 2)(x − 4) → x = 2, x = 4; positive on (−∞, 2) ∪ (4, ∞), negative on (2, 4). Marks: 1 factoring, 1 asymptotes, 2 intervals.' }
          ],
          words: [
            { en: 'reciprocal', ru: 'обратная величина' },
            { en: 'asymptote', ru: 'асимптота' },
            { en: 'vertical', ru: 'вертикальный' },
            { en: 'horizontal', ru: 'горизонтальный' },
            { en: 'to approach', ru: 'приближаться' },
            { en: 'undefined', ru: 'не определено' }
          ]
        },
        {
          title: 'Асимптоты и «дырки»',
          goal: 'Rational functions and their asymptotes',
          youtube: 'MHF4U rational functions holes asymptotes',
          focus: 'f(x) = (ax + b)/(cx + d); horizontal asymptote y = a/c; holes from common factors; quadratic denominators; oblique asymptote (stretch)',
          writing: 'Writing (3–4 sentences): explain the difference between a hole and a vertical asymptote, and how you tell them apart from the factored form.',
          terms: ['hole (removable discontinuity)', 'oblique asymptote'],
          text: null,
          tasks: [
            { level: 'L2', marks: 4,
              q: 'f(x) = (2x + 1)/(x − 3). Find the vertical asymptote, horizontal asymptote, x-intercept and y-intercept.',
              key: 'x = 3; y = 2; x = −1/2; (0, −1/3). Marks: 1 each.' },
            { level: 'L2', marks: 3,
              q: 'f(x) = (x² − 9)/(x − 3). Simplify and describe the graph.',
              key: 'f(x) = x + 3 for x ≠ 3 — a line with a hole at (3, 6), no asymptote. Marks: 1 factoring, 1 simplified form with restriction, 1 hole.' },
            { level: 'L2', marks: 3,
              q: 'f(x) = (x − 1)/(x² − x − 6). State the domain and the asymptotes.',
              key: '(x − 3)(x + 2) → x ≠ 3, −2; VA x = 3 and x = −2; HA y = 0. Marks: 1 factoring, 1 VAs, 1 HA.' },
            { level: 'L2', marks: 4,
              q: 'f(x) = (3x − 6)/(x² − 4). Simplify; state the hole, the vertical asymptote and the horizontal asymptote.',
              key: '3(x − 2)/((x − 2)(x + 2)) = 3/(x + 2), x ≠ 2; hole (2, 3/4); VA x = −2; HA y = 0. Marks: 1 simplifying, 1 hole with y-value, 1 VA, 1 HA.' },
            { level: 'L2', marks: 3,
              q: 'f(x) = (ax + b)/(x − 1) has horizontal asymptote y = 3 and x-intercept 2. Find a and b.',
              key: 'a = 3 (ratio of leading coefficients); 3·2 + b = 0 → b = −6. Marks: 1 a, 1 equation for b, 1 b.' },
            { level: 'L3', marks: 4,
              q: 'f(x) = (x² + 1)/(x − 2). Find the oblique asymptote and the vertical asymptote.',
              key: 'x² + 1 = (x − 2)(x + 2) + 5 → f(x) = x + 2 + 5/(x − 2) → oblique y = x + 2; VA x = 2. Marks: 2 division, 1 oblique, 1 VA.' }
          ],
          words: [
            { en: 'hole', ru: '«дырка» (устранимый разрыв)' },
            { en: 'to cancel', ru: 'сокращать' },
            { en: 'numerator', ru: 'числитель' },
            { en: 'denominator', ru: 'знаменатель' },
            { en: 'degree', ru: 'степень' },
            { en: 'oblique', ru: 'наклонный' }
          ]
        },
        {
          title: 'Рациональные уравнения',
          goal: 'Rational equations',
          youtube: 'MHF4U solving rational equations extraneous',
          focus: 'clearing denominators; restrictions; extraneous roots; equations with no solution',
          writing: 'Writing (3–4 sentences): explain why you must write the restrictions before solving a rational equation, with the example of an extraneous root.',
          terms: ['restriction', 'extraneous root'],
          text: null,
          tasks: [
            { level: 'L2', marks: 2,
              q: 'Solve 3/(x − 2) = 5.',
              key: 'x ≠ 2; 3 = 5x − 10 → x = 13/5. Marks: 1 restriction, 1 answer.' },
            { level: 'L2', marks: 2,
              q: 'Solve 2/(x + 1) = 1/(x − 1).',
              key: 'x ≠ ±1; 2x − 2 = x + 1 → x = 3. Marks: 1 cross-multiplying, 1 answer.' },
            { level: 'L2', marks: 4,
              q: 'Solve 1/x + 1/(x + 2) = 3/4.',
              key: 'x ≠ 0, −2; 4(x + 2) + 4x = 3x(x + 2) → 3x² − 2x − 8 = 0 → (3x + 4)(x − 2) = 0 → x = 2 or x = −4/3, both allowed. Marks: 1 restrictions, 1 clearing denominators, 1 quadratic, 1 both roots checked.' },
            { level: 'L2', marks: 3,
              q: 'Solve x²/(x − 3) = 9/(x − 3).',
              key: 'x ≠ 3; x² = 9 → x = ±3; x = 3 is extraneous → x = −3. Marks: 1 restriction, 1 both algebraic roots, 1 rejecting x = 3.' },
            { level: 'L2', marks: 3,
              q: 'Solve (x − 2)/(x + 3) = (x − 4)/(x + 1).',
              key: '(x − 2)(x + 1) = (x − 4)(x + 3) → x² − x − 2 = x² − x − 12 → −2 = −12, false → no solution. Marks: 1 cross-multiplying, 1 expansion, 1 conclusion.' },
            { level: 'L3', marks: 4,
              q: 'Solve (x + 1)/(x − 1) + (x − 1)/(x + 1) = 10/3.',
              key: '((x + 1)² + (x − 1)²)/(x² − 1) = (2x² + 2)/(x² − 1) = 10/3 → 6x² + 6 = 10x² − 10 → x² = 4 → x = ±2. Marks: 1 common denominator, 1 simplifying the numerator, 1 equation, 1 roots.' }
          ],
          words: [
            { en: 'restriction', ru: 'ограничение' },
            { en: 'extraneous root', ru: 'посторонний корень' },
            { en: 'to clear denominators', ru: 'избавиться от знаменателей' },
            { en: 'to cross-multiply', ru: 'перемножить крест-накрест' },
            { en: 'no solution', ru: 'нет решений' },
            { en: 'to reject', ru: 'отбросить' }
          ]
        },
        {
          title: 'Рациональные неравенства',
          goal: 'Rational inequalities',
          youtube: 'MHF4U rational inequalities interval table',
          focus: 'sign chart with zeros and asymptotes; open vs closed endpoints; moving everything to one side instead of cross-multiplying; an average-cost model',
          writing: 'Writing (3–4 sentences): explain why cross-multiplying is not allowed in a rational inequality and what you do instead.',
          terms: ['critical values of a rational inequality', 'never cross-multiply an inequality'],
          text: null,
          tasks: [
            { level: 'L2', marks: 2,
              q: 'Solve 1/(x − 2) > 0.',
              key: 'x > 2, i.e. (2, ∞). Marks: 1 sign reasoning, 1 answer.' },
            { level: 'L2', marks: 3,
              q: 'Solve (x + 1)/(x − 3) ≤ 0.',
              key: 'critical values −1 and 3; negative between them; [−1, 3). Marks: 1 critical values, 1 sign chart, 1 brackets.' },
            { level: 'L2', marks: 4,
              q: 'Solve (x − 2)(x + 4)/(x − 1) ≥ 0.',
              key: 'critical values −4, 1, 2; signs: x < −4: −; −4 < x < 1: +; 1 < x < 2: −; x > 2: +; answer [−4, 1) ∪ [2, ∞). Marks: 1 critical values, 1 sign chart, 2 answer (both pieces, correct brackets).' },
            { level: 'L2', marks: 3,
              q: 'Solve 2/x < 1.',
              key: '2/x − 1 < 0 → (2 − x)/x < 0 → critical values 0 and 2; (−∞, 0) ∪ (2, ∞). Marks: 1 one fraction, 1 critical values, 1 answer.' },
            { level: 'L2', marks: 3,
              q: 'The average cost per item is C(n) = (500 + 20n)/n dollars for n items. For which n is the average cost at most $25?',
              key: 'n > 0; 500 + 20n ≤ 25n → 500 ≤ 5n → n ≥ 100. Marks: 1 inequality, 1 solving, 1 interpretation (at least 100 items).' },
            { level: 'L3', marks: 4,
              q: 'Solve (x − 1)/(x + 2) ≥ 2 without cross-multiplying.',
              key: '(x − 1 − 2x − 4)/(x + 2) ≥ 0 → (−x − 5)/(x + 2) ≥ 0 → (x + 5)/(x + 2) ≤ 0 → [−5, −2). Marks: 1 one fraction, 1 simplifying, 1 sign chart, 1 brackets.' }
          ],
          words: [
            { en: 'inequality', ru: 'неравенство' },
            { en: 'critical value', ru: 'критическая точка' },
            { en: 'at most', ru: 'не более' },
            { en: 'at least', ru: 'не менее' },
            { en: 'average cost', ru: 'средняя стоимость' },
            { en: 'to include / to exclude', ru: 'включать / исключать' }
          ]
        }
      ]
    },

    /* ================= Б12 · письмо и чтение (было: маркетинг) ================= */
    {
      id: 'B12', track: 'write', title: 'Литературный анализ для ENG2D', deadline: '2026-12-20',
      note: 'Пьеса и роман в ENG2D идут до 18.12, экзамен в конце января. Опорные задания — из окна английского, пакет 2.8.2.',
      lessons: [
        { title: 'Сюжет и конфликт', goal: 'plot: exposition, rising action, climax, falling action, resolution; типы конфликта', youtube: 'plot diagram elements of plot conflict types', focus: 'по рассказу из класса: расставить события по схеме; назвать тип конфликта (person vs person / self / society / nature)', writing: '4 предложения: пересказ сюжета по схеме', terms: [], text: null, tasks: null },
        { title: 'Персонаж и тема', goal: 'characterization (direct / indirect); theme как утверждение, не тема', youtube: 'characterization direct indirect theme statement', focus: 'что персонаж говорит, делает, что говорят о нём; theme = topic + что автор о нём говорит', writing: 'Абзац о персонаже с одной цитатой', terms: [], text: null, tasks: null },
        { title: 'Художественные приёмы и их эффект', goal: 'simile, metaphor, personification, imagery, symbolism, foreshadowing, irony — найти и объяснить эффект', youtube: 'literary devices examples effect', focus: 'схема: приём → цитата → эффект на читателя («this makes the reader…»)', writing: '3 мини-разбора приёмов по 2 предложения', terms: [], text: null, tasks: null },
        { title: 'Абзац литературного анализа + мини-тест Б12', goal: 'PEEL с интегрированной цитатой: Point о тексте → цитата как Evidence → Explain эффекта → Link', youtube: 'how to embed quotes literary analysis paragraph', focus: 'встроенная цитата с кавычками; настоящее время о тексте; мини-тест 12.1–12.3', writing: 'Абзац литературного анализа + чистовик', terms: [], text: null, tasks: null }
      ]
    },

    /* ================= Б13 · математика ================= */
    {
      id: 'B13', track: 'math', title: 'Тригонометрия: радианы, графики, тождества', deadline: '2026-12-13',
      note: 'Опорные задания и глоссарий — есть (2.8.1).',
      lessons: [
        {
          title: 'Радианы и особые углы',
          goal: 'Radians, arcs and special angles',
          youtube: 'MHF4U radian measure arc length special triangles',
          focus: 'degrees ↔ radians; arc length s = rθ; exact values on the unit circle; solving cos θ = k on [0, 2π); angular and linear speed',
          writing: 'Writing (3–4 sentences): explain what one radian is and why the formula s = rθ only works in radians.',
          terms: ['radian', 'special angles'],
          text: null,
          tasks: [
            { level: 'L2', marks: 2,
              q: 'Convert 150° to radians (exact) and 3π/4 to degrees.',
              key: '5π/6; 135°. Marks: 1 each.' },
            { level: 'L2', marks: 2,
              q: 'Find the arc length for a circle of radius 6 cm and central angle 2π/3.',
              key: 's = 6 · 2π/3 = 4π cm ≈ 12.57 cm. Marks: 1 formula, 1 value.' },
            { level: 'L2', marks: 3,
              q: 'State exact values: sin(π/6), cos(3π/4), tan(π/3).',
              key: '1/2; −√2/2; √3. Marks: 1 each.' },
            { level: 'L2', marks: 3,
              q: 'Find all θ in [0, 2π) with cos θ = −1/2.',
              key: '2π/3, 4π/3. Marks: 1 reference angle π/3, 1 quadrants II and III, 1 both answers.' },
            { level: 'L2', marks: 3,
              q: 'A wheel of radius 0.4 m turns 3 revolutions per second. Find its angular speed in rad/s and the linear speed of a point on the rim.',
              key: 'ω = 3 · 2π = 6π rad/s ≈ 18.85; v = rω = 2.4π m/s ≈ 7.54. Marks: 1 revolutions → radians, 1 ω, 1 v.' },
            { level: 'L3', marks: 4,
              q: 'A sector has radius 5 cm and angle 1.2 rad. Find its area and its perimeter.',
              key: 'A = ½ · 25 · 1.2 = 15 cm²; P = 2r + rθ = 10 + 6 = 16 cm. Marks: 1 area formula, 1 area, 1 arc length 6, 1 perimeter.' }
          ],
          words: [
            { en: 'radian', ru: 'радиан' },
            { en: 'arc length', ru: 'длина дуги' },
            { en: 'sector', ru: 'сектор' },
            { en: 'unit circle', ru: 'единичная окружность' },
            { en: 'reference angle', ru: 'опорный угол' },
            { en: 'revolution', ru: 'оборот' }
          ]
        },
        {
          title: 'Синусоиды',
          goal: 'Sinusoidal functions',
          youtube: 'MHF4U sinusoidal functions transformations',
          focus: 'y = a sin(k(x − d)) + c; amplitude, period 2π/k, phase shift, vertical shift, maximum and minimum; writing an equation from a description; a Ferris-wheel model',
          writing: 'Writing (3–4 sentences): explain how you decide between sine and cosine when you model a real situation, using the Ferris wheel.',
          terms: ['amplitude', 'period'],
          text: null,
          tasks: [
            { level: 'L2', marks: 3,
              q: 'y = 3sin(2x) + 1. State the amplitude, the period, the maximum and the minimum.',
              key: '3; π; max 4; min −2. Marks: 1 amplitude, 1 period, 1 max and min.' },
            { level: 'L2', marks: 3,
              q: 'y = −2cos(x − π/3). State the amplitude, the phase shift and the effect of the negative sign.',
              key: '2; shift right π/3; reflection in the x-axis. Marks: 1 each.' },
            { level: 'L2', marks: 4,
              q: 'A sinusoidal function has maximum 7, minimum 1 and period π, and it is at its maximum when x = 0. Write an equation.',
              key: 'a = 3, c = 4, k = 2π/π = 2; cosine starts at a maximum: y = 3cos(2x) + 4. Marks: 1 amplitude, 1 axis c, 1 k, 1 equation.' },
            { level: 'L2', marks: 2,
              q: 'State the period of y = sin(x/2).',
              key: '2π/(1/2) = 4π. Marks: 1 formula, 1 value.' },
            { level: 'L2', marks: 4,
              q: 'A Ferris wheel of radius 10 m has its centre 12 m above the ground and turns once every 40 s. A rider starts at the bottom at t = 0. Write h(t), the height in metres, and find h(10).',
              key: 'h(t) = 12 − 10cos(πt/20); h(10) = 12 − 10cos(π/2) = 12 m. Marks: 1 amplitude and axis, 1 k = 2π/40, 1 −cos for starting at the bottom, 1 h(10).' },
            { level: 'L3', marks: 4,
              q: 'For the wheel above, find the first two times t > 0 when the rider is 17 m high.',
              key: '12 − 10cos(πt/20) = 17 → cos(πt/20) = −1/2 → πt/20 = 2π/3 or 4π/3 → t = 40/3 ≈ 13.3 s and t = 80/3 ≈ 26.7 s. Marks: 1 equation, 1 cos = −1/2, 1 both angles, 1 both times.' }
          ],
          words: [
            { en: 'amplitude', ru: 'амплитуда' },
            { en: 'period', ru: 'период' },
            { en: 'phase shift', ru: 'сдвиг по фазе' },
            { en: 'vertical shift', ru: 'сдвиг по вертикали' },
            { en: 'axis of the curve', ru: 'ось синусоиды' },
            { en: 'to model', ru: 'моделировать' }
          ]
        },
        {
          title: 'Тождества',
          goal: 'Trigonometric identities',
          youtube: 'MHF4U proving trigonometric identities compound angle',
          focus: 'quotient and Pythagorean identities; proving identities (work one side); finding the other ratios from one; compound-angle formulas for exact values',
          writing: 'Writing (3–4 sentences): explain the difference between an identity and an equation, with one example of each.',
          terms: ['identity', 'compound-angle formula'],
          text: null,
          tasks: [
            { level: 'L2', marks: 2,
              q: 'Prove: tan x · cos x = sin x.',
              key: 'LHS = (sin x/cos x) · cos x = sin x. Marks: 1 quotient identity, 1 clean layout (one side only).' },
            { level: 'L2', marks: 2,
              q: 'Simplify (1 − cos²x)/sin x.',
              key: 'sin²x/sin x = sin x. Marks: 1 Pythagorean identity, 1 result.' },
            { level: 'L2', marks: 3,
              q: 'Prove: sin²x/(1 − cos x) = 1 + cos x.',
              key: '(1 − cos²x)/(1 − cos x) = (1 − cos x)(1 + cos x)/(1 − cos x) = 1 + cos x. Marks: 1 identity, 1 factoring, 1 cancel.' },
            { level: 'L2', marks: 3,
              q: 'sin θ = 3/5 and θ is in quadrant II. Find cos θ and tan θ.',
              key: 'cos θ = −4/5; tan θ = −3/4. Marks: 1 Pythagorean, 1 sign from quadrant, 1 tan.' },
            { level: 'L2', marks: 3,
              q: 'Find the exact value of sin 75°.',
              key: 'sin(45° + 30°) = (√2/2)(√3/2) + (√2/2)(1/2) = (√6 + √2)/4. Marks: 1 split, 1 formula, 1 simplified value.' },
            { level: 'L3', marks: 4,
              q: 'Find the exact value of cos(π/12).',
              key: 'cos(π/3 − π/4) = cos(π/3)cos(π/4) + sin(π/3)sin(π/4) = (1/2)(√2/2) + (√3/2)(√2/2) = (√2 + √6)/4. Marks: 1 choice of angles, 1 formula with correct sign, 1 values, 1 simplified.' }
          ],
          words: [
            { en: 'identity', ru: 'тождество' },
            { en: 'to prove', ru: 'доказать' },
            { en: 'left-hand side / right-hand side', ru: 'левая / правая часть' },
            { en: 'quadrant', ru: 'четверть (координатная)' },
            { en: 'compound angle', ru: 'сумма/разность углов' },
            { en: 'exact value', ru: 'точное значение' }
          ]
        },
        {
          title: 'Тригонометрические уравнения',
          goal: 'Trigonometric equations',
          youtube: 'MHF4U solving trigonometric equations 0 to 2pi',
          focus: 'linear and quadratic equations in sin, cos, tan on [0, 2π); factoring; double angles sin(2x) = k; number of solutions',
          writing: 'Writing (3–4 sentences): explain why sin(2x) = k on [0, 2π) has twice as many solutions as sin x = k, using one example.',
          terms: ['general vs. restricted solution', 'quadratic trigonometric equation'],
          text: null,
          tasks: [
            { level: 'L2', marks: 2,
              q: 'Solve 2sin x − 1 = 0 on [0, 2π).',
              key: 'π/6, 5π/6. Marks: 1 sin x = 1/2, 1 both angles.' },
            { level: 'L2', marks: 3,
              q: 'Solve cos²x = 1/4 on [0, 2π).',
              key: 'cos x = ±1/2 → π/3, 2π/3, 4π/3, 5π/3. Marks: 1 both signs, 2 all four angles.' },
            { level: 'L2', marks: 4,
              q: 'Solve 2sin²x − sin x − 1 = 0 on [0, 2π).',
              key: '(2sin x + 1)(sin x − 1) = 0 → sin x = 1 → π/2; sin x = −1/2 → 7π/6, 11π/6 → π/2, 7π/6, 11π/6. Marks: 1 factoring, 1 each root value, 1 all three angles.' },
            { level: 'L2', marks: 2,
              q: 'Solve tan x = √3 on [0, 2π).',
              key: 'π/3, 4π/3. Marks: 1 reference angle, 1 both angles (period π).' },
            { level: 'L2', marks: 4,
              q: 'Solve sin(2x) = √2/2 on [0, 2π).',
              key: '2x = π/4, 3π/4, 9π/4, 11π/4 → x = π/8, 3π/8, 9π/8, 11π/8. Marks: 1 interval for 2x, 1 first two angles, 1 adding 2π, 1 dividing by 2.' },
            { level: 'L3', marks: 4,
              q: 'Solve sin x + cos x = 1 on [0, 2π).',
              key: 'sin x + cos x = √2 sin(x + π/4) = 1 → sin(x + π/4) = √2/2 → x + π/4 = π/4 or 3π/4 → x = 0, π/2 (x + π/4 = 9π/4 gives x = 2π, excluded). Check: both work. Marks: 1 rewriting as one sine, 1 equation, 1 both angles, 1 checking the interval.' }
          ],
          words: [
            { en: 'to solve on an interval', ru: 'решить на промежутке' },
            { en: 'general solution', ru: 'общее решение' },
            { en: 'double angle', ru: 'двойной угол' },
            { en: 'to factor', ru: 'разложить на множители' },
            { en: 'to check', ru: 'проверить' },
            { en: 'to reject', ru: 'отбросить' }
          ]
        }
      ]
    },

    /* ================= Б14 · письмо и чтение ================= */
    {
      id: 'B14', track: 'write', title: 'OSSLT-генеральная', deadline: '2026-11-22',
      note: 'OSSLT — конец ноября 2026 (outline ENG2D); точная дата до 15.10. Если раньше 25.11 — дедлайн блока 15.11. Опорные задания — из окна английского, пакет 2.8.2.',
      lessons: [
        { title: 'Секция чтения целиком на время', goal: 'пробник EQAO: чтение всех типов текстов под таймер', youtube: 'OSSLT reading section practice EQAO sample', focus: 'распределение времени; сначала вопросы, потом текст; пометки на полях', writing: 'Два open-response ответа из пробника', terms: [], text: null, tasks: null },
        { title: 'Серия абзацев (opinion essay) на время', goal: 'series of paragraphs: вступление с мнением, 2–3 абзаца причин, заключение', youtube: 'OSSLT series of paragraphs how to write', focus: 'план 3 минуты; связки между абзацами; чек-лист языка перед сдачей', writing: 'Series of paragraphs за 30 минут', terms: [], text: null, tasks: null },
        { title: 'Новостная заметка на время', goal: 'news report за 20 минут по заданию с картинкой', youtube: 'OSSLT news report sample', focus: 'headline + lead + 2 абзаца + цитата; нейтральный тон', writing: 'News report за 20 минут', terms: [], text: null, tasks: null },
        { title: 'Разбор пробника по критериям EQAO + стратегия', goal: 'оценить свои работы по критериям EQAO; план на день теста', youtube: 'OSSLT scoring rubric explained', focus: 'коды оценки EQAO; типичные потери баллов; что делать за 10 минут до конца', writing: 'Самооценка двух работ по критериям: 4 предложения', terms: [], text: null, tasks: null }
      ]
    },

    /* ================= Б15 · математика ================= */
    {
      id: 'B15', track: 'math', title: 'Показательные и логарифмические функции', deadline: '2027-01-17',
      note: 'В каркасе 2.6.0 этой темы не было — а это целый раздел MHF4U и экзамена. Опорные задания и глоссарий — есть (2.8.1).',
      lessons: [
        {
          title: 'Показательные функции',
          goal: 'Exponential functions and equations',
          youtube: 'MHF4U exponential functions doubling half-life',
          focus: 'y = a·bˣ, asymptote, intercept; equations with a common base; doubling and half-life models; substitution t = 2ˣ (stretch)',
          writing: 'Writing (3–4 sentences): explain how you recognise exponential growth in a table of values and why its graph never touches the x-axis.',
          terms: ['exponential function', 'half-life'],
          text: null,
          tasks: [
            { level: 'L2', marks: 2,
              q: 'Solve 2^(x+1) = 32.',
              key: '2^(x+1) = 2⁵ → x = 4. Marks: 1 common base, 1 answer.' },
            { level: 'L2', marks: 2,
              q: 'Solve 9ˣ = 27.',
              key: '3^(2x) = 3³ → x = 3/2. Marks: 1 base 3, 1 answer.' },
            { level: 'L2', marks: 3,
              q: 'f(x) = 3 · 2ˣ. State the y-intercept, the asymptote and f(4).',
              key: '3; y = 0; 48. Marks: 1 each.' },
            { level: 'L2', marks: 3,
              q: 'A bacteria population of 500 doubles every 6 hours. Write P(t) and find the population after 15 hours (to the nearest whole).',
              key: 'P(t) = 500 · 2^(t/6); P(15) = 500 · 2^2.5 ≈ 2828. Marks: 1 model, 1 exponent 2.5, 1 value.' },
            { level: 'L2', marks: 3,
              q: 'A substance has half-life 8 days. From 80 mg, how much remains after 20 days (two decimals)?',
              key: '80 · (1/2)^(20/8) = 80 · 2^(−2.5) ≈ 14.14 mg. Marks: 1 model, 1 exponent, 1 value.' },
            { level: 'L3', marks: 4,
              q: 'Solve 4ˣ − 6 · 2ˣ + 8 = 0.',
              key: 't = 2ˣ: t² − 6t + 8 = 0 → (t − 2)(t − 4) = 0 → 2ˣ = 2 or 2ˣ = 4 → x = 1 or x = 2. Marks: 1 substitution, 1 quadratic, 1 factoring, 1 both x.' }
          ],
          words: [
            { en: 'exponent', ru: 'показатель степени' },
            { en: 'base', ru: 'основание' },
            { en: 'to double', ru: 'удваиваться' },
            { en: 'half-life', ru: 'период полураспада' },
            { en: 'growth / decay', ru: 'рост / убывание' },
            { en: 'to the nearest whole', ru: 'до целого' }
          ]
        },
        {
          title: 'Логарифмы',
          goal: 'Logarithms',
          youtube: 'MHF4U introduction to logarithms evaluate',
          focus: 'log_b a = c ⇔ bᶜ = a; evaluating logs exactly; converting forms; solving simple log equations; nested logs (stretch)',
          writing: 'Writing (3–4 sentences): explain in your own words what log₂ 32 asks, and why the argument of a logarithm must be positive.',
          terms: ['logarithm', 'exponential form / logarithmic form'],
          text: null,
          tasks: [
            { level: 'L2', marks: 3,
              q: 'Evaluate exactly: log₂ 32, log₃(1/9), log 1000.',
              key: '5; −2; 3. Marks: 1 each.' },
            { level: 'L2', marks: 2,
              q: 'Write log₅ 125 = 3 in exponential form and 2⁻³ = 1/8 in logarithmic form.',
              key: '5³ = 125; log₂(1/8) = −3. Marks: 1 each.' },
            { level: 'L2', marks: 2,
              q: 'Solve log₃ x = 4.',
              key: 'x = 3⁴ = 81. Marks: 1 conversion, 1 answer.' },
            { level: 'L2', marks: 2,
              q: 'Solve log_x 49 = 2.',
              key: 'x² = 49, x > 0 → x = 7. Marks: 1 conversion, 1 rejecting −7.' },
            { level: 'L2', marks: 3,
              q: 'Evaluate log₄ 8 + log₉ 27 exactly.',
              key: '4^(3/2) = 8 → 3/2; 9^(3/2) = 27 → 3/2; sum 3. Marks: 1 each log, 1 sum.' },
            { level: 'L3', marks: 3,
              q: 'Solve log₂(log₃ x) = 1.',
              key: 'log₃ x = 2 → x = 9. Marks: 1 outer log, 1 inner log, 1 check x > 0.' }
          ],
          words: [
            { en: 'logarithm', ru: 'логарифм' },
            { en: 'base', ru: 'основание' },
            { en: 'argument', ru: 'аргумент (число под логарифмом)' },
            { en: 'to evaluate', ru: 'вычислить' },
            { en: 'to convert', ru: 'преобразовать' },
            { en: 'common logarithm', ru: 'десятичный логарифм' }
          ]
        },
        {
          title: 'Свойства логарифмов',
          goal: 'Laws of logarithms',
          youtube: 'MHF4U laws of logarithms change of base',
          focus: 'product, quotient and power laws; expanding and condensing; change of base; using given approximate logs; log equations that need condensing (stretch)',
          writing: 'Writing (3–4 sentences): explain why log(x + y) cannot be split, and show one law that does work, with numbers.',
          terms: ['laws of logarithms', 'change of base'],
          text: null,
          tasks: [
            { level: 'L2', marks: 3,
              q: 'Expand log(x²y/z).',
              key: '2 log x + log y − log z. Marks: 1 product, 1 quotient, 1 power.' },
            { level: 'L2', marks: 2,
              q: 'Simplify log₆ 4 + log₆ 9.',
              key: 'log₆ 36 = 2. Marks: 1 product law, 1 value.' },
            { level: 'L2', marks: 2,
              q: 'Simplify log₂ 48 − log₂ 3.',
              key: 'log₂ 16 = 4. Marks: 1 quotient law, 1 value.' },
            { level: 'L2', marks: 2,
              q: 'Evaluate log₅ 40 to three decimals.',
              key: 'ln 40 / ln 5 ≈ 2.292. Marks: 1 change of base, 1 value.' },
            { level: 'L2', marks: 3,
              q: 'Given log 2 ≈ 0.3010 and log 3 ≈ 0.4771, find log 12 and log 1.5.',
              key: 'log 12 = 2(0.3010) + 0.4771 = 1.0791; log 1.5 = 0.4771 − 0.3010 = 0.1761. Marks: 1 writing 12 = 2²·3, 1 log 12, 1 log 1.5.' },
            { level: 'L3', marks: 4,
              q: 'Solve log₂ x + log₂(x − 2) = 3.',
              key: 'log₂(x(x − 2)) = 3 → x² − 2x − 8 = 0 → (x − 4)(x + 2) = 0 → x = 4 (x = −2 rejected: x − 2 > 0 needed) → x = 4. Marks: 1 condensing, 1 exponential form, 1 quadratic, 1 rejecting −2.' }
          ],
          words: [
            { en: 'product law', ru: 'свойство произведения' },
            { en: 'quotient law', ru: 'свойство частного' },
            { en: 'power law', ru: 'свойство степени' },
            { en: 'to expand / to condense', ru: 'раскрыть / свернуть' },
            { en: 'change of base', ru: 'переход к другому основанию' },
            { en: 'to three decimals', ru: 'до трёх знаков' }
          ]
        },
        {
          title: 'Уравнения и модели',
          goal: 'Exponential and logarithmic equations, applications',
          youtube: 'MHF4U solving exponential equations logarithms applications',
          focus: 'solving bˣ = k with logs; equations with the variable in two exponents; log equations with checks; compound interest and doubling time; pH scale',
          writing: 'Writing (3–4 sentences): explain the steps to solve 5ˣ = 20 and why the answer is not a "nice" number.',
          terms: ['taking the logarithm of both sides', 'logarithmic scale'],
          text: null,
          tasks: [
            { level: 'L2', marks: 2,
              q: 'Solve 5ˣ = 20 to three decimals.',
              key: 'x = log 20 / log 5 ≈ 1.861. Marks: 1 logs of both sides, 1 value.' },
            { level: 'L2', marks: 3,
              q: 'Solve 3^(2x−1) = 7 to three decimals.',
              key: '2x − 1 = log₃ 7 = ln 7 / ln 3 ≈ 1.771 → x ≈ 1.386. Marks: 1 log, 1 isolating 2x − 1, 1 value.' },
            { level: 'L2', marks: 4,
              q: 'Solve log(x + 3) + log x = 1.',
              key: 'log(x(x + 3)) = 1 → x² + 3x − 10 = 0 → (x + 5)(x − 2) = 0 → x = 2 (x = −5 rejected). Marks: 1 condensing, 1 exponential form, 1 roots, 1 rejecting −5.' },
            { level: 'L2', marks: 3,
              q: '$2000 is invested at 6% per year, compounded annually. How long until it doubles (one decimal)?',
              key: '1.06ᵗ = 2 → t = ln 2 / ln 1.06 ≈ 11.9 years. Marks: 1 equation, 1 logs, 1 value.' },
            { level: 'L2', marks: 3,
              q: 'pH = −log[H⁺]. (a) Find the pH when [H⁺] = 3.2 × 10⁻⁵ mol/L (two decimals). (b) Find [H⁺] when pH = 2.5 (three significant figures).',
              key: '(a) 4.49; (b) 10^(−2.5) ≈ 3.16 × 10⁻³ mol/L. Marks: 1 (a), 1 conversion for (b), 1 value.' },
            { level: 'L3', marks: 4,
              q: 'Solve 2ˣ = 3^(x−1) to four decimals.',
              key: 'x ln 2 = (x − 1) ln 3 → x(ln 3 − ln 2) = ln 3 → x = ln 3 / ln(3/2) ≈ 2.7095. Marks: 1 logs of both sides, 1 collecting x, 1 exact form, 1 value.' }
          ],
          words: [
            { en: 'compound interest', ru: 'сложный процент' },
            { en: 'to compound annually', ru: 'начислять ежегодно' },
            { en: 'doubling time', ru: 'время удвоения' },
            { en: 'significant figures', ru: 'значащие цифры' },
            { en: 'scale', ru: 'шкала' },
            { en: 'concentration', ru: 'концентрация' }
          ]
        }
      ]
    },

    /* ================= Б16 · все дорожки ================= */
    {
      id: 'B16', track: 'all', title: 'Финалы семестра: экзамен MHF4U и итоговые ENG2D', deadline: '2027-01-30',
      note: 'MHF4U — продвинутые функции (12 класс); ENG2D — английский 10 класса. Порядок и даты уточняются по планам учителей. Опорные задания и глоссарий — есть (2.8.1).',
      lessons: [
        {
          track: 'math',
          title: 'Композиция и скорость изменения',
          goal: 'Combining functions and rates of change',
          youtube: 'MHF4U composition of functions average instantaneous rate of change',
          focus: 'sums, products and compositions; domain of a composition; average rate of change; estimating instantaneous rate with a small h',
          writing: 'Writing (3–4 sentences): explain the difference between an average and an instantaneous rate of change, with one everyday example (speed).',
          terms: ['composition of functions', 'instantaneous rate of change'],
          text: null,
          tasks: [
            { level: 'L2', marks: 2,
              q: 'f(x) = 2x − 3, g(x) = x² + 1. Find (f ∘ g)(2) and (g ∘ f)(2).',
              key: 'f(g(2)) = f(5) = 7; g(f(2)) = g(1) = 2. Marks: 1 each.' },
            { level: 'L2', marks: 3,
              q: 'f(x) = √(x − 1), g(x) = x². State the domain of (f ∘ g)(x).',
              key: 'f(g(x)) = √(x² − 1), need x² − 1 ≥ 0 → x ≤ −1 or x ≥ 1. Marks: 1 composition, 1 inequality, 1 both pieces.' },
            { level: 'L2', marks: 2,
              q: 'Find the average rate of change of f(x) = x³ on [1, 3].',
              key: '(27 − 1)/2 = 13. Marks: 1 formula, 1 value.' },
            { level: 'L2', marks: 3,
              q: 'Estimate the instantaneous rate of change of f(x) = x² at x = 3 using h = 0.01.',
              key: '(3.01² − 9)/0.01 = 6.01 ≈ 6. Marks: 1 setup, 1 value, 1 interpretation (slope of the tangent ≈ 6).' },
            { level: 'L2', marks: 2,
              q: 'f(x) = x + 2, g(x) = x − 2. Find (f + g)(x) and (f · g)(x) and state their domains.',
              key: '2x; x² − 4; all real numbers. Marks: 1 each function.' },
            { level: 'L3', marks: 4,
              q: 'f(x) = (x + 1)/(x − 1). Find f(f(x)) in simplest form and state the restrictions.',
              key: '((x + 1)/(x − 1) + 1)/((x + 1)/(x − 1) − 1) = (2x/(x − 1))/(2/(x − 1)) = x, with x ≠ 1. Marks: 1 substitution, 1 common denominators, 1 simplifying, 1 restriction.' }
          ],
          words: [
            { en: 'composition', ru: 'композиция' },
            { en: 'to compose', ru: 'составлять (функции)' },
            { en: 'average rate of change', ru: 'средняя скорость изменения' },
            { en: 'instantaneous', ru: 'мгновенный' },
            { en: 'tangent', ru: 'касательная' },
            { en: 'slope', ru: 'наклон (угловой коэффициент)' }
          ]
        },
        {
          track: 'math',
          title: 'Повтор: многочлены и дроби',
          goal: 'Exam review: polynomials and rationals',
          youtube: 'MHF4U exam review polynomial rational functions',
          focus: 'factoring and solving cubics; rational inequality; asymptotes and intercepts of a rational function; remainder theorem; family of polynomials from a point',
          writing: 'Writing (3–4 sentences): describe how you check a rational-inequality answer with one test point from each interval.',
          terms: ['end behaviour', 'leading coefficient test'],
          text: null,
          tasks: [
            { level: 'L2', marks: 3,
              q: 'Solve x³ − 3x² − 4x + 12 = 0.',
              key: 'x²(x − 3) − 4(x − 3) = (x − 3)(x − 2)(x + 2) → x = 3, 2, −2. Marks: 1 grouping, 1 factors, 1 roots.' },
            { level: 'L2', marks: 3,
              q: 'Solve (x − 1)/(x + 2) < 0.',
              key: 'critical values −2 and 1 → (−2, 1). Marks: 1 critical values, 1 sign chart, 1 open brackets.' },
            { level: 'L2', marks: 3,
              q: 'f(x) = (2x² − 8)/(x² − 1). State the horizontal asymptote, the vertical asymptotes and the x-intercepts.',
              key: 'y = 2; x = ±1; x = ±2. Marks: 1 each.' },
            { level: 'L2', marks: 2,
              q: 'Find the remainder when x⁴ − 3x + 2 is divided by x + 1.',
              key: 'P(−1) = 1 + 3 + 2 = 6. Marks: 1 P(−1), 1 value.' },
            { level: 'L2', marks: 3,
              q: 'A cubic has zeros −1, 2 and 3 and passes through (0, 12). Find a.',
              key: 'f(x) = a(x + 1)(x − 2)(x − 3); f(0) = 6a = 12 → a = 2. Marks: 1 family, 1 substitution, 1 a.' },
            { level: 'L3', marks: 4,
              q: 'Solve (x² − 9)/(x² + x − 6) ≥ 0.',
              key: '(x − 3)(x + 3)/((x + 3)(x − 2)) = (x − 3)/(x − 2) with x ≠ −3 → (−∞, −3) ∪ (−3, 2) ∪ [3, ∞). Marks: 1 factoring, 1 cancel with restriction, 1 sign chart, 1 excluding −3.' }
          ],
          words: [
            { en: 'end behaviour', ru: 'поведение на концах' },
            { en: 'leading coefficient', ru: 'старший коэффициент' },
            { en: 'parity (even / odd)', ru: 'чётность' },
            { en: 'to review', ru: 'повторять (материал)' },
            { en: 'exam', ru: 'экзамен' },
            { en: 'to justify', ru: 'обосновать' }
          ]
        },
        {
          track: 'math',
          title: 'Повтор: тригонометрия',
          goal: 'Exam review: trigonometry',
          youtube: 'MHF4U exam review trigonometric functions',
          focus: 'exact values; equations on [0, 2π); an identity; reading parameters of a sinusoid; ratios from a quadrant; a quadratic equation in cos (stretch)',
          writing: 'Writing (3–4 sentences): explain how the CAST rule helps you find the sign of a ratio when only one ratio and the quadrant are known.',
          terms: ['CAST rule', 'parameters of a sinusoid'],
          text: null,
          tasks: [
            { level: 'L2', marks: 3,
              q: 'State exact values: sin(5π/6), cos(7π/4), tan(5π/3).',
              key: '1/2; √2/2; −√3. Marks: 1 each.' },
            { level: 'L2', marks: 3,
              q: 'Solve 2cos x + √3 = 0 on [0, 2π).',
              key: 'cos x = −√3/2 → 5π/6, 7π/6. Marks: 1 isolating, 1 reference angle, 1 both angles.' },
            { level: 'L2', marks: 2,
              q: 'Prove: (sin x + cos x)² = 1 + 2 sin x cos x.',
              key: 'sin²x + 2 sin x cos x + cos²x = 1 + 2 sin x cos x. Marks: 1 expansion, 1 Pythagorean identity.' },
            { level: 'L2', marks: 3,
              q: 'y = 4sin(3(x − π/6)) − 1. State the amplitude, period, phase shift and vertical shift.',
              key: '4; 2π/3; right π/6; down 1. Marks: 1 amplitude and period, 1 shift, 1 vertical.' },
            { level: 'L2', marks: 3,
              q: 'cos θ = −5/13 and θ is in quadrant III. Find sin θ and tan θ.',
              key: 'sin θ = −12/13; tan θ = 12/5. Marks: 1 Pythagorean, 1 signs, 1 tan.' },
            { level: 'L3', marks: 4,
              q: 'Solve 2sin²x + 3cos x − 3 = 0 on [0, 2π).',
              key: '2(1 − cos²x) + 3cos x − 3 = 0 → 2cos²x − 3cos x + 1 = 0 → (2cos x − 1)(cos x − 1) = 0 → cos x = 1 → 0; cos x = 1/2 → π/3, 5π/3 → 0, π/3, 5π/3. Marks: 1 identity, 1 quadratic, 1 factoring, 1 all angles.' }
          ],
          words: [
            { en: 'quadrant', ru: 'четверть' },
            { en: 'CAST rule', ru: 'правило знаков' },
            { en: 'parameter', ru: 'параметр' },
            { en: 'to isolate', ru: 'выразить (уединить)' },
            { en: 'to expand', ru: 'раскрыть скобки' },
            { en: 'both sides', ru: 'обе части' }
          ]
        },
        {
          track: 'math',
          title: 'Повтор: показательные и логарифмы',
          goal: 'Exam review: exponentials, logarithms and mixed',
          youtube: 'MHF4U exam review exponential logarithmic functions',
          focus: 'equations with common base; log equation; condensing; a tripling model; comparing average rates of an exponential; a log equation with a quotient (stretch)',
          writing: 'Writing (3–4 sentences): write a short exam checklist — three mistakes with logarithms you will check for before handing in.',
          terms: ['inverse functions (exponential and logarithm)', 'rate of change of an exponential'],
          text: null,
          tasks: [
            { level: 'L2', marks: 2,
              q: 'Solve 2^(3x) = 1/16.',
              key: '3x = −4 → x = −4/3. Marks: 1 common base, 1 answer.' },
            { level: 'L2', marks: 2,
              q: 'Solve log₃(2x − 1) = 2.',
              key: '2x − 1 = 9 → x = 5. Marks: 1 conversion, 1 answer.' },
            { level: 'L2', marks: 2,
              q: 'Simplify log 50 + log 2.',
              key: 'log 100 = 2. Marks: 1 law, 1 value.' },
            { level: 'L2', marks: 3,
              q: 'A culture of 200 bacteria triples every 4 hours. When will it reach 5400?',
              key: '200 · 3^(t/4) = 5400 → 3^(t/4) = 27 → t/4 = 3 → t = 12 h. Marks: 1 model, 1 27 = 3³, 1 t.' },
            { level: 'L2', marks: 3,
              q: 'f(x) = 2ˣ. Find the average rate of change on [0, 2] and on [2, 4], and describe what the comparison shows.',
              key: '(4 − 1)/2 = 1.5; (16 − 4)/2 = 6; the growth accelerates (rate quadrupled). Marks: 1 each rate, 1 interpretation.' },
            { level: 'L3', marks: 4,
              q: 'Solve log₂(x + 2) − log₂(x − 1) = 2.',
              key: 'log₂((x + 2)/(x − 1)) = 2 → (x + 2)/(x − 1) = 4 → x + 2 = 4x − 4 → x = 2; check x − 1 > 0 ✓. Marks: 1 quotient law, 1 exponential form, 1 solving, 1 check.' }
          ],
          words: [
            { en: 'inverse function', ru: 'обратная функция' },
            { en: 'reflection', ru: 'отражение' },
            { en: 'to triple', ru: 'утраиваться' },
            { en: 'culture (of bacteria)', ru: 'культура (бактерий)' },
            { en: 'to accelerate', ru: 'ускоряться' },
            { en: 'checklist', ru: 'контрольный список' }
          ]
        }
      ]
    },

    /* ================= К · субботы: задачи CEMC ================= */
    {
      id: 'B53', label: 'К', track: 'math', title: 'Субботы ⭐: задачи CEMC к CSMC 18 ноября', deadline: null,
      note: 'CEMC — центр математических конкурсов Университета Ватерлоо; CSMC — Canadian Senior Mathematics Contest, 18.11.2026 (в этом году — тренировка). Часть A — короткий ответ, часть B — полное решение с записью ходов.',
      lessons: [
        {
          type: 'contest',
          title: 'Алгебра: уравнения, системы, линейные модели',
          goal: 'три задачи в стиле CSMC на материале Б2',
          focus: 'consecutive integers; системы без полного решения; линейная модель с интерпретацией',
          tasks: [
            { part: 'A', marks: 2,
              q: 'The sum of three consecutive even integers is 108. What is the product of the smallest and the largest of the three?',
              ru: 'Сумма трёх последовательных чётных чисел равна 108. Найди произведение наименьшего и наибольшего.',
              key: 'n − 2, n, n + 2 → 3n = 108 → n = 36 → числа 34, 36, 38 → 34 · 38 = 1292. Ответ 1292.' },
            { part: 'A', marks: 2,
              q: 'If 2x + 3y = 12 and 3x + 2y = 13, what is the value of x + y?',
              ru: 'Найди x + y. Подсказка после попытки: систему можно не решать полностью.',
              key: 'Сложить уравнения: 5x + 5y = 25 → x + y = 5. Ответ 5. Полное решение (x = 3, y = 2) тоже верно, но дольше.' },
            { part: 'B', marks: 6,
              q: 'A repair shop charges a fixed diagnostic fee plus an hourly rate. A 2-hour repair costs $95 and a 5-hour repair costs $200. (a) Find the fee and the hourly rate. (b) For how many hours would a repair cost exactly $270? (c) Explain in one sentence why the cost function C(h) has domain h ≥ 0.',
              ru: 'Мастерская берёт фиксированную плату за диагностику плюс почасовую ставку. (а) Найди плату и ставку. (б) При каком числе часов ремонт стоит ровно $270? (в) Объясни одним предложением, почему область определения C(h) — h ≥ 0. Полное решение с записью ходов.',
              key: '(a) rate = (200 − 95)/3 = 35 $/h; fee = 95 − 2·35 = 25 $; C(h) = 25 + 35h (3 балла: уравнения, ставка, плата). (b) 25 + 35h = 270 → h = 7 (2). (c) время не бывает отрицательным; модель начинается в момент приёма устройства (1).' }
          ]
        },
        {
          type: 'contest',
          title: 'Числа: делимость и остатки',
          goal: 'три задачи на делимость, остатки и подсчёт',
          focus: 'остатки степеней; включение-исключение; произведение последовательных чисел',
          tasks: [
            { part: 'A', marks: 2,
              q: 'What is the remainder when 2¹⁰ is divided by 7?',
              ru: 'Остаток от деления 2¹⁰ на 7.',
              key: '2³ = 8 = 7 + 1, поэтому 2⁹ = (2³)³ даёт остаток 1, а 2¹⁰ = 2⁹ · 2 — остаток 2. Проверка: 1024 = 7 · 146 + 2. Ответ 2.' },
            { part: 'A', marks: 2,
              q: 'How many positive integers less than 100 are divisible by 3 but not by 5?',
              ru: 'Сколько натуральных чисел меньше 100 делятся на 3, но не на 5?',
              key: 'Кратных 3: 33 (3…99). Кратных 15: 6 (15…90). 33 − 6 = 27. Ответ 27.' },
            { part: 'B', marks: 6,
              q: '(a) Prove that for every integer n the number n³ − n is divisible by 6. (b) Find the smallest integer n > 1 for which n³ − n is divisible by 24.',
              ru: '(а) Докажи, что n³ − n делится на 6 при любом целом n. (б) Найди наименьшее целое n > 1, при котором n³ − n делится на 24. Полное решение.',
              key: '(a) n³ − n = (n − 1)·n·(n + 1) — произведение трёх последовательных целых (1); среди них есть чётное → делится на 2 (1); одно кратно 3 → делится на 3 (1); значит, на 6 (1). (b) n = 2: 6 — нет; n = 3: 24 — да. Ответ 3 (2).' }
          ]
        },
        {
          type: 'contest',
          title: 'Многочлены и функции',
          goal: 'три задачи на материале Б7',
          focus: 'минимум квадратичной; теорема об остатке; многочлен по корням и неравенство',
          tasks: [
            { part: 'A', marks: 2,
              q: 'f(x) = x² − 6x + 5. What is the minimum value of f(x)?',
              ru: 'Найди наименьшее значение функции.',
              key: 'Вершина при x = 3: f(3) = 9 − 18 + 5 = −4. Ответ −4 (не x = 3 — спрашивают значение).' },
            { part: 'A', marks: 2,
              q: 'When x³ + ax + 2 is divided by x − 1, the remainder is 6. What is the value of a?',
              ru: 'При делении на x − 1 остаток равен 6. Найди a.',
              key: 'По теореме об остатке p(1) = 1 + a + 2 = 6 → a = 3. Ответ 3.' },
            { part: 'B', marks: 6,
              q: 'The polynomial p(x) = x³ + bx² + cx + d has zeros 1, 2 and −3. (a) Find b, c and d. (b) Solve p(x) > 0 using a sketch or a sign chart. (c) Explain in one sentence why p(x) cannot have a fourth zero.',
              ru: 'Многочлен с корнями 1, 2 и −3. (а) Найди b, c, d. (б) Реши p(x) > 0 по наброску или таблице знаков. (в) Объясни одним предложением, почему четвёртого корня быть не может.',
              key: '(a) p(x) = (x − 1)(x − 2)(x + 3) = x³ − 7x + 6 → b = 0, c = −7, d = 6 (2; тот же многочлен, что в 7.4). (b) нули −3, 1, 2; старший коэффициент положительный → p > 0 на (−3, 1) ∪ (2, ∞); проверка p(0) = 6 > 0 (3). (c) степень 3 — не больше трёх нулей (1).' }
          ]
        },
        {
          type: 'contest',
          title: 'Цифры и делимость',
          goal: 'Digits and divisibility',
          focus: 'digit equations; inclusion–exclusion counting; equations in positive integers via factoring',
          tasks: [
            { part: 'A', marks: 2,
              q: 'A two-digit number equals four times the sum of its digits, and its units digit is 3 more than its tens digit. Find the number.',
              key: '10a + b = 4(a + b) → 6a = 3b → b = 2a; b − a = 3 → a = 3, b = 6 → 36 (check: 4 · 9 = 36).' },
            { part: 'A', marks: 3,
              q: 'How many positive integers n ≤ 100 are divisible by 3 or by 5 but not by 15?',
              key: 'multiples of 3: 33; of 5: 20; of 15: 6; divisible by 3 or 5: 33 + 20 − 6 = 47; remove the 6 multiples of 15: 41.' },
            { part: 'B', marks: 5,
              q: 'Find all pairs of positive integers (a, b) with a ≤ b such that 1/a + 1/b = 1/4.',
              key: '4(a + b) = ab → ab − 4a − 4b + 16 = 16 → (a − 4)(b − 4) = 16; factor pairs of 16 with a ≤ b: (1, 16), (2, 8), (4, 4) → (a, b) = (5, 20), (6, 12), (8, 8). Negative factor pairs give a ≤ 0, rejected. Marks: 1 for clearing denominators, 2 for the factored form (a − 4)(b − 4) = 16, 1 for all three pairs, 1 for rejecting the negative cases.' }
          ],
          words: [
            { en: 'two-digit number', ru: 'двузначное число' },
            { en: 'units digit / tens digit', ru: 'цифра единиц / десятков' },
            { en: 'divisible by', ru: 'делится на' },
            { en: 'at most', ru: 'не более' },
            { en: 'ordered pair', ru: 'упорядоченная пара' },
            { en: 'positive integer', ru: 'натуральное число' }
          ]
        },
        {
          type: 'contest',
          title: 'Длины и площади',
          goal: 'Lengths and areas',
          focus: 'perimeter–diagonal–area of a rectangle via (l + w)²; line through a point and the triangle with the axes; altitude in an isosceles triangle and the Pythagorean theorem',
          tasks: [
            { part: 'A', marks: 2,
              q: 'A rectangle has perimeter 34 and diagonal 13. Find its area.',
              key: 'l + w = 17, l² + w² = 169; (l + w)² = 289 = 169 + 2lw → lw = 60.' },
            { part: 'A', marks: 3,
              q: 'The line y = 2x + b passes through (3, 1). Find the area of the triangle formed by this line and the coordinate axes.',
              key: 'b = 1 − 6 = −5; y = 2x − 5; intercepts x = 5/2 and y = −5; area = ½ · 5/2 · 5 = 25/4 = 6.25.' },
            { part: 'B', marks: 5,
              q: 'In triangle ABC, AB = AC = 10 and BC = 12. Point D lies on BC with BD = 4. Find the exact length of AD.',
              key: 'let M be the midpoint of BC; AM ⟂ BC (isosceles), BM = 6, AM = √(100 − 36) = 8; DM = 6 − 4 = 2; AD = √(8² + 2²) = √68 = 2√17. Marks: 1 for using the midpoint/altitude, 1 for AM = 8, 1 for DM = 2, 1 for the Pythagorean step, 1 for the exact simplified form.' }
          ],
          words: [
            { en: 'perimeter', ru: 'периметр' },
            { en: 'diagonal', ru: 'диагональ' },
            { en: 'intercept', ru: 'точка пересечения с осью' },
            { en: 'isosceles', ru: 'равнобедренный' },
            { en: 'altitude', ru: 'высота (треугольника)' },
            { en: 'midpoint', ru: 'середина отрезка' },
            { en: 'exact value', ru: 'точное значение' }
          ]
        },
        {
          type: 'contest',
          title: 'Системы, композиции, подсчёт',
          goal: 'Systems, compositions, counting',
          focus: 'a two-variable system from a word problem; equation with compositions f(g(x)) = g(f(x)); counting digit strings with a fixed sum (cases or stars and bars)',
          tasks: [
            { part: 'A', marks: 2,
              q: 'Pens cost $3 each and notebooks $5 each. Someone buys 12 items for $46. How many notebooks?',
              key: 'p + n = 12, 3p + 5n = 46 → 3(12 − n) + 5n = 46 → 2n = 10 → n = 5 (and 7 pens).' },
            { part: 'A', marks: 3,
              q: 'f(x) = 2x + 1 and g(x) = x² − 2. Find all real x with f(g(x)) = g(f(x)).',
              key: 'f(g(x)) = 2x² − 3; g(f(x)) = (2x + 1)² − 2 = 4x² + 4x − 1; equal → 2x² + 4x + 2 = 0 → (x + 1)² = 0 → x = −1.' },
            { part: 'B', marks: 5,
              q: 'How many four-digit positive integers have digits that add up to 5?',
              key: 'digits a, b, c, d with a ≥ 1 and a + b + c + d = 5. Put a′ = a − 1 ≥ 0: a′ + b + c + d = 4 with all ≥ 0 → C(4 + 3, 3) = C(7, 3) = 35; no digit can exceed 9, so no case is lost. Alternative by cases on the first digit: a = 1: 15, a = 2: 10, a = 3: 6, a = 4: 3, a = 5: 1 → 35. Marks: 1 for the digit equation with a ≥ 1, 2 for the counting method, 1 for the arithmetic, 1 for checking the ≤ 9 condition.' }
          ],
          words: [
            { en: 'system of equations', ru: 'система уравнений' },
            { en: 'composition', ru: 'композиция (функций)' },
            { en: 'to add up to', ru: 'давать в сумме' },
            { en: 'four-digit', ru: 'четырёхзначный' },
            { en: 'case', ru: 'случай (при разборе)' },
            { en: 'to justify', ru: 'обосновать' }
          ]
        },
        {
          type: 'contest',
          title: 'Алгебра и модуль',
          goal: 'Algebra and absolute value',
          focus: 'sum of consecutive odd integers; symmetric expressions x² + 1/x², x³ + 1/x³ from x + 1/x; an equation with two absolute values by cases',
          tasks: [
            { part: 'A', marks: 2,
              q: 'Find the sum of the first 40 odd positive integers.',
              key: '1 + 3 + … + 79 = 40² = 1600.' },
            { part: 'A', marks: 3,
              q: 'If x + 1/x = 3, find x² + 1/x² and x³ + 1/x³.',
              key: 'x² + 1/x² = 3² − 2 = 7; x³ + 1/x³ = 3³ − 3·3 = 18.' },
            { part: 'B', marks: 5,
              q: 'Find all real x such that |x − 1| + |x − 3| = 4.',
              key: 'cases: x ≥ 3: 2x − 4 = 4 → x = 4 ✓; 1 ≤ x < 3: 2 = 4, none; x < 1: 4 − 2x = 4 → x = 0 ✓ → x = 0 or x = 4. Marks: 1 correct case boundaries, 1 each case (3), 1 final answer with both values.' }
          ],
          words: [
            { en: 'odd / even integer', ru: 'нечётное / чётное число' },
            { en: 'absolute value', ru: 'модуль' },
            { en: 'case', ru: 'случай' },
            { en: 'to expand', ru: 'раскрыть' },
            { en: 'identity', ru: 'тождество' },
            { en: 'sum', ru: 'сумма' }
          ]
        },
        {
          type: 'contest',
          title: 'Геометрия и окружности',
          goal: 'Geometry and circles',
          focus: 'incircle radius of a right triangle; centre and radius by completing the square; area of a triangle in a square by coordinates or subtraction',
          tasks: [
            { part: 'A', marks: 2,
              q: 'A right triangle has legs 5 and 12. Find the radius of its inscribed circle.',
              key: 'hypotenuse 13; r = (5 + 12 − 13)/2 = 2.' },
            { part: 'A', marks: 3,
              q: 'Find the centre and radius of the circle x² + y² − 6x + 4y − 12 = 0.',
              key: '(x − 3)² + (y + 2)² = 25 → centre (3, −2), radius 5.' },
            { part: 'B', marks: 5,
              q: 'ABCD is a square of side 4. M is the midpoint of BC and N is the midpoint of CD. Find the area of triangle AMN.',
              key: 'A(0, 0), B(4, 0), C(4, 4), D(0, 4), M(4, 2), N(2, 4); shoelace: ½|4·4 − 2·2| = 6; or 16 − 4 − 4 − 2 = 6 by subtracting three right triangles. Marks: 1 coordinates or a clear figure, 2 method, 1 arithmetic, 1 answer.' }
          ],
          words: [
            { en: 'inscribed circle', ru: 'вписанная окружность' },
            { en: 'hypotenuse', ru: 'гипотенуза' },
            { en: 'to complete the square', ru: 'выделить полный квадрат' },
            { en: 'midpoint', ru: 'середина' },
            { en: 'area', ru: 'площадь' },
            { en: 'vertex / vertices', ru: 'вершина / вершины' }
          ]
        },
        {
          type: 'contest',
          title: 'Подсчёт и вероятность',
          goal: 'Counting and probability',
          focus: 'counting integers with distinct digits; probability with two dice; committees with a forbidden pair (complement counting)',
          tasks: [
            { part: 'A', marks: 2,
              q: 'How many three-digit positive integers have all digits different?',
              key: '9 · 9 · 8 = 648.' },
            { part: 'A', marks: 3,
              q: 'Two fair dice are rolled. What is the probability that the sum is 8?',
              key: 'favourable (2,6), (3,5), (4,4), (5,3), (6,2) → 5/36.' },
            { part: 'B', marks: 5,
              q: 'A committee of 3 is chosen from 6 people. Two particular people refuse to serve together. How many committees are possible?',
              key: 'C(6, 3) − (committees with both) = 20 − C(4, 1) = 16. Marks: 1 total 20, 2 counting the forbidden committees, 1 subtraction, 1 answer with justification.' }
          ],
          words: [
            { en: 'digit', ru: 'цифра' },
            { en: 'distinct', ru: 'различный' },
            { en: 'fair die / dice', ru: 'честная игральная кость / кости' },
            { en: 'probability', ru: 'вероятность' },
            { en: 'committee', ru: 'комитет' },
            { en: 'to refuse', ru: 'отказаться' }
          ]
        },
        {
          type: 'contest',
          title: 'Функции и текстовые задачи',
          goal: 'Functions and word problems',
          focus: 'a linear function from two values; average speed over a whole trip; divisibility via division with remainder',
          tasks: [
            { part: 'A', marks: 2,
              q: 'f(x) = ax + b, f(2) = 7 and f(5) = 16. Find f(10).',
              key: 'a = 3, b = 1 → f(10) = 31.' },
            { part: 'A', marks: 3,
              q: 'A car travels 60 km at 40 km/h and then 60 km at 60 km/h. Find the average speed for the whole trip.',
              key: 'time 1.5 h + 1 h = 2.5 h; 120/2.5 = 48 km/h.' },
            { part: 'B', marks: 5,
              q: 'Find all positive integers n such that n² + 15 is divisible by n + 3.',
              key: 'n² + 15 = (n + 3)(n − 3) + 24, so n + 3 must divide 24; n + 3 ∈ {4, 6, 8, 12, 24} → n = 1, 3, 5, 9, 21. Marks: 2 division with remainder 24, 1 listing divisors of 24 greater than 3, 1 all n, 1 checking one value.' }
          ],
          words: [
            { en: 'average speed', ru: 'средняя скорость' },
            { en: 'whole trip', ru: 'весь путь' },
            { en: 'divisible by', ru: 'делится на' },
            { en: 'divisor', ru: 'делитель' },
            { en: 'remainder', ru: 'остаток' },
            { en: 'to list', ru: 'перечислить' }
          ]
        }
      ]
    }
  ]
});
