import React from "react";
import {
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  FileText,
  Layers,
  BarChart3,
  FileCheck2,
  Briefcase,
  GraduationCap,
  RefreshCw,
  Home,
  CheckCircle2,
} from "lucide-react";

interface StepNavigationBarProps {
  currentView: string;
  previousViewTitle: string | null;
  canGoBack: boolean;
  onGoBack: () => void;
  onNavigate: (view: string) => void;
  hasActiveAnalysis: boolean;
  hasActiveResume: boolean;
  hasUser: boolean;
}

interface WorkflowStep {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  isAccessible: boolean;
}

export const StepNavigationBar: React.FC<StepNavigationBarProps> = ({
  currentView,
  previousViewTitle,
  canGoBack,
  onGoBack,
  onNavigate,
  hasActiveAnalysis,
  hasActiveResume,
  hasUser,
}) => {
  // Do not render on landing page
  if (currentView === "landing") return null;

  // Ordered primary pipeline steps for transparency
  const primarySteps: WorkflowStep[] = [
    {
      id: "analyze",
      label: "1. Role & Input",
      shortLabel: "Input",
      icon: <FileText className="h-3.5 w-3.5" />,
      isAccessible: true,
    },
    {
      id: "parsed_resume",
      label: "2. Parsed Resume",
      shortLabel: "Parsed",
      icon: <Layers className="h-3.5 w-3.5" />,
      isAccessible: hasActiveAnalysis,
    },
    {
      id: "skill_gaps",
      label: "3. Skill Gaps",
      shortLabel: "Gaps",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      isAccessible: hasActiveAnalysis,
    },
    {
      id: "analysis",
      label: "4. Readiness Score",
      shortLabel: "Readiness",
      icon: <BarChart3 className="h-3.5 w-3.5" />,
      isAccessible: hasActiveAnalysis,
    },
    {
      id: "resume",
      label: "5. ATS Resume",
      shortLabel: "Resume",
      icon: <FileCheck2 className="h-3.5 w-3.5" />,
      isAccessible: hasActiveResume || hasActiveAnalysis,
    },
    {
      id: "skills",
      label: "6. Skill Profile & Job Roles",
      shortLabel: "Skills & Roles",
      icon: <Briefcase className="h-3.5 w-3.5" />,
      isAccessible: true,
    },
    {
      id: "orchestrator",
      label: "7. Orchestrator",
      shortLabel: "Orchestrator",
      icon: <RefreshCw className="h-3.5 w-3.5" />,
      isAccessible: true,
    },
  ];

  // Ancillary steps mapping
  const getSubstepIndicator = () => {
    switch (currentView) {
      case "learning":
        return { label: "Skill-Gap Curriculum", icon: <GraduationCap className="h-3.5 w-3.5 text-indigo-600" /> };
      case "reassessment":
        return { label: "Continuous Reassessment", icon: <RefreshCw className="h-3.5 w-3.5 text-indigo-600" /> };
      case "audit":
        return { label: "6-Point ATS & Fact Audit", icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> };
      case "skills":
        return { label: "Candidate Skill Profile", icon: <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" /> };
      default:
        return null;
    }
  };

  const substep = getSubstepIndicator();

  return (
    <div
      id="global-step-nav-bar"
      className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 sm:px-6 lg:px-8 print:hidden select-none transition-all"
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {/* Left: Prominent Back Navigation Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="global-btn-back"
            onClick={onGoBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 whitespace-nowrap"
            title={previousViewTitle ? `Return back to ${previousViewTitle}` : "Return to previous page"}
          >
            <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5] shrink-0" />
            <span>
              Back{previousViewTitle ? `: ${previousViewTitle}` : ""}
            </span>
          </button>

          {/* Quick jump to Home */}
          <button
            type="button"
            id="global-btn-home"
            onClick={() => onNavigate("landing")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap"
            title="Return to Home Landing"
          >
            <Home className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* Substep contextual badge */}
          {substep && (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 text-xs whitespace-nowrap">
              {substep.icon}
              <span className="font-semibold">{substep.label}</span>
            </div>
          )}
        </div>

        {/* Right: Transparent Step Trail (Every step clickable to jump back!) */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-0.5 no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden xl:inline mr-1">
            Transparency Pipeline:
          </span>

          {primarySteps.map((step, index) => {
            const isActive = currentView === step.id;
            const isClickable = step.isAccessible;

            return (
              <React.Fragment key={step.id}>
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />
                )}

                <button
                  type="button"
                  id={`pipeline-step-${step.id}`}
                  disabled={!isClickable}
                  onClick={() => {
                    if (isClickable) {
                      onNavigate(step.id);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    isActive
                      ? "bg-white text-slate-900 font-extrabold shadow-sm ring-2 ring-indigo-400"
                      : isClickable
                      ? "bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      : "text-slate-500 cursor-not-allowed opacity-60"
                  }`}
                  title={
                    isActive
                      ? `Current Step: ${step.label}`
                      : isClickable
                      ? `Jump back/to: ${step.label}`
                      : `Complete prior steps to unlock ${step.label}`
                  }
                >
                  <span className={isActive ? "text-indigo-600" : "text-slate-400"}>
                    {step.icon}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
