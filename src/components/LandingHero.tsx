import React from "react";
import {
  ArrowRight,
  Fingerprint,
  GraduationCap,
  Scale,
  ShieldCheck,
  Video,
  Zap,
} from "lucide-react";

interface LandingHeroProps {
  onStartAnalysis: () => void;
  onLoadSample: (sampleId: string) => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartAnalysis,
  onLoadSample,
}) => {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background Subtle Gradient Accents */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-80">
        <div
          className="aspect-[1155/678] w-[68rem] bg-gradient-to-tr from-indigo-200 via-sky-100 to-violet-100 opacity-60"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-28 lg:px-8">
        {/* Main Hero Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-4 py-1.5 text-xs font-semibold text-indigo-800 shadow-sm mb-6">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Verifiable Evidence &bull; Zero Fabrications &bull; Guest-First</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.15]">
            Know If You&apos;re Ready <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-800 bg-clip-text text-transparent">
              For The Job.
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl max-w-2xl mx-auto">
            Upload your resume and job description. ResuMate AI analyzes your
            skills, verifies your evidence, identifies gaps, and helps you become
            job-ready.
          </p>

          {/* Primary CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="hero-primary-cta"
              onClick={onStartAnalysis}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all hover:-translate-y-0.5"
            >
              <span>Analyze My Resume</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <span className="text-xs font-medium text-slate-600">
              No account required to start &bull; Instant match breakdown
            </span>
          </div>
        </div>

        {/* Quick Sample Selector */}
        <div className="mt-14 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 max-w-4xl mx-auto shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Quick 1-Click Production Demos
              </h2>
            </div>
            <span className="text-xs text-slate-600">
              Test real scoring algorithms instantly
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              id="sample-demo-ready"
              onClick={() => onLoadSample("sample-senior-fs")}
              className="flex flex-col items-start p-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-sm text-left transition-all group"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                  Senior Full-Stack
                </span>
                <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5">
                  READY
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Java, Spring Boot, React, PostgreSQL with production metrics.
              </p>
            </button>

            <button
              id="sample-demo-near"
              onClick={() => onLoadSample("sample-devops-near-ready")}
              className="flex flex-col items-start p-3.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-sm text-left transition-all group"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700">
                  Cloud / DevOps
                </span>
                <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5">
                  NEAR READY
                </span>
              </div>
              <p className="text-xs text-slate-600">
                AWS & Docker verified; Kubernetes needs video validation.
              </p>
            </button>

            <button
              id="sample-demo-gap"
              onClick={() => onLoadSample("sample-career-changer")}
              className="flex flex-col items-start p-3.5 rounded-xl bg-white border border-slate-200 hover:border-rose-400 hover:shadow-sm text-left transition-all group"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-slate-900 group-hover:text-rose-700">
                  Junior Transition
                </span>
                <span className="rounded bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5">
                  NOT READY
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Foundational web basics; unlocks structured learning path.
              </p>
            </button>
          </div>
        </div>

        {/* The 4 Pillars / Value Propositions */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-4">
              <Fingerprint className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Evidence Verification
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              We never equate a keyword to competence. Claims are ranked from
              VERY HIGH (production experience) to NONE.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 mb-4">
              <Video className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Video Assessment
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Validate unproven critical skills via browser recording. Strictly
              evaluates technical reasoning, zero appearance bias.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 mb-4">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Learning & Reassessment
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Prioritized skill gaps with tailored courses and projects. Submit
              proof to boost your score from NOT READY to READY.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mb-4">
              <Scale className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              ATS Resume & Audit
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Generate keyword-aligned ATS resumes using only verified facts.
              Audited against fabrication and formatting standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
