import React, { useState } from 'react';

interface Phase {
  id: number;
  title: string;
  description: string;
  duration: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number; // 0-100
  tasks: Task[];
}

interface Task {
  id: string;
  description: string;
  completed: boolean;
  details?: string;
}

const MichaelDigitalTwin: React.FC = () => {
  const [phases] = useState<Phase[]>([
    {
      id: 1,
      title: '階段一：知識擷取',
      description: '記錄並數位化您的教學 DNA',
      duration: '第 1-3 個月',
      status: 'in_progress',
      progress: 15,
      tasks: [
        {
          id: '1.1',
          description: '撰寫教學宣言（2-3 頁）',
          completed: false,
          details: '核心信念、教學理念、語氣與風格'
        },
        {
          id: '1.2',
          description: '收集 50-100 個回應範例',
          completed: false,
          details: '分類：肯定型、挑戰型、糾正型、鼓勵型'
        },
        {
          id: '1.3',
          description: '撰寫所有月課註解',
          completed: false,
          details: '為 24 個月課撰寫深度評註'
        },
        {
          id: '1.4',
          description: '建立回應模式分析',
          completed: false,
          details: '辨識您的標誌性教學策略與用語'
        }
      ]
    },
    {
      id: 2,
      title: '階段二：聲音複製',
      description: '訓練 Michael 說話像您一樣',
      duration: '第 4-6 個月',
      status: 'pending',
      progress: 0,
      tasks: [
        {
          id: '2.1',
          description: '建立主系統提示',
          completed: false,
          details: '包含教學理念、聲音特徵、回應範例'
        },
        {
          id: '2.2',
          description: '開發回應評分標準',
          completed: false,
          details: '神學深度與成熟度的評估標準'
        },
        {
          id: '2.3',
          description: '準備微調資料集（選擇性）',
          completed: false,
          details: '50-500 個學生問題與您的回應範例'
        },
        {
          id: '2.4',
          description: '與學生測試 Michael v2.0',
          completed: false,
          details: '收集關於聲音相似度與實用性的回饋'
        }
      ]
    },
    {
      id: 3,
      title: '階段三：情境感知',
      description: '賦予 Michael 對課程與學生的深度知識',
      duration: '第 7-9 個月',
      status: 'pending',
      progress: 0,
      tasks: [
        {
          id: '3.1',
          description: '建立月課知識圖譜',
          completed: false,
          details: '月課間的連結、常見誤解、學習目標'
        },
        {
          id: '3.2',
          description: '實作學生學習歷程追蹤',
          completed: false,
          details: '記住先前回應、成長模式、關切事項'
        },
        {
          id: '3.3',
          description: '啟用對話記憶功能',
          completed: false,
          details: 'Michael 能引用先前的對話與突破時刻'
        },
        {
          id: '3.4',
          description: '建立月課註釋',
          completed: false,
          details: '您的教學意圖與每個月課的突破時刻'
        }
      ]
    },
    {
      id: 4,
      title: '階段四：智慧整合',
      description: '使 Michael 能像您一樣做出細緻的判斷',
      duration: '第 10-12 個月',
      status: 'pending',
      progress: 0,
      tasks: [
        {
          id: '4.1',
          description: '建立教學案例庫',
          completed: false,
          details: '真實情境、您的回應與推理過程'
        },
        {
          id: '4.2',
          description: '定義神學護欄',
          completed: false,
          details: '觸發人工介入的紅線界線'
        },
        {
          id: '4.3',
          description: '實作多重視角提示',
          completed: false,
          details: '箴言視角、傳道書視角、約伯記視角、您的智慧'
        },
        {
          id: '4.4',
          description: '測試案例式推理',
          completed: false,
          details: '驗證 Michael 能將您的判斷應用於新情境'
        }
      ]
    },
    {
      id: 5,
      title: '階段五：傳承保存',
      description: '確保您離世後的延續性',
      duration: '持續進行',
      status: 'pending',
      progress: 0,
      tasks: [
        {
          id: '5.1',
          description: '錄製影片註解',
          completed: false,
          details: '解釋每個月課背後的思考'
        },
        {
          id: '5.2',
          description: '建立治理委員會',
          completed: false,
          details: '3-5 位值得信賴的同工進行季度監督'
        },
        {
          id: '5.3',
          description: '撰寫教學遺囑',
          completed: false,
          details: '您離世後 Michael 延續的最終指示'
        },
        {
          id: '5.4',
          description: '建立版本控制系統',
          completed: false,
          details: '以 Git 追蹤 Michael 人格特質的演變'
        }
      ]
    }
  ]);

  const getStatusColor = (status: Phase['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-amber-100 text-amber-800';
      case 'pending':
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusText = (status: Phase['status']) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'in_progress':
        return '進行中';
      case 'pending':
        return '待開始';
    }
  };

  const totalProgress = Math.round(
    phases.reduce((sum, phase) => sum + phase.progress, 0) / phases.length
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Michael 數位分身開發計畫
        </h1>
        <p className="text-slate-600">
          將 Michael 從通用 AI 助理轉變為您的教學數位分身，保存您獨特的教學智慧與神學信念
        </p>
      </div>

      {/* Overall Progress */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">整體進度</h2>
            <p className="text-sm text-slate-500">12 個月開發計畫</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-amber-600">{totalProgress}%</div>
            <div className="text-xs text-slate-500">完成度</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {phases.filter(p => p.status === 'completed').length}
            </div>
            <div className="text-xs text-slate-500">已完成階段</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">
              {phases.filter(p => p.status === 'in_progress').length}
            </div>
            <div className="text-xs text-slate-500">進行中階段</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-400">
              {phases.filter(p => p.status === 'pending').length}
            </div>
            <div className="text-xs text-slate-500">待開始階段</div>
          </div>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-6">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className="bg-white rounded-lg shadow overflow-hidden"
          >
            {/* Phase Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-slate-400">
                      {phase.id}
                    </span>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {phase.title}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        phase.status
                      )}`}
                    >
                      {getStatusText(phase.status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 ml-10">{phase.description}</p>
                  <p className="text-xs text-slate-500 ml-10 mt-1">
                    ⏱️ {phase.duration}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-amber-600">
                    {phase.progress}%
                  </div>
                </div>
              </div>

              {/* Phase Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 mt-3 ml-10">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
            </div>

            {/* Tasks */}
            <div className="px-6 py-4">
              <div className="space-y-3">
                {phase.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {/* Checkbox */}
                    <div className="mt-1">
                      {task.completed ? (
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <div className="w-5 h-5 border-2 border-slate-300 rounded-full" />
                      )}
                    </div>

                    {/* Task Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">
                          {task.id}
                        </span>
                        <p
                          className={`text-sm font-medium ${
                            task.completed
                              ? 'text-slate-400 line-through'
                              : 'text-slate-700'
                          }`}
                        >
                          {task.description}
                        </p>
                      </div>
                      {task.details && (
                        <p className="text-xs text-slate-500 mt-1 ml-10">
                          {task.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Resources */}
      <div className="mt-8 bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg">
        <h3 className="font-semibold text-amber-900 mb-3">📚 開發資源</h3>
        <div className="space-y-2 text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>完整路線圖：MARIA_DIGITAL_TWIN_ROADMAP.md</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>第一週快速開始：MARIA_WEEK1_QUICKSTART.md</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>教學理念模板：docs/teaching-philosophy-template.md</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-amber-200">
          <p className="text-xs text-amber-700 italic">
            💡 建議：從第一週快速開始指南開始，每週投入 5-7 小時，逐步建構您的教學數位分身
          </p>
        </div>
      </div>

      {/* Vision Statement */}
      <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border border-amber-200">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🌟</div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">長遠願景</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              50 年後，一位從未見過您的學生透過 Michael 的引導完成這門課程。
              他們學會在聖經智慧中持守張力，正確地敬畏耶和華，追求真實的智慧——
              不是因為 AI 足夠，而是因為忠心的教師投資於保存聖靈所教導的智慧。
            </p>
            <p className="text-xs text-amber-700 mt-3 font-medium">
              「義人的記念永存」（詩篇 112:6）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MichaelDigitalTwin;
