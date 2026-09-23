import React, { useState, useRef, useEffect } from 'react';
import { getMichaelStudentHelp, isOpenAIAvailable, StudentStepType, ConversationMessage, generateOpenAITTS } from '../services/openaiService';
import { Module } from '../types';
import { getContentAnalysisSettingsSync } from '../services/settingsService';
import SpeechInputButton from './SpeechInputButton';
import OpenAIAudioPlayer from './OpenAIAudioPlayer';

interface ConversationMessageWithAudio extends ConversationMessage {
  audioData?: string | null;
}

interface MichaelStudentHelperProps {
  stepType: StudentStepType;
  module: Module;
}

const stepHints: Record<StudentStepType, string> = {
  perspectives: '幫我理解這三卷書的觀點有什麼不同？',
  life_questions: '這個問題要怎麼思考？',
  tension: '為什麼這些觀點看起來矛盾？',
  discussion: '我應該怎麼回答這個討論問題？',
  summary: '幫我總結今天學到的重點',
};

const MichaelStudentHelper: React.FC<MichaelStudentHelperProps> = ({
  stepType,
  module,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessageWithAudio[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleSpeechTranscript = (transcript: string) => {
    setQuestion(prev => prev ? `${prev} ${transcript}` : transcript);
  };

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
    const userMessage: ConversationMessageWithAudio = {
      role: 'user',
      message: userQuestion,
    };
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      const moduleContext = {
        title: module.title,
        subtitle: module.subtitle,
        perspectives: module.perspectives,
        lifeQuestions: module.lifeQuestions,
        tensionGuides: module.tensionGuides,
        discussionPrompts: module.discussionPrompts,
        summary: module.summary,
      };

      const response = await getMichaelStudentHelp(
        userQuestion,
        stepType,
        moduleContext,
        conversationHistory
      );

      // Generate TTS audio for assistant response
      let audioData: string | null = null;
      try {
        audioData = await generateOpenAITTS(response);
      } catch (ttsError) {
        console.error('TTS generation failed:', ttsError);
      }

      // Add assistant message to history with audio data
      const assistantMessage: ConversationMessageWithAudio = {
        role: 'assistant',
        message: response,
        audioData: audioData,
      };
      setConversationHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting Michael response:', error);
      const errorMessage: ConversationMessageWithAudio = {
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

  // Check if Michael is enabled and OpenAI is available
  const settings = getContentAnalysisSettingsSync();
  if (!isOpenAIAvailable() || settings.michaelEnabled === false) {
    return null;
  }

  return (
    <>
      {/* Michael Icon Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 group"
        title="問 Michael 傳道的AI助理"
      >
        <svg className="w-7 h-7 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Michael 傳道的AI助理</h3>
                  <p className="text-amber-100 text-sm">有問題隨時問我</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Area */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-amber-50/30"
            >
              {conversationHistory.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                  </div>
                  <p className="text-slate-700 font-medium mb-2">
                    你好！我是 Michael 傳道的AI助理
                  </p>
                  <p className="text-slate-500 text-sm mb-4">
                    有任何關於課程的問題，都可以問我
                  </p>
                  <button
                    onClick={() => setQuestion(stepHints[stepType])}
                    className="text-amber-600 hover:text-amber-700 text-sm bg-amber-100 px-4 py-2 rounded-full hover:bg-amber-200 transition-colors"
                  >
                    試試問：「{stepHints[stepType]}」
                  </button>
                </div>
              ) : (
                conversationHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                      </div>
                    )}
                    <div className="flex flex-col max-w-[75%]">
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-amber-500 text-white rounded-br-sm'
                            : 'bg-white border border-amber-200 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</div>
                      </div>
                      {msg.role === 'assistant' && msg.audioData && (
                        <div className="mt-2">
                          <OpenAIAudioPlayer audioData={msg.audioData} />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                  </div>
                  <div className="bg-white border border-amber-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
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
            <div className="border-t border-amber-200 p-4 bg-white">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="輸入你的問題..."
                  className="flex-1 px-4 py-3 border border-amber-200 rounded-full focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                  disabled={isLoading}
                />
                <SpeechInputButton
                  onTranscript={handleSpeechTranscript}
                  className="flex-shrink-0"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!question.trim() || isLoading}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  送出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MichaelStudentHelper;
