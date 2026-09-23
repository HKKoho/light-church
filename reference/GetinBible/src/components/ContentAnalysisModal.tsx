import React, { useState, useEffect, useRef } from 'react';
import {
  ContentAnalysisResult,
  ContentAnalysisStatus,
  ContentAnalysisContentType,
  ContentAnalysisHistoryItem,
} from '../../types';
import {
  analyzeContent,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysis,
} from '../../services/contentAnalysisService';
import { generateSpeech } from '../../services/geminiService';
import AnalysisStatusBadge from './AnalysisStatusBadge';
import ContentUploader from './ContentUploader';
import AnalysisHistoryPanel from './AnalysisHistoryPanel';

interface ContentAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

const ContentAnalysisModal: React.FC<ContentAnalysisModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [status, setStatus] = useState<ContentAnalysisStatus>('idle');
  const [result, setResult] = useState<ContentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ContentAnalysisHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  // TTS State
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Helper: Base64 to Uint8Array
  const decodeBase64 = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Helper: Decode raw PCM to AudioBuffer
  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + ch] / 32768;
      }
    }
    return audioBuffer;
  };

  // Stop audio playback
  const stopTTS = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      sourceRef.current = null;
    }
    setIsPlayingTTS(false);
  };

  // Play TTS for the analysis
  const playTTS = async () => {
    if (!result) return;

    if (isPlayingTTS) {
      stopTTS();
      return;
    }

    setIsLoadingTTS(true);

    // Create text to read - summary only
    const textToRead = result.summary;

    try {
      const base64Audio = await generateSpeech(textToRead);

      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        const decoded = decodeBase64(base64Audio);
        const audioBuffer = await decodeAudioData(decoded, audioContextRef.current);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = 0.8;
        gainNodeRef.current = gainNode;

        source.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        source.onended = () => {
          setIsPlayingTTS(false);
          sourceRef.current = null;
        };

        sourceRef.current = source;
        source.start(0);
        setIsPlayingTTS(true);
      }
    } catch (err) {
      console.error('TTS Error:', err);
    } finally {
      setIsLoadingTTS(false);
    }
  };

  // Cleanup on unmount or modal close
  useEffect(() => {
    return () => {
      stopTTS();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Stop TTS when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopTTS();
    }
  }, [isOpen]);

  // Load history when panel opens
  useEffect(() => {
    if (showHistory && userId) {
      loadHistory();
    }
  }, [showHistory, userId]);

  const loadHistory = async () => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const data = await getAnalysisHistory(userId);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleContentSelected = async (
    type: ContentAnalysisContentType,
    content: string | File,
    title?: string,
    wordLimit?: number
  ) => {
    setError(null);
    setResult(null);
    setStatus('fetching');

    try {
      setStatus('analyzing');
      const analysisResult = await analyzeContent(type, content, title, userId, wordLimit);
      setResult(analysisResult);
      setStatus('completed');
      // Expand all sections on completion
      setExpandedSections(new Set(['summary', 'purpose', 'topics', 'biblical', 'applications', 'full']));
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : '分析失敗，請稍後再試');
      setStatus('error');
    }
  };

  const handleHistorySelect = async (id: string) => {
    setShowHistory(false);
    setStatus('fetching');
    setError(null);

    try {
      const analysis = await getAnalysisById(id);
      if (analysis) {
        setResult(analysis);
        setStatus('completed');
        setExpandedSections(new Set(['summary', 'purpose', 'topics', 'biblical', 'applications', 'full']));
      } else {
        throw new Error('無法載入分析結果');
      }
    } catch (err) {
      console.error('Failed to load analysis:', err);
      setError(err instanceof Error ? err.message : '載入失敗');
      setStatus('error');
    }
  };

  const handleHistoryDelete = async (id: string) => {
    if (!confirm('確定要刪除這個分析記錄嗎？')) return;

    try {
      await deleteAnalysis(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete analysis:', err);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.fullAnalysisMarkdown);
      alert('已複製到剪貼簿');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleReanalyze = () => {
    setResult(null);
    setStatus('idle');
    setError(null);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen Modal */}
      <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">聖經內容分析</h2>
                <p className="text-sm text-blue-100">分析教材內容，了解學習目標</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userId && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="px-3 py-1.5 text-sm text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  歷史記錄
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Status Badge */}
            {status !== 'idle' && (
              <div className="mb-6 flex justify-center">
                <AnalysisStatusBadge status={status} />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                <p className="font-medium">分析失敗</p>
                <p className="text-sm mt-1">{error}</p>
                <button
                  onClick={handleReanalyze}
                  className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                >
                  重試
                </button>
              </div>
            )}

            {/* Input Section - Show when no result and not loading */}
            {!result && (status === 'idle' || status === 'error') && (
              <ContentUploader
                onContentSelected={handleContentSelected}
                disabled={false}
              />
            )}

            {/* Loading State */}
            {(status === 'analyzing' || status === 'fetching') && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-slate-600">
                  {status === 'fetching' ? '正在獲取內容...' : '正在分析內容...'}
                </p>
                <p className="text-sm text-slate-400 mt-2">這可能需要一點時間</p>
                <button
                  onClick={handleReanalyze}
                  className="mt-6 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  返回重新選擇
                </button>
              </div>
            )}

            {/* Result Section */}
            {result && status === 'completed' && (
              <div className="space-y-4">
                {/* Title Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{result.contentTitle}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {result.contentType === 'youtube' && 'YouTube 影片'}
                        {result.contentType === 'websearch' && '網頁搜尋'}
                        {result.contentType === 'document' && '文件'}
                        {result.contentType === 'image' && '圖片'}
                        {result.contentType === 'audio' && '音頻'}
                        {result.contentType === 'transcript' && '文字內容'}
                        {result.createdAt && ` • ${new Date(result.createdAt).toLocaleDateString('zh-TW')}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* Back Button */}
                      <button
                        onClick={handleReanalyze}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="返回重新選擇"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                      </button>
                      {/* TTS Play Button */}
                      <button
                        onClick={playTTS}
                        disabled={isLoadingTTS}
                        className={`p-2 rounded-lg transition-colors ${
                          isPlayingTTS
                            ? 'text-white bg-green-500 hover:bg-green-600'
                            : 'text-slate-500 hover:text-green-600 hover:bg-green-100'
                        } ${isLoadingTTS ? 'opacity-50 cursor-wait' : ''}`}
                        title={isPlayingTTS ? '停止朗讀' : '朗讀摘要（粵語）'}
                      >
                        {isLoadingTTS ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : isPlayingTTS ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={handleCopy}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="複製分析結果"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                <CollapsibleSection
                  title="執行摘要"
                  icon="📋"
                  isOpen={expandedSections.has('summary')}
                  onToggle={() => toggleSection('summary')}
                >
                  <p className="text-slate-700 leading-relaxed">{result.summary}</p>
                </CollapsibleSection>

                {/* Biblical Connections */}
                {result.biblicalConnections.length > 0 && (
                  <CollapsibleSection
                    title="與聖經的連結"
                    icon="📖"
                    isOpen={expandedSections.has('biblical')}
                    onToggle={() => toggleSection('biblical')}
                  >
                    <ul className="space-y-2">
                      {result.biblicalConnections.map((connection, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-700">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{connection}</span>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                )}

                {/* Web Search Sources */}
                {result.webSearchSources && result.webSearchSources.length > 0 && (
                  <CollapsibleSection
                    title="搜尋來源"
                    icon="🔗"
                    isOpen={expandedSections.has('sources')}
                    onToggle={() => toggleSection('sources')}
                  >
                    <ul className="space-y-2">
                      {result.webSearchSources.map((source, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-700">
                          <span className="text-green-500 mt-1">•</span>
                          <a
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {source}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                )}

                {/* Full Analysis */}
                <CollapsibleSection
                  title="完整分析"
                  icon="📄"
                  isOpen={expandedSections.has('full')}
                  onToggle={() => toggleSection('full')}
                >
                  <div className="prose prose-slate max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                      {result.fullAnalysisMarkdown}
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Metadata */}
                {(result.tokenCount || result.generationDurationMs) && (
                  <div className="text-xs text-slate-400 text-center pt-4 border-t border-slate-100">
                    {result.aiModel && <span>{result.aiModel}</span>}
                    {result.tokenCount && <span> • {result.tokenCount} tokens</span>}
                    {result.generationDurationMs && <span> • {(result.generationDurationMs / 1000).toFixed(1)}s</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Panel */}
      <AnalysisHistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onSelectItem={handleHistorySelect}
        onDeleteItem={handleHistoryDelete}
        loading={historyLoading}
      />
    </>
  );
};

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-slate-800">{title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default ContentAnalysisModal;
