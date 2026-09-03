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
    def: 'what f(x) does as x → +∞ and as x → −∞ — only the two ends of the graph, not the middle',
    ex: 'for f(x) = x²: as x → ±∞, f(x) → +∞',
    non: 'where the graph crosses the x-axis',
    ru: 'Поведение на концах — куда уходит f(x), когда x → +∞ и x → −∞; только концы графика, не середина.'
  },
  'zero': {
    en: 'zero (x-intercept)',
    def: 'a value of x for which f(x) = 0 — where the graph touches or crosses the x-axis',
    ex: 'zeros of (x − 1)(x + 3) are 1 and −3',
    non: 'the y-intercept f(0)',
    ru: 'Нуль функции (zero, x-intercept) — значение x, при котором f(x) = 0: точка касания или пересечения с осью x. В Онтарио о функции говорят zero, не root.'
  },
  'multiplicity': {
    en: 'multiplicity (order) of a zero',
    def: 'how many times a factor appears; it decides the shape at the zero: order 1 — crosses, order 2 — bounces (touches), order 3 — flattens and crosses',
    ex: '(x − 1)² gives the zero 1 of order 2 — the graph bounces at x = 1',
    non: 'the number of zeros',
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
    def: 'the polynomial being divided / what you divide by / the result / what is left; check: dividend = divisor × quotient + remainder',
    ex: 'x² + 3x + 2 = (x + 1)(x + 2) + 0',
    non: '"answer" for all four',
    ru: 'Делимое / делитель / частное / остаток; проверка: делимое = делитель × частное + остаток.'
  },
  'remainder theorem': {
    en: 'remainder theorem',
    def: 'when a polynomial p(x) is divided by (x − a), the remainder equals p(a) — you get the remainder without dividing',
    ex: 'p(x) = x² − 1 divided by x − 3: remainder p(3) = 8',
    non: 'a rule about the quotient (the theorem says nothing about it)',
    ru: 'Теорема об остатке — при делении p(x) на (x − a) остаток равен p(a); остаток находится без деления.'
  },
  'factor theorem': {
    en: 'factor theorem',
    def: '(x − a) is a factor of p(x) if and only if p(a) = 0',
    ex: 'p(1) = 0 for x³ − 7x + 6, so (x − 1) is a factor',
    non: 'p(a) = 0 meaning x = a is the only zero',
    ru: 'Теорема о корне (factor theorem): (x − a) — множитель p(x) тогда и только тогда, когда p(a) = 0.'
  },
  'synthetic division': {
    en: 'synthetic division',
    def: 'a shortcut for dividing a polynomial by (x − a) using only the coefficients',
    ex: '2x³ + x² − 7x + 3 divided by x + 1 with the row 2, 1, −7, 3 and a = −1',
    non: 'long division written in full',
    ru: 'Синтетическое деление — быстрый способ деления на (x − a) по одним коэффициентам (в русской школе — схема Горнера; в Онтарио — synthetic division).'
  }
});
