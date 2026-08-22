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
      stepSection() +
      listSection('Уровни дня', 'levels',
        'Очки за уровень. Уровни вложенные: очки не суммируются, засчитывается достигнутый.',
        st.levels, 'points') +
      listSection('Добавки', 'addons',
        'Плюсуются к любому уровню, включая «Пусто».',
        st.addons, 'points') +
      listSection('Ранги недели', 'ranks',
        'Порог — сумма очков за неделю (пн–вс).',
        st.ranks, 'min') +
      phaseDatesSection() +
      ifThenSection() +
      cloudSection() +
      backupSection() +
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

  function stepSection() {
    var s = State.s.step;
    var pos = STEPS.effectivePos(s, State.today());
    var p = STEPS.params(s, State.today(), State.mode());
    // летом бейдж обязан говорить «Лето»: показывать S1 рядом со строкой
    // летнего пресета S2 — прямое противоречие на одном экране
    var summer = !State.isSchool();
    return '<section class="block"><h2>Ступень нагрузки</h2>' +
      '<p class="lead">Шкала из 7 позиций: S1–S4 растят время, Г1–Г3 — глубину. ' +
      'Растёт сама по циклам, но поставить ступень вручную можно в любой момент.</p>' +
      '<div class="card">' +
      '<div class="srow"><div class="k">Сейчас<span>' + U.esc(STEPS.cardLine(p)) + '</span>' +
      (summer ? '<span>старт шкалы ' + U.fmtDayMonth(State.AUTO_SCHOOL_DATE) + ' — с S1</span>' : '') +
      '</div>' +
      '<div class="mono">' + U.esc(summer ? 'Лето' : STEPS.label(pos)) + '</div></div>' +
      '<div class="srow"><div class="k">День цикла<span>цикл 14 дней, пауза при отсрочке и разгрузке</span></div>' +
      '<div class="mono">' + (State.isSchool() ? StepsFlow.cycleDay() + '/14' : '—') + '</div></div>' +
      '<button class="btn ghost" data-step-manual>Изменить ступень вручную</button>' +
      (State.isSchool() ? '<button class="btn ghost" data-step-deload>Неделя экзаменов — разгрузка</button>' : '') +
      '</div></section>';
  }

  function listSection(title, key, lead, items, numField) {
    var rows = items.map(function (it, i) {
      return '<div class="srow">' +
        '<input class="txt" style="flex:1" data-list="' + U.esc(key) + '" data-i="' + U.esc(i) +
        '" data-field="name" aria-label="Название" value="' + U.esc(it.name) + '">' +
        '<input class="num" type="number" inputmode="numeric" data-list="' + U.esc(key) + '" data-i="' + U.esc(i) +
        '" data-field="' + U.esc(numField) + '" aria-label="Очки" value="' + U.esc(it[numField]) + '">' +
        '</div>';
    }).join('');
    return '<section class="block"><h2>' + U.esc(title) + '</h2>' +
      '<p class="lead">' + U.esc(lead) + '</p>' +
      '<div class="card">' + rows + '</div></section>';
  }

  /**
   * Даты фаз (раздел 6.5). Правка дат фазы НЕ двигает дедлайны блоков:
   * для блоков есть отдельная кнопка «сдвинуть фазу» в «Программе»,
   * и смешивать их нельзя — иначе поправка одной даты переставит весь план.
   */
  function phaseDatesSection() {
    var pd = State.s.settings.phaseDates;
    var rows = State.phases().map(function (p) {
      var d = pd[p.id] || {};
      return '<div class="prow">' +
        '<div class="k">' + U.esc(p.name) + '</div>' +
        '<div class="pdates">' +
        '<input class="txt" type="date" aria-label="Начало фазы ' + U.esc(p.name) + '" ' +
        'data-phase-date="' + U.esc(p.id) + '" data-edge="start" value="' + U.esc(d.start || '') + '">' +
        '<span class="dim">–</span>' +
        '<input class="txt" type="date" aria-label="Конец фазы ' + U.esc(p.name) + '" ' +
        'data-phase-date="' + U.esc(p.id) + '" data-edge="end" value="' + U.esc(d.end || '') + '">' +
        '</div></div>';
    }).join('');

    return '<section class="block"><h2>Даты фаз</h2>' +
      '<p class="lead">Начало и конец каждой фазы. Дедлайны блоков живут отдельно — ' +
      'их двигает кнопка «сдвинуть фазу» в «Программе».</p>' +
      '<div class="card">' + rows + '</div></section>';
  }

  function ifThenSection() {
    var rules = State.s.settings.ifThen || [];
    var rows = rules.map(function (r, i) {
      return '<div class="srow">' +
        '<input class="txt" style="flex:1" data-ifthen="' + U.esc(i) +
        '" aria-label="Правило если — то" value="' + U.esc(r.text) + '">' +
        '<button class="btn ghost" style="width:auto;padding:6px 14px" data-ifthen-del="' + U.esc(i) +
        '" aria-label="Удалить правило">✕</button>' +
        '</div>';
    }).join('');
    return '<section class="block"><h2>Если — то</h2>' +
      '<p class="lead">3–5 правил. На «Сегодня» показывается одно, по дню недели.</p>' +
      (rows
        ? '<div class="card">' + rows +
        '<button class="btn ghost" data-ifthen-add>+ правило</button></div>'
        : UI.empty('🪝', 'Правил пока нет. Одно правило — один автопилот на трудный день.',
          '<button class="btn sec" data-ifthen-add>Добавить первое правило</button>')) +
      '</section>';
  }

  /** Облако: вход, статус, ручная синхронизация (раздел 3 ТЗ). */
  function cloudSection() {
    if (!window.Sync || !Sync.available()) {
      return '<section class="block"><h2>Облако</h2>' +
        '<div class="fnote">Синхронизация не настроена — всё живёт локально.</div></section>';
    }
    var st = Sync.state();
    var cls = st.status === 'error' ? 'r' : (st.status === 'queued' ? 'y' : (st.status === 'off' ? 'dim' : 'g'));

    if (!Sync.signedIn()) {
      // вход мог отвалиться на ходу — тогда причина висит над формой
      var lost = st.status === 'error'
        ? '<div class="fnote r" style="border-color:rgba(248,113,113,.4);margin-bottom:10px">' +
        U.esc(st.error) + '. Данные целы и лежат в этом браузере.</div>'
        : '';
      return '<section class="block"><h2>Облако</h2>' +
        '<p class="lead">Вход по почте и паролю. Пока не вошёл — всё работает локально, ничего не теряется.</p>' +
        lost + '<div class="card">' + Sync.loginFormHtml() + '</div></section>';
    }

    // ошибка синка живёт строкой в карточке, а не тостом: тост уезжает,
    // а разобраться с облаком надо здесь и сейчас
    var err = st.status === 'error'
      ? '<div class="fnote r" style="border-color:rgba(248,113,113,.4)">' +
      U.esc(st.error || 'Облако не ответило') + '. Данные целы и лежат в этом браузере — ' +
      'нажми «Отправить сейчас», когда связь вернётся.</div>'
      : '';

    return '<section class="block"><h2>Облако</h2>' +
      '<p class="lead">Изменения уходят через 2 секунды после правки. Без сети копятся в очереди.</p>' +
      '<div class="card">' +
      '<div class="srow"><div class="k">Аккаунт<span>' + U.esc(Sync.email || '') + '</span></div>' +
      '<div class="mono small ' + cls + '">' + U.esc(Sync.status()) + '</div></div>' +
      err +
      '<div class="btn-row" style="margin-top:10px">' +
      '<button class="btn sec" data-sync-pull>Забрать из облака</button>' +
      '<button class="btn sec" data-sync-push>Отправить сейчас</button>' +
      '</div>' +
      '<button class="btn ghost" data-sync-out>Выйти из облака</button>' +
      '</div></section>';
  }

  /** Экспорт/импорт полного состояния — страховка (раздел 3 ТЗ). */
  function backupSection() {
    var s = State.s;
    var size = 0;
    try { size = Math.round(JSON.stringify(s).length / 1024); } catch (e) { size = 0; }
    return '<section class="block"><h2>Резервная копия</h2>' +
      '<p class="lead">Весь прогресс — один JSON-файл. Работает без сети и без облака.</p>' +
      '<div class="card">' +
      '<div class="srow"><div class="k">Сейчас в состоянии' +
      '<span>' + count(Object.keys(s.days).length, 'день', 'дня', 'дней') + ' · ' +
      count(Object.keys(s.lessons).length, 'урок', 'урока', 'уроков') + ' · ' +
      count(s.summaries.length, 'итог', 'итога', 'итогов') + ' · ' +
      count(s.debts.length, 'долг', 'долга', 'долгов') + ' · ~' + size + ' КБ</span></div></div>' +
      '<div class="btn-row" style="margin-top:10px">' +
      '<button class="btn sec" data-export>Скачать JSON</button>' +
      '<button class="btn sec" data-import>Загрузить JSON</button>' +
      '</div>' +
      '<input type="file" accept="application/json,.json" class="hidden" data-file>' +
      '</div></section>';
  }

  function count(n, one, few, many) { return n + ' ' + U.plural(n, one, few, many); }

  function aboutSection() {
    return '<section class="block"><h2>О приложении</h2>' +
      '<div class="card">' +
      '<div class="srow"><div class="k">Версия<span>модель данных v' + State.SCHEMA + '</span></div>' +
      '<div class="mono small">' + State.APP_VERSION + '</div></div>' +
      '<div class="srow"><div class="k">Service worker<span>офлайн-кэш</span></div>' +
      '<div class="mono small dim">' + U.esc(App.version() || 'не активен') + '</div></div>' +
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

    U.on(host, 'click', '[data-step-manual]', function () { StepsFlow.openManual(); });
    U.on(host, 'click', '[data-step-deload]', function () { StepsFlow.startDeload(); });

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

    U.on(host, 'change', '[data-phase-date]', function (e, el) {
      var id = el.dataset.phaseDate;
      var pd = State.s.settings.phaseDates[id] || (State.s.settings.phaseDates[id] = { start: null, end: null });
      pd[el.dataset.edge] = el.value || null;
      State.touch();
      UI.toast(State.phaseName(id) + ': даты обновлены. Дедлайны блоков на месте.', 'ok', 3200);
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

    // удача — тостом, неудача — стойкой строкой в карточке «Облако» (C-05)
    U.on(host, 'click', '[data-sync-pull]', function () {
      Sync.pull(true).then(function (r) {
        if (!r.ok) { App.renderScreen('settings'); return; }
        UI.toast(r.applied ? 'Забрал состояние из облака'
          : (r.empty ? 'В облаке пока пусто' : 'Локальное новее — оставил его'), 'ok', 3600);
      });
    });
    U.on(host, 'click', '[data-sync-push]', function () {
      Sync.push().then(function (r) {
        if (!r.ok) { App.renderScreen('settings'); return; }
        UI.toast('Отправлено в облако', 'ok', 3600);
      });
    });
    U.on(host, 'click', '[data-sync-out]', function () {
      UI.confirm({
        title: 'Выйти из облака?',
        sub: 'Данные останутся в этом браузере. Синхронизация остановится.',
        yes: 'Выйти',
        onYes: function () { Sync.signOut(); App.renderScreen('settings'); UI.toast('Вышел из облака'); }
      });
    });

    U.on(host, 'click', '[data-export]', function () { exportJson(); });
    U.on(host, 'click', '[data-import]', function () { U.el('[data-file]', host).click(); });
    U.on(host, 'change', '[data-file]', function (e, el) {
      var f = el.files && el.files[0];
      if (f) importJson(f);
      el.value = '';
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

  /* ---------- экспорт и импорт ---------- */

  function exportJson() {
    var text = JSON.stringify(State.s, null, 2);
    var name = 'study-v2-' + State.today() + '.json';
    try {
      var blob = new Blob([text], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      UI.toast('Файл ' + name, 'ok');
    } catch (e) {
      UI.copy(text, 'Скачивание не сработало — JSON в буфере');
    }
  }

  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(reader.result); }
      catch (e) { UI.toast('Это не JSON состояния. Выбери файл study-v2-*.json', 'bad', 4200); return; }
      // проверяем ДО замены: битый файл не должен доехать до State.replace
      var check = State.validateImport(data);
      if (!check.ok) { UI.toast(check.error, 'bad', 4600); return; }
      var stamp = data.meta && data.meta.updatedAt ? fmtStamp(data.meta.updatedAt) : 'без даты';
      UI.confirm({
        title: 'Заменить всё содержимое?',
        sub: 'Файл от ' + stamp + ' · дней ' + Object.keys(data.days || {}).length +
          ' · итогов ' + ((data.summaries || []).length) +
          '. Текущие локальные данные будут перезаписаны.',
        yes: 'Заменить', danger: true,
        onYes: function () {
          State.replace(data);
          State.syncContent();
          // импортированный файл — свежайшая правда этого устройства:
          // штампуем «сейчас» и отдаём в облако сразу, не дожидаясь следующей правки
          State.touch(true);
          if (window.Sync && Sync.signedIn()) Sync.push();
          UI.toast('Состояние загружено', 'ok');
          App.render();
        }
      });
    };
    reader.onerror = function () { UI.toast('Файл не прочитался. Попробуй ещё раз.', 'bad'); };
    reader.readAsText(file);
  }

  /**
   * Форма входа вешает onclick на конкретную кнопку, а её узел пересоздаётся
   * при каждой перерисовке — значит перевешивать надо каждый раз.
   * Делегированные слушатели из mount() при этом не дублируются.
   */
  function update(host) {
    if (window.Sync && Sync.available() && !Sync.signedIn()) {
      Sync.wireLoginForm(host, function () { App.renderScreen('settings'); });
    }
  }

  App.register('settings', { render: render, mount: mount, update: update });
})();
