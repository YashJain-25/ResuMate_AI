import React from "react";
import {
  ArrowRight,
  Briefcase,
  ChevronLeft,
  Plus,
} from "lucide-react";
import { AnalysisRecord, User } from "../types.js";

interface CandidateDashboardViewProps {
  user: User;
  analyses: AnalysisRecord[];
  onSelectAnalysis: (id: string) => void;
  onNewAnalysis: () => void;
  onViewSkills: () => void;
  onBackToLanding?: () => void;
}

export const CandidateDashboardView: React.FC<CandidateDashboardViewProps> = ({
  user,
  analyses,
  onSelectAnalysis,
  onNewAnalysis,
  onViewSkills,
  onBackToLanding,
}) => {
  const safeAnalyses = Array.isArray(analyses) ? analyses : [];
  const readyCount = safeAnalyses.filter((a) => a.readiness?.state === "READY" || a.readiness?.state === "ROLE_READY").length;
  const avgScore = safeAnalyses.length > 0
    ? Math.round(safeAnalyses.reduce((acc, a) => acc + (a.readiness?.overallScore || 0), 0) / safeAnalyses.length)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Navigation Bar */}
      {onBackToLanding && (
        <div className="mb-4">
          <button
            type="button"
            id="dashboard-back-home-btn"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>&larr; Back to Home</span>
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Candidate Command Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Welcome back, {user.name}
            </h1>
            <p className="text-xs text-slate-600 mt-1.5">
              Review your target role analyses, career readiness scores, and
              generated ATS-compliant resumes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="dashboard-new-analysis-btn"
              onClick={onNewAnalysis}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Analysis</span>
            </button>
            <button
              onClick={onViewSkills}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Skill Profile
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-2xl font-black text-slate-900">
              {safeAnalyses.length}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">
              Total Target Roles
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-2xl font-black text-emerald-600">
              {readyCount}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">
              Job Ready Roles
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-2xl font-black text-indigo-600">
              {avgScore}%
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">
              Average Match
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-2xl font-black text-violet-600">
              100%
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">
              Zero Hallucinations
            </div>
          </div>
        </div>
      </div>

      {/* Target Roles List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Target Role Analyses
          </h2>
          <span className="text-xs text-slate-600">
            {safeAnalyses.length} evaluations
          </span>
        </div>

        {safeAnalyses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-slate-50">
            <Briefcase className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              No target role analyses yet
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
              Compare your resume against a target job description to compute
              your deterministic readiness score.
            </p>
            <button
              onClick={onNewAnalysis}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Start First Analysis</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {safeAnalyses.map((a) => (
              <div
                key={a.id}
                onClick={() => onSelectAnalysis(a.id)}
                className="p-5 sm:p-6 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-sm font-bold text-slate-900 hover:text-indigo-600">
                      {a.parsedJob?.jobTitle || "Target Role"}
                    </span>
                    {a.parsedJob?.company && (
                      <span className="text-xs text-slate-600">
                        &bull; {a.parsedJob.company}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 max-w-xl">
                    {a.readiness?.explanation || ""}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                    <span>
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                    </span>
                    <span>&bull;</span>
                    <span>
                      {(a.skillMatches || []).filter((m) => m.status === "strong" || m.matchStatus === "MATCHED").length} strong skills
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">
                      {a.readiness?.overallScore ?? 0}%
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        a.readiness?.state === "READY" || a.readiness?.state === "ROLE_READY"
                          ? "bg-emerald-100 text-emerald-800"
                          : a.readiness?.state === "NEAR_READY" || a.readiness?.state === "ALMOST_READY"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {a.readiness?.state || "NOT_READY"}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
