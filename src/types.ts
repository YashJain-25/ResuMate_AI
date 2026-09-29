export type EvidenceStrength = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'MODERATE' | 'LOW' | 'NONE';

export type EvidenceType =
  | 'professional_experience'
  | 'project_implementation'
  | 'certification'
  | 'course_training'
  | 'skills_section_only'
  | 'video_assessment'
  | 'reassessment_proof'
  | 'none';

export type ReadinessState = 'READY' | 'NEAR_READY' | 'NOT_READY';

export type JobTrack = 'TECHNICAL' | 'NON_TECHNICAL';

export type GapPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AuditVerdict = 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type MatchStatus = 'MATCHED' | 'PARTIALLY_MATCHED' | 'NOT_FOUND';

export interface SectionHeadings {
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  technicalSkills?: string;
  softSkills?: string;
  projects?: string;
  certifications?: string;
  achievements?: string;
  activities?: string;
  internships?: string;
  publications?: string;
  awards?: string;
  languages?: string;
  courses?: string;
  volunteer?: string;
  leadership?: string;
}

export interface DynamicResumeSectionItem {
  title?: string;
  subtitle?: string;
  date?: string;
  location?: string;
  description?: string;
  bullets: string[];
  technologies?: string[];
  isJdMatched?: boolean;
}

export interface DynamicResumeSection {
  id: string;
  heading: string; // Exact heading detected from the user's uploaded resume
  category?:
    | 'internships'
    | 'publications'
    | 'awards'
    | 'languages'
    | 'courses'
    | 'volunteer'
    | 'leadership'
    | 'research'
    | 'highlights'
    | 'soft_skills'
    | 'custom';
  items: DynamicResumeSectionItem[];
}

export interface CareerDomainPortalLink {
  portalName: string;
  url: string;
  badgeColor?: string;
}

export interface CareerDomainRecommendation {
  domainTitle: string;
  matchPercentage: number;
  rationale: string;
  matchedUserSkills: string[];
  suggestedRoles: string[];
  portalLinks: CareerDomainPortalLink[];
}

export interface ParsedResume {
  sectionHeadings?: SectionHeadings;
  detectedHeadings?: string[];
  personalInfo?: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    otherContact?: string;
  };
  summary?: string; // Profile / Summary
  education: {
    degree: string;
    institution: string;
    location?: string;
    gpa?: string;
    percentage?: string;
    year?: string;
    startDate?: string;
    endDate?: string;
    fieldOfStudy?: string;
    details?: string;
  }[];
  certifications: {
    name: string;
    issuer?: string;
    year?: string;
    credentialId?: string;
    url?: string;
  }[];
  skills: string[];
  technicalSkills?: string[];
  softSkills?: string[];
  projects: {
    name: string;
    description: string;
    technologies?: string[];
    contributions?: string;
    achievements?: string;
    link?: string;
    role?: string;
  }[];
  experience: {
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description: string;
    technologiesUsed?: string[];
    contributions?: string;
  }[];
  academicAchievements?: string[];
  dynamicSections?: DynamicResumeSection[];
  recommendedDomains?: CareerDomainRecommendation[];
}

export interface JobRequirement {
  skill: string;
  canonicalSkill: string;
  category: string;
  requiredLevel: 'basic' | 'intermediate' | 'expert';
  importance: 'critical' | 'high' | 'medium' | 'nice-to-have';
  mandatory: boolean;
  evidenceRequired: boolean;
}

export interface ParsedJobDescription {
  jobTitle: string;
  company?: string;
  location?: string;
  department?: string;
  summary?: string;
  responsibilities: string[];
  requirements: JobRequirement[];
  criticalSkills: string[];
  preferredSkills: string[];
  experienceYears?: number;
  educationRequirements?: string;
}

export interface SkillEvidence {
  skill: string;
  canonicalSkill: string;
  evidenceType: EvidenceType;
  evidenceText: string;
  confidence: number;
  strength: EvidenceStrength;
  sourceSection?: 'experience' | 'projects' | 'certifications' | 'education' | 'skills_list' | 'assessment';
}

export interface SkillMatch {
  requirement: JobRequirement;
  candidateSkill?: string;
  matched: boolean;
  matchStatus: MatchStatus; // 'MATCHED' | 'PARTIALLY_MATCHED' | 'NOT_FOUND'
  evidenceStrength: EvidenceStrength;
  confidence: number;
  evidenceSnippets: string[];
  resumeEvidence?: string;
  resumeSection?: string;
  status: 'strong' | 'weak' | 'missing';
  reasoning: string;
}

export interface ReadinessResult {
  overallScore: number; // 0 to 100
  state: ReadinessState;
  explanation: string;
  criticalSkillsCovered: number;
  criticalSkillsTotal: number;
  strongSkills: string[];
  weakSkills: string[];
  missingSkills: string[];
  evidenceSummary: string;
  nextRecommendedAction: 'video_assessment' | 'generate_resume' | 'learning_path';
}

export interface SkillGap {
  id: string;
  skill: string;
  priority: GapPriority;
  gapType: 'missing_skill' | 'weak_evidence' | 'experience_depth';
  reason: string;
  impactOnReadiness: string;
}

export interface LearningItem {
  id: string;
  gapSkill: string;
  title: string;
  type: 'course' | 'project' | 'practice' | 'documentation';
  description: string;
  estimatedHours: number;
  resources: {
    title: string;
    url: string;
    isFree: boolean;
  }[];
  completed: boolean;
  expectedOutcome: string;
}

export interface LearningPath {
  id: string;
  analysisId: string;
  targetJobTitle: string;
  gaps: SkillGap[];
  items: LearningItem[];
  progressPercent: number;
  createdAt: string;
}

export interface AssessmentQuestion {
  id: string;
  targetSkill: string;
  questionType: 'technical' | 'scenario' | 'problem_solving';
  prompt: string;
  contextOrScenario?: string;
  evaluationRubric: {
    keyAspects: string[];
    minimumProficiencyCriteria: string;
  };
}

export interface VideoAssessment {
  id: string;
  analysisId: string;
  jobTitle: string;
  questions: AssessmentQuestion[];
  status: 'pending' | 'submitted' | 'evaluated';
  answers?: {
    questionId: string;
    targetSkill: string;
    transcription: string;
    audioDurationSeconds?: number;
    evaluation?: {
      technicalCorrectnessScore: number; // 0-100
      depthScore: number; // 0-100
      reasoningScore: number; // 0-100
      overallSkillRating: EvidenceStrength;
      feedback: string;
      verifiedDemonstration: boolean;
    };
  }[];
  overallAssessmentScore?: number;
  updatedReadinessState?: ReadinessState;
  evaluatedAt?: string;
}

export type ResumeTemplateId =
  | 'harvard'            // Harvard / Ivy League Classic ATS (Single-Column)
  | 'modern'             // Modern Executive (Single-Column)
  | 'tech'               // Silicon Valley Tech (Single-Column)
  | 'minimal'            // Minimalist Pure ATS (Single-Column)
  | 'consulting'         // MBB Strategy & Management Consulting (Single-Column)
  | 'academic_cv'        // Research & Academic Precision (Single-Column)
  | 'finance'            // Wall Street & Corporate Finance (Single-Column)
  | 'healthcare'         // Clinical, Operations & Specialist (Single-Column)
  | 'two_column'         // Column 1: Compact Two-Column Split Rail (Left 1/3 Rail + Right 2/3 Main)
  | 'executive_columns'  // Column 2: Executive Asymmetric Right-Rail (Left 65% Main + Right 35% Strategy/Skills Rail)
  | 'technical_grid'     // Column 3: Engineering Multi-Column Matrix (3-Col Tech Grid + 2-Col Experience/Projects)
  | 'modern_sidebar'     // Column 4: Modern Slate Sidebar Column (Tinted Left Profile/Skills + Right Experience)
  | 'double_rail'        // Column 5: Balanced 50/50 Corporate Dual-Column (Symmetric Two-Column Body)
  | 'tri_column_brief'   // Column 6: Executive Three-Column Briefing Deck + Split Body
  | 'col_executive_split'
  | 'col_tech_matrix'
  | 'col_modern_sidebar'
  | 'col_academic_grid'
  | 'col_compact_dual';

export interface LinkedInSkillItem {
  name: string;
  category: string;
  source: 'linkedin';
  included?: boolean;
  verifiedFromSection?: string;
  endorsementsOrContext?: string;
  matchesJd?: boolean;
}

export interface LinkedInProfileData {
  connected: boolean;
  authorizedByUser: boolean;
  authorizedAt?: string;
  profileUrl?: string;
  fullName?: string;
  headline?: string;
  summary?: string;
  extractedSkills: LinkedInSkillItem[];
  certifications?: string[];
  experienceHighlights?: string[];
  connectionMethod?: 'oauth' | 'authorized_import';
  includeProfileUrlInResume?: boolean;
}

export interface AtsScorePoint {
  overallScore: number;
  matchPercentage: number;
  state: string;
  matchedRequirementsCount: number;
  totalRequirementsCount: number;
  matchedSkills: string[];
  preservedSkills?: string[];
  linkedInSkillsIncluded?: string[];
  jdMatchedKeywords?: string[];
  jdKeywordsMatched?: string[];
  keywordCoverageScore?: number;
  skillsAlignmentScore?: number;
  jobTitleAlignmentScore?: number;
  experienceRelevanceScore?: number;
  structureAndFormattingScore?: number;
  importantRequirementsFound?: string[];
  missingOrWeakRequirements?: string[];
  improvementSuggestions?: string[];
  parsingIssues?: string[];
}

export interface GeneratedResume {
  id: string;
  analysisId: string;
  version: number;
  targetJobTitle: string;
  candidateName: string;
  trackType?: "TECHNICAL" | "NON_TECHNICAL";
  templateId?: ResumeTemplateId;
  photoUrl?: string;
  sectionHeadings?: SectionHeadings;
  detectedHeadings?: string[];
  dynamicSections?: DynamicResumeSection[];
  recommendedDomains?: CareerDomainRecommendation[];
  softSkills?: string[];
  atsScore?: AtsScorePoint;
  linkedInData?: LinkedInProfileData;
  contactInfo: {
    email?: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
    github?: string;
    portfolio?: string;
  };
  summary: string;
  technicalSkills: {
    languages?: string[];
    frameworks?: string[];
    cloudAndDevops?: string[];
    databases?: string[];
  };
  experience: {
    role: string;
    company: string;
    dates: string;
    location?: string;
    bullets: string[];
    jdRelevanceScore?: number;
  }[];
  education: {
    degree: string;
    institution: string;
    year?: string;
    location?: string;
    gpa?: string;
    coursework?: string[];
    details?: string;
  }[];
  certifications: string[];
  markdownContent: string;
  content?: any;
  createdAt: string;
}

export interface ResumeAuditFinding {
  severity: 'error' | 'warning' | 'info';
  category: 'ats_readability' | 'keyword_alignment' | 'evidence_support' | 'formatting' | 'fabrication_guard';
  title: string;
  message: string;
  suggestion?: string;
}

export interface ResumeAuditCheck {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  details?: string;
}

export interface ResumeAuditReport {
  id: string;
  resumeId: string;
  verdict: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
  overallScore: number; // 0-100
  atsReadabilityScore?: number; // 0-100
  keywordAlignmentScore?: number; // 0-100
  evidenceIntegrityScore?: number; // 0-100
  checks: ResumeAuditCheck[];
  findings?: ResumeAuditFinding[];
  summary: string;
  checkedAt: string;
}

export interface ReassessmentAttempt {
  id: string;
  analysisId: string;
  userId: string;
  proofDetails: string;
  previousScore: number;
  newScore: number;
  previousState: string;
  newState: string;
  improvedSkills: string[];
  aiEvaluation: {
    scoreImprovement: number;
    skillsUpgraded: string[];
    summary: string;
  };
  createdAt: string;
}

export interface CanonicalSkillEntry {
  id: string;
  canonicalName: string;
  category: string;
  aliases: string[];
  evidenceStrength: EvidenceStrength;
  confidence: number;
  verifiedContexts: string[];
}

export interface CandidateSkillProfile {
  userId: string;
  canonicalSkills: CanonicalSkillEntry[];
  updatedAt: string;
}

export interface AnalysisRecord {
  id: string;
  userId?: string;
  isGuest: boolean;
  jobTrack?: JobTrack;
  resumeText: string;
  jobDescriptionText: string;
  parsedResume: ParsedResume;
  parsedJob: ParsedJobDescription;
  skillMatches: SkillMatch[];
  evidenceRecords: SkillEvidence[];
  readiness: ReadinessResult;
  linkedInData?: LinkedInProfileData;
  videoAssessmentId?: string;
  learningPathId?: string;
  generatedResumeId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== JOB PORTAL & APPLICATION TRACKER ====================

export type JobSource =
  | 'LinkedIn'
  | 'Internshala'
  | 'Naukri'
  | 'Indeed'
  | 'Wellfound'
  | 'Company Career Page';

export type ApplicationStatus =
  | 'SAVED'
  | 'VIEWED'
  | 'APPLIED'
  | 'INTERVIEW'
  | 'ASSESSMENT'
  | 'REJECTED'
  | 'OFFER';

export interface RealJobListing {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  isRemote?: boolean;
  jobSource: JobSource;
  sourceUrl: string;
  applyUrl: string;
  supportsDirectApply: boolean;
  jobType: string; // 'Full-time' | 'Contract' | 'Internship' | 'Part-time'
  experienceLevel?: string; // 'Entry-level' | 'Mid-level' | 'Senior' | 'Lead' | 'Internship'
  salaryRange?: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills?: string[];
  education?: string;
  department?: string;
  postedAt: string;
}

export interface JobMatchAnalysis {
  matchScore: number; // 0-100
  matchedSkills: string[];
  skillGaps: string[];
  strengthsSummary: string;
  recommendationReason: string;
  trackAlignment: boolean;
  experienceAlignment: 'matches' | 'under' | 'over' | 'unknown';
}

export interface JobRecommendation {
  job: RealJobListing;
  match: JobMatchAnalysis;
}

export interface JobApplicationRecord {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  jobSource: JobSource;
  sourceUrl: string;
  applyUrl: string;
  resumeId: string;
  resumeTitle?: string;
  resumeSnippet?: string;
  status: ApplicationStatus;
  matchScore: number;
  isDirectSubmission: boolean;
  appliedAt?: string;
  lastStatusUpdate: string;
  notes?: string;
  interviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== AUTONOMOUS ORCHESTRATION AGENT ====================

export interface OrchestrationNodeTrace {
  nodeId: string;
  stepNumber: number;
  title: string;
  layer: string;
  toolFunction: string;
  status: 'completed' | 'skipped' | 'failed';
  durationMs: number;
  inputSummary: string;
  outputSummary: string;
  deterministicRule: string;
  metrics?: {
    label: string;
    value: string | number;
  }[];
  targetView?: string;
}

export interface OrchestrationRunResult {
  runId: string;
  executedAt: string;
  totalDurationMs: number;
  analysis: AnalysisRecord;
  learningPath?: LearningPath | null;
  videoAssessment?: VideoAssessment | null;
  resume: GeneratedResume;
  audit: ResumeAuditReport;
  nodes: OrchestrationNodeTrace[];
}

