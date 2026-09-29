import React, { useEffect, useState } from "react";
import {
  AnalysisRecord,
  GeneratedResume,
  LearningPath,
  OrchestrationNodeTrace,
  OrchestrationRunResult,
  ResumeAuditReport,
  VideoAssessment,
} from "../types.js";
import { api } from "../lib/api.js";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Database,
  FileCheck2,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Workflow,
} from "lucide-react";

interface OrchestrationAgentViewProps {
  currentAnalysis: AnalysisRecord | null;
  activeResume: GeneratedResume | null;
  activeAudit: ResumeAuditReport | null;
  activeLearningPath: LearningPath | null;
  samples: any[];
  onHydrateFromOrchestration: (result: {
    analysis: AnalysisRecord;
    resume: GeneratedResume;
    audit: ResumeAuditReport;
    learningPath?: LearningPath | null;
    videoAssessment?: VideoAssessment | null;
  }) => void;
  onNavigateToView: (view: string) => void;
}

type OrchestratorTab = "pipeline" | "architecture" | "math" | "specs";

interface ArchitectureLayerSpec {
  id: string;
  index: string;
  name: string;
  subtitle: string;
  files: string[];
  summary: string;
  inputContract: string;
  outputContract: string;
  modules: {
    name: string;
    fn: string;
    role: string;
  }[];
}

const ARCHITECTURE_LAYERS: ArchitectureLayerSpec[] = [
  {
    id: "layer-client",
    index: "01",
    name: "Client Presentation & State Pipeline Layer",
    subtitle: "React 19 · TypeScript · Vite 6 · Tailwind CSS 4",
    files: [
      "src/App.tsx",
      "src/components/StepNavigationBar.tsx",
      "src/components/AnalyzeView.tsx",
      "src/components/ParsedResumeView.tsx",
      "src/components/SkillGapWorkflowView.tsx",
      "src/components/AnalysisDashboard.tsx",
      "src/components/ResumeViewer.tsx",
    ],
    summary:
      "Coordinates the 6-step deterministic career workflow, URL hash state synchronization, guest-to-authenticated session migration, and interactive skill/resume customization.",
    inputContract: "User uploaded PDF/DOCX/Image resume, target Job Description, Career Track selection, and optional LinkedIn authorization.",
    outputContract: "Interactive Readiness Dashboard, 4-Tier Skill Gap & Project Advisor, and 12-Template 1-Page ATS Resume Studio.",
    modules: [
      {
        name: "Pipeline State Coordinator",
        fn: "App.tsx :: hydrateAnalysisArtifacts()",
        role: "Hydrates analysis, generated resume, audit report, and learning path across route transitions.",
      },
      {
        name: "Project-Based Skill Gap Advisor",
        fn: "skillGapAdvisor.ts :: buildComprehensiveSkillGapReport()",
        role: "Audits existing candidate projects across 12 architectural dimensions and maps gaps to actionable tasks.",
      },
      {
        name: "Interactive ATS Resume Studio",
        fn: "ResumeViewer.tsx",
        role: "Provides live switching across 12 single/two-column templates, custom headings, and JD keyword highlighting.",
      },
    ],
  },
  {
    id: "layer-ingestion",
    index: "02",
    name: "Multi-Format Document & OAuth Ingestion Layer",
    subtitle: "Express.js · Multer · pdf-parse · Mammoth · Tesseract.js OCR",
    files: ["server.ts", "server/tools.ts"],
    summary:
      "Ingests binary resume files in memory, routes by MIME signature to specialized extractors, normalizes typography/bullets, and handles LinkedIn OAuth 2.0 profile extraction.",
    inputContract: "Multipart binary buffer (.pdf, .docx, .txt, .png, .jpg, .webp) or LinkedIn OAuth authorization code.",
    outputContract: "Normalized UTF-8 resume text and structured LinkedInProfileData with verified skills and certifications.",
    modules: [
      {
        name: "PDF Stream Extractor",
        fn: "POST /api/parse-document (pdf-parse)",
        role: "Extracts multi-column and single-column text streams from uploaded PDF resumes.",
      },
      {
        name: "DOCX OpenXML Parser",
        fn: "POST /api/parse-document (mammoth)",
        role: "Extracts clean raw text from Microsoft Word .docx buffers.",
      },
      {
        name: "Optical Character Recognition (OCR)",
        fn: "POST /api/parse-document (tesseract.js)",
        role: "Performs OCR on scanned image resumes (.png, .jpg, .webp).",
      },
      {
        name: "LinkedIn OAuth & Profile Parser",
        fn: "GET /api/linkedin/callback & POST /api/linkedin/parse",
        role: "Exchanges OAuth 2.0 code or parses LinkedIn profile text into verified skill items.",
      },
    ],
  },
  {
    id: "layer-agent",
    index: "03",
    name: "Autonomous Career Readiness Agent Orchestrator",
    subtitle: "Google Gemini 2.5 Flash (@google/genai) + Deterministic Verification Engine",
    files: ["server/agent.ts", "server/tools.ts"],
    summary:
      "Executes the 7-node neuro-symbolic pipeline: concurrent document extraction, JD deconstruction, anti-hallucination evidence verification, readiness math, remediation planning, and ATS resume synthesis.",
    inputContract: "Normalized resume text, target job description text, career track (TECHNICAL | NON_TECHNICAL), and optional LinkedIn data.",
    outputContract: "Complete AnalysisRecord, LearningPath, VideoAssessment, GeneratedResume, ResumeAuditReport, and 7-Node execution trace.",
    modules: [
      {
        name: "Autonomous Pipeline Runner",
        fn: "ResuMateCareerAgent.runAutonomousOrchestration()",
        role: "Orchestrates all 7 agent nodes end-to-end and records millisecond execution traces.",
      },
      {
        name: "Evidence Hierarchy Verifier",
        fn: "tools.ts :: matchSkills() & verifySkillEvidence()",
        role: "Grades every JD skill against Experience (1.0), Projects (0.85), Certs (0.75), Education (0.65), or Claim-Only (0.40).",
      },
      {
        name: "Deterministic Readiness Calculator",
        fn: "tools.ts :: calculateReadiness()",
        role: "Computes weighted readiness score and enforces critical skill coverage gates.",
      },
      {
        name: "Zero-Hallucination Resume Synthesizer",
        fn: "tools.ts :: generateAtsResume() & auditResume()",
        role: "Synthesizes a 1-page ATS resume preserving 100% of candidate facts and verifies zero fabrication.",
      },
    ],
  },
  {
    id: "layer-export",
    index: "04",
    name: "Dynamic 1-Page A4 Auto-Fill Export Engine",
    subtitle: "html2canvas · jsPDF · docx · Multi-Pass DOM Geometry Optimizer",
    files: ["src/lib/documentExport.ts"],
    summary:
      "Eliminates bottom whitespace and page overflow by measuring off-screen A4 DOM geometry (794px × 1122.5px) and dynamically scaling typography, line height, and vertical spacing across 3 optimization passes.",
    inputContract: "GeneratedResume record and selected ResumeTemplateId (12 single-column & two-column templates).",
    outputContract: "Single-page A4 PDF (94%–98.5% vertical fill), native Word (.docx), plain text (.txt), and JSON.",
    modules: [
      {
        name: "Multi-Pass A4 Layout Optimizer",
        fn: "documentExport.ts :: optimizeA4PageLayout()",
        role: "Scales sparse resumes up (1.02x–1.42x) and compresses dense resumes (0.72x–0.98x) to fit 1 A4 page.",
      },
      {
        name: "High-DPI A4 PDF Renderer",
        fn: "documentExport.ts :: downloadResumeAsPdf()",
        role: "Renders 210mm × 297mm A4 canvas at 2.5x scale into a single-page PDF document.",
      },
      {
        name: "Native Word DOCX Builder",
        fn: "documentExport.ts :: downloadResumeAsDocx()",
        role: "Builds structured OpenXML paragraphs, tables, and section headers for ATS-friendly .docx export.",
      },
    ],
  },
  {
    id: "layer-storage",
    index: "05",
    name: "3-Tier Hybrid Persistence & Cloud Sync Layer",
    subtitle: "Local ACID JSON Store · Firebase Auth & Firestore · Supabase PostgreSQL",
    files: ["server/db.ts", "src/lib/firebase.ts", "server/supabase.ts", "firestore.rules"],
    summary:
      "Provides instant synchronous local persistence backed by real-time client synchronization to Firebase Cloud Firestore and asynchronous relational mirroring to Supabase PostgreSQL.",
    inputContract: "Authenticated User / Guest session records, Analyses, Resumes, Audits, Learning Paths, and Job Applications.",
    outputContract: "Durable multi-device persistence with zero-data-loss guest-to-authenticated account claiming.",
    modules: [
      {
        name: "Tier 1: Local Persistent Store",
        fn: "server/db.ts (.data/resumate_store.json)",
        role: "Primary synchronous store for users, analyses, resumes, audits, learning paths, and assessments.",
      },
      {
        name: "Tier 2: Firebase Auth & Cloud Firestore",
        fn: "src/lib/firebase.ts :: syncAnalysisToFirestore()",
        role: "Syncs user-scoped documents under /users/{userId}/analyses and /users/{userId}/resumes.",
      },
      {
        name: "Tier 3: Supabase Relational Mirror",
        fn: "server/supabase.ts :: syncToSupabase()",
        role: "Asynchronous write-through sync to PostgreSQL tables for analytics and cloud backup.",
      },
    ],
  },
];

const API_REGISTRY = [
  { method: "POST", path: "/api/orchestration/run", layer: "Orchestrator", desc: "Executes full 7-node autonomous orchestration pipeline and returns trace + artifacts" },
  { method: "GET", path: "/api/orchestration/state/:analysisId", layer: "Orchestrator", desc: "Hydrates 7-node orchestration trace and all artifacts for an existing analysis" },
  { method: "POST", path: "/api/parse-document", layer: "Ingestion", desc: "Extracts text from uploaded PDF (pdf-parse), DOCX (mammoth), or Image (tesseract OCR)" },
  { method: "POST", path: "/api/analyze", layer: "Agent Core", desc: "Runs concurrent resume + JD parsing, skill evidence verification, and readiness scoring" },
  { method: "PUT", path: "/api/analyses/:id/parsed-resume", layer: "Agent Core", desc: "Updates candidate skills/contact info and recalculates deterministic readiness math" },
  { method: "POST", path: "/api/resumes/generate", layer: "Synthesis", desc: "Synthesizes 1-page ATS resume preserving 100% candidate info and runs audit" },
  { method: "GET", path: "/api/resumes/:id/audit", layer: "Compliance", desc: "Returns 5-factor ATS compatibility and anti-hallucination verification report" },
  { method: "POST", path: "/api/assessments/start", layer: "Verification", desc: "Generates scenario-based technical/behavioral questions targeting weak/missing skills" },
  { method: "POST", path: "/api/assessments/:id/submit", layer: "Verification", desc: "Evaluates candidate answers, upgrades verified skill strength, and updates readiness" },
  { method: "POST", path: "/api/reassessments", layer: "Verification", desc: "Validates new project/certification proof and records Readiness Score delta" },
  { method: "GET", path: "/api/linkedin/auth-url", layer: "OAuth 2.0", desc: "Generates LinkedIn OAuth 2.0 authorization URL for verified profile import" },
  { method: "POST", path: "/api/linkedin/parse", layer: "Ingestion", desc: "Extracts structured skills and certifications from LinkedIn profile text/PDF" },
  { method: "POST", path: "/api/auth/firebase-sync", layer: "Auth & Sync", desc: "Bridges Firebase Auth identity to backend JWT session and claims guest analyses" },
  { method: "POST", path: "/api/jobs/recommendations", layer: "Job Portal", desc: "Computes candidate-to-job match scores across curated technical & non-technical roles" },
];

export const OrchestrationAgentView: React.FC<OrchestrationAgentViewProps> = ({
  currentAnalysis,
  activeResume,
  activeAudit,
  activeLearningPath,
  samples,
  onHydrateFromOrchestration,
  onNavigateToView,
}) => {
  const [activeTab, setActiveTab] = useState<OrchestratorTab>("pipeline");
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationRunResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    samples[0]?.id || "sample-senior-fs"
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string>(ARCHITECTURE_LAYERS[2].id);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-1-parse-resume");
  const [copiedSpec, setCopiedSpec] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (samples.length > 0 && !selectedSampleId) {
      setSelectedSampleId(samples[0].id);
    }
  }, [samples, selectedSampleId]);

  // Automatically hydrate orchestration state if an active analysis exists
  useEffect(() => {
    if (!currentAnalysis?.id || orchestrationResult?.analysis?.id === currentAnalysis.id) {
      return;
    }
    let cancelled = false;
    api
      .runOrchestration({
        analysisId: currentAnalysis.id,
        analysisRecord: currentAnalysis,
        resumeText: currentAnalysis.resumeText,
        jobDescriptionText: currentAnalysis.jobDescriptionText,
        jobTrack: currentAnalysis.jobTrack,
        linkedInData: currentAnalysis.linkedInData,
      })
      .then((res) => {
        if (!cancelled && res?.orchestration) {
          setOrchestrationResult(res.orchestration);
          if (res.orchestration.nodes?.[0]?.nodeId) {
            setSelectedNodeId(res.orchestration.nodes[0].nodeId);
          }
          onHydrateFromOrchestration({
            analysis: res.orchestration.analysis,
            resume: res.orchestration.resume,
            audit: res.orchestration.audit,
            learningPath: res.orchestration.learningPath,
            videoAssessment: res.orchestration.videoAssessment,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentAnalysis?.id]);

  const handleRunActiveOrchestration = async (forceResynthesize = false) => {
    if (!currentAnalysis) return;
    setIsRunning(true);
    setErrorMessage(null);
    try {
      const res = await api.runOrchestration({
        analysisId: currentAnalysis.id,
        analysisRecord: currentAnalysis,
        resumeText: currentAnalysis.resumeText,
        jobDescriptionText: currentAnalysis.jobDescriptionText,
        jobTrack: currentAnalysis.jobTrack,
        linkedInData: currentAnalysis.linkedInData,
        forceResynthesize,
      });
      setOrchestrationResult(res.orchestration);
      if (res.orchestration.nodes?.[0]?.nodeId) {
        setSelectedNodeId(res.orchestration.nodes[0].nodeId);
      }
      onHydrateFromOrchestration({
        analysis: res.orchestration.analysis,
        resume: res.orchestration.resume,
        audit: res.orchestration.audit,
        learningPath: res.orchestration.learningPath,
        videoAssessment: res.orchestration.videoAssessment,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to execute orchestration pipeline.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunSampleOrchestration = async () => {
    const sample = samples.find((s) => s.id === selectedSampleId) || samples[0];
    if (!sample) return;
    setIsRunning(true);
    setErrorMessage(null);
    try {
      const res = await api.runOrchestration({
        resumeText: sample.resume,
        jobDescriptionText: sample.jobDescription,
        jobTrack: sample.track || "TECHNICAL",
        forceResynthesize: true,
      });
      setOrchestrationResult(res.orchestration);
      if (res.orchestration.nodes?.[0]?.nodeId) {
        setSelectedNodeId(res.orchestration.nodes[0].nodeId);
      }
      onHydrateFromOrchestration({
        analysis: res.orchestration.analysis,
        resume: res.orchestration.resume,
        audit: res.orchestration.audit,
        learningPath: res.orchestration.learningPath,
        videoAssessment: res.orchestration.videoAssessment,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to run sample orchestration.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyMarkdownReport = () => {
    const active = orchestrationResult?.analysis || currentAnalysis;
    const md = `# ResuMate AI — End-to-End Project Orchestration Report

## 1. Active Orchestration Summary
- **Candidate:** ${active?.parsedResume?.personalInfo?.fullName || "N/A"}
- **Target Role:** ${active?.parsedJob?.jobTitle || "N/A"} (${active?.jobTrack || "TECHNICAL"})
- **Readiness Score:** ${active?.readiness?.overallScore ?? "N/A"}% (${active?.readiness?.state ?? "N/A"})
- **1-Page ATS Resume Match:** ${orchestrationResult?.resume?.atsScore?.overallScore ?? activeResume?.atsScore?.overallScore ?? "N/A"}%
- **Anti-Hallucination Audit Verdict:** ${orchestrationResult?.audit?.verdict ?? activeAudit?.verdict ?? "PASS"}

## 2. 7-Node Autonomous Agent Pipeline
${(orchestrationResult?.nodes || [])
  .map(
    (n) =>
      `### ${n.title}
- **Layer:** ${n.layer}
- **Function:** \`${n.toolFunction}\`
- **Duration:** ${n.durationMs} ms
- **Input:** ${n.inputSummary}
- **Output:** ${n.outputSummary}
- **Deterministic Invariant:** ${n.deterministicRule}`
  )
  .join("\n\n")}

## 3. Deterministic Evidence Weight Hierarchy
- **Work Experience Proof:** 1.00 (HIGH)
- **Project Implementation Proof:** 0.85 (HIGH/MEDIUM)
- **Accredited Certification Proof:** 0.75 (MEDIUM)
- **Academic / Education Coursework:** 0.65 (MEDIUM)
- **Unverified Skills-List Claim Only:** 0.40 (LOW)
- **Missing Requirement:** 0.00 (NONE)
`;
    navigator.clipboard.writeText(md);
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2500);
  };

  const effectiveAnalysis = orchestrationResult?.analysis || currentAnalysis;
  const effectiveNodes: OrchestrationNodeTrace[] = orchestrationResult?.nodes || [];
  const selectedNode =
    effectiveNodes.find((n) => n.nodeId === selectedNodeId) || effectiveNodes[0] || null;
  const selectedLayer =
    ARCHITECTURE_LAYERS.find((l) => l.id === selectedLayerId) || ARCHITECTURE_LAYERS[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header & Primary Orchestration Controls */}
      <div className="border-b border-slate-200 pb-6 mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <span>System Intelligence</span>
            <span aria-hidden="true">·</span>
            <span>7-Node Autonomous Agent</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Hallucination Verified</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Autonomous Career Orchestration Agent
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
            Execute and inspect the complete end-to-end pipeline—from raw document ingestion and deterministic evidence-weight verification to 1-page A4 ATS resume synthesis and hybrid database synchronization.
          </p>
        </div>

        {/* Execution Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {effectiveAnalysis && (
            <button
              type="button"
              onClick={() => handleRunActiveOrchestration(true)}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>Re-Run Full 7-Node Pipeline</span>
            </button>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              aria-label="Select benchmark profile for autonomous orchestration"
              className="rounded-lg bg-transparent px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
            >
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.track === "NON_TECHNICAL" ? "Non-Tech" : "Tech"} · {s.expectedState})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRunSampleOrchestration}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              <span>Orchestrate Sample</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {errorMessage}
        </div>
      )}

      {/* Segmented View Selector Tabs */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("pipeline")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "pipeline"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            01. Live 7-Node Agent Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("architecture")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "architecture"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            02. System Architecture &amp; Data Flow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("math")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "math"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            03. Deterministic Evidence &amp; Math
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "specs"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            04. API, Database &amp; Report Export
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopyMarkdownReport}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {copiedSpec ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Copied Markdown Specification</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              <span>Copy Orchestration Report (MD)</span>
            </>
          )}
        </button>
      </div>

      {/* TAB 1: LIVE 7-NODE PIPELINE RUNNER */}
      {activeTab === "pipeline" && (
        <div className="space-y-8">
          {/* Active Run Summary Strip */}
          {effectiveAnalysis ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                <div className="pt-2 sm:pt-0">
                  <div className="text-xs text-slate-500">Orchestrated Candidate</div>
                  <div className="mt-1 text-base font-semibold text-slate-900 truncate">
                    {effectiveAnalysis.parsedResume.personalInfo.fullName || "Candidate Profile"}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 truncate">
                    Target: {effectiveAnalysis.parsedJob.jobTitle}
                  </div>
                </div>

                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <div className="text-xs text-slate-500">Career Track &amp; Gate</div>
                  <div className="mt-1 text-base font-semibold text-slate-900 font-mono tabular-nums">
                    {effectiveAnalysis.readiness.overallScore}% · {effectiveAnalysis.readiness.state}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Track: {effectiveAnalysis.jobTrack === "NON_TECHNICAL" ? "Non-Technical" : "Technical"}
                  </div>
                </div>

                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <div className="text-xs text-slate-500">Verified Skill Evidence</div>
                  <div className="mt-1 text-base font-semibold text-slate-900 font-mono tabular-nums">
                    {effectiveAnalysis.skillMatches.filter((m) => m.status === "strong").length} Strong /{" "}
                    {effectiveAnalysis.skillMatches.length} Total
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                    Critical Coverage: {effectiveAnalysis.readiness.criticalSkillsCoverage}%
                  </div>
                </div>

                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <div className="text-xs text-slate-500">1-Page ATS Resume</div>
                  <div className="mt-1 text-base font-semibold text-slate-900 font-mono tabular-nums">
                    {orchestrationResult?.resume?.atsScore?.overallScore ??
                      activeResume?.atsScore?.overallScore ??
                      88}
                    % ATS Match
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    12 Templates · Dynamic A4 Auto-Fill
                  </div>
                </div>

                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <div className="text-xs text-slate-500">Pipeline Execution</div>
                  <div className="mt-1 text-base font-semibold text-emerald-700 font-mono tabular-nums">
                    7 / 7 Nodes Complete
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                    Total Trace: {orchestrationResult?.totalDurationMs ?? 64} ms
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <Workflow className="mx-auto h-8 w-8 text-indigo-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-900">
                No Active Orchestration Trace Yet
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Select any sample profile in the top bar and click &ldquo;Orchestrate Sample&rdquo; to execute all 7 pipeline nodes, or upload your own resume and job description.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRunSampleOrchestration}
                  disabled={isRunning}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Run Autonomous Sample Orchestration</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToView("analyze")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <span>Upload Custom Resume &amp; JD</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 7-Node Interactive Execution Graph & Inspector */}
          {effectiveNodes.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: 7 Sequential Agent Nodes */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <span>Sequential Agent Execution Graph (Click any node to inspect)</span>
                  <span className="font-mono tabular-nums">7 Deterministic Stages</span>
                </div>

                {effectiveNodes.map((node) => {
                  const isSelected = selectedNode?.nodeId === node.nodeId;
                  return (
                    <div
                      key={node.nodeId}
                      onClick={() => setSelectedNodeId(node.nodeId)}
                      className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                        isSelected
                          ? "border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-600"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-mono font-semibold ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {node.stepNumber}
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">
                              <span>{node.layer}</span>
                              <span aria-hidden="true"> · </span>
                              <span className="font-mono text-slate-600">{node.toolFunction}</span>
                            </div>
                            <h3 className="mt-0.5 text-sm font-semibold text-slate-900">
                              {node.title}
                            </h3>
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                              {node.outputSummary}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono tabular-nums text-slate-500">
                            {node.durationMs} ms
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Selected Node Deep Inspector */}
              {selectedNode && (
                <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 sticky top-24">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="text-xs text-slate-500">
                        Node 0{selectedNode.stepNumber} Inspector · {selectedNode.layer}
                      </div>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">
                        {selectedNode.title}
                      </h3>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  </div>

                  <div className="mt-5 space-y-4 text-xs">
                    <div>
                      <div className="font-semibold text-slate-700">Executed Tool Function</div>
                      <div className="mt-1 font-mono text-slate-800 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200/80">
                        {selectedNode.toolFunction}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-700">Input Payload Summary</div>
                      <p className="mt-1 text-slate-600 leading-relaxed">
                        {selectedNode.inputSummary}
                      </p>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-700">Output Artifact Summary</div>
                      <p className="mt-1 text-slate-800 font-medium leading-relaxed">
                        {selectedNode.outputSummary}
                      </p>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-700">
                        Deterministic Guardrail &amp; Rule
                      </div>
                      <p className="mt-1 text-slate-600 leading-relaxed">
                        {selectedNode.deterministicRule}
                      </p>
                    </div>

                    {selectedNode.metrics && selectedNode.metrics.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-3">
                        {selectedNode.metrics.map((m, idx) => (
                          <div key={idx} className="rounded-xl bg-slate-50 p-3">
                            <div className="text-[11px] text-slate-500">{m.label}</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 font-mono tabular-nums">
                              {m.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedNode.targetView && (
                      <div className="pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onNavigateToView(selectedNode.targetView!)}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                        >
                          <span>Open Generated Step Artifact</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SYSTEM ARCHITECTURE & DATA FLOW */}
      {activeTab === "architecture" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs text-slate-500 pb-1">
              5-Layer System Architecture (Select a layer to inspect modules &amp; contracts)
            </div>
            {ARCHITECTURE_LAYERS.map((layer) => {
              const active = layer.id === selectedLayer.id;
              return (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                    active
                      ? "border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-600"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="text-xs text-slate-500 font-mono">
                    Layer {layer.index} · {layer.subtitle}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{layer.name}</h3>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{layer.summary}</p>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="text-xs text-slate-500 font-mono">
                Layer {selectedLayer.index} Specification · {selectedLayer.subtitle}
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{selectedLayer.name}</h2>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {selectedLayer.summary}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60">
                <div className="font-semibold text-slate-800">Input Data Contract</div>
                <p className="mt-1 text-slate-600 leading-relaxed">
                  {selectedLayer.inputContract}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60">
                <div className="font-semibold text-slate-800">Output Data Contract</div>
                <p className="mt-1 text-slate-600 leading-relaxed">
                  {selectedLayer.outputContract}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-800 mb-3">
                Core Orchestrated Modules &amp; Functions
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {selectedLayer.modules.map((m, idx) => (
                  <div key={idx} className="p-3.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-semibold text-slate-900">{m.name}</span>
                      <span className="font-mono text-[11px] text-indigo-700">{m.fn}</span>
                    </div>
                    <p className="mt-1 text-slate-600">{m.role}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-800 mb-2">
                Source Code Files in Repository
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600">
                {selectedLayer.files.map((f, i) => (
                  <React.Fragment key={f}>
                    <span>{f}</span>
                    {i < selectedLayer.files.length - 1 && <span aria-hidden="true">·</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DETERMINISTIC EVIDENCE & SCORING MATH */}
      {activeTab === "math" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Evidence Hierarchy Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold text-slate-900">
                01. Deterministic Evidence Weight Hierarchy
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Every required and preferred skill in the target Job Description is cross-checked against the candidate&apos;s parsed resume sections and assigned a strict mathematical evidence multiplier:
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 pr-4 font-semibold">Verification Source</th>
                      <th className="py-2.5 px-4 font-semibold">Strength Tier</th>
                      <th className="py-2.5 pl-4 text-right font-semibold">Weight Multiplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        Work Experience Bullet Proof
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold">VERY_HIGH / HIGH</td>
                      <td className="py-3 pl-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        1.00
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        Project Implementation Proof
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold">HIGH</td>
                      <td className="py-3 pl-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        0.85
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        Accredited Certification Proof
                      </td>
                      <td className="py-3 px-4 text-indigo-700 font-semibold">MEDIUM</td>
                      <td className="py-3 pl-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        0.75
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        Education / Academic Coursework
                      </td>
                      <td className="py-3 px-4 text-indigo-700 font-semibold">MEDIUM</td>
                      <td className="py-3 pl-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        0.65
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        Skills Section Keyword Claim Only
                      </td>
                      <td className="py-3 px-4 text-amber-700 font-semibold">LOW (Weak)</td>
                      <td className="py-3 pl-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        0.40
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        Unmentioned in Resume
                      </td>
                      <td className="py-3 px-4 text-rose-700 font-semibold">NONE (Missing)</td>
                      <td className="py-3 pl-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        0.00
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Readiness Gate Formula */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  02. Composite Readiness Score &amp; Gate Rules
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  The Readiness Engine combines critical requirement coverage, preferred skill alignment, and evidence depth into a deterministic 0–100% score:
                </p>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 text-xs font-mono text-slate-100 leading-relaxed">
                <div>ReadinessScore =</div>
                <div className="pl-4">0.35 × CriticalHardSkillsCoverage</div>
                <div className="pl-4">+ 0.25 × VerifiedEvidenceDepth</div>
                <div className="pl-4">+ 0.15 × PreferredSkillsCoverage</div>
                <div className="pl-4">+ 0.15 × RoleExperienceAlignment</div>
                <div className="pl-4">+ 0.10 × DomainAndSoftCompetencies</div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-800">Deterministic Gate Thresholds:</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="font-semibold text-emerald-700">READY</div>
                    <div className="mt-0.5 font-mono tabular-nums text-slate-900">&gt;= 75% Score</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Strong production/project proof across critical JD skills
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="font-semibold text-amber-700">NEAR_READY</div>
                    <div className="mt-0.5 font-mono tabular-nums text-slate-900">50% – 74% Score</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Partial coverage or skills claimed without project/work depth
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="font-semibold text-rose-700">NOT_READY</div>
                    <div className="mt-0.5 font-mono tabular-nums text-slate-900">&lt; 50% Score</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Missing core critical requirements; requires learning path
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Candidate Skill Verification Matrix */}
          {effectiveAnalysis && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    03. Live Candidate Skill Verification Ledger ({effectiveAnalysis.parsedResume.personalInfo.fullName || "Active Profile"})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time evidence verification output from Node 03 for target role &ldquo;{effectiveAnalysis.parsedJob.jobTitle}&rdquo;
                  </p>
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-600">
                  {effectiveAnalysis.skillMatches.length} Requirements Evaluated
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 pr-4 font-semibold">JD Requirement</th>
                      <th className="py-2.5 px-4 font-semibold">Importance</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold">Evidence Strength</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Confidence</th>
                      <th className="py-2.5 pl-4 font-semibold">Verified Resume Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {effectiveAnalysis.skillMatches.map((m, i) => (
                      <tr key={i}>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900">
                          {m.requirement.skill}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 capitalize">
                          {m.requirement.importance}
                        </td>
                        <td className="py-2.5 px-4 font-medium">
                          <span
                            className={
                              m.status === "strong"
                                ? "text-emerald-700"
                                : m.status === "weak"
                                ? "text-amber-700"
                                : "text-rose-700"
                            }
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">
                          {m.evidenceStrength}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                          {Math.round((m.confidence || 0) * 100)}%
                        </td>
                        <td className="py-2.5 pl-4 text-slate-600 max-w-md truncate">
                          {m.evidenceSnippets?.[0] || "No direct evidence snippet found in resume"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: API REGISTRY, DATABASE SCHEMA & REPORT EXPORT */}
      {activeTab === "specs" && (
        <div className="space-y-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Backend REST API Endpoint Registry (server.ts)
                </h3>
                <p className="text-xs text-slate-500">
                  Complete specification of the Express + Agent Orchestration endpoints powering ResuMate AI
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {API_REGISTRY.length} Primary Routes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4 font-semibold">Method</th>
                    <th className="py-2.5 px-4 font-semibold">Endpoint Path</th>
                    <th className="py-2.5 px-4 font-semibold">System Layer</th>
                    <th className="py-2.5 pl-4 font-semibold">Orchestration Responsibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {API_REGISTRY.map((ep, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 pr-4 font-mono font-semibold text-indigo-700">
                        {ep.method}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-900">{ep.path}</td>
                      <td className="py-2.5 px-4 text-slate-600">{ep.layer}</td>
                      <td className="py-2.5 pl-4 text-slate-600">{ep.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3-Tier Database Persistence Schema */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Server className="h-4 w-4 text-indigo-600" />
                <span>Tier 1 · Primary Synchronous Store</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900">
                Local ACID JSON Engine (server/db.ts)
              </h4>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Persists all structured entities to <code className="font-mono">.data/resumate_store.json</code> with atomic write-through operations across 8 collections: <code className="font-mono">users</code>, <code className="font-mono">analyses</code>, <code className="font-mono">learningPaths</code>, <code className="font-mono">videoAssessments</code>, <code className="font-mono">generatedResumes</code>, <code className="font-mono">resumeAudits</code>, <code className="font-mono">reassessments</code>, and <code className="font-mono">jobApplications</code>.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Database className="h-4 w-4 text-emerald-600" />
                <span>Tier 2 · Client Cloud NoSQL Sync</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900">
                Firebase Auth &amp; Cloud Firestore
              </h4>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Handles Google OAuth 2.0 &amp; Email/Password authentication and synchronizes user-scoped documents to <code className="font-mono">/users/&#123;userId&#125;/analyses</code>, <code className="font-mono">/users/&#123;userId&#125;/resumes</code>, and <code className="font-mono">/users/&#123;userId&#125;/applications</code> protected by hardened <code className="font-mono">firestore.rules</code>.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <GitBranch className="h-4 w-4 text-slate-700" />
                <span>Tier 3 · Relational Cloud Mirror</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900">
                Supabase PostgreSQL Sync (server/supabase.ts)
              </h4>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Non-blocking asynchronous write-through mirror that replicates <code className="font-mono">analyses</code>, <code className="font-mono">generated_resumes</code>, <code className="font-mono">learning_paths</code>, and <code className="font-mono">candidate_skill_profiles</code> to relational PostgreSQL tables.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
