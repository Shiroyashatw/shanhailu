/* shanhailu-check29-1128：字面／註解 diff 檢查（只讀，不改遊戲程式）
 * 用法：node docs/evidence/shots-shanhailu-check29-1128/token-check.js <base-sha> [paths...]
 * 對 git diff -U0 <base> HEAD -- js tests 的每一對變更行（每個 hunk 內 -/+ 依序配對）：
 *   1. 去掉註解與字串字面後，剩餘的非字串 token 序列必須相同；
 *   2. 字串字面個數必須相同；
 *   3. 純 ASCII 的字串字面（id、key、pattern 名等）必須完全相同，只允許含非 ASCII（中文）的字串變動；
 *   4. NPC 條目（np_xxx: { name: '...' }）的 name 值不得變更；
 *   5. 每個 hunk 的刪／增行數必須相同（不得有純增或純刪）。
 * 任何不符列出檔案、行號與內容並以 exit 1 判 FAIL。
 */
'use strict';
const { execFileSync } = require('child_process');
const base = process.argv[2];
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['js', 'tests'];
if (!base) { console.error('need base sha'); process.exit(2); }

function lex(line) {
  const toks = []; const strs = []; let i = 0; const n = line.length;
  while (i < n) {
    const c = line[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && line[i + 1] === '/') break;                       // 行註解
    if (c === '/' && line[i + 1] === '*') { const e = line.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '*' && line[i + 1] === '/' && toks.length === 0) { i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1; let s = '';
      while (j < n && line[j] !== c) { if (line[j] === '\\') { s += line[j] + (line[j + 1] || ''); j += 2; continue; } s += line[j]; j++; }
      strs.push(s); toks.push('<STR>'); i = j + 1; continue;
    }
    const m = /^([A-Za-z_$][\w$]*|\d+(?:\.\d+)?|===|!==|==|!=|<=|>=|=>|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|\.\.\.|\?\.|\?\?|.)/.exec(line.slice(i));
    toks.push(m[0]); i += m[0].length;
  }
  return { toks, strs };
}
const npcName = (l) => { const m = /\b(np_\w+)\s*:\s*\{\s*name\s*:\s*'([^']*)'/g; const out = {}; let r; while ((r = m.exec(l))) out[r[1]] = r[2]; return out; };

const diff = execFileSync('git', ['diff', '-U0', base, 'HEAD', '--', ...paths], { encoding: 'utf8', maxBuffer: 64 << 20 });
let file = null; let hunks = []; let cur = null;
for (const l of diff.split('\n')) {
  if (l.startsWith('+++ ')) { file = l.slice(6); continue; }
  if (l.startsWith('--- ') || l.startsWith('diff ') || l.startsWith('index ')) continue;
  const h = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l);
  if (h) { cur = { file, oldStart: +h[1], newStart: +h[2], minus: [], plus: [] }; hunks.push(cur); continue; }
  if (!cur) continue;
  if (l.startsWith('-')) cur.minus.push(l.slice(1)); else if (l.startsWith('+')) cur.plus.push(l.slice(1));
}
let pairs = 0; let strChanged = 0; const fails = [];
for (const h of hunks) {
  if (h.minus.length !== h.plus.length) { fails.push(`${h.file}:${h.newStart} hunk -${h.minus.length}/+${h.plus.length} 行數不等`); continue; }
  h.minus.forEach((a, k) => {
    const b = h.plus[k]; pairs++;
    const ln = `${h.file}:${h.newStart + k}`;
    const A = lex(a); const B = lex(b);
    if (A.toks.join(' ') !== B.toks.join(' ')) fails.push(`${ln} 非字串 token 不同\n  - ${a.trim()}\n  + ${b.trim()}`);
    if (A.strs.length !== B.strs.length) fails.push(`${ln} 字串個數不同 ${A.strs.length}→${B.strs.length}`);
    else A.strs.forEach((s, q) => {
      if (s !== B.strs[q]) { strChanged++; if (/^[\x00-\x7f]*$/.test(s) && /^[\x00-\x7f]*$/.test(B.strs[q])) fails.push(`${ln} ASCII 字串（id 類）變更 '${s}'→'${B.strs[q]}'`); }
    });
    const na = npcName(a); const nb = npcName(b);
    for (const k2 of new Set([...Object.keys(na), ...Object.keys(nb)])) if (na[k2] !== nb[k2]) fails.push(`${ln} NPC name 變更 ${k2}: '${na[k2]}'→'${nb[k2]}'`);
  });
}
console.log(`base=${base} paths=${paths.join(',')} hunks=${hunks.length} pairs=${pairs} changed-string-literals=${strChanged}`);
if (fails.length) { console.log('FAIL'); fails.forEach((f) => console.log(f)); process.exit(1); }
console.log('PASS：每對變更行去掉字串與註解後 token 相同；ASCII/id 字串與 NPC name 未變');
