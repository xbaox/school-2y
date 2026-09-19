/* 2.8.1, часть B: контент — глоссарий (B3) и опорные задания Б11, Б13, Б15, Б16, К.7–К.10 (B4–B5). */

(function () {
  'use strict';

  describe('2.8.1 B3: factor theorem по-русски одинаково в глоссарии и в словах Б9.1', function () {
    var g = CONTENT.term('factor theorem');
    ok(/^Теорема о множителе \(о корне\)/.test(g.ru), 'глоссарий: «Теорема о множителе (о корне)»');
    var w = (CONTENT.lesson('B9.1').words || []).filter(function (x) { return x.en === 'factor theorem'; })[0] || {};
    eq(w.ru, 'теорема о множителе (о корне)', 'слова Б9.1');
  });
})();
