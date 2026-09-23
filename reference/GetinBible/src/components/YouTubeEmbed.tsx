import React from 'react';

interface YouTubeEmbedProps {
  url: string;
  title?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
const extractVideoId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);

    // Handle youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v');
    }

    // Handle youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1); // Remove leading /
    }

    // Handle youtube.com/embed/VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
      return urlObj.pathname.split('/embed/')[1];
    }

    return null;
  } catch (error) {
    console.error('Invalid YouTube URL:', url);
    return null;
  }
};

/**
 * YouTube video embed component
 * Displays a responsive YouTube video player
 */
export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ url, title = 'YouTube video' }) => {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="text-sm">
          ⚠️ 無效的 YouTube 連結 / Invalid YouTube URL
        </p>
        <p className="text-xs mt-1 text-red-600">
          請使用正確的 YouTube 連結格式 / Please use a valid YouTube URL
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-lg shadow-md"
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
};

export default YouTubeEmbed;
