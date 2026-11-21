// packages/api/src/theology-library/bible-books.ts
//
// The 66 books with USFM codes and the names Scripture references use in
// English and Traditional Chinese (CUV). `n` marks numbered books: their
// English names are matched as "1 Cor", "1Cor", "I Cor".

export interface BibleBook {
  readonly code: string;
  readonly en: readonly string[];
  /** Full Chinese names — chapter-only references allowed ("羅馬書8章"). */
  readonly zh: readonly string[];
  /** Short Chinese forms — only matched with a verse ("約3:16"), too ambiguous otherwise. */
  readonly zhShort: readonly string[];
  readonly n?: number;
}

const b = (code: string, en: string[], zh: string[], zhShort: string[], n?: number): BibleBook => ({
  code,
  en,
  zh,
  zhShort,
  ...(n ? { n } : {}),
});

export const BIBLE_BOOKS: readonly BibleBook[] = [
  b('GEN', ['Genesis', 'Gen', 'Gn'], ['創世記'], ['創']),
  b('EXO', ['Exodus', 'Exod', 'Ex'], ['出埃及記'], ['出']),
  b('LEV', ['Leviticus', 'Lev', 'Lv'], ['利未記'], ['利']),
  b('NUM', ['Numbers', 'Num', 'Nm'], ['民數記'], ['民']),
  b('DEU', ['Deuteronomy', 'Deut', 'Dt'], ['申命記'], ['申']),
  b('JOS', ['Joshua', 'Josh'], ['約書亞記'], ['書']),
  b('JDG', ['Judges', 'Judg', 'Jdg'], ['士師記'], ['士']),
  b('RUT', ['Ruth'], ['路得記'], ['得']),
  b('1SA', ['Samuel', 'Sam', 'Sm'], ['撒母耳記上'], ['撒上'], 1),
  b('2SA', ['Samuel', 'Sam', 'Sm'], ['撒母耳記下'], ['撒下'], 2),
  b('1KI', ['Kings', 'Kgs'], ['列王紀上'], ['王上'], 1),
  b('2KI', ['Kings', 'Kgs'], ['列王紀下'], ['王下'], 2),
  b('1CH', ['Chronicles', 'Chron', 'Chr'], ['歷代志上'], ['代上'], 1),
  b('2CH', ['Chronicles', 'Chron', 'Chr'], ['歷代志下'], ['代下'], 2),
  b('EZR', ['Ezra'], ['以斯拉記'], ['拉']),
  b('NEH', ['Nehemiah', 'Neh'], ['尼希米記'], ['尼']),
  b('EST', ['Esther', 'Esth'], ['以斯帖記'], ['斯']),
  b('JOB', ['Job'], ['約伯記'], ['伯']),
  b('PSA', ['Psalms', 'Psalm', 'Pss', 'Ps'], ['詩篇'], ['詩']),
  b('PRO', ['Proverbs', 'Prov', 'Prv'], ['箴言'], ['箴']),
  b('ECC', ['Ecclesiastes', 'Eccles', 'Eccl'], ['傳道書'], ['傳']),
  b('SNG', ['Song of Songs', 'Song of Solomon', 'Song'], ['雅歌'], ['歌']),
  b('ISA', ['Isaiah', 'Isa'], ['以賽亞書'], ['賽']),
  b('JER', ['Jeremiah', 'Jer'], ['耶利米書'], ['耶']),
  b('LAM', ['Lamentations', 'Lam'], ['耶利米哀歌'], ['哀']),
  b('EZK', ['Ezekiel', 'Ezek'], ['以西結書'], ['結']),
  b('DAN', ['Daniel', 'Dan'], ['但以理書'], ['但']),
  b('HOS', ['Hosea', 'Hos'], ['何西阿書'], ['何']),
  b('JOL', ['Joel'], ['約珥書'], ['珥']),
  b('AMO', ['Amos'], ['阿摩司書'], ['摩']),
  b('OBA', ['Obadiah', 'Obad'], ['俄巴底亞書'], ['俄']),
  b('JON', ['Jonah', 'Jon'], ['約拿書'], ['拿']),
  b('MIC', ['Micah', 'Mic'], ['彌迦書'], ['彌']),
  b('NAM', ['Nahum', 'Nah'], ['那鴻書'], ['鴻']),
  b('HAB', ['Habakkuk', 'Hab'], ['哈巴谷書'], ['哈']),
  b('ZEP', ['Zephaniah', 'Zeph'], ['西番雅書'], ['番']),
  b('HAG', ['Haggai', 'Hag'], ['哈該書'], ['該']),
  b('ZEC', ['Zechariah', 'Zech'], ['撒迦利亞書'], ['亞']),
  b('MAL', ['Malachi', 'Mal'], ['瑪拉基書'], ['瑪']),
  b('MAT', ['Matthew', 'Matt', 'Mt'], ['馬太福音'], ['太']),
  b('MRK', ['Mark', 'Mk'], ['馬可福音'], ['可']),
  b('LUK', ['Luke', 'Lk'], ['路加福音'], ['路']),
  b('JHN', ['John', 'Jn'], ['約翰福音'], ['約']),
  b('ACT', ['Acts'], ['使徒行傳'], ['徒']),
  b('ROM', ['Romans', 'Rom'], ['羅馬書'], ['羅']),
  b('1CO', ['Corinthians', 'Cor'], ['哥林多前書'], ['林前'], 1),
  b('2CO', ['Corinthians', 'Cor'], ['哥林多後書'], ['林後'], 2),
  b('GAL', ['Galatians', 'Gal'], ['加拉太書'], ['加']),
  b('EPH', ['Ephesians', 'Eph'], ['以弗所書'], ['弗']),
  b('PHP', ['Philippians', 'Phil', 'Php'], ['腓立比書'], ['腓']),
  b('COL', ['Colossians', 'Col'], ['歌羅西書'], ['西']),
  b('1TH', ['Thessalonians', 'Thess'], ['帖撒羅尼迦前書'], ['帖前'], 1),
  b('2TH', ['Thessalonians', 'Thess'], ['帖撒羅尼迦後書'], ['帖後'], 2),
  b('1TI', ['Timothy', 'Tim'], ['提摩太前書'], ['提前'], 1),
  b('2TI', ['Timothy', 'Tim'], ['提摩太後書'], ['提後'], 2),
  b('TIT', ['Titus'], ['提多書'], ['多']),
  b('PHM', ['Philemon', 'Phlm'], ['腓利門書'], ['門']),
  b('HEB', ['Hebrews', 'Heb'], ['希伯來書'], ['來']),
  b('JAS', ['James', 'Jas'], ['雅各書'], ['雅']),
  b('1PE', ['Peter', 'Pet'], ['彼得前書'], ['彼前'], 1),
  b('2PE', ['Peter', 'Pet'], ['彼得後書'], ['彼後'], 2),
  b('1JN', ['John', 'Jn'], ['約翰一書', '約翰壹書'], ['約壹', '約一'], 1),
  b('2JN', ['John', 'Jn'], ['約翰二書', '約翰貳書'], ['約貳', '約二'], 2),
  b('3JN', ['John', 'Jn'], ['約翰三書', '約翰參書'], ['約參', '約三'], 3),
  b('JUD', ['Jude'], ['猶大書'], ['猶']),
  b('REV', ['Revelation', 'Rev'], ['啟示錄'], ['啟']),
];
