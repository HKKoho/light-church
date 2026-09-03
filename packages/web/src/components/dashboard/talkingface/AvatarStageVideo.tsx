'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { useAuthedImageUrl } from '@/hooks/use-authed-image';

export interface VideoSpeakParams {
  /** Base64-encoded MP4 video from SadTalker. */
  readonly video: string;
  /** Base64-encoded WAV audio (played in sync with the video). */
  readonly audio: string;
}

export interface AvatarVideoHandle {
  /** Queue a video+audio chunk to play after the current one finishes. */
  enqueue: (params: VideoSpeakParams) => void;
  /** Clear the playback queue (e.g. on error). */
  clear: () => void;
}

interface AvatarStageVideoProps {
  /** Shown as a static preview while idle. */
  photoUrl?: string;
  className?: string;
}

/**
 * Photo-realistic avatar renderer for the SadTalker pipeline.
 *
 * The component maintains a FIFO queue of base64 MP4 chunks produced by
 * SadTalker. Each chunk is decoded into an object URL and played in a
 * <video> element. When one chunk ends the next is loaded automatically,
 * producing a seamless (though not gapless) sequence. When the queue
 * empties the static portrait photo is shown again.
 */
export const AvatarStageVideo = forwardRef<AvatarVideoHandle, AvatarStageVideoProps>(
  function AvatarStageVideo({ photoUrl, className }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const queueRef = useRef<VideoSpeakParams[]>([]);
    const playingRef = useRef(false);
    const currentBlobRef = useRef<string | null>(null);
    // photoUrl points at an auth-protected API endpoint — resolve it to a
    // blob URL a plain <img> can actually load (see use-authed-image.ts).
    const photoObjectUrl = useAuthedImageUrl(photoUrl);

    const playNext = useCallback(() => {
      const next = queueRef.current.shift();
      if (!next || !videoRef.current) {
        playingRef.current = false;
        // Revoke previous blob URL
        if (currentBlobRef.current) {
          URL.revokeObjectURL(currentBlobRef.current);
          currentBlobRef.current = null;
        }
        return;
      }

      // Decode base64 MP4 → Blob → object URL
      const binary = atob(next.video);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'video/mp4' });

      if (currentBlobRef.current) URL.revokeObjectURL(currentBlobRef.current);
      currentBlobRef.current = URL.createObjectURL(blob);

      videoRef.current.src = currentBlobRef.current;
      void videoRef.current.play();
    }, []);

    const enqueue = useCallback(
      (params: VideoSpeakParams) => {
        queueRef.current.push(params);
        if (!playingRef.current) {
          playingRef.current = true;
          playNext();
        }
      },
      [playNext],
    );

    const clear = useCallback(() => {
      queueRef.current = [];
      playingRef.current = false;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
      if (currentBlobRef.current) {
        URL.revokeObjectURL(currentBlobRef.current);
        currentBlobRef.current = null;
      }
    }, []);

    useImperativeHandle(ref, () => ({ enqueue, clear }));

    return (
      <div
        className={`relative overflow-hidden rounded-lg border border-border/60 bg-black/90 ${className ?? 'h-full w-full'}`}
      >
        {/* Static portrait shown when idle */}
        {photoObjectUrl && (
          <img
            src={photoObjectUrl}
            alt="Avatar portrait"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        )}

        {/* Video overlays the portrait while playing */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-top"
          playsInline
          muted={false}
          onEnded={playNext}
          onError={() => {
            playingRef.current = false;
          }}
        />
      </div>
    );
  },
);
