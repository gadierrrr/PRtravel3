#!/usr/bin/env node
/* uiRefresh flag test: ensures legacy markup when disabled */
const { request } = require('./helpers');

(async () => {
  process.env.UI_REFRESH = '0'; // force off
  process.env.SESSION_SECRET = 'test_secret';
  const app = require('../src/server');
  const srv = app.listen(0, async () => {
    const port = srv.address().port;
    try {
      const home = await request(port,'GET','/');
      const legacyHero = /<section class="hero"/.test(home.body);
      const refreshHero = /hero-v2/.test(home.body);
      if (!legacyHero || refreshHero) {
        console.error('FAIL uiRefresh off should show legacy hero, legacyHero=', legacyHero, 'refreshHero=', refreshHero);
        process.exitCode = 1;
      } else {
        console.log('PASS uiRefresh off renders legacy hero only');
      }
    } catch (e) {
      console.error('FAIL exception', e);
      process.exitCode = 1;
    } finally {
      srv.close(()=> process.exit());
    }
  });
})();
