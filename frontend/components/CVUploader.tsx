"use client";

import { useCallback, useRef, useState } from "react";

import { API_OFFLINE_HINT, apiUrl } from "@/lib/api";
import type { CandidateProfile } from "@/lib/types";

type CVUploaderProps = {
  /** Called when the server returns a parsed profile and RAG session id. */
  onSuccess: (profile: CandidateProfile, sessionId: string) => void;
  /** Optional hook so the parent can flip UI into an uploading phase. */
  onUploadBegin?: () => void;
  /** Optional hook after upload attempt finishes (success or failure). */
  onFinally?: () => void;
};

const ACCEPT = [".pdf", ".docx"] as const;

function isAllowedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPT.some((ext) => lower.endsWith(ext));
}

function UploadArrowIcon() {
  return (
    <svg
      className="h-10 w-10 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-indigo-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Drag-and-drop CV upload with client-side validation and multipart POST to /api/cv/upload.
 */
export function CVUploader({ onSuccess, onUploadBegin, onFinally }: CVUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const pickFile = useCallback((f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      setFileName(null);
      return;
    }
    if (!isAllowedFile(f.name)) {
      setError("Only PDF and Word (.docx) files are supported.");
      setFile(null);
      setFileName(null);
      return;
    }
    setFile(f);
    setFileName(f.name);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      pickFile(dropped ?? null);
    },
    [pickFile],
  );

  const onSubmit = useCallback(async () => {
    if (!file) {
      setError("Please choose a file first.");
      return;
    }
    setError(null);
    setIsUploading(true);
    onUploadBegin?.();
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(apiUrl("/api/cv/upload"), {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        let detail = `Upload failed (${res.status})`;
        try {
          const json = await res.json();
          detail = json?.detail || detail;
        } catch {
          detail = (await res.text()) || detail;
        }
        throw new Error(detail);
      }
      const data = (await res.json()) as { profile: CandidateProfile; session_id: string };
      onSuccess(data.profile, data.session_id);
      setFile(null);
      setFileName(null);
    } catch (err) {
      const msg =
        err instanceof TypeError
          ? API_OFFLINE_HINT
          : err instanceof Error
            ? err.message
            : "Upload failed. Try again.";
      setError(msg === "Failed to fetch" ? API_OFFLINE_HINT : msg);
    } finally {
      setIsUploading(false);
      onFinally?.();
    }
  }, [file, onSuccess, onUploadBegin, onFinally]);

  return (
    <div className="w-full max-w-lg">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors ${
          isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {isUploading ? (
          <Spinner />
        ) : (
          <UploadArrowIcon />
        )}
        <p className="text-center text-sm font-medium text-slate-700">
          Drag your CV here or click to browse
        </p>
        {fileName ? (
          <p className="max-w-full truncate text-xs text-slate-500" title={fileName}>
            Selected: {fileName}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          disabled={!file || isUploading}
          onClick={(e) => {
            e.stopPropagation();
            void onSubmit();
          }}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition enabled:hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? "Uploading…" : "Upload CV"}
        </button>
      </div>

      {error ? <p className="mt-3 text-center text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
