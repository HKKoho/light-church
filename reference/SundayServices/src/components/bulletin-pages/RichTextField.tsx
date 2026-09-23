import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, ChevronDown } from 'lucide-react';
import { sanitizeRichText, FONT_STACKS } from '../../utils/sanitizeRichText';

interface RichTextFieldProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

const SIZE_DELTAS = [3, 2, 1, -1, -2, -3];
const MIN_FONT_PT = 6;
const MAX_FONT_PT = 72;
const DEFAULT_FONT_PT = 12;

const FONT_OPTIONS: { label: string; family: string }[] = [
  { label: '明體', family: 'Noto Serif TC' },
  { label: '黑體', family: 'Noto Sans TC' },
  { label: '華康黑體', family: 'Microsoft JhengHei' },
];

// A contentEditable field that shows a small floating Bold/Italic/Underline
// toolbar when the user selects text inside it — the minimal rich-text
// editor needed for stage 1 (see BulletinPreview's body fields). Uses
// document.execCommand for the actual formatting: it's deprecated in spec
// terms but every evergreen browser still implements it, and it's an order
// of magnitude simpler than hand-rolling Range/TreeWalker-based toggling for
// three basic inline styles.
export const RichTextField: React.FC<RichTextFieldProps> = ({ value, onChange, placeholder, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition | null>(null);
  const [openMenu, setOpenMenu] = useState<'size' | 'font' | null>(null);

  // Sync external value changes into the DOM, but only while the field isn't
  // focused — otherwise this would clobber the caret position on every
  // keystroke (onInput below already keeps `value` up to date as the user types).
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el) {
      el.innerHTML = sanitizeRichText(value);
    }
  }, [value]);

  const updateToolbarPosition = () => {
    const selection = window.getSelection();
    const container = ref.current;
    if (!selection || selection.isCollapsed || !container || selection.rangeCount === 0) {
      setToolbarPos(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setToolbarPos(null);
      return;
    }
    const rangeRect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setToolbarPos({
      top: rangeRect.top - containerRect.top - 34,
      left: Math.min(
        Math.max(0, rangeRect.left - containerRect.left),
        Math.max(0, container.clientWidth - 96)
      ),
    });
  };

  const emitChange = () => {
    if (ref.current) onChange(sanitizeRichText(ref.current.innerHTML));
  };

  const applyFormat = (command: 'bold' | 'italic' | 'underline') => (e: React.MouseEvent) => {
    e.preventDefault(); // don't let the button steal focus/selection from the field
    document.execCommand(command);
    emitChange();
    updateToolbarPosition();
  };

  // execCommand('fontSize') only understands the 7 legacy HTML size levels,
  // not arbitrary point sizes — but it *does* correctly wrap an arbitrary
  // (possibly multi-node) selection in <font size="7"> tags, which is the
  // hard part. So we use level 7 purely as a marker, then swap those tags
  // for a <span style="font-size:Npt"> carrying the size we actually want.
  const applyFontSizeDelta = (delta: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = ref.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return;

    const anchor = selection.getRangeAt(0).startContainer;
    const anchorEl = (anchor.nodeType === Node.ELEMENT_NODE ? (anchor as Element) : anchor.parentElement) ?? el;
    const basePx = parseFloat(getComputedStyle(anchorEl).fontSize);
    const basePt = Number.isFinite(basePx) ? basePx * 0.75 : DEFAULT_FONT_PT;
    const nextPt = Math.min(MAX_FONT_PT, Math.max(MIN_FONT_PT, Math.round(basePt + delta)));

    document.execCommand('fontSize', false, '7');
    el.querySelectorAll('font[size="7"]').forEach((font) => {
      const span = document.createElement('span');
      span.style.fontSize = `${nextPt}pt`;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    });

    setOpenMenu(null);
    emitChange();
    updateToolbarPosition();
  };

  // Same marker trick as font size: 'fontName' wraps the selection in
  // <font face="...">, which we then swap for a <span style="font-family:
  // ...">> using the known-safe stack for that family (see FONT_STACKS).
  const applyFontFamily = (family: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = ref.current;
    if (!el) return;

    document.execCommand('fontName', false, family);
    el.querySelectorAll(`font[face="${family}"]`).forEach((font) => {
      const span = document.createElement('span');
      span.style.fontFamily = FONT_STACKS[family];
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    });

    setOpenMenu(null);
    emitChange();
    updateToolbarPosition();
  };

  return (
    <div className="relative">
      {toolbarPos && (
        <div
          className="absolute z-20 flex items-center gap-0.5 bg-slate-900 rounded-md shadow-lg p-1"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
        >
          <button type="button" onMouseDown={applyFormat('bold')} title="粗體" className="p-1.5 text-white hover:bg-slate-700 rounded">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button" onMouseDown={applyFormat('italic')} title="斜體" className="p-1.5 text-white hover:bg-slate-700 rounded">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button type="button" onMouseDown={applyFormat('underline')} title="底線" className="p-1.5 text-white hover:bg-slate-700 rounded">
            <Underline className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpenMenu((m) => (m === 'size' ? null : 'size')); }}
              title="字級"
              className="px-1.5 py-1.5 flex items-center gap-0.5 text-white hover:bg-slate-700 rounded text-[11px] font-bold"
            >
              字級<ChevronDown className="w-2.5 h-2.5" />
            </button>
            {openMenu === 'size' && (
              <div className="absolute top-full left-0 mt-1 flex gap-0.5 bg-slate-900 rounded-md shadow-lg p-1">
                {SIZE_DELTAS.map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onMouseDown={applyFontSizeDelta(delta)}
                    className="px-1.5 py-1 text-white hover:bg-slate-700 rounded text-[11px] font-bold whitespace-nowrap"
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpenMenu((m) => (m === 'font' ? null : 'font')); }}
              title="字體"
              className="px-1.5 py-1.5 flex items-center gap-0.5 text-white hover:bg-slate-700 rounded text-[11px] font-bold"
            >
              字體<ChevronDown className="w-2.5 h-2.5" />
            </button>
            {openMenu === 'font' && (
              <div className="absolute top-full left-0 mt-1 flex flex-col bg-slate-900 rounded-md shadow-lg p-1">
                {FONT_OPTIONS.map((opt) => (
                  <button
                    key={opt.family}
                    type="button"
                    onMouseDown={applyFontFamily(opt.family)}
                    className="px-2 py-1 text-left text-white hover:bg-slate-700 rounded text-[11px] whitespace-nowrap"
                    style={{ fontFamily: FONT_STACKS[opt.family] }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onMouseUp={updateToolbarPosition}
        onKeyUp={updateToolbarPosition}
        onBlur={() => { setToolbarPos(null); setOpenMenu(null); }}
        data-placeholder={placeholder}
        className={`rich-text-field ${className ?? ''}`}
      />
    </div>
  );
};
