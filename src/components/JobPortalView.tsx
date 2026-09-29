import React, { useState, useEffect, useMemo } from "react";
import {
  RealJobListing,
  JobSource,
  JobRecommendation,
  JobApplicationRecord,
  ApplicationStatus,
  User,
  AnalysisRecord,
  GeneratedResume,
  CandidateSkillProfile,
} from "../types.js";
import { api } from "../lib/api.js";
import {
  Briefcase,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Send,
  Sparkles,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Layers,
  FileText,
  RefreshCw,
  X,
  SlidersHorizontal,
  TrendingUp,
  Info,
  ShieldCheck,
  Check,
} from "lucide-react";

interface JobPortalViewProps {
  user: User | null;
  currentAnalysis: AnalysisRecord | null;
  activeResume: GeneratedResume | null;
  userAnalyses: AnalysisRecord[];
  candidateProfile: CandidateSkillProfile | null;
  onOpenAuth: (mode?: "login" | "register") => void;
  onNavigateToAnalyze: () => void;
  onShowToast: (text: string, type?: "success" | "error") => void;
  onBack?: () => void;
}

export const JobPortalView: React.FC<JobPortalViewProps> = ({
  user,
  currentAnalysis,
  activeResume,
  userAnalyses,
  candidateProfile,
  onOpenAuth,
  onNavigateToAnalyze,
  onShowToast,
  onBack,
}) => {
  // Navigation tabs: "recommendations" | "explore" | "tracker"
  const [activeTab, setActiveTab] = useState<"recommendations" | "explore" | "tracker">("recommendations");

  // Selected resume state
  const [selectedResumeId, setSelectedResumeId] = useState<string>(() => {
    if (activeResume) return activeResume.id;
    if (currentAnalysis?.generatedResumeId) return currentAnalysis.generatedResumeId;
    if (userAnalyses.length > 0 && userAnalyses[0].generatedResumeId) {
      return userAnalyses[0].generatedResumeId;
    }
    return "current_analysis";
  });

  // Jobs data
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [allJobs, setAllJobs] = useState<RealJobListing[]>([]);
  const [applications, setApplications] = useState<JobApplicationRecord[]>([]);

  // Loading states
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [selectedExperience, setSelectedExperience] = useState<string>("ALL");
  const [remoteOnly, setRemoteOnly] = useState<boolean>(false);
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<string>("ALL");

  // Modal / Detail state
  const [selectedJobForModal, setSelectedJobForModal] = useState<{
    job: RealJobListing;
    match?: any;
  } | null>(null);
  const [externalApplyConfirmJob, setExternalApplyConfirmJob] = useState<RealJobListing | null>(null);
  const [directApplySubmitting, setDirectApplySubmitting] = useState<boolean>(false);
  const [applicationCoverNote, setApplicationCoverNote] = useState<string>("");

  // Extracted skills for current selected resume
  const candidateActiveSkills = useMemo(() => {
    // 1. If user has verified canonical skill profile, use it
    if (candidateProfile && Array.isArray(candidateProfile.canonicalSkills) && candidateProfile.canonicalSkills.length > 0) {
      return candidateProfile.canonicalSkills.map((cs: any) => cs.skill || cs.canonicalName).filter(Boolean);
    }
    // 2. If current analysis exists, use parsed resume skills
    if (currentAnalysis?.parsedResume?.skills) {
      return currentAnalysis.parsedResume.skills;
    }
    // 3. Fallback to any past analysis
    if (userAnalyses.length > 0 && userAnalyses[0].parsedResume?.skills) {
      return userAnalyses[0].parsedResume.skills;
    }
    return [];
  }, [candidateProfile, currentAnalysis, userAnalyses]);

  // Load all jobs and recommendations
  const loadJobsData = async (force: boolean = false) => {
    if (force) setIsRefreshing(true);
    else setIsLoadingJobs(true);

    try {
      const [jobsRes, recsRes] = await Promise.all([
        api.getJobs({ refresh: force }),
        api.getJobRecommendations({
          resumeId: selectedResumeId !== "current_analysis" ? selectedResumeId : undefined,
          skills: candidateActiveSkills,
          jobTrack: currentAnalysis?.jobTrack,
        }),
      ]);

      setAllJobs(jobsRes.jobs || []);
      setRecommendations(recsRes.recommendations || []);
    } catch (err: any) {
      console.error("Failed to load jobs data:", err);
      onShowToast(err.message || "Failed to load job listings.", "error");
    } finally {
      setIsLoadingJobs(false);
      setIsLoadingRecs(false);
      setIsRefreshing(false);
    }
  };

  // Load applications if user logged in
  const loadApplications = async () => {
    if (!user) {
      setApplications([]);
      return;
    }
    try {
      const res = await api.getJobApplications();
      setApplications(res.applications || []);
    } catch (err) {
      console.warn("Failed to load applications:", err);
    }
  };

  useEffect(() => {
    loadJobsData();
  }, [selectedResumeId, candidateActiveSkills.length]);

  useEffect(() => {
    if (user) {
      loadApplications();
    }
  }, [user]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      // Source filter
      if (selectedSource !== "ALL" && job.jobSource !== selectedSource) {
        return false;
      }
      // Remote filter
      if (remoteOnly && !job.isRemote) {
        return false;
      }
      // Experience filter
      if (selectedExperience !== "ALL" && job.experienceLevel !== selectedExperience) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company.toLowerCase().includes(q);
        const matchesLocation = job.location.toLowerCase().includes(q);
        const matchesSkill = job.requiredSkills.some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCompany && !matchesLocation && !matchesSkill) {
          return false;
        }
      }
      return true;
    });
  }, [allJobs, selectedSource, remoteOnly, selectedExperience, searchQuery]);

  // Filtered applications list
  const filteredApplications = useMemo(() => {
    if (trackerStatusFilter === "ALL") return applications;
    return applications.filter((app) => app.status === trackerStatusFilter);
  }, [applications, trackerStatusFilter]);

  // Handle Save Job
  const handleSaveJob = async (job: RealJobListing, matchScore: number = 85) => {
    if (!user) {
      onOpenAuth("register");
      onShowToast("Please sign in or register to save jobs to your tracker.", "error");
      return;
    }

    try {
      const res = await api.applyToJob({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        jobSource: job.jobSource,
        sourceUrl: job.sourceUrl,
        applyUrl: job.applyUrl,
        resumeId: selectedResumeId,
        resumeTitle: getSelectedResumeTitle(),
        status: "SAVED",
        isDirectSubmission: false,
        matchScore,
        notes: "Saved from Job Portal for future review.",
      });

      setApplications((prev) => {
        const filtered = prev.filter((a) => a.jobId !== job.id);
        return [res.application, ...filtered];
      });

      onShowToast(`Saved "${job.title}" at ${job.company} to your Application Tracker!`);
    } catch (err: any) {
      onShowToast(err.message || "Failed to save job.", "error");
    }
  };

  // Handle Click Apply
  const handleInitiateApply = (job: RealJobListing, match?: any) => {
    if (job.supportsDirectApply) {
      // Direct application supported
      setSelectedJobForModal({ job, match });
    } else {
      // External authorized portal (LinkedIn, Internshala, Naukri, Indeed, Wellfound)
      setExternalApplyConfirmJob(job);
    }
  };

  // Submit Direct Application
  const handleExecuteDirectApply = async (job: RealJobListing, matchScore: number = 85) => {
    setDirectApplySubmitting(true);
    try {
      const res = await api.applyToJob({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        jobSource: job.jobSource,
        sourceUrl: job.sourceUrl,
        applyUrl: job.applyUrl,
        resumeId: selectedResumeId,
        resumeTitle: getSelectedResumeTitle(),
        status: "APPLIED",
        isDirectSubmission: true,
        matchScore,
        notes: applicationCoverNote.trim()
          ? `Direct application submitted. Candidate note: "${applicationCoverNote.trim()}"`
          : "Direct partner application submitted with verified ATS resume.",
      });

      setApplications((prev) => {
        const filtered = prev.filter((a) => a.jobId !== job.id);
        return [res.application, ...filtered];
      });

      setSelectedJobForModal(null);
      setApplicationCoverNote("");
      onShowToast(`Application submitted directly to ${job.company}! Status: APPLIED.`);
    } catch (err: any) {
      onShowToast(err.message || "Direct application failed.", "error");
    } finally {
      setDirectApplySubmitting(false);
    }
  };

  // Confirm External Apply (Never falsely claims application submitted)
  const handleConfirmExternalApply = async (markAsOpenedOnly: boolean) => {
    if (!externalApplyConfirmJob) return;
    const job = externalApplyConfirmJob;

    // Track as VIEWED / Application Opened
    if (user) {
      try {
        const res = await api.applyToJob({
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          jobSource: job.jobSource,
          sourceUrl: job.sourceUrl,
          applyUrl: job.applyUrl,
          resumeId: selectedResumeId,
          resumeTitle: getSelectedResumeTitle(),
          status: "VIEWED", // Explicitly "Application Opened", NOT submitted
          isDirectSubmission: false,
          matchScore: 85,
          notes: `Official ${job.jobSource} application page opened in new tab.`,
        });

        setApplications((prev) => {
          const filtered = prev.filter((a) => a.jobId !== job.id);
          return [res.application, ...filtered];
        });
      } catch (err) {
        console.warn("Failed to log external apply event:", err);
      }
    }

    // Open official portal in new tab
    const urlToOpen = job.applyUrl || job.sourceUrl;
    window.open(urlToOpen, "_blank", "noopener,noreferrer");

    setExternalApplyConfirmJob(null);
    onShowToast(`Official ${job.jobSource} job page opened. Tracked as 'Application Opened'.`);
  };

  // Update Application Status in Tracker
  const handleUpdateAppStatus = async (appId: string, newStatus: ApplicationStatus) => {
    if (!user) return;
    try {
      const res = await api.updateJobApplication(appId, { status: newStatus });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? res.application : a))
      );
      onShowToast(`Application status updated to: ${newStatus}`);
    } catch (err: any) {
      onShowToast(err.message || "Failed to update status.", "error");
    }
  };

  // Delete Application
  const handleDeleteApp = async (appId: string) => {
    if (!user) return;
    try {
      await api.deleteJobApplication(appId);
      setApplications((prev) => prev.filter((a) => a.id !== appId));
      onShowToast("Application removed from tracker.");
    } catch (err: any) {
      onShowToast(err.message || "Failed to remove application.", "error");
    }
  };

  // Helper for resume title
  const getSelectedResumeTitle = () => {
    if (selectedResumeId === "current_analysis") {
      return currentAnalysis ? `ATS Resume (${currentAnalysis.parsedJob?.jobTitle || "Tailored"})` : "Current ATS Resume";
    }
    const found = userAnalyses.find((a) => a.generatedResumeId === selectedResumeId);
    if (found) return `ATS Resume: ${found.parsedJob?.jobTitle || "Tailored"}`;
    return "ATS-Tailored Resume";
  };

  // Source styling
  const getSourceBadgeClass = (source: JobSource) => {
    switch (source) {
      case "LinkedIn":
        return "bg-blue-600 text-white border-blue-700";
      case "Internshala":
        return "bg-sky-600 text-white border-sky-700";
      case "Naukri":
        return "bg-indigo-900 text-white border-indigo-950";
      case "Indeed":
        return "bg-blue-800 text-white border-blue-900";
      case "Wellfound":
        return "bg-amber-600 text-white border-amber-700";
      case "Company Career Page":
        return "bg-teal-700 text-white border-teal-800";
      default:
        return "bg-slate-700 text-white border-slate-800";
    }
  };

  // Status badge styling
  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "SAVED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">Saved</span>;
      case "VIEWED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">Application Opened</span>;
      case "APPLIED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">Application Submitted</span>;
      case "INTERVIEW":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-300">Interview Scheduled</span>;
      case "ASSESSMENT":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300">Assessment</span>;
      case "OFFER":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-400">Offer Received 🎉</span>;
      case "REJECTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">Declined</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Back navigation for step transparency */}
        {onBack && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              id="job-portal-back-btn"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>&larr; Back to Previous Page</span>
            </button>
          </div>
        )}

        {/* ================= HEADER ================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-100/60 via-violet-50/40 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                  <Briefcase className="h-3.5 w-3.5" />
                  Verified Real Job Feeds
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                  <ShieldCheck className="h-3 w-3" />
                  Authorized Sources Only
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Live Job Portal & Resume Matcher
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Currently available jobs from legitimate authorized sources (LinkedIn, Internshala, Naukri, Indeed, Wellfound, and official Company Career Pages) matched against your verified ATS resume without simulation or fabricated data.
              </p>
            </div>

            {/* Resume Switcher Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 lg:w-96 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  Target Resume for Matching:
                </span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  {candidateActiveSkills.length} Verified Skills
                </span>
              </div>

              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              >
                {currentAnalysis && (
                  <option value="current_analysis">
                    ★ Latest ATS Resume ({currentAnalysis.parsedJob?.jobTitle || "Active Analysis"})
                  </option>
                )}
                {userAnalyses
                  .filter((a) => a.id !== currentAnalysis?.id)
                  .map((a) => (
                    <option key={a.id} value={a.generatedResumeId || a.id}>
                      ATS Resume: {a.parsedJob?.jobTitle || "Archived"} ({new Date(a.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                {userAnalyses.length === 0 && !currentAnalysis && (
                  <option value="default_profile">Default Profile Skills</option>
                )}
              </select>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>Want to target a different role?</span>
                <button
                  onClick={onNavigateToAnalyze}
                  className="font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                >
                  Analyze New Resume <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setActiveTab("recommendations")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "recommendations"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                Jobs for My Resume ({recommendations.length})
              </button>

              <button
                onClick={() => setActiveTab("explore")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "explore"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Search className="h-4 w-4 text-slate-500" />
                Explore All Live Jobs ({allJobs.length})
              </button>

              <button
                onClick={() => setActiveTab("tracker")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === "tracker"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="h-4 w-4 text-emerald-600" />
                Application Tracker
                {applications.length > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {applications.length}
                  </span>
                )}
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadJobsData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
              Refresh Live Feeds
            </button>
          </div>
        </div>

        {/* ================= TAB 1: JOBS FOR MY RESUME ================= */}
        {activeTab === "recommendations" && (
          <div className="space-y-6">
            {/* Recommendation Explainer Banner */}
            <div className="bg-gradient-to-r from-indigo-900 to-violet-900 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                    High ATS Compatibility
                  </span>
                  <span className="text-xs text-indigo-200">
                    Ranked by factual skill alignment & role track
                  </span>
                </div>
                <h3 className="text-base font-bold">
                  Recommended Opportunities for Your Profile
                </h3>
                <p className="text-xs text-indigo-200 max-w-2xl">
                  These real positions match your verified competencies in {candidateActiveSkills.slice(0, 4).join(", ") || "software engineering"}. Each listing details why it matches your resume and outlines any specific skill gaps.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                  <div className="text-xl font-extrabold text-amber-300">
                    {recommendations.filter((r) => r.match.matchScore >= 80).length}
                  </div>
                  <div className="text-[10px] text-indigo-200 font-medium">Top Fits (≥80%)</div>
                </div>
              </div>
            </div>

            {/* Recommendations Grid */}
            {isLoadingRecs ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
                <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Analyzing real jobs against your verified resume competencies...
                </p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
                <Briefcase className="h-12 w-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">No Direct Recommendations Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try browsing all live jobs in the "Explore All Live Jobs" tab or analyze a new resume to establish your verified skill profile.
                </p>
                <button
                  onClick={() => setActiveTab("explore")}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Explore All Jobs
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {recommendations.map(({ job, match }) => {
                  const isSaved = applications.some((a) => a.jobId === job.id);
                  return (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-5"
                    >
                      {/* Top bar: Source + Score Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* AUTHORIZED SOURCE BADGE */}
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border shadow-2xs ${getSourceBadgeClass(
                                job.jobSource
                              )}`}
                            >
                              {job.jobSource}
                            </span>

                            {job.isRemote && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Remote
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {job.jobType}
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug hover:text-indigo-600 transition-colors">
                            {job.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1 text-slate-700 font-semibold">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              {job.company}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {job.location}
                            </span>
                            {job.salaryRange && (
                              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                                {job.salaryRange}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Match Score Meter */}
                        <div className="text-right shrink-0">
                          <div
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold text-sm border shadow-xs ${
                              match.matchScore >= 80
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : match.matchScore >= 60
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                            {match.matchScore}% Match
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-medium">
                            ATS Score
                          </div>
                        </div>
                      </div>

                      {/* WHY THIS JOB MATCHES */}
                      <div className="bg-indigo-50/70 rounded-xl p-3.5 border border-indigo-100 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                          Why this matches your resume:
                        </div>
                        <p className="text-indigo-800 leading-relaxed text-[11px]">
                          {match.strengthsSummary}
                        </p>

                        {/* Matched skills chips */}
                        {match.matchedSkills.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <span className="text-[10px] font-semibold text-indigo-600 mr-1">
                              Matched:
                            </span>
                            {match.matchedSkills.map((sk: string) => (
                              <span
                                key={sk}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-emerald-800 font-semibold text-[10px] border border-emerald-200 shadow-2xs"
                              >
                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* SKILL GAPS IDENTIFIED */}
                      {match.skillGaps.length > 0 && (
                        <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/80 space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            Skill Gaps to Address:
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {match.skillGaps.map((gap: string) => (
                              <span
                                key={gap}
                                className="px-2 py-0.5 rounded-md bg-white text-amber-800 font-medium text-[10px] border border-amber-200 shadow-2xs"
                              >
                                {gap}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveJob(job, match.matchScore)}
                            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                              isSaved
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                            title={isSaved ? "Saved in Tracker" : "Save Job"}
                          >
                            {isSaved ? (
                              <BookmarkCheck className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
                          </button>

                          <button
                            onClick={() => setSelectedJobForModal({ job, match })}
                            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            Details
                          </button>
                        </div>

                        <button
                          onClick={() => handleInitiateApply(job, match)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                            job.supportsDirectApply
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                              : "bg-slate-900 hover:bg-slate-800 text-white"
                          }`}
                        >
                          {job.supportsDirectApply ? (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              Apply Directly
                            </>
                          ) : (
                            <>
                              <span>Apply on {job.jobSource}</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: EXPLORE ALL REAL JOBS ================= */}
        {activeTab === "explore" && (
          <div className="space-y-6">
            {/* Search & Filter Toolbar */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search input */}
                <div className="relative sm:col-span-2">
                  <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by title, skill (e.g. React, Python), or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Source Filter */}
                <div>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full py-2 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Sources</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Internshala">Internshala</option>
                    <option value="Naukri">Naukri</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Wellfound">Wellfound</option>
                    <option value="Company Career Page">Company Career Pages</option>
                  </select>
                </div>

                {/* Experience Filter */}
                <div>
                  <select
                    value={selectedExperience}
                    onChange={(e) => setSelectedExperience(e.target.value)}
                    className="w-full py-2 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Experience Levels</option>
                    <option value="Internship">Internship</option>
                    <option value="Entry-level">Entry-level</option>
                    <option value="Mid-level">Mid-level</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
              </div>

              {/* Checkbox filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remoteOnly}
                    onChange={(e) => setRemoteOnly(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Remote Jobs Only</span>
                </label>

                <div className="text-xs text-slate-500">
                  Showing <span className="font-bold text-slate-900">{filteredJobs.length}</span> verified jobs
                </div>
              </div>
            </div>

            {/* Jobs List */}
            {isLoadingJobs ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-700 mt-3">
                  Fetching current active jobs from authorized job sources...
                </p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <Briefcase className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No jobs match your filters</h3>
                <p className="text-xs text-slate-500">
                  Try clearing your search query or selecting "All Sources".
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSource("ALL");
                    setSelectedExperience("ALL");
                    setRemoteOnly(false);
                  }}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => {
                  const isSaved = applications.some((a) => a.jobId === job.id);
                  return (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border shadow-2xs ${getSourceBadgeClass(
                              job.jobSource
                            )}`}
                          >
                            {job.jobSource}
                          </span>
                          {job.isRemote && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Remote
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                            {job.experienceLevel || "All Levels"}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Posted {new Date(job.postedAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                            <span className="font-semibold text-slate-800">{job.company}</span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {job.location}
                            </span>
                            {job.salaryRange && (
                              <>
                                <span>&bull;</span>
                                <span className="text-emerald-700 font-semibold">{job.salaryRange}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Skills chips */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {job.requiredSkills.map((sk) => {
                            const isCandidateMatch = candidateActiveSkills.some(
                              (cs) => cs.toLowerCase() === sk.toLowerCase()
                            );
                            return (
                              <span
                                key={sk}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                  isCandidateMatch
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200"
                                }`}
                              >
                                {isCandidateMatch ? "✓ " : ""}
                                {sk}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <button
                          onClick={() => handleSaveJob(job)}
                          className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            isSaved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                          title={isSaved ? "Saved" : "Save Job"}
                        >
                          {isSaved ? <BookmarkCheck className="h-4 w-4 text-emerald-600" /> : <Bookmark className="h-4 w-4" />}
                        </button>

                        <button
                          onClick={() => setSelectedJobForModal({ job })}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                        >
                          View Details
                        </button>

                        <button
                          onClick={() => handleInitiateApply(job)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                            job.supportsDirectApply
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                              : "bg-slate-900 hover:bg-slate-800 text-white"
                          }`}
                        >
                          {job.supportsDirectApply ? (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              Apply Direct
                            </>
                          ) : (
                            <>
                              <span>Apply on {job.jobSource}</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: APPLICATION TRACKER ================= */}
        {activeTab === "tracker" && (
          <div className="space-y-6">
            {/* Tracker Header */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Accurate Application Pipeline Tracker
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time status tracking distinguishing 'Application Opened' from confirmed 'Application Submitted'.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Filter Status:</span>
                <select
                  value={trackerStatusFilter}
                  onChange={(e) => setTrackerStatusFilter(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Statuses ({applications.length})</option>
                  <option value="SAVED">Saved</option>
                  <option value="VIEWED">Application Opened</option>
                  <option value="APPLIED">Application Submitted</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="ASSESSMENT">Assessment</option>
                  <option value="OFFER">Offer</option>
                  <option value="REJECTED">Declined</option>
                </select>
              </div>
            </div>

            {/* Applications List */}
            {applications.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <Layers className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No applications tracked yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When you save a job or initiate an application from LinkedIn, Internshala, Naukri, or Company Portals, it will appear here.
                </p>
                <button
                  onClick={() => setActiveTab("recommendations")}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Find Jobs for My Resume
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${getSourceBadgeClass(
                              app.jobSource
                            )}`}
                          >
                            {app.jobSource}
                          </span>
                          {getStatusBadge(app.status)}
                          <span className="text-[11px] text-slate-400">
                            Updated {new Date(app.lastStatusUpdate).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900">{app.jobTitle}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="font-semibold">{app.company}</span>
                          <span>&bull;</span>
                          <span>{app.location}</span>
                          <span>&bull;</span>
                          <span className="text-indigo-600 font-medium">
                            Resume: {app.resumeTitle || "Tailored ATS Resume"}
                          </span>
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500">Update Status:</label>
                        <select
                          value={app.status}
                          onChange={(e) =>
                            handleUpdateAppStatus(app.id, e.target.value as ApplicationStatus)
                          }
                          className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="SAVED">Saved</option>
                          <option value="VIEWED">Application Opened</option>
                          <option value="APPLIED">Application Submitted</option>
                          <option value="INTERVIEW">Interview</option>
                          <option value="ASSESSMENT">Assessment</option>
                          <option value="OFFER">Offer</option>
                          <option value="REJECTED">Declined</option>
                        </select>

                        <button
                          onClick={() => handleDeleteApp(app.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove application"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Notes banner */}
                    {app.notes && (
                      <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 border border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{app.notes}</span>
                        </div>
                        <a
                          href={app.applyUrl || app.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
                        >
                          View Listing <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= MODAL: JOB DETAILS & DIRECT APPLY ================= */}
      {selectedJobForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${getSourceBadgeClass(
                    selectedJobForModal.job.jobSource
                  )}`}
                >
                  {selectedJobForModal.job.jobSource}
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedJobForModal.job.title}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  {selectedJobForModal.job.company} &bull; {selectedJobForModal.job.location} &bull;{" "}
                  {selectedJobForModal.job.jobType}
                </p>
              </div>

              <button
                onClick={() => setSelectedJobForModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Target Resume selector inside modal */}
            <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100 space-y-2">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                Selected Resume to Attach:
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-800"
              >
                {currentAnalysis && (
                  <option value="current_analysis">
                    ★ Latest ATS Resume ({currentAnalysis.parsedJob?.jobTitle || "Active Analysis"})
                  </option>
                )}
                {userAnalyses
                  .filter((a) => a.id !== currentAnalysis?.id)
                  .map((a) => (
                    <option key={a.id} value={a.generatedResumeId || a.id}>
                      ATS Resume: {a.parsedJob?.jobTitle || "Archived"}
                    </option>
                  ))}
              </select>
            </div>

            {/* Job Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Role Description & Requirements
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {selectedJobForModal.job.description}
              </p>
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Required Competencies
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedJobForModal.job.requiredSkills.map((sk) => {
                  const isCandidateMatch = candidateActiveSkills.some(
                    (cs) => cs.toLowerCase() === sk.toLowerCase()
                  );
                  return (
                    <span
                      key={sk}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        isCandidateMatch
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {isCandidateMatch ? "✓ " : ""}
                      {sk}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Direct Apply Note */}
            {selectedJobForModal.job.supportsDirectApply ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Optional Candidate Note for Hiring Team:
                </label>
                <textarea
                  rows={3}
                  value={applicationCoverNote}
                  onChange={(e) => setApplicationCoverNote(e.target.value)}
                  placeholder="Share a brief introduction highlighting your relevant projects..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ) : null}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedJobForModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Close
              </button>

              {selectedJobForModal.job.supportsDirectApply ? (
                <button
                  onClick={() =>
                    handleExecuteDirectApply(
                      selectedJobForModal.job,
                      selectedJobForModal.match?.matchScore || 85
                    )
                  }
                  disabled={directApplySubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  {directApplySubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Application Directly
                </button>
              ) : (
                <button
                  onClick={() => {
                    const j = selectedJobForModal.job;
                    setSelectedJobForModal(null);
                    setExternalApplyConfirmJob(j);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <span>Continue to {selectedJobForModal.job.jobSource}</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXTERNAL APPLY CONFIRMATION (ACCURACY SAFEGUARD) ================= */}
      {externalApplyConfirmJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${getSourceBadgeClass(
                    externalApplyConfirmJob.jobSource
                  )}`}
                >
                  {externalApplyConfirmJob.jobSource}
                </span>
                <span className="text-xs font-bold text-slate-700">Official Portal</span>
              </div>
              <button
                onClick={() => setExternalApplyConfirmJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Opening Official Application Page
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to view the real listing for{" "}
                <span className="font-bold text-slate-900">{externalApplyConfirmJob.title}</span> at{" "}
                <span className="font-bold text-slate-900">{externalApplyConfirmJob.company}</span> on{" "}
                <span className="font-bold text-indigo-600">{externalApplyConfirmJob.jobSource}</span>.
              </p>
            </div>

            {/* Transparency Disclosure */}
            <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                Application Accuracy Safeguard:
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                <li>We will record this in your tracker as <strong>"Application Opened"</strong>.</li>
                <li>We will <strong>never falsely claim</strong> your application was submitted until you complete it on their official portal.</li>
                <li>Once you submit on {externalApplyConfirmJob.jobSource}, you can mark it as <strong>"Application Submitted"</strong> in your tracker.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setExternalApplyConfirmJob(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmExternalApply(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>Open {externalApplyConfirmJob.jobSource} Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
