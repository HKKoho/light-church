import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { SidebarLeft } from './components/SidebarLeft';
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
  TextBlock,
  RosterRow,
  RosterScheduleEntry,
  HymnLibraryEntry,
} from './types/bulletin';

import { getPublishedServices, publishService } from './utils/publishStore';
import { findLastBulletin, deriveNextBulletin, ensureUpcomingBulletins } from './utils/deriveNextBulletin';
import { consumePendingBulletinAnalysis } from './utils/bulletinAnalysis';
import { loadRosterSchedule, saveRosterSchedule, applyRosterScheduleToServices, applyRosterScheduleToService } from './utils/rosterSchedule';
import { loadUploadedHymns, saveUploadedHymns, mergeHymnLibraries } from './utils/hymnLibrary';

export default function AdminApp() {
  const [services, setServices] = useState<ChurchService[]>(INITIAL_SERVICES);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('service-1');
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
  const [uploadedHymns, setUploadedHymns] = useState<HymnLibraryEntry[]>(() => loadUploadedHymns());
  const hymnLibrary = useMemo(() => mergeHymnLibraries(HYMN_LIBRARY, uploadedHymns), [uploadedHymns]);

  const activeService =
    services.find((s) => s.id === selectedServiceId) || services[0];

  // Seed the congregation-facing publish store with this week's bulletin on first run,
  // so the congregation page isn't empty before staff ever open Finalize & Send.
  useEffect(() => {
    if (getPublishedServices().length === 0) {
      publishService(INITIAL_SERVICES[0]);
    }
  }, []);

  // The coming/next Sunday should always have a draft ready to open, even if
  // no one has clicked "+" yet — derive them forward from the latest known
  // bulletin the same way the officer's manual "+" button does. Any
  // newly-derived draft is also pre-filled from the uploaded roster schedule
  // (if any) — existing bulletins are left untouched here so a reload never
  // clobbers a manual edit; re-uploading the schedule is what re-applies it
  // to bulletins that already exist (see handleImportRosterSchedule).
  useEffect(() => {
    setServices((prev) => ensureUpcomingBulletins(prev, new Date(), rosterSchedule));
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

  const handleImportExcelToActiveService = (data: { hymnLyrics: TextBlock[]; serviceRoster: RosterRow[] }) => {
    handleUpdateActiveService({
      ...activeService,
      hymnLyrics: data.hymnLyrics.length > 0 ? data.hymnLyrics : activeService.hymnLyrics,
      serviceRoster: data.serviceRoster.length > 0 ? data.serviceRoster : activeService.serviceRoster,
    });
  };

  // Explicit re-upload of the schedule is the one moment it's expected to
  // overwrite already-existing bulletins' rosters — the officer just fed in
  // the new source of truth and wants it applied now.
  const handleImportRosterSchedule = (entries: RosterScheduleEntry[]) => {
    setRosterSchedule(entries);
    saveRosterSchedule(entries);
    setServices((prev) => applyRosterScheduleToServices(prev, entries));
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

  const handleAddNewService = () => {
    // Always start a new bulletin from the last one, one week forward, with
    // its roster/content carried over and ready for edit — never a blank
    // or hardcoded template.
    const lastBulletin = findLastBulletin(services);
    const draft = applyRosterScheduleToService(deriveNextBulletin(lastBulletin), rosterSchedule);

    const titlePrompt = prompt('請確認新崇拜場次名稱：', draft.title);
    if (!titlePrompt) return;

    const newService: ChurchService = { ...draft, title: titlePrompt };

    setServices((prev) => [...prev, newService]);
    setSelectedServiceId(newService.id);
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
        message: `「${activeService.title}」已提交予牧師／傳道審閱。`,
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
          title: '牧師已審閱通過',
          message: `「${activeService.title}」已轉交執事作最後複核。`,
        },
        ...prev,
      ]);
    } else if (activeService.status === 'deacon_review' && currentRole === 'deacon') {
      handleUpdateActiveService({ ...activeService, status: 'finalized' });
      setAlerts((prev) => [
        {
          id: 'wf-' + Date.now(),
          type: 'info',
          title: '執事已複核定稿',
          message: `「${activeService.title}」已完成審批，可以發送。`,
        },
        ...prev,
      ]);
    }
  };

  const handleWorkflowReject = () => {
    const reason = (prompt('請輸入退回原因（可留空）：') || '').trim();
    const stageLabel = activeService.status === 'pastor_review' ? '牧師／傳道' : '執事';
    handleUpdateActiveService({ ...activeService, status: 'draft' });
    setAlerts((prev) => [
      {
        id: 'wf-' + Date.now(),
        type: 'warning',
        title: '已退回重編',
        message: reason
          ? `${stageLabel}退回重編：${reason}`
          : `${stageLabel}已將程序表退回，請幹事重新編輯後再提交審閱。`,
      },
      ...prev,
    ]);
  };

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
        onImportExcel={handleImportExcelToActiveService}
        onImportRosterSchedule={handleImportRosterSchedule}
        onImportWorshipSongs={handleImportWorshipSongs}
        onRestoreBackup={handleRestoreBackup}
      />

      {/* Center Main Stage */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
        <Header
          services={services}
          selectedServiceId={selectedServiceId}
          onSelectService={setSelectedServiceId}
          onAddNewService={handleAddNewService}
          onExportPDF={() => setShowExportModal(true)}
          onFinalizeAndSend={() => setShowFinalizeModal(true)}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onToggleLeftDrawer={() => setLeftDrawerOpen((v) => !v)}
          onToggleRightDrawer={() => setRightDrawerOpen((v) => !v)}
          alertCount={alerts.length}
        />

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
