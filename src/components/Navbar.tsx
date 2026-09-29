import React from "react";
import { User } from "../types.js";
import {
  BrainCircuit,
  LogOut,
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  Briefcase,
} from "lucide-react";

interface NavbarProps {
  user: User | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (initialMode?: "login" | "register") => void;
  onLogout: () => void;
  guestAnalysisId: string | null;
  hasActiveAnalysis?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentView,
  onNavigate,
  onOpenAuth,
  onLogout,
  guestAnalysisId,
  hasActiveAnalysis = false,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div
          id="nav-brand-logo"
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform shrink-0">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="whitespace-nowrap">
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ResuMate<span className="text-indigo-600">AI</span>
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
          <button
            id="nav-analyze-btn"
            onClick={() => onNavigate("analyze")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              currentView === "analyze"
                ? "bg-indigo-50 text-indigo-700 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            Analyze
          </button>

          <button
            id="nav-orchestrator-btn"
            onClick={() => onNavigate("orchestrator")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              currentView === "orchestrator"
                ? "bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-300"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <BrainCircuit className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>Orchestrator</span>
          </button>

          {(hasActiveAnalysis || user) && (
            <button
              id="nav-skills-btn"
              onClick={() => onNavigate("skills")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                currentView === "skills"
                  ? "bg-emerald-50 text-emerald-800 font-bold ring-1 ring-emerald-300"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Skill Profile</span>
            </button>
          )}

          {user && (
            <button
              id="nav-dashboard-btn"
              onClick={() => onNavigate("dashboard")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                currentView === "dashboard"
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              Dashboard
            </button>
          )}

          {/* Guest conversion badge indicator */}
          {!user && guestAnalysisId && (
            <button
              id="nav-guest-claim-btn"
              onClick={() => onOpenAuth("register")}
              className="hidden md:flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors whitespace-nowrap"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Save Progress</span>
            </button>
          )}

          {/* User Auth controls */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
              <div className="flex items-center gap-2 rounded-lg bg-slate-100/80 px-3 py-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-800 hidden sm:inline max-w-[120px] truncate">
                  {user.name}
                </span>
              </div>
              <button
                id="nav-logout-btn"
                onClick={onLogout}
                title="Log Out"
                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
              <button
                id="nav-login-btn"
                onClick={() => onOpenAuth("login")}
                className="px-3 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                id="nav-register-btn"
                onClick={() => onOpenAuth("register")}
                className="px-3.5 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-colors whitespace-nowrap"
              >
                Register
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
