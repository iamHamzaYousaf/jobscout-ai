"use client";

import { useCallback, useEffect, useState } from "react";

import type { JobMatch } from "@/lib/types";

type SortMode = "latest" | "best";
type ScoreBand = "all" | "strong" | "good";

type FilterBarProps = {
  jobs: JobMatch[];
  onFilter: (filtered: JobMatch[]) => void;
};

function applyScoreBand(list: JobMatch[], band: ScoreBand): JobMatch[] {
  if (band === "strong") return list.filter((j) => j.score >= 80);
  if (band === "good") return list.filter((j) => j.score >= 60);
  return list;
}

function applySort(list: JobMatch[], mode: SortMode, originalOrder: JobMatch[]): JobMatch[] {
  const out = [...list];
  if (mode === "best") {
    out.sort((a, b) => b.score - a.score);
    return out;
  }
  // Latest first: preserve order as returned from API
  const index = new Map(originalOrder.map((j, i) => [j.url + j.title, i]));
  out.sort((a, b) => (index.get(a.url + a.title) ?? 0) - (index.get(b.url + b.title) ?? 0));
  return out;
}

/**
 * Client-side sort and score filters; reports the visible subset to the parent.
 */
export function FilterBar({ jobs, onFilter }: FilterBarProps) {
  const [sort, setSort] = useState<SortMode>("latest");
  const [scoreBand, setScoreBand] = useState<ScoreBand>("all");

  useEffect(() => {
    setSort("latest");
    setScoreBand("all");
  }, [jobs]);

  const recompute = useCallback(() => {
    const scored = applyScoreBand(jobs, scoreBand);
    const sorted = applySort(scored, sort, jobs);
    onFilter(sorted);
  }, [jobs, sort, scoreBand, onFilter]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  return (
    <div className="flex flex-wrap items-center gap-3 gap-y-2 border-b border-slate-200 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="job-sort">
          Sort
        </label>
        <select
          id="job-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="latest">Latest First</option>
          <option value="best">Best Match</option>
        </select>

        <label className="sr-only" htmlFor="job-score-filter">
          Score filter
        </label>
        <select
          id="job-score-filter"
          value={scoreBand}
          onChange={(e) => setScoreBand(e.target.value as ScoreBand)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All</option>
          <option value="strong">Strong (80+)</option>
          <option value="good">Good (60+)</option>
        </select>
      </div>

      <span className="ml-auto text-sm font-medium text-slate-600">{jobs.length} jobs found</span>
    </div>
  );
}
