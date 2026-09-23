import React from 'react';
import { LifeQuestionInput, QuestionType } from '../../../types';

interface LifeQuestionEditorProps {
  questions: LifeQuestionInput[];
  onChange: (questions: LifeQuestionInput[]) => void;
  label?: string;
  emptyMessage?: string;
}

const LifeQuestionEditor: React.FC<LifeQuestionEditorProps> = ({
  questions,
  onChange,
  label = '人生問題列表',
  emptyMessage = '尚無人生問題。這些問題會讓學員反思自己的生活經驗。'
}) => {
  const handleAdd = () => {
    onChange([
      ...questions,
      {
        questionText: '',
        questionType: 'open',
        options: undefined
      }
    ]);
  };

  const handleRemove = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    onChange(newQuestions);
  };

  const handleQuestionTextChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], questionText: value };
    onChange(newQuestions);
  };

  const handleQuestionTypeChange = (index: number, type: QuestionType) => {
    const newQuestions = [...questions];
    newQuestions[index] = {
      ...newQuestions[index],
      questionType: type,
      options: type === 'multi_choice' ? [''] : undefined
    };
    onChange(newQuestions);
  };

  const handleMediaUrlChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = {
      ...newQuestions[index],
      mediaUrl: value || undefined,
      youtubeUrl: value || undefined // Keep synced for backward compatibility
    };
    onChange(newQuestions);
  };

  const handleAddOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    const currentOptions = newQuestions[questionIndex].options || [];
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: [...currentOptions, '']
    };
    onChange(newQuestions);
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    const currentOptions = newQuestions[questionIndex].options || [];
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: currentOptions.filter((_, i) => i !== optionIndex)
    };
    onChange(newQuestions);
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    const currentOptions = [...(newQuestions[questionIndex].options || [])];
    currentOptions[optionIndex] = value;
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: currentOptions
    };
    onChange(newQuestions);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newQuestions = [...questions];
    [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    onChange(newQuestions);
  };

  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    onChange(newQuestions);
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}

      {questions.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg">
          <p className="text-slate-500 text-sm mb-3">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, questionIndex) => (
            <div key={questionIndex} className="flex items-start space-x-2">
              {/* Move up/down buttons */}
              <div className="flex flex-col space-y-1 pt-2">
                <button
                  type="button"
                  onClick={() => handleMoveUp(questionIndex)}
                  disabled={questionIndex === 0}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="上移"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(questionIndex)}
                  disabled={questionIndex === questions.length - 1}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="下移"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Question content */}
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                {/* Question text */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    問題內容
                  </label>
                  <textarea
                    value={question.questionText}
                    onChange={(e) => handleQuestionTextChange(questionIndex, e.target.value)}
                    placeholder="輸入人生問題..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Question type */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    問題類型
                  </label>
                  <select
                    value={question.questionType}
                    onChange={(e) => handleQuestionTypeChange(questionIndex, e.target.value as QuestionType)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  >
                    <option value="open">開放式問題（文字輸入）</option>
                    <option value="multi_choice">多選題（單選按鈕）</option>
                  </select>
                </div>

                {/* Media/Resource URL (Optional) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    媒體/資源連結 (Media/Resource Link) - 選填
                  </label>
                  <input
                    type="url"
                    value={question.mediaUrl || question.youtubeUrl || ''}
                    onChange={(e) => handleMediaUrlChange(questionIndex, e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or any URL"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    💡 支援平台：YouTube、Vimeo、Bilibili、Google Drive，或任何網頁連結
                  </p>
                  <p className="text-xs text-slate-500">
                    Supports: YouTube, Vimeo, Bilibili, Google Drive, or any web link
                  </p>
                </div>

                {/* Options for multi-choice questions */}
                {question.questionType === 'multi_choice' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">
                      選項
                    </label>
                    <div className="space-y-2">
                      {(question.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                            placeholder={`選項 ${optionIndex + 1}`}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(questionIndex, optionIndex)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="刪除選項"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAddOption(questionIndex)}
                        className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center space-x-1 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>新增選項</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleRemove(questionIndex)}
                className="mt-2 text-red-500 hover:text-red-700 transition-colors"
                title="刪除問題"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>新增問題</span>
      </button>
    </div>
  );
};

export default LifeQuestionEditor;
