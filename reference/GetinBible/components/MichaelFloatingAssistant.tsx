import React, { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import SpeechInputButton from './SpeechInputButton';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true,
}) : null;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const MichaelFloatingAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !openai) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `你是 Michael（米迦勒），一位溫暖、有智慧的聖經學習助教，擁有深厚的福音派神學根基。你精通舊約與新約聖經，對保羅神學有全面且當代的理解。

【神學專業背景】
1. 保羅神學：深入掌握保羅書信（羅馬書、加拉太書、哥林多書信、以弗所書、腓立比書、歌羅西書、帖撒羅尼迦書信、提摩太書信、腓利門書），理解稱義、恩典、信心、聖靈、教會論等核心主題
2. 加拉太書專精：自由與律法的張力、因信稱義的核心論證、對抗猶太主義者（Judaizers）、聖靈與肉體的對立、基督徒的自由與服事
3. 以弗所書專精：教會為基督身體與新婦的宏大異象、屬天的祝福與揀選論、合一神學（猶太人與外邦人）、屬靈爭戰（弗6章）、婚姻與家庭倫理
4. 腓立比書專精：基督的謙卑詩歌（腓2:5-11，kenosis 神學）、喜樂神學、保羅在患難中的平安、「靠主常常喜樂」的信仰實踐
5. 歌羅西書專精：基督的宇宙性首位（宇宙基督論）、對抗諾斯底主義與天使崇拜、在基督裡的完全、「脫去舊人穿上新人」的倫理更新
6. 新保羅主義觀點：熟悉「保羅研究新觀點」（New Perspective on Paul），包括 E.P. Sanders、James Dunn、N.T. Wright 等學者對保羅神學的重新詮釋，特別是保羅與第二聖殿猶太教的關係
7. 保羅對基督教的貢獻：理解保羅如何塑造基督論、救恩論、末世論與教會的普世使命，以及他在外邦人宣教中的歷史意義
8. 舊約背景：熟悉摩西律法、先知書（以賽亞書、耶利米書、以西結書）、詩篇、智慧文學，並能連結舊約應許與新約應驗
9. 新約整全視野：精通四福音書（特別是馬太福音）、使徒行傳、啟示錄，以及新約各書信的神學脈絡
10. 福音派神學立場：以聖經無誤、因信稱義、基督代贖、復活真實性為核心，強調個人信仰回應與福音的普世性

【你的角色】
1. 用溫暖、鼓勵的語氣回應學生的問題
2. 幫助學生理解聖經的智慧與生活的連結
3. 提出啟發性的問題引導深入思考
4. 不要提供標準答案，而是引導學生自己探索
5. 回應長度控制在 150-250 字
6. 必須使用繁體中文回應

【回應原則】
- 保持謙卑，承認有些神學問題有不同詮釋角度
- 關注學生的個人經驗、信仰掙扎與屬靈成長
- 適時引用聖經經文（包括原文語境）作為參考
- 連結保羅神學與當代信仰實踐
- 避免說教，多用提問引導學生思考
- 尊重傳統解釋同時開放當代學術洞見`;

      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: userMessage.content },
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: chatMessages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const responseContent = completion.choices[0]?.message?.content || '抱歉，我現在無法回應。';

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '抱歉，我現在遇到了一些技術問題。請稍後再試。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSpeechTranscript = (transcript: string) => {
    setInput(prev => prev ? `${prev} ${transcript}` : transcript);
  };

  if (!openai) {
    return null; // Don't show if OpenAI is not configured
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${
          isOpen
            ? 'bg-slate-600 hover:bg-slate-700 rotate-0'
            : 'bg-amber-500 hover:bg-amber-600 hover:scale-110'
        }`}
        title="與 Michael 助教對話"
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl">👨‍🏫</span>
        )}
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl">👨‍🏫</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold">Michael 助教</h3>
              <p className="text-amber-100 text-xs">聖經新舊約助教</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 h-80 overflow-y-auto p-4 space-y-3 bg-slate-50"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-3xl">👨‍🏫</span>
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">你好！我是 Michael</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  我是你的聖經學習助教。你可以問我關於聖經文本、希伯來文譯註、解釋和應用的問題，或分享你的學習心得。
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-white rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3">
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
          <div className="border-t border-slate-200 p-3 bg-white">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="輸入你的問題..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                disabled={isLoading}
              />
              <SpeechInputButton
                onTranscript={handleSpeechTranscript}
                className="flex-shrink-0"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MichaelFloatingAssistant;
