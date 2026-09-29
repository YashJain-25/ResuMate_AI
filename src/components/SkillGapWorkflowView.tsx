import React, { useMemo, useState } from "react";
import { AnalysisRecord } from "../types.js";
import {
  buildComprehensiveSkillGapReport,
  GapTier,
  PersonalizedSkillLearningPlan,
} from "../lib/skillGapAdvisor.js";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Code2,
  Copy,
  Cpu,
  ExternalLink,
  FileCheck2,
  FolderGit2,
  GraduationCap,
  HelpCircle,
  Info,
  Layers,
  Lightbulb,
  Rocket,
  ShieldAlert,
  Sparkles,
  Target,
  Terminal,
  TrendingUp,
  UserCheck,
  Wrench,
  XCircle,
} from "lucide-react";

interface SkillGapWorkflowViewProps {
  analysis: AnalysisRecord;
  onGenerateAtsResume: () => void;
  onBackToParsedResume: () => void;
  onBackToDashboard: () => void;
  isGeneratingResume?: boolean;
}

export type SkillTypeSelection = "TECHNICAL" | "NON_TECHNICAL";

type FilterTab = "ALL_GAPS" | "MISSING" | "WEAK" | "STRENGTHEN" | "SOFT_SKILLS" | "MATCHED";

export const SkillGapWorkflowView: React.FC<SkillGapWorkflowViewProps> = ({
  analysis,
  onGenerateAtsResume,
  onBackToParsedResume,
  onBackToDashboard,
  isGeneratingResume = false,
}) => {
  const report = useMemo(() => buildComprehensiveSkillGapReport(analysis), [analysis]);

  const actionableGaps = useMemo(
    () => [
      ...report.missingSkills,
      ...report.weakSkills,
      ...report.skillsToStrengthen,
    ],
    [report]
  );

  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL_GAPS");
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    actionableGaps.slice(0, 3).forEach((g) => {
      initial[g.skillName] = true;
    });
    return initial;
  });

  const [classifications, setClassifications] = useState<Record<string, SkillTypeSelection>>({});
  const [completedProjectTasks, setCompletedProjectTasks] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAllArchitecture, setShowAllArchitecture] = useState(false);

  const handleSelectType = (skill: string, type: SkillTypeSelection) => {
    setClassifications((prev) => ({
      ...prev,
      [skill]: type,
    }));
  };

  const handleAutoClassifyAll = () => {
    const next: Record<string, SkillTypeSelection> = { ...classifications };
    for (const item of [...actionableGaps, ...report.matchedSkills]) {
      next[item.skillName] = item.isSoftOrCompetency ? "NON_TECHNICAL" : "TECHNICAL";
    }
    setClassifications(next);
  };

  const toggleExpandSkill = (skillName: string) => {
    setExpandedSkills((prev) => ({
      ...prev,
      [skillName]: !prev[skillName],
    }));
  };

  const toggleProjectTask = (taskId: string) => {
    setCompletedProjectTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleCopyText = (key: string, text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const filteredPlans: PersonalizedSkillLearningPlan[] = useMemo(() => {
    switch (activeFilter) {
      case "MISSING":
        return report.missingSkills;
      case "WEAK":
        return report.weakSkills;
      case "STRENGTHEN":
        return report.skillsToStrengthen;
      case "SOFT_SKILLS":
        return report.softAndProfessionalCompetencies;
      case "MATCHED":
        return report.matchedSkills;
      case "ALL_GAPS":
      default:
        return actionableGaps;
    }
  }, [activeFilter, report, actionableGaps]);

  const classifiedCount = Object.keys(classifications).length;
  const completedTaskCount = Object.values(completedProjectTasks).filter(Boolean).length;

  const renderTierBadge = (tier: GapTier) => {
    switch (tier) {
      case "MISSING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="h-3 w-3 text-rose-600" />
            <span>Missing Skill</span>
          </span>
        );
      case "WEAK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300">
            <HelpCircle className="h-3 w-3 text-amber-600" />
            <span>Weak / Underdeveloped</span>
          </span>
        );
      case "STRENGTHEN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-indigo-100 text-indigo-800 border border-indigo-300">
            <TrendingUp className="h-3 w-3 text-indigo-600" />
            <span>Skill to Strengthen</span>
          </span>
        );
      case "MATCHED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Matched in Resume</span>
          </span>
        );
    }
  };

  const renderLevelBadge = (level: "Beginner" | "Intermediate" | "Advanced") => {
    const style =
      level === "Advanced"
        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
        : level === "Intermediate"
        ? "bg-indigo-50 text-indigo-800 border-indigo-200"
        : "bg-amber-50 text-amber-800 border-amber-200";
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${style}`}>
        {level}
      </span>
    );
  };

  const visibleArchDimensions = showAllArchitecture
    ? report.architectureDimensions
    : report.architectureDimensions.slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* TOP NAVIGATION & CONTEXT */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToParsedResume}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>&larr; Back to Parsed Resume Data</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              View Readiness Dashboard
            </button>
            <button
              type="button"
              id="btn-skill-gap-top-generate-resume"
              onClick={onGenerateAtsResume}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs"
            >
              <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Generate Resume (Skip Tasks)</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 1. HERO & 4-TIER SKILL GAP ANALYSIS SUMMARY                       */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold mb-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                Personalized Skill Gap Analysis &amp; Career Roadmap
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Skill Gap Intelligence &amp; Application-Focused Learning Path
              </h1>
              <p className="text-sm text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
                Tailored to your resume, existing project portfolio (
                <strong className="text-slate-900">{report.primaryProjectName}</strong>), and target role{" "}
                <strong className="text-indigo-700">{report.targetRole}</strong>. Every gap below is paired with a concrete learning sequence, hands-on exercises, direct upgrades for your existing project, and verifiable resume evidence.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left lg:text-right shrink-0">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Target Role
              </div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">
                {report.targetRole}
              </div>
              {report.companyName && (
                <div className="text-xs text-slate-600 font-medium">{report.companyName}</div>
              )}
              <div className="text-xs text-indigo-600 font-bold mt-1.5">
                {report.matchedSkills.length} Matched &bull; {actionableGaps.length} Actionable Gaps
              </div>
            </div>
          </div>

          {/* 4-TIER DIAGNOSTIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setActiveFilter("MATCHED")}
              className={`text-left p-4 rounded-2xl border transition-all ${
                activeFilter === "MATCHED"
                  ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-200"
                  : "bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  Matched Skills
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {report.matchedSkills.length}
              </div>
              <p className="text-[11px] text-emerald-800/90 mt-1 leading-snug">
                Skills you already have with clear evidence in your resume.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("MISSING")}
              className={`text-left p-4 rounded-2xl border transition-all ${
                activeFilter === "MISSING"
                  ? "bg-rose-50/90 border-rose-400 ring-2 ring-rose-200"
                  : "bg-rose-50/40 border-rose-200 hover:bg-rose-50/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-800">
                  Missing Skills
                </span>
                <XCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-900 mt-1">
                {report.missingSkills.length}
              </div>
              <p className="text-[11px] text-rose-800/90 mt-1 leading-snug">
                Required or implied by the JD with no current evidence in your resume.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("WEAK")}
              className={`text-left p-4 rounded-2xl border transition-all ${
                activeFilter === "WEAK"
                  ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-200"
                  : "bg-amber-50/40 border-amber-200 hover:bg-amber-50/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                  Weak / Underdeveloped
                </span>
                <HelpCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-950 mt-1">
                {report.weakSkills.length}
              </div>
              <p className="text-[11px] text-amber-900/90 mt-1 leading-snug">
                Some evidence exists (e.g. skills list), but lacks project/production proof.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("STRENGTHEN")}
              className={`text-left p-4 rounded-2xl border transition-all ${
                activeFilter === "STRENGTHEN"
                  ? "bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-200"
                  : "bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900">
                  Skills to Strengthen
                </span>
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-950 mt-1">
                {report.skillsToStrengthen.length}
              </div>
              <p className="text-[11px] text-indigo-900/90 mt-1 leading-snug">
                Demonstrated skills where deeper scale, testing, or metrics will elevate you.
              </p>
            </button>
          </div>

          {/* MATCHED SKILLS QUICK INVENTORY BAR (Never claim a skill is missing if present) */}
          {report.matchedSkills.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-950">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Verified Skills You Already Have Matching {report.targetRole} ({report.matchedSkills.length})
                  </span>
                </div>
                <span className="text-[11px] text-emerald-800 font-medium">
                  Verified directly from your Experience, Projects &amp; Skills sections
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {report.matchedSkills.map((ms, i) => (
                  <span
                    key={i}
                    title={ms.verifiedResumeEvidence || "Verified in resume"}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-950 shadow-2xs"
                  >
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>{ms.skillName}</span>
                    {ms.verifiedResumeSection && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                        {ms.verifiedResumeSection}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* USER AUTHORITY & ZERO-FALSE-MISSING GUARANTEE */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs leading-relaxed">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900">Evidence-Grounded &amp; User-Directed: </span>
                Skills with clear evidence in your resume are automatically credited above and never falsely marked as missing. You can also classify any skill below as Technical or Non-Technical ({classifiedCount} classified).
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoClassifyAll}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs shrink-0 transition-colors cursor-pointer"
            >
              Auto-Classify All ({actionableGaps.length})
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. RECOMMENDED PROJECT TASKS (HIGH-IMPACT EXISTING PROJECT TASKS) */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-extrabold mb-2">
                <Rocket className="h-4 w-4 text-indigo-600" />
                High-Impact Application-Focused Tasks
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Recommended Project Tasks
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                Each task below is designed to be implemented{" "}
                <strong className="text-slate-900">
                  directly into your existing project ({report.primaryProjectName})
                </strong>{" "}
                so you simultaneously:{" "}
                <span className="font-bold text-indigo-700">
                  close a critical skill gap + improve your actual project + create stronger resume evidence.
                </span>
              </p>
            </div>

            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl px-4 py-3 text-center shrink-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Project Task Progress
              </div>
              <div className="text-xl font-black text-indigo-950 mt-0.5">
                {completedTaskCount} / {report.recommendedProjectTasks.length} Completed
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {report.recommendedProjectTasks.map((task) => {
              const isDone = Boolean(completedProjectTasks[task.id]);
              const copyId = `task-bullet-${task.id}`;

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl border p-5 transition-all flex flex-col justify-between gap-4 ${
                    isDone
                      ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200"
                      : "bg-slate-50/60 border-slate-200 hover:border-indigo-300 hover:bg-white shadow-2xs"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Checkbox, Priority, Layer */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleProjectTask(task.id)}
                          className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isDone
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-slate-300 hover:border-indigo-500"
                          }`}
                          title="Mark project task as completed"
                        >
                          {isDone && <Check className="h-3.5 w-3.5" />}
                        </button>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                task.priority === "CRITICAL"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : task.priority === "HIGH"
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              }`}
                            >
                              {task.priority} IMPACT
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-800">
                              {task.architecturalLayer}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              ~{task.estimatedHours} hrs
                            </span>
                          </div>
                          <h3
                            className={`text-sm sm:text-base font-black ${
                              isDone ? "line-through text-slate-500" : "text-slate-900"
                            }`}
                          >
                            {task.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Structured Callout matching user's exact format: Skill Gap -> Project Task -> Result */}
                    <div className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-2 text-xs">
                      <div>
                        <span className="font-extrabold text-indigo-900">Skill Gap: </span>
                        <span className="font-bold text-slate-900">{task.skillGapClosed}</span>
                        {task.secondarySkillsClosed.length > 0 && (
                          <span className="text-slate-500">
                            {" "}
                            (+ {task.secondarySkillsClosed.join(", ")})
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="font-extrabold text-indigo-900">
                          Project Task ({task.targetProjectName}):{" "}
                        </span>
                        <span className="text-slate-700 leading-relaxed">{task.projectTask}</span>
                      </div>
                      <div>
                        <span className="font-extrabold text-emerald-800">Result: </span>
                        <span className="text-slate-700 leading-relaxed">{task.resultSummary}</span>
                      </div>
                    </div>

                    {/* Step-by-Step Implementation Checklist */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Implementation Sequence:
                      </div>
                      <ul className="space-y-1 text-xs text-slate-700">
                        {task.implementationSteps.map((step, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-2">
                            <span className="font-bold text-indigo-600 shrink-0">
                              {sIdx + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Resume Evidence Generated (Copyable) */}
                  <div className="pt-3 border-t border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Resume Evidence to Add After Completion:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(copyId, task.resumeEvidenceBullet)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        {copiedKey === copyId ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Bullet</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] italic text-slate-700 bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5 leading-relaxed">
                      &ldquo;{task.resumeEvidenceBullet}&rdquo;
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. EXISTING PROJECT ARCHITECTURE & 12-DIMENSION INTEGRATION MAP   */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold mb-1.5">
                <FolderGit2 className="h-4 w-4 text-indigo-600" />
                Connect Skill Gaps to Your Existing Project
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                12-Dimension Project Architecture Audit:{" "}
                <span className="text-indigo-600">{report.primaryProjectName}</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Evaluates your existing project across Architecture, Technologies, Features, APIs, Database, Authentication, AI Functionality, Frontend, Backend, Deployment, Testing, and Security.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAllArchitecture((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 shrink-0 cursor-pointer"
            >
              <span>
                {showAllArchitecture
                  ? "Show Top 6 Dimensions"
                  : `View All 12 Architecture Dimensions`}
              </span>
              {showAllArchitecture ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleArchDimensions.map((dim) => (
              <div
                key={dim.dimension}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{dim.dimension}</span>
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                        dim.status === "STRONG"
                          ? "bg-emerald-100 text-emerald-800"
                          : dim.status === "OPPORTUNITY"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {dim.status === "STRONG"
                        ? "Demonstrated"
                        : dim.status === "OPPORTUNITY"
                        ? "Upgrade Opportunity"
                        : "Key Gap"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Current: </strong>
                    {dim.currentEvidence}
                  </p>

                  <p className="text-[11px] text-indigo-950 bg-indigo-50/70 border border-indigo-100 rounded-lg p-2 leading-relaxed">
                    <strong className="text-indigo-800">Project Upgrade: </strong>
                    {dim.recommendedUpgrade}
                  </p>
                </div>

                {dim.linkedSkillGaps.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500 mr-1">Closes:</span>
                    {dim.linkedSkillGaps.map((g, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. FILTERABLE PERSONALIZED LEARNING PATHS FOR EVERY SKILL GAP     */}
        {/* ================================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                <span>Personalized 8-Step Learning Paths &amp; Skill Gap Breakdown</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Structured from{" "}
                <strong>
                  Foundational Concepts &rarr; Practical Implementation &rarr; Advanced Concepts &rarr; Real-World Project
                </strong>
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "ALL_GAPS", label: `All Actionable (${actionableGaps.length})` },
                  { id: "MISSING", label: `Missing (${report.missingSkills.length})` },
                  { id: "WEAK", label: `Weak / Underdeveloped (${report.weakSkills.length})` },
                  { id: "STRENGTHEN", label: `Strengthen (${report.skillsToStrengthen.length})` },
                  {
                    id: "SOFT_SKILLS",
                    label: `Soft & Competencies (${report.softAndProfessionalCompetencies.length})`,
                  },
                  { id: "MATCHED", label: `Matched (${report.matchedSkills.length})` },
                ] as { id: FilterTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === tab.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredPlans.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                No Skills in This Filter Category
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Switch filter tabs above to review other skill categories or inspect your matched skills and recommended project tasks.
              </p>
            </div>
          ) : (
            filteredPlans.map((plan, idx) => {
              const skillName = plan.skillName;
              const userSelection = classifications[skillName];
              const isExpanded = Boolean(expandedSkills[skillName]);
              const bulletCopyKey = `plan-bullet-${idx}-${skillName}`;

              return (
                <div
                  key={`${skillName}-${idx}`}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all shadow-xs space-y-4 ${
                    plan.gapTier === "MISSING"
                      ? "border-rose-200/90"
                      : plan.gapTier === "WEAK"
                      ? "border-amber-200/90"
                      : plan.gapTier === "STRENGTHEN"
                      ? "border-indigo-200/90"
                      : "border-emerald-200/90"
                  }`}
                >
                  {/* TOP BAR: Skill Name, Category, Importance, Gap Tier Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-black text-slate-900">
                          {plan.skillToLearn}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                          {plan.competencyDomain}
                        </span>
                        {plan.isSoftOrCompetency && (
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase">
                            Soft Skill / Competency
                          </span>
                        )}
                        {plan.mandatory && (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">
                            Mandatory JD Requirement
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                        <span>
                          JD Importance:{" "}
                          <strong className="text-slate-800 uppercase">{plan.importance}</strong>
                        </span>
                        <span>&bull;</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span>Current Level (Evidence-Based):</span>
                          {renderLevelBadge(plan.currentLevel)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {renderTierBadge(plan.gapTier)}
                      <button
                        type="button"
                        onClick={() => toggleExpandSkill(skillName)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? "Hide Full Path" : "View 8-Step Path"}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* SUPPORTING RESUME EVIDENCE & CURRENT LEVEL RATIONALE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="font-extrabold text-slate-700 block mb-0.5">
                        Resume Evidence Audit:
                      </span>
                      {plan.verifiedResumeEvidence ? (
                        <span className="text-slate-800">
                          &ldquo;{plan.verifiedResumeEvidence}&rdquo;{" "}
                          {plan.verifiedResumeSection && (
                            <span className="font-bold text-indigo-700">
                              [{plan.verifiedResumeSection}]
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-rose-700 font-medium">
                          No supporting evidence found in uploaded resume.
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="font-extrabold text-slate-700 block mb-0.5">
                        Why It Matters for {report.targetRole}:
                      </span>
                      <span className="text-slate-700 leading-relaxed">{plan.whyItMatters}</span>
                    </div>
                  </div>

                  {/* APPLICATION-FOCUSED QUICK SUMMARY BLOCK (Matches user's exact example!) */}
                  <div className="rounded-2xl bg-indigo-50/60 border border-indigo-200/80 p-4 space-y-2 text-xs">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Action Plan to Close This Skill Gap</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 text-slate-800">
                      <div>
                        <strong className="text-slate-950">Skill Gap: </strong>
                        <span className="font-bold text-indigo-900">{plan.skillToLearn}</span>
                      </div>
                      <div>
                        <strong className="text-slate-950">Learning Path: </strong>
                        <span className="font-mono text-[11px] text-indigo-950 bg-white px-2 py-0.5 rounded border border-indigo-100">
                          {plan.learningSequenceArrow}
                        </span>
                      </div>
                      <div>
                        <strong className="text-slate-950">Practical Task: </strong>
                        <span>{plan.existingProjectConnection.projectTask}</span>
                      </div>
                      <div>
                        <strong className="text-slate-950">Resume Evidence: </strong>
                        <span>{plan.resumeDemonstrationGuide}</span>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED 8-POINT PERSONALIZED LEARNING PATH */}
                  {isExpanded && (
                    <div className="pt-2 space-y-5 animate-fadeIn">
                      {/* Point 3 & 4: Progressive 4-Stage Learning Sequence (Foundational -> Practical -> Advanced -> Real-World Project) */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-indigo-600" />
                            <span>
                              4. Recommended Learning Sequence (Foundational &rarr; Real-World Project)
                            </span>
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            {plan.currentLevelRationale}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {plan.learningStages.map((stage) => (
                            <div
                              key={stage.stageNumber}
                              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between space-y-2.5"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-600 text-white">
                                    Stage {stage.stageNumber}
                                  </span>
                                </div>
                                <div className="text-xs font-extrabold text-slate-900">
                                  {stage.stageLabel}
                                </div>
                                <ul className="space-y-1 text-[11px] text-slate-600 list-disc pl-4">
                                  {stage.topics.map((t, tIdx) => (
                                    <li key={tIdx}>{t}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="pt-2 border-t border-slate-200/80 text-[11px] text-indigo-950">
                                <strong className="text-indigo-700">Deliverable: </strong>
                                {stage.milestoneDeliverable}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Point 5 & 6: Practical Exercises + Mini-Project / Existing Project Integration */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 5. Practical Exercises */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <Code2 className="h-4 w-4 text-indigo-600" />
                            <span>5. Practical Hands-On Exercises</span>
                          </div>
                          <ol className="space-y-2 text-xs text-slate-700 list-decimal pl-4">
                            {plan.practicalExercises.map((ex, exIdx) => (
                              <li key={exIdx} className="leading-relaxed">
                                {ex}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* 6. Mini-Project & Existing Project Connection */}
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2.5">
                          <div className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                            <FolderGit2 className="h-4 w-4 text-indigo-600" />
                            <span>
                              6. Portfolio Mini-Project &amp; {plan.existingProjectConnection.targetProjectName} Upgrade
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900">
                            {plan.miniProjectTitle}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {plan.miniProjectDescription}
                          </p>
                          <div className="p-2.5 rounded-xl bg-white border border-indigo-100 text-[11px] text-slate-700 space-y-1">
                            <div>
                              <strong className="text-indigo-900">
                                Direct Integration ({plan.existingProjectConnection.architecturalDimension}):{" "}
                              </strong>
                              {plan.existingProjectConnection.projectTask}
                            </div>
                            <div>
                              <strong className="text-emerald-800">Impact: </strong>
                              {plan.existingProjectConnection.resultAndImpact}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Point 7 & 8: How to Demonstrate on Resume + Suggested Resources / Topics to Study */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 7. How to Demonstrate on Resume */}
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                              <Award className="h-4 w-4 text-emerald-600" />
                              <span>7. How to Demonstrate on Your Resume</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(bulletCopyKey, plan.sampleResumeBullet)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                            >
                              {copiedKey === bulletCopyKey ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span>Copied Bullet</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy Resume Bullet</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {plan.resumeDemonstrationGuide}
                          </p>
                          <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs italic text-slate-800 leading-relaxed">
                            &ldquo;{plan.sampleResumeBullet}&rdquo;
                          </div>
                        </div>

                        {/* 8. Suggested Resources & Topics to Study */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                          <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4 text-indigo-600" />
                            <span>8. Suggested Topics &amp; Study Resources</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {plan.topicsToStudy.map((topic, tIdx) => (
                              <span
                                key={tIdx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                          <div className="space-y-1.5 pt-1">
                            {plan.suggestedResources.map((res, rIdx) => (
                              <a
                                key={rIdx}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 text-xs transition-colors"
                              >
                                <div>
                                  <span className="font-bold text-indigo-700 hover:underline">
                                    {res.title}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block">
                                    {res.platform} &bull; {res.type}
                                  </span>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* USER CLASSIFICATION BAR (Preserves Technical / Non-Technical interactive toggle) */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Wrench className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-bold text-slate-800">Requirement Classification:</span>
                      <span className="text-[11px] text-slate-500">
                        {userSelection
                          ? `Classified as ${userSelection === "TECHNICAL" ? "Technical" : "Non-Technical"}`
                          : "Optional — select Technical or Non-Technical"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectType(skillName, "TECHNICAL")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          userSelection === "TECHNICAL"
                            ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <Terminal className="h-3.5 w-3.5" />
                        <span>Technical</span>
                        {userSelection === "TECHNICAL" && <CheckCircle2 className="h-3 w-3" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectType(skillName, "NON_TECHNICAL")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          userSelection === "NON_TECHNICAL"
                            ? "bg-slate-800 text-white shadow-xs ring-2 ring-slate-400"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Non-Technical</span>
                        {userSelection === "NON_TECHNICAL" && <CheckCircle2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ================================================================= */}
        {/* 5. RESUME GENERATION CONFIRMATION & ATS GENERATION SECTION        */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-200 shadow-md space-y-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
              <ShieldAlert className="h-4 w-4 text-emerald-600" />
              Verified ATS Synthesis Guardrail
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Continue to 1-Page ATS Resume Synthesis
            </h2>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Pre-Generation Verification Notice
                </div>
                <p className="text-xs sm:text-sm font-semibold leading-relaxed text-amber-950">
                  &ldquo;Some requirements from the Job Description are not present or sufficiently supported in your resume. These requirements will not be added to the resume unless they are supported by your existing resume evidence. You can still continue and generate an ATS-friendly resume.&rdquo;
                </p>
              </div>
            </div>

            <div className="text-xs text-amber-900/90 pl-8 pt-1">
              &bull; Strict Zero-Hallucination: No unsupported skills, experience, or certifications will be invented.<br />
              &bull; All {report.matchedSkills.length} verified skills and existing project accomplishments will be formatted into a balanced, full-page A4 ATS resume.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={onBackToParsedResume}
              className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all w-full sm:w-auto text-center cursor-pointer"
            >
              &larr; Review Parsed Resume Data
            </button>

            <button
              type="button"
              id="btn-generate-ats-resume"
              onClick={onGenerateAtsResume}
              disabled={isGeneratingResume}
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-sm shadow-md shadow-indigo-200 transition-all w-full sm:w-auto flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <FileCheck2 className="h-4 w-4 text-emerald-400" />
              <span>
                {isGeneratingResume
                  ? "Synthesizing ATS Resume..."
                  : "Continue & Generate ATS Resume"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
