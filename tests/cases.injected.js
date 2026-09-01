/* 2.6.5, этап 2: «Погашено» судится по списку долгов из промпта урока.
   Инцидент, который это лечит: ИИ продолжил нумерацию, которую видел в промпте,
   и написал «Погашено: [D-11] …» — долг с таким id существовал, но в промпте
   этого урока его не было. matchDebt нашёл его по id и засчитал касание. */

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

  /** Восемь открытых долгов дорожки письма: в окно промпта влезают пять. */
  function bank() {
    fresh();
    State.applySummary('B1.1', summary({
      debts: ['долг один', 'долг два', 'долг три', 'долг четыре']
    }), { date: '2026-08-20' });
    State.applySummary('B1.2', summary({
      debts: ['долг пять', 'долг шесть', 'долг семь', 'долг восемь']
    }), { date: '2026-08-21' });
  }

  function did(text) {
    var found = null;
    State.s.debts.forEach(function (d) { if (d.text === text) found = d; });
    return found && found.did;
  }

  describe('2.6.5: промпт и запомненный список — один отбор', function () {
    bank();
    var ids = State.promptDebts('write').map(function (d) { return d.did; });
    eq(ids.length, 5, 'в окно промпта уходит пять');
    var text = PROMPTS.lesson('B1.3', { today: '2026-08-22' });
    ids.forEach(function (id) {
      ok(text.indexOf('[' + id + ']') > 0, id + ' действительно напечатан в промпте');
    });
    eq(text.indexOf('[' + did('долг шесть') + ']'), -1, 'шестой в промпт не попал');
  });

  describe('2.6.5: чужой id ничего не закрывает и виден в отчёте', function () {
    bank();
    State.markInjectedDebts('B1.3', State.promptDebts('write'));
    var alien = did('долг шесть');                   // существует, но не показан

    var res = State.applySummary('B1.3', summary({
      cleared: ['[' + alien + '] отработано']
    }), { date: '2026-08-22' });

    eq(res.cleared, 0, 'ничего не погашено');
    eq(res.foreign, [alien], 'чужой id назван в отчёте');
    eq(res.unmatched.length, 0, 'и это не «не сопоставлено» — долг-то есть');
    eq(State.debtProgress(State.s.debts.filter(function (d) { return d.did === alien; })[0]), 0,
      'прогресс чужого долга не сдвинулся');
  });

  describe('2.6.5: несуществующий id — «не сопоставлено», а не «чужой»', function () {
    bank();
    State.markInjectedDebts('B1.3', State.promptDebts('write'));
    var res = State.applySummary('B1.3', summary({
      cleared: ['[D-99] отработано']
    }), { date: '2026-08-22' });
    eq(res.cleared, 0, 'ничего не погашено');
    eq(res.foreign.length, 0, 'чужих нет — такого долга не существует');
    eq(res.unmatched.length, 1, 'строка попала в «не сопоставлено»');
  });

  describe('2.6.5: свой id из промпта гасится как раньше', function () {
    bank();
    State.markInjectedDebts('B1.3', State.promptDebts('write'));
    var own = did('долг два');
    var res = State.applySummary('B1.3', summary({
      cleared: ['[' + own + '] отработано']
    }), { date: '2026-08-22' });
    eq(res.cleared, 1, 'погашено');
    eq(res.foreign.length, 0, 'чужих нет');
  });

  describe('2.6.5: текстовый ярус тоже только среди показанных', function () {
    bank();
    State.markInjectedDebts('B1.3', State.promptDebts('write'));
    // дословная формулировка непоказанного долга не должна его закрывать
    var res = State.applySummary('B1.3', summary({
      cleared: ['долг шесть']
    }), { date: '2026-08-22' });
    eq(res.cleared, 0, 'дословный текст чужого долга не сработал');
    eq(res.foreign, [did('долг шесть')], 'и он опознан как чужой');
  });

  describe('2.6.5: разминка расширяет список урока, а не заменяет', function () {
    bank();
    State.markInjectedDebts('B1.3', State.promptDebts('write'));
    var ids = State.injectedDebts('B1.3');
    eq(ids.length, 5, 'пока разминку не копировали — только окно урока');

    State.markInjectedDebts(null, State.warmupDebts());
    eq(State.injectedDebts('B1.3').length, 5,
      'первые три разминки и так внутри окна — дублей не появилось');

    // разминка с долгом вне окна урока
    State.markInjectedDebts(null, [{ did: did('долг семь') }]);
    var wide = State.injectedDebts('B1.3');
    eq(wide.length, 6, 'долг разминки добавился к окну урока');
    ok(wide.indexOf(did('долг семь')) >= 0, 'именно он');
  });

  describe('2.6.5: без записи промпта ограничения нет (состояния до 2.6.5)', function () {
    bank();
    // markInjectedDebts не звали — промпт копировали старой версией
    eq(State.injectedDebts('B1.3'), null, 'списка нет');
    eq(State.injectedPool('B1.3'), null, 'и пула нет');
    var res = State.applySummary('B1.3', summary({
      cleared: ['[' + did('долг шесть') + '] отработано']
    }), { date: '2026-08-22' });
    eq(res.cleared, 1, 'матчинг работает по-старому, а не отвергает всё подряд');
  });

  describe('2.6.5: каждое копирование перезаписывает список', function () {
    bank();
    State.markInjectedDebts('B1.3', State.promptDebts('write'));
    eq(State.injectedDebts('B1.3').length, 5, 'пять после первого копирования');
    State.markInjectedDebts('B1.3', [{ did: did('долг восемь') }]);
    eq(State.injectedDebts('B1.3'), [did('долг восемь')], 'второе копирование заменило список');
  });

  describe('2.6.5: список переживает миграцию', function () {
    bank();
    State.markInjectedDebts('B1.3', State.promptDebts('write'));
    var back = State.migrate(JSON.parse(JSON.stringify(State.s)));
    eq(back.injected.lessons['B1.3'].length, 5, 'список урока на месте');
    var blank = State.migrate({ settings: {}, days: {} });
    eq(blank.injected, { min: [], lessons: {} }, 'у старого состояния поле создаётся пустым');
  });

  /* ---------- зачистка выдуманных id в тексте нового долга ---------- */

  describe('2.6.5: ведущий [D-…] из текста нового долга вычищается', function () {
    eq(U.stripDebtId('[D-12] Пропускает артикль the'), 'Пропускает артикль the', 'скобки');
    eq(U.stripDebtId('D-7 — Comma splice'), 'Comma splice', 'без скобок, с тире');
    eq(U.stripDebtId('(D-3) Point не спорный'), 'Point не спорный', 'круглые скобки');
    eq(U.stripDebtId('№4 Знак валюты после числа'), 'Знак валюты после числа', 'номер');
    eq(U.stripDebtId('#2 Артикли'), 'Артикли', 'решётка');
    eq(U.stripDebtId('Артикль после is called'), 'Артикль после is called', 'чистый текст не трогаем');
    eq(U.stripDebtId('D3 без дефиса — не id'), 'D3 без дефиса — не id', 'не id — не режем');
    eq(U.stripDebtId('2x − 3y = 0 записан неверно'), '2x − 3y = 0 записан неверно', 'формулу не режем');
  });

  describe('2.6.5: парсер чистит новые долги, но не «Погашено»', function () {
    var text = [
      '=== ИТОГ УРОКА B1.3 ===',
      'Пройдено: тема',
      'Уровень: L2',
      'Счёт: 8/10',
      'Слова (8–12): slope — наклон',
      'Долги:',
      '[D-12] Пропускает артикль the перед величинами',
      '[D-13] Comma splice',
      'Погашено:',
      '[D-1] отработано',
      'В разогрев: вопрос',
      'Письмо: ок',
      '=== КОНЕЦ ==='
    ].join('\n');
    var p = PROMPTS.parse(text);
    ok(p.ok, 'итог разобран');
    eq(p.debts, ['Пропускает артикль the перед величинами', 'Comma splice'],
      'выдуманные id из новых долгов убраны');
    eq(p.cleared, ['[D-1] отработано'], 'в «Погашено» id остался — это якорь');
  });

  describe('2.6.5: долг в банк ложится без выдуманного id', function () {
    fresh();
    State.applySummary('B1.1', summary({
      debts: ['[D-12] Пропускает артикль the']
    }), { date: '2026-08-20' });
    // applySummary принимает уже разобранный итог; через парсер текст чистый
    var p = PROMPTS.parse([
      '=== ИТОГ УРОКА B1.2 ===', 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10',
      'Долги:', '[D-77] Запятая перед because', '=== КОНЕЦ ==='
    ].join('\n'));
    State.applySummary('B1.2', p, { date: '2026-08-21' });
    var last = State.s.debts[State.s.debts.length - 1];
    eq(last.text, 'Запятая перед because', 'в банке текст без [D-77]');
    eq(last.did, 'D-2', 'id присвоила система, по порядку');
  });

  describe('2.6.5: контракт запрещает нумеровать новые долги', function () {
    var c = PROMPTS.contractBlock({ lessonLabel: '40', lessonMin: 40, qRange: '10–12', ru: '≤30%' });
    ok(c.indexOf('БЕЗ номеров и без [D-…]') > 0, 'правило 14 дополнено');
    ok(c.indexOf('чужой id система игнорирует') > 0, 'и предупреждает про «Погашено»');
  });
})();
