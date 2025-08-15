#!/usr/bin/env node
/* Minimal smoke test runner (no external deps) */
const { request, extractCsrf } = require('./helpers');
process.env.SESSION_SECRET = 'test_secret';
process.env.ADMIN_PASSWORD = 'adminpass';
process.env.STRIPE_ENABLED = 'false';

const app = require('../src/server');
const srv = app.listen(0, async () => {
  const port = srv.address().port;
  const results = [];
  function log(name, ok, info='') { results.push({ name, ok, info }); }
  try {
    // 1. GET /
    const home = await request(port, 'GET', '/');
    log('GET / status 200', home.status === 200, 'status=' + home.status);
    log('GET / has site title', /Discover Puerto Rico Deals/.test(home.body));

    // 2. Seeded deal slug
    const deal = await request(port, 'GET', '/deal/oceanfront-escape');
    log('GET /deal/oceanfront-escape 200', deal.status === 200);

    // 3. Signup positive
    const signupPage = await request(port, 'GET', '/signup');
    const csrf1 = extractCsrf(signupPage.body);
    const baseCookie = (signupPage.headers['set-cookie']||[])[0]?.split(';')[0] || '';
    const email = 'u'+Date.now()+'@t.test';
    const signupResp = await request(port,'POST','/signup',{ headers:{ Cookie: baseCookie }, bodyObj:{ email, password:'Pass1234', _csrf: csrf1 }});
    log('POST /signup redirect', signupResp.status === 302, 'status='+signupResp.status);
    function buildJar(existing, setCookies){
      const map = new Map();
      const parts = existing? existing.split(/;\s*/).filter(p=>p.includes('=')) : [];
      parts.forEach(p=>{ const [k,v] = p.split('='); map.set(k,v); });
      (setCookies||[]).forEach(sc=>{ const main=sc.split(';')[0]; const [k,v]=main.split('='); map.set(k,v); });
      return Array.from(map.entries()).map(([k,v])=>`${k}=${v}`).join('; ');
    }
    const jar = buildJar(baseCookie, signupResp.headers['set-cookie']);

    // 4. Account should load (auth persisted) - NOTE: currently failing in earlier manual tests
    const account = await request(port,'GET','/account',{ headers:{ Cookie: jar }});
    log('GET /account after signup 200', account.status === 200, 'status='+account.status);

    // 5. Login negative (wrong password)
    const loginPage = await request(port,'GET','/login');
    const csrf2 = extractCsrf(loginPage.body);
    const loginCookie = (loginPage.headers['set-cookie']||[])[0]?.split(';')[0] || '';
    const badLogin = await request(port,'POST','/login',{ headers:{ Cookie: loginCookie }, bodyObj:{ email, password:'Wrong', _csrf: csrf2 }});
    log('POST /login invalid creds 401', badLogin.status === 401, 'status='+badLogin.status);

    // 6. Admin guard
    const adminGate = await request(port,'GET','/admin');
    log('/admin guarded redirect', adminGate.status === 302, 'status='+adminGate.status);

    // 7. Admin login + create + toggle
    const adminLoginPage = await request(port,'GET','/admin/login');
    const csrfAdmin = extractCsrf(adminLoginPage.body); const adminCookie = (adminLoginPage.headers['set-cookie']||[])[0]?.split(';')[0]||'';
    const adminLoginResp = await request(port,'POST','/admin/login',{ headers:{ Cookie: adminCookie }, bodyObj:{ password:'adminpass', _csrf: csrfAdmin }});
    log('Admin login redirect', adminLoginResp.status === 302);
    const jarAdmin = [adminCookie,...(adminLoginResp.headers['set-cookie']||[]).map(c=>c.split(';')[0])].join('; ');
    const newDealPage = await request(port,'GET','/admin/deals/new',{ headers:{ Cookie: jarAdmin }});
    const csrfDeal = extractCsrf(newDealPage.body);
    const createDeal = await request(port,'POST','/admin/deals',{ headers:{ Cookie: jarAdmin }, bodyObj:{ title:'Smoke Deal', category:'hotel', price_cents:1111, list_price_cents:1500, active:1, _csrf: csrfDeal }});
    log('Admin create deal redirect', createDeal.status === 302);
    const dash = await request(port,'GET','/admin',{ headers:{ Cookie: jarAdmin }});
    log('Dashboard lists new deal', /Smoke Deal/.test(dash.body));
    const csrfDash = extractCsrf(dash.body);
    const idMatch = /\/admin\/deals\/(\d+)\/edit/.exec(dash.body); const newId = idMatch && idMatch[1];
    if (newId) {
      const toggle = await request(port,'POST',`/admin/deals/${newId}/toggle`,{ headers:{ Cookie: jarAdmin }, bodyObj:{ _csrf: csrfDash }});
      log('Toggle archive redirect', toggle.status === 302);
    } else { log('Extract new deal id', false, 'no id'); }

    // 8. Stripe scenario (skipped unless enabled)
    if (process.env.STRIPE_ENABLED === 'true') {
      log('Stripe test placeholder', true, 'Enable and add webhook test manually');
    }
  } catch (e) {
    log('Unhandled exception', false, e.message);
  } finally {
    const pass = results.filter(r=>r.ok).length;
    const fail = results.length - pass;
    console.log('\nTest Results:');
    results.forEach(r=> console.log(`- ${r.ok? 'PASS':'FAIL'}: ${r.name}${r.info? ' ('+r.info+')':''}`));
    console.log(`\nSummary: ${pass} passed, ${fail} failed`);
    srv.close(()=> process.exit(fail?1:0));
  }
});
