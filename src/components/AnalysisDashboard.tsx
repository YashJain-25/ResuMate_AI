import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  FileCheck2,
  FileText,
  Lock,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { AnalysisRecord, EvidenceStrength, User } from "../types.js";

interface AnalysisDashboardProps {
  analysis: AnalysisRecord;
  user: User | null;
  onOpenAuth: (initialMode?: "login" | "register") => void;
  onStartVideoAssessment: () => void;
  onStartLearningPath: () => void;
  onGenerateResume: () => void;
  onReanalyze: () => void;
  onViewParsedResume?: () => void;
  onReviewSkillGaps?: () => void;
  onOpenSkillProfile?: () => void;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  analysis,
  user,
  onOpenAuth,
  onStartVideoAssessment,
  onStartLearningPath,
  onGenerateResume,
  onReanalyze,
  onViewParsedResume,
  onReviewSkillGaps,
  onOpenSkillProfile,
}) => {
  const { parsedJob, readiness, skillMatches } = analysis;
  const [showSkipDisclaimerModal, setShowSkipDisclaimerModal] = useState(false);
  const [acknowledgedSkip, setAcknowledgedSkip] = useState(false);

  const handleGenerateResumeClick = () => {
    if (readiness.state !== "READY") {
      setShowSkipDisclaimerModal(true);
    } else {
      onGenerateResume();
    }
  };

  const handleConfirmSkipAndGenerate = () => {
    setShowSkipDisclaimerModal(false);
    onGenerateResume();
  };

  // Trigger celebratory confetti if READY
  useEffect(() => {
    if (readiness.state === "READY") {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore if not supported
      }
    }
  }, [readiness.state]);

  const getStateBadge = () => {
    switch (readiness.state) {
      case "READY":
        return {
          bg: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
          label: "JOB READY",
          description: "High confidence match across critical competencies.",
        };
      case "NEAR_READY":
        return {
          bg: "bg-amber-100 text-amber-800 border-amber-300",
          icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
          label: "NEAR READY",
          description: "Candidate meets core baseline; 1-2 skills require validation.",
        };
      case "NOT_READY":
      default:
        return {
          bg: "bg-rose-100 text-rose-800 border-rose-300",
          icon: <ShieldAlert className="h-5 w-5 text-rose-600" />,
          label: "NOT READY",
          description: "Actionable skill gaps identified; learning path recommended.",
        };
    }
  };

  const badge = getStateBadge();

  const getEvidencePill = (strength: EvidenceStrength) => {
    switch (strength) {
      case "VERY_HIGH":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">VERY HIGH</span>;
      case "HIGH":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">HIGH</span>;
      case "MEDIUM":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">MEDIUM</span>;
      case "MODERATE":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">MODERATE</span>;
      case "LOW":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">LOW</span>;
      case "NONE":
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">NO EVIDENCE</span>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back navigation for step transparency */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          id="btn-dash-back"
          onClick={onReviewSkillGaps || onViewParsedResume || onReanalyze}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>&larr; Back to {onReviewSkillGaps ? "Skill Gap Review" : onViewParsedResume ? "Parsed Resume" : "Input"}</span>
        </button>

        {onViewParsedResume && (
          <button
            type="button"
            onClick={onViewParsedResume}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Parsed Resume Data &rarr;
          </button>
        )}
      </div>

      {/* Top Banner: Role & Readiness Overview */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                Target Role
              </span>
              <span className="text-xs text-slate-600 font-medium">
                Analysis ID: {analysis.id.slice(0, 8)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {parsedJob.jobTitle}
            </h1>
            {parsedJob.company && (
              <p className="text-sm font-semibold text-slate-600 mt-1 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-slate-600" />
                {parsedJob.company} {parsedJob.location ? `&bull; ${parsedJob.location}` : ""}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {onViewParsedResume && (
                <button
                  type="button"
                  onClick={onViewParsedResume}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  <span>View Parsed Resume</span>
                </button>
              )}

              {onReviewSkillGaps && (
                <button
                  type="button"
                  id="dash-btn-review-gaps"
                  onClick={onReviewSkillGaps}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-colors shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Review Skill Gaps ({readiness.missingSkills?.length || 0})</span>
                </button>
              )}

              {onOpenSkillProfile && (
                <button
                  type="button"
                  id="dash-btn-skill-profile"
                  onClick={onOpenSkillProfile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <Briefcase className="h-3.5 w-3.5 text-amber-300" />
                  <span>Skill Profile &amp; Job Roles (Pentagon Graph)</span>
                </button>
              )}

              <button
                type="button"
                id="dash-btn-header-generate-resume"
                onClick={handleGenerateResumeClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors shadow-xs"
              >
                <FileCheck2 className="h-3.5 w-3.5 text-indigo-600" />
                <span>{readiness.state === "READY" ? "Generate ATS Resume" : "Generate Resume (Skip Tasks)"}</span>
              </button>
            </div>
          </div>

          {/* Score & State Gauge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white border-2 border-indigo-500 shadow-sm">
                <span className="text-2xl font-black text-slate-900">
                  {readiness.overallScore}%
                </span>
                <span className="absolute -bottom-2 text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 rounded">
                  Score
                </span>
              </div>
              <div>
                <div className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-extrabold ${badge.bg}`}>
                  {badge.icon}
                  <span>{badge.label}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 max-w-[200px]">
                  {badge.description}
                </p>
              </div>
            </div>

            {/* Critical Requirements Gating Meter */}
            <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6">
              <div className="text-xs text-slate-600 font-bold uppercase mb-1">
                Critical Gating
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900">
                  {readiness.criticalSkillsCovered} / {readiness.criticalSkillsTotal}
                </span>
                <span className="text-xs text-slate-600">verified</span>
              </div>
              <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full ${
                    readiness.criticalSkillsCovered === readiness.criticalSkillsTotal
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                  style={{
                    width: `${
                      readiness.criticalSkillsTotal > 0
                        ? (readiness.criticalSkillsCovered / readiness.criticalSkillsTotal) * 100
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Explainable Reasoning */}
        <div className="mt-6 rounded-xl bg-indigo-50/50 border border-indigo-100 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Deterministic Decision Rationale
              </h2>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                {readiness.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Lockout Banner (Per Section 2 & 18) */}
      {!user && (
        <div className="mb-8 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-950">
                  Guest Preview: Sign In or Register to Continue
                </h3>
                <p className="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
                  You have received the initial readiness preview. Create a free
                  account or sign in to save this analysis to your profile, unlock
                  the video assessment, track your learning path, and generate
                  your ATS-optimized resume.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                id="guest-login-cta"
                onClick={() => onOpenAuth("login")}
                className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100/50 transition-colors"
              >
                Sign In
              </button>
              <button
                id="guest-register-cta"
                onClick={() => onOpenAuth("register")}
                className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
              >
                Register & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Next Action Banner */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-900 text-white p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Recommended Next Action
            </span>
            {readiness.state === "READY" && (
              <div>
                <h3 className="text-xl font-bold mt-1">
                  Generate Your ATS-Optimized Resume
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Your profile meets all critical requirements with verified
                  evidence. Generate an ATS-formatted resume and run an automated
                  audit against the target job description.
                </p>
              </div>
            )}
            {readiness.state === "NEAR_READY" && (
              <div>
                <h3 className="text-xl font-bold mt-1">
                  Take the 3-Minute Video Assessment
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  One or more critical skills have unverified evidence. Answer
                  targeted technical questions to demonstrate competence and
                  elevate your readiness score.
                </p>
              </div>
            )}
            {readiness.state === "NOT_READY" && (
              <div>
                <h3 className="text-xl font-bold mt-1">
                  Start Your Personalized Learning Path
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Identified key requirement gaps. Follow the recommended
                  production project tutorials, complete practice items, and
                  reassess your profile.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {readiness.state === "READY" && (
              <button
                id="action-generate-resume-btn"
                onClick={onGenerateResume}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
              >
                <span>Generate ATS Resume & Audit</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {readiness.state === "NEAR_READY" && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="action-video-assessment-btn"
                  onClick={onStartVideoAssessment}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-900/30 cursor-pointer"
                >
                  <Video className="h-4 w-4" />
                  <span>Start Video Assessment</span>
                </button>
                <button
                  type="button"
                  id="action-skip-video-resume-btn"
                  onClick={handleGenerateResumeClick}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-3 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Skip Assessment &amp; Generate Resume</span>
                </button>
              </div>
            )}

            {readiness.state === "NOT_READY" && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="action-learning-path-btn"
                  onClick={onStartLearningPath}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-400 transition-all shadow-md shadow-indigo-900/30 cursor-pointer"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>View Learning Path</span>
                </button>
                <button
                  type="button"
                  id="action-skip-tasks-resume-btn"
                  onClick={handleGenerateResumeClick}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-3 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Skip Tasks &amp; Generate Resume</span>
                </button>
              </div>
            )}

            <button
              id="action-reanalyze-btn"
              onClick={onReanalyze}
              title="Start New Analysis"
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Skill Evidence & Requirements Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Matches Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Job Requirements & Evidence Verification
            </h2>
            <span className="text-xs text-slate-600">
              {skillMatches.length} total requirements
            </span>
          </div>

          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {skillMatches.map((m, idx) => (
              <div key={idx} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {m.status === "strong" && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    )}
                    {m.status === "weak" && (
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    )}
                    {m.status === "missing" && (
                      <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                    )}
                    <span className="text-sm font-bold text-slate-900">
                      {m.requirement.skill}
                    </span>
                    {m.requirement.mandatory && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getEvidencePill(m.evidenceStrength)}
                    <span className="text-xs font-mono text-slate-600">
                      {Math.round(m.confidence * 100)}% conf
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {m.reasoning}
                </p>

                {(m.evidenceSnippets || []).length > 0 && (
                  <div className="mt-2.5 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11px] font-mono text-slate-700">
                    <span className="font-bold text-slate-500">Source Evidence:</span>{" "}
                    {m.evidenceSnippets[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Summary Breakdown (1 col) */}
        <div className="space-y-6">
          {/* Evidence Hierarchy Guide */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Scale className="h-4 w-4 text-indigo-600" />
              <span>Evidence Hierarchy</span>
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-900">
                <span className="font-bold">VERY HIGH</span>
                <span>Production experience</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 text-blue-900">
                <span className="font-bold">HIGH</span>
                <span>Project implementation</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 text-purple-900">
                <span className="font-bold">MEDIUM</span>
                <span>Accredited certification</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 text-yellow-900">
                <span className="font-bold">MODERATE</span>
                <span>Course / coursework</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 text-orange-900">
                <span className="font-bold">LOW</span>
                <span>Listed in skills list only</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 text-slate-700">
                <span className="font-bold">NONE</span>
                <span>No mention in resume</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Candidate Skill Inventory
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-2xl font-black text-emerald-600">
                  {(readiness.strongSkills || []).length}
                </div>
                <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                  Strong Skills
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-2xl font-black text-amber-600">
                  {(readiness.weakSkills || []).length}
                </div>
                <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                  Needs Evidence
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-2xl font-black text-rose-600">
                  {(readiness.missingSkills || []).length}
                </div>
                <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                  Missing Gaps
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-2xl font-black text-indigo-600">
                  {(analysis.parsedResume?.skills || []).length}
                </div>
                <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                  Total Claimed
                </div>
              </div>
            </div>
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
                  Incomplete Tasks Advisory
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
                  Readiness Status: {readiness.state.replace("_", " ")} ({readiness.overallScore}/100)
                </div>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  You haven't completed the tasks. Still want to generate resume?
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your profile has <strong>{(readiness.missingSkills || []).length} unverified requirement gaps</strong> for this position. 
                  If you choose to skip the learning tasks or assessment and generate your ATS resume now:
                </p>
              </div>

              {(readiness.missingSkills || []).length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Unverified Requirements:</span>
                    <span className="text-[11px] font-semibold text-rose-600">
                      {(readiness.missingSkills || []).length} Missing
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto">
                    {(readiness.missingSkills || []).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    • <strong>Zero-Hallucination Policy:</strong> Unverified skills will NOT be fabricated or placed on your resume.<br />
                    • Your tailored resume will emphasize your existing verified strengths.
                  </p>
                </div>
              )}

              {/* Acknowledgment */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer text-xs text-amber-950">
                <input
                  type="checkbox"
                  id="chk-ack-dash-incomplete-tasks"
                  checked={acknowledgedSkip}
                  onChange={(e) => setAcknowledgedSkip(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium leading-relaxed">
                  I understand that I haven't completed the recommended tasks and unverified skills will not appear on my resume. I still want to skip remaining tasks and generate my resume.
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
                Work on Tasks / Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-dash-skip-tasks-generate"
                onClick={handleConfirmSkipAndGenerate}
                disabled={!acknowledgedSkip}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <FileCheck2 className="h-4 w-4 text-emerald-400" />
                <span>Skip Tasks &amp; Generate Resume</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
