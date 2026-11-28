/* 山海錄 — NPC / player portrait set (v0.3)
 * Companion to js/icons.js: load this file AFTER it.
 * Same hand-authored format: one char per pixel, '.' = transparent, any other
 * char indexes PAL (identical to the master palette in icons.js) or the
 * portrait's own palette override. Every portrait is a 24x24 bust, lit from
 * the top-left, no anti-aliasing. Rasterised once on load and exposed as
 *   <i class="px ic-<id>"></i>
 * The SHL_ICONS registry is extended (never mutated): has/list/size/raw answer
 * for the ids defined here first and fall through to the original otherwise.
 */
(function (root) {
  'use strict';

  /* master palette — keep in sync with js/icons.js */
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

  /* ───────────────── shop owners / officers ───────────────── */

  // 錢四海 — plump branch merchant, round cap, gold star pin, sly smile
  def('np_qian', [
    '...........dr...........',
    '.........uuRruu.........',
    '......uuzzsszzzzuu......',
    '.....uzzsSszzzzzzzu.....',
    '....uzzsszzzzzzzzzzu....',
    '....uoyyyyooooooooou....',
    '....nHHHHHHhhhhhhhxn....',
    '...nHHnnnHhhhhHnnnhxn...',
    '...nHH000HhhhhH000hxn...',
    '...nHH0H0HhhhhH0h0hxn...',
    '...nHHhhhhhxxhhhhhhxn...',
    '...nHRRhhhxhhxhhhRRxn...',
    '...nHhh0hhhhhhhh0hhxn...',
    '...nHhhh00000000hhhxn...',
    '....nhhhhhhhhhhhhxxn....',
    '.....nhhxxxxxxxxhxn.....',
    '......nnhhhhhhxxnn......',
    '..eeeCCceennnnnneecccee.',
    '.eCCCCccceyennnneyecccce',
    'eCCCcccccceyenneyeccccce',
    'eCCcccYccccceyeeyeccccce',
    'eCCccYYYccccceyyeccccece',
    'eCcccycycccccceecccccece',
    'eCcccccccccccccccccccece'
  ]);

  // 柳三娘 — innkeeper, bun with red hairpin, sleeves rolled
  def('np_liu', [
    '..........0000..........',
    '.........012210.........',
    '......Yrr012210rrR......',
    '.........011110.........',
    '.......0001111000.......',
    '......011221111110......',
    '.....01121111111110.....',
    '.....0111HHHhhh1110.....',
    '.....011HHHhhhhx110.....',
    '.....01H000hh000x10.....',
    '.....01HW0hhhhW0x10.....',
    '.....01Hhhhhxhhhx10.....',
    '.....01hRhhxxhhRx10.....',
    '......0hhhdrrdhhx0......',
    '.......nhhhhhhxxn.......',
    '........nnhhhxnn........',
    '..........nhxn..........',
    '......uuuzwnnwzuuu......',
    '...uuzsszzwwwwzzzzzuu...',
    '..uzsSszzzzwwzzzzzzzzu..',
    '.uzsszzzzbbbbbbbbzzzzzu.',
    '.uwWwwuzbttttttttbzuwwwu',
    '.nHHhnuzbtttBtttBbzunhxn',
    '.nHhhnuzbttttttttbzunhxn'
  ]);

  // 白朮 — thin old apothecary, long white beard, herb sprig behind the ear
  def('np_baizhu', [
    '........................',
    '.........nnnnnn.........',
    '........nHHHHhhn........',
    '.......nHWWHhhhxn.......',
    '.......nHHHhhhhxn.......',
    '.....55nHHhhhhhxn55.Lk..',
    '....5Wwn555hh555nwW5lLk.',
    '....5Wwnh0hhhh0xnwW5kl..',
    '.....5wnhhhxhhhxnw5.k...',
    '.....5wnhxhxxhxxnw5.....',
    '......5nWWWwwWW5n5......',
    '......5wWWw00wWw55......',
    '......5wWWWwwWww55......',
    '.......5WWWwwWw55.......',
    '....jj.5wWWwWww55.jj....',
    '..jjggj5wWWwwW55jgggjj..',
    '.jgGGggj5WWwWw55jgggggj.',
    'jgGGgggjj5WwWw5jjggggggj',
    'jgGggggggj5WWw5jgggggggj',
    'jgGgggggggj5Ww5jggggggjj',
    'jgggggggggj5W5jgggggggjj',
    'jggggggggggj55jggggggggj',
    'jgggggjggggjjjgggjgggggj',
    'jgggggjgggggggggjggggggj'
  ]);

  // 石敢 — burly bald blacksmith, soot, leather apron, burn scar
  def('np_shigan', [
    '........................',
    '........nnnnnnnn........',
    '.......nHHHhhhhhn.......',
    '......nHWHhhhhhhxn......',
    '......nHHhhhhhhRdn......',
    '......nHhhhhhhRdRn......',
    '......nh000hh000dn......',
    '.....nxhW0hhhhW0xxn.....',
    '.....nxhhhhhxhhhhxn.....',
    '......n1hhhxxhh1xn......',
    '......n01hhhhhh10n......',
    '......n0100000010n......',
    '......n001hddh100n......',
    '.......n00122100n.......',
    '.......nn000000nn.......',
    '...nnnnxxn0000nxxnnnn...',
    '.nnHHhhbBbxxxxbBbhhhxnn.',
    'nHHHhhhbBbnnnnbBbhhhhxxn',
    'nHHhhh1bBBbbbbBBbhhh1xxn',
    'nHhhhhnbBBBBBBBBbnhhhxxn',
    'nHhh1hnbBBtBBBBbbnhhxxxn',
    'nhhhhxnbBBBBB1Bbbnhhxxxn',
    'nhhhxxnbBBBBBBbbbnhxxxxn',
    'nhhxxxnbBBBBBbbbbnxxxxxn'
  ]);

  // 周里正 — tired village headman, shabby black gauze cap with a bent wing
  def('np_zhou', [
    '.........000000.........',
    '........01222110........',
    '........01211110........',
    '.......0011111100.......',
    '.00000011221111110.00...',
    '.02222011111111110220...',
    '.00000000000000000.220..',
    '......nHHHhhhhhhxn..020.',
    '......nh000hh000xn...00.',
    '......nhw0hhhhw0xn......',
    '......nhxxhhxhxxxn......',
    '......nhhhhxxhhhxn......',
    '......nhh100001hxn......',
    '.......nh1hddh1xn.......',
    '.......nnhh00hxnn.......',
    '.........nx00xn.........',
    '.....uuuuznxxnzuuuu.....',
    '...uuzzzzzuuuuzzzzzuu...',
    '..uzsszzzzzzzzzzzzzzzu..',
    '.uzsSszzzzzzzzzzzzzzzzu.',
    '.uzsszzzzaaaaaazzzzzuzu.',
    'uzsszzzzzaAyAAazzzzzzuzu',
    'uzszzzzzzaAAAyazzzzzzuzu',
    'uzszzzzzzaaaaaazzzttzuzu'
  ]);

  // 啞伯 — mute temple keeper, shaved head, grey rags, hollow eyes
  def('np_yabo', [
    '........................',
    '.........nnnnnn.........',
    '.......nnxhhhhxnn.......',
    '......nxhHHhhhhxxn......',
    '......nhHHhhhhhhxn......',
    '......nhHhhhhhhhxn......',
    '......nhhhhhhhhxxn......',
    '.....nxxnnnhhnnnxxn.....',
    '.....nxn000hh000nxn.....',
    '......nhn0nhhn0nxn......',
    '......nhxhhxxhhxxn......',
    '......nxxhhhhhhxxn......',
    '.......nxhnnnnhxn.......',
    '.......nnxhhhhxnn.......',
    '.........nnxxnn.........',
    '..........nxxn..........',
    '......qqqqnxxnqqq.......',
    '....qqaaaqbnnbqaaqqq....',
    '..qqaAAaaqBqqqBqaaaaqq..',
    '.qaAAaaaaaqbqqbqaaaaaaq.',
    '.qaAaaaqaaaqBBqaaaqaaaq.',
    'qaAaaaaaqaaaqqaaaaqaaaaq',
    'qaaaaqaaaaaaaaaaqaaaaaqq',
    'qaaq.qaaaqaaaaaq.qaaqaq.'
  ]);

  // 賈掌櫃 — head of the guild house: tall cap, gold-rimmed lenses, star clasp
  def('np_jia', [
    '........vvvvvvvv........',
    '.......vppPppppvv.......',
    '.......vpPpppppvv.......',
    '.......vpPppppvvv.......',
    '.......vppppppvvv.......',
    '......voyYyyyyyoov......',
    '.......nHHHhhhhxn.......',
    '.......nh00hh00xn.......',
    '.......nYyhhhhyyn.......',
    '.......y00yooy00y.......',
    '.......nyyhhxhyyn.......',
    '.......nhhhxxhhxn.......',
    '.......nh000000xn.......',
    '.......n0hhddhh0n.......',
    '........0nhhhxn0........',
    '.........nnxxnn.........',
    '.....vvvvvnxxnvvvvv.....',
    '...vvppppvvYYvvppppvv...',
    '..vpPPpppyYYYYypppppvv..',
    '.vpPPppppvyYYyvppppppvv.',
    '.vpPpppppvyvvyvppppppvv.',
    'vpPpppppppvvvvppppppppvv',
    'vpPppppoppppvvpppoppppvv',
    'vpppppopoppppvvpopopppvv'
  ]);

  // 老葛 — one-eyed tavern keeper, eye patch, towel over the shoulder
  def('np_ge', [
    '........................',
    '........nnnnnnnn........',
    '......nnHHHhhhhhnn......',
    '....33nHH0Hhhhhhxn33....',
    '...345nHHh00hhhhxn543...',
    '...345nHhhhh00hhxn543...',
    '....34nh333hh0000043....',
    '....3nxhW0hhh0110xn3....',
    '.....nxhhhhhx0110xn.....',
    '......nhhhhxxh00xn......',
    '......n4555xx5554n......',
    '......n45hhddhh54n......',
    '.......n4hhhhhh4n.......',
    '.......nnhhhhxxnn.......',
    '.........nnxxnn.........',
    '....wwww..nxxn..........',
    '...wWWWwwnnxxnnnnnn.....',
    '..wWWwwwwntthttnbbbbnn..',
    '.nwWwwww5ntttttnbBBbbbn.',
    'nbwWwww5nttttttnbBbbbbbn',
    'nbwrrrrwnttttttnbBbbbbbn',
    'nbwWwww5nttttttnbbbbbbbn',
    'nbbw5w5nnttttttnnbbbbbbn',
    'nbbbnbnbnttttttnbnbbbbbn'
  ]);

  // 嚴鐵娘 — armourer, red headband, strong jaw, soot streak, one pauldron
  def('np_yan', [
    '.............000........',
    '........0000001210......',
    '.......0122111110.......',
    '......011221111110......',
    '......drRRrrrrrrrdd.....',
    '......drrrrrrrrrrdrd....',
    '......0HHHhhhhhhx0drd...',
    '......0H000hh000x0.dr...',
    '......0HW0hhhhW0x0.d....',
    '......nHhhhhxhhhxn......',
    '......nH1hhxxhhhxn......',
    '......nhh1hhhhhhxn......',
    '......nhhhhdrhhhxn......',
    '......nhhhhhhhhxxn......',
    '.......nhhhhhhxxn.......',
    '........nnnxxnnn........',
    '..22222nnnnxxnnnnnnnn...',
    '.2455442nbBnnnnBbnuuuun.',
    '2455444432bBBBBBBbnuzzun',
    '24544y4332bBBBBBBbnuzzzu',
    '2444443322bBBtBBbbnuzzzu',
    '.23333222nbBBBBBbbnuzzzu',
    '.u22222uunbBBBBBbbnuzzzu',
    '.uzzzzzzunbBBBBbbbnuzzzu'
  ]);

  // 苦參 — wandering doctor, wide bamboo hat, medicine gourd
  def('np_kushen', [
    '...........nn...........',
    '..........nBBn..........',
    '.........nBttBn.........',
    '.......nnBttBBBnn.......',
    '.....nnBBtttBBBbBnn.....',
    '...nnBBtttBBBBBbBbbnn...',
    '.nnBBtttBBbBBBBbBBbbbnn.',
    'nBBtttBBBbBBBBBbBBBbbbbn',
    'nnnnnnnnnnnnnnnnnnnnnnnn',
    '......nxxxxxxxxxxn......',
    '......nx000xx000xn......',
    '......nhW0hhhhW0xn......',
    '......nHhhhhxhhhxn......',
    '......nHhhhxxhhhxn......',
    '.......nhh1111hxn.......',
    '.......nhhh00hxxn.......',
    '........nnh00xnn...rr...',
    '....qqqqqqnxxnqqqq.nen..',
    '..qqaAAaaaqnnqaaaaqeCce.',
    '.qaAAaaaaaaqqaaaaaqeCcce',
    'qaAAaaaaaaaqaaaaaaaqerre',
    'qaAaaaaaaaqaaaaaaqeCCcce',
    'qaAaaaaaaaqaaaaaqeCWccce',
    'qaaaaaaaaaqaaaaaaqeCccce'
  ]);

  // 韓厲 — Daybreak Legion centurion, face scar, lamellar collar, sun badge
  def('np_han', [
    '..........drRd..........',
    '.........drRRrd.........',
    '..........drrd..........',
    '........22455422........',
    '......223455443322......',
    '.....23455444443332.....',
    '.....2oyyYyyyyyyyo2.....',
    '.....2nHHhhhhhhrxn2.....',
    '.....2nH000hh0r0xn2.....',
    '.....2nHW0hhhrW0xn2.....',
    '.....2nHhhhhrhhhxn2.....',
    '.....2nhhhhrxhhhxn2.....',
    '......nhhhrhhhhhxn......',
    '......nhhh0000hhxn......',
    '.......nhhhhhhxxn.......',
    '...22222nnnxxnnn22222...',
    '.224544322nnnn224443322.',
    '25425425y11Y11y254254254',
    '243243241yYYYy1243243243',
    '22222222yYYWYYy222222222',
    '42542542ooooooo425425425',
    '324324324324324324324324',
    '222222222222222222222222',
    '254254254254254254254254'
  ]);

  // 丁老七 — old gate sentry, dented helmet far too big, grey stubble
  def('np_ding', [
    '........................',
    '........22222222........',
    '......223445544322......',
    '.....23455544412432.....',
    '....2345554444113332....',
    '....2345544444433332....',
    '...234444444444333332...',
    '..23443333333333332222..',
    '......n1111111111n......',
    '......nxW0xxxxW0xn......',
    '......nhhhhhxhhhxn......',
    '......nHhhhxxhhhxn......',
    '......nh3hhhhhh3xn......',
    '......n3h3h00h3h3n......',
    '.......n3h3hh3h3n.......',
    '........nn3h33nn........',
    '..........nxxn..........',
    '.......bbbnxxnbbb.......',
    '.....bbtttbnnbtttbb.....',
    '....btttttBbbBtttttb....',
    '...bttBtttbBBbtttBttb...',
    '...btttttBtbbtBtttttb...',
    '..bttBttttbBBbttttBttb..',
    '..btttttBtbttbtBtttttb..'
  ]);

  // 霍青 — drill master, topknot, bare forearms crossed, stern
  def('np_huo', [
    '..........0000..........',
    '..........0120..........',
    '..........oyyo..........',
    '........00122100........',
    '.......0012211100.......',
    '......001221111100......',
    '......0HHHHhhhhhx0......',
    '......0H00hhhhh00n......',
    '......nHh00hh00hxn......',
    '......nHW0hhhhW0xn......',
    '......nHhhhhxhhhxn......',
    '......nhhhhxxhhhxn......',
    '......nhhh0000hhxn......',
    '......nhh0hhhh0hxn......',
    '.......nhhhhhhxxn.......',
    '........nnhhhxnn........',
    '....11111nhhxxn11111....',
    '..1122221dnhxnd1222211..',
    '.12232222ddnndd22222221.',
    '1223nnnnnnnnnnnnnnnn2221',
    '122nHHHhhhhhhhhhhhnHhn21',
    '12nhhhhhhhhhhhxxxxnhxn21',
    '1nHhnHHhhhhhhhhhhhhxxn21',
    '1nhxnhhhhhhhhhhxxxxxxn21'
  ]);

  // 「算盤」 — skinny squinting quartermaster, abacus at the bottom edge
  def('np_suanpan', [
    '........................',
    '.........111111.........',
    '........12222211........',
    '.......1222222111.......',
    '.......1111111111.......',
    '.......nHHHhhhhxn.......',
    '.......nHHhhhhhxn.......',
    '.......nhnnhhnnxn.......',
    '.......nx00hh00xn.......',
    '.......nhxxhxxxxn.......',
    '.......nhhhxxhhxn.......',
    '.......nhhhxxhhxn.......',
    '.......nxhhhhhhxn.......',
    '........n1hddh1n........',
    '........n1hhhx1n........',
    '.........nh00xn.........',
    '..........nxxn..........',
    '......qqqqnxxnqqqq......',
    '....qqaaaaqnnqaaaaqq....',
    '.nBBBBBBBBBBBBBBBBBBBBn.',
    '.n0rR00rR00yY00rR00rR0n.',
    '.nbbbbbbbbbbbbbbbbbbbbn.',
    '.n0rR00yY00rR00rR00yY0n.',
    '.n0rR00rR00rR00yY00rR0n.'
  ]);

  // 溫姑 — camp medic, white headscarf, calm
  def('np_wen', [
    '........................',
    '........44444444........',
    '......44wWWWwwww44......',
    '.....4wWWWwwwwwww54.....',
    '.....4wWWwwwwwwww54.....',
    '.....4wwwwwwwwww554.....',
    '.....4ww11111111w54.....',
    '.....4w51HHhhhh15w4.....',
    '.....4w5hnnhhnnx5w4.....',
    '.....4w5hW0hhW0x5w4.....',
    '.....4w5hhhhxhhx5w4.....',
    '.....4w5hhhxxhhx5w4.....',
    '.....4w5hhhrrhhx5w4.....',
    '.....4wwnhhhhhxnw5ww4...',
    '......45wnhhhxnw54w4....',
    '.......445nxxn544.......',
    '....qqqqqqnxxnqqqqqq....',
    '..qqAAAAAgjnnjgaaaaaqq..',
    '.qAAAAAAAAgjjgaaaaaaaaq.',
    'qAAAAAAAAAAgjaaaaaaaaaaq',
    'qAAAAaAAAAAgjaaaaaaaaaaq',
    'qAAAAaAAAAAgjaaaaaaaaaaq',
    'qAAAaAAAAAAgjaaaaaaqaaaq',
    'qAAAaAAAAAAgjaaaaaaqaaaq'
  ]);

  // 小滿 — teenage messenger, oversized cap, eager grin, red neckerchief
  def('np_xiaoman', [
    '........................',
    '.........uuuuuuu........',
    '.......uuzssSszzuu......',
    '.....uuzssSSszzzzzuu....',
    '....uzzssSsszzzzzzzzu...',
    '....uzsssszzzzzzzzzzuu..',
    '....uzzzzzzzzzzzzuuzzu..',
    '...uuuuuuuuuuuuuuu.uuu..',
    '...uzzzzzzrRzzzzzu......',
    '....nH00hhhhh00xn.......',
    '....nHW0hhhhhW0xn.......',
    '....nHW0hhhhhW0xn.......',
    '....nhxhhhxhhhxxn.......',
    '....nhhh0WWW0hhxn.......',
    '.....nhhh000hhxn........',
    '......nnhhhhxnn.........',
    '........nhhxn...........',
    '......ddrrrrrrdd........',
    '....uudrRrrrrrrdduu.....',
    '...uzzzddrRrrrddzzzu....',
    '..uzsszzzzddrddzzzzzu...',
    '..uzszzzzzzdrdzzzzzzu...',
    '..uzszzzzzzzdzzzzzzzu...',
    '..uzzzzzzzzzzzzzzzzzu...'
  ]);

  // 駝背張 — hunchbacked tea-stall keeper, straw hat, kettle steam
  def('np_zhang', [
    '........................',
    '........................',
    '.......oooooo...........',
    '.....ooyYYyyyoo.........',
    '...ooyyYYyyyyyyoo.......',
    '.ooyyYYyyyoyyyyyyoo.....',
    'oyyYYyyyoyyyoyyyyyyo....',
    '.oooooooooooooooooo.nn..',
    '.5..nxxxxxxxxxxn..nbbbn.',
    '5...nx000xx000xn.nbBBbbn',
    '.5..nhW0hhhhW0xnnbBBbbbn',
    '..5.nHhhhhxhhhxnbBBbbbbn',
    '..4.nHxhhxxhhxxnbBbbbbbn',
    '.5..nhh0hhhh0hxnbbbbbbbn',
    '5...nh5h0000h5xnbbbbbbbn',
    '.4...n5h5hh5h5nbbbbbbbbn',
    '..5...nn5555nnbbbbbbbbbn',
    '..5..nttn55nttnbbbbbbbbn',
    '.4..nttttnnttttnbbbbbbbn',
    '.5.nttttttttttttnbbbbbbn',
    '.e..nttttttttttttnbbbbbn',
    '.ec.eeeentttttttttnbbbbn',
    '.eCeCCcceentttttttnbbbbn',
    '.eCCCCcccentttttttnbbbbn'
  ]);

  // 馬六 — travelling peddler under a huge pack frame, star-marked crate
  def('np_ma', [
    '..nnnnnnnnnnnnnnnnnnnn..',
    '..nBBBBBBBBBBBBBBBBBBn..',
    '..nnnnnnnnnnnnnnnnnnnn..',
    '.dddddnbbbYYbbbnjjjjjj..',
    '.drRrdnbbYYYYbbnjgGggj..',
    '.drrrdnbbybbybbnjggggj..',
    '.dddddnnnnnnnnnnjjjjjj..',
    '..nBn..0000000000..nBn..',
    '..nBn..0122111110..nBn..',
    '..nBn..0HHHhhhhx0..nBn..',
    '..nBn..nH00hh00xn..nBn..',
    '..nBn..nHW0hhW0xn..nBn..',
    '..nBn..nhhhxxhhxn..nBn..',
    '..nBn..nh000000xn..nBn..',
    '..nBn..nh0hWWh0xn..nBn..',
    '..nBn...nhhhhxn....nBn..',
    '..nBnkkkknnxxnnkkkknBn..',
    '..nBnLltllknnklltllnBn..',
    '..nBnLltlllllllltllnBn..',
    '..nBnLltlllllllltllnBn..',
    '..nBnlltllllkllltllnBn..',
    '..nBnlltlllklllltllnBn..',
    '..nBnlltllllkllltlknBn..',
    '..nBnlktlllklllltkknBn..'
  ]);

  // 撿骨師 — gaunt hooded bone-gatherer, face in shadow, bone at the collar
  def('np_bone', [
    '..........qqq...........',
    '........qqaaqq..........',
    '.......qaAaaaqqq........',
    '......qaAaaaaaqqqq......',
    '.....qaAaaaqqqqaaqqq....',
    '....qaAaaq111111qaaqq...',
    '....qaAaq10000001qaqq...',
    '...qaAaaq1000000001qaqq.',
    '...qaAaq100000000001qaq.',
    '...qaaaq100A0000A001qaq.',
    '...qaaaq100000000001qaq.',
    '...qaaaq100qxxxxq001qaq.',
    '...qaaaq10xhhxxxxx01qaq.',
    '...qaaq110xh0000xx01qqq.',
    '..qaaaqq110xhhhhx011qaqq',
    '.qaAaaaqq1100xxx0011qaaq',
    'qaAaaaaaqq11100011qqaaaq',
    'qaAaaaaaaqqq1nn1qqqaaaaq',
    'qaAaaaaaaaaqn11nqaaaaaaq',
    'qaAaaaaaaaaqqwWqqaaaaaaq',
    'qaaaaaaqaaaqwWWwqaaqaaaq',
    'qaaaaaaqaaaaqWwqaaaqaaaq',
    'qaaaaaaqaaaaqWwqaaaqaaaq',
    'qaaaaaqaaaaqwWWwqaaqaaaq'
  ]);

  // 赤鴉 — crow-guard huntress, feather cloak, beak half-mask, corroded arm
  def('np_chiya', [
    '........................',
    '.........uuuuuu...u.....',
    '.......uu111111uuuzu....',
    '......u11z11111z1uzu....',
    '......u1z11111111uu.....',
    '......u1HHHhhhhh1u......',
    '......u10Hhhhhh01u......',
    '......u1000hh0001u......',
    '......u1hW0hhW0x1u......',
    '......uuzzzsszzzuu......',
    '.......uzzzsSzzuu.......',
    '.......uuzzsSzzuu.......',
    '........uuzsSzuu........',
    '.........uusSuu.........',
    '..........uzsu..........',
    '..u...u..11uu11..u...u..',
    '..uu.uzu1111111uuzu.uu..',
    '.twtuu1zu11111u1zu1uuzu.',
    'twttBtu1zu111u1zu11u1zuu',
    'ttBdrdtBu1zu1u1zu111u1zu',
    'tBdrRrdttu1zuu1zu1111u1u',
    'Bttdrrdwttu1u11zu11111uu',
    'twtBdddBtwtu1111u111111u',
    'ttBttdtBtttBu111u111111u'
  ]);

  /* ───────────────────── street people ───────────────────── */

  // 乞兒阿滿 — beggar child, cracked bowl
  def('np_aman', [
    '........................',
    '......n..n...n..n.......',
    '.....nbn.nbn.nbnbn......',
    '.....nbbnbbbnbbbbn......',
    '....nbbBbbbbBbbbbbn.....',
    '....nbBbbbbbbbbbbbbn....',
    '...nbbbHbHHhbhhbhbbn....',
    '...nbbHHHHhhhhhhhxbn....',
    '...nbbHnnhhhhhhnnxbn....',
    '...nbbHW0hhhhhhW0xbn....',
    '...nbbHW0hhhhhhW0xbn....',
    '....nbhhhhhxhhhh1xn.....',
    '....nxh1hhhddhhhhxn.....',
    '.....nhhhhhhhhhhxn......',
    '......nnhhhhhhxnn.......',
    '.........nhhxn..........',
    '.......nnnnxxnnnn.......',
    '.....nnbbbbnnbbbbnn.....',
    '....nbbbtbbbbbbbbbbn....',
    '....nbbttbbbbbbnbbbn....',
    '...nnbbbb33333333bbnn...',
    '...nhhnb3455444432nhxn..',
    '...nhhhn2344144332nhhn..',
    '....nnn.2233333322.nnn..'
  ]);

  // 說書人 — storyteller mid-tale, folding fan
  def('np_story', [
    '........................',
    '.......1111111111.......',
    '.......1222222211.......',
    '.......1211111111.......',
    '......111111111111.1....',
    '......nHHHhhhhhhxn.1....',
    '......nH000hhhhhxn.11...',
    '......nHhhhhh000xn..1...',
    '......nHW0hhhhW0xn..1...',
    '......nHhhhhxhhhxn......',
    '......nhhhhxxhhhxn......',
    '......nhh100001hxn......',
    '......nhhh0000hhxn......',
    '.......nhh0rr0hxn.......',
    '.......nnhh00hxnn.......',
    '.........nx00xn.........',
    '.....MMMMMnxxnbbbbbbb...',
    '...MMddddMMnbbwWWwwwwbb.',
    '..Mdrrdddddbw5WWw5wrw5wb',
    '..MdrddddddbwW5ww5ww5wwb',
    '.MdrdddddddMbww5w5w5wwb.',
    '.MdrddddddddMbww555wwb..',
    'Mdrdddddddddddbb555bbddM',
    'MdrdddddddddddddhHhddddM'
  ], { M: '#4a1610' });

  // 老礦工 — old miner, head lamp, white moustache, pick over the shoulder
  def('np_miner', [
    '...........Ff...........',
    '..........fFFf..........',
    '.......qqqeCceqqq.......',
    '......qaAaeeeeaaaq......',
    '.....qaAAaaaaaaaaaq.....',
    '.....qaaaaaqaaaaqaq.....',
    '.....qqqqqqqqqqqqqq.....',
    '......nxhhhhhhhhxn......',
    '......nx555hh555xn......',
    '......nhW0hhhhW0xn......',
    '......n1hhhxxhh1xn......',
    '......nh1hxxxxh1xn......',
    '......n5WWWwwWWW5n......',
    '......nW5wh00hw5Wn.2222.',
    '.......n5hhhhhx5n.234542',
    '........nnhhxxnn..23bB32',
    '..........nxxn....2.bB.2',
    '.....1111tttttt1111.bB..',
    '...11222ttBttttt22211...',
    '..12332221tttt12222221..',
    '.1233222221tt1222222221.',
    '.1232222222112222222221.',
    '123222122222222221222221',
    '123222122222222221222221'
  ]);

  // 難民婦人 — refugee woman, shawl over the head, swaddled infant
  def('np_refugee', [
    '........................',
    '.........nnnnnn.........',
    '.......nnbBBbbbnn.......',
    '......nbBBbbbbbbbn......',
    '....nbBBbbbbbbbbbbbn....',
    '....nbBbnnnnnnnnbbbn....',
    '....nbBn11HHhh11nbbn....',
    '....nbBnHHhhhhhxnbbn....',
    '...nbBbnhnnhhnnxnbbbn...',
    '...nbBbnh00hh00xnbbbn...',
    '...nbBbnhxxhxxxxnbbbn...',
    '...nbBbnhhhxxhhxnbbbn...',
    '..nbBbbnxhhddhxxnbbbbn..',
    '..nbBbbbnhhhhhxnbbbbbn..',
    '.nbBbbbbbnnxxnnbbbbbbbn.',
    '.nbBbbbbbbnnnnbbbbbnbbn.',
    'nbBbbbbnnnnnnbbbbbbnbbbn',
    'nbBbbbnttttttnbbbbbnbbbn',
    'nbBbbntthHhttttnbbbnbbbn',
    'nbBbbntth0httttnbbbbnbbn',
    'nbbbbnttttttBtttnbbbnbbn',
    'nbbbbbnttBttttttnhhnbbbn',
    'nbbnbbbnnttttttnnhxnbbbn',
    'nbn.nbbbbnnnnnnbbnnbbnbn'
  ]);

  // 傷兵 — wounded soldier, head bandage over one eye, arm in a sling
  def('np_wounded', [
    '........................',
    '........00000000........',
    '......001221111100......',
    '.....00122111111100.....',
    '.....45wWWWwwwwww54.....',
    '.....4wWWwwwwwrwww4.....',
    '......4wWwwwhhhhxn......',
    '......4wWww5h000xn......',
    '......n4wWw5hhW0xn......',
    '......nh4w5hxhhhxn......',
    '......nhhhhxxhhhxn......',
    '......n2h2hhhh2h2n......',
    '......nh2h0000h2xn......',
    '.......n2h2hh2hxn.......',
    '........nnhhhxnn........',
    '..........nxxn...ww.....',
    '....uuuuuunxxnuuwWwu....',
    '..uuzzzzzzunnuzwWwzzuu..',
    '.uzsszzzzzzzzzwWwzzzzzu.',
    '.uzszzwwwwwwwwWwwzzzzzu.',
    'uzszzwWWWwwwwwwwwwzzzzzu',
    'uzszzwWwwwnhHhnwwwzzzzzu',
    'uzszzz5wwwwnnnwww5zzzzzu',
    'uzzzzzz55wwwwww55zzzzzzu'
  ]);

  // 新兵 — nervous recruit clutching a spear, sweat at the temple
  def('np_recruit', [
    '....................5...',
    '.......nnnnnnnn....252..',
    '.....nnbBBbbbbbnn..252..',
    '.....nbBBbbbbbbbbn.242..',
    '.....nbBbbbbbbbbbn..n...',
    '.....nnnnnnnnnnnnn.nBn..',
    '......nHHHhhhhhhxn.nBn..',
    '....S.nHh00hh00hxn.nBn..',
    '...SS.nH0hhhhhh0xn.nBn..',
    '......nW0WhhhhW0Wn.nBn..',
    '......nHhhhhxhhhxn.nBn..',
    '......nhhhhxxhhhxn.nBn..',
    '......nhhh0h0hhhxn.nBn..',
    '.......nhhh0h0hxn..nBn..',
    '........nnhhhxnn...nBn..',
    '..........nxxn.....nBn..',
    '.....uuuuunxxnuuuu.nBn..',
    '...uuzzzzzunnuzzzzunBn..',
    '..uzsszzzzzzzzzzznhHhhn.',
    '.uzsszzzzzzzzzzzznhhhxn.',
    '.uzszzzzzzzzzzzzzzunBn..',
    '.uzszzzzzzzzzzzzznhHhhn.',
    'uzsszzzzzzzzzzzzznhhhxn.',
    'uzszzzzzzzzzzzzzzzunBnzu'
  ]);

  /* ───────────── player faces — 沈衡 in six origins ───────────── */

  // 獵戶 — topknot, fur collar, bow tip over the shoulder
  def('pl_hunter', [
    '..........00............',
    '.........0120........nB.',
    '.........0110.......nB4.',
    '.......0011111100...nB4.',
    '......001221111100.nB.4.',
    '......012211111110.nB.4.',
    '......01HH1Hhhh110.nB.4.',
    '......0H000hh000x0nB..4.',
    '......nHW0hhhhW0xnnB..4.',
    '......nHhhhhxhhhxnnB..4.',
    '......nhhhhxxhhhxnnB..4.',
    '......nhhxhhhhhhxnnB..4.',
    '.......nhh0000hxn.nB..4.',
    '.......nhhhhhhxxn..nB.4.',
    '........nnhhhxnn...nB.4.',
    '......tt..nxxn..tt......',
    '...ttwWtttnxxntwWtttt...',
    '.ttwWtttwtBnnBttwWttwtt.',
    'twWttBtwWttBBttwtBtwWttB',
    'BttBtnBttBtBBtBtnBtBttBn',
    'nBnbnbBnbnBnnBnbBnbnBnbn',
    'nbbbbbbbbbbbnbbbbbbbbbbn',
    'nbBbbbbbbbbbnbbbbbbbbbbn',
    'nbBbbbbbbbbbnbbbbbbbbbbn'
  ]);

  // 採藥人 — cloth cap, herb basket on the back, strap across the chest
  def('pl_herbalist', [
    '........................',
    '........jjjjjjj.........',
    '......jjgGGggggjj.......',
    '.....jgGGgggggggjj...L..',
    '.....jgGggggggggggj.lLk.',
    '.....jjjjjjjjjjjjjjrRlLk',
    '......0HHHHhhhhhx0.drklk',
    '......0H000hh000x0..klk.',
    '......nHW0hhhhW0xn..kl..',
    '......nHhhhhxhhhxnnttttn',
    '......nhhhhxxhhhxnnBtBtB',
    '......nhhxhhhhhhxnntBtBt',
    '.......nhh0000hxn.nBtBtB',
    '.......nhhhhhhxxn.ntBtBt',
    '........nnhhhxnn..nBtBtB',
    '..........nxxn....ntBtBt',
    '.....qqqqqnxxnnBtnqnBtBn',
    '...qqaAAaaaqqnBtnaaaqq..',
    '..qaAAaaaaaanBtnaaaaaaq.',
    '.qaAAaaaaaanBtnaaaaaaaaq',
    'qaAAaaaaaanBtnaaaaaaaaaq',
    'qaAaaaaaanBtnaaaaaaaaaaq',
    'qaAaaaaanBtnaaaaaaaaaaaq',
    'qaAaaaanBtnaaaaaaaaaaaaq'
  ]);

  // 礦工 — headcloth, soot, pick behind the shoulder
  def('pl_miner', [
    '........................',
    '........nnnnnnnn........',
    '......nnttttttttnn......',
    '.....nttwttttttttBn.....',
    '.....ntwttttttttBBn.n...',
    '.....nBBBBBBBBBBBBnntn..',
    '......nHHHHhhh1hxn.nBn..',
    '......nH000hh000xn.ntn..',
    '......nHW0hhhhW0xn..n...',
    '.2332.nH1hhhxhhhxn......',
    '24bB42nh11hxxhh1xn......',
    '2.bB.2nhhxhhhhh1xn......',
    '..bB...nhh0000hxn.......',
    '..bB...nhhhhhhxxn.......',
    '..bB....nnhhhxnn........',
    '..bB......nxxn..........',
    '..bB.11111nxxn11111.....',
    '...1122222nnnn2222211...',
    '..12332222211222222221..',
    '.1233222222112222222221.',
    '.1232222222112222222221.',
    '123222222221122222222221',
    '123222212222222222122221',
    '123222212222222222122221'
  ]);

  // 逃兵 — broken lamellar collar, stubble, unkempt hair
  def('pl_deserter', [
    '........................',
    '.......0.000000.0.......',
    '......000112210000......',
    '.....00112211111100.....',
    '.....01221111111110.....',
    '.....011H1HHh1h1110.....',
    '.....01HH1Hhhh1hx10.....',
    '.....01H000hh000x10.....',
    '.....0nHW0hhhhW0xn0.....',
    '.....0nHhhhhxhhhxn0.....',
    '......nhhhhxxhhhxn......',
    '......nh2xhhhhh2xn......',
    '.......n2h0000h2n.......',
    '.......nh2h22h2xn.......',
    '........nn2hh2nn........',
    '..........nxxn..........',
    '..22222222nxxn2222......',
    '.2542542542nn2542542....',
    '2432432432222432432uuu..',
    '22222222222222222duzzu..',
    '4254254254254254druzzzu.',
    '324324324324324ud2uzzzzu',
    '2222222222222uuu252uzzzu',
    '2542542542542uzzu2uzzzzu'
  ]);

  // 貨郎 — travelling hat with chin cord, carrying pole across the shoulders
  def('pl_peddler', [
    '........................',
    '..........nnnn..........',
    '........nnBttBnn........',
    '......nnBBttttBBnn......',
    '...nnnBBtttBBBBBbbnnn...',
    '.nnBBBtttBBBBBBBBbbbbnn.',
    '.nnnnnnnnnnnnnnnnnnnnnn.',
    '.....0nxHHHhhhhxxn0.....',
    '.....0nH000hh000xn0.....',
    '.....tnHW0hhhhW0xnt.....',
    '.....tnHhhhhxhhhxnt.....',
    '.....tnhhxhhhhhhxnt.....',
    '......tnhh0000hxnt......',
    '......tnhhhhhhxxnt......',
    '.......tnnhhhxnnt.......',
    '........ttnxxntt........',
    'nBBBBBBBBBnxxnBBBBBBBBBn',
    'nbbbbbbbbbbnnbbbbbbbbbbn',
    '.tnuuuuuuuuuuuuuuuuuunt.',
    '.t.uzsszzzzuzzuzzzzzu.t.',
    '.t.uzszzzzzzuuzzzzzzu.t.',
    'ttt.uzzzzzzzzzzzzzzu.ttt',
    'nnnnuzszzzzzzzzzzzzunnnn',
    'nBBnuzszzzzzzzzzzzzunccn'
  ]);

  // 流民 — plain rags, loose hair, frayed cowl
  def('pl_drifter', [
    '........................',
    '........00000000........',
    '......001122111000......',
    '.....00122111111100.....',
    '.....01221111111110.....',
    '.....0111HH1hhh1110.....',
    '.....01HHHHhhhhhx10.....',
    '.....01H000hh000x10.....',
    '.....01HW0hhhhW0x10.....',
    '.....01Hhhhhxhhhx10.....',
    '.....01hhhhxxhhhx10.....',
    '.....01hhxhhhhhhx10.....',
    '.....01nhh0000hxn10.....',
    '.....01nhhhhhhxxn10.....',
    '.....010nnhhhxnn010.....',
    '......00..nxxn..00......',
    '.....qqaaanxxnaaaqq.....',
    '...qqaAAaaannnnaaaaqq...',
    '..qaAAaaaaqaaaaqaaaaaq..',
    '.qaAaaaaaaaqqqqaaaaaaaq.',
    '.nnqaaaaqqqbbbbqqqaaqnn.',
    'nbbnqqqqbbbbbbbbbbqqnbbn',
    'nbBbbbbbbbtbbbbbbbbbbbbn',
    'nbBbnbbbbttbbbbbbnbbbbbn'
  ]);

  /* ───────────────────────── build ───────────────────────── */

  var hasOwn = Object.prototype.hasOwnProperty;

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
    var old = document.getElementById && document.getElementById('shl-icons-npc');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var style = document.createElement('style');
    style.id = 'shl-icons-npc';
    style.textContent = css.join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  /* ─────────────────── registry extension ───────────────────
   * icons.js is left untouched: we wrap whatever SHL_ICONS is at load time. */

  var base = root.SHL_ICONS || {};
  function own(id) { return hasOwn.call(ICONS, id); }
  function baseCall(name, args, fallback) {
    if (base && typeof base[name] === 'function') {
      try { return base[name].apply(base, args); } catch (e) { return fallback; }
    }
    return fallback;
  }

  var ext = {};
  for (var key in base) {
    if (hasOwn.call(base, key)) ext[key] = base[key];
  }

  ext.has = function (id) {
    return own(id) || !!baseCall('has', [id], false);
  };
  ext.list = function () {
    var out = baseCall('list', [], []);
    out = out && out.slice ? out.slice() : [];
    var seen = {};
    for (var i = 0; i < out.length; i++) seen[out[i]] = true;
    for (var j = 0; j < ORDER.length; j++) {
      if (!hasOwn.call(seen, ORDER[j])) out.push(ORDER[j]);
    }
    return out;
  };
  ext.size = function (id) {
    if (own(id)) return ICONS[id].size;
    return baseCall('size', [id], 0) || 0;
  };
  /* debug / tests: raw grid + resolved palette for one icon */
  ext.raw = function (id) {
    if (!own(id)) return baseCall('raw', [id], null) || null;
    var icon = ICONS[id], pal = {}, k;
    for (k in PAL) if (hasOwn.call(PAL, k)) pal[k] = PAL[k];
    if (icon.pal) for (k in icon.pal) if (hasOwn.call(icon.pal, k)) pal[k] = icon.pal[k];
    return { rows: icon.rows.slice(), palette: pal, size: icon.size };
  };

  root.SHL_ICONS = ext;

  try { build(); } catch (e) { /* portraits are decorative; never break the game */ }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
