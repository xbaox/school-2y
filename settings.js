/* ============================================================
   settings.js — экран «Настройки» (раздел 6.5 ТЗ).
   Уровни / добавки / ранги / если-то правила / режим Лето-Школа.
   Даты фаз, экспорт-импорт и Supabase добавляются на своих этапах.
   ============================================================ */

(function () {
  'use strict';

  function render() {
    var st = State.s.settings;
    return '<h1>Настройки</h1>' +
      modeSection() +
      listSection('Уровни дня', 'levels',
        'Очки за уровень. Уровни вложенные: очки не суммируются, засчитывается достигнутый.',
        st.levels, 'points') +
      listSection('Добавки', 'addons',
        'Плюсуются к любому уровню, включая «Пусто».',
        st.addons, 'points') +
      listSection('Ранги недели', 'ranks',
        'Порог — сумма очков за неделю (пн–вс).',
        st.ranks, 'min') +
      ifThenSection() +
      aboutSection();
  }

  function modeSection() {
    var m = State.mode();
    var auto = State.AUTO_SCHOOL_DATE;
    return '<section class="block"><h2>Режим</h2>' +
      '<p class="lead">Лето — до 7 сентября 2026. Школа включится сама ' + U.fmtLong(auto) +
      ', шкала нагрузки стартует с S1.</p>' +
      '<div class="card"><div class="rowline">' +
      '<div class="k">Текущий режим<span class="dim tiny">' +
      (m === 'summer' ? 'минималка + уроки, шкала нагрузки спит' : 'цепочка дня: школа → ДЗ → программа → проекты') +
      '</span></div>' +
      '<div class="seg">' +
      '<button data-mode="summer" aria-pressed="' + (m === 'summer') + '">Лето</button>' +
      '<button data-mode="school" aria-pressed="' + (m === 'school') + '">Школа</button>' +
      '</div></div></div></section>';
  }

  function listSection(title, key, lead, items, numField) {
    var rows = items.map(function (it, i) {
      return '<div class="srow">' +
        '<input class="txt" style="flex:1" data-list="' + key + '" data-i="' + i + '" data-field="name" value="' + U.esc(it.name) + '">' +
        '<input class="num" type="number" inputmode="numeric" data-list="' + key + '" data-i="' + i + '" data-field="' + numField + '" value="' + U.esc(it[numField]) + '">' +
        '</div>';
    }).join('');
    return '<section class="block"><h2>' + U.esc(title) + '</h2>' +
      '<p class="lead">' + U.esc(lead) + '</p>' +
      '<div class="card">' + rows + '</div></section>';
  }

  function ifThenSection() {
    var rules = State.s.settings.ifThen || [];
    var rows = rules.map(function (r, i) {
      return '<div class="srow">' +
        '<input class="txt" style="flex:1" data-ifthen="' + i + '" value="' + U.esc(r.text) + '">' +
        '<button class="btn ghost" style="width:auto;padding:6px 10px" data-ifthen-del="' + i + '">✕</button>' +
        '</div>';
    }).join('');
    return '<section class="block"><h2>Если — то</h2>' +
      '<p class="lead">3–5 правил. На «Сегодня» показывается одно, по дню недели.</p>' +
      '<div class="card">' + (rows || '<div class="dim small">Пока пусто.</div>') +
      (rules.length < 5 ? '<button class="btn ghost" data-ifthen-add>+ правило</button>' : '') +
      '</div></section>';
  }

  function aboutSection() {
    return '<section class="block"><h2>О приложении</h2>' +
      '<div class="card">' +
      '<div class="srow"><div class="k">Версия<span>модель данных v' + State.SCHEMA + '</span></div>' +
      '<div class="mono small">' + State.APP_VERSION + '</div></div>' +
      '<div class="srow"><div class="k">Последнее изменение</div>' +
      '<div class="mono small dim">' + U.esc(fmtStamp(State.s.meta.updatedAt)) + '</div></div>' +
      '</div>' +
      '<button class="btn danger" style="margin-top:10px" data-reset>Сбросить всё локально</button>' +
      '</section>';
  }

  function fmtStamp(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return U.fmtShort(U.iso(d)) + ', ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function mount(host) {
    U.on(host, 'click', '[data-mode]', function (e, el) {
      State.setMode(el.dataset.mode);
      UI.toast(el.dataset.mode === 'school' ? 'Режим «Школа»' : 'Режим «Лето»', 'ok');
    });

    U.on(host, 'change', '[data-list]', function (e, el) {
      var list = State.s.settings[el.dataset.list];
      var item = list[+el.dataset.i];
      if (!item) return;
      var f = el.dataset.field;
      if (f === 'name') item.name = el.value.trim() || item.name;
      else item[f] = Math.max(0, parseInt(el.value, 10) || 0);
      // пересчитать очки всех дней: пороги/веса могли измениться
      Object.keys(State.s.days).forEach(function (d) { State.recount(d); });
      State.touch();
    });

    U.on(host, 'change', '[data-ifthen]', function (e, el) {
      var r = State.s.settings.ifThen[+el.dataset.ifthen];
      if (r) { r.text = el.value.trim(); State.touch(); }
    });
    U.on(host, 'click', '[data-ifthen-del]', function (e, el) {
      State.s.settings.ifThen.splice(+el.dataset.ifthenDel, 1);
      State.touch();
    });
    U.on(host, 'click', '[data-ifthen-add]', function () {
      State.s.settings.ifThen.push({ id: U.uid(), text: '' });
      State.touch();
    });

    U.on(host, 'click', '[data-reset]', function () {
      UI.confirm({
        title: 'Сбросить всё?',
        sub: 'Локальные данные удалятся: дни, очки, серия, уроки. Отменить нельзя.',
        yes: 'Сбросить', danger: true,
        onYes: function () { State.reset(); UI.toast('Состояние очищено'); }
      });
    });
  }

  App.register('settings', { render: render, mount: mount });
})();
