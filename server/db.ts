import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  AnalysisRecord,
  GeneratedResume,
  LearningPath,
  ParsedJobDescription,
  ParsedResume,
  ReadinessResult,
  ResumeAuditReport,
  SkillEvidence,
  SkillMatch,
  User,
  VideoAssessment,
  JobApplicationRecord,
  ApplicationStatus,
} from "../src/types.js";
import { sanitizeAndDeduplicateSkills, normalizeSkill, CANONICAL_SKILL_DATABASE } from "./ontology.js";

interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface ReassessmentRecord {
  id: string;
  analysisId: string;
  userId: string;
  proofDetails: string;
  previousScore: number;
  newScore: number;
  previousState: string;
  newState: string;
  improvedSkills: string[];
  feedback: string;
  aiEvaluation?: {
    scoreImprovement: number;
    skillsUpgraded: string[];
    summary: string;
  };
  createdAt: string;
}

interface CandidateSkillProfile {
  userId: string;
  canonicalSkills: {
    id?: string;
    skill: string;
    canonicalName?: string;
    aliases?: string[];
    category: string;
    highestEvidenceStrength: string;
    evidenceStrength?: string;
    confidence?: number;
    verifiedCount: number;
    verifiedContexts?: string[];
    lastVerifiedAt: string;
  }[];
  updatedAt: string;
}

interface DatabaseSchema {
  users: User[];
  passwords: Record<string, { hash: string; salt: string }>;
  sessions: Session[];
  analyses: AnalysisRecord[];
  videoAssessments: VideoAssessment[];
  learningPaths: LearningPath[];
  reassessments: ReassessmentRecord[];
  generatedResumes: GeneratedResume[];
  resumeAudits: ResumeAuditReport[];
  candidateProfiles: CandidateSkillProfile[];
  applications: JobApplicationRecord[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "resumate_store.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: DatabaseSchema = {
  users: [],
  passwords: {},
  sessions: [],
  analyses: [],
  videoAssessments: [],
  learningPaths: [],
  reassessments: [],
  generatedResumes: [],
  resumeAudits: [],
  candidateProfiles: [],
  applications: [],
};

// Load initial data if exists
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    db = { ...db, ...JSON.parse(raw) };
  } catch (err) {
    console.warn("[DB] Could not load persisted data file, using fresh schema:", err);
  }
}

/**
 * Strict undefined-stripping & atomic write to disk
 */
function persistDatabase() {
  try {
    const sanitized = JSON.parse(JSON.stringify(db));
    fs.writeFileSync(DATA_FILE, JSON.stringify(sanitized, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Failed to persist database to disk:", err);
  }
}

// ==================== AUTH & USERS ====================

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, finalSalt, 1000, 64, "sha512").toString("hex");
  return { hash, salt: finalSalt };
}

export function createUser(name: string, email: string, passwordPlain: string): User {
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error("A user with this email address already exists.");
  }
  const id = crypto.randomUUID();
  const { hash, salt } = hashPassword(passwordPlain);
  const now = new Date().toISOString();
  const user: User = { id, name, email: email.toLowerCase(), createdAt: now };

  db.users.push(user);
  db.passwords[id] = { hash, salt };
  persistDatabase();
  return user;
}

export function authenticateUser(email: string, passwordPlain: string): { user: User; token: string } {
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error("Invalid email or password.");
  }
  const storedPass = db.passwords[user.id];
  if (!storedPass) {
    throw new Error("Authentication credentials not configured.");
  }
  const checkHash = hashPassword(passwordPlain, storedPass.salt).hash;
  if (checkHash !== storedPass.hash) {
    throw new Error("Invalid email or password.");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: now.toISOString(),
    expiresAt,
  });
  persistDatabase();
  return { user, token };
}

export function findOrCreateFirebaseUser(uid: string, email: string, name?: string): { user: User; token: string } {
  let user = db.users.find((u) => u.id === uid || u.email.toLowerCase() === email.toLowerCase());
  const now = new Date().toISOString();
  if (!user) {
    user = {
      id: uid,
      name: name || email.split("@")[0] || "Candidate",
      email: email.toLowerCase(),
      createdAt: now,
    };
    db.users.push(user);
  } else if (name && user.name !== name) {
    user.name = name;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: now,
    expiresAt,
  });
  persistDatabase();
  return { user, token };
}

export function getUserByToken(token?: string): User | null {
  if (!token) return null;
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;
  return db.users.find((u) => u.id === session.userId) || null;
}

export function logoutSession(token: string) {
  db.sessions = db.sessions.filter((s) => s.token !== token);
  persistDatabase();
}

// ==================== ANALYSES ====================

export function saveAnalysis(analysis: AnalysisRecord): AnalysisRecord {
  const index = db.analyses.findIndex((a) => a.id === analysis.id);
  if (index >= 0) {
    db.analyses[index] = { ...analysis, updatedAt: new Date().toISOString() };
  } else {
    db.analyses.push(analysis);
  }
  persistDatabase();
  return analysis;
}

export function getAnalysisById(id: string): AnalysisRecord | null {
  return db.analyses.find((a) => a.id === id) || null;
}

export function getAnalysesByUserId(userId: string): AnalysisRecord[] {
  return db.analyses.filter((a) => a.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function claimGuestAnalysis(analysisId: string, userId: string): AnalysisRecord | null {
  const analysis = db.analyses.find((a) => a.id === analysisId);
  if (!analysis) return null;
  analysis.userId = userId;
  analysis.isGuest = false;
  analysis.updatedAt = new Date().toISOString();
  persistDatabase();
  return analysis;
}

// ==================== VIDEO ASSESSMENTS ====================

export function saveVideoAssessment(va: VideoAssessment): VideoAssessment {
  const index = db.videoAssessments.findIndex((v) => v.id === va.id);
  if (index >= 0) {
    db.videoAssessments[index] = va;
  } else {
    db.videoAssessments.push(va);
  }
  persistDatabase();
  return va;
}

export function getVideoAssessmentById(id: string): VideoAssessment | null {
  return db.videoAssessments.find((v) => v.id === id) || null;
}

export function getVideoAssessmentByAnalysisId(analysisId: string): VideoAssessment | null {
  return db.videoAssessments.find((v) => v.analysisId === analysisId) || null;
}

// ==================== LEARNING PATHS ====================

export function saveLearningPath(lp: LearningPath): LearningPath {
  const index = db.learningPaths.findIndex((l) => l.id === lp.id);
  if (index >= 0) {
    db.learningPaths[index] = lp;
  } else {
    db.learningPaths.push(lp);
  }
  persistDatabase();
  return lp;
}

export function getLearningPathById(id: string): LearningPath | null {
  return db.learningPaths.find((l) => l.id === id) || null;
}

export function getLearningPathByAnalysisId(analysisId: string): LearningPath | null {
  return db.learningPaths.find((l) => l.analysisId === analysisId) || null;
}

// ==================== REASSESSMENTS ====================

export function saveReassessment(re: ReassessmentRecord): ReassessmentRecord {
  db.reassessments.push(re);
  persistDatabase();
  return re;
}

export function getReassessmentsByAnalysisId(analysisId: string): ReassessmentRecord[] {
  return db.reassessments.filter((r) => r.analysisId === analysisId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ==================== GENERATED RESUMES & AUDITS ====================

export function saveGeneratedResume(res: GeneratedResume): GeneratedResume {
  const idx = db.generatedResumes.findIndex((r) => r.id === res.id);
  if (idx >= 0) {
    db.generatedResumes[idx] = res;
  } else {
    db.generatedResumes.push(res);
  }
  persistDatabase();
  return res;
}

export function getGeneratedResumeById(id: string): GeneratedResume | null {
  return db.generatedResumes.find((r) => r.id === id) || null;
}

export function getGeneratedResumeByAnalysisId(analysisId: string): GeneratedResume | null {
  return db.generatedResumes.find((r) => r.analysisId === analysisId) || null;
}

export function saveResumeAudit(audit: ResumeAuditReport): ResumeAuditReport {
  const idx = db.resumeAudits.findIndex((a) => a.id === audit.id);
  if (idx >= 0) {
    db.resumeAudits[idx] = audit;
  } else {
    db.resumeAudits.push(audit);
  }
  persistDatabase();
  return audit;
}

export function getResumeAuditByResumeId(resumeId: string): ResumeAuditReport | null {
  return db.resumeAudits.find((a) => a.resumeId === resumeId) || null;
}

// ==================== CANDIDATE SKILL PROFILE ====================

function getConfidenceForStrength(strength: string): number {
  switch (String(strength || "MEDIUM").toUpperCase()) {
    case "VERY_HIGH":
      return 0.95;
    case "HIGH":
      return 0.88;
    case "MEDIUM":
      return 0.78;
    case "MODERATE":
      return 0.65;
    case "LOW":
      return 0.45;
    default:
      return 0.75;
  }
}

export function buildResumeVerifiedSkillsFromAnalysis(analysis: AnalysisRecord) {
  const resume = analysis.parsedResume;
  const resumeText = analysis.resumeText || "";

  const matchedFromJd = (analysis.skillMatches || [])
    .filter((m) => m.matched && m.evidenceStrength && m.evidenceStrength !== "NONE")
    .map((m) => m.requirement?.canonicalSkill || m.candidateSkill || m.requirement?.skill || "")
    .filter(Boolean);

  // Also scan resumeText against CANONICAL_SKILL_DATABASE in case the resume had no explicit SKILLS heading
  const detectedFromText: string[] = [];
  if (resumeText.trim().length > 15) {
    for (const def of CANONICAL_SKILL_DATABASE) {
      for (const alias of def.aliases) {
        if (alias.length < 2) continue;
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?:^|[^a-zA-Z0-9+#.])${escaped}(?:$|[^a-zA-Z0-9+#.])`, "i");
        if (regex.test(resumeText)) {
          detectedFromText.push(def.canonicalName);
          break;
        }
      }
    }
  }

  const rawSkills: string[] = [
    ...(resume?.skills || []),
    ...(resume?.technicalSkills || []),
    ...(resume?.softSkills || []),
    ...(resume?.experience || []).flatMap((e) => e.technologiesUsed || []),
    ...(resume?.projects || []).flatMap((p) => p.technologies || []),
    ...matchedFromJd,
    ...detectedFromText,
  ];

  const cleanSkills = sanitizeAndDeduplicateSkills(rawSkills, resumeText);
  const now = analysis.updatedAt || analysis.createdAt || new Date().toISOString();

  const expList = resume?.experience || [];
  const projList = resume?.projects || [];
  const certList = resume?.certifications || [];
  const skillsSectionLower = (resume?.skills || []).join(" ").toLowerCase();

  return cleanSkills.map((item, idx) => {
    const terms = [item.canonicalName.toLowerCase(), ...item.aliases.map((a) => a.toLowerCase())];
    const verifiedContexts: string[] = [];
    let strength = "MEDIUM";

    // 1. Check Experience
    for (const exp of expList) {
      const hay = `${exp.title || ""} ${exp.company || ""} ${exp.description || ""} ${(exp.technologiesUsed || []).join(" ")}`.toLowerCase();
      if (terms.some((t) => t.length >= 2 && hay.includes(t))) {
        verifiedContexts.push(`Experience: ${exp.title || "Role"}${exp.company ? ` at ${exp.company}` : ""}`);
        strength = "VERY_HIGH";
      }
    }

    // 2. Check Projects
    for (const proj of projList) {
      const hay = `${proj.name || ""} ${proj.description || ""} ${(proj.technologies || []).join(" ")}`.toLowerCase();
      if (terms.some((t) => t.length >= 2 && hay.includes(t))) {
        verifiedContexts.push(`Project: ${proj.name || "Project Implementation"}`);
        if (strength !== "VERY_HIGH") strength = "HIGH";
      }
    }

    // 3. Check Certifications
    for (const cert of certList) {
      const certName = typeof cert === "string" ? cert : cert.name || "";
      if (terms.some((t) => t.length >= 2 && certName.toLowerCase().includes(t))) {
        verifiedContexts.push(`Certification: ${certName}`);
        if (strength !== "VERY_HIGH" && strength !== "HIGH") strength = "HIGH";
      }
    }

    // 4. Skills section
    if (verifiedContexts.length === 0 || terms.some((t) => skillsSectionLower.includes(t))) {
      verifiedContexts.push("Resume Skills Section");
    }

    const uniqueContexts = Array.from(new Set(verifiedContexts));

    return {
      id: `skill-${idx}-${item.canonicalName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      skill: item.canonicalName,
      canonicalName: item.canonicalName,
      aliases: item.aliases,
      category: item.category || "Verified Resume Skill",
      highestEvidenceStrength: strength,
      evidenceStrength: strength,
      confidence: getConfidenceForStrength(strength),
      verifiedCount: uniqueContexts.length,
      verifiedContexts: uniqueContexts,
      lastVerifiedAt: now,
    };
  });
}

function normalizeCandidateSkillProfile(profile: CandidateSkillProfile): CandidateSkillProfile {
  const now = new Date().toISOString();
  // If user has a latest analysis in db, synchronize strictly with that resume so no stale/sample skills remain
  const userAnalyses = getAnalysesByUserId(profile.userId);
  if (userAnalyses.length > 0) {
    const latestAnalysis = userAnalyses[0];
    profile.canonicalSkills = buildResumeVerifiedSkillsFromAnalysis(latestAnalysis);
    profile.updatedAt = latestAnalysis.updatedAt || latestAnalysis.createdAt || now;
    return profile;
  }

  // Otherwise sanitize & deduplicate existing skills in profile
  const rawNames = (profile.canonicalSkills || []).map((cs) => cs.canonicalName || cs.skill || "").filter(Boolean);
  const sanitized = sanitizeAndDeduplicateSkills(rawNames);

  profile.canonicalSkills = sanitized.map((item, idx) => {
    const existing = (profile.canonicalSkills || []).find(
      (cs) =>
        (cs.canonicalName || cs.skill || "").toLowerCase() === item.canonicalName.toLowerCase() ||
        item.aliases.some((a) => a.toLowerCase() === (cs.canonicalName || cs.skill || "").toLowerCase())
    );
    const strength = existing?.evidenceStrength || existing?.highestEvidenceStrength || "MEDIUM";
    const contexts = Array.isArray(existing?.verifiedContexts)
      ? existing!.verifiedContexts!.filter((c) => !c.startsWith("Verification #") && !c.startsWith("Assessment #"))
      : ["Resume Skills Section"];
    const cleanContexts = contexts.length > 0 ? Array.from(new Set(contexts)) : ["Resume Skills Section"];

    return {
      id: `skill-${idx}-${item.canonicalName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      skill: item.canonicalName,
      canonicalName: item.canonicalName,
      aliases: item.aliases,
      category: item.category || existing?.category || "Verified Resume Skill",
      highestEvidenceStrength: strength,
      evidenceStrength: strength,
      confidence: getConfidenceForStrength(strength),
      verifiedCount: cleanContexts.length,
      verifiedContexts: cleanContexts,
      lastVerifiedAt: existing?.lastVerifiedAt || profile.updatedAt || now,
    };
  });
  return profile;
}

export function updateCandidateSkillProfile(
  userId: string,
  newSkills: { skill: string; category: string; strength: string }[],
  replaceExisting: boolean = true
): CandidateSkillProfile {
  let profile = db.candidateProfiles.find((p) => p.userId === userId);
  const now = new Date().toISOString();
  if (!profile) {
    profile = { userId, canonicalSkills: [], updatedAt: now };
    db.candidateProfiles.push(profile);
  }

  if (replaceExisting) {
    profile.canonicalSkills = [];
  }

  const sanitizedList = sanitizeAndDeduplicateSkills(newSkills.map((s) => s.skill));

  for (const item of sanitizedList) {
    const cleanName = item.canonicalName;
    const matchedInput = newSkills.find(
      (ns) =>
        normalizeSkill(ns.skill).canonical.toLowerCase() === cleanName.toLowerCase() ||
        ns.skill.trim().toLowerCase() === cleanName.toLowerCase()
    );
    const strength = matchedInput?.strength || "MEDIUM";
    const category = item.category || matchedInput?.category || "Verified Resume Skill";

    const existing = profile.canonicalSkills.find(
      (cs) => (cs.skill || cs.canonicalName || "").toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      existing.lastVerifiedAt = now;
      existing.highestEvidenceStrength = strength;
      existing.evidenceStrength = strength;
      existing.confidence = getConfidenceForStrength(strength);
      existing.aliases = Array.from(new Set([...(existing.aliases || []), ...item.aliases]));
    } else {
      profile.canonicalSkills.push({
        id: `skill-${crypto.randomUUID()}`,
        skill: cleanName,
        canonicalName: cleanName,
        aliases: item.aliases,
        category,
        highestEvidenceStrength: strength,
        evidenceStrength: strength,
        confidence: getConfidenceForStrength(strength),
        verifiedCount: 1,
        verifiedContexts: ["Resume Verification"],
        lastVerifiedAt: now,
      });
    }
  }
  profile.updatedAt = now;
  normalizeCandidateSkillProfile(profile);
  persistDatabase();
  return profile;
}

export function getRecentAnalysesForProfile(userId?: string, analysisId?: string): AnalysisRecord[] {
  const list: AnalysisRecord[] = [];
  if (analysisId) {
    const byId = getAnalysisById(analysisId);
    if (byId) list.push(byId);
  }
  if (userId) {
    const userList = getAnalysesByUserId(userId);
    for (const a of userList) {
      if (!list.some((x) => x.id === a.id)) list.push(a);
    }
  }
  // Also include recent analyses in db if list is empty (e.g., guest session or unclaimed analysis)
  if (list.length === 0 && db.analyses.length > 0) {
    const sorted = [...db.analyses].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    for (const a of sorted.slice(0, 10)) {
      if (!list.some((x) => x.id === a.id)) list.push(a);
    }
  }
  return list;
}

export function getCandidateSkillProfile(userId?: string, analysisId?: string): CandidateSkillProfile | null {
  if (analysisId) {
    const targetAnalysis = getAnalysisById(analysisId);
    if (targetAnalysis) {
      return {
        userId: userId || targetAnalysis.userId || "guest",
        canonicalSkills: buildResumeVerifiedSkillsFromAnalysis(targetAnalysis),
        updatedAt: targetAnalysis.updatedAt || targetAnalysis.createdAt || new Date().toISOString(),
      };
    }
  }

  const effectiveUserId = userId || "guest";
  let found = db.candidateProfiles.find((p) => p.userId === effectiveUserId);
  const recentAnalyses = getRecentAnalysesForProfile(userId, analysisId);

  if (recentAnalyses.length > 0) {
    const latest = recentAnalyses[0];
    const builtSkills = buildResumeVerifiedSkillsFromAnalysis(latest);
    if (found) {
      found.canonicalSkills = builtSkills;
      found.updatedAt = latest.updatedAt || latest.createdAt || new Date().toISOString();
      return found;
    }
    return {
      userId: effectiveUserId,
      canonicalSkills: builtSkills,
      updatedAt: latest.updatedAt || latest.createdAt || new Date().toISOString(),
    };
  }

  if (!found && db.candidateProfiles.length > 0) {
    found = db.candidateProfiles[0];
  }
  if (!found) return null;
  return normalizeCandidateSkillProfile(found);
}

// ----------------- JOB APPLICATIONS -----------------

export function saveJobApplication(
  record: Omit<JobApplicationRecord, "id" | "createdAt" | "updatedAt">
): JobApplicationRecord {
  if (!db.applications) db.applications = [];
  const now = new Date().toISOString();
  
  // Check if existing record for this user and job
  const existingIdx = db.applications.findIndex(
    (a) => a.userId === record.userId && a.jobId === record.jobId
  );

  if (existingIdx >= 0) {
    const existing = db.applications[existingIdx];
    const updated: JobApplicationRecord = {
      ...existing,
      ...record,
      updatedAt: now,
      lastStatusUpdate: record.lastStatusUpdate || now,
    };
    db.applications[existingIdx] = updated;
    persistDatabase();
    return updated;
  }

  const newApp: JobApplicationRecord = {
    id: `app_${crypto.randomUUID()}`,
    ...record,
    createdAt: now,
    updatedAt: now,
    lastStatusUpdate: record.lastStatusUpdate || now,
  };

  db.applications.unshift(newApp);
  persistDatabase();
  return newApp;
}

export function getJobApplicationsByUserId(userId: string): JobApplicationRecord[] {
  if (!db.applications) db.applications = [];
  return db.applications.filter((a) => a.userId === userId);
}

export function updateJobApplicationStatus(
  id: string,
  userId: string,
  status: ApplicationStatus,
  notes?: string,
  interviewDate?: string
): JobApplicationRecord | null {
  if (!db.applications) db.applications = [];
  const app = db.applications.find((a) => a.id === id && a.userId === userId);
  if (!app) return null;

  const now = new Date().toISOString();
  app.status = status;
  app.lastStatusUpdate = now;
  app.updatedAt = now;
  if (status === "APPLIED" && !app.appliedAt) {
    app.appliedAt = now;
  }
  if (notes !== undefined) app.notes = notes;
  if (interviewDate !== undefined) app.interviewDate = interviewDate;

  persistDatabase();
  return app;
}

export function deleteJobApplication(id: string, userId: string): boolean {
  if (!db.applications) db.applications = [];
  const idx = db.applications.findIndex((a) => a.id === id && a.userId === userId);
  if (idx < 0) return false;
  db.applications.splice(idx, 1);
  persistDatabase();
  return true;
}
