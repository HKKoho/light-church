import React from 'react';
import { ContentAnalysisStatus } from '../../types';

interface AnalysisStatusBadgeProps {
  status: ContentAnalysisStatus;
}

const statusConfig: Record<ContentAnalysisStatus, { label: string; color: string; bgColor: string; animate?: boolean }> = {
  idle: {
    label: '準備就緒',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
  },
  fetching: {
    label: '正在獲取內容...',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    animate: true,
  },
  analyzing: {
    label: '正在分析...',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    animate: true,
  },
  completed: {
    label: '分析完成',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  error: {
    label: '分析失敗',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

const AnalysisStatusBadge: React.FC<AnalysisStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${config.bgColor}`}>
      {config.animate && (
        <span className="relative flex h-2 w-2 mr-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bgColor} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color.replace('text-', 'bg-')}`}></span>
        </span>
      )}
      {!config.animate && status === 'completed' && (
        <svg className="w-4 h-4 mr-1.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {!config.animate && status === 'error' && (
        <svg className="w-4 h-4 mr-1.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
    </div>
  );
};

export default AnalysisStatusBadge;
