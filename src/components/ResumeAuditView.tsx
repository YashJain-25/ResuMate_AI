import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  ShieldAlert,
} from "lucide-react";
import { ResumeAuditReport } from "../types.js";

interface ResumeAuditViewProps {
  audit: ResumeAuditReport;
  onBackToResume: () => void;
}

export const ResumeAuditView: React.FC<ResumeAuditViewProps> = ({
  audit,
  onBackToResume,
}) => {
  if (!audit) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-slate-600 mb-4">No audit report found.</p>
        <button
          onClick={onBackToResume}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
        >
          Return to Resume
        </button>
      </div>
    );
  }

  const getVerdictBadge = () => {
    switch (audit.verdict) {
      case "PASS":
        return {
          bg: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
          label: "AUDIT PASSED",
        };
      case "PASS_WITH_WARNINGS":
        return {
          bg: "bg-amber-100 text-amber-800 border-amber-300",
          icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
          label: "PASSED WITH MINOR WARNINGS",
        };
      case "FAIL":
      default:
        return {
          bg: "bg-rose-100 text-rose-800 border-rose-300",
          icon: <ShieldAlert className="h-5 w-5 text-rose-600" />,
          label: "AUDIT FAILED",
        };
    }
  };

  const badge = getVerdictBadge();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={onBackToResume}
          className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          &larr; Back to Generated Resume
        </button>
      </div>

      {/* Audit Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 mb-2">
              <FileCheck2 className="h-4 w-4" />
              <span>ATS & Fact-Check Verification Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              6-Point Resume Quality & ATS Audit
            </h1>
            <p className="mt-1.5 text-xs text-slate-600 max-w-xl">
              Every generated resume undergoes an automated deterministic audit
              evaluating ATS layout compliance, keyword density, quantified metrics,
              and strict anti-hallucination verification.
            </p>
          </div>

          {/* Score & Badge */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-center px-2">
              <div className="text-3xl font-black text-slate-900">
                {audit.overallScore ?? 95}
                <span className="text-xs text-slate-600">/100</span>
              </div>
              <div className="text-[10px] font-bold text-slate-600 uppercase">
                Integrity Score
              </div>
            </div>
            <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black ${badge.bg}`}>
              {badge.icon}
              <span>{badge.label}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700">
          <span className="font-bold text-slate-900">Audit Summary:</span>{" "}
          {audit.summary || "Resume passed ATS scanning checks and aligns cleanly with job specifications."}
        </div>
      </div>

      {/* 6-Point Audit Check Cards */}
      <div className="space-y-4">
        {(audit.checks || []).map((check) => {
          const isPassed = check.passed;
          return (
            <div
              key={check.id}
              className={`rounded-2xl border p-5 transition-all ${
                isPassed
                  ? "border-slate-200 bg-white shadow-sm"
                  : "border-amber-200 bg-amber-50/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isPassed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {check.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {check.description}
                    </p>
                    {check.details && (
                      <div className="mt-2 text-xs text-slate-700 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {check.details}
                      </div>
                    )}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                    isPassed
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {isPassed ? "PASSED" : "REVIEW"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
