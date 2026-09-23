import React, { useState } from 'react';
import { AttendanceRow } from '../../types/bulletin';
import { Plus, Trash2 } from 'lucide-react';

interface AttendanceTableProps {
  rows: AttendanceRow[];
  note?: string;
  isEditing?: boolean;
  onChange?: (rows: AttendanceRow[]) => void;
  onChangeNote?: (note: string) => void;
  emptyHint: string;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  rows,
  note,
  isEditing = false,
  onChange,
  onChangeNote,
  emptyHint,
}) => {
  const [newMeeting, setNewMeeting] = useState('');
  const [newCount, setNewCount] = useState('');

  const updateRow = (id: string, patch: Partial<AttendanceRow>) => {
    onChange?.(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const deleteRow = (id: string) => {
    onChange?.(rows.filter((r) => r.id !== id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeeting.trim()) return;
    onChange?.([
      ...rows,
      { id: 'att-' + Date.now(), meeting: newMeeting.trim(), count: newCount.trim() || '--' },
    ]);
    setNewMeeting('');
    setNewCount('');
  };

  if (rows.length === 0 && !isEditing) {
    return <p className="text-xs text-slate-400 italic text-center py-8">{emptyHint}</p>;
  }

  return (
    <div className="space-y-3 font-sans">
      <table className="w-full text-[11px] border-collapse">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100">
              {isEditing ? (
                <>
                  <td className="py-1 pr-1">
                    <input
                      value={row.meeting}
                      onChange={(e) => updateRow(row.id, { meeting: e.target.value })}
                      className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="py-1 pr-1 w-24">
                    <input
                      value={row.count}
                      onChange={(e) => updateRow(row.id, { count: e.target.value })}
                      className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="py-1 w-6">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="py-1 pr-2 text-slate-800">{row.meeting}</td>
                  <td className="py-1 text-right font-bold text-slate-900">{row.count}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {isEditing ? (
        <input
          value={note || ''}
          onChange={(e) => onChangeNote?.(e.target.value)}
          placeholder="備註（選填，例：＊ 因 8 號風球聚會取消）"
          className="w-full border border-slate-300 rounded px-2 py-1 text-[11px] italic focus:outline-none focus:border-blue-500"
        />
      ) : (
        note && <p className="text-[10px] text-slate-400 italic">{note}</p>
      )}

      {isEditing && (
        <form onSubmit={handleAdd} className="pt-2 border-t border-dashed border-slate-300 text-xs flex gap-1.5">
          <input
            value={newMeeting}
            onChange={(e) => setNewMeeting(e.target.value)}
            placeholder="聚會名稱"
            className="flex-1 border border-slate-300 rounded p-1.5 text-xs"
          />
          <input
            value={newCount}
            onChange={(e) => setNewCount(e.target.value)}
            placeholder="人數"
            className="w-20 border border-slate-300 rounded p-1.5 text-xs"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> 加入
          </button>
        </form>
      )}
    </div>
  );
};
