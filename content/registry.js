/* ============================================================
   content/registry.js — загрузчик пакетов контента (раздел 9 ТЗ).

   Папку на GitHub Pages листать нельзя, поэтому в index.html заранее
   подключены шесть файлов content/phase0.js … content/phase5.js.
   Невыпущенные фазы лежат пустыми заглушками; каждый файл регистрирует
   свой пакет через CONTENT.register({ phase, blocks:[...] }),
   поэтому порядок и состав подключений не важны.

   Формат блока в пакете:
   { id:'B1', title:'…', track:'write', deadline:'2026-08-23',
     lessons:[ { id:'B1.1', n:1, title, goal, youtube, focus, writing } ] }
   ============================================================ */

window.CONTENT = (function () {
  'use strict';

  /**
   * Маппинг школьных курсов на дорожки (раздел 9 ТЗ) — для радара.
   * Курсы вне маппинга (PAF3O — фитнес, CHV2O+GLC2O — граждановедение
   * и карьера) в радаре видны и подсвечиваются, но правило водопада
   * «радар» их пропускает.
   */
  var COURSE_TRACK = {
    MPM2D: 'math', MCR3U: 'math', MHF4U: 'math', MCV4U: 'math', MDM4U: 'math',
    ESL: 'write', NBE3U: 'write', ENG4U: 'write', OSSLT: 'write', IELTS: 'write',
    ICS3U: 'cs',
    BMI3C: 'biz', BOH4M: 'biz'
  };

  /**
   * Курсы, которые радар показывает, но водопад не назначает:
   * фитнес, граждановедение и карьера (раздел 7.3).
   * ESLEO сюда не входит — это ESL, дорожка write.
   */
  var COURSES_NO_TRACK = ['PAF3O', 'CHV2O', 'GLC2O'];

  /** Код курса → дорожка. ESLAO/ESLBO/… ловятся по префиксу ESL. */
  function trackForCourse(code) {
    var c = String(code || '').toUpperCase().trim();
    if (!c) return null;
    if (COURSE_TRACK[c]) return COURSE_TRACK[c];
    if (COURSES_NO_TRACK.indexOf(c) >= 0) return null;
    if (c.indexOf('ESL') === 0) return 'write';
    return null;
  }

  var packs = {};          // phase → pack
  var blocks = {};         // blockId → block
  var lessons = {};        // lessonId → lesson

  function register(pack) {
    if (!pack || !pack.phase) return;
    pack.blocks = pack.blocks || [];
    packs[pack.phase] = pack;
    pack.blocks.forEach(function (b) {
      b.phase = pack.phase;
      b.lessons = b.lessons || [];
      blocks[b.id] = b;
      b.lessons.forEach(function (l, i) {
        l.blockId = b.id;
        if (!l.id) l.id = b.id + '.' + (i + 1);
        if (!l.n) l.n = i + 1;
        lessons[l.id] = l;
      });
    });
  }

  /**
   * Пакет мог загрузиться раньше реестра — тогда он лежит в очереди
   * window.__CONTENT_Q. Разбираем её здесь, поэтому порядок тегов <script>
   * в index.html значения не имеет.
   */
  function drainQueue() {
    var q = window.__CONTENT_Q;
    if (!q || !q.length) return 0;
    var n = q.length;
    while (q.length) register(q.shift());
    return n;
  }

  function pack(phase) { return packs[phase] || null; }
  function block(id) { return blocks[id] || null; }
  function lesson(id) { return lessons[id] || null; }
  function blockLessons(blockId) { return (blocks[blockId] && blocks[blockId].lessons) || []; }
  function hasLessons(blockId) { return blockLessons(blockId).length > 0; }
  function allBlocks() { return Object.keys(blocks).map(function (k) { return blocks[k]; }); }

  /** Все блоки фазы в порядке номеров. */
  function phaseBlocks(phase) {
    return allBlocks()
      .filter(function (b) { return b.phase === phase; })
      .sort(function (a, b) { return num(a.id) - num(b.id); });
  }

  function num(blockId) { return parseInt(String(blockId).replace(/\D/g, ''), 10) || 0; }

  drainQueue();

  return {
    register: register, drainQueue: drainQueue, pack: pack, block: block, lesson: lesson,
    lessons: blockLessons, hasLessons: hasLessons,
    allBlocks: allBlocks, phaseBlocks: phaseBlocks, num: num,
    COURSE_TRACK: COURSE_TRACK, COURSES_NO_TRACK: COURSES_NO_TRACK, trackForCourse: trackForCourse
  };
})();
