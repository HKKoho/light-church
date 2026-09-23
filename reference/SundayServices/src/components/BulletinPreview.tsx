import React, { useEffect, useState } from 'react';
import { ChurchService, ServiceItem, Announcement, EditorialRole } from '../types/bulletin';
import { Plus, Trash2, ArrowUp, ArrowDown, Edit3, Check, Sparkles, Download, Loader2 } from 'lucide-react';
import { WorkflowStatusBar } from './WorkflowStatusBar';
import { TextBlockList } from './bulletin-pages/TextBlockList';
import { RosterTable } from './bulletin-pages/RosterTable';
import { AttendanceTable } from './bulletin-pages/AttendanceTable';
import { BULLETIN_PAGES, BulletinPageKey } from '../utils/bulletinPages';
import { exportMinistryUpdatesToPptx } from '../utils/exportMinistryPps';

interface BulletinPreviewProps {
  service: ChurchService;
  onUpdateService: (updated: ChurchService) => void;
  isEditing: boolean;
  onOpenAiAssist: () => void;
  currentRole: EditorialRole;
  onSubmitForReview: () => void;
  onWorkflowApprove: () => void;
  onWorkflowReject: () => void;
}

export const BulletinPreview: React.FC<BulletinPreviewProps> = ({
  service,
  onUpdateService,
  isEditing,
  onOpenAiAssist,
  currentRole,
  onSubmitForReview,
  onWorkflowApprove,
  onWorkflowReject,
}) => {
  const [editingHeader, setEditingHeader] = useState(false);
  const [churchName, setChurchName] = useState(service.churchName);
  const [motto, setMotto] = useState(service.motto);
  const [dateStr, setDateStr] = useState(service.date);

  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemDetail, setNewItemDetail] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');

  const [activePage, setActivePage] = useState<BulletinPageKey>('order');
  const [isExportingPpt, setIsExportingPpt] = useState(false);

  useEffect(() => {
    setActivePage('order');
  }, [service.id]);

  const handleExportMinistryPpt = async () => {
    if (isExportingPpt) return;
    setIsExportingPpt(true);
    try {
      await exportMinistryUpdatesToPptx(service);
    } catch (err) {
      console.error(err);
      alert('匯出 PPT 失敗，請重試。');
    } finally {
      setIsExportingPpt(false);
    }
  };

  const handleSaveHeader = () => {
    onUpdateService({
      ...service,
      churchName,
      motto,
      date: dateStr,
    });
    setEditingHeader(false);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...service.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    onUpdateService({ ...service, items: newItems });
  };

  const handleDeleteItem = (id: string) => {
    onUpdateService({
      ...service,
      items: service.items.filter((item) => item.id !== id),
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel.trim() || !newItemDetail.trim()) return;
    const newItem: ServiceItem = {
      id: 'item-' + Date.now(),
      type: 'custom',
      label: newItemLabel.trim(),
      detail: newItemDetail.trim(),
    };
    onUpdateService({
      ...service,
      items: [...service.items, newItem],
    });
    setNewItemLabel('');
    setNewItemDetail('');
  };

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    const newAnn: Announcement = {
      id: 'ann-' + Date.now(),
      text: newAnnouncement.trim(),
    };
    onUpdateService({
      ...service,
      announcements: [...service.announcements, newAnn],
    });
    setNewAnnouncement('');
  };

  const handleDeleteAnnouncement = (id: string) => {
    onUpdateService({
      ...service,
      announcements: service.announcements.filter((a) => a.id !== id),
    });
  };

  const handleUpdateItemDetail = (id: string, newDetail: string) => {
    onUpdateService({
      ...service,
      items: service.items.map((i) => (i.id === id ? { ...i, detail: newDetail } : i)),
    });
  };

  return (
    <div className="flex-1 p-3 sm:p-8 bg-slate-200 overflow-y-auto flex flex-col items-center justify-start min-h-0 relative no-print">
      {/* Editorial approval workflow status & actions */}
      <WorkflowStatusBar
        service={service}
        currentRole={currentRole}
        onSubmitForReview={onSubmitForReview}
        onApprove={onWorkflowApprove}
        onReject={onWorkflowReject}
      />

      {/* Bulletin page navigator: mirrors the printed original's sections so
          digitizing them can happen gradually, page by page */}
      <div className="w-full max-w-[540px] mb-4 flex flex-wrap gap-1.5">
        {BULLETIN_PAGES.map((page) => (
          <button
            key={page.key}
            onClick={() => setActivePage(page.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
              activePage === page.key
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>

      {/* Editor toolbar banner when in edit mode */}
      {isEditing && (
        <div className="w-full max-w-[540px] mb-4 bg-blue-900 text-white p-3 rounded-lg shadow-md flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-300" />
            <span className="font-semibold">崇拜程序編輯模式</span>
          </div>
          <button
            onClick={onOpenAiAssist}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-yellow-300" /> AI 詩歌配對
          </button>
        </div>
      )}

      {/* Main Printed Bulletin Document Paper */}
      <div className="w-full max-w-[540px] min-h-[640px] bg-white paper-shadow p-6 sm:p-12 bulletin-font text-[#2a2a2a] relative overflow-hidden bulletin-paper my-auto shrink-0 transition-all">
        {/* Top Dark Bar Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />

        {activePage === 'order' && (
        <>
        {/* Church Header */}
        <div className="text-center mb-8 relative group">
          {editingHeader ? (
            <div className="p-3 bg-slate-50 border border-slate-300 rounded space-y-2 text-left mb-4 font-sans text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-0.5">教會名稱</label>
                <input
                  type="text"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  className="w-full border p-1 rounded font-serif"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-0.5">標語／宗旨</label>
                <input
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  className="w-full border p-1 rounded italic"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-0.5">崇拜日期</label>
                <input
                  type="text"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full border p-1 rounded"
                />
              </div>
              <button
                onClick={handleSaveHeader}
                className="px-3 py-1 bg-slate-900 text-white font-bold rounded flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> 儲存標頭
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
                {service.churchName}
              </h2>
              <p className="text-sm italic mt-1 text-slate-700 font-serif">"{service.motto}"</p>
              <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <span className="w-12 h-px bg-slate-300" />
                {service.date}
                <span className="w-12 h-px bg-slate-300" />
              </div>
              {isEditing && (
                <button
                  onClick={() => setEditingHeader(true)}
                  className="absolute -top-2 -right-2 p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-full text-slate-700 shadow-xs text-xs font-sans"
                  title="編輯教會標頭"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Order of Service Items */}
        <div className="space-y-3.5 text-sm">
          {service.items.map((item, index) => {
            if (item.type === 'sermon') {
              return (
                <div
                  key={item.id}
                  className="py-4 my-2 text-center border-y border-slate-100/80 relative group hover:bg-slate-50/80 transition-colors rounded px-2"
                >
                  <h3 className="text-lg font-bold text-slate-900 font-serif">
                    {service.sermonTitle}
                  </h3>
                  <p className="text-xs italic text-slate-600 mt-0.5">
                    經文：{service.scripture}
                  </p>
                  {item.leader && (
                    <p className="text-[11px] font-sans font-medium text-slate-500 mt-1 uppercase tracking-wider">
                      {item.leader}
                    </p>
                  )}

                  {isEditing && (
                    <div className="mt-2 flex justify-center gap-1 font-sans text-xs">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-[10px] underline"
                      >
                        移除
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-slate-100 pb-1.5 group relative hover:bg-slate-50/50 rounded px-1 transition-colors"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-bold uppercase tracking-wide text-xs text-slate-900">
                    {item.label}
                  </span>
                  {item.hymnNumber && (
                    <span className="text-[10px] font-sans bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 font-semibold">
                      編號 {item.hymnNumber}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={item.detail}
                      onChange={(e) => handleUpdateItemDetail(item.id, e.target.value)}
                      className="border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right font-serif focus:outline-none focus:border-blue-500 bg-white"
                    />
                  ) : (
                    <span className="text-slate-800 text-right font-serif">{item.detail}</span>
                  )}

                  {isEditing && (
                    <div className="flex items-center gap-1 ml-2 font-sans">
                      <button
                        onClick={() => handleMoveItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveItem(index, 'down')}
                        disabled={index === service.items.length - 1}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Service Item Form (in edit mode) */}
        {isEditing && (
          <form onSubmit={handleAddItem} className="mt-4 pt-3 border-t border-dashed border-slate-300 font-sans text-xs space-y-2">
            <span className="font-bold text-slate-700 block">新增程序項目</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="項目名稱（例：奉獻詩歌）"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                className="w-1/3 border border-slate-300 rounded p-1.5 text-xs"
              />
              <input
                type="text"
                placeholder="內容／負責（例：詩班）"
                value={newItemDetail}
                onChange={(e) => setNewItemDetail(e.target.value)}
                className="flex-1 border border-slate-300 rounded p-1.5 text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> 新增
              </button>
            </div>
          </form>
        )}

        {/* Announcements Section */}
        <div className="mt-8 pt-4 border-t-2 border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-900 font-sans">
              家事分享 ／ 報告事項
            </h4>
          </div>

          <div className="space-y-1.5">
            {service.announcements.map((ann) => (
              <div key={ann.id} className="flex items-start justify-between group">
                <p className="text-[11px] leading-relaxed text-slate-800">
                  &bull; {ann.text}
                </p>
                {isEditing && (
                  <button
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="text-red-500 hover:text-red-700 ml-2 text-[10px] font-sans shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isEditing && (
            <form onSubmit={handleAddAnnouncement} className="mt-3 font-sans text-xs flex gap-2">
              <input
                type="text"
                placeholder="新增報告事項內容..."
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
                className="flex-1 border border-slate-300 rounded p-1 text-xs"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-slate-800 text-white rounded font-semibold text-xs"
              >
                新增
              </button>
            </form>
          )}
        </div>
        </>
        )}

        {activePage === 'hymns' && (
          <div>
            <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
              詩歌全詞
            </h3>
            <TextBlockList
              blocks={service.hymnLyrics}
              isEditing={isEditing}
              onChange={(hymnLyrics) => onUpdateService({ ...service, hymnLyrics })}
              emptyHint="本週尚未輸入詩歌歌詞，可切換至「編輯程序」加入。"
              titlePlaceholder="詩歌名稱"
              metaPlaceholder="（選填）曲／詞／版權"
              bodyPlaceholder="歌詞全文..."
              addButtonLabel="新增詩歌"
            />
          </div>
        )}

        {activePage === 'worship' && (
          <div>
            <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
              崇拜資料
            </h3>
            <TextBlockList
              blocks={service.worshipNotes}
              isEditing={isEditing}
              onChange={(worshipNotes) => onUpdateService({ ...service, worshipNotes })}
              emptyHint="尚未輸入宣召啟應文、信息經文或金句，可切換至「編輯程序」加入。"
              titlePlaceholder="標題（例：宣召啟應文／信息經文／本月金句）"
              metaPlaceholder="（選填）經文出處"
              bodyPlaceholder="內文..."
              addButtonLabel="新增崇拜資料"
            />
          </div>
        )}

        {activePage === 'ministry' && (
          <div>
            <div className="flex items-center justify-center gap-3 mb-6">
              <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 font-sans">
                家事分享
              </h3>
              {service.ministryUpdates.length > 0 && (
                <button
                  onClick={handleExportMinistryPpt}
                  disabled={isExportingPpt}
                  title="匯出為投影片，每頁自動播放 10 秒並循環播放"
                  className="flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-md text-[10px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExportingPpt ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {isExportingPpt ? '匯出中...' : '匯出'}
                </button>
              )}
            </div>
            <TextBlockList
              blocks={service.ministryUpdates}
              isEditing={isEditing}
              onChange={(ministryUpdates) => onUpdateService({ ...service, ministryUpdates })}
              emptyHint="本週尚未輸入家事分享項目，可切換至「編輯程序」加入。"
              titlePlaceholder="項目標題（例：1. 青少年暑期活動）"
              metaPlaceholder="（選填）備註"
              bodyPlaceholder="詳情（日期／時間／地點／對象等）..."
              addButtonLabel="新增家事分享項目"
            />
          </div>
        )}

        {activePage === 'notices' && (
          <div>
            <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
              其他報告
            </h3>
            <TextBlockList
              blocks={service.otherNotices}
              isEditing={isEditing}
              onChange={(otherNotices) => onUpdateService({ ...service, otherNotices })}
              emptyHint="本週尚未輸入其他報告事項，可切換至「編輯程序」加入。"
              titlePlaceholder="項目標題（例：1. 維修基金奉獻）"
              metaPlaceholder="（選填）備註"
              bodyPlaceholder="詳情..."
              addButtonLabel="新增其他報告"
            />
          </div>
        )}

        {activePage === 'prayers' && (
          <div>
            <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
              本週代禱
            </h3>
            <TextBlockList
              blocks={service.weeklyPrayers}
              isEditing={isEditing}
              onChange={(weeklyPrayers) => onUpdateService({ ...service, weeklyPrayers })}
              emptyHint="本週尚未輸入代禱事項，可切換至「編輯程序」加入。"
              titlePlaceholder="編號（例：1.）"
              metaPlaceholder="（選填）備註"
              bodyPlaceholder="代禱內容..."
              addButtonLabel="新增代禱事項"
            />
          </div>
        )}

        {activePage === 'roster' && (
          <div>
            <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
              事奉芳名表
            </h3>
            <RosterTable
              rows={service.serviceRoster}
              isEditing={isEditing}
              onChange={(serviceRoster) => onUpdateService({ ...service, serviceRoster })}
              emptyHint="本週尚未輸入事奉芳名表，可切換至「編輯程序」加入。"
            />
          </div>
        )}

        {activePage === 'attendance' && (
          <div>
            <h3 className="text-center text-base font-bold uppercase tracking-widest text-slate-900 mb-6 font-sans">
              上週聚會出席人數表
            </h3>
            <AttendanceTable
              rows={service.attendance}
              note={service.attendanceNote}
              isEditing={isEditing}
              onChange={(attendance) => onUpdateService({ ...service, attendance })}
              onChangeNote={(attendanceNote) => onUpdateService({ ...service, attendanceNote })}
              emptyHint="本週尚未輸入出席人數，可切換至「編輯程序」加入。"
            />
          </div>
        )}

        {/* Bulletin Footer */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-[9px] text-slate-400 uppercase tracking-widest font-sans">
          由 GraceBulletin AI v2.4 自動生成
        </div>
      </div>
    </div>
  );
};
