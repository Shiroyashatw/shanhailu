// 截圖＋自動檢查：文字溢出／截斷、同層文字重疊、超出 1280×720、編號壓字、編號互壓
// 2× 解析度；另存純 1280×720 stage 版 *-stage1280.png
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path');
const ROOT = '/workspace/shanhailu-batch1/UI-02';
const only = process.argv[2];
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const pg = await br.newPage();
  await pg.setViewport({ width: 2200, height: 2600, deviceScaleFactor: 2 });
  const files = [];
  const dir = path.join(ROOT, 'html');
  for (const g of fs.readdirSync(dir).filter(x => fs.statSync(path.join(dir, x)).isDirectory()).sort())
    for (const f of fs.readdirSync(path.join(dir, g)).filter(x => x.endsWith('.html')).sort()) {
      if (only && !f.startsWith(only)) continue;
      files.push(g + '/' + f);
    }
  const report = {};
  for (const f of files) {
    const htmlPath = path.join(ROOT, 'html', f);
    await pg.goto('file://' + htmlPath, { waitUntil: 'load' });
    await pg.evaluateHandle('document.fonts.ready');
    const res = await pg.evaluate(() => {
      const out = [];
      const st = document.getElementById('stage').getBoundingClientRect();
      const ink = el => {
        if (el.classList.contains('ml')) return el.getBoundingClientRect();
        const r = document.createRange(); r.selectNodeContents(el);
        const rr = r.getBoundingClientRect(); const er = el.getBoundingClientRect();
        return { left: Math.max(rr.left, er.left), right: Math.min(rr.right, er.right), top: er.top, bottom: er.bottom, width: rr.width };
      };
      const tx = [...document.querySelectorAll('#stage .tx')].filter(e => e.textContent.trim());
      for (const e of tx) {
        if (e.scrollWidth > e.clientWidth + 1) out.push(`溢出(寬) "${e.textContent.trim().slice(0, 30)}" ${e.scrollWidth}>${e.clientWidth}`);
        if (e.classList.contains('ml') && e.scrollHeight > e.clientHeight + 1) out.push(`溢出(高) "${e.textContent.trim().slice(0, 30)}" ${e.scrollHeight}>${e.clientHeight}`);
        const r = e.getBoundingClientRect();
        if (r.left < st.left || r.right > st.right + 0.5 || r.top < st.top || r.bottom > st.bottom + 0.5) out.push(`超出畫面 "${e.textContent.trim().slice(0, 20)}"`);
      }
      const I = tx.map(e => [e, ink(e), e.dataset.l]);
      for (let i = 0; i < I.length; i++)
        for (let j = i + 1; j < I.length; j++) {
          const [a, ra, la] = I[i], [b, rb, lb] = I[j];
          if (la !== lb) continue;
          const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (w > 1 && h > 2) out.push(`重疊 "${a.textContent.trim().slice(0, 16)}" × "${b.textContent.trim().slice(0, 16)}"`);
        }
      const maxL = Math.max(0, ...I.map(x => +x[2]));
      for (const bd of document.querySelectorAll('#stage .bd')) {
        const r = bd.getBoundingClientRect();
        for (const [e, ri, l] of I) {
          if (+l < maxL && maxL > 0 && document.querySelector('#stage .b.scrim') && +l === 0) continue;
          const w = Math.min(r.right, ri.right) - Math.max(r.left, ri.left), h = Math.min(r.bottom, ri.bottom) - Math.max(r.top, ri.top);
          if (w > 1 && h > 3) out.push(`編號${bd.textContent}壓字 "${e.textContent.trim().slice(0, 16)}"`);
        }
        if (r.left < st.left || r.right > st.right || r.top < st.top) out.push(`編號${bd.textContent}超出畫面`);
        if (r.bottom > st.bottom + 0.5) out.push(`編號${bd.textContent}超出畫面(底)`);
      }
      const B = [...document.querySelectorAll('#stage .bd')].map(b => [b.textContent, b.getBoundingClientRect()]);
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const a = B[i][1], b = B[j][1];
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0)
          out.push(`編號${B[i][0]}與${B[j][0]}重疊`);
      }
      const pageR = document.querySelector('.page').getBoundingClientRect();
      const lg = document.getElementById('legend').getBoundingClientRect();
      return {
        out,
        h: Math.ceil(Math.max(pageR.bottom, lg.bottom + 20)),
        w: Math.ceil(pageR.right),
        stage: { x: st.left, y: st.top, width: st.width, height: st.height }
      };
    });
    const key = f;
    report[key] = res.out;
    const base = path.basename(f).replace('.html', '');
    const png = path.join(ROOT, base + '.png');
    const stagePng = path.join(ROOT, base + '-stage1280.png');
    await pg.screenshot({ path: png, clip: { x: 0, y: 0, width: res.w, height: res.h } });
    await pg.screenshot({ path: stagePng, clip: { x: res.stage.x, y: res.stage.y, width: 1280, height: 720 } });
    console.log(key, res.out.length ? `✗ ${res.out.length}` : '✓', `${res.w}×${res.h}`, `stage ${res.stage.x},${res.stage.y}`);
    for (const o of res.out) console.log('   ', o);
  }
  fs.writeFileSync(ROOT + '/_tools/check-report.json', JSON.stringify(report, null, 1));
  await br.close();
})();
