"use client";

type JobCardProps = {
  title: string;
  company: string;
  url: string;
  score: number;
  reasoning: string;
  source: string;
};

function scoreBadgeClasses(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-600";
}

/**
 * One scored job listing with match reasoning and external link.
 */
export function JobCard({ title, company, url, score, reasoning, source }: JobCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{title || "Untitled role"}</h3>
          <p className="mt-0.5 text-sm text-gray-500">{company || "Company not listed"}</p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${scoreBadgeClasses(score)}`}>
          {score}/100
        </span>
      </div>

      <p className="line-clamp-3 text-sm italic leading-relaxed text-gray-600">{reasoning || "No reasoning provided."}</p>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{source}</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View Job
          </a>
        ) : null}
      </div>
    </article>
  );
}
