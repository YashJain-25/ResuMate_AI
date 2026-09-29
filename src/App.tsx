import React, { useState, useEffect } from "react";
import {
  AnalysisRecord,
  CandidateSkillProfile,
  GeneratedResume,
  JobTrack,
  LearningPath,
  LinkedInProfileData,
  ReassessmentAttempt,
  ResumeAuditReport,
  User,
  VideoAssessment,
} from "./types.js";
import {
  api,
  getStoredGuestAnalysisId,
  getStoredToken,
  setStoredGuestAnalysisId,
  setStoredToken,
} from "./lib/api.js";
import { syncAnalysisToFirestore, syncResumeToFirestore } from "./lib/firebase.js";
import { Navbar } from "./components/Navbar.js";
import { LandingHero } from "./components/LandingHero.js";
import { AnalyzeView } from "./components/AnalyzeView.js";
import { ParsedResumeView } from "./components/ParsedResumeView.js";
import { SkillGapWorkflowView } from "./components/SkillGapWorkflowView.js";
import { AnalysisDashboard } from "./components/AnalysisDashboard.js";
import { VideoAssessmentModal } from "./components/VideoAssessmentModal.js";
import { LearningPathView } from "./components/LearningPathView.js";
import { ReassessmentView } from "./components/ReassessmentView.js";
import { ResumeViewer } from "./components/ResumeViewer.js";
import { ResumeAuditView } from "./components/ResumeAuditView.js";
import { CandidateSkillProfileView } from "./components/CandidateSkillProfileView.js";
import { CandidateDashboardView } from "./components/CandidateDashboardView.js";
import { JobPortalView } from "./components/JobPortalView.js";
import { OrchestrationAgentView } from "./components/OrchestrationAgentView.js";
import { StepNavigationBar } from "./components/StepNavigationBar.js";
import { AuthModal } from "./components/AuthModal.js";
import { ResumePreGenerationModal, ResumeGenerationConfig } from "./components/ResumePreGenerationModal.js";
import { AlertCircle, ArrowRight, CheckCircle2, FileCheck2, FileText, Loader2, Sparkles, X } from "lucide-react";

const VALID_VIEWS = new Set([
  "landing",
  "analyze",
  "parsed_resume",
  "skill_gaps",
  "analysis",
  "learning",
  "reassessment",
  "resume",
  "audit",
  "jobs",
  "dashboard",
  "skills",
  "orchestrator",
]);

function getInitialViewFromHash(): string {
  if (typeof window === "undefined") return "landing";
  const hash = window.location.hash.replace(/^#/, "").trim();
  if (hash && VALID_VIEWS.has(hash)) {
    return hash;
  }
  return "landing";
}

export default function App() {
  // Navigation & View state
  const [currentView, setCurrentView] = useState<string>(getInitialViewFromHash);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Navigation helpers for complete transparency & step back-tracking
  const getViewTitle = (view: string): string => {
    switch (view) {
      case "landing":
        return "Home";
      case "analyze":
        return "Role & Input";
      case "parsed_resume":
        return "Parsed Resume";
      case "skill_gaps":
        return "Skill Gaps";
      case "analysis":
        return "Readiness Score";
      case "learning":
        return "Learning Curriculum";
      case "reassessment":
        return "Proof & Reassessment";
      case "resume":
        return "1-Page ATS Resume";
      case "audit":
        return "Resume Quality Audit";
      case "jobs":
        return "Job Portal";
      case "dashboard":
        return "Candidate Dashboard";
      case "skills":
        return "Skill Profile";
      case "orchestrator":
        return "Orchestration Agent";
      default:
        return "Previous Page";
    }
  };

  const getLogicalPreviousView = (view: string): string => {
    switch (view) {
      case "orchestrator":
        return currentAnalysis ? "analysis" : "landing";
      case "audit":
        return "resume";
      case "resume":
        return "analysis";
      case "reassessment":
        return "learning";
      case "learning":
        return "analysis";
      case "analysis":
        return "skill_gaps";
      case "skill_gaps":
        return "parsed_resume";
      case "parsed_resume":
        return "analyze";
      case "analyze":
        return "landing";
      case "jobs":
        if (activeResume) return "resume";
        if (currentAnalysis) return "analysis";
        if (user) return "dashboard";
        return "landing";
      case "skills":
        return "dashboard";
      case "dashboard":
        return "landing";
      default:
        return "landing";
    }
  };

  const navigateTo = (view: string, addToHistory: boolean = true) => {
    if (view === currentView) return;
    if (addToHistory) {
      setNavigationHistory((prev) => [...prev, currentView]);
      try {
        window.history.pushState({ view }, "", `#${view}`);
      } catch (_) {}
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const prevView = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory((prev) => prev.slice(0, -1));
      setCurrentView(prevView);
      try {
        window.history.pushState({ view: prevView }, "", `#${prevView}`);
      } catch (_) {}
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const logicalPrev = getLogicalPreviousView(currentView);
      setCurrentView(logicalPrev);
      try {
        window.history.pushState({ view: logicalPrev }, "", `#${logicalPrev}`);
      } catch (_) {}
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Browser history popstate synchronization
  useEffect(() => {
    try {
      window.history.replaceState({ view: currentView }, "", `#${currentView}`);
    } catch (_) {}

    const onPopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setCurrentView(e.state.view);
        setNavigationHistory((prev) => {
          if (prev.length > 0 && prev[prev.length - 1] === e.state.view) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } else {
        handleGoBack();
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [currentView, navigationHistory]);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [guestAnalysisId, setGuestAnalysisId] = useState<string | null>(getStoredGuestAnalysisId());

  // Domain State
  const [samples, setSamples] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<JobTrack | null>(null);
  const [prefilledResume, setPrefilledResume] = useState("");
  const [prefilledJob, setPrefilledJob] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [resumeModalAutoPrint, setResumeModalAutoPrint] = useState(false);

  // Active records
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisRecord | null>(null);
  const [activeVideoAssessment, setActiveVideoAssessment] = useState<VideoAssessment | null>(null);
  const [activeLearningPath, setActiveLearningPath] = useState<LearningPath | null>(null);
  const [activeResume, setActiveResume] = useState<GeneratedResume | null>(null);
  const [activeAudit, setActiveAudit] = useState<ResumeAuditReport | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateSkillProfile | null>(null);
  const [reassessmentHistory, setReassessmentHistory] = useState<ReassessmentAttempt[]>([]);
  const [userAnalyses, setUserAnalyses] = useState<AnalysisRecord[]>([]);

  // Feedback Notification Banner
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Hydrate resume, audit, and learning path whenever an analysis record is loaded
  const hydrateAnalysisArtifacts = async (analysis: AnalysisRecord | null | undefined) => {
    if (!analysis) return;
    if (analysis.generatedResumeId) {
      try {
        const [resResume, resAudit] = await Promise.all([
          api.getResume(analysis.generatedResumeId).catch(() => null),
          api.getResumeAudit(analysis.generatedResumeId).catch(() => null),
        ]);
        if (resResume?.resume) {
          setActiveResume((prev) =>
            prev && prev.analysisId === analysis.id ? prev : resResume.resume
          );
        }
        if (resAudit?.audit) {
          setActiveAudit(resAudit.audit);
        }
      } catch (err) {
        console.warn("Could not hydrate existing generated resume:", err);
      }
    }
    if (analysis.learningPathId) {
      api
        .getLearningPath(analysis.learningPathId)
        .then((res) => {
          if (res?.learningPath) setActiveLearningPath(res.learningPath);
        })
        .catch(() => {});
    }
  };

  // Initial Load: Check token, sample data, me endpoint, and skill profile
  useEffect(() => {
    api.getSamples().then((res) => {
      if (res.samples) setSamples(res.samples);
    }).catch(() => {});

    const storedGuestId = getStoredGuestAnalysisId();
    const token = getStoredToken();
    if (token) {
      api.getMe()
        .then((res) => {
          if (res.user) {
            setUser(res.user);
            return loadUserDashboard(res.user, storedGuestId || undefined);
          }
        })
        .catch(() => {
          setStoredToken(null);
          return loadProfileAndAnalysesFallback(storedGuestId || undefined);
        })
        .finally(() => {
          setIsInitialLoading(false);
        });
    } else {
      loadProfileAndAnalysesFallback(storedGuestId || undefined).finally(() => {
        setIsInitialLoading(false);
      });
    }
  }, []);

  const loadProfileAndAnalysesFallback = async (targetAnalysisId?: string) => {
    try {
      const profileRes = await api.getCandidateProfile(targetAnalysisId);
      if (profileRes.profile) setCandidateProfile(profileRes.profile);
      if (Array.isArray(profileRes.analyses) && profileRes.analyses.length > 0) {
        setUserAnalyses(profileRes.analyses);
      }
      if (profileRes.activeAnalysis) {
        setCurrentAnalysis((prev) => prev || profileRes.activeAnalysis || null);
        await hydrateAnalysisArtifacts(profileRes.activeAnalysis);
      }
    } catch (err) {
      console.warn("Fallback skill profile load:", err);
    }
  };

  // Reload user records
  const loadUserDashboard = async (_currentUser?: User | null, targetAnalysisId?: string) => {
    try {
      const [analysesRes, profileRes] = await Promise.all([
        api.getAnalyses().catch(() => ({ analyses: [] })),
        api.getCandidateProfile(targetAnalysisId).catch(() => ({
          profile: null,
          activeAnalysis: null,
          analyses: [],
        })),
      ]);
      const combinedAnalyses =
        analysesRes.analyses && analysesRes.analyses.length > 0
          ? analysesRes.analyses
          : profileRes.analyses || [];
      setUserAnalyses(combinedAnalyses);
      if (profileRes.profile) setCandidateProfile(profileRes.profile);
      const targetActive = profileRes.activeAnalysis || combinedAnalyses[0] || null;
      if (targetActive) {
        setCurrentAnalysis((prev) => prev || targetActive);
        await hydrateAnalysisArtifacts(targetActive);
      }
    } catch (err) {
      console.warn("Failed to load user dashboard:", err);
    }
  };

  // Handle Sample 1-Click Load
  const handleLoadSample = (sampleId: string) => {
    const found = samples.find((s) => s.id === sampleId);
    if (found) {
      setPrefilledResume(found.resume);
      setPrefilledJob(found.jobDescription);
      setCurrentTrack(found.track || "TECHNICAL");
      setCurrentView("analyze");
    }
  };

  // Run AI Analysis
  const handleAnalyze = async (
    resumeText: string,
    jobText: string,
    track?: JobTrack,
    linkedInData?: LinkedInProfileData
  ) => {
    setIsAnalyzing(true);
    try {
      setSelectedResumeSkills(undefined);
      setActiveResume(null);
      setActiveAudit(null);
      const activeTrack = track || currentTrack || undefined;
      const res = await api.analyze(resumeText, jobText, !user, activeTrack, linkedInData);
      setCurrentAnalysis(res.analysis);
      if (activeTrack) setCurrentTrack(activeTrack);

      if (res.analysis.isGuest) {
        setGuestAnalysisId(res.analysis.id);
        setStoredGuestAnalysisId(res.analysis.id);
        loadProfileAndAnalysesFallback(res.analysis.id);
      } else if (user) {
        loadUserDashboard(user, res.analysis.id);
        syncAnalysisToFirestore(user.id, res.analysis).catch((err) =>
          console.warn("Firestore analysis background sync:", err)
        );
      }

      setCurrentView("parsed_resume");
      showToast("Resume parsed and verified against Job Description!");
    } catch (err: any) {
      showToast(err.message || "Analysis failed.", "error");
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auth Operations
  const handleLogin = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setUser(res.user);
    await postAuthSuccess(res.user);
  };

  const handleRegister = async (name: string, email: string, pass: string) => {
    const res = await api.register(name, email, pass);
    setUser(res.user);
    await postAuthSuccess(res.user);
  };

  const handleFirebaseLogin = async (uid: string, email: string, name?: string) => {
    const res = await api.loginWithFirebase(uid, email, name);
    setUser(res.user);
    await postAuthSuccess(res.user);
  };

  const postAuthSuccess = async (authenticatedUser: User) => {
    await loadUserDashboard(authenticatedUser);

    // If guest analysis exists, claim it!
    const pendingGuestId = guestAnalysisId || currentAnalysis?.id;
    if (pendingGuestId && currentAnalysis?.isGuest) {
      try {
        const claimRes = await api.claimGuest(pendingGuestId);
        setCurrentAnalysis(claimRes.analysis);
        setGuestAnalysisId(null);
        setStoredGuestAnalysisId(null);
        showToast("Guest analysis successfully claimed and saved to your profile!");
      } catch (err) {
        console.warn("Failed to claim guest analysis:", err);
      }
    } else {
      showToast(`Welcome, ${authenticatedUser.name}!`);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentView("landing");
    showToast("Signed out successfully.");
  };

  // Video Assessment Workflow
  const handleStartVideoAssessment = async () => {
    if (!currentAnalysis) return;
    try {
      const res = await api.prepareVideoAssessment(currentAnalysis.id);
      setActiveVideoAssessment(res.assessment);
    } catch (err: any) {
      showToast(err.message || "Failed to initialize video assessment.", "error");
    }
  };

  const handleSubmitAssessmentAnswers = async (
    answers: { questionId: string; transcription: string; audioDurationSeconds?: number }[]
  ) => {
    if (!activeVideoAssessment) return;
    try {
      const res = await api.submitVideoAssessment(activeVideoAssessment.id, answers);
      setActiveVideoAssessment(null);
      if (currentAnalysis) {
        const updated = {
          ...currentAnalysis,
          readiness: res.updatedReadiness,
        };
        setCurrentAnalysis(updated);
      }
      showToast("Technical assessment evaluated! Verified evidence upgraded and score updated.");
    } catch (err: any) {
      showToast(err.message || "Evaluation failed.", "error");
    }
  };

  // Learning Path Workflow
  const handleStartLearningPath = async () => {
    if (!currentAnalysis) return;
    try {
      const res = await api.getLearningPath(currentAnalysis.learningPathId);
      setActiveLearningPath(res.learningPath);
      setCurrentView("learning");
    } catch (err: any) {
      showToast(err.message || "Failed to load learning path.", "error");
    }
  };

  const handleToggleLearningItem = async (itemId: string, completed: boolean) => {
    if (!activeLearningPath) return;
    try {
      const res = await api.toggleLearningItem(activeLearningPath.id, itemId, completed);
      setActiveLearningPath(res.learningPath);
    } catch (err: any) {
      showToast(err.message || "Failed to update item.", "error");
    }
  };

  // Reassessment Workflow
  const handleStartReassessment = async () => {
    if (!currentAnalysis) return;
    try {
      const res = await api.getReassessments(currentAnalysis.id);
      setReassessmentHistory(res.history || []);
      setCurrentView("reassessment");
    } catch (err: any) {
      console.warn("Failed to load reassessments:", err);
      setCurrentView("reassessment");
    }
  };

  const handleSubmitReassessment = async (proofDetails: string, improvedSkills: string[]) => {
    if (!currentAnalysis) return;
    const res = await api.submitReassessment(currentAnalysis.id, proofDetails, improvedSkills);
    // Refresh analysis record
    const updated = await api.getAnalysis(currentAnalysis.id);
    setCurrentAnalysis(updated.analysis);
    const refreshedHistory = await api.getReassessments(currentAnalysis.id);
    setReassessmentHistory(refreshedHistory.history || []);
    showToast("Reassessment evaluated! Readiness score updated.");
    return res.reassessment;
  };

  const [selectedResumeSkills, setSelectedResumeSkills] = useState<string[] | undefined>(undefined);

  // Resume Pre-Generation Configuration & Synthesis Workflow
  const handleOpenResumeModal = (autoPrint: boolean = false) => {
    setResumeModalAutoPrint(autoPrint);
    setIsResumeModalOpen(true);
  };

  const handleConfirmGenerateResume = async (config: ResumeGenerationConfig) => {
    if (!currentAnalysis) return;
    setIsGeneratingResume(true);
    try {
      showToast("Synthesizing tailored 1-page ATS resume...");
      const finalSkills = config.selectedSkills && config.selectedSkills.length > 0
        ? config.selectedSkills
        : selectedResumeSkills;
      const res = await api.generateResume(
        currentAnalysis.id,
        finalSkills,
        config.trackType,
        config.linkedInData || currentAnalysis.linkedInData
      );
      const customizedResume: GeneratedResume = {
        ...res.resume,
        trackType: config.trackType,
        photoUrl: config.photoUrl,
        templateId: config.templateId || "two_column",
      };
      setActiveResume(customizedResume);
      setActiveAudit(res.audit);
      setCurrentAnalysis((prev) =>
        prev ? { ...prev, generatedResumeId: customizedResume.id } : prev
      );
      if (user) {
        syncResumeToFirestore(user.id, customizedResume).catch((err) =>
          console.warn("Firestore resume background sync:", err)
        );
      }
      setIsResumeModalOpen(false);
      setCurrentView("resume");
      if (config.autoPrint) {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    } catch (err: any) {
      showToast(err.message || "Resume generation failed.", "error");
    } finally {
      setIsGeneratingResume(false);
    }
  };

  // Auto-generate or hydrate ATS Resume whenever user navigates directly to "5. ATS Resume" (#resume)
  useEffect(() => {
    if (currentView !== "resume" || activeResume || isGeneratingResume || !currentAnalysis) {
      return;
    }

    let cancelled = false;
    const ensureActiveResume = async () => {
      setIsGeneratingResume(true);
      try {
        if (currentAnalysis.generatedResumeId) {
          const [existingRes, existingAudit] = await Promise.all([
            api.getResume(currentAnalysis.generatedResumeId).catch(() => null),
            api.getResumeAudit(currentAnalysis.generatedResumeId).catch(() => null),
          ]);
          if (!cancelled && existingRes?.resume) {
            setActiveResume(existingRes.resume);
            if (existingAudit?.audit) setActiveAudit(existingAudit.audit);
            return;
          }
        }

        const effectiveTrack =
          currentAnalysis.jobTrack === "NON_TECHNICAL" ? "NON_TECHNICAL" : "TECHNICAL";
        const res = await api.generateResume(
          currentAnalysis.id,
          selectedResumeSkills,
          effectiveTrack,
          currentAnalysis.linkedInData
        );
        if (!cancelled && res?.resume) {
          const defaultResume: GeneratedResume = {
            ...res.resume,
            trackType: effectiveTrack,
            templateId: res.resume.templateId || "two_column",
          };
          setActiveResume(defaultResume);
          if (res.audit) setActiveAudit(res.audit);
          setCurrentAnalysis((prev) =>
            prev ? { ...prev, generatedResumeId: defaultResume.id } : prev
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          showToast(err.message || "Could not synthesize resume.", "error");
        }
      } finally {
        if (!cancelled) {
          setIsGeneratingResume(false);
        }
      }
    };

    ensureActiveResume();
    return () => {
      cancelled = true;
    };
  }, [currentView, currentAnalysis?.id, activeResume?.id]);

  // Auto-hydrate Audit if user visits #audit directly
  useEffect(() => {
    if (currentView === "audit" && !activeAudit && activeResume?.id) {
      api
        .getResumeAudit(activeResume.id)
        .then((res) => {
          if (res?.audit) setActiveAudit(res.audit);
        })
        .catch(() => {});
    }
  }, [currentView, activeAudit, activeResume?.id]);

  // 1-Click Instant Sample Analysis + Resume Synthesis helper for empty states
  const handleInstantDemoResume = async () => {
    const sample = samples[0];
    if (!sample) {
      setCurrentView("analyze");
      return;
    }
    setIsAnalyzing(true);
    setIsGeneratingResume(true);
    try {
      showToast("Running sample analysis & synthesizing 1-Page ATS Resume...");
      const res = await api.analyze(
        sample.resume,
        sample.jobDescription,
        !user,
        sample.track || "TECHNICAL"
      );
      setCurrentAnalysis(res.analysis);
      if (res.analysis.isGuest) {
        setGuestAnalysisId(res.analysis.id);
        setStoredGuestAnalysisId(res.analysis.id);
      }
      const resumeRes = await api.generateResume(
        res.analysis.id,
        undefined,
        sample.track === "NON_TECHNICAL" ? "NON_TECHNICAL" : "TECHNICAL"
      );
      setActiveResume({
        ...resumeRes.resume,
        templateId: "two_column",
      });
      setActiveAudit(resumeRes.audit);
      setCurrentView("resume");
      showToast("1-Page ATS Resume synthesized!");
    } catch (err: any) {
      showToast(err.message || "Failed to run sample demo.", "error");
      setCurrentView("analyze");
    } finally {
      setIsAnalyzing(false);
      setIsGeneratingResume(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Global Navbar */}
      <Navbar
        user={user}
        currentView={currentView}
        onNavigate={(v) => {
          if (v === "analyze" && currentView !== "analyze" && !prefilledResume && !prefilledJob) {
            setCurrentTrack(null);
          }
          navigateTo(v);
        }}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode || "login");
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        guestAnalysisId={guestAnalysisId}
        hasActiveAnalysis={Boolean(currentAnalysis)}
      />

      {/* Global Step Pipeline Bar */}
      <StepNavigationBar
        currentView={currentView}
        previousViewTitle={
          navigationHistory.length > 0
            ? getViewTitle(navigationHistory[navigationHistory.length - 1])
            : getViewTitle(getLogicalPreviousView(currentView))
        }
        canGoBack={currentView !== "landing"}
        onGoBack={handleGoBack}
        onNavigate={(v) => navigateTo(v)}
        hasActiveAnalysis={Boolean(currentAnalysis)}
        hasActiveResume={Boolean(activeResume)}
        hasUser={Boolean(user)}
      />

      {/* Global Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-xs font-semibold shadow-xl backdrop-blur-md transition-all animate-bounce print:hidden">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${
              toastMessage.type === "error" ? "bg-rose-600" : "bg-emerald-600"
            }`}
          >
            {toastMessage.type === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </div>
          <span className="text-slate-800">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === "landing" && (
          <LandingHero
            onStartAnalysis={() => {
              setPrefilledResume("");
              setPrefilledJob("");
              setCurrentTrack(null);
              setCurrentView("analyze");
            }}
            onLoadSample={handleLoadSample}
          />
        )}

        {currentView === "analyze" && (
          <AnalyzeView
            onAnalyze={handleAnalyze}
            isLoading={isAnalyzing}
            samples={samples}
            onLoadSample={handleLoadSample}
            prefilledResume={prefilledResume}
            prefilledJob={prefilledJob}
            initialTrack={currentTrack}
          />
        )}

        {currentView === "parsed_resume" && currentAnalysis && (
          <ParsedResumeView
            analysis={currentAnalysis}
            onUpdateAnalysis={(updated) => setCurrentAnalysis(updated)}
            onProceedToDashboard={() => setCurrentView("analysis")}
            onProceedToAtsResume={(confirmedSkills) => {
              if (confirmedSkills && confirmedSkills.length > 0) {
                setSelectedResumeSkills(confirmedSkills);
              }
              handleOpenResumeModal(false);
            }}
            onReviewSkillGaps={() => setCurrentView("skill_gaps")}
            onOpenSkillProfile={() => setCurrentView("skills")}
            onPrintResume={(confirmedSkills) => {
              if (confirmedSkills && confirmedSkills.length > 0) {
                setSelectedResumeSkills(confirmedSkills);
              }
              handleOpenResumeModal(true);
            }}
            isGeneratingResume={isGeneratingResume}
            onNewAnalysis={() => {
              setPrefilledResume("");
              setPrefilledJob("");
              setCurrentTrack(null);
              setCurrentView("analyze");
            }}
          />
        )}

        {currentView === "skill_gaps" && currentAnalysis && (
          <SkillGapWorkflowView
            analysis={currentAnalysis}
            onGenerateAtsResume={() => handleOpenResumeModal(false)}
            onBackToParsedResume={() => setCurrentView("parsed_resume")}
            onBackToDashboard={() => setCurrentView("analysis")}
            isGeneratingResume={isGeneratingResume}
          />
        )}

        {currentView === "analysis" && currentAnalysis && (
          <AnalysisDashboard
            analysis={currentAnalysis}
            user={user}
            onOpenAuth={(mode) => {
              setAuthModalMode(mode || "login");
              setAuthModalOpen(true);
            }}
            onStartVideoAssessment={handleStartVideoAssessment}
            onStartLearningPath={handleStartLearningPath}
            onGenerateResume={() => handleOpenResumeModal(false)}
            onViewParsedResume={() => setCurrentView("parsed_resume")}
            onReviewSkillGaps={() => setCurrentView("skill_gaps")}
            onOpenSkillProfile={() => setCurrentView("skills")}
            onReanalyze={() => {
              setPrefilledResume("");
              setPrefilledJob("");
              setCurrentTrack(null);
              setCurrentView("analyze");
            }}
          />
        )}

        {currentView === "learning" && activeLearningPath && (
          <LearningPathView
            learningPath={activeLearningPath}
            onToggleItem={handleToggleLearningItem}
            onStartReassessment={handleStartReassessment}
            onBackToAnalysis={() => setCurrentView("analysis")}
            onGenerateResume={() => handleOpenResumeModal(false)}
          />
        )}

        {currentView === "reassessment" && currentAnalysis && (
          <ReassessmentView
            analysis={currentAnalysis}
            history={reassessmentHistory}
            onSubmitReassessment={handleSubmitReassessment}
            onBackToAnalysis={() => setCurrentView("analysis")}
          />
        )}

        {(currentView === "parsed_resume" ||
          currentView === "skill_gaps" ||
          currentView === "analysis" ||
          currentView === "reassessment") &&
          !currentAnalysis && (
            <div className="mx-auto max-w-2xl px-4 py-16">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                {isInitialLoading || isAnalyzing ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Loading Your Resume Analysis...
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md">
                      Restoring your parsed resume, skill evidence, and readiness metrics.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        No Active Resume Analysis Found
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 max-w-md">
                        Upload your resume and target job description first, or load a sample profile to explore this step immediately.
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentView("analyze")}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
                      >
                        <span>Go to Resume &amp; JD Input</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleInstantDemoResume}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <span>Run Instant Sample Analysis</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {currentView === "resume" && activeResume && (
          <ResumeViewer
            resume={activeResume}
            onViewAudit={() => setCurrentView("audit")}
            onBackToAnalysis={() => setCurrentView("analysis")}
            onBackToGaps={() => setCurrentView("skill_gaps")}
            onReconfigureResume={() => handleOpenResumeModal(false)}
            onUpdatePhoto={(newPhotoUrl) =>
              setActiveResume((prev) => (prev ? { ...prev, photoUrl: newPhotoUrl } : prev))
            }
          />
        )}

        {currentView === "resume" && !activeResume && (
          <div className="mx-auto max-w-2xl px-4 py-16">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              {isInitialLoading || isGeneratingResume || isAnalyzing ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Loader2 className="h-7 w-7 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Synthesizing Your 1-Page ATS Resume...
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-md">
                      Optimizing layout density, preserving 100% of verified candidate details, and aligning keywords with your target job description.
                    </p>
                  </div>
                </div>
              ) : currentAnalysis ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <FileCheck2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Generate Your 1-Page ATS Resume
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-md">
                      Your resume analysis for <span className="font-semibold text-slate-800">{currentAnalysis.candidateName || "Candidate"}</span> is ready. Choose a template and synthesize your 1-page ATS-optimized resume now.
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenResumeModal(false)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Configure &amp; Generate ATS Resume</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleConfirmGenerateResume({
                          trackType:
                            currentAnalysis.jobTrack === "NON_TECHNICAL"
                              ? "NON_TECHNICAL"
                              : "TECHNICAL",
                          autoPrint: false,
                          selectedSkills: selectedResumeSkills,
                          templateId: "two_column",
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <span>Quick 1-Click Generate</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <FileCheck2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Ready to Build Your 1-Page ATS Resume
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-md">
                      Start by analyzing your resume and target job description, or launch an instant sample resume to preview all 12 ATS templates and dynamic 1-page A4 PDF export.
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentView("analyze")}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
                    >
                      <span>Upload Resume &amp; Job Description</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleInstantDemoResume}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs font-bold text-indigo-900 hover:bg-indigo-100 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <span>Load Sample &amp; Generate ATS Resume</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === "audit" && activeAudit && (
          <ResumeAuditView
            audit={activeAudit}
            onBackToResume={() => setCurrentView("resume")}
          />
        )}

        {currentView === "audit" && !activeAudit && (
          <div className="mx-auto max-w-2xl px-4 py-16 text-center">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                No ATS Audit Record Loaded
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Generate your 1-Page ATS Resume first to inspect its anti-hallucination and keyword verification audit.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView("resume")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
              >
                <span>Go to ATS Resume</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {currentView === "skills" && (
          <CandidateSkillProfileView
            profile={candidateProfile}
            currentAnalysis={currentAnalysis}
            userAnalyses={userAnalyses}
            onSelectAnalysis={(selected) => setCurrentAnalysis(selected)}
            onNavigateToAnalyze={() => setCurrentView("analyze")}
            onBackToDashboard={() =>
              setCurrentView(
                currentAnalysis ? "parsed_resume" : user ? "dashboard" : "analyze"
              )
            }
          />
        )}

        {currentView === "dashboard" && user && (
          <CandidateDashboardView
            user={user}
            analyses={userAnalyses}
            onSelectAnalysis={(id) => {
              const selected = userAnalyses.find((a) => a.id === id);
              if (selected) {
                setCurrentAnalysis(selected);
                setCurrentView("analysis");
              }
            }}
            onNewAnalysis={() => {
              setPrefilledResume("");
              setPrefilledJob("");
              setCurrentView("analyze");
            }}
            onViewSkills={() => setCurrentView("skills")}
          />
        )}

        {currentView === "jobs" && (
          <JobPortalView
            user={user}
            currentAnalysis={currentAnalysis}
            activeResume={activeResume}
            userAnalyses={userAnalyses}
            candidateProfile={candidateProfile}
            onOpenAuth={(mode) => {
              setAuthModalMode(mode || "login");
              setAuthModalOpen(true);
            }}
            onNavigateToAnalyze={() => {
              setPrefilledResume("");
              setPrefilledJob("");
              setCurrentView("analyze");
            }}
            onShowToast={showToast}
          />
        )}

        {currentView === "orchestrator" && (
          <OrchestrationAgentView
            currentAnalysis={currentAnalysis}
            activeResume={activeResume}
            activeAudit={activeAudit}
            activeLearningPath={activeLearningPath}
            samples={samples}
            onHydrateFromOrchestration={({ analysis, resume, audit, learningPath }) => {
              setCurrentAnalysis(analysis);
              setActiveResume(resume);
              setActiveAudit(audit);
              if (learningPath) {
                setActiveLearningPath(learningPath);
              }
              if (analysis.isGuest) {
                setGuestAnalysisId(analysis.id);
                setStoredGuestAnalysisId(analysis.id);
              }
            }}
            onNavigateToView={(target) => navigateTo(target)}
          />
        )}
      </main>

      {/* Video Assessment Modal */}
      {activeVideoAssessment && (
        <VideoAssessmentModal
          assessment={activeVideoAssessment}
          onClose={() => setActiveVideoAssessment(null)}
          onSubmitAnswers={handleSubmitAssessmentAnswers}
          isSubmitting={false}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onFirebaseLogin={handleFirebaseLogin}
        guestAnalysisId={guestAnalysisId}
      />

      {/* 1-Page ATS Resume Pre-Generation Configuration Modal */}
      {currentAnalysis && (
        <ResumePreGenerationModal
          isOpen={isResumeModalOpen}
          onClose={() => setIsResumeModalOpen(false)}
          analysis={currentAnalysis}
          onConfirm={handleConfirmGenerateResume}
          isGenerating={isGeneratingResume}
          initialAutoPrint={resumeModalAutoPrint}
          initialSelectedSkills={selectedResumeSkills}
          initialPhotoUrl={activeResume?.photoUrl}
          initialTemplateId={activeResume?.templateId}
        />
      )}

      {/* Professional Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 print:hidden">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">ResuMate AI</span>
            <span>&bull;</span>
            <span>Deterministic Career Readiness & Resume Intelligence</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Anti-Hallucination Verified</span>
            <span>&bull;</span>
            <span>Zero-Bias Technical Evaluation</span>
            <span>&bull;</span>
            <span>Strict Evidence Hierarchy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
