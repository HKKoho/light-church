import React, { useState, useEffect, useRef } from 'react';

interface OpenAIAudioPlayerProps {
  audioData: string; // Base64 encoded MP3
  autoPlay?: boolean;
  onPlaybackEnd?: () => void;
}

const OpenAIAudioPlayer: React.FC<OpenAIAudioPlayerProps> = ({
  audioData,
  autoPlay = false,
  onPlaybackEnd
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioData) return;

    // Create audio element from base64 MP3 data
    const audio = new Audio();
    const blob = base64ToBlob(audioData, 'audio/mpeg');
    const url = URL.createObjectURL(blob);
    audio.src = url;
    audio.volume = volume;

    audioRef.current = audio;

    // Setup event listeners
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      if (onPlaybackEnd) onPlaybackEnd();
    });

    // Auto-play if requested
    if (autoPlay) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Auto-play failed:', err);
      });
    }

    // Cleanup
    return () => {
      audio.pause();
      URL.revokeObjectURL(url);
    };
  }, [audioData, autoPlay, onPlaybackEnd]);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Playback failed:', err);
      });
    }
  };

  const replay = () => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(err => {
      console.error('Replay failed:', err);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-all shadow-sm hover:shadow-md"
        title={isPlaying ? '暫停' : '播放'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* Replay Button */}
      <button
        onClick={replay}
        className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-all"
        title="重播"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      {/* Volume Control */}
      <div className="flex items-center gap-1">
        <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
        </svg>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
          title="音量"
        />
      </div>
    </div>
  );
};

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export default OpenAIAudioPlayer;
