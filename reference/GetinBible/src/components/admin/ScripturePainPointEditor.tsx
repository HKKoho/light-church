import React, { useRef } from 'react';
import { ScripturePainPointDocument } from '../../../types';

interface ScripturePainPointItem {
  text: string;
  documents?: ScripturePainPointDocument[]; // Multiple documents support
  pendingFiles?: File[]; // Files to upload when saving
  removeDocumentIds?: string[]; // IDs of documents to remove
}

interface ScripturePainPointEditorProps {
  items: ScripturePainPointItem[];
  onChange: (items: ScripturePainPointItem[]) => void;
  moduleId?: number; // Required for uploading (not available for new modules)
  onUpload?: (index: number, file: File) => Promise<ScripturePainPointDocument>;
  onDeleteDocument?: (documentId: string) => Promise<void>;
  label?: string;
  emptyMessage?: string;
  placeholder?: string;
  rows?: number;
  addButtonLabel?: string;
  uploading?: { index: number; fileIndex: number } | null; // Track which file is uploading
}

const ScripturePainPointEditor: React.FC<ScripturePainPointEditorProps> = ({
  items,
  onChange,
  moduleId,
  onUpload,
  onDeleteDocument,
  label = '經文痛點列表',
  emptyMessage = '尚無經文痛點。這部分幫助學員理解不同觀點之間的張力。',
  placeholder = '解釋如何整合三個不同的觀點，幫助學員理解其中的張力...',
  rows = 8,
  addButtonLabel = '新增經文痛點',
  uploading = null
}) => {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleAdd = () => {
    onChange([...items, { text: '' }]);
  };

  const handleRemove = async (index: number) => {
    const item = items[index];
    // Delete all existing documents for this item
    if (item.documents && item.documents.length > 0 && onDeleteDocument) {
      for (const doc of item.documents) {
        try {
          await onDeleteDocument(doc.id);
        } catch (err) {
          console.error('Failed to delete document:', err);
        }
      }
    }
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleTextChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], text: value };
    onChange(newItems);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange(newItems);
  };

  const handleFileSelect = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!validTypes.includes(file.type)) {
        alert(`${file.name}: 請上傳 PDF 或 Word 文件 (.pdf, .doc, .docx)`);
        continue;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}: 檔案大小不能超過 10MB`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // If we can upload immediately (moduleId exists and onUpload provided)
    if (moduleId && onUpload) {
      const newItems = [...items];
      const currentDocs = newItems[index].documents || [];

      for (const file of validFiles) {
        try {
          const document = await onUpload(index, file);
          currentDocs.push(document);
        } catch (err) {
          console.error('Failed to upload file:', err);
          alert(`上傳 ${file.name} 失敗，請稍後再試`);
        }
      }

      newItems[index] = { ...newItems[index], documents: currentDocs };
      onChange(newItems);
    } else {
      // Store files for later upload (new module case)
      const newItems = [...items];
      const currentPending = newItems[index].pendingFiles || [];
      newItems[index] = { ...newItems[index], pendingFiles: [...currentPending, ...validFiles] };
      onChange(newItems);
    }
  };

  const handleRemoveDocument = async (index: number, documentId: string) => {
    const item = items[index];

    if (onDeleteDocument) {
      try {
        await onDeleteDocument(documentId);
      } catch (err) {
        console.error('Failed to delete document:', err);
      }
    }

    const newItems = [...items];
    const updatedDocs = (item.documents || []).filter(d => d.id !== documentId);
    const removeIds = [...(item.removeDocumentIds || []), documentId];
    newItems[index] = { ...newItems[index], documents: updatedDocs, removeDocumentIds: removeIds };
    onChange(newItems);
  };

  const handleRemovePendingFile = (index: number, fileIndex: number) => {
    const newItems = [...items];
    const currentPending = newItems[index].pendingFiles || [];
    newItems[index] = {
      ...newItems[index],
      pendingFiles: currentPending.filter((_, i) => i !== fileIndex)
    };
    onChange(newItems);
  };

  const getFileIcon = (fileType?: string) => {
    if (fileType === 'pdf') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}

      {items.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg">
          <p className="text-slate-500 text-sm mb-3">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-4 bg-white">
              {/* Header with index and controls */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">
                  經文痛點 #{index + 1}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="上移"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="下移"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                    title="刪除"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Text summary input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  摘要說明
                </label>
                <textarea
                  value={item.text}
                  onChange={(e) => handleTextChange(index, e.target.value)}
                  placeholder={placeholder}
                  rows={rows}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
                />
              </div>

              {/* Document upload section */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  附件文檔 (PDF 或 Word) - 可上傳多個檔案
                </label>

                {/* Show existing documents */}
                {item.documents && item.documents.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {item.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(doc.fileType)}
                          <div>
                            <p className="text-sm font-medium text-slate-700">{doc.fileName}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(doc.fileSizeBytes)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {doc.publicUrl && (
                            <a
                              href={doc.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            >
                              下載
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(index, doc.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show pending files */}
                {item.pendingFiles && item.pendingFiles.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {item.pendingFiles.map((file, fileIndex) => (
                      <div key={fileIndex} className="flex items-center justify-between bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file.name.split('.').pop())}
                          <div>
                            <p className="text-sm font-medium text-slate-700">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(file.size)}
                              <span className="ml-2 text-amber-600">(待上傳)</span>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePendingFile(index, fileIndex)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <div className="relative">
                  <input
                    type="file"
                    ref={(el) => { fileInputRefs.current[index] = el; }}
                    onChange={(e) => {
                      handleFileSelect(index, e.target.files);
                      e.target.value = ''; // Reset input
                    }}
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    disabled={uploading?.index === index}
                    className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-amber-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                  >
                    {uploading?.index === index ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>上傳中...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>上傳文檔 (可多選)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={handleAdd}
        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>{addButtonLabel}</span>
      </button>
    </div>
  );
};

export default ScripturePainPointEditor;
