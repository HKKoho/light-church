import React, { useState } from 'react';
import { RosterRow } from '../../types/bulletin';
import { Plus, Trash2 } from 'lucide-react';

interface RosterTableProps {
  rows: RosterRow[];
  isEditing?: boolean;
  onChange?: (rows: RosterRow[]) => void;
  emptyHint: string;
}

function groupRows(rows: RosterRow[]): { section: string; rows: RosterRow[] }[] {
  const groups: { section: string; rows: RosterRow[] }[] = [];
  for (const row of rows) {
    let group = groups.find((g) => g.section === row.section);
    if (!group) {
      group = { section: row.section, rows: [] };
      groups.push(group);
    }
    group.rows.push(row);
  }
  return groups;
}

export const RosterTable: React.FC<RosterTableProps> = ({
  rows,
  isEditing = false,
  onChange,
  emptyHint,
}) => {
  const [newSection, setNewSection] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newThisWeek, setNewThisWeek] = useState('');
  const [newNextWeek, setNewNextWeek] = useState('');

  const updateRow = (id: string, patch: Partial<RosterRow>) => {
    onChange?.(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const deleteRow = (id: string) => {
    onChange?.(rows.filter((r) => r.id !== id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.trim() || !newRole.trim()) return;
    onChange?.([
      ...rows,
      {
        id: 'roster-' + Date.now(),
        section: newSection.trim(),
        role: newRole.trim(),
        thisWeek: newThisWeek.trim() || '--',
        nextWeek: newNextWeek.trim() || '--',
      },
    ]);
    setNewRole('');
    setNewThisWeek('');
    setNewNextWeek('');
  };

  if (rows.length === 0 && !isEditing) {
    return <p className="text-xs text-slate-400 italic text-center py-8">{emptyHint}</p>;
  }

  const groups = groupRows(rows);

  return (
    <div className="space-y-5 font-sans">
      {groups.map((group) => (
        <div key={group.section}>
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-900 mb-1.5">
            {group.section}
          </h4>
          <table className="w-full text-[11px] border-collapse">
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 align-top">
                  {isEditing ? (
                    <>
                      <td className="py-1 pr-1 w-1/5">
                        <input
                          value={row.role}
                          onChange={(e) => updateRow(row.id, { role: e.target.value })}
                          className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] font-bold focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-1 pr-1">
                        <input
                          value={row.thisWeek}
                          onChange={(e) => updateRow(row.id, { thisWeek: e.target.value })}
                          className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-1 pr-1">
                        <input
                          value={row.nextWeek}
                          onChange={(e) => updateRow(row.id, { nextWeek: e.target.value })}
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
                      <td className="py-1 pr-2 font-bold text-slate-900 whitespace-nowrap">{row.role}</td>
                      <td className="py-1 pr-2 text-slate-800">{row.thisWeek}</td>
                      <td className="py-1 text-slate-500">{row.nextWeek}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {isEditing && (
        <form onSubmit={handleAdd} className="pt-2 border-t border-dashed border-slate-300 text-xs space-y-1.5">
          <span className="font-bold text-slate-700 block">新增事奉項目</span>
          <input
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            placeholder="表格名稱（例：主日崇拜事奉芳名表）"
            className="w-full border border-slate-300 rounded p-1.5 text-xs"
          />
          <div className="flex gap-1.5">
            <input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="事奉崗位"
              className="w-1/3 border border-slate-300 rounded p-1.5 text-xs"
            />
            <input
              value={newThisWeek}
              onChange={(e) => setNewThisWeek(e.target.value)}
              placeholder="本週"
              className="flex-1 border border-slate-300 rounded p-1.5 text-xs"
            />
            <input
              value={newNextWeek}
              onChange={(e) => setNewNextWeek(e.target.value)}
              placeholder="下週"
              className="flex-1 border border-slate-300 rounded p-1.5 text-xs"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> 加入
          </button>
        </form>
      )}
    </div>
  );
};
