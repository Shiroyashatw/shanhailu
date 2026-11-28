'use strict';
/* 參考程式載入器。本分支只准新增 sim/dev04/ 與 evidence/dev04-*，所以前一輪的 sim/lib/*、sim/items/*、sim/civ/*
 * 不放進本分支，而是在執行時從 numbers/num-shl-b1-civ@0ad0b46f 用 `git archive` 取到暫存目錄（唯讀使用、不改動）。
 *  - refRoot('old')：sim/ 與 js/ 都取自 0ad0b46f（js/ 即 main@dd3843b 的遊戲本體）→ 回歸用，應逐位重現前一輪。
 *  - refRoot('new')：sim/ 取自 0ad0b46f，js/ 以 symlink 指向本工作樹的 js/（PR #16@10c5dae）→ 本輪所有計算用。
 * 需要本機 git 物件裡有 0ad0b46f：`git fetch origin numbers/num-shl-b1-civ`。暫存目錄可用環境變數 SHL_REF_DIR 指定。 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const REPO = path.resolve(__dirname, '..', '..');
const REF_SHA = '0ad0b46ff59a4dde5b4eb981edeb4d185128506f';
function refRoot(kind) {
  const base = process.env.SHL_REF_DIR || os.tmpdir();
  const dir = path.join(base, 'shl-dev04-ref-' + kind + '-' + REF_SHA.slice(0, 8));
  if (!fs.existsSync(path.join(dir, 'sim', 'lib', 'game.js'))) {
    fs.mkdirSync(dir, { recursive: true });
    execSync('git -C "' + REPO + '" archive ' + REF_SHA + ' sim' + (kind === 'old' ? ' js' : '') + ' | tar -x -C "' + dir + '"');
    if (kind === 'new') fs.symlinkSync(path.join(REPO, 'js'), path.join(dir, 'js'));
  }
  return dir;
}
module.exports = { REPO, REF_SHA, refRoot };
