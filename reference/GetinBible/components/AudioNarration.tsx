
import React, { useState, useRef, useEffect } from 'react';
import { generateSpeech } from '../services/geminiService';

interface AudioNarrationProps {
  text: string;
  autoPlay?: boolean;
}

const AudioNarration: React.FC<AudioNarrationProps> = ({ text, autoPlay = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

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

  const playAudio = async (startFromBeginning: boolean = false) => {
    // If already playing and not a replay, treat as stop request
    if (isPlaying && !startFromBeginning) {
      stopAudio();
      return;
    }

    // If replaying, stop existing playback first
    if (startFromBeginning && isPlaying) {
      stopAudio();
    }

    // Fetch audio if not cached or if text changed
    if (!audioBufferRef.current) {
      setIsLoading(true);
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const decoded = decodeBase64(base64Audio);
        audioBufferRef.current = await decodeAudioData(decoded, audioContextRef.current);
      }
      setIsLoading(false);
    }

    // Play cached buffer
    if (audioBufferRef.current && audioContextRef.current) {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = volume;
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
  };

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playAudio(true);
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => stopAudio();
  }, []);

  // Reset cache and stop audio when text context changes
  useEffect(() => {
    stopAudio();
    audioBufferRef.current = null;
  }, [text]);

  return (
    <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-sm">
      <div className="flex items-center space-x-1">
        <button
          onClick={() => playAudio(false)}
          disabled={isLoading}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            isPlaying ? 'bg-amber-500 text-white' : 'bg-white text-slate-700 hover:bg-amber-50'
          } ${isLoading ? 'opacity-50' : 'hover:scale-105 active:scale-95'}`}
          title={isPlaying ? "停止朗讀" : "播放朗讀"}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          ) : isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          ) : (
            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
          )}
        </button>

        <button
          onClick={handleReplay}
          disabled={isLoading}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all bg-white text-slate-700 hover:bg-amber-50 ${isLoading ? 'opacity-50' : 'hover:scale-105 active:scale-95'}`}
          title="重新播放"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="hidden sm:flex items-center space-x-2 border-l border-slate-300 pl-3 pr-2">
        <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" /></svg>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-16 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter pr-3 hidden lg:inline">智慧語音</span>
    </div>
  );
};

export default AudioNarration;
