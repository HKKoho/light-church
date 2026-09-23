import React, { useState, useEffect, useRef } from 'react';
import { Module, ConversationMessage } from '../types';
import { getMichaelResponse, generateOpenAITTS, isOpenAIAvailable } from '../services/openaiService';
import {
  createNewSession,
  saveConversationMessage,
  getConversationHistory,
  getUserModuleResponsesSummary,
  ModuleResponseSummary
} from '../services/responseService';
import MichaelMessage from './MichaelMessage';
import SpeechInputButton from './SpeechInputButton';

interface MichaelChatProps {
  moduleId: number;
  module: Module;
  userId: string;
  discussionResponses: Record<string, string>;
}

const MichaelChat: React.FC<MichaelChatProps> = ({
  moduleId,
  module,
  userId,
  discussionResponses
}) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [userModuleResponses, setUserModuleResponses] = useState<ModuleResponseSummary[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize session and load conversation history + user module responses
  useEffect(() => {
    const initSession = async () => {
      const newSessionId = createNewSession();
      setSessionId(newSessionId);

      // Load existing conversation history (if any)
      const history = await getConversationHistory(userId, moduleId, newSessionId);
      setConversationHistory(history);

      // Load user's module response summary for memory context
      const moduleResponses = await getUserModuleResponsesSummary(userId, moduleId);
      setUserModuleResponses(moduleResponses);
    };

    initSession();
  }, [userId, moduleId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  // Check if any LLM provider is available
  if (!isOpenAIAvailable()) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-800 font-medium mb-2">Michael 智慧助教暫時無法使用</p>
        <p className="text-sm text-red-600">請聯繫管理員配置 OpenAI API 金鑰或 Ollama 服務網址</p>
      </div>
    );
  }

  const handleSendQuestion = async () => {
    if (!currentQuestion.trim() || isLoadingResponse) return;

    const userQuestion = currentQuestion.trim();
    setCurrentQuestion('');
    setIsLoadingResponse(true);

    try {
      // Save user's question
      await saveConversationMessage(userId, moduleId, sessionId, 'user', userQuestion);

      // Update UI immediately with user message
      const userMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        message: userQuestion,
        audioData: null,
        createdAt: new Date().toISOString()
      };
      setConversationHistory(prev => [...prev, userMessage]);

      // Get Michael's response from OpenAI with memory context
      const mariaResponseText = await getMichaelResponse(
        userQuestion,
        module,
        discussionResponses,
        conversationHistory.map(msg => ({ role: msg.role, message: msg.message })),
        userModuleResponses  // Pass user's learning history for memory
      );

      // Generate TTS audio for Michael's response
      let audioData: string | null = null;
      try {
        audioData = await generateOpenAITTS(mariaResponseText);
      } catch (ttsError) {
        console.error('TTS generation failed:', ttsError);
        // Continue without audio
      }

      // Save Michael's response
      await saveConversationMessage(
        userId,
        moduleId,
        sessionId,
        'assistant',
        mariaResponseText,
        audioData
      );

      // Update UI with Michael's response
      const mariaMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        message: mariaResponseText,
        audioData: audioData,
        createdAt: new Date().toISOString()
      };
      setConversationHistory(prev => [...prev, mariaMessage]);

    } catch (error) {
      console.error('Error in Michael conversation:', error);

      // Show error message
      const errorMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        message: '抱歉，我現在遇到了一些技術問題。請稍後再試，或者繼續探索課程內容。',
        audioData: null,
        createdAt: new Date().toISOString()
      };
      setConversationHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const handleSpeechTranscript = (transcript: string) => {
    setCurrentQuestion(prev => prev ? `${prev} ${transcript}` : transcript);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-100">
      {/* Chat History */}
      <div
        ref={chatContainerRef}
        className="h-96 overflow-y-auto p-4 space-y-4 scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {conversationHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">👩‍🏫</span>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">歡迎與 Michael 對話</h4>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md">
              我是你的智慧助教，可以陪你深入探討今天的討論問題。
              你可以問我關於《箴言》、《傳道書》或《約伯記》的任何問題，
              或分享你在討論中的想法和疑惑。
            </p>
            <p className="text-xs text-amber-600 mt-4">
              💡 提示：點擊下方麥克風可以用語音提問
            </p>
          </div>
        ) : (
          conversationHistory.map((msg) => (
            <MichaelMessage
              key={msg.id}
              role={msg.role}
              message={msg.message}
              audioData={msg.audioData}
              timestamp={msg.createdAt}
            />
          ))
        )}

        {/* Loading Indicator */}
        {isLoadingResponse && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
                <span className="text-sm">👩‍🏫</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-amber-100 p-4 bg-slate-50">
        <div className="flex gap-2">
          <div className="flex-grow relative">
            <textarea
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="在此輸入你的問題，或點擊麥克風使用語音..."
              className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none bg-white"
              rows={2}
              disabled={isLoadingResponse}
            />
            <div className="absolute right-2 top-2">
              <SpeechInputButton onTranscript={handleSpeechTranscript} />
            </div>
          </div>
          <button
            onClick={handleSendQuestion}
            disabled={!currentQuestion.trim() || isLoadingResponse}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <span>送出</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          按 Enter 送出，Shift + Enter 換行
        </p>
      </div>
    </div>
  );
};

export default MichaelChat;
