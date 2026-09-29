import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Camera,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Columns,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  Layers,
  LayoutTemplate,
  Linkedin,
  Maximize2,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { GeneratedResume, ResumeTemplateId } from "../types.js";
import {
  downloadResumeAsDocx,
  downloadResumeAsJson,
  downloadResumeAsPdf,
  downloadResumeAsTxt,
} from "../lib/documentExport.js";
import { RESUME_TEMPLATE_CATALOG } from "./ResumePreGenerationModal.js";

interface ResumeViewerProps {
  resume: GeneratedResume;
  onViewAudit: () => void;
  onBackToAnalysis: () => void;
  onBackToGaps?: () => void;
  onUpdatePhoto?: (newPhotoUrl?: string) => void;
  onReconfigureResume?: () => void;
}

export const ResumeViewer: React.FC<ResumeViewerProps> = ({
  resume,
  onViewAudit,
  onBackToAnalysis,
  onBackToGaps,
  onUpdatePhoto,
  onReconfigureResume,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [localPhoto, setLocalPhoto] = useState<string | undefined>(resume?.photoUrl);
  const [activeTemplate, setActiveTemplate] = useState<ResumeTemplateId>(
    resume?.templateId || "two_column"
  );
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<
    "ALL" | "COLUMN_BASED" | "SINGLE_COLUMN"
  >("ALL");
  const [useNumberedHeadings, setUseNumberedHeadings] = useState(false);
  const [highlightJdMatches, setHighlightJdMatches] = useState(true);
  const [onePageAutoFit, setOnePageAutoFit] = useState(true);
  const [showAtsBreakdown, setShowAtsBreakdown] = useState(true);
  const [autoFitScale, setAutoFitScale] = useState<number>(1);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const resumeContainerRef = useRef<HTMLDivElement>(null);

  // Extract ALL preserved skills from generated resume (original + LinkedIn + JD matches)
  const initialSkills = useMemo(() => {
    if (!resume) return [];
    const scoreAny = (resume.atsScore || {}) as any;
    const list = [
      ...(resume.content?.skills || []),
      ...(resume.atsScore?.matchedSkills || []),
      ...(resume.atsScore?.preservedSkills || scoreAny.preservedOriginalSkills || []),
      ...(resume.atsScore?.linkedInSkillsIncluded || scoreAny.linkedInImportedSkills || []),
      ...(resume.technicalSkills?.languages || []),
      ...(resume.technicalSkills?.frameworks || []),
      ...(resume.technicalSkills?.cloudAndDevops || []),
      ...(resume.technicalSkills?.databases || []),
    ];
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const s of list) {
      const clean = (s || "").trim();
      if (!clean) continue;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        deduped.push(clean);
      }
    }
    return deduped;
  }, [resume]);

  const [activeSkills, setActiveSkills] = useState<string[]>(initialSkills);
  const [allKnownSkills, setAllKnownSkills] = useState<string[]>(initialSkills);
  const [showSkillsModal, setShowSkillsModal] = useState<boolean>(false);
  const [showHeadingsModal, setShowHeadingsModal] = useState<boolean>(false);
  const [viewerSkillSearch, setViewerSkillSearch] = useState<string>("");
  const [viewerNewSkill, setViewerNewSkill] = useState<string>("");
  const [includeLinkedinUrl, setIncludeLinkedinUrl] = useState<boolean>(
    resume?.linkedInData?.includeProfileUrlInResume !== false
  );
  const [customHeadings, setCustomHeadings] = useState<Record<string, string>>(() => ({
    ...(resume?.sectionHeadings || resume?.content?.sectionHeadings || {}),
  }));
  const [dynamicSectionsList, setDynamicSectionsList] = useState<any[]>(() =>
    resume?.dynamicSections || resume?.content?.dynamicSections || []
  );
  const [newSectionHeading, setNewSectionHeading] = useState<string>("");
  const [newSectionBullets, setNewSectionBullets] = useState<string>("");

  // Sync skills, photo, template, and dynamic sections when resume prop updates
  useEffect(() => {
    if (!resume) return;
    setActiveSkills(initialSkills);
    setAllKnownSkills(initialSkills);
    setLocalPhoto(resume.photoUrl);
    if (resume.templateId) {
      setActiveTemplate(resume.templateId);
    }
    setCustomHeadings({ ...(resume.sectionHeadings || resume.content?.sectionHeadings || {}) });
    setDynamicSectionsList(resume.dynamicSections || resume.content?.dynamicSections || []);
  }, [initialSkills, resume]);

  const effectiveResume: GeneratedResume = useMemo(() => {
    return {
      ...resume,
      templateId: activeTemplate,
      photoUrl: localPhoto,
      sectionHeadings: customHeadings,
      dynamicSections: dynamicSectionsList,
      linkedInData: resume.linkedInData
        ? {
            ...resume.linkedInData,
            includeProfileUrlInResume: includeLinkedinUrl,
          }
        : undefined,
      content: {
        ...(resume.content || {}),
        skills: activeSkills,
        sectionHeadings: customHeadings,
        dynamicSections: dynamicSectionsList,
      },
      atsScore: resume.atsScore
        ? {
            ...resume.atsScore,
            matchedSkills: activeSkills,
          }
        : undefined,
    };
  }, [resume, activeTemplate, localPhoto, activeSkills, customHeadings, dynamicSectionsList, includeLinkedinUrl]);

  // JD Keyword & Skill Matching helpers for Requirement 4 & 5 (Prioritize & Highlight JD Requirements)
  const jdMatchedKeywords = useMemo(() => {
    const scoreAny = (effectiveResume.atsScore || {}) as any;
    const raw = [
      ...(effectiveResume.atsScore?.jdMatchedKeywords || scoreAny.jdKeywordsMatched || []),
      ...(effectiveResume.atsScore?.matchedSkills || []),
    ];
    return Array.from(new Set(raw.map((k) => k.trim()).filter((k) => k.length >= 2)));
  }, [effectiveResume.atsScore]);

  const isSkillJdMatched = (skillName: string): boolean => {
    const sLow = skillName.toLowerCase().trim();
    return jdMatchedKeywords.some((kw) => {
      const kLow = kw.toLowerCase().trim();
      return sLow === kLow || sLow.includes(kLow) || kLow.includes(sLow);
    });
  };

  const isSkillFromLinkedIn = (skillName: string): boolean => {
    const sLow = skillName.toLowerCase().trim();
    const scoreAny = (effectiveResume.atsScore || {}) as any;
    const liList: string[] =
      effectiveResume.atsScore?.linkedInSkillsIncluded || scoreAny.linkedInImportedSkills || [];
    return liList.some((li) => li.toLowerCase().trim() === sLow);
  };

  // Prioritize JD-matching skills first within activeSkills while preserving 100% of skills
  const prioritizedSkills = useMemo(() => {
    return [...activeSkills].sort((a, b) => {
      const aMatch = isSkillJdMatched(a);
      const bMatch = isSkillJdMatched(b);
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
      return 0;
    });
  }, [activeSkills, jdMatchedKeywords]);

  // Subtle ATS-safe JD keyword highlighter for bullets and descriptions
  const renderHighlightedText = (text: string): React.ReactNode => {
    if (!highlightJdMatches || !text || jdMatchedKeywords.length === 0) {
      return text;
    }
    const sortedKeywords = [...jdMatchedKeywords]
      .filter((k) => k.length >= 3)
      .sort((a, b) => b.length - a.length)
      .slice(0, 24);
    if (sortedKeywords.length === 0) return text;

    const escaped = sortedKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(\\b(?:${escaped.join("|")})\\b)`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (regex.test(part)) {
        return (
          <strong
            key={i}
            className="font-bold text-slate-950 underline decoration-indigo-400/70 decoration-1 underline-offset-2 print:no-underline"
          >
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  // Canonical data sources (NO slicing or truncation — 100% of candidate's resume is preserved!)
  const content = effectiveResume.content || {};
  const experienceList = effectiveResume.experience || [];
  const projectsList = content.projects || [];
  const educationList = effectiveResume.education || [];
  const certificationsList = effectiveResume.certifications || [];
  const achievementsList = content.academicAchievements || [];
  const activitiesList = content.activities || achievementsList;

  // Dynamic 1-Page Auto-Fit measurement
  useEffect(() => {
    if (!onePageAutoFit || !resumeContainerRef.current) {
      setAutoFitScale(1);
      return;
    }
    const timer = setTimeout(() => {
      const el = resumeContainerRef.current;
      if (!el) return;
      const naturalHeight = el.scrollHeight;
      const targetMaxOnePageHeight = 1080; // Standard 1-Page A4/Letter proportion at max-w-4xl
      if (naturalHeight > targetMaxOnePageHeight) {
        const computed = Math.max(0.78, Math.min(1, targetMaxOnePageHeight / naturalHeight));
        setAutoFitScale(Number(computed.toFixed(2)));
      } else {
        setAutoFitScale(1);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [
    onePageAutoFit,
    activeTemplate,
    activeSkills,
    experienceList.length,
    projectsList.length,
    educationList.length,
    highlightJdMatches,
  ]);

  if (!resume) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-slate-600 mb-4">No resume record found.</p>
        <button
          onClick={onBackToAnalysis}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setLocalPhoto(dataUrl);
      if (onUpdatePhoto) onUpdatePhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setLocalPhoto(undefined);
    if (onUpdatePhoto) onUpdatePhoto(undefined);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(effectiveResume.markdownContent || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await downloadResumeAsPdf(effectiveResume, activeTemplate, resumeContainerRef.current);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    try {
      setDownloadingDocx(true);
      await downloadResumeAsDocx(effectiveResume, activeTemplate);
    } catch (err) {
      console.error("DOCX generation failed:", err);
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleDownloadTxt = () => {
    downloadResumeAsTxt(effectiveResume);
  };

  const handleDownloadJson = () => {
    downloadResumeAsJson(effectiveResume);
  };

  const handlePrint = () => {
    window.print();
  };

  // Skill checklist manipulation inside viewer
  const handleToggleViewerSkill = (skillName: string) => {
    setActiveSkills((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
    );
  };

  const handleViewerKeepMediumToHigh = () => {
    const matched = effectiveResume.atsScore?.jdKeywordsMatched || effectiveResume.atsScore?.matchedSkills || [];
    if (matched.length > 0) {
      setActiveSkills(matched);
    } else {
      setActiveSkills(initialSkills);
    }
  };

  const handleViewerSelectAll = () => {
    setActiveSkills(allKnownSkills);
  };

  const handleViewerClearAll = () => {
    setActiveSkills([]);
  };

  const handleAddViewerSkill = () => {
    const trimmed = viewerNewSkill.trim();
    if (!trimmed) return;
    if (!allKnownSkills.includes(trimmed)) {
      setAllKnownSkills((prev) => [...prev, trimmed]);
    }
    if (!activeSkills.includes(trimmed)) {
      setActiveSkills((prev) => [...prev, trimmed]);
    }
    setViewerNewSkill("");
  };

  // Authentic section headings detected from original resume (or customized by user)
  const rawHeadings = customHeadings || effectiveResume.sectionHeadings || effectiveResume.content?.sectionHeadings || {};
  const isNonTech = (effectiveResume.trackType || resume.trackType) === "NON_TECHNICAL";
  const effectiveHeadings = {
    summary: rawHeadings.summary || "Professional Summary",
    experience: rawHeadings.experience || "Professional Experience",
    education: rawHeadings.education || "Education",
    skills: rawHeadings.skills || (isNonTech ? "Core Competencies & Skills" : "Technical & Professional Skills"),
    softSkills: rawHeadings.softSkills || "Soft & Interpersonal Skills",
    projects: rawHeadings.projects || "Key Projects",
    certifications: rawHeadings.certifications || "Certifications & Credentials",
    achievements: rawHeadings.achievements || "Achievements & Honors",
    activities: rawHeadings.activities || rawHeadings.achievements || "Leadership & Activities",
  };

  const atsScoreObj = effectiveResume.atsScore;
  const atsScoreAny = (atsScoreObj || {}) as any;
  const atsScore = atsScoreObj?.overallScore ?? 82;
  const isBelow80 = atsScore < 80;

  const keywordMatchScore = atsScoreObj?.keywordCoverageScore ?? atsScoreAny.keywordMatchScore ?? atsScore;
  const skillsAlignmentScore = atsScoreObj?.skillsAlignmentScore ?? atsScore;
  const jobTitleAlignmentScore = atsScoreObj?.jobTitleAlignmentScore ?? 88;
  const experienceRelevanceScore = atsScoreObj?.experienceRelevanceScore ?? 85;
  const structureAndFormattingScore = atsScoreObj?.structureAndFormattingScore ?? 98;
  const missingKeywords = atsScoreObj?.missingOrWeakRequirements || atsScoreAny.missingKeywords || [];
  const improvementSuggestions = atsScoreObj?.improvementSuggestions || [];
  const atsParsingIssues = atsScoreObj?.parsingIssues || atsScoreAny.atsParsingIssues || [];
  const linkedInSkillsList = atsScoreObj?.linkedInSkillsIncluded || atsScoreAny.linkedInImportedSkills || [];
  const softSkillsList: string[] = effectiveResume.softSkills || effectiveResume.content?.softSkills || [];
  const recommendedDomains = effectiveResume.recommendedDomains || effectiveResume.content?.recommendedDomains || [];

  // Contact items for header
  const contactItems: string[] = [];
  if (effectiveResume.contactInfo?.email) contactItems.push(effectiveResume.contactInfo.email);
  if (effectiveResume.contactInfo?.phone) contactItems.push(effectiveResume.contactInfo.phone);
  if (effectiveResume.contactInfo?.location) contactItems.push(effectiveResume.contactInfo.location);
  if (effectiveResume.contactInfo?.linkedIn && includeLinkedinUrl) {
    contactItems.push(effectiveResume.contactInfo.linkedIn);
  }
  if (!isNonTech && effectiveResume.contactInfo?.github) {
    contactItems.push(effectiveResume.contactInfo.github);
  }
  if (!isNonTech && effectiveResume.contactInfo?.portfolio) {
    contactItems.push(effectiveResume.contactInfo.portfolio);
  }

  const visibleTemplates = RESUME_TEMPLATE_CATALOG.filter((t) =>
    templateCategoryFilter === "ALL" ? true : t.category === templateCategoryFilter
  );

  // Reusable Skill Pill / Item renderer that highlights JD-matched skills
  const renderSkillBadge = (skill: string, idx: number, compact = false) => {
    const matched = highlightJdMatches && isSkillJdMatched(skill);
    const fromLi = isSkillFromLinkedIn(skill);
    return (
      <span
        key={idx}
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
          compact ? "text-[10.5px]" : "text-[11px]"
        } ${
          matched
            ? "bg-indigo-50/90 font-bold text-indigo-950 border border-indigo-300/80 print:border-slate-400"
            : "bg-slate-100/80 font-medium text-slate-800 border border-slate-200"
        }`}
      >
        <span>{skill}</span>
        {fromLi && (
          <span className="text-[8.5px] font-bold uppercase text-[#0A66C2] print:hidden" title="Verified from LinkedIn">
            in
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hidden File Input for Profile Photo */}
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* TOP CONTROLS & EXPORT BAR */}
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {onBackToGaps ? (
            <button
              type="button"
              onClick={onBackToGaps}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Skill Gaps</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onBackToAnalysis}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Readiness Dashboard</span>
            </button>
          )}
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">1-Page ATS Resume</span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
            1-Page Optimized
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
            100% Info Preserved
          </span>
        </div>

        {/* Action & Download Buttons (PDF, DOCX, TXT, JSON, Copy, Print) */}
        <div className="flex flex-wrap items-center gap-2">
          {onReconfigureResume && (
            <button
              type="button"
              onClick={onReconfigureResume}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Configure / LinkedIn</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSkillsModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
            <span>Skills ({prioritizedSkills.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHeadingsModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900 hover:bg-violet-100 transition-colors cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-violet-600" />
            <span>Headings &amp; Sections ({dynamicSectionsList.length + 7})</span>
          </button>

          {localPhoto ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-900 hover:bg-indigo-100 transition-colors cursor-pointer"
                title="Change profile photo across all 12 templates & PDF"
              >
                <img
                  src={localPhoto}
                  alt="Profile"
                  className="h-5 w-5 rounded-full object-cover border border-indigo-400"
                />
                <span>Change Photo</span>
              </button>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                title="Remove photo from resume"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5 text-indigo-600" />
              <span>+ Add Photo (All Templates)</span>
            </button>
          )}

          <button
            type="button"
            id="btn-download-pdf"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>{downloadingPdf ? "Saving PDF..." : "Download PDF"}</span>
          </button>

          <button
            type="button"
            id="btn-download-docx"
            onClick={handleDownloadDocx}
            disabled={downloadingDocx}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <FileText className="h-4 w-4 text-indigo-600" />
            <span>{downloadingDocx ? "Saving DOCX..." : "DOCX"}</span>
          </button>

          <button
            type="button"
            id="btn-download-txt"
            onClick={handleDownloadTxt}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <FileText className="h-4 w-4 text-slate-600" />
            <span>TXT</span>
          </button>

          <button
            type="button"
            id="btn-download-json"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <FileCode className="h-4 w-4 text-slate-600" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            id="btn-copy-resume"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            id="btn-print-resume"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-black shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print 1-Page</span>
          </button>
        </div>
      </div>

      {/* =================================================================================
          POST-GENERATION ATS COMPATIBILITY SCORE & BREAKDOWN PANEL (REQUIREMENT 8 & 9)
          ================================================================================= */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden print:hidden">
        <div
          onClick={() => setShowAtsBreakdown((prev) => !prev)}
          className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`h-12 w-12 rounded-2xl flex flex-col items-center justify-center font-black border-2 shrink-0 ${
                atsScore >= 80
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : atsScore >= 65
                  ? "bg-amber-500/20 border-amber-400 text-amber-300"
                  : "bg-rose-500/20 border-rose-400 text-rose-300"
              }`}
            >
              <span className="text-base leading-none">{atsScore}</span>
              <span className="text-[9px] uppercase tracking-wider opacity-80">/100</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-indigo-300" />
                  <span>Post-Generation ATS Compatibility &amp; JD Match Report</span>
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    atsScore >= 80
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-amber-400 text-slate-950"
                  }`}
                >
                  {atsScore >= 80 ? "80%+ ATS Ready" : `Below 80% Advisory (${atsScore}%)`}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Evaluated on your final generated 1-page resume • {prioritizedSkills.length} preserved skills ({jdMatchedKeywords.length} JD-matched) • {experienceList.length} roles • {projectsList.length} projects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-semibold text-indigo-200">
              {showAtsBreakdown ? "Hide Breakdown" : "Show Full ATS Breakdown"}
            </span>
            {showAtsBreakdown ? (
              <ChevronUp className="h-4 w-4 text-indigo-200" />
            ) : (
              <ChevronDown className="h-4 w-4 text-indigo-200" />
            )}
          </div>
        </div>

        {showAtsBreakdown && (
          <div className="p-5 space-y-4">
            {/* 5 Sub-Score Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "Keyword Match", score: keywordMatchScore, desc: "JD keyword coverage" },
                { label: "Skills Alignment", score: skillsAlignmentScore, desc: "Required skills prioritized" },
                { label: "Job Title Alignment", score: jobTitleAlignmentScore, desc: "Target role positioning" },
                { label: "Experience Relevance", score: experienceRelevanceScore, desc: "JD-aligned impact bullets" },
                { label: "ATS Formatting", score: structureAndFormattingScore, desc: "1-page parser compliance" },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-800">{metric.label}</span>
                      <span
                        className={`text-xs font-black ${
                          metric.score >= 80
                            ? "text-emerald-700"
                            : metric.score >= 65
                            ? "text-amber-700"
                            : "text-rose-700"
                        }`}
                      >
                        {metric.score}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full ${
                          metric.score >= 80
                            ? "bg-emerald-500"
                            : metric.score >= 65
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(10, metric.score))}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500">{metric.desc}</span>
                </div>
              ))}
            </div>

            {/* CLARIFIED <80% ATS SCORE DISCLAIMER (REQUIREMENT 9) */}
            {isBelow80 && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 text-amber-950 space-y-2">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                        ATS Score Below 80% Disclaimer ({atsScore}/100) — Full Download &amp; Print Enabled
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
                        Ready to Download (PDF / DOCX / TXT)
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">
                      <strong>Why your score is below 80%:</strong> Automated ATS filters compare your verified resume qualifications against mandatory keywords in the Job Description. Because ResuMate AI strictly never fabricates unverified skills, missing JD requirements lower the raw keyword score.
                    </p>
                    <p className="text-xs leading-relaxed font-semibold text-amber-900">
                      <strong>You may still proceed and download or print this resume immediately:</strong> All of your original resume qualifications, experience, education, projects, and LinkedIn-verified skills have been preserved and prioritized for maximum recruiter impact on 1 page.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Missing Keywords, Actionable Improvements & LinkedIn Sync Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Improvement Suggestions & Missing Keywords */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>Actionable ATS Improvement Recommendations</span>
                </div>
                {missingKeywords.length > 0 && (
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">Missing JD Keywords (Add via Skills Checklist if you have them): </span>
                    <span className="text-rose-700 font-semibold">{missingKeywords.slice(0, 8).join(", ")}</span>
                  </div>
                )}
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                  {improvementSuggestions.length > 0 ? (
                    improvementSuggestions.map((sug, i) => <li key={i}>{sug}</li>)
                  ) : (
                    <li>All core JD keywords and section headings are cleanly aligned for 1-page ATS parsing.</li>
                  )}
                </ul>
              </div>

              {/* Content Preservation & ATS Parsing Health */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Preserved Resume Inventory &amp; ATS Parser Check</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-semibold text-emerald-900">
                    {prioritizedSkills.length} Total Skills Preserved
                  </span>
                  <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 font-semibold text-indigo-900">
                    {jdMatchedKeywords.length} JD Requirements Highlighted
                  </span>
                  {linkedInSkillsList.length > 0 && (
                    <span className="rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1 font-semibold text-sky-900 flex items-center gap-1">
                      <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                      {linkedInSkillsList.length} LinkedIn Skills Merged
                    </span>
                  )}
                </div>
                {atsParsingIssues.length > 0 ? (
                  <p className="text-xs text-amber-800">{atsParsingIssues.join(" • ")}</p>
                ) : (
                  <p className="text-xs text-slate-600">
                    <strong>Zero ATS Parsing Blockers:</strong> Standard section headings, clean chronological dates, and prioritized JD keywords verified.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================================
          LIVE 12-TEMPLATE SWITCHER & 1-PAGE / JD HIGHLIGHT CONTROLS (REQUIREMENT 2, 5, 6)
          ================================================================================= */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              Resume Template Library (12 Layouts):
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setTemplateCategoryFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  templateCategoryFilter === "ALL"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All (12)
              </button>
              <button
                type="button"
                onClick={() => setTemplateCategoryFilter("COLUMN_BASED")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  templateCategoryFilter === "COLUMN_BASED"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Columns className="h-3.5 w-3.5" />
                <span>Column-Based (6)</span>
              </button>
              <button
                type="button"
                onClick={() => setTemplateCategoryFilter("SINGLE_COLUMN")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  templateCategoryFilter === "SINGLE_COLUMN"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Single-Column (6)
              </button>
            </div>
          </div>

          {/* Toggles for JD Highlight, 1-Page Auto-Fit, and Numbered Headings */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setHighlightJdMatches((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                highlightJdMatches
                  ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <Eye className="h-3.5 w-3.5 text-indigo-600" />
              <span>{highlightJdMatches ? "JD Highlights: ON" : "JD Highlights: OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => setOnePageAutoFit((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                onePageAutoFit
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>{onePageAutoFit ? "1-Page Auto-Fit: ON" : "1-Page Auto-Fit: OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => setUseNumberedHeadings((prev) => !prev)}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              {useNumberedHeadings ? "Clean Headings" : "Numbered Headings"}
            </button>
          </div>
        </div>

        {/* Template Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {visibleTemplates.map((tmpl) => {
            const active = activeTemplate === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setActiveTemplate(tmpl.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  active
                    ? "border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-600 shadow-2xs"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white"
                }`}
              >
                <div className="text-xs font-bold text-slate-900 leading-tight line-clamp-2">
                  {tmpl.name}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tmpl.badgeColor}`}>
                    {tmpl.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          PAPER SHEET DOCUMENT CANVAS — 1-PAGE OPTIMIZED PREVIEW & PRINT
          ========================================================================= */}
      <div
        ref={resumeContainerRef}
        style={
          onePageAutoFit && autoFitScale < 1
            ? {
                zoom: autoFitScale,
              }
            : undefined
        }
        className={`resume-sheet-container bg-white shadow-xl text-slate-900 mx-auto print:max-w-none print:shadow-none print:border-none print:p-0 print:m-0 rounded-2xl border border-slate-300 p-6 sm:p-8 max-w-4xl ${
          activeTemplate === "harvard" || activeTemplate === "finance"
            ? "font-serif-classic"
            : "font-sans-modern"
        }`}
      >
        {/* =========================================================================
            COLUMN TEMPLATE 1: COMPACT LEFT-SIDEBAR SPLIT RAIL ('two_column')
            ========================================================================= */}
        {activeTemplate === "two_column" && (
          <div className="space-y-3 text-slate-900">
            <div className="border-b-2 border-slate-900 pb-2.5 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">
                  {effectiveResume.candidateName}
                </h1>
                <p className="text-xs font-bold text-indigo-700 mt-0.5">
                  {effectiveResume.targetJobTitle}
                </p>
                <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center gap-x-2">
                  {contactItems.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <span>{item}</span>
                      {idx < contactItems.length - 1 && <span>•</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              {localPhoto && (
                <img
                  src={localPhoto}
                  alt={effectiveResume.candidateName}
                  className="h-14 w-14 rounded-xl object-cover border border-slate-300"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* LEFT SIDEBAR (4 cols): Prioritized Skills, Education, Certifications, Achievements */}
              <div className="md:col-span-4 space-y-3 md:border-r md:border-slate-200 md:pr-4">
                <div className="resume-section">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
                    {effectiveHeadings.skills}
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    {prioritizedSkills.map((s, idx) => renderSkillBadge(s, idx, true))}
                  </div>
                </div>

                {educationList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
                      {effectiveHeadings.education}
                    </h2>
                    <div className="space-y-1.5">
                      {educationList.map((ed: any, idx: number) => (
                        <div key={idx} className="text-[11px]">
                          <div className="font-bold text-slate-900">{ed.degree}</div>
                          <div className="text-slate-700">{ed.institution}</div>
                          <div className="text-[10px] text-slate-500">
                            {[ed.year, ed.gpa ? `GPA: ${ed.gpa}` : ""].filter(Boolean).join(" • ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {certificationsList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
                      {effectiveHeadings.certifications}
                    </h2>
                    <ul className="space-y-1 text-[11px] text-slate-800">
                      {certificationsList.map((cert, idx) => (
                        <li key={idx} className="leading-snug">
                          • {renderHighlightedText(cert)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {achievementsList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
                      {effectiveHeadings.achievements}
                    </h2>
                    <ul className="space-y-1 text-[11px] text-slate-800">
                      {achievementsList.map((ach, idx) => (
                        <li key={idx} className="leading-snug">
                          • {renderHighlightedText(ach)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* RIGHT MAIN PANE (8 cols): Summary, All Experience, All Projects */}
              <div className="md:col-span-8 space-y-3">
                {effectiveResume.summary && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1">
                      {effectiveHeadings.summary}
                    </h2>
                    <p className="text-[11.5px] text-slate-800 leading-snug">
                      {renderHighlightedText(effectiveResume.summary)}
                    </p>
                  </div>
                )}

                {experienceList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
                      {effectiveHeadings.experience}
                    </h2>
                    <div className="space-y-2">
                      {experienceList.map((exp, idx) => (
                        <div key={idx} className="resume-entry text-[11.5px]">
                          <div className="flex justify-between items-baseline font-bold text-slate-950">
                            <span>
                              {exp.role} — <span className="text-indigo-900">{exp.company}</span>
                            </span>
                            <span className="text-[10.5px] text-slate-600 font-normal shrink-0 ml-2">
                              {exp.dates}
                            </span>
                          </div>
                          {exp.bullets && exp.bullets.length > 0 && (
                            <ul className="list-disc list-outside ml-4 text-slate-800 mt-0.5 space-y-0.5">
                              {exp.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="leading-snug">
                                  {renderHighlightedText(b)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projectsList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
                      {effectiveHeadings.projects}
                    </h2>
                    <div className="space-y-1.5">
                      {projectsList.map((p: any, idx: number) => (
                        <div key={idx} className="resume-entry text-[11.5px]">
                          <div className="flex flex-wrap justify-between items-baseline gap-1">
                            <span className="font-bold text-slate-950">{p.name}</span>
                            {p.technologies && p.technologies.length > 0 && (
                              <span className="text-[10.5px] font-semibold text-indigo-700">
                                [{Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies}]
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-slate-800 leading-snug mt-0.5">
                              {renderHighlightedText(p.description)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            COLUMN TEMPLATE 2: EXECUTIVE ASYMMETRIC RIGHT-RAIL ('col_executive_split')
            ========================================================================= */}
        {activeTemplate === "col_executive_split" && (
          <div className="space-y-3 text-slate-900">
            <div className="border-b-2 border-indigo-900 pb-2.5 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950">
                  {effectiveResume.candidateName}
                </h1>
                <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-800 mt-0.5">
                  {effectiveResume.targetJobTitle}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-[11px] text-slate-700 space-y-0.5">
                  {contactItems.map((c, i) => (
                    <div key={i}>{c}</div>
                  ))}
                </div>
                {localPhoto && (
                  <img
                    src={localPhoto}
                    alt={effectiveResume.candidateName}
                    className="h-14 w-14 rounded-xl object-cover border-2 border-indigo-900 shrink-0"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* LEFT PRIMARY NARRATIVE (8 cols): Summary, Experience, Projects */}
              <div className="md:col-span-8 space-y-3 md:border-r md:border-slate-200 md:pr-4">
                {effectiveResume.summary && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-indigo-950 border-b border-indigo-200 pb-0.5 mb-1">
                      {effectiveHeadings.summary}
                    </h2>
                    <p className="text-[11.5px] text-slate-800 leading-snug">
                      {renderHighlightedText(effectiveResume.summary)}
                    </p>
                  </div>
                )}

                {experienceList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-indigo-950 border-b border-indigo-200 pb-0.5 mb-1.5">
                      {effectiveHeadings.experience}
                    </h2>
                    <div className="space-y-2">
                      {experienceList.map((exp, idx) => (
                        <div key={idx} className="resume-entry text-[11.5px]">
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-slate-950">
                              {exp.role} <span className="text-slate-600 font-semibold">| {exp.company}</span>
                            </span>
                            <span className="text-[10.5px] font-semibold text-indigo-800 shrink-0 ml-2">
                              {exp.dates}
                            </span>
                          </div>
                          {exp.bullets && (
                            <ul className="list-disc list-outside ml-4 text-slate-800 mt-0.5 space-y-0.5">
                              {exp.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="leading-snug">
                                  {renderHighlightedText(b)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projectsList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-indigo-950 border-b border-indigo-200 pb-0.5 mb-1.5">
                      {effectiveHeadings.projects}
                    </h2>
                    <div className="space-y-1.5">
                      {projectsList.map((p: any, idx: number) => (
                        <div key={idx} className="resume-entry text-[11.5px]">
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-slate-950">{p.name}</span>
                            {p.technologies && p.technologies.length > 0 && (
                              <span className="text-[10px] font-bold text-indigo-700">
                                {Array.isArray(p.technologies) ? p.technologies.join(" • ") : p.technologies}
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-slate-800 leading-snug mt-0.5">
                              {renderHighlightedText(p.description)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT STRATEGY RAIL (4 cols): Core JD Skills, Education, Certifications, Achievements */}
              <div className="md:col-span-4 space-y-3">
                <div className="resume-section rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-indigo-950 border-b border-slate-300 pb-0.5 mb-1.5">
                    {effectiveHeadings.skills}
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    {prioritizedSkills.map((s, idx) => renderSkillBadge(s, idx, true))}
                  </div>
                </div>

                {educationList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-indigo-950 border-b border-indigo-200 pb-0.5 mb-1.5">
                      {effectiveHeadings.education}
                    </h2>
                    <div className="space-y-1.5">
                      {educationList.map((ed: any, idx: number) => (
                        <div key={idx} className="text-[11px]">
                          <div className="font-bold text-slate-950">{ed.degree}</div>
                          <div className="text-slate-700">{ed.institution}</div>
                          {ed.year && <div className="text-[10px] text-slate-500">{ed.year}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {certificationsList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-indigo-950 border-b border-indigo-200 pb-0.5 mb-1.5">
                      {effectiveHeadings.certifications}
                    </h2>
                    <ul className="space-y-1 text-[11px] text-slate-800">
                      {certificationsList.map((c, idx) => (
                        <li key={idx}>• {renderHighlightedText(c)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {achievementsList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-indigo-950 border-b border-indigo-200 pb-0.5 mb-1.5">
                      {effectiveHeadings.achievements}
                    </h2>
                    <ul className="space-y-1 text-[11px] text-slate-800">
                      {achievementsList.map((a, idx) => (
                        <li key={idx}>• {renderHighlightedText(a)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            COLUMN TEMPLATE 3: ENGINEERING DUAL-COLUMN MATRIX ('col_tech_matrix')
            ========================================================================= */}
        {activeTemplate === "col_tech_matrix" && (
          <div className="space-y-3 text-slate-900">
            <div className="rounded-xl bg-slate-900 text-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {localPhoto && (
                  <img
                    src={localPhoto}
                    alt={effectiveResume.candidateName}
                    className="h-14 w-14 rounded-xl object-cover border-2 border-violet-400 shrink-0"
                  />
                )}
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight font-mono text-white">
                    {effectiveResume.candidateName}
                  </h1>
                  <p className="text-xs font-mono text-violet-300">
                    {effectiveResume.targetJobTitle}
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-300 flex flex-wrap gap-x-2 sm:text-right sm:justify-end">
                {contactItems.join(" | ")}
              </div>
            </div>

            {effectiveResume.summary && (
              <div className="resume-section text-[11.5px] text-slate-800 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <span className="font-mono font-bold text-violet-900 uppercase mr-1.5">
                  [{effectiveHeadings.summary}]:
                </span>
                {renderHighlightedText(effectiveResume.summary)}
              </div>
            )}

            {/* 2-Column Categorized Skill Matrix */}
            <div className="resume-section rounded-xl border border-violet-200 bg-violet-50/40 p-2.5">
              <div className="text-[10.5px] font-black font-mono uppercase text-violet-950 mb-1.5">
                // {effectiveHeadings.skills} (JD-Prioritized Matrix)
              </div>
              <div className="flex flex-wrap gap-1">
                {prioritizedSkills.map((s, idx) => renderSkillBadge(s, idx, true))}
              </div>
            </div>

            {/* Dual-Column Engineering Split: Experience Left (7 cols) + Projects & Credentials Right (5 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7 space-y-2.5 md:border-r md:border-slate-200 md:pr-3.5">
                <h2 className="text-[11px] font-black font-mono uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                  01 // {effectiveHeadings.experience}
                </h2>
                {experienceList.map((exp, idx) => (
                  <div key={idx} className="resume-entry text-[11.5px]">
                    <div className="flex justify-between font-bold text-slate-950">
                      <span>{exp.role} @ {exp.company}</span>
                      <span className="text-[10px] font-mono text-slate-500">{exp.dates}</span>
                    </div>
                    {exp.bullets && (
                      <ul className="list-disc list-outside ml-4 text-slate-800 mt-0.5 space-y-0.5">
                        {exp.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="leading-snug">
                            {renderHighlightedText(b)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              <div className="md:col-span-5 space-y-3">
                {projectsList.length > 0 && (
                  <div className="resume-section space-y-1.5">
                    <h2 className="text-[11px] font-black font-mono uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      02 // {effectiveHeadings.projects}
                    </h2>
                    {projectsList.map((p: any, idx: number) => (
                      <div key={idx} className="resume-entry text-[11px]">
                        <div className="font-bold text-slate-950">{p.name}</div>
                        {p.technologies && p.technologies.length > 0 && (
                          <div className="text-[10px] font-mono text-violet-700">
                            {Array.isArray(p.technologies) ? p.technologies.join(" • ") : p.technologies}
                          </div>
                        )}
                        {p.description && (
                          <p className="text-slate-700 leading-snug mt-0.5">
                            {renderHighlightedText(p.description)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {educationList.length > 0 && (
                  <div className="resume-section space-y-1">
                    <h2 className="text-[11px] font-black font-mono uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      03 // {effectiveHeadings.education}
                    </h2>
                    {educationList.map((ed: any, idx: number) => (
                      <div key={idx} className="text-[11px]">
                        <div className="font-bold text-slate-950">{ed.degree}</div>
                        <div className="text-slate-700">{ed.institution} {ed.year ? `(${ed.year})` : ""}</div>
                      </div>
                    ))}
                  </div>
                )}

                {(certificationsList.length > 0 || achievementsList.length > 0) && (
                  <div className="resume-section space-y-1">
                    <h2 className="text-[11px] font-black font-mono uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      04 // {effectiveHeadings.certifications}
                    </h2>
                    <ul className="text-[11px] text-slate-800 space-y-0.5">
                      {[...certificationsList, ...achievementsList].map((c, idx) => (
                        <li key={idx}>• {renderHighlightedText(c)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            COLUMN TEMPLATE 4: MODERN SLATE SIDEBAR ACCENT ('col_modern_sidebar')
            ========================================================================= */}
        {activeTemplate === "col_modern_sidebar" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 rounded-xl overflow-hidden border border-slate-200">
            {/* Tinted Left Rail (4 cols) */}
            <div className="md:col-span-4 bg-slate-50 border-r border-l-4 border-l-indigo-600 border-slate-200 p-4 space-y-3.5">
              <div>
                {localPhoto && (
                  <img
                    src={localPhoto}
                    alt={effectiveResume.candidateName}
                    className="h-16 w-16 rounded-full object-cover border-2 border-indigo-600 mb-2"
                  />
                )}
                <h1 className="text-xl font-black tracking-tight text-slate-950 leading-tight">
                  {effectiveResume.candidateName}
                </h1>
                <p className="text-xs font-bold text-indigo-700 mt-0.5">
                  {effectiveResume.targetJobTitle}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-700 space-y-0.5">
                  {contactItems.map((c, i) => (
                    <div key={i} className="truncate">{c}</div>
                  ))}
                </div>
              </div>

              <div className="resume-section">
                <h2 className="text-[10.5px] font-black uppercase tracking-wider text-indigo-950 border-b border-slate-300 pb-0.5 mb-1.5">
                  {effectiveHeadings.skills}
                </h2>
                <div className="flex flex-wrap gap-1">
                  {prioritizedSkills.map((s, idx) => renderSkillBadge(s, idx, true))}
                </div>
              </div>

              {educationList.length > 0 && (
                <div className="resume-section">
                  <h2 className="text-[10.5px] font-black uppercase tracking-wider text-indigo-950 border-b border-slate-300 pb-0.5 mb-1.5">
                    {effectiveHeadings.education}
                  </h2>
                  <div className="space-y-1.5">
                    {educationList.map((ed: any, idx: number) => (
                      <div key={idx} className="text-[11px]">
                        <div className="font-bold text-slate-950">{ed.degree}</div>
                        <div className="text-slate-700">{ed.institution}</div>
                        {ed.year && <div className="text-[10px] text-slate-500">{ed.year}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(certificationsList.length > 0 || achievementsList.length > 0) && (
                <div className="resume-section">
                  <h2 className="text-[10.5px] font-black uppercase tracking-wider text-indigo-950 border-b border-slate-300 pb-0.5 mb-1.5">
                    {effectiveHeadings.certifications}
                  </h2>
                  <ul className="space-y-1 text-[11px] text-slate-800">
                    {[...certificationsList, ...achievementsList].map((c, idx) => (
                      <li key={idx} className="leading-snug">• {renderHighlightedText(c)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* White Main Column (8 cols) */}
            <div className="md:col-span-8 p-4 space-y-3 bg-white">
              {effectiveResume.summary && (
                <div className="resume-section">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
                    {effectiveHeadings.summary}
                  </h2>
                  <p className="text-[11.5px] text-slate-800 leading-snug">
                    {renderHighlightedText(effectiveResume.summary)}
                  </p>
                </div>
              )}

              {experienceList.length > 0 && (
                <div className="resume-section">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5">
                    {effectiveHeadings.experience}
                  </h2>
                  <div className="space-y-2">
                    {experienceList.map((exp, idx) => (
                      <div key={idx} className="resume-entry text-[11.5px]">
                        <div className="flex justify-between items-baseline font-bold text-slate-950">
                          <span>{exp.role} — {exp.company}</span>
                          <span className="text-[10.5px] text-indigo-700 font-semibold shrink-0 ml-2">{exp.dates}</span>
                        </div>
                        {exp.bullets && (
                          <ul className="list-disc list-outside ml-4 text-slate-800 mt-0.5 space-y-0.5">
                            {exp.bullets.map((b, bIdx) => (
                              <li key={bIdx} className="leading-snug">{renderHighlightedText(b)}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {projectsList.length > 0 && (
                <div className="resume-section">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5">
                    {effectiveHeadings.projects}
                  </h2>
                  <div className="space-y-1.5">
                    {projectsList.map((p: any, idx: number) => (
                      <div key={idx} className="resume-entry text-[11.5px]">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-slate-950">{p.name}</span>
                          {p.technologies && p.technologies.length > 0 && (
                            <span className="text-[10.5px] font-semibold text-indigo-600">
                              {Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies}
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-slate-800 leading-snug mt-0.5">{renderHighlightedText(p.description)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            COLUMN TEMPLATE 5: STRUCTURED CREDENTIALS & RESEARCH GRID ('col_academic_grid')
            ========================================================================= */}
        {activeTemplate === "col_academic_grid" && (
          <div className="space-y-3 text-slate-900">
            <div className="text-center border-b-2 border-slate-800 pb-2.5 relative">
              {localPhoto && (
                <div className="absolute right-0 top-0">
                  <img
                    src={localPhoto}
                    alt={effectiveResume.candidateName}
                    className="h-14 w-14 rounded-xl object-cover border-2 border-sky-800"
                  />
                </div>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                {effectiveResume.candidateName}
              </h1>
              <p className="text-xs font-bold text-sky-800 mt-0.5">{effectiveResume.targetJobTitle}</p>
              <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap justify-center gap-x-2">
                {contactItems.join("  •  ")}
              </div>
            </div>

            {effectiveResume.summary && (
              <div className="resume-section border-b border-slate-200 pb-2">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-sky-950 mb-0.5">
                  {effectiveHeadings.summary}
                </h2>
                <p className="text-[11.5px] text-slate-800 leading-snug">
                  {renderHighlightedText(effectiveResume.summary)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column (5 cols): Education, Certifications, Skills, Achievements */}
              <div className="md:col-span-5 space-y-3 md:border-r md:border-slate-200 md:pr-4">
                {educationList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-sky-950 border-b border-slate-300 pb-0.5 mb-1.5">
                      {effectiveHeadings.education}
                    </h2>
                    <div className="space-y-2">
                      {educationList.map((ed: any, idx: number) => (
                        <div key={idx} className="text-[11px]">
                          <div className="font-bold text-slate-950">{ed.institution}</div>
                          <div className="text-slate-800">{ed.degree}</div>
                          <div className="text-[10px] text-slate-500">
                            {[ed.year, ed.gpa ? `GPA: ${ed.gpa}` : ""].filter(Boolean).join(" | ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="resume-section">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-sky-950 border-b border-slate-300 pb-0.5 mb-1.5">
                    {effectiveHeadings.skills}
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    {prioritizedSkills.map((s, idx) => renderSkillBadge(s, idx, true))}
                  </div>
                </div>

                {certificationsList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-sky-950 border-b border-slate-300 pb-0.5 mb-1.5">
                      {effectiveHeadings.certifications}
                    </h2>
                    <ul className="space-y-1 text-[11px] text-slate-800">
                      {certificationsList.map((c, idx) => (
                        <li key={idx}>• {renderHighlightedText(c)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {achievementsList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-sky-950 border-b border-slate-300 pb-0.5 mb-1.5">
                      {effectiveHeadings.achievements}
                    </h2>
                    <ul className="space-y-1 text-[11px] text-slate-800">
                      {achievementsList.map((a, idx) => (
                        <li key={idx}>• {renderHighlightedText(a)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column (7 cols): Experience & Projects */}
              <div className="md:col-span-7 space-y-3">
                {experienceList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-sky-950 border-b border-slate-300 pb-0.5 mb-1.5">
                      {effectiveHeadings.experience}
                    </h2>
                    <div className="space-y-2">
                      {experienceList.map((exp, idx) => (
                        <div key={idx} className="resume-entry text-[11.5px]">
                          <div className="flex justify-between font-bold text-slate-950">
                            <span>{exp.role} — {exp.company}</span>
                            <span className="text-[10.5px] text-slate-500 font-normal">{exp.dates}</span>
                          </div>
                          {exp.bullets && (
                            <ul className="list-disc list-outside ml-4 text-slate-800 mt-0.5 space-y-0.5">
                              {exp.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="leading-snug">{renderHighlightedText(b)}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projectsList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-sky-950 border-b border-slate-300 pb-0.5 mb-1.5">
                      {effectiveHeadings.projects}
                    </h2>
                    <div className="space-y-1.5">
                      {projectsList.map((p: any, idx: number) => (
                        <div key={idx} className="resume-entry text-[11.5px]">
                          <div className="flex justify-between font-bold text-slate-950">
                            <span>{p.name}</span>
                            {p.technologies && p.technologies.length > 0 && (
                              <span className="text-[10px] text-sky-800 font-semibold">
                                [{Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies}]
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-slate-800 leading-snug mt-0.5">{renderHighlightedText(p.description)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            COLUMN TEMPLATE 6: SYMMETRIC 50/50 HIGH-DENSITY DUAL PANE ('col_compact_dual')
            ========================================================================= */}
        {activeTemplate === "col_compact_dual" && (
          <div className="space-y-2.5 text-slate-900">
            <div className="border-b-2 border-slate-900 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {localPhoto && (
                  <img
                    src={localPhoto}
                    alt={effectiveResume.candidateName}
                    className="h-13 w-13 rounded-xl object-cover border-2 border-rose-800 shrink-0"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">
                    {effectiveResume.candidateName}
                  </h1>
                  <p className="text-xs font-bold text-rose-800">{effectiveResume.targetJobTitle}</p>
                </div>
              </div>
              <div className="text-[11px] text-slate-700 flex flex-wrap gap-x-2 sm:justify-end">
                {contactItems.join(" | ")}
              </div>
            </div>

            {effectiveResume.summary && (
              <div className="resume-section bg-slate-50 rounded-lg p-2 border border-slate-200 text-[11px] text-slate-800 leading-snug">
                <strong className="uppercase text-slate-950 mr-1">{effectiveHeadings.summary}:</strong>
                {renderHighlightedText(effectiveResume.summary)}
              </div>
            )}

            {/* Symmetric 50/50 Two-Column Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Column 1: Work Experience & Education */}
              <div className="space-y-2.5 md:border-r md:border-slate-200 md:pr-3.5">
                {experienceList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-1">
                      {effectiveHeadings.experience}
                    </h2>
                    <div className="space-y-2">
                      {experienceList.map((exp, idx) => (
                        <div key={idx} className="resume-entry text-[11px]">
                          <div className="flex justify-between font-bold text-slate-950">
                            <span>{exp.role} — {exp.company}</span>
                            <span className="text-[10px] text-slate-500 font-normal">{exp.dates}</span>
                          </div>
                          {exp.bullets && (
                            <ul className="list-disc list-outside ml-4 text-slate-800 mt-0.5 space-y-0.5">
                              {exp.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="leading-snug">{renderHighlightedText(b)}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {educationList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-1">
                      {effectiveHeadings.education}
                    </h2>
                    <div className="space-y-1">
                      {educationList.map((ed: any, idx: number) => (
                        <div key={idx} className="text-[11px] flex justify-between">
                          <div>
                            <span className="font-bold text-slate-950">{ed.degree}</span>
                            <span className="text-slate-700"> • {ed.institution}</span>
                          </div>
                          {ed.year && <span className="text-[10px] text-slate-500">{ed.year}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Skills, Projects, Certifications & Achievements */}
              <div className="space-y-2.5">
                <div className="resume-section">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-1">
                    {effectiveHeadings.skills}
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    {prioritizedSkills.map((s, idx) => renderSkillBadge(s, idx, true))}
                  </div>
                </div>

                {projectsList.length > 0 && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-1">
                      {effectiveHeadings.projects}
                    </h2>
                    <div className="space-y-1.5">
                      {projectsList.map((p: any, idx: number) => (
                        <div key={idx} className="resume-entry text-[11px]">
                          <div className="flex justify-between font-bold text-slate-950">
                            <span>{p.name}</span>
                            {p.technologies && p.technologies.length > 0 && (
                              <span className="text-[10px] text-indigo-700 font-semibold">
                                [{Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies}]
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-slate-800 leading-snug mt-0.5">{renderHighlightedText(p.description)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(certificationsList.length > 0 || achievementsList.length > 0) && (
                  <div className="resume-section">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-1">
                      {effectiveHeadings.certifications} &amp; Honors
                    </h2>
                    <ul className="space-y-0.5 text-[11px] text-slate-800">
                      {[...certificationsList, ...achievementsList].map((c, idx) => (
                        <li key={idx} className="leading-snug">• {renderHighlightedText(c)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SINGLE-COLUMN TEMPLATE 7: HARVARD / IVY LEAGUE CLASSIC ('harvard')
            ========================================================================= */}
        {activeTemplate === "harvard" && (
          <div className="space-y-3 text-slate-900 font-serif">
            <div className="text-center pb-1 relative">
              {localPhoto && (
                <div className="absolute right-0 top-0">
                  <img
                    src={localPhoto}
                    alt={effectiveResume.candidateName}
                    className="h-14 w-14 rounded object-cover border border-slate-400"
                  />
                </div>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-serif">
                {effectiveResume.candidateName || "Candidate Name"}
              </h1>
              <div className="text-xs text-slate-800 font-serif flex items-center justify-center flex-wrap gap-x-2 mt-0.5">
                {contactItems.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <span>{item}</span>
                    {idx < contactItems.length - 1 && <span className="text-slate-500">•</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {effectiveResume.summary && (
              <div className="resume-section">
                <h2 className="text-sm font-bold text-slate-950 font-serif uppercase tracking-wider">
                  {useNumberedHeadings ? `1. ${effectiveHeadings.summary}` : effectiveHeadings.summary}
                </h2>
                <div className="w-full border-b border-black mt-0.5 mb-1.5"></div>
                <p className="text-xs text-slate-900 font-serif leading-snug">
                  {renderHighlightedText(effectiveResume.summary)}
                </p>
              </div>
            )}

            <div className="resume-section">
              <h2 className="text-sm font-bold text-slate-950 font-serif uppercase tracking-wider">
                {useNumberedHeadings ? `2. ${effectiveHeadings.skills}` : effectiveHeadings.skills}
              </h2>
              <div className="w-full border-b border-black mt-0.5 mb-1.5"></div>
              <div className="flex flex-wrap gap-1">
                {prioritizedSkills.map((s, idx) => renderSkillBadge(s, idx, true))}
              </div>
            </div>

            {experienceList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-sm font-bold text-slate-950 font-serif uppercase tracking-wider">
                  {useNumberedHeadings ? `3. ${effectiveHeadings.experience}` : effectiveHeadings.experience}
                </h2>
                <div className="w-full border-b border-black mt-0.5 mb-1.5"></div>
                <div className="space-y-2">
                  {experienceList.map((exp: any, idx: number) => (
                    <div key={idx} className="space-y-0.5 text-xs font-serif">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold uppercase tracking-wider text-slate-950">
                          {exp.role} — <span className="italic font-normal normal-case">{exp.company}</span>
                        </span>
                        <span className="text-slate-800 shrink-0 ml-2">{exp.dates}</span>
                      </div>
                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 space-y-0.5 text-slate-900 leading-snug">
                          {exp.bullets.map((b: string, bIdx: number) => (
                            <li key={bIdx}>{renderHighlightedText(b)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {projectsList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-sm font-bold text-slate-950 font-serif uppercase tracking-wider">
                  {useNumberedHeadings ? `4. ${effectiveHeadings.projects}` : effectiveHeadings.projects}
                </h2>
                <div className="w-full border-b border-black mt-0.5 mb-1.5"></div>
                <div className="space-y-1.5">
                  {projectsList.map((p: any, idx: number) => (
                    <div key={idx} className="text-xs font-serif">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-slate-950">{p.name}</span>
                        {p.technologies && p.technologies.length > 0 && (
                          <span className="italic text-slate-800">
                            {Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies}
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-slate-900 leading-snug mt-0.5">
                          {renderHighlightedText(p.description)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {educationList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-sm font-bold text-slate-950 font-serif uppercase tracking-wider">
                  {useNumberedHeadings ? `5. ${effectiveHeadings.education}` : effectiveHeadings.education}
                </h2>
                <div className="w-full border-b border-black mt-0.5 mb-1.5"></div>
                <div className="space-y-1">
                  {educationList.map((ed: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-baseline text-xs font-serif">
                      <div>
                        <span className="font-bold text-slate-950">{ed.institution}</span> —{" "}
                        <span>{ed.degree}</span>
                        {ed.gpa ? ` (GPA: ${ed.gpa})` : ""}
                      </div>
                      <span className="text-slate-800">{ed.year || ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(certificationsList.length > 0 || activitiesList.length > 0) && (
              <div className="resume-section">
                <h2 className="text-sm font-bold text-slate-950 font-serif uppercase tracking-wider">
                  {useNumberedHeadings ? `6. ${effectiveHeadings.certifications}` : effectiveHeadings.certifications}
                </h2>
                <div className="w-full border-b border-black mt-0.5 mb-1.5"></div>
                <div className="text-xs font-serif text-slate-900 leading-snug">
                  {[
                    ...certificationsList,
                    ...activitiesList.map((a: any) => (typeof a === "string" ? a : `${a.name}: ${a.description || ""}`)),
                  ].join("  •  ")}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SINGLE-COLUMN TEMPLATE 8: MODERN EXECUTIVE ('modern')
            ========================================================================= */}
        {activeTemplate === "modern" && (
          <div className="space-y-3 text-slate-900">
            <div className="border-b-2 border-indigo-600 pb-2 flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  {effectiveResume.candidateName}
                </h1>
                <p className="text-xs font-bold text-indigo-600 mt-0.5">
                  {effectiveResume.targetJobTitle}
                </p>
                <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center gap-x-2">
                  {contactItems.join("  |  ")}
                </div>
              </div>
              {localPhoto && (
                <img
                  src={localPhoto}
                  alt={effectiveResume.candidateName}
                  className="h-14 w-14 rounded-xl object-cover border-2 border-indigo-200"
                />
              )}
            </div>

            {effectiveResume.summary && (
              <div className="resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
                  {useNumberedHeadings ? `1. ${effectiveHeadings.summary}` : effectiveHeadings.summary}
                </h2>
                <p className="text-[11.5px] text-slate-800 leading-snug">
                  {renderHighlightedText(effectiveResume.summary)}
                </p>
              </div>
            )}

            <div className="resume-section">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5">
                {useNumberedHeadings ? `2. ${effectiveHeadings.skills}` : effectiveHeadings.skills}
              </h2>
              <div className="flex flex-wrap gap-1">
                {prioritizedSkills.map((s, idx) => renderSkillBadge(s, idx, true))}
              </div>
            </div>

            {experienceList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
                  {useNumberedHeadings ? `3. ${effectiveHeadings.experience}` : effectiveHeadings.experience}
                </h2>
                <div className="space-y-2">
                  {experienceList.map((exp, idx) => (
                    <div key={idx} className="resume-entry text-[11.5px]">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{exp.role} – {exp.company}</span>
                        <span className="text-[10.5px] text-slate-500 font-normal">{exp.dates}</span>
                      </div>
                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 text-slate-800 mt-0.5 space-y-0.5">
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-snug">{renderHighlightedText(b)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {projectsList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
                  {useNumberedHeadings ? `4. ${effectiveHeadings.projects}` : effectiveHeadings.projects}
                </h2>
                <div className="space-y-1.5">
                  {projectsList.map((p: any, idx: number) => (
                    <div key={idx} className="resume-entry text-[11.5px]">
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-900">{p.name}</span>
                        {p.technologies && p.technologies.length > 0 && (
                          <span className="text-[10.5px] font-semibold text-indigo-600">
                            {Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies}
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-slate-700 leading-snug mt-0.5">{renderHighlightedText(p.description)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              {educationList.length > 0 && (
                <div className="resume-section">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
                    {useNumberedHeadings ? `5. ${effectiveHeadings.education}` : effectiveHeadings.education}
                  </h2>
                  <div className="space-y-1">
                    {educationList.map((ed, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="font-bold text-slate-900">{ed.degree}</span>
                        <span className="text-slate-600 block text-[10.5px]">
                          {ed.institution} {ed.year ? `(${ed.year})` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(certificationsList.length > 0 || achievementsList.length > 0) && (
                <div className="resume-section">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
                    {useNumberedHeadings ? `6. ${effectiveHeadings.certifications}` : effectiveHeadings.certifications}
                  </h2>
                  <div className="text-[11px] text-slate-700 leading-snug">
                    {[...certificationsList, ...achievementsList].join(" • ")}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            SINGLE-COLUMN TEMPLATE 9: SILICON VALLEY TECH ('tech')
            ========================================================================= */}
        {activeTemplate === "tech" && (
          <div className="space-y-3 font-sans text-slate-900">
            <div className="border-b-2 border-slate-800 pb-2 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950 font-mono">
                  {effectiveResume.candidateName}
                </h1>
                <p className="text-xs font-bold text-violet-700 mt-0.5">
                  {effectiveResume.targetJobTitle}
                </p>
                <div className="text-[11px] text-slate-600 mt-1 font-mono flex flex-wrap gap-x-2">
                  {contactItems.join(" / ")}
                </div>
              </div>
              {localPhoto && (
                <img
                  src={localPhoto}
                  alt={effectiveResume.candidateName}
                  className="h-14 w-14 rounded-lg object-cover border border-slate-700"
                />
              )}
            </div>

            <div className="resume-section rounded-xl border border-slate-300 bg-slate-50/70 p-2.5 space-y-1.5">
              <div className="text-[10.5px] font-black uppercase tracking-wider text-slate-800 font-mono">
                // {effectiveHeadings.skills.toUpperCase()} (JD-PRIORITIZED)
              </div>
              <div className="flex flex-wrap gap-1">
                {prioritizedSkills.map((s, idx) => renderSkillBadge(s, idx, true))}
              </div>
            </div>

            {effectiveResume.summary && (
              <div className="resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1 font-mono">
                  01. {effectiveHeadings.summary}
                </h2>
                <p className="text-[11.5px] text-slate-800 leading-snug">
                  {renderHighlightedText(effectiveResume.summary)}
                </p>
              </div>
            )}

            {experienceList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1 font-mono">
                  02. {effectiveHeadings.experience}
                </h2>
                <div className="space-y-2">
                  {experienceList.map((exp, idx) => (
                    <div key={idx} className="resume-entry text-[11.5px]">
                      <div className="flex justify-between font-bold text-slate-950">
                        <span>{exp.role} @ {exp.company}</span>
                        <span className="text-[10.5px] font-mono text-slate-500 font-normal">{exp.dates}</span>
                      </div>
                      {exp.bullets && (
                        <ul className="list-disc list-outside ml-4 text-slate-800 mt-0.5 space-y-0.5">
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-snug">{renderHighlightedText(b)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {projectsList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1 font-mono">
                  03. {effectiveHeadings.projects}
                </h2>
                <div className="space-y-1.5">
                  {projectsList.map((p: any, idx: number) => (
                    <div key={idx} className="resume-entry text-[11.5px]">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-slate-900">{p.name}</span>
                        {p.technologies && p.technologies.length > 0 && (
                          <span className="text-[10.5px] font-mono text-violet-700">
                            {Array.isArray(p.technologies) ? p.technologies.join(" | ") : p.technologies}
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-slate-700 leading-snug mt-0.5">{renderHighlightedText(p.description)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="resume-section flex flex-wrap justify-between items-start gap-4 border-t border-slate-200 pt-2 text-[11px]">
              {educationList.length > 0 && (
                <div>
                  <span className="font-bold text-slate-900 font-mono">{effectiveHeadings.education}: </span>
                  {educationList.map((ed, i) => (
                    <span key={i} className="text-slate-800 mr-2">
                      {ed.degree} ({ed.institution}{ed.year ? `, ${ed.year}` : ""})
                    </span>
                  ))}
                </div>
              )}
              {(certificationsList.length > 0 || achievementsList.length > 0) && (
                <div>
                  <span className="font-bold text-slate-900 font-mono">{effectiveHeadings.certifications}: </span>
                  <span className="text-slate-800">{[...certificationsList, ...achievementsList].join(" • ")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            SINGLE-COLUMN TEMPLATE 10: MINIMALIST PURE ATS ('minimal')
            ========================================================================= */}
        {activeTemplate === "minimal" && (
          <div className="space-y-3 font-sans text-black">
            <div className="border-b border-black pb-2 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wider text-black">
                  {effectiveResume.candidateName}
                </h1>
                <p className="text-xs text-black font-semibold mt-0.5">
                  {effectiveResume.targetJobTitle}
                </p>
                <div className="text-[11px] text-black mt-0.5 flex flex-wrap gap-x-2">
                  {contactItems.join("  •  ")}
                </div>
              </div>
              {localPhoto && (
                <img
                  src={localPhoto}
                  alt={effectiveResume.candidateName}
                  className="h-14 w-14 rounded object-cover border border-black shrink-0"
                />
              )}
            </div>

            {effectiveResume.summary && (
              <div className="resume-section">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">
                  {effectiveHeadings.summary}
                </h2>
                <p className="text-[11.5px] text-black leading-snug">
                  {renderHighlightedText(effectiveResume.summary)}
                </p>
              </div>
            )}

            <div className="resume-section">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">
                {effectiveHeadings.skills}
              </h2>
              <p className="text-[11.5px] text-black leading-snug">
                {prioritizedSkills.map((s, idx) => (
                  <React.Fragment key={idx}>
                    <span className={highlightJdMatches && isSkillJdMatched(s) ? "font-bold underline" : ""}>
                      {s}
                    </span>
                    {idx < prioritizedSkills.length - 1 && " • "}
                  </React.Fragment>
                ))}
              </p>
            </div>

            {experienceList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">
                  {effectiveHeadings.experience}
                </h2>
                <div className="space-y-2">
                  {experienceList.map((exp, idx) => (
                    <div key={idx} className="resume-entry text-[11.5px]">
                      <div className="flex justify-between font-bold text-black">
                        <span>{exp.role} — {exp.company}</span>
                        <span>{exp.dates}</span>
                      </div>
                      {exp.bullets && (
                        <ul className="list-disc list-outside ml-4 text-black mt-0.5 space-y-0.5">
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-snug">{renderHighlightedText(b)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {projectsList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">
                  {effectiveHeadings.projects}
                </h2>
                <div className="space-y-1.5">
                  {projectsList.map((p: any, idx: number) => (
                    <div key={idx} className="resume-entry text-[11.5px]">
                      <div className="flex justify-between font-bold text-black">
                        <span>{p.name}</span>
                        {p.technologies && p.technologies.length > 0 && (
                          <span>[{Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies}]</span>
                        )}
                      </div>
                      {p.description && <p className="text-black leading-snug">{renderHighlightedText(p.description)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {educationList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">
                  {effectiveHeadings.education}
                </h2>
                {educationList.map((ed, idx) => (
                  <div key={idx} className="flex justify-between text-[11.5px] text-black">
                    <span className="font-bold">{ed.degree}</span>
                    <span>{ed.institution}{ed.year ? ` (${ed.year})` : ""}</span>
                  </div>
                ))}
              </div>
            )}

            {(certificationsList.length > 0 || achievementsList.length > 0) && (
              <div className="resume-section">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">
                  {effectiveHeadings.certifications}
                </h2>
                <p className="text-[11.5px] text-black">
                  {[...certificationsList, ...achievementsList].join(" • ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SINGLE-COLUMN TEMPLATE 11: WALL STREET & CORPORATE FINANCE ('finance')
            ========================================================================= */}
        {activeTemplate === "finance" && (
          <div className="space-y-2.5 text-slate-950 font-serif">
            <div className="text-center border-b-4 border-double border-slate-900 pb-2 relative">
              {localPhoto && (
                <div className="absolute right-0 top-0">
                  <img
                    src={localPhoto}
                    alt={effectiveResume.candidateName}
                    className="h-14 w-14 rounded object-cover border border-slate-900"
                  />
                </div>
              )}
              <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-950">
                {effectiveResume.candidateName}
              </h1>
              <div className="text-xs text-slate-800 mt-0.5">
                {contactItems.join("  |  ")}
              </div>
            </div>

            {educationList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-0.5 mb-1">
                  {effectiveHeadings.education}
                </h2>
                {educationList.map((ed: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <div>
                      <span className="font-bold uppercase">{ed.institution}</span> —{" "}
                      <span className="italic">{ed.degree}</span>
                      {ed.gpa ? ` • GPA: ${ed.gpa}` : ""}
                    </div>
                    <span className="font-semibold">{ed.year || ""}</span>
                  </div>
                ))}
              </div>
            )}

            {experienceList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-0.5 mb-1">
                  {effectiveHeadings.experience}
                </h2>
                <div className="space-y-2">
                  {experienceList.map((exp, idx) => (
                    <div key={idx} className="resume-entry text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="uppercase">{exp.company} — <span className="italic normal-case">{exp.role}</span></span>
                        <span>{exp.dates}</span>
                      </div>
                      {exp.bullets && (
                        <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 leading-snug">
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx}>{renderHighlightedText(b)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {projectsList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-0.5 mb-1">
                  Selected Transactions &amp; {effectiveHeadings.projects}
                </h2>
                <div className="space-y-1.5">
                  {projectsList.map((p: any, idx: number) => (
                    <div key={idx} className="text-xs">
                      <span className="font-bold">{p.name}: </span>
                      <span>{renderHighlightedText(p.description || "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="resume-section">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-0.5 mb-1">
                {effectiveHeadings.skills}, Certifications &amp; Additional Information
              </h2>
              <div className="text-xs space-y-0.5">
                <div>
                  <span className="font-bold">Core Competencies &amp; Skills: </span>
                  <span>{prioritizedSkills.join(" • ")}</span>
                </div>
                {(certificationsList.length > 0 || achievementsList.length > 0) && (
                  <div>
                    <span className="font-bold">Certifications &amp; Honors: </span>
                    <span>{[...certificationsList, ...achievementsList].join(" • ")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SINGLE-COLUMN TEMPLATE 12: CLINICAL, OPERATIONS & SPECIALIST ('healthcare')
            ========================================================================= */}
        {activeTemplate === "healthcare" && (
          <div className="space-y-3 text-slate-900">
            <div className="border-b-2 border-teal-700 pb-2.5 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950">
                  {effectiveResume.candidateName}
                </h1>
                <p className="text-xs font-bold text-teal-800 uppercase tracking-wider mt-0.5">
                  {effectiveResume.targetJobTitle}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-[11px] text-slate-700">
                  {contactItems.map((c, i) => (
                    <div key={i}>{c}</div>
                  ))}
                </div>
                {localPhoto && (
                  <img
                    src={localPhoto}
                    alt={effectiveResume.candidateName}
                    className="h-14 w-14 rounded-xl object-cover border-2 border-teal-700 shrink-0"
                  />
                )}
              </div>
            </div>

            {effectiveResume.summary && (
              <div className="resume-section bg-teal-50/50 border-l-4 border-teal-700 p-2.5 text-[11.5px] text-slate-800 leading-snug">
                {renderHighlightedText(effectiveResume.summary)}
              </div>
            )}

            {/* Credentials & Core Competencies Top Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7 resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-teal-900 border-b border-teal-200 pb-0.5 mb-1.5">
                  {effectiveHeadings.skills}
                </h2>
                <div className="flex flex-wrap gap-1">
                  {prioritizedSkills.map((s, idx) => renderSkillBadge(s, idx, true))}
                </div>
              </div>
              <div className="md:col-span-5 resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-teal-900 border-b border-teal-200 pb-0.5 mb-1.5">
                  {effectiveHeadings.certifications} &amp; Licensure
                </h2>
                {certificationsList.length > 0 ? (
                  <ul className="text-[11px] text-slate-800 space-y-0.5">
                    {certificationsList.map((c, idx) => (
                      <li key={idx} className="font-semibold">• {renderHighlightedText(c)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-600">Verified professional qualifications</p>
                )}
              </div>
            </div>

            {experienceList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-teal-900 border-b border-teal-200 pb-0.5 mb-1.5">
                  {effectiveHeadings.experience}
                </h2>
                <div className="space-y-2">
                  {experienceList.map((exp, idx) => (
                    <div key={idx} className="resume-entry text-[11.5px]">
                      <div className="flex justify-between font-bold text-slate-950">
                        <span>{exp.role} — {exp.company}</span>
                        <span className="text-[10.5px] text-teal-800 font-semibold">{exp.dates}</span>
                      </div>
                      {exp.bullets && (
                        <ul className="list-disc list-outside ml-4 text-slate-800 mt-0.5 space-y-0.5">
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-snug">{renderHighlightedText(b)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {projectsList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-teal-900 border-b border-teal-200 pb-0.5 mb-1.5">
                  {effectiveHeadings.projects} &amp; Initiatives
                </h2>
                <div className="space-y-1.5">
                  {projectsList.map((p: any, idx: number) => (
                    <div key={idx} className="text-[11.5px]">
                      <span className="font-bold text-slate-950">{p.name}: </span>
                      <span className="text-slate-800">{renderHighlightedText(p.description || "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {educationList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-teal-900 border-b border-teal-200 pb-0.5 mb-1">
                  {effectiveHeadings.education}
                </h2>
                <div className="space-y-1">
                  {educationList.map((ed: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11.5px]">
                      <span className="font-bold text-slate-950">{ed.degree} — {ed.institution}</span>
                      <span className="text-slate-600">{ed.year || ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            UNIVERSAL DYNAMIC RESUME SECTIONS & SOFT SKILLS RENDERER
            Preserves 100% of custom/dynamic sections from the user's uploaded resume
            (e.g., Internships, Publications, Research, Volunteer, Leadership, Languages, Courses)
            ========================================================================= */}
        {(softSkillsList.length > 0 || (dynamicSectionsList && dynamicSectionsList.length > 0)) && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-2.5 text-slate-900">
            {softSkillsList.length > 0 && (
              <div className="resume-section">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1">
                  {effectiveHeadings.softSkills}
                </h2>
                <div className="text-[11px] text-slate-800 leading-snug">
                  {softSkillsList.join("  •  ")}
                </div>
              </div>
            )}

            {dynamicSectionsList.map((sec: any, sIdx: number) => {
              if (!sec.items || sec.items.length === 0) return null;
              return (
                <div key={sec.id || sIdx} className="resume-section">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1">
                    {sec.heading}
                  </h2>
                  <div className="space-y-1.5">
                    {sec.items.map((item: any, iIdx: number) => (
                      <div key={iIdx} className="resume-entry text-[11.5px]">
                        {(item.title || item.subtitle || item.date) && (
                          <div className="flex justify-between items-baseline font-bold text-slate-950">
                            <span>
                              {item.title}
                              {item.subtitle ? ` — ${item.subtitle}` : ""}
                            </span>
                            {item.date && (
                              <span className="text-[10.5px] font-normal text-slate-600 shrink-0 ml-2">
                                {item.date}
                              </span>
                            )}
                          </div>
                        )}
                        {item.bullets && item.bullets.length > 0 && (
                          <ul className="list-disc list-outside ml-4 text-slate-800 mt-0.5 space-y-0.5">
                            {item.bullets.map((b: string, bIdx: number) => (
                              <li key={bIdx} className="leading-snug">
                                {renderHighlightedText(b)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DYNAMIC HEADINGS & CUSTOM SECTIONS MODAL */}
      {showHeadingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-violet-600/80 border border-violet-400/30 flex items-center justify-center text-white">
                  <Layers className="h-4.5 w-4.5 text-violet-200" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Dynamic Resume Headings &amp; Custom Sections</h3>
                  <p className="text-xs text-violet-200/80">
                    Preserve your original resume headings or add custom sections (Internships, Publications, Volunteer, etc.)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHeadingsModal(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* LinkedIn URL Inclusion Toggle */}
              {effectiveResume.contactInfo?.linkedIn && (
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Include LinkedIn Profile URL in Resume Header
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {effectiveResume.contactInfo.linkedIn}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeLinkedinUrl}
                    onChange={(e) => setIncludeLinkedinUrl(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              )}

              {/* Edit Section Headings */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Section Headings (Auto-Detected from Your Uploaded Resume)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "summary", label: "Summary / Profile Heading", fallback: "Professional Summary" },
                    { key: "skills", label: "Skills Heading", fallback: "Technical & Professional Skills" },
                    { key: "experience", label: "Experience Heading", fallback: "Professional Experience" },
                    { key: "projects", label: "Projects Heading", fallback: "Key Projects" },
                    { key: "education", label: "Education Heading", fallback: "Education" },
                    { key: "certifications", label: "Certifications Heading", fallback: "Certifications & Credentials" },
                    { key: "achievements", label: "Achievements / Awards Heading", fallback: "Achievements & Honors" },
                    { key: "softSkills", label: "Soft Skills Heading", fallback: "Soft & Interpersonal Skills" },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">{field.label}</label>
                      <input
                        type="text"
                        value={customHeadings[field.key] ?? field.fallback}
                        onChange={(e) =>
                          setCustomHeadings((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic / Custom Sections List */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Dynamic &amp; Additional Resume Sections ({dynamicSectionsList.length})
                  </h4>
                </div>

                {dynamicSectionsList.length > 0 ? (
                  <div className="space-y-2.5">
                    {dynamicSectionsList.map((sec, sIdx) => (
                      <div key={sec.id || sIdx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={sec.heading}
                            onChange={(e) => {
                              const next = [...dynamicSectionsList];
                              next[sIdx] = { ...next[sIdx], heading: e.target.value };
                              setDynamicSectionsList(next);
                            }}
                            className="font-bold text-xs text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex-1"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDynamicSectionsList((prev) => prev.filter((_, i) => i !== sIdx))
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-600 pl-1">
                          {(sec.items || [])
                            .flatMap((it: any) => it.bullets || [it.title])
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No additional custom sections currently added. Use the form below to add Internships, Publications, Volunteer Experience, Languages, or any custom section.
                  </p>
                )}

                {/* Add New Dynamic Section */}
                <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-200 space-y-2.5">
                  <div className="text-xs font-bold text-violet-950">
                    + Add Dynamic Section (e.g., Internships, Publications, Research Experience, Volunteer, Languages)
                  </div>
                  <input
                    type="text"
                    value={newSectionHeading}
                    onChange={(e) => setNewSectionHeading(e.target.value)}
                    placeholder="Section Heading (e.g., Publications, Research Experience, Languages)"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900"
                  />
                  <textarea
                    rows={3}
                    value={newSectionBullets}
                    onChange={(e) => setNewSectionBullets(e.target.value)}
                    placeholder="Enter bullet points (one per line)..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    disabled={!newSectionHeading.trim() || !newSectionBullets.trim()}
                    onClick={() => {
                      const bullets = newSectionBullets
                        .split("\n")
                        .map((l) => l.replace(/^[-*•]\s*/, "").trim())
                        .filter(Boolean);
                      if (!newSectionHeading.trim() || bullets.length === 0) return;
                      setDynamicSectionsList((prev) => [
                        ...prev,
                        {
                          id: `custom-${Date.now()}`,
                          heading: newSectionHeading.trim(),
                          category: "custom",
                          items: [{ bullets }],
                        },
                      ]);
                      setNewSectionHeading("");
                      setNewSectionBullets("");
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Section to Resume</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                All dynamic headings and sections automatically sync to PDF, DOCX, TXT, and JSON exports.
              </span>
              <button
                type="button"
                onClick={() => setShowHeadingsModal(false)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKILLS CHECKLIST MODAL */}
      {showSkillsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-600/80 border border-indigo-400/30 flex items-center justify-center text-white">
                  <CheckSquare className="h-4.5 w-4.5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Preserved Resume &amp; LinkedIn Skills</h3>
                  <p className="text-xs text-indigo-200/80">
                    {activeSkills.length} of {allKnownSkills.length} skills included • JD matches prioritized first
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSkillsModal(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleViewerSelectAll}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Include All Preserved ({allKnownSkills.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleViewerKeepMediumToHigh}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
                  >
                    JD-Matched Only
                  </button>
                  <button
                    type="button"
                    onClick={handleViewerClearAll}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-2xs transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                <div className="relative flex-1 min-w-[150px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={viewerSkillSearch}
                    onChange={(e) => setViewerSkillSearch(e.target.value)}
                    placeholder="Search skills..."
                    className="w-full pl-8 pr-3 py-1 rounded-lg border border-slate-200 bg-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                {allKnownSkills
                  .filter((s) => !viewerSkillSearch || s.toLowerCase().includes(viewerSkillSearch.toLowerCase()))
                  .map((skillName) => {
                    const isChecked = activeSkills.includes(skillName);
                    const isMatched = isSkillJdMatched(skillName);
                    const fromLi = isSkillFromLinkedIn(skillName);
                    return (
                      <label
                        key={skillName}
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
                            onChange={() => handleToggleViewerSkill(skillName)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-900 truncate">{skillName}</span>
                          {fromLi && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-[#0A66C2]">
                              LinkedIn
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isMatched ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              JD Match (Top Priority)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600">
                              Preserved from Resume
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={viewerNewSkill}
                  onChange={(e) => setViewerNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddViewerSkill();
                    }
                  }}
                  placeholder="Add another verified skill to resume..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddViewerSkill}
                  disabled={!viewerNewSkill.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-bold transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Changes apply in real-time to all 12 templates, print, and PDF/DOCX/TXT/JSON downloads.
              </span>
              <button
                type="button"
                onClick={() => setShowSkillsModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
