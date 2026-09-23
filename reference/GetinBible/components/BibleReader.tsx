import React, { useState, useEffect, useRef } from 'react';
import { fetchChapter, formatVersesForTTS, BibleVerse } from '../services/bibleService';
import { generateSpeech } from '../services/geminiService';

interface BibleReaderProps {
  bookName: string;
  chapter: number;
  onClose: () => void;
}

const VERSES_PER_PAGE = 5;

const BibleReader: React.FC<BibleReaderProps> = ({ bookName, chapter, onClose }) => {
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const loadChapter = async () => {
      setLoading(true);
      setError(null);
      const result = await fetchChapter(bookName, chapter);
      if (result) {
        setVerses(result);
      } else {
        setError('無法載入經文，請稍後再試');
      }
      setLoading(false);
    };
    loadChapter();
  }, [bookName, chapter]);

  // Get current page verses
  const startIndex = currentPage * VERSES_PER_PAGE;
  const currentVerses = verses.slice(startIndex, startIndex + VERSES_PER_PAGE);
  const totalPages = Math.ceil(verses.length / VERSES_PER_PAGE);

  // Helper: Base64 to Uint8Array
  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
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
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) { /* ignore if already stopped */ }
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const playTTS = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (currentVerses.length === 0) return;

    setIsLoadingAudio(true);
    const ttsText = formatVersesForTTS(currentVerses);
    const base64Audio = await generateSpeech(ttsText);

    if (base64Audio) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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
        setIsPlaying(false);
        sourceRef.current = null;
      };

      source.start();
      sourceRef.current = source;
      setIsPlaying(true);
    }
    setIsLoadingAudio(false);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      stopAudio();
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      stopAudio();
      setCurrentPage(currentPage - 1);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAudio();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{bookName} 第 {chapter} 章</h2>
            <p className="text-amber-100 text-sm">和合本 (CUV)</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : (
            <div className="space-y-4">
              {currentVerses.map((verse) => (
                <div key={verse.verse} className="flex gap-3">
                  <span className="text-amber-600 font-bold min-w-[2rem] text-right">
                    {verse.verse}
                  </span>
                  <p className="text-slate-700 text-lg leading-relaxed flex-1">
                    {verse.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with controls */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 0 || loading}
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                上一頁
              </button>
              <span className="text-slate-500 text-sm px-2">
                {currentPage + 1} / {totalPages || 1}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages - 1 || loading}
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                下一頁
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* TTS Button */}
            <button
              onClick={playTTS}
              disabled={loading || currentVerses.length === 0 || isLoadingAudio}
              className={`px-5 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                isPlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isLoadingAudio ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  載入中...
                </>
              ) : isPlaying ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  停止
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  粵語朗讀
                </>
              )}
            </button>
          </div>

          {/* Verse range indicator */}
          {currentVerses.length > 0 && (
            <p className="text-center text-slate-400 text-xs mt-3">
              第 {currentVerses[0].verse} - {currentVerses[currentVerses.length - 1].verse} 節 (共 {verses.length} 節)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BibleReader;
