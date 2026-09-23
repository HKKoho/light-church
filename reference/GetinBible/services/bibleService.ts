// Bible API service for fetching Chinese Union Version (CUV) text
// Uses bible-api.com which provides free access to CUV in public domain

export interface BibleVerse {
  book_id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleChapter {
  translation: {
    identifier: string;
    name: string;
    language: string;
  };
  verses: BibleVerse[];
}

// Map Chinese book names to bible-api.com book IDs
const BOOK_ID_MAP: Record<string, string> = {
  // Old Testament
  '創世記': 'GEN', '出埃及記': 'EXO', '利未記': 'LEV', '民數記': 'NUM', '申命記': 'DEU',
  '約書亞記': 'JOS', '士師記': 'JDG', '路得記': 'RUT', '撒母耳記上': '1SA', '撒母耳記下': '2SA',
  '列王紀上': '1KI', '列王紀下': '2KI', '歷代志上': '1CH', '歷代志下': '2CH', '以斯拉記': 'EZR',
  '尼希米記': 'NEH', '以斯帖記': 'EST', '約伯記': 'JOB', '詩篇': 'PSA', '箴言': 'PRO',
  '傳道書': 'ECC', '雅歌': 'SNG', '以賽亞書': 'ISA', '耶利米書': 'JER', '耶利米哀歌': 'LAM',
  '以西結書': 'EZK', '但以理書': 'DAN', '何西阿書': 'HOS', '約珥書': 'JOL', '阿摩司書': 'AMO',
  '俄巴底亞書': 'OBA', '約拿書': 'JON', '彌迦書': 'MIC', '那鴻書': 'NAM', '哈巴谷書': 'HAB',
  '西番雅書': 'ZEP', '哈該書': 'HAG', '撒迦利亞書': 'ZEC', '瑪拉基書': 'MAL',
  // New Testament
  '馬太福音': 'MAT', '馬可福音': 'MRK', '路加福音': 'LUK', '約翰福音': 'JHN', '使徒行傳': 'ACT',
  '羅馬書': 'ROM', '哥林多前書': '1CO', '哥林多後書': '2CO', '加拉太書': 'GAL', '以弗所書': 'EPH',
  '腓立比書': 'PHP', '歌羅西書': 'COL', '帖撒羅尼迦前書': '1TH', '帖撒羅尼迦後書': '2TH',
  '提摩太前書': '1TI', '提摩太後書': '2TI', '提多書': 'TIT', '腓利門書': 'PHM', '希伯來書': 'HEB',
  '雅各書': 'JAS', '彼得前書': '1PE', '彼得後書': '2PE', '約翰一書': '1JN', '約翰二書': '2JN',
  '約翰三書': '3JN', '猶大書': 'JUD', '啟示錄': 'REV'
};

/**
 * Fetch a chapter from the Chinese Union Version (CUV)
 * @param bookName - Chinese book name (e.g., "箴言")
 * @param chapter - Chapter number
 * @returns Array of verses or null if error
 */
export const fetchChapter = async (bookName: string, chapter: number): Promise<BibleVerse[] | null> => {
  const bookId = BOOK_ID_MAP[bookName];
  if (!bookId) {
    console.error(`Unknown book name: ${bookName}`);
    return null;
  }

  try {
    const response = await fetch(`https://bible-api.com/data/cuv/${bookId}/${chapter}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: BibleChapter = await response.json();
    return data.verses;
  } catch (error) {
    console.error('Failed to fetch Bible chapter:', error);
    return null;
  }
};

/**
 * Format verses for TTS reading
 * @param verses - Array of verses to format
 * @returns Formatted text for TTS
 */
export const formatVersesForTTS = (verses: BibleVerse[]): string => {
  if (verses.length === 0) return '';

  const bookName = verses[0].book;
  const chapter = verses[0].chapter;
  const startVerse = verses[0].verse;
  const endVerse = verses[verses.length - 1].verse;

  const header = startVerse === endVerse
    ? `${bookName}第${chapter}章第${startVerse}節`
    : `${bookName}第${chapter}章第${startVerse}節至第${endVerse}節`;

  const content = verses.map(v => `第${v.verse}節：${v.text}`).join(' ');

  return `${header}。${content}`;
};
