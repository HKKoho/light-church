import React from 'react';
import { ChurchService, EditorialRole } from '../types/bulletin';
import { STATUS_ORDER, STATUS_STEP_LABELS, ROLE_LABELS } from '../utils/workflow';
import { classifyServiceDate, SUNDAY_RELATION_MESSAGES, SUNDAY_RELATION_BADGE_CLASSES } from '../utils/sundayDates';
import { Check, Send, Undo2, Clock, CalendarClock } from 'lucide-react';

interface WorkflowStatusBarProps {
  service: ChurchService;
  currentRole: EditorialRole;
  onSubmitForReview: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export const WorkflowStatusBar: React.FC<WorkflowStatusBarProps> = ({
  service,
  currentRole,
  onSubmitForReview,
  onApprove,
  onReject,
}) => {
  const currentIndex = STATUS_ORDER.indexOf(service.status);
  const sundayRelation = classifyServiceDate(service.date);
  const sundayMessage = SUNDAY_RELATION_MESSAGES[sundayRelation];

  const renderActions = () => {
    if (service.status === 'draft') {
      if (currentRole === 'officer') {
        return (
          <button
            onClick={onSubmitForReview}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> 提交牧師審閱
          </button>
        );
      }
      return (
        <span className="text-xs text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> 等待幹事提交審閱
        </span>
      );
    }

    if (service.status === 'pastor_review') {
      if (currentRole === 'pastor') {
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              className="px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" /> 退回重編
            </button>
            <button
              onClick={onApprove}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> 確認通過
            </button>
          </div>
        );
      }
      return (
        <span className="text-xs text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> 待牧師／傳道審閱中
        </span>
      );
    }

    if (service.status === 'deacon_review') {
      if (currentRole === 'deacon') {
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              className="px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" /> 退回重編
            </button>
            <button
              onClick={onApprove}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> 確認定稿
            </button>
          </div>
        );
      }
      return (
        <span className="text-xs text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> 待執事複核中
        </span>
      );
    }

    return (
      <span className="text-xs text-green-700 font-semibold flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5" /> 已通過審批，可於上方「定稿並發送」發佈
      </span>
    );
  };

  return (
    <div className="w-full max-w-[540px] flex flex-col shrink-0">
    {sundayMessage && (
      <div
        className={`mb-2 rounded-lg px-3 py-2 flex items-start gap-2 text-xs ${SUNDAY_RELATION_BADGE_CLASSES[sundayRelation]}`}
      >
        <CalendarClock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">{sundayMessage.title}</p>
          <p className="opacity-90">{sundayMessage.body}</p>
        </div>
      </div>
    )}
    <div className="w-full mb-4 bg-white border border-slate-200 rounded-lg shadow-xs px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
      {/* Stepper */}
      <div className="flex items-center flex-wrap gap-y-1.5">
        {STATUS_ORDER.map((s, idx) => {
          const isFinalized = service.status === 'finalized';
          const isDone = idx < currentIndex || (isFinalized && idx <= currentIndex);
          const isCurrent = idx === currentIndex && !isFinalized;
          return (
            <React.Fragment key={s}>
              {idx > 0 && (
                <span
                  className={`w-6 h-px mx-1 ${idx <= currentIndex ? 'bg-blue-400' : 'bg-slate-200'}`}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isDone
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isDone && !isCurrent ? <Check className="w-3 h-3" /> : idx + 1}
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    isCurrent ? 'text-blue-700' : isDone ? 'text-green-700' : 'text-slate-400'
                  }`}
                >
                  {STATUS_STEP_LABELS[s]}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 flex-wrap">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">
          目前身份：{ROLE_LABELS[currentRole]}
        </span>
        {renderActions()}
      </div>
    </div>
    </div>
  );
};
