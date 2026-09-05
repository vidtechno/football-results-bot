'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Undo,
  Redo,
  RemoveFormatting,
  Save,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { sanitizeRichText, getRichTextStats } from '@/lib/utils/sanitizer';

interface RichTextEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
  onManualSave?: () => void;
  placeholder?: string;
  storageKey?: string;
  workTitle?: string;
  chapterTitle?: string;
}

export function RichTextEditor({
  initialContent = '',
  onChange,
  onManualSave,
  placeholder = 'Bob matnini bu yerda yozing...',
  storageKey,
  workTitle,
  chapterTitle,
}: RichTextEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [hasDraftRecovery, setHasDraftRecovery] = useState(false);
  const [recoveredDraftMeta, setRecoveredDraftMeta] = useState<{ work?: string; chapter?: string } | null>(null);
  const [stats, setStats] = useState({ wordCount: 0, charCount: 0 });
  const autosaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        dropcursor: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'prose prose-stone max-w-none focus:outline-hidden min-h-[380px] p-5 font-serif text-base leading-relaxed text-stone-900',
      },
    },
    onUpdate: ({ editor }) => {
      const rawHtml = editor.getHTML();
      const cleanHtml = sanitizeRichText(rawHtml);
      setStats(getRichTextStats(cleanHtml));
      setSaveStatus('unsaved');
      onChange(cleanHtml);

      // Debounced autosave to localStorage (1000ms debounce)
      if (storageKey) {
        if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = setTimeout(() => {
          try {
            const draftPayload = JSON.stringify({
              content: cleanHtml,
              time: Date.now(),
              workTitle: workTitle || '',
              chapterTitle: chapterTitle || '',
            });
            localStorage.setItem(storageKey, draftPayload);
            localStorage.setItem(`${storageKey}_time`, Date.now().toString());
            setSaveStatus('saved');
          } catch {
            // ignore localStorage errors
          }
        }, 1000);
      }
    },
  });

  // Check for local draft recovery on mount & clean up legacy unpartitioned drafts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Safely remove obsolete legacy keys starting with 'manbora_draft_'
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('manbora_draft_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}

    if (!storageKey) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      let draftText = '';
      let metaWork = workTitle;
      let metaChap = chapterTitle;

      if (raw.startsWith('{')) {
        try {
          const parsed = JSON.parse(raw);
          draftText = parsed.content || '';
          if (parsed.workTitle) metaWork = parsed.workTitle;
          if (parsed.chapterTitle) metaChap = parsed.chapterTitle;
        } catch {
          draftText = raw;
        }
      } else {
        draftText = raw;
      }

      if (draftText && draftText !== initialContent && draftText.length > 20) {
        setHasDraftRecovery(true);
        setRecoveredDraftMeta({ work: metaWork, chapter: metaChap });
      }
    } catch {
      // ignore
    }
  }, [storageKey, initialContent, workTitle, chapterTitle]);

  // Warn on uncommitted unsaved changes before leaving
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  const handleRestoreDraft = useCallback(() => {
    if (!storageKey || !editor) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        let contentToSet = raw;
        if (raw.startsWith('{')) {
          try {
            contentToSet = JSON.parse(raw).content || raw;
          } catch {}
        }
        editor.commands.setContent(contentToSet);
        setHasDraftRecovery(false);
        setSaveStatus('saved');
      }
    } catch {
      // ignore
    }
  }, [storageKey, editor]);

  const handleDiscardDraft = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_time`);
      setHasDraftRecovery(false);
      setRecoveredDraftMeta(null);
    } catch {}
  }, [storageKey]);

  if (!editor) {
    return (
      <div className="p-8 text-center text-stone-400 text-xs font-semibold">
        Matn muharriri yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs flex flex-col">
      {/* Draft recovery banner if newer draft exists in browser */}
      {hasDraftRecovery && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">
              Brauzeringizda saqlangan yangiroq qoralama topildi
              {recoveredDraftMeta?.chapter
                ? ` (${recoveredDraftMeta.work ? `${recoveredDraftMeta.work} — ` : ''}${recoveredDraftMeta.chapter})`
                : ''}
              .
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1 shadow-xs transition-colors min-h-[36px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tiklash</span>
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold transition-colors min-h-[36px]"
            >
              O‘chirish
            </button>
          </div>
        </div>
      )}

      {/* Sticky Formatting Toolbar */}
      <div className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur-md border-b border-stone-200 p-2 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          {/* Bold */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive('bold') ? 'bg-stone-200 text-stone-900 font-black' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="Qalin (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive('italic') ? 'bg-stone-200 text-stone-900 font-black' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="Kursiv (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive('underline') ? 'bg-stone-200 text-stone-900 font-black' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="Tagiga chizilgan (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-stone-300 mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive('heading', { level: 2 }) ? 'bg-stone-200 text-stone-900 font-bold' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="Sarlavha 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive('heading', { level: 3 }) ? 'bg-stone-200 text-stone-900 font-bold' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="Kichik sarlavha 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          {/* Blockquote */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive('blockquote') ? 'bg-stone-200 text-stone-900 font-bold' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="Iqtibos"
          >
            <Quote className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-stone-300 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive('bulletList') ? 'bg-stone-200 text-stone-900 font-bold' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="Belgilangan ro‘yxat"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive('orderedList') ? 'bg-stone-200 text-stone-900 font-bold' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="Raqamlangan ro‘yxat"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-stone-300 mx-1" />

          {/* Text Alignment */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive({ textAlign: 'left' }) ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="Chapga tekislash"
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive({ textAlign: 'center' }) ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="O‘rtaga tekislash"
          >
            <AlignCenter className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive({ textAlign: 'right' }) ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="O‘ngga tekislash"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={clsx(
              'p-2 rounded-lg text-xs transition-colors',
              editor.isActive({ textAlign: 'justify' }) ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:bg-stone-200/70',
            )}
            title="Eni bo‘ylab tekislash"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-stone-300 mx-1" />

          {/* Divider */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-2 rounded-lg text-stone-600 hover:bg-stone-200/70 text-xs transition-colors"
            title="Gorizontal chiziq"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Clear Format */}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className="p-2 rounded-lg text-stone-600 hover:bg-stone-200/70 text-xs transition-colors"
            title="Formatlashni tozalash"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>

        {/* Undo / Redo Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
            className="p-2 rounded-lg text-stone-600 hover:bg-stone-200/70 disabled:opacity-30 text-xs transition-colors"
            title="Bekor qilish (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
            className="p-2 rounded-lg text-stone-600 hover:bg-stone-200/70 disabled:opacity-30 text-xs transition-colors"
            title="Qaytarish (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main TipTap Content Area */}
      <div className="flex-1 bg-white cursor-text" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>

      {/* Editor Footer / Statistics & Save Status Bar */}
      <div className="bg-stone-50 border-t border-stone-200 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] font-semibold text-stone-500 gap-2">
        <div className="flex items-center gap-4">
          <span>{stats.wordCount} ta so‘z</span>
          <span>{stats.charCount} ta belgi</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            {saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Qoralama saqlandi</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-700 font-bold">Saqlanmoqda...</span>
              </>
            )}
          </span>

          {onManualSave && (
            <button
              type="button"
              onClick={onManualSave}
              className="px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold flex items-center gap-1 transition-colors"
            >
              <Save className="w-3 h-3" />
              <span>Saqlash</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
