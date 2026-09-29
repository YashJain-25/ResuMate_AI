import React from "react";
import {
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { JobTrack } from "../types.js";

interface TrackSelectionScreenProps {
  onSelectTrack: (track: JobTrack) => void;
  onSelectPreset?: (sampleId: string, track: JobTrack) => void;
  samples?: any[];
  onBackToLanding?: () => void;
}

export const TrackSelectionScreen: React.FC<TrackSelectionScreenProps> = ({
  onSelectTrack,
  onSelectPreset,
  samples = [],
  onBackToLanding,
}) => {
  const technicalSamples = samples.filter((s) => !s.track || s.track === "TECHNICAL");
  const nonTechnicalSamples = samples.filter((s) => s.track === "NON_TECHNICAL");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to previous page for transparency */}
      {onBackToLanding && (
        <div className="mb-4">
          <button
            type="button"
            id="btn-track-back-to-home"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>&larr; Back to Home</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-4 py-1.5 text-xs font-bold text-indigo-800 shadow-sm mb-4">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>Step 1: Choose Your Role Category</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          What type of role are you analyzing?
        </h1>
        <p className="mt-3 text-sm text-slate-600 sm:text-base leading-relaxed">
          Select whether your target job description is <strong>Technical</strong> (Engineering, Cloud, Data) or <strong>Non-Technical</strong> (Product, Marketing, Sales, Operations). ResuMate adapts the skill ontology, evidence extraction, and ATS scoring engine accordingly.
        </p>
      </div>

      {/* Track Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Technical Track Card */}
        <div
          id="select-technical-track-card"
          onClick={() => onSelectTrack("TECHNICAL")}
          className="group relative flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-white p-7 shadow-sm hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-200 cursor-pointer"
        >
          <div className="absolute top-5 right-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
              <Cpu className="h-3.5 w-3.5" /> Engineering & Tech
            </span>
          </div>

          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Code2 className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Technical Job Description
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              For engineering and developer roles requiring code proficiency, architecture design, cloud infrastructure, and technical toolchains.
            </p>

            {/* Target Domains */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {[
                "Software Engineering",
                "Full Stack / Backend / Frontend",
                "DevOps & SRE",
                "Cloud Architecture",
                "Data & AI / ML",
                "Cybersecurity & QA",
              ].map((role) => (
                <span
                  key={role}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                >
                  {role}
                </span>
              ))}
            </div>

            {/* Core Features */}
            <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Stack Analysis:</strong> Verifies programming languages, frameworks, databases, and containerization.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Implementation Evidence:</strong> Analyzes git projects, architectural decisions, and production systems.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Document Upload:</strong> Full PDF, DOCX, TXT support for both Resume and Job Description.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            {/* Quick Prefill Pills */}
            {technicalSamples.length > 0 && onSelectPreset && (
              <div className="mb-4">
                <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-2">
                  <Zap className="h-3 w-3 text-amber-500" /> Or prefill benchmark:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {technicalSamples.slice(0, 3).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPreset(s.id, "TECHNICAL");
                      }}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-colors"
                    >
                      {s.name.split("(")[0].trim()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              id="btn-choose-technical-track"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-100 group-hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <span>Continue with Technical JD</span>
              <span className="text-lg leading-none">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Non-Technical Track Card */}
        <div
          id="select-non-technical-track-card"
          onClick={() => onSelectTrack("NON_TECHNICAL")}
          className="group relative flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-white p-7 shadow-sm hover:border-violet-600 hover:shadow-xl hover:shadow-violet-50 transition-all duration-200 cursor-pointer"
        >
          <div className="absolute top-5 right-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 border border-violet-200">
              <TrendingUp className="h-3.5 w-3.5" /> Business & Leadership
            </span>
          </div>

          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-200 group-hover:scale-105 transition-transform">
              <Briefcase className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
              Non-Technical Job Description
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              For product, commercial, operational, and management roles where success is measured in business outcomes, KPIs, and stakeholder leadership.
            </p>

            {/* Target Domains */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {[
                "Product Management (PRDs, OKRs)",
                "Growth & Digital Marketing",
                "Enterprise Sales & BD",
                "HR & Talent Acquisition",
                "Operations & Logistics",
                "Finance & Business Analytics",
              ].map((role) => (
                <span
                  key={role}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                >
                  {role}
                </span>
              ))}
            </div>

            {/* Core Features */}
            <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Outcome & KPI Evidence:</strong> Audits quantified achievements ($ ARR, CAC, conversion, retention).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Leadership & Stakeholders:</strong> Evaluates cross-functional alignment, roadmap planning, and team leadership.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Document Upload:</strong> Full PDF, DOCX, TXT support for both Resume and Job Description.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            {/* Quick Prefill Pills */}
            {nonTechnicalSamples.length > 0 && onSelectPreset && (
              <div className="mb-4">
                <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-2">
                  <Zap className="h-3 w-3 text-amber-500" /> Or prefill benchmark:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {nonTechnicalSamples.slice(0, 3).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPreset(s.id, "NON_TECHNICAL");
                      }}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 transition-colors"
                    >
                      {s.name.split("(")[0].trim()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              id="btn-choose-non-technical-track"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-violet-100 group-hover:bg-violet-700 transition-colors cursor-pointer"
            >
              <span>Continue with Non-Technical JD</span>
              <span className="text-lg leading-none">&rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom informational note */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
        <Layers className="h-4 w-4 text-slate-400" />
        <span>
          Both tracks support PDF and Word document uploads for both your Resume and the Job Description. You can switch between tracks at any time.
        </span>
      </div>
    </div>
  );
};
