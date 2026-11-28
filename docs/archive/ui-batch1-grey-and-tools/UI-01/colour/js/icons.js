/* 山海錄 — pixel icon set (v0.2.5)
 * Hand-authored pixel grids. One char per pixel, '.' = transparent,
 * any other char indexes PAL (or the icon's own palette override).
 * On load every icon is rasterised to an offscreen canvas at native size
 * (16x16 items / 24x24 enemies) and exposed as a CSS class:
 *   <i class="px ic-<id>"></i>
 * Light comes from the top-left. No anti-aliasing, no gradients.
 */
(function (root) {
  'use strict';

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
    'H': '#e0b48c'  // skin light
  };

  var ICONS = {};
  var ORDER = [];
  function def(id, rows, pal) {
    ICONS[id] = { rows: rows, pal: pal || null, size: rows.length };
    ORDER.push(id);
  }

  /* ───────────────────────── items ───────────────────────── */

  def('herb_zx', [
    '................',
    '..........dr....',
    '.........drRr...',
    '.........rRYr...',
    '..........rrd...',
    '....kk....l.....',
    '...kLLk..kl.....',
    '...kLlLk.l..kk..',
    '....klllkl.kLLk.',
    '.....kkkllkLllk.',
    '.......klkllkk..',
    '.......klkkk....',
    '......kl........',
    '.....kl.........',
    '....kk..........',
    '................'
  ]);

  def('leaf_qx', [
    '................',
    '...........jjjj.',
    '.........jjGGgj.',
    '.......jjGGGjgj.',
    '......jGWGGjggj.',
    '.....jGWGGjgggj.',
    '....jGWGGjggggj.',
    '....jGGGjgggggj.',
    '...jGGGjgggggj..',
    '...jGGjgggggj...',
    '...jGjggggjj....',
    '...jjggjjj......',
    '..jgjjj.........',
    '.jgj............',
    '.jj.............',
    '................'
  ]);

  def('vine_du', [
    '................',
    '.....L.....L....',
    '....vppppppv....',
    '..LvpPPppppppv..',
    '...vPpvvvvvvppvL',
    '..vpPv......vpv.',
    '..vpv..vppv.vpv.',
    '.Lvpv.vpPPpvvpv.',
    '..vpv.vpvvpppv..',
    '..vppv.vv.vvv.L.',
    '...vppvv........',
    '.L..vpPppvv..L..',
    '.....vvpPppvv...',
    '........vvppPv..',
    '..........vvv...',
    '................'
  ]);

  var ORE = [
    '................',
    '................',
    '......MMMMM.....',
    '....MMOOOONMM...',
    '...MOOQOOONNNM..',
    '..MOOOOOONNNNM..',
    '..MOQOOONNNNXXM.',
    '.MOOOOOMNNNXXXM.',
    '.MOOONMMMNXXXXM.',
    '.MNNNMNNNMXXQXM.',
    '.MNNMNNNNNMXXXM.',
    '..MMNNNQNNXMXM..',
    '...MXXNNNXXXMM..',
    '....MMMMMMMM....',
    '................',
    '................'
  ];
  def('ore_fe', ORE, { M: '#2b2723', X: '#4b4640', N: '#736d64', O: '#9c958a', Q: '#b26a3a' });
  def('ore_cu', ORE, { M: '#4a2414', X: '#7a3f22', N: '#b26a3a', O: '#dd9a5e', Q: '#93c9a8' });
  def('ore_xs', ORE, { M: '#3b2a4a', X: '#15131a', N: '#221f2b', O: '#383248', Q: '#a384bc' });

  var HIDE = [
    '................',
    '.MMM..MMMM..MMM.',
    '.MOOMMOOOOMMONM.',
    '..MOOOOOOOOONM..',
    '...MOOOOONONM...',
    '...MOONOOONNM...',
    '...MOOOONONNM...',
    '...MOOONOONNM...',
    '...MONOOONNNM...',
    '...MOOONONNNM...',
    '..MOOONONNNNNM..',
    '.MOONMMNNMMNNNM.',
    '.MNNM.MNNM.MNNM.',
    '.MMM..MNNM..MMM.',
    '.......MM.......',
    '................'
  ];
  def('hide', HIDE, { M: '#40291a', N: '#75502f', O: '#a57a4a' });
  def('hide_fine', HIDE, { M: '#c9a24a', N: '#b26a3a', O: '#dd9a5e' });
  def('smoked', HIDE, { M: '#2a211b', N: '#48382e', O: '#6b5648' });

  def('meat', [
    '................',
    '........ddddd...',
    '......ddRRRRrd..',
    '.....dRRWRRrrrd.',
    '....dRRWRRrrrrd.',
    '....dRRRRrrwrrd.',
    '....dRRRrrwWwrd.',
    '....drRrrrrwrrd.',
    '....ddrrrrrrrd..',
    '....1wdrrrdd....',
    '...1wW1ddd......',
    '..1wW1..........',
    '.11W1...........',
    '1wWWw1..........',
    '1w11w1..........',
    '.1..1...........'
  ]);

  var POT = [
    '................',
    '.......nn.......',
    '......nBBn......',
    '......nbbn......',
    '......MOOM......',
    '.....MOQONM.....',
    '....MOQOONNM....',
    '....MOOONNXM....',
    '.....MyyyyM.....',
    '....MOOONNXM....',
    '...MOQOONNNXM...',
    '...MOQOONNNXM...',
    '...MOOONNNXXM...',
    '...MNONNNXXXM...',
    '....MNNNXXXM....',
    '.....MMMMMM.....'
  ];
  def('pot_hp', POT, { M: '#4a1610', X: '#6e2018', N: '#b5382c', O: '#dc6350', Q: '#f3b9a8' });
  def('pot_ft', POT, { M: '#1d3a2c', X: '#2f5a45', N: '#5f9a7a', O: '#93c9a8', Q: '#d6efe0' });

  def('ration', [
    '..............t.',
    '..........nnnt..',
    '.........nYCcn..',
    '.........nCcen..',
    '.........nceen..',
    '......nnntnnn...',
    '.....nYCcn......',
    '.....nCcen......',
    '.....nceen......',
    '..nnntnnn.......',
    '.nYCcn..........',
    '.nCcen..........',
    '.nceen..........',
    '.tnnn...........',
    't...............',
    '................'
  ]);

  def('bread', [
    '................',
    '................',
    '................',
    '.....oooooo.....',
    '...ootttttyoo...',
    '..ottWttttttyo..',
    '.otWtttBttttyyo.',
    '.ottttttttBtyyo.',
    '.otBtttttttyyBo.',
    '.oytttBtttyyyBo.',
    '.obyyttttyyyBbo.',
    '..obByyyyyBBbo..',
    '...oobbbbbboo...',
    '.....oooooo.....',
    '................',
    '................'
  ]);

  def('salt', [
    '................',
    '......b..b......',
    '......bttb......',
    '.......rr.......',
    '.....bbttbb.....',
    '....bwwtttBb....',
    '...bwWwttttBb...',
    '...bwWwttttBb...',
    '..bwwwtttttBBb..',
    '..bwwttttttBBb..',
    '..bwtttttttBBb..',
    '..btttttttBBBb..',
    '..bBtttttBBBbbW.',
    '...bbbbbbbbb.WWw',
    '...........WwWWw',
    '................'
  ]);

  def('pig_iron', [
    '................',
    '................',
    '................',
    '.....222222.....',
    '.....255542.....',
    '....24444432....',
    '....24333322....',
    '....22222222....',
    '.222222..222222.',
    '.255542..255542.',
    '2444443224444432',
    '2433332224333322',
    '2222222222222222',
    '................',
    '................',
    '................'
  ]);

  def('yam', [
    '................',
    '............nn..',
    '..........nntBn.',
    '.........ntWtBn.',
    '........ntWttBnn',
    '.......ntWttBn..',
    '......ntWtbBbn..',
    '.....ntWttBn.n..',
    '....ntWtbBn.....',
    '...ntWttBnn.....',
    '..ntWttBn.n.....',
    '..ntttbBn.......',
    '.nttBBnn........',
    '.ntBnn.n........',
    '..nn............',
    '................'
  ]);

  def('scroll', [
    '................',
    '................',
    '................',
    '................',
    '..nnnnnnnnnnnn..',
    'nnWWWWWrrWWWWWnn',
    'BnwwwwwrRwwwwwnB',
    'BnwwwwwrrwwwwwnB',
    'bntttttrrtttttnb',
    'nnBBBBBrdBBBBBnn',
    '..nnnnnrdnnnnn..',
    '.....rrd.rd.....',
    '....rd....rd....',
    '................',
    '................',
    '................'
  ]);

  def('beast_core', [
    '.......f........',
    '..f.........f...',
    '.....oooooo.....',
    '...ooyyYYyyoo...',
    '..oyyYWWYyyffo..',
    '..oyYWWYYyyffo..',
    '.oyYYWYYyyyfffo.',
    '.oyYYYYyyyffffo.',
    '.oyyYYyyyfffffo.',
    '.oyyyyyyffffeeo.',
    '..oyyyfffffeeo..',
    '..offffffeeeeo..',
    '...ooffeeeeoo...',
    '.....oooooo.....',
    '..f..........f..',
    '.......f........'
  ]);

  def('parcel', [
    '................',
    '................',
    '..nnnnnnnnnnnn..',
    '.ntttttoottttBn.',
    '.nttWttoottttBn.',
    '.ntttttoottttBn.',
    '.nttttrrrrtttBn.',
    '.noooorRRroooon.',
    '.noooorRrroooon.',
    '.nttttrrrdtBBBn.',
    '.ntttttootBBBBn.',
    '.nttttBooBBBBbn.',
    '.nBBBBBooBBBbbn.',
    '..nnnnnnnnnnnn..',
    '................',
    '................'
  ]);

  /* ─────────────────────── equipment ─────────────────────── */

  def('w_blade', [
    '..............2.',
    '............2252',
    '...........25W42',
    '..........25W42.',
    '.........25W42..',
    '........25W42...',
    '.......25W42....',
    '......25W42.....',
    '..oy.25W42......',
    '...oyy242.......',
    '....oyyo2.......',
    '...nboyyo.......',
    '..nbBn.oyo......',
    '.nbBn...o.......',
    'oyBn............',
    '.oo.............'
  ]);

  def('w_saber', [
    '.............22.',
    '............2W52',
    '...........25W52',
    '..........25W542',
    '..........25W542',
    '.........25W542.',
    '........25W5442.',
    '.......25W542...',
    '......25W542....',
    '..o..25W42......',
    '..oyo2542.......',
    '...oyyo2........',
    '...nboyo........',
    '..nbBn.o........',
    '.rbBn...........',
    'rr.n............'
  ]);

  def('w_axe', [
    '................',
    '....222...nBn...',
    '..2255422.nBn...',
    '.25W55544nnBn...',
    '.25W5554444Bn2..',
    '25W555444433B42.',
    '25W5554444nBn2..',
    '25W555444.nBn...',
    '.255544...nBn...',
    '.2444422..nBn...',
    '..2222....nBn...',
    '..........nBn...',
    '..........nBn...',
    '..........oyo...',
    '..........nbn...',
    '..........nnn...'
  ]);

  def('w_spear', [
    '...............2',
    '.............252',
    '...........25W52',
    '..........25W542',
    '..........2W542.',
    '.........r2442..',
    '.......rRrBnr...',
    '......drRBnrR...',
    '......drBn.rd...',
    '......dBn..d....',
    '......Bn........',
    '.....Bn.........',
    '....Bn..........',
    '...Bn...........',
    '..Bn............',
    '.Bn.............'
  ]);

  def('w_hammer', [
    '................',
    '..222222222222..',
    '.25555444433322.',
    '.25W54444333322.',
    '.25y4444333y322.',
    '.24444433333222.',
    '..222222222222..',
    '.......nBn......',
    '.......nBn......',
    '.......oyo......',
    '.......nBn......',
    '.......nBn......',
    '.......nBn......',
    '.......nBn......',
    '.......nbn......',
    '.......nnn......'
  ]);

  def('w_bow', [
    '.........nBn....',
    '.......nnBnw....',
    '......nBBn.w....',
    '.....nBbn..w....',
    '....nBbn...w....',
    '....nBn....w....',
    '...nBbn....w....',
    '...nrrn....w....',
    '...nrrn....w....',
    '...nBbn....w....',
    '....nBn....w....',
    '....nBbn...w....',
    '.....nBbn..w....',
    '......nBBn.w....',
    '.......nnBnw....',
    '.........nBn....'
  ]);

  def('o_shield', [
    '................',
    '.....333333.....',
    '...33BBnBBb33...',
    '..3tBBBnBBbbb3..',
    '.3tBBBBnBBbbbb2.',
    '.3BBBBBnBbbbbb2.',
    '3BBBBB3443bbbbb2',
    '3BBBBB4W54bbbbb2',
    '3BBBBb4554bbbbb2',
    '3BBBbb3442bbbbn2',
    '.3BBbbbn2bbbbn2.',
    '.3Bbbbbnbbbbnn2.',
    '..2bbbbnbbbnn2..',
    '...22bbnbbn22...',
    '.....222222.....',
    '................'
  ]);

  def('o_ironshield', [
    '................',
    '.22222222222222.',
    '.25555554444432.',
    '.25y44444443y32.',
    '.25444222233332.',
    '.25442555423332.',
    '.25442W54423332.',
    '.25442544323332.',
    '.24442443323332.',
    '.24444222233322.',
    '..24y443333y32..',
    '...2444333332...',
    '....24433332....',
    '.....243332.....',
    '......2332......',
    '.......22.......'
  ]);

  def('o_dagger', [
    '................',
    '................',
    '..22............',
    '..2W52..........',
    '...25W52........',
    '....25W52.......',
    '.....25W52......',
    '......25W52.o...',
    '.......2542yo...',
    '........24yo....',
    '.......oyyobn...',
    '......oyo.nbBn..',
    '...........nbBn.',
    '............nyyo',
    '.............oo.',
    '................'
  ]);

  def('h_cap', [
    '................',
    '................',
    '................',
    '.....bbbbbb.....',
    '...bbttttBBbb...',
    '..bttWttbtBBBb..',
    '.bttWtttbttBBBb.',
    '.bttttttbtttBBb.',
    'bttttttbttttBBBb',
    'bttttttbtttBBBBb',
    'dRrrrrrrrrrrrrdd',
    'drrrrrrrrrrrrddd',
    '.dddddddddddddrd',
    '.............rRd',
    '.............rd.',
    '................'
  ]);

  def('h_helm', [
    '.......rR.......',
    '......rRrd......',
    '......drrd......',
    '.....22yy22.....',
    '...2255544322...',
    '..25W554443332..',
    '..25W544443332..',
    '.25554444433332.',
    '.2yyyyyyyyyyyo2.',
    '.25421111112332.',
    '.25421111112332.',
    '.24421111112332.',
    '..242......232..',
    '..222......222..',
    '................',
    '................'
  ]);

  def('c_robe', [
    '................',
    '....bbb..bbb....',
    '..bbtttbbtttbb..',
    '.bttttswstttttb.',
    'bttttttswttttBBb',
    'btttbttswstbBBBb',
    'bttb.bttswtb.bBb',
    '.bb..btttsBb..bb',
    '.....brrrrrb....',
    '.....bttttBb....',
    '....bttttBBBb...',
    '....btttttBBb...',
    '...btttttBBBBb..',
    '...bttttttBBBb..',
    '...bbbbbbbbbbb..',
    '................'
  ]);

  def('c_leather', [
    '................',
    '...nnn....nnn...',
    '..nBBBn..nBBbn..',
    '..nBBBBnnBBbbn..',
    '.nBtBBBBBBBbbbn.',
    '.nBtBBBBBBbbbbn.',
    '..nBBBByyBbbbn..',
    '..nBBBBBBbbbbn..',
    '..nBBBnBBnbbbn..',
    '...nBBBBBbbbn...',
    '...nyyyyyyyon...',
    '...nBBnBBnbbn...',
    '..nBBBnBbnbbbn..',
    '..nBBBnBbnbbbn..',
    '..nnnn.nn.nnnn..',
    '................'
  ]);

  def('c_mail', [
    '................',
    '....222..222....',
    '.22254422443222.',
    '2552545454542332',
    '2442222222222332',
    '.22245454543222.',
    '...2222222222...',
    '...2545454532...',
    '...2yyyyyyyo2...',
    '...2454545432...',
    '..222222222222..',
    '..254254254332..',
    '..243243243322..',
    '..222222222222..',
    '................',
    '................'
  ]);

  def('g_cloth', [
    '................',
    '.....bb.bb......',
    '....bttbttbbb...',
    '....btWbttbtBb..',
    '....btWbttbtBbb.',
    '....bttbttbtBbBb',
    '.bb.bttbttbtBbBb',
    'bttbbttttttttBBb',
    'btttbtttttttBBBb',
    '.bttttttttttBBb.',
    '..btttttttBBBBb.',
    '...bttttttBBBb..',
    '...bssssssssub..',
    '...bSsssssssub..',
    '...bbbbbbbbbbb..',
    '................'
  ]);

  def('g_iron', [
    '................',
    '.....22.22......',
    '....2552542222..',
    '....25W25424322.',
    '....222222222232',
    '....254254243232',
    '.22.254254243232',
    '2552222222222232',
    '2544255555444332',
    '.24425444444332.',
    '..222y44444y332.',
    '...254444433332.',
    '..2555444443332.',
    '..2yyyyyyyyyyo2.',
    '..2222222222222.',
    '................'
  ]);

  def('b_boots', [
    '................',
    '...nnnnnn.......',
    '..nttttttn......',
    '..nBBBBBbn......',
    '..nBBBBbbn......',
    '..nBtBBbbn......',
    '..nBtBBbbn......',
    '..nyyyyyon......',
    '..nBBBBbbnnn....',
    '..nBBBBBbbbnn...',
    '..nBBBBBBBbbbbn.',
    '..nBtBBBBBBBbbbn',
    '..nBBBBBBBBbbbbn',
    '..nnnnnnnnnnnnnn',
    '..n1111n1111111n',
    '..nnnn.nnnnnnnn.'
  ]);

  def('b_ironboots', [
    '................',
    '...222222.......',
    '..25554432......',
    '..2yyyyyo2......',
    '..25544332......',
    '..25W44332......',
    '..25W44332......',
    '..22222222......',
    '..2554433222....',
    '..25444333432...',
    '..2544443334432.',
    '..25W44444433332',
    '..24444444433332',
    '..22222222222222',
    '..21111211111112',
    '..2222.22222222.'
  ]);

  def('a_bone', [
    '......BBBB......',
    '.....B....B.....',
    '....B......B....',
    '.....B....B.....',
    '......ByyB......',
    '.....1yyyy1.....',
    '....1wWWwwt1....',
    '....1wWwwwt1....',
    '....1wWwrwt1....',
    '.....1wWwwt1....',
    '.....1wWrwwt1...',
    '......1wWwwt1...',
    '.......1wWrt1...',
    '........1wwt1...',
    '.........1wt1...',
    '..........11....'
  ]);

  def('a_jade', [
    '.......BB.......',
    '......B..B......',
    '.......yy.......',
    '.....jjjjjj.....',
    '...jjGGGgggjj...',
    '..jGGWGGgggggj..',
    '..jGWGGGgggggj..',
    '..jGGGGjjggggj..',
    '..jGGGj..jgggj..',
    '..jGGgj..jgggj..',
    '..jGgggjjggggj..',
    '..jggggggggggj..',
    '...jjggggggjj...',
    '.....jjrrjj.....',
    '......rRrd......',
    '......r.rd......'
  ]);

  var RING = [
    '................',
    '......MMMM......',
    '.....MOQONM.....',
    '....MMOONNMM....',
    '...MOOMMMMNNM...',
    '..MOOM....MNNM..',
    '..MOM......MNM..',
    '.MOOM......MNNM.',
    '.MONM......MNNM.',
    '.MONM......MNNM.',
    '..MNM......MNM..',
    '..MNNM....MNNM..',
    '...MNNMMMMNNM...',
    '....MMNNNNMM....',
    '......MMMM......',
    '................'
  ];
  def('r_copper', RING, { M: '#6b3a1f', N: '#b26a3a', O: '#dd9a5e', Q: '#ecd684' });
  def('r_jade', RING, { M: '#2f5a45', N: '#5f9a7a', O: '#93c9a8', Q: '#f3ecdb' });

  def('belt', [
    '................',
    '................',
    '................',
    '....nnnnnnnn....',
    '..nnBBBBBBbbnn..',
    '.nBBnnnnnnnnbbn.',
    'nBBn........nbbn',
    'nBBn........nbbn',
    'nBBBnn....nnbbbn',
    '.nBBBBoooobbbbn.',
    '..nnBoyYyyobnn..',
    '....noy..yon....',
    '.....oyyyyo.....',
    '......oooo......',
    '................',
    '................'
  ]);

  def('belt_wide', [
    '................',
    '................',
    '....nnnnnnnn....',
    '..nnBBBBBBbbnn..',
    '.nBBBBBBBBbbbbn.',
    'nBBBnnnnnnnnbbbn',
    'nBBn........nbbn',
    'nBBn........nbbn',
    'nBBBnoooooonbbbn',
    'nByBoyYYyyyobybn',
    'nBBBoy1111yobbbn',
    'nByBoy1111yobybn',
    '.nBBoyyyyyyobbn.',
    '..nnoooooooonn..',
    '................',
    '................'
  ]);

  def('bag', [
    '................',
    '....uu....uu....',
    '....usu..usu....',
    '.....usuusu.....',
    '......uyyu......',
    '....uussssuu....',
    '...usssssszzu...',
    '..usSSsssszzzu..',
    '..usSsssssszzu..',
    '.ussssssssszzzu.',
    '.usssssssszzzzu.',
    '.ussssssszzzzzu.',
    '.uzsssszzzzzzzu.',
    '..uzzzzzzzzzzu..',
    '...uuuuuuuuuu...',
    '................'
  ]);

  def('basket', [
    '................',
    '..nnnnnnnnnnnn..',
    '.nYyYyYyYyYyyon.',
    '..nnnnnnnnnnnn..',
    '.B.nyyooyyoon.B.',
    '.B.nooyyooyyn.B.',
    '.B.nyyooyyoon.B.',
    '.B.nooyyooyyn.B.',
    '.B..nyooyyon..B.',
    '.B..noyyooyn..B.',
    '..B.nyooyyon.B..',
    '...BnoyyooynB...',
    '....nyooyyon....',
    '....nnnnnnnn....',
    '................',
    '................'
  ]);

  def('cart', [
    '................',
    '................',
    '.nnnnnnnnnnn....',
    '.nBBtBBtBBBn....',
    '.nBbBBbBBbBn....',
    '.nBbBBbBBbBn....',
    '.nBbBBbBBbBn..nn',
    'nnnnnnnnnnnnnnBn',
    'nbbbbBBBbbbbBBn.',
    '.nnnB.b.Bnnnnn..',
    '...B.bbb.B......',
    '...BbbybbB......',
    '...B.bbb.B......',
    '....B.b.B.......',
    '.....BBB........',
    '................'
  ]);

  /* ─────────────────────── map nodes ─────────────────────── */

  def('n_town', [
    '................',
    '................',
    '.......uuuuuu...',
    '......uSSSSSsu..',
    '.....uSsSsSsSsu.',
    '....uuuuuuuuuuuu',
    '..uuuuuwwwwwwt..',
    '.uSSSSsuwnwwnt..',
    'uSsSsSsSuwwwwt..',
    'uuuuuuuuuuwuuuu.',
    '.wwwwwwt..uSSSsu',
    '.wnwwrwt.uuuuuuu',
    '.wwwwrwt..wwnwt.',
    '.wwwwrwt..wwwwt.',
    '.22222222222222.',
    '................'
  ]);

  def('n_gate', [
    '................',
    '...u........u...',
    '...uuuuuuuuuu...',
    '..uSsSsSsSsSsu..',
    '.uuuuuuuuuuuuuu.',
    '....3wr44rw3....',
    '24.24.2444.24.23',
    '2444444444443332',
    '2454442222444332',
    '2444421111244332',
    '2444210000124332',
    '2434210000124332',
    '2444210000124332',
    '2443210000123332',
    '2222210000122222',
    '................'
  ]);

  def('n_forest', [
    '................',
    '.....k..........',
    '....klk....k....',
    '...klLlk..klk...',
    '...kLllk.klLlk..',
    '..klLlllkkLllk..',
    '..kLlllkklLlllk.',
    '.klLllllkLllllk.',
    '.kllllllklllllk.',
    '..kkknkkkkknkkk.',
    '.SS..n..SS.n....',
    'SSSSSSS.SSSSSS.S',
    '..SSSSSSSSS.SSSS',
    '.sss.sssssss.ss.',
    '................',
    '................'
  ]);

  def('n_mine', [
    '................',
    '.....222222.....',
    '...2244443322...',
    '..244544433332..',
    '.2445nnnnnn3332.',
    '.244nBBBBBBn332.',
    '2444nnnnnnnn3332',
    '2443nB0F00bn3332',
    '2434nB0000bn3232',
    '2444nB0000bn3332',
    '2443nB0000bn3322',
    '2444nB0100bn3332',
    '2344nB1111bn3232',
    '2222nB1331bn2222',
    '....nn3..3nn....',
    '................'
  ]);

  def('n_bones', [
    '................',
    '.11..........11.',
    '1ww1........1w41',
    '1wW1.111111.1w41',
    '.1ww1wWWwww1w41.',
    '..1wwWwwwwwww1..',
    '...1wwwwwwww41..',
    '...1w00ww00w41..',
    '...1w00ww00w41..',
    '....1wwwwww41...',
    '....1ww11w41....',
    '.....1wwww41....',
    '.....1w1w141....',
    '......1.1.1.....',
    '................',
    '................'
  ]);

  def('n_kiln', [
    '.........34.....',
    '........344.....',
    '.......34.......',
    '.......343......',
    '........33......',
    '.....eeeeee.....',
    '...eeCCcccbee...',
    '..eCCccccccbbe..',
    '.eCccecccceccbe.',
    '.eCccccccccccbe.',
    'eCcce111111eccbe',
    'eCccc1dffd1cccbe',
    'eCece1fFFf1ceebe',
    'eCccc1dFfd1cccbe',
    'eeeee111111eeeee',
    '................'
  ]);

  def('n_cave', [
    '................',
    '......2222......',
    '....22443322....',
    '...2445443332...',
    '..244422223332..',
    '.24442dddd23332.',
    '.2442d2rr2d2332.',
    '2443drRRRRrd2332',
    '2442drRfFRrd2332',
    '2442drRffRrd2332',
    '2432ddrrrrdd2322',
    '244210dddd012332',
    '2222100000012222',
    '................',
    '................',
    '................'
  ]);

  /* ───────────────────── UI / gather points ───────────────────── */

  def('ui_hp', [
    '................',
    '.......dd.......',
    '.......dRd......',
    '......dRrd......',
    '......dRrrd.....',
    '.....dRRrrd.....',
    '.....dRrrrrd....',
    '....dRRrrrrrd...',
    '...dRWRrrrrrd...',
    '...dRWrrrrrrrd..',
    '...dRRrrrrrrrd..',
    '...drRrrrrrrdd..',
    '....drrrrrrdd...',
    '.....dddddd.....',
    '................',
    '................'
  ]);

  def('ui_food', [
    '................',
    '...........B..B.',
    '..........B..B..',
    '.....WWWWB..B...',
    '...WWWwWWWWB....',
    '..WWwWWWwWWWW...',
    '.WWWWWwWWWwWWw..',
    'uuuuuuuuuuuuuuuu',
    'uSSSssssssssszzu',
    '.uSSsssssssszzu.',
    '.uSsswsswsswszu.',
    '..usssssssszzu..',
    '...usssssszzu...',
    '....uuuuuuuu....',
    '.....uszzzu.....',
    '.....uuuuuu.....'
  ]);

  def('ui_fat', [
    '................',
    '..........WWWWW.',
    '.............W..',
    '....ooo.....W...',
    '..ooyYo....W....',
    '.oyYYo....WWWWW.',
    '.oyYyo..........',
    'oyYYo....wwww...',
    'oyYyo......w....',
    'oyYyo.....w.....',
    'oyYYyo...wwww.oo',
    '.oyYYyoo....ooyo',
    '.oyyYYyyooooyyo.',
    '..ooyyYYYYyyoo..',
    '....oooooooo....',
    '................'
  ]);

  def('ui_coin', [
    '................',
    '.....222222.....',
    '...2255554422...',
    '..25W555544432..',
    '.25W55555444432.',
    '.25552222224432.',
    '255552....244432',
    '255542....244332',
    '255442....243332',
    '254442....233332',
    '.24442222223332.',
    '.24444444333332.',
    '..244444333332..',
    '...2244333322...',
    '.....222222.....',
    '................'
  ]);

  def('ui_load', [
    '................',
    '................',
    '.....nnnnnn.....',
    '.nnnnBBBBBBnnnn.',
    'nBBBBnnnnnnbbbbn',
    '.nynn......nnyn.',
    '..y..........y..',
    '.y.y........y.y.',
    '.y.y........y.y.',
    'y...y......y...y',
    'nnnnn......nnnnn',
    'ntWtn......nttBn',
    'ntttn......nttBn',
    'nBBBn......nBBbn',
    '.nnn........nnn.',
    '................'
  ]);

  def('ui_fire', [
    '................',
    '.......f........',
    '.......ff.......',
    '......fFf..f....',
    '......fFFf......',
    '.....fFFFf......',
    '..f..fFWFFf.....',
    '....ffFWWFf.....',
    '....fFFWWFff....',
    '....fFWWWFFf....',
    '....ffFWWFff....',
    '.nn..ffFFff..nn.',
    'nBBnn.ffff.nnBbn',
    '.nbBBnnrrnnBbbn.',
    '...nnbBBBBbnn...',
    '.....nnnnnn.....'
  ]);

  def('ui_rumor', [
    '................',
    '...1111111111...',
    '..1wwwwwwwwwt1..',
    '.1wWwwwwwwwwtt1.',
    '.1wwwwwwwwwwtt1.',
    '.1wwrrwrrwrrtt1.',
    '.1wwrrwrrwrrtt1.',
    '.1wwwwwwwwwwtt1.',
    '.1wwwwwwwwwttt1.',
    '..1wwwttttttt1..',
    '...1wt1111111...',
    '...1wt1.........',
    '..1wt1..........',
    '..1t1...........',
    '..11............',
    '................'
  ]);

  def('ui_quest', [
    '................',
    '..oooooooooooo..',
    '..oWwwww4wwwto..',
    '..owww1w1w1wto..',
    '..owww1w1w1wto..',
    '..owww1w1wwwto..',
    '..owww1w1w1wto..',
    '..owwwww1w1wto..',
    '..owww1w1w1wto..',
    '..owwwwwww1wto..',
    '..owrrrw1w1wto..',
    '..owrRrw1wwwto..',
    '..owrrrwwwwtto..',
    '..otwwwwwtttto..',
    '..oooooooooooo..',
    '................'
  ]);

  def('p_herb', [
    '................',
    '................',
    '......k.....r...',
    '..r..kLk...rRr..',
    '.rRr.kLlk.k.r...',
    '..r.kLllkkLk....',
    '..k.kllkkLLlk...',
    '.kLkkklkLLllk.k.',
    'kLLlkkkLLlllkkLk',
    'kLlllkLLllllkLlk',
    'klllkLLlllllkllk',
    '.kkkLlllllkkkkk.',
    '..kkllllkkkk....',
    '....kkkkk.......',
    '...2222222222...',
    '................'
  ]);

  def('p_ore', [
    '................',
    '................',
    '.......222......',
    '.....2244322....',
    '...2244544332...',
    '..244Y544433322.',
    '..2445yY4433332.',
    '.244444yy4Y33332',
    '.2444344yYy33332',
    '2444444334yy3332',
    '24434444333yY332',
    '244444433333yy32',
    '2343333333333332',
    '.22222222222222.',
    '................',
    '................'
  ]);

  def('p_track', [
    '..........w.w...',
    '..........w.w...',
    '........w.....w.',
    '........w.www.w.',
    '.........wwwww..',
    '.........wwwtt..',
    '..........wtt...',
    '................',
    '...w.w..........',
    '...w.w..........',
    '.w.....w........',
    '.w.www.w........',
    '..wwwww.........',
    '..wwwtt.........',
    '...wtt..........',
    '................'
  ]);

  /* ─────────────────── enemies (24 × 24) ─────────────────── */

  def('wolf', [
    '........................',
    '...11..............11...',
    '..1451............1431..',
    '..14541..........14431..',
    '..145441.111111.144431..',
    '..14d4441555544144d431..',
    '..14d44555555444434d31..',
    '..14455555555444443331..',
    '..14222255555444222231..',
    '..144yYy25554442yYy331..',
    '..1444y0y555444y0y4331..',
    '.1344445555555444433321.',
    '.134444455wwww544443321.',
    '.13344445wwWWww44433321.',
    '.1334444ww0000ww4433321.',
    '..133444www00www443321..',
    '..13344w11111111w43321..',
    '...134w0WdWddWdW0w331...',
    '...134w0WdrrrrdW0w331...',
    '....13w0dWrrrrWd0w31....',
    '....134ww000000ww431....',
    '.....134w5ww5ww5431.....',
    '......13w15w15w31.......',
    '.......11.1ww1.11.......'
  ]);

  def('boar', [
    '........................',
    '.........n.nn.n.........',
    '........nbnbbnbn........',
    '...nn..nbBbBbbBbn..nn...',
    '..nBbnnBBBBbBbbbbnnbbn..',
    '..nBdbBBBBBBbbbbbbbdbn..',
    '..nBbBBBBBBBbbbbbbbbbn..',
    '...nBBBBBBBBbbbbbbbbn...',
    '..nBBnnnBBBBbbbbnnnbbn..',
    '..nBBnrRnBBBbbbnRrnbbn..',
    '..nBBBnnBBBBbbbbnnbbbn..',
    '.nBBBBBBBttttttbbbbbbbn.',
    '.nBWnBBttttttttttbbnWbn.',
    '.nBWWnttttttttttttnWWbn.',
    '.nBwWnttt00tt00tttnWwbn.',
    '.nBnwWntt00tt00tBnWwnbn.',
    '.nBBnwWnttttttttnWwnbbn.',
    '..nBBnwnBBBBBBBBnwnbbn..',
    '..nBBBnn00dddd00nnbbbn..',
    '...nBBBnBBBBbbbbnbbbn...',
    '....nBBBBBBBbbbbbbbn....',
    '.....nnBBBBBbbbbbnn.....',
    '.......nnnnnnnnnn.......',
    '........................'
  ]);

  def('bug', [
    '......y..........y......',
    '.......y..r..r..y.......',
    '........yvRddRvy........',
    '.........vPPppv.........',
    '.........vYPpYv.........',
    '......yy.vPpppv.yy......',
    '.....y....vppppv..y.....',
    '.......yyy.vPWPpvyyy....',
    '......y....vppppv...y...',
    '........yyy.vPWPpvyyy...',
    '.......y....vppppv...y..',
    '.......yyy.vPWPpvyyy....',
    '......y....vppppv...y...',
    '......yyy.vPWPpvyyy.....',
    '.....y....vppppv...y....',
    '....yyy.vPWPpvyyy.......',
    '...y....vppppv...y......',
    '...yyy.vPWPpvyyy........',
    '..y....vppppv...y.......',
    '...yyy.vPWPpvyyy........',
    '..y....vppppv...y.......',
    '........vpPpv...........',
    '.......d.vpv.d..........',
    '......d...v...d.........'
  ]);

  def('bandit', [
    '....................2...',
    '.......uuuuuuuuu...252..',
    '......usssSSssssu..2W2..',
    '.....usSSSsssssssu.2W42.',
    '.....usSssssssssuu.2W42.',
    '.....uuuuuuuuuuuuu.2W42.',
    '.....uhHHhhhhhhhxu.2W42.',
    '.....uh000hhh000xu.2W42.',
    '.....uhW0hhhhW0xxu.2W42.',
    '.....udrRRrrrrrddu.2W42.',
    '.....udrRrrrrrrddu.2W42.',
    '......drRrrrrrrrd..2W42.',
    '.......drRrrrrrd...2W42.',
    '....nnnn.drrrrd.nnn2W42.',
    '..nnBBBBn.drrd.nBBBoyyyo',
    '.nBBBBBBBn.dd.nBBBbxhHhx',
    'nBBtBBBBBBnnnnBBBBbbxhhx',
    'nBBtBBBBBBBBBBBBBbbbbnbn',
    'nBBBBBBnBBBBBBBbnbbbbnbn',
    'nBBBBBBBnBBBBBbnbbbbbnyo',
    'nBBBBBBBBnyyyynbbbbbbbbn',
    'nBBBBBBBBBnyynbbbbbbbbbn',
    'nBBBBBBBBBBnnbbbbbbbbbbn',
    'nbBBBBBBBBBBbbbbbbbbbbbn'
  ]);

  def('corpse', [
    '........................',
    '.........qqqqqqq........',
    '.......qqAAAAaaaqq......',
    '......qAAAAAAaaaaaq.....',
    '......qAA1AAAaaaaaq.....',
    '......qAAA1AAaaaaaq.....',
    '......qA0000aa0000q.....',
    '......qA0ff0aa0f00q.....',
    '......qAA00AaaA00aq.....',
    '......qAAAAA0aaaaaq.....',
    '.......qAAA0a0aaaaq.....',
    '.......qAa000000aq......',
    '.......qAaw0w0w0aq......',
    '........qa000d00aq......',
    '........qAa0000aq.......',
    '....qq...qAaaaaq...qq...',
    '..qqaaqq..qqqqq..qqaaq..',
    '.qaAAaaaqqq1aa1qqqaaaaaq',
    'qaAAAaaaaaqq11qqaaaaaaaq',
    'qAAAaa1aaaaaqqaaaaa1aaaq',
    'qAAaaaa1aaaaaaaaaa1aaaqq',
    'qAaaaaaa1aaaaafaaaaaaqq.',
    'qAaaqaaaa1aaaaaaaqaaaq..',
    'qaaq.qaaaaqaaaaq.qaaq...'
  ]);

  def('corpse_king', [
    '.....y...y....y.........',
    '.....yo.oyo..oyo..o.....',
    '.....yyoyYyooyYyoyo.....',
    '.....oyYyyryyryyyoo.....',
    '....qooooyYYyooooooq....',
    '....qAAAAyYrYaaaaaaq....',
    '....qA000yrrYa000aaq....',
    '....qA0fFyYrYaFf0aaq....',
    '....qAA00yrrYa00aaaq....',
    '....qAAAAyYrYaaaaaaq....',
    '....qAAAAyrYyaaaa1aq....',
    '.....qAAAAyYyaaa1aq.....',
    '.....qAa0w0y0w0w0aq.....',
    '.....qAa000000000aq.....',
    '......qAw0w0w0w0aq......',
    '......qAaaaaaaaaaq......',
    '.qqq...qqAaaaaaqq...qqq.',
    'qaAAqqq.oqqqqqqo.qqqaaaq',
    'qAAAAaaqoyYyyyyyoqaaaaaq',
    'qAAAaaaaqoyyryyoqaaaaaaq',
    'qAAaa1aaaqooooqaaaa1aaaq',
    'qAaaaa1aaaqqqqaaaa1aaaaq',
    'qAaaaaa1aaaaaaaaa1aaaaaq',
    'qaaq.qaaaqaaaaqaaaq.qaaq'
  ]);

  def('serpent', [
    '........................',
    '......jjjjjjj...........',
    '....jjGGGGGggjjj........',
    '...jGGjjjjGgggggjj......',
    '..jGGGjY0jGggggggjj.....',
    '.jG0GGGjjGGgggggggggj...',
    '.jwwwwwwwwjjggggjgggj...',
    '..W0W00000ddjwggggggggj.',
    'r.W0W0ddddddjwwggjggggj.',
    '.rrrrrrrrrrdjwwwggggggj.',
    'r.0W0W0000ddjwwwgggjggj.',
    '..jwwwwwwwwwjwwwwgggggj.',
    '...jjggggggjjwwwwgjgggj.',
    '.....jjjjjj.jwwwwgggggj.',
    '...........jwwwwggjggj..',
    '.........jjwwwwgggggjj..',
    '......jjjwwwwwggjgjjj...',
    '....jjGGGgggggggjjj.....',
    '..jjGGGGgggjjjjjj.......',
    '.jGGGGgggjjjjjjjjjjjj...',
    '.jGGGggjjGGGGGGGGGgggjj.',
    '.jGGgggjGGGjgGGGjgGgjggj',
    '..jjwwgwwgwwgwwgwwgwwgjj',
    '....jjjjjjjjjjjjjjjjjj..'
  ]);

  def('shaman', [
    '....1w1..........1w1.oo.',
    '....1wW1........1wt1oFfo',
    '.....1wW1..11..1wt1.ofro',
    '.....1wwW111111wtt1..oo.',
    '......1wwwWWWwwttt1..nB.',
    '......1wWWwwwwwwtt1..nB.',
    '......1w000wrw000t1..nB.',
    '......1w0R0wrw0R0t1..nB.',
    '......1wwwwwrwwwwt1..nB.',
    '......1wrwww1wwwrt1..nB.',
    '.......1ww11111wt1...nB.',
    '.......1wwW1w1wtt1...nB.',
    '........1wwwwwtt1....nB.',
    '.....vvv.1111111.vvv.nB.',
    '...vvpPpvvvvvvvvvpppvnB.',
    '..vpPPppprvpppvrpppppvhH',
    '.vpPPpppprrvpvrrppppphHx',
    '.vpPppppppprvrpppppppvB.',
    '.vpPpppvppppyppppvppvnB.',
    '.vpPppvpppwpwpwpppvpvnB.',
    'vpPpppvppppppppppppvpvB.',
    'vpPpppvpppppvppppppvpvB.',
    'vpppppvpppppvppppppvpvB.',
    'vvvvvvvvvvvvvvvvvvvvvvB.'
  ]);

  def('xiao', [
    '..........nnnn..........',
    '........nnbBbbnn........',
    '.......nbBBBBbbbn.......',
    '.......n000rR000n.......',
    '.......nYF0rR0FYn.......',
    '......nsSS0rR0SSsn......',
    '..nnnnnsSsSrRSsSsnnnnn..',
    '.ntBBBnnsS0rr0Ssnnbbbbn.',
    'ntBBBBBn00000000nbbbbbbn',
    'nBBBBBBnW0dddd0Wnbbbbbbn',
    'nBBBBBBnWW0dd0WWnbbbbbbn',
    'nBBBBBBBnW0000Wnbbbbbbbn',
    'nBBBBnBBBnnnnnnbbbnbbbbn',
    'nBBBBnBBBBBttbbbbbnbbbbn',
    'nBBBn.nBBBBttbbbbn.nbbbn',
    'nBBBn..nBBBnnbbbn..nbbbn',
    'nBBBn...nBBBbbbn...nbbbn',
    'nBBBBn..nBBBbbbn..nbbbbn',
    'nBBBBBn..nBBbbn..nbbbbbn',
    'nBBBBBn..nBBbbn..nbbbbbn',
    'nWBWBWn..nBBbbn..nWbWbWn',
    '.W.W.W..nBBBbbbn..W.W.W.',
    '......nBBBBBbbbbbn......',
    '......nWbWbWbWbWbn......'
  ]);

  /* ───────────────────────── runtime ───────────────────────── */

  function colourOf(icon, ch) {
    if (icon.pal && Object.prototype.hasOwnProperty.call(icon.pal, ch)) return icon.pal[ch];
    if (Object.prototype.hasOwnProperty.call(PAL, ch)) return PAL[ch];
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
    var style = document.createElement('style');
    style.id = 'shl-icons';
    style.textContent = css.join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  root.SHL_ICONS = {
    has: function (id) { return Object.prototype.hasOwnProperty.call(ICONS, id); },
    list: function () { return ORDER.slice(); },
    size: function (id) {
      return Object.prototype.hasOwnProperty.call(ICONS, id) ? ICONS[id].size : 0;
    },
    /* debug / tests: raw grid + resolved palette for one icon */
    raw: function (id) {
      if (!Object.prototype.hasOwnProperty.call(ICONS, id)) return null;
      var icon = ICONS[id], pal = {}, k;
      for (k in PAL) if (Object.prototype.hasOwnProperty.call(PAL, k)) pal[k] = PAL[k];
      if (icon.pal) for (k in icon.pal) if (Object.prototype.hasOwnProperty.call(icon.pal, k)) pal[k] = icon.pal[k];
      return { rows: icon.rows.slice(), palette: pal, size: icon.size };
    }
  };

  try { build(); } catch (e) { /* icons are decorative; never break the game */ }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
