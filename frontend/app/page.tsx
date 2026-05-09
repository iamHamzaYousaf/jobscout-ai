"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AgentStatus } from "@/components/AgentStatus";
import { CVUploader } from "@/components/CVUploader";
import { FilterBar } from "@/components/FilterBar";
import { JobCard } from "@/components/JobCard";
import { ProfileCard } from "@/components/ProfileCard";
import { API_OFFLINE_HINT, apiUrl } from "@/lib/api";
import type { CandidateProfile, JobMatch, SearchApiResponse } from "@/lib/types";

type PagePhase = "idle" | "uploading" | "searching" | "results";

/**
 * Main dashboard: CV upload, profile review, agent search, and ranked job results.
 */
export default function HomePage() {
  const [phase, setPhase] = useState<PagePhase>("idle");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [, setSessionId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobMatch[]>([]);
  const [agentMessages, setAgentMessages] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchStepsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearSearchSteps = useCallback(() => {
    if (searchStepsRef.current) {
      clearInterval(searchStepsRef.current);
      searchStepsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase !== "searching") {
      clearSearchSteps();
      return;
    }

    const extra = [
      "Planning search queries…",
      "Searching live job listings…",
      "Scoring matches against your profile…",
    ];
    let i = 0;
    searchStepsRef.current = setInterval(() => {
      i += 1;
      if (i < extra.length) {
        setAgentMessages((prev) => [...prev, extra[i]]);
      }
    }, 950);

    return () => {
      clearSearchSteps();
    };
  }, [phase, clearSearchSteps]);

  const handleUploadSuccess = useCallback((p: CandidateProfile, sessionId: string) => {
    setProfile(p);
    setSessionId(sessionId);
    setSearchError(null);
    setPhase("idle");
  }, []);

  const handleFindJobs = useCallback(async () => {
    if (!profile) return;
    setSearchError(null);
    setPhase("searching");
    setAgentMessages(["Connecting to JobScout agent…"]);

    try {
      const res = await fetch(apiUrl("/api/jobs/search"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Search failed (${res.status})`);
      }
      const data = (await res.json()) as SearchApiResponse;
      clearSearchSteps();
      const serverMsgs = data.status_messages?.filter(Boolean) ?? [];
      setAgentMessages(
        serverMsgs.length > 0 ? serverMsgs : ["Search complete — showing your best matches."],
      );
      setJobs(data.jobs ?? []);
      setFilteredJobs(data.jobs ?? []);
      setPhase("results");
    } catch (e) {
      clearSearchSteps();
      const raw = e instanceof Error ? e.message : "Search failed.";
      setSearchError(raw === "Failed to fetch" ? API_OFFLINE_HINT : raw);
      setAgentMessages([]);
      setPhase("idle");
    }
  }, [profile, clearSearchSteps]);

  const onFilter = useCallback((next: JobMatch[]) => {
    setFilteredJobs(next);
  }, []);

  const initialGate = (phase === "idle" || phase === "uploading") && !profile;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {initialGate ? (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">JobScout AI</h1>
          <p className="mt-3 max-w-md text-center text-base text-slate-600">
            Upload your CV. Our agent finds the best jobs for you.
          </p>
          <div className="mt-10 w-full max-w-lg">
            <CVUploader
              onUploadBegin={() => setPhase("uploading")}
              onFinally={() => setPhase("idle")}
              onSuccess={handleUploadSuccess}
            />
          </div>
        </div>
      ) : null}

      {profile && phase === "idle" ? (
        <div className="mx-auto max-w-3xl px-4 py-10">
          {searchError ? (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{searchError}</div>
          ) : null}
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">JobScout AI</h1>
            <p className="mt-1 text-slate-600">Review your profile, then run the job agent.</p>
          </header>
          <ProfileCard profile={profile} onFindJobs={handleFindJobs} isSearching={false} />
        </div>
      ) : null}

      {phase === "searching" ? (
        <div className="mx-auto max-w-2xl px-4 py-12">
          <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">JobScout AI</h1>
            <p className="mt-1 text-slate-600">Your agent is working on matches…</p>
          </header>
          {profile ? (
            <p className="mb-4 text-center text-sm text-slate-500">
              {profile.roles?.[0] ?? "Candidate"} · {profile.location || "Location TBD"}
            </p>
          ) : null}
          <AgentStatus messages={agentMessages} />
        </div>
      ) : null}

      {phase === "results" ? (
        <div className="mx-auto max-w-5xl px-4 py-10">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">JobScout AI</h1>
            <p className="mt-1 text-slate-600">Ranked matches with scores and reasoning.</p>
          </header>
          {profile ? <ProfileCard profile={profile} onFindJobs={handleFindJobs} isSearching={false} /> : null}
          <div className="mt-8">
            <FilterBar jobs={jobs} onFilter={onFilter} />
            {jobs.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-600">
                No job listings were returned. Confirm Tavily and Groq keys on the server, then try again.
              </p>
            ) : null}
            <section className="mt-6 grid gap-4 sm:grid-cols-2">
              {filteredJobs.map((job) => (
                <JobCard
                  key={`${job.url}-${job.title}`}
                  title={job.title}
                  company={job.company}
                  url={job.url}
                  score={job.score}
                  reasoning={job.reasoning}
                  source={job.source}
                />
              ))}
            </section>
            {filteredJobs.length === 0 ? (
              <p className="mt-8 text-center text-sm text-slate-500">No jobs match the current filters.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
