export interface SkillDefinition {
  canonicalName: string;
  category: string;
  aliases: string[];
  parentGroup?: string;
  relatedSkills: string[];
}

export const CANONICAL_SKILL_DATABASE: SkillDefinition[] = [
  // Backend & Languages
  {
    canonicalName: "Java",
    category: "Programming Language",
    aliases: ["java", "core java", "java se", "java ee", "java 8", "java 11", "java 17", "java 21"],
    relatedSkills: ["Kotlin", "Scala", "Spring Boot", "JVM"]
  },
  {
    canonicalName: "Spring Boot",
    category: "Backend Framework",
    aliases: ["springboot", "spring-boot", "spring boot 2", "spring boot 3"],
    parentGroup: "Spring Ecosystem",
    relatedSkills: ["Spring Framework", "Spring Security", "Spring Data JPA", "Java", "Hibernate"]
  },
  {
    canonicalName: "Spring Framework",
    category: "Backend Framework",
    aliases: ["spring", "spring mvc", "spring core"],
    parentGroup: "Spring Ecosystem",
    relatedSkills: ["Spring Boot", "Java", "Hibernate"]
  },
  {
    canonicalName: "Python",
    category: "Programming Language",
    aliases: ["python", "python3", "python 3", "py"],
    relatedSkills: ["FastAPI", "Django", "Flask", "Pandas", "PyTorch"]
  },
  {
    canonicalName: "FastAPI",
    category: "Backend Framework",
    aliases: ["fastapi", "fast-api"],
    relatedSkills: ["Python", "Pydantic", "Starlette", "REST API", "Uvicorn"]
  },
  {
    canonicalName: "Node.js",
    category: "Runtime / Backend",
    aliases: ["nodejs", "node", "node.js"],
    relatedSkills: ["Express.js", "TypeScript", "JavaScript", "NestJS"]
  },
  {
    canonicalName: "TypeScript",
    category: "Programming Language",
    aliases: ["typescript", "ts"],
    relatedSkills: ["JavaScript", "React", "Node.js", "Next.js"]
  },
  {
    canonicalName: "JavaScript",
    category: "Programming Language",
    aliases: ["javascript", "js", "ecmascript", "es6", "esnext"],
    relatedSkills: ["TypeScript", "React", "Node.js"]
  },
  {
    canonicalName: "Go",
    category: "Programming Language",
    aliases: ["golang", "go language"],
    relatedSkills: ["Docker", "Kubernetes", "gRPC", "Microservices"]
  },

  // Frontend
  {
    canonicalName: "React",
    category: "Frontend Framework",
    aliases: ["reactjs", "react.js", "react"],
    relatedSkills: ["Next.js", "TypeScript", "JavaScript", "Redux", "Tailwind CSS"]
  },
  {
    canonicalName: "Next.js",
    category: "Frontend Framework",
    aliases: ["nextjs", "next.js", "next 13", "next 14", "next 15"],
    relatedSkills: ["React", "TypeScript", "SSR", "Vercel"]
  },
  {
    canonicalName: "Tailwind CSS",
    category: "UI Styling",
    aliases: ["tailwindcss", "tailwind", "tailwind-css"],
    relatedSkills: ["CSS3", "HTML5", "Responsive Design"]
  },

  // Databases & Storage
  {
    canonicalName: "PostgreSQL",
    category: "Relational Database",
    aliases: ["postgres", "postgresql", "psql", "pg"],
    parentGroup: "Relational Database",
    relatedSkills: ["SQL", "MySQL", "Database Indexing", "pgvector", "Hibernate"]
  },
  {
    canonicalName: "MySQL",
    category: "Relational Database",
    aliases: ["mysql", "mariadb"],
    parentGroup: "Relational Database",
    relatedSkills: ["SQL", "PostgreSQL", "Database Design"]
  },
  {
    canonicalName: "MongoDB",
    category: "NoSQL Database",
    aliases: ["mongo", "mongodb", "documentdb"],
    relatedSkills: ["NoSQL", "Mongoose", "Database Modeling"]
  },
  {
    canonicalName: "Redis",
    category: "Cache / In-Memory",
    aliases: ["redis", "redis cache", "valkey"],
    relatedSkills: ["Caching", "Message Broker", "PubSub"]
  },
  {
    canonicalName: "Vector Search / pgvector",
    category: "AI & Search",
    aliases: ["pgvector", "vector search", "vector embeddings", "vector database", "pinecone", "chroma"],
    relatedSkills: ["Embeddings", "PostgreSQL", "RAG", "LLMs"]
  },

  // Cloud & DevOps
  {
    canonicalName: "AWS",
    category: "Cloud Platform",
    aliases: ["amazon web services", "aws", "ec2", "s3", "lambda", "ecs"],
    relatedSkills: ["Cloud Computing", "GCP", "Docker", "Terraform"]
  },
  {
    canonicalName: "GCP",
    category: "Cloud Platform",
    aliases: ["google cloud", "gcp", "google cloud platform", "cloud run", "gke"],
    relatedSkills: ["Cloud Computing", "AWS", "Docker", "Kubernetes"]
  },
  {
    canonicalName: "Docker",
    category: "Containerization",
    aliases: ["docker", "container", "containers", "dockerfile", "docker-compose"],
    relatedSkills: ["Kubernetes", "CI/CD", "DevOps", "Microservices"]
  },
  {
    canonicalName: "Kubernetes",
    category: "Orchestration",
    aliases: ["k8s", "kubernetes", "helm"],
    relatedSkills: ["Docker", "DevOps", "Cloud Computing"]
  },
  {
    canonicalName: "CI/CD",
    category: "DevOps",
    aliases: ["cicd", "continuous integration", "github actions", "gitlab ci", "jenkins"],
    relatedSkills: ["Git", "Docker", "DevOps"]
  },
  {
    canonicalName: "Git",
    category: "Version Control",
    aliases: ["git", "github", "gitlab", "bitbucket"],
    relatedSkills: ["CI/CD", "Software Engineering"]
  },

  // Architecture & Practices
  {
    canonicalName: "REST API",
    category: "Architecture",
    aliases: ["rest", "restful", "restful api", "rest api design", "web api"],
    relatedSkills: ["HTTP", "GraphQL", "gRPC", "API Security", "OpenAPI"]
  },
  {
    canonicalName: "Microservices",
    category: "Architecture",
    aliases: ["microservice", "microservices architecture", "distributed systems"],
    relatedSkills: ["REST API", "Docker", "Kubernetes", "Kafka", "RabbitMQ"]
  },
  {
    canonicalName: "System Design",
    category: "Architecture",
    aliases: ["system architecture", "software architecture", "scalability", "high availability"],
    relatedSkills: ["Microservices", "Caching", "Load Balancing", "Databases"]
  },

  // AI & Machine Learning
  {
    canonicalName: "LLM & Generative AI",
    category: "AI & ML",
    aliases: ["llm", "large language models", "generative ai", "genai", "prompt engineering", "claude", "gemini", "gpt"],
    relatedSkills: ["RAG", "LangChain", "LangGraph", "Python", "Vector Search"]
  },
  {
    canonicalName: "LangGraph / LangChain",
    category: "AI Framework",
    aliases: ["langgraph", "langchain", "agent orchestration", "ai agents"],
    relatedSkills: ["LLM & Generative AI", "Python", "Vector Search"]
  },

  // Growth, Marketing & Commercial
  {
    canonicalName: "Google Ads",
    category: "Performance Marketing",
    aliases: ["google ads", "google adwords", "adwords", "sem", "paid search", "google ads campaigns", "ppc"],
    relatedSkills: ["LinkedIn Ads", "Google Analytics", "Conversion Rate Optimization", "CAC Optimization"]
  },
  {
    canonicalName: "LinkedIn Ads",
    category: "Performance Marketing",
    aliases: ["linkedin ads", "linkedin advertising", "sponsored updates", "b2b paid social", "paid advertising"],
    relatedSkills: ["Google Ads", "HubSpot", "B2B Lead Generation"]
  },
  {
    canonicalName: "HubSpot",
    category: "CRM & Marketing Automation",
    aliases: ["hubspot", "hubspot crm", "hubspot marketing hub", "marketing automation workflows", "marketing automation"],
    relatedSkills: ["Salesforce", "Customer Acquisition Cost", "Email Marketing"]
  },
  {
    canonicalName: "Google Analytics & GTM",
    category: "Web & Product Analytics",
    aliases: ["google analytics", "google analytics 4", "ga4", "tag manager", "google tag manager", "gtm"],
    relatedSkills: ["Conversion Rate Optimization", "Looker / Tableau", "SQL"]
  },
  {
    canonicalName: "Conversion Rate Optimization (CRO)",
    category: "Growth & Experimentation",
    aliases: ["conversion rate optimization", "cro", "a/b testing", "ab testing", "multivariate testing", "landing page optimization", "cro tests"],
    relatedSkills: ["Google Analytics & GTM", "Customer Acquisition Cost", "Growth Marketing"]
  },
  {
    canonicalName: "Customer Acquisition Cost (CAC)",
    category: "Growth & Performance Metrics",
    aliases: ["customer acquisition cost", "cac", "reducing customer acquisition cost", "cac reduction", "roas", "ltv/cac", "paid acquisition budget"],
    relatedSkills: ["Conversion Rate Optimization (CRO)", "Google Ads", "LinkedIn Ads"]
  },
  {
    canonicalName: "Growth Marketing",
    category: "Growth & Marketing",
    aliases: ["growth marketing", "performance marketing", "digital acquisition", "multi-channel digital acquisition", "growth strategy"],
    relatedSkills: ["Google Ads", "Conversion Rate Optimization (CRO)", "HubSpot"]
  },

  // Product Management & Operations
  {
    canonicalName: "Product Management",
    category: "Product Strategy",
    aliases: ["product management", "product strategy", "product roadmap", "prd", "product requirements", "feature prioritization"],
    relatedSkills: ["Agile / Scrum", "User Research", "Metrics & OKRs"]
  },
  {
    canonicalName: "Agile & Scrum Methodology",
    category: "Product & Project Delivery",
    aliases: ["agile", "scrum", "agile / scrum", "agile methodologies", "sprint planning", "backlog grooming", "sprint backlog", "sprint reviews", "user story mapping"],
    relatedSkills: ["Product Management", "Jira", "Stakeholder Management"]
  },
  {
    canonicalName: "User Research & Product Analytics",
    category: "Product Strategy",
    aliases: ["user research", "customer discovery", "amplitude", "mixpanel", "qualitative feedback", "product metrics", "a/b testing", "retention metrics"],
    relatedSkills: ["Product Management", "Conversion Rate Optimization (CRO)", "Google Analytics & GTM"]
  },
  {
    canonicalName: "Stakeholder Management & Leadership",
    category: "Business Leadership",
    aliases: ["stakeholder management", "cross-functional leadership", "executive reporting", "cross-functional collaboration", "stakeholder communication"],
    relatedSkills: ["Product Management", "Agile & Scrum Methodology"]
  },
  {
    canonicalName: "Business Intelligence & SQL",
    category: "Data & Analytics",
    aliases: ["sql", "bi dashboarding", "bi dashboarding tools", "looker", "tableau", "looker/tableau", "power bi", "data analysis"],
    relatedSkills: ["Google Analytics & GTM", "PostgreSQL", "Analytics"]
  },
  {
    canonicalName: "Full Lifecycle Recruiting",
    category: "HR & Talent Operations",
    aliases: ["full lifecycle recruiting", "full-cycle recruiting", "talent acquisition", "technical recruiting", "candidate sourcing", "interview assessment", "time-to-hire"],
    relatedSkills: ["ATS Platforms (Greenhouse/Lever)", "HR Operations & Compliance", "Employer Branding"]
  },
  {
    canonicalName: "ATS Platforms (Greenhouse/Lever)",
    category: "HR & Talent Operations",
    aliases: ["ats", "ats platforms", "applicant tracking systems", "greenhouse", "lever", "workday", "bamboohr", "candidate pipeline"],
    relatedSkills: ["Full Lifecycle Recruiting", "HR Operations & Compliance"]
  },
  {
    canonicalName: "HR Operations & Compliance",
    category: "HR & Talent Operations",
    aliases: ["hr operations", "people operations", "employee onboarding", "performance management", "diversity & inclusion", "dei", "hr compliance", "adp workforce now"],
    relatedSkills: ["Full Lifecycle Recruiting", "ATS Platforms (Greenhouse/Lever)"]
  },
  {
    canonicalName: "B2B Sales & Pipeline Management",
    category: "Sales & Revenue",
    aliases: ["b2b sales", "enterprise sales", "sales pipeline", "lead qualification", "account executive", "deal closing", "crm", "salesforce"],
    relatedSkills: ["Growth Marketing", "Stakeholder Management & Leadership"]
  }
];

export function inferSkillCategory(skillName: string): string {
  const s = skillName.toLowerCase();
  if (s.match(/marketing|seo|sem|ads|campaign|acquisition|funnel|roas|cac|growth|cro|email|social|content/)) return "Growth & Marketing";
  if (s.match(/product|roadmap|prd|scrum|agile|user stor|backlog|feature|okr|sprint/)) return "Product Management";
  if (s.match(/sales|crm|hubspot|salesforce|pipeline|lead|negotiation|account executive|b2b/)) return "Sales & Revenue";
  if (s.match(/hr|recruiting|talent|onboarding|retention|sourcing|ats|hiring|people ops|greenhouse|lever|workday/)) return "HR & Talent Operations";
  if (s.match(/finance|accounting|budget|roi|financial|payroll|billing/)) return "Finance & Operations";
  if (s.match(/design|figma|ui|ux|wireframe|prototype/)) return "UI / UX Design";
  if (s.match(/analytics|data|sql|bi|dashboard|looker|tableau|excel/)) return "Analytics & Data";
  if (s.match(/leadership|communication|management|stakeholder|cross-functional/)) return "Leadership & Strategy";
  if (s.match(/code|engineer|developer|programming|backend|frontend|api|cloud|database|devops|framework|python|java|react|node/)) return "Technical Engineering";
  return "Domain Competency";
}

/**
 * Normalizes a raw skill string to its canonical skill form
 */
export function normalizeSkill(rawSkill: string): { canonical: string; category: string; confidence: number } {
  const clean = rawSkill.trim().toLowerCase();
  
  // Exact alias match
  for (const def of CANONICAL_SKILL_DATABASE) {
    if (def.canonicalName.toLowerCase() === clean) {
      return { canonical: def.canonicalName, category: def.category, confidence: 1.0 };
    }
    for (const alias of def.aliases) {
      if (clean === alias.toLowerCase()) {
        return { canonical: def.canonicalName, category: def.category, confidence: 0.98 };
      }
    }
  }

  // Substring match for compound phrases
  for (const def of CANONICAL_SKILL_DATABASE) {
    for (const alias of def.aliases) {
      if (clean.includes(alias.toLowerCase()) || alias.toLowerCase().includes(clean)) {
        if (clean.length > 3 && alias.length > 3) {
          return { canonical: def.canonicalName, category: def.category, confidence: 0.85 };
        }
      }
    }
  }

  // Additional common technical & domain canonicalizations to prevent duplicates
  const extraCanonicalMap: Record<string, { canonical: string; category: string }> = {
    "ec2": { canonical: "AWS", category: "Cloud Platform" },
    "s3": { canonical: "AWS", category: "Cloud Platform" },
    "cloudwatch": { canonical: "AWS", category: "Cloud Platform" },
    "route53": { canonical: "AWS", category: "Cloud Platform" },
    "aws ecs": { canonical: "AWS", category: "Cloud Platform" },
    "ecs": { canonical: "AWS", category: "Cloud Platform" },
    "rds": { canonical: "AWS", category: "Cloud Platform" },
    "lambda": { canonical: "AWS", category: "Cloud Platform" },
    "apache kafka": { canonical: "Kafka", category: "Data & Messaging" },
    "kafka": { canonical: "Kafka", category: "Data & Messaging" },
    "ci/cd pipelines": { canonical: "CI/CD", category: "DevOps" },
    "ci/cd": { canonical: "CI/CD", category: "DevOps" },
    "github actions": { canonical: "GitHub Actions", category: "DevOps" },
    "terraform": { canonical: "Terraform", category: "Cloud & Infrastructure" },
    "linux": { canonical: "Linux", category: "Systems & OS" },
    "bash": { canonical: "Bash", category: "Programming Language" },
    "dynamodb": { canonical: "DynamoDB", category: "NoSQL Database" },
    "spring data jpa": { canonical: "Spring Data JPA", category: "Backend Framework" },
    "spring security": { canonical: "Spring Security", category: "Backend Framework" },
    "express.js": { canonical: "Express.js", category: "Backend Framework" },
    "express": { canonical: "Express.js", category: "Backend Framework" },
    "junit": { canonical: "JUnit", category: "Testing & QA" },
    "mockito": { canonical: "Mockito", category: "Testing & QA" },
    "prometheus": { canonical: "Prometheus", category: "Observability & SRE" },
    "grafana": { canonical: "Grafana", category: "Observability & SRE" },
  };

  if (extraCanonicalMap[clean]) {
    return {
      canonical: extraCanonicalMap[clean].canonical,
      category: extraCanonicalMap[clean].category,
      confidence: 0.95,
    };
  }

  // Fallback: preserve clean casing for acronyms, title-case normal words
  const capitalized = rawSkill
    .trim()
    .split(/[\s_-]+/)
    .map((w) => {
      if (w.toUpperCase() === w && w.length >= 2 && w.length <= 6) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");

  return { canonical: capitalized, category: inferSkillCategory(clean), confidence: 0.70 };
}

const NON_SKILL_NOISE_PATTERNS = [
  /^(skills|technical skills|listed skills|core skills|soft skills|tools|cloud|languages|frameworks|databases|other|certifications|education|experience|projects|summary|profile|none|n\/a)$/i,
  /\b(years|experience|proven|track record|scaling|managing|proficiency|demonstrated|knowledge of|strong|high-growth|in high-growth)\b/i,
];

/**
 * Splits compound skill lines (e.g. "Cloud: AWS (EC2, S3, CloudWatch, Route53)",
 * "Tools: Docker, Git, CI/CD, GitHub Actions, Linux, Bash, Python",
 * "Listed Skills: Kubernetes, Terraform, Microservices") into clean, atomic,
 * canonically deduplicated skills verified against the resume text.
 */
export function sanitizeAndDeduplicateSkills(
  rawInputs: string[],
  resumeText?: string
): {
  canonicalName: string;
  category: string;
  aliases: string[];
}[] {
  const atomicTokens: string[] = [];

  for (const raw of rawInputs || []) {
    if (!raw || typeof raw !== "string") continue;

    // 1. Split by newlines, bullets, semicolons, pipes
    const lines = raw.split(/[\n;•▪‣|]+/).map((s) => s.trim()).filter(Boolean);

    for (let line of lines) {
      // Strip leading category label before colon, e.g. "Cloud: ", "Tools: ", "Listed Skills: "
      if (line.includes(":")) {
        const parts = line.split(":");
        const prefix = parts[0].trim();
        if (prefix.length < 35) {
          line = parts.slice(1).join(":").trim();
        }
      }

      // Extract parenthetical comma lists like "AWS (EC2, S3, CloudWatch, Route53)"
      // while preserving acronyms like "Conversion Rate Optimization (CRO)"
      line = line.replace(/([A-Za-z0-9.+/#&\s-]+?)\s*\(([^)]+)\)/g, (full, mainPart, innerPart) => {
        const cleanMain = mainPart.trim();
        const cleanInner = innerPart.trim();
        if (cleanInner.includes(",") || cleanInner.includes("/")) {
          // It's a sub-list of tools/services inside parens
          const subItems = cleanInner.split(/[,/]+/).map((s: string) => s.trim()).filter(Boolean);
          return [cleanMain, ...subItems].join(", ");
        }
        // If innerPart is a short acronym (2-5 uppercase chars), keep together
        if (/^[A-Z0-9]{2,5}$/.test(cleanInner)) {
          return `${cleanMain} (${cleanInner})`;
        }
        return `${cleanMain}, ${cleanInner}`;
      });

      // Split by commas
      const commaParts = line.split(",").map((s) => s.trim()).filter(Boolean);
      for (const part of commaParts) {
        let cleaned = part
          .replace(/^[-*•▪‣\s]+|[-*•▪‣\s]+$/g, "")
          .replace(/\s+/g, " ")
          .trim();
        // Strip unmatched leading or trailing parenthesis only
        if (cleaned.startsWith("(") && !cleaned.includes(")")) {
          cleaned = cleaned.slice(1).trim();
        }
        if (cleaned.endsWith(")") && !cleaned.includes("(")) {
          cleaned = cleaned.slice(0, -1).trim();
        }

        if (!cleaned || cleaned.length < 2 || cleaned.length > 45) continue;
        if (NON_SKILL_NOISE_PATTERNS.some((re) => re.test(cleaned))) continue;
        // Reject sentence fragments with more than 5 words
        if (cleaned.split(/\s+/).length > 5) continue;

        atomicTokens.push(cleaned);
      }
    }
  }

  const lowerResume = resumeText ? resumeText.toLowerCase() : null;
  const dedupMap = new Map<
    string,
    { canonicalName: string; category: string; aliases: Set<string> }
  >();

  for (const token of atomicTokens) {
    const norm = normalizeSkill(token);
    const canonical = norm.canonical.trim();
    if (!canonical || canonical.length < 2) continue;
    if (NON_SKILL_NOISE_PATTERNS.some((re) => re.test(canonical))) continue;

    // If resumeText is provided, verify that the token, canonical name, alias, or key root words appear in the resume
    if (lowerResume && lowerResume.trim().length > 20) {
      const tokenLower = token.toLowerCase();
      const canonLower = canonical.toLowerCase();
      const def = CANONICAL_SKILL_DATABASE.find(
        (d) => d.canonicalName.toLowerCase() === canonLower
      );
      const sigWords = tokenLower
        .replace(/[()/,&-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !["and", "the", "for", "with"].includes(w));
      const allCheckTerms = [
        tokenLower,
        canonLower,
        ...(def ? def.aliases.map((a) => a.toLowerCase()) : []),
        ...sigWords,
      ];
      const existsInResume = allCheckTerms.some(
        (term) => term.length >= 2 && lowerResume.includes(term)
      );
      if (!existsInResume) continue;
    }

    const key = canonical.toLowerCase();
    // Special deduplication: if "Spring Boot" is already present or added, merge "Spring Framework" into "Spring Boot"
    if (key === "spring framework" && dedupMap.has("spring boot")) {
      dedupMap.get("spring boot")!.aliases.add("Spring Framework");
      continue;
    }
    if (key === "spring boot" && dedupMap.has("spring framework")) {
      const prev = dedupMap.get("spring framework")!;
      dedupMap.delete("spring framework");
      prev.canonicalName = "Spring Boot";
      prev.aliases.add("Spring Framework");
      dedupMap.set("spring boot", prev);
    }

    if (!dedupMap.has(key)) {
      const aliases = new Set<string>();
      if (token.toLowerCase() !== key) {
        aliases.add(token);
      }
      dedupMap.set(key, {
        canonicalName: canonical,
        category: norm.category,
        aliases,
      });
    } else {
      const existing = dedupMap.get(key)!;
      if (token.toLowerCase() !== key) {
        existing.aliases.add(token);
      }
    }
  }

  return Array.from(dedupMap.values()).map((entry) => ({
    canonicalName: entry.canonicalName,
    category: entry.category,
    aliases: Array.from(entry.aliases),
  }));
}

/**
 * Checks if two canonical skills are identical or closely related
 */
export function compareSkills(candidateSkill: string, requiredSkill: string): {
  isMatch: boolean;
  isExact: boolean;
  relationType: 'identical' | 'alias' | 'same_parent_group' | 'related' | 'none';
  matchScore: number;
} {
  const normCand = normalizeSkill(candidateSkill);
  const normReq = normalizeSkill(requiredSkill);

  if (normCand.canonical.toLowerCase() === normReq.canonical.toLowerCase()) {
    return { isMatch: true, isExact: true, relationType: 'identical', matchScore: 1.0 };
  }

  // Check definitions
  const defReq = CANONICAL_SKILL_DATABASE.find(d => d.canonicalName.toLowerCase() === normReq.canonical.toLowerCase());
  const defCand = CANONICAL_SKILL_DATABASE.find(d => d.canonicalName.toLowerCase() === normCand.canonical.toLowerCase());

  if (defReq && defCand) {
    // Check if one is an alias of the other
    if (defReq.aliases.includes(normCand.canonical.toLowerCase())) {
      return { isMatch: true, isExact: true, relationType: 'alias', matchScore: 0.95 };
    }

    // Check parent group: e.g. "Relational Database"
    // Per user rules: MySQL and PostgreSQL share parent group, but candidate knowing MySQL does NOT automatically get PostgreSQL!
    if (defReq.parentGroup && defReq.parentGroup === defCand.parentGroup) {
      // Related ecosystem
      return { isMatch: false, isExact: false, relationType: 'same_parent_group', matchScore: 0.4 };
    }

    // Check related skills list
    if (defReq.relatedSkills.some(r => r.toLowerCase() === normCand.canonical.toLowerCase())) {
      return { isMatch: false, isExact: false, relationType: 'related', matchScore: 0.35 };
    }
  }

  return { isMatch: false, isExact: false, relationType: 'none', matchScore: 0.0 };
}
