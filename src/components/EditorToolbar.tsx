'use client';

import React from 'react';
import { type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Upload,
  Minus,
  Lock,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  isReadOnly: boolean;
  onOpenImportModal: () => void;
}

export function EditorToolbar({
  editor,
  isReadOnly,
  onOpenImportModal,
}: EditorToolbarProps) {
  if (!editor) return null;

  const btnBase =
    'p-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed';
  const activeClass = 'bg-indigo-600 text-white shadow-sm';
  const inactiveClass = 'text-slate-300 hover:text-white hover:bg-slate-800';

  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-1">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 pr-1.5 mr-1 border-r border-slate-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={isReadOnly || !editor.can().undo()}
            className={`${btnBase} ${inactiveClass}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={isReadOnly || !editor.can().redo()}
            className={`${btnBase} ${inactiveClass}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Headings & Text */}
        <div className="flex items-center gap-0.5 pr-1.5 mr-1 border-r border-slate-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('paragraph') ? activeClass : inactiveClass}`}
            title="Paragraph"
          >
            <Pilcrow className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('heading', { level: 1 }) ? activeClass : inactiveClass}`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('heading', { level: 2 }) ? activeClass : inactiveClass}`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('heading', { level: 3 }) ? activeClass : inactiveClass}`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
        </div>

        {/* Inline Formatting */}
        <div className="flex items-center gap-0.5 pr-1.5 mr-1 border-r border-slate-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('bold') ? activeClass : inactiveClass}`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('italic') ? activeClass : inactiveClass}`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('underline') ? activeClass : inactiveClass}`}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 pr-1.5 mr-1 border-r border-slate-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('bulletList') ? activeClass : inactiveClass}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('orderedList') ? activeClass : inactiveClass}`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>

        {/* Quotes, Code, Divider */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('blockquote') ? activeClass : inactiveClass}`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            disabled={isReadOnly}
            className={`${btnBase} ${editor.isActive('codeBlock') ? activeClass : inactiveClass}`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            disabled={isReadOnly}
            className={`${btnBase} ${inactiveClass}`}
            title="Horizontal Divider"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right side: Import file or viewer indicator */}
      {!isReadOnly ? (
        <button
          type="button"
          onClick={onOpenImportModal}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition shadow-sm"
          title="Import .txt or .md file into this document"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Import File into Document</span>
          <span className="sm:hidden">Import</span>
        </button>
      ) : (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
          <Lock className="w-3 h-3 text-sky-400" />
          <span>Editing Disabled (Viewer)</span>
        </div>
      )}
    </div>
  );
}
