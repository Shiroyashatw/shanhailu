// UI-FX 渲染＋自檢：#stage 與 #board 兩個容器各自檢查
// 溢出／截斷、同層文字重疊、超出容器、編號壓字、編號互壓；2× 輸出；另存 1280×720 stage 版
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const only = process.argv[2];
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const pg = await br.newPage();
  await pg.setViewport({ width: 2200, height: 2800, deviceScaleFactor: 2 });
  const dir = path.join(ROOT, 'html');
  const files = fs.readdirSync(dir).filter(x => x.endsWith('.html')).sort().filter(f => !only || f.startsWith(only));
  const report = {}; let total = 0;
  for (const f of files) {
    await pg.goto('file://' + path.join(dir, f), { waitUntil: 'load' });
    await pg.evaluateHandle('document.fonts.ready');
    const res = await pg.evaluate(() => {
      const out = [];
      const ink = el => {
        if (el.classList.contains('ml')) return el.getBoundingClientRect();
        const r = document.createRange(); r.selectNodeContents(el);
        const rr = r.getBoundingClientRect(); const er = el.getBoundingClientRect();
        return { left: Math.max(rr.left, er.left), right: Math.min(rr.right, er.right), top: er.top, bottom: er.bottom, width: rr.width };
      };
      for (const cid of ['stage', 'board']) {
        const C = document.getElementById(cid); if (!C) continue;
        const st = C.getBoundingClientRect();
        const tx = [...C.querySelectorAll('.tx')].filter(e => e.textContent.trim());
        for (const e of tx) {
          const nm = `[${cid}] "${e.textContent.trim().slice(0, 24)}"`;
          if (e.scrollWidth > e.clientWidth + 1) out.push(`溢出(寬) ${nm} ${e.scrollWidth}>${e.clientWidth}`);
          if (e.classList.contains('ml') && e.scrollHeight > e.clientHeight + 1) out.push(`溢出(高) ${nm}`);
          const r = e.getBoundingClientRect();
          if (r.left < st.left || r.right > st.right + 0.5 || r.top < st.top || r.bottom > st.bottom + 0.5) out.push(`超出畫面 ${nm}`);
        }
        const I = tx.map(e => [e, ink(e), e.dataset.l]);
        for (let i = 0; i < I.length; i++) for (let j = i + 1; j < I.length; j++) {
          const [a, ra, la] = I[i], [b, rb, lb] = I[j];
          if (la !== lb) continue;
          const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (w > 1 && h > 2) out.push(`重疊 [${cid}] "${a.textContent.trim().slice(0, 16)}" × "${b.textContent.trim().slice(0, 16)}"`);
        }
        const bds = [...C.querySelectorAll('.bd')];
        for (const bd of bds) {
          const r = bd.getBoundingClientRect();
          for (const [e, ri] of I) {
            const w = Math.min(r.right, ri.right) - Math.max(r.left, ri.left), h = Math.min(r.bottom, ri.bottom) - Math.max(r.top, ri.top);
            if (w > 1 && h > 3) out.push(`編號${bd.textContent}壓字 [${cid}] "${e.textContent.trim().slice(0, 16)}"`);
          }
          if (r.left < st.left || r.right > st.right || r.top < st.top || r.bottom > st.bottom + 0.5) out.push(`編號${bd.textContent}超出畫面 [${cid}]`);
        }
        for (let i = 0; i < bds.length; i++) for (let j = i + 1; j < bds.length; j++) {
          const a = bds[i].getBoundingClientRect(), b = bds[j].getBoundingClientRect();
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0)
            out.push(`編號${bds[i].textContent}與${bds[j].textContent}重疊`);
        }
      }
      // legend 編號是否齊全
      const ns = [...document.querySelectorAll('.bd')].map(b => +b.textContent).sort((a, b) => a - b);
      const ls = [...document.querySelectorAll('.legend td.n b')].map(b => +b.textContent).sort((a, b) => a - b);
      if (JSON.stringify(ns) !== JSON.stringify(ls)) out.push('legend 編號與圖上編號不一致');
      const pageR = document.querySelector('.page').getBoundingClientRect();
      const lg = document.getElementById('legend').getBoundingClientRect();
      const sg = document.getElementById('stage').getBoundingClientRect();
      const bdr = document.getElementById('board');
      const bb = bdr ? bdr.getBoundingClientRect().bottom : sg.bottom;
      return { out, h: Math.ceil(Math.max(pageR.bottom, lg.bottom + 20, bb + 20)), w: Math.ceil(pageR.right), stage: { x: sg.left, y: sg.top } };
    });
    report[f] = res.out; total += res.out.length;
    const base = f.replace('.html', '');
    await pg.screenshot({ path: path.join(ROOT, base + '.png'), clip: { x: 0, y: 0, width: res.w, height: res.h } });
    await pg.screenshot({ path: path.join(ROOT, base + '-stage1280.png'), clip: { x: res.stage.x, y: res.stage.y, width: 1280, height: 720 } });
    console.log(f, res.out.length ? `✗ ${res.out.length}` : '✓ 0 issues', `${res.w}×${res.h}`);
    for (const o of res.out) console.log('   ', o);
  }
  fs.writeFileSync(path.join(ROOT, '_tools/check-report.json'), JSON.stringify(report, null, 1));
  console.log('TOTAL issues:', total);
  await br.close();
})();
