import React, { useEffect, useRef, useState } from 'react';
import { ChurchService, ServiceItem, Announcement } from '../types/bulletin';
import { classifyVoiceInput, VoiceClassification } from '../utils/voiceClassifier';
import { Mic, MicOff, Sparkles, Check, X } from 'lucide-react';

interface VoiceOfficerAssistantProps {
  service: ChurchService;
  onUpdateService: (updated: ChurchService) => void;
}

const CATEGORY_LABELS: Record<VoiceClassification['category'], string> = {
  service_item: '程序項目',
  announcement: '家事分享／報告事項（頁 1）',
  sermon_title: '信息題目',
  sermon_scripture: '信息經文',
  ministry_update: '家事分享詳情（頁 4）',
  weekly_prayer: '本週代禱（頁 6）',
};

export const VoiceOfficerAssistant: React.FC<VoiceOfficerAssistantProps> = ({
  service,
  onUpdateService,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [supportsSpeech, setSupportsSpeech] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [suggestion, setSuggestion] = useState<VoiceClassification | null>(null);
  const [editedLabel, setEditedLabel] = useState('');
  const [editedText, setEditedText] = useState('');
  const [justApplied, setJustApplied] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSupportsSpeech(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-HK';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (final) {
        setTranscript(final);
        runClassification(final);
      } else {
        setTranscript(interim);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runClassification = (text: string) => {
    if (!text.trim()) return;
    const result = classifyVoiceInput(text);
    setSuggestion(result);
    setEditedLabel(result.category === 'service_item' ? result.label : '');
    setEditedText(result.text);
    setJustApplied(false);
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setSuggestion(null);
    setJustApplied(false);
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      // already started; ignore
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleApply = () => {
    if (!suggestion) return;

    if (suggestion.category === 'service_item') {
      const newItem: ServiceItem = {
        id: 'voice-' + Date.now(),
        type: 'custom',
        label: editedLabel.trim() || suggestion.label,
        detail: editedText.trim(),
      };
      onUpdateService({ ...service, items: [...service.items, newItem] });
    } else if (suggestion.category === 'announcement') {
      const newAnn: Announcement = { id: 'voice-ann-' + Date.now(), text: editedText.trim() };
      onUpdateService({ ...service, announcements: [...service.announcements, newAnn] });
    } else if (suggestion.category === 'sermon_title') {
      onUpdateService({ ...service, sermonTitle: editedText.trim() });
    } else if (suggestion.category === 'sermon_scripture') {
      onUpdateService({ ...service, scripture: editedText.trim() });
    } else if (suggestion.category === 'ministry_update') {
      onUpdateService({
        ...service,
        ministryUpdates: [
          ...service.ministryUpdates,
          { id: 'voice-mu-' + Date.now(), title: editedLabel.trim() || '家事分享', body: editedText.trim() },
        ],
      });
    } else if (suggestion.category === 'weekly_prayer') {
      onUpdateService({
        ...service,
        weeklyPrayers: [
          ...service.weeklyPrayers,
          { id: 'voice-wp-' + Date.now(), title: editedLabel.trim() || '代禱事項', body: editedText.trim() },
        ],
      });
    }

    setSuggestion(null);
    setTranscript('');
    setJustApplied(true);
  };

  const handleDiscard = () => {
    setSuggestion(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="幹事語音助理：語音輸入並自動分類"
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg flex items-center justify-center transition-colors z-30"
      >
        <Mic className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 overflow-hidden max-h-[calc(100%-3rem)] overflow-y-auto">
      <div className="px-4 py-3 bg-purple-600 text-white flex items-center justify-between">
        <span className="text-xs font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> 幹事語音助理
        </span>
        <button
          onClick={() => {
            setIsOpen(false);
            stopListening();
          }}
          className="text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3 text-xs">
        <p className="text-[10px] text-slate-400 leading-relaxed">
          說出或輸入內容（例：「宣召　詩篇 107:1」），助理會自動判斷應加入的位置，確認後套用。
        </p>

        {!supportsSpeech && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            此瀏覽器不支援語音輸入，請改用文字輸入，或使用 Chrome 瀏覽器。
          </p>
        )}

        <div className="flex items-center gap-2">
          {supportsSpeech && (
            <button
              onClick={isListening ? stopListening : startListening}
              title={isListening ? '停止錄音' : '開始語音輸入'}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="語音內容將顯示在此，或直接輸入文字..."
            rows={2}
            className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          onClick={() => runClassification(transcript)}
          disabled={!transcript.trim()}
          className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" /> 智能分類
        </button>

        {justApplied && (
          <p className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded p-2 flex items-center gap-1.5">
            <Check className="w-3 h-3" /> 已加入程序表，可切換至「檢視程序表」查看。
          </p>
        )}

        {suggestion && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
            <p className="text-[10px] text-purple-800 font-semibold">
              建議分類：{CATEGORY_LABELS[suggestion.category]}
            </p>
            <p className="text-[10px] text-purple-600 leading-relaxed">{suggestion.reason}</p>

            {(suggestion.category === 'service_item' ||
              suggestion.category === 'ministry_update' ||
              suggestion.category === 'weekly_prayer') && (
              <input
                value={editedLabel}
                onChange={(e) => setEditedLabel(e.target.value)}
                placeholder={suggestion.category === 'service_item' ? '項目名稱' : '標題'}
                className="w-full border border-purple-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-purple-500"
              />
            )}
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={2}
              className="w-full border border-purple-200 rounded px-2 py-1 text-xs bg-white resize-none focus:outline-none focus:border-purple-500"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={handleDiscard}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-semibold"
              >
                捨棄
              </button>
              <button
                onClick={handleApply}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> 套用
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
