/* shanhailu-check14-1128 獨立驗收腳本（一次性；不改被驗程式）
 * 期望值依 SPEC-01 §6 自行推導：Nnamed 灰窯 3、渡陰 1（§6 表列，另以 data.js PLACES.street 與畫面 .fig 數交叉核對）；
 * Npatrol = Geff（0–3）；Nanon = max(0, min(round(P/10), 10 − Nnamed − Npatrol))；同屏 ≤ 10。round 取四捨五入（.5 進位）。 */
'use strict';
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT='/home/user/shanhailu';const OUT=process.argv[2]||path.join(ROOT,'docs/evidence/shots-shanhailu-check14-1128');
const SPEC_NNAMED={huiyao:3,duyin:1};
const expect=(tid,P,G)=>{const named=SPEC_NNAMED[tid];const patrol=G;const anon=Math.max(0,Math.min(Math.floor(P/10+0.5),10-named-patrol));return {named,patrol,anon,total:named+patrol+anon};};
const res=[];const ck=(n,ok,d)=>{res.push(!!ok);console.log((ok?'PASS':'FAIL')+'  '+n+(d===undefined?'':'  — '+JSON.stringify(d)));};
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port+'/index.html?seed=777&fresh=1&origin=drifter&fx=0';
const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});const pg=await ctx.newPage();
const errs=[];pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});pg.on('pageerror',e=>errs.push('pageerror '+e.message));
const open=async(q)=>{await pg.goto(base+(q||''));await pg.waitForSelector('[data-testid=town]');};
const put=(tid,P,G)=>pg.evaluate(([tid,P,G])=>{const S=SHL.state;S.scene='town';S.loc=tid;S.street=null;S.townTab=null;S.world.towns[tid].P=P;S.world.towns[tid].Geff=G;SHL.setTab(null);
  const pl=document.querySelector('.plan');return {fig:pl.querySelectorAll('.fig').length,anon:pl.querySelectorAll('.walker.anon').length,patrol:pl.querySelectorAll('.walker.patrol').length,all:pl.querySelectorAll('.fig,.walker').length};},[tid,P,G]);
await open();
// Nnamed 依據交叉核對
const dataStreet=await pg.evaluate(()=>({huiyao:SHL_DATA.PLACES.huiyao.street.length,duyin:SHL_DATA.PLACES.duyin.street.length}));
ck('Nnamed 依據：SPEC §6 灰窯 3／渡陰 1 ＝ data.js PLACES.street 長度',dataStreet.huiyao===3&&dataStreet.duyin===1,dataStreet);
// 全掃描：P 0–100 × Geff 0–3（另加 .5 邊界與非整數 P）
const Ps=[];for(let P=0;P<=100;P++)Ps.push(P);Ps.push(4.5,5,14.9,15,44.5,99.4);
let n=0,bad=[];const table={};
for(const tid of ['huiyao','duyin'])for(const P of Ps)for(let G=0;G<=3;G++){n++;const e=expect(tid,P,G);const d=await put(tid,P,G);
  if(d.fig!==e.named||d.patrol!==e.patrol||d.anon!==e.anon||d.all!==e.total||d.all>10)bad.push({tid,P,G,e,d});
  if(Number.isInteger(P)&&P%10===0)table[tid+' P'+P+' G'+G]=d.fig+'+'+d.patrol+'+'+d.anon+'='+d.all;}
ck('全掃描 兩鎮 × P(0..100 步1＋邊界6值) × Geff 0..3 共 '+n+' 組：畫面有職位者／巡邏／路人／總數＝規格推導值，且 ≤10',bad.length===0,{bad:bad.slice(0,5)});
console.log('表（有職位者+巡邏+路人=同屏，P 每 10）：');for(const tid of ['huiyao','duyin']){for(let G=0;G<=3;G++){let row=tid+' G'+G+':';for(let P=0;P<=100;P+=10)row+=' P'+P+'='+table[tid+' P'+P+' G'+G];console.log('  '+row);}}
const r=(tid,G)=>expect(tid,80,G).anon/expect(tid,20,G).anon;
const d80=await put('huiyao',80,1),d20=await put('huiyao',20,1);
ck('AC-D2 灰窯 Geff=1：P20 vs P80 路人 2 vs 6（≥2 倍）',d20.anon===2&&d80.anon===6,{P20:d20,P80:d80,ratio:d80.anon/d20.anon});
// 移動：多時間點座標，且在街上（平面圖內、腳底不落在建築點擊框內）
async function motion(tid,P,G){await put(tid,P,G);const samples=[];
  for(let k=0;k<6;k++){samples.push(await pg.evaluate(()=>{const pr=document.querySelector('.plan').getBoundingClientRect();
     const blds=[...document.querySelectorAll('.plan .bld:not(.gate)')].map(e=>{const b=e.getBoundingClientRect();return {id:e.dataset.testid,l:b.left,r:b.right,t:b.top,b:b.bottom};});
     return [...document.querySelectorAll('.walker')].map(e=>{const b=e.getBoundingClientRect();const fx=(b.left+b.right)/2,fy=b.bottom;
       const inB=blds.filter(q=>fx>q.l&&fx<q.r&&fy>q.t&&fy<q.b).map(q=>q.id);
       return {k:e.classList.contains('patrol')?'patrol':'anon',x:Math.round(fx-pr.left),y:Math.round(fy-pr.top),inPlan:b.left>=pr.left-1&&b.right<=pr.right+1&&b.top>=pr.top-1&&b.bottom<=pr.bottom+1,inB};});}));
   await pg.waitForTimeout(700);}
  const W=samples[0].length;const per=[];
  for(let i=0;i<W;i++){const pts=samples.map(s=>s[i]);const uniq=new Set(pts.map(p=>p.x+','+p.y)).size;
    const path=pts.slice(1).reduce((a,p,j)=>a+Math.hypot(p.x-pts[j].x,p.y-pts[j].y),0);
    per.push({kind:pts[0].k,uniq,path:Math.round(path),inPlan:pts.every(p=>p.inPlan),inBld:[...new Set(pts.flatMap(p=>p.inB))],pts:pts.map(p=>[p.x,p.y])});}
  return per;}
for(const [tid,P,G] of [['huiyao',80,1],['huiyao',50,3],['duyin',80,3]]){const per=await motion(tid,P,G);
  const pat=per.filter(p=>p.kind==='patrol');
  console.log('座標 '+tid+' P'+P+' G'+G+'（6 點、間隔 700ms，平面圖座標，腳底）：');per.forEach((p,i)=>console.log('  #'+i+' '+p.kind+' 不同座標 '+p.uniq+'/6 路程 '+p.path+'px 建築框內 '+JSON.stringify(p.inBld)+' '+JSON.stringify(p.pts)));
  ck('移動 '+tid+' P'+P+' G'+G+'：巡邏 '+pat.length+' 名，每名 6 個時間點至少 5 個不同座標、路程 >40px',pat.length===G&&pat.every(p=>p.uniq>=5&&p.path>40),pat.map(p=>({u:p.uniq,path:p.path})));
  ck('移動 '+tid+' P'+P+' G'+G+'：所有走動者都在移動（≥4 不同座標）',per.every(p=>p.uniq>=4),per.map(p=>p.uniq));
  ck('街道範圍 '+tid+' P'+P+' G'+G+'：全部樣本在平面圖內、腳底不落在建築點擊框內',per.every(p=>p.inPlan&&p.inBld.length===0),per.map(p=>p.inBld));}
// 截圖（1280×720）＋無捲動＋文字重疊
async function shot(name,tid,P,G){await put(tid,P,G);await pg.waitForTimeout(1200);
  const L=await pg.evaluate(()=>{const boxes=[...document.querySelectorAll('.plan .bld > span, .plan .fig > span, .townbar, .walker')].map(e=>({c:e.className,t:(e.textContent||'').trim(),r:e.getBoundingClientRect()})).filter(o=>o.r.width>0);
    const txt=boxes.filter(o=>!o.c.includes('walker'));let ov=[];for(let i=0;i<txt.length;i++)for(let j=i+1;j<txt.length;j++){const a=txt[i].r,b=txt[j].r;if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)ov.push(txt[i].t+'|'+txt[j].t);}
    const wtxt=[...document.querySelectorAll('.walker')].map(e=>e.innerText.trim()).filter(Boolean);
    const de=document.documentElement;return {sw:de.scrollWidth,sh:de.scrollHeight,bw:document.body.scrollWidth,bh:document.body.scrollHeight,ov,walkerText:wtxt};});
  ck('截圖 '+name+'：無捲動（≤1280×720）、標籤無重疊、走動者無可見文字',L.sw<=1280&&L.sh<=720&&L.bw<=1280&&L.bh<=720&&L.ov.length===0&&L.walkerText.length===0,L);
  await pg.screenshot({path:path.join(OUT,name)});console.log('SHOT '+name);}
await shot('c14-01-huiyao-high-P80-G1.png','huiyao',80,1);
await shot('c14-02-huiyao-low-P20-G1.png','huiyao',20,1);
await shot('c14-03-duyin-G3-P80.png','duyin',80,3);
await shot('c14-04-duyin-G3-P20.png','duyin',20,3);
ck('console 0 error（含 pageerror）',errs.length===0,errs.slice(0,5));
// 影格：walk=0 對照，兩情境 × 3 次 × 5 秒，另 CPU 降速 4x
async function fps(q,tid,P,G,thr){await open(q);await put(tid,P,G);const cdp=await ctx.newCDPSession(pg);await cdp.send('Emulation.setCPUThrottlingRate',{rate:thr});await pg.waitForTimeout(500);
  const o=await pg.evaluate(()=>new Promise(res=>{const ts=[];const t0=performance.now();const f=t=>{ts.push(t);if(t-t0<5000)requestAnimationFrame(f);else{const d=ts.slice(1).map((x,i)=>x-ts[i]).sort((a,b)=>a-b);
    res({fps:+((ts.length-1)/((ts[ts.length-1]-ts[0])/1000)).toFixed(1),p50:+d[Math.floor(d.length*.5)].toFixed(1),p95:+d[Math.floor(d.length*.95)].toFixed(1),max:+d[d.length-1].toFixed(1),long50:d.filter(x=>x>50).length,on:document.querySelectorAll('.plan .fig,.plan .walker').length});}};requestAnimationFrame(f);}));
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await cdp.detach();return o;}
const F=[];for(const thr of [1,4])for(const [tid,P,G] of [['huiyao',80,1],['duyin',80,3]])for(let i=0;i<3;i++)for(const q of ['&walk=0','']){const o=await fps(q,tid,P,G,thr);F.push({thr,tid,walk:q?0:1,...o});console.log('FPS cpu×'+thr+' '+tid+' P'+P+' G'+G+' walk='+(q?0:1)+' run'+(i+1)+' '+JSON.stringify(o));}
for(const thr of [1,4])for(const tid of ['huiyao','duyin']){const a=F.filter(f=>f.thr===thr&&f.tid===tid&&f.walk===0),b=F.filter(f=>f.thr===thr&&f.tid===tid&&f.walk===1);const av=x=>+(x.reduce((s,f)=>s+f.fps,0)/x.length).toFixed(1);
  ck('AC-J6 影格 cpu×'+thr+' '+tid+'：walk=1（同屏 '+b[0].on+'）平均 fps ≥ walk=0（同屏 '+a[0].on+'）×0.95，且無 >50ms 長幀',b[0].on===10&&av(b)>=av(a)*0.95&&b.every(f=>f.long50===0),{walk0:av(a),walk1:av(b),long:b.map(f=>f.long50)});}
await br.close();srv.close();const p=res.filter(Boolean).length;console.log('\n結果：'+p+'/'+res.length+' PASS');process.exit(p===res.length?0:1);})().catch(e=>{console.error(e);process.exit(2);});
