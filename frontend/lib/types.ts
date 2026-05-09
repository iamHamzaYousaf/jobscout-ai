/** Candidate profile fields used in the dashboard (matches API shape). */
export type CandidateProfile = {
  skills: string[];
  roles: string[];
  years_experience: number;
  location: string;
  raw_text?: string;
};

/** Single job from POST /api/jobs/search */
export type JobMatch = {
  title: string;
  company: string;
  url: string;
  description: string;
  score: number;
  reasoning: string;
  source: string;
};

export type SearchApiResponse = {
  profile: CandidateProfile;
  jobs: JobMatch[];
  total: number;
  query_count: number;
  status_messages?: string[];
};

export type UploadApiResponse = {
  profile: CandidateProfile;
  session_id: string;
};
