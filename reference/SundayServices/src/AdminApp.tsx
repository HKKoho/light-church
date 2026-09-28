import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { SidebarLeft } from './components/SidebarLeft';
import { DEFAULT_CHURCH_NAME } from './components/LandingPage';
import { Header } from './components/Header';
import { BulletinPreview } from './components/BulletinPreview';
import { SidebarRight } from './components/SidebarRight';
import { AiOptimizeModal } from './components/AiOptimizeModal';
import { ExportModal } from './components/ExportModal';
import { FinalizeModal } from './components/FinalizeModal';
import { WorkflowStatusBar } from './components/WorkflowStatusBar';
import { VoiceOfficerAssistant } from './components/VoiceOfficerAssistant';

import {
  INITIAL_SERVICES,
  INITIAL_VOLUNTEERS,
  INITIAL_ALERTS,
  INITIAL_RULES,
  INITIAL_TOGGLES,
  HYMN_LIBRARY,
} from './data/initialData';

import {
  ChurchService,
  Volunteer,
  ValidationAlert,
  ConfigurationRules,
  AutomationToggles,
  EditorialRole,
  RosterScheduleEntry,
  SermonPlanEntry,
  HymnLibraryEntry,
} from './types/bulletin';

import { getPublishedServices, publishService, unpublishService } from './utils/publishStore';
import { findLastBulletin, deriveNextBulletin, ensureUpcomingBulletins } from './utils/deriveNextBulletin';
import { useSharedBulletins } from './utils/useSharedBulletins';
import { classifyServiceDate } from './utils/sundayDates';
import { consumePendingBulletinAnalysis } from './utils/bulletinAnalysis';
import { loadSermonPlan, saveSermonPlan, applySermonPlanToService } from './utils/sermonPlan';
import { loadRosterSchedule, saveRosterSchedule, applyRosterScheduleToService } from './utils/rosterSchedule';
import { findDraftsToRebuild, isUntouchedDraft, markDerived, rebuildDrafts, updateKeepingUntouched } from './utils/rebuildDrafts';
import { loadUploadedHymns, saveUploadedHymns, mergeHymnLibraries } from './utils/hymnLibrary';

export default function AdminApp() {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [volunteers, setVolunteers] = useState<Volunteer[]>(INITIAL_VOLUNTEERS);
  const [alerts, setAlerts] = useState<ValidationAlert[]>(INITIAL_ALERTS);
  const [rules, setRules] = useState<ConfigurationRules>(INITIAL_RULES);
  const [toggles, setToggles] = useState<AutomationToggles>(INITIAL_TOGGLES);
  const [currentRole, setCurrentRole] = useState<EditorialRole>('officer');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [leftDrawerOpen, setLeftDrawerOpen] = useState<boolean>(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(false);

  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);

  const [rosterSchedule, setRosterSchedule] = useState<RosterScheduleEntry[]>(() => loadRosterSchedule());
  const [sermonPlan, setSermonPlan] = useState<SermonPlanEntry[]>(() => loadSermonPlan());
  const [uploadedHymns, setUploadedHymns] = useState<HymnLibraryEntry[]>(() => loadUploadedHymns());
  const hymnLibrary = useMemo(() => mergeHymnLibraries(HYMN_LIBRARY, uploadedHymns), [uploadedHymns]);

  // The coming/next Sunday should always have a draft ready to open, even if
  // no one has clicked "+" yet — derive them forward from the latest known
  // bulletin the same way the officer's manual "+" button does. Any
  // newly-derived draft is also pre-filled from the uploaded roster schedule and sermon plan
  // (if any) — existing bulletins are left untouched here so a reload never
  // clobbers a manual edit; re-uploading the schedule is what re-applies it
  // to bulletins that already exist (see handleImportRosterSchedule).
  const withUpcoming = (list: ChurchService[]) => {
    const existing = new Set(list.map((s) => s.id));
    return ensureUpcomingBulletins(list, new Date(), rosterSchedule).map((s) =>
      existing.has(s.id) ? s : markDerived(applySermonPlanToService(s, sermonPlan))
    );
  };

  // A bulletin AI just read from an uploaded PDF. Drafts already made for
  // later Sundays were derived from an older bulletin; the alert offers to
  // rebuild them from the newly imported one (handleRebuildDrafts).
  const handleImported = (imported: ChurchService[], current: ChurchService[]) => {
    const newest = findLastBulletin(imported);
    const titles = imported.map((s) => `「${s.title}」`).join('、');
    const rebuild = findDraftsToRebuild([...current, ...imported], newest.id);
    const canRebuild = rebuild?.base.id === newest.id;
    setAlerts((prev) => [
      {
        id: 'ai-import-' + Date.now(),
        type: 'info',
        title: 'AI 已從上載週刊建立程序表',
        message:
          `已匯入 ${titles}。` +
          (canRebuild
            ? `之後的 ${rebuild.drafts.map((s) => `「${s.title}」`).join('、')} 是以較舊的週刊建立的草稿。`
            : ''),
        ...(canRebuild
          ? { actionType: 'rebuild_drafts' as const, actionText: '以新匯入的週刊重新建立', bulletinId: newest.id }
          : {}),
      },
      ...prev,
    ]);
  };

  const {
    services,
    setServices,
    mode: storeMode,
    pendingImports,
    failedImports,
    saveError,
    archive: archiveBulletin,
    importPdfs,
  } = useSharedBulletins(INITIAL_SERVICES, withUpcoming, handleImported);

  // Open on this Sunday's bulletin (or the latest) whenever the selection is
  // missing — first load, or after the selected one was archived.
  useEffect(() => {
    if (services.length === 0 || services.some((s) => s.id === selectedServiceId)) return;
    const coming = services.find((s) => classifyServiceDate(s.date) === 'coming');
    setSelectedServiceId((coming ?? findLastBulletin(services)).id);
  }, [services, selectedServiceId]);

  const activeService =
    services.find((s) => s.id === selectedServiceId) || services[0];

  // The congregation page shows only what staff have published through
  // Finalize & Send. Earlier versions seeded it with the built-in sample; take
  // that back out of browsers that still have it.
  useEffect(() => {
    const sampleIds = new Set(INITIAL_SERVICES.map((s) => s.id));
    getPublishedServices()
      .filter((s) => sampleIds.has(s.id))
      .forEach((s) => unpublishService(s.id));
  }, []);

  // Surface the Gemini analysis of the officer's just-uploaded past bulletins
  // (produced on the landing page) as a one-time alert, then clear it so it
  // doesn't reappear on later visits.
  useEffect(() => {
    const analysis = consumePendingBulletinAnalysis();
    if (!analysis) return;

    const messageParts = [analysis.formatSummary].filter(Boolean);
    if (analysis.suggestions.length > 0) {
      messageParts.push(`建議：${analysis.suggestions.join('；')}`);
    }

    setAlerts((prev) => [
      {
        id: 'ai-format-' + Date.now(),
        type: 'info',
        title: `AI 已分析「${analysis.churchName}」過去週刊格式`,
        message: messageParts.join(' ') || '系統已分析過去週刊，暫無額外建議。',
      },
      ...prev,
    ]);
  }, []);

  const handleUpdateActiveService = (updated: ChurchService) => {
    setServices((prev) =>
      prev.map((serv) => (serv.id === updated.id ? updated : serv))
    );
  };

  // Explicit re-upload of the schedule is the one moment it's expected to
  // overwrite already-existing bulletins' rosters — the officer just fed in
  // the new source of truth and wants it applied now.
  const handleImportRosterSchedule = (entries: RosterScheduleEntry[]) => {
    setRosterSchedule(entries);
    saveRosterSchedule(entries);
    setServices((prev) =>
      prev.map((s) => updateKeepingUntouched(s, (x) => applyRosterScheduleToService(x, entries)))
    );
  };

  // Like the roster schedule, an explicit upload re-applies the plan to
  // bulletins that already exist.
  const handleImportSermonPlan = (entries: SermonPlanEntry[]) => {
    setSermonPlan(entries);
    saveSermonPlan(entries);
    setServices((prev) =>
      prev.map((s) => updateKeepingUntouched(s, (x) => applySermonPlanToService(x, entries)))
    );
  };

  const handleImportWorshipSongs = (entries: HymnLibraryEntry[]) => {
    setUploadedHymns((prev) => {
      const merged = mergeHymnLibraries(prev, entries);
      saveUploadedHymns(merged);
      return merged;
    });
  };

  const handleRestoreBackup = (service: ChurchService) => {
    setServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.map((s) => (s.id === service.id ? service : s))
        : [...prev, service]
    );
    setSelectedServiceId(service.id);
  };

  // Same church name the landing page archives uploads under.
  const handleImportPastBulletins = (files: File[]) => {
    let churchName: string | null = null;
    try {
      churchName = localStorage.getItem('churchName');
    } catch {
      // localStorage unavailable; fall back to the default name.
    }
    return importPdfs(churchName || DEFAULT_CHURCH_NAME, files);
  };

  const handleAddNewService = () => {
    // Always start a new bulletin from the last one, one week forward, with
    // its roster/content carried over and ready for edit — never a blank
    // or hardcoded template.
    const lastBulletin = findLastBulletin(services);
    const draft = applySermonPlanToService(
      applyRosterScheduleToService(deriveNextBulletin(lastBulletin), rosterSchedule),
      sermonPlan
    );

    const titlePrompt = prompt('請確認新崇拜場次名稱：', draft.title);
    if (!titlePrompt) return;

    const newService: ChurchService = markDerived({ ...draft, title: titlePrompt });

    setServices((prev) => [...prev, newService]);
    setSelectedServiceId(newService.id);
  };

  const handleArchiveService = async () => {
    if (!activeService || services.length <= 1) return;
    const ok = window.confirm(
      `確定存檔「${activeService.title}」？\n\n存檔後不會再在此顯示，但仍保留在系統資料庫中。` +
        '如存檔的是本主日或下主日的程序表，系統會以餘下最新的一份自動重新建立。'
    );
    if (!ok) return;
    try {
      await archiveBulletin(activeService.id);
      setSelectedServiceId('');
    } catch (err) {
      setAlerts((prev) => [
        {
          id: 'archive-failed-' + Date.now(),
          type: 'warning',
          title: '未能存檔',
          message: err instanceof Error ? err.message : String(err),
        },
        ...prev,
      ]);
    }
  };

  const handleRefreshSchedule = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);

      // Evaluate logic rules
      const hasOverworked = volunteers.some((v) => v.consecutiveWeeks >= 3);
      if (hasOverworked) {
        setAlerts((prev) => {
          if (prev.some((a) => a.actionType === 'shuffle_roster')) return prev;
          return [
            {
              id: 'alt-' + Date.now(),
              type: 'warning',
              title: '事奉輪替提示',
              message: '偵測到事奉負荷不均：有 1 位同工已連續事奉超過 3 週。',
              actionText: '調配事奉表',
              actionType: 'shuffle_roster',
            },
            ...prev,
          ];
        });
      }
    }, 700);
  };

  const handleShuffleRoster = () => {
    // Reset consecutive weeks & shuffle roster order
    setVolunteers((prev) =>
      prev.map((v) => ({
        ...v,
        consecutiveWeeks: Math.max(1, v.consecutiveWeeks - 2),
      }))
    );

    // Remove warning alert & add positive alert
    setAlerts((prev) => [
      {
        id: 'alt-shuffled-' + Date.now(),
        type: 'info',
        title: '事奉表已調配',
        message: '同工事奉排程已輪替，緩衝時間已延長至 15 分鐘。',
      },
      ...prev.filter((a) => a.actionType !== 'shuffle_roster'),
    ]);
  };

  const handleUpdateHymnLogic = () => {
    // Update active service hymn with optimal theological match
    const updatedItems = activeService.items.map((item) => {
      if (item.type === 'hymn') {
        return {
          ...item,
          detail: '奇異恩典',
          hymnNumber: '109',
        };
      }
      return item;
    });

    handleUpdateActiveService({
      ...activeService,
      items: updatedItems,
    });

    setAlerts((prev) => prev.filter((a) => a.actionType !== 'update_hymn'));
  };

  // Drafts nobody has edited are rebuilt straight away; edited ones only if
  // the officer agrees to lose their changes.
  const handleRebuildDrafts = (alert: ValidationAlert) => {
    const found = alert.bulletinId ? findDraftsToRebuild(services, alert.bulletinId) : null;
    let message: string;
    if (!found || found.base.id !== alert.bulletinId) {
      message = found
        ? `已有較新的「${found.base.title}」，草稿會以它為基礎，毋須重新建立。`
        : '沒有需要重新建立的草稿。';
    } else {
      const edited = found.drafts.filter((d) => !isUntouchedDraft(d));
      const overwrite =
        edited.length > 0 &&
        window.confirm(
          `${edited.map((d) => `「${d.title}」`).join('、')} 已有修改。\n\n` +
            '按「確定」一併重新建立（會覆蓋這些修改）；按「取消」只重新建立未修改的草稿。'
        );
      const drafts = overwrite ? found.drafts : found.drafts.filter(isUntouchedDraft);
      setServices((prev) => rebuildDrafts(prev, found.base, drafts, rosterSchedule, sermonPlan));
      const kept = found.drafts.length - drafts.length;
      message =
        (drafts.length > 0
          ? `已以「${found.base.title}」重新建立 ${drafts.map((d) => `「${d.title}」`).join('、')}。`
          : '') + (kept > 0 ? `已保留 ${kept} 份已修改的草稿。` : '');
    }
    setAlerts((prev) => [
      { id: 'rebuild-' + Date.now(), type: 'info', title: '重新建立草稿', message },
      ...prev.filter((a) => a.id !== alert.id),
    ]);
  };

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddVolunteer = (newVol: Volunteer) => {
    setVolunteers((prev) => [...prev, newVol]);
  };

  const handleToggleVolunteerAvailability = (id: string) => {
    setVolunteers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, available: !v.available } : v))
    );
  };

  const handleApplyHymn = (hymnNumber: string, title: string) => {
    const updatedItems = activeService.items.map((item) => {
      if (item.type === 'hymn') {
        return { ...item, detail: title, hymnNumber };
      }
      return item;
    });

    handleUpdateActiveService({
      ...activeService,
      items: updatedItems,
    });
  };

  const handleAddGeneratedAnnouncement = (text: string) => {
    handleUpdateActiveService({
      ...activeService,
      announcements: [
        ...activeService.announcements,
        { id: 'ann-ai-' + Date.now(), text },
      ],
    });
  };

  const handleConfirmFinalize = (opts: { sendToCongregation: boolean }) => {
    // Status is already 'finalized' by this point (set via deacon approval below);
    // this step only handles distribution to staff / the congregation page.
    if (opts.sendToCongregation) {
      publishService(activeService);
    }
  };

  const handleSubmitForReview = () => {
    handleUpdateActiveService({ ...activeService, status: 'pastor_review' });
    setAlerts((prev) => [
      {
        id: 'wf-' + Date.now(),
        type: 'info',
        title: '已提交審閱',
        message: `「${activeService.title}」已提交予幹事審閱。`,
      },
      ...prev,
    ]);
  };

  const handleWorkflowApprove = () => {
    if (activeService.status === 'pastor_review' && currentRole === 'pastor') {
      handleUpdateActiveService({ ...activeService, status: 'deacon_review' });
      setAlerts((prev) => [
        {
          id: 'wf-' + Date.now(),
          type: 'info',
          title: '幹事已審閱通過',
          message: `「${activeService.title}」已轉交主任牧師／傳道作最後複核。`,
        },
        ...prev,
      ]);
    } else if (activeService.status === 'deacon_review' && currentRole === 'deacon') {
      handleUpdateActiveService({ ...activeService, status: 'finalized' });
      setAlerts((prev) => [
        {
          id: 'wf-' + Date.now(),
          type: 'info',
          title: '主任牧師／傳道已複核定稿',
          message: `「${activeService.title}」已完成審批，可以發送。`,
        },
        ...prev,
      ]);
    }
  };

  const handleWorkflowReject = () => {
    const reason = (prompt('請輸入退回原因（可留空）：') || '').trim();
    const stageLabel = activeService.status === 'pastor_review' ? '幹事' : '主任牧師／傳道';
    handleUpdateActiveService({ ...activeService, status: 'draft' });
    setAlerts((prev) => [
      {
        id: 'wf-' + Date.now(),
        type: 'warning',
        title: '已退回重編',
        message: reason
          ? `${stageLabel}退回重編：${reason}`
          : `${stageLabel}已將程序表退回，請助理重新編輯後再提交審閱。`,
      },
      ...prev,
    ]);
  };

  if (!activeService) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100 text-slate-600 text-sm">
        {storeMode === 'loading'
          ? '正在載入程序表…'
          : `AI 正在讀取上載的週刊（尚餘 ${pendingImports} 份），完成後會以最新一份建立本主日程序表…`}
      </div>
    );
  }

  return (
    <div className="admin-shell flex h-screen w-screen bg-slate-100 text-slate-900 overflow-hidden">
      {/* Left Operations & Rules Sidebar */}
      <SidebarLeft
        toggles={toggles}
        setToggles={setToggles}
        rules={rules}
        setRules={setRules}
        onRefreshSchedule={handleRefreshSchedule}
        isRefreshing={isRefreshing}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        isOpen={leftDrawerOpen}
        onClose={() => setLeftDrawerOpen(false)}
        activeService={activeService}
        onImportRosterSchedule={handleImportRosterSchedule}
        onImportWorshipSongs={handleImportWorshipSongs}
        sermonPlan={sermonPlan}
        onImportSermonPlan={handleImportSermonPlan}
        onRestoreBackup={handleRestoreBackup}
        onImportPastBulletins={handleImportPastBulletins}
      />

      {/* Center Main Stage */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
        <Header
          services={services}
          selectedServiceId={selectedServiceId}
          onSelectService={setSelectedServiceId}
          onAddNewService={handleAddNewService}
          onArchiveService={handleArchiveService}
          onExportPDF={() => setShowExportModal(true)}
          onFinalizeAndSend={() => setShowFinalizeModal(true)}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onToggleLeftDrawer={() => setLeftDrawerOpen((v) => !v)}
          onToggleRightDrawer={() => setRightDrawerOpen((v) => !v)}
          alertCount={alerts.length}
        />

        {failedImports.length > 0 && (
          <div
            className="px-4 py-1.5 text-xs border-b bg-red-50 text-red-800 border-red-200"
            title={failedImports.map((f) => `${f.fileName}：${f.reason}`).join('\n')}
          >
            {`AI 未能讀取 ${failedImports.map((f) => `「${f.fileName}」`).join('、')}，` +
              '請在左側「上載過往週刊（AI 讀取）」再上載一次重試。'}
          </div>
        )}

        {(pendingImports > 0 || saveError) && (
          <div
            className={`px-4 py-1.5 text-xs border-b ${
              saveError ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {saveError
              ? `程序表未能儲存到系統（${saveError}），請稍後再試或下載備份。`
              : `AI 正在讀取上載的週刊（尚餘 ${pendingImports} 份），完成後會加入程序表清單。`}
          </div>
        )}

        <BulletinPreview
          service={activeService}
          onUpdateService={handleUpdateActiveService}
          isEditing={isEditing}
          onOpenAiAssist={() => setShowAiModal(true)}
          currentRole={currentRole}
          onSubmitForReview={handleSubmitForReview}
          onWorkflowApprove={handleWorkflowApprove}
          onWorkflowReject={handleWorkflowReject}
        />

        {/* Floating action buttons, stacked directly above the voice-assistant mic */}
        <button
          onClick={() => window.open('#/congregation', '_blank')}
          title="在新分頁開啟會眾版程序表"
          className="absolute bottom-[168px] right-6 w-12 h-12 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-lg flex items-center justify-center transition-colors z-30"
        >
          <ExternalLink className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowAiModal(true)}
          title="AI 智能優化"
          className="absolute bottom-24 right-6 w-12 h-12 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 shadow-lg flex items-center justify-center transition-colors z-30"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
        </button>

        {currentRole === 'officer' && (
          <VoiceOfficerAssistant
            service={activeService}
            onUpdateService={handleUpdateActiveService}
          />
        )}
      </main>

      {/* Right Validation & Staff Roster Sidebar */}
      <SidebarRight
        alerts={alerts}
        volunteers={volunteers}
        onShuffleRoster={handleShuffleRoster}
        onUpdateHymnLogic={handleUpdateHymnLogic}
        onRebuildDrafts={handleRebuildDrafts}
        onDismissAlert={handleDismissAlert}
        onAddVolunteer={handleAddVolunteer}
        onToggleVolunteerAvailability={handleToggleVolunteerAvailability}
        isOpen={rightDrawerOpen}
        onClose={() => setRightDrawerOpen(false)}
      />

      {/* Modals */}
      <AiOptimizeModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        service={activeService}
        hymnLibrary={hymnLibrary}
        onApplyHymn={handleApplyHymn}
        onAddGeneratedAnnouncement={handleAddGeneratedAnnouncement}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        service={activeService}
      />

      <FinalizeModal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        service={activeService}
        volunteers={volunteers}
        onConfirmFinalize={handleConfirmFinalize}
      />
    </div>
  );
}
