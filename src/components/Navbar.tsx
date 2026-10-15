'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  ChevronDown, 
  Plus, 
  Upload, 
  User as UserIcon, 
  Check, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useActiveUser } from './ActiveUserContext';
import { getAvatarColorClasses } from '@/lib/utils';
import { User } from '@/lib/types';

interface NavbarProps {
  onOpenUploadModal?: () => void;
  isEditorPage?: boolean;
}

export function Navbar({ onOpenUploadModal, isEditorPage = false }: NavbarProps) {
  const router = useRouter();
  const { currentUser, users, switchUserById, authFetch } = useActiveUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateDocument = async () => {
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
      console.error('Failed to create document:', e);
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const avatarStyles = currentUser
    ? getAvatarColorClasses(currentUser.avatar_color)
    : { bg: 'bg-indigo-600', text: 'text-white', ring: 'ring-indigo-400' };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group transition-transform active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20 group-hover:shadow-indigo-500/40 transition-all">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Ajaia Docs
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Assessment
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium -mt-1 hidden sm:inline">
                Collaborative Document Engine
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Quick Action Buttons (Show if not editor page or if compact) */}
          {!isEditorPage && (
            <div className="flex items-center gap-2">
              {onOpenUploadModal && (
                <button
                  onClick={onOpenUploadModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition shadow-sm"
                  title="Upload .txt or .md file"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Upload File</span>
                </button>
              )}

              <button
                onClick={handleCreateDocument}
                disabled={isCreatingDoc}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreatingDoc ? 'Creating...' : 'New Doc'}</span>
              </button>
            </div>
          )}

          {/* Persona Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden md:inline font-medium">
                Active Persona:
              </span>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition shadow-sm text-left group"
                id="persona-switcher-button"
                aria-expanded={isDropdownOpen}
              >
                {/* User Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg ${avatarStyles.bg} flex items-center justify-center font-bold text-xs text-white shadow-inner ring-1 ring-white/20`}
                >
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>

                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white leading-tight">
                    {currentUser?.name || 'Select User'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {currentUser?.email || ''}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform duration-200" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl shadow-black/60 p-2 z-50 ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-100"
                style={{ backgroundColor: '#0f172a' }}
              >
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Simulated Personas
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                      Instant Switch
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Switch user to test owner vs editor vs viewer permissions.
                  </p>
                </div>

                <div className="py-1 space-y-1">
                  {users.map((user: User) => {
                    const isSelected = currentUser?.id === user.id;
                    const uAvatar = getAvatarColorClasses(user.avatar_color);

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          switchUserById(user.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
                            : 'hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg ${uAvatar.bg} flex items-center justify-center font-bold text-xs text-white shadow-sm ring-1 ring-white/20`}
                          >
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                              {user.name}
                              {user.id === 'user_1' && (
                                <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {user.email}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-1 pt-2 border-t border-slate-800/80 px-2.5 py-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>API calls will send <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">x-user-id</code> header</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
