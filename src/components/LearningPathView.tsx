import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { LearningItem, LearningPath } from "../types.js";

interface LearningPathViewProps {
  learningPath: LearningPath;
  onToggleItem: (itemId: string, completed: boolean) => Promise<void>;
  onStartReassessment: () => void;
  onBackToAnalysis: () => void;
  onGenerateResume?: () => void;
}

export const LearningPathView: React.FC<LearningPathViewProps> = ({
  learningPath,
  onToggleItem,
  onStartReassessment,
  onBackToAnalysis,
  onGenerateResume,
}) => {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showSkipDisclaimerModal, setShowSkipDisclaimerModal] = useState(false);
  const [acknowledgedSkip, setAcknowledgedSkip] = useState(false);

  const handleToggle = async (item: LearningItem) => {
    setTogglingId(item.id);
    try {
      await onToggleItem(item.id, !item.completed);
    } finally {
      setTogglingId(null);
    }
  };

  const safeItems = Array.isArray(learningPath?.items) ? learningPath.items : [];
  const safeGaps = Array.isArray(learningPath?.gaps) ? learningPath.gaps : [];
  const completedCount = safeItems.filter((i) => i.completed).length;
  const totalCount = safeItems.length;
  const hasIncompleteTasks = completedCount < totalCount;
  const progressPercent = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  const incompleteItems = safeItems.filter((i) => !i.completed);

  const handleResumeClick = () => {
    if (!onGenerateResume) return;
    if (hasIncompleteTasks) {
      setShowSkipDisclaimerModal(true);
    } else {
      onGenerateResume();
    }
  };

  const handleConfirmSkipAndGenerate = () => {
    setShowSkipDisclaimerModal(false);
    if (onGenerateResume) {
      onGenerateResume();
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToAnalysis}
          className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          &larr; Back to Analysis Dashboard
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-600 hidden sm:inline">
            Target Role: {learningPath.targetJobTitle}
          </span>
          {onGenerateResume && (
            <button
              type="button"
              id="btn-lp-top-generate-resume"
              onClick={handleResumeClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>{hasIncompleteTasks ? "Generate Resume (Skip Tasks)" : "Generate ATS Resume"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 mb-2">
              <GraduationCap className="h-4 w-4" />
              <span>Personalized Skill-Gap Curriculum</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Bridge Your Qualification Gaps
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Every course and project recommendation below is directly connected
              to the missing or weak requirements for{" "}
              <strong>{learningPath.targetJobTitle}</strong>. Complete the modules
              to qualify for reassessment.
            </p>
          </div>

          {/* Progress Card */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 min-w-[220px]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
              <span>Curriculum Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-2 text-center">
              {completedCount} of {totalCount} modules completed
            </p>
          </div>
        </div>
      </div>

      {/* INCOMPLETE TASKS ADVISORY & QUICK SKIP BANNER */}
      {hasIncompleteTasks && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-black uppercase tracking-wider text-amber-900">
                Tasks Incomplete ({completedCount}/{totalCount} Completed)
              </div>
              <p className="text-xs text-amber-950 font-medium leading-relaxed">
                You haven't completed all learning curriculum tasks. If you want to skip remaining tasks and generate your resume now, unverified skills will not be added to avoid hallucinations.
              </p>
            </div>
          </div>

          {onGenerateResume && (
            <button
              type="button"
              id="btn-lp-banner-skip-to-resume"
              onClick={handleResumeClick}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
            >
              <span>Skip Tasks &amp; Generate Resume</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Prioritized Gaps Summary */}
      <div className="mb-8">
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-rose-600" />
          <span>Prioritized Skill Deficits</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {safeGaps.map((gap) => (
            <div
              key={gap.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-slate-900">
                  {gap.skill}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                    gap.priority === "CRITICAL"
                      ? "bg-rose-100 text-rose-800"
                      : gap.priority === "HIGH"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {gap.priority}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {gap.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Curriculum Items */}
      <div className="space-y-4 mb-8">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-indigo-600" />
          <span>Actionable Projects & Learning Units</span>
        </h2>

        <div className="space-y-3">
          {safeItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all p-5 ${
                item.completed
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  id={`toggle-item-${item.id}`}
                  onClick={() => handleToggle(item)}
                  disabled={togglingId === item.id}
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                    item.completed
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-white hover:border-indigo-500"
                  }`}
                >
                  {item.completed && <CheckCircle2 className="h-4 w-4" />}
                </button>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                      {item.type.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> ~{item.estimatedHours}h
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Skill: {item.gapSkill}
                    </span>
                  </div>

                  <h3
                    className={`text-base font-bold ${
                      item.completed ? "line-through text-slate-600" : "text-slate-900"
                    }`}
                  >
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700">
                    <span className="font-bold text-slate-800">Expected Outcome:</span>{" "}
                    {item.expectedOutcome}
                  </div>

                  {(item.resources || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(item.resources || []).map((res, rIdx) => (
                        <a
                          key={rIdx}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>{res.title}</span>
                          {res.isFree && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">
                              Free
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACTION OPTIONS: Reassessment & Skip to Resume Generation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Step: Reassessment Callout */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
              <span>Recommended Path</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Ready to Prove Your New Knowledge?
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Submit your completed repository link or evidence writeup to trigger
              reassessment and elevate your verified readiness score.
            </p>
          </div>
          <button
            type="button"
            id="btn-trigger-reassessment-cta"
            onClick={onStartReassessment}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors w-full sm:w-auto"
          >
            <span>Submit for Reassessment</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Alternative: Skip Tasks & Generate Resume Callout */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Direct Application</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Need to Apply Immediately?
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              You haven't completed the tasks, but you can still generate and print your tailored 1-page ATS resume with your currently verified skills.
            </p>
          </div>
          {onGenerateResume && (
            <button
              type="button"
              id="btn-lp-bottom-generate-resume"
              onClick={handleResumeClick}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-3 text-xs font-bold text-white shadow-sm transition-colors w-full sm:w-auto"
            >
              <FileCheck2 className="h-4 w-4 text-emerald-400" />
              <span>{hasIncompleteTasks ? "Skip Tasks & Generate Resume" : "Generate 1-Page ATS Resume"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* INCOMPLETE TASKS DISCLAIMER MODAL                       */}
      {/* ======================================================== */}
      {showSkipDisclaimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-amber-500 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-slate-950" />
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                  You Haven't Completed All Tasks
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

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-slate-800">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Pre-Generation Task Completion Notice
                </div>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  You haven't completed the tasks. Still want to generate resume?
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You have completed <strong>{completedCount} of {totalCount}</strong> curriculum tasks ({progressPercent}%). 
                  If you choose to skip the remaining tasks and generate your resume now:
                </p>
              </div>

              {/* Incomplete Skills Bullet List */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Skills from Incomplete Tasks:</span>
                  <span className="text-[11px] font-semibold text-rose-600">
                    {incompleteItems.length} Incomplete
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {incompleteItems.map((item) => (
                    <span
                      key={item.id}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[11px] font-medium"
                    >
                      {item.gapSkill}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  • <strong>Zero-Hallucination Policy:</strong> Unverified skills will NOT be added or fabricated on your resume.<br />
                  • Your tailored resume will include only qualifications backed by existing evidence.
                </p>
              </div>

              {/* Acknowledgment Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer text-xs text-amber-950">
                <input
                  type="checkbox"
                  id="chk-ack-incomplete-tasks"
                  checked={acknowledgedSkip}
                  onChange={(e) => setAcknowledgedSkip(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium leading-relaxed">
                  I understand that I have not completed the tasks and that unverified skills will not appear on my resume. I still want to skip remaining tasks and generate my resume.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowSkipDisclaimerModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition-colors w-full sm:w-auto text-center"
              >
                Keep Working on Tasks
              </button>

              <button
                type="button"
                id="btn-confirm-skip-tasks-generate"
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
