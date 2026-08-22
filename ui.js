/* ============================================================
   ui.js — общие элементы интерфейса: тосты, нижние шторки,
   подтверждения, мелкие компоненты (бейдж дорожки, светофор).
   Тексты — по-русски, ошибки формулируются действием, без вины
   (пункт 12 приёмки).
   ============================================================ */

window.UI = (function () {
  'use strict';

  /* ---------- тосты ---------- */

  function toast(text, kind, ms) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.textContent = text;
    root.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .2s';
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 220);
    }, ms || 2600);
  }

  /* ---------- стойкие плашки ---------- */

  /**
   * banner(id, { text, kind, action:{label,onClick}, dismissible })
   * Не уезжает сама, в отличие от тоста: для того, что нельзя пропустить —
   * переполненная память, готовое обновление. Повторный вызов с тем же id
   * обновляет плашку, а не плодит вторую.
   */
  function banner(id, opts) {
    var root = document.getElementById('banner-root');
    if (!root) return;
    var el = root.querySelector('[data-banner="' + id + '"]');
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('data-banner', id);
      root.appendChild(el);
    }
    el.className = 'banner' + (opts.kind ? ' ' + opts.kind : '');
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="bt">' + U.esc(opts.text) + '</span>' +
      (opts.action ? '<button class="ba" data-act>' + U.esc(opts.action.label) + '</button>' : '') +
      (opts.dismissible === false ? '' : '<button class="bx" data-x aria-label="Скрыть сообщение">✕</button>');
    var act = el.querySelector('[data-act]');
    if (act) act.onclick = function () { opts.action.onClick(); };
    var x = el.querySelector('[data-x]');
    if (x) x.onclick = function () { dismissBanner(id); };
  }

  function dismissBanner(id) {
    var root = document.getElementById('banner-root');
    var el = root && root.querySelector('[data-banner="' + id + '"]');
    if (el) el.remove();
  }

  /* ---------- нижняя шторка ---------- */

  var openSheet = null;

  /**
   * sheet({ title, sub, body:htmlString, onMount(root, close), dismissible })
   */
  function sheet(opts) {
    close();
    var back = document.createElement('div');
    back.className = 'sheet-back';
    back.innerHTML =
      '<div class="sheet" role="dialog" aria-modal="true">' +
      '<div class="sheet-grab"></div>' +
      (opts.title ? '<h3>' + U.esc(opts.title) + '</h3>' : '') +
      (opts.sub ? '<div class="sheet-sub">' + opts.sub + '</div>' : '') +
      '<div class="sheet-body">' + (opts.body || '') + '</div>' +
      '</div>';
    document.getElementById('sheet-root').appendChild(back);
    openSheet = back;

    if (opts.dismissible !== false) {
      back.addEventListener('click', function (e) { if (e.target === back) close(); });
    }
    document.addEventListener('keydown', escClose);
    if (opts.onMount) opts.onMount(back.querySelector('.sheet'), close);
    return back;
  }

  function escClose(e) { if (e.key === 'Escape') close(); }

  function close() {
    if (openSheet) { openSheet.remove(); openSheet = null; }
    document.removeEventListener('keydown', escClose);
  }

  /** Да/нет. onYes вызывается при подтверждении. */
  function confirm(opts) {
    sheet({
      title: opts.title,
      sub: opts.sub || '',
      body:
        '<div class="btn-row" style="margin-top:6px">' +
        '<button class="btn sec" data-no>' + U.esc(opts.no || 'Отмена') + '</button>' +
        '<button class="btn ' + (opts.danger ? 'danger' : 'pr') + '" data-yes>' + U.esc(opts.yes || 'Да') + '</button>' +
        '</div>',
      onMount: function (root, done) {
        root.querySelector('[data-no]').onclick = function () { done(); if (opts.onNo) opts.onNo(); };
        root.querySelector('[data-yes]').onclick = function () { done(); if (opts.onYes) opts.onYes(); };
      }
    });
  }

  /** Ввод одной строки. */
  function prompt(opts) {
    sheet({
      title: opts.title,
      sub: opts.sub || '',
      body:
        '<input class="txt" data-inp type="' + (opts.type || 'text') + '" value="' + U.esc(opts.value || '') + '"' +
        (opts.placeholder ? ' placeholder="' + U.esc(opts.placeholder) + '"' : '') + '>' +
        '<div class="btn-row" style="margin-top:12px">' +
        '<button class="btn sec" data-no>Отмена</button>' +
        '<button class="btn pr" data-yes>' + U.esc(opts.ok || 'Сохранить') + '</button></div>',
      onMount: function (root, done) {
        var inp = root.querySelector('[data-inp]');
        setTimeout(function () { inp.focus(); }, 60);
        function ok() { var v = inp.value; done(); if (opts.onOk) opts.onOk(v); }
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
        root.querySelector('[data-no]').onclick = done;
        root.querySelector('[data-yes]').onclick = ok;
      }
    });
  }

  /* ---------- мелкие компоненты ---------- */

  /** Бейдж дорожки: цветная метка (раздел 4 ТЗ). */
  function trackBadge(trackId) {
    var name = State.trackName(trackId);
    return '<span class="tbadge t-' + U.esc(trackId) + '">' + U.esc(name) + '</span>';
  }

  function trackDot(trackId) {
    return '<span class="dotmark t-' + U.esc(trackId) + '"></span>';
  }

  /** Пустое состояние: иконка, текст, кнопка действия. */
  function empty(icon, text, actionHtml) {
    return '<div class="empty"><span class="ic">' + icon + '</span>' + text +
      (actionHtml ? '<div class="act">' + actionHtml + '</div>' : '') + '</div>';
  }

  /** Цвет светофора → класс. */
  function lightClass(color) { return color === 'red' ? 'r' : (color === 'yellow' ? 'y' : 'g'); }
  function lightDot(color) { return color === 'red' ? '🔴' : (color === 'yellow' ? '🟡' : '🟢'); }

  /** Копирование в буфер с мягким запасным вариантом. */
  function copy(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (ok) toast(okMsg || 'Скопировано', 'ok');
      else showManual(text);
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(function () { toast(okMsg || 'Скопировано', 'ok'); return true; })
        .catch(function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  /** Если буфер недоступен — показываем текст для ручного копирования. */
  function showManual(text) {
    sheet({
      title: 'Скопируй вручную',
      sub: 'Браузер не отдал буфер обмена. Текст уже выделен — нажми «Копировать» в меню.',
      body: '<textarea class="txt" style="min-height:220px" data-t></textarea>',
      onMount: function (root) {
        var ta = root.querySelector('[data-t]');
        ta.value = text;
        ta.focus();
        ta.select();
      }
    });
  }

  return {
    toast: toast, banner: banner, dismissBanner: dismissBanner,
    sheet: sheet, close: close, confirm: confirm, prompt: prompt,
    trackBadge: trackBadge, trackDot: trackDot, empty: empty,
    lightClass: lightClass, lightDot: lightDot, copy: copy
  };
})();
