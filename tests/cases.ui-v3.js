/* 2.7.0 «Корень», этап 7: экран долгов, уведомления, строка на «Сегодня».

   Главное здесь — счётчик не врёт. До 2.7.0 «закрытыми» считалось всё,
   что не открыто, и после ремонта банка владелец увидел бы «закрыто 29»
   при двух реально закрытых долгах. */

(function () {
  'use strict';

  function fresh() {
    State.reset();
    State.syncContent();
  }

  function summary(over) {
    return Object.assign({
      score: 8, level: 'L2', topics: 'тема',
      words: [], debts: [], cleared: [], warmup: [], checklist: null, writing: '', raw: ''
    }, over || {});
  }

  /** Банк со всеми пятью состояниями долга. */
  function bank() {
    fresh();
    State.applySummary('B2.1', summary({
      debts: ['М1 — раз', 'М2 — два', 'М3 — три']
    }), { date: '2026-09-10' });
    State.applySummary('B2.2', summary({ cleared: ['[D-1]'] }), { date: '2026-09-11' });
    // D-2 закрыт двумя уроками, остальные — вручную в прочие состояния
    State.applySummary('B2.2', summary({ cleared: ['[D-2]'] }), { date: '2026-09-11' });
    State.applySummary('B2.3', summary({ cleared: ['[D-2]'] }), { date: '2026-09-12' });
    State.s.debts.push({
      id: 'x1', did: 'D-9', cat: null, track: 'write', text: 'третье лицо -s',
      createdIn: 'B1.2', clearedIn: [], status: 'checklist',
      examples: [], failedIn: [], lastInjected: null, shownCount: 0
    });
    State.s.debts.push({
      id: 'x2', did: 'D-8', cat: null, track: 'math', text: 'поглощённый',
      createdIn: 'B2.1', clearedIn: [], status: 'merged', mergedInto: 'D-1',
      examples: [], failedIn: [], lastInjected: null, shownCount: 0
    });
    State.s.debts.push({
      id: 'x3', did: 'D-7', cat: null, track: 'math', text: 'ложное правило',
      createdIn: 'B2.1', clearedIn: [], status: 'deleted', reason: 'ложное правило',
      examples: [], failedIn: [], lastInjected: null, shownCount: 0
    });
  }

  function screen(group) {
    if (group !== undefined) App.screen('journal').setGroup(group);
    return App.screen('journal').render();
  }

  describe('2.7.0 экран долгов: шапка считает по-честному', function () {
    bank();
    var html = screen();
    eq(State.openDebts().length, 2, 'открытых два');
    ok(html.indexOf('открыто 2 · на 1/2 — 1 · закрыто 1 · чек-лист 1') > 0,
      'шапка называет все четыре числа');
    // «закрыто» — это только status closed, а не «всё, что не открыто»
    eq(html.indexOf('закрыто 4'), -1, 'поглощённые и чек-лист в закрытые не попали');
  });

  describe('2.7.0 экран долгов: пять групп, каждая своя', function () {
    bank();
    var html = screen();
    ['открытые', 'закрытые', 'ушли в чек-лист языка', 'поглощённые', 'удалённые'].forEach(function (g) {
      ok(html.indexOf('>' + g + '<') > 0, 'группа «' + g + '» есть');
    });
    // прочие группы свёрнуты по умолчанию — разворачиваем и смотрим строки
    eq(html.indexOf('поглощён долгом D-1'), -1, 'поглощённые свёрнуты');
    ok(screen('merged').indexOf('поглощён долгом D-1') > 0, 'у поглощённого сказано, куда он ушёл');
    ok(screen('deleted').indexOf('ложное правило') > 0, 'у удалённого — причина');
    ok(screen('checklist').indexOf('чек-лист языка — не долг') > 0, 'у чек-листа — что это не долг');
    screen('open');
  });

  describe('2.7.0 экран долгов: строка долга по ТЗ 7', function () {
    bank();
    State.markInjectedDebts('B2.4', State.promptDebts('math'), { date: '2026-09-12' });
    var html = screen();
    ok(html.indexOf('D-3 · М3 Форма ответа') > 0, 'id, код и голова категории');
    ok(html.indexOf('касаний 0/2') > 0, 'счёт касаний');
    ok(html.indexOf('показан ') > 0, 'и сколько раз показан');
    ok(html.indexOf('касаний 1/2 · последнее B2.2') > 0, 'у долга с касанием — где оно было');
  });

  describe('2.7.0 экран долгов: открытые идут «1/2» первыми', function () {
    bank();
    var html = screen();
    var list = html.slice(html.indexOf('>открытые<'));
    ok(list.indexOf('D-1') < list.indexOf('D-3'), 'долг на 1/2 стоит выше нетронутого');
  });

  describe('2.7.0 экран долгов: примеры раскрываются', function () {
    bank();
    var html = screen();
    ok(html.indexOf('data-debt-ex="D-1"') > 0, 'кнопка примеров есть');
    ok(html.indexOf('примеры (1)') > 0, 'и сказано, сколько их');
    eq(html.indexOf('<ul class="dex">'), -1, 'по умолчанию список свёрнут');
  });

  describe('2.7.0 экран долгов: разминочное касание подписано по-человечески', function () {
    bank();
    var d = State.openDebts('math')[0];
    d.clearedIn = ['warmup:2026-09-13'];
    var html = screen();
    ok(html.indexOf('последнее разминка 13 сен') > 0, 'видно, что касание из разминки');
  });

  describe('2.7.0 экран долгов: статистика чек-листа языка', function () {
    bank();
    eq(screen().indexOf('чек-лист: 1 —'), -1, 'пока прогонов нет — строки нет');

    var p = PROMPTS.parse([
      '=== ИТОГ УРОКА B2.4 ===', 'Пройдено: т', 'Уровень: L2', 'Счёт: 8/10',
      'Чек-лист: 1✓ 2✓ 3✗ 4✓ 5✓', '=== КОНЕЦ ==='
    ].join('\n'));
    State.applySummary('B2.4', p, { date: '2026-09-13' });
    var html = screen();
    ok(html.indexOf('чек-лист: 1 — 1/1 чисто') > 0, 'первый пункт');
    ok(html.indexOf('3 — 0/1') > 0, 'и третий, который сорвался');
  });

  describe('2.7.0 «Сегодня»: строка долгов под блоком урока', function () {
    bank();
    var line = App.debtsLine();
    ok(line.indexOf('долги: 2 открытых · 1 на 1/2') > 0, 'одна строка с обоими числами');

    var t = State.today();
    var d = State.day(t, true);
    d.level = 'norm';
    var block = App.planBlock(t, d);
    ok(block.indexOf('долги: 2 открытых') > 0, 'и она под блоком урока');

    // индикатор на карточке колоды отменён и не возвращается
    var cards = App.planItems(t, d).filter(function (x) { return x.id === 'min' || x.id === 'cards'; });
    cards.forEach(function (c) {
      eq((c.sub || '').indexOf('на 1/2'), -1, 'на карточке колоды индикатора нет');
    });
  });

  describe('2.7.0 «Сегодня»: без долгов строки нет', function () {
    fresh();
    eq(App.debtsLine(), '', 'нечего показывать — ничего и не показываем');
  });

  describe('2.7.0 уведомления: события разбора доходят до владельца', function () {
    fresh();
    State.applySummary('B2.1', summary({ debts: ['М2 — ходы не записаны'] }), { date: '2026-09-10' });
    var res = State.applySummary('B2.2', summary({
      debts: ['М2 — снова без записи', 'бред без кода'], cleared: []
    }), { date: '2026-09-11' });
    ok(res.notices.some(function (n) { return n.indexOf('повтор D-1 (М2)') === 0; }), 'повтор назван');
    ok(res.notices.some(function (n) { return n.indexOf('долг без категории отброшен') === 0; }),
      'отброшенная строка тоже');
    ok(res.notices.length >= 2, 'и всё это уходит в уведомление одним списком');
  });

  State.reset();
  State.syncContent();
})();
