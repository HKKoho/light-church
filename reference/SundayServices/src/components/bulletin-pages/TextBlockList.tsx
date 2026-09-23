import React, { useState } from 'react';
import { TextBlock } from '../../types/bulletin';
import { Plus, Trash2 } from 'lucide-react';
import { RichTextField } from './RichTextField';
import { sanitizeRichText } from '../../utils/sanitizeRichText';

interface TextBlockListProps {
  blocks: TextBlock[];
  isEditing?: boolean;
  onChange?: (blocks: TextBlock[]) => void;
  emptyHint: string;
  titlePlaceholder?: string;
  metaPlaceholder?: string;
  bodyPlaceholder?: string;
  addButtonLabel?: string;
}

// Shared editor/renderer for any "title + optional meta + free-form body"
// bulletin page (hymn lyrics, call-to-worship, sermon scripture, monthly
// verse, ministry updates, other notices, weekly prayers). Used read-only
// (isEditing=false, no onChange) by CongregationView and editable by
// BulletinPreview.
export const TextBlockList: React.FC<TextBlockListProps> = ({
  blocks,
  isEditing = false,
  onChange,
  emptyHint,
  titlePlaceholder = '標題',
  metaPlaceholder = '（選填）出處／作者／備註',
  bodyPlaceholder = '內容...',
  addButtonLabel = '新增項目',
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newMeta, setNewMeta] = useState('');
  const [newBody, setNewBody] = useState('');

  const updateBlock = (id: string, patch: Partial<TextBlock>) => {
    onChange?.(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deleteBlock = (id: string) => {
    onChange?.(blocks.filter((b) => b.id !== id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newBody.trim()) return;
    onChange?.([
      ...blocks,
      {
        id: 'tb-' + Date.now(),
        title: newTitle.trim(),
        meta: newMeta.trim() || undefined,
        body: newBody.trim(),
      },
    ]);
    setNewTitle('');
    setNewMeta('');
    setNewBody('');
  };

  if (blocks.length === 0 && !isEditing) {
    return <p className="text-xs text-slate-400 italic text-center py-8">{emptyHint}</p>;
  }

  return (
    <div className="space-y-5">
      {blocks.map((block) => (
        <div key={block.id} className="pb-3 border-b border-slate-100 last:border-b-0">
          {isEditing ? (
            <div className="space-y-1.5 font-sans">
              <div className="flex items-center gap-2">
                <input
                  value={block.title}
                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:outline-none focus:border-blue-500"
                  placeholder={titlePlaceholder}
                />
                <button
                  onClick={() => deleteBlock(block.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                value={block.meta || ''}
                onChange={(e) => updateBlock(block.id, { meta: e.target.value })}
                className="w-full border border-slate-300 rounded px-2 py-1 text-[11px] italic text-slate-600 focus:outline-none focus:border-blue-500"
                placeholder={metaPlaceholder}
              />
              <RichTextField
                value={block.body}
                onChange={(html) => updateBlock(block.id, { body: html })}
                placeholder={bodyPlaceholder}
                className="w-full min-h-[5.5rem] border border-slate-300 rounded px-2 py-1.5 text-xs font-serif focus:outline-none focus:border-blue-500"
              />
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-bold text-slate-900 font-serif">{block.title}</h4>
              {block.meta && <p className="text-[11px] italic text-slate-500 mt-0.5">{block.meta}</p>}
              <p
                className="text-[12px] text-slate-800 mt-1.5 leading-relaxed whitespace-pre-line font-serif"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.body) }}
              />
            </div>
          )}
        </div>
      ))}

      {isEditing && (
        <form
          onSubmit={handleAdd}
          className="pt-2 border-t border-dashed border-slate-300 font-sans text-xs space-y-1.5"
        >
          <span className="font-bold text-slate-700 block">{addButtonLabel}</span>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={titlePlaceholder}
            className="w-full border border-slate-300 rounded p-1.5 text-xs"
          />
          <input
            value={newMeta}
            onChange={(e) => setNewMeta(e.target.value)}
            placeholder={metaPlaceholder}
            className="w-full border border-slate-300 rounded p-1.5 text-xs"
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder={bodyPlaceholder}
            rows={2}
            className="w-full border border-slate-300 rounded p-1.5 text-xs"
          />
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
