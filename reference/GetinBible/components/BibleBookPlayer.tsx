
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Module, PerspectiveType, ScripturePoint, User } from '../types';
import { getWisdomAssistantResponse } from '../services/geminiService';
import { saveResponse, getUserResponses } from '../services/responseService';
import AudioNarration from './AudioNarration';
import SpeechInputButton from './SpeechInputButton';
import ClassInsight from './ClassInsight';
import MichaelChat from './MichaelChat';
import MichaelStudentHelper from './MichaelStudentHelper';
import GroupDiscussion from './GroupDiscussion';
import MediaEmbed from '../src/components/MediaEmbed';
import BibleReader from './BibleReader';

// Bible book chapter counts
const BIBLE_CHAPTER_COUNTS: Record<string, number> = {
  // Old Testament
  '創世記': 50, '出埃及記': 40, '利未記': 27, '民數記': 36, '申命記': 34,
  '約書亞記': 24, '士師記': 21, '路得記': 4, '撒母耳記上': 31, '撒母耳記下': 24,
  '列王紀上': 22, '列王紀下': 25, '歷代志上': 29, '歷代志下': 36, '以斯拉記': 10,
  '尼希米記': 13, '以斯帖記': 10, '約伯記': 42, '詩篇': 150, '箴言': 31,
  '傳道書': 12, '雅歌': 8, '以賽亞書': 66, '耶利米書': 52, '耶利米哀歌': 5,
  '以西結書': 48, '但以理書': 12, '何西阿書': 14, '約珥書': 3, '阿摩司書': 9,
  '俄巴底亞書': 1, '約拿書': 4, '彌迦書': 7, '那鴻書': 3, '哈巴谷書': 3,
  '西番雅書': 3, '哈該書': 2, '撒迦利亞書': 14, '瑪拉基書': 4,
  // New Testament
  '馬太福音': 28, '馬可福音': 16, '路加福音': 24, '約翰福音': 21, '使徒行傳': 28,
  '羅馬書': 16, '哥林多前書': 16, '哥林多後書': 13, '加拉太書': 6, '以弗所書': 6,
  '腓立比書': 4, '歌羅西書': 4, '帖撒羅尼迦前書': 5, '帖撒羅尼迦後書': 3,
  '提摩太前書': 6, '提摩太後書': 4, '提多書': 3, '腓利門書': 1, '希伯來書': 13,
  '雅各書': 5, '彼得前書': 5, '彼得後書': 3, '約翰一書': 5, '約翰二書': 1,
  '約翰三書': 1, '猶大書': 1, '啟示錄': 22
};

// Bible.com book codes (USFM format) for RCUV version (ID: 139)
const BIBLE_BOOK_CODES: Record<string, string> = {
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

// Generate Bible.com URL for RCUV version
const getBibleComUrl = (bookName: string, chapter: string): string | null => {
  const bookCode = BIBLE_BOOK_CODES[bookName];
  if (!bookCode || !chapter) return null;
  return `https://www.bible.com/bible/139/${bookCode}.${chapter}.RCUV`;
};

interface BibleBookPlayerProps {
  module: Module;
  user: User | null;
  onComplete: () => void;
}

type Step = 'LIFE_QUESTION' | 'PERSPECTIVES' | 'TENSION' | 'DISCUSSION' | 'SUMMARY';

const BibleBookPlayer: React.FC<BibleBookPlayerProps> = ({ module, user, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('PERSPECTIVES');
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [showClassInsight, setShowClassInsight] = useState(false);
  const [startChapter, setStartChapter] = useState<string>('');
  const [endChapter, setEndChapter] = useState<string>('');
  const [chaptersRead, setChaptersRead] = useState<string>('');
  const [showBibleReader, setShowBibleReader] = useState(false);
  const [bibleReaderChapter, setBibleReaderChapter] = useState<number>(1);

  // Get total chapters for the current book (module title)
  const totalChapters = BIBLE_CHAPTER_COUNTS[module.title] || 1;

  const peerData = useMemo(() => {
    return {
      responses: [
        "與家人共進晚餐並分享當天趣事", "練習鋼琴演奏與古典音樂欣賞", "在社區公園慢跑與體能鍛鍊",
        "閱讀歷史書籍深入了解古代文明", "陪伴年邁父母散步並傾聽往事", "參加志工服務回饋社會需求",
        "鑽研烹飪技巧為愛人製作美食", "學習外語提升國際視野與溝通", "在陽台種植花卉觀察生命成長",
        "冥想與自我對話尋求內心平靜", "與好友深入談論人生理想與規劃", "觀看紀錄片反思環境與運續議題"
      ],
      stats: {
        '是': 12,
        '不是': 4,
        '不知道': 7
      }
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Load existing responses from database on mount
  useEffect(() => {
    if (user?.id) {
      console.log('[BibleBookPlayer] Loading responses for user:', user.id, 'module:', module.id);
      getUserResponses(user.id, module.id).then(responses => {
        console.log('[BibleBookPlayer] Loaded responses:', responses);
        console.log('[BibleBookPlayer] Number of responses:', Object.keys(responses).length);
        setUserInputs(responses);
        // Load chapters read if saved
        if (responses['chapters_read']) {
          setChaptersRead(responses['chapters_read']);
        }
      }).catch(err => {
        console.error('[BibleBookPlayer] Failed to load responses:', err);
      });
    } else {
      console.warn('[BibleBookPlayer] No user ID available, skipping response load');
    }
  }, [user?.id, module.id]);

  // Debounced auto-save function
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback((key: string, value: string) => {
    if (!user?.id) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for 1 second debounce
    saveTimeoutRef.current = setTimeout(() => {
      saveResponse(user.id, module.id, key, value).catch(err => {
        console.error('Auto-save failed:', err);
      });
    }, 1000);
  }, [user?.id, module.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (key: string, value: string) => {
    setUserInputs(prev => ({ ...prev, [key]: value }));

    // Trigger auto-save
    debouncedSave(key, value);
  };

  const handleSpeechTranscript = (key: string, transcript: string) => {
    const currentVal = userInputs[key] || '';
    const newVal = currentVal ? `${currentVal} ${transcript}` : transcript;
    handleInputChange(key, newVal);
  };

  const submitQuestion = async () => {
    const responses = module.lifeQuestions.map((q, idx) => {
      const val = userInputs[`life_question_input_${idx}`];
      return val ? `問題：${q.questionText}\n回答：${val}` : null;
    }).filter(Boolean).join('\n\n');

    if (!userInputs['life_question_input_0']) return;

    setIsLoadingFeedback(true);

    let feedback: string;
    // 如果是第 1 課，我們不調用 AI 獲取回饋，直接跳轉到數據展示
    if (module.id === 1) {
      // 稍微模擬一下加載感，讓體驗更平滑
      await new Promise(resolve => setTimeout(resolve, 800));
      feedback = "SKIPPED_FOR_MODULE_1";
      setAiFeedback(feedback);
    } else {
      feedback = await getWisdomAssistantResponse(module, "生活回饋與反思", responses);
      setAiFeedback(feedback);
    }

    // Save AI feedback to database
    if (user?.id && feedback && feedback !== "SKIPPED_FOR_MODULE_1") {
      const firstQuestionKey = 'life_question_input_0';
      await saveResponse(
        user.id,
        module.id,
        firstQuestionKey,
        userInputs[firstQuestionKey] || '',
        feedback
      ).catch(err => console.error('Failed to save AI feedback:', err));
    }

    setIsLoadingFeedback(false);
    setShowClassInsight(true);
  };

  // Helper to render structured text beautifully
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={i} className="h-4" />;
      
      // Horizontal Rule
      if (trimmedLine.startsWith('⸻')) {
        return <hr key={i} className="my-6 border-slate-200" />;
      }

      // Bold headers or specific patterns
      const isHeader = trimmedLine.startsWith('【') || (trimmedLine.includes('：') && trimmedLine.length < 35);
      const isPoint = trimmedLine.startsWith('●') || trimmedLine.startsWith('•') || /^\d+\./.test(trimmedLine);
      const isQuote = trimmedLine.startsWith('「') && trimmedLine.endsWith('」');

      return (
        <div 
          key={i} 
          className={`leading-relaxed mb-2 ${
            isHeader ? 'text-slate-900 font-bold text-lg mt-6 mb-3' : 
            isPoint ? 'text-slate-800 font-semibold mt-4 text-base' : 
            isQuote ? 'text-amber-800 italic font-medium py-1 bg-amber-50/50 px-2 rounded border-l-2 border-amber-200' :
            'text-slate-700'
          }`}
        >
          {trimmedLine}
        </div>
      );
    });
  };

  const narrationText = useMemo(() => {
    switch (currentStep) {
      case 'LIFE_QUESTION':
        const feedbackPart = (module.id !== 1 && aiFeedback && aiFeedback !== "SKIPPED_FOR_MODULE_1")
          ? `。導師的回饋是：${aiFeedback}`
          : '';
        return `生活提問：${module.lifeQuestions.map(q => q.questionText).join('。位')}。${feedbackPart}`;
      case 'PERSPECTIVES':
        return (Object.values(module.perspectives) as ScripturePoint[])
          .map(p => `${p.book}的觀點：${p.theme}。${p.description}`)
          .join('。');
      case 'TENSION':
        return `經文困難或痛點：${module.tensionGuides.join('。')}`;
      case 'DISCUSSION':
        return `互動討論提問：${module.discussionPrompts.join('。')}`;
      case 'SUMMARY':
        return `今天的安靜整合：${module.summary}`;
      default:
        return "";
    }
  }, [currentStep, module, aiFeedback]);

  const renderStep = () => {
    switch (currentStep) {
      case 'LIFE_QUESTION':
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-lg">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-amber-900">第二階段：經卷提問 (8分鐘)</h3>
                <div className="flex items-center gap-3">
                  <MichaelStudentHelper stepType="life_questions" module={module} />
                  <AudioNarration text={narrationText} />
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed mb-6 italic">弟兄姊妹：若覺得不適合或困難，不需要繼續</p>
              <div className="space-y-8">
                {module.lifeQuestions.map((q, idx) => {
                  const isMultiChoice = q.questionType === 'multi_choice';
                  const options = q.options || [];
                  return (
                    <div key={q.id || `question-${idx}`} className="bg-white/50 p-4 rounded-xl">
                      {/* Media/Resource (if provided) */}
                      {(q.mediaUrl || q.youtubeUrl) && (
                        <div className="mb-6">
                          <div className="flex items-center mb-3">
                            <span className="text-2xl mr-2">🎬</span>
                            <p className="text-sm font-medium text-slate-600">
                              先觀看媒體資源，幫助你思考這個問題
                            </p>
                          </div>
                          <MediaEmbed url={q.mediaUrl || q.youtubeUrl || ''} title={`Life Question ${idx + 1} Media`} />
                        </div>
                      )}

                      <div className="flex justify-between items-center mb-3">
                        <p className="font-medium text-slate-800 text-lg flex-grow pr-4">{q.questionText}</p>
                        {!isMultiChoice && (
                          <SpeechInputButton
                            onTranscript={(t) => handleSpeechTranscript(`life_question_input_${idx}`, t)}
                          />
                        )}
                      </div>
                      <div className="relative">
                        {isMultiChoice ? (
                          <div className="flex flex-wrap gap-4 mt-2">
                            {options.map(option => (
                              <label
                                key={option}
                                className={`flex items-center space-x-3 cursor-pointer px-6 py-3 rounded-full border-2 transition-all ${
                                  userInputs[`life_question_input_${idx}`] === option
                                    ? 'bg-amber-100 border-amber-500 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`life_question_input_${idx}`}
                                  value={option}
                                  checked={userInputs[`life_question_input_${idx}`] === option}
                                  onChange={(e) => handleInputChange(`life_question_input_${idx}`, e.target.value)}
                                  className="w-5 h-5 text-amber-600 border-slate-300 focus:ring-amber-500"
                                />
                                <span className={`text-lg font-medium ${
                                  userInputs[`life_question_input_${idx}`] === option ? 'text-amber-900' : 'text-slate-600'
                                }`}>
                                  {option}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all bg-white/80"
                            placeholder="在此寫下您的想法 or 點擊上方麥克風..."
                            value={userInputs[`life_question_input_${idx}`] || ''}
                            onChange={(e) => handleInputChange(`life_question_input_${idx}`, e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {!aiFeedback && !isLoadingFeedback && (
                <button 
                  onClick={submitQuestion}
                  disabled={!userInputs['life_question_input_0']}
                  className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-full hover:bg-slate-800 disabled:opacity-50 transition-all font-medium shadow-md w-full sm:w-auto"
                >
                  尋求啟發並觀看同學回應
                </button>
              )}

              {isLoadingFeedback && (
                <div className="mt-8 flex items-center space-x-3 text-slate-500 italic">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
                  <span>正在彙整課堂數據...</span>
                </div>
              )}

              {aiFeedback && (
                <div className="mt-8 animate-slideUp">
                  {/* 第 1 課不顯示 AI 導師回饋 */}
                  {module.id !== 1 && aiFeedback !== "SKIPPED_FOR_MODULE_1" && (
                    <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-inner mb-8">
                      <h4 className="text-amber-600 font-bold mb-3 flex items-center">
                        <span className="mr-2 text-xl">💡</span> 智慧導師的回饋：
                      </h4>
                      <p className="text-slate-700 leading-relaxed text-lg">{aiFeedback}</p>
                    </div>
                  )}

                  {showClassInsight && (
                    <ClassInsight 
                      moduleId={module.id} 
                      userResponses={userInputs} 
                      peerData={peerData}
                    />
                  )}

                  <div className="mt-10 flex justify-between items-center">
                    <button onClick={() => setCurrentStep('PERSPECTIVES')} className="text-slate-500 hover:text-slate-800 font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                      返回
                    </button>
                    <button
                      onClick={() => setCurrentStep('TENSION')}
                      className="bg-amber-600 text-white px-8 py-4 rounded-full hover:bg-amber-700 transition-all font-bold shadow-lg flex items-center justify-center space-x-2"
                    >
                      <span>下一步：進入經卷痛點</span>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'PERSPECTIVES':
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-800">第一階段：書卷 (20分鐘)</h3>
              <div className="flex items-center gap-3">
                <MichaelStudentHelper stepType="perspectives" module={module} />
                {/* AI Sunday School Link - All modules */}
                <a
                  href="https://ai-sunday-school.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-all shadow-md hover:shadow-lg hover:scale-105"
                  title="AI 主日學探索"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 1H9c-1.1 0-2 .9-2 2v3h2V4h10v16H9v-2H7v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zM7.01 13.47l-2.55-2.55-1.27 1.27L7 16l7.19-7.19-1.27-1.27z"/>
                  </svg>
                </a>
                {/* Bible Link - Module 1 only */}
                {module.id === 1 && (
                  <a
                    href="https://www.bible.com/bible/46/PRO.1.CUNP-%E7%A5%9E"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-md hover:shadow-lg hover:scale-105"
                    title="查看經文"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                    </svg>
                  </a>
                )}
                <AudioNarration text={narrationText} />
              </div>
            </div>

            {/* Chapter Selection */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-amber-800 mb-4">{module.title}</h4>
              {/* Row 1: Start chapter, end chapter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    今天你想讀哪一章或哪幾章
                  </label>
                  <select
                    value={startChapter}
                    onChange={(e) => setStartChapter(e.target.value)}
                    className="w-full px-4 py-3 border border-amber-300 rounded-xl text-base focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                  >
                    <option value="">請選擇開始章數</option>
                    {Array.from({ length: totalChapters }, (_, i) => i + 1).map(chapter => (
                      <option key={chapter} value={String(chapter)}>{chapter}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    今天閱讀完結的章數
                  </label>
                  <select
                    value={endChapter}
                    onChange={(e) => setEndChapter(e.target.value)}
                    className="w-full px-4 py-3 border border-amber-300 rounded-xl text-base focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                  >
                    <option value="">請選擇完結章數</option>
                    {Array.from({ length: totalChapters }, (_, i) => i + 1).map(chapter => (
                      <option key={chapter} value={String(chapter)}>{chapter}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Duplicate chapter selector */}
              <div className="mt-4">
                <div className="md:w-1/2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    今天你想讀哪一章或哪幾章
                  </label>
                  <select
                    value={startChapter}
                    onChange={(e) => setStartChapter(e.target.value)}
                    className="w-full px-4 py-3 border border-amber-300 rounded-xl text-base focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                  >
                    <option value="">請選擇開始章數</option>
                    {Array.from({ length: totalChapters }, (_, i) => i + 1).map(chapter => (
                      <option key={chapter} value={String(chapter)}>{chapter}</option>
                    ))}
                  </select>
                </div>
              </div>
              {startChapter && endChapter && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-amber-700">
                    📖 閱讀範圍：{module.title} 第 {startChapter} 章 至 第 {endChapter} 章
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Bible.com Link */}
                    {getBibleComUrl(module.title, startChapter) && (
                      <a
                        href={getBibleComUrl(module.title, startChapter)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                        </svg>
                        開啟 Bible.com (RCUV)
                      </a>
                    )}
                    {/* Bible Reader with Cantonese TTS */}
                    <button
                      onClick={() => {
                        setBibleReaderChapter(Number(startChapter));
                        setShowBibleReader(true);
                      }}
                      className="inline-flex items-center justify-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      粵語朗讀經文 (CUV)
                    </button>
                  </div>
                </div>
              )}

              {/* Chapters Read Dropdown */}
              <div className="mt-6 pt-6 border-t border-amber-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  已讀的章數
                </label>
                <select
                  value={chaptersRead}
                  onChange={(e) => {
                    setChaptersRead(e.target.value);
                    if (e.target.value) {
                      debouncedSave('chapters_read', e.target.value);
                    }
                  }}
                  className="w-full md:w-48 px-4 py-3 border border-amber-300 rounded-xl text-base focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                >
                  <option value="">請選擇</option>
                  {Array.from({ length: totalChapters }, (_, i) => i + 1).map(chapter => (
                    <option key={chapter} value={String(chapter)}>{chapter}</option>
                  ))}
                </select>
                {chaptersRead && (
                  <p className="mt-2 text-sm text-amber-700">
                    ✅ 已讀 {chaptersRead} 章
                  </p>
                )}
              </div>
            </div>

            {/* 經卷主題和概要 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 經卷主題 Card */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-amber-800">經卷主題</h4>
                </div>
                <p className="text-xl font-semibold text-slate-800 leading-relaxed">
                  {module.perspectives[PerspectiveType.ORDER]?.theme || '尚未設定主題'}
                </p>
              </div>

              {/* 經卷概要 Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-blue-800">經卷概要</h4>
                </div>
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {module.perspectives[PerspectiveType.ORDER]?.description || '尚未設定概要'}
                </div>
              </div>
            </div>

            {/* 估計寫作目的 Card with TTS */}
            {module.perspectives[PerspectiveType.ORDER]?.writingPurpose && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-green-800">估計寫作目的 (供參考)</h4>
                  </div>
                  <AudioNarration text={module.perspectives[PerspectiveType.ORDER]?.writingPurpose || ''} />
                </div>
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {module.perspectives[PerspectiveType.ORDER]?.writingPurpose}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-12">
              <button onClick={() => setCurrentStep('LIFE_QUESTION')} className="bg-slate-900 text-white px-8 py-3 rounded-full hover:bg-slate-800 font-bold shadow-md">下一步：進入經卷問題</button>
            </div>
          </div>
        );

      case 'TENSION':
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-800">第三階段：經文困難或痛點 (15分鐘)</h3>
              <div className="flex items-center gap-3">
                <MichaelStudentHelper stepType="tension" module={module} />
                {module.id === 1 && (
                  <a
                    href="https://www.bible.com/bible/46/PRO.1.CUNP-%E7%A5%9E"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-md hover:shadow-lg hover:scale-105"
                    title="查看經文"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                    </svg>
                  </a>
                )}
                <AudioNarration text={narrationText} />
              </div>
            </div>
            <div className="bg-white border-2 border-amber-200 p-6 md:p-10 rounded-3xl shadow-sm">
              <div className="mb-8">
                <h4 className="text-2xl font-bold text-slate-900 flex items-center mb-1">
                  <svg className="w-6 h-6 mr-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {module.id === 1 ? '弟兄姊妹：若覺得不適合或困難，不需要繼續' : '如何處理這些矛盾？'}
                </h4>
                {module.id === 1 && (
                  <p className="text-amber-700 font-bold ml-9">經卷思想問題</p>
                )}
              </div>
              <div className="text-lg text-slate-700 leading-relaxed mb-8 serif space-y-6">
                {module.tensionGuides.map((guide, idx) => (
                  <div key={idx} className={idx > 0 ? "pt-4 border-t border-amber-100" : ""}>
                    {renderFormattedText(guide)}
                    {/* Show download buttons for documents attached to this pain point */}
                    {module.tensionDocuments && module.tensionDocuments[idx] && module.tensionDocuments[idx].length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {module.tensionDocuments[idx].map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium transition-colors"
                          >
                            {doc.fileType === 'pdf' ? (
                              <svg className="w-4 h-4 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="truncate max-w-[150px]">{doc.fileName}</span>
                            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setCurrentStep('LIFE_QUESTION')} className="text-slate-500 hover:text-slate-800 font-medium">返回</button>
              <button onClick={() => setCurrentStep('DISCUSSION')} className="bg-slate-900 text-white px-8 py-3 rounded-full hover:bg-slate-800 font-bold shadow-md">小組互動討論</button>
            </div>
          </div>
        );

      case 'DISCUSSION':
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-800">第四階段：互動討論 (12分鐘)</h3>
              <div className="flex items-center gap-3">
                <MichaelStudentHelper stepType="discussion" module={module} />
                {module.id === 1 && (
                  <a
                    href="https://www.bible.com/bible/46/PRO.1.CUNP-%E7%A5%9E"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-md hover:shadow-lg hover:scale-105"
                    title="查看經文"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                    </svg>
                  </a>
                )}
                <AudioNarration text={narrationText} />
              </div>
            </div>
            <div className="space-y-6">
              {module.discussionPrompts.map((prompt, idx) => (
                <div key={`prompt-${idx}-${prompt.substring(0, 20)}`} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-lg font-bold text-slate-800 flex-grow pr-4">{prompt}</p>
                    <SpeechInputButton 
                      onTranscript={(t) => handleSpeechTranscript(`discussion_${idx}`, t)} 
                    />
                  </div>
                  <textarea
                    className="w-full h-32 p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none shadow-inner"
                    placeholder="在此輸入討論記錄或點擊麥克風..."
                    value={userInputs[`discussion_${idx}`] || ''}
                    onChange={(e) => handleInputChange(`discussion_${idx}`, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Group Discussion Section */}
            {user && (
              <div className="mt-8">
                <GroupDiscussion
                  module={module}
                  userId={user.id}
                  currentUserResponses={userInputs}
                />
              </div>
            )}

            {/* Michael AI Teaching Assistant Section */}
            {userInputs['discussion_0'] && user && (
              <div className="mt-12 border-t-2 border-amber-200 pt-8">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-2xl">👩‍🏫</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">與 Michael 對話</h4>
                      <p className="text-sm text-slate-600">智慧助教陪你深入探討</p>
                    </div>
                  </div>
                  <MichaelChat
                    moduleId={module.id}
                    module={module}
                    userId={user.id}
                    discussionResponses={userInputs}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button onClick={() => setCurrentStep('TENSION')} className="text-slate-500 hover:text-slate-800 font-medium">返回</button>
              <button onClick={() => setCurrentStep('SUMMARY')} className="bg-slate-900 text-white px-8 py-3 rounded-full hover:bg-slate-800 font-bold shadow-md">最後反思</button>
            </div>
          </div>
        );

      case 'SUMMARY':
        return (
          <div className="space-y-12 animate-fadeIn text-center py-8">
            <div className="max-w-xl mx-auto space-y-8">
              <div className="flex flex-col items-center space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">第五階段：安靜整合 (5分鐘)</h3>
                <div className="flex items-center gap-3">
                  <MichaelStudentHelper stepType="summary" module={module} />
                  <AudioNarration text={narrationText} />
                </div>
              </div>
              <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-2xl">
                <p className="text-2xl font-bold mb-6 serif leading-relaxed">
                  「{module.summary}」
                </p>
              </div>
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-center space-x-3">
                  <p className="text-slate-600 font-medium">寫下一句話給今天的自己：</p>
                  <SpeechInputButton 
                    onTranscript={(t) => handleSpeechTranscript('summary_input', t)} 
                  />
                </div>
                <input 
                  type="text" 
                  className="w-full border-b-2 border-slate-300 focus:border-amber-500 py-3 px-2 outline-none text-xl text-center text-slate-800 bg-transparent"
                  placeholder="在此輸入或點擊語音按鈕..."
                  value={userInputs['summary_input'] || ''}
                  onChange={(e) => handleInputChange('summary_input', e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center mt-8">
                <button onClick={() => setCurrentStep('DISCUSSION')} className="text-slate-500 hover:text-slate-800 font-medium flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                  返回
                </button>
                <button
                  onClick={onComplete}
                  className="bg-amber-600 text-white px-12 py-4 rounded-full hover:bg-amber-700 transition-all font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  完成本月經文學習
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'PERSPECTIVES', label: '書卷' },
    { key: 'LIFE_QUESTION', label: '經卷提問' },
    { key: 'TENSION', label: '經文痛點' },
    { key: 'DISCUSSION', label: '互動討論' },
    { key: 'SUMMARY', label: '安靜整合' }
  ];

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header with Home Button */}
      <div className="relative mb-10">
        <button
          onClick={onComplete}
          className="absolute right-0 top-0 flex items-center space-x-2 text-slate-500 hover:text-amber-600 transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>回到首頁</span>
        </button>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-2 serif">
            {module.title}
          </h2>
          <p className="text-slate-500 tracking-wide uppercase text-sm font-medium">{module.subtitle}</p>
        </div>
      </div>

      <div className="mb-12 flex justify-between items-center relative px-2">
        <div className="absolute left-0 right-0 h-0.5 bg-slate-200 top-1/2 -translate-y-1/2 z-0"></div>
        {steps.map((s, idx) => {
          const isActive = s.key === currentStep;
          const isCompleted = steps.findIndex(step => step.key === currentStep) > idx;
          
          return (
            <div key={s.key} className="relative z-10 flex flex-col items-center group">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${
                  isActive ? 'bg-amber-500 border-amber-500 text-white scale-110 shadow-amber-200' : 
                  isCompleted ? 'bg-slate-900 border-slate-900 text-white' : 
                  'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (idx + 1)}
              </div>
              <span className={`text-[10px] md:text-xs mt-2 font-bold whitespace-nowrap ${
                isActive ? 'text-amber-600' : 'text-slate-400'
              }`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="min-h-[500px] bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100">
        {renderStep()}
      </div>

      {/* Bible Reader Modal */}
      {showBibleReader && (
        <BibleReader
          bookName={module.title}
          chapter={bibleReaderChapter}
          onClose={() => setShowBibleReader(false)}
        />
      )}
    </div>
  );
};

export default BibleBookPlayer;
