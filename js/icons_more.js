/* 山海錄 — pixel icon set, v0.3 additions
 * Loaded AFTER js/icons.js (and after js/icons_npc.js when that exists).
 * Same format as icons.js: one char per pixel, '.' = transparent, any other
 * char indexes PAL (or the icon's own palette override).
 * Icons are rasterised at native size (16x16 / 24x24) and exposed as
 *   <i class="px ic-<id>"></i>
 * through an injected <style id="shl-icons-more">.
 * The registry is EXTENDED, not replaced: SHL_ICONS.has/list/size/raw answer
 * for the ids defined here first and fall through to whatever was registered
 * before this script ran.
 * Light comes from the top-left. No anti-aliasing, no gradients.
 */
(function (root) {
  'use strict';

  /* master palette — identical to icons.js, plus a few v0.3 extras at the end */
  var PAL = {
    '0': '#0d0c0a', // ink
    '1': '#2b2723', // soot
    '2': '#4b4640', // dark iron
    '3': '#736d64', // iron
    '4': '#9c958a', // light iron
    '5': '#c6bfb1', // silver
    'w': '#d8cfbd', // bone
    'W': '#f3ecdb', // bone highlight
    'd': '#6e2018', // dark cinnabar
    'r': '#b5382c', // cinnabar
    'R': '#dc6350', // light cinnabar
    'j': '#2f5a45', // dark jade
    'g': '#5f9a7a', // jade
    'G': '#93c9a8', // light jade
    'k': '#34481f', // dark leaf
    'l': '#64873a', // leaf
    'L': '#98b85a', // light leaf
    'o': '#7d5f24', // dark gold
    'y': '#c9a24a', // old gold
    'Y': '#ecd684', // light gold
    'n': '#40291a', // dark leather
    'b': '#75502f', // leather
    'B': '#a57a4a', // light leather
    't': '#cfa878', // tan / hemp
    'v': '#3b2a4a', // dark violet
    'p': '#6d4c80', // violet
    'P': '#a384bc', // light violet
    'e': '#6b3a1f', // dark copper
    'c': '#b26a3a', // copper
    'C': '#dd9a5e', // light copper
    'f': '#e07a2a', // flame
    'F': '#f4c552', // flame core
    'u': '#2a3944', // dark slate
    'z': '#3f5866', // slate shadow
    's': '#587888', // slate
    'S': '#8fb0bc', // mist
    'q': '#3f443a', // dark ash
    'a': '#6f7566', // ash
    'A': '#a3a894', // light ash
    'x': '#8a5a3e', // skin shadow
    'h': '#c08f6a', // skin
    'H': '#e0b48c', // skin light
    /* v0.3 extras */
    'm': '#3a1014', // blood shadow
    'i': '#8c2230', // blood-mist crimson
    'E': '#f2543a', // ember red (leaking light)
    '9': '#fffbea'  // hit-flash white
  };

  var ICONS = {};
  var ORDER = [];
  function def(id, rows, pal) {
    ICONS[id] = { rows: rows, pal: pal || null, size: rows.length };
    ORDER.push(id);
  }

  /* ─────────────────── enemies (24 × 24) ─────────────────── */

  /* 沼蛭 — fat swamp leech rearing up, ring mouth of teeth */
  def('leech', [
    '.......MMMMMMM..........',
    '.....MMOOOOONNMM........',
    '...MMOOOddddddNNMM......',
    '..MOQOOdrRrrRrdNNXM.....',
    '..MOQOdrWwWWwWrdNXM.....',
    '.MOOOdrW0W00W0WrdXXM....',
    '.MOOOdwW000000WwdXXM....',
    '.MOOOdr00w00w00rdXXM....',
    '.MONOdwW00mm00WwdXXM....',
    '.MONNdr0w0mm0w0rdXXM....',
    '.MONNdwW000000WwdXXM....',
    '..MNNNdrW0W00WrdXXXM....',
    '..MNNNNdrwrrwrdXXXXMMM..',
    '...MNNNNddddddXXXXNNNXM.',
    '....MMNNNTTrTTNXXNNNNNXM',
    '......MMNUTTTTTNNNNNNXXM',
    '........MXXXXXXNONNNNXXM',
    '....MMMMMUTTTTTTNONNNXXM',
    '..MMOOOONXXXXXXXNNONNXXM',
    '.MOOQOOONUTTTTTTTNNNXXM.',
    'MOOQOONNNUTTTTTTTNNXXXM.',
    'MOOONNNNXXXXXXXXXXXXXM..',
    'MONNNNXXUTTTTTTNXXXMM...',
    '.MMMMMMMMMMMMMMMMMM.....'
  ], { M: '#12150f', X: '#262b1e', N: '#414a2e', O: '#667244', Q: '#a8b57a', T: '#8f7d4c', U: '#c2b078' });

  /* 沼屍 — bloated drowned corpse draped in weeds */
  def('bogcorpse', [
    '......kkkkMMMMMM........',
    '.....klLllkOOOONMM......',
    '....klLlklkkOOONNNMk....',
    '....kLlkOlkOOOONNNNMlk..',
    '...klLkOOkQOOOONNNNNklk.',
    '...klkOOOlOOOONNNNNNMlk.',
    '...kLkOXXXlOONNXXXXNMk..',
    '...klkXXWWkXONXX00XXMl..',
    '....lkXWWSWXONX0000XMk..',
    '....kOXXWWXXNNXX00XXM...',
    '....MOOXXXXONNNXXXXNM...',
    '....MOOOOOO0N0NNNNNXM...',
    '....MOOOO000000NNNXXM...',
    '.....MOOO0w0ww0NNNXM....',
    '.....MNOO000000NNXXM....',
    '......MNNO0ss0NNXXM.....',
    '...MMMMMNNNssNNXXMMMMM..',
    '.MMOOOONMMNNsNXXMkNNNXXM',
    'MOOQOOONNNMMMsMMMNklNNXM',
    'MOQOOOONNNNNNsNNNNNkLlXM',
    'MOOOlONNNNNNNNNNNNNNklkM',
    'MOOklkNNNNNNNNNNNNNXXklM',
    'MOOkLkNNNXNNNNNNNNXXXXkM',
    'MOOklkNNXNNNNNNNNXXXXXXM'
  ], { M: '#10140f', X: '#2c3d30', N: '#4d6b54', O: '#7a9a7c', Q: '#a8c4a2' });

  /* 逃兵 — ragged soldier, cracked helmet, spear */
  def('deserter', [
    '..2......22222222.......',
    '.252...224444443322.....',
    '.2W2..24555444433332....',
    '.2W42.24W55440443332....',
    '.2542.24554440043332....',
    '..22..24544444033332....',
    '.rBnr2555544440333332...',
    'rdBnd.21111111111112....',
    '.dBn...nh0W0hx0W0xn.....',
    '..Bn...nHhxxhhhxxxn.....',
    '..Bn...nHdhhhxhhxxn.....',
    '..Bn...nHhdhxxxhxxn.....',
    '..Bn...nhx0w0w00x1n.....',
    '..Bn....n1x1x1x1xn......',
    '..Bn.....nx1x1xxn.......',
    '..Bn...dRrrrddrrrrd.....',
    '..Bn.nndrRrrrrrrrdnn....',
    '..Bnnbbbndrrrrrrdn333n..',
    '.nHhnBbbbbnnddddnn24342n',
    '.nhxnBBbbbbbnnnnb2434e2n',
    '..BnnBBtbbbbnbbbbb23e32n',
    '..BnnBtBbbbbbnbbbbb2222n',
    '..BnnBBbbbnbbbnbbbbnbbbn',
    '..Bnn.nBbbn.nbbn.nbbnbbn'
  ]);

  /* 紅霧妖 — faceless figure condensing out of crimson mist */
  def('wraith', [
    '........................',
    '..........XXXX..........',
    '........XXNNNNXX........',
    '.......XNNOOONNNX.......',
    '......XNOOQOONNNNX......',
    '......XNOOOONNNNNX......',
    '......XNWWXNNXWWNX......',
    '......XNWWWNNWWWNX......',
    '......XNNOONNNNNNX......',
    '.......XNNXXXNNXX.......',
    '...X...XXXMMMXXX....X...',
    '.....XXXNNXXNNNXXX......',
    '..X.XXNNNOOONNNNNXXX....',
    '...XXNNOOOOONNNNNNXXX.X.',
    '..XXNNOOQOOONNNNNNNXXX..',
    '.XXNNOOOOOONNNNXNNNNXX..',
    '.XNNOOOXNOONNNNXXNNNNXX.',
    'XXNNOOXXNOONNNNX.XNNNNX.',
    'XNNOOX.XNNONNNNX..XNNNXX',
    'XNOOX..XNNNNNNXX...XNNNX',
    'XNOX...XXNNNNNX..X..XNNX',
    'XNX.X...XNNNNXX.....XNX.',
    '.X....X.XXNNXX..X...X.X.',
    '...X.....XXXX.X....X....'
  ], { M: '#2a0a0e', X: '#5a141a', N: '#8c2230', O: '#b5382c', Q: '#dc6350' });

  /* 遠征亡卒 — undead expedition soldier, rusted lamellar, banner pole stub */
  def('soldier_dead', [
    '...................B....',
    '......2222222.....nBn...',
    '....22e44443322...nBndd.',
    '...24e5444c33332..nBnrrd',
    '...2454e44433e32..nBnrd.',
    '...245444ce33332..nBndr.',
    '..225554444333322.nBn.d.',
    '...2111111111112..nBn...',
    '...21WWwwwwww412..nBn...',
    '...21w000w000412..nBn...',
    '...21w0R0w0R0412..nBn...',
    '...21wwwwwwww412..nBn...',
    '...21wwww0www412..nBn...',
    '....1www0w0ww41...nBn...',
    '....14w1w1w1w41...nBn...',
    '.....14wwwww41....nBn...',
    '..22222123332122222nBn2.',
    '.24434322222222344e4332.',
    '243e3324343434343234e332',
    '2333332323e323232233c332',
    '2dd2dd2dddddddddd2dd2dd2',
    '243343243434e4343234e332',
    '23e3332323232c2322333332',
    '2dd2dd2dddddddddd2dd2dd2'
  ]);

  /* 酉神殘影 — shade of the fallen Rooster god: porcelain cracked, red light leaking */
  def('rooster', [
    '.......y...Y...y........',
    '......dRd.dRd.dRd..y....',
    '......dRrddRrddRrddRd...',
    '.....dRRrrRRrrRRrrrRrd..',
    '.....drrrdrrrrdrrrrrdd..',
    '......1WWWEww11ww4441...',
    '.....1WWWwr11wwwww4441..',
    '....1WWww11000www44441..',
    '..ooooooW0FEr0www44441..',
    'oYYYyyyow0Erd0www44441..',
    'oYyyyyooww000Ewww44441..',
    'oyo0E000wwwwwrEww44441..',
    'oo.oyyyo1wwwwwwEw4441...',
    '....oood1wwwwwwr44441...',
    '....drRrd1wwwww4E44441..',
    '....drRrd1Www4www4r4441.',
    '.....drd1WWww4www4w4E441',
    '......d.1Www4www4ww4wr41',
    '.......1WWwEwww4ww4ww441',
    '......1WWwrww.4ww4ww4w41',
    '.....1.WwEww.w4w.4ww4.41',
    '.......W.rw..w4...w4..4.',
    '......w...w...4..w....4.',
    '.........w.......4......'
  ]);

  /* 守墓俑 — terracotta tomb guardian, cracked clay */
  def('golem', [
    '.............MMM........',
    '............MOONM.......',
    '...........MOONNM.......',
    '.........MMMONNXM.......',
    '.......MMOOOMMMNMM......',
    '......MNNONNONNXNXM.....',
    '.....MNONNONNONXNXXM....',
    '.....MOQQOOOONNNNNXM....',
    '.....MOMMMMOONMMMMXM....',
    '.....MOXMGXOONXMGXXM....',
    '.....MOOXXOOONNXXNXM....',
    '.....MOOOOOONXNN0NXM....',
    '.....MOOOOOOXXN00NXM....',
    '.....MOOMMMMNMMMM0XM....',
    '......MOOOMMMMMN0XM.....',
    '......MNOOOONNNNXXM.....',
    '.......MMNOONNNXMM......',
    '....MMMMMNNNNNXXMMMMM...',
    '..MMOOOOMMXXXXXMMNNNNMM.',
    '.MOOQOOONNMMMMMNNNNNNXXM',
    'MOQOMOOOMNNNMNNNMNNNMXXM',
    'MOOOMOQOMNNNMNONMNNXMXXM',
    'MMMMMMMMMMMMMMMMMMMMMMMM',
    'MOOMOOOMNNNMNNNMNNXMXXXM'
  ], { M: '#24140e', X: '#5c3626', N: '#8a553c', O: '#b07a58', Q: '#d2a07a' });

  /* 墓主 — mummified noble in a jade burial suit sewn with gold thread */
  def('tomblord', [
    '.22222222222211111111111',
    '.00000000000000000000000',
    '..y.y..11111111111..y.y.',
    '..G.r..1yYyyyyyyo1..r.G.',
    '..y.y.jjjjjjjjjjjjj.y.y.',
    '..r.G.jGGgoGGgoGggj.G.r.',
    '..y.y.jGggoGggogggj.y.y.',
    '....G.joooYoooYoooj.G...',
    '......jG00oGggo00gj.....',
    '......jg0PoGggo0Pgj.....',
    '......joooYoooYoooj.....',
    '......jnxnoGgjogggj.....',
    '......jxnnoggjogggj.....',
    '......joooYoooYoooj.....',
    '......jgggo000ogggj.....',
    '.......jggo0w0oggj......',
    '........jjjooojjj.......',
    '...jjjjjjjooooojjjjjjj..',
    '.jjGGgoGGgoGggoGggogggjj',
    'jGgoGGgoGggoGggogggogggj',
    'jggoGggoGggogggogggogggj',
    'joooYoooYoooYoooYoooYooj',
    'jGgoGggoGggogggogggogggj',
    'jggogggogggogggogggogggj'
  ]);

  /* ───────────────────── items (16 × 16) ───────────────────── */

  /* 淬毒油 */
  def('poison_oil', [
    '................',
    '......nBBn......',
    '......nbbn......',
    '.....vvvvvvl....',
    '......vpPvlL....',
    '......vttvl.....',
    '.....vpPppvl....',
    '....vpPppppvL...',
    '...vpPpppppvvl..',
    '...vpPppppvvvl..',
    '...vpppppvvvvL..',
    '...vppppvvvvv...',
    '....vvvvvvvv.l..',
    '.............L..',
    '................',
    '................'
  ]);

  /* 解毒丸 */
  def('antidote', [
    '................',
    '................',
    '................',
    '................',
    '....kkkkkkkk....',
    '...kLwWwllwWwk..',
    '..kLlWwwllWwwlk.',
    '.kLllw44llw44llk',
    '.kLlllllwWwllllk',
    '.kllllllWwwllllk',
    '..kllkllw44llkk.',
    '...kkllklllllk..',
    '.....kkllllkk...',
    '.......kkkk.....',
    '................',
    '................'
  ]);

  /* 粗茶 */
  def('tea', [
    '......S....S....',
    '.....S......S...',
    '.....S...S..S...',
    '......S.S..S....',
    '......S.S..S....',
    '.........S......',
    '..nnnnnnnnnnnn..',
    '.nBkkllllllkkbn.',
    '.nBBkkkkkkkkbbn.',
    '.nBBBbbbbbbbben.',
    '..nBtBbbbbbbbn..',
    '..nBBbbbbbbben..',
    '...nBbbbbbben...',
    '....nnbbbbnn....',
    '.....neeeen.....',
    '......nnnn......'
  ]);

  /* 沼鐵 */
  def('bog_iron', [
    '................',
    '................',
    '.....kkk..kk....',
    '...1klLlk1lLk1..',
    '..1cklllcCklkc1.',
    '.1cCckkcCccekce1',
    '.1cCccecccce2ee1',
    '1ecccc21ccee22e1',
    '1eccce211ecce2e1',
    '1eecee2ccCcee221',
    '.1eee21cCccee21.',
    '.1e2221eccee221.',
    '..1221.1eee221..',
    '...11...11111...',
    '................',
    '................'
  ]);

  /* 蛭腺 */
  def('leech_gland', [
    '................',
    '......mm........',
    '.....mRrm.......',
    '.....mrim.......',
    '....mmrrmmm.....',
    '...mrRRrrrrmm...',
    '..mrRWRrrrrrim..',
    '..mRWRrrrdrriim.',
    '..mRRrrrdrrriim.',
    '..mrrrrdrrriiim.',
    '..mrrrrrrriiidm.',
    '...mrrrriiiidm..',
    '....mmiiiidmm...',
    '......mmmmm..R..',
    '.............r..',
    '................'
  ]);

  /* 軍牌 */
  def('dogtag', [
    '......bttb......',
    '.....b....b.....',
    '.....t....t.....',
    '......t..t......',
    '.....2t22t2.....',
    '....245tt432....',
    '....24500432....',
    '....2444e332....',
    '....24114c32....',
    '....244e3332....',
    '....2e113132....',
    '....2c433e32....',
    '....24113322....',
    '....2e3c3322....',
    '.....222222.....',
    '................'
  ]);

  /* 神骨碎片 */
  def('bone_relic', [
    '..........Y.....',
    '...y......11....',
    '.........1W1..y.',
    '........1WW1....',
    '..Y.....1Ww41...',
    '.......1WWw41...',
    '......1WWyw41.y.',
    '......1WwYw41...',
    '.....1WWyww41...',
    '.y...1WwYw441...',
    '....1WWyww41....',
    '....1Www4411..Y.',
    '...1Ww44111.....',
    '...1w411....y...',
    '....11..........',
    '.......y........'
  ]);

  /* 線香 */
  def('incense', [
    '....b...b...b...',
    '....yo..yo..yo..',
    '....yo..yo..yo..',
    '.....yo.yo.yo...',
    '.....yo.yo.yo...',
    '.....yo.yo.yo...',
    '......yoyoyo....',
    '......yoyoyo....',
    '......yoyoyo....',
    '.....drRrrrrd...',
    '......rdrdrd....',
    '......rdrdrd....',
    '......rdrdrd....',
    '......rdrdrd....',
    '......r.r.r.....',
    '................'
  ]);

  /* 血苔 */
  def('blood_moss', [
    '................',
    '................',
    '................',
    '......R...R.....',
    '...R.drd.drd.R..',
    '..drddrRddRrdrd.',
    '.drRrdrrrrrrdRrd',
    '.drrrrRrdrRrrrrd',
    'drRrdrrrrrrrdrRd',
    'drrrrrdrRrdrrrrd',
    'mdrdrrrrrrrrdrdm',
    '.mddmdrdrdrdmddm',
    '..m33m2dmd2m33m.',
    '...2332222332...',
    '....22222222....',
    '................'
  ]);

  /* ─────────── combat actions / techniques (16 × 16) ─────────── */

  def('a_attack', [
    '.Y............Y.',
    '....nnnnnnnnn...',
    '...nHHnHHnHhnn..',
    'Y.nHHHnHHnHhnhn.',
    '..nHHhnHhnhhnhn.',
    '..nHhhnhhnhhnxn.',
    '..nnnnnnnnnnnxn.',
    '..nHHHHHHhhnxxn.',
    '..nHhhhhhhxnxn..',
    '...nnnnnnnnxxn..',
    '...nhhhhhxxxn...',
    '....nhhhxxxn....',
    '....nnnnnnnn....',
    '................',
    '................',
    '................'
  ]);

  def('a_defend', [
    '................',
    '..uuuuuuuuuuuu..',
    '..uSSSSSsssszu..',
    '..uSSssssssszu..',
    '..uSsssWWssszu..',
    '..uSssWWWWsszu..',
    '..uSssWWWWszzu..',
    '..uSsssWWsszzu..',
    '..uSsssssszzzu..',
    '...uSsssszzzu...',
    '...uSssszzzzu...',
    '....uSsszzzu....',
    '.....uszzzu.....',
    '......uzzu......',
    '.......uu.......',
    '................'
  ]);

  def('a_wait', [
    '................',
    '.....WWWWWW.....',
    '...WWSSSSSSWW...',
    '..WS........SW..',
    '..W...WWWW...W..',
    '.WS..WSSSSW..SW.',
    '.W..WS....SW..W.',
    '.W..W..WW..W..W.',
    '.W..W...W..W..W.',
    '.W..WS.SW..W.SW.',
    '.WS..WWW..SW.W..',
    '..W......SW.....',
    '..WS....SW......',
    '...WWWWWW.......',
    '....SSSS........',
    '................'
  ]);

  def('a_retreat', [
    '................',
    '..r.r.r.........',
    '.rrrrr..........',
    '.rRRrr..........',
    '..rRrr..........',
    '..rrr...........',
    '..rrrr...r.r.r..',
    '...rr.....rrrrr.',
    '..........rrRRr.',
    '..ddd.....rrRr..',
    '...........rrr..',
    '...d......rrrr..',
    '...........rr...',
    '................',
    '..........ddd...',
    '...........d....'
  ]);

  /* 橫斬 */
  def('t_slash', [
    '................',
    '................',
    '................',
    '.....WWWWWW.....',
    '...WWWWWWWWWW...',
    '.WWWYYYYYYYWWWW.',
    'WWYYyyoooyyYYWWW',
    'WYyo......oyYYWW',
    'Yy..........oyYW',
    'y............oYW',
    '..............yW',
    '...............Y',
    '................',
    '................',
    '................',
    '................'
  ]);

  /* 奪命 */
  def('t_execute', [
    '.......oo.......',
    '.......nb.......',
    '.......nb.......',
    '.....oyyyyo.....',
    '......2W42......',
    '......2W42......',
    '......2W42......',
    '.....d2W42d.....',
    '....dr2W42rd....',
    '...drR2W42rrd...',
    '...dRr2W42rrd...',
    '...drrr24rrrd...',
    '...drrrr2rrrd...',
    '....drrrrrrd....',
    '.....dddddd.....',
    '................'
  ]);

  /* 突刺 */
  def('t_thrust', [
    '................',
    '................',
    '...WWWWWW.......',
    '..........22....',
    '.55555....2W22..',
    '........r.2WW52.',
    'BBBBBBBBBB2W5552',
    'nnnnnnnnnn24442.',
    '........d.2422..',
    '.55555....22....',
    '................',
    '...WWWWWW.......',
    '................',
    '................',
    '................',
    '................'
  ]);

  /* 掃腿 */
  def('t_sweep', [
    '................',
    '................',
    '................',
    '................',
    '..............nn',
    '............nnBB',
    '..........nnBBnn',
    '........nnBBnn..',
    '......nnBBnn....',
    'W...nnBBnn.....W',
    'WW.nBBnn......WW',
    '.WWWnn......WWW.',
    '..WWWWWWWWWWWW..',
    '....55555555....',
    '.t..t.....t...t.',
    '................'
  ]);

  /* 重劈 */
  def('t_cleave', [
    '..............nn',
    '............nnBn',
    '..2222....nnBBn.',
    '.245542.nnBBnn..',
    '.2455442BBnn....',
    '.24554442n......',
    '.2W5554442......',
    '2WW55544442.....',
    '2WWW5555442.....',
    '.2WWWWWW52......',
    '...22222........',
    '.nnn.YWY.nnn....',
    'nBBbn.Y.nBbbn...',
    'nBbbn...nbbbn...',
    'nbbbbn.nbbbbn...',
    'nnnnnn.nnnnnn...'
  ]);

  /* 震地 */
  def('t_quake', [
    '.............nB.',
    '............nBn.',
    '...........nBn..',
    '....2222..nBn...',
    '...245542nBn....',
    '..2455544Bn.....',
    '..245554432.....',
    '..244544332.....',
    '...2443332......',
    '....22222..W....',
    'W.Y.fFFf..Y.....',
    'aaa0af0a0aaaaaaa',
    'qq0qq0q0q00qqqqq',
    'q0qq0qq0qqq0qqqq',
    '0qqq0qqq0qqq0qqq',
    '................'
  ]);

  /* 瞄準 */
  def('t_aim', [
    '.............tW.',
    '............tBtW',
    '....rrrrr...B.t.',
    '..rrr...rrrB....',
    '.rr.......Br....',
    '.r...rrr.B.r....',
    'rr..rr.rB..rr...',
    'r...r.W5r...r...',
    'r...r.52r...r...',
    'r...r...r...r...',
    'rr..rr.rr..rr...',
    '.r...rrr...r....',
    '.rr.......rr....',
    '..rrr...rrr.....',
    '....rrrrr.......',
    '................'
  ]);

  /* 連珠 */
  def('t_volley', [
    '................',
    '.......55W......',
    '........B5......',
    '.......B.5......',
    '......B...55W...',
    '.....B.....B5...',
    '....B.....B.5...',
    '..rB.....B...55W',
    '..Rr....B.....B5',
    '.d.....B.....B.5',
    '.....rB.....B...',
    '.....Rr....B....',
    '....d.....B.....',
    '........rB......',
    '........Rr......',
    '.......d........'
  ]);

  /* 擒拿 */
  def('t_grapple', [
    '................',
    '.....nnnnnnn....',
    '.....nHHhhxn....',
    '....nHHHhhhxn...',
    '...nHHHHHhhhxn..',
    '...nHHHHHhhhhn..',
    '..nnHnHHnHhnhhn.',
    'ddddHnHHnHhnhddd',
    'rRRnHnHhnhhnhrrr',
    'rrrnhnhhnhhnxrrr',
    'rrrrnnnnnnnnrrrr',
    'dddddddddddddddd',
    '................',
    '................',
    '................',
    '................'
  ]);

  /* 內勁 */
  def('t_inner', [
    '.....yYYYYy.....',
    '...yY......Yy...',
    '..y..n.n.n.n.y..',
    '.Y..nHnHnHnHn.Y.',
    '.Y..nHnHnHnhn.Y.',
    'Y...nHnHnhnhn..Y',
    'Y.n.nHHHHhhhn..Y',
    'Y.nHnHHHhhhhn..Y',
    'Y.nHHHHYYhhhn..Y',
    'Y..nHHYFFYhhn..Y',
    '.Y.nHHHYYhhxn.Y.',
    '.Y..nHhhhhxxn.Y.',
    '..y..nhhhxxn.y..',
    '...yY.nnnnn.Yy..',
    '.....yYYYYy.....',
    '................'
  ]);

  /* 盾擊 */
  def('t_bash', [
    '............W...',
    '..........Y.W.Y.',
    '...........YWY..',
    '.........WWWFWWW',
    '...nnnnn...YWY..',
    '..nBBBBbn.Y.W.Y.',
    '.nBBBBbbbn..W...',
    'nBBB22bbbbn.....',
    'nBB2542bbbn.....',
    'nBB2442bbbn.....',
    'nBbb22bbbbn.....',
    '.nbbbbbbbn......',
    '..nbbbbbn.......',
    '...nnnnn........',
    '................',
    '................'
  ]);

  /* 遊身 */
  def('t_evade', [
    '................',
    '................',
    '................',
    '...zz..ss...WW..',
    '...zz..ss...WW..',
    '..zzz.sss..WWW..',
    '.zzzzsssssWWWWW.',
    'z.zzs.ss.W.WS...',
    '..zz..ss...WS...',
    '..zzz.sss..WWS..',
    '.zz.zss.s.WW.S..',
    '.z...s...sW...S.',
    'zz..ss...WW...S.',
    '................',
    '................',
    '................'
  ]);

  /* 崩岩擊 */
  def('s_beng', [
    '................',
    '.........2222...',
    '........244432..',
    '.......24544.32.',
    '.......2444.F332',
    '.nnnnnW.22.F2332',
    'nHHHHhnYF.F.2432',
    'nHHHnhnFFF.24332',
    'nHHhnhnYF.F.2332',
    'nhhhnxnW.22.F232',
    '.nnnnn.2443.F32.',
    '.......24433.2..',
    '........24332...',
    '.........2222...',
    '................',
    '................'
  ]);

  /* 調息 */
  def('s_xi', [
    '.....GGGGGG.....',
    '...GG......GG...',
    '..G....jj....G..',
    '.G....jGGj....G.',
    '.G....jGgj....G.',
    'G......jj......G',
    'G....jjggjj....G',
    'G...jGggggGj...G',
    'G...jgjggjgj...G',
    'G...jgjggjgj...G',
    '.G.jjgjggjgjj.G.',
    '.GjGGgggggggGjG.',
    '..jgggjjjjgggj..',
    '...jjjGGGGjjj...',
    '.....GGGGGG.....',
    '................'
  ]);

  /* 疾行 */
  def('s_jixing', [
    '................',
    '.WW.............',
    '.WWWW...........',
    '..wWWWW.nnnn....',
    '.WWWWWWWnBBbn...',
    '..wwWWWWnBbbn...',
    '....wwWWnBbbn...',
    '.55...wwnBbbn...',
    '........nBbbnn..',
    '.555...nBBbbbbnn',
    '......nBBbbbbbbn',
    '..55..nBbbbbbbbn',
    '......nnnnnnnnnn',
    '......1111111111',
    '................',
    '................'
  ]);

  /* 破陣 */
  def('s_pozhen', [
    '.......nB.......',
    '.......nB.......',
    '......rnBr......',
    '......dnBd......',
    '.......nB.......',
    '.......22.......',
    '.zzz..2W52..zzz.',
    'zSssz.2W52.zSssz',
    'zSsszY2W52YzSssz',
    'zssszS2W52szsssz',
    'zsszzSs25sszzssz',
    '.zsz.zs..sz.zsz.',
    '..z...z..z...z..',
    '.....Y.YY.Y.....',
    '................',
    '................'
  ]);

  /* 鴉影 */
  def('s_yaying', [
    '................',
    '................',
    '....ssss........',
    '...szzzzs.......',
    '.33zzrzzzs......',
    '333zzzzzzzs.....',
    '...zuzzzzzzs.s..',
    '....uuzzzzzzs...',
    '....uuuzzzzzz.s.',
    '.....uuuzzzzz.z.',
    '......uuuzzz.z.u',
    '.......uuuz.u.z.',
    '.......3.3.u...u',
    '......33.33...u.',
    '................',
    '................'
  ]);

  /* ───────────────────── status (16 × 16) ───────────────────── */

  def('st_bleed', [
    '................',
    '.....d..........',
    '....drd.........',
    '....drd.....d...',
    '...drRrd...drd..',
    '...drRrd...drd..',
    '..drRrrrd.drRrd.',
    '..drRrrrd.drrrd.',
    '..drrrrrd..ddd..',
    '..drrrrrd.......',
    '...drrrd...d....',
    '....ddd...drd...',
    '.........drRrd..',
    '.........drrrd..',
    '..........ddd...',
    '................'
  ]);

  def('st_poison', [
    '..........L.....',
    '...LL....L.L....',
    '..L..L....L.....',
    '...LL..v........',
    '......vpv...L...',
    '......vpv.......',
    '.....vpPpv......',
    '....vpPpppv.....',
    '...vpPpplLpv....',
    '...vpPppLlpv....',
    '...vppppppvv....',
    '...vpppppvvv....',
    '....vppvvvv.....',
    '.....vvvvv...L..',
    '................',
    '................'
  ]);

  /* 破甲 */
  def('st_break', [
    '................',
    '.222222..22222..',
    '.2554442r244332.',
    '.254442r2443332.',
    '.25442r24433332.',
    '.254442r2433332.',
    '.2544442r243332.',
    '.244442r2443332.',
    '.24442r24433332.',
    '..24442r2433322.',
    '..244442r243322.',
    '...24442r24332..',
    '....2442r2432...',
    '.....222.222....',
    '................',
    '................'
  ]);

  /* 失衡 */
  def('st_stagger', [
    '................',
    '................',
    '.........Y......',
    '...Y....YWY.....',
    '..YWY.ooYoo.....',
    '...Yooo...ooo...',
    '..oo........oo..',
    '.oo..........o..',
    '.y...........yY.',
    '.yy.........yYWY',
    '..yyy.....yyyY..',
    '....yyyYyyy.....',
    '......YWY.......',
    '.......Y........',
    '................',
    '................'
  ]);

  /* 侵蝕 */
  def('st_corrupt', [
    '................',
    '..i.......i.....',
    '...i.....i..i...',
    '...ri...ir.i....',
    '....ri.ir.r.....',
    '.i...rrrrr......',
    '..ii.rRRRri..ii.',
    '....irRERRrrii..',
    '...irrRRRrri....',
    '..ii.rrrrr.ii...',
    '.i...ir.ri...i..',
    '....ir...ri.....',
    '...ii.....ir....',
    '..i.........i...',
    '................',
    '................'
  ]);

  def('st_guard', [
    '................',
    '................',
    '...........G....',
    '..........GGG...',
    '.2222222.GGGGG..',
    '.2554432...G....',
    '.2544332...G....',
    '.2444332...G....',
    '.2443332...G....',
    '.2443332........',
    '..24332.........',
    '..23332.........',
    '...232..........',
    '....2...........',
    '................',
    '................'
  ]);

  /* 蓄力 */
  def('st_charge', [
    '................',
    '.f.....f.....f..',
    '..f....f....f...',
    '...f.......f....',
    '.......F........',
    '......fFf.......',
    '.....fFWFf......',
    '.ff.fFWWWFf.ff..',
    '.....fFWFf......',
    '......fFf.......',
    '.......F........',
    '...f.......f....',
    '..f....f....f...',
    '.f.....f.....f..',
    '................',
    '................'
  ]);

  def('st_evade', [
    '................',
    '................',
    '.........WWW....',
    '........W...W...',
    '............W...',
    '.SWWWWWWWWWW....',
    '................',
    '...SWWWWWWWWWWW.',
    '................',
    '.SWWWWWWWW......',
    '..........W.....',
    '......W...W.....',
    '.......WWW......',
    '................',
    '................',
    '................'
  ]);

  /* ──────────────────── map nodes (16 × 16) ──────────────────── */

  /* 官道驛站 */
  def('n_station', [
    '..n.............',
    '..nrr...........',
    '..nrRrr.........',
    '..nrr...........',
    '..n....uuuuuu...',
    '..n...uSSSSSsu..',
    '..n..uSsSsSsSsu.',
    '..n.uuuuuuuuuuuu',
    '..n..wwwwwwwwt..',
    '..n..wwnnwwwwt..',
    '..n..wwnnwwnwt..',
    '..n..wwnnwwwwt..',
    '.nnn.wwnnwwwwt..',
    '2222222222222222',
    '................',
    '................'
  ]);

  /* 破曉營 */
  def('n_camp', [
    '...........n....',
    '...........nrrrr',
    '...........nrYYr',
    '......n....nYYYY',
    '.....ntn...n....',
    '....ntttn..n....',
    '...ntttBbn.n....',
    '..ntttnBBbnn....',
    '.ntttn0nBBbn....',
    '.nttn000nBbbn...',
    'ntttn000nBBbbn..',
    'nttn00000nBbbbn.',
    'nnnn00000nnnnnn.',
    '.22222222222222.',
    '................',
    '................'
  ]);

  /* 野徑岔口 */
  def('n_cross', [
    '................',
    '.......nn.......',
    '...nnnnnBn......',
    '..nBBBBBBn......',
    '.nBBbbbbbn......',
    '..nbbbbbBnnnnn..',
    '...nnnnnBBBBBBn.',
    '......nBBbbbbbbn',
    '......nbBbbbbbn.',
    '......nnBnnnnn..',
    '.......nB.......',
    '.......nB.......',
    'tt.....nB.....tt',
    '.ttt...nB...ttt.',
    '...tttttttttt...',
    '......tttt......'
  ]);

  /* 腐骨沼 */
  def('n_swamp', [
    '................',
    '...b........b...',
    '...b..l.....b.l.',
    '...l.l...w..l.l.',
    '.l.l.l..w.w.l.l.',
    '.l.l.l.w..w.ll..',
    '.l.ll..w.w..l...',
    '..ll.zzwzwzzzl..',
    '.zzzzuuwuwuuuzz.',
    'zuuuu0uuu0uuuuuz',
    'zu00uuuu0uuu00uz',
    '.zuuuzzuuuuzuuz.',
    '..zzzuuuu0uuzz..',
    '....zzzzzzzz....',
    '................',
    '................'
  ]);

  /* 酉神裂口 */
  def('n_rift', [
    '.....R..........',
    '........R.......',
    '..R.............',
    '......d.....R...',
    '.1111drd11111...',
    '12221dERd222211.',
    '122221dERd222221',
    '1222221dEFd22221',
    '122221dEFRd22221',
    '12221dRFEd222221',
    '1221dEFRd2222221',
    '.121dREd2222221.',
    '..11dERd222211..',
    '....1drd1111....',
    '......d.........',
    '................'
  ]);

  /* 撿骨師營地 */
  def('n_bonecamp', [
    '................',
    '................',
    '....n...........',
    '...nBn.....111..',
    '...nBbn...1wWw1.',
    '..nBBbbn..10w01.',
    '..nBnbbn..1www1.',
    '.nBB0nbbn..141..',
    '.nBn00nbn.wWWWw.',
    'nBBn000nbnw444w.',
    'nBn0000nbwWWWWWw',
    'nnn0000nnw44444w',
    '.222222221111111',
    '................',
    '................',
    '................'
  ]);

  /* 鴉巢 */
  def('n_crow', [
    '................',
    '.4rs............',
    '..zszz.......sr4',
    '...zzz1.n..zzsz.',
    '...n.n..n.1zzz..',
    '...nbn.nb..n.n..',
    '....nbnbn.nbn...',
    '.n...nbbnnbn....',
    '..bn..nbbbn..n..',
    '...bnnnbbnnnb...',
    '......nbBn......',
    '......nbBn......',
    '......nbBn......',
    '.....nbbBn......',
    '....nnbbbnn.....',
    '................'
  ]);

  /* 無名古塚 */
  def('n_tomb', [
    '................',
    '................',
    '......kkkk......',
    '....kklLllkk....',
    '...klLllllllk...',
    '..klLlllllllkk..',
    '.klLl222222lllk.',
    '.klll244443lllk.',
    'klLll240003llllk',
    'kllll240003llkkk',
    'kllkl240003lklkk',
    'kkllk240003kllkk',
    '.11112222221111.',
    '................',
    '................',
    '................'
  ]);

  def('n_unknown', [
    '......zz........',
    '....zSSSSSz.....',
    '...zSs...sSz.z..',
    '...SS.....SS....',
    '.z..z....zSS..z.',
    '........zSSs....',
    '..z....zSSz.....',
    '.......SSz...z..',
    '.......SS.......',
    '...z....z.......',
    '.......SS....z..',
    '..z....SS.......',
    '.zzz.z....zz.zz.',
    'zzzzzzzz.zzzzzzz',
    '................',
    '................'
  ]);

  /* ─────────────────── faction emblems (16 × 16) ─────────────────── */

  /* 破曉軍團 */
  def('f_dawn', [
    '.......yy.......',
    '..y....yy....y..',
    '...y...YY...y...',
    '....y......y....',
    '......oooo......',
    '....ooYYYYoo....',
    '.y.oYYYYYYyyo.y.',
    '..oYYWYYYYyyyo..',
    '..oYYYYYYyyyyo..',
    '...o............',
    'yy.o2222222222..',
    'ybbyWWWWWWWW552.',
    'yy.o2222222222..',
    '...o............',
    '................',
    '................'
  ]);

  /* 鴉衛 */
  def('f_crow', [
    '................',
    '.....33333......',
    '...33wwwww33....',
    '..3wwww0000w3...',
    '..3www1200003...',
    '.3www10r0000w3..',
    '.3ww11000000w3..',
    '.31000000000w3..',
    '.3www2000000w3..',
    '.3wwwww0000003..',
    '..3wwww100003...',
    '..3wwwww10003...',
    '...33www1033....',
    '.....33333......',
    '................',
    '................'
  ]);

  /* 天星商會 */
  def('f_star', [
    '................',
    '.......Y........',
    '.....yyYyy......',
    '...yyooYooyy....',
    '..yooooYooooy...',
    '..yoYooYooYoy...',
    '.yoooYoYoYoooy..',
    '.yooooYYYooooy..',
    'YYYYYYYWYYYYYYY.',
    '.yooooYYYooooy..',
    '.yoooYoYoYoooy..',
    '..yoYooYooYoy...',
    '..yooooYooooy...',
    '...yyooYooyy....',
    '.....yyYyy......',
    '.......Y........'
  ]);

  /* ─────────────────── street figures (16 × 16) ─────────────────── */

  def('fig_man', [
    '......0000......',
    '.....011110.....',
    '....01111110....',
    '....01HHHH10....',
    '....0H0HH0h0....',
    '....0HHHHhh0....',
    '.....0hhhx0.....',
    '....00000000....',
    '...0sSSSSssz0...',
    '...0sSSSSssz0...',
    '...0HbbbbbbH0...',
    '....0sSsszz0....',
    '....0nn00nn0....',
    '....0nn00nn0....',
    '....01100110....',
    '.....00..00.....'
  ]);

  def('fig_woman', [
    '.......00.......',
    '......0110......',
    '.....011y10.....',
    '....01111110....',
    '....01HHHH10....',
    '....0H0HH0h0....',
    '.....0HHhh0.....',
    '.....000000.....',
    '....0rRRrrd0....',
    '...0HrRRrrdH0...',
    '....0tttttt0....',
    '....0rRrrrd0....',
    '...0rRRrrrdd0...',
    '...0rRrrrrdd0...',
    '...0rrrrrddd0...',
    '....00000000....'
  ]);

  def('fig_child', [
    '................',
    '................',
    '................',
    '................',
    '.....00..00.....',
    '....01100110....',
    '....01111110....',
    '....0HHHHHh0....',
    '....0H0HH0h0....',
    '.....0HHhh0.....',
    '.....000000.....',
    '....0HLLllH0....',
    '....00Lllk00....',
    '.....0nnnn0.....',
    '.....010010.....',
    '......0..0......'
  ]);

  def('fig_soldier', [
    '.......r.....5..',
    '......0r0...050.',
    '.....022220.050.',
    '....02455320.B..',
    '....02222220.B..',
    '....0H0HH0h0.B..',
    '.....0HHhh0..B..',
    '....00000000.B..',
    '...0244444320B..',
    '...0243434320B..',
    '...0H2dddd23HB..',
    '....02343430.B..',
    '....02200220.B..',
    '....0nn00nn0.B..',
    '....01100110.B..',
    '.....00..00.....'
  ]);

  def('fig_elder', [
    '................',
    '......0000......',
    '.....0wWWw0.....',
    '....0wHHHHw0....',
    '....0H0HH0h0....',
    '.nn.0wHHhhw0....',
    '.n...0wWw40.....',
    '.n..00wWw400....',
    '.n.0aAwWw4aq0...',
    '.n.0aAAw4aaq0...',
    '.nH0aAAAaaaq0...',
    '.n..0aAaaaq0....',
    '.n..0aAaaaq0....',
    '.n..0aAaaqq0....',
    '.n..0aaaaqq0....',
    '.n..00000000....'
  ]);

  def('fig_hooded', [
    '......0000......',
    '.....0pPpv0.....',
    '....0pPppvv0....',
    '....0p0000v0....',
    '....0pS00Sv0....',
    '....0pv00vv0....',
    '....0ppvvvv0....',
    '...00pPpvvv00...',
    '...0pPppvvvv0...',
    '...0pPppvvvv0...',
    '...0pPpppvvv0...',
    '...0pppppvvv0...',
    '...0ppppvvvv0...',
    '...0pppvvvvv0...',
    '...0vvvvvvvv0...',
    '....00000000....'
  ]);

  /* ─────────────────── hit effects (24 × 24) ─────────────────── */

  def('fx_slash', [
    '....................WWW.',
    '.................WWW99Y.',
    '..............WWW999YYy.',
    '............WWW999YYyy..',
    '..........WWW999YYyy....',
    '........WWW999YYyy......',
    '.......WW999YYYy........',
    '......WW999YYyy.........',
    '.....WW999YYyy..........',
    '....WW999YYy............',
    '....W999YYy.............',
    '...WW99YYy..............',
    '...W999YYy..............',
    '..WW99YYy...............',
    '..W999YYy...............',
    '..W99YYy................',
    '.WW99YYy................',
    '.W99YYy.................',
    '.W99Yy..................',
    '.W9YYy..................',
    '.W9Yy...................',
    '.W9y....................',
    '.WYy....................',
    '.Wy.....................'
  ]);

  def('fx_blunt', [
    '...........ff...........',
    '...........fF...........',
    '...........FF...........',
    '...f.......FF.......f...',
    '....fF.....FF.....Ff....',
    '.....FF...FWWF...FF.....',
    '......FFF.FWWF.FFF......',
    '.......FWFWWWWFWF.......',
    '........WWW99WWW........',
    '.......FWW9999WWF.......',
    '......FWW999999WWF......',
    'ffFFFFWWW999999WWWFFFFff',
    'ffFFFFWWW999999WWWFFFFff',
    '......FWW999999WWF......',
    '.......FWW9999WWF.......',
    '........WWW99WWW........',
    '.......FWFWWWWFWF.......',
    '......FFF.FWWF.FFF......',
    '.....FF...FWWF...FF.....',
    '....fF.....FF.....Ff....',
    '...f.......FF.......f...',
    '...........FF...........',
    '...........Ff...........',
    '...........ff...........'
  ]);

  def('fx_arrow', [
    '.....................S.W',
    '....................S.W5',
    '...................S.W5.',
    '..................S.W5.S',
    '.................S.W5.S.',
    '................S.W5.S..',
    '.................W5.S...',
    '................W5.S....',
    '...............W5.S.....',
    '..............W5........',
    '.............W5.........',
    '.......W....W5..........',
    '.......W9..W5...........',
    '.......W99W5............',
    '.......W999Y............',
    '..YY..W9999Y............',
    '......WYYYYYY...........',
    '..fFY.W.................',
    '.....Y.Y................',
    '....F...F...............',
    '...f..Y..f..............',
    '......F.................',
    '......f.................',
    '........................'
  ]);

  def('fx_claw', [
    '...............r........',
    '..............r.........',
    '.........r....Rr.....r..',
    '........r.....Rr....r...',
    '........Rr...Rr.....Rr..',
    '.......Rr....Rr....Rr...',
    '.......REr..REr....REr..',
    '......REr...REr...REr...',
    '......REr..REr....REr...',
    '.....REr...REr...REr....',
    '.....REEr.REEr...REEr...',
    '.....REEr.REEr...REEr...',
    '....REEr..REEr..REEr....',
    '....REEr.REEr...REEr....',
    '....REEr.REEr...REEr....',
    '....REr..REEr...REr.....',
    '...REr...REEr..REr......',
    '...REr..REr....REr......',
    '...Rr...REr....Rr.......',
    '...Rr...REr....Rr.......',
    '...r....Rr.....r........',
    '........Rr..............',
    '.......r................',
    '.......r................'
  ]);

  /* ───────────────────────── UI (16 × 16) ───────────────────────── */

  /* 探查 */
  def('ui_explore', [
    '......nnnn......',
    '.....n....n.....',
    '.....n....n.....',
    '....nnnnnnnn....',
    '....n222222n....',
    '...nfFFFFFFfn...',
    '..nfFYYYYYFFfn..',
    '..nfFYWWYYFffn..',
    '..nfFYWWYFFffn..',
    '..nfFYYYFFfffn..',
    '..nfFFFFFffffn..',
    '...nfffffffdn...',
    '....n222222n....',
    '....nnnnnnnn....',
    '.......rr.......',
    '.......dr.......'
  ]);

  def('ui_talk', [
    '................',
    '..1111111111....',
    '.1WWWWWWWWWw1...',
    '1WWwwwwwwwwww1..',
    '1Ww3333w33www1..',
    '1Wwwwwwwwwwww1..',
    '1Ww33w33333ww1..',
    '1Wwwwwwwwwwww1..',
    '1Www333w33ww41..',
    '.1wwwwwwwww41...',
    '..111ww41111....',
    '....1w41........',
    '...1w41.........',
    '...141..........',
    '...11...........',
    '................'
  ]);

  def('ui_codex', [
    '................',
    '..uuuuuuuuuuuu..',
    '..uSSSSSSSzssu..',
    '..uSwwwssswwwu..',
    '..uSw1wssszssu..',
    '..uSwwwssszssu..',
    '..uSw1wssswwwu..',
    '..uSwwwssszszu..',
    '..uSw1wssszszu..',
    '..uSwwwssswwwu..',
    '..uSsssssszszu..',
    '..uSrrrssszszu..',
    '..uSrRrssswwwu..',
    '..uSrrrzzzzzzu..',
    '..uuuuuuuuuuuu..',
    '...5555555554...'
  ]);

  def('ui_rep', [
    '..drrd....drrd..',
    '..dRrrd..dRrrd..',
    '...dRrrddRrrd...',
    '....dRrrRrrd....',
    '.....dRrrrd.....',
    '......dood......',
    '.....ooyyoo.....',
    '....oyYYYyyo....',
    '...oyYWYyyyyo...',
    '...oyYYyoyyyo...',
    '...oyYyoooyyo...',
    '...oyyyyoyyoo...',
    '....oyyyyyoo....',
    '.....oooooo.....',
    '................',
    '................'
  ]);

  /* ───────────────────────── runtime ───────────────────────── */

  var hasOwn = Object.prototype.hasOwnProperty;
  function own(id) { return hasOwn.call(ICONS, id); }

  function colourOf(icon, ch) {
    if (icon.pal && hasOwn.call(icon.pal, ch)) return icon.pal[ch];
    if (hasOwn.call(PAL, ch)) return PAL[ch];
    return null;
  }

  function build() {
    if (typeof document === 'undefined' || !document.createElement) return;
    var canvas = document.createElement('canvas');
    if (!canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var css = [];
    for (var i = 0; i < ORDER.length; i++) {
      var id = ORDER[i];
      var icon = ICONS[id];
      var n = icon.size;
      canvas.width = n;
      canvas.height = n; // also clears the canvas
      for (var y = 0; y < n; y++) {
        var row = icon.rows[y] || '';
        for (var x = 0; x < n; x++) {
          var ch = row.charAt(x);
          if (!ch || ch === '.') continue;
          var col = colourOf(icon, ch);
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      var url;
      try { url = canvas.toDataURL('image/png'); } catch (e) { return; }
      css.push('.ic-' + id + '{background-image:url(' + url + ')}');
    }
    var style = document.getElementById ? document.getElementById('shl-icons-more') : null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'shl-icons-more';
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = css.join('\n');
  }

  /* extend the registry: our ids first, everything else falls through */
  var base = root.SHL_ICONS;
  if (!base || typeof base !== 'object') base = {};
  function baseCall(name, id, fallback) {
    try {
      if (typeof base[name] === 'function') return base[name](id);
    } catch (e) { /* fall through */ }
    return fallback;
  }

  var api = {};
  for (var k in base) if (hasOwn.call(base, k)) api[k] = base[k]; // keep any extras a previous script added

  api.has = function (id) { return own(id) || !!baseCall('has', id, false); };
  api.list = function () {
    var out = baseCall('list', undefined, []);
    out = (out && out.slice) ? out.slice() : [];
    var seen = {}, i;
    for (i = 0; i < out.length; i++) seen[out[i]] = true;
    for (i = 0; i < ORDER.length; i++) if (!seen[ORDER[i]]) out.push(ORDER[i]);
    return out;
  };
  api.size = function (id) { return own(id) ? ICONS[id].size : (baseCall('size', id, 0) || 0); };
  /* debug / tests: raw grid + resolved palette for one icon */
  api.raw = function (id) {
    if (!own(id)) return baseCall('raw', id, null) || null;
    var icon = ICONS[id], pal = {}, c;
    for (c in PAL) if (hasOwn.call(PAL, c)) pal[c] = PAL[c];
    if (icon.pal) for (c in icon.pal) if (hasOwn.call(icon.pal, c)) pal[c] = icon.pal[c];
    return { rows: icon.rows.slice(), palette: pal, size: icon.size };
  };

  root.SHL_ICONS = api;

  try { build(); } catch (e) { /* icons are decorative; never break the game */ }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
