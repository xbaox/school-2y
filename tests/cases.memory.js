/* Память промпта (раздел 8.1) поверх живого состояния. Находка B-01. */

(function () {
  'use strict';

  /** Чистое состояние с подтянутым контентом Ф0. */
  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'наклон и y=mx+b',
      words: [{ en: 'slope', ru: 'наклон' }],
      debts: [], cleared: [], warmup: [], writing: 'ок', raw: ''
    }, over || {});
  }

  describe('память B-01: «в разогрев» из прошлого итога уходит в промпт', function () {
    fresh();
    State.applySummary('B1.1', summary({
      warmup: ['что такое rubric?', 'чем solve отличается от evaluate?', 'что значит justify?']
    }), { date: '2026-08-19' });

    var prompt = PROMPTS.lesson('B1.2', { today: '2026-08-20' });
    ok(prompt.indexOf('в разогрев:') > 0, 'строка «в разогрев» есть в памяти промпта');
    ok(prompt.indexOf('что такое rubric?') > 0, 'первый вопрос прошлого итога попал в промпт');
    ok(prompt.indexOf('что значит justify?') > 0, 'третий вопрос тоже');
    ok(prompt.indexOf('B1.1') > 0, 'итог подписан номером урока');

    // разогрев привязан к строке своего итога, а не свален в кучу
    var mem = prompt.slice(prompt.indexOf('[ПАМЯТЬ]'), prompt.indexOf('[ЭТАПЫ УРОКА]'));
    ok(mem.indexOf('что такое rubric?') > 0, 'вопросы стоят внутри блока памяти');
  });

  describe('память B-01: итог без «в разогрев» не рисует пустую строку', function () {
    fresh();
    State.applySummary('B1.1', summary({ warmup: [] }), { date: '2026-08-19' });
    var prompt = PROMPTS.lesson('B1.2', { today: '2026-08-20' });
    eq(prompt.indexOf('в разогрев:'), -1, 'пустого «в разогрев» в промпте нет');
  });

})();
