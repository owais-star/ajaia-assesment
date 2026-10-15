'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Plus, 
  Upload, 
  Search, 
  Clock, 
  ShieldCheck, 
  Edit3, 
  Eye, 
  Trash2, 
  Share2, 
  Download, 
  Sparkles,
  Users,
  FolderLock,
  ArrowRight,
  Loader2,
  FileCode
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { UploadModal } from '@/components/UploadModal';
import { ShareModal } from '@/components/ShareModal';
import { useActiveUser } from '@/components/ActiveUserContext';
import { DocumentSummary, DashboardDocuments, Document } from '@/lib/types';
import { formatRelativeTime, getAvatarColorClasses } from '@/lib/utils';
import { htmlToMarkdown } from '@/lib/markdown';

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, authFetch, isLoading: isUserLoading } = useActiveUser();

  const [documentsData, setDocumentsData] = useState<DashboardDocuments>({
    myDocuments: [],
    sharedDocuments: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'shared'>('all');
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState<Document | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocuments = useCallback(async (targetUserId?: string) => {
    try {
      setIsLoadingDocs(true);
      const activeId = targetUserId || currentUser?.id || 'user_1';
      const res = await authFetch('/api/documents', {
        headers: { 'x-user-id': activeId },
      });
      if (res.ok) {
        const data = await res.json();
        setDocumentsData(data);
      }
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [authFetch, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchDocuments(currentUser.id);
    }
  }, [currentUser?.id, fetchDocuments]);

  const handleCreateNewDoc = async () => {
    try {
      setIsCreatingDoc(true);
      const res = await authFetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Document',
          content: '<p></p>',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/doc/${data.document.id}`);
      }
    } catch (e) {
      console.error('Failed to create new document:', e);
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    try {
      setIsDeleting(true);
      const res = await authFetch(`/api/documents/${docToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDocToDelete(null);
        fetchDocuments();
      }
    } catch (e) {
      console.error('Failed to delete document:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenShareModal = async (docId: string) => {
    try {
      const res = await authFetch(`/api/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDocForShare(data.document);
      }
    } catch (e) {
      console.error('Failed to load document for share modal:', e);
    }
  };

  // Filter documents based on search query
  const query = searchQuery.toLowerCase().trim();
  const filterFn = (doc: DocumentSummary) =>
    doc.title.toLowerCase().includes(query) ||
    doc.owner_name.toLowerCase().includes(query) ||
    (doc.preview_text && doc.preview_text.toLowerCase().includes(query));

  const filteredMyDocs = documentsData.myDocuments.filter(filterFn);
  const filteredSharedDocs = documentsData.sharedDocuments.filter(filterFn);

  const totalDocsCount =
    documentsData.myDocuments.length + documentsData.sharedDocuments.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar onOpenUploadModal={() => setIsUploadModalOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome & Stats Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Active Persona: {currentUser?.name || 'Reviewer'} ({currentUser?.email})
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Collaborative Workspaces &amp; Documents
              </h1>
              <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                Test multi-persona document ownership, role-based editing vs viewing permissions, and file uploads. Switch personas in the top right at any time.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 hover:text-white border border-slate-700 transition shadow-sm"
                id="upload-file-button"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Upload File as New Doc</span>
              </button>

              <button
                type="button"
                onClick={handleCreateNewDoc}
                disabled={isCreatingDoc}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                id="create-document-button"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreatingDoc ? 'Creating...' : 'New Blank Doc'}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/60">
              <span className="text-[11px] font-medium text-slate-400">Total Documents</span>
              <p className="text-xl font-bold text-white mt-0.5">{totalDocsCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/60">
              <span className="text-[11px] font-medium text-indigo-400">My Documents</span>
              <p className="text-xl font-bold text-white mt-0.5">
                {documentsData.myDocuments.length}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/60">
              <span className="text-[11px] font-medium text-emerald-400">Shared with Me</span>
              <p className="text-xl font-bold text-white mt-0.5">
                {documentsData.sharedDocuments.length}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/60">
              <span className="text-[11px] font-medium text-slate-400">File Ingestion</span>
              <p className="text-xs font-semibold text-slate-300 mt-1">.txt, .md (Max 2MB)</p>
            </div>
          </div>
        </div>

        {/* Search & Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Documents ({totalDocsCount})
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'my'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Documents ({documentsData.myDocuments.length})
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'shared'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Shared with Me ({documentsData.sharedDocuments.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title or owner..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              id="dashboard-search-input"
            />
          </div>
        </div>

        {/* Section 1: My Documents */}
        {(activeTab === 'all' || activeTab === 'my') && (
          <section className="space-y-3" id="section-my-documents">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  My Documents
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  ({filteredMyDocs.length})
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Documents owned and managed by you
              </span>
            </div>

            {isLoadingDocs ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs">Loading documents...</span>
              </div>
            ) : filteredMyDocs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/30">
                <div className="w-10 h-10 rounded-xl bg-slate-800 mx-auto flex items-center justify-center text-slate-400 mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-300">No documents found</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  {searchQuery
                    ? `No owned documents match "${searchQuery}"`
                    : 'You haven\'t created any documents yet.'}
                </p>
                <button
                  onClick={handleCreateNewDoc}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Document
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMyDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onShare={() => handleOpenShareModal(doc.id)}
                    onDelete={() => setDocToDelete(doc)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Section 2: Shared with Me */}
        {(activeTab === 'all' || activeTab === 'shared') && (
          <section className="space-y-3 pt-4" id="section-shared-with-me">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Shared with Me
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  ({filteredSharedDocs.length})
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Collaborative documents shared with your persona
              </span>
            </div>

            {isLoadingDocs ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs">Loading shared documents...</span>
              </div>
            ) : filteredSharedDocs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/30">
                <div className="w-10 h-10 rounded-xl bg-slate-800 mx-auto flex items-center justify-center text-slate-400 mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-300">
                  No documents shared with you
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `No shared documents match "${searchQuery}"`
                    : 'Switch personas using the switcher in the navigation bar to see documents owned by other team members.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSharedDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onShare={() => handleOpenShareModal(doc.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Quick Upload Drag & Drop Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-900/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Have existing notes or markdown files?
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload any <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">.txt</code> or <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">.md</code> file up to 2MB to automatically convert into a document.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          fetchDocuments();
        }}
      />

      {/* Share Modal */}
      {selectedDocForShare && (
        <ShareModal
          isOpen={true}
          onClose={() => setSelectedDocForShare(null)}
          document={selectedDocForShare}
          onSharesUpdated={() => {
            fetchDocuments();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Delete Document?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{docToDelete.title}"</strong>? This will permanently delete the document and revoke access for all collaborators.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDocument}
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

interface DocumentCardProps {
  doc: DocumentSummary;
  onShare: () => void;
  onDelete?: () => void;
}

function DocumentCard({ doc, onShare, onDelete }: DocumentCardProps) {
  const router = useRouter();
  const isOwner = doc.user_role === 'owner';
  const isEditor = doc.user_role === 'editor';
  const ownerAvatar = getAvatarColorClasses(doc.owner_avatar_color || 'indigo');

  return (
    <div
      onClick={() => router.push(`/doc/${doc.id}`)}
      className="group rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-5 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top bar: Badge & Action */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Explicit Role Badge */}
          <div>
            {isOwner && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                Owner
              </span>
            )}
            {isEditor && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Edit3 className="w-3 h-3 text-emerald-400" />
                Shared • Editor
              </span>
            )}
            {!isOwner && !isEditor && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                <Eye className="w-3 h-3 text-sky-400" />
                Shared • Viewer
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Share settings"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {isOwner && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Delete document"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-indigo-400 transition tracking-tight line-clamp-1">
          {doc.title}
        </h3>

        {/* Content Preview */}
        <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
          {doc.preview_text || 'No additional content yet.'}
        </p>
      </div>

      {/* Footer: Owner and Timestamp */}
      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md ${ownerAvatar.bg} flex items-center justify-center font-bold text-[10px] text-white ring-1 ring-white/10`}
          >
            {doc.owner_name?.charAt(0) || 'U'}
          </div>
          <span className="truncate max-w-[120px] font-medium text-slate-300">
            {doc.owner_name}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-500" title={doc.updated_at}>
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{formatRelativeTime(doc.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
