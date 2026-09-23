import React from 'react';
import { ModuleStatus } from '../../../types';

interface StatusBadgeProps {
  status: ModuleStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'published':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'archived':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'draft':
        return '草稿';
      case 'published':
        return '已發布';
      case 'archived':
        return '已封存';
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles()}`}
    >
      {getStatusLabel()}
    </span>
  );
};

export default StatusBadge;
