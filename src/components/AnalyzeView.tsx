import React, { useState, useRef } from "react";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronLeft,
  Code2,
  Cpu,
  FileText,
  FileUp,
  Linkedin,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { api } from "../lib/api.js";
import { JobTrack, LinkedInProfileData } from "../types.js";
import { TrackSelectionScreen } from "./TrackSelectionScreen.js";

interface AnalyzeViewProps {
  onAnalyze: (
    resumeText: string,
    jobText: string,
    track?: JobTrack,
    linkedInData?: LinkedInProfileData
  ) => Promise<void>;
  isLoading: boolean;
  samples: any[];
  onLoadSample: (sampleId: string) => void;
  prefilledResume?: string;
  prefilledJob?: string;
  initialTrack?: JobTrack | null;
  onBackToLanding?: () => void;
}

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({
  onAnalyze,
  isLoading,
  samples,
  prefilledResume = "",
  prefilledJob = "",
  initialTrack = null,
  onBackToLanding,
}) => {
  // Track selection state: null means show the selection screen first!
  const [selectedTrack, setSelectedTrack] = useState<JobTrack | null>(initialTrack);

  // Content state
  const [resumeText, setResumeText] = useState(prefilledResume);
  const [jobText, setJobText] = useState(prefilledJob);

  // Resume Document Upload State
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [activeResumeTab, setActiveResumeTab] = useState<"upload" | "paste">("paste");
  const [isExtractingResume, setIsExtractingResume] = useState(false);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  // Job Description Document Upload State (PDF, DOCX, TXT support)
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [activeJdTab, setActiveJdTab] = useState<"upload" | "paste">("paste");
  const [isExtractingJd, setIsExtractingJd] = useState(false);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  // User-Authorized LinkedIn Connection & Skill Extraction State
  const [showLinkedInPanel, setShowLinkedInPanel] = useState<boolean>(true);
  const [linkedInUrl, setLinkedInUrl] = useState<string>("");
  const [linkedInHeadline, setLinkedInHeadline] = useState<string>("");
  const [linkedInRawText, setLinkedInRawText] = useState<string>("");
  const [linkedInPdfName, setLinkedInPdfName] = useState<string | null>(null);
  const [isExtractingLinkedIn, setIsExtractingLinkedIn] = useState<boolean>(false);
  const [linkedInData, setLinkedInData] = useState<LinkedInProfileData | undefined>(undefined);
  const [linkedInNotice, setLinkedInNotice] = useState<string | null>(null);
  const [newLinkedInSkillInput, setNewLinkedInSkillInput] = useState<string>("");
  const linkedInFileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);

  // Listen for LinkedIn OAuth 2.0 popup postMessage callback
  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "LINKEDIN_OAUTH_SUCCESS") {
        const profile = event.data.profile || {};
        setLinkedInNotice(`Connected via LinkedIn OAuth 2.0 as ${profile.fullName || profile.email || "Verified Member"}.`);
        setIsExtractingLinkedIn(true);
        try {
          const res = await api.extractLinkedInProfile({
            profileUrl: linkedInUrl || "https://www.linkedin.com/in/verified-member",
            fullName: profile.fullName,
            headline: linkedInHeadline,
            rawProfileText: linkedInRawText || `${profile.fullName || ""}\n${linkedInHeadline || ""}`,
            connectionMethod: "OAUTH_2",
          });
          setLinkedInData(res.linkedInData);
        } catch (err: any) {
          setError(err.message || "Failed to extract LinkedIn profile skills.");
        } finally {
          setIsExtractingLinkedIn(false);
        }
      } else if (event.data.type === "LINKEDIN_OAUTH_ERROR") {
        setLinkedInNotice(`LinkedIn OAuth notice: ${event.data.error || "Please use LinkedIn PDF export or profile summary below."}`);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [linkedInUrl, linkedInHeadline, linkedInRawText]);

  const handleConnectLinkedInOAuth = async () => {
    setLinkedInNotice(null);
    setError(null);
    try {
      const res = await api.getLinkedInAuthUrl();
      if (res.oauthConfigured && res.url) {
        window.open(res.url, "linkedin_oauth_popup", "width=600,height=700");
      } else {
        setShowLinkedInPanel(true);
        setLinkedInNotice(
          res.message ||
            "LinkedIn OAuth 2.0 client keys are not configured in this environment. Upload your official LinkedIn Profile PDF ('Save to PDF' on LinkedIn) or paste your LinkedIn Skills & About section below to authorize and extract verified skills."
        );
      }
    } catch (err: any) {
      setLinkedInNotice("Use LinkedIn PDF Export or paste your LinkedIn Skills & About section below to authorize skill extraction.");
    }
  };

  const handleLinkedInPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("LinkedIn file size exceeds 10MB limit.");
      return;
    }

    setLinkedInPdfName(file.name);
    setError(null);
    setIsExtractingLinkedIn(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      const extracted = await api.extractDocument({
        base64Data,
        mimeType: file.type || "application/pdf",
        fileName: file.name,
      });
      const text = extracted.text?.trim() || "";
      setLinkedInRawText(text);
      const res = await api.extractLinkedInProfile({
        profileUrl: linkedInUrl,
        headline: linkedInHeadline,
        rawProfileText: text,
        connectionMethod: "PROFILE_EXPORT",
      });
      setLinkedInData(res.linkedInData);
      setLinkedInNotice(
        `Extracted ${res.linkedInData.extractedSkills.length} verified skills from your authorized LinkedIn PDF (${file.name}).`
      );
    } catch (err: any) {
      setError(err.message || "Failed to extract skills from LinkedIn PDF export.");
    } finally {
      setIsExtractingLinkedIn(false);
      if (linkedInFileInputRef.current) linkedInFileInputRef.current.value = "";
    }
  };

  const handleExtractLinkedInSkills = async () => {
    setError(null);
    setIsExtractingLinkedIn(true);
    try {
      const res = await api.extractLinkedInProfile({
        profileUrl: linkedInUrl,
        headline: linkedInHeadline,
        rawProfileText: linkedInRawText,
        connectionMethod: linkedInPdfName ? "PROFILE_EXPORT" : "PROFILE_SUMMARY",
      });
      setLinkedInData(res.linkedInData);
      setLinkedInNotice(
        `Verified ${res.linkedInData.extractedSkills.length} professional skills from your authorized LinkedIn profile.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to extract LinkedIn profile skills.");
    } finally {
      setIsExtractingLinkedIn(false);
    }
  };

  const handleToggleLinkedInSkill = (skillName: string) => {
    if (!linkedInData) return;
    setLinkedInData({
      ...linkedInData,
      extractedSkills: linkedInData.extractedSkills.map((s) =>
        s.name === skillName ? { ...s, included: !s.included } : s
      ),
    });
  };

  const handleAddLinkedInSkillManual = () => {
    const trimmed = newLinkedInSkillInput.trim();
    if (!trimmed) return;
    const base: LinkedInProfileData = linkedInData || {
      connected: true,
      connectionMethod: "PROFILE_SUMMARY",
      profileUrl: linkedInUrl || undefined,
      headline: linkedInHeadline || undefined,
      extractedSkills: [],
      certifications: [],
      experienceHighlights: [],
      authorizedByUser: true,
      syncedAt: new Date().toISOString(),
    };
    if (!base.extractedSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setLinkedInData({
        ...base,
        extractedSkills: [
          ...base.extractedSkills,
          {
            name: trimmed,
            category: selectedTrack === "NON_TECHNICAL" ? "Business & Domain Competency" : "Technical & Engineering Skill",
            verifiedFrom: "SKILLS_SECTION",
            included: true,
          },
        ],
      });
    }
    setNewLinkedInSkillInput("");
  };

  // Dynamic progress step and numeric percentage indicator for high-speed analysis feedback
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [extractProgress, setExtractProgress] = useState(0);
  const loadingSteps = [
    "Parallel Document Parsing...",
    "Extracting Skills & Evidence...",
    "Matching Against Requirements...",
    "Finalizing Readiness...",
  ];

  React.useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      setLoadingProgress(0);
      return;
    }
    setLoadingProgress(6);
    const stepTimer = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1800);

    const progressTimer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev < 40) return Math.min(99, prev + 3.2);
        if (prev < 72) return Math.min(99, prev + 1.8);
        if (prev < 90) return Math.min(99, prev + 0.8);
        if (prev < 99) return Math.min(99, prev + 0.2);
        return 99;
      });
    }, 150);

    return () => {
      clearInterval(stepTimer);
      clearInterval(progressTimer);
    };
  }, [isLoading]);

  React.useEffect(() => {
    if (!isExtractingResume && !isExtractingJd) {
      setExtractProgress(0);
      return;
    }
    setExtractProgress(8);
    const timer = setInterval(() => {
      setExtractProgress((prev) => {
        if (prev < 50) return Math.min(99, prev + 4);
        if (prev < 85) return Math.min(99, prev + 1.8);
        if (prev < 99) return Math.min(99, prev + 0.4);
        return 99;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [isExtractingResume, isExtractingJd]);

  const numericPercent = Math.min(99, Math.max(1, Math.round(loadingProgress)));
  const estimatedRemainingSec = Math.max(1, Math.ceil(((100 - numericPercent) / 100) * 9));
  const numericExtractPercent = Math.min(99, Math.max(1, Math.round(extractProgress)));
  const estimatedExtractSec = Math.max(1, Math.ceil(((100 - numericExtractPercent) / 100) * 6));

  // Sync if props change
  React.useEffect(() => {
    if (prefilledResume) setResumeText(prefilledResume);
    if (prefilledJob) setJobText(prefilledJob);
  }, [prefilledResume, prefilledJob]);

  // Synchronize initialTrack prop if passed from outside
  React.useEffect(() => {
    if (initialTrack) setSelectedTrack(initialTrack);
  }, [initialTrack]);

  // Handle Resume File Upload (PDF / DOCX / TXT)
  const handleResumeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Resume file size exceeds 10MB limit.");
      return;
    }

    setResumeFileName(file.name);
    setError(null);
    setIsExtractingResume(true);

    try {
      const lowerName = file.name.toLowerCase();
      const isPlain =
        lowerName.endsWith(".txt") ||
        lowerName.endsWith(".md") ||
        file.type.includes("text/plain");

      if (isPlain) {
        const text = await file.text();
        setResumeText(text);
        setActiveResumeTab("paste");
      } else {
        const buffer = await file.arrayBuffer();
        const base64Data = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        const res = await api.extractResume({
          base64Data,
          mimeType: file.type || (lowerName.endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
          fileName: file.name,
        });

        if (res.text && res.text.trim().length > 0) {
          setResumeText(res.text.trim());
          setActiveResumeTab("paste");
        } else {
          throw new Error("Could not extract readable text from resume document.");
        }
      }
    } catch (err: any) {
      console.error("Resume file extraction error:", err);
      setError(err.message || "Failed to extract text from the uploaded resume document.");
    } finally {
      setIsExtractingResume(false);
      if (resumeFileInputRef.current) {
        resumeFileInputRef.current.value = "";
      }
    }
  };

  // Handle Job Description File Upload (PDF / DOCX / TXT)
  const handleJdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Job Description file size exceeds 10MB limit.");
      return;
    }

    setJdFileName(file.name);
    setError(null);
    setIsExtractingJd(true);

    try {
      const lowerName = file.name.toLowerCase();
      const isPlain =
        lowerName.endsWith(".txt") ||
        lowerName.endsWith(".md") ||
        file.type.includes("text/plain");

      if (isPlain) {
        const text = await file.text();
        setJobText(text);
        setActiveJdTab("paste");
      } else {
        const buffer = await file.arrayBuffer();
        const base64Data = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        const res = await api.extractDocument({
          base64Data,
          mimeType: file.type || (lowerName.endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
          fileName: file.name,
        });

        if (res.text && res.text.trim().length > 0) {
          setJobText(res.text.trim());
          setActiveJdTab("paste");
        } else {
          throw new Error("Could not extract readable text from job description document.");
        }
      }
    } catch (err: any) {
      console.error("Job description file extraction error:", err);
      setError(err.message || "Failed to extract text from the uploaded job description document.");
    } finally {
      setIsExtractingJd(false);
      if (jdFileInputRef.current) {
        jdFileInputRef.current.value = "";
      }
    }
  };

  const handleSelectPreset = (sampleId: string, track: JobTrack) => {
    setSelectedTrack(track);
    const found = samples.find((s) => s.id === sampleId);
    if (found) {
      setResumeText(found.resume);
      setJobText(found.jobDescription);
      setResumeFileName(null);
      setJdFileName(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resumeText.trim() || resumeText.trim().length < 30) {
      setError("Please provide a complete candidate resume (minimum 30 characters).");
      return;
    }

    if (!jobText.trim() || jobText.trim().length < 30) {
      setError("Please provide a valid job description (minimum 30 characters).");
      return;
    }

    try {
      await onAnalyze(resumeText, jobText, selectedTrack || "TECHNICAL", linkedInData);
    } catch (err: any) {
      setError(err.message || "Failed to process career readiness analysis.");
    }
  };

  // If no track selected yet, show Step 1: Track Selection Screen!
  if (!selectedTrack) {
    return (
      <TrackSelectionScreen
        onSelectTrack={(track) => setSelectedTrack(track)}
        onSelectPreset={handleSelectPreset}
        samples={samples}
        onBackToLanding={onBackToLanding}
      />
    );
  }

  // Filter samples matching active track
  const activeTrackSamples = samples.filter((s) =>
    selectedTrack === "NON_TECHNICAL"
      ? s.track === "NON_TECHNICAL"
      : !s.track || s.track === "TECHNICAL"
  );

  const isTechnical = selectedTrack === "TECHNICAL";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back navigation buttons for transparency */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          id="btn-back-to-track-selection"
          onClick={() => setSelectedTrack(null)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>&larr; Back to Role Selection</span>
        </button>

        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Home
          </button>
        )}
      </div>

      {/* Top Track Banner / Switcher */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${
              isTechnical ? "bg-indigo-600" : "bg-violet-600"
            }`}
          >
            {isTechnical ? <Code2 className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                  isTechnical
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "bg-violet-50 text-violet-700 border border-violet-200"
                }`}
              >
                {isTechnical ? (
                  <>
                    <Cpu className="h-3 w-3" /> Technical JD Track
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-3 w-3" /> Non-Technical & Business Track
                  </>
                )}
              </span>
              <span className="text-xs text-slate-600">Active Analysis Mode</span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {isTechnical
                ? "Optimized for programming languages, systems design, cloud architectures & technical tools."
                : "Optimized for measurable business KPIs, stakeholder leadership, strategy & operational impact."}
            </p>
          </div>
        </div>

        {/* Change Track Action */}
        <button
          type="button"
          id="btn-switch-track"
          onClick={() => setSelectedTrack(null)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
          <span>Change Track</span>
        </button>
      </div>

      {/* Quick Sample Selector Bar for Active Track */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-700 uppercase">
              Prefill with verified {isTechnical ? "engineering" : "business"} benchmark:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTrackSamples.map((s) => (
              <button
                key={s.id}
                type="button"
                id={`sample-pill-${s.id}`}
                onClick={() => {
                  setResumeText(s.resume);
                  setJobText(s.jobDescription);
                  setResumeFileName(null);
                  setJdFileName(null);
                  setError(null);
                }}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                  isTechnical
                    ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300"
                }`}
              >
                {s.name.split("(")[0].trim()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ================= 1. Candidate Resume Panel ================= */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="resume-text-input" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>1. Candidate Resume</span>
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  id="tab-resume-paste"
                  onClick={() => setActiveResumeTab("paste")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeResumeTab === "paste"
                      ? "bg-white font-bold text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Text / Markdown
                </button>
                <button
                  type="button"
                  id="tab-resume-upload"
                  onClick={() => setActiveResumeTab("upload")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeResumeTab === "upload"
                      ? "bg-white font-bold text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Upload Document
                </button>
              </div>
            </div>

            {activeResumeTab === "upload" ? (
              <div
                onClick={() => !isExtractingResume && resumeFileInputRef.current?.click()}
                className={`flex-1 min-h-[320px] rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center p-6 text-center cursor-pointer ${
                  isExtractingResume
                    ? "border-indigo-400 bg-indigo-50/40 cursor-wait"
                    : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400"
                }`}
              >
                <input
                  ref={resumeFileInputRef}
                  type="file"
                  accept=".txt,.pdf,.docx,.doc,.md"
                  onChange={handleResumeFileUpload}
                  disabled={isExtractingResume}
                  className="hidden"
                  id="resume-file-picker"
                />
                {isExtractingResume ? (
                  <>
                    <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                    <span className="text-sm font-bold text-indigo-900 tabular-nums">
                      Extracting Text from Resume... {numericExtractPercent}% (~{estimatedExtractSec}s left)
                    </span>
                    <div className="w-48 h-1.5 bg-indigo-100 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-150"
                        style={{ width: `${numericExtractPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-indigo-600 mt-1.5 max-w-xs">
                      Parsing document structure, skills, and experience via Gemini.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                      <FileUp className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      {resumeFileName ? resumeFileName : "Click or drag resume file here"}
                    </span>
                    <p className="text-xs text-slate-600 mt-1 max-w-xs">
                      Supports PDF, DOCX, TXT, Markdown (up to 10MB). Text is parsed into structured sections.
                    </p>
                    {resumeFileName && (
                      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> File Loaded ({resumeText.length} chars)
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <textarea
                  id="resume-text-input"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder={
                    isTechnical
                      ? "Paste candidate resume text here including technical experience, GitHub/projects, programming languages, databases, cloud tools, education, and dates..."
                      : "Paste candidate resume text here including professional roles, quantifiable business achievements ($ ARR, % growth, ROI), leadership, stakeholder management, education, and certifications..."
                  }
                  rows={14}
                  className="w-full flex-1 rounded-xl border border-slate-200 p-3.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none leading-relaxed"
                />
                <div className="flex justify-between items-center mt-2 text-[11px] text-slate-600 font-mono">
                  <span>
                    {resumeFileName ? `Imported from: ${resumeFileName}` : "Direct input"}
                  </span>
                  <span>{resumeText.length} characters</span>
                </div>
              </div>
            )}
          </div>

          {/* ================= 2. Target Job Description Panel (Supports PDF / DOCX / TXT) ================= */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="job-text-input" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className={`h-4 w-4 ${isTechnical ? "text-violet-600" : "text-emerald-600"}`} />
                <span>2. Target Job Description</span>
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  id="tab-jd-paste"
                  onClick={() => setActiveJdTab("paste")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeJdTab === "paste"
                      ? "bg-white font-bold text-violet-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Text / Markdown
                </button>
                <button
                  type="button"
                  id="tab-jd-upload"
                  onClick={() => setActiveJdTab("upload")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeJdTab === "upload"
                      ? "bg-white font-bold text-violet-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Upload Document
                </button>
              </div>
            </div>

            {activeJdTab === "upload" ? (
              <div
                onClick={() => !isExtractingJd && jdFileInputRef.current?.click()}
                className={`flex-1 min-h-[320px] rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center p-6 text-center cursor-pointer ${
                  isExtractingJd
                    ? "border-violet-400 bg-violet-50/40 cursor-wait"
                    : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-violet-400"
                }`}
              >
                <input
                  ref={jdFileInputRef}
                  type="file"
                  accept=".txt,.pdf,.docx,.doc,.md"
                  onChange={handleJdFileUpload}
                  disabled={isExtractingJd}
                  className="hidden"
                  id="jd-file-picker"
                />
                {isExtractingJd ? (
                  <>
                    <div className="h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                    <span className="text-sm font-bold text-violet-900 tabular-nums">
                      Extracting Text from Job Description... {numericExtractPercent}% (~{estimatedExtractSec}s left)
                    </span>
                    <div className="w-48 h-1.5 bg-violet-100 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-violet-600 transition-all duration-150"
                        style={{ width: `${numericExtractPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-violet-600 mt-1.5 max-w-xs">
                      Extracting job responsibilities, mandatory skills, and requirements via Gemini.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
                      <FileUp className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      {jdFileName ? jdFileName : "Click or drag Job Description (PDF / Word) here"}
                    </span>
                    <p className="text-xs text-slate-600 mt-1 max-w-xs">
                      Supports PDF, DOCX, TXT, Markdown (up to 10MB). Text is parsed into job requirements and gating criteria.
                    </p>
                    {jdFileName && (
                      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> JD Loaded ({jobText.length} chars)
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <textarea
                  id="job-text-input"
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder={
                    isTechnical
                      ? "Paste technical job description here: role title, required tech stack (languages, frameworks, cloud), systems responsibilities, and qualifications..."
                      : "Paste business/non-technical job description here: role title, key responsibilities, business KPIs, cross-functional collaboration, and qualifications..."
                  }
                  rows={14}
                  className="w-full flex-1 rounded-xl border border-slate-200 p-3.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-none leading-relaxed"
                />
                <div className="flex justify-between items-center mt-2 text-[11px] text-slate-600 font-mono">
                  <span>
                    {jdFileName ? `Imported from: ${jdFileName}` : "Target role specification"}
                  </span>
                  <span>{jobText.length} characters</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= 3. LinkedIn Profile Connection & Verified Skill Extraction (Optional, User-Authorized) ================= */}
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/50 via-white to-indigo-50/30 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A66C2] text-white shadow-sm">
                <Linkedin className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    3. Connect LinkedIn Profile &amp; Extract Verified Skills
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-900 border border-sky-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#0A66C2]" />
                    User-Authorized &bull; Zero Scraping
                  </span>
                  {linkedInData && linkedInData.extractedSkills.filter((s) => s.included !== false).length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {linkedInData.extractedSkills.filter((s) => s.included !== false).length} LinkedIn Skills Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Import skills, certifications, and domain competencies from your LinkedIn profile that might be missing from your uploaded resume.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                id="btn-connect-linkedin-oauth"
                onClick={handleConnectLinkedInOAuth}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A66C2] hover:bg-[#004182] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
              >
                <Linkedin className="h-3.5 w-3.5" />
                <span>Connect LinkedIn OAuth</span>
              </button>
              <button
                type="button"
                onClick={() => linkedInFileInputRef.current?.click()}
                disabled={isExtractingLinkedIn}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white hover:bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-900 transition-colors cursor-pointer"
              >
                <FileUp className="h-3.5 w-3.5 text-[#0A66C2]" />
                <span>Upload LinkedIn PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLinkedInPanel((prev) => !prev)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                {showLinkedInPanel ? "Hide Details" : "Configure"}
              </button>
            </div>
          </div>

          <input
            ref={linkedInFileInputRef}
            type="file"
            accept=".pdf,.txt,.docx,.md"
            onChange={handleLinkedInPdfUpload}
            className="hidden"
            id="linkedin-pdf-picker"
          />

          {linkedInNotice && (
            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/90 px-3.5 py-2.5 text-xs text-sky-950 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#0A66C2] shrink-0" />
                <span>{linkedInNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setLinkedInNotice(null)}
                className="text-xs font-bold text-sky-700 hover:text-sky-950"
              >
                Dismiss
              </button>
            </div>
          )}

          {showLinkedInPanel && (
            <div className="mt-4 pt-4 border-t border-sky-200/70 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      LinkedIn Profile URL (included in Resume Header)
                    </label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="url"
                        value={linkedInUrl}
                        onChange={(e) => setLinkedInUrl(e.target.value)}
                        placeholder="https://www.linkedin.com/in/your-profile"
                        className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      LinkedIn Headline / Current Role Focus (Optional)
                    </label>
                    <input
                      type="text"
                      value={linkedInHeadline}
                      onChange={(e) => setLinkedInHeadline(e.target.value)}
                      placeholder="e.g., Senior Full-Stack Engineer | Cloud Architecture | React & Node.js"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Paste LinkedIn &ldquo;Skills&rdquo;, &ldquo;About&rdquo;, or Profile Text
                    </label>
                    {linkedInPdfName && (
                      <span className="text-xs font-semibold text-emerald-700">
                        Loaded: {linkedInPdfName}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={linkedInRawText}
                    onChange={(e) => setLinkedInRawText(e.target.value)}
                    rows={3}
                    placeholder="Paste your LinkedIn Skills list, About summary, or upload your LinkedIn 'Save to PDF' export to extract verified skills..."
                    className="w-full flex-1 rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      Only verified professional skills you authorize are merged into your resume.
                    </span>
                    <button
                      type="button"
                      id="btn-extract-linkedin-skills"
                      onClick={handleExtractLinkedInSkills}
                      disabled={isExtractingLinkedIn || (!linkedInRawText.trim() && !linkedInHeadline.trim() && !linkedInUrl.trim())}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-50 px-3.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      {isExtractingLinkedIn ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Extracting Skills...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Extract &amp; Verify Skills</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Extracted & Verified LinkedIn Skills Review Bar */}
              {linkedInData && (
                <div className="rounded-xl border border-sky-200 bg-white p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Verified LinkedIn Skills (Click to include/exclude in Resume &amp; ATS Analysis):
                      </span>
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-900">
                        {linkedInData.extractedSkills.filter((s) => s.included !== false).length} selected
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLinkedInData(undefined)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Disconnect LinkedIn Data</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {linkedInData.extractedSkills.map((sk) => {
                      const active = sk.included !== false;
                      return (
                        <button
                          key={sk.name}
                          type="button"
                          onClick={() => handleToggleLinkedInSkill(sk.name)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? "border-sky-400 bg-sky-50 text-sky-950 shadow-2xs"
                              : "border-slate-200 bg-slate-50 text-slate-400 line-through"
                          }`}
                        >
                          <Check className={`h-3 w-3 ${active ? "text-[#0A66C2]" : "opacity-0"}`} />
                          <span>{sk.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick add individual LinkedIn skill */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newLinkedInSkillInput}
                      onChange={(e) => setNewLinkedInSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddLinkedInSkillManual();
                        }
                      }}
                      placeholder="Add another verified skill from your LinkedIn profile..."
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddLinkedInSkillManual}
                      disabled={!newLinkedInSkillInput.trim()}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Skill</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Action Banner */}
        <div
          className={`flex flex-col gap-4 rounded-2xl border p-5 ${
            isTechnical
              ? "border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-violet-50/70"
              : "border-violet-100 bg-gradient-to-r from-violet-50/70 to-purple-50/70"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                  isTechnical ? "bg-indigo-600" : "bg-violet-600"
                }`}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Deterministic Career Readiness Engine &bull; {isTechnical ? "Technical Track" : "Non-Technical Track"}
                </h3>
                <p className="text-xs text-slate-600">
                  Extracts canonical skills &bull; Evaluates evidence hierarchy &bull; Zero fabrication guarantee
                </p>
              </div>
            </div>

            <button
              type="submit"
              id="run-analysis-submit-btn"
              disabled={isLoading || isExtractingResume || isExtractingJd}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-md disabled:opacity-90 transition-all cursor-pointer ${
                isTechnical
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                  : "bg-violet-600 hover:bg-violet-700 shadow-violet-200"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white shrink-0" />
                  <span className="font-semibold tracking-wide">
                    {loadingSteps[loadingStep]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-0.5 text-xs font-black text-white tabular-nums">
                    {numericPercent}% &bull; ~{estimatedRemainingSec}s
                  </span>
                </>
              ) : (
                <>
                  <span>Run {isTechnical ? "Technical" : "Non-Technical"} Readiness Analysis</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {isLoading && (
            <div className="rounded-xl bg-white/90 border border-indigo-200/80 p-3.5 shadow-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-black text-white tabular-nums ${
                      isTechnical ? "bg-indigo-600" : "bg-violet-600"
                    }`}
                  >
                    {numericPercent}%
                  </span>
                  <span className="font-bold text-slate-900">
                    Stage {loadingStep + 1} of {loadingSteps.length}: {loadingSteps[loadingStep]}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-600 tabular-nums">
                  Estimated time remaining: ~{estimatedRemainingSec}s
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    isTechnical
                      ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500"
                      : "bg-gradient-to-r from-violet-600 via-purple-600 to-violet-500"
                  }`}
                  style={{ width: `${numericPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
