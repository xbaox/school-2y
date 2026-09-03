/* ============================================================
   content/phase1.js — Фаза 1 «Семестр 1», Б7–Б16 + блок К (субботы).
   Пакет v2.7.0 «Корень». Заменяет каркас 2.6.0 целиком.

   Формат урока (ТЗ v2.7.0, этап 3.1):
     title, goal, youtube, focus, writing        — как в phase0.js
     terms   — ключи content/glossary.js (или инлайн {en, ru, def, ex, non})
     text    — текст для чтения / условие большой задачи, или null
     tasks   — 5 опорных заданий: 4 уровня L1–L2 + 1 стретч L3
               { q, ru, marks, level, key, probe }  (probe — код категории долга)
               null = задания придут следующим пакетом контента
     type: 'contest' — субботний урок: 3 задачи { part, q, ru, marks, key }

   Заполнено сейчас: Б7, Б8 (все поля), К.1–К.3.
   Б9–Б16 и К.4–К.10 — структура; tasks/text/terms приедут:
     2.7.1 (≈14.09, после планов курсов от учителей): Б9, Б10, К.4–К.6
     2.7.2 (≈05.10): Б11–Б16, К.7–К.10
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
      note: 'Опорные задания и глоссарий — пакет 2.7.1 (после планов курсов от учителей).',
      lessons: [
        { title: 'Теорема о корне и разложение кубических', goal: 'factor theorem; подбор корня; разложение группировкой; сумма и разность кубов', youtube: 'factor theorem factoring cubic polynomials', focus: 'rational zero test (подбор делителей свободного члена); деление после найденного корня; sum/difference of cubes', writing: '3 предложения: объяснить, почему x − 2 — множитель данного многочлена', terms: [], text: null, tasks: null },
        { title: 'Уравнения многочленов и их графики', goal: 'решать p(x) = 0 через разложение; связывать корни с графиком', youtube: 'solving polynomial equations by factoring', focus: 'real roots; кратность корня на графике; проверка подстановкой', writing: 'Объяснение решения уравнения 4 предложениями (первое лицо, present simple)', terms: [], text: null, tasks: null },
        { title: 'Неравенства многочленов: таблица знаков', goal: 'решать p(x) > 0 через нули и таблицу знаков (interval chart)', youtube: 'polynomial inequalities sign chart interval table', focus: 'нули → интервалы → знак на каждом → запись ответа в interval notation', writing: '3 предложения: как таблица знаков даёт ответ неравенства', terms: [], text: null, tasks: null },
        { title: 'Семейства многочленов + мини-тест Б9', goal: 'family of polynomials через параметр a; повтор блока', youtube: 'families of polynomial functions', focus: 'одинаковые нули, разные a; уравнение по графику; мини-тест 9.1–9.3', writing: 'Разбор ошибки в чужом решении: 3–4 предложения', terms: [], text: null, tasks: null }
      ]
    },

    /* ================= Б10 · письмо и чтение ================= */
    {
      id: 'B10', track: 'write', title: 'Абзац-мнение и новостная заметка: формат OSSLT', deadline: '2026-11-01',
      note: 'OSSLT — провинциальный тест грамотности, обязателен для диплома; окно ноябрь 2026 или март–апрель 2027 (скажет школа). Опорные задания — пакет 2.7.1.',
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
      note: 'Опорные задания — пакет 2.7.2.',
      lessons: [
        { title: 'Обратные величины 1/f(x) и вертикальные асимптоты', goal: 'reciprocal function; vertical asymptote там, где знаменатель = 0; holes', youtube: 'reciprocal functions vertical asymptotes holes', focus: 'домен рациональной функции; поведение около асимптоты; знак с двух сторон', writing: '3 предложения: почему у функции есть вертикальная асимптота при x = 2', terms: [], text: null, tasks: null },
        { title: 'Горизонтальные и наклонные асимптоты, набросок', goal: 'horizontal/oblique asymptote по степеням числителя и знаменателя; end behaviour; набросок', youtube: 'horizontal oblique asymptotes rational functions graphing', focus: 'сравнение степеней; деление для наклонной асимптоты; пересечения с осями', writing: 'Описание графика 4 предложениями с терминами', terms: [], text: null, tasks: null },
        { title: 'Рациональные уравнения и неравенства', goal: 'решать с проверкой на посторонние корни; неравенства через таблицу знаков', youtube: 'solving rational equations and inequalities', focus: 'общий знаменатель; restrictions; таблица знаков с нулями и асимптотами', writing: 'Объяснение решения 4–5 предложениями', terms: [], text: null, tasks: null },
        { title: 'Задачи на рациональные модели + мини-тест Б11', goal: 'средняя стоимость C(x)/x, концентрация; повтор блока', youtube: 'rational function word problems average cost', focus: 'модель → асимптота как предел; интерпретация словами; мини-тест 11.1–11.3', writing: 'Интерпретация асимптоты в бизнес-задаче: 3 предложения', terms: [], text: null, tasks: null }
      ]
    },

    /* ================= Б12 · письмо и чтение (было: маркетинг) ================= */
    {
      id: 'B12', track: 'write', title: 'Литературный анализ для ENG2D', deadline: '2026-11-29',
      note: 'Маркетинг переехал в Ф2 вместе с BMI3C (маркетинг, 11 класс, 2-й семестр). Опорные задания — пакет 2.7.2.',
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
      note: 'Опорные задания — пакет 2.7.2.',
      lessons: [
        { title: 'Радианы, дуга, особые углы, правило CAST', goal: 'радианы ↔ градусы; длина дуги; точные значения для π/6, π/4, π/3; знаки по четвертям', youtube: 'radians special angles unit circle CAST rule', focus: 'unit circle; exact values; related acute angle', writing: '3 предложения: почему радиан — «естественная» единица (через дугу)', terms: [], text: null, tasks: null },
        { title: 'Графики sin, cos, tan и их преобразования', goal: 'y = a·sin(k(x − d)) + c: amplitude, period 2π/k, phase shift, vertical shift', youtube: 'graphing sine cosine transformations amplitude period phase shift', focus: 'параметры → график и обратно; моделирование (высота, температура)', writing: 'Описание графика 4 предложениями с терминами', terms: [], text: null, tasks: null },
        { title: 'Тождества: основные, суммы углов, двойного угла', goal: 'reciprocal, quotient, Pythagorean identities; compound angle; double angle', youtube: 'trigonometric identities compound angle double angle', focus: 'доказательство тождества по одной стороне; выбор нужной формулы', writing: 'Доказательство тождества как текст: 4 шага, каждый — предложение', terms: [], text: null, tasks: null },
        { title: 'Тригонометрические уравнения на [0, 2π] + мини-тест Б13', goal: 'решать sin, cos, tan уравнения и квадратные по тригонометрической функции', youtube: 'solving trigonometric equations 0 to 2pi', focus: 'все решения на отрезке; CAST; проверка; мини-тест 13.1–13.3', writing: 'Объяснение решения 4–5 предложениями', terms: [], text: null, tasks: null }
      ]
    },

    /* ================= Б14 · письмо и чтение ================= */
    {
      id: 'B14', track: 'write', title: 'OSSLT-генеральная', deadline: '2026-12-20',
      note: 'Если школа назначит тест на ноябрь — дедлайн блока сдвигается пакетом 2.7.1 (поле deadlineSource: content). Опорные задания — пакет 2.7.2.',
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
      note: 'В каркасе 2.6.0 этой темы не было — а это целый раздел MHF4U и экзамена. Опорные задания — пакет 2.7.2.',
      lessons: [
        { title: 'Показательные функции и законы степеней', goal: 'y = a·bˣ, преобразования, асимптота y = 0; exponent laws', youtube: 'exponential functions graphs transformations exponent laws', focus: 'рост и убывание по b; горизонтальная асимптота; решение простых показательных уравнений приведением к одному основанию', writing: '3 предложения: описать график y = 3·2ˣ − 1', terms: [], text: null, tasks: null },
        { title: 'Логарифм: определение и законы', goal: 'log ↔ степень; laws of logarithms; вычисление без калькулятора', youtube: 'logarithms introduction laws of logarithms', focus: 'y = logₐx ⇔ aʸ = x; product, quotient, power laws; change of base', writing: 'Объяснение одним абзацем: что такое логарифм (по схеме определения)', terms: [], text: null, tasks: null },
        { title: 'Показательные и логарифмические уравнения', goal: 'решать через логарифмирование и свойства; проверка области', youtube: 'solving exponential and logarithmic equations', focus: 'посторонние корни у log-уравнений; округление; запись ответа', writing: 'Объяснение решения 4–5 предложениями', terms: [], text: null, tasks: null },
        { title: 'Рост, распад, сложные проценты + мини-тест Б15', goal: 'half-life, doubling time, compound interest A = P(1 + r/n)ⁿᵗ', youtube: 'exponential growth decay half life compound interest problems', focus: 'модель из условия; решение уравнения; интерпретация ответа словами (бизнес-контекст)', writing: 'Интерпретация результата в бизнес-задаче: 3 предложения', terms: [], text: null, tasks: null }
      ]
    },

    /* ================= Б16 · все дорожки ================= */
    {
      id: 'B16', track: 'all', title: 'Финалы семестра: экзамен MHF4U и итоговые ENG2D', deadline: '2027-01-30',
      note: 'MHF4U — продвинутые функции (12 класс); ENG2D — английский 10 класса. Порядок и даты уточняются по планам учителей.',
      lessons: [
        { title: 'Комбинирование функций и скорость изменения', goal: 'f + g, f·g, f∘g; average и instantaneous rate of change через секущие', youtube: 'combining functions composition average rate of change', focus: 'domain композиции; rate of change из таблицы и графика', writing: '3 предложения: интерпретация средней скорости изменения в задаче', terms: [], text: null, tasks: null },
        { title: 'Экзамен MHF4U: смешанная практика по разделам', goal: 'задачи каждого раздела в экзаменационном формате', youtube: 'MHF4U exam review', focus: 'по плану учителя Kent; part marks; распределение времени', writing: 'Объяснение одного решения экзаменационного уровня', terms: [], text: null, tasks: null },
        { title: 'Итоговая работа ENG2D: эссе и экзамен', goal: 'структура эссе по тексту курса; стратегия экзамена по английскому', youtube: 'literary essay structure grade 10 exam strategy', focus: 'thesis → 3 абзаца PEEL → заключение; управление временем; цитаты наизусть', writing: 'План эссе + один абзац', terms: [], text: null, tasks: null },
        { title: 'Экзаменационная симуляция и разбор', goal: 'полный прогон в условиях экзамена; разбор потерь', youtube: 'exam day strategy', focus: 'таймер; чек-лист языка; что делать при затыке', writing: 'Самоанализ после прогона: 4 предложения', terms: [], text: null, tasks: null }
      ]
    },

    /* ================= К · субботы: задачи CEMC ================= */
    {
      id: 'B53', label: 'К', track: 'math', title: 'Субботы ⭐: задачи CEMC к CSMC 18 ноября', deadline: null,
      note: 'CEMC — центр математических конкурсов Университета Ватерлоо; CSMC — Canadian Senior Mathematics Contest, 18.11.2026 (в этом году — тренировка). Часть A — короткий ответ, часть B — полное решение с записью ходов.',
      lessons: [
        {
          type: 'contest',
          title: 'К.1 · Алгебра: уравнения, системы, линейные модели',
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
          title: 'К.2 · Числа: делимость и остатки',
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
          title: 'К.3 · Многочлены и функции',
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
        { type: 'contest', title: 'К.4 · Геометрия: площади и подобие', goal: 'три задачи', focus: 'площади через разбиение; подобные треугольники; координаты', tasks: null },
        { type: 'contest', title: 'К.5 · Комбинаторика: подсчёт', goal: 'три задачи', focus: 'правило произведения; перестановки с ограничениями; дополнение', tasks: null },
        { type: 'contest', title: 'К.6 · Функции и графики', goal: 'три задачи', focus: 'композиция; обратная функция; график по условиям', tasks: null },
        { type: 'contest', title: 'К.7 · Показательные и логарифмы', goal: 'три задачи', focus: 'уравнения с одинаковым основанием; законы логарифмов; рост', tasks: null },
        { type: 'contest', title: 'К.8 · Тригонометрия и окружность', goal: 'три задачи', focus: 'особые углы; тождества; геометрия окружности', tasks: null },
        { type: 'contest', title: 'К.9 · Последовательности и суммы', goal: 'три задачи', focus: 'арифметическая и геометрическая прогрессии; телескопические суммы', tasks: null },
        { type: 'contest', title: 'К.10 · Генеральная: смесь в формате CSMC', goal: 'три задачи как на конкурсе', focus: 'часть A × 2, часть B × 1, на время 60 минут', tasks: null }
      ]
    }
  ]
});
