import React, { useEffect, useState } from 'react';
import { ChurchService } from '../types/bulletin';
import { Plus, Printer, Send, CheckCircle, FileText, Menu, AlertTriangle, CalendarDays } from 'lucide-react';
import { STATUS_SHORT_LABELS } from '../utils/workflow';
import { classifyServiceDate, SUNDAY_RELATION_TAGS, SUNDAY_RELATION_BADGE_CLASSES } from '../utils/sundayDates';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function formatTodayLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（星期${WEEKDAY_LABELS[date.getDay()]}）`;
}

interface HeaderProps {
  services: ChurchService[];
  selectedServiceId: string;
  onSelectService: (id: string) => void;
  onAddNewService: () => void;
  onExportPDF: () => void;
  onFinalizeAndSend: () => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onToggleLeftDrawer: () => void;
  onToggleRightDrawer: () => void;
  alertCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  services,
  selectedServiceId,
  onSelectService,
  onAddNewService,
  onExportPDF,
  onFinalizeAndSend,
  isEditing,
  setIsEditing,
  onToggleLeftDrawer,
  onToggleRightDrawer,
  alertCount,
}) => {
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedRelation = selectedService ? classifyServiceDate(selectedService.date) : 'unknown';
  const selectedRelationTag = SUNDAY_RELATION_TAGS[selectedRelation];

  const [today, setToday] = useState<Date>(() => new Date());
  useEffect(() => {
    // Re-check once a minute so the date rolls over correctly if the app
    // is left open past midnight, without a per-second re-render.
    const id = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-8 flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-10 shadow-xs overflow-x-auto">
      {/* Service Selector */}
      <div className="flex items-center gap-2 sm:gap-4 text-sm font-medium shrink-0">
        <button
          onClick={onToggleLeftDrawer}
          title="開啟事工管理選單"
          className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          className="flex items-center gap-1.5 text-slate-500 shrink-0 pr-2 sm:pr-4 sm:mr-1 border-r border-slate-200"
          title="今天日期"
        >
          <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">
            {formatTodayLabel(today)}
          </span>
        </div>

        <span className="hidden sm:inline text-slate-400 font-semibold uppercase text-xs tracking-wider">崇拜場次：</span>
        <div className="flex items-center gap-2">
          <select
            value={selectedServiceId}
            onChange={(e) => onSelectService(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors max-w-[140px] sm:max-w-none"
          >
            {services.map((service) => {
              const tag = SUNDAY_RELATION_TAGS[classifyServiceDate(service.date)];
              return (
                <option key={service.id} value={service.id}>
                  {service.title}（{STATUS_SHORT_LABELS[service.status] || service.status}
                  {tag ? ` · ${tag}` : ''}）
                </option>
              );
            })}
          </select>

          <button
            onClick={onAddNewService}
            title="新增崇拜場次"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {selectedService && (
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
              selectedService.status === 'finalized'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            {STATUS_SHORT_LABELS[selectedService.status] || selectedService.status}
          </span>
        )}

        {selectedRelationTag && (
          <span
            className={`hidden md:inline text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${SUNDAY_RELATION_BADGE_CLASSES[selectedRelation]}`}
          >
            {selectedRelationTag}
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <button
          onClick={() => setIsEditing(!isEditing)}
          title={isEditing ? '檢視程序表' : '編輯程序'}
          className={`px-2 sm:px-3.5 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
            isEditing
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isEditing ? '檢視程序表' : '編輯程序'}</span>
        </button>

        <button
          onClick={onExportPDF}
          title="匯出（家事分享 PPT／整份程序表 PDF）"
          className="px-2 sm:px-4 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">匯出</span>
        </button>

        <button
          onClick={onFinalizeAndSend}
          disabled={selectedService?.status !== 'finalized'}
          title={
            selectedService?.status !== 'finalized'
              ? '需先完成牧師審閱及執事複核，方可發送'
              : '定稿並發送'
          }
          className="px-2 sm:px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 flex items-center gap-1.5 shadow-xs transition-colors shrink-0 whitespace-nowrap disabled:bg-slate-300 disabled:cursor-not-allowed disabled:hover:bg-slate-300"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">定稿並發送</span>
        </button>

        <button
          onClick={onToggleRightDrawer}
          title="開啟驗證提示與事奉人員名冊"
          className="lg:hidden relative p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg shrink-0"
        >
          <AlertTriangle className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
