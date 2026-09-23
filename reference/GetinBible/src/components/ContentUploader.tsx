import React, { useState, useRef } from 'react';
import { ContentAnalysisContentType } from '../../types';
import SpeechInputButton from '../../components/SpeechInputButton';

export type WordLimitOption = 150 | 300 | 500 | 800;

interface ContentUploaderProps {
  onContentSelected: (type: ContentAnalysisContentType, content: string | File, title?: string, wordLimit?: WordLimitOption) => void;
  disabled?: boolean;
}

const contentTypeOptions: { type: ContentAnalysisContentType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    type: 'youtube',
    label: 'YouTube',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    description: '分析 YouTube 影片內容',
  },
  {
    type: 'websearch',
    label: '搜尋',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    description: '用 Google 搜尋相關內容',
  },
  {
    type: 'document',
    label: '文件',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    description: 'PDF、DOCX、TXT（最大 10MB）',
  },
  {
    type: 'image',
    label: '圖片',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    description: 'PNG、JPG、GIF、WebP',
  },
  {
    type: 'audio',
    label: '音頻',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    description: 'MP3、WAV、M4A（最大 25MB）',
  },
  {
    type: 'transcript',
    label: '文字',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
    description: '直接輸入或貼上文字內容',
  },
];

const acceptedFileTypes: Record<ContentAnalysisContentType, string> = {
  youtube: '',
  websearch: '',
  document: '.pdf,.doc,.docx,.txt',
  image: '.png,.jpg,.jpeg,.gif,.webp',
  audio: '.mp3,.wav,.m4a,.ogg',
  transcript: '',
};

const maxFileSizes: Record<ContentAnalysisContentType, number> = {
  youtube: 0,
  websearch: 0,
  document: 10 * 1024 * 1024, // 10MB
  image: 10 * 1024 * 1024, // 10MB
  audio: 25 * 1024 * 1024, // 25MB
  transcript: 0,
};

const wordLimitOptions: { value: WordLimitOption; label: string }[] = [
  { value: 150, label: '簡短 (150字)' },
  { value: 300, label: '標準 (300字)' },
  { value: 500, label: '詳細 (500字)' },
  { value: 800, label: '完整 (800字)' },
];

const ContentUploader: React.FC<ContentUploaderProps> = ({ onContentSelected, disabled }) => {
  const [selectedType, setSelectedType] = useState<ContentAnalysisContentType>('youtube');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [wordLimit, setWordLimit] = useState<WordLimitOption>(300);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleSpeechTranscript = (transcript: string) => {
    setTitleInput(prev => prev ? `${prev} ${transcript}` : transcript);
  };

  const handleTextSpeechTranscript = (transcript: string) => {
    setTextInput(prev => prev ? `${prev} ${transcript}` : transcript);
  };

  const handleSearchSpeechTranscript = (transcript: string) => {
    setSearchQuery(prev => prev ? `${prev} ${transcript}` : transcript);
  };

  const handleTypeSelect = (type: ContentAnalysisContentType) => {
    setSelectedType(type);
    setError(null);
    setUrlInput('');
    setTextInput('');
    setSearchQuery('');
    setSelectedFile(null);
    setTitleInput('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = maxFileSizes[selectedType];
    if (maxSize && file.size > maxSize) {
      setError(`文件大小超過限制（最大 ${Math.round(maxSize / 1024 / 1024)}MB）`);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setTitleInput(file.name);
  };

  const handleSubmit = () => {
    setError(null);

    if (selectedType === 'youtube') {
      if (!urlInput.trim()) {
        setError('請輸入 YouTube 連結');
        return;
      }
      if (!urlInput.includes('youtube.com') && !urlInput.includes('youtu.be')) {
        setError('請輸入有效的 YouTube 連結');
        return;
      }
      onContentSelected('youtube', urlInput.trim(), titleInput || undefined, wordLimit);
    } else if (selectedType === 'websearch') {
      if (!searchQuery.trim()) {
        setError('請輸入搜尋關鍵字');
        return;
      }
      onContentSelected('websearch', searchQuery.trim(), titleInput || searchQuery.trim(), wordLimit);
    } else if (selectedType === 'transcript') {
      if (!textInput.trim()) {
        setError('請輸入文字內容');
        return;
      }
      onContentSelected('transcript', textInput.trim(), titleInput || undefined, wordLimit);
    } else {
      if (!selectedFile) {
        setError('請選擇文件');
        return;
      }
      onContentSelected(selectedType, selectedFile, titleInput || selectedFile.name, wordLimit);
    }
  };

  const renderInputArea = () => {
    if (selectedType === 'youtube') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">YouTube 連結</label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={disabled}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">標題（可選）</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="為這個影片添加標題..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled}
              />
              <SpeechInputButton
                onTranscript={handleTitleSpeechTranscript}
                className="flex-shrink-0"
              />
            </div>
          </div>
        </div>
      );
    }

    if (selectedType === 'websearch') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">搜尋關鍵字</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="輸入你想搜尋的主題，例如：聖經中的愛..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled}
              />
              <SpeechInputButton
                onTranscript={handleSearchSpeechTranscript}
                className="flex-shrink-0"
              />
            </div>
            <p className="text-sm text-slate-500 mt-1">系統會使用 Google 搜尋相關內容並進行聖經分析</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">標題（可選）</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="為搜尋結果添加標題..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled}
              />
              <SpeechInputButton
                onTranscript={handleTitleSpeechTranscript}
                className="flex-shrink-0"
              />
            </div>
          </div>
        </div>
      );
    }

    if (selectedType === 'transcript') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">標題（可選）</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="為這個內容添加標題..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled}
              />
              <SpeechInputButton
                onTranscript={handleTitleSpeechTranscript}
                className="flex-shrink-0"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">文字內容</label>
              <SpeechInputButton
                onTranscript={handleTextSpeechTranscript}
                className="flex-shrink-0"
              />
            </div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="在這裡貼上講道、教材、或任何文字內容...或點擊麥克風輸入"
              rows={8}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={disabled}
            />
            <p className="text-sm text-slate-500 mt-1">{textInput.length} 字</p>
          </div>
        </div>
      );
    }

    // File upload for document, image, audio
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">標題（可選）</label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="為這個文件添加標題..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={disabled}
            />
            <SpeechInputButton
              onTranscript={handleTitleSpeechTranscript}
              className="flex-shrink-0"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">選擇文件</label>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes[selectedType]}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          <div
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <div className="text-blue-600">
                  <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-medium text-slate-700">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <p className="text-sm text-blue-600">點擊更換文件</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-slate-400">
                  <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-slate-600">點擊或拖曳文件到此處</p>
                <p className="text-sm text-slate-400">{contentTypeOptions.find(o => o.type === selectedType)?.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Content Type Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">選擇內容類型</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {contentTypeOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => handleTypeSelect(option.type)}
              disabled={disabled}
              className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                selectedType === option.type
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.icon}
              <span className="text-xs mt-1 font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      {renderInputArea()}

      {/* Word Limit Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">報告長度</label>
        <select
          value={wordLimit}
          onChange={(e) => setWordLimit(Number(e.target.value) as WordLimitOption)}
          disabled={disabled}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          {wordLimitOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
          disabled
            ? 'bg-slate-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        開始分析
      </button>
    </div>
  );
};

export default ContentUploader;
