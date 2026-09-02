/* 2.6.5, этап 3: ремонт банка долгов миграцией.
   Три следа инцидента «ИИ придумывает номера» плюс один след парсера,
   который резал долг по точке с запятой внутри шаблона. */

(function () {
  'use strict';

  function debt(over) {
    return Object.assign({
      id: 'x' + Math.random().toString(36).slice(2),
      did: 'D-1', track: 'write', text: 'текст',
      createdIn: 'B1.1', clearedIn: [], status: 'open'
    }, over || {});
  }

  /** Слепок владельца в миниатюре: все три поломки разом. */
  function broken() {
    return {
      settings: {}, days: {},
      summaries: [
        { lessonId: 'B1.3', date: '2026-08-29', raw: 'Погашено:\n[D-11] название шага не совпадает с действием', parsed: {} }
      ],
      debts: [
        debt({ did: 'D-6', track: 'math', createdIn: 'B2.1', status: 'closed', closedDate: '2026-08-25', clearedIn: ['B2.2', 'B2.3'], text: 'Шаблон «m = …, which is the …' }),
        debt({ did: 'D-7', track: 'math', createdIn: 'B2.1', clearedIn: ['B2.4'], text: 'b = …, which is the …» не автоматизирован — требуется устно, без подсказки' }),
        debt({ did: 'D-11', createdIn: 'B1.2', clearedIn: ['B1.3'], text: 'Explain объясняет Point вместо Evidence' }),
        debt({ did: 'D-34', createdIn: 'B1.3', text: '[D-12] Пропускает артикль the перед величинами' }),
        debt({ did: 'D-38', createdIn: 'B1.4', text: '[D-12] Пропускает «the» перед определённым существительным' })
      ]
    };
  }

  function find(state, did) {
    return state.debts.filter(function (d) { return d.did === did; })[0] || null;
  }

  describe('2.6.5 ремонт: ложное погашение D-11 снято', function () {
    var out = State.migrate(broken());
    var d = find(out, 'D-11');
    eq(d.clearedIn, [], 'касание от B1.3 убрано');
    eq(State.debtProgress(d), 0, 'прогресс вернулся к 0/2');
    eq(d.status, 'open', 'долг открыт');
  });

  describe('2.6.5 ремонт: ложное погашение закрытого долга его переоткрывает', function () {
    var src = broken();
    var d11 = find(src, 'D-11');
    d11.clearedIn = ['B1.2', 'B1.3'];
    d11.status = 'closed';
    d11.closedDate = '2026-08-29';
    var out = State.migrate(src);
    var d = find(out, 'D-11');
    eq(d.clearedIn, ['B1.2'], 'осталось настоящее касание');
    eq(d.status, 'open', 'долг переоткрыт');
    eq(d.closedDate, undefined, 'дата закрытия снята');
  });

  describe('2.6.5 ремонт: чужие касания не трогаем', function () {
    var src = broken();
    // B1.4 тоже выдумывал номера, но гасил ровно то, что видел
    src.debts.push(debt({ did: 'D-1', createdIn: 'B1.1', clearedIn: ['B1.4'] }));
    var out = State.migrate(src);
    eq(find(out, 'D-1').clearedIn, ['B1.4'], 'касание от B1.4 на месте');
  });

  describe('2.6.5 ремонт: отпечаток узкий — без него правки нет', function () {
    var src = broken();
    src.summaries = [];                       // нет итога B1.3 с [D-11]
    eq(find(State.migrate(src), 'D-11').clearedIn, ['B1.3'], 'без итога-улики не трогаем');

    src = broken();
    find(src, 'D-11').createdIn = 'B9.9';     // другой урок создания
    eq(find(State.migrate(src), 'D-11').clearedIn, ['B1.3'], 'не тот долг — не трогаем');
  });

  describe('2.6.5 ремонт: выдуманные [D-…] вычищены из текстов', function () {
    var out = State.migrate(broken());
    eq(find(out, 'D-34').text, 'Пропускает артикль the перед величинами', 'D-34 очищен');
    eq(find(out, 'D-38').text, 'Пропускает «the» перед определённым существительным', 'D-38 очищен');
    eq(out.debts.filter(function (d) { return /^\s*\[D-\d+\]/.test(d.text); }).length, 0,
      'ни одного текста с ведущим id не осталось');
  });

  describe('2.6.5 ремонт: D-6 и D-7 склеены в один долг', function () {
    var out = State.migrate(broken());
    var d6 = find(out, 'D-6');
    eq(d6.text,
      'Шаблон «m = …, which is the …; b = …, which is the …» не автоматизирован — требуется устно, без подсказки',
      'исходная строка восстановлена символ в символ');
    eq(d6.status, 'open', 'статус от открытой половины');
    eq(d6.clearedIn, ['B2.4'], 'касания от открытой половины');
    eq(d6.closedDate, undefined, 'дата закрытия огрызка снята');
    eq(State.debtProgress(d6), 1, 'прогресс 1/2');
    eq(find(out, 'D-7'), null, 'D-7 больше нет');
    eq(out.debts.length, 4, 'в банке на один долг меньше');
  });

  describe('2.6.5 ремонт: счётчики после миграции согласованы', function () {
    // с 2.7.0 состояний пять: к open/closed добавились merged, checklist и deleted
    var STATUSES = ['open', 'closed', 'merged', 'checklist', 'deleted'];
    var out = State.migrate(broken());
    var known = out.debts.filter(function (d) { return STATUSES.indexOf(d.status) >= 0; }).length;
    var closed = out.debts.filter(function (d) { return d.status === 'closed'; }).length;
    eq(known, out.debts.length, 'каждый долг ровно в одном состоянии');
    eq(closed, 0, 'закрытых не осталось: единственный был огрызком D-6');
  });

  describe('2.6.5 ремонт: повторный прогон меняет ноль', function () {
    var one = State.migrate(broken());
    var two = State.migrate(JSON.parse(JSON.stringify(one)));
    eq(JSON.stringify(two), JSON.stringify(one), 'второй прогон идентичен первому');
    var three = State.migrate(JSON.parse(JSON.stringify(two)));
    eq(JSON.stringify(three), JSON.stringify(two), 'третий тоже');
  });

  describe('2.6.5 ремонт: чистый банк миграция не трогает', function () {
    // id вне таблиц ремонта: D-1 и соседей 2.7.0 знает поимённо и правит
    // по таблице ТЗ 1.2 — это отдельный кейс в cases.migrate-v3.js
    var src = {
      settings: {}, days: {}, summaries: [],
      debts: [debt({ did: 'D-60', text: 'обычный долг', clearedIn: ['B1.1'] })]
    };
    var out = State.migrate(JSON.parse(JSON.stringify(src)));
    eq(out.debts.length, 1, 'долг на месте');
    eq(out.debts[0].text, 'обычный долг', 'текст не тронут');
    eq(out.debts[0].clearedIn, ['B1.1'], 'касания не тронуты');
  });

  describe('2.6.5 ремонт: отчёт называет id для сводки', function () {
    var rep = State.repairDebts(broken());
    eq(rep.reopened, ['D-11'], 'снятое погашение');
    eq(rep.cleaned, ['D-34', 'D-38'], 'очищенные тексты');
    eq(rep.merged, ['D-6+D-7'], 'склейка');
  });
})();
