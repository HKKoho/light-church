
import React, { useState, useEffect, useMemo } from 'react';
import WordCloud from './WordCloud';
import { getAggregatedResponses } from '../services/responseService';

interface ClassInsightProps {
  moduleId: number;
  userResponses: Record<string, string>;
  peerData: {
    responses: string[];
    stats?: Record<string, number>;
  };
}

const ClassInsight: React.FC<ClassInsightProps> = ({ moduleId, userResponses, peerData }) => {
  const [realPeerData, setRealPeerData] = useState<{
    responses: string[];
    stats?: Record<string, number>;
  }>({ responses: [] });
  const [loading, setLoading] = useState(true);

  // Fetch real peer data from Supabase
  useEffect(() => {
    const fetchPeerData = async () => {
      setLoading(true);
      try {
        // Fetch data for the first life question (the main one for word cloud)
        const questionKey = 'life_question_input_0';
        const data = await getAggregatedResponses(moduleId, questionKey);
        setRealPeerData(data);

        // For module 1, also fetch radio button stats
        if (moduleId === 1) {
          const radioKey = 'life_question_input_1';
          const radioData = await getAggregatedResponses(moduleId, radioKey);
          if (radioData.stats) {
            setRealPeerData(prev => ({ ...prev, stats: radioData.stats }));
          }
        }
      } catch (error) {
        console.error('Failed to load peer data:', error);
        // Fallback to mock data if fetch fails
        setRealPeerData(peerData);
      } finally {
        setLoading(false);
      }
    };

    fetchPeerData();
  }, [moduleId, peerData]);

  // Use real data if available, otherwise fallback to mock data
  const displayData = realPeerData.responses.length > 0 ? realPeerData : peerData;

  const combinedWords = useMemo(() => {
    const userWords = Object.values(userResponses).filter(v => v.length > 5);
    return [...displayData.responses, ...userWords];
  }, [userResponses, displayData.responses]);

  return (
    <div className="mt-12 bg-slate-50 rounded-3xl p-6 md:p-10 border border-slate-200 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-8">
        <div className="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3.005 3.005 0 013.75-2.906z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-800">課堂觀察：大家的觀點</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section>
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">生活關鍵字雲</h4>
          <p className="text-slate-400 text-xs mb-4">同學在「聖經提問」提到的關鍵字：</p>
          {loading ? (
            <div className="text-center text-slate-400 py-8">載入弟兄姊妹提問中...</div>
          ) : (
            <WordCloud words={combinedWords} />
          )}
        </section>

        {moduleId === 1 && displayData.stats && (
          <section>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">信念分佈</h4>
            <p className="text-slate-400 text-xs mb-4">對於「是否認為自己是尋找智慧的人」：</p>
            <div className="space-y-4">
              {Object.entries(displayData.stats).map(([label, count]) => {
                const total = Object.values(displayData.stats!).reduce((a, b) => a + b, 0);
                const percentage = Math.round((count / total) * 100);
                const isUserChoice = userResponses['life_question_input_1'] === label;

                return (
                  <div key={label} className="relative">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-bold ${isUserChoice ? 'text-amber-600' : 'text-slate-600'}`}>
                        {label} {isUserChoice && <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded ml-2">您的選擇</span>}
                      </span>
                      <span className="text-sm text-slate-400 font-mono">{percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${isUserChoice ? 'bg-amber-500' : 'bg-slate-400'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="mt-10 pt-6 border-t border-slate-200 text-center">
        <p className="text-slate-500 italic text-sm">
          「我心裏柔和謙卑，你們當負我的軛，向我學習；這樣，你們的心靈就必得安息。」—— 馬太 11:9
        </p>
      </div>
    </div>
  );
};

export default ClassInsight;
