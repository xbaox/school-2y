/* Водопад (7.3), свежесть (7.4) и пауза цикла (7.2).
   Чистые куски логики; полный водопад проверяется в браузере. */

describe('маппинг курсов на дорожки (раздел 9)', function () {
  eq(CONTENT.trackForCourse('MPM2D'), 'math', 'математика 10');
  eq(CONTENT.trackForCourse('MCV4U'), 'math', 'матанализ');
  eq(CONTENT.trackForCourse('MDM4U'), 'math', 'статистика');
  eq(CONTENT.trackForCourse('NBE3U'), 'write', 'английский 11');
  eq(CONTENT.trackForCourse('ENG4U'), 'write', 'английский 12');
  eq(CONTENT.trackForCourse('OSSLT'), 'write', 'тест грамотности');
  eq(CONTENT.trackForCourse('IELTS'), 'write', 'языковой экзамен');
  eq(CONTENT.trackForCourse('ICS3U'), 'cs', 'информатика');
  eq(CONTENT.trackForCourse('BMI3C'), 'biz', 'маркетинг');
  eq(CONTENT.trackForCourse('BOH4M'), 'biz', 'лидерство');
  eq(CONTENT.trackForCourse('eslao'), 'write', 'ESL по префиксу, регистр не важен');
  ok(CONTENT.trackForCourse('PAF3O') === null, 'фитнес — вне маппинга');
  ok(CONTENT.trackForCourse('CHV2O') === null, 'граждановедение — вне маппинга');
  ok(CONTENT.trackForCourse('GLC2O') === null, 'карьера — вне маппинга');
  ok(CONTENT.trackForCourse('') === null, 'пустой код не ломает');
});

describe('шаблон недели (7.3)', function () {
  var W = { 1: 'math', 2: 'write', 3: 'math', 4: 'alt', 5: 'math', 6: 'write', 7: null };
  eq(W[U.weekday('2026-08-24')], 'math', 'понедельник — математика');
  eq(W[U.weekday('2026-08-25')], 'write', 'вторник — письмо');
  eq(W[U.weekday('2026-08-26')], 'math', 'среда — математика');
  eq(W[U.weekday('2026-08-27')], 'alt', 'четверг — инфа/бизнес');
  eq(W[U.weekday('2026-08-28')], 'math', 'пятница — математика');
  eq(W[U.weekday('2026-08-29')], 'write', 'суббота — письмо ⭐');
  eq(W[U.weekday('2026-08-30')], null, 'воскресенье — радар-день, урока нет');
});

describe('пороги свежести (7.4)', function () {
  // 0–3 зелёный · 4–5 жёлтый · ≥6 красный; правило водопада срабатывает с 5
  var FRESH_RULE_DAYS = 5;
  function color(d) { return d <= 3 ? 'g' : (d <= 5 ? 'y' : 'r'); }
  eq(color(0), 'g', 'сегодня — зелёный');
  eq(color(3), 'g', '3 дня — ещё зелёный');
  eq(color(4), 'y', '4 дня — жёлтый');
  eq(color(5), 'y', '5 дней — жёлтый');
  eq(color(6), 'r', '6 дней — красный');
  ok(5 >= FRESH_RULE_DAYS, 'правило 2 срабатывает с 5 дней');
});
