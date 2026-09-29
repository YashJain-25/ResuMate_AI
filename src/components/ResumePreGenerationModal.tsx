import React, { useState, useRef, useMemo } from "react";
import { AnalysisRecord, LinkedInProfileData, ResumeTemplateId } from "../types.js";
import { api } from "../lib/api.js";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  CheckSquare,
  Code2,
  Columns,
  FileText,
  LayoutTemplate,
  Linkedin,
  Loader2,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";

export interface ResumeGenerationConfig {
  trackType: "TECHNICAL" | "NON_TECHNICAL";
  photoUrl?: string;
  autoPrint?: boolean;
  templateId: ResumeTemplateId;
  selectedSkills?: string[];
  linkedInData?: LinkedInProfileData;
}

interface SkillOption {
  name: string;
  importance: "critical" | "high" | "medium" | "low";
  isMatched: boolean;
  category: string;
  source?: "RESUME" | "LINKEDIN" | "JD_MATCH" | "CUSTOM";
}

export interface TemplateMetadata {
  id: ResumeTemplateId;
  name: string;
  badge: string;
  badgeColor: string;
  category: "COLUMN_BASED" | "SINGLE_COLUMN";
  description: string;
  layoutFeature: string;
}

export const RESUME_TEMPLATE_CATALOG: TemplateMetadata[] = [
  // ================= 6 DISTINCT COLUMN-BASED RESUME TEMPLATES =================
  {
    id: "two_column",
    name: "Compact Left-Sidebar Split Rail",
    badge: "Column • Classic Split",
    badgeColor: "bg-amber-100 text-amber-900",
    category: "COLUMN_BASED",
    description:
      "32% Left Sidebar for Contact, Core Skills, Education & Certifications; 68% Right Main Column for Summary, Work Experience & Projects.",
    layoutFeature: "Left Sidebar + Right Main Pane",
  },
  {
    id: "col_executive_split",
    name: "Executive Asymmetric Right-Rail",
    badge: "Column • Executive",
    badgeColor: "bg-indigo-100 text-indigo-900",
    category: "COLUMN_BASED",
    description:
      "68% Left Primary Column for Executive Summary, Experience & Key Achievements; 32% Right Strategy Rail for JD Skills, Education & Credentials.",
    layoutFeature: "Main Narrative Left + Strategy Rail Right",
  },
  {
    id: "col_tech_matrix",
    name: "Engineering Dual-Column Matrix",
    badge: "Column • Tech Matrix",
    badgeColor: "bg-violet-100 text-violet-900",
    category: "COLUMN_BASED",
    description:
      "Full-width technical header + 2-column categorized Skill Matrix grid paired with side-by-side Experience & Technical Projects.",
    layoutFeature: "2-Col Skill Matrix + Split Engineering Grid",
  },
  {
    id: "col_modern_sidebar",
    name: "Modern Slate Sidebar Accent",
    badge: "Column • Modern UI",
    badgeColor: "bg-emerald-100 text-emerald-900",
    category: "COLUMN_BASED",
    description:
      "Soft slate-tinted left column with vertical accent bar for Contact, Skills & LinkedIn profile; crisp white right column for career history.",
    layoutFeature: "Tinted Left Rail + High-Contrast Right Column",
  },
  {
    id: "col_academic_grid",
    name: "Structured Credentials & Research Grid",
    badge: "Column • Credentials",
    badgeColor: "bg-sky-100 text-sky-900",
    category: "COLUMN_BASED",
    description:
      "Two-column structured academic & specialist layout placing Education, Certifications & Skills alongside Experience & Research/Projects.",
    layoutFeature: "Structured Dual-Column Credentials Grid",
  },
  {
    id: "col_compact_dual",
    name: "Symmetric 50/50 High-Density Dual Pane",
    badge: "Column • Max Density",
    badgeColor: "bg-rose-100 text-rose-900",
    category: "COLUMN_BASED",
    description:
      "Balanced two-column architecture designed for candidates with extensive roles, projects, and skills to fit cleanly on a single page.",
    layoutFeature: "Balanced Dual-Pane 1-Page Optimizer",
  },

  // ================= 6 SINGLE-COLUMN & INDUSTRY TEMPLATES =================
  {
    id: "harvard",
    name: "Harvard / Ivy League Classic",
    badge: "Ivy Standard",
    badgeColor: "bg-indigo-100 text-indigo-800",
    category: "SINGLE_COLUMN",
    description:
      "Prestigious serif typography, centered formal header, and solid horizontal rules. The universal corporate & consulting standard.",
    layoutFeature: "Centered Header • Classic Serif Rules",
  },
  {
    id: "modern",
    name: "Modern Executive",
    badge: "Popular",
    badgeColor: "bg-emerald-100 text-emerald-800",
    category: "SINGLE_COLUMN",
    description:
      "Contemporary Plus Jakarta typography, clean left-aligned header bar, uppercase section dividers, and high recruiter scannability.",
    layoutFeature: "Left Aligned • Modern Executive Accent",
  },
  {
    id: "tech",
    name: "Silicon Valley Tech",
    badge: "Engineering",
    badgeColor: "bg-violet-100 text-violet-800",
    category: "SINGLE_COLUMN",
    description:
      "Categorized technical stack (Languages, Frameworks, Cloud/DevOps, Core) and engineering system impact highlights.",
    layoutFeature: "Categorized Stack • Engineering Focus",
  },
  {
    id: "minimal",
    name: "Minimalist Pure ATS",
    badge: "100% Parser Safe",
    badgeColor: "bg-slate-200 text-slate-800",
    category: "SINGLE_COLUMN",
    description:
      "Zero decorative distractions, pure high-contrast monochrome text, strictly engineered for strict enterprise ATS parsers.",
    layoutFeature: "Monochrome • Pure Linear Hierarchy",
  },
  {
    id: "finance",
    name: "Wall Street & Corporate Finance",
    badge: "Finance & Advisory",
    badgeColor: "bg-amber-100 text-amber-900",
    category: "SINGLE_COLUMN",
    description:
      "Compact institutional banking & strategy format emphasizing quantified KPIs, deal/project metrics, education, and certifications.",
    layoutFeature: "Institutional Header • Metric-Dense Bullets",
  },
  {
    id: "healthcare",
    name: "Clinical, Operations & Specialist",
    badge: "Operations & Specialist",
    badgeColor: "bg-teal-100 text-teal-900",
    category: "SINGLE_COLUMN",
    description:
      "Credentials-forward single-column layout highlighting certifications, licensure, core competencies, and operational excellence.",
    layoutFeature: "Credentials-First • Structured Compliance",
  },
];

interface ResumePreGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisRecord;
  onConfirm: (config: ResumeGenerationConfig) => Promise<void>;
  isGenerating: boolean;
  initialAutoPrint?: boolean;
  initialSelectedSkills?: string[];
  initialPhotoUrl?: string;
  initialTemplateId?: ResumeTemplateId;
}

export const ResumePreGenerationModal: React.FC<ResumePreGenerationModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onConfirm,
  isGenerating,
  initialAutoPrint = false,
  initialSelectedSkills,
  initialPhotoUrl,
  initialTemplateId,
}) => {
  const resolvedTrack: "TECHNICAL" | "NON_TECHNICAL" = analysis.jobTrack || "NON_TECHNICAL";
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>(
    initialTemplateId || "two_column"
  );
  const [templateFilter, setTemplateFilter] = useState<"ALL" | "COLUMN_BASED" | "SINGLE_COLUMN">("ALL");
  const [includePhoto, setIncludePhoto] = useState<boolean>(Boolean(initialPhotoUrl));
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(initialPhotoUrl);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialPhotoUrl) {
      setPhotoUrl(initialPhotoUrl);
      setIncludePhoto(true);
    }
    if (initialTemplateId) {
      setSelectedTemplate(initialTemplateId);
    }
  }, [initialPhotoUrl, initialTemplateId]);

  // LinkedIn quick-sync inside modal if not already connected
  const [modalLinkedInData, setModalLinkedInData] = useState<LinkedInProfileData | undefined>(
    analysis.linkedInData
  );
  const [quickLinkedInInput, setQuickLinkedInInput] = useState<string>("");
  const [isSyncingLinkedIn, setIsSyncingLinkedIn] = useState<boolean>(false);

  // Skill checklist state
  const [skillSearch, setSkillSearch] = useState<string>("");
  const [customSkillInput, setCustomSkillInput] = useState<string>("");

  // Numeric progress for 1-Page ATS Resume generation
  const [genProgress, setGenProgress] = useState<number>(0);

  React.useEffect(() => {
    if (!isGenerating) {
      setGenProgress(0);
      return;
    }
    setGenProgress(8);
    const timer = setInterval(() => {
      setGenProgress((prev) => {
        if (prev < 45) return Math.min(99, prev + 3.5);
        if (prev < 78) return Math.min(99, prev + 1.9);
        if (prev < 92) return Math.min(99, prev + 0.8);
        if (prev < 99) return Math.min(99, prev + 0.25);
        return 99;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [isGenerating]);

  const numericGenPercent = Math.min(99, Math.max(1, Math.round(genProgress)));
  const estimatedGenSec = Math.max(1, Math.ceil(((100 - numericGenPercent) / 100) * 8));

  // Extract ALL verified skills from Candidate Resume, LinkedIn Profile, and Matched JD Requirements
  // Ensuring zero loss of candidate's original resume skills!
  const initialSkillOptions = useMemo<SkillOption[]>(() => {
    const map = new Map<string, SkillOption>();

    // 1. From Parsed Candidate Resume (Preserve 100% of candidate's original skills)
    (analysis.parsedResume?.skills || []).forEach((skillStr) => {
      const name = skillStr.trim();
      if (!name) return;
      const key = name.toLowerCase();
      const matchedReq = (analysis.parsedJob?.requirements || []).find(
        (r) =>
          r.skill?.toLowerCase() === key ||
          key.includes(r.skill?.toLowerCase() || "___") ||
          (r.skill?.toLowerCase() || "").includes(key)
      );
      let imp: "critical" | "high" | "medium" | "low" = "medium";
      if (matchedReq?.importance === "critical") imp = "critical";
      else if (matchedReq?.importance === "high") imp = "high";

      map.set(key, {
        name,
        importance: imp,
        isMatched: Boolean(matchedReq),
        category:
          matchedReq?.category ||
          (resolvedTrack === "NON_TECHNICAL" ? "Resume Competency" : "Resume Technical Stack"),
        source: "RESUME",
      });
    });

    // 2. From Authorized LinkedIn Profile Skills
    (modalLinkedInData?.extractedSkills || []).forEach((liSkill) => {
      if (liSkill.included === false) return;
      const name = liSkill.name?.trim();
      if (!name) return;
      const key = name.toLowerCase();
      const matchedReq = (analysis.parsedJob?.requirements || []).find(
        (r) =>
          r.skill?.toLowerCase() === key ||
          key.includes(r.skill?.toLowerCase() || "___")
      );
      if (!map.has(key)) {
        map.set(key, {
          name,
          importance: matchedReq?.importance === "critical" ? "critical" : matchedReq ? "high" : "medium",
          isMatched: Boolean(matchedReq),
          category: liSkill.category || "LinkedIn Verified Skill",
          source: "LINKEDIN",
        });
      }
    });

    // 3. From Skill Matches (verified in resume evidence)
    (analysis.skillMatches || []).forEach((m) => {
      const isVerified = Boolean(m.matched || m.matchStatus === "MATCHED" || m.status === "strong" || m.status === "weak");
      const name = (m.candidateSkill || m.requirement?.skill || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!map.has(key) && isVerified) {
        let imp: "critical" | "high" | "medium" | "low" = "high";
        if (m.requirement?.importance === "critical") imp = "critical";
        else if (m.requirement?.importance === "high") imp = "high";
        else if (m.requirement?.importance === "nice-to-have") imp = "medium";

        map.set(key, {
          name,
          importance: imp,
          isMatched: true,
          category: m.requirement?.category || (resolvedTrack === "NON_TECHNICAL" ? "Core Competency" : "Technical Skill"),
          source: "JD_MATCH",
        });
      }
    });

    // Sort so JD-matched skills appear first, preserving all resume & LinkedIn skills
    return Array.from(map.values()).sort((a, b) => {
      if (a.isMatched !== b.isMatched) return a.isMatched ? -1 : 1;
      const rank = { critical: 4, high: 3, medium: 2, low: 1 };
      return rank[b.importance] - rank[a.importance];
    });
  }, [analysis, resolvedTrack, modalLinkedInData]);

  // Select ALL verified Resume + LinkedIn + JD-Matched skills by default so NO information is lost
  const [selectedSkillNames, setSelectedSkillNames] = useState<Set<string>>(() => {
    if (initialSelectedSkills && initialSelectedSkills.length > 0) {
      const combined = new Set(initialSelectedSkills);
      initialSkillOptions.forEach((opt) => combined.add(opt.name));
      return combined;
    }
    const allPreserved = new Set<string>();
    initialSkillOptions.forEach((opt) => allPreserved.add(opt.name));
    return allPreserved;
  });

  // Sync strictly to current analysis skills when analysis or initialSelectedSkills changes
  React.useEffect(() => {
    const validForCurrentAnalysis = new Set(initialSkillOptions.map((opt) => opt.name));
    const next = new Set<string>();
    initialSkillOptions.forEach((opt) => next.add(opt.name));
    if (initialSelectedSkills) {
      initialSelectedSkills.forEach((s) => {
        if (validForCurrentAnalysis.has(s)) {
          next.add(s);
        }
      });
    }
    setSelectedSkillNames(next);
    setCustomSkills([]);
  }, [analysis.id, initialSkillOptions, initialSelectedSkills]);

  const [customSkills, setCustomSkills] = useState<SkillOption[]>([]);

  const allSkillOptions = useMemo(() => {
    return [...initialSkillOptions, ...customSkills];
  }, [initialSkillOptions, customSkills]);

  const handleQuickLinkedInExtract = async () => {
    if (!quickLinkedInInput.trim()) return;
    setIsSyncingLinkedIn(true);
    try {
      const res = await api.extractLinkedInProfile({
        rawProfileText: quickLinkedInInput,
        connectionMethod: "PROFILE_SUMMARY",
      });
      setModalLinkedInData(res.linkedInData);
      setQuickLinkedInInput("");
    } catch (err) {
      console.error("LinkedIn skill sync error:", err);
    } finally {
      setIsSyncingLinkedIn(false);
    }
  };

  const handleToggleSkill = (skillName: string) => {
    setSelectedSkillNames((prev) => {
      const next = new Set(prev);
      if (next.has(skillName)) {
        next.delete(skillName);
      } else {
        next.add(skillName);
      }
      return next;
    });
  };

  const handleKeepMediumToHigh = () => {
    const medToHigh = new Set<string>();
    allSkillOptions.forEach((opt) => {
      if (opt.importance === "critical" || opt.importance === "high" || opt.importance === "medium") {
        medToHigh.add(opt.name);
      }
    });
    setSelectedSkillNames(medToHigh);
  };

  const handleSelectAll = () => {
    const all = new Set<string>(allSkillOptions.map((s) => s.name));
    setSelectedSkillNames(all);
  };

  const handleDeselectAll = () => {
    setSelectedSkillNames(new Set());
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    if (!allSkillOptions.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      const newOpt: SkillOption = {
        name: trimmed,
        importance: "high",
        isMatched: true,
        category: resolvedTrack === "NON_TECHNICAL" ? "Core Competency" : "Technical Stack",
      };
      setCustomSkills((prev) => [...prev, newOpt]);
      setSelectedSkillNames((prev) => new Set(prev).add(trimmed));
    } else {
      setSelectedSkillNames((prev) => new Set(prev).add(trimmed));
    }
    setCustomSkillInput("");
  };

  if (!isOpen) return null;

  const atsScore = analysis.readiness?.overallScore ?? 0;
  const isBelowThreshold = atsScore < 80;
  const matchedCount = (analysis.skillMatches || []).filter(
    (m) => m.matchStatus === "MATCHED" || m.matched
  ).length;
  const totalCount = (analysis.parsedJob?.requirements || []).length || (analysis.skillMatches || []).length || 1;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please upload a valid image file (JPG, PNG, or WebP).");
      return;
    }

    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoUrl(dataUrl);
      setIncludePhoto(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(undefined);
    setIncludePhoto(false);
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProceed = async () => {
    await onConfirm({
      trackType: resolvedTrack,
      photoUrl: includePhoto ? photoUrl : undefined,
      autoPrint: initialAutoPrint,
      templateId: selectedTemplate,
      selectedSkills: Array.from(selectedSkillNames),
      linkedInData: modalLinkedInData,
    });
  };

  const filteredTemplates = RESUME_TEMPLATE_CATALOG.filter((t) =>
    templateFilter === "ALL" ? true : t.category === templateFilter
  );

  const missingRequirementsList = (analysis.skillMatches || [])
    .filter((m) => !m.matched && m.matchStatus !== "MATCHED")
    .map((m) => m.requirement.skill)
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/80 border border-indigo-400/30 flex items-center justify-center text-white shadow-inner">
              <FileText className="h-5 w-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex flex-wrap items-center gap-2">
                Configure 1-Page ATS Resume
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
                  1-Page Priority
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  resolvedTrack === "NON_TECHNICAL" ? "bg-amber-400 text-amber-950" : "bg-indigo-300 text-indigo-950"
                }`}>
                  {resolvedTrack === "NON_TECHNICAL" ? "Non-Technical" : "Technical"}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Target: {analysis.parsedJob.jobTitle || "Target Role"}
                {analysis.parsedJob.company ? ` • ${analysis.parsedJob.company}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[76vh] overflow-y-auto text-slate-800">
          {/* 1. SELECT RESUME TEMPLATE DESIGN (12 Templates including 6 Column-Based Layouts) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <LayoutTemplate className="h-4 w-4 text-indigo-600" />
                <span>1. Choose Professional Resume Template (12 Layouts)</span>
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTemplateFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    templateFilter === "ALL"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All (12)
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateFilter("COLUMN_BASED")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    templateFilter === "COLUMN_BASED"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Columns className="h-3.5 w-3.5" />
                  <span>Column-Based (6)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateFilter("SINGLE_COLUMN")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    templateFilter === "SINGLE_COLUMN"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Single-Column (6)
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Includes <strong>6 distinct column-based templates</strong> and <strong>6 classic/industry single-column templates</strong>. All templates preserve 100% of your resume information, prioritize JD-matching items first, and optimize for a 1-page layout.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {filteredTemplates.map((tpl) => {
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="text-xs font-bold text-slate-900">{tpl.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${tpl.badgeColor}`}>
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{tpl.description}</p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Check className={`h-3.5 w-3.5 ${isSelected ? "text-indigo-600" : "opacity-0"}`} />
                        <span>{tpl.layoutFeature}</span>
                      </span>
                      {tpl.category === "COLUMN_BASED" && (
                        <span className="text-[10px] font-bold text-indigo-700 uppercase">Column Layout</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SKILLS & LINKEDIN PRESERVATION CHECKLIST */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-indigo-600" />
                <span>2. Preserved Resume &amp; LinkedIn Skills ({selectedSkillNames.size} Selected)</span>
              </label>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Sparkles className="h-3.5 w-3.5" />
                <span>100% Resume + LinkedIn Skills Preserved &bull; JD-Matched First</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              All skills from your uploaded resume and authorized LinkedIn profile are preserved. JD-matching skills are automatically prioritized at the top of the Skills section.
            </p>

            {/* Quick LinkedIn Skill Sync inside Modal */}
            <div className="mb-3 p-3 rounded-2xl bg-sky-50/70 border border-sky-200 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-950 shrink-0">
                <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                <span>Sync LinkedIn Skills:</span>
              </div>
              <input
                type="text"
                value={quickLinkedInInput}
                onChange={(e) => setQuickLinkedInInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickLinkedInExtract();
                  }
                }}
                placeholder="Paste skills or headline from your LinkedIn profile to include them..."
                className="flex-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={handleQuickLinkedInExtract}
                disabled={isSyncingLinkedIn || !quickLinkedInInput.trim()}
                className="inline-flex items-center gap-1 rounded-xl bg-[#0A66C2] hover:bg-[#004182] disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white shrink-0 cursor-pointer"
              >
                {isSyncingLinkedIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>Import from LinkedIn</span>
              </button>
            </div>

            {/* Quick Action Presets & Search */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Preserve All Skills ({allSkillOptions.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleKeepMediumToHigh}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    JD Priority Focus
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search skills..."
                    className="w-full pl-8 pr-3 py-1 rounded-lg border border-slate-200 bg-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Scrollable Checklist Grid */}
              <div className="max-h-44 overflow-y-auto pr-1 space-y-1.5">
                {allSkillOptions
                  .filter((opt) =>
                    !skillSearch || opt.name.toLowerCase().includes(skillSearch.toLowerCase())
                  )
                  .map((opt) => {
                    const isChecked = selectedSkillNames.has(opt.name);
                    return (
                      <label
                        key={opt.name}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-white border-indigo-300 shadow-2xs ring-1 ring-indigo-500/20"
                            : "bg-slate-50/70 border-slate-200/80 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSkill(opt.name)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{opt.name}</span>
                              {opt.source === "LINKEDIN" && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-sky-100 px-1.5 py-0.2 text-[10px] font-bold text-[#0A66C2]">
                                  LinkedIn
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {opt.category}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {opt.isMatched && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <Check className="h-2.5 w-2.5" />
                              JD Match
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              opt.importance === "critical"
                                ? "bg-rose-100 text-rose-800"
                                : opt.importance === "high"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {opt.importance === "critical"
                              ? "Critical"
                              : opt.importance === "high"
                              ? "High"
                              : "Preserved"}
                          </span>
                        </div>
                      </label>
                    );
                  })}
              </div>

              {/* Add Custom Skill Bar */}
              <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSkill();
                    }
                  }}
                  placeholder="Add another verified skill from your background..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  disabled={!customSkillInput.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-bold transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. PHOTO IN RESUME PROMPT */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                3. Profile Photo Option (Supported Across All 12 Templates &amp; PDF)
              </label>
              <span className="text-[11px] font-semibold text-indigo-600">Works in All 12 Templates</span>
            </div>

            {photoError && (
              <div className="mt-1 mb-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">
                {photoError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIncludePhoto(false)}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  !includePhoto
                    ? "border-indigo-600 bg-indigo-50/70 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">No Photo (Standard ATS)</div>
                  <div className="text-[11px] text-slate-500">Best for automated parsers</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIncludePhoto(true);
                  if (!photoUrl && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  includePhoto
                    ? "border-indigo-600 bg-indigo-50/70 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Include Profile Photo</div>
                  <div className="text-[11px] text-slate-500">Add avatar to resume header</div>
                </div>
              </button>
            </div>

            {includePhoto && (
              <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                  id="resume-photo-input"
                />

                {photoUrl ? (
                  <div className="relative group">
                    <img
                      src={photoUrl}
                      alt="Candidate Profile"
                      className="h-16 w-16 rounded-full object-cover border-2 border-indigo-600 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      title="Remove Photo"
                      className="absolute -top-1 -right-1 p-1 bg-red-600 text-white rounded-full shadow hover:bg-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-full bg-slate-200 border-2 border-dashed border-slate-400 flex items-center justify-center text-slate-400 shrink-0">
                    <User className="h-8 w-8" />
                  </div>
                )}

                <div className="flex-1 text-center sm:text-left">
                  <div className="text-xs font-bold text-slate-800">
                    {photoUrl ? "Photo ready for 1-page resume header" : "Upload your profile photo"}
                  </div>
                  <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5 text-slate-500" />
                      <span>{photoUrl ? "Change Photo" : "Upload Photo File"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. CLARIFIED ATS SCORE DISCLAIMER (IF BELOW 80%) — NON-BLOCKING */}
          <div className="pt-2 border-t border-slate-100">
            {isBelowThreshold ? (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2.5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                        ATS Match Advisory — Score Below 80% ({atsScore}/100)
                      </span>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-bold text-xs">
                        Generation &amp; Download Unlocked
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-950">
                      <strong>Why your pre-generation score is below 80%:</strong> Your current profile matches{" "}
                      <strong>{matchedCount} of {totalCount}</strong> target Job Description requirements. In automated enterprise ATS screening, scores below 80% may rank lower against candidates who explicitly list all required keywords.
                    </p>
                    {missingRequirementsList.length > 0 && (
                      <div className="text-xs text-amber-900 bg-white/80 rounded-xl p-2.5 border border-amber-200">
                        <strong>Areas to Improve for 80%+ ATS Alignment:</strong> Consider adding verified evidence or syncing LinkedIn skills for:{" "}
                        <span className="font-bold text-slate-900">{missingRequirementsList.join(", ")}</span>, and quantifying key impact metrics in your experience bullets.
                      </div>
                    )}
                    <p className="text-xs font-bold text-amber-950">
                      You can still proceed, generate, print, and download your 1-page ATS resume right now — all your existing resume information will be preserved and prioritized around the Job Description.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Strong ATS Alignment: {atsScore}/100 ({analysis.readiness?.state || "ROLE_READY"})</span>. Ready to generate and download your 1-page ATS resume with full post-generation ATS breakdown.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition-colors w-full sm:w-auto text-center cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-confirm-generate-1page-resume"
            onClick={handleProceed}
            disabled={isGenerating}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-90 text-white font-black text-xs shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin text-white shrink-0" />
            ) : initialAutoPrint ? (
              <Printer className="h-4 w-4 text-indigo-200" />
            ) : (
              <FileText className="h-4 w-4 text-indigo-200" />
            )}
            <span>
              {isGenerating
                ? "Optimizing 1-Page ATS Resume & Score..."
                : initialAutoPrint
                ? "Generate & Print 1-Page Resume"
                : "Generate 1-Page ATS Resume"}
            </span>
            {isGenerating && (
              <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-black text-white tabular-nums">
                {numericGenPercent}% &bull; ~{estimatedGenSec}s
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
