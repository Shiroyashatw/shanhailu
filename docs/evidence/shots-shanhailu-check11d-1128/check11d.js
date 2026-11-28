/*
 * shanhailu-check11d-1128：PR #11 fix5 獨立驗收（驗收方自寫，不引用 tests/）。
 * 用法：node docs/evidence/shots-shanhailu-check11d-1128/check11d.js
 * 期望值依 SPEC-TIME 7.1b／AC 20–21 自行推導：
 *   - 四檔名 低／中／高／極高，同一檔同一顏色（標頭 pill 與 travelPreview vpill 共用），四檔顏色互異；
 *   - travelPreview 的檔位必須等於 riskTier(p.risk)，且 riskTier 依 RISK_CUTS 半開區間＋三位 half-up（本腳本另寫一份參考實作比對）；
 *   - hot 只在「高」「極高」；
 *   - 腐骨沼（荒野）、沉淵祭窟（地城）標頭「險 高」且 hot；
 *   - 程式碼中不再有另寫的險級數值門檻、舊三檔色或另寫的 hot 判斷。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = __dirname;
const TIERS = ['低', '中', '高', '極高'];
let pass = 0, fail = 0;
function check(name, ok, info) {
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (info !== undefined ? '  — ' + JSON.stringify(info) : ''));
}
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { resp.writeHead(404); return resp.end(); }
      const ext = path.extname(f);
      resp.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}
// 參考實作（依規格文字）：先封頂 0.85，half-up 取三位，再依 0.150／0.350／0.600 半開區間
function refTier(risk) {
  const k = Math.round(Math.min(0.85, risk) * 1000 + 1e-9);
  return k < 150 ? '低' : k < 350 ? '中' : k < 600 ? '高' : '極高';
}

(async () => {
  // ---------- A. 靜態掃描 ----------
  const ui = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  const game = fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8');
  const lines = (src) => src.split('\n').map((l, i) => [i + 1, l]);
  const tierCmp = lines(ui).filter(([, l]) => /===\s*'(高|極高|中|低)'/.test(l));
  check('[靜態] ui.js 中「=== 高／極高」這類險級字串比較只出現在 riskCls() 一處', tierCmp.length === 1 && /function riskCls/.test(tierCmp[0][1]), tierCmp.map(([n, l]) => 'ui.js:' + n + ' ' + l.trim().slice(0, 90)));
  const numCut = lines(ui).filter(([, l]) => /risk[A-Za-z]*\s*[<>]=?\s*0?\.\d|0\.(15|35|6|60)\b/.test(l));
  check('[靜態] ui.js 沒有另寫的險級數值門檻（risk < 0.x、0.15／0.35／0.60）', numCut.length === 0, numCut.map(([n, l]) => 'ui.js:' + n + ' ' + l.trim().slice(0, 90)));
  // 找「拿 risk 跟 0.15／0.35／0.6 比大小」或「回傳四檔名」的地方；露宿遇襲機率 0.25／0.12×0.6 這類機率乘項不是分檔門檻
  const gameCut = lines(game).filter(([, l]) => /risk[A-Za-z0-9_]*\s*[<>]=?\s*0?\.(15|35|6)\b|0?\.(15|35|6)0?\s*[<>]=?\s*risk/.test(l) || (/'極高'/.test(l) && !/RISK_TIERS/.test(l)));
  check('[靜態] game.js 分檔只走 riskTier()／D.TIME.RISK_CUTS，沒有另寫門檻', gameCut.length === 0 && /function riskTier\(risk\)[\s\S]{0,200}D\.TIME\.RISK_CUTS/.test(game), gameCut.map(([n, l]) => 'game.js:' + n + ' ' + l.trim().slice(0, 100)));
  const riskName = lines(game).filter(([, l]) => /riskName\s*=/.test(l));
  check('[靜態] travelPreview 的 riskName 直接取自 riskTier(risk)', riskName.length === 1 && /riskName\s*=\s*riskTier\(risk\)/.test(riskName[0][1]), riskName.map(([n, l]) => 'game.js:' + n + ' ' + l.trim()));
  const riskPills = lines(ui).filter(([, l]) => /險/.test(l) && /class="(v?pill)/.test(l));
  check('[靜態] ui.js 所有「險」pill／vpill 都用 riskCls()', riskPills.length > 0 && riskPills.every(([, l]) => (l.match(/險/g) || []).length === (l.match(/riskCls\(/g) || []).length || /riskCls\(/.test(l)), riskPills.map(([n]) => 'ui.js:' + n));
  const oldCls = lines(css).filter(([, l]) => /\.(risk|rk)-?(lo|mid|hi|low|high|med)\b|\.r(isk)?[0-9]\b(?!.*rk)/.test(l));
  check('[靜態] css 沒有舊三檔險級色類別殘留', oldCls.length === 0, oldCls.map(([n, l]) => 'style.css:' + n + ' ' + l.trim()));
  const rkRules = ['rk0', 'rk1', 'rk2', 'rk3'].map((k) => (css.match(new RegExp('\\.v?pill\\.' + k + '\\b', 'g')) || []).length);
  check('[靜態] css 有 rk0–rk3 四條，各同時套 .pill 與 .vpill', rkRules.every((n) => n >= 2), rkRules);
  check('[靜態] 極高暫定色 --risk-x: #ff3b5c', /--risk-x:\s*#ff3b5c/i.test(css));
  const chg = /中高/.test(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + ui + game);
  check('[靜態] js 內無「中高」', !chg);

  // ---------- B. 實機 ----------
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(base + 'index.html?seed=1128&fresh=1&origin=drifter&fx=0');
  await page.waitForSelector('[data-testid=town]');

  // B1. 標頭：所有荒野、地城
  const heads = await page.evaluate(() => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state, out = [];
    const list = Object.keys(D.WILDS).map((k) => [k, 'wild', D.WILDS[k].risk]).concat(Object.keys(D.DUNGEONS).map((k) => [k, 'dungeon', D.DUNGEONS[k].risk]));
    for (const [id, kind, tier] of list) {
      S.combat = null; S.event = null; S.dead = null; S.overlay = null; S.known[id] = true; S.loc = id; G.enterHere();
      const sc = document.querySelector('[data-testid=' + kind + ']');
      const e = document.querySelector('[data-testid=head-risk]');
      const cs = e && getComputedStyle(e);
      out.push({ id, name: D.NODES[id].name, kind, tier, scene: !!sc, text: e && e.textContent, color: cs && cs.color, border: cs && cs.borderTopColor, weight: cs && cs.fontWeight, hot: !!e && e.classList.contains('hot'), cls: e && e.className });
    }
    return out;
  });
  console.log('標頭：' + heads.map((h) => h.name + '=' + h.tier + (h.hot ? '・hot' : '') + ' ' + h.color).join('；'));
  check('[標頭] 9 處荒野＋地城都進得去並有 head-risk', heads.length === 9 && heads.every((h) => h.scene && h.text === '險 ' + h.tier), heads.filter((h) => !(h.scene && h.text === '險 ' + h.tier)).map((h) => h.id));
  check('[標頭] 標頭檔名都在四檔內', heads.every((h) => TIERS.includes(h.tier)));

  // B2. travelPreview：所有起點 × 所有目的地 × 兩天 × 24 小時 × 一般／重負 × 無獸潮／獸潮
  const routes = await page.evaluate(() => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state, out = [];
    const ids = Object.keys(D.NODES);
    ids.forEach((id) => { S.known[id] = true; });
    const t0 = Math.floor(S.t / 1440) * 1440;
    const tide0 = S.world.tide, inv0 = JSON.stringify(S.pack);
    for (const tide of [false, true]) for (const heavy of [false, true]) {
      S.world.tide = tide ? { town: 'huiyao', start: 0, end: 99999 } : null;
      S.pack = JSON.parse(inv0);
      if (heavy) { let guard = 0; while (G.loadBand().id === 'light' || G.loadBand().id === 'normal') { S.pack.push({ k: 'ore_cu', n: 1 }); if (++guard > 400) break; } }
      for (const from of ids) for (let day = 0; day < 2; day++) for (let hh = 0; hh < 24; hh += 1) {
        S.combat = null; S.event = null; S.dead = null; S.overlay = null; S.loc = from; S.t = t0 + day * 1440 + hh * 60;
        G.toMap();
        for (const to of ids) {
          if (to === from) continue;
          G.selectDest(to);
          const p = G.travelPreview(to);
          const e = document.querySelector('[data-testid=route-risk]');
          const dn = document.querySelector('.departbar .dname b');
          const cs = e && getComputedStyle(e);
          out.push({ from, to, day, hh, tide, heavy, band: G.loadBand().id, risk: p.risk, riskName: p.riskName, riskTierFn: G.riskTier(p.risk), text: e && e.textContent, dname: dn && dn.textContent, destName: D.NODES[to].name, color: cs && cs.color, border: cs && cs.borderTopColor, hot: !!e && e.classList.contains('hot'), cls: e && e.className });
        }
      }
    }
    S.world.tide = tide0; S.pack = JSON.parse(inv0);
    return out;
  });
  const bands = [...new Set(routes.map((r) => r.band))];
  console.log('travelPreview 取樣 ' + routes.length + ' 筆；負重檔 ' + bands.join('／') + '；各檔筆數 ' + TIERS.map((t) => t + ' ' + routes.filter((r) => r.riskName === t).length).join('、'));
  check('[路程] 每筆畫面都是該目的地的出發條（dname 與目的地相符）且有 route-risk', routes.every((r) => r.dname === r.destName && r.text === '險' + r.riskName), routes.filter((r) => !(r.dname === r.destName && r.text === '險' + r.riskName)).slice(0, 3));
  const tierBad = routes.filter((r) => r.riskName !== r.riskTierFn || r.riskName !== refTier(r.risk));
  check('[路程] riskName ＝ G.riskTier(p.risk) ＝ 參考實作（三位 half-up、0.15／0.35／0.60 半開）', tierBad.length === 0, tierBad.slice(0, 3));
  check('[路程] 四檔各至少出現一次', TIERS.every((t) => routes.some((r) => r.riskName === t)));
  check('[路程] risk ≤ 0.85', routes.every((r) => r.risk <= 0.85 + 1e-12), Math.max(...routes.map((r) => r.risk)));

  // B3. 顏色一致性
  const colorOf = {};
  TIERS.forEach((t) => { colorOf[t] = [...new Set(routes.filter((r) => r.riskName === t).map((r) => r.color).concat(heads.filter((h) => h.tier === t).map((h) => h.color)))]; });
  console.log('各檔顏色：' + JSON.stringify(colorOf));
  TIERS.forEach((t) => check('[色] 「' + t + '」在所有標頭與 travelPreview 只有一種顏色', colorOf[t].length === 1, colorOf[t]));
  const four = TIERS.map((t) => colorOf[t][0]);
  check('[色] 四檔顏色互異', new Set(four).size === 4, four);
  check('[色] 極高 ＝ #ff3b5c（rgb(255, 59, 92)）', four[3] === 'rgb(255, 59, 92)', four[3]);
  const plainPill = await page.evaluate(() => { const e = document.createElement('span'); e.className = 'pill'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); const v = document.createElement('div'); v.className = 'vpill'; document.body.appendChild(v); const c2 = getComputedStyle(v).color; v.remove(); return [c, c2]; });
  check('[色] 四檔都不是未上色的預設 pill／vpill 字色', four.every((c) => !plainPill.includes(c)), { plain: plainPill, four });

  // B4. hot
  const hotBadR = routes.filter((r) => r.hot !== (r.riskName === '高' || r.riskName === '極高'));
  const hotBadH = heads.filter((h) => h.hot !== (h.tier === '高' || h.tier === '極高'));
  check('[hot] travelPreview：hot 只在「高」「極高」（' + routes.length + ' 筆）', hotBadR.length === 0, hotBadR.slice(0, 3));
  check('[hot] 標頭：hot 只在「高」「極高」（9 處）', hotBadH.length === 0, hotBadH.map((h) => h.id));
  check('[hot] travelPreview 的 hot 與 riskTier(p.risk) 結果一致', routes.every((r) => r.hot === ['高', '極高'].includes(r.riskTierFn)));
  check('[hot] hot 的框色＝該檔字色；非 hot 的框不是該檔字色', routes.concat(heads).every((x) => (x.hot ? x.border === x.color : x.border !== x.color)), routes.concat(heads).filter((x) => !(x.hot ? x.border === x.color : x.border !== x.color)).slice(0, 3));
  check('[hot] 低／中沒有 hot class', routes.concat(heads).filter((x) => ['低', '中'].includes(x.riskName || x.tier)).every((x) => !/\bhot\b/.test(x.cls)));

  // B5. 腐骨沼、沉淵祭窟
  const fz = heads.find((h) => h.id === 'fuzhao'), jk = heads.find((h) => h.id === 'jiku');
  check('[指定] 腐骨沼（荒野）標頭「險 高」、高色、hot', fz && fz.name === '腐骨沼' && fz.kind === 'wild' && fz.text === '險 高' && fz.color === four[2] && fz.hot, fz);
  check('[指定] 沉淵祭窟（地城）標頭「險 高」、高色、hot', jk && jk.name === '沉淵祭窟' && jk.kind === 'dungeon' && jk.text === '險 高' && jk.color === four[2] && jk.hot, jk);

  // ---------- C. 截圖 1280×720 ----------
  const shot = async (f) => { await page.screenshot({ path: path.join(OUT, f), clip: { x: 0, y: 0, width: 1280, height: 720 } }); console.log('SHOT  docs/evidence/shots-shanhailu-check11d-1128/' + f); };
  const goHead = async (id, kind) => { await page.evaluate((id) => { const G = window.SHL, S = G.state; S.combat = null; S.event = null; S.dead = null; S.overlay = null; S.loc = id; S.t = Math.floor(S.t / 1440) * 1440 + 12 * 60; G.enterHere(); }, id); await page.waitForSelector('[data-testid=' + kind + ']'); };
  await goHead('chakou', 'wild'); await shot('1-wild-head-low-chakou.png');
  await goHead('kugu', 'wild'); await shot('2-wild-head-mid-kugu.png');
  await goHead('jiku', 'dungeon'); await shot('3-dungeon-head-high-jiku.png');
  await goHead('liekou', 'dungeon'); await shot('4-dungeon-head-extreme-liekou.png');
  // 對照：找一條路線，其 travelPreview 檔位＝目的地標頭檔位（優先「高」）
  const pairPick = ['高', '極高', '中', '低'].map((t) => routes.find((r) => !r.tide && !r.heavy && r.riskName === t && heads.some((h) => h.id === r.to && h.tier === t))).find(Boolean);
  if (pairPick) {
    await page.evaluate((r) => { const G = window.SHL, S = G.state; S.combat = null; S.event = null; S.dead = null; S.overlay = null; S.loc = r.from; S.t = Math.floor(S.t / 1440) * 1440 + r.hh * 60; G.toMap(); G.selectDest(r.to); }, pairPick);
    const a = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid=route-risk]')).color);
    await shot('5a-travelpreview-' + pairPick.from + '-to-' + pairPick.to + '.png');
    const kind = heads.find((h) => h.id === pairPick.to).kind;
    await goHead(pairPick.to, kind);
    const b = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid=head-risk]')).color);
    await shot('5b-head-' + pairPick.to + '.png');
    check('[對照] travelPreview（' + pairPick.from + '→' + pairPick.to + ' ' + pairPick.hh + ':00，' + pairPick.riskName + '）與目的地標頭同色', a === b, { preview: a, head: b });
  } else check('[對照] 找得到 travelPreview 與目的地標頭同檔的路線', false);

  check('console 0 error', errs.length === 0, errs.slice(0, 3));
  await browser.close(); srv.close();
  console.log('\n結果：' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
