#!/usr/bin/env node
/* Simple Lighthouse + axe audit runner for local pages */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
process.env.SESSION_SECRET = 'audit_secret';
const app = require('../src/server');
const srv = app.listen(0, async () => {
  const port = srv.address().port;
  const base = `http://localhost:${port}`;
  const urls = [base+'/', base+'/deal/oceanfront-escape'];
  const results = { lighthouse: {}, axe: {} };
  async function runLighthouse(url, formFactor){
    return new Promise((resolve,reject)=>{
      const tmp = path.join(__dirname, '..', 'tmp');
      if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
      const outFile = path.join(tmp, `lh-${formFactor}-${Buffer.from(url).toString('base64').slice(0,8)}.json`);
      const args = [url, '--quiet', '--chrome-flags=--headless=new --no-sandbox', '--output=json', `--output-path=${outFile}`, `--preset=${formFactor==='desktop'?'desktop':'mobile'}`];
      const lh = spawn('npx', ['lighthouse', ...args], { stdio:'inherit' });
      lh.on('exit', code => {
        if (code!==0) return reject(new Error('lighthouse failed '+code));
        try { const json = JSON.parse(fs.readFileSync(outFile,'utf8')); resolve(json); } catch(e){ reject(e); }
      });
    });
  }
  async function runAxe(url){
    return new Promise((resolve,reject)=>{
      let buf='';
      const axe = spawn('npx',['axe', url, '--quiet', '--json'], { stdio:['ignore','pipe','inherit']});
      axe.stdout.on('data',d=>buf+=d);
      axe.on('exit', code=>{
        if (code>1) return reject(new Error('axe failed '+code));
        try { resolve(JSON.parse(buf)); } catch(e){ reject(e); }
      });
    });
  }
  try {
    for (const u of urls) {
      const mobile = await runLighthouse(u,'mobile');
      const desktop = await runLighthouse(u,'desktop');
      const axe = await runAxe(u);
      function pickScores(lh){
        const cat = lh.categories; return {
          performance: cat.performance.score,
          accessibility: cat.accessibility.score,
          bestPractices: cat['best-practices']? cat['best-practices'].score : (cat.best_practices? cat.best_practices.score : null),
          seo: cat.seo.score,
        };
      }
      results.lighthouse[u] = { mobile: pickScores(mobile), desktop: pickScores(desktop) };
      results.axe[u] = { violations: axe.violations.map(v=>({ id:v.id, impact:v.impact, help:v.help, nodes:v.nodes.length })) };
    }
    console.log(JSON.stringify(results,null,2));
  } catch (e) {
    console.error('Audit error', e);
    process.exitCode = 1;
  } finally {
    srv.close();
  }
});
