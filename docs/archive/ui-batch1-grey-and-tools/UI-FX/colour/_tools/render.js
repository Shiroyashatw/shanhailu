// UI-FX 色彩稿 渲染＋文字自檢（17:27 新方法 a）
// 對每個文字節點（.tx、legend 的 th/td/p/h1/.sub/.note p）檢查：
//  overflow 溢出｜clipped 被 overflow 祖先或畫布裁切｜overlap 文字兩兩交集（含徽章壓字、徽章互壓）
//  lines 單行元件多於 1 行｜widow 末行只剩 1 字｜split 數值或詞被拆行｜small 字級 <16px（徽章數字另列）
// 輸出每張圖各項計數到 check-report.json；2× 輸出，另存 1280×720 stage
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const only = process.argv[2];
const verbose = process.argv.includes('-v');
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const pg = await br.newPage();
  await pg.setViewport({ width: 2400, height: 5000, deviceScaleFactor: 2 });
  const dir = path.join(ROOT, 'html');
  const files = fs.readdirSync(dir).filter(x => x.endsWith('.html')).sort().filter(f => !only || f.startsWith(only));
  const report = {}; const counts = {}; let total = 0;
  for (const f of files) {
    await pg.goto('file://' + path.join(dir, f), { waitUntil: 'load' });
    await pg.evaluateHandle('document.fonts.ready');
    await pg.waitForSelector('#shl-icons', { timeout: 8000 });
    const res = await pg.evaluate(() => {
      const out = { overflow: [], clipped: [], overlap: [], badge: [], lines: [], widow: [], split: [], small: [], legend: [], badgeSmall: 0 };
      const PROTECT = ['腳程', '飽食', '疲累', '危險', '路程', '清心葉', '灰髯狼', '鎮衙', '紅霧', '破曉聲望', '委託', '平常', '輕快', '沉重', '蹣跚', '負重', '行囊', '熟練度', '採藥', '挖礦', '露宿', '趕路', '探查', '清心叢', '止血草', '金創藥水', '天星分號', '灰窯鎮', '青霧藥林', '極高', '時段'];
      const TOKEN = /[×+−\-]?\d+(?:[.:／/–→]\d+)*(?:[%％兩小時天格ms]|ms)*/g;
      const lab = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26);
      const lineRects = el => {
        // 回傳每個字的矩形（以 em 框，高度取 font-size）
        const chars = [];
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          const fs = parseFloat(getComputedStyle(n.parentElement).fontSize);
          const t = n.textContent;
          for (let i = 0; i < t.length; i++) {
            if (/\s/.test(t[i])) { chars.push({ ch: ' ', sp: true, fs, idx: chars.length }); continue; }
            const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
            const rs = r.getClientRects(); if (!rs.length) continue;
            const q = rs[0]; const cy = (q.top + q.bottom) / 2;
            chars.push({ ch: t[i], l: q.left, r: q.right, t: cy - fs / 2, b: cy + fs / 2, cy, fs, idx: chars.length });
          }
        }
        return chars;
      };
      const clusterLines = chars => {
        const lines = [];
        for (const c of chars) {
          let L = lines.find(l => Math.abs(l.cy - c.cy) < c.fs * 0.5);
          if (!L) { L = { cy: c.cy, cs: [] }; lines.push(L); }
          L.cs.push(c);
        }
        lines.sort((a, b) => a.cy - b.cy);
        return lines;
      };
      const clipAncestors = el => {
        const arr = [];
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') arr.push(p);
        }
        return arr;
      };
      const textEls = (root, sel) => [...root.querySelectorAll(sel)].filter(e => e.textContent.trim());
      const areas = [];
      for (const cid of ['stage', 'board']) { const C = document.getElementById(cid); if (C) areas.push([cid, C, '.tx']); }
      const L0 = document.getElementById('legend');
      areas.push(['legend', L0, 'th,td,.sub,.note p,h1']);
      for (const [cid, C, sel] of areas) {
        const box = C.getBoundingClientRect();
        const els = textEls(C, sel).filter(e => !(e.querySelector && e.tagName === 'TD' && e.classList.contains('n')));
        const info = [];
        for (const e of els) {
          const nm = `[${cid}] "${lab(e)}"`;
          const cs = getComputedStyle(e);
          const fsz = parseFloat(cs.fontSize);
          const all = lineRects(e);
          const chars = all.filter(c => !c.sp);
          if (!chars.length) continue;
          const lines = clusterLines(chars);
          const multi = cid === 'legend' || e.classList.contains('ml');
          // overflow
          if (cid !== 'legend' && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1))
            out.overflow.push(`${nm} ${e.scrollWidth}x${e.scrollHeight}>${e.clientWidth}x${e.clientHeight}`);
          // clipped
          const ink = { l: Math.min(...chars.map(c => c.l)), r: Math.max(...chars.map(c => c.r)), t: Math.min(...chars.map(c => c.t)), b: Math.max(...chars.map(c => c.b)) };
          const er = e.getBoundingClientRect();
          if (cid !== 'legend') {
            if (ink.l < er.left - 0.5 || ink.r > er.right + 0.5) out.clipped.push(`${nm} 超出自身框`);
            for (const a of clipAncestors(e)) {
              const ar = a.getBoundingClientRect();
              if (ink.l < ar.left - 0.5 || ink.r > ar.right + 0.5 || ink.t < ar.top - 0.5 || ink.b > ar.bottom + 0.5) { out.clipped.push(`${nm} 被 ${a.id || a.className.split(' ')[0] || a.tagName} 裁切`); break; }
            }
            if (ink.l < box.left - 0.5 || ink.r > box.right + 0.5 || ink.t < box.top - 0.5 || ink.b > box.bottom + 0.5) out.clipped.push(`${nm} 超出畫布`);
          }
          // lines
          if (!multi && lines.length > 1) out.lines.push(`${nm} ${lines.length} 行`);
          // widow
          if (multi && lines.length > 1) {
            const last = lines[lines.length - 1].cs;
            if (last.length <= 1) out.widow.push(`${nm} 末行僅「${last.map(c => c.ch).join('')}」`);
          }
          // split
          const full = all.map(c => c.ch).join('');
          const lineOf = c => lines.findIndex(L => L.cs.includes(c));
          const check = (s, e0, why) => {
            const seg = all.slice(s, e0).filter(c => !c.sp);
            if (seg.length > 1 && new Set(seg.map(lineOf)).size > 1) out.split.push(`${nm} 「${seg.map(c => c.ch).join('')}」${why}拆行`);
          };
          if (lines.length > 1) {
            let m; TOKEN.lastIndex = 0;
            while ((m = TOKEN.exec(full))) if (m[0].length > 1) check(m.index, m.index + m[0].length, '數值');
            for (const w of PROTECT) { let i = -1; while ((i = full.indexOf(w, i + 1)) >= 0) check(i, i + w.length, '詞'); }
          }
          // small font
          if (fsz < 15.99) out.small.push(`${nm} ${fsz}px`);
          info.push({ e, nm, chars, lines, ink });
        }
        if (cid !== 'legend') {
          // overlap：文字兩兩（以每行 em 框）
          for (let i = 0; i < info.length; i++) for (let j = i + 1; j < info.length; j++) {
            const A = info[i], B = info[j];
            if (A.e.contains(B.e) || B.e.contains(A.e)) continue;
            let hit = false;
            for (const la of A.lines) {
              const a = { l: Math.min(...la.cs.map(c => c.l)), r: Math.max(...la.cs.map(c => c.r)), t: la.cs[0].t, b: la.cs[0].b };
              for (const lb of B.lines) {
                const b = { l: Math.min(...lb.cs.map(c => c.l)), r: Math.max(...lb.cs.map(c => c.r)), t: lb.cs[0].t, b: lb.cs[0].b };
                if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5) hit = true;
              }
            }
            if (hit) out.overlap.push(`${A.nm} × ${B.nm}`);
          }
          // 徽章
          const bds = [...C.querySelectorAll('.bd')];
          for (const bd of bds) {
            const r = bd.getBoundingClientRect();
            for (const A of info) for (const la of A.lines) {
              const a = { l: Math.min(...la.cs.map(c => c.l)), r: Math.max(...la.cs.map(c => c.r)), t: la.cs[0].t, b: la.cs[0].b };
              if (Math.min(r.right, a.r) - Math.max(r.left, a.l) > 0.5 && Math.min(r.bottom, a.b) - Math.max(r.top, a.t) > 0.5) { out.badge.push(`編號${bd.textContent}壓 ${A.nm}`); break; }
            }
            if (r.left < box.left || r.right > box.right || r.top < box.top || r.bottom > box.bottom + 0.5) out.badge.push(`編號${bd.textContent}超出畫布 [${cid}]`);
          }
          for (let i = 0; i < bds.length; i++) for (let j = i + 1; j < bds.length; j++) {
            const a = bds[i].getBoundingClientRect(), b = bds[j].getBoundingClientRect();
            if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0) out.badge.push(`編號${bds[i].textContent}與${bds[j].textContent}重疊`);
          }
        }
      }
      out.badgeSmall = document.querySelectorAll('.bd').length;
      const ns = [...document.querySelectorAll('.bd')].map(b => +b.textContent).sort((a, b) => a - b);
      const ls = [...document.querySelectorAll('.legend td.n b')].map(b => +b.textContent).sort((a, b) => a - b);
      if (JSON.stringify(ns) !== JSON.stringify(ls)) out.legend.push('legend 編號與圖上編號不一致');
      const pageR = document.querySelector('.page').getBoundingClientRect();
      const lg = document.getElementById('legend').getBoundingClientRect();
      const sg = document.getElementById('stage').getBoundingClientRect();
      const bdr = document.getElementById('board');
      const bb = bdr ? bdr.getBoundingClientRect().bottom : sg.bottom;
      return { out, h: Math.ceil(Math.max(pageR.bottom, lg.bottom + 20, bb + 20)), w: Math.ceil(pageR.right), stage: { x: sg.left, y: sg.top } };
    });
    const o = res.out;
    const cnt = { overflow: o.overflow.length, clipped: o.clipped.length, overlap: o.overlap.length, badge: o.badge.length, lines: o.lines.length, widow: o.widow.length, split: o.split.length, small: o.small.length, legend: o.legend.length };
    const sum = Object.values(cnt).reduce((a, b) => a + b, 0);
    counts[f] = cnt; report[f] = o; total += sum;
    const base = f.replace('.html', '');
    await pg.screenshot({ path: path.join(ROOT, base + '.png'), clip: { x: 0, y: 0, width: res.w, height: res.h } });
    await pg.screenshot({ path: path.join(ROOT, base + '-stage1280.png'), clip: { x: res.stage.x, y: res.stage.y, width: 1280, height: 720 } });
    console.log(f, sum ? `✗ ${sum}` : '✓ 0', JSON.stringify(cnt), `徽章 ${o.badgeSmall}`, `${res.w}×${res.h}`);
    if (verbose || sum) for (const k of Object.keys(o)) if (Array.isArray(o[k])) for (const m of o[k].slice(0, verbose ? 999 : 12)) console.log('   ', k, m);
  }
  fs.writeFileSync(path.join(ROOT, '_tools/check-report.json'), JSON.stringify({ counts, report }, null, 1));
  console.log('TOTAL issues:', total);
  await br.close();
})();
