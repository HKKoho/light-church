import React from 'react';
import { MediaPlatform } from '../../types';

interface MediaEmbedProps {
  url: string;
  title?: string;
}

/**
 * Detect media platform type from URL
 * Supports: YouTube, Vimeo, Bilibili, Google Drive, or generic link
 */
const detectMediaType = (url: string): MediaPlatform => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace('www.', '');

    if (hostname.includes('youtube.com') || hostname === 'youtu.be' || hostname === 'm.youtube.com') {
      return 'youtube';
    }
    if (hostname.includes('vimeo.com')) {
      return 'vimeo';
    }
    if (hostname.includes('bilibili.com') || hostname === 'b23.tv') {
      return 'bilibili';
    }
    if (hostname.includes('drive.google.com')) {
      return 'google-drive';
    }

    return 'link';
  } catch {
    return 'link';
  }
};

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
const extractYouTubeId = (url: string): string | null => {
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
  } catch {
    return null;
  }
};

/**
 * Extract Vimeo video ID from URL
 * Supports:
 * - https://vimeo.com/VIDEO_ID
 * - https://player.vimeo.com/video/VIDEO_ID
 */
const extractVimeoId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Extract Bilibili video ID from URL
 * Supports:
 * - https://www.bilibili.com/video/BV_________
 * - https://www.bilibili.com/video/av123456
 */
const extractBilibiliId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/(BV[\w]+|av\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Extract Google Drive file ID from URL
 * Supports:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 */
const extractGoogleDriveId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);

    // Handle /file/d/FILE_ID/view format
    const match = urlObj.pathname.match(/\/file\/d\/([\w-]+)/);
    if (match) return match[1];

    // Handle ?id=FILE_ID format
    return urlObj.searchParams.get('id');
  } catch {
    return null;
  }
};

/**
 * MediaEmbed Component
 * Smart media component that automatically detects URL type and renders appropriately:
 * - Video platforms (YouTube, Vimeo, Bilibili, Google Drive): Embedded player
 * - Other URLs: Styled link button
 */
export const MediaEmbed: React.FC<MediaEmbedProps> = ({ url, title = 'Media content' }) => {
  const platform = detectMediaType(url);

  // Extract video ID based on platform
  let videoId: string | null = null;
  let embedUrl: string | null = null;
  let errorMessage: string | null = null;

  switch (platform) {
    case 'youtube':
      videoId = extractYouTubeId(url);
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
      } else {
        errorMessage = '⚠️ 無效的 YouTube 連結 / Invalid YouTube URL';
      }
      break;

    case 'vimeo':
      videoId = extractVimeoId(url);
      if (videoId) {
        embedUrl = `https://player.vimeo.com/video/${videoId}?byline=0&portrait=0`;
      } else {
        errorMessage = '⚠️ 無效的 Vimeo 連結 / Invalid Vimeo URL';
      }
      break;

    case 'bilibili':
      videoId = extractBilibiliId(url);
      if (videoId) {
        // Use bvid parameter for BV format, aid for av format
        const paramName = videoId.startsWith('BV') ? 'bvid' : 'aid';
        const paramValue = videoId.startsWith('av') ? videoId.slice(2) : videoId;
        embedUrl = `https://player.bilibili.com/player.html?${paramName}=${paramValue}&high_quality=1`;
      } else {
        errorMessage = '⚠️ 無效的 Bilibili 連結 / Invalid Bilibili URL';
      }
      break;

    case 'google-drive':
      videoId = extractGoogleDriveId(url);
      if (videoId) {
        embedUrl = `https://drive.google.com/file/d/${videoId}/preview`;
      } else {
        errorMessage = '⚠️ 無效的 Google Drive 連結 / Invalid Google Drive URL';
      }
      break;

    case 'link':
      // Display as link button (handled below)
      break;
  }

  // Error state for invalid video URLs
  if (errorMessage) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="text-sm">{errorMessage}</p>
        <p className="text-xs mt-1 text-red-600">
          請使用正確的網址格式 / Please use a valid URL format
        </p>
      </div>
    );
  }

  // Video embed for supported platforms
  if (embedUrl) {
    return (
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-lg shadow-md"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        />
      </div>
    );
  }

  // Link button for non-video URLs
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center space-x-2 px-4 py-3 bg-amber-100 border-2 border-amber-300 rounded-lg hover:bg-amber-200 transition-colors shadow-sm hover:shadow-md"
      >
        <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-amber-900">查看資源 / View Resource</span>
          <span className="text-xs text-amber-700 truncate max-w-xs">{domain}</span>
        </div>
      </a>
    );
  } catch {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="text-sm">⚠️ 無效的網址 / Invalid URL</p>
      </div>
    );
  }
};

export default MediaEmbed;
