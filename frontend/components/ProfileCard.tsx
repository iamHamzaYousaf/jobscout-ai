"use client";

import type { CandidateProfile } from "@/lib/types";

type ProfileCardProps = {
  profile: CandidateProfile;
  onFindJobs: () => void;
  isSearching?: boolean;
};

function BriefcaseIcon() {
  return (
    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

/**
 * Structured profile summary with skills pills and a primary call-to-action.
 */
export function ProfileCard({ profile, onFindJobs, isSearching }: ProfileCardProps) {
  return (
    <section className="rounded-xl bg-gray-100 p-6 shadow-sm ring-1 ring-gray-200/80">
      <h2 className="text-lg font-semibold text-gray-900">Your profile</h2>
      <p className="mt-1 text-sm text-gray-600">Extracted from your CV — used to plan and score job matches.</p>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Skills</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {profile.skills?.length ? (
            profile.skills.map((s) => (
              <span key={s} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                {s}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-500">No skills listed</span>
          )}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Roles</h3>
        {profile.roles?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-800">
            {profile.roles.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">No roles listed</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-6 text-sm text-gray-800">
        <div className="flex items-center gap-2">
          <BriefcaseIcon />
          <span>
            <span className="text-gray-500">Experience: </span>
            <span className="font-medium">{profile.years_experience} years</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPinIcon />
          <span>
            <span className="text-gray-500">Location: </span>
            <span className="font-medium">{profile.location || "—"}</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onFindJobs}
        disabled={isSearching}
        className="mt-6 w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSearching ? "Searching…" : "Find Jobs"}
      </button>
    </section>
  );
}
