/* ============================================================
   content/glossary.js — единый глоссарий понятий (v2.7.0).
   Каждая запись: en — термин; def — категория + отличие (EN);
   ex — пример; non — не-пример; ru — полная русская строка.
   Уроки ссылаются на ключи в поле terms; prompts.js печатает
   [ГЛОССАРИЙ] дословно. ИИ определения не сочиняет.
   Термины — те, что ученик услышит в классе Онтарио.
   Подключать в index.html ДО пакетов фаз.
   ============================================================ */
(function (g) {
  if (window.CONTENT && CONTENT.registerGlossary) CONTENT.registerGlossary(g);
  else (window.__CONTENT_Q = window.__CONTENT_Q || []).push({ glossary: g });
})({

  /* ---------- Абзац и аргумент (PEEL — Point, Evidence, Explain, Link) ---------- */
  'point': {
    en: 'Point',
    def: 'the claim of a paragraph: one full sentence a reasonable reader could disagree with, which the paragraph then proves',
    ex: 'Refurbished phones are a better buy than new ones for most students.',
    non: '"Refurbished phones." (a topic) / "This paragraph is about phones." (a purpose)',
    ru: 'Point — утверждение абзаца: полное предложение, с которым разумный читатель может не согласиться и которое абзац доказывает. Не тема и не цель.'
  },
  'arguable': {
    en: 'arguable',
    def: 'a statement is arguable if a reasonable person could disagree with it, so it needs proof',
    ex: 'Cheaper screens cost a repair shop more than they save.',
    non: '"Water is wet." / "A shop should lower costs to save money." — nothing to prove',
    ru: 'Спорное утверждение — с ним можно не согласиться, поэтому его нужно доказывать. Очевидное или само по себе верное утверждение спорным не является.'
  },
  'evidence': {
    en: 'Evidence',
    def: 'a checkable fact that supports the Point: a number, an example, a quotation or a source, usually in the past tense',
    ex: 'In July I sold 14 refurbished laptops and earned $2,100.',
    non: '"I can earn a lot with my shop." (a prediction or opinion)',
    ru: 'Evidence — проверяемый факт в поддержку Point: число, случай, цитата или источник, обычно в прошедшем времени. Прогноз и мнение — не Evidence.'
  },
  'explain': {
    en: 'Explain (in PEEL)',
    def: 'the sentence that shows how the Evidence proves the Point — it interprets the evidence, often starting with "This shows that…"',
    ex: 'This shows that demand for cheaper repairs is real, not assumed.',
    non: 'repeating the Point in other words',
    ru: 'Explain — предложение, которое показывает, как Evidence доказывает Point; разбирает именно факт, часто начинается с «This shows that…». Пересказ Point другими словами — не Explain.'
  },
  'link': {
    en: 'Link',
    def: 'the final sentence that returns to the Point and closes the paragraph — no new facts',
    ex: 'Therefore, cheaper screens are justified for a shop like mine.',
    non: '"My competitor also uses them." (new evidence in the last sentence)',
    ru: 'Link — последнее предложение: возвращает к Point и закрывает абзац. Новых фактов в Link нет.'
  },
  'topic sentence': {
    en: 'topic sentence',
    def: 'the first sentence of a paragraph, which states its main point (in Ontario classrooms this is the Point)',
    ex: 'Heat is the main reason phone batteries age early.',
    non: 'a question, a quotation, or a sentence that only names the topic',
    ru: 'Topic sentence — первое предложение абзаца, в котором сформулирована его главная мысль (= Point).'
  },
  'concluding sentence': {
    en: 'concluding sentence',
    def: 'the last sentence of a paragraph, which restates the point and closes the paragraph (= Link)',
    ex: 'For these reasons, a warranty matters more than a low price.',
    non: 'a new example',
    ru: 'Concluding sentence — заключительное предложение абзаца, повторяет мысль другими словами и закрывает абзац (= Link).'
  },
  'thesis': {
    en: 'thesis',
    def: 'the main argument of a whole essay in one sentence — the Point of the entire essay',
    ex: 'Schools should replace printed textbooks with tablets because tablets are cheaper, lighter and always up to date.',
    non: 'the topic of the essay ("tablets in schools")',
    ru: 'Thesis (тезис) — главное утверждение всего эссе одним предложением; Point всего текста.'
  },

  /* ---------- Чтение ---------- */
  'main idea': {
    en: 'main idea',
    def: 'the most important thing the author says about the topic: a full sentence with a verb that covers the whole text',
    ex: 'Refurbished phones have become a trusted alternative to new phones.',
    non: '"refurbished phones" (a topic) / "sales grew by 15 percent" (a detail)',
    ru: 'Главная мысль — самое важное, что автор говорит о теме: полное предложение с глаголом, которое накрывает весь текст, а не один абзац.'
  },
  'topic': {
    en: 'topic',
    def: 'what a text is about: a word or a phrase, no verb',
    ex: 'battery aging',
    non: '"Batteries age faster in heat." (that is a main idea)',
    ru: 'Тема — о чём текст: слово или словосочетание без глагола.'
  },
  'supporting detail': {
    en: 'supporting detail',
    def: 'a fact, example or number that proves or illustrates the main idea',
    ex: 'Sales of refurbished devices grew by about 15 percent last year.',
    non: 'the main idea itself',
    ru: 'Деталь-поддержка — факт, пример или число, которое доказывает или иллюстрирует главную мысль.'
  },
  'paraphrase': {
    en: 'paraphrase',
    def: 'saying the same idea in your own words: same meaning, different words and sentence structure',
    ex: '"sales grew by about 15 percent" → "sales rose by roughly one seventh"',
    non: 'copying the sentence and changing one word',
    ru: 'Пересказ (paraphrase) — та же мысль своими словами: смысл тот же, слова и строение предложения другие. Копия с одним заменённым словом — не пересказ.'
  },
  'summary': {
    en: 'summary',
    def: 'a short retelling of the main points of a text in your own words, in order, without opinion — about a quarter of the length',
    ex: 'a 4-sentence retelling of a 20-sentence article',
    non: 'a review ("I liked it") / a paraphrase of one sentence',
    ru: 'Summary — краткий пересказ главных мыслей текста своими словами, по порядку, без своего мнения; примерно четверть длины оригинала.'
  },
  'inference': {
    en: 'inference',
    def: 'a conclusion the text does not state directly, built from a clue in the text plus what you already know — always supported by a quoted line',
    ex: '"She looked at the floor" → she is not telling the whole truth.',
    non: 'a fact stated in the text ("Marco has worked there eleven years")',
    ru: 'Вывод (inference) — заключение, которого в тексте нет дословно: подсказка из текста + то, что ты знаешь; всегда с опорой на конкретную строку.'
  },
  'fact vs opinion': {
    en: 'fact vs opinion',
    def: 'a fact can be checked and proved; an opinion is what someone believes and cannot be proved true or false',
    ex: 'fact: "The phone costs $400." opinion: "The phone is too expensive."',
    non: 'a prediction ("Prices will fall") is neither — it is a forecast',
    ru: 'Факт можно проверить и доказать; мнение — то, во что человек верит, его нельзя доказать. Прогноз — ни то ни другое.'
  },
  'cite': {
    en: 'cite',
    def: 'show where in the text your evidence comes from: a quotation, a paragraph or a page',
    ex: 'In paragraph 2 the author writes that "a buyer no longer has to gamble."',
    non: '"The text says it is safe." (no place, no words)',
    ru: 'Cite — указать, откуда взято доказательство: цитата, абзац или страница.'
  },

  /* ---------- Команды заданий (command words) ---------- */
  'state': {
    en: 'state',
    def: 'give the answer or fact only — no working, no explanation',
    ex: 'State the y-intercept. → The y-intercept is −5.',
    non: 'a definition or a reason',
    ru: 'State — назвать результат или факт, без хода решения и без объяснения.'
  },
  'define': {
    en: 'define',
    def: 'give the general meaning of a term: its category and what makes it different — not an example, not a number',
    ex: 'Define slope. → Slope is a measure of the steepness of a line.',
    non: '"The slope is 3." / "Slope is like a hill."',
    ru: 'Define — дать общее значение термина: категория + отличие. Пример или число — не определение.'
  },
  'explain (command)': {
    en: 'explain (command word)',
    def: 'say how or why something works or happens, step by step — the mechanism, not just the name',
    ex: 'Explain why the graph falls to the right. → Because the leading coefficient is negative, …',
    non: 'naming the result without the "because"',
    ru: 'Explain как команда — показать, как или почему что-то происходит, по шагам; назвать результат недостаточно.'
  },
  'describe': {
    en: 'describe',
    def: 'say what something looks like or what happens, in order, without giving reasons',
    ex: 'Describe the end behaviour. → As x → ∞, f(x) → −∞; as x → −∞, f(x) → ∞.',
    non: 'giving reasons why (that is explain)',
    ru: 'Describe — сказать, как выглядит или что происходит, по порядку, без причин.'
  },
  'identify': {
    en: 'identify',
    def: 'name or point out — one word or phrase is enough',
    ex: 'Identify the literary device. → A metaphor.',
    non: 'a paragraph of analysis',
    ru: 'Identify — назвать или указать; достаточно слова или словосочетания.'
  },
  'justify': {
    en: 'justify',
    def: 'give reasons and evidence for a choice or a claim',
    ex: 'Justify your choice of supplier. → four sentences: choice, reason, objection answered, evidence',
    non: 'restating the choice',
    ru: 'Justify — обосновать: привести причины и доказательства выбора или утверждения.'
  },
  'compare': {
    en: 'compare',
    def: 'show similarities AND differences',
    ex: 'Compare markup and profit margin.',
    non: 'differences only (that is contrast)',
    ru: 'Compare — показать и сходства, и различия.'
  },
  'contrast': {
    en: 'contrast',
    def: 'show differences only',
    ex: 'Contrast a fact and an opinion.',
    non: 'listing what they have in common',
    ru: 'Contrast — показать только различия.'
  },
  'assess': {
    en: 'assess',
    def: 'weigh both sides and give a judgement (a verdict) at the end',
    ex: 'Assess whether the shop should buy cheaper screens. → pros, cons, then "Overall, …"',
    non: 'a list of pros and cons without a verdict',
    ru: 'Assess — взвесить обе стороны и в конце вынести вердикт.'
  },

  /* ---------- Язык фидбека учителя и рубрика Онтарио ---------- */
  'rubric': {
    en: 'rubric',
    def: 'the marking table teachers use: four categories (Knowledge & Understanding, Thinking, Communication, Application) × four levels',
    ex: 'Communication, Level 3: "ideas are organized and mostly clear"',
    non: 'the mark itself ("78 %")',
    ru: 'Rubric — таблица критериев оценки: четыре категории (знание и понимание, мышление, коммуникация, применение) на четыре уровня.'
  },
  'achievement levels': {
    en: 'Levels 1–4',
    def: 'Ontario achievement levels: Level 3 is the provincial standard (about 70–79 %); Level 4 = 80–100, Level 2 = 60–69, Level 1 = 50–59, R = below 50 (remediation)',
    ex: '"Level 3" on an essay ≈ 70–79 %',
    non: 'a percentage of questions answered',
    ru: 'Уровни 1–4 в Онтарио: уровень 3 — провинциальный стандарт (≈70–79 %); 4 = 80–100, 2 = 60–69, 1 = 50–59, R — ниже 50, нужна доработка.'
  },
  'vague': {
    en: 'vague — elaborate',
    def: 'teacher comment: too general, the reader cannot tell what exactly you mean; "elaborate" = add specific details or an example',
    ex: '"Many things happen to him." → "He loses his job in chapter 2 and his brother stops calling."',
    non: 'a sentence with a concrete fact',
    ru: 'Vague — слишком общо, непонятно, что именно имеется в виду; elaborate — добавь конкретные детали или пример.'
  },
  'run-on': {
    en: 'run-on / comma splice',
    def: 'two complete sentences joined only by a comma or by nothing — fix with a period, a semicolon or a conjunction',
    ex: '"He changes, this is because of his job." → "He changes because of his job."',
    non: 'a long sentence that is correctly joined with "because" or "and"',
    ru: 'Run-on (comma splice) — два самостоятельных предложения склеены запятой или ничем; лечится точкой, точкой с запятой или союзом. Длинное правильно соединённое предложение — не run-on.'
  },
  'fragment': {
    en: 'fragment',
    def: 'a piece of a sentence punctuated as a sentence — usually a subordinate clause without a main clause',
    ex: '"Because it is cheaper." (needs a main clause: "…, the shop buys it.")',
    non: 'a short complete sentence ("He left.")',
    ru: 'Fragment — обрывок, оформленный как предложение: чаще всего придаточное без главного. Короткое полное предложение — не фрагмент.'
  },

  /* ---------- Функции и многочлены (MHF4U — Advanced Functions, продвинутые функции, 12 класс) ---------- */
  'function notation': {
    en: 'function notation f(x)',
    def: 'the way of writing a function: f(x), read "f of x", is the output of function f at input x',
    ex: 'f(x) = 3x − 1, so f(2) = 5',
    non: 'f · x (multiplication)',
    ru: 'Запись функции f(x) читается «эф от икс» — значение функции f при входе x. Это не умножение f на x.'
  },
  'domain': {
    en: 'domain',
    def: 'the set of all input values (x) a function can take',
    ex: 'g(x) = √x has domain {x ∈ R | x ≥ 0}',
    non: 'the set of outputs (that is the range)',
    ru: 'Область определения (domain) — множество всех допустимых входов x.'
  },
  'range': {
    en: 'range',
    def: 'the set of all output values (y) a function actually produces',
    ex: 'g(x) = x² + 3 has range {y ∈ R | y ≥ 3}',
    non: 'the set of inputs (that is the domain)',
    ru: 'Область значений (range) — множество всех выходов y, которые функция действительно даёт.'
  },
  'polynomial function': {
    en: 'polynomial function',
    def: 'a function whose rule is a sum of terms a·xⁿ with whole-number exponents n ≥ 0',
    ex: 'f(x) = 2x³ − x + 7',
    non: 'f(x) = 1/x or f(x) = √x (negative or fractional exponents)',
    ru: 'Многочлен (polynomial function) — сумма слагаемых a·xⁿ с целыми неотрицательными показателями. 1/x и √x — не многочлены.'
  },
  'degree': {
    en: 'degree',
    def: 'the highest exponent of x in a polynomial after expanding',
    ex: '4x³ − x has degree 3',
    non: 'the number of terms',
    ru: 'Степень многочлена — наибольший показатель x после раскрытия скобок; число слагаемых — не степень.'
  },
  'leading coefficient': {
    en: 'leading coefficient',
    def: 'the coefficient of the term with the highest power of x',
    ex: '−2 in −2x³ + x',
    non: 'the constant term (+7)',
    ru: 'Старший коэффициент — число перед старшей степенью x.'
  },
  'end behaviour': {
    en: 'end behaviour',
    def: 'what f(x) does as x → +∞ and as x → −∞ — only the two ends of the graph, not the middle; for a polynomial it is set by the leading term; even degree — same direction both ends; odd — opposite',
    ex: 'for f(x) = x²: as x → ±∞, f(x) → +∞; y = −x³ rises on the left, falls on the right',
    non: 'where the graph crosses the x-axis; the y-intercept',
    ru: 'Поведение на концах — куда уходит f(x), когда x → +∞ и x → −∞; только концы графика, не середина.'
  },
  'zero': {
    en: 'zero (x-intercept)',
    def: 'a value of x for which f(x) = 0 — where the graph touches or crosses the x-axis; a root of P(x) = 0 is a value of x that makes the equation true; a zero of the function is the same value — the graph meets the x-axis there; "root" is said about the equation, "zero" about the function',
    ex: 'zeros of (x − 1)(x + 3) are 1 and −3; x = 5 is a root of x² − 25 = 0',
    non: 'the y-intercept f(0); x = 0 is not a root of x² − 25 = 0 (it gives −25)',
    ru: 'Нуль функции (zero, x-intercept) — значение x, при котором f(x) = 0: точка касания или пересечения с осью x. Root — о корне уравнения, zero — о нуле функции.'
  },
  'multiplicity': {
    en: 'multiplicity (order) of a zero',
    def: 'how many times a factor appears; it decides the shape at the zero: order 1 — crosses, order 2 — bounces (touches), order 3 — flattens and crosses; how many times the factor (x − a) appears in the fully factored form; odd multiplicity — the graph crosses the axis; even — it touches and bounces off; the degree equals the sum of multiplicities',
    ex: '(x − 1)² gives the zero 1 of order 2 — the graph bounces at x = 1; (x + 2)²(x − 3): zero −2 has order 2 (bounce), 3 has order 1 (cross)',
    non: 'the number of zeros; "multiplicity 2 because there are two zeros" — the number of zeros is not the order',
    ru: 'Кратность (multiplicity, order) нуля — сколько раз повторяется множитель; определяет форму у нуля: 1 — пересекает, 2 — касается и отскакивает, 3 — выпрямляется и пересекает.'
  },
  'turning point': {
    en: 'turning point',
    def: 'a point where the graph changes from increasing to decreasing or back (a local maximum or minimum); a degree-n polynomial has at most n − 1 turning points',
    ex: 'the vertex of a parabola',
    non: 'a zero',
    ru: 'Точка поворота (turning point) — где график меняет рост на убывание или наоборот (локальный максимум или минимум); у многочлена степени n их не больше n − 1.'
  },
  'translation': {
    en: 'translation (shift)',
    def: 'a transformation that slides every point the same distance in the same direction; the shape does not change',
    ex: 'y = (x − 3)² is y = x² shifted right 3; y = x² + 3 is shifted up 3',
    non: 'y = 2x² (a stretch)',
    ru: 'Сдвиг (translation) — все точки переезжают на одно расстояние в одном направлении, форма не меняется. (x − 3)² — вправо на 3; x² + 3 — вверх на 3.'
  },
  'vertical stretch': {
    en: 'vertical stretch / compression',
    def: 'multiplying every output by a factor a: |a| > 1 stretches, 0 < |a| < 1 compresses; it changes the height, not the position',
    ex: 'y = 3x²',
    non: 'y = x² + 3 (a shift)',
    ru: 'Вертикальное растяжение / сжатие — каждое значение умножается на a: |a| > 1 растягивает, 0 < |a| < 1 сжимает; меняется высота, не положение.'
  },
  'reflection': {
    en: 'reflection',
    def: 'flipping the graph over an axis: a minus in front of f reflects in the x-axis, a minus in front of x reflects in the y-axis',
    ex: 'y = −x² is y = x² reflected in the x-axis',
    non: 'a rotation',
    ru: 'Отражение — переворот графика через ось: минус перед f — через ось x, минус перед x — через ось y.'
  },
  'inverse function': {
    en: 'inverse function f⁻¹',
    def: 'the function that undoes f: it swaps inputs and outputs, so its graph is the reflection of f in the line y = x',
    ex: 'f(x) = 2x + 1 → f⁻¹(x) = (x − 1)/2',
    non: '1/f(x) (the reciprocal)',
    ru: 'Обратная функция f⁻¹ — «отменяет» f: меняет местами входы и выходы; её график — отражение f в прямой y = x. Это НЕ 1/f(x).'
  },
  'division terms': {
    en: 'dividend / divisor / quotient / remainder',
    def: 'the polynomial being divided / what you divide by / the result / what is left; check: dividend = divisor × quotient + remainder; P(x) = (divisor)(quotient) + remainder, with degree of remainder less than degree of divisor; checks any division',
    ex: 'x² + 3x + 2 = (x + 1)(x + 2) + 0; x³ − 7x + 6 = (x − 1)(x² + x − 6) + 0',
    non: '"answer" for all four; "remainder 2x + 1" when dividing by x − 3 — impossible, the remainder must be a constant',
    ru: 'Делимое / делитель / частное / остаток; проверка: делимое = делитель × частное + остаток.'
  },
  'remainder theorem': {
    en: 'remainder theorem',
    def: 'when a polynomial p(x) is divided by (x − a), the remainder equals p(a) — you get the remainder without dividing; works only for linear divisors x − a; no division needed to find the remainder',
    ex: 'p(x) = x² − 1 divided by x − 3: remainder p(3) = 8; P(x) = x² + 1 divided by x − 2 → remainder P(2) = 5',
    non: 'a rule about the quotient (the theorem says nothing about it); dividing by x² − 4 — the theorem does not apply directly',
    ru: 'Теорема об остатке — при делении p(x) на (x − a) остаток равен p(a); остаток находится без деления.'
  },
  'factor theorem': {
    en: 'factor theorem',
    def: '(x − a) is a factor of p(x) if and only if p(a) = 0; two directions — a zero gives a factor, a factor gives a zero; used to start factoring cubics',
    ex: 'p(1) = 0 for x³ − 7x + 6, so (x − 1) is a factor; P(1) = 0 → x − 1 is a factor',
    non: 'p(a) = 0 meaning x = a is the only zero; P(1) = 4 → x − 1 is not a factor, but x − 1 is still a divisor with remainder 4',
    ru: 'Теорема о множителе (о корне), factor theorem: (x − a) — множитель p(x) тогда и только тогда, когда p(a) = 0.'
  },
  'synthetic division': {
    en: 'synthetic division',
    def: 'a shortcut for dividing a polynomial by (x − a) using only the coefficients',
    ex: '2x³ + x² − 7x + 3 divided by x + 1 with the row 2, 1, −7, 3 and a = −1',
    non: 'long division written in full',
    ru: 'Синтетическое деление — быстрый способ деления на (x − a) по одним коэффициентам (в русской школе — схема Горнера; в Онтарио — synthetic division).'
  },

  /* ---------- Б9 (2.8.0): разложение, уравнения, неравенства ---------- */
  'integral zero theorem': {
    en: 'integral zero theorem',
    def: 'if a polynomial with integer coefficients has an integer zero, that zero divides the constant term; gives the list of candidates to test with the factor theorem; candidates are ± the divisors of the constant term',
    ex: 'x³ − 2x² − 5x + 6 → candidates ±1, ±2, ±3, ±6',
    non: 'x = 4 for that polynomial — 4 does not divide 6, so it is not a candidate',
    ru: 'Теорема о целом корне (integral zero theorem): если у многочлена с целыми коэффициентами есть целый нуль, он делит свободный член; кандидаты для проверки теоремой о множителе — ± делители свободного члена.'
  },
  'rational zero theorem': {
    en: 'rational zero theorem',
    def: 'a rational zero p/q (in lowest terms) has p dividing the constant term and q dividing the leading coefficient; needed when the leading coefficient is not 1',
    ex: '2x³ − 3x² − 11x + 6 → candidates include ±1/2, ±3/2',
    non: '2/3 — the denominator 3 does not divide the leading coefficient 2',
    ru: 'Теорема о рациональном корне (rational zero theorem): у рационального нуля p/q (несократимая дробь) p делит свободный член, а q — старший коэффициент; нужна, когда старший коэффициент не равен 1.'
  },
  'factor fully': {
    en: 'factor fully',
    def: 'write the polynomial as a product of factors that cannot be factored further over the integers (or reals, if asked); check for a common factor first, then grouping or the factor theorem; a quadratic factor with negative discriminant stays as it is',
    ex: 'x⁴ − 5x² + 4 = (x − 1)(x + 1)(x − 2)(x + 2)',
    non: '(x² − 1)(x² − 4) — correct but not fully factored',
    ru: 'Разложить полностью (factor fully) — записать многочлен произведением множителей, которые дальше не раскладываются над целыми числами (или над действительными, если так сказано); сначала общий множитель, потом группировка или теорема о множителе; квадратный множитель с отрицательным дискриминантом остаётся как есть.'
  },
  'sum and difference of cubes': {
    en: 'difference / sum of cubes',
    def: 'a³ − b³ = (a − b)(a² + ab + b²), a³ + b³ = (a + b)(a² − ab + b²); the quadratic factor does not factor further over the reals',
    ex: '8x³ − 27 = (2x − 3)(4x² + 6x + 9)',
    non: 'x³ − 9 — 9 is not a perfect cube',
    ru: 'Разность / сумма кубов: a³ − b³ = (a − b)(a² + ab + b²), a³ + b³ = (a + b)(a² − ab + b²); квадратный множитель над действительными числами дальше не раскладывается.'
  },
  'family of polynomial functions': {
    en: 'family of polynomial functions',
    def: 'all functions f(x) = a(x − r₁)(x − r₂)… with the same zeros and different a ≠ 0; one extra point fixes a',
    ex: 'f(x) = a(x + 2)²(x − 3) with f(1) = 18 → a = −1',
    non: 'changing a zero gives a different family, not a member of the same one',
    ru: 'Семейство многочленных функций — все функции f(x) = a(x − r₁)(x − r₂)… с одними и теми же нулями и разными a ≠ 0; одна дополнительная точка определяет a.'
  },
  'sign chart': {
    en: 'sign chart / interval table',
    def: 'a table that shows the sign of each factor and of the whole product on each interval between the zeros; the zeros split the number line; the sign changes at a zero of odd order and does not change at a zero of even order',
    ex: 'x(x − 2)(x + 2) on (0, 2): (+)(−)(+) = −',
    non: 'testing a single point and writing the answer for the whole line',
    ru: 'Таблица знаков (sign chart, interval table) — знак каждого множителя и всего произведения на каждом интервале между нулями; нули делят числовую прямую; у нуля нечётной кратности знак меняется, у чётной — нет.'
  },
  'interval notation': {
    en: 'interval notation',
    def: '[a, b] includes the ends, (a, b) does not; ∪ joins pieces; ±∞ always gets a round bracket; strict inequality → round brackets at the zeros; non-strict → square brackets',
    ex: 'x < −3 or x > 1 → (−∞, −3) ∪ (1, ∞)',
    non: '[1, ∞] — infinity is never included',
    ru: 'Интервальная запись: [a, b] — концы включены, (a, b) — нет; ∪ соединяет куски; у ±∞ всегда круглая скобка; строгое неравенство — круглые скобки у нулей, нестрогое — квадратные.'
  },
  'boundary point': {
    en: 'boundary point (critical value)',
    def: 'a zero of the polynomial — the only place where the sign can change; include it in the solution only for ≤ or ≥',
    ex: 'for (x − 1)(x + 3) > 0 the boundary points are 1 and −3',
    non: 'x = 0 for (x − 1)(x + 3) > 0 — it is a test point, not a boundary',
    ru: 'Граничная точка (boundary point, critical value) — нуль многочлена, единственное место, где может смениться знак; в ответ входит только при ≤ или ≥.'
  },

  /* ---------- 2.8.1: рациональные, тригонометрия, показательные и логарифмы, финалы ---------- */
  'vertical asymptote': {
    en: 'vertical asymptote',
    def: 'a vertical line x = a that the graph approaches but never touches, where the denominator is 0 and the numerator is not; found from the zeros of the denominator after simplifying; the function is undefined there',
    ex: 'f(x) = 1/(x − 3) → x = 3',
    non: 'x = 2 for 1/(x² + 4) — the denominator is never 0',
    ru: 'Вертикальная асимптота (vertical asymptote) — вертикальная прямая x = a, к которой график приближается, но не касается; там знаменатель равен 0, а числитель — нет.'
  },
  'horizontal asymptote': {
    en: 'horizontal asymptote',
    def: 'a horizontal line y = L that the graph approaches as x → ±∞; for 1/(linear) and 1/(quadratic) it is y = 0; the graph may cross it',
    ex: 'y = 0 for 1/(x − 3)',
    non: 'y = 3 for 1/(x − 3) — that is the asymptote\'s x-value, not a horizontal line',
    ru: 'Горизонтальная асимптота (horizontal asymptote) — горизонтальная прямая y = L, к которой приближается график при x → ±∞; график может её пересекать.'
  },
  'hole (removable discontinuity)': {
    en: 'hole (removable discontinuity)',
    def: 'a point missing from the graph where a factor cancels from numerator and denominator; the simplified function gives the y-value of the hole; the x-value is still excluded from the domain',
    ex: '(x² − 9)/(x − 3) → hole at (3, 6)',
    non: 'x = 3 for 1/(x − 3) — nothing cancels, it is an asymptote',
    ru: '«дырка», устранимый разрыв (hole (removable discontinuity)) — выколотая точка графика там, где множитель сокращается в числителе и знаменателе; x этой точки из области определения всё равно исключён.'
  },
  'oblique asymptote': {
    en: 'oblique asymptote',
    def: 'a slanted line y = mx + b the graph approaches when the numerator\'s degree is one more than the denominator\'s; found by division — the quotient is the asymptote',
    ex: '(x² + 1)/(x − 2) → y = x + 2',
    non: '(x + 1)/(x − 2) — degrees equal, the asymptote is horizontal',
    ru: 'Наклонная асимптота (oblique asymptote) — наклонная прямая y = mx + b, к которой приближается график, когда степень числителя на единицу больше степени знаменателя; находится делением — частное и есть асимптота.'
  },
  'restriction': {
    en: 'restriction',
    def: 'a value of x that makes a denominator zero and must be excluded before solving; write restrictions first; a solution equal to a restriction is rejected',
    ex: 'for 3/(x − 2) = 5, x ≠ 2',
    non: 'x ≠ 5 — the number on the right side is not a restriction',
    ru: 'Ограничение (на переменную) (restriction) — значение x, при котором знаменатель равен нулю; его исключают до решения, а корень, совпавший с ним, отбрасывают.'
  },
  'extraneous root': {
    en: 'extraneous root',
    def: 'a value obtained by algebra that does not satisfy the original equation, usually because it equals a restriction; appears when multiplying both sides by an expression that can be zero',
    ex: 'x = 3 for x²/(x − 3) = 9/(x − 3)',
    non: 'a root rejected because it is negative when the problem allows negatives',
    ru: 'Посторонний корень (extraneous root) — значение, полученное преобразованиями, которое не удовлетворяет исходному уравнению — обычно совпадает с ограничением.'
  },
  'critical values of a rational inequality': {
    en: 'critical values of a rational inequality',
    def: 'the zeros of the numerator and the zeros of the denominator; together they split the number line; a zero of the numerator may be included (≤, ≥); a zero of the denominator is never included',
    ex: '(x + 1)/(x − 3) ≤ 0 → −1 included, 3 excluded',
    non: 'x = 0 here — it is a test point, not critical',
    ru: 'Критические точки (critical values of a rational inequality) — нули числителя и нули знаменателя; вместе они делят числовую прямую. Нуль числителя может войти в ответ (≤, ≥), нуль знаменателя — никогда.'
  },
  'never cross-multiply an inequality': {
    en: 'never cross-multiply an inequality',
    def: 'multiplying both sides by an expression of unknown sign may flip the inequality; instead move all terms to one side and use one fraction',
    ex: '(x − 1)/(x + 2) ≥ 2 → (x − 1 − 2(x + 2))/(x + 2) ≥ 0',
    non: 'x − 1 ≥ 2(x + 2) — wrong when x + 2 < 0',
    ru: 'Не умножать крест-накрест (never cross-multiply an inequality) — умножение обеих частей на выражение неизвестного знака может перевернуть знак неравенства; вместо этого всё переносят в одну сторону и приводят к одной дроби.'
  },
  'radian': {
    en: 'radian',
    def: 'the angle at the centre of a circle that cuts an arc equal in length to the radius; π rad = 180°; s = rθ and A = ½r²θ only when θ is in radians',
    ex: '150° = 5π/6',
    non: '150 rad — a radian measure is a plain number, 150° is not 150 rad',
    ru: 'Радиан (radian) — центральный угол, опирающийся на дугу длиной в радиус; π рад = 180°. Формулы s = rθ и A = ½r²θ верны только в радианах.'
  },
  'special angles': {
    en: 'special angles',
    def: 'π/6, π/4, π/3 (and their multiples) whose sine and cosine are exact from the 1-√3-2 and 1-1-√2 triangles; signs come from the quadrant (CAST)',
    ex: 'cos(3π/4) = −√2/2',
    non: 'sin(1) — 1 rad is not a special angle',
    ru: 'Особые углы (special angles) — π/6, π/4, π/3 и кратные им: синус и косинус точно берутся из треугольников 1-√3-2 и 1-1-√2; знак — по четверти (CAST).'
  },
  'amplitude': {
    en: 'amplitude',
    def: 'half the distance between the maximum and minimum; |a|; always positive; a negative a means a reflection, not a negative amplitude',
    ex: 'y = −2cos x has amplitude 2',
    non: '4 for y = 3sin(2x) + 1 — the maximum is 4, the amplitude is 3',
    ru: 'Амплитуда (amplitude) — половина расстояния между максимумом и минимумом, |a|; всегда положительна — отрицательное a означает отражение.'
  },
  'period': {
    en: 'period',
    def: 'the length of one full cycle, 2π/|k| for y = sin(kx); k > 1 compresses, 0 < k < 1 stretches',
    ex: 'y = sin(x/2) has period 4π',
    non: '2 for y = sin(2x) — the period is π',
    ru: 'Период (period) — длина одного полного цикла, 2π/|k| для y = sin(kx); k > 1 сжимает, 0 < k < 1 растягивает.'
  },
  'identity': {
    en: 'identity',
    def: 'an equation true for every value of the variable where both sides are defined; to prove one, transform one side into the other; never cross the equals sign with algebra',
    ex: 'sin²x + cos²x = 1',
    non: '2sin x = 1 — true only for some x, an equation',
    ru: 'Тождество (identity) — равенство, верное при всех значениях переменной, при которых обе части определены; доказывают, преобразуя одну сторону в другую.'
  },
  'compound-angle formula': {
    en: 'compound-angle formula',
    def: 'sin(A ± B) = sin A cos B ± cos A sin B; cos(A ± B) = cos A cos B ∓ sin A sin B; gives exact values for 15°, 75°, π/12',
    ex: 'sin 75° = sin(45° + 30°)',
    non: 'sin(A + B) = sin A + sin B — false',
    ru: 'Формула сложения углов (compound-angle formula) — sin(A ± B) = sin A cos B ± cos A sin B; cos(A ± B) = cos A cos B ∓ sin A sin B; даёт точные значения для 15°, 75°, π/12.'
  },
  'general vs. restricted solution': {
    en: 'general vs. restricted solution',
    def: 'on [0, 2π) an equation has a finite list of solutions; without a restriction each has a period added (+2πn); always check the given interval; sin(2x) = k on [0, 2π) means 2x on [0, 4π)',
    ex: 'sin x = 1/2 → π/6, 5π/6',
    non: 'writing 13π/6 when the interval is [0, 2π)',
    ru: 'Общее решение и решение на промежутке (general vs. restricted solution) — на [0, 2π) у уравнения конечный список решений; без ограничения к каждому добавляется период (+2πn).'
  },
  'quadratic trigonometric equation': {
    en: 'quadratic trigonometric equation',
    def: 'an equation that is quadratic in sin x, cos x or tan x; solved by factoring or the formula, then each factor gives its own angles; reject values outside [−1, 1] for sin and cos',
    ex: '2sin²x − sin x − 1 = 0',
    non: 'sin(x²) = 0 — the square is on the angle, not the ratio',
    ru: 'Квадратное тригонометрическое уравнение (quadratic trigonometric equation) — уравнение, квадратное относительно sin x, cos x или tan x; решается разложением или формулой, затем каждый множитель даёт свои углы.'
  },
  'exponential function': {
    en: 'exponential function',
    def: 'y = a · bˣ with b > 0, b ≠ 1; the variable is in the exponent; horizontal asymptote y = 0; y-intercept a; b > 1 grows, 0 < b < 1 decays',
    ex: 'y = 3 · 2ˣ',
    non: 'y = x² — the variable is the base, a power function',
    ru: 'Показательная функция (exponential function) — y = a · bˣ, где b > 0, b ≠ 1; переменная — в показателе степени.'
  },
  'half-life': {
    en: 'half-life',
    def: 'the time for a quantity to halve; M(t) = M₀ · (1/2)^(t/h); doubling time works the same way with base 2',
    ex: '8 days → after 20 days the exponent is 20/8 = 2.5',
    non: '"half-life 8 days" meaning it loses 1/8 per day',
    ru: 'Период полураспада (half-life) — время, за которое величина уменьшается вдвое; M(t) = M₀ · (1/2)^(t/h).'
  },
  'logarithm': {
    en: 'logarithm',
    def: 'log_b a is the exponent to which b must be raised to get a; log_b a = c ⇔ bᶜ = a, with b > 0, b ≠ 1, a > 0; log with no base is base 10; ln is base e',
    ex: 'log₂ 32 = 5',
    non: 'log₂(−8) — undefined, a must be positive',
    ru: 'Логарифм (logarithm) — log_b a — показатель степени, в которую надо возвести b, чтобы получить a; log_b a = c ⇔ bᶜ = a, при b > 0, b ≠ 1, a > 0.'
  },
  'exponential form / logarithmic form': {
    en: 'exponential form / logarithmic form',
    def: 'two ways to write the same fact; converting is the main tool for solving',
    ex: 'log₅ 125 = 3 ⇔ 5³ = 125',
    non: 'log₅ 125 = 3 ⇔ 3⁵ = 125 — base and exponent swapped',
    ru: 'Показательная / логарифмическая запись (exponential form / logarithmic form) — два способа записать один и тот же факт; переход между ними — главный инструмент решения.'
  },
  'laws of logarithms': {
    en: 'laws of logarithms',
    def: 'log(xy) = log x + log y; log(x/y) = log x − log y; log xⁿ = n log x (same base throughout); there is no law for log(x + y)',
    ex: 'log₆ 4 + log₆ 9 = log₆ 36 = 2',
    non: 'log(x + y) = log x + log y — false',
    ru: 'Свойства логарифмов (laws of logarithms) — log(xy) = log x + log y; log(x/y) = log x − log y; log xⁿ = n log x (основание везде одно); для log(x + y) свойства нет.'
  },
  'change of base': {
    en: 'change of base',
    def: 'log_b a = log a / log b = ln a / ln b; lets a calculator evaluate any base',
    ex: 'log₅ 40 = ln 40 / ln 5 ≈ 2.292',
    non: 'log₅ 40 = ln 5 / ln 40',
    ru: 'Переход к другому основанию (change of base) — log_b a = log a / log b = ln a / ln b; так калькулятор считает логарифм по любому основанию.'
  },
  'taking the logarithm of both sides': {
    en: 'taking the logarithm of both sides',
    def: 'applying the same log to both sides of bˣ = k, then using the power law to bring x down; any base works; check that both sides are positive',
    ex: '5ˣ = 20 → x = log 20 / log 5',
    non: 'taking the log of one side only',
    ru: 'Логарифмирование обеих частей (taking the logarithm of both sides) — к обеим частям bˣ = k применяют один и тот же логарифм, затем свойство степени выносит x вперёд.'
  },
  'logarithmic scale': {
    en: 'logarithmic scale',
    def: 'a scale where each step multiplies the quantity by a fixed factor (pH, decibels, Richter); pH = −log[H⁺]; one pH unit = a factor of 10 in concentration',
    ex: 'pH 4.5',
    non: 'reading pH 5 as "half as acidic as pH 10"',
    ru: 'Логарифмическая шкала (logarithmic scale) — шкала, где каждый шаг умножает величину на одно и то же число (pH, децибелы, шкала Рихтера); pH = −log[H⁺].'
  },
  'composition of functions': {
    en: 'composition of functions',
    def: '(f ∘ g)(x) = f(g(x)) — apply g first, then f; order matters; the domain needs x in the domain of g and g(x) in the domain of f',
    ex: 'f(x) = 2x − 3, g(x) = x² + 1: f(g(2)) = 7',
    non: '(f ∘ g)(x) = f(x) · g(x) — that is the product',
    ru: 'Композиция функций (composition of functions) — (f ∘ g)(x) = f(g(x)): сначала g, потом f; порядок важен.'
  },
  'instantaneous rate of change': {
    en: 'instantaneous rate of change',
    def: 'the rate at a single point, estimated by the average rate over a very small interval [a, a + h]; the estimate improves as h shrinks; graphically it is the slope of the tangent',
    ex: 'f(x) = x² at x = 3 → about 6',
    non: '(f(3) − f(1))/2 — that is an average rate over [1, 3]',
    ru: 'Мгновенная скорость изменения (instantaneous rate of change) — скорость в одной точке; оценивается средней скоростью на очень малом отрезке [a, a + h]; на графике — наклон касательной.'
  },
  'leading coefficient test': {
    en: 'leading coefficient test',
    def: 'the sign of the leading coefficient and the parity of the degree together fix the end behaviour',
    ex: '2x⁴: both ends up',
    non: 'judging end behaviour from the constant term',
    ru: 'По старшему коэффициенту (leading coefficient test) — знак старшего коэффициента и чётность степени вместе задают поведение на концах.'
  },
  'CAST rule': {
    en: 'CAST rule',
    def: 'which ratios are positive in each quadrant: IV Cos, I All, II Sin, III Tan; used to pick the sign when a ratio is given with a quadrant',
    ex: 'θ in III → sin < 0, tan > 0',
    non: 'cos > 0 in quadrant II',
    ru: 'Правило знаков по четвертям (CAST rule) — какие отношения положительны в каждой четверти: IV — Cos, I — All, II — Sin, III — Tan.'
  },
  'parameters of a sinusoid': {
    en: 'parameters of a sinusoid',
    def: 'in y = a sin(k(x − d)) + c: a amplitude, 2π/|k| period, d phase shift, c vertical shift; factor k out before reading d',
    ex: 'y = 4sin(3(x − π/6)) − 1 → shift π/6 right',
    non: 'reading d = π/2 from y = sin(3x − π/2) without factoring (it is π/6)',
    ru: 'Параметры синусоиды (parameters of a sinusoid) — в y = a sin(k(x − d)) + c: a — амплитуда, 2π/|k| — период, d — сдвиг по фазе, c — сдвиг по вертикали; k выносят за скобку, прежде чем читать d.'
  },
  'inverse functions (exponential and logarithm)': {
    en: 'inverse functions (exponential and logarithm)',
    def: 'y = bˣ and y = log_b x undo each other; their graphs are reflections in y = x; b^(log_b x) = x and log_b(bˣ) = x',
    ex: 'log₃(2x − 1) = 2 ⇔ 2x − 1 = 3²',
    non: 'y = −bˣ as the inverse of bˣ',
    ru: 'Взаимно обратные функции (inverse functions (exponential and logarithm)) — y = bˣ и y = log_b x отменяют друг друга; их графики симметричны относительно прямой y = x.'
  },
  'rate of change of an exponential': {
    en: 'rate of change of an exponential',
    def: 'the average rate over equal intervals grows by the same factor as the function; growth accelerates — not a constant slope',
    ex: '2ˣ on [0, 2]: 1.5; on [2, 4]: 6',
    non: 'expecting the same rate on both intervals',
    ru: 'Скорость роста показательной функции (rate of change of an exponential) — средняя скорость на равных отрезках растёт во столько же раз, что и сама функция; рост ускоряется.'
  }
});
