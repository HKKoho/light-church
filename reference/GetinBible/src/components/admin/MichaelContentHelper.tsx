import React, { useState, useRef, useEffect } from 'react';
import { getMichaelContentHelp, isOpenAIAvailable, ContentStepType, ConversationMessage } from '../../../services/openaiService';

interface MichaelContentHelperProps {
  stepType: ContentStepType;
  moduleContext: {
    title?: string;
    subtitle?: string;
    perspectives?: Record<string, { book: string; theme: string; description: string }>;
    lifeQuestions?: Array<{ questionText: string; questionType: string }>;
    tensionGuides?: string[];
    discussionPrompts?: string[];
    summary?: string;
  };
}

const stepHints: Record<ContentStepType, string> = {
  basic_info: '幫我設計一個關於「智慧與苦難」的月課標題',
  perspectives: '幫我為《箴言》撰寫關於這個主題的觀點描述',
  life_questions: '幫我設計一個引發反思的經卷提問',
  tension_guides: '幫我解釋三卷書對這個主題的張力',
  discussion: '幫我設計一個適合小組的討論問題',
  summary: '幫我撰寫一句話總結本課的核心洞見',
};

const MichaelContentHelper: React.FC<MichaelContentHelperProps> = ({
  stepType,
  moduleContext,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  // Reset conversation when step changes
  useEffect(() => {
    setConversationHistory([]);
    setQuestion('');
  }, [stepType]);

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return;

    const userQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);

    // Add user message to history
    const userMessage: ConversationMessage = {
      role: 'user',
      message: userQuestion,
    };
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      const response = await getMichaelContentHelp(
        userQuestion,
        stepType,
        moduleContext,
        conversationHistory
      );

      // Add assistant message to history
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        message: response,
      };
      setConversationHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting Michael response:', error);
      const errorMessage: ConversationMessage = {
        role: 'assistant',
        message: '抱歉，我現在無法回應。請稍後再試。',
      };
      setConversationHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpenAIAvailable()) {
    return null;
  }

  return (
    <>
      {/* Michael Icon Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 group"
        title="請 Michael 協助開發內容"
      >
        <span className="text-lg group-hover:animate-pulse">🤖</span>
        <span className="font-medium text-sm">請 Michael 協助</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Michael 內容助手</h3>
                  <p className="text-amber-100 text-sm">協助您開發課程內容</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Area */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
            >
              {conversationHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <p className="text-slate-600 mb-4">
                    我是 Michael，可以協助您開發課程內容。
                  </p>
                  <p className="text-sm text-slate-500 mb-2">試試問我：</p>
                  <button
                    onClick={() => setQuestion(stepHints[stepType])}
                    className="text-amber-600 hover:text-amber-700 text-sm bg-amber-50 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    「{stepHints[stepType]}」
                  </button>
                </div>
              ) : (
                conversationHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-amber-500 text-white rounded-br-sm'
                          : 'bg-white border border-slate-200 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{msg.message}</div>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => copyToClipboard(msg.message)}
                          className="mt-2 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          複製內容
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 p-4 bg-white">
              <div className="flex gap-2">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="請輸入您的問題或需求..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
                  rows={2}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!question.trim() || isLoading}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  送出
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                按 Enter 送出，Shift + Enter 換行
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MichaelContentHelper;
