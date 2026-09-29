import {
  AnalysisRecord,
  EvidenceStrength,
  ParsedResume,
  SkillMatch,
} from "../types.js";

export type GapTier = "MISSING" | "WEAK" | "STRENGTHEN" | "MATCHED";

export type CompetencyDomain =
  | "Languages & Core Tech"
  | "Frameworks, APIs & Libraries"
  | "Databases & Data Engineering"
  | "Cloud, DevOps & Deployment"
  | "Architecture, Testing & Security"
  | "AI, ML & Analytics"
  | "Domain & Soft Competencies";

export interface LearningSequenceStage {
  stageNumber: 1 | 2 | 3 | 4;
  stageLabel:
    | "Foundational Concepts"
    | "Practical Implementation"
    | "Advanced Concepts"
    | "Real-World Project";
  topics: string[];
  milestoneDeliverable: string;
}

export interface PersonalizedSkillLearningPlan {
  skillName: string;
  category: string;
  competencyDomain: CompetencyDomain;
  isSoftOrCompetency: boolean;
  gapTier: GapTier;
  importance: "critical" | "high" | "medium" | "nice-to-have";
  mandatory: boolean;
  evidenceStrength: EvidenceStrength;
  verifiedResumeEvidence: string | null;
  verifiedResumeSection: string | null;
  // 1. Skill to Learn
  skillToLearn: string;
  // 2. Why it matters for the target role
  whyItMatters: string;
  // 3. Current level (Beginner / Intermediate / Advanced based strictly on evidence)
  currentLevel: "Beginner" | "Intermediate" | "Advanced";
  currentLevelRationale: string;
  // 4. Recommended learning sequence (Foundational -> Practical -> Advanced -> Real-World Project)
  learningSequenceArrow: string;
  learningStages: LearningSequenceStage[];
  // 5. Practical exercises
  practicalExercises: string[];
  // 6. Mini-project or portfolio project
  miniProjectTitle: string;
  miniProjectDescription: string;
  // 7. How to demonstrate the skill on the resume
  resumeDemonstrationGuide: string;
  sampleResumeBullet: string;
  // 8. Suggested resources/topics to study
  topicsToStudy: string[];
  suggestedResources: {
    title: string;
    platform: string;
    url: string;
    type: "Documentation" | "Course" | "Interactive Lab" | "Architecture Guide";
  }[];
  // Application-focused & Existing Project Connection
  practicalTaskSummary: string;
  existingProjectConnection: {
    targetProjectName: string;
    architecturalDimension: string;
    projectTask: string;
    resultAndImpact: string;
  };
}

export interface ProjectArchitectureDimension {
  dimension:
    | "Architecture"
    | "Technologies"
    | "Features"
    | "APIs"
    | "Database"
    | "Authentication"
    | "AI Functionality"
    | "Frontend"
    | "Backend"
    | "Deployment"
    | "Testing"
    | "Security";
  status: "STRONG" | "OPPORTUNITY" | "GAP";
  currentEvidence: string;
  recommendedUpgrade: string;
  linkedSkillGaps: string[];
}

export interface RecommendedProjectTask {
  id: string;
  title: string;
  skillGapClosed: string;
  secondarySkillsClosed: string[];
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  targetProjectName: string;
  architecturalLayer: string;
  estimatedHours: number;
  projectTask: string;
  implementationSteps: string[];
  resultSummary: string;
  resumeEvidenceBullet: string;
}

export interface ComprehensiveSkillGapReport {
  targetRole: string;
  companyName?: string;
  primaryProjectName: string;
  allProjectNames: string[];
  matchedSkills: PersonalizedSkillLearningPlan[];
  missingSkills: PersonalizedSkillLearningPlan[];
  weakSkills: PersonalizedSkillLearningPlan[];
  skillsToStrengthen: PersonalizedSkillLearningPlan[];
  softAndProfessionalCompetencies: PersonalizedSkillLearningPlan[];
  architectureDimensions: ProjectArchitectureDimension[];
  recommendedProjectTasks: RecommendedProjectTask[];
}

/**
 * Helper: checks if any search term is present in text using word-boundary safe regex
 */
function hasWordMatch(text: string, terms: string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return terms.some((term) => {
    const clean = term.toLowerCase().trim();
    if (!clean || clean.length < 2) return false;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    return regex.test(lower);
  });
}

/**
 * Deeply verifies whether a skill actually has evidence in the parsed resume or raw resume text,
 * ensuring we NEVER claim a skill is missing if there is clear evidence of it in the resume.
 */
function deepVerifyResumeEvidence(
  skillName: string,
  match: SkillMatch | undefined,
  resume: ParsedResume,
  rawResumeText: string
): {
  strength: EvidenceStrength;
  evidenceText: string | null;
  section: string | null;
} {
  // Build search variations for compound skill names (e.g. "REST API Development" -> ["rest api development", "rest api", "rest"])
  const terms = new Set<string>([skillName]);
  const stripped = skillName
    .replace(
      /\b(development|engineering|architecture|proficiency|experience|fundamentals|principles|frameworks|framework|tools|practices|skills|management|administration|integration|implementation|design|systems|services)\b/gi,
      ""
    )
    .replace(/[()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length >= 2) terms.add(stripped);

  for (const part of skillName.split(/[/,()|&+]+|\band\b|\bor\b/i)) {
    const cleanPart = part
      .replace(/\b(development|engineering|proficiency|experience|fundamentals|skills|tools)\b/gi, "")
      .trim();
    if (cleanPart.length >= 2 && !/^(in|with|for|the|of|to|on|using)$/i.test(cleanPart)) {
      terms.add(cleanPart);
    }
  }

  const searchTerms = Array.from(terms);

  // If the backend already found concrete evidence, respect it and enrich if needed
  if (match && match.evidenceStrength && match.evidenceStrength !== "NONE") {
    return {
      strength: match.evidenceStrength,
      evidenceText:
        match.resumeEvidence && match.resumeEvidence !== "Skill not mentioned in resume."
          ? match.resumeEvidence
          : match.evidenceSnippets?.[0] || `Verified in ${match.resumeSection || "resume"}`,
      section: match.resumeSection || "Resume",
    };
  }

  // Otherwise perform a thorough cross-check across all resume sections so no present skill is ever falsely marked missing
  for (const exp of resume.experience || []) {
    const combined = `${exp.title || ""} ${(exp.technologiesUsed || []).join(" ")} ${exp.description || ""} ${exp.contributions || ""}`;
    if (hasWordMatch(combined, searchTerms)) {
      return {
        strength: "VERY_HIGH",
        evidenceText: `Demonstrated during role as ${exp.title} at ${exp.company}: "${(exp.description || exp.title || "").slice(0, 140)}..."`,
        section: "Experience",
      };
    }
  }

  for (const proj of resume.projects || []) {
    const combined = `${proj.name || ""} ${(proj.technologies || []).join(" ")} ${proj.description || ""} ${proj.contributions || ""} ${proj.achievements || ""}`;
    if (hasWordMatch(combined, searchTerms)) {
      return {
        strength: "HIGH",
        evidenceText: `Demonstrated in project "${proj.name}": "${(proj.description || "").slice(0, 140)}..."`,
        section: "Projects",
      };
    }
  }

  for (const cert of resume.certifications || []) {
    const certName = typeof cert === "string" ? cert : cert.name;
    if (hasWordMatch(certName || "", searchTerms)) {
      return {
        strength: "MEDIUM",
        evidenceText: `Verified in Certification: "${certName}"`,
        section: "Certifications",
      };
    }
  }

  for (const sec of resume.dynamicSections || []) {
    for (const item of sec.items || []) {
      const combined = `${item.title || ""} ${item.subtitle || ""} ${(item.bullets || []).join(" ")}`;
      if (hasWordMatch(combined, searchTerms)) {
        return {
          strength: "MEDIUM",
          evidenceText: `Demonstrated in ${sec.heading}: "${combined.trim().slice(0, 130)}..."`,
          section: sec.heading,
        };
      }
    }
  }

  for (const edu of resume.education || []) {
    const combined = `${edu.degree || ""} ${edu.fieldOfStudy || ""} ${edu.details || ""}`;
    if (hasWordMatch(combined, searchTerms)) {
      return {
        strength: "MODERATE",
        evidenceText: `Referenced in Education (${edu.degree} at ${edu.institution})`,
        section: "Education",
      };
    }
  }

  const allListedSkills = [
    ...(resume.skills || []),
    ...(resume.technicalSkills || []),
    ...(resume.softSkills || []),
  ];
  const matchedListed = allListedSkills.find((s) => hasWordMatch(s, searchTerms));
  if (matchedListed) {
    return {
      strength: "LOW",
      evidenceText: `Listed in resume Skills inventory ("${matchedListed}") without detailed project or production metrics.`,
      section: "Skills",
    };
  }

  if (rawResumeText && hasWordMatch(rawResumeText, searchTerms)) {
    return {
      strength: "LOW",
      evidenceText: `Mentioned in resume text, but lacks dedicated project architecture or quantified outcome bullets.`,
      section: "Resume Text",
    };
  }

  return {
    strength: "NONE",
    evidenceText: null,
    section: null,
  };
}

/**
 * Classifies a skill into a CompetencyDomain and detects whether it is a Soft Skill / Professional Competency
 */
function classifyCompetencyDomain(skill: string, category?: string): {
  domain: CompetencyDomain;
  isSoft: boolean;
} {
  const s = `${skill} ${category || ""}`.toLowerCase();

  if (
    /\b(communication|leadership|stakeholder|collaboration|agile|scrum|mentoring|problem solving|critical thinking|cross-functional|ownership|presentation|negotiation|time management|adaptability|teamwork|documentation|product strategy|roadmap)\b/.test(
      s
    )
  ) {
    return { domain: "Domain & Soft Competencies", isSoft: true };
  }

  if (
    /\b(sql|postgres|postgresql|mysql|mongodb|redis|supabase|firebase|firestore|dynamodb|database|prisma|drizzle|typeorm|snowflake|bigquery|etl|data warehouse|spark|kafka)\b/.test(
      s
    )
  ) {
    return { domain: "Databases & Data Engineering", isSoft: false };
  }

  if (
    /\b(aws|gcp|azure|docker|kubernetes|k8s|terraform|ci\/cd|github actions|jenkins|gitlab|linux|nginx|cloud|serverless|vercel|deployment|monitoring|prometheus|grafana|devops|sre)\b/.test(
      s
    )
  ) {
    return { domain: "Cloud, DevOps & Deployment", isSoft: false };
  }

  if (
    /\b(security|auth|oauth|jwt|rbac|rls|owasp|encryption|testing|jest|cypress|playwright|vitest|unit test|integration test|tdd|system design|microservices|architecture|scalability|performance|caching)\b/.test(
      s
    )
  ) {
    return { domain: "Architecture, Testing & Security", isSoft: false };
  }

  if (
    /\b(ai|ml|machine learning|deep learning|llm|genai|gemini|openai|langchain|rag|vector|pytorch|tensorflow|scikit|nlp|pandas|numpy|analytics|tableau|power bi|looker|ga4)\b/.test(
      s
    )
  ) {
    return { domain: "AI, ML & Analytics", isSoft: false };
  }

  if (
    /\b(react|next\.js|vue|angular|express|nestjs|spring|django|flask|fastapi|graphql|rest|api|tailwind|redux|nodejs|node\.js|laravel|\.net|rails)\b/.test(
      s
    )
  ) {
    return { domain: "Frameworks, APIs & Libraries", isSoft: false };
  }

  return { domain: "Languages & Core Tech", isSoft: false };
}

/**
 * Determines the 4-tier classification:
 * - MISSING: No evidence in resume (NONE)
 * - WEAK: Listed only in skills list (LOW) or academic coursework only (MODERATE)
 * - STRENGTHEN: Demonstrated in certifications (MEDIUM) or projects (HIGH) where deeper production scale/testing can strengthen it
 * - MATCHED: Strong production/project evidence (VERY_HIGH or HIGH)
 */
function determineGapTier(
  strength: EvidenceStrength,
  importance: string,
  mandatory: boolean
): GapTier {
  if (strength === "NONE") return "MISSING";
  if (strength === "LOW" || strength === "MODERATE") return "WEAK";
  if (strength === "MEDIUM") return "STRENGTHEN";
  if (strength === "HIGH" && (importance === "critical" || mandatory)) {
    // Has strong project evidence, so it IS matched, and we also surface how to strengthen it for senior/critical depth
    return "MATCHED";
  }
  return "MATCHED";
}

/**
 * Knowledge base that constructs a rich, 8-point personalized learning path and existing-project task
 * for any technical, tool, framework, architecture, or soft/professional skill.
 */
function generateDetailedPlanForSkill(params: {
  skillName: string;
  category: string;
  gapTier: GapTier;
  importance: "critical" | "high" | "medium" | "nice-to-have";
  mandatory: boolean;
  strength: EvidenceStrength;
  evidenceText: string | null;
  evidenceSection: string | null;
  jobTitle: string;
  primaryProjectName: string;
  projectTechStack: string[];
}): PersonalizedSkillLearningPlan {
  const {
    skillName,
    category,
    gapTier,
    importance,
    mandatory,
    strength,
    evidenceText,
    evidenceSection,
    jobTitle,
    primaryProjectName,
    projectTechStack,
  } = params;

  const { domain: competencyDomain, isSoft: isSoftOrCompetency } = classifyCompetencyDomain(
    skillName,
    category
  );

  // Determine Current Level strictly from available resume evidence
  let currentLevel: "Beginner" | "Intermediate" | "Advanced" = "Beginner";
  let currentLevelRationale = "";

  if (strength === "NONE") {
    currentLevel = "Beginner";
    currentLevelRationale =
      "Beginner (No prior evidence found in your uploaded resume; start from core concepts and build a verifiable project implementation).";
  } else if (strength === "LOW" || strength === "MODERATE") {
    currentLevel = "Beginner";
    currentLevelRationale = `Beginner to Intermediate (${
      evidenceSection ? `Referenced in ${evidenceSection}` : "Listed in resume"
    }, but lacks end-to-end production architecture or measurable outcome bullets).`;
  } else if (strength === "MEDIUM") {
    currentLevel = "Intermediate";
    currentLevelRationale = `Intermediate (Supported by ${
      evidenceSection || "certification/coursework"
    } evidence; needs deeper production-grade integration and benchmarking).`;
  } else if (strength === "HIGH") {
    currentLevel = "Intermediate";
    currentLevelRationale = `Intermediate to Advanced (Demonstrated in ${
      evidenceSection || "Projects"
    }; can be strengthened with production scalability, automated tests, and security hardening).`;
  } else {
    currentLevel = "Advanced";
    currentLevelRationale = `Advanced (Verified in ${
      evidenceSection || "Professional Experience"
    } with direct implementation evidence).`;
  }

  const s = skillName.toLowerCase().trim();
  const stackLabel =
    projectTechStack.length > 0 ? projectTechStack.slice(0, 3).join(", ") : "TypeScript, React & Node.js";

  // Default structured template, specialized below by skill family
  let whyItMatters = `Core requirement for ${jobTitle} to design, deliver, and maintain reliable production systems that meet team and business SLAs.`;
  let learningSequenceArrow = `${skillName} fundamentals → core patterns & syntax → integration & error handling → testing & security → production deployment in ${primaryProjectName}`;
  let learningStages: LearningSequenceStage[] = [
    {
      stageNumber: 1,
      stageLabel: "Foundational Concepts",
      topics: [
        `Core architecture and mental model of ${skillName}`,
        `Standard conventions, configuration, and ecosystem tooling`,
        `Common anti-patterns and when to use ${skillName} in ${jobTitle} workflows`,
      ],
      milestoneDeliverable: `Write a concise technical design note and minimal working prototype using ${skillName}.`,
    },
    {
      stageNumber: 2,
      stageLabel: "Practical Implementation",
      topics: [
        `Integrating ${skillName} with ${stackLabel}`,
        `Data flow, state/schema validation, and structured error handling`,
        `Logging, debugging, and edge-case resilience`,
      ],
      milestoneDeliverable: `Build a functional module implementing ${skillName} with clean interfaces and validation.`,
    },
    {
      stageNumber: 3,
      stageLabel: "Advanced Concepts",
      topics: [
        `Performance optimization, caching, and concurrency patterns`,
        `Security hardening, access control, and automated testing`,
        `Production observability and failure recovery`,
      ],
      milestoneDeliverable: `Add automated unit/integration tests and benchmark latency/throughput under load.`,
    },
    {
      stageNumber: 4,
      stageLabel: "Real-World Project",
      topics: [
        `End-to-end integration directly into "${primaryProjectName}"`,
        `CI/CD verification, production deployment, and documentation`,
      ],
      milestoneDeliverable: `Ship a production-grade feature in "${primaryProjectName}" powered by ${skillName}.`,
    },
  ];
  let practicalExercises: string[] = [
    `Build an isolated sandbox module demonstrating core ${skillName} operations with strict input validation and error recovery.`,
    `Refactor an existing workflow in "${primaryProjectName}" to use ${skillName} best practices and measure before/after performance.`,
    `Write automated integration tests covering happy-path, invalid input, and timeout/failure scenarios for your ${skillName} implementation.`,
  ];
  let miniProjectTitle = `Production ${skillName} Integration for ${primaryProjectName}`;
  let miniProjectDescription = `Extend "${primaryProjectName}" with a production-ready ${skillName} module, complete with validation, error handling, automated tests, and documented architecture.`;
  let resumeDemonstrationGuide = `Add ${skillName} to your Technical Skills section AND include a quantified bullet under "${primaryProjectName}" in your Projects section detailing the architecture, technologies used, testing, and measurable outcome.`;
  let sampleResumeBullet = `Engineered a production-grade ${skillName} module within ${primaryProjectName} using ${stackLabel}, implementing automated validation, error handling, and integration tests to improve system reliability and maintainability.`;
  let topicsToStudy: string[] = [
    `${skillName} Architecture & Core Primitives`,
    `Production Error Handling & Resilience`,
    `Security & Performance Optimization in ${skillName}`,
    `Automated Testing & Verification Strategies`,
  ];
  let suggestedResources: PersonalizedSkillLearningPlan["suggestedResources"] = [
    {
      title: `${skillName} Official Documentation & Architecture Guides`,
      platform: "Official Docs / MDN / DevDocs",
      url: `https://www.google.com/search?q=${encodeURIComponent(skillName + " official documentation guide")}`,
      type: "Documentation",
    },
    {
      title: `Applied ${skillName} for ${jobTitle}`,
      platform: "Coursera / edX / FreeCodeCamp",
      url: `https://www.coursera.org/search?query=${encodeURIComponent(skillName)}`,
      type: "Course",
    },
    {
      title: `${skillName} Production Best Practices & Case Studies`,
      platform: "GitHub Topics & Engineering Blogs",
      url: `https://github.com/search?q=${encodeURIComponent(skillName + " production example")}&type=repositories`,
      type: "Architecture Guide",
    },
  ];
  let architecturalDimension = "Architecture & Core Features";
  let projectTask = `Integrate a production-grade ${skillName} workflow directly into "${primaryProjectName}" with structured validation and automated test coverage.`;
  let resultAndImpact = `Closes the ${skillName} gap while upgrading "${primaryProjectName}" with verifiable, production-ready architecture.`;

  // Specialized domain blueprints
  if (s.includes("rest") || s.includes("api") || s.includes("graphql") || s.includes("endpoint") || s.includes("backend")) {
    whyItMatters = `Essential for ${jobTitle} to design clean, versioned, and secure client-server contracts, handle concurrent requests reliably, and integrate frontend interfaces with persistent data stores.`;
    learningSequenceArrow =
      "HTTP fundamentals → REST principles → authentication & RBAC → CRUD & pagination APIs → centralized error handling → integration testing → production deployment";
    learningStages = [
      {
        stageNumber: 1,
        stageLabel: "Foundational Concepts",
        topics: [
          "HTTP methods (GET, POST, PUT, PATCH, DELETE), status codes (2xx, 4xx, 5xx), headers, and content negotiation",
          "RESTful resource modeling, URI naming conventions, and idempotency guarantees",
        ],
        milestoneDeliverable: "Design an OpenAPI/Swagger specification for 5 core resource endpoints.",
      },
      {
        stageNumber: 2,
        stageLabel: "Practical Implementation",
        topics: [
          "Building modular route controllers, middleware pipelines, and schema validation (Zod/Joi)",
          "Pagination, filtering, sorting, and consistent JSON response envelopes",
        ],
        milestoneDeliverable: "Implement full CRUD API routes with request payload validation.",
      },
      {
        stageNumber: 3,
        stageLabel: "Advanced Concepts",
        topics: [
          "Bearer JWT / OAuth authentication middleware, rate limiting, and CORS hardening",
          "Centralized error handling, structured request logging, and automated Supertest/Vitest API tests",
        ],
        milestoneDeliverable: "Secure all endpoints with auth guards, rate limiters, and 90%+ route test coverage.",
      },
      {
        stageNumber: 4,
        stageLabel: "Real-World Project",
        topics: [
          `Integrate the hardened REST API service directly into "${primaryProjectName}" with live health checks and deployment`,
        ],
        milestoneDeliverable: `Deploy the documented, tested API layer inside "${primaryProjectName}".`,
      },
    ];
    practicalExercises = [
      "Build a RESTful resource endpoint supporting cursor-based pagination, query filtering, and strict schema validation.",
      "Implement a centralized error-handling middleware that normalizes validation, authentication, and database errors into standard HTTP responses.",
      "Write an automated API integration test suite verifying 200, 400, 401, 403, and 404 responses.",
    ];
    miniProjectTitle = `Production-Grade REST API & Middleware Layer for ${primaryProjectName}`;
    miniProjectDescription = `Build and integrate a versioned REST API in "${primaryProjectName}" featuring schema validation, JWT authentication, rate limiting, structured error handling, and automated endpoint tests.`;
    resumeDemonstrationGuide = `Document the API architecture, authentication mechanism, validation library, and test coverage in the Projects section under "${primaryProjectName}".`;
    sampleResumeBullet = `Architected a production REST API for ${primaryProjectName} with schema validation, JWT authentication, rate limiting, and centralized error handling, achieving 95% integration test coverage across all endpoints.`;
    topicsToStudy = [
      "HTTP/1.1 & HTTP/2 Semantics, Caching Headers (ETag, Cache-Control) & Idempotency",
      "RESTful Resource Hierarchy & OpenAPI 3.1 Specification",
      "JWT/OAuth2 Bearer Authentication & Rate-Limiting Middleware",
      "Automated API Contract & Integration Testing",
    ];
    suggestedResources = [
      {
        title: "MDN HTTP & REST API Architecture Reference",
        platform: "MDN Web Docs",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP",
        type: "Documentation",
      },
      {
        title: "RESTful API Design Best Practices & OpenAPI Guide",
        platform: "Swagger / OpenAPI Initiative",
        url: "https://swagger.io/resources/articles/best-practices-in-api-design/",
        type: "Architecture Guide",
      },
    ];
    architecturalDimension = "APIs & Backend";
    projectTask = `Build a versioned, schema-validated REST API layer in "${primaryProjectName}" with authentication middleware, rate limiting, and error handling.`;
    resultAndImpact = `Transforms "${primaryProjectName}" into a production-hardened full-stack service while providing concrete API engineering proof.`;
  } else if (
    s.includes("sql") ||
    s.includes("postgres") ||
    s.includes("database") ||
    s.includes("supabase") ||
    s.includes("firebase") ||
    s.includes("firestore") ||
    s.includes("mongodb") ||
    s.includes("rls") ||
    s.includes("data")
  ) {
    whyItMatters = `Critical for ${jobTitle} to guarantee data integrity, low-latency querying, transactional consistency, and fine-grained tenant data security.`;
    learningSequenceArrow =
      "Relational/Document schema modeling → indexing & constraints → complex queries & transactions → Row-Level Security (RLS) & access rules → query optimization → backup & migration workflows";
    learningStages = [
      {
        stageNumber: 1,
        stageLabel: "Foundational Concepts",
        topics: [
          "Data normalization (3NF), primary/foreign keys, and entity-relationship modeling",
          "ACID transactions, isolation levels, and schema constraints",
        ],
        milestoneDeliverable: "Design an ERD and declarative schema with strict foreign-key and check constraints.",
      },
      {
        stageNumber: 2,
        stageLabel: "Practical Implementation",
        topics: [
          "Writing complex JOINs, CTEs, window functions, and aggregations",
          "Implementing parameterized queries / ORM migrations and connection pooling",
        ],
        milestoneDeliverable: "Implement the persistence layer and versioned schema migrations.",
      },
      {
        stageNumber: 3,
        stageLabel: "Advanced Concepts",
        topics: [
          "Composite B-Tree/GIN indexing, EXPLAIN ANALYZE query plan tuning",
          "Row-Level Security (RLS) policies, Firestore/Supabase security rules, and least-privilege access",
        ],
        milestoneDeliverable: "Enforce tenant-isolated security policies and optimize slow queries with indexes.",
      },
      {
        stageNumber: 4,
        stageLabel: "Real-World Project",
        topics: [
          `Integrate persistent database tables, indexes, and Row-Level Security policies directly into "${primaryProjectName}"`,
        ],
        milestoneDeliverable: `Ship multi-user persistent storage with verified access control in "${primaryProjectName}".`,
      },
    ];
    practicalExercises = [
      "Run EXPLAIN ANALYZE on a multi-table filtered query and add a composite index to eliminate sequential scans.",
      "Write Row-Level Security (RLS) / Firestore security rules ensuring users can only read and mutate their own records.",
      "Implement an atomic transaction that updates related records with automatic rollback on failure.",
    ];
    miniProjectTitle = `Secure Persistent Data Layer & RLS Policies for ${primaryProjectName}`;
    miniProjectDescription = `Upgrade "${primaryProjectName}" with a normalized database schema, indexed analytical queries, and strict Row-Level Security (RLS) / ownership rules.`;
    resumeDemonstrationGuide = `Highlight your schema design, composite indexing, and Row-Level Security enforcement under "${primaryProjectName}" in the Projects section.`;
    sampleResumeBullet = `Designed and secured the persistent database architecture for ${primaryProjectName}, implementing normalized schemas, composite B-Tree indexes, and strict Row-Level Security (RLS) policies to guarantee tenant isolation and sub-50ms query latency.`;
    topicsToStudy = [
      "Relational Schema Normalization, Foreign Keys & ACID Transactions",
      "Query Execution Plans (EXPLAIN ANALYZE) & Composite Indexing",
      "Database Security: Row-Level Security (RLS) & Zero-Trust Access Rules",
      "Zero-Downtime Schema Migrations & Connection Pooling",
    ];
    suggestedResources = [
      {
        title: "PostgreSQL Official Documentation & Performance Tips",
        platform: "PostgreSQL.org",
        url: "https://www.postgresql.org/docs/current/performance-tips.html",
        type: "Documentation",
      },
      {
        title: "Row Level Security (RLS) & Database Authorization Guide",
        platform: "Supabase / PostgreSQL Security Docs",
        url: "https://supabase.com/docs/guides/database/postgres/row-level-security",
        type: "Architecture Guide",
      },
    ];
    architecturalDimension = "Database & Security";
    projectTask = `Implement normalized database persistence, composite query indexing, and Row-Level Security (RLS) access rules in "${primaryProjectName}".`;
    resultAndImpact = `Learns database engineering and security while making "${primaryProjectName}" multi-tenant safe and production-ready.`;
  } else if (
    s.includes("docker") ||
    s.includes("kubernetes") ||
    s.includes("ci/cd") ||
    s.includes("devops") ||
    s.includes("aws") ||
    s.includes("cloud") ||
    s.includes("deploy") ||
    s.includes("terraform")
  ) {
    whyItMatters = `Required for ${jobTitle} to package applications reproducibly, automate build/test verification on every commit, and deploy zero-downtime releases to cloud infrastructure.`;
    learningSequenceArrow =
      "Linux & container basics → multi-stage Dockerfiles → Docker Compose local stack → CI/CD automated test & lint pipelines → cloud deployment & secrets → health checks & monitoring";
    learningStages = [
      {
        stageNumber: 1,
        stageLabel: "Foundational Concepts",
        topics: [
          "Container image layers, process isolation, environment variables, and 12-Factor App principles",
          "CI/CD pipeline stages: lint, typecheck, unit test, build artifact, and deploy",
        ],
        milestoneDeliverable: "Create a clean `.env.example` and single-stage container build.",
      },
      {
        stageNumber: 2,
        stageLabel: "Practical Implementation",
        topics: [
          "Writing a multi-stage Dockerfile with non-root user and layer caching",
          "Configuring GitHub Actions workflows for automated linting, testing, and build validation",
        ],
        milestoneDeliverable: "Reduce image size by 60%+ with a multi-stage Dockerfile and automated CI check.",
      },
      {
        stageNumber: 3,
        stageLabel: "Advanced Concepts",
        topics: [
          "Container orchestration health/readiness probes, graceful shutdown, and secret injection",
          "Automated cloud deployment with rollback safety and latency monitoring",
        ],
        milestoneDeliverable: "Add `/api/health` readiness probes and automated deployment triggers.",
      },
      {
        stageNumber: 4,
        stageLabel: "Real-World Project",
        topics: [
          `Containerize "${primaryProjectName}" and wire an end-to-end GitHub Actions CI/CD pipeline`,
        ],
        milestoneDeliverable: `Ship a reproducible Docker + CI/CD pipeline for "${primaryProjectName}".`,
      },
    ];
    practicalExercises = [
      `Write a multi-stage Dockerfile for "${primaryProjectName}" that separates TypeScript build dependencies from the slim production runtime.`,
      "Create a `.github/workflows/ci.yml` pipeline that runs typechecking, linting, and tests on every pull request.",
      "Implement a `/api/health` endpoint and configure container `HEALTHCHECK` instructions.",
    ];
    miniProjectTitle = `Multi-Stage Docker & Automated CI/CD Pipeline for ${primaryProjectName}`;
    miniProjectDescription = `Containerize "${primaryProjectName}" using a multi-stage Dockerfile and configure an automated GitHub Actions CI/CD workflow that validates builds, runs tests, and deploys to the cloud.`;
    resumeDemonstrationGuide = `Add Docker, CI/CD, and Cloud Deployment details to your "${primaryProjectName}" project bullets and Technical Skills section.`;
    sampleResumeBullet = `Containerized ${primaryProjectName} using multi-stage Docker builds and engineered an automated GitHub Actions CI/CD pipeline with typecheck, test gates, and health-checked cloud deployment.`;
    topicsToStudy = [
      "Multi-Stage Dockerfiles, Layer Caching & Non-Root Container Security",
      "GitHub Actions CI/CD Workflows & Automated Quality Gates",
      "Cloud Run / Container Orchestration, Health Probes & Graceful Shutdown",
      "Environment Configuration & Secrets Management",
    ];
    suggestedResources = [
      {
        title: "Docker Multi-Stage Build Best Practices",
        platform: "Docker Official Docs",
        url: "https://docs.docker.com/build/building/multi-stage/",
        type: "Documentation",
      },
      {
        title: "GitHub Actions Continuous Integration & Delivery Guides",
        platform: "GitHub Docs",
        url: "https://docs.github.com/en/actions/automating-builds-and-tests",
        type: "Architecture Guide",
      },
    ];
    architecturalDimension = "Deployment & CI/CD";
    projectTask = `Add a multi-stage Dockerfile, health-check endpoint, and automated GitHub Actions CI/CD pipeline to "${primaryProjectName}".`;
    resultAndImpact = `Proves real DevOps & cloud deployment competency directly inside "${primaryProjectName}".`;
  } else if (
    s.includes("test") ||
    s.includes("jest") ||
    s.includes("vitest") ||
    s.includes("cypress") ||
    s.includes("playwright") ||
    s.includes("qa") ||
    s.includes("tdd")
  ) {
    whyItMatters = `Vital for ${jobTitle} to prevent regressions, verify business logic deterministically, and ship code with high engineering confidence.`;
    learningSequenceArrow =
      "Testing pyramid fundamentals → unit testing pure functions → mocking & dependency injection → API & component integration tests → E2E user flow testing → CI coverage gates";
    architecturalDimension = "Testing & Quality Assurance";
    projectTask = `Add a Vitest/Playwright automated test suite to "${primaryProjectName}" covering core business logic, API endpoints, and critical UI workflows.`;
    resultAndImpact = `Eliminates regressions in "${primaryProjectName}" while proving production testing discipline on your resume.`;
    sampleResumeBullet = `Established an automated testing architecture for ${primaryProjectName} using Vitest and integration test harnesses, verifying critical business rules, API contracts, and edge cases.`;
  } else if (
    s.includes("auth") ||
    s.includes("security") ||
    s.includes("jwt") ||
    s.includes("oauth") ||
    s.includes("rbac") ||
    s.includes("owasp")
  ) {
    whyItMatters = `Essential for ${jobTitle} to protect user identities, enforce role-based permissions, prevent unauthorized data access, and comply with modern security standards.`;
    learningSequenceArrow =
      "Authentication vs. authorization → OAuth 2.0 / OIDC & JWT signing → Role-Based Access Control (RBAC) → input sanitization & OWASP Top 10 → rate limiting & audit logging";
    architecturalDimension = "Authentication & Security";
    projectTask = `Harden "${primaryProjectName}" with OAuth 2.0 / JWT verification middleware, Role-Based Access Control (RBAC), and request rate limiting.`;
    resultAndImpact = `Secures "${primaryProjectName}" against unauthorized access and demonstrates security engineering on your resume.`;
    sampleResumeBullet = `Implemented end-to-end authentication and Role-Based Access Control (RBAC) in ${primaryProjectName}, enforcing JWT verification, protected API routes, and OWASP security guardrails.`;
  } else if (
    s.includes("react") ||
    s.includes("typescript") ||
    s.includes("frontend") ||
    s.includes("next") ||
    s.includes("ui") ||
    s.includes("state")
  ) {
    whyItMatters = `Key for ${jobTitle} to architect type-safe, accessible, and responsive user interfaces with predictable state management and resilient API data fetching.`;
    learningSequenceArrow =
      "Strict TypeScript domain modeling → modular component composition → custom hooks & state management → optimistic UI & error boundaries → performance profiling & accessibility";
    architecturalDimension = "Frontend & Type Safety";
    projectTask = `Refactor "${primaryProjectName}" frontend views with strict TypeScript generics, custom data-fetching hooks, loading skeletons, and error boundaries.`;
    resultAndImpact = `Improves UX responsiveness and type safety in "${primaryProjectName}" while demonstrating modern frontend engineering.`;
    sampleResumeBullet = `Architected modular, type-safe React & TypeScript interfaces for ${primaryProjectName} with custom state hooks and error boundaries, improving rendering responsiveness and maintainability.`;
  } else if (
    s.includes("ai") ||
    s.includes("llm") ||
    s.includes("gemini") ||
    s.includes("machine learning") ||
    s.includes("nlp") ||
    s.includes("rag") ||
    s.includes("prompt")
  ) {
    whyItMatters = `Crucial for ${jobTitle} to build reliable, deterministic AI features with structured JSON schemas, grounding, latency fallbacks, and zero-hallucination guardrails.`;
    learningSequenceArrow =
      "LLM API fundamentals → structured JSON schema outputs → retrieval/evidence grounding → retry, timeout & fallback orchestration → evaluation & anti-hallucination guardrails";
    architecturalDimension = "AI Functionality";
    projectTask = `Enhance the AI pipeline in "${primaryProjectName}" with strict JSON schema validation, deterministic fallback handling, and evidence verification guardrails.`;
    resultAndImpact = `Makes AI outputs in "${primaryProjectName}" deterministic and verifiable while showcasing production AI engineering.`;
    sampleResumeBullet = `Engineered a deterministic AI evaluation pipeline in ${primaryProjectName} with structured JSON schema enforcement, latency fallbacks, and anti-hallucination evidence verification.`;
  } else if (isSoftOrCompetency) {
    whyItMatters = `High-impact professional competency for ${jobTitle}: hiring managers evaluate how effectively you translate ambiguous business problems into clear technical specifications, align stakeholders, and deliver iteratively.`;
    learningSequenceArrow =
      "Structured written communication → Architecture Decision Records (ADRs) → agile task decomposition & estimation → constructive code reviews → quantified business impact reporting";
    learningStages = [
      {
        stageNumber: 1,
        stageLabel: "Foundational Concepts",
        topics: [
          `Core principles of ${skillName} in high-performing ${jobTitle} teams`,
          "Writing clear problem statements, acceptance criteria, and stakeholder updates",
        ],
        milestoneDeliverable: "Draft a 1-page Architecture Decision Record (ADR) or Product Spec for a feature.",
      },
      {
        stageNumber: 2,
        stageLabel: "Practical Implementation",
        topics: [
          "Breaking complex epics into scoped milestones with measurable KPIs",
          "Documenting trade-offs, risks, and API/system contracts for cross-functional peers",
        ],
        milestoneDeliverable: `Publish a comprehensive README, system architecture diagram, and roadmap for "${primaryProjectName}".`,
      },
      {
        stageNumber: 3,
        stageLabel: "Advanced Concepts",
        topics: [
          "Leading technical design reviews, root-cause postmortems, and iterative delivery",
          "Communicating engineering metrics (latency, reliability, conversion impact) to leadership",
        ],
        milestoneDeliverable: "Add an engineering trade-offs & metrics section to your project documentation.",
      },
      {
        stageNumber: 4,
        stageLabel: "Real-World Project",
        topics: [
          `Demonstrate ${skillName} directly through the documentation, release notes, and measurable outcomes of "${primaryProjectName}"`,
        ],
        milestoneDeliverable: `Complete a recruiter-ready case study and architecture brief for "${primaryProjectName}".`,
      },
    ];
    practicalExercises = [
      `Write an Architecture Decision Record (ADR) for "${primaryProjectName}" explaining key design trade-offs and alternatives considered.`,
      `Create a clear system architecture diagram and API workflow guide in the "${primaryProjectName}" documentation.`,
      `Rewrite 3 resume bullets to highlight cross-functional collaboration, ownership, and quantified business impact.`,
    ];
    miniProjectTitle = `Executive Architecture Brief & Case Study for ${primaryProjectName}`;
    miniProjectDescription = `Produce a structured technical case study, ADR documentation, and measurable KPI impact report for "${primaryProjectName}" that proves ${skillName} in action.`;
    resumeDemonstrationGuide = `Demonstrate ${skillName} through action-oriented Experience and Project bullets (e.g., "Partnered with cross-functional stakeholders...", "Authored technical specifications...") rather than only listing it as a keyword.`;
    sampleResumeBullet = `Demonstrated ${skillName} by authoring technical specifications, documenting architectural trade-offs, and aligning iterative delivery of ${primaryProjectName} with measurable quality milestones.`;
    architecturalDimension = "Architecture & Documentation";
    projectTask = `Author an Architecture Decision Record (ADR), system design diagram, and quantified impact summary for "${primaryProjectName}".`;
    resultAndImpact = `Proves ${skillName} with tangible documentation artifacts and stronger impact-driven resume bullets.`;
  }

  return {
    skillName,
    category: category || competencyDomain,
    competencyDomain,
    isSoftOrCompetency,
    gapTier,
    importance,
    mandatory,
    evidenceStrength: strength,
    verifiedResumeEvidence: evidenceText,
    verifiedResumeSection: evidenceSection,
    skillToLearn: skillName,
    whyItMatters,
    currentLevel,
    currentLevelRationale,
    learningSequenceArrow,
    learningStages,
    practicalExercises,
    miniProjectTitle,
    miniProjectDescription,
    resumeDemonstrationGuide,
    sampleResumeBullet,
    topicsToStudy,
    suggestedResources,
    practicalTaskSummary: miniProjectDescription,
    existingProjectConnection: {
      targetProjectName: primaryProjectName,
      architecturalDimension,
      projectTask,
      resultAndImpact,
    },
  };
}

/**
 * Analyzes the user's existing project(s) and application ecosystem across all 12 architectural dimensions:
 * Architecture, Technologies, Features, APIs, Database, Authentication, AI functionality,
 * Frontend, Backend, Deployment, Testing, Security.
 */
function buildProjectArchitectureAnalysis(
  resume: ParsedResume,
  primaryProjectName: string,
  allSkillsLower: string,
  gapPlans: PersonalizedSkillLearningPlan[]
): ProjectArchitectureDimension[] {
  const findLinkedGaps = (keywords: string[]): string[] => {
    return gapPlans
      .filter((g) => keywords.some((kw) => g.skillName.toLowerCase().includes(kw)))
      .map((g) => g.skillName)
      .slice(0, 3);
  };

  const hasAny = (keywords: string[]) => keywords.some((kw) => allSkillsLower.includes(kw));

  const projectTechs = Array.from(
    new Set([
      ...(resume.projects || []).flatMap((p) => p.technologies || []),
      ...(resume.skills || []).slice(0, 10),
    ])
  ).slice(0, 8);

  const dimensions: ProjectArchitectureDimension[] = [
    {
      dimension: "Architecture",
      status: (resume.projects || []).length > 0 ? "STRONG" : "OPPORTUNITY",
      currentEvidence:
        (resume.projects || []).length > 0
          ? `Modular application structure evidenced in "${primaryProjectName}" (${(resume.projects || []).length} project(s) on resume).`
          : "Basic application structure; needs explicit modular / layered architecture documentation.",
      recommendedUpgrade: `Document clear separation of concerns ( Presentation → Domain/Service Layer → Data Access Layer ) and add an Architecture Decision Record (ADR) to "${primaryProjectName}".`,
      linkedSkillGaps: findLinkedGaps(["architecture", "system design", "microservices", "modular", "design"]),
    },
    {
      dimension: "Technologies",
      status: projectTechs.length >= 4 ? "STRONG" : "OPPORTUNITY",
      currentEvidence:
        projectTechs.length > 0
          ? `Verified stack: ${projectTechs.join(", ")}.`
          : "Core programming stack listed; expand integration with target JD frameworks.",
      recommendedUpgrade: `Align "${primaryProjectName}" dependency stack with target role requirements and enforce strict type checking across modules.`,
      linkedSkillGaps: gapPlans.slice(0, 2).map((g) => g.skillName),
    },
    {
      dimension: "Features",
      status: (resume.projects || []).some((p) => (p.description || "").length > 40) ? "STRONG" : "OPPORTUNITY",
      currentEvidence:
        resume.projects?.[0]?.description
          ? `Core feature workflows implemented in "${primaryProjectName}": "${resume.projects[0].description.slice(0, 110)}..."`
          : `Core functional workflows in "${primaryProjectName}".`,
      recommendedUpgrade: `Add end-to-end user workflow telemetry, exportable reports, and real-time validation feedback to "${primaryProjectName}".`,
      linkedSkillGaps: findLinkedGaps(["product", "feature", "workflow", "analytics", "ux"]),
    },
    {
      dimension: "APIs",
      status: hasAny(["rest", "api", "graphql", "express", "fastapi", "spring", "endpoint"]) ? "STRONG" : "OPPORTUNITY",
      currentEvidence: hasAny(["rest", "api", "graphql", "express", "fastapi", "spring"])
        ? `Client-server API routes and data exchange evidenced in resume.`
        : `API contract layer is not explicitly detailed with validation or rate-limiting metrics.`,
      recommendedUpgrade: `Add versioned REST API endpoints with request schema validation, pagination, and standardized error responses in "${primaryProjectName}".`,
      linkedSkillGaps: findLinkedGaps(["rest", "api", "graphql", "http", "grpc", "microservice"]),
    },
    {
      dimension: "Database",
      status: hasAny(["sql", "postgres", "mongodb", "mysql", "firebase", "firestore", "supabase", "redis", "database"])
        ? "STRONG"
        : "GAP",
      currentEvidence: hasAny(["sql", "postgres", "mongodb", "mysql", "firebase", "firestore", "supabase", "redis"])
        ? `Persistent database integration referenced in candidate profile.`
        : `No indexed relational/cloud database schema or query optimization metrics detailed.`,
      recommendedUpgrade: `Add indexed persistence, transactional integrity, and migration scripts to "${primaryProjectName}".`,
      linkedSkillGaps: findLinkedGaps(["sql", "postgres", "database", "mongo", "redis", "supabase", "firebase", "data"]),
    },
    {
      dimension: "Authentication",
      status: hasAny(["auth", "jwt", "oauth", "firebase", "session", "rbac"]) ? "STRONG" : "OPPORTUNITY",
      currentEvidence: hasAny(["auth", "jwt", "oauth", "firebase", "session", "rbac"])
        ? `User authentication and session handling present.`
        : `Authentication and role-based permission boundaries are not highlighted in project bullets.`,
      recommendedUpgrade: `Implement OAuth 2.0 / JWT Bearer authentication and Role-Based Access Control (RBAC) guards in "${primaryProjectName}".`,
      linkedSkillGaps: findLinkedGaps(["auth", "oauth", "jwt", "rbac", "identity", "security"]),
    },
    {
      dimension: "AI Functionality",
      status: hasAny(["ai", "llm", "gemini", "machine learning", "nlp", "openai", "rag", "deep learning"])
        ? "STRONG"
        : "OPPORTUNITY",
      currentEvidence: hasAny(["ai", "llm", "gemini", "machine learning", "nlp", "openai", "rag"])
        ? `Intelligent processing / AI model integration demonstrated in project portfolio.`
        : `Opportunity to integrate structured AI evaluation or automated analytics.`,
      recommendedUpgrade: `Enforce structured JSON schema validation, deterministic fallback chains, and evidence grounding in "${primaryProjectName}".`,
      linkedSkillGaps: findLinkedGaps(["ai", "ml", "machine learning", "llm", "gemini", "nlp", "data science"]),
    },
    {
      dimension: "Frontend",
      status: hasAny(["react", "typescript", "javascript", "tailwind", "html", "css", "next.js", "vue", "angular"])
        ? "STRONG"
        : "OPPORTUNITY",
      currentEvidence: hasAny(["react", "typescript", "javascript", "tailwind", "next.js", "vue", "angular"])
        ? `Interactive component UI and state management evidenced in resume.`
        : `Frontend presentation layer can be strengthened with responsive state and accessibility metrics.`,
      recommendedUpgrade: `Add strict TypeScript interfaces, optimistic UI states, keyboard accessibility, and responsive layouts to "${primaryProjectName}".`,
      linkedSkillGaps: findLinkedGaps(["react", "typescript", "frontend", "ui", "css", "tailwind", "next", "vue", "angular"]),
    },
    {
      dimension: "Backend",
      status: hasAny(["node", "express", "python", "java", "spring", "go", "golang", "c#", "backend"])
        ? "STRONG"
        : "OPPORTUNITY",
      currentEvidence: hasAny(["node", "express", "python", "java", "spring", "go", "golang", "c#", "backend"])
        ? `Server-side business logic and request orchestration evidenced.`
        : `Backend service layer needs clearer concurrency, caching, and error-handling evidence.`,
      recommendedUpgrade: `Refactor "${primaryProjectName}" backend services with structured logging, caching, and resilient error recovery.`,
      linkedSkillGaps: findLinkedGaps(["node", "python", "java", "spring", "go", "backend", "express", "server"]),
    },
    {
      dimension: "Deployment",
      status: hasAny(["docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "github actions", "vercel", "cloud"])
        ? "STRONG"
        : "GAP",
      currentEvidence: hasAny(["docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "github actions"])
        ? `Cloud infrastructure or containerization referenced in profile.`
        : `Containerization (Docker) and automated CI/CD deployment pipelines are not yet demonstrated in project bullets.`,
      recommendedUpgrade: `Containerize "${primaryProjectName}" with a multi-stage Dockerfile and add a GitHub Actions CI/CD workflow with health checks.`,
      linkedSkillGaps: findLinkedGaps(["docker", "kubernetes", "aws", "cloud", "ci/cd", "devops", "deploy", "terraform"]),
    },
    {
      dimension: "Testing",
      status: hasAny(["test", "jest", "vitest", "cypress", "playwright", "junit", "pytest", "tdd"])
        ? "STRONG"
        : "GAP",
      currentEvidence: hasAny(["test", "jest", "vitest", "cypress", "playwright", "junit", "pytest"])
        ? `Automated testing tools referenced in resume.`
        : `Automated unit, integration, and API contract test coverage is not yet quantified on the resume.`,
      recommendedUpgrade: `Add automated unit and API integration tests to "${primaryProjectName}" and report test coverage in your project description.`,
      linkedSkillGaps: findLinkedGaps(["test", "jest", "vitest", "cypress", "playwright", "qa", "tdd", "quality"]),
    },
    {
      dimension: "Security",
      status: hasAny(["security", "rls", "owasp", "encryption", "oauth", "jwt", "iam", "firestore"])
        ? "OPPORTUNITY"
        : "GAP",
      currentEvidence: hasAny(["security", "rls", "owasp", "encryption", "oauth", "jwt"])
        ? `Foundational auth/security controls present; can be deepened with explicit security policies.`
        : `Database Row-Level Security (RLS), rate limiting, and OWASP input sanitization are not yet highlighted.`,
      recommendedUpgrade: `Implement Row-Level Security (RLS) / Firestore security rules, API rate limiting, and strict payload sanitization in "${primaryProjectName}".`,
      linkedSkillGaps: findLinkedGaps(["security", "rls", "owasp", "auth", "encryption", "iam", "compliance"]),
    },
  ];

  return dimensions;
}

/**
 * Generates the comprehensive Skill Gap Report, 8-point learning paths, existing project architecture map,
 * and prioritized "Recommended Project Tasks".
 */
export function buildComprehensiveSkillGapReport(
  analysis: AnalysisRecord
): ComprehensiveSkillGapReport {
  const resume = analysis.parsedResume || {
    personalInfo: {},
    education: [],
    certifications: [],
    skills: [],
    projects: [],
    experience: [],
    academicAchievements: [],
  };
  const job = analysis.parsedJob || {
    jobTitle: "Target Role",
    responsibilities: [],
    requirements: [],
    criticalSkills: [],
    preferredSkills: [],
  };
  const rawResumeText = analysis.resumeText || "";

  // Identify the candidate's existing project(s) from their resume
  const allProjectNames = (resume.projects || [])
    .map((p) => p.name?.trim())
    .filter((n): n is string => Boolean(n && n.length > 1));

  const primaryProjectName =
    allProjectNames[0] ||
    (resume.experience?.[0]?.company
      ? `${resume.experience[0].company} Application Platform`
      : "ResuMate AI / Existing Full-Stack Application");

  const projectTechStack = Array.from(
    new Set([
      ...(resume.projects || []).flatMap((p) => p.technologies || []),
      ...(resume.experience || []).flatMap((e) => e.technologiesUsed || []),
      ...(resume.skills || []).slice(0, 8),
    ])
  ).filter(Boolean);

  const allResumeTextAndSkillsLower = [
    rawResumeText,
    ...(resume.skills || []),
    ...(resume.technicalSkills || []),
    ...(resume.softSkills || []),
    ...(resume.projects || []).map((p) => `${p.name} ${p.description} ${(p.technologies || []).join(" ")}`),
    ...(resume.experience || []).map((e) => `${e.title} ${e.company} ${e.description}`),
  ]
    .join(" ")
    .toLowerCase();

  const allPlans: PersonalizedSkillLearningPlan[] = [];
  const seenSkillKeys = new Set<string>();

  // 1. Process all explicit JD skillMatches with deep resume re-verification
  for (const m of analysis.skillMatches || []) {
    const skillName = m.requirement?.skill?.trim();
    if (!skillName) continue;
    const key = skillName.toLowerCase();
    if (seenSkillKeys.has(key)) continue;
    seenSkillKeys.add(key);

    const verified = deepVerifyResumeEvidence(skillName, m, resume, rawResumeText);
    const importance = m.requirement.importance || "medium";
    const mandatory = Boolean(m.requirement.mandatory);
    const gapTier = determineGapTier(verified.strength, importance, mandatory);

    const plan = generateDetailedPlanForSkill({
      skillName,
      category: m.requirement.category || "Role Requirement",
      gapTier,
      importance,
      mandatory,
      strength: verified.strength,
      evidenceText: verified.evidenceText,
      evidenceSection: verified.section,
      jobTitle: job.jobTitle,
      primaryProjectName,
      projectTechStack,
    });

    allPlans.push(plan);
  }

  // 2. Also check if any skills in `parsedResume.skills` match the role domain or can be surfaced under "Skills to Strengthen"
  // so the user sees a complete picture of their existing strengths & skills to elevate.
  const hasStrengthenItems = allPlans.some((p) => p.gapTier === "STRENGTHEN");
  if (!hasStrengthenItems) {
    // Promote HIGH-evidence matched skills on critical/high requirements or skills listed in resume to also show how to strengthen them if needed
    for (const p of allPlans) {
      if (
        p.gapTier === "MATCHED" &&
        p.evidenceStrength === "HIGH" &&
        (p.importance === "critical" || p.importance === "high")
      ) {
        // Create a companion "Strengthen" entry for production scale & metrics if we have fewer than 2 strengthen items
        const strengthenCount = allPlans.filter((x) => x.gapTier === "STRENGTHEN").length;
        if (strengthenCount < 2) {
          p.gapTier = "STRENGTHEN";
        }
      }
    }
  }

  // 3. Ensure important Soft Skills / Professional Competencies implied by the target role are represented
  const hasSoftCompetency = allPlans.some((p) => p.isSoftOrCompetency);
  if (!hasSoftCompetency) {
    const impliedSoftCompetencies = [
      {
        name: "Technical Architecture Communication & Documentation",
        category: "Professional Competency",
      },
      {
        name: "Cross-Functional Agile Delivery & Code Review Ownership",
        category: "Soft Skill & Engineering Leadership",
      },
    ];
    for (const sc of impliedSoftCompetencies) {
      const key = sc.name.toLowerCase();
      if (!seenSkillKeys.has(key)) {
        seenSkillKeys.add(key);
        const verified = deepVerifyResumeEvidence(sc.name, undefined, resume, rawResumeText);
        const tier: GapTier =
          verified.strength === "VERY_HIGH" || verified.strength === "HIGH"
            ? "MATCHED"
            : "STRENGTHEN";
        allPlans.push(
          generateDetailedPlanForSkill({
            skillName: sc.name,
            category: sc.category,
            gapTier: tier,
            importance: "high",
            mandatory: false,
            strength: verified.strength === "NONE" ? "MODERATE" : verified.strength,
            evidenceText:
              verified.evidenceText ||
              `Implied competency for ${job.jobTitle}; can be demonstrated more explicitly via quantified collaboration and architecture documentation bullets.`,
            evidenceSection: verified.section || "Experience & Projects",
            jobTitle: job.jobTitle,
            primaryProjectName,
            projectTechStack,
          })
        );
      }
    }
  }

  const missingSkills = allPlans.filter((p) => p.gapTier === "MISSING");
  const weakSkills = allPlans.filter((p) => p.gapTier === "WEAK");
  const skillsToStrengthen = allPlans.filter((p) => p.gapTier === "STRENGTHEN");
  const matchedSkills = allPlans.filter((p) => p.gapTier === "MATCHED");
  const softAndProfessionalCompetencies = allPlans.filter((p) => p.isSoftOrCompetency);

  // Also include additional verified resume skills in matchedSkills if `matchedSkills` is small, so the user sees all relevant skills they already have
  if (matchedSkills.length < 4 && (resume.skills || []).length > 0) {
    for (const rSkill of (resume.skills || []).slice(0, 8)) {
      const key = rSkill.toLowerCase().trim();
      if (!seenSkillKeys.has(key)) {
        seenSkillKeys.add(key);
        const verified = deepVerifyResumeEvidence(rSkill, undefined, resume, rawResumeText);
        if (verified.strength !== "NONE") {
          matchedSkills.push(
            generateDetailedPlanForSkill({
              skillName: rSkill,
              category: "Verified Resume Skill",
              gapTier: "MATCHED",
              importance: "medium",
              mandatory: false,
              strength: verified.strength,
              evidenceText: verified.evidenceText,
              evidenceSection: verified.section,
              jobTitle: job.jobTitle,
              primaryProjectName,
              projectTechStack,
            })
          );
        }
      }
    }
  }

  // 4. Build the 12-dimension Existing Project & Application Architecture analysis
  const actionableGapPlans = [...missingSkills, ...weakSkills, ...skillsToStrengthen];
  const architectureDimensions = buildProjectArchitectureAnalysis(
    resume,
    primaryProjectName,
    allResumeTextAndSkillsLower,
    actionableGapPlans
  );

  // 5. Build the prioritized "Recommended Project Tasks" section
  const recommendedProjectTasks: RecommendedProjectTask[] = [];
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, "nice-to-have": 3 };
  const sortedActionable = [...actionableGapPlans].sort(
    (a, b) => (priorityOrder[a.importance] ?? 2) - (priorityOrder[b.importance] ?? 2)
  );

  for (let i = 0; i < sortedActionable.length; i++) {
    const plan = sortedActionable[i];
    const targetProject =
      allProjectNames[i % Math.max(1, allProjectNames.length)] || primaryProjectName;

    const priority: RecommendedProjectTask["priority"] =
      plan.importance === "critical" || plan.mandatory
        ? "CRITICAL"
        : plan.importance === "high" || plan.gapTier === "MISSING"
        ? "HIGH"
        : "MEDIUM";

    recommendedProjectTasks.push({
      id: `proj-task-${i + 1}-${plan.skillName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: plan.miniProjectTitle.replace(primaryProjectName, targetProject),
      skillGapClosed: plan.skillName,
      secondarySkillsClosed: plan.topicsToStudy.slice(0, 2),
      priority,
      targetProjectName: targetProject,
      architecturalLayer: plan.existingProjectConnection.architecturalDimension,
      estimatedHours: priority === "CRITICAL" ? 8 : priority === "HIGH" ? 6 : 4,
      projectTask: plan.existingProjectConnection.projectTask.replace(
        primaryProjectName,
        targetProject
      ),
      implementationSteps: plan.learningStages.map(
        (st) => `${st.stageLabel}: ${st.milestoneDeliverable}`
      ),
      resultSummary: plan.existingProjectConnection.resultAndImpact.replace(
        primaryProjectName,
        targetProject
      ),
      resumeEvidenceBullet: plan.sampleResumeBullet.replace(primaryProjectName, targetProject),
    });
  }

  // Ensure we always have high-impact full-stack Recommended Project Tasks even if the JD had very few explicit gaps
  if (recommendedProjectTasks.length < 3) {
    const supplementalTasks: RecommendedProjectTask[] = [
      {
        id: "proj-task-supplemental-rls-security",
        title: `Database Security & Row-Level Access Rules in ${primaryProjectName}`,
        skillGapClosed: "Database Security & Access Control",
        secondarySkillsClosed: ["Firestore / Supabase Security Rules", "Zero-Trust Authorization"],
        priority: "HIGH",
        targetProjectName: primaryProjectName,
        architecturalLayer: "Database & Security",
        estimatedHours: 5,
        projectTask: `Implement strict Row-Level Security (RLS) / Firestore ownership rules and server-side Bearer token verification in "${primaryProjectName}".`,
        implementationSteps: [
          "Foundational Concepts: Audit all collections/tables and define per-user ownership invariants.",
          "Practical Implementation: Enforce `request.auth.uid == resource.data.userId` rules and schema validation.",
          "Advanced Concepts: Add rate-limiting middleware and automated unauthorized-access regression tests.",
          `Real-World Project: Deploy hardened security rules to "${primaryProjectName}" and document the security model.`,
        ],
        resultSummary: `You master production database security while protecting "${primaryProjectName}" against unauthorized cross-tenant access.`,
        resumeEvidenceBullet: `Hardened data security in ${primaryProjectName} by implementing strict Row-Level Security (RLS) policies, schema validation, and authenticated API guards to enforce zero-trust tenant isolation.`,
      },
      {
        id: "proj-task-supplemental-rest-api-testing",
        title: `Production REST API Validation & Integration Test Suite for ${primaryProjectName}`,
        skillGapClosed: "REST API Architecture & Automated Testing",
        secondarySkillsClosed: ["Schema Validation", "CI/CD Quality Gates"],
        priority: "HIGH",
        targetProjectName: primaryProjectName,
        architecturalLayer: "APIs, Backend & Testing",
        estimatedHours: 6,
        projectTask: `Add request payload validation, structured HTTP error envelopes, and automated integration tests to "${primaryProjectName}".`,
        implementationSteps: [
          "Foundational Concepts: Define strict request/response TypeScript schemas for all API endpoints.",
          "Practical Implementation: Add validation middleware and centralized error normalization.",
          "Advanced Concepts: Write automated integration tests covering 200, 400, 401, and 500 scenarios.",
          `Real-World Project: Wire the test suite into a GitHub Actions CI workflow for "${primaryProjectName}".`,
        ],
        resultSummary: `Closes API reliability and testing gaps while upgrading "${primaryProjectName}" with verifiable CI test metrics.`,
        resumeEvidenceBullet: `Engineered a validated REST API and automated integration test suite for ${primaryProjectName}, enforcing strict payload schemas and CI quality gates across core endpoints.`,
      },
    ];
    for (const supp of supplementalTasks) {
      if (recommendedProjectTasks.length < 4) {
        recommendedProjectTasks.push(supp);
      }
    }
  }

  return {
    targetRole: job.jobTitle,
    companyName: job.company,
    primaryProjectName,
    allProjectNames: allProjectNames.length > 0 ? allProjectNames : [primaryProjectName],
    matchedSkills,
    missingSkills,
    weakSkills,
    skillsToStrengthen,
    softAndProfessionalCompetencies,
    architectureDimensions,
    recommendedProjectTasks,
  };
}
