/* Обработчики экранов не должны копиться при перерисовках,
   а одинаковые тосты подряд — схлопываться в один. */

(function () {
  'use strict';

  /** Узел-цель события: closest() отвечает только на свой селектор. */
  function target(sel) {
    var el = window.fakeNode('button');
    el.closest = function (q) { return q.indexOf(sel) >= 0 ? el : null; };
    return el;
  }

  /** Подсовывает App секцию экрана вместо настоящего DOM. */
  function stand(screen) {
    var host = window.fakeNode('section');
    var prev = document.querySelector;
    document.querySelector = function (sel) {
      return String(sel).indexOf('data-screen="today"') >= 0 ? host : null;
    };
    App.register('today', screen);
    return { host: host, restore: function () { document.querySelector = prev; } };
  }

  describe('обработчики: перерисовка не плодит слушателей', function () {
    var calls = 0;
    var s = stand({
      render: function () { return '<button data-minprompt>Промпт минималки</button>'; },
      mount: function (h) {
        U.on(h, 'click', '[data-minprompt]', function () { calls++; });
      }
    });

    for (var i = 0; i < 6; i++) App.renderScreen('today');
    eq(s.host.listenerCount('click'), 1, 'после шести перерисовок слушатель один');

    s.host.fire('click', target('[data-minprompt]'));
    eq(calls, 1, 'один тап — ровно одно копирование');

    s.host.fire('click', target('[data-minprompt]'));
    eq(calls, 2, 'второй тап — второе, не третье и не пятое');

    s.restore();
  });

  describe('обработчики: mount зовётся один раз, update — каждый рендер', function () {
    var mounts = 0, updates = 0;
    var s = stand({
      render: function () { return '<div></div>'; },
      mount: function () { mounts++; },
      update: function () { updates++; }
    });

    for (var i = 0; i < 4; i++) App.renderScreen('today');
    eq(mounts, 1, 'делегированные слушатели навешаны один раз');
    eq(updates, 4, 'прямые onclick перевешиваются на каждой перерисовке');

    // повторная регистрация экрана снимает отметку: слушатели нужны заново
    App.register('today', { render: function () { return ''; }, mount: function () { mounts++; } });
    App.renderScreen('today');
    eq(mounts, 2, 'новый экран монтируется заново');

    s.restore();
  });

  describe('обработчики: каждый селектор срабатывает по одному разу', function () {
    var log = [];
    var s = stand({
      render: function () { return '<div></div>'; },
      mount: function (h) {
        U.on(h, 'click', '[data-cards]', function () { log.push('cards'); });
        U.on(h, 'click', '[data-swap]', function () { log.push('swap'); });
        U.on(h, 'click', '[data-minprompt]', function () { log.push('min'); });
      }
    });

    for (var i = 0; i < 5; i++) App.renderScreen('today');
    eq(s.host.listenerCount('click'), 3, 'три селектора — три слушателя, а не пятнадцать');

    s.host.fire('click', target('[data-swap]'));
    s.host.fire('click', target('[data-cards]'));
    s.host.fire('click', target('[data-minprompt]'));
    eq(log, ['swap', 'cards', 'min'], 'каждая кнопка сработала ровно один раз');

    s.restore();
  });

  describe('тосты: одинаковый текст в пределах 1.5с — один', function () {
    eq(UI.toast('Промпт минималки скопирован'), true, 'первый показан');
    eq(UI.toast('Промпт минималки скопирован'), false, 'второй схлопнут');
    eq(UI.toast('Промпт минималки скопирован'), false, 'третий тоже');
    eq(UI.toast('Промпт урока скопирован'), true, 'другой текст проходит');
    eq(UI.toast('Промпт минималки скопирован'), true, 'после другого текста прежний снова показывается');

    defer('через 1.5 секунды повтор разрешён', function () {
      UI.toast('Дело добавлено');
      return new Promise(function (r) { setTimeout(r, 1600); }).then(function () {
        eq(UI.toast('Дело добавлено'), true, 'окно схлопывания истекло');
      });
    });
  });

})();
