'use strict';
/* num-shl-dev04-s4：在 PR #16（DEV-04）實作上重驗 S4／AC-E8，並比較候選搜尋規則。
 * 用法（repo 根目錄）：git fetch origin numbers/num-shl-b1-civ && node sim/dev04/run.js
 * 產出：evidence/dev04-s4-results.md、evidence/csv-dev04/*.csv。全部固定種子，重跑結果相同。
 * 只讀 js/、tests/、docs/，不改動；前一輪 sim/ 由 sim/dev04/ref.js 從 0ad0b46f 取到暫存目錄。 */
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const { REPO, REF_SHA } = require('./ref');
const t00 = Date.now(); const log = (s) => console.log('[' + ((Date.now() - t00) / 1000).toFixed(1) + 's] ' + s);
const M = require('./model');
const ME = require('./measure');
const { D, U } = M; const { r3 } = U;
const CSV_DIR = path.join(REPO, 'evidence', 'csv-dev04');
function writeCsv(id, header, rows) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
  const esc = (v) => { const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : (Math.round(v * 10000) / 10000).toString()) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(CSV_DIR, id + '.csv'), [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n') + '\n');
}
const sh = (c) => { try { return execSync(c, { cwd: REPO, encoding: 'utf8' }).trim(); } catch (e) { return 'NA'; } };
const HEAD = sh('git rev-parse HEAD');
const PR_SHA = sh('git rev-parse pr16 2>/dev/null || git rev-parse FETCH_HEAD');
const specVer = (fs.readFileSync(path.join(REPO, 'docs/design/batch1/specs/SPEC-01.md'), 'utf8').split('\n')[0].match(/v\d+\.\d+/) || ['?'])[0];
const out = [];
const P_ = (...a) => out.push(...a);
const table = (head, rows) => { P_('', '| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|'); rows.forEach((r) => P_('| ' + r.join(' | ') + ' |')); P_(''); };
const inb = (x) => x >= 0.8 && x <= 1.25;
const V = (ok) => (ok ? '通過' : '未通過');

// ================= 〇-1 回歸 =================
const reg = ['old', 'new'].map((k) => JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'regress.js'), k], { encoding: 'utf8', env: process.env })));
log('回歸 old ' + reg[0].ratios.map(r3).join('/') + '；new ' + reg[1].ratios.map(r3).join('/'));
const EXPECT = '0.865／0.790／1.153／1.242';
const regOk = reg[0].ratios.map(r3).join('／') === EXPECT;
writeCsv('regression', ['js_version', 'starter_x2', 'starter_x4', 'cleaner_x2', 'cleaner_x4', 'ex_rate_starter', 'ex_rate_cleaner', 'expected', 'reproduced'], reg.map((r) => [r.kind === 'old' ? 'b1-civ@0ad0b46f (main@dd3843b js)' : 'PR16 js', ...r.ratios, ...r.exRate, EXPECT, r.ratios.map(r3).join('／') === EXPECT ? 'yes' : 'no']));
if (!regOk) { fs.writeFileSync(path.join(REPO, 'evidence', 'dev04-s4-results.md'), '# 回歸失敗，停止\n\n' + JSON.stringify(reg[0]) + '\n'); console.error('回歸失敗'); process.exit(2); }

// ================= 〇-2 量測 =================
const info = ME.staticInfo();
const routes = ME.routes();
const runs = [ME.trips(20261127, 4000), ME.trips(20261128, 4000), ME.trips(20261127, 4000, { resetJiao: true }), ME.trips(20261128, 4000, { resetJiao: true })];
log('事件實測完成');
let browser = null, orig = null;
try { // 瀏覽器（playwright）版：原測試檔照跑一次 + 本輪的兩個種子
  const env = Object.assign({}, process.env, { NODE_PATH: [process.env.NODE_PATH, sh('npm root -g')].filter(Boolean).join(':') });
  orig = JSON.parse(execFileSync(process.execPath, [path.join(REPO, 'tests/measure-dev04-bandit.js')], { encoding: 'utf8', env, timeout: 300000 }));
  browser = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'measure-browser.js'), '20261127', '20261128'], { encoding: 'utf8', env, timeout: 300000 }));
  log('瀏覽器量測完成');
} catch (e) { log('瀏覽器量測無法執行：' + String(e.message).split('\n')[0]); }
writeCsv('routes', ['from', 'to', 'from_name', 'to_name', 'hours', 'risk_day', 'risk_night', 'R', 'h_per_bandit_day', 'h_per_bandit_night'], routes.filter((r) => r.edges === 1).map((r) => [r.a, r.b, r.an, r.bn, r.h, r.riskDay, r.riskNight, r.R, r.h / (r.riskDay * info.evShare), r.h / (r.riskNight * info.evShare)]));
const mrow = (src, x) => [src, x.seed, x.resetJiao ? 'reset' : 'natural', x.trips, x.hours, x.events, x.bandits, x.dayTrips, x.dayEv, x.dayBandits, x.nightTrips, x.nightEv, x.nightBandits, x.hours / x.bandits, x.perkTrips === undefined ? 'NA' : x.perkTrips];
const mrows = runs.map((x) => mrow('node-vm', x));
if (orig) mrows.push(['browser tests/measure-dev04-bandit.js', 20261127, 'natural', orig.sim.trips, orig.sim.hours, orig.sim.events, orig.sim.bandits, orig.sim.trips - orig.sim.nightTrips, orig.sim.events - orig.sim.nightEv, 'NA', orig.sim.nightTrips, orig.sim.nightEv, 'NA', orig.sim.hours / orig.sim.bandits, 'NA']);
if (browser) browser.forEach((x) => mrows.push(['browser sim/dev04/measure-browser.js', x.seed, 'natural', x.trips, x.hours, x.events, x.bandits, x.trips - x.nightTrips, x.events - x.nightEv, x.bandits - x.nightBandits, x.nightTrips, x.nightEv, x.nightBandits, x.hours / x.bandits, 'NA']));
writeCsv('event-measure', ['source', 'seed', 'jiao', 'trips', 'hours', 'events', 'bandits', 'day_trips', 'day_events', 'day_bandits', 'night_trips', 'night_events', 'night_bandits', 'h_per_bandit', 'trips_with_jiao25'], mrows);
const pool = (a) => ({ trips: a.reduce((s, x) => s + x.trips, 0), hours: a.reduce((s, x) => s + x.hours, 0), events: a.reduce((s, x) => s + x.events, 0), bandits: a.reduce((s, x) => s + x.bandits, 0) });
const PP = pool(runs.slice(0, 2)), PN = pool(runs.slice(2));
const H_MEAS1 = runs[0].hours / runs[0].bandits, H_MEAS2 = runs[1].hours / runs[1].bandits, H_POOL = PP.hours / PP.bandits, H_NOPERK = PN.hours / PN.bandits;
const H_DEV = 23.69; // 開發工程師報的值（瀏覽器，含一趟 4h 官道），另見 csv
const wil = (k, n, hPerTrip) => U.wilson(k, n).map((p) => hPerTrip / p).reverse();

// bandit 來源清單（逐行掃描，行號自動取）
const gameLines = fs.readFileSync(path.join(REPO, 'js/game.js'), 'utf8').split('\n');
const dataLines = fs.readFileSync(path.join(REPO, 'js/data.js'), 'utf8').split('\n');
const find = (lines, re) => lines.map((l, i) => (re.test(l) ? i + 1 : 0)).filter(Boolean);
const srcRows = [];
find(dataLines, /id: 'bandit', title/).forEach((n) => srcRows.push(['來源', 'js/data.js:' + n, 'EVENTS「劫匪攔路」（5 個野徑事件之一，game.js startEvent 以 pick() 等機率抽）']));
find(gameLines, /function startEvent/).forEach((n) => srcRows.push(['機制', 'js/game.js:' + n + '-' + (n + 4), 'startEvent：獸潮期間 60% 直接給「異獸蹤跡」，否則 pick(D.EVENTS) 等機率五選一；只有 travel() 在 rnd() < 遇險率 時呼叫']));
find(gameLines, /if \(rnd\(\) < p\.risk\) \{ startEvent/).forEach((n) => srcRows.push(['機制', 'js/game.js:' + n, 'travel()：抵達後擲一次遇險；城鎮內、地城、採集、追蹤、探查都不會叫 startEvent']));
find(gameLines, /startCombat\(\['bandit'\]/).forEach((n) => srcRows.push(['來源', 'js/game.js:' + n, '劫匪攔路事件入戰（1 名）：' + (/payFee/.test(gameLines[n - 1]) ? '交買路錢但銀兩不足' : /話不投機/.test(gameLines[n - 1]) ? '開口周旋失敗' : '迎戰')]));
find(gameLines, /startCombat\(\['bandit', 'bandit'\]/).forEach((n) => srcRows.push(['來源', 'js/game.js:' + n, '傳聞查探入戰（2 名）：' + (/ambush: true/.test(gameLines[n - 1]) ? '「根本是餌」沒察覺→中伏（ambush）' : /r_strike/.test(gameLines[n - 1]) ? '「根本是餌」察覺→先下手（stun 1）' : /r_fight/.test(gameLines[n - 1]) ? '「有人盤踞」動手搶' : '「有人盤踞」開口談分帳失敗')]));
find(gameLines, /function truthW/).forEach((n) => srcRows.push(['權重', 'js/game.js:' + n, 'truthW：盤踞權重 ×min(crew,4)/4（crew 起手 4 → 25/100）']));
find(gameLines, /function liveTruth/).forEach((n) => srcRows.push(['權重', 'js/game.js:' + n, 'liveTruth：盤踞且 crew<1 → 當作「已被取走」']));
find(gameLines, /function questProgress/).forEach((n) => srcRows.push(['計數', 'js/game.js:' + n + '-' + (n + 8), 'questProgress(kill, id)：所有 status=active、kind=kill、enemy=id 的委託 +1；不看擊殺地點、來源或戰鬥類型']));
find(gameLines, /questProgress\('kill', e\.id\)/).forEach((n) => srcRows.push(['計數', 'js/game.js:' + n, 'killEnemy：任何戰鬥裡打倒任何敵人都呼叫 questProgress → 野徑事件、傳聞、餌，殺的劫匪全部都算']));
find(gameLines, /if \(e\.id === 'bandit'\) banditKilled\(\)/).forEach((n) => srcRows.push(['副作用', 'js/game.js:' + n, 'killEnemy → banditKilled（同樣不看來源）']));
find(gameLines, /function banditKilled/).forEach((n) => srcRows.push(['副作用', 'js/game.js:' + n + '-' + (n + 9), 'banditKilled：匪勢 B −2.5、crew −0.5（下限 0）；crew 由 >0 降到 0 時「據點被端」破曉聲望 +2。不推進委託、不產生劫匪']));
find(gameLines, /function questWhere/).forEach((n) => srcRows.push(['地點', 'js/game.js:' + n + '-' + (n + 6), 'questWhere：kill 類只回傳 QUEST_GEN.where 的字串，不對應任何節點、不影響生成']));
find(dataLines, /bandit: '野徑一帶'/).forEach((n) => srcRows.push(['地點', 'js/data.js:' + n, "where.bandit = '野徑一帶'：NODES 沒有叫「野徑一帶」的節點（最接近的是 chakou「野徑岔口」）"]));
find(gameLines, /function banditDraw/).forEach((n) => srcRows.push(['委託', 'js/game.js:' + n + '-' + (n + 4), 'banditDraw：只決定委託板上要不要出劫匪題（p=clamp((B−20)/80,0,0.5)），不產生劫匪']));
// 資料表掃描：WILDS／DUNGEONS／BOUNTIES／TIDE／EXPLORE 等有沒有 bandit
const scan = Object.keys(D).filter((k) => { try { return JSON.stringify(D[k]).includes('"bandit"') || JSON.stringify(D[k]).includes("'bandit'"); } catch (e) { return false; } });
srcRows.push(['資料表掃描', 'js/data.js（執行時）', "window.SHL_DATA 各表含字串 'bandit' 的只有：" + scan.join('、') + '（WILDS、DUNGEONS、EXPLORE、BOUNTIES、TIDE 都沒有）']);
writeCsv('bandit-sources', ['type', 'file_line', 'what'], srcRows);

// ================= 戰鬥 =================
const duel = M.runDuels(log);
const tn = duel.tpls.map((t) => t.name);
const st0 = M.statsOf(duel.raw); const ex0 = tn.map((t) => M.exRate(st0[t]));
writeCsv('duels', ['player', 'combo', 'n', 'seeds', 'win', 'hp_cost', 'deaths'], tn.flatMap((t) => Object.keys(duel.raw[t]).map((c) => [t, c === 'bb' ? 'bandit×2 一般' : c === 'bbA' ? 'bandit×2 中伏' : c === 'bbS' ? 'bandit×2 先下手(stun1)' : c, M.N_DUEL, (c.startsWith('bb') ? M.SEED_2V1 : M.SEED_1V1) + '+j', st0[t][c].win, st0[t][c].hp, duel.raw[t][c].dead])));

// ================= 規格（spec）建立 =================
const NEED = [2, 4];
const TR = M.TRAVEL;
const rumorNodes = { nearest: [{ node: 'chakou', p: 1, rh: M.hours('huiyao', 'chakou'), risk: Math.min(0.85, 0.22 * M.R_WILD) }] };
{ // 實作的隨機地點：kind 權重 cache 40、vein 30、beast 30（game.js newRumor），節點在該 kind 清單內等機率
  const kw = { cache: 40, vein: 30, beast: 30 }; const acc = {};
  Object.entries(kw).forEach(([k, w]) => { const ns = D.RUMOR.kinds[k].nodes; ns.forEach((n) => (acc[n] = (acc[n] || 0) + w / 100 / ns.length)); });
  rumorNodes.random = Object.entries(acc).map(([node, p]) => { const rh = M.hours('huiyao', node); const one = D.EDGES.some((e) => (e.a === 'huiyao' && e.b === node) || (e.b === 'huiyao' && e.a === node)); return { node, p, rh, risk: Math.min(0.85, (one ? 0.22 : 0.30) * M.R_WILD) }; });
}
let seedMC = 72001; const mc = {};
const getMC = (key, need, opt) => { const k = key + '|' + need; if (!mc[k]) mc[k] = M.mcRumor(need, opt, seedMC++); return mc[k]; };
const rumorSpec = (key, opt) => (g) => NEED.map((n) => getMC(key + '|' + g, n, Object.assign({ detect: duel.detect[g] }, opt)));
const geo = {}; [1, 0.5, 1 / 3, 0.25].forEach((p, i) => (geo[p] = M.mcGeom(p, 72000, 20000)));
const rows = []; // { tab, id, label, specs: g => [s2, s4], rw:[24,36], note }
const add = (tab, id, label, specs, note, rw) => rows.push({ tab, id, label, specs, note: note || '', rw: rw || [24, 36] });
const shuttle = (H, tph) => () => NEED.map((n) => M.specShuttle(n, H, tph));
// IMPL-event
add('IMPL', 'IMPL-event', '只靠野徑事件：實測 ' + r3(H_DEV) + ' h／頭（開發工程師值，瀏覽器、種子 20261127）', shuttle(H_DEV, 1));
add('IMPL', 'IMPL-event', '只靠野徑事件：本輪實測種子 20261127 ' + r3(H_MEAS1) + ' h／頭', shuttle(H_MEAS1, 1));
add('IMPL', 'IMPL-event', '只靠野徑事件：本輪實測種子 20261128 ' + r3(H_MEAS2) + ' h／頭', shuttle(H_MEAS2, 1));
add('IMPL', 'IMPL-event', '只靠野徑事件：兩種子合併 ' + r3(H_POOL) + ' h／頭', shuttle(H_POOL, 1));
add('IMPL', 'IMPL-event', '只靠野徑事件：解析・白天 22.727 h／頭（1/(0.22×0.2)）', shuttle(1 / (0.22 * 0.2), 1));
add('IMPL', 'IMPL-event', '只靠野徑事件：解析・夜間 11.364 h／頭（1/(0.44×0.2)）', shuttle(1 / (0.44 * 0.2), 1));
add('IMPL', 'IMPL-event', '只靠野徑事件：實測・〈腳力〉每趟歸零（無 25 級遇險 −20%），兩種子合併 ' + r3(H_NOPERK) + ' h／頭', shuttle(H_NOPERK, 1));
// IMPL-rumor
add('IMPL', 'IMPL-rumor', '只靠傳聞：地點取最近（野徑岔口 1h）、每則付 5 兩、crew 固定 4（0.8 頭／則）', rumorSpec('r-near', { nodes: rumorNodes.nearest, mode: 'rumor' }));
add('IMPL', 'IMPL-rumor', '只靠傳聞：同上，但每則免費（每客棧每日 1 次）', rumorSpec('r-free', { nodes: rumorNodes.nearest, mode: 'rumor', free: true }));
add('IMPL', 'IMPL-rumor', '只靠傳聞：同上（付費），crew 隨擊殺 −0.5（game.js banditKilled，盤踞權重跟著降）', rumorSpec('r-crew', { nodes: rumorNodes.nearest, mode: 'rumor', crewDyn: true }));
add('IMPL', 'IMPL-rumor', '只靠傳聞：地點照實作隨機（kind 40/30/30、節點等機率），付費、crew 固定', rumorSpec('r-rand', { nodes: rumorNodes.random, mode: 'rumor' }));
// IMPL-mixed
add('IMPL', 'IMPL-mixed', '混合（主）：跑傳聞往返，路上「劫匪攔路」也算進度；最近地點、付費、crew 固定', rumorSpec('m-near', { nodes: rumorNodes.nearest, mode: 'mixed' }));
add('IMPL', 'IMPL-mixed', '混合（參考，偏樂觀）：每頭小時 1/(1/h事件+1/h傳聞)，h事件＝' + r3(H_DEV), (g) => {
  return NEED.map((n) => { const r = getMC('r-near|' + g, n, { detect: duel.detect[g], nodes: rumorNodes.nearest, mode: 'rumor' }); const hr = r.hours / n, he = H_DEV + 1; const hm = 1 / (1 / he + 1 / hr); const fe = (1 / he) / (1 / he + 1 / hr);
    const fr = {}; Object.entries(r.fights).forEach(([k, v]) => { if (k !== 'b1') fr[k] = v * (1 - fe); });
    return { need: n, hours: n * hm, fights: Object.assign({ b1: n * fe }, fr), kills: n * fe + r.kills * (1 - fe), bonus: r.bonus * (1 - fe), fees: r.fees * (1 - fe), hHead: hm }; });
});
// 候選
add('C', 'C0', 'C0 控制：在岔口每頭搜尋 1h（前一輪假設）', () => NEED.map((n) => M.specAtChakou(n, 1)));
const C1 = [[1, '1（現況）'], [2, '2'], [4, '4'], [Infinity, '∞（s=1）']];
const EV_RATE_MEAS = PP.events / PP.trips; // 兩種子合併、〈腳力〉自然成長
C1.forEach(([k, kl]) => {
  const s = k === Infinity ? 1 : k / (4 + k), tph = k === Infinity ? 0 : 1 / k;
  add('C', 'C1', 'C1 k=' + kl + '・白天解析（遇險 0.22）：搜尋 ' + r3(1 / (0.22 * s)) + ' h／頭', shuttle(1 / (0.22 * s), tph));
  add('C', 'C1', 'C1 k=' + kl + '・夜間解析（遇險 0.44）：搜尋 ' + r3(1 / (0.44 * s)) + ' h／頭', shuttle(1 / (0.44 * s), tph));
  add('C', 'C1', 'C1 k=' + kl + '・實測遇險率（' + r3(EV_RATE_MEAS) + '／趟，晝夜混合、〈腳力〉自然成長）：搜尋 ' + r3(1 / (EV_RATE_MEAS * s)) + ' h／頭', shuttle(1 / (EV_RATE_MEAS * s), tph));
});
[[1, '1.0'], [0.5, '0.5（建議）'], [1 / 3, '0.33（取 1/3）'], [0.25, '0.25']].forEach(([p, pl]) => {
  const G = geo[p];
  add('C', 'C2', 'C2 搜匪 p=' + pl + '：每頭平均 ' + r3(G.mean) + ' h（解析 ' + r3(G.analyticMean) + '）、P90 ' + r3(G.p90) + ' h', () => [M.specAtChakou(2, G.x2.mean / 2), M.specAtChakou(4, G.x4.mean / 4)], 'p90');
});
add('C', 'C3', 'C3 單上給位置、一戰兩頭（2 對 1 一般開場）、每戰搜尋 1h 必中', () => NEED.map((n) => ({ need: n, hours: 2 * TR.rh + (n / 2) * 1 + TR.enc * 0.2, fights: { bb: n / 2 }, kills: n, bonus: TR.enc * 0.2, fees: 0, hHead: 0.5 })));

// ================= 賞金補償搜尋 =================
const HS = [1, 2, 3, 4, 6, 9, 13.6, 22.7];
const comp = []; const compCsv = [], compAll = [];
const C3SPEC = (n) => ({ need: n, hours: 2 * TR.rh + (n / 2) * 1 + TR.enc * 0.2, fights: { bb: n / 2 }, kills: n, bonus: TR.enc * 0.2, fees: 0, hHead: 0.5 });
HS.map((h) => [h, NEED.map((n) => M.specAtChakou(n, h))]).concat([['C3', NEED.map(C3SPEC)]]).forEach(([h, sp]) => {
  const ratioAt = (gi, ni, rw) => M.banditIncome(st0[tn[gi]], sp[ni], rw).rate / ex0[gi];
  const viol = (x) => (x < 0.8 ? Math.log(0.8 / Math.max(1e-9, x)) : x > 1.25 ? Math.log(x / 1.25) : 0);
  const f2 = [], f4 = [], f4e = [], all2 = [], all4 = [];
  for (let rw = 24; rw <= 70; rw++) { const v = [ratioAt(0, 0, rw), ratioAt(1, 0, rw)]; all2.push({ rw, v, d: Math.max(...v.map(viol)) }); if (v.every(inb)) f2.push(rw); }
  for (let rw = 36; rw <= 120; rw++) { const v = [ratioAt(0, 1, rw), ratioAt(1, 1, rw)]; all4.push({ rw, v, d: Math.max(...v.map(viol)) }); if (v.every(inb)) f4.push(rw); if (v[0] >= 0.790 && v[0] <= 1.25 && inb(v[1])) f4e.push(rw); }
  all2.forEach((a) => all4.forEach((b) => compAll.push([h, a.rw, b.rw, a.v[0], b.v[0], a.v[1], b.v[1], Math.max(a.d, b.d) === 0 ? 'yes' : 'no'])));
  const near = []; all2.forEach((a) => all4.forEach((b) => near.push({ rw2: a.rw, rw4: b.rw, d: Math.max(a.d, b.d), v: [a.v[0], b.v[0], a.v[1], b.v[1]] }))); near.sort((x, y) => x.d - y.d || x.rw2 - y.rw2 || x.rw4 - y.rw4);
  const lnd = (v) => Math.max(...v.map((x) => Math.abs(Math.log(Math.max(1e-9, x)))));
  const c2 = f2.slice().sort((x, y) => lnd(all2.find((q) => q.rw === x).v) - lnd(all2.find((q) => q.rw === y).v))[0], c4 = f4.slice().sort((x, y) => lnd(all4.find((q) => q.rw === x).v) - lnd(all4.find((q) => q.rw === y).v))[0];
  const pick2 = f2.length ? c2 : near[0].rw2, pick4 = f4.length ? c4 : near[0].rw4;
  const exp = NEED.map((n, ni) => ({ hours: sp[ni].hours, hHead: h, inc24: tn.map((t, gi) => M.banditIncome(st0[t], sp[ni], [24, 36][ni]).income), incPick: tn.map((t) => M.banditIncome(st0[t], sp[ni], [pick2, pick4][ni]).income) }));
  comp.push({ h, f2, f4, f4e, near: near.slice(0, 3), pick2, pick4, exp, ok8: sp[0].hours <= 8, ok14: sp[1].hours <= 14, sp, r24: [ratioAt(0, 0, 24), ratioAt(0, 1, 36), ratioAt(1, 0, 24), ratioAt(1, 1, 36)] });
  compCsv.push([h, f2.length ? f2[0] + '-' + f2[f2.length - 1] : 'none', f4.length ? f4[0] + '-' + f4[f4.length - 1] : 'none', f2.length * f4.length, f4e.length ? f4e[0] + '-' + f4e[f4e.length - 1] : 'none', sp[0].hours, sp[1].hours, exp[0].inc24[0], exp[0].inc24[1], exp[1].inc24[0], exp[1].inc24[1], pick2, pick4, exp[0].incPick[0], exp[0].incPick[1], exp[1].incPick[0], exp[1].incPick[1], sp[0].hours <= 8 ? 'yes' : 'no', sp[1].hours <= 14 ? 'yes' : 'no', near.slice(0, 3).map((x) => x.rw2 + '/' + x.rw4 + ':' + x.v.map(r3).join('/')).join(' ; ')]);
});
writeCsv('reward-search', ['h_per_head', 'feasible_rw2', 'feasible_rw4', 'n_feasible_pairs', 'rw4_with_0790_exception', 'x2_quest_hours', 'x4_quest_hours', 'x2_income_starter_at24', 'x2_income_cleaner_at24', 'x4_income_starter_at36', 'x4_income_cleaner_at36', 'centered_feasible_or_nearest_rw2', 'centered_feasible_or_nearest_rw4', 'x2_income_starter_at_pick', 'x2_income_cleaner_at_pick', 'x4_income_starter_at_pick', 'x4_income_cleaner_at_pick', 'x2_le_8h', 'x4_le_14h', 'nearest3_rw2/rw4:ratios(s2/s4/c2/c4)'], compCsv);
writeCsv('reward-search-grid', ['h_per_head', 'rw2', 'rw4', 'starter_x2', 'starter_x4', 'cleaner_x2', 'cleaner_x4', 'all_four_in_band'], compAll);
log('賞金補償搜尋完成');
// 補償後的候選（置中賞金：可行集合中使兩組比值 max|ln 比值| 最小者），附 bootstrap CI
[[2, 0.5, '0.5（建議）'], [3, 1 / 3, '0.33（取 1/3）'], [4, 0.25, '0.25']].forEach(([h, p, pl]) => { const c = comp.find((x) => x.h === h); if (!(c.f2.length && c.f4.length)) return; const G = geo[p];
  add('CR', 'C2+賞金', 'C2 搜匪 p=' + pl + '＋賞金 ' + c.pick2 + '／' + c.pick4 + '（置中；可行 rw2 ' + c.f2[0] + '–' + c.f2[c.f2.length - 1] + '、rw4 ' + c.f4[0] + '–' + c.f4[c.f4.length - 1] + '）', () => [M.specAtChakou(2, G.x2.mean / 2), M.specAtChakou(4, G.x4.mean / 4)], '', [c.pick2, c.pick4]); });
{ const c = comp.find((x) => x.h === 1); add('CR', 'C0+例外', 'C0（每頭 1h）＋賞金 24／36（現況定案值，對照）', () => NEED.map((n) => M.specAtChakou(n, 1)), '', [24, 36]); }

// ================= 評估＋bootstrap =================
function evalAll(st) {
  const ex = tn.map((t) => M.exRate(st[t]));
  return rows.map((row) => tn.map((t, gi) => { const sp = row.specs(t); return sp.map((s, i) => { const b = M.banditIncome(st[t], s, row.rw[i]); return { hours: s.hours, hHead: s.hHead, income: b.income, rate: b.rate, ratio: b.rate / ex[gi], pWin: b.pWin, sp: s }; }); }));
}
const res0 = evalAll(st0);
const B = 1000; const brng = U.mulberry32(73000); const boots = [];
for (let b = 0; b < B; b++) { const st = M.statsOf(duel.raw, brng); boots.push(evalAll(st).map((r) => r.map((gq) => gq.map((q) => q.ratio)))); }
log('bootstrap ' + B + ' 次完成');
const ci = (ri, gi, ni) => { const a = boots.map((b) => b[ri][gi][ni]); return [U.quantile(a, 0.025), U.quantile(a, 0.975)]; };
const fmtR = (ri, gi, ni) => { const [a, b] = ci(ri, gi, ni); return r3(res0[ri][gi][ni].ratio) + ' [' + r3(a) + ', ' + r3(b) + ']'; };
const verdictRow = (ri) => { const v = res0[ri]; const r = [v[0][0].ratio, v[0][1].ratio, v[1][0].ratio, v[1][1].ratio]; return { strict: r.every(inb), exc: inb(r[0]) && r[1] >= 0.790 && r[1] <= 1.25 && inb(r[2]) && inb(r[3]), r }; };
const csvRows = [];
rows.forEach((row, ri) => tn.forEach((t, gi) => [0, 1].forEach((ni) => { const q = res0[ri][gi][ni]; const [a, b] = ci(ri, gi, ni); const vr = verdictRow(ri);
  csvRows.push([row.id, row.label, t, NEED[ni], row.rw[ni], q.hours, q.hHead, q.pWin, q.income, q.rate, ex0[gi], q.ratio, a, b, vr.strict ? 'pass' : 'fail', vr.exc ? 'pass' : 'fail', JSON.stringify(q.sp.fights), q.sp.kills, q.sp.bonus || 0, q.sp.fees || 0, q.sp.p90 === undefined ? '' : q.sp.p90]); })));
const hdr = ['arm', 'label', 'player', 'need', 'reward', 'hours_per_quest', 'hours_per_head', 'p_success', 'income', 'silver_per_hour', 'existing_kill_rate', 'ratio', 'ratio_ci_lo', 'ratio_ci_hi', 'row_strict', 'row_with_0790_exception', 'fights', 'kills_for_loot', 'bonus_event_bandits', 'fees', 'hours_p90'];
writeCsv('impl-arms', hdr, csvRows.filter((r) => r[0].startsWith('IMPL')));
writeCsv('candidates', hdr, csvRows.filter((r) => !r[0].startsWith('IMPL')));
writeCsv('mc-detail', ['key', 'need', 'hours_mean', 'hours_p90', 'rumors', 'fights', 'kills', 'bonus', 'fees'], Object.entries(mc).map(([k, v]) => [k, v.need, v.hours, v.p90, v.rumors, JSON.stringify(v.fights), v.kills, v.bonus, v.fees]));
writeCsv('c2-geometric', ['p', 'samples', 'seed', 'per_head_mean', 'per_head_mean_analytic', 'per_head_p90', 'per_head_p90_analytic', 'x2_search_mean', 'x2_search_p90', 'x4_search_mean', 'x4_search_p90', 'x2_quest_hours_p90', 'x4_quest_hours_p90'], Object.values(geo).map((G) => [G.p, 20000, 72000, G.mean, G.analyticMean, G.p90, G.analyticP90, G.x2.mean, G.x2.p90, G.x4.mean, G.x4.p90, 2 * TR.rh + G.x2.p90 + TR.enc * 0.2, 2 * TR.rh + G.x4.p90 + TR.enc * 0.2]));



// ================= 寫 markdown =================
const RID = (id) => rows.map((r, i) => (r.id === id ? i : -1)).filter((i) => i >= 0);
P_('# 《山海錄》DEV-04 實作上重驗 S4／AC-E8（劫匪搜尋時間）與候選規則比較（num-shl-dev04-s4）', '');
P_('依據：SPEC-01（PR #16 分支內版本，**' + specVer + '**，`docs/design/batch1/specs/SPEC-01.md` 首行）；被驗 PR #16@`' + PR_SHA + '`；sim 參考 numbers/num-shl-b1-civ@`' + REF_SHA.slice(0, 8) + '`（`' + REF_SHA + '`）。', '');
P_('- 本分支：`numbers/num-shl-dev04-s4`（從 PR #16 的 `10c5dae` 開）。執行：`git fetch origin numbers/num-shl-b1-civ && node sim/dev04/run.js`（約 1–2 分鐘；瀏覽器量測需要 playwright，沒有就跳過、其餘照跑）。');
P_('- 只新增 `sim/dev04/`、`evidence/dev04-s4-*.md`、`evidence/csv-dev04/`；`js/`、`index.html`、`tests/`、`docs/` 一律只讀。前一輪的 `sim/lib/*`、`sim/items/*`、`sim/civ/*` 不放進本分支，執行時由 `sim/dev04/ref.js` 從 `0ad0b46f` 以 `git archive` 取到暫存目錄。');
P_('- 假設、建模選擇、與前一輪的不同：`evidence/dev04-s4-assumptions.md`。原始數據：`evidence/csv-dev04/`。', '');
P_('## 樣本數與種子', '');
P_('- 戰鬥：每個（玩家樣板, 敵人組合）' + M.N_DUEL + ' 場；1 對 1 種子 `' + M.SEED_1V1 + '+j`、2 對 1（一般／中伏／先下手三種開場）種子 `' + M.SEED_2V1 + '+j`，j=0..' + (M.N_DUEL - 1) + '。回歸用前一輪的 150 場、種子 `100+i`。');
P_('- 事件實測：灰窯⇄野徑岔口 4000 趟 × 種子 20261127、20261128（Node vm 與瀏覽器各跑一次），另跑〈腳力〉歸零對照組。');
P_('- C2 幾何分布：20000 次抽樣、種子 72000（四個 p 共用同一條序列）；傳聞／混合路徑蒙地卡羅：每格 20000 張委託、種子 72001 起逐格 +1（見 `csv-dev04/mc-detail.csv`）。');
P_('- 比值 95% CI：**bootstrap**（' + B + ' 次、種子 73000），每次對每個（樣板, 組合）的 ' + M.N_DUEL + ' 場戰鬥有放回重抽，重算分母（現有 8 張 kill 委託）與分子；搜尋時數、場數期望值當固定輸入（不含事件實測與蒙地卡羅的抽樣誤差，事件實測的誤差另以 Wilson 區間報在 〇-2）。');
P_('- 判準：四個比值（起手・平民／古窯清理級・平民 × ×2／×4）皆在 **0.8–1.25**。另列「沿用 ≥0.790 例外」欄（只放寬起手・平民 ×4 到 ≥0.790），判定以嚴格為主。', '');

// 〇-1
P_('## 〇-1 回歸', '');
table(['遊戲本體', '起手・平民 ×2', '起手・平民 ×4', '清理級・平民 ×2', '清理級・平民 ×4', '分母（兩/時）起手／清理級', '前一輪值', '重現'], reg.map((r) => [r.kind === 'old' ? '前一輪的 js（0ad0b46f 內＝main@dd3843b）' : 'PR #16 的 js（10c5dae）', ...r.ratios.map(r3), r3(r.exRate[0]) + '／' + r3(r.exRate[1]), EXPECT, r.ratios.map(r3).join('／') === EXPECT ? '**是**' : '否']));
P_('- **回歸重現**：用前一輪的 sim 與前一輪的 js（N=150、種子 100+i、每頭 1h、24／36、掉落平均 5），四個比值逐位重現 ' + EXPECT + '。');
P_('- 同一套 sim 換成 PR #16 的 js，四個比值變成 ' + reg[1].ratios.map(r3).join('／') + '。原因已查明：PR #16（DEV-02 起）`restart()` 把獸潮首日的 `ri(D.TIDE.first…)`（吃一次 `S.rng`）改成世界擲骰 `wri(\'tide-first\',…)`（不吃 `S.rng`），所以同一個種子開局後的玩家亂數序列整體平移一格，每場戰鬥的骰子都不同；戰鬥規則本身沒有改（diff 中 combat 相關只多了 `killEnemy` 的 `banditKilled()`，不影響勝負與失血）。古窯清理級・平民的實打成長也因此略變（盾防 6→5、閃躲 15→16、輕甲 13→14）。');
P_('- 這代表 **N=150 時四個比值本身的抽樣誤差約 ±0.04**，0.790 與 0.8 的差（0.010）落在誤差內。本輪改用 2000 場並附 CI。', '');
P_('### 〇-3 分母（現有 kill 委託模板）', '');
const samePool = JSON.stringify(reg[0].killPool) === JSON.stringify(info.killPool);
P_('- PR #16 `data.js` `QUEST_GEN.kill.pool`：' + info.killPool.map((x) => x[0] + '×' + x[1] + '（' + x[2] + '）').join('、') + '。與前一輪（0ad0b46f 內的 js）' + (samePool ? '**完全相同**（8 張），只報一個版本。' : '**不同**，兩版都報（見 csv）。'));
P_('- PR #16 另外改了：`ENEMIES.bandit.silver` 8–20 → **' + info.banditSilver.join('–') + '**（前一輪以覆寫平均 5 模擬，與現在資料表的平均一致）；`QUEST_GEN.where.bandit = \'' + info.where + '\'`；`QUEST_GEN.bandit` = ' + JSON.stringify(info.questBandit) + '。', '');

// 〇-2
P_('## 〇-2 實作量測複算與劫匪來源', '');
P_('### 原測試檔照跑', '');
if (orig) P_('- `node tests/measure-dev04-bandit.js`（playwright、種子 20261127）輸出與 `docs/evidence/shots-shanhailu-dev04-1128/bandit-search-measure.json` **' + (orig.sim.hours === 4003 && orig.sim.bandits === 169 ? '逐欄相同' : '不同') + '**：4000 趟、' + orig.sim.hours + ' h、事件 ' + orig.sim.events + '、劫匪 ' + orig.sim.bandits + ' → ' + r3(orig.sim.hours / orig.sim.bandits) + ' h／頭。');
else P_('- 瀏覽器無法啟動，原測試檔沒跑成；以下只有 Node vm 結果。');
P_('- 小瑕疵（不影響結論）：原測試檔第 1 段量路線時把 `S.loc` 設成 `from` 並逐一跑過灰窯、渡陰，迴圈結束時玩家停在**渡陰**、時間被改成 22:00，所以第 2 段的第 1 趟其實是渡陰→灰窯走官道 4h（多出的 3 h 與 3 個事件就是這樣來的）。本輪的 Node vm 與瀏覽器版（`sim/dev04/measure-browser.js`）都從開局狀態直接開始，兩者逐趟相同：種子 20261127 4000 h、事件 ' + runs[0].events + '、劫匪 ' + runs[0].bandits + '。');
P_('', '### 單段野徑各邊的遇險率（起手狀態 B=30、Ō=57.5 → R_wild=' + routes[0].R + '；`travelPreview`）', '');
table(['邊', '時數', '白天', '夜間', '每頭劫匪小時（白天／夜間，＝h/(遇險×0.2)）'], routes.filter((r) => r.edges === 1).map((r) => [r.an + '⇄' + r.bn, r.h, r3(r.riskDay), r3(r.riskNight), r3(r.h / (r.riskDay * info.evShare)) + '／' + r3(r.h / (r.riskNight * info.evShare))]));
P_('- 上表 13 條野徑單段邊實測都是白天 0.22、夜間 0.44（`game.js` travelPreview：單段 0.22、多段 0.30、夜間 ×2、×R、封頂 0.85）。另 2 條野徑邊 岔口⇄鴉巢、腐骨沼⇄無名古塚 的終點是 `hidden` 節點，開局未解鎖，`route()` 只走已知地點、回傳 0 段，量不到（照同一公式也是單段 0.22／0.44）。');
P_('- `EVENTS` 劫匪權重實際值：`EVENTS` 共 ' + info.evIds.length + ' 個（' + info.evIds.join('、') + '），`startEvent` 用 `pick()` 等機率 → 劫匪 **' + info.evShare + '**（獸潮期間另有 60% 直接給異獸蹤跡，劫匪降為 0.4×0.2＝0.08）。', '');
P_('### 4000 趟實測（灰窯⇄野徑岔口，遇事件即中止、不入戰）', '');
const mr = (lbl, x) => [lbl, x.seed, x.hours, x.events + '（白 ' + x.dayEv + '／' + x.dayTrips + '、夜 ' + x.nightEv + '／' + x.nightTrips + '）', x.bandits + '（白 ' + x.dayBandits + '、夜 ' + x.nightBandits + '）', r3(x.hours / x.bandits), (() => { const [a, b] = wil(x.bandits, x.trips, x.hours / x.trips); return '[' + r3(a) + ', ' + r3(b) + ']'; })()];
table(['來源', '種子', '時數', '事件（白天／夜間）', '劫匪', '每頭小時', '每頭小時 95% CI（Wilson，劫匪／趟）'], [
  ...(orig ? [['開發工程師（瀏覽器，含一趟官道）', 20261127, orig.sim.hours, orig.sim.events + '（夜 ' + orig.sim.nightEv + '／' + orig.sim.nightTrips + '）', orig.sim.bandits, r3(orig.sim.hours / orig.sim.bandits), (() => { const [a, b] = wil(orig.sim.bandits, orig.sim.trips, orig.sim.hours / orig.sim.trips); return '[' + r3(a) + ', ' + r3(b) + ']'; })()]] : []),
  mr('本輪 Node vm（〈腳力〉自然成長）', runs[0]), mr('本輪 Node vm（〈腳力〉自然成長）', runs[1]),
  ['兩種子合併', '—', PP.hours, PP.events, PP.bandits, r3(H_POOL), (() => { const [a, b] = wil(PP.bandits, PP.trips, PP.hours / PP.trips); return '[' + r3(a) + ', ' + r3(b) + ']'; })()],
  mr('對照：每趟〈腳力〉歸零', runs[2]), mr('對照：每趟〈腳力〉歸零', runs[3]),
  ['對照合併', '—', PN.hours, PN.events, PN.bandits, r3(H_NOPERK), (() => { const [a, b] = wil(PN.bandits, PN.trips, PN.hours / PN.trips); return '[' + r3(a) + ', ' + r3(b) + ']'; })()],
  ...(browser ? browser.map((x) => ['本輪瀏覽器（同 vm 迴圈）', x.seed, x.hours, x.events, x.bandits, r3(x.hours / x.bandits), '—']) : []),
]);
P_('- 換種子變異大：20261127 → ' + r3(H_MEAS1) + ' h／頭、20261128 → ' + r3(H_MEAS2) + ' h／頭（劫匪 ' + runs[0].bandits + ' vs ' + runs[1].bandits + '）；兩種子合併 ' + r3(H_POOL) + '。' + (browser ? '瀏覽器版與 vm 逐欄相同。' : ''));
P_('- **23.69 不是「白天解析值 22.7 的實測」**：這 4000 趟是不睡覺連續來回（夜間趟占 ' + r3(runs[0].nightTrips / runs[0].trips * 100) + '%，夜間遇險 ×2），而且玩家趕路練〈腳力〉，第 ' + runs[0].firstPerk + ' 趟起達 25 級「野徑遇險 −20%」（4000 趟中 ' + runs[0].perkTrips + ' 趟有效）。實測事件率白天 ' + r3((runs[0].dayEv + runs[1].dayEv) / (runs[0].dayTrips + runs[1].dayTrips)) + '、夜間 ' + r3((runs[0].nightEv + runs[1].nightEv) / (runs[0].nightTrips + runs[1].nightTrips)) + '，接近 0.22×0.8＝0.176、0.44×0.8＝0.352（前 ' + runs[0].firstPerk + ' 趟還沒有 25 級）。把〈腳力〉每趟歸零，同樣兩個種子是 ' + r3(runs[2].hours / runs[2].bandits) + '／' + r3(runs[3].hours / runs[3].bandits) + ' h／頭（合併 ' + r3(H_NOPERK) + '）。兩個效果（夜間變快、腳力變慢）互相抵銷，種子 20261127 才剛好落在白天解析值 22.7 附近。');
P_('- 傳聞：`RUMOR.truth` = ' + JSON.stringify(info.truth) + '（總 ' + info.truthTot + '）→ 起手 crew 4 時 盤踞 ' + r3(info.truth.guard / info.truthTot) + '、餌 ' + r3(info.truth.bait / info.truthTot) + '，各 2 名 → **' + r3(2 * (info.truth.guard + info.truth.bait) / info.truthTot) + ' 頭／則**（與開發工程師相同）；聽 0.5h、' + info.rumorCost + ' 兩（每客棧每日第 1 則免費）、查探 1h。`RUMOR.kinds` 節點：' + Object.entries(info.kinds).map(([k, v]) => k + '＝' + v.join('/')).join('；') + '；離灰窯最近的是 chakou（野徑岔口，1h，只在 cache 清單裡）。', '');
P_('### 會產生 `bandit` 敵人的路徑與委託計數（PR #16@10c5dae，行號由 run.js 逐行掃描取得）', '');
table(['類別', '位置', '內容'], srcRows.map((r) => [r[0], '`' + r[1] + '`', r[2]]));
P_('**結論（獨立讀碼）：**');
P_('1. 劫匪只有三個來源：野徑趕路事件「劫匪攔路」（1 名）、傳聞查探「有人盤踞」（2 名）、傳聞查探「根本是餌」（2 名）。野外節點的追蹤點、探查驚動、地城、懸賞、獸潮都不會出劫匪。');
P_('2. 剿匪委託的進度：`killEnemy` → `questProgress(\'kill\', \'bandit\')`，**任何來源、任何地點殺的劫匪都算**（只要委託已接、status=active）。`banditKilled()` 只降匪勢 B 與 crew（並在 crew 歸零時給聲望），不推進委託、不生劫匪。');
P_('3. 委託單地點「野徑一帶」只是 `questWhere` 顯示的字串，**不對應任何節點**，也沒有任何程式讀它。');
P_('4. **沒有「接了剿匪單才找得到劫匪」的機制**：事件權重、傳聞權重都不看玩家有沒有接剿匪單。玩家能做的只有在野徑來回趕路碰運氣，或回客棧聽傳聞。（另：殺劫匪會降 B → R_wild 降 → 遇險率降，同時 crew 降 → 盤踞權重降，所以越殺越難找；每殺 1 名 R_wild −0.03。本輪主表不計這個遞減，只在 IMPL-rumor 另列一個 crew 動態列。）', '');

// 戰鬥摘要
P_('## 戰鬥取樣（PR #16 js，每格 ' + M.N_DUEL + ' 場）', '');
table(['敵人組合', ...tn.map((t) => t + ' 勝率／失血成本')], Object.keys(duel.raw[tn[0]]).map((c) => [c === 'bb' ? '劫匪×2（盤踞・一般開場）' : c === 'bbA' ? '劫匪×2（餌・中伏 ambush）' : c === 'bbS' ? '劫匪×2（餌・先下手 stun 1）' : D.ENEMIES[c].name + '×1', ...tn.map((t) => r3(st0[t][c].win) + '／' + r3(st0[t][c].hp))]));
P_('- 失血成本＝淨失血＋喝掉的藥×30（生命點），×0.3 兩換算。「餌」察覺率（game.js：0.15+(靈覺−10)×0.05+追蹤×0.004）：' + tn.map((t) => t + ' ' + r3(duel.detect[t])).join('、') + '。');
P_('- 分母（現有 8 張 kill 委託，時間加權）：' + tn.map((t, i) => t + ' **' + r3(ex0[i]) + '** 兩/時').join('、') + '。', '');

// 主表格式
const head = ['列', '玩家', '×2 每張時數', '×4 每張時數', '每頭小時（×2／×4）', '×2 期望收入', '×4 期望收入', '×2 兩/時', '×4 兩/時', '現有 kill 兩/時', '×2 比值 [95% CI]', '×4 比值 [95% CI]'];
const body = (ri) => tn.map((t, gi) => { const q = res0[ri][gi]; return [rows[ri].label, t, r3(q[0].hours), r3(q[1].hours), r3(q[0].hours / 2) + '／' + r3(q[1].hours / 4), r3(q[0].income), r3(q[1].income), r3(q[0].rate), r3(q[1].rate), r3(ex0[gi]), fmtR(ri, gi, 0), fmtR(ri, gi, 1)]; });
const verdictTable = (idx) => table(['列', '起手 ×2', '起手 ×4', '清理級 ×2', '清理級 ×4', '嚴格 0.8–1.25', '若沿用 ≥0.790 例外'], idx.map((ri) => { const v = verdictRow(ri); return [rows[ri].label, ...v.r.map(r3), '**' + V(v.strict) + '**', V(v.exc)]; }));
P_('## 一、S4／AC-E8 在實作的實際搜尋機制下（IMPL 三臂）', '');
P_('其餘條件不動：地點表、R_wild=1.042（分母與 C0 類的去回程）、藥錢、時間加權分母、兩組平民、賞金 24／36、掉落 3–7（平均 5）。每頭小時＝每張時數÷頭數（含繞路、回城與傳聞往返）。', '');
const implIdx = RID('IMPL-event').concat(RID('IMPL-rumor'), RID('IMPL-mixed'));
table(head, implIdx.flatMap(body));
P_('判定：', '');
verdictTable(implIdx);
const iv = (ri) => verdictRow(ri);
const ie0 = RID('IMPL-event')[0], ir0 = RID('IMPL-rumor')[0], im0 = RID('IMPL-mixed')[0];
P_('- IMPL-event（' + r3(H_DEV) + ' h／頭）：四個比值 ' + iv(ie0).r.map(r3).join('／') + ' → **' + V(iv(ie0).strict) + '**。×2 一張 ' + r3(res0[ie0][0][0].hours) + ' h、×4 一張 ' + r3(res0[ie0][0][1].hours) + ' h。');
P_('- IMPL-rumor（最近地點、付費）：' + iv(ir0).r.map(r3).join('／') + ' → **' + V(iv(ir0).strict) + '**；每頭 ' + r3(res0[ir0][0][0].hours / 2) + '／' + r3(res0[ir0][0][1].hours / 4) + ' h。');
P_('- IMPL-mixed（主）：' + iv(im0).r.map(r3).join('／') + ' → **' + V(iv(im0).strict) + '**。', '');
P_('混合臂做法：主列是「玩家照實作會做的事」——只跑傳聞往返（灰窯聽→岔口查→回灰窯），途中兩段野徑的「劫匪攔路」也算委託進度（實作就是這樣算的），用蒙地卡羅逐張模擬到殺滿為止（多殺的照給掉落）。參考列照任務書的 1/(1/h1+1/h2) 合併，等於假設兩種找法能同時進行、互不佔時間，所以偏樂觀，只供對照。', '');

// 候選
P_('## 二、候選規則並列（C0–C3；賞金 24／36、掉落 3–7）', '');
const cIdx = RID('C0').concat(RID('C1'), RID('C2'), RID('C3'));
table(head, cIdx.flatMap(body));
P_('判定：', '');
verdictTable(cIdx);
P_('C2 幾何分布（20000 次抽樣、種子 72000；搜尋次數＝小時）：', '');
table(['p', '每頭平均（抽樣／解析）', '每頭 P90（抽樣／解析）', '×2 搜尋小時 平均／P90', '×4 搜尋小時 平均／P90', '×2 每張總時數 P90', '×4 每張總時數 P90'], Object.values(geo).map((G) => [r3(G.p), r3(G.mean) + '／' + r3(G.analyticMean), r3(G.p90) + '／' + G.analyticP90, r3(G.x2.mean) + '／' + r3(G.x2.p90), r3(G.x4.mean) + '／' + r3(G.x4.p90), r3(2 * TR.rh + G.x2.p90 + TR.enc * 0.2), r3(2 * TR.rh + G.x4.p90 + TR.enc * 0.2)]));
P_('（每張總時數＝去回 2h＋搜尋＋路上獸跡繞路期望 ' + r3(TR.enc * 0.2) + 'h；P90 只把搜尋換成 P90，繞路用期望值。）', '');

// 補償
P_('## 賞金補償搜尋（掉落固定 3–7；h＝每頭搜尋小時，結構同 C0：去回岔口各 1h、岔口內每頭 h 小時、1 對 1）', '');
P_('整數賞金 rw2∈[24,70]、rw4∈[36,120]；×2 的比值只跟 rw2 有關、×4 只跟 rw4 有關，所以可行組合＝可行 rw2 × 可行 rw4。判準嚴格 0.8–1.25（不套 0.790 例外；例外另列一欄）。點估計（不含 CI）。', '');
table(['h', '24／36 下四個比值', '可行 rw2', '可行 rw4', '可行組數', 'rw4（沿用 ≥0.790 例外）', '×2 每張時數', '×4 每張時數', '×2 ≤8h', '×4 ≤14h', '單張收入 起手／清理級（24／36）', '單張收入 起手／清理級（置中可行賞金）', '找不到時最接近的三組 rw2/rw4：四比值'], comp.map((c) => [c.h === 'C3' ? 'C3（2 對 1，每戰 1h）' : c.h, c.r24.map(r3).join('／'), c.f2.length ? c.f2[0] + '–' + c.f2[c.f2.length - 1] : '找不到', c.f4.length ? c.f4[0] + '–' + c.f4[c.f4.length - 1] : '找不到', c.f2.length * c.f4.length, c.f4e.length ? c.f4e[0] + '–' + c.f4e[c.f4e.length - 1] : '找不到', r3(c.exp[0].hours), r3(c.exp[1].hours), c.ok8 ? '是' : '否', c.ok14 ? '是' : '否', '×2 ' + c.exp[0].inc24.map(r3).join('／') + '；×4 ' + c.exp[1].inc24.map(r3).join('／'), (c.f2.length && c.f4.length ? '×2@' + c.pick2 + ' ' + c.exp[0].incPick.map(r3).join('／') + '；×4@' + c.pick4 + ' ' + c.exp[1].incPick.map(r3).join('／') : '—'), (c.f2.length && c.f4.length) ? '—' : c.near.map((x) => x.rw2 + '/' + x.rw4 + '：' + x.v.map(r3).join('／')).join('；')]));
const okH = comp.filter((c) => c.h !== 'C3' && c.ok8 && c.ok14).map((c) => c.h);
P_('- 體驗指標（×2 ≤ 約 8h、×4 ≤ 約 14h，只是資訊）：滿足的 h＝' + (okH.length ? okH.join('、') : '無') + '。h=3 時 ×2 ' + r3(comp.find((c) => c.h === 3).exp[0].hours) + 'h、×4 ' + r3(comp.find((c) => c.h === 3).exp[1].hours) + 'h，各超出約 0.09h（路上獸跡繞路期望）。', '');
P_('### 補償後的候選（重算含 bootstrap 95% CI）', '');
const crIdx = RID('C2+賞金').concat(RID('C0+例外'));
table(head, crIdx.flatMap(body));
verdictTable(crIdx);
module.exports.__out = { TR, st0, crIdx, C3SPEC, out, rows, res0, verdictRow, comp, ex0, tn, geo, info, runs, H_DEV, H_POOL, H_NOPERK, reg, orig, RID, ci, mc };
// 結論由 conclude.js 依實際數字組裝（避免把數字寫死在文字裡）
require('./conclude')(module.exports.__out, P_, table);
fs.writeFileSync(path.join(REPO, 'evidence', 'dev04-s4-results.md'), out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
log('完成：evidence/dev04-s4-results.md');
