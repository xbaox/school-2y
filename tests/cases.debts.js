/* Долги 2.0 (релиз 2.6.0): короткий id D-n, два яруса сопоставления
   «Погашено», прогресс погашения и несопоставленные строки. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], writing: '', raw: ''
    }, over || {});
  }

  // с 2.7.0 долг приходит с кодом категории, а его текст в банке — это
  // «название категории — пример ошибки». Поэтому строки для матчинга
  // берём у самих долгов, а не повторяем руками
  var EX = [
    'путает знак наклона при отрицательном k',
    'не проверяет ответ подстановкой',
    'теряет единицы измерения в ответе'
  ];

  /** Три долга дорожки math: D-1 (М1), D-2 (М6), D-3 (М3). */
  function bank() {
    fresh();
    State.applySummary('B2.1', summary({
      debts: ['М1 — ' + EX[0], 'М6 — ' + EX[1], 'М3 — ' + EX[2]]
    }), { date: '2026-08-20' });
    return State.s.debts;
  }

  describe('долги 2.6.0: короткий id выдаётся по порядку', function () {
    var d = bank();
    eq(d.map(function (x) { return x.did; }), ['D-1', 'D-2', 'D-3'], 'D-1, D-2, D-3');
    eq(State.nextDebtId(), 'D-4', 'следующий номер продолжает ряд');

    // долг с другой дорожки продолжает общую нумерацию
    State.applySummary('B1.1', summary({ debts: ['П3 — путает however и therefore'] }), { date: '2026-08-21' });
    eq(State.s.debts[3].did, 'D-4', 'нумерация сквозная, не по дорожкам');
    eq(State.s.debts[3].track, 'write', 'дорожка при этом своя');
  });

  describe('долги 2.6.0: миграция раздаёт id старым долгам', function () {
    fresh();
    var old = {
      settings: {}, days: {},
      debts: [
        { id: 'a', track: 'math', text: 'первый', createdIn: 'B2.1', clearedIn: [], status: 'open' },
        { id: 'b', track: 'math', text: 'второй', createdIn: 'B2.2', clearedIn: [], status: 'closed' },
        { id: 'c', track: 'write', text: 'третий', createdIn: 'B1.1', clearedIn: [], status: 'open' }
      ]
    };
    var out = State.migrate(old);
    eq(out.debts.map(function (x) { return x.did; }), ['D-1', 'D-2', 'D-3'],
      'id раздаются по порядку создания, закрытые тоже');

    // повторная миграция ничего не перенумеровывает
    var again = State.migrate(out);
    eq(again.debts.map(function (x) { return x.did; }), ['D-1', 'D-2', 'D-3'], 'миграция идемпотентна');

    // частично размеченный банк: новые номера идут после максимального
    var mixed = State.migrate({
      settings: {}, days: {},
      debts: [
        { id: 'a', did: 'D-7', text: 'уже с id', createdIn: 'B2.1', clearedIn: [], status: 'open' },
        { id: 'b', text: 'без id', createdIn: 'B2.2', clearedIn: [], status: 'open' }
      ]
    });
    eq(mixed.debts.map(function (x) { return x.did; }), ['D-7', 'D-8'], 'новые номера продолжают максимум');
  });

  describe('долги 2.6.0: сценарий 1 — чистый id', function () {
    var d = bank();
    eq(State.matchDebt('D-2', 'math'), d[1], 'голый id находит свой долг');
    eq(State.matchDebt('[D-3]', 'math'), d[2], 'id в квадратных скобках');
    eq(State.matchDebt('[D-1] ' + EX[0], 'math'), d[0], 'id вместе с текстом');
    eq(State.matchDebt('d-2', 'math'), d[1], 'регистр id не важен');

    // id сильнее текста: он якорь, а текст ИИ перефразирует
    eq(State.matchDebt('[D-1] ' + EX[1], 'math'), d[0],
      'при споре id и текста побеждает id');

    // id из чужой дорожки всё равно находится — номера сквозные
    State.applySummary('B1.1', summary({ debts: ['П3 — путает however и therefore'] }), { date: '2026-08-21' });
    eq(State.matchDebt('D-4', 'math').did, 'D-4', 'id ищется по всему банку');
  });

  describe('долги 2.6.0: сценарий 2 — фолбэк по тексту', function () {
    var d = bank();
    eq(State.matchDebt(d[0].text, 'math'), d[0], 'дословно');
    eq(State.matchDebt(d[0].text.toUpperCase() + '.', 'math'), d[0], 'регистр и точка не мешают');
    eq(State.matchDebt(d[0].text + ' — отработано', 'math'), d[0],
      'формулировка целиком внутри строки');
    eq(State.matchDebt(d[1].text.replace('ответ ', 'ответы '), 'math'), d[1],
      'опечатка в окончании проходит порог 0.85');

    // короткий огрызок чужой долг не закрывает — это и есть удалённый ярус 0.5/0.6
    eq(State.matchDebt('знак наклона', 'math'), null, 'огрызок долг не гасит');
    eq(State.matchDebt('единицы', 'math'), null, 'одно слово — не совпадение');
    eq(State.matchDebt('подстановка', 'math'), null, 'одно слово из середины — тоже нет');

    ok(State.similarity('не проверяет ответ подстановкой', 'не проверяет ответы подстановкой') >= 0.85,
      'похожесть считает опечатки близкими');
    ok(State.similarity('путает знак наклона', 'теряет единицы измерения') < 0.85,
      'разные формулировки далеки');
  });

  describe('долги 2.6.0: сценарий 3 — мусор ничего не гасит', function () {
    bank();
    eq(State.matchDebt('D-99', 'math'), null, 'несуществующий id');
    eq(State.matchDebt('', 'math'), null, 'пустая строка');
    eq(State.matchDebt('нет', 'math'), null, 'слово «нет»');
    eq(State.matchDebt('ok', 'math'), null, 'две буквы');
    eq(State.matchDebt('квадратное уравнение через дискриминант', 'math'), null, 'посторонний текст');
    eq(State.matchDebt('Sign of slope confusion', 'math'), null, 'перевод на английский — не совпадение');
  });

  describe('долги 2.6.0: несопоставленные строки видны', function () {
    bank();
    var res = State.applySummary('B2.2', summary({
      cleared: ['D-1', 'абракадабра', 'D-77']
    }), { date: '2026-08-21' });

    eq(res.cleared, 1, 'один долг отмечен');
    eq(res.unmatched, ['абракадабра', 'D-77'], 'две строки не легли ни на что');
    eq(res.closed, 0, 'одного урока для закрытия мало');

    // две строки в один долг считаются один раз
    var res2 = State.applySummary('B2.3', summary({
      cleared: ['D-2', State.s.debts[1].text]
    }), { date: '2026-08-22' });
    eq(res2.cleared, 1, 'один долг, хоть строки две');
    eq(res2.unmatched, [], 'обе строки сопоставлены');
  });

  describe('долги 2.6.0: прогресс погашения 0/2 → 1/2 → 2/2', function () {
    var d = bank();
    eq(State.debtProgress(d[0]), 0, 'новый долг — 0 из 2');

    State.applySummary('B2.2', summary({ cleared: ['D-1'] }), { date: '2026-08-21' });
    eq(State.debtProgress(d[0]), 1, 'после одного урока — 1 из 2');
    eq(d[0].status, 'open', 'но ещё открыт');

    // тот же урок второй раз прогресс не двигает
    State.applySummary('B2.2', summary({ cleared: ['D-1'] }), { date: '2026-08-21' });
    eq(State.debtProgress(d[0]), 1, 'повтор того же урока — по-прежнему 1 из 2');

    State.applySummary('B2.3', summary({ cleared: ['D-1'] }), { date: '2026-08-22' });
    eq(State.debtProgress(d[0]), 2, 'второй разный урок — 2 из 2');
    eq(d[0].status, 'closed', 'и долг закрыт');

    // закрытый долг из сопоставления выпадает
    eq(State.matchDebt('D-1', 'math'), null, 'закрытый долг по id больше не находится');
    eq(State.openDebts('math').length, 2, 'в открытых остались двое');
  });

  describe('долги 2.6.0: id уезжает в промпт', function () {
    bank();
    var p = PROMPTS.lesson('B2.2', { today: '2026-08-21' });
    ok(p.indexOf('[D-1] ' + State.s.debts[0].text) > 0, 'долг с id в блоке ПАМЯТЬ');
    ok(p.indexOf('[D-2] ' + State.s.debts[1].text) > 0, 'и второй тоже');
    ok(p.indexOf('в «Погашено» указывай id') > 0, 'правило 14 контракта объясняет, что с ними делать');
  });
})();
