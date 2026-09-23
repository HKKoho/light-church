
import { Cycle, PerspectiveType } from './types';

// Note: MODULES uses simplified string arrays for lifeQuestions.
// The actual Module type expects LifeQuestion[] objects from the database.
// This is fallback/seed data only - using a simplified interface.

interface StaticModule {
  id: number;
  cycleId: number;
  title: string;
  subtitle: string;
  lifeQuestions: string[]; // Simplified - database uses LifeQuestion[]
  perspectives: Record<PerspectiveType, { book: string; theme: string; description: string }>;
  tensionGuides: string[];
  discussionPrompts: string[];
  summary: string;
}

export const CYCLES: Cycle[] = [
  { id: 1, title: '春: 閱讀 福音、先知和新約書信', description: '探討因果、努力與公義的根基。' },
  { id: 2, title: '夏：人如何活在有限中？', description: '探討時間、言語、財富與成功的界限。' },
  { id: 3, title: '秋：未定', description: '面對痛苦、沈默與神學的崩解。' },
  { id: 4, title: '冬：未定', description: '智慧的辨識、修正與生命定位。' }
];

export const MODULES: StaticModule[] = [
  {
    id: 1,
    cycleId: 1,
    title: '第 1 課｜什麼是智慧？',
    subtitle: '敬畏、失效與苦難中的尋求',
    lifeQuestions: [
      '在你每星期生活，除了睡覺，飲食，個人護理清潔，家務（清潔和煮食），交通，工作糊口的時間使用外，列出三種活動你會花時間去做', 
      '你現在認為自己是否尋找「智慧」的人?'
    ],
    perspectives: {
      [PerspectiveType.ORDER]: { 
        book: '箴言', 
        theme: '人生一開始就在「選擇」中', 
        description: `【人生一開始就在「選擇」中（第 1 章）】
「敬畏耶和華是知識的開端。」—— 箴言 1:7
「我呼喚，你們不肯聽從；我伸手，無人理會。」—— 箴言 1:24
「愚昧人背道，必殺己身；愚頑人安逸，必害己命。」—— 箴言 1:32

● 重點：
1. 智慧不是中立的資訊，而是一開始就要回應的呼召。
2. 不選擇，其實也是一種選擇。

【最後的邀請：兩條路、兩個宴席（第 9 章）】
「智慧建造房屋，鑿成七根柱子。」—— 箴言 9:1
「你們愚蒙人，要捨棄愚蒙，就得存活；並要走光明的道路。」—— 箴言 9:6
「敬畏耶和華是智慧的開端。」—— 箴言 9:10

● 重點：
1. 人生最後不是「有沒有智慧」，而是：你進了哪一個宴席？`
      },
      [PerspectiveType.VANITY]: { 
        book: '傳道書', 
        theme: '智慧仍會失效', 
        description: '「多有智慧，就多有愁煩。」（傳 1:18）。傳道者誠實地指出：智慧不等於成功，正直不等於公平。當人看清制度與人性的限制，反而可能感到更痛苦。智慧並非替人生「保證結果」的魔法。' 
      },
      [PerspectiveType.COLLAPSE]: { 
        book: '約伯記', 
        theme: '智慧不能避免苦難', 
        description: '「他在智慧上有能力。」（伯 12:13）。約伯敬畏神且滿有智慧，卻仍在一夕之間失去一切。這反對了一種簡化的因果論：只要「做對的事」就不會「出意外」。真智慧是在極端痛苦中仍不虛假。' 
      }
    },
    tensionGuides: [`【聖經中「智慧」】

● 箴言：智慧是「選擇正確人生方向」

核心經文
「敬畏耶和華是智慧的開端。」
—— 箴言 9:10

重點說明
• 箴言的智慧是實踐性的、方向性的
• 智慧不是抽象思想，而是每天在「路口」作出選擇
• 關鍵不在聰不聰明，而在你聽誰的聲音、走哪條路

● 傳道書：智慧是「誠實面對人生的有限與虛空」

核心經文
「我專心用智慧尋求、查究天下所做的一切事；乃知這也是捕風。」
—— 傳道書 1:13–14（節選）

重點說明
• 傳道書的智慧不是教你「如何成功」，而是教你不自欺
• 它揭露：人生不一定公平、努力不一定有回報
• 智慧在這裡是清醒，而不是樂觀

● 約伯記：智慧是「在無解的苦難中仍然不虛假」

核心經文
「敬畏主就是智慧；遠離惡便是聰明。」
—— 約伯記 28:28

重點說明
• 約伯記反對一種簡化邏輯：聰明／正直／敬虔 → 就不該受苦
• 在這裡，智慧不是解釋苦難，而是在苦難中仍然誠實地活著、不扮演假答案

⸻

【跨越時空的對話：西方文學的智慧視角】

1. 《理想國》— 柏拉圖：思考你是否真的在看見真實。
2. 《沉思錄》— 馬可・奧理略：如何在不可控的世界中保持內在秩序。
3. 《查拉圖斯特拉如是說》— 尼采：如何直面虛無並重新創造價值。
4. 《卡拉馬助夫兄弟》— 杜斯妥也夫斯基：自由、責任與信仰的重量。
5. 《老人與海》— 海明威：尊嚴來自於不放棄。

⸻

【跨越時空的對話：東方文學的智慧視角】

1. 《論語》— 孔子及其弟子：智慧是日常實踐中的做人之道與關係倫理。
2. 《莊子》— 莊周：不被成功定義，在相對性中尋求精神自由。
3. 《周易》（易經）：在變化中理解情勢演化與時機判斷。
4. 《史記》— 司馬遷：歷史是人性的全景，非勝者的獨白。
5. 《紅樓夢》— 曹雪芹：看透繁華幻滅，以清醒換取慈悲。

⸻

一條中國智慧的隱線

這五部作品共同指向一種不同於「征服世界」的智慧取向：
理解變化、安頓自身、在關係與無常中保持清明。

⸻

核心轉向：從「期待智慧給我答案」轉向「智慧讓我在任何處境中都選對宴席」。`],
    discussionPrompts: [
      '【選擇的代價】箴言提到「呼喚與拒絕」。在你的生活中，有沒有哪一個「智慧的呼喚」是你一直在推延、不願聽從的？',
      '【宴席的辨識】箴言 9 章提到兩個宴席。你認為現代社會中，哪一種「愚蒙的宴席」最容易讓人感到「有智慧」但這卻是「安逸卻害命」的生活態度。',
      '【信仰的張力】如果智慧（做對的事）真的不能保證你遠離苦難（傳道書/約伯記），你還會選擇走這條「敬畏」的路嗎？為什麼？'
    ],
    summary: '智慧不是用來掌控人生以求安穩，而是在萬變的世界中，每天都選擇走進「敬畏神」的宴席。'
  },
  {
    id: 2,
    cycleId: 1,
    title: '第 2 課｜因果報應是真的嗎？',
    subtitle: '當善惡與報償不再掛鉤',
    lifeQuestions: ['你相信「好人有好報」嗎？如果是，當你看到好人受苦時，你會如何調整你的信念？', '生活中是否有過「壞人飛黃騰達」的觀察讓你感到憤怒？'],
    perspectives: {
      [PerspectiveType.ORDER]: { book: '箴言', theme: '善惡有別', description: '「惡人受自己的罪孽捉住。」（箴 5:22）。世界存在道德規律，行為必有其後果。' },
      [PerspectiveType.VANITY]: { book: '傳道書', theme: '義人受苦', description: '「有義人行義，反而職能滅亡。」（傳 7:15）。日光之下，因果鏈條經常出現斷裂與混亂。' },
      [PerspectiveType.COLLAPSE]: { book: '約伯記', theme: '義人崩潰', description: '約伯的朋友堅持「你受苦必因有罪」，但約伯堅稱無辜。上帝最終指責朋友說話不正確。' }
    },
    tensionGuides: ['因果是生活的指引（箴言），稱不上是用來解釋一切痛苦的唯一公式（傳道書與約伯記）。'],
    discussionPrompts: [
      '當「因果」失效時，是什麼支撐你繼續選擇正直？',
      '約伯友人的神學邏輯錯在哪裡？'
    ],
    summary: '信仰不是投資，而是即便在混亂中仍選擇守住純正。'
  },
  {
    id: 3,
    cycleId: 1,
    title: '第 3 課｜努力是否有意義？',
    subtitle: '在勤奮、捕風與失去之間',
    lifeQuestions: ['描述一次你非常努力卻毫無收穫的經驗。那次經驗讓你對「努力」的定義有改變嗎？'],
    perspectives: {
      [PerspectiveType.ORDER]: { book: '箴言', theme: '勤奮蒙福', description: '「手勤的，卻要富足。」（箴 10:4）。勤勞是人生穩定的基石。' },
      [PerspectiveType.VANITY]: { book: '傳道書', theme: '勞碌捕風', description: '「勞碌得來的...誰知道是給智慧人還是愚昧人？」（傳 2:19）。成果無法延續，本質上是虛空。' },
      [PerspectiveType.COLLAPSE]: { book: '約伯記', theme: '努力仍失去一切', description: '約伯努力經營家產與靈性多年，卻在一夕之間化為灰燼。' }
    },
    tensionGuides: ['勤奮是人的責任，但結果的主權在上帝手中。'],
    discussionPrompts: ['如何在「虛空」的現實中，依然保有工作的喜樂與熱情？'],
    summary: '工作是上帝的禮物，但不是我們的救贖。'
  },
  {
    id: 4,
    cycleId: 1,
    title: '第 4 課｜品格能保護人嗎？',
    subtitle: '正直的界限與價值',
    lifeQuestions: ['你覺得「正直」在現代社會是一種生存優勢，還是一種奢求？'],
    perspectives: {
      [PerspectiveType.ORDER]: { book: '箴言', theme: '義人的路', description: '「正直人的純正必引導自己。」（箴 11:3）。品格是靈魂的安全導航。' },
      [PerspectiveType.VANITY]: { book: '傳道書', theme: '正直不保證結果', description: '「不要行義過分，何必自取毀滅？」（傳 7:16）。誠實地面對極端正直在破碎世界中的張力。' },
      [PerspectiveType.COLLAPSE]: { book: '約伯記', theme: '完全人仍被擊打', description: '約伯的「完全」反而成為天界角力的焦點。' }
    },
    tensionGuides: ['品格不是為了逃避痛苦的保險單，而是為了在痛苦中仍能昂首的尊嚴。'],
    discussionPrompts: ['如果「上帝的稱讚」帶來的是考驗而非獎勵，你還願意堅持品格嗎？'],
    summary: '品格的價值不在於其帶來的利益，而在於其本身的真實。'
  },
  {
    id: 5,
    cycleId: 1,
    title: '第 5 課｜世界是否公平？',
    subtitle: '正義秩序、不公常態與極限',
    lifeQuestions: ['當你看到「惡人長壽、好人短命」時，你最想對神說什麼？'],
    perspectives: {
      [PerspectiveType.ORDER]: { book: '箴言', theme: '正義秩序', description: '「公平的升和秤都屬耶和華。」（箴 16:11）。神是秩序的維護者。' },
      [PerspectiveType.VANITY]: { book: '傳道書', theme: '不公平是常態', description: '「我見權力位下有奸惡。」（傳 3:16）。人間政體與制度本質上是不完善的。' },
      [PerspectiveType.COLLAPSE]: { book: '約伯記', theme: '不公平的極限', description: '約伯在灰塵中抗議不公，他在痛苦中挑戰神與他的合約。' }
    },
    tensionGuides: ['不公平不代表神不在場，之後的世界尚未完全被恢復。'],
    discussionPrompts: ['在不公平的世界裡，我們該如何扮演上帝公義的代言人？'],
    summary: '公義不是即時的演算結果，而是終極的盼望。'
  },
  {
    id: 6,
    cycleId: 1,
    title: '第 6 課｜信仰給的是答案還是方向？',
    subtitle: '三卷書的信仰功能總結',
    lifeQuestions: ['你來到信仰中，是為了找一套「問題解釋」還是「生活伴侶」？'],
    perspectives: {
      [PerspectiveType.ORDER]: { book: '箴言', theme: '正常人生：導航', description: '提供負責任的生活模式。' },
      [PerspectiveType.VANITY]: { book: '傳道書', theme: '無常人生：清醒', description: '教我們在虛幻中擁抱當下的分。' },
      [PerspectiveType.COLLAPSE]: { book: '約伯記', theme: '反常人生：沈默', description: '教我們在神沈默時如何哀慟與堅持。' }
    },
    tensionGuides: ['成熟的信仰必須同時容納這三種聲音：導航、清醒與沈默。'],
    discussionPrompts: ['這六堂課下來，你對「上帝」的看法有什麼轉變？'],
    summary: '智慧是學會在不同人生狀態中，知道該用哪一種誠實來活。'
  },

  ...Array.from({ length: 18 }, (_, i) => ({
    id: i + 7,
    cycleId: Math.floor(i / 6) + 2,
    title: `第 ${i + 7} 課｜進階課題`,
    subtitle: '內容正在規劃中',
    lifeQuestions: ['思考一個與本階段主題相關的問題。'],
    perspectives: {
      [PerspectiveType.ORDER]: { book: '箴言', theme: '秩序', description: '生活常規。' },
      [PerspectiveType.VANITY]: { book: '傳道書', theme: '虛空', description: '人生有限。' },
      [PerspectiveType.COLLAPSE]: { book: '約伯記', theme: '崩潰', description: '痛苦沈思。' }
    },
    tensionGuides: ['這是一個待開發的張力引導主題。'],
    discussionPrompts: ['這是一個待開發的討論題目。'],
    summary: '待開發的智慧總結。'
  }))
];
