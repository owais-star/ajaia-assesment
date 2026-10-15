'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import { 
  ArrowLeft, 
  Save, 
  Share2, 
  Download, 
  Trash2, 
  Check, 
  Loader2, 
  Lock, 
  ShieldCheck, 
  Edit3, 
  Eye, 
  AlertCircle,
  FileCode,
  FileText
} from 'lucide-react';
import { useActiveUser } from './ActiveUserContext';
import { EditorToolbar } from './EditorToolbar';
import { ShareModal } from './ShareModal';
import { UploadModal } from './UploadModal';
import { Document, UserRole } from '@/lib/types';
import { formatExactTime } from '@/lib/utils';
import { htmlToMarkdown } from '@/lib/markdown';

interface DocumentEditorProps {
  initialDocument: Document;
  initialRole: UserRole;
}

export function DocumentEditor({
  initialDocument,
  initialRole,
}: DocumentEditorProps) {
  const router = useRouter();
  const { currentUser, authFetch } = useActiveUser();

  const [document, setDocument] = useState<Document>(initialDocument);
  const [userRole, setUserRole] = useState<UserRole>(initialRole);
  const [title, setTitle] = useState(initialDocument.title);
  const [saveStatus, setSaveStatus] = useState<string>('Saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>(formatExactTime());
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReadOnly = userRole === 'viewer';
  const isOwner = userRole === 'owner';

  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // Cleanup pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Tiptap Editor instance
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      UnderlineExtension,
      PlaceholderExtension.configure({
        placeholder: 'Start typing document content, notes, or use the toolbar above...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialDocument.content || '<p></p>',
    editable: !isReadOnly,
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none min-h-[500px] text-slate-200 text-sm md:text-base leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      if (isReadOnly) return;
      setHasUnsavedChanges(true);
      triggerDebouncedSave(titleRef.current, editor.getHTML());
    },
  });

  // Re-fetch document and shares when explicitly triggered (e.g. from ShareModal)
  const refreshDocument = useCallback(async () => {
    try {
      const uid = currentUser?.id || 'user_1';
      const res = await authFetch(`/api/documents/${document.id}`, {
        headers: { 'x-user-id': uid },
      });
      if (res.ok) {
        const data = await res.json();
        setDocument(data.document);
        setUserRole(data.userRole);
      } else if (res.status === 403 || res.status === 404) {
        setErrorMessage('You do not have access to this document under this persona.');
      }
    } catch (e) {
      console.error('Failed to refresh document:', e);
    }
  }, [authFetch, currentUser?.id, document.id]);

  // Synchronize editor editable state with user role
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly);
    }
  }, [editor, isReadOnly]);

  // Save function
  const saveDocument = async (currentTitle: string, currentContent: string) => {
    if (isReadOnly) return;

    try {
      setIsSaving(true);
      setSaveStatus('Saving...');
      setErrorMessage(null);

      const uid = currentUser?.id || 'user_1';
      const res = await authFetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': uid,
        },
        body: JSON.stringify({
          title: currentTitle,
          content: currentContent,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save document');
      }

      const data = await res.json();
      setDocument(data.document);
      setHasUnsavedChanges(false);
      const timeStr = formatExactTime();
      setLastSavedTime(timeStr);
      setSaveStatus(`Saved at ${timeStr}`);
    } catch (e: any) {
      setErrorMessage(e.message || 'Auto-save failed');
      setSaveStatus('Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  // 800ms debounced save
  const triggerDebouncedSave = (newTitle: string, newContent: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setSaveStatus('Unsaved changes...');
    debounceTimeoutRef.current = setTimeout(() => {
      saveDocument(newTitle, newContent);
    }, 800);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const newTitle = e.target.value;
    setTitle(newTitle);
    setHasUnsavedChanges(true);
    const content = editor ? editor.getHTML() : document.content;
    triggerDebouncedSave(newTitle, content);
  };

  const handleManualSave = () => {
    if (isReadOnly || isSaving) return;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    const content = editor ? editor.getHTML() : document.content;
    saveDocument(title, content);
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    try {
      setIsDeleting(true);
      const uid = currentUser?.id || 'user_1';
      const res = await authFetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': uid },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete document');
      }

      router.push('/');
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to delete document');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleExport = (format: 'md' | 'html') => {
    setIsExportMenuOpen(false);
    const currentHtml = editor ? editor.getHTML() : document.content;
    let exportContent = '';
    let mimeType = '';
    let filename = '';

    const safeTitle = title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();

    if (format === 'md') {
      exportContent = htmlToMarkdown(currentHtml);
      mimeType = 'text/markdown';
      filename = `${safeTitle || 'document'}.md`;
    } else {
      exportContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5em; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    blockquote { border-left: 4px solid #6366f1; margin: 0; padding-left: 16px; color: #475569; }
  </style>
</head>
<body>
  ${currentHtml}
</body>
</html>`;
      mimeType = 'text/html';
      filename = `${safeTitle || 'document'}.html`;
    }

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportHtmlAppended = (importedHtml: string) => {
    if (editor && !isReadOnly) {
      const currentHtml = editor.getHTML();
      const newHtml = `${currentHtml}<hr/>${importedHtml}`;
      editor.commands.setContent(newHtml);
      saveDocument(title, newHtml);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Left: Breadcrumbs & Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Documents</span>
            </Link>

            <span className="text-slate-600 hidden sm:inline text-xs">/</span>

            <div className="flex items-center gap-2 min-w-0 flex-1 max-w-sm sm:max-w-md">
              <span className="font-semibold text-xs sm:text-sm text-slate-200 truncate">
                {title || 'Untitled Document'}
              </span>

              {/* User Role Badge */}
              <div className="shrink-0">
                {userRole === 'owner' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    Owner
                  </span>
                )}
                {userRole === 'editor' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Edit3 className="w-3 h-3" />
                    Editor
                  </span>
                )}
                {userRole === 'viewer' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    <Eye className="w-3 h-3" />
                    Viewer
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Save Status, Save Button, Export, Share, Delete */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Indicator */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 pr-2">
              {isReadOnly ? (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Read-only
                </span>
              ) : isSaving ? (
                <span className="inline-flex items-center gap-1 text-indigo-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              ) : hasUnsavedChanges ? (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Unsaved changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Check className="w-3 h-3 text-emerald-400" />
                  {saveStatus}
                </span>
              )}
            </div>

            {/* Manual Save Button */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleManualSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                id="manual-save-button"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save</span>
              </button>
            )}

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
                title="Export Document"
                id="export-dropdown-button"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {isExportMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-xl p-1.5 z-40"
                  style={{ backgroundColor: '#0f172a' }}
                >
                  <button
                    type="button"
                    onClick={() => handleExport('md')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Download as Markdown (.md)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('html')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  >
                    <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download as HTML (.html)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Share Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition"
              id="share-document-button"
              title={isOwner ? 'Share and manage permissions' : 'View collaborators'}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isOwner ? 'Share' : 'Collaborators'}</span>
            </button>

            {/* Delete Button (Owner Only) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Delete Document (Owner Only)"
                id="delete-document-button"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Rich-Text Toolbar */}
        <EditorToolbar
          editor={editor}
          isReadOnly={isReadOnly}
          onOpenImportModal={() => setIsUploadModalOpen(true)}
        />
      </div>

      {/* View-Only Read-Only Banner */}
      {isReadOnly && (
        <div className="bg-sky-950/70 border-b border-sky-800/50 px-4 py-2 text-xs text-sky-200 flex items-center justify-center gap-2 text-center animate-in fade-in duration-200">
          <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>
            <strong>View Only</strong> — Shared by <strong>{document.owner_name}</strong>. You have viewer permissions on this document.
          </span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto mt-4 px-4 w-full">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Editor Body Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col">
        <div
          onClick={() => {
            if (editor && !isReadOnly && !editor.isFocused) {
              editor.commands.focus();
            }
          }}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-12 shadow-2xl backdrop-blur-sm min-h-[700px] flex-1 flex flex-col transition ring-1 ring-white/5 cursor-text hover:border-slate-750"
        >
          {/* Canvas Title (Notion/Linear style) */}
          <div className="mb-4">
            {isReadOnly ? (
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                {title || 'Untitled Document'}
              </h1>
            ) : (
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    editor?.chain().focus('start').run();
                  }
                }}
                placeholder="Untitled Document"
                className="w-full bg-transparent text-2xl sm:text-4xl font-extrabold tracking-tight text-white placeholder:text-slate-600 focus:outline-none border-b border-transparent hover:border-slate-800 focus:border-indigo-500/50 pb-2 transition"
                id="canvas-document-title"
              />
            )}

            {/* Document Metadata Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-slate-400">
              <span className="text-slate-500">Created by</span>
              <span className="font-medium text-slate-200">
                {document.owner_name} {document.owner_id === currentUser?.id ? '(You)' : ''}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">
                {lastSavedTime ? `Saved at ${lastSavedTime}` : 'All changes saved'}
              </span>
            </div>

            <div className="h-px bg-slate-800/80 w-full mt-4 mb-5" />
          </div>

          {/* Tiptap Rich-Text Editor */}
          <div className="flex-1">
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        document={document}
        onSharesUpdated={refreshDocument}
      />

      {/* Upload / Import Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        targetDocumentId={document.id}
        onImportComplete={handleImportHtmlAppended}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Delete Document?
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-200">"{document.title}"</strong>? This will permanently remove the document and revoke access for all collaborators. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
