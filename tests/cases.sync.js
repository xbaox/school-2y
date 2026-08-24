/* Облачная синхронизация (раздел 3 ТЗ): очередь переживает закрытие вкладки,
   сравнение времён через Date.parse, вход по 401. Находки A-01, A-23, A-04.
   Отдельно — отвалившийся вход: он обязан отличаться от отсутствия сети
   и быть виден на «Сегодня», а не только строкой в Настройках. */

(function () {
  'use strict';

  var SESSION_KEY = 'study-system-v2-session';
  var PUSHED_KEY = 'study-system-v2-pushed';

  /** Чистый стенд: сессия есть, состояние пустое, вызовы fetch обнулены. */
  function stand(opts) {
    opts = opts || {};
    Sync.signOut();                       // гасим очередь предыдущего стенда
    window.__store[SESSION_KEY] = JSON.stringify({
      access_token: 'tok', refresh_token: 'ref',
      expires_at: opts.expired ? Date.now() - 1000 : Date.now() + 3600000,
      user_id: 'u1', email: 'a@b.c'
    });
    if (opts.pushedAt) window.__store[PUSHED_KEY] = opts.pushedAt;
    else delete window.__store[PUSHED_KEY];
    State.reset();
    State.s.meta.updatedAt = opts.localAt;
    State.s.onboarded = true;
    State.s.days['2026-08-20'] = { level: 'min', addons: [], lessons: [], points: 1 };
    window.__calls.length = 0;
    navigator.onLine = opts.onLine !== false;
  }

  function cloudRow(updatedAt, marker) {
    var s = State.blank();
    s.meta.updatedAt = updatedAt;
    s.onboarded = true;
    s.stats.bestStreak = marker;
    return [{ state: s, updated_at: updatedAt }];
  }

  describe('синк A-01: локальная правка переживает закрытие вкладки', function () {
    defer('init отдаёт непушенное', function () {
      // вчера отправили в облако, потом правили офлайн — метка push осталась старой
      stand({ pushedAt: '2026-08-20T10:00:00.000Z', localAt: '2026-08-21T09:00:00.000Z' });
      window.__fetch = function () { return Promise.resolve(window.__res(201, {})); };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        var posts = window.__calls.filter(function (c) {
          return c.method === 'POST' && c.url.indexOf('/rest/v1/app_state') >= 0;
        });
        var gets = window.__calls.filter(function (c) { return c.method === 'GET'; });
        eq(posts.length, 1, 'при старте ушёл push');
        eq(gets.length, 0, 'pull за ним не побежал');
        eq(State.s.meta.updatedAt, '2026-08-21T09:00:00.000Z', 'локальное состояние цело');
        eq(Sync.lastPushedAt(), '2026-08-21T09:00:00.000Z', 'метка push обновилась');
      });
    });
  });

  describe('синк A-01: чистое локальное забирает облако', function () {
    defer('init тянет pull', function () {
      // всё, что было локально, уже отправлено: метка push = updatedAt
      stand({ pushedAt: '2026-08-20T10:00:00.000Z', localAt: '2026-08-20T10:00:00.000Z' });
      window.__fetch = function (url, o) {
        if ((o && o.method) === 'POST') return Promise.resolve(window.__res(201, {}));
        return Promise.resolve(window.__res(200, cloudRow('2026-08-22T08:00:00.000Z', 42)));
      };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        var gets = window.__calls.filter(function (c) { return c.method === 'GET'; });
        ok(gets.length >= 1, 'при старте ушёл pull');
        eq(State.s.stats.bestStreak, 42, 'облачное состояние применено');
        eq(Sync.lastPushedAt(), '2026-08-22T08:00:00.000Z', 'метка push подтянулась к облачной');
      });
    });
  });

  describe('синк A-23: времена сравниваются через Date.parse', function () {
    defer('смещение зоны не путает порядок', function () {
      // «новее» по тексту, но раньше по времени: +03:00 против Z
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z' });
      window.__fetch = function (url, o) {
        if ((o && o.method) === 'POST') return Promise.resolve(window.__res(201, {}));
        return Promise.resolve(window.__res(200, cloudRow('2026-08-22T11:30:00.000+03:00', 7)));
      };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        eq(State.s.stats.bestStreak, 0, 'облако в 08:30 UTC старше локального 09:00 — не применили');
        var posts = window.__calls.filter(function (c) { return c.method === 'POST'; });
        eq(posts.length, 1, 'зато локальное новее — отдали его');
      });
    });
  });

  describe('синк A-04: 401 лечится одним refresh и повтором', function () {
    defer('токен обновляется, запрос повторяется', function () {
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z' });
      var seen = 0;
      window.__fetch = function (url, o) {
        if (url.indexOf('/auth/v1/token') >= 0) {
          return Promise.resolve(window.__res(200, {
            access_token: 'tok2', refresh_token: 'ref2', expires_in: 3600,
            user: { id: 'u1', email: 'a@b.c' }
          }));
        }
        seen++;
        if (seen === 1) return Promise.resolve(window.__res(401, { message: 'JWT expired' }));
        return Promise.resolve(window.__res(200, cloudRow('2026-08-23T08:00:00.000Z', 11)));
      };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        eq(seen, 2, 'запрос к данным повторён ровно один раз');
        var refresh = window.__calls.filter(function (c) { return c.url.indexOf('grant_type=refresh_token') >= 0; });
        eq(refresh.length, 1, 'refresh был ровно один');
        eq(State.s.stats.bestStreak, 11, 'после обновления токена pull прошёл');
        ok(Sync.signedIn(), 'вход остался живым');
      });
    });

    defer('второй отказ гасит сессию', function () {
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z' });
      window.__fetch = function (url) {
        if (url.indexOf('/auth/v1/token') >= 0) {
          return Promise.resolve(window.__res(200, {
            access_token: 'tok2', refresh_token: 'ref2', expires_in: 3600,
            user: { id: 'u1', email: 'a@b.c' }
          }));
        }
        return Promise.resolve(window.__res(401, { message: 'JWT expired' }));
      };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        eq(Sync.signedIn(), false, 'сессия сброшена');
        eq(Sync.state().error, 'Облако не узнало вход — зайди заново', 'человеческий статус, а не тело ответа');
        eq(Sync.state().status, 'error', 'статус — ошибка');
        eq(window.__store['study-system-v2-session'], undefined, 'сессия убрана из хранилища');
        eq(Sync.authLost(), true, 'признак отвалившегося входа поднят');
        ok(App.cloudAlert().indexOf('Облако отключено — войти') > 0, 'на «Сегодня» появилась плашка');
      });
    });
  });

  describe('синк: протухший вход виден на «Сегодня», а не только в Настройках', function () {
    /** Текст плашки без разметки — пусто, когда плашки нет. */
    function banner() { return App.cloudAlert().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

    defer('refresh отбит — вход погашен и плашка висит', function () {
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z', expired: true });
      window.__fetch = function (url) {
        // так Supabase отвечает на отозванный или протухший refresh-токен
        if (url.indexOf('grant_type=refresh_token') >= 0) {
          return Promise.resolve(window.__res(400, { error: 'invalid_grant' }));
        }
        return Promise.resolve(window.__res(200, []));
      };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        eq(Sync.signedIn(), false, 'сессия погашена');
        eq(Sync.authLost(), true, 'это отказ авторизации, а не сбой связи');
        eq(Sync.state().status, 'error', 'статус — ошибка');
        ok(banner().indexOf('Облако отключено — войти') >= 0, 'плашка на «Сегодня» появилась');

        // перезапуск приложения протухший вход не чинит: плашка обязана вернуться
        Sync.init();
        eq(Sync.authLost(), true, 'метка пережила перезапуск');
        eq(Sync.state().status, 'error', 'и причина вернулась в статус');
        ok(banner().indexOf('Облако отключено — войти') >= 0, 'после перезапуска плашка на месте');
      });
    });

    defer('нет сети — очередь, но не плашка', function () {
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z',
        expired: true, onLine: false });
      window.__fetch = function () { return Promise.reject(new Error('Failed to fetch')); };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        ok(Sync.signedIn(), 'вход цел');
        eq(Sync.authLost(), false, 'отсутствие сети входом не считается');
        eq(Sync.state().status, 'queued', 'изменения ждут в очереди');
        eq(banner(), '', 'плашки нет');
      });
    });

    defer('5xx от облака — временная беда, вход не трогаем', function () {
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z', expired: true });
      window.__fetch = function () { return Promise.resolve(window.__res(503, { msg: 'gateway' })); };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        ok(Sync.signedIn(), 'вход цел');
        eq(Sync.authLost(), false, 'по 503 из облака не выкидываем');
        eq(Sync.state().status, 'error', 'но ошибка видна');
        eq(banner(), '', 'плашки нет — входить некуда, надо ждать');
      });
    });

    defer('без входа плашки не бывает', function () {
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z' });
      Sync.signOut();
      eq(Sync.authLost(), false, 'никогда не входивший ничего не терял');
      eq(banner(), '', 'плашки нет');
    });

    defer('вход снимает плашку', function () {
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z', expired: true });
      window.__fetch = function (url) {
        if (url.indexOf('grant_type=refresh_token') >= 0) {
          return Promise.resolve(window.__res(400, { error: 'invalid_grant' }));
        }
        return Promise.resolve(window.__res(200, []));
      };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        eq(Sync.authLost(), true, 'сперва вход потерян');
        window.__fetch = function (url, o) {
          if (url.indexOf('grant_type=password') >= 0) {
            return Promise.resolve(window.__res(200, {
              access_token: 'tok3', refresh_token: 'ref3', expires_in: 3600,
              user: { id: 'u1', email: 'a@b.c' }
            }));
          }
          if ((o && o.method) === 'POST') return Promise.resolve(window.__res(201, {}));
          return Promise.resolve(window.__res(200, []));
        };
        return Sync.signIn('a@b.c', 'pass');
      }).then(function () {
        eq(Sync.authLost(), false, 'после входа метка снята');
        eq(window.__store['study-system-v2-authlost'], undefined, 'и убрана из хранилища');
        eq(banner(), '', 'плашка ушла');
      });
    });
  });

  describe('синк C-05: наружу только человеческие тексты', function () {
    defer('тело ответа в сообщение не попадает', function () {
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T10:00:00.000Z' });
      window.__fetch = function () {
        return Promise.resolve(window.__res(500, { hint: 'null value in column "state"' }));
      };
      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        var e = Sync.state().error;
        eq(e, 'Облако не приняло состояние (ошибка 500)', 'текст человеческий');
        eq(String(e).indexOf('null value'), -1, 'сырого тела в тексте нет');
        eq(Sync.state().status, 'error', 'ошибка держится в статусе, а не улетает тостом');
      });
    });
  });

  describe('синк: пустое облако получает локальное', function () {
    defer('push после пустого pull', function () {
      stand({ pushedAt: '2026-08-22T09:00:00.000Z', localAt: '2026-08-22T09:00:00.000Z' });
      window.__fetch = function (url, o) {
        if ((o && o.method) === 'POST') return Promise.resolve(window.__res(201, {}));
        return Promise.resolve(window.__res(200, []));
      };

      Sync.init();
      return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
        var posts = window.__calls.filter(function (c) { return c.method === 'POST'; });
        eq(posts.length, 1, 'в пустое облако ушло локальное состояние');
      });
    });
  });

})();
