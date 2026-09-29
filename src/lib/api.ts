import {
  AnalysisRecord,
  GeneratedResume,
  JobTrack,
  LearningPath,
  LinkedInProfileData,
  OrchestrationRunResult,
  ReadinessResult,
  ResumeAuditReport,
  User,
  VideoAssessment,
} from "../types.js";

const TOKEN_KEY = "resumate_auth_token";
const GUEST_ANALYSIS_KEY = "resumate_guest_analysis_id";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredGuestAnalysisId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GUEST_ANALYSIS_KEY);
}

export function setStoredGuestAnalysisId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(GUEST_ANALYSIS_KEY, id);
  } else {
    localStorage.removeItem(GUEST_ANALYSIS_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Samples
  async getSamples(): Promise<{ samples: any[] }> {
    return request("/api/sample-data");
  },

  // Auth
  async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async loginWithFirebase(uid: string, email: string, name?: string): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>("/api/auth/firebase", {
      method: "POST",
      body: JSON.stringify({ uid, email, name }),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request("/api/auth/me");
  },

  logout() {
    setStoredToken(null);
    request("/api/auth/logout", { method: "POST" }).catch(() => {});
  },

  // Document Text Extraction (PDF / DOCX / TXT)
  async extractResume(fileData: { base64Data: string; mimeType: string; fileName: string }): Promise<{ text: string }> {
    return request("/api/extract-resume", {
      method: "POST",
      body: JSON.stringify(fileData),
    });
  },

  async extractDocument(fileData: { base64Data: string; mimeType: string; fileName: string }): Promise<{ text: string }> {
    return request("/api/extract-resume", {
      method: "POST",
      body: JSON.stringify(fileData),
    });
  },

  // LinkedIn Authorized Connection & Skill Extraction
  async getLinkedInAuthUrl(): Promise<{ oauthConfigured: boolean; url?: string; redirectUri: string; message?: string }> {
    return request("/api/linkedin/auth-url");
  },

  async extractLinkedInProfile(payload: {
    profileUrl?: string;
    rawProfileText?: string;
    fullName?: string;
    headline?: string;
    connectionMethod?: "OAUTH_2" | "PROFILE_EXPORT" | "PROFILE_SUMMARY";
  }): Promise<{ linkedInData: LinkedInProfileData }> {
    return request("/api/linkedin/extract", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Analyses
  async analyze(
    resumeText: string,
    jobDescriptionText: string,
    isGuest: boolean,
    jobTrack?: JobTrack,
    linkedInData?: LinkedInProfileData
  ): Promise<{ analysis: AnalysisRecord }> {
    const res = await request<{ analysis: AnalysisRecord }>("/api/analyses", {
      method: "POST",
      body: JSON.stringify({ resumeText, jobDescriptionText, isGuest, jobTrack, linkedInData }),
    });
    if (res.analysis?.isGuest) {
      setStoredGuestAnalysisId(res.analysis.id);
    }
    return res;
  },

  async getAnalyses(): Promise<{ analyses: AnalysisRecord[] }> {
    return request("/api/analyses");
  },

  async getAnalysis(id: string): Promise<{ analysis: AnalysisRecord }> {
    return request(`/api/analyses/${id}`);
  },

  async claimGuest(id: string): Promise<{ analysis: AnalysisRecord; message: string }> {
    const res = await request<{ analysis: AnalysisRecord; message: string }>(`/api/analyses/${id}/claim-guest`, {
      method: "POST",
    });
    setStoredGuestAnalysisId(null);
    return res;
  },

  // Video Assessment
  async prepareVideoAssessment(analysisId: string): Promise<{ assessment: VideoAssessment }> {
    return request("/api/video-assessments", {
      method: "POST",
      body: JSON.stringify({ analysisId }),
    });
  },

  async getVideoAssessment(id: string): Promise<{ assessment: VideoAssessment }> {
    return request(`/api/video-assessments/${id}`);
  },

  async submitVideoAssessment(
    id: string,
    answers: { questionId: string; transcription: string; audioDurationSeconds?: number }[]
  ): Promise<{ assessment: VideoAssessment; updatedReadiness: ReadinessResult }> {
    return request(`/api/video-assessments/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },

  // Learning Path
  async getLearningPath(id: string): Promise<{ learningPath: LearningPath }> {
    return request(`/api/learning-paths/${id}`);
  },

  async toggleLearningItem(id: string, itemId: string, completed: boolean): Promise<{ learningPath: LearningPath }> {
    return request(`/api/learning-paths/${id}/toggle-item`, {
      method: "POST",
      body: JSON.stringify({ itemId, completed }),
    });
  },

  // Reassessment
  async submitReassessment(
    analysisId: string,
    proofDetails: string,
    improvedSkills: string[]
  ): Promise<{ reassessment: { newScore: number; newState: string; explanation: string } }> {
    return request("/api/reassessments", {
      method: "POST",
      body: JSON.stringify({ analysisId, proofDetails, improvedSkills }),
    });
  },

  async getReassessments(analysisId: string): Promise<{ history: any[] }> {
    return request(`/api/reassessments/${analysisId}`);
  },

  // Resume Generation & Audit
  async generateResume(
    analysisId: string,
    selectedSkills?: string[],
    trackType?: "TECHNICAL" | "NON_TECHNICAL",
    linkedInData?: LinkedInProfileData
  ): Promise<{ resume: GeneratedResume; audit: ResumeAuditReport }> {
    return request("/api/resumes/generate", {
      method: "POST",
      body: JSON.stringify({ analysisId, selectedSkills, trackType, linkedInData }),
    });
  },

  async getResume(id: string): Promise<{ resume: GeneratedResume }> {
    return request(`/api/resumes/${id}`);
  },

  async getResumeAudit(id: string): Promise<{ audit: ResumeAuditReport }> {
    return request(`/api/resumes/${id}/audit`);
  },

  // Candidate Profile
  async getCandidateProfile(analysisId?: string): Promise<{
    profile: any;
    activeAnalysis?: AnalysisRecord | null;
    analyses?: AnalysisRecord[];
  }> {
    const qs = analysisId ? `?analysisId=${encodeURIComponent(analysisId)}` : "";
    return request(`/api/skills/profile${qs}`);
  },

  // ----------------- JOB PORTAL & APPLICATIONS -----------------
  async getJobs(params?: {
    search?: string;
    source?: string;
    location?: string;
    remoteOnly?: boolean;
    track?: string;
    refresh?: boolean;
  }): Promise<{ jobs: any[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.source) query.set("source", params.source);
    if (params?.location) query.set("location", params.location);
    if (params?.remoteOnly) query.set("remoteOnly", "true");
    if (params?.track) query.set("track", params.track);
    if (params?.refresh) query.set("refresh", "true");
    const qs = query.toString();
    return request(`/api/jobs${qs ? `?${qs}` : ""}`);
  },

  async getJobRecommendations(params?: {
    resumeId?: string;
    skills?: string[];
    jobTrack?: string;
  }): Promise<{ recommendations: any[]; candidateSkillsCount: number }> {
    return request("/api/jobs/recommendations", {
      method: "POST",
      body: JSON.stringify(params || {}),
    });
  },

  async getJobMatchSingle(params: {
    jobId: string;
    resumeId?: string;
    skills?: string[];
    jobTrack?: string;
  }): Promise<{ job: any; match: any }> {
    return request("/api/jobs/match-single", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async getJobApplications(): Promise<{ applications: any[] }> {
    return request("/api/jobs/applications");
  },

  async applyToJob(payload: {
    jobId: string;
    jobTitle: string;
    company: string;
    location?: string;
    jobSource?: string;
    sourceUrl?: string;
    applyUrl?: string;
    resumeId: string;
    resumeTitle?: string;
    status?: string;
    notes?: string;
    isDirectSubmission?: boolean;
    matchScore?: number;
  }): Promise<{ application: any; message: string }> {
    return request("/api/jobs/apply", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateJobApplication(
    id: string,
    payload: { status: string; notes?: string; interviewDate?: string }
  ): Promise<{ application: any }> {
    return request(`/api/jobs/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteJobApplication(id: string): Promise<{ success: boolean }> {
    return request(`/api/jobs/applications/${id}`, {
      method: "DELETE",
    });
  },

  // ----------------- AUTONOMOUS ORCHESTRATION AGENT -----------------
  async runOrchestration(payload: {
    analysisId?: string;
    resumeText?: string;
    jobDescriptionText?: string;
    jobTrack?: JobTrack;
    linkedInData?: LinkedInProfileData;
    forceResynthesize?: boolean;
  }): Promise<{ orchestration: OrchestrationRunResult }> {
    return request("/api/orchestration/run", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getOrchestrationState(analysisId: string): Promise<{ orchestration: OrchestrationRunResult }> {
    return request(`/api/orchestration/state/${encodeURIComponent(analysisId)}`);
  },
};
