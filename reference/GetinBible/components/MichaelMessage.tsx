import React from 'react';
import OpenAIAudioPlayer from './OpenAIAudioPlayer';

interface MichaelMessageProps {
  role: 'user' | 'assistant';
  message: string;
  audioData?: string | null;
  timestamp: string;
}

const MichaelMessage: React.FC<MichaelMessageProps> = ({
  role,
  message,
  audioData,
  timestamp
}) => {
  const isUser = role === 'user';
  const formattedTime = new Date(timestamp).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}>
      <div className={`flex items-start gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
            <span className="text-sm">👩‍🏫</span>
          </div>
        )}

        {/* Message Content */}
        <div className="flex flex-col">
          <div
            className={`rounded-2xl px-4 py-3 shadow-sm ${
              isUser
                ? 'bg-blue-500 text-white rounded-tr-sm'
                : 'bg-amber-50 text-slate-800 border border-amber-200 rounded-tl-sm'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
          </div>

          {/* Timestamp and Audio Controls */}
          <div className={`flex items-center gap-2 mt-1 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-slate-400">{formattedTime}</span>

            {!isUser && audioData && (
              <OpenAIAudioPlayer audioData={audioData} />
            )}
          </div>
        </div>

        {/* User Avatar (optional) */}
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default MichaelMessage;
