/* 2.7.7, этап 2: шаблон недели пропускает дорожку без своих уроков.

   В Ф1 у информатики и бизнеса своих блоков нет, и четверг шаблона уходил
   общему блоку — финалам Б16 в начале октября. Теперь слот дорожки без своих
   незакрытых уроков в фазе пропускается: урок берёт следующая по шаблону
   дорожка со своими уроками (слоты идут вперёд от сегодняшнего), а общий блок
   шаблон отдаёт, только когда своих уроков нет ни у одной дорожки. */

(function () {
  'use strict';

  function closeLessons(ids, date) {
    ids.forEach(function (id) { State.s.lessons[id] = { done: true, score: 8, date: date }; });
    ids.forEach(function (id) { State.refreshBlockDone(id.split('.')[0]); });
  }
  function closeBlock(id, date) { closeLessons(State.activeLessons(id).map(function (l) { return l.id; }), date); }

  function fresh(last) {
    State.reset();
    State.syncContent();
    State.setMode('school');
    State.s.meta.onboardedAt = '2026-08-22';
    ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach(function (b) { closeBlock(b, '2026-09-05'); });
    State.s.tracks.forEach(function (t) { if (!t.embedded) t.lastLessonDate = last || '2026-09-13'; });
  }

  function why(r) { return r ? [r.lessonId, r.reason.kind, r.reason.text] : null; }

  describe('2.7.7 Э2: четверг 01.10 без уроков инфы и бизнеса — не Б16', function () {
    withToday('2026-10-01', function () {
      fresh('2026-09-30');
      closeBlock('B7', '2026-09-18');
      // 2.8.0 (A3): светофор считает учебные дни — у Б8 с одним уроком на чт–пт
      // он красный и забрал бы день; сцена про шаблон, поэтому Б8 закрыт целиком
      closeBlock('B8', '2026-09-29');
      eq(Waterfall.ruleDeadline('2026-10-01'), null, 'дедлайн молчит');
      var r = Waterfall.pick('2026-10-01');
      eq(why(r), ['B9.1', 'plan', 'шаблон: четверг — информатика/бизнес без уроков, дальше математика'],
        '01.10 → математика пятницы');
      ok(!/^B16\./.test(r.lessonId), 'общий блок не выбран');
      eq(Lesson.whyText(r.reason.text), 'шаблон · четверг — информатика/бизнес без уроков, дальше математика', 'бейдж');
    });
  });

  describe('2.7.7 Э2: обход слотов вперёд — через субботу и воскресенье', function () {
    withToday('2026-09-15', function () {
      fresh('2026-09-13');
      State.s.blocks.B7.deadline = '2026-12-31';
      ['B8', 'B10', 'B12', 'B14'].forEach(function (b) { closeBlock(b, '2026-09-12'); });
      eq(why(Waterfall.ruleTemplate('2026-09-15')),
        ['B9.1', 'plan', 'шаблон: вторник — письмо и чтение без уроков, дальше математика'], 'вт без письма → ср математика');

      fresh('2026-09-13');
      ['B7', 'B9', 'B11', 'B13', 'B15', 'B53'].forEach(function (b) { closeBlock(b, '2026-09-12'); });
      eq(why(Waterfall.ruleTemplate('2026-09-18')),
        ['B8.1', 'plan', 'шаблон: пятница — математика без уроков, дальше письмо и чтение'], 'пт без математики → сб письмо');
      eq(Waterfall.ruleTemplate('2026-09-17').lessonId, 'B8.1', 'чт: инфа/бизнес → пт математика пуста → сб письмо');

      fresh('2026-09-13');
      ['B8', 'B10', 'B12', 'B14', 'B53'].forEach(function (b) { closeBlock(b, '2026-09-12'); });
      eq(Waterfall.ruleTemplate('2026-09-19').reason.text, 'шаблон: суббота — письмо и чтение без уроков, дальше математика',
        'сб без письма → пн математика');
      eq(Waterfall.ruleTemplate('2026-09-20'), null, 'у воскресенья слота нет — шаблон молчит, как раньше');
    });
  });

  describe('2.7.7 Э2: общий блок — только когда своих уроков нет ни у одной дорожки', function () {
    withToday('2026-09-17', function () {
      fresh('2026-09-13');
      ['B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15'].forEach(function (b) { closeBlock(b, '2026-09-12'); });
      var r = Waterfall.ruleTemplate('2026-09-17');
      // 2.7.8 (Б1): уроки К своими уроками математики не считаются — в будни их не берёт и шаблон
      eq([r.track, r.lessonId, r.reason.text], ['cs', null, 'шаблон: четверг — информатика'],
        'у математики остались только уроки К — своих уроков нет ни у кого, слот дня');
      eq(Waterfall.pick('2026-09-17').lessonId, 'B16.1', 'выбор дня — общий блок, не К');
      closeBlock('B53', '2026-09-12');
      r = Waterfall.ruleTemplate('2026-09-17');
      eq([r.track, r.lessonId, r.reason.text], ['cs', null, 'шаблон: четверг — информатика'], 'своих уроков нет ни у кого — слот дня');
      eq(Waterfall.pick('2026-09-17').lessonId, 'B16.1', 'и выбор дня — общий блок');
    });
  });

  describe('2.7.7 Э2: второй урок — слот дня занят первой дорожкой, шаблон молчит', function () {
    withToday('2026-09-14', function () {
      fresh('2026-09-13');
      eq(Waterfall.ruleTemplate('2026-09-14', 'math'), null, 'пн, первая — математика: шаблон не обходит слоты');
      eq(Waterfall.ruleTemplate('2026-09-17', 'math').lessonId, 'B8.1', 'чт, первая — математика: инфа/бизнес пусты → сб письмо');
    });
  });

  State.reset();
  State.syncContent();
})();
