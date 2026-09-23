import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getModuleById, createModule, updateModule, getAllCycles } from '../../../services/moduleService';
import { ModuleInput, PerspectiveType, Cycle, ModuleStatus } from '../../../types';
import DynamicList from '../../components/admin/DynamicList';
import LifeQuestionEditor from '../../components/admin/LifeQuestionEditor';
import RichTextEditor from '../../components/admin/RichTextEditor';
import PerspectiveEditor from '../../components/admin/PerspectiveEditor';
import ScripturePainPointEditor from '../../components/admin/ScripturePainPointEditor';
import { supabase } from '../../../services/supabaseClient';
import { ScripturePainPointDocument } from '../../../types';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import MichaelContentHelper from '../../components/admin/MichaelContentHelper';
import { useToast } from '../../components/admin/Toast';
import { ContentStepType } from '../../../services/openaiService';

const BibleBookEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [tensionItems, setTensionItems] = useState<Array<{
    text: string;
    documents?: ScripturePainPointDocument[];
    pendingFiles?: File[];
    removeDocumentIds?: string[];
  }>>([]);
  const [uploadingDoc, setUploadingDoc] = useState<{ index: number; fileIndex: number } | null>(null);

  // Form data
  const [formData, setFormData] = useState<ModuleInput>({
    cycleId: 1,
    title: '',
    subtitle: '',
    lifeQuestions: [],
    perspectives: {
      [PerspectiveType.ORDER]: { book: '箴言', theme: '', description: '' },
      [PerspectiveType.VANITY]: { book: '傳道書', theme: '', description: '' },
      [PerspectiveType.COLLAPSE]: { book: '約伯記', theme: '', description: '' }
    },
    tensionGuides: [],
    discussionPrompts: [],
    summary: '',
    status: 'draft'
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const cyclesData = await getAllCycles();
      setCycles(cyclesData);

      if (!isNew && id) {
        const moduleData = await getModuleById(Number(id));
        if (moduleData) {
          // Transform LifeQuestion[] to LifeQuestionInput[]
          const lifeQuestions = moduleData.lifeQuestions.map(q => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options,
            mediaUrl: q.mediaUrl,
            youtubeUrl: q.youtubeUrl
          }));

          setFormData({
            cycleId: moduleData.cycleId,
            title: moduleData.title,
            subtitle: moduleData.subtitle,
            lifeQuestions: lifeQuestions,
            perspectives: moduleData.perspectives,
            tensionGuides: moduleData.tensionGuides || [],
            discussionPrompts: moduleData.discussionPrompts,
            summary: moduleData.summary,
            status: moduleData.status
          });

          // Set tension items with documents
          const tensionDocs = moduleData.tensionDocuments || [];
          const items = (moduleData.tensionGuides || []).map((text, idx) => ({
            text,
            documents: tensionDocs[idx] || []
          }));
          setTensionItems(items);
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      showToast('載入資料失敗', 'error');
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  };

  // Handle tension items change - sync with formData.tensionGuides
  const handleTensionItemsChange = (items: typeof tensionItems) => {
    setTensionItems(items);
    // Sync text to formData.tensionGuides
    setFormData(prev => ({
      ...prev,
      tensionGuides: items.map(item => item.text)
    }));
  };

  // Upload document for tension guide
  const handleUploadDocument = async (index: number, file: File): Promise<ScripturePainPointDocument> => {
    if (!id || isNew) {
      throw new Error('請先儲存月課後再上傳文檔');
    }

    const moduleId = Number(id);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const fileType = fileExt === 'pdf' ? 'pdf' : fileExt === 'docx' ? 'docx' : 'doc';
    // Use timestamp + random string for storage path (avoid non-ASCII characters in path)
    const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const storagePath = `${moduleId}/${index}/${safeFileName}`;

    setUploadingDoc({ index, fileIndex: 0 });

    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('scripture-documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('scripture-documents')
        .getPublicUrl(storagePath);

      // Insert record in database
      const { data: docRecord, error: dbError } = await supabase
        .from('scripture_pain_point_documents')
        .insert({
          module_id: moduleId,
          pain_point_index: index,
          file_name: file.name,
          file_type: fileType,
          storage_path: storagePath,
          file_size_bytes: file.size
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        id: docRecord.id,
        moduleId: docRecord.module_id,
        painPointIndex: docRecord.pain_point_index,
        fileName: docRecord.file_name,
        fileType: docRecord.file_type,
        storagePath: docRecord.storage_path,
        fileSizeBytes: docRecord.file_size_bytes,
        publicUrl,
        createdAt: docRecord.created_at
      };
    } finally {
      setUploadingDoc(null);
    }
  };

  // Delete document
  const handleDeleteDocument = async (documentId: string): Promise<void> => {
    // Get document info first
    const { data: doc, error: fetchError } = await supabase
      .from('scripture_pain_point_documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (doc?.storage_path) {
      await supabase.storage
        .from('scripture-documents')
        .remove([doc.storage_path]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('scripture_pain_point_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) throw deleteError;
  };

  // Auto-save effect (only for existing modules, not new ones)
  useEffect(() => {
    // Don't auto-save for new modules or invalid IDs
    if (isNew || !initialLoadComplete || !id || isNaN(Number(id))) return;

    // IMPORTANT: Don't start auto-save timer if we're currently saving
    // This prevents race conditions when user manually saves
    if (saving) return;

    const autoSaveTimer = setTimeout(async () => {
      // Only auto-save if there's content and we're not already saving
      if (saving || autoSaving) return;
      if (!formData.title.trim() && !formData.subtitle.trim()) return;

      // Additional safety check: don't auto-save for new modules or invalid IDs
      if (isNew || !id || id === 'new' || isNaN(Number(id))) return;

      setAutoSaving(true);
      try {
        await updateModule(Number(id), formData);
        setLastSaved(new Date());
      } catch (err) {
        console.error('Auto-save failed:', err);
        // Don't show error toast for auto-save failures to avoid interrupting user
      } finally {
        setAutoSaving(false);
      }
    }, 10000); // Auto-save 10 seconds after last change (increased to reduce conflicts)

    return () => clearTimeout(autoSaveTimer);
  }, [formData, isNew, id, saving, autoSaving, initialLoadComplete]);

  const handleSave = async (newStatus?: ModuleStatus) => {
    // Validation
    if (!formData.title.trim()) {
      showToast('請輸入月課標題', 'warning');
      setActiveTab(0);
      return;
    }
    if (!formData.subtitle.trim()) {
      showToast('請輸入副標題', 'warning');
      setActiveTab(0);
      return;
    }
    if (formData.lifeQuestions.length === 0 || formData.lifeQuestions.some(q => !q.questionText.trim())) {
      showToast('請至少新增一個完整的經卷提問', 'warning');
      setActiveTab(2);
      return;
    }
    // Validate multi-choice questions have at least 2 options
    const invalidMultiChoice = formData.lifeQuestions.find(
      q => q.questionType === 'multi_choice' && (!q.options || q.options.length < 2 || q.options.some(o => !o.trim()))
    );
    if (invalidMultiChoice) {
      showToast('多選題至少需要兩個非空白選項', 'warning');
      setActiveTab(2);
      return;
    }

    setSaving(true);
    try {
      const statusToSave = newStatus || formData.status;
      const dataToSave = {
        ...formData,
        status: statusToSave
      };

      // Defensive check: treat as new if id is 'new', undefined, or invalid
      const isCreatingNew = !id || id === 'new' || isNaN(Number(id));

      if (isCreatingNew) {
        await createModule(dataToSave);
        showToast('月課建立成功！', 'success');
      } else {
        await updateModule(Number(id), dataToSave);
        showToast('月課更新成功！', 'success');
      }

      // Update form data to match what was saved, preventing auto-save conflicts
      setFormData(prev => ({ ...prev, status: statusToSave }));

      navigate('/admin/modules');
    } catch (err) {
      console.error('Failed to save module:', err);
      showToast('儲存失敗，請稍後再試', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    navigate('/admin/modules');
  };

  const tabs = [
    { label: '基本資訊', icon: '📝' },
    { label: '書卷', icon: '📖' },
    { label: '經卷提問', icon: '❓' },
    { label: '經文痛點', icon: '⚖️' },
    { label: '互動討論', icon: '💬' },
    { label: '安靜整合', icon: '✨' }
  ];

  // Map tab index to ContentStepType for Michael helper
  const tabToStepType: ContentStepType[] = [
    'basic_info',
    'perspectives',
    'life_questions',
    'tension_guides',
    'discussion',
    'summary'
  ];

  // Build module context for Michael helper
  const moduleContext = {
    title: formData.title,
    subtitle: formData.subtitle,
    perspectives: formData.perspectives,
    lifeQuestions: formData.lifeQuestions,
    tensionGuides: formData.tensionGuides,
    discussionPrompts: formData.discussionPrompts,
    summary: formData.summary,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {isNew ? '建立新月課' : '編輯月課'}
          </h1>
          {!isNew && (
            <p className="text-sm text-slate-500 mt-1">
              {autoSaving ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  儲存中...
                </span>
              ) : lastSaved ? (
                `上次儲存：${lastSaved.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`
              ) : (
                '未儲存'
              )}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存草稿'}
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {saving ? '發布中...' : '發布月課'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-4 px-6" aria-label="Tabs">
            {tabs.map((tab, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === index
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Michael Helper - Floating Button */}
          <div className="flex justify-end mb-4">
            <MichaelContentHelper
              stepType={tabToStepType[activeTab]}
              moduleContext={moduleContext}
            />
          </div>

          {/* Tab 0: Basic Info */}
          {activeTab === 0 && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  所屬循環 *
                </label>
                <select
                  value={formData.cycleId}
                  onChange={(e) => setFormData({ ...formData, cycleId: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  月課標題 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例：第 1 課｜什麼是智慧？"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  副標題 *
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="例：敬畏、失效與苦難中的尋求"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  狀態
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ModuleStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="draft">草稿</option>
                  <option value="published">已發布</option>
                  <option value="archived">已封存</option>
                </select>
              </div>
            </div>
          )}

          {/* Tab 1: Perspectives (書卷) */}
          {activeTab === 1 && (
            <PerspectiveEditor
              perspectives={formData.perspectives}
              onChange={(perspectives) => setFormData({ ...formData, perspectives })}
              moduleTitle={formData.title}
            />
          )}

          {/* Tab 2: Life Questions (經卷提問) */}
          {activeTab === 2 && (
            <div className="max-w-4xl">
              <LifeQuestionEditor
                questions={formData.lifeQuestions}
                onChange={(items) => setFormData({ ...formData, lifeQuestions: items })}
                label="經卷提問列表 *"
                emptyMessage="尚無經卷提問。這些問題會讓學員反思自己的生活經驗。"
              />
            </div>
          )}

          {/* Tab 3: Tension Guide (經文痛點) */}
          {activeTab === 3 && (
            <div className="max-w-4xl">
              <ScripturePainPointEditor
                items={tensionItems}
                onChange={handleTensionItemsChange}
                moduleId={isNew ? undefined : Number(id)}
                onUpload={handleUploadDocument}
                onDeleteDocument={handleDeleteDocument}
                label="經文痛點列表"
                placeholder="解釋如何整合三個不同的觀點，幫助學員理解其中的張力..."
                emptyMessage="尚無經文痛點。這部分幫助學員理解不同觀點之間的張力，並學習如何在生活中應用智慧。"
                rows={8}
                addButtonLabel="新增經文痛點"
                uploading={uploadingDoc}
              />
              {isNew && (
                <p className="mt-2 text-sm text-amber-600">
                  提示：請先儲存月課後再上傳文檔附件
                </p>
              )}
            </div>
          )}

          {/* Tab 4: Discussion (互動討論) */}
          {activeTab === 4 && (
            <div className="max-w-4xl">
              <DynamicList
                items={formData.discussionPrompts}
                onChange={(items) => setFormData({ ...formData, discussionPrompts: items })}
                placeholder="輸入互動討論問題..."
                label="互動討論列表"
                emptyMessage="尚無互動討論問題。這些問題將引導小組討論。"
              />
            </div>
          )}

          {/* Tab 5: Summary (安靜整合) */}
          {activeTab === 5 && (
            <div className="max-w-2xl">
              <RichTextEditor
                value={formData.summary}
                onChange={(value) => setFormData({ ...formData, summary: value })}
                label="安靜整合"
                placeholder="用一句話總結本月課的核心洞見..."
                rows={4}
                helpText="簡潔地概括這個月課的主要收穫，幫助學員安靜反思。"
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between bg-white rounded-lg shadow p-4">
        <button
          onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
          disabled={activeTab === 0}
          className="flex items-center px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          上一步
        </button>
        <button
          onClick={() => setActiveTab(Math.min(tabs.length - 1, activeTab + 1))}
          disabled={activeTab === tabs.length - 1}
          className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          下一步
          <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        title="確認取消"
        message="確定要取消嗎？未儲存的變更將會遺失。"
        confirmLabel="確定取消"
        cancelLabel="繼續編輯"
        type="warning"
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
    </div>
  );
};

export default BibleBookEditor;
