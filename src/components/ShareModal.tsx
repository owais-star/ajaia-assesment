'use client';

import React, { useState } from 'react';
import { 
  X, 
  Users, 
  ShieldCheck, 
  Trash2, 
  AlertCircle, 
  Check, 
  UserPlus, 
  Eye, 
  Edit3, 
  Loader2,
  Lock
} from 'lucide-react';
import { useActiveUser } from './ActiveUserContext';
import { getAvatarColorClasses } from '@/lib/utils';
import { Document, DocumentShare, User } from '@/lib/types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
  onSharesUpdated: () => void;
}

export function ShareModal({
  isOpen,
  onClose,
  document,
  onSharesUpdated,
}: ShareModalProps) {
  const { currentUser, users, authFetch } = useActiveUser();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOwner = document.owner_id === currentUser?.id;

  // Filter users eligible to be shared with (exclude document owner)
  const eligibleUsers = users.filter((u) => u.id !== document.owner_id);

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setErrorMsg('Please select a user to share with');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await authFetch(`/api/documents/${document.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update share permissions');
      }

      setSuccessMsg('Permissions updated successfully!');
      setSelectedUserId('');
      onSharesUpdated();

      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (e: any) {
      setErrorMsg(e.message || 'An error occurred while sharing the document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeShare = async (targetUserId: string) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await authFetch(
        `/api/documents/${document.id}/share?targetUserId=${targetUserId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke access');
      }

      setSuccessMsg('Access revoked successfully.');
      onSharesUpdated();

      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to revoke access');
    }
  };

  const ownerAvatar = getAvatarColorClasses(document.owner_avatar_color || 'indigo');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Share &amp; Permissions
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-sm">
                Document: <span className="text-slate-200 font-medium">"{document.title}"</span>
              </p>
            </div>
          </div>
        </div>

        {/* Error & Success Messages */}
        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable collaborators & invite form */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Owner row */}
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Document Owner
            </span>
            <div className="mt-2 p-3 rounded-xl bg-slate-800/70 border border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg ${ownerAvatar.bg} flex items-center justify-center font-bold text-xs text-white shadow ring-1 ring-white/20`}
                >
                  {document.owner_name?.charAt(0) || 'O'}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    {document.owner_name}
                    {document.owner_id === currentUser?.id && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {document.owner_email}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Owner
              </span>
            </div>
          </div>

          {/* Active Collaborators */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Collaborators ({document.shares?.length || 0})
              </span>
            </div>

            <div className="mt-2 space-y-2">
              {(!document.shares || document.shares.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400">
                    No other users have been granted access yet.
                  </p>
                </div>
              ) : (
                document.shares.map((share: DocumentShare) => {
                  const avatar = getAvatarColorClasses(share.avatar_color || 'indigo');
                  const isEditor = share.role === 'editor';

                  return (
                    <div
                      key={share.id}
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-750 flex items-center justify-between hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg ${avatar.bg} flex items-center justify-center font-bold text-xs text-white ring-1 ring-white/20`}
                        >
                          {share.user_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            {share.user_name}
                            {share.user_id === currentUser?.id && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {share.user_email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            isEditor
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                          }`}
                        >
                          {isEditor ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {isEditor ? 'Editor' : 'Viewer'}
                        </span>

                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRevokeShare(share.user_id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Revoke access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Add / Grant Access Form (Owner Only) */}
          {isOwner ? (
            <div className="pt-3 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                Grant or Update Access
              </span>

              <form onSubmit={handleShareSubmit} className="mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* User Select */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Select Team Member
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose User --</option>
                      {eligibleUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role Select */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Access Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as 'editor' | 'viewer')}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="editor">Editor • Can edit title &amp; content</option>
                      <option value="viewer">Viewer • Read-only access</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!selectedUserId || isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50 shadow-md shadow-indigo-600/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Grant Access</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Only the document owner ({document.owner_name}) can add or modify collaborator permissions.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
