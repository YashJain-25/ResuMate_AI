import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  authenticateUser,
  claimGuestAnalysis,
  createUser,
  findOrCreateFirebaseUser,
  getAnalysesByUserId,
  getAnalysisById,
  getCandidateSkillProfile,
  getRecentAnalysesForProfile,
  getGeneratedResumeById,
  getLearningPathById,
  getReassessmentsByAnalysisId,
  getResumeAuditByResumeId,
  getUserByToken,
  getVideoAssessmentById,
  logoutSession,
  saveLearningPath,
  saveJobApplication,
  getJobApplicationsByUserId,
  updateJobApplicationStatus,
  deleteJobApplication,
} from "./server/db.js";
import { ResuMateCareerAgent } from "./server/agent.js";
import { extractAuthorizedLinkedInProfile } from "./server/tools.js";
import { SAMPLE_DATA_PAIRS } from "./server/sampleData.js";
import { generateContentWithFallback } from "./server/ai.js";
import { extractDocumentText } from "./server/documentParser.js";
import {
  getAllRealJobs,
  getRecommendedJobsForCandidate,
  calculateJobMatch,
} from "./server/jobService.js";
import { envConfig } from "./server/config/env.js";
import {
  getLinkedInOAuthSecrets,
  sanitizeErrorMessage,
  validateServerSecretsOnStartup,
} from "./server/config/secrets.js";

dotenv.config();
validateServerSecretsOnStartup();

const app = express();
const PORT = envConfig.port;

// ==================== TOP-LEVEL DESERIALIZATION ====================
// Guaranteed ordering: Parsers mounted upstream of all routes
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Optional token extractor middleware
function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7).trim();
  return getUserByToken(token);
}

// ==================== REST API ROUTES ====================

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "ResuMate AI Core Platform",
    timestamp: new Date().toISOString(),
  });
});

// Sample data loader
app.get("/api/sample-data", (_req: Request, res: Response) => {
  res.json({ samples: SAMPLE_DATA_PAIRS });
});

// ----------------- AUTHENTICATION -----------------

app.post("/api/auth/register", (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { name, email, password } = body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required." });
      return;
    }
    const user = createUser(name, email, password);
    const { token } = authenticateUser(email, password);
    res.status(201).json({ user, token });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Registration failed." });
  }
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { email, password } = body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    const { user, token } = authenticateUser(email, password);
    res.json({ user, token });
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Authentication failed." });
  }
});

app.post("/api/auth/firebase", (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { uid, email, name } = body;
    if (!uid || !email) {
      res.status(400).json({ error: "UID and email are required." });
      return;
    }
    const { user, token } = findOrCreateFirebaseUser(uid, email, name);
    res.json({ user, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Cloud authentication failed." });
  }
});

app.get("/api/auth/me", (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ user });
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    logoutSession(authHeader.substring(7).trim());
  }
  res.json({ success: true });
});

// ----------------- DOCUMENT EXTRACTION (PDF / DOCX / TXT) -----------------

const handleDocumentExtraction = async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { base64Data, mimeType, fileName } = body;

    if (!base64Data || typeof base64Data !== "string") {
      res.status(400).json({ error: "No document data provided." });
      return;
    }

    const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
    const buffer = Buffer.from(cleanBase64, "base64");

    const extraction = await extractDocumentText(buffer, fileName, mimeType);
    res.json({
      text: extraction.text,
      detectedType: extraction.detectedType,
    });
  } catch (err: any) {
    console.error("[Document Extraction Error]:", sanitizeErrorMessage(err));
    res.status(500).json({ error: sanitizeErrorMessage(err, "Failed to extract text from document.") });
  }
};

app.post("/api/extract-resume", handleDocumentExtraction);
app.post("/api/extract-jd", handleDocumentExtraction);
app.post("/api/extract-document", handleDocumentExtraction);

// ----------------- LINKEDIN AUTHORIZED CONNECTION & SKILL EXTRACTION -----------------

// 1. OAuth 2.0 Popup Authorization URL (uses LINKEDIN_CLIENT_ID when configured, or provides status)
app.get("/api/linkedin/auth-url", (req: Request, res: Response) => {
  const { clientId, redirectUriOverride } = getLinkedInOAuthSecrets();
  const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = envConfig.appUrl || `${proto}://${host}`;
  const redirectUri = redirectUriOverride || `${baseUrl.replace(/\/$/, "")}/api/linkedin/callback`;

  if (!clientId) {
    res.json({
      oauthConfigured: false,
      redirectUri,
      message:
        "LinkedIn OAuth 2.0 client credentials are not set in environment variables. Use Authorized LinkedIn Profile Import / PDF Export or Profile Summary below to connect and verify your skills.",
    });
    return;
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: "resumate_linkedin_oauth",
    scope: "openid profile email",
  });

  res.json({
    oauthConfigured: true,
    url: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
    redirectUri,
  });
});

// 2. OAuth 2.0 Popup Callback (posts authorized profile back to opener window)
app.get("/api/linkedin/callback", async (req: Request, res: Response) => {
  const { code, error, error_description } = req.query;
  if (error || !code) {
    res.send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'LINKEDIN_OAUTH_ERROR', error: ${JSON.stringify(error_description || error || "Authorization cancelled")} }, '*');
          window.close();
        }
      </script><p>Authorization cancelled. You may close this window.</p></body></html>
    `);
    return;
  }

  try {
    const { clientId, clientSecret, redirectUriOverride } = getLinkedInOAuthSecrets();
    const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = envConfig.appUrl || `${proto}://${host}`;
    const redirectUri = redirectUriOverride || `${baseUrl.replace(/\/$/, "")}/api/linkedin/callback`;

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData: any = await tokenRes.json();
    let userInfo: any = {};
    if (tokenData.access_token) {
      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      userInfo = await profileRes.json();
    }

    res.send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage({
            type: 'LINKEDIN_OAUTH_SUCCESS',
            profile: ${JSON.stringify({
              fullName: userInfo.name || [userInfo.given_name, userInfo.family_name].filter(Boolean).join(" "),
              email: userInfo.email || "",
              sub: userInfo.sub || "",
            })}
          }, '*');
          window.close();
        }
      </script><p>LinkedIn authentication successful! Closing window...</p></body></html>
    `);
  } catch (err: any) {
    res.send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'LINKEDIN_OAUTH_ERROR', error: ${JSON.stringify(sanitizeErrorMessage(err, "OAuth token exchange failed"))} }, '*');
          window.close();
        }
      </script><p>Authentication failed. You can close this window.</p></body></html>
    `);
  }
});

// 3. Extract verified skills & professional highlights from user-authorized LinkedIn profile data
app.post("/api/linkedin/extract", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { profileUrl, rawProfileText, fullName, headline, connectionMethod } = body;

    if ((!rawProfileText || String(rawProfileText).trim().length < 5) && !profileUrl && !headline) {
      res.status(400).json({
        error:
          "Please provide your LinkedIn profile URL, exported LinkedIn PDF text, or Skills/About section so we can extract your verified skills.",
      });
      return;
    }

    const combinedText = [headline, rawProfileText].filter(Boolean).join("\n");
    const linkedInData = await extractAuthorizedLinkedInProfile(
      combinedText,
      profileUrl,
      undefined,
      connectionMethod === "oauth" ? "oauth" : "authorized_import",
      fullName
    );

    res.json({ linkedInData });
  } catch (err: any) {
    console.error("[POST /api/linkedin/extract] Error:", sanitizeErrorMessage(err));
    res.status(500).json({ error: sanitizeErrorMessage(err, "Failed to extract LinkedIn profile skills.") });
  }
});

// ----------------- ANALYSES -----------------

app.post("/api/analyses", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { resumeText, jobDescriptionText, isGuest, jobTrack, linkedInData } = body;

    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 20) {
      res.status(400).json({ error: "A valid resume with substantial content is required." });
      return;
    }

    if (!jobDescriptionText || typeof jobDescriptionText !== "string" || jobDescriptionText.trim().length < 20) {
      res.status(400).json({ error: "A valid job description is required." });
      return;
    }

    const user = getAuthenticatedUser(req);
    const markAsGuest = !user || Boolean(isGuest);

    const record = await ResuMateCareerAgent.analyze(
      resumeText,
      jobDescriptionText,
      markAsGuest,
      user?.id,
      jobTrack,
      linkedInData && typeof linkedInData === "object" ? linkedInData : undefined
    );

    res.status(201).json({ analysis: record });
  } catch (err: any) {
    console.error("[POST /api/analyses] Error:", sanitizeErrorMessage(err));
    res.status(500).json({ error: sanitizeErrorMessage(err, "Analysis processing failed.") });
  }
});

app.get("/api/analyses", (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required to retrieve analysis history." });
    return;
  }
  const records = getAnalysesByUserId(user.id);
  res.json({ analyses: records });
});

app.get("/api/analyses/:id", (req: Request, res: Response) => {
  const record = getAnalysisById(req.params.id);
  if (!record) {
    res.status(404).json({ error: "Analysis record not found." });
    return;
  }
  res.json({ analysis: record });
});

// Guest Claim migration
app.post("/api/analyses/:id/claim-guest", (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "You must be logged in to save your analysis." });
    return;
  }
  const claimed = claimGuestAnalysis(req.params.id, user.id);
  if (!claimed) {
    res.status(404).json({ error: "Analysis record not found." });
    return;
  }
  res.json({ analysis: claimed, message: "Analysis successfully saved to your profile!" });
});

app.get("/api/analyses/:id/skills", (req: Request, res: Response) => {
  const record = getAnalysisById(req.params.id);
  if (!record) {
    res.status(404).json({ error: "Analysis not found." });
    return;
  }
  res.json({
    skills: record.parsedResume.skills,
    requirements: record.parsedJob.requirements,
    matches: record.skillMatches,
    evidence: record.evidenceRecords,
  });
});

app.get("/api/analyses/:id/readiness", (req: Request, res: Response) => {
  const record = getAnalysisById(req.params.id);
  if (!record) {
    res.status(404).json({ error: "Analysis not found." });
    return;
  }
  res.json({ readiness: record.readiness });
});

// ----------------- VIDEO ASSESSMENTS -----------------

app.post("/api/video-assessments", async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { analysisId } = body;

    if (!analysisId) {
      res.status(400).json({ error: "analysisId is required." });
      return;
    }

    const assessment = await ResuMateCareerAgent.prepareVideoAssessment(
      analysisId,
      user?.id || "anonymous"
    );
    res.status(201).json({ assessment });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to initialize video assessment." });
  }
});

app.get("/api/video-assessments/:id", (req: Request, res: Response) => {
  const assessment = getVideoAssessmentById(req.params.id);
  if (!assessment) {
    res.status(404).json({ error: "Assessment not found." });
    return;
  }
  res.json({ assessment });
});

app.post("/api/video-assessments/:id/submit", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { answers } = body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      res.status(400).json({ error: "Answers array is required." });
      return;
    }

    const result = await ResuMateCareerAgent.evaluateAssessmentAnswers(
      req.params.id,
      answers
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to evaluate assessment." });
  }
});

// ----------------- LEARNING PATHS -----------------

app.get("/api/learning-paths/:id", (req: Request, res: Response) => {
  const lp = getLearningPathById(req.params.id);
  if (!lp) {
    res.status(404).json({ error: "Learning path not found." });
    return;
  }
  res.json({ learningPath: lp });
});

app.post("/api/learning-paths/:id/toggle-item", (req: Request, res: Response) => {
  const lp = getLearningPathById(req.params.id);
  if (!lp) {
    res.status(404).json({ error: "Learning path not found." });
    return;
  }
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { itemId, completed } = body;

  const item = lp.items.find((i) => i.id === itemId);
  if (item) {
    item.completed = Boolean(completed);
    const completedCount = lp.items.filter((i) => i.completed).length;
    lp.progressPercent = Math.round((completedCount / (lp.items.length || 1)) * 100);
    saveLearningPath(lp);
  }

  res.json({ learningPath: lp });
});

// ----------------- REASSESSMENTS -----------------

app.post("/api/reassessments", async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { analysisId, proofDetails, improvedSkills } = body;

    if (!analysisId || !proofDetails) {
      res.status(400).json({ error: "analysisId and proofDetails are required." });
      return;
    }

    const result = await ResuMateCareerAgent.submitReassessment(
      analysisId,
      user?.id || "anonymous",
      proofDetails,
      Array.isArray(improvedSkills) ? improvedSkills : []
    );

    res.json({ reassessment: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Reassessment submission failed." });
  }
});

app.get("/api/reassessments/:analysisId", (req: Request, res: Response) => {
  const history = getReassessmentsByAnalysisId(req.params.analysisId);
  res.json({ history });
});

// ----------------- RESUME GENERATION & AUDIT -----------------

app.post("/api/resumes/generate", async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { analysisId, selectedSkills, trackType, linkedInData } = body;

    if (!analysisId) {
      res.status(400).json({ error: "analysisId is required." });
      return;
    }

    const result = await ResuMateCareerAgent.generateAndAudit(
      analysisId,
      user?.id || "guest",
      Array.isArray(selectedSkills) ? selectedSkills : undefined,
      trackType === "TECHNICAL" || trackType === "NON_TECHNICAL" ? trackType : undefined,
      linkedInData && typeof linkedInData === "object" ? linkedInData : undefined
    );

    res.status(201).json(result);
  } catch (err: any) {
    console.error("[generate_resume] Error:", sanitizeErrorMessage(err));
    res.status(500).json({ error: sanitizeErrorMessage(err, "Resume generation failed.") });
  }
});

app.get("/api/resumes/:id", (req: Request, res: Response) => {
  const resume = getGeneratedResumeById(req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  res.json({ resume });
});

app.get("/api/resumes/:id/audit", (req: Request, res: Response) => {
  const audit = getResumeAuditByResumeId(req.params.id);
  if (!audit) {
    res.status(404).json({ error: "Resume audit report not found." });
    return;
  }
  res.json({ audit });
});

// ----------------- CANDIDATE PROFILE -----------------

app.get("/api/skills/profile", (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const analysisId = typeof req.query.analysisId === "string" ? req.query.analysisId : undefined;
  const analyses = getRecentAnalysesForProfile(user?.id, analysisId);
  const activeAnalysis = analyses[0] || null;
  const profile = getCandidateSkillProfile(user?.id, analysisId || activeAnalysis?.id);

  res.json({
    profile: profile || {
      userId: user?.id || "guest",
      canonicalSkills: [],
      updatedAt: new Date().toISOString(),
    },
    activeAnalysis,
    analyses,
  });
});

// ----------------- JOB PORTAL & MATCHING -----------------

// Retrieve all real jobs with optional filtering
app.get("/api/jobs", async (req: Request, res: Response) => {
  try {
    const { search, source, location, remoteOnly, track, refresh } = req.query;
    const forceRefresh = refresh === "true";
    let jobs = await getAllRealJobs(forceRefresh);

    if (source && typeof source === "string" && source !== "ALL") {
      jobs = jobs.filter((j) => j.jobSource.toLowerCase() === source.toLowerCase());
    }

    if (remoteOnly === "true") {
      jobs = jobs.filter((j) => j.isRemote);
    }

    if (location && typeof location === "string" && location.trim()) {
      const loc = location.toLowerCase().trim();
      jobs = jobs.filter((j) => j.location.toLowerCase().includes(loc));
    }

    if (search && typeof search === "string" && search.trim()) {
      const query = search.toLowerCase().trim();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(query) ||
          j.company.toLowerCase().includes(query) ||
          j.description.toLowerCase().includes(query) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(query))
      );
    }

    res.json({ jobs, total: jobs.length });
  } catch (err: any) {
    console.error("[GET /api/jobs] Error:", sanitizeErrorMessage(err));
    res.status(500).json({ error: sanitizeErrorMessage(err, "Failed to load jobs.") });
  }
});

// Recommendations matched against candidate's selected resume / profile
app.post("/api/jobs/recommendations", async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { resumeId, skills, jobTrack } = body;

    let candidateSkills: string[] = Array.isArray(skills) ? skills : [];
    let parsedResume: any = undefined;

    // If resumeId provided, look up generated resume or analysis
    if (resumeId && typeof resumeId === "string") {
      const genResume = getGeneratedResumeById(resumeId);
      if (genResume) {
        const analysis = getAnalysisById(genResume.analysisId);
        if (analysis) {
          parsedResume = analysis.parsedResume;
          if (candidateSkills.length === 0) {
            candidateSkills = analysis.parsedResume?.skills || [];
          }
        }
      }
    }

    // If user is authenticated and skills still empty, load candidate skill profile
    let profile = null;
    if (user) {
      profile = getCandidateSkillProfile(user.id);
      if (candidateSkills.length === 0 && profile) {
        candidateSkills = profile.canonicalSkills.map((cs) => cs.skill);
      }
    }

    const recommendations = await getRecommendedJobsForCandidate(
      candidateSkills,
      parsedResume,
      profile,
      typeof jobTrack === "string" ? jobTrack : undefined
    );

    res.json({ recommendations, candidateSkillsCount: candidateSkills.length });
  } catch (err: any) {
    console.error("[POST /api/jobs/recommendations] Error:", sanitizeErrorMessage(err));
    res.status(500).json({ error: sanitizeErrorMessage(err, "Failed to generate job recommendations.") });
  }
});

// Single job match analysis against candidate resume
app.post("/api/jobs/match-single", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { jobId, skills, resumeId, jobTrack } = body;

    if (!jobId || typeof jobId !== "string") {
      res.status(400).json({ error: "jobId is required." });
      return;
    }

    const jobs = await getAllRealJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found." });
      return;
    }

    let candidateSkills: string[] = Array.isArray(skills) ? skills : [];
    let parsedResume: any = undefined;

    if (resumeId && typeof resumeId === "string") {
      const genResume = getGeneratedResumeById(resumeId);
      if (genResume) {
        const analysis = getAnalysisById(genResume.analysisId);
        if (analysis) {
          parsedResume = analysis.parsedResume;
          if (candidateSkills.length === 0) {
            candidateSkills = analysis.parsedResume?.skills || [];
          }
        }
      }
    }

    const user = getAuthenticatedUser(req);
    const profile = user ? getCandidateSkillProfile(user.id) : null;

    const match = calculateJobMatch(job, candidateSkills, parsedResume, profile, jobTrack);
    res.json({ job, match });
  } catch (err: any) {
    console.error("[POST /api/jobs/match-single] Error:", sanitizeErrorMessage(err));
    res.status(500).json({ error: sanitizeErrorMessage(err, "Failed to calculate job match.") });
  }
});

// ----------------- APPLICATION TRACKER -----------------

// Get candidate applications
app.get("/api/jobs/applications", (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required to view applications." });
    return;
  }
  const apps = getJobApplicationsByUserId(user.id);
  res.json({ applications: apps });
});

// Record new job application or update existing
app.post("/api/jobs/apply", async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      jobId,
      jobTitle,
      company,
      location,
      jobSource,
      sourceUrl,
      applyUrl,
      resumeId,
      resumeTitle,
      status,
      notes,
      isDirectSubmission,
      matchScore,
    } = body;

    if (!jobId || !jobTitle || !company) {
      res.status(400).json({ error: "jobId, jobTitle, and company are required." });
      return;
    }

    const userId = user?.id || "guest_user";
    const appStatus = status || (isDirectSubmission ? "APPLIED" : "VIEWED");

    const application = saveJobApplication({
      userId,
      jobId,
      jobTitle,
      company,
      location: location || "Remote / Unspecified",
      jobSource: jobSource || "Company Career Page",
      sourceUrl: sourceUrl || applyUrl || "https://www.google.com",
      applyUrl: applyUrl || sourceUrl || "https://www.google.com",
      resumeId: resumeId || "latest_resume",
      resumeTitle: resumeTitle || "ATS-Tailored Resume",
      status: appStatus,
      matchScore: typeof matchScore === "number" ? matchScore : 85,
      isDirectSubmission: Boolean(isDirectSubmission),
      notes: notes || (isDirectSubmission ? "Direct partner submission completed." : "External application page opened."),
      appliedAt: appStatus === "APPLIED" ? new Date().toISOString() : undefined,
      lastStatusUpdate: new Date().toISOString(),
    });

    res.status(201).json({
      application,
      message: isDirectSubmission
        ? "Application successfully submitted directly to the company!"
        : "Application tracked. Official external application portal opened.",
    });
  } catch (err: any) {
    console.error("[POST /api/jobs/apply] Error:", sanitizeErrorMessage(err));
    res.status(500).json({ error: sanitizeErrorMessage(err, "Failed to record application.") });
  }
});

// Update application status
app.patch("/api/jobs/applications/:id", (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required to update applications." });
    return;
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { status, notes, interviewDate } = body;

  if (!status) {
    res.status(400).json({ error: "Status is required." });
    return;
  }

  const updated = updateJobApplicationStatus(req.params.id, user.id, status, notes, interviewDate);
  if (!updated) {
    res.status(404).json({ error: "Application not found." });
    return;
  }

  res.json({ application: updated });
});

// Delete application
app.delete("/api/jobs/applications/:id", (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const deleted = deleteJobApplication(req.params.id, user.id);
  if (!deleted) {
    res.status(404).json({ error: "Application not found." });
    return;
  }

  res.json({ success: true });
});

// ==================== AUTONOMOUS ORCHESTRATION AGENT ====================

app.post("/api/orchestration/run", async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      analysisId,
      analysisRecord,
      resumeText,
      jobDescriptionText,
      jobTrack,
      linkedInData,
      forceResynthesize,
    } = body;

    const result = await ResuMateCareerAgent.runAutonomousOrchestration({
      analysisId,
      analysisRecord,
      resumeText,
      jobDescriptionText,
      isGuest: !user,
      userId: user?.id,
      jobTrack,
      linkedInData,
      forceResynthesize: Boolean(forceResynthesize),
    });

    res.json({ orchestration: result });
  } catch (err: any) {
    res.status(500).json({ error: sanitizeErrorMessage(err, "Autonomous orchestration failed.") });
  }
});

app.get("/api/orchestration/state/:analysisId", async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const existing = getAnalysisById(req.params.analysisId);
    if (!existing) {
      res.status(404).json({ error: "Analysis not in local cache yet; use POST /api/orchestration/run." });
      return;
    }
    const result = await ResuMateCareerAgent.runAutonomousOrchestration({
      analysisId: req.params.analysisId,
      isGuest: !user,
      userId: user?.id,
    });
    res.json({ orchestration: result });
  } catch (err: any) {
    res.status(404).json({ error: err.message || "Could not load orchestration state." });
  }
});

// ==================== VITE & STATIC SERVING ====================

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const distIndexHtml = path.join(distPath, "index.html");
  const hasBuiltDist = fs.existsSync(distIndexHtml);

  const isDevLifecycle = process.env.npm_lifecycle_event === "dev";
  const useStaticDist =
    !isDevLifecycle &&
    hasBuiltDist &&
    (process.env.NODE_ENV === "production" || process.env.npm_lifecycle_event === "start");

  if (!useStaticDist) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(distIndexHtml);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[ResuMate AI] Server active on http://0.0.0.0:${PORT} (mode: ${
        useStaticDist ? "production" : "development"
      })`
    );
  });
}

startServer().catch((err) => {
  console.error("Fatal error booting server:", err);
  process.exit(1);
});
