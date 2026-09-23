import React, { useState } from 'react';
import { ChurchService, Volunteer } from '../types/bulletin';
import { Send, CheckCircle2, Mail, Users, Bell } from 'lucide-react';

interface FinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ChurchService;
  volunteers: Volunteer[];
  onConfirmFinalize: (opts: { sendToCongregation: boolean; sendToStaff: boolean }) => void;
}

export const FinalizeModal: React.FC<FinalizeModalProps> = ({
  isOpen,
  onClose,
  service,
  volunteers,
  onConfirmFinalize,
}) => {
  const [sendToStaff, setSendToStaff] = useState(true);
  const [sendToCongregation, setSendToCongregation] = useState(true);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    setSentSuccess(true);
    setTimeout(() => {
      onConfirmFinalize({ sendToCongregation, sendToStaff });
      setSentSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            定稿並發送崇拜程序
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold">
            ✕
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-slate-900">程序表已定稿並發送！</h4>
            <p className="text-xs text-slate-500">
              已發送至事奉人員名冊及會眾郵寄名單。
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">{service.title}</span>
              <span className="text-slate-500 block">
                {service.items.length} 項崇拜程序 &bull; {service.announcements.length}{' '}
                項報告事項
              </span>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">發送對象：</label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">已委派事奉人員</span>
                    <span className="text-[10px] text-slate-500">
                      發送崇拜程序給 {volunteers.length} 位名冊成員
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendToStaff}
                  onChange={(e) => setSendToStaff(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">會眾電子通訊</span>
                    <span className="text-[10px] text-slate-500">
                      將每週程序摘要發佈至會眾電郵名單
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendToCongregation}
                  onChange={(e) => setSendToCongregation(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> 確認並發送
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
