import React from 'react';

interface MonthlyReading {
  month: string;
  monthNum: number;
  book: string;
  description: string;
  chapters: string;
}

interface Season {
  name: string;
  months: MonthlyReading[];
  theme: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

const SEASONS: Season[] = [
  {
    name: '春季',
    theme: '生命萌芽・智慧啟程',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: '🌸',
    months: [
      {
        month: '一月',
        monthNum: 1,
        book: '馬太福音',
        description: '在經文中遇見那位君王',
        chapters: '第 1-28 章'
      },
      {
        month: '二月',
        monthNum: 2,
        book: '以賽亞書',
        description: '審判中的呼召，黑暗中的盼望',
        chapters: '第 1-39 章'
      },
      {
        month: '三月',
        monthNum: 3,
        book: ['加拉太書', '以弗所書', '腓立比書', '歌羅西書'][Math.floor(Math.random() * 4)],
        description: '在基督教裏，新做的人',
        chapters: '加拉太書・以弗所書・腓立比書・歌羅西書'
      }
    ]
  },
  {
    name: '夏季',
    theme: '深思熟慮・探索人生', 
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: '☀️',
    months: [
      {
        month: '四月',
        monthNum: 4,
        book: '',
        description: '',
        chapters: ''
      },
      {
        month: '五月',
        monthNum: 5,
        book: '',
        description: '',
        chapters: ''
      },
      {
        month: '六月',
        monthNum: 6,
        book: '',
        description: '',
        chapters: ''
      }
    ]
  },
  {
    name: '秋季',
    theme: '',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: '🍂',
    months: [
      {
        month: '七月',
        monthNum: 7,
        book: '',
        description: '',
        chapters: ''
      },
      {
        month: '八月',
        monthNum: 8,
        book: '',
        description: '',
        chapters: ''
      },
      {
        month: '九月',
        monthNum: 9,
        book: '',
        description: '',
        chapters: ''
      }
    ]
  },
  {
    name: '冬季',
    theme: '',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    icon: '❄️',
    months: [
      {
        month: '十月',
        monthNum: 10,
        book: '',
        description: '',
        chapters: ''
      },
      {
        month: '十一月',
        monthNum: 11,
        book: '',
        description: '',
        chapters: ''
      },
      {
        month: '十二月',
        monthNum: 12,
        book: '',
        description: '',
        chapters: ''
      }
    ]
  }
];

const getCurrentSeason = (): Season => {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 1 && month <= 3) return SEASONS[0]; // 春季
  if (month >= 4 && month <= 6) return SEASONS[1]; // 夏季
  if (month >= 7 && month <= 9) return SEASONS[2]; // 秋季
  return SEASONS[3]; // 冬季
};

const getCurrentMonth = (): number => {
  return new Date().getMonth() + 1;
};

interface SeasonalReadingGuideProps {
  chaptersRead?: Record<number, string>;
  modules?: { id: number; title: string }[];
}

const SeasonalReadingGuide: React.FC<SeasonalReadingGuideProps> = ({ chaptersRead = {}, modules = [] }) => {
  // Helper to get chapters read for a specific month
  // Matches module by index (module 0 = month 1, module 1 = month 2, etc.)
  const getChaptersReadForMonth = (monthNum: number): string | null => {
    // Try to find module by index (monthNum - 1)
    const moduleByIndex = modules[monthNum - 1];
    if (moduleByIndex && chaptersRead[moduleByIndex.id]) {
      return chaptersRead[moduleByIndex.id];
    }
    // Fallback: try to find module with matching ID
    if (chaptersRead[monthNum]) {
      return chaptersRead[monthNum];
    }
    return null;
  };
  const currentSeason = getCurrentSeason();
  const currentMonth = getCurrentMonth();
  const currentReading = currentSeason.months.find(m => m.monthNum === currentMonth);

  return (
    <div className="space-y-8">
      {/* Current Season Header */}
      <div className={`${currentSeason.bgColor} ${currentSeason.borderColor} border-2 rounded-2xl p-6 md:p-8`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-4xl">{currentSeason.icon}</span>
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold ${currentSeason.color}`}>
                {currentSeason.name}讀經計劃
              </h2>
              <p className="text-slate-600 mt-1">{currentSeason.theme}</p>
            </div>
          </div>
        </div>

        {/* Current Month Highlight */}
        {currentReading && (
          <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center space-x-2 mb-3">
              <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">
                本月進度
              </span>
              <span className="text-slate-500">{currentReading.month}</span>
              {getChaptersReadForMonth(currentMonth) && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  ✅ 已讀 {getChaptersReadForMonth(currentMonth)} 章
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              📖 {currentReading.book}
            </h3>
            <p className="text-slate-600 mb-2">{currentReading.description}</p>
            <p className="text-amber-600 font-medium">{currentReading.chapters}</p>
          </div>
        )}

        {/* Season Monthly Overview */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentSeason.months.map((reading) => (
            <div
              key={reading.monthNum}
              className={`p-4 rounded-lg transition-all ${
                reading.monthNum === currentMonth
                  ? 'bg-white shadow-md border-2 border-amber-300'
                  : 'bg-white/60 border border-slate-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium ${
                  reading.monthNum === currentMonth ? 'text-amber-700' : 'text-slate-600'
                }`}>
                  {reading.month}
                </span>
                {reading.monthNum === currentMonth && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {getChaptersReadForMonth(reading.monthNum)
                      ? `✅ 已讀 ${getChaptersReadForMonth(reading.monthNum)} 章`
                      : '進行中'}
                  </span>
                )}
              </div>
              <p className="font-bold text-slate-800">{reading.book}</p>
              <p className="text-sm text-slate-500 mt-1">{reading.chapters}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Full Year Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="mr-2">📅</span>
          全年讀經安排
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SEASONS.map((season) => (
            <div
              key={season.name}
              className={`rounded-xl p-4 ${season.bgColor} ${season.borderColor} border ${
                season.name === currentSeason.name ? 'ring-2 ring-amber-400 ring-offset-2' : ''
              }`}
            >
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-2xl">{season.icon}</span>
                <span className={`font-bold ${season.color}`}>{season.name}</span>
                {season.name === currentSeason.name && (
                  <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full ml-auto">
                    當前
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">{season.theme}</p>
              <div className="space-y-2">
                {season.months.map((m) => (
                  <div
                    key={m.monthNum}
                    className={`text-sm flex justify-between ${
                      m.monthNum === currentMonth ? 'font-bold text-amber-700' : 'text-slate-600'
                    }`}
                  >
                    <span>{m.month}</span>
                    <span>{m.book}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wisdom Quote */}
      <div className="text-center py-6 px-4">
        <blockquote className="text-lg text-slate-600 italic max-w-2xl mx-auto">
          「⋯⋯這聖經能使你因在基督耶穌裏的信有得救的智慧。 聖經都是上帝所默示的，於教訓、督責、使人歸正、教導人學義都是有益的， 叫屬上帝的人得以完全，預備行各樣的善事。。」
        </blockquote>
        <cite className="text-sm text-slate-400 mt-2 block">— 提摩太後書 3:15-17</cite>
      </div>
    </div>
  );
};

export default SeasonalReadingGuide;
