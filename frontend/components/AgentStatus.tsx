"use client";

type AgentStatusProps = {
  messages: string[];
};

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PulsingDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
    </span>
  );
}

/**
 * Vertical timeline of agent status lines with animated progress on the latest step.
 */
export function AgentStatus({ messages }: AgentStatusProps) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="jobscout-shimmer text-lg font-semibold text-slate-900">Searching for jobs…</h2>
      <p className="mt-1 text-sm text-slate-500">The agent is planning queries, searching boards, and scoring matches.</p>

      <ul className="relative mt-6 space-y-0 pl-2">
        <span className="absolute bottom-2 left-[11px] top-2 w-px bg-slate-200" aria-hidden />
        {messages.length === 0 ? (
          <li className="relative flex gap-3 pb-4 pl-6">
            <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
              <PulsingDot />
            </span>
            <span className="text-sm text-slate-700">Initializing…</span>
          </li>
        ) : (
          messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
            return (
              <li key={`${i}-${msg.slice(0, 24)}`} className="relative flex gap-3 pb-4 pl-6 last:pb-0">
                <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
                  {isLast ? <PulsingDot /> : <CheckIcon />}
                </span>
                <span className={`text-sm leading-relaxed ${isLast ? "font-medium text-slate-800" : "text-slate-600"}`}>{msg}</span>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
