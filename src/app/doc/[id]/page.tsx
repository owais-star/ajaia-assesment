'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { DocumentEditor } from '@/components/DocumentEditor';
import { useActiveUser } from '@/components/ActiveUserContext';
import { Document, UserRole } from '@/lib/types';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, authFetch } = useActiveUser();

  const docId = params.id as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDoc() {
      if (!docId) return;

      try {
        setIsLoading(true);
        setErrorMessage(null);
        setDocument(null);
        setUserRole(null);

        const activeUserId = currentUser?.id || 'user_1';
        const res = await authFetch(`/api/documents/${docId}`, {
          headers: { 'x-user-id': activeUserId },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load document');
        }

        setDocument(data.document);
        setUserRole(data.userRole);
      } catch (e: any) {
        setErrorMessage(e.message || 'Unable to access document.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDoc();
  }, [docId, currentUser?.id, authFetch]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar isEditorPage={true} />

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400">Loading document workspace...</p>
        </div>
      ) : errorMessage || !document || !userRole ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Access Restricted</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 mb-3">
            <span>Active Persona: {currentUser?.name || 'Reviewer'} ({currentUser?.email})</span>
          </div>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            {errorMessage || 'You do not have permission to view this document.'} Switch personas in the top right navigation bar to test an authorized team member, or return to your dashboard.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white transition border border-slate-700 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      ) : (
        <DocumentEditor
          key={`${docId}_${currentUser?.id}`}
          initialDocument={document}
          initialRole={userRole}
        />
      )}
    </div>
  );
}
