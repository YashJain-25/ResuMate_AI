import React, { useState, useMemo, useEffect } from "react";
import {
  AnalysisRecord,
  MatchStatus,
  ParsedResume,
} from "../types.js";
import {
  AlertTriangle,
  Award,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ExternalLink,
  FileCheck2,
  FolderGit2,
  Github,
  Globe,
  GraduationCap,
  HelpCircle,
  Info,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  User,
  X,
  XCircle,
  ArrowRight,
} from "lucide-react";

interface ParsedResumeViewProps {
  analysis: AnalysisRecord;
  onProceedToDashboard: () => void;
  onProceedToAtsResume: (confirmedSkills?: string[]) => void;
  onReviewSkillGaps?: () => void;
  onOpenSkillProfile?: () => void;
  onNewAnalysis: () => void;
  onBackToAnalyze?: () => void;
  onPrintResume?: (confirmedSkills?: string[]) => void;
  isGeneratingResume?: boolean;
  onUpdateAnalysis?: (updated: AnalysisRecord) => void;
}

export const ParsedResumeView: React.FC<ParsedResumeViewProps> = ({
  analysis,
  onProceedToDashboard,
  onProceedToAtsResume,
  onReviewSkillGaps,
  onOpenSkillProfile,
  onNewAnalysis,
  onBackToAnalyze,
  onPrintResume,
  isGeneratingResume = false,
  onUpdateAnalysis,
}) => {
  const [evidenceFilter, setEvidenceFilter] = useState<"ALL" | MatchStatus>("ALL");
  const [showEvidencePanel, setShowEvidencePanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSkipDisclaimerModal, setShowSkipDisclaimerModal] = useState(false);
  const [acknowledgedSkip, setAcknowledgedSkip] = useState(false);

  // Real-time Candidate Checklist State
  // Allows candidate to confirm competencies they possess that weren't detected in document text
  const [confirmedSkills, setConfirmedSkills] = useState<Map<string, { confirmed: boolean; note?: string }>>(
    new Map()
  );

  const resume = analysis.parsedResume || ({} as ParsedResume);
  const personal = resume.personalInfo || {};
  const job = analysis.parsedJob || { requirements: [] };
  const matches = analysis.skillMatches || [];

  // Build high-speed lookup map for JD-matched skills
  // Checks canonical names, aliases, and exact requirement strings
  const matchedSkillMap = useMemo(() => {
    const map = new Map<string, { status: MatchStatus; requirement: string; evidence?: string }>();

    matches.forEach((m) => {
      if (m.matched || m.matchStatus === "MATCHED" || m.matchStatus === "PARTIALLY_MATCHED") {
        const reqName = m.requirement?.skill || "";
        const candSkill = m.candidateSkill || reqName;
        const status: MatchStatus =
          m.matchStatus || (m.status === "strong" ? "MATCHED" : "PARTIALLY_MATCHED");

        map.set(candSkill.toLowerCase().trim(), {
          status,
          requirement: reqName,
          evidence: m.resumeEvidence || m.evidenceSnippets?.[0],
        });

        if (reqName) {
          map.set(reqName.toLowerCase().trim(), {
            status,
            requirement: reqName,
            evidence: m.resumeEvidence || m.evidenceSnippets?.[0],
          });
        }
      }
    });

    return map;
  }, [matches]);

  const checkSkillMatch = (skillName: string) => {
    if (!skillName) return null;
    const key = skillName.toLowerCase().trim();
    if (matchedSkillMap.has(key)) {
      return matchedSkillMap.get(key);
    }
    // Partial substring or canonical match
    for (const [mKey, val] of matchedSkillMap.entries()) {
      if (key.includes(mKey) || mKey.includes(key)) {
        return val;
      }
    }
    return null;
  };

  // Base stats calculation from original parser run
  const totalSkills = resume.skills?.length || 0;
  const baseMatchedSkillsCount = (resume.skills || []).filter((s) => Boolean(checkSkillMatch(s))).length;
  const baseMatchedReqsCount = matches.filter(
    (m) => m.matchStatus === "MATCHED" || m.status === "strong"
  ).length;
  const basePartialReqsCount = matches.filter(
    (m) => m.matchStatus === "PARTIALLY_MATCHED" || m.status === "weak"
  ).length;
  const baseMissingReqsCount = matches.filter(
    (m) => m.matchStatus === "NOT_FOUND" || m.status === "missing"
  ).length;

  // Toggle skill confirmation by candidate checklist
  const toggleSkillConfirmation = (skillName: string) => {
    const key = skillName.toLowerCase().trim();
    setConfirmedSkills((prev) => {
      const next = new Map(prev);
      const cur = next.get(key) as { confirmed?: boolean } | undefined;
      if (cur && cur.confirmed) {
        next.delete(key);
      } else {
        next.set(key, { confirmed: true });
      }
      return next;
    });
  };

  const handleSelectAllMissing = () => {
    setConfirmedSkills((prev) => {
      const next = new Map(prev);
      matches.forEach((m) => {
        const isBaseMatched = m.matchStatus === "MATCHED" || m.status === "strong";
        if (!isBaseMatched) {
          next.set(m.requirement.skill.toLowerCase().trim(), { confirmed: true });
        }
      });
      return next;
    });
  };

  const handleResetConfirmations = () => {
    setConfirmedSkills(new Map());
  };

  // Runtime Candidate Confirmation Adjustments
  const userConfirmedMatches = matches.filter((m) => {
    const isBaseMatched = m.matchStatus === "MATCHED" || m.status === "strong";
    return !isBaseMatched && confirmedSkills.get(m.requirement.skill.toLowerCase().trim())?.confirmed;
  });
  const userConfirmedCount = userConfirmedMatches.length;

  const totalRequirements = matches.length || job.requirements?.length || 1;
  const effectiveMatchedReqsCount = baseMatchedReqsCount + userConfirmedCount;
  const effectiveMissingReqsCount = Math.max(0, baseMissingReqsCount - userConfirmedCount);
  const effectivePartialReqsCount = basePartialReqsCount;

  // Live real-time ATS match percentage
  const liveAtsPercentage = Math.min(
    100,
    Math.round((effectiveMatchedReqsCount / totalRequirements) * 100)
  );

  // Live overall readiness score: proportionally elevates initial score towards 100 as candidate confirms skills
  const baseReadinessScore =
    analysis.readiness?.overallScore ??
    Math.round((baseMatchedReqsCount / totalRequirements) * 100);
  const totalUnmatched = Math.max(1, totalRequirements - baseMatchedReqsCount);
  const scoreBoostPerReq = (100 - baseReadinessScore) / totalUnmatched;
  const liveOverallScore = Math.min(
    100,
    Math.round(baseReadinessScore + userConfirmedCount * scoreBoostPerReq)
  );

  // All confirmed skills to pass to ATS resume generator
  const allEffectiveConfirmedSkills = useMemo(() => {
    const list: string[] = [...(resume.skills || [])];
    matches.forEach((m) => {
      const isBase = m.matchStatus === "MATCHED" || m.status === "strong";
      const isConfirmed = confirmedSkills.get(m.requirement.skill.toLowerCase().trim())?.confirmed;
      if (isBase || isConfirmed) {
        list.push(m.requirement.skill);
        if (m.candidateSkill) list.push(m.candidateSkill);
      }
    });
    return Array.from(new Set(list.filter(Boolean)));
  }, [resume.skills, matches, confirmedSkills]);

  // Propagate runtime updates to parent analysis if listener provided
  useEffect(() => {
    if (onUpdateAnalysis && userConfirmedCount > 0) {
      const updatedMatches = matches.map((m) => {
        const key = m.requirement.skill.toLowerCase().trim();
        const isConfirmed = confirmedSkills.get(key)?.confirmed;
        if (isConfirmed && !(m.matchStatus === "MATCHED" || m.status === "strong")) {
          return {
            ...m,
            matchStatus: "MATCHED" as MatchStatus,
            status: "strong" as const,
            matched: true,
            evidenceStrength: "HIGH" as const,
            resumeEvidence: `Candidate confirmed active proficiency in ${m.requirement.skill}.`,
          };
        }
        return m;
      });

      onUpdateAnalysis({
        ...analysis,
        skillMatches: updatedMatches,
        readiness: {
          ...analysis.readiness,
          overallScore: liveOverallScore,
          state:
            liveOverallScore >= 80
              ? "ROLE_READY"
              : liveOverallScore >= 60
              ? "TARGETED_GAPS"
              : "FOUNDATIONAL_GAPS",
          explanation: `ATS score recalculated in real-time with ${userConfirmedCount} candidate-confirmed competencies. Live alignment: ${liveOverallScore}%.`,
        },
      });
    }
  }, [confirmedSkills]);

  const filteredMatches = matches.filter((m) => {
    const key = m.requirement.skill.toLowerCase().trim();
    const isConfirmed = Boolean(confirmedSkills.get(key)?.confirmed);
    const baseStatus: MatchStatus =
      m.matchStatus ||
      (m.status === "strong" ? "MATCHED" : m.status === "weak" ? "PARTIALLY_MATCHED" : "NOT_FOUND");
    const effectiveStatus: MatchStatus = isConfirmed ? "MATCHED" : baseStatus;

    if (evidenceFilter !== "ALL" && effectiveStatus !== evidenceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.requirement.skill.toLowerCase().includes(q) ||
        (m.resumeEvidence || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleGenerateResumeClick = () => {
    if (effectiveMissingReqsCount > 0 && liveOverallScore < 80) {
      setShowSkipDisclaimerModal(true);
    } else {
      onProceedToAtsResume(allEffectiveConfirmedSkills);
    }
  };

  const handleConfirmSkipAndGenerate = () => {
    setShowSkipDisclaimerModal(false);
    onProceedToAtsResume(allEffectiveConfirmedSkills);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Back Navigation Bar for Step Transparency */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            id="btn-parsed-back-to-input"
            onClick={onBackToAnalyze || onNewAnalysis}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-white transition-colors border border-transparent hover:border-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>&larr; Back to Input &amp; Track Selection</span>
          </button>
          
          <button
            type="button"
            onClick={onProceedToDashboard}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Readiness Dashboard &rarr;
          </button>
        </div>

        {/* TOP STATUS BANNER & SEQUENCE NAV */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Zero-Hallucination Verified Data • Candidate Interactive
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Parsed Resume Data & JD Alignment
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Transparent verification layer. Review extracted skills from your document and confirm
                any additional competencies in the checklist below to instantly update your ATS score.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {onPrintResume && (
                <button
                  type="button"
                  id="btn-top-print-ats-resume"
                  onClick={() => onPrintResume(allEffectiveConfirmedSkills)}
                  disabled={isGeneratingResume}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-xs transition-all disabled:opacity-75"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>Print ATS Resume</span>
                </button>
              )}
              {onOpenSkillProfile && (
                <button
                  type="button"
                  id="btn-parsed-open-skill-profile"
                  onClick={onOpenSkillProfile}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold text-xs shadow-xs transition-all"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Skill Profile &amp; Job Roles</span>
                </button>
              )}
              {onReviewSkillGaps && effectiveMissingReqsCount > 0 && (
                <button
                  type="button"
                  id="btn-review-skill-gaps"
                  onClick={onReviewSkillGaps}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs shadow-xs transition-all"
                >
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>Review Gaps ({effectiveMissingReqsCount})</span>
                </button>
              )}
              <button
                type="button"
                onClick={onProceedToDashboard}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-all"
              >
                <span>Readiness Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                id="btn-top-generate-ats-resume"
                onClick={handleGenerateResumeClick}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                  liveOverallScore >= 80
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-300"
                }`}
              >
                <FileCheck2 className="h-4 w-4 text-emerald-400" />
                <span>Generate ATS Resume ({liveOverallScore}/100)</span>
              </button>
            </div>
          </div>

          {/* METRIC PILLS WITH RUNTIME CALCULATION */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Resume Skills Extracted
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{totalSkills}</span>
                <span className="text-xs text-slate-600">items</span>
              </div>
            </div>

            <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-200/80">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                <span>Active JD Skills</span>
                {userConfirmedCount > 0 && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                    +{userConfirmedCount} confirmed
                  </span>
                )}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-700">
                  {baseMatchedSkillsCount + userConfirmedCount}
                </span>
                <span className="text-xs text-emerald-700 font-medium">aligned</span>
              </div>
            </div>

            <div className="bg-indigo-50/70 rounded-xl p-3.5 border border-indigo-200/80">
              <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">
                Live ATS Match
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-indigo-900">{liveOverallScore}</span>
                <span className="text-xs text-indigo-700 font-bold">/ 100</span>
              </div>
            </div>

            <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200/80">
              <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                JD Requirements Match
              </span>
              <div className="flex items-baseline gap-1 mt-1 text-xs font-bold text-amber-950">
                <span className="text-emerald-700">{effectiveMatchedReqsCount} Matched</span> •
                <span className="text-amber-700">{effectivePartialReqsCount} Partial</span> •
                <span className="text-rose-700">{effectiveMissingReqsCount} Missing</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PARSED RESUME SECTIONS (1 TO 8 AS SPECIFIED IN MANDATE) */}
        {/* ========================================================= */}

        {/* ========================================================= */}
        {/* DYNAMICALLY DETECTED RESUME HEADINGS BANNER               */}
        {/* ========================================================= */}
        <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>100% Information Preservation &amp; Dynamic Resume Headings Active</span>
            </div>
            <p className="text-xs text-slate-600">
              All original sections, headings, qualifications, and bullet points from your uploaded resume are preserved and prioritized around the target Job Description.
            </p>
          </div>
          {resume.detectedHeadings && resume.detectedHeadings.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {resume.detectedHeadings.map((h, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-900 text-[11px] font-bold shadow-2xs"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 1. HEADER + CONTACT DETAILS */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold text-slate-900">Header + Contact Details</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Source-Extracted</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <User className="h-4 w-4 text-indigo-600 shrink-0" />
              <div className="overflow-hidden">
                <div className="text-xs text-slate-500 font-medium">Full Name</div>
                <div className="font-semibold text-slate-900 truncate">
                  {personal.fullName || <span className="text-slate-400 italic">Not Specified</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Mail className="h-4 w-4 text-indigo-600 shrink-0" />
              <div className="overflow-hidden">
                <div className="text-xs text-slate-500 font-medium">Email</div>
                <div className="font-semibold text-slate-900 truncate">
                  {personal.email || <span className="text-slate-400 italic">Not Found</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Phone className="h-4 w-4 text-indigo-600 shrink-0" />
              <div className="overflow-hidden">
                <div className="text-xs text-slate-500 font-medium">Phone Number</div>
                <div className="font-semibold text-slate-900 truncate">
                  {personal.phone || <span className="text-slate-400 italic">Not Found</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <MapPin className="h-4 w-4 text-indigo-600 shrink-0" />
              <div className="overflow-hidden">
                <div className="text-xs text-slate-500 font-medium">Location</div>
                <div className="font-semibold text-slate-900 truncate">
                  {personal.location || <span className="text-slate-400 italic">Not Specified</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Linkedin className="h-4 w-4 text-indigo-600 shrink-0" />
              <div className="overflow-hidden">
                <div className="text-xs text-slate-500 font-medium">LinkedIn</div>
                <div className="font-semibold text-slate-900 truncate">
                  {personal.linkedin || analysis.linkedInData?.profileUrl ? (
                    <a
                      href={
                        (personal.linkedin || analysis.linkedInData?.profileUrl || "").startsWith("http")
                          ? (personal.linkedin || analysis.linkedInData?.profileUrl)
                          : `https://${personal.linkedin || analysis.linkedInData?.profileUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <span>{personal.linkedin || analysis.linkedInData?.profileUrl}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Not Found</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Github className="h-4 w-4 text-indigo-600 shrink-0" />
              <div className="overflow-hidden">
                <div className="text-xs text-slate-500 font-medium">GitHub</div>
                <div className="font-semibold text-slate-900 truncate">
                  {personal.github ? (
                    <a
                      href={personal.github.startsWith("http") ? personal.github : `https://${personal.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <span>{personal.github}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Not Found</span>
                  )}
                </div>
              </div>
            </div>

            {personal.portfolio && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 md:col-span-2 lg:col-span-3">
                <Globe className="h-4 w-4 text-indigo-600 shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-xs text-slate-500 font-medium">Portfolio / Website</div>
                  <div className="font-semibold text-slate-900 truncate">
                    <a
                      href={personal.portfolio.startsWith("http") ? personal.portfolio : `https://${personal.portfolio}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <span>{personal.portfolio}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. PROFILE / DYNAMIC SUMMARY HEADING */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {resume.sectionHeadings?.summary || "Profile / Summary"}
                </h2>
                {resume.sectionHeadings?.summary && (
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    Detected Resume Heading: "{resume.sectionHeadings.summary}"
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">Verbatim Resume Text</span>
          </div>

          {resume.summary ? (
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-normal">
              {resume.summary}
            </p>
          ) : (
            <div className="text-sm text-slate-400 italic p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              No profile/summary section present in the uploaded resume.
            </div>
          )}
        </div>

        {/* 3. EDUCATION (DYNAMIC HEADING) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {resume.sectionHeadings?.education || "Education"}
                </h2>
                {resume.sectionHeadings?.education && (
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    Detected Resume Heading: "{resume.sectionHeadings.education}"
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {resume.education?.length || 0} Entries Found
            </span>
          </div>

          {resume.education && resume.education.length > 0 ? (
            <div className="space-y-3">
              {resume.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-indigo-600" />
                      <span className="font-bold text-slate-900 text-sm">{edu.degree}</span>
                    </div>
                    <div className="text-xs text-slate-600 pl-6">
                      <span className="font-medium text-slate-800">{edu.institution}</span>
                      {edu.location && <span> • {edu.location}</span>}
                      {edu.fieldOfStudy && <span> • Major: {edu.fieldOfStudy}</span>}
                    </div>
                    {edu.details && (
                      <div className="text-xs text-slate-500 pl-6 pt-1">{edu.details}</div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center pl-6 sm:pl-0">
                    {edu.year && (
                      <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-semibold">
                        {edu.year}
                      </span>
                    )}
                    {edu.gpa && (
                      <span className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold">
                        GPA: {edu.gpa}
                      </span>
                    )}
                    {edu.percentage && (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                        {edu.percentage}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              No education entries found in the resume.
            </div>
          )}
        </div>

        {/* 4. CERTIFICATES (DYNAMIC HEADING) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {resume.sectionHeadings?.certifications || "Certificates"}
                </h2>
                {resume.sectionHeadings?.certifications && (
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    Detected Resume Heading: "{resume.sectionHeadings.certifications}"
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {resume.certifications?.length || 0} Certificates
            </span>
          </div>

          {resume.certifications && resume.certifications.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {resume.certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3"
                >
                  <Award className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate">{cert.name}</div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {cert.issuer && <span>Issued by: {cert.issuer}</span>}
                      {cert.year && <span> ({cert.year})</span>}
                    </div>
                    {cert.credentialId && (
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        ID: {cert.credentialId}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              No certifications listed in the resume.
            </div>
          )}
        </div>

        {/* 5. SKILLS WITH JD-MATCHED PRIORITIZATION & LINKEDIN / SOFT SKILLS */}
        {(() => {
          const allSkills = resume.skills || [];
          const matchedSkills = allSkills.filter((s) => Boolean(checkSkillMatch(s)));
          const unmatchedSkills = allSkills.filter((s) => !checkSkillMatch(s));
          // Order JD-matched skills FIRST, followed by all remaining candidate skills
          const prioritizedSkills = [...matchedSkills, ...unmatchedSkills];
          const linkedInSkills = analysis.linkedInData?.extractedSkills || [];

          return (
            <div className="bg-white rounded-2xl p-6 border-2 border-indigo-200/90 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    5
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {resume.sectionHeadings?.skills || "Skills"} — JD-Prioritized &amp; 100% Preserved
                    </h2>
                    <p className="text-xs text-slate-500">
                      JD-matching skills are prioritized first ({matchedSkills.length} JD-matched + {unmatchedSkills.length} additional resume skills preserved).
                    </p>
                  </div>
                </div>

                {/* Visual Legend */}
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    JD-Matched (Prioritized First)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    Preserved Resume Skill
                  </span>
                </div>
              </div>

              {prioritizedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {prioritizedSkills.map((skill, idx) => {
                    const matchInfo = checkSkillMatch(skill);
                    const isMatched = Boolean(matchInfo);

                    if (isMatched) {
                      return (
                        <div
                          key={idx}
                          className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border-2 border-emerald-500 font-bold text-xs shadow-sm transition-transform hover:scale-105"
                          title={`Matched against JD requirement: ${matchInfo?.requirement || skill}`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{skill}</span>
                          <span className="ml-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-600 text-white font-extrabold">
                            JD MATCH
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium"
                      >
                        <span>{skill}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  No skills section detected in the resume.
                </div>
              )}

              {/* Soft Skills subsection if present */}
              {resume.softSkills && resume.softSkills.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {resume.sectionHeadings?.softSkills || "Soft & Interpersonal Skills"} ({resume.softSkills.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resume.softSkills.map((ss, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50/70 text-indigo-900 border border-indigo-200 text-xs font-semibold"
                      >
                        {ss}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* LinkedIn Verified Skills subsection if connected */}
              {linkedInSkills.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-bold text-[#0A66C2] uppercase tracking-wider flex items-center gap-1.5">
                    <Linkedin className="h-3.5 w-3.5" />
                    <span>Authorized LinkedIn Profile Skills ({linkedInSkills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {linkedInSkills.map((ls, lIdx) => (
                      <span
                        key={lIdx}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                          ls.matchesJd
                            ? "bg-emerald-50 text-emerald-900 border-emerald-400"
                            : "bg-sky-50 text-sky-900 border-sky-200"
                        }`}
                      >
                        <span>{ls.name}</span>
                        {ls.matchesJd && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-600 text-white font-black">
                            JD
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 6. PROJECTS (DYNAMIC HEADING) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                6
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {resume.sectionHeadings?.projects || "Projects"}
                </h2>
                {resume.sectionHeadings?.projects && (
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    Detected Resume Heading: "{resume.sectionHeadings.projects}"
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {resume.projects?.length || 0} Projects Extracted
            </span>
          </div>

          {resume.projects && resume.projects.length > 0 ? (
            <div className="space-y-4">
              {resume.projects.map((proj, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="h-4 w-4 text-indigo-600" />
                      <span className="font-bold text-slate-900 text-sm">{proj.name}</span>
                      {proj.role && (
                        <span className="text-xs text-slate-500 italic">({proj.role})</span>
                      )}
                    </div>
                    {proj.link && (
                      <a
                        href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>View Project</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed pl-6 whitespace-pre-line">
                    {proj.description}
                  </p>

                  {proj.contributions && (
                    <div className="text-xs text-slate-600 pl-6">
                      <strong className="text-slate-800">Contributions: </strong>
                      {proj.contributions}
                    </div>
                  )}

                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-6 pt-1">
                      {proj.technologies.map((tech, tIdx) => {
                        const isMatched = Boolean(checkSkillMatch(tech));
                        return (
                          <span
                            key={tIdx}
                            className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                              isMatched
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : "bg-white text-slate-600 border border-slate-200"
                            }`}
                          >
                            {tech}
                            {isMatched && " ✓"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              No projects found in the resume.
            </div>
          )}
        </div>

        {/* 7. EXPERIENCE (DYNAMIC HEADING) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                7
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {resume.sectionHeadings?.experience || "Experience"}
                </h2>
                {resume.sectionHeadings?.experience && (
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    Detected Resume Heading: "{resume.sectionHeadings.experience}"
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {resume.experience?.length || 0} Positions Extracted
            </span>
          </div>

          {resume.experience && resume.experience.length > 0 ? (
            <div className="space-y-4">
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-indigo-600" />
                      <span className="font-bold text-slate-900 text-sm">{exp.title}</span>
                      <span className="text-xs text-slate-500">at {exp.company}</span>
                    </div>

                    <div className="text-xs text-slate-600 font-medium pl-6 sm:pl-0">
                      {exp.startDate || ""} {exp.startDate && (exp.endDate || exp.isCurrent) ? "–" : ""}{" "}
                      {exp.isCurrent ? "Present" : exp.endDate || ""}
                      {exp.location && <span> • {exp.location}</span>}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed pl-6 whitespace-pre-line">
                    {exp.description}
                  </p>

                  {exp.technologiesUsed && exp.technologiesUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-6 pt-1">
                      {exp.technologiesUsed.map((tech, tIdx) => {
                        const isMatched = Boolean(checkSkillMatch(tech));
                        return (
                          <span
                            key={tIdx}
                            className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                              isMatched
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : "bg-white text-slate-600 border border-slate-200"
                            }`}
                          >
                            {tech}
                            {isMatched && " ✓"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              No professional experience records found in the resume.
            </div>
          )}
        </div>

        {/* 8. ACADEMIC ACHIEVEMENTS (DYNAMIC HEADING) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                8
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {resume.sectionHeadings?.achievements || "Academic Achievements & Awards"}
                </h2>
                {resume.sectionHeadings?.achievements && (
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    Detected Resume Heading: "{resume.sectionHeadings.achievements}"
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {resume.academicAchievements?.length || 0} Achievements
            </span>
          </div>

          {resume.academicAchievements && resume.academicAchievements.length > 0 ? (
            <ul className="space-y-2 pl-2">
              {resume.academicAchievements.map((ach, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{ach}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-400 italic p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              No academic achievements section present in the resume.
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 9+. DYNAMICALLY DETECTED CUSTOM RESUME SECTIONS           */}
        {/* (Internships, Publications, Research, Volunteer, etc.)    */}
        {/* ========================================================= */}
        {resume.dynamicSections &&
          resume.dynamicSections.length > 0 &&
          resume.dynamicSections.map((dynSec, secIdx) => (
            <div
              key={dynSec.id || secIdx}
              className="bg-white rounded-2xl p-6 border border-indigo-200/80 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {9 + secIdx}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{dynSec.heading}</h2>
                    <span className="text-[11px] text-indigo-600 font-semibold">
                      Dynamic Section Preserved from Original Resume
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {dynSec.items?.length || 0} Entries Preserved
                </span>
              </div>

              <div className="space-y-3">
                {(dynSec.items || []).map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5"
                  >
                    {(item.title || item.subtitle || item.date) && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="font-bold text-slate-900 text-sm">
                          {item.title}
                          {item.subtitle && (
                            <span className="text-xs font-medium text-slate-600">
                              {" "}
                              • {item.subtitle}
                            </span>
                          )}
                        </div>
                        {item.date && (
                          <span className="text-xs font-semibold text-slate-500">{item.date}</span>
                        )}
                      </div>
                    )}
                    {item.bullets && item.bullets.length > 0 && (
                      <ul className="space-y-1 pl-2">
                        {item.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2 text-xs text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

        {/* ========================================================= */}
        {/* EVIDENCE-BASED JD MATCHING TRACEABILITY MATRIX */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Evidence-Based JD Requirement Traceability
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                  Zero Hallucination
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Every requirement mapped directly to resume evidence. Did the parser miss a skill you possess?
                <strong> Check the box on any skill</strong> to verify your proficiency and boost your ATS score at runtime.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSelectAllMissing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-colors"
                title="Mark all missing skills as candidate confirmed"
              >
                <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                <span>Check All Missing</span>
              </button>

              {userConfirmedCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetConfirmations}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
                  title="Reset candidate confirmed skills"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowEvidencePanel(!showEvidencePanel)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {showEvidencePanel ? (
                  <>
                    <span>Collapse</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Expand</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {showEvidencePanel && (
            <div className="space-y-3 pt-2">
              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEvidenceFilter("ALL")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      evidenceFilter === "ALL"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({matches.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceFilter("MATCHED")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      evidenceFilter === "MATCHED"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-emerald-700 hover:text-emerald-900"
                    }`}
                  >
                    Matched ({effectiveMatchedReqsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceFilter("PARTIALLY_MATCHED")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      evidenceFilter === "PARTIALLY_MATCHED"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-amber-700 hover:text-amber-900"
                    }`}
                  >
                    Partial ({effectivePartialReqsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceFilter("NOT_FOUND")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      evidenceFilter === "NOT_FOUND"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-rose-700 hover:text-rose-900"
                    }`}
                  >
                    Not Found ({effectiveMissingReqsCount})
                  </button>
                </div>

                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search requirement or evidence..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
                  />
                </div>
              </div>

              {/* Requirement Cards with Interactive Checklist */}
              <div className="space-y-2.5 mt-3">
                {filteredMatches.map((m, idx) => {
                  const skillKey = m.requirement.skill.toLowerCase().trim();
                  const isUserConfirmed = Boolean(confirmedSkills.get(skillKey)?.confirmed);
                  const isBaseMatched = m.matchStatus === "MATCHED" || m.status === "strong";
                  const isBasePartial = m.matchStatus === "PARTIALLY_MATCHED" || m.status === "weak";
                  const isEffectiveMatched = isBaseMatched || isUserConfirmed;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs transition-all ${
                        isBaseMatched
                          ? "bg-emerald-50/40 border-emerald-200"
                          : isUserConfirmed
                          ? "bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-200"
                          : isBasePartial
                          ? "bg-amber-50/40 border-amber-200"
                          : "bg-rose-50/30 border-rose-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isBaseMatched && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                          {isUserConfirmed && !isBaseMatched && (
                            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                          )}
                          {!isEffectiveMatched && isBasePartial && (
                            <HelpCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          )}
                          {!isEffectiveMatched && !isBasePartial && (
                            <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                          )}

                          <span className="font-bold text-slate-900 text-sm">
                            {m.requirement.skill}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                            {m.requirement.category || "Skill"}
                          </span>
                          {m.requirement.mandatory && (
                            <span className="text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                              Mandatory
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full font-extrabold uppercase text-[10px] tracking-wider ${
                              isBaseMatched
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : isUserConfirmed
                                ? "bg-indigo-100 text-indigo-900 border border-indigo-300"
                                : isBasePartial
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}
                          >
                            {isBaseMatched
                              ? "MATCHED"
                              : isUserConfirmed
                              ? "CANDIDATE CONFIRMED ✓"
                              : isBasePartial
                              ? "PARTIALLY MATCHED"
                              : "NOT FOUND"}
                          </span>
                          {m.resumeSection && (
                            <span className="text-slate-500 text-[11px] font-medium">
                              Section: <strong className="text-slate-700">{m.resumeSection}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Evidence Text Quotation */}
                      {m.resumeEvidence && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-white/80 border border-slate-200/80 text-slate-800 text-[11px] leading-relaxed">
                          <span className="font-semibold text-slate-600 block mb-0.5">Resume Evidence:</span>
                          <span className="italic">"{m.resumeEvidence}"</span>
                        </div>
                      )}

                      {/* Reasoning */}
                      <div className="mt-2 text-slate-600 text-[11px]">
                        <span className="font-medium text-slate-700">Reasoning: </span>
                        {isUserConfirmed && !isBaseMatched
                          ? "Candidate verified personal hands-on experience and proficiency. Enabled for ATS Resume inclusion."
                          : m.reasoning}
                      </div>

                      {/* INTERACTIVE CHECKLIST CONTROL */}
                      <div
                        className={`mt-3 pt-2.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isEffectiveMatched ? "border-indigo-100" : "border-slate-200"
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={isEffectiveMatched}
                            disabled={isBaseMatched}
                            onChange={() => {
                              if (!isBaseMatched) {
                                toggleSkillConfirmation(m.requirement.skill);
                              }
                            }}
                            className={`h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all ${
                              isBaseMatched ? "opacity-60 cursor-not-allowed text-emerald-600" : ""
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            {isBaseMatched ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                Verified in Original Resume
                              </span>
                            ) : isUserConfirmed ? (
                              <span className="text-indigo-700 font-bold flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                Candidate Knows This Skill • Active in ATS Match (+Score Boosted)
                              </span>
                            ) : (
                              <span className="group-hover:text-indigo-600 transition-colors">
                                I have this skill / competency{" "}
                                <span className="text-slate-400 font-normal">
                                  (Check to include in ATS resume & boost score)
                                </span>
                              </span>
                            )}
                          </span>
                        </label>

                        {!isBaseMatched && isUserConfirmed && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 self-start sm:self-auto">
                            + Added to ATS Resume
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* BOTTOM ACTION BAR - SIMPLIFIED, CLEAR, & INTUITIVE        */}
        {/* ========================================================= */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Left Side: Real-time ATS Match Status & Dynamic Feedback */}
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-base font-black text-slate-900 tracking-tight">
                  ATS Readiness & Resume Synthesis
                </span>

                {/* Dynamic Badge with live score */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 transition-all ${
                    liveOverallScore >= 80
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : liveOverallScore >= 50
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-rose-100 text-rose-800 border-rose-300"
                  }`}
                >
                  {liveOverallScore >= 80 && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />}
                  {liveOverallScore < 80 && liveOverallScore >= 50 && <Sparkles className="h-3.5 w-3.5 text-amber-700" />}
                  {liveOverallScore < 50 && <AlertTriangle className="h-3.5 w-3.5 text-rose-700" />}
                  <span>ATS Match: {liveOverallScore}/100</span>
                  <span className="font-normal opacity-80">
                    ({liveOverallScore >= 80 ? "Role Ready" : liveOverallScore >= 50 ? "Moderate Match" : "Gaps Present"})
                  </span>
                </span>

                {userConfirmedCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-600" />
                    <span>+{userConfirmedCount} skills confirmed by you (+{liveOverallScore - baseReadinessScore} pts)</span>
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xl">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
                  <span>
                    {effectiveMatchedReqsCount} of {totalRequirements} requirements satisfied ({liveAtsPercentage}%)
                  </span>
                  <span>Target: 80% to submit</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      liveOverallScore >= 80
                        ? "bg-emerald-500"
                        : liveOverallScore >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(6, liveOverallScore))}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">
                {effectiveMissingReqsCount > 0 ? (
                  <span>
                    💡 Have experience with missing skills? Check the boxes in the checklist above to include them and boost your score before generating.
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium">
                    ✓ All job requirements satisfied! Your resume is fully aligned for ATS screening.
                  </span>
                )}
              </p>
            </div>

            {/* Right Side: Primary Single Action + Grouped Secondary Links */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-bottom-generate-ats-resume"
                  onClick={handleGenerateResumeClick}
                  disabled={isGeneratingResume}
                  className={`px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2.5 ${
                    liveOverallScore >= 80
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                      : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200"
                  }`}
                >
                  <FileCheck2 className="h-5 w-5 text-emerald-400" />
                  <span>Generate ATS Resume ({liveOverallScore}/100)</span>
                  <ArrowRight className="h-4 w-4 opacity-80" />
                </button>

                {onPrintResume && (
                  <button
                    type="button"
                    title="Print ATS Resume directly"
                    onClick={() => onPrintResume(allEffectiveConfirmedSkills)}
                    disabled={isGeneratingResume}
                    className="p-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition-all flex items-center justify-center"
                  >
                    <Printer className="h-5 w-5 text-slate-600" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Clean Secondary Navigation Links */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onProceedToDashboard}
                className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
              >
                <span>View Full Readiness Score & Skill Breakdown</span>
                <ArrowRight className="h-3 w-3" />
              </button>

              {onReviewSkillGaps && effectiveMissingReqsCount > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={onReviewSkillGaps}
                    className="font-bold text-slate-700 hover:text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Practice Remaining Gaps ({effectiveMissingReqsCount})</span>
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onNewAnalysis}
              className="font-medium text-slate-500 hover:text-slate-800 hover:underline"
            >
              Analyze Different Resume / Job
            </button>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* INCOMPLETE TASKS / PRE-GENERATION DISCLAIMER MODAL       */}
      {/* ======================================================== */}
      {showSkipDisclaimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-amber-500 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-slate-950" />
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                  Incomplete Requirements Advisory
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSkipDisclaimerModal(false)}
                className="p-1 rounded-lg hover:bg-black/10 text-slate-950 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-slate-800">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Target: {job.jobTitle || "Target Role"} • Current Match: {liveOverallScore}/100
                </div>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  You haven't completed the tasks. Still want to generate resume?
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your resume currently has <strong>{effectiveMissingReqsCount} unverified requirements</strong> against this Job Description.
                  {userConfirmedCount > 0 && (
                    <span className="text-indigo-700 font-semibold"> (You have already self-confirmed {userConfirmedCount} skills).</span>
                  )}
                </p>
              </div>

              {effectiveMissingReqsCount > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Remaining Unverified Requirements:</span>
                    <span className="text-[11px] font-semibold text-rose-600">
                      {effectiveMissingReqsCount} Missing
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                    {matches
                      .filter((m) => {
                        const key = m.requirement.skill.toLowerCase().trim();
                        const isConfirmed = confirmedSkills.get(key)?.confirmed;
                        const isBaseMatched = m.matchStatus === "MATCHED" || m.status === "strong";
                        return !isBaseMatched && !isConfirmed;
                      })
                      .map((m, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[11px] font-medium"
                        >
                          {m.requirement.skill}
                        </span>
                      ))}
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    • <strong>Candidate Checklist Tip:</strong> You can close this modal and check off any skills above that you possess to automatically include them.
                  </p>
                </div>
              )}

              {/* Acknowledgment */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer text-xs text-amber-950">
                <input
                  type="checkbox"
                  id="chk-ack-parsed-incomplete-tasks"
                  checked={acknowledgedSkip}
                  onChange={(e) => setAcknowledgedSkip(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium leading-relaxed">
                  I understand that {effectiveMissingReqsCount} requirements are unverified. I still want to proceed and generate my tailored ATS resume with my {allEffectiveConfirmedSkills.length} confirmed skills.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowSkipDisclaimerModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition-colors w-full sm:w-auto text-center"
              >
                Back to Checklist / Skills
              </button>

              <button
                type="button"
                id="btn-confirm-parsed-skip-tasks-generate"
                onClick={handleConfirmSkipAndGenerate}
                disabled={!acknowledgedSkip}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <FileCheck2 className="h-4 w-4 text-emerald-400" />
                <span>Skip Remaining &amp; Generate Resume</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
