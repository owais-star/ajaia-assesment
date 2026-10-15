'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UploadCloud, 
  X, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { useActiveUser } from './ActiveUserContext';
import { MAX_FILE_SIZE_BYTES, ALLOWED_EXTENSIONS } from '@/lib/markdown';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDocumentId?: string;
  onImportComplete?: (importedHtml: string) => void;
}

export function UploadModal({
  isOpen,
  onClose,
  targetDocumentId,
  onImportComplete,
}: UploadModalProps) {
  const router = useRouter();
  const { authFetch } = useActiveUser();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateFile = (file: File): string | null => {
    const extMatch = file.name.toLowerCase().match(/\.[0-9a-z]+$/i);
    const ext = extMatch ? extMatch[0] : '';

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file format "${ext || 'unknown'}". Supported formats: .txt, .md (Max 2MB)`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return `File size (${sizeMb} MB) exceeds maximum allowed limit of 2MB.`;
    }

    if (file.size === 0) {
      return 'The selected file is empty.';
    }

    return null;
  };

  const handleFileSelection = (file: File) => {
    setErrorMessage(null);
    setUploadSuccess(null);
    const err = validateFile(file);
    if (err) {
      setErrorMessage(err);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    const validationErr = validateFile(selectedFile);
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      if (targetDocumentId) {
        formData.append('action', 'append');
        formData.append('documentId', targetDocumentId);
      } else {
        formData.append('action', 'create');
      }

      const res = await authFetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }

      setUploadSuccess(data.message || 'File uploaded successfully!');

      if (targetDocumentId && onImportComplete && data.importedContentHtml) {
        onImportComplete(data.importedContentHtml);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else if (data.document?.id) {
        setTimeout(() => {
          onClose();
          router.push(`/doc/${data.document.id}`);
        }, 1000);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 relative"
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
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              {targetDocumentId ? 'Import File into Document' : 'Upload File as New Doc'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Automatically converts Markdown &amp; plain text into styled rich-text content.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <span>Supported formats: .txt, .md (Max 2MB)</span>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">Upload Rejected</p>
              <p className="text-rose-300/90 mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Banner */}
        {uploadSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {/* Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-slate-750 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelection(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 shadow-inner group-hover:scale-105 transition">
              <UploadCloud className="w-6 h-6 text-indigo-400" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Click to browse or drag and drop file here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                .txt and .md files up to 2MB are supported
              </p>
            </div>
          </div>
        </div>

        {/* Selected File Details */}
        {selectedFile && !errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white truncate max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUploadSubmit}
            disabled={!selectedFile || isUploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing &amp; Converting...</span>
              </>
            ) : (
              <span>
                {targetDocumentId ? 'Append into Document' : 'Create Document'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
