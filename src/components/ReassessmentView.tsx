import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  History,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { AnalysisRecord, ReassessmentAttempt } from "../types.js";

interface ReassessmentViewProps {
  analysis: AnalysisRecord;
  history: ReassessmentAttempt[];
  onSubmitReassessment: (proofDetails: string, improvedSkills: string[]) => Promise<any>;
  onBackToAnalysis: () => void;
}

export const ReassessmentView: React.FC<ReassessmentViewProps> = ({
  analysis,
  history,
  onSubmitReassessment,
  onBackToAnalysis,
}) => {
  const safeMissingSkills = analysis.readiness?.missingSkills || [];
  const safeWeakSkills = analysis.readiness?.weakSkills || [];
  const safeHistory = Array.isArray(history) ? history : [];

  const [proofDetails, setProofDetails] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    safeMissingSkills.slice(0, 3)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultMessage(null);

    if (!proofDetails.trim() || proofDetails.trim().length < 20) {
      setError("Please provide verifiable proof details (minimum 20 characters).");
      return;
    }

    if (selectedSkills.length === 0) {
      setError("Please select at least one skill you are submitting proof for.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmitReassessment(proofDetails, selectedSkills);
      setResultMessage(
        `Reassessment complete! New readiness score: ${res.newScore}%. State updated to: ${res.newState}.`
      );
      setProofDetails("");
    } catch (err: any) {
      setError(err.message || "Failed to submit reassessment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBackToAnalysis}
          className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          &larr; Back to Analysis Dashboard
        </button>
        <span className="text-xs font-mono text-slate-600">
          Target: {analysis.parsedJob.jobTitle}
        </span>
      </div>

      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <RefreshCw className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
            Continuous Verification Engine
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Submit Learning Proof & Reassess
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Completed new production projects or obtained a professional credential?
          Provide your verifiable evidence to dynamically upgrade your skill
          ratings from Missing/Weak to Verified.
        </p>

        {/* Current State Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs font-semibold text-slate-700">
          <div>
            Current Score:{" "}
            <span className="font-extrabold text-slate-900">
              {analysis.readiness.overallScore}%
            </span>
          </div>
          <div className="text-slate-300">&bull;</div>
          <div>
            Current State:{" "}
            <span className="font-extrabold text-indigo-600">
              {analysis.readiness.state}
            </span>
          </div>
          <div className="text-slate-300">&bull;</div>
          <div>
            Unmet Requirements:{" "}
            <span className="font-extrabold text-rose-600">
              {safeMissingSkills.length}
            </span>
          </div>
        </div>
      </div>

      {resultMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <h4 className="font-bold">Score Successfully Recalculated</h4>
            <p className="mt-1 text-xs">{resultMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              1. Which skills did you improve?
            </label>
            <div className="flex flex-wrap gap-2">
              {[...safeMissingSkills, ...safeWeakSkills].map(
                (skill, idx) => {
                  const isChecked = selectedSkills.includes(skill);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isChecked
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {skill} {isChecked ? "✓" : "+"}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1">
              2. Describe your practical implementation & evidence
            </label>
            <p className="text-xs text-slate-600 mb-2">
              Include GitHub repositories, live demo URLs, architectural
              decisions, and benchmark improvements.
            </p>
            <textarea
              value={proofDetails}
              onChange={(e) => setProofDetails(e.target.value)}
              placeholder="e.g. Built a resilient Redis caching microservice using Spring Boot and Docker. Configured TTL eviction policies and load tested with k6, achieving sub-10ms response times at 10,000 req/s. Repository: https://github.com/..."
              rows={5}
              className="w-full rounded-xl border border-slate-200 p-3.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Auditing Evidence & Recalculating...</span>
                </>
              ) : (
                <>
                  <span>Evaluate Proof & Update Score</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Historical Attempts */}
      {safeHistory.length > 0 && (
        <div className="mt-10 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            <span>Reassessment Audit Trail</span>
          </h2>

          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {safeHistory.map((attempt) => (
              <div key={attempt.id} className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Score: {attempt.previousScore}% &rarr; {attempt.newScore}%
                    </span>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      {attempt.newState}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono">
                    {new Date(attempt.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {attempt.aiEvaluation?.summary || (attempt as any).feedback || "Reassessment verified and readiness recalculated."}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(attempt.improvedSkills || []).map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
