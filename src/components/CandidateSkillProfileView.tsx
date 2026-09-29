import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  Compass,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnalysisRecord, CanonicalSkillRecord, CandidateSkillProfile } from "../types.js";
import { api, getStoredGuestAnalysisId } from "../lib/api.js";

interface CandidateSkillProfileViewProps {
  profile: CandidateSkillProfile | null;
  currentAnalysis?: AnalysisRecord | null;
  userAnalyses?: AnalysisRecord[];
  onBackToDashboard: () => void;
  onSelectAnalysis?: (analysis: AnalysisRecord) => void;
  onNavigateToAnalyze?: () => void;
}

export interface PentagonAxisId {
  id: "core_code" | "frameworks_apis" | "data_ai" | "cloud_devops" | "delivery_domain";
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  badgeClass: string;
}

const PENTAGON_AXES: PentagonAxisId[] = [
  {
    id: "core_code",
    label: "Core Programming & Foundations",
    shortLabel: "Core Languages & CS",
    description: "Programming languages, data structures, algorithms, OOP, and core engineering foundations.",
    color: "#4f46e5",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    id: "frameworks_apis",
    label: "Frameworks, Web & Platforms",
    shortLabel: "Frameworks & Platforms",
    description: "Application frameworks, frontend/backend libraries, REST/GraphQL APIs, and enterprise platforms.",
    color: "#0284c7",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    id: "data_ai",
    label: "Databases, Data & Analytics",
    shortLabel: "Data, SQL & AI",
    description: "Relational/NoSQL databases, data modeling, BI analytics, machine learning, and data pipelines.",
    color: "#059669",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "cloud_devops",
    label: "Cloud, DevOps & Infrastructure",
    shortLabel: "Cloud & DevOps",
    description: "Cloud platforms (AWS/GCP/Azure), containers, CI/CD automation, Linux, and system reliability.",
    color: "#d97706",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    id: "delivery_domain",
    label: "Product, Delivery & Domain Execution",
    shortLabel: "Delivery & Strategy",
    description: "Agile/Scrum delivery, version control, QA testing, product strategy, operations, and leadership.",
    color: "#7c3aed",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

const CATEGORY_PREFIX_REGEX =
  /^(?:programming\s+languages?|languages?\s*(?:&\s*core)?|frontend\s*(?:technologies|development|frameworks)?|backend\s*(?:technologies|development|frameworks)?|web\s+technologies|databases?\s*(?:&\s*storage)?|cloud\s*(?:&\s*devops|platforms?|technologies)?|devops\s*(?:&\s*cloud|tools)?|tools?\s*(?:&\s*platforms|&\s*technologies|&\s*ide)?|frameworks?\s*(?:&\s*libraries)?|libraries\s*(?:&\s*frameworks)?|core\s+competencies(?:\s*&\s*skills)?|technical\s+skills?|listed\s+skills?|soft\s+skills?|other\s+skills?|methodologies|testing\s*(?:&\s*qa)?|operating\s+systems?|version\s+control|data\s+science|machine\s+learning|ai\s*&\s*ml|mobile\s+development|security|networking|analytics|certifications?)\s*[:\-–—]\s*/i;

const NOISE_WORDS = new Set([
  "etc",
  "etc.",
  "and",
  "or",
  "skills",
  "technical skills",
  "listed skills",
  "core skills",
  "proficient in",
  "experience with",
  "knowledge of",
  "familiar with",
  "working knowledge",
  "good understanding",
  "strong",
  "basic",
  "intermediate",
  "advanced",
  "none",
  "n/a",
]);

const SENTENCE_NOISE_REGEX =
  /\b(years|proven|track record|scaling|managing|proficiency in|demonstrated|extensive production|hands-on experience|strong knowledge)\b/i;

function expandAtomicSkillTokens(raw: string): string[] {
  if (!raw || typeof raw !== "string") return [];
  let text = raw.replace(/[\u2022\u2023\u25E6\u2043\u2219•●▪▸▹►]/g, ",").trim();
  if (!text) return [];

  const lines = text.split(/[\r\n;|]+/);
  const tokens: string[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    line = line.replace(CATEGORY_PREFIX_REGEX, "").trim();
    line = line.replace(/^[A-Za-z][A-Za-z0-9\s/&]{1,28}:\s+/, "").trim();

    let current = "";
    let depth = 0;
    const chunks: string[] = [];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);

      if (ch === "," && depth === 0) {
        chunks.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    for (let chunk of chunks) {
      chunk = chunk.replace(CATEGORY_PREFIX_REGEX, "").trim();
      if (!chunk) continue;

      // Split "X or Y" like "Greenhouse or Lever ATS" or "BambooHR or Workday"
      if (/\s+or\s+/i.test(chunk) && chunk.split(/\s+/).length <= 5) {
        const orParts = chunk
          .replace(/\s+ATS$/i, "")
          .split(/\s+or\s+/i)
          .map((s) => s.trim())
          .filter(Boolean);
        if (orParts.length > 1) {
          tokens.push(...orParts);
          continue;
        }
      }

      const parenMatch = chunk.match(/^([^(]+)\(([^)]+)\)$/);
      if (parenMatch) {
        const outer = parenMatch[1].trim().replace(/[:\-–—]+$/, "").trim();
        const inner = parenMatch[2].trim();
        // If inner is a short acronym like (CRO), (AWS), (GCP), (GA4), (CSPO), keep together
        if (/^[A-Z0-9-]{2,6}$/.test(inner)) {
          tokens.push(`${outer} (${inner})`);
        } else {
          if (outer && !NOISE_WORDS.has(outer.toLowerCase())) {
            tokens.push(outer);
          }
          const innerParts = inner
            .split(/[,/&]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          for (const ip of innerParts) {
            if (ip && !NOISE_WORDS.has(ip.toLowerCase())) {
              tokens.push(ip);
            }
          }
        }
      } else {
        tokens.push(chunk);
      }
    }
  }

  return tokens
    .map((t) =>
      t
        .replace(/^[\s\-–—•*:.,;[\]]+|[\s\-–—•*:.,;[\]]+$/g, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((t) => {
      if (!t || t.length < 2 || t.length > 45) return false;
      const lower = t.toLowerCase();
      if (NOISE_WORDS.has(lower)) return false;
      if (SENTENCE_NOISE_REGEX.test(lower)) return false;
      if (/^\d+$/.test(t)) return false;
      if (t.includes(":")) return false;
      if (t.split(/\s+/).length > 5) return false;
      return true;
    });
}

function canonicalDedupeKey(name: string): string {
  const lower = name.toLowerCase().trim();
  const aliasMap: Record<string, string> = {
    js: "javascript",
    es6: "javascript",
    "ecmascript 6": "javascript",
    ts: "typescript",
    py: "python",
    python3: "python",
    reactjs: "react",
    "react.js": "react",
    nodejs: "node.js",
    node: "node.js",
    expressjs: "express.js",
    express: "express.js",
    nextjs: "next.js",
    vuejs: "vue.js",
    vue: "vue.js",
    angularjs: "angular",
    springboot: "spring boot",
    "spring framework": "spring boot",
    postgres: "postgresql",
    mongo: "mongodb",
    k8s: "kubernetes",
    aws: "aws",
    "amazon web services": "aws",
    "amazon web services (aws)": "aws",
    gcp: "google cloud platform",
    "google cloud": "google cloud platform",
    "google cloud platform (gcp)": "google cloud platform",
    rest: "rest apis",
    "restful api": "rest apis",
    "rest api": "rest apis",
    "restful apis": "rest apis",
    html5: "html5",
    html: "html5",
    css3: "css3",
    css: "css3",
    tailwindcss: "tailwind css",
    tailwind: "tailwind css",
    oop: "object-oriented programming",
    dsa: "data structures & algorithms",
    "data structures": "data structures & algorithms",
    algorithms: "data structures & algorithms",
    "full-lifecycle recruitment": "full lifecycle recruiting",
    "full lifecycle recruitment": "full lifecycle recruiting",
    "human resources operations": "hr operations & compliance",
    "hr compliance": "hr operations & compliance",
    "stakeholder management": "stakeholder management",
    "stakeholder management & leadership": "stakeholder management",
    "agile / scrum methodology": "agile & scrum methodology",
    "agile/scrum": "agile & scrum methodology",
    "conversion rate optimization": "conversion rate optimization (cro)",
    "conversion rate optimization (cro": "conversion rate optimization (cro)",
    cro: "conversion rate optimization (cro)",
    "google analytics": "google analytics & ga4",
    "google analytics 4": "google analytics & ga4",
    "google analytics 4 (ga4)": "google analytics & ga4",
    "google analytics & gtm": "google analytics & ga4",
    "hubspot crm": "hubspot",
  };
  return aliasMap[lower] || lower.replace(/[.\-_]/g, " ").replace(/\s+/g, " ").trim();
}

function classifySkillToPentagonAxis(
  skillName: string,
  category?: string
): PentagonAxisId["id"] {
  const s = skillName.toLowerCase();
  const c = (category || "").toLowerCase();

  // 1. Core Programming & Foundations
  if (
    /\b(java|python|javascript|typescript|c\+\+|c#|golang|\bgo\b|rust|ruby|php|kotlin|swift|scala|\bc\b|dart|bash|shell|powershell|oop|object-oriented|data structures|algorithms|dsa|multithreading|concurrency|collections|problem solving|computer science)\b/i.test(
      s
    ) ||
    c.includes("programming") ||
    c.includes("language") ||
    c.includes("cs fundamentals")
  ) {
    return "core_code";
  }

  // 2. Databases, Data & Analytics
  if (
    /\b(sql|mysql|postgresql|postgres|mongodb|redis|oracle|sqlite|cassandra|dynamodb|mariadb|snowflake|bigquery|elasticsearch|neo4j|database|dbms|jdbc|pl\/sql|nosql|machine learning|deep learning|data science|pandas|numpy|scikit|tensorflow|pytorch|keras|nlp|llm|generative ai|openai|tableau|power bi|looker|excel|etl|spark|hadoop|kafka|airflow|data analysis|data visualization|statistics|analytics|amplitude|mixpanel|google analytics|ga4|tag manager|gtm|business intelligence|conversion rate|cro|a\/b testing)\b/i.test(
      s
    ) ||
    c.includes("database") ||
    c.includes("data") ||
    c.includes("ai") ||
    c.includes("machine learning") ||
    c.includes("analytics")
  ) {
    return "data_ai";
  }

  // 3. Cloud, DevOps & Infrastructure
  if (
    /\b(aws|amazon web services|ec2|s3|lambda|cloudwatch|route53|ecs|rds|iam|vpc|azure|gcp|google cloud|docker|kubernetes|k8s|jenkins|github actions|gitlab ci|ci\/cd|terraform|ansible|linux|unix|nginx|apache|helm|prometheus|grafana|datadog|cloud|devops|serverless|networking|security|cybersecurity|oauth|jwt)\b/i.test(
      s
    ) ||
    c.includes("cloud") ||
    c.includes("devops") ||
    c.includes("infrastructure") ||
    c.includes("security") ||
    c.includes("observability")
  ) {
    return "cloud_devops";
  }

  // 4. Frameworks, Web & Platforms
  if (
    /\b(react|angular|vue|next\.js|svelte|html|html5|css|css3|tailwind|bootstrap|sass|redux|webpack|vite|node\.js|express|spring|spring boot|spring mvc|spring data|spring security|hibernate|jpa|django|flask|fastapi|\.net|asp\.net|laravel|rails|graphql|rest|restful|api|soap|grpc|websocket|microservices|servlet|jsp|maven|gradle|npm|flutter|react native|android|ios|figma|hubspot|greenhouse|lever|workday|bamboohr|adp|salesforce|jira|confluence|linkedin recruiter|google ads|linkedin ads)\b/i.test(
      s
    ) ||
    c.includes("frontend") ||
    c.includes("backend") ||
    c.includes("framework") ||
    c.includes("web") ||
    c.includes("api") ||
    c.includes("mobile") ||
    c.includes("design") ||
    c.includes("crm") ||
    c.includes("hr tech")
  ) {
    return "frameworks_apis";
  }

  // 5. Product, Delivery & Domain Execution
  return "delivery_domain";
}

interface RoleTemplate {
  id: string;
  title: string;
  domain: string;
  primaryAxes: PentagonAxisId["id"][];
  coreKeywords: string[];
  secondaryKeywords: string[];
  description: string;
  nextSkillsToLearn: string[];
}

const JOB_ROLE_CATALOG: RoleTemplate[] = [
  {
    id: "java-backend-engineer",
    title: "Java Backend Software Engineer",
    domain: "Backend & Enterprise Engineering",
    primaryAxes: ["core_code", "frameworks_apis", "data_ai"],
    coreKeywords: ["java", "spring boot", "spring", "spring data", "spring security", "hibernate", "jpa", "jdbc", "rest", "sql", "mysql", "postgresql", "microservices", "maven"],
    secondaryKeywords: ["aws", "docker", "git", "junit", "mockito", "kafka", "redis", "multithreading", "oop"],
    description: "Designs and builds scalable Java/Spring Boot backend services, RESTful APIs, and relational database layers.",
    nextSkillsToLearn: ["Docker", "Kubernetes", "Apache Kafka", "System Design"],
  },
  {
    id: "full-stack-engineer",
    title: "Full-Stack Software Engineer",
    domain: "Full-Stack Web Engineering",
    primaryAxes: ["frameworks_apis", "core_code", "data_ai"],
    coreKeywords: ["javascript", "typescript", "react", "node.js", "express", "html5", "css3", "next.js", "angular", "vue.js", "java", "python", "rest"],
    secondaryKeywords: ["mongodb", "postgresql", "mysql", "sql", "tailwind css", "git", "aws", "docker", "graphql", "redux"],
    description: "Develops end-to-end web applications spanning responsive UI components, API gateways, and database persistence.",
    nextSkillsToLearn: ["TypeScript", "Next.js", "Docker", "CI/CD Pipelines"],
  },
  {
    id: "cloud-devops-engineer",
    title: "Cloud & DevOps Infrastructure Engineer",
    domain: "Cloud & Platform Reliability",
    primaryAxes: ["cloud_devops", "core_code", "delivery_domain"],
    coreKeywords: ["aws", "ec2", "s3", "lambda", "cloudwatch", "route53", "ecs", "azure", "gcp", "docker", "kubernetes", "ci/cd", "jenkins", "github actions", "linux", "terraform", "bash"],
    secondaryKeywords: ["python", "git", "ansible", "prometheus", "grafana", "nginx", "microservices"],
    description: "Automates cloud infrastructure, container orchestration, deployment pipelines, and cloud observability.",
    nextSkillsToLearn: ["Terraform", "Kubernetes", "Prometheus & Grafana", "Helm"],
  },
  {
    id: "backend-api-developer",
    title: "Backend & Distributed Systems Engineer",
    domain: "Server-Side & API Engineering",
    primaryAxes: ["core_code", "frameworks_apis", "cloud_devops"],
    coreKeywords: ["python", "java", "node.js", "golang", "c#", "spring boot", "django", "fastapi", "express", "rest", "sql", "postgresql", "mongodb", "redis", "dynamodb", "kafka"],
    secondaryKeywords: ["aws", "docker", "microservices", "git", "linux", "graphql", "junit"],
    description: "Builds high-throughput backend APIs, authentication workflows, database queries, and distributed microservices.",
    nextSkillsToLearn: ["Redis Caching", "System Design", "Docker", "GraphQL"],
  },
  {
    id: "frontend-ui-engineer",
    title: "Frontend Web & UI Engineer",
    domain: "Frontend & UX Engineering",
    primaryAxes: ["frameworks_apis", "core_code", "delivery_domain"],
    coreKeywords: ["javascript", "typescript", "react", "html5", "css3", "tailwind css", "angular", "vue.js", "next.js", "redux", "bootstrap", "figma"],
    secondaryKeywords: ["rest", "graphql", "git", "webpack", "vite", "jest", "responsive design"],
    description: "Crafts interactive, accessible, high-performance frontend user interfaces and state-driven web architectures.",
    nextSkillsToLearn: ["TypeScript", "Next.js", "Playwright / Jest", "Web Performance"],
  },
  {
    id: "data-engineer-db-specialist",
    title: "Data & Database Systems Engineer",
    domain: "Data Engineering & Storage",
    primaryAxes: ["data_ai", "core_code", "cloud_devops"],
    coreKeywords: ["sql", "mysql", "postgresql", "mongodb", "dynamodb", "oracle", "python", "java", "etl", "spark", "kafka", "snowflake", "bigquery", "airflow", "rds"],
    secondaryKeywords: ["aws", "s3", "lambda", "data modeling", "linux", "docker", "redis"],
    description: "Architects relational and NoSQL data schemas, high-efficiency SQL queries, ETL pipelines, and cloud data warehouses.",
    nextSkillsToLearn: ["Apache Spark", "Airflow", "Snowflake", "Data Modeling"],
  },
  {
    id: "ai-ml-data-scientist",
    title: "AI / Machine Learning & Data Scientist",
    domain: "Artificial Intelligence & Data Science",
    primaryAxes: ["data_ai", "core_code", "frameworks_apis"],
    coreKeywords: ["python", "machine learning", "deep learning", "data science", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "nlp", "llm", "sql", "statistics"],
    secondaryKeywords: ["aws", "docker", "fastapi", "flask", "tableau", "power bi", "git"],
    description: "Develops predictive machine learning models, NLP/LLM pipelines, statistical analyses, and intelligent data products.",
    nextSkillsToLearn: ["PyTorch", "MLOps", "Vector Databases", "FastAPI"],
  },
  {
    id: "software-development-engineer",
    title: "Software Development Engineer (SDE)",
    domain: "Core Software Engineering",
    primaryAxes: ["core_code", "frameworks_apis", "delivery_domain"],
    coreKeywords: ["java", "python", "c++", "c#", "javascript", "typescript", "oop", "data structures", "algorithms", "sql", "git", "rest"],
    secondaryKeywords: ["spring boot", "react", "node.js", "aws", "linux", "junit", "agile", "debugging"],
    description: "Applies strong computer science fundamentals, object-oriented design, and clean code practices to build production software.",
    nextSkillsToLearn: ["System Design", "Cloud Deployment (AWS)", "Automated Testing"],
  },
  {
    id: "qa-automation-sdet",
    title: "QA Automation & SDET Engineer",
    domain: "Quality Assurance & Test Engineering",
    primaryAxes: ["delivery_domain", "core_code", "frameworks_apis"],
    coreKeywords: ["selenium", "cypress", "playwright", "junit", "mockito", "testng", "pytest", "jest", "postman", "api testing", "unit testing", "qa", "testing"],
    secondaryKeywords: ["java", "python", "javascript", "git", "ci/cd", "jenkins", "sql", "agile"],
    description: "Builds automated end-to-end test frameworks, API verification suites, and continuous quality gates.",
    nextSkillsToLearn: ["Playwright", "CI/CD Test Automation", "Performance Testing"],
  },
  {
    id: "product-manager-saas",
    title: "Product Manager (B2B SaaS & Digital Products)",
    domain: "Product Management & Strategy",
    primaryAxes: ["delivery_domain", "data_ai", "frameworks_apis"],
    coreKeywords: ["product management", "product strategy", "product roadmapping", "agile", "scrum", "okr planning", "prd authoring", "user research", "stakeholder management", "jira", "confluence", "figma", "amplitude", "mixpanel"],
    secondaryKeywords: ["conversion rate optimization", "cro", "a/b testing", "google analytics", "sql", "tableau", "slack"],
    description: "Defines product vision, OKRs, and engineering roadmaps while leveraging user research and product analytics to drive retention and ARR growth.",
    nextSkillsToLearn: ["SQL for Product Analytics", "AI Product Strategy", "Advanced Funnel Modeling"],
  },
  {
    id: "growth-digital-marketing-manager",
    title: "Growth & Performance Marketing Manager",
    domain: "Growth, Acquisition & Revenue",
    primaryAxes: ["data_ai", "frameworks_apis", "delivery_domain"],
    coreKeywords: ["growth marketing", "performance marketing", "google ads", "linkedin ads", "hubspot", "conversion rate optimization", "cro", "google analytics", "ga4", "google tag manager", "gtm", "a/b testing"],
    secondaryKeywords: ["data analysis", "sql", "tableau", "looker", "marketing automation", "product management"],
    description: "Scales multi-channel paid acquisition, HubSpot CRM automation workflows, and conversion rate optimization (CRO) experiments.",
    nextSkillsToLearn: ["SQL & BI Dashboarding", "Multi-Touch Attribution", "Looker / Tableau"],
  },
  {
    id: "talent-acquisition-hr-lead",
    title: "Talent Acquisition & People Operations Lead",
    domain: "Human Resources & Talent Strategy",
    primaryAxes: ["delivery_domain", "frameworks_apis", "data_ai"],
    coreKeywords: ["full lifecycle recruiting", "talent sourcing", "greenhouse", "lever", "ats platforms", "employer branding", "hr operations", "hr compliance", "linkedin recruiter", "workday", "bamboohr", "adp workforce now"],
    secondaryKeywords: ["stakeholder management", "slack", "employee onboarding", "performance management", "dei"],
    description: "Leads end-to-end technical and corporate recruitment, ATS pipeline optimization, employer branding, and people operations.",
    nextSkillsToLearn: ["People Analytics", "Workday HCM Configuration", "Strategic Workforce Planning"],
  },
  {
    id: "business-data-analyst",
    title: "Business Intelligence & Data Analyst",
    domain: "Analytics, BI & Operations",
    primaryAxes: ["data_ai", "delivery_domain", "frameworks_apis"],
    coreKeywords: ["sql", "business intelligence", "excel", "tableau", "power bi", "looker", "data analysis", "data visualization", "analytics", "google analytics", "amplitude", "mixpanel"],
    secondaryKeywords: ["python", "mysql", "postgresql", "stakeholder management", "jira", "agile", "reporting"],
    description: "Translates complex datasets and business requirements into actionable insights, KPI dashboards, and executive decision models.",
    nextSkillsToLearn: ["Power BI / Tableau", "Advanced SQL Window Functions", "Python for Data Analysis"],
  },
];

// Fallback skill extractor directly from raw resume text when parsedResume.skills is empty
const KNOWN_RESUME_SKILL_PATTERNS: { name: string; regex: RegExp; category: string }[] = [
  { name: "Java", regex: /\bjava\b/i, category: "Programming Language" },
  { name: "Python", regex: /\bpython\b/i, category: "Programming Language" },
  { name: "JavaScript", regex: /\b(javascript|es6)\b/i, category: "Programming Language" },
  { name: "TypeScript", regex: /\btypescript\b/i, category: "Programming Language" },
  { name: "SQL", regex: /\b(sql|mysql|postgresql|postgres|pl\/sql)\b/i, category: "Database" },
  { name: "React", regex: /\b(react|react\.js|reactjs)\b/i, category: "Frontend Framework" },
  { name: "Node.js", regex: /\b(node\.js|nodejs)\b/i, category: "Backend Runtime" },
  { name: "Spring Boot", regex: /\bspring\s*boot\b/i, category: "Backend Framework" },
  { name: "AWS", regex: /\b(aws|amazon web services|ec2|s3|lambda|cloudwatch)\b/i, category: "Cloud Platform" },
  { name: "Docker", regex: /\bdocker\b/i, category: "DevOps & Containers" },
  { name: "Kubernetes", regex: /\b(kubernetes|k8s)\b/i, category: "DevOps & Containers" },
  { name: "Git", regex: /\b(git|github|gitlab)\b/i, category: "Version Control" },
  { name: "CI/CD", regex: /\b(ci\/cd|github actions|gitlab ci|jenkins)\b/i, category: "DevOps" },
  { name: "Linux", regex: /\blinux\b/i, category: "Systems & OS" },
  { name: "Bash", regex: /\bbash\b/i, category: "Scripting" },
  { name: "Terraform", regex: /\bterraform\b/i, category: "Cloud & Infrastructure" },
  { name: "MongoDB", regex: /\bmongodb\b/i, category: "NoSQL Database" },
  { name: "Redis", regex: /\bredis\b/i, category: "Database & Caching" },
  { name: "Kafka", regex: /\bkafka\b/i, category: "Data & Messaging" },
  { name: "REST APIs", regex: /\b(rest\s*api|restful\s*api|rest\s*apis)\b/i, category: "API Architecture" },
  { name: "Microservices", regex: /\bmicroservices\b/i, category: "Architecture" },
  { name: "HTML5", regex: /\b(html5|html)\b/i, category: "Frontend" },
  { name: "CSS3", regex: /\b(css3|css|tailwind)\b/i, category: "Frontend" },
  { name: "Product Management", regex: /\b(product\s+management|product\s+manager|product\s+strategy)\b/i, category: "Product Strategy" },
  { name: "Agile & Scrum", regex: /\b(agile|scrum|cspo)\b/i, category: "Delivery & Agile" },
  { name: "Jira", regex: /\bjira\b/i, category: "Product & Delivery" },
  { name: "Confluence", regex: /\bconfluence\b/i, category: "Product & Delivery" },
  { name: "Figma", regex: /\bfigma\b/i, category: "UI / UX Design" },
  { name: "Amplitude", regex: /\bamplitude\b/i, category: "Product Analytics" },
  { name: "Mixpanel", regex: /\bmixpanel\b/i, category: "Product Analytics" },
  { name: "Tableau", regex: /\btableau\b/i, category: "BI & Analytics" },
  { name: "Google Analytics (GA4)", regex: /\b(google\s+analytics|ga4)\b/i, category: "Analytics" },
  { name: "Google Tag Manager", regex: /\b(google\s+tag\s+manager|gtm)\b/i, category: "Analytics" },
  { name: "Growth Marketing", regex: /\bgrowth\s+marketing\b/i, category: "Growth & Marketing" },
  { name: "Performance Marketing", regex: /\bperformance\s+marketing\b/i, category: "Growth & Marketing" },
  { name: "Google Ads", regex: /\bgoogle\s+ads\b/i, category: "Paid Acquisition" },
  { name: "LinkedIn Ads", regex: /\blinkedin\s+ads\b/i, category: "Paid Acquisition" },
  { name: "HubSpot CRM", regex: /\bhubspot\b/i, category: "CRM & Automation" },
  { name: "Conversion Rate Optimization (CRO)", regex: /\b(conversion\s+rate\s+optimization|cro)\b/i, category: "Growth & Experimentation" },
  { name: "A/B Testing", regex: /\ba\/b\s+test/i, category: "Experimentation" },
  { name: "Full Lifecycle Recruiting", regex: /\b(full[\s-]lifecycle\s+recruiting|full[\s-]lifecycle\s+recruitment|full[\s-]cycle\s+recruiting)\b/i, category: "Talent Acquisition" },
  { name: "Talent Sourcing", regex: /\btalent\s+sourcing\b/i, category: "Talent Acquisition" },
  { name: "Greenhouse ATS", regex: /\bgreenhouse\b/i, category: "HR Tech & ATS" },
  { name: "Lever ATS", regex: /\blever\b/i, category: "HR Tech & ATS" },
  { name: "Workday", regex: /\bworkday\b/i, category: "HR Tech" },
  { name: "BambooHR", regex: /\bbamboohr\b/i, category: "HR Tech" },
  { name: "ADP Workforce Now", regex: /\badp\s+workforce\s+now\b/i, category: "HR Operations" },
  { name: "Employer Branding", regex: /\bemployer\s+branding\b/i, category: "Talent Acquisition" },
  { name: "LinkedIn Recruiter", regex: /\blinkedin\s+recruiter\b/i, category: "Talent Acquisition" },
];

export const CandidateSkillProfileView: React.FC<CandidateSkillProfileViewProps> = ({
  profile,
  currentAnalysis,
  userAnalyses = [],
  onBackToDashboard,
  onSelectAnalysis,
  onNavigateToAnalyze,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedAxis, setSelectedAxis] = useState<PentagonAxisId["id"] | "all">("all");

  // Self-healing state: if parent hasn't loaded profile/analysis yet, fetch automatically
  const [fetchedProfile, setFetchedProfile] = useState<CandidateSkillProfile | null>(null);
  const [fetchedAnalysis, setFetchedAnalysis] = useState<AnalysisRecord | null>(null);
  const [fetchedAnalysesList, setFetchedAnalysesList] = useState<AnalysisRecord[]>([]);
  const [liveJobs, setLiveJobs] = useState<any[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const targetAnalysisId =
      currentAnalysis?.id || getStoredGuestAnalysisId() || undefined;

    setIsLoadingProfile(true);
    api
      .getCandidateProfile(targetAnalysisId)
      .then((res) => {
        if (!isMounted) return;
        if (res.profile) setFetchedProfile(res.profile);
        if (res.activeAnalysis) setFetchedAnalysis(res.activeAnalysis);
        if (Array.isArray(res.analyses) && res.analyses.length > 0) {
          setFetchedAnalysesList(res.analyses);
        }
      })
      .catch((err) => {
        console.warn("Profile fetch fallback:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentAnalysis?.id]);

  // Combine available analyses list
  const allAvailableAnalyses = useMemo(() => {
    const map = new Map<string, AnalysisRecord>();
    if (currentAnalysis) map.set(currentAnalysis.id, currentAnalysis);
    for (const a of userAnalyses) map.set(a.id, a);
    for (const a of fetchedAnalysesList) map.set(a.id, a);
    if (fetchedAnalysis) map.set(fetchedAnalysis.id, fetchedAnalysis);
    return Array.from(map.values());
  }, [currentAnalysis, userAnalyses, fetchedAnalysesList, fetchedAnalysis]);

  // Determine the active analysis record whose resume drives this profile
  const activeAnalysisRecord = useMemo(() => {
    if (currentAnalysis) return currentAnalysis;
    if (fetchedAnalysis) return fetchedAnalysis;
    if (allAvailableAnalyses.length > 0) return allAvailableAnalyses[0];
    return null;
  }, [currentAnalysis, fetchedAnalysis, allAvailableAnalyses]);

  const effectiveProfile = profile || fetchedProfile;

  // Strictly extract, sanitize, split, and canonically deduplicate ONLY resume-verified skills
  const verifiedSkills: CanonicalSkillRecord[] = useMemo(() => {
    const seenCanonical = new Set<string>();
    const cleanList: CanonicalSkillRecord[] = [];

    const addRawSkillEntry = (
      rawName: string,
      categoryHint: string,
      strengthHint: any,
      contextsHint?: any[],
      trustedFromResumeParser: boolean = true,
      resumeTextForVerification?: string
    ) => {
      const atomicTokens = expandAtomicSkillTokens(rawName);
      for (const token of atomicTokens) {
        const dedupeKey = canonicalDedupeKey(token);
        if (!dedupeKey || seenCanonical.has(dedupeKey)) continue;

        // If untrusted source and we have resume text, verify at least one meaningful keyword exists in resume
        if (!trustedFromResumeParser && resumeTextForVerification && resumeTextForVerification.trim().length > 20) {
          const lowerResume = resumeTextForVerification.toLowerCase();
          const lowerToken = token.toLowerCase();
          const sigWords = lowerToken
            .replace(/[()/,&-]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length >= 3 && !NOISE_WORDS.has(w));
          const existsInResume =
            lowerResume.includes(lowerToken) ||
            sigWords.some((w) => lowerResume.includes(w));
          if (!existsInResume) {
            continue;
          }
        }

        seenCanonical.add(dedupeKey);

        // Normalize provenance contexts (handles both string[] from server/db.ts and {source, snippet}[])
        const normalizedContexts: { source: string; snippet: string }[] = [];
        if (Array.isArray(contextsHint)) {
          for (const c of contextsHint) {
            if (typeof c === "string" && c.trim()) {
              if (c.includes(":")) {
                const [src, ...rest] = c.split(":");
                normalizedContexts.push({
                  source: src.trim(),
                  snippet: rest.join(":").trim() || c,
                });
              } else {
                normalizedContexts.push({
                  source: c.trim(),
                  snippet: `Verified in ${c.trim()}`,
                });
              }
            } else if (c && typeof c === "object" && c.snippet) {
              normalizedContexts.push({
                source: c.source || "Resume",
                snippet: String(c.snippet),
              });
            }
          }
        }

        if (normalizedContexts.length === 0 && activeAnalysisRecord?.parsedResume) {
          const pr = activeAnalysisRecord.parsedResume;
          const lowerToken = token.toLowerCase();
          const tokenWords = lowerToken.split(/[\s/&()-]+/).filter((w) => w.length >= 3);

          for (const proj of pr.projects || []) {
            const pText = `${proj.name || ""} ${proj.description || ""} ${(proj.technologies || []).join(" ")}`;
            if (
              pText.toLowerCase().includes(lowerToken) ||
              (tokenWords.length > 0 && tokenWords.every((w) => pText.toLowerCase().includes(w)))
            ) {
              normalizedContexts.push({
                source: "Project",
                snippet: `${proj.name}: ${proj.description}`.slice(0, 160),
              });
            }
          }
          for (const exp of pr.experience || []) {
            const roleTitle = exp.title || (exp as any).role || "Role";
            const eText = `${roleTitle} ${exp.company || ""} ${exp.description || ""} ${(exp.technologiesUsed || []).join(" ")}`;
            if (
              eText.toLowerCase().includes(lowerToken) ||
              (tokenWords.length > 0 && tokenWords.every((w) => eText.toLowerCase().includes(w)))
            ) {
              normalizedContexts.push({
                source: "Experience",
                snippet: `${roleTitle}${exp.company ? ` at ${exp.company}` : ""}: ${exp.description || ""}`.slice(0, 160),
              });
            }
          }
          if (normalizedContexts.length === 0) {
            const cName =
              pr.personalInfo?.fullName || (pr as any).candidateName || "Candidate Resume";
            normalizedContexts.push({
              source: "Resume Skills",
              snippet: `Verified in ${cName}`,
            });
          }
        }

        const effectiveStrength =
          strengthHint === "VERY_HIGH" ||
          strengthHint === "HIGH" ||
          strengthHint === "MEDIUM" ||
          strengthHint === "MODERATE"
            ? strengthHint
            : normalizedContexts.some((c) => c.source.includes("Experience") || c.source.includes("Project"))
            ? "HIGH"
            : "MEDIUM";

        const axisId = classifySkillToPentagonAxis(token, categoryHint);
        const axisObj = PENTAGON_AXES.find((a) => a.id === axisId)!;
        const cleanCategory =
          categoryHint &&
          categoryHint !== "Verified Competency" &&
          categoryHint !== "Verified Resume Skill" &&
          categoryHint !== "Technical" &&
          categoryHint !== "Domain" &&
          categoryHint !== "Domain Competency"
            ? categoryHint
            : axisObj.shortLabel;

        cleanList.push({
          id: `skill-${cleanList.length + 1}-${dedupeKey.replace(/[^a-z0-9]/g, "-")}`,
          canonicalName: token,
          skill: token,
          aliases: [],
          category: cleanCategory,
          highestEvidenceStrength: effectiveStrength,
          evidenceStrength: effectiveStrength,
          confidence:
            effectiveStrength === "VERY_HIGH"
              ? 0.96
              : effectiveStrength === "HIGH"
              ? 0.9
              : 0.82,
          verifiedContexts: normalizedContexts as any,
          verifiedCount: Math.max(1, normalizedContexts.length),
          lastVerifiedAt:
            activeAnalysisRecord?.createdAt ||
            effectiveProfile?.updatedAt ||
            new Date().toISOString(),
        });
      }
    };

    // 1. Extract from activeAnalysisRecord if available
    if (activeAnalysisRecord) {
      const pr = activeAnalysisRecord.parsedResume;
      const resumeText = activeAnalysisRecord.resumeText || "";

      const rawResumeSkills: string[] = [
        ...(pr?.skills || []),
        ...(pr?.technicalSkills || []),
        ...(pr?.softSkills || []),
        ...((pr as any)?.tools || []),
        ...(pr?.experience || []).flatMap((e) => e.technologiesUsed || []),
        ...(pr?.projects || []).flatMap((p) => p.technologies || []),
      ];

      for (const rawSkill of rawResumeSkills) {
        const matchObj = (activeAnalysisRecord.skillMatches || []).find(
          (m) =>
            (m.candidateSkill || m.requirement?.skill || "").toLowerCase() ===
            rawSkill.toLowerCase()
        );
        addRawSkillEntry(
          rawSkill,
          matchObj?.requirement?.category || "",
          matchObj?.evidenceStrength || undefined,
          undefined,
          true,
          resumeText
        );
      }

      // Also include verified matched skills from skillMatches (where matched === true)
      for (const m of activeAnalysisRecord.skillMatches || []) {
        if (m.matched && m.evidenceStrength && m.evidenceStrength !== "NONE") {
          const skillLabel =
            m.requirement?.canonicalSkill ||
            m.candidateSkill ||
            m.requirement?.skill ||
            "";
          if (skillLabel) {
            addRawSkillEntry(
              skillLabel,
              m.requirement?.category || "",
              m.evidenceStrength,
              m.evidenceSnippets?.map((s) => ({
                source: m.resumeSection || "Resume Evidence",
                snippet: s,
              })),
              true,
              resumeText
            );
          }
        }
      }

      // Also scan resumeText directly against KNOWN_RESUME_SKILL_PATTERNS so resumes without a dedicated SKILLS header still populate all skills
      if (resumeText.trim().length > 15) {
        for (const pat of KNOWN_RESUME_SKILL_PATTERNS) {
          if (pat.regex.test(resumeText)) {
            addRawSkillEntry(
              pat.name,
              pat.category,
              "HIGH",
              undefined,
              true,
              resumeText
            );
          }
        }
      }
    }

    // 2. Also merge/fallback from effectiveProfile.canonicalSkills if cleanList is still empty
    if (cleanList.length === 0 && effectiveProfile?.canonicalSkills?.length) {
      for (const cs of effectiveProfile.canonicalSkills) {
        const rawName = cs.canonicalName || cs.skill || "";
        addRawSkillEntry(
          rawName,
          cs.category || "",
          cs.evidenceStrength || cs.highestEvidenceStrength,
          cs.verifiedContexts,
          true
        );
      }
    }

    return cleanList;
  }, [activeAnalysisRecord, effectiveProfile]);

  // Fetch live matching jobs from backend /api/jobs/recommendations whenever verifiedSkills change
  useEffect(() => {
    if (verifiedSkills.length === 0) {
      setLiveJobs([]);
      return;
    }
    let isMounted = true;
    const skillNames = verifiedSkills.map((s) => s.canonicalName || s.skill || "").filter(Boolean);
    api
      .getJobRecommendations({
        resumeId: activeAnalysisRecord?.id,
        skills: skillNames,
        jobTrack: activeAnalysisRecord?.jobTrack,
      })
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res.recommendations)) {
          setLiveJobs(res.recommendations.slice(0, 6));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [verifiedSkills, activeAnalysisRecord?.id, activeAnalysisRecord?.jobTrack]);

  // Compute Pentagon 5-Axis scores & skill buckets from verifiedSkills
  const pentagonData = useMemo(() => {
    const buckets: Record<PentagonAxisId["id"], CanonicalSkillRecord[]> = {
      core_code: [],
      frameworks_apis: [],
      data_ai: [],
      cloud_devops: [],
      delivery_domain: [],
    };

    for (const sk of verifiedSkills) {
      const name = sk.canonicalName || sk.skill || "";
      const axis = classifySkillToPentagonAxis(name, sk.category);
      buckets[axis].push(sk);
    }

    return PENTAGON_AXES.map((axis, index) => {
      const axisSkills = buckets[axis.id];
      const count = axisSkills.length;

      let rawPoints = 0;
      for (const s of axisSkills) {
        const str = String(s.evidenceStrength || s.highestEvidenceStrength || "MEDIUM");
        if (str === "VERY_HIGH") rawPoints += 28;
        else if (str === "HIGH") rawPoints += 24;
        else if (str === "MEDIUM") rawPoints += 20;
        else rawPoints += 16;
      }

      const score = count === 0 ? 15 : Math.min(98, Math.round(28 + rawPoints * 0.85));

      return {
        ...axis,
        index,
        skills: axisSkills,
        count,
        score,
      };
    });
  }, [verifiedSkills]);

  // Compute Exclusive Job Role Suggestions strictly from the candidate's verified resume skills & Pentagon Axes
  const suggestedJobRoles = useMemo(() => {
    if (verifiedSkills.length === 0) return [];

    const candidateSkillTokens = verifiedSkills.map((s) => ({
      display: s.canonicalName || s.skill || "",
      lower: (s.canonicalName || s.skill || "").toLowerCase(),
      canon: canonicalDedupeKey(s.canonicalName || s.skill || ""),
    }));

    const axisScoreMap: Record<string, number> = {};
    for (const pd of pentagonData) {
      axisScoreMap[pd.id] = pd.score;
    }

    const evaluated = JOB_ROLE_CATALOG.map((role) => {
      const matchedCore: string[] = [];
      const matchedSecondary: string[] = [];

      for (const kw of role.coreKeywords) {
        const kwLower = kw.toLowerCase();
        const found = candidateSkillTokens.find(
          (cs) =>
            cs.lower === kwLower ||
            cs.canon === kwLower ||
            (kwLower.length >= 3 && cs.lower.includes(kwLower)) ||
            (cs.lower.length >= 3 && kwLower.includes(cs.lower))
        );
        if (found && !matchedCore.includes(found.display)) {
          matchedCore.push(found.display);
        }
      }

      for (const kw of role.secondaryKeywords) {
        const kwLower = kw.toLowerCase();
        const found = candidateSkillTokens.find(
          (cs) =>
            cs.lower === kwLower ||
            cs.canon === kwLower ||
            (kwLower.length >= 3 && cs.lower.includes(kwLower)) ||
            (cs.lower.length >= 3 && kwLower.includes(cs.lower))
        );
        if (
          found &&
          !matchedCore.includes(found.display) &&
          !matchedSecondary.includes(found.display)
        ) {
          matchedSecondary.push(found.display);
        }
      }

      const allMatchedSkills = [...matchedCore, ...matchedSecondary];
      const primaryAxisAvg =
        role.primaryAxes.reduce((acc, ax) => acc + (axisScoreMap[ax] || 20), 0) /
        role.primaryAxes.length;

      const skillCoverageScore =
        matchedCore.length * 18 + matchedSecondary.length * 9;
      const combinedScore = Math.min(
        98,
        Math.max(48, Math.round(skillCoverageScore * 0.65 + primaryAxisAvg * 0.35))
      );

      const missingRecommended = role.nextSkillsToLearn.filter(
        (ns) =>
          !candidateSkillTokens.some(
            (cs) =>
              cs.lower.includes(ns.toLowerCase()) ||
              ns.toLowerCase().includes(cs.lower)
          )
      );

      return {
        ...role,
        matchedSkills: allMatchedSkills,
        matchedCoreCount: matchedCore.length,
        matchPercent: combinedScore,
        missingRecommended: missingRecommended.slice(0, 3),
        primaryAxisLabels: role.primaryAxes.map(
          (axId) => PENTAGON_AXES.find((a) => a.id === axId)?.shortLabel || axId
        ),
      };
    })
      .filter((r) => r.matchedSkills.length > 0)
      .sort((a, b) => {
        if (b.matchedCoreCount !== a.matchedCoreCount) {
          return b.matchedCoreCount - a.matchedCoreCount;
        }
        return b.matchPercent - a.matchPercent;
      });

    return evaluated.slice(0, 6);
  }, [verifiedSkills, pentagonData]);

  const categories = useMemo(
    () => Array.from(new Set(verifiedSkills.map((s) => s.category))).filter(Boolean),
    [verifiedSkills]
  );

  const filteredSkills = useMemo(() => {
    return verifiedSkills.filter((s) => {
      const name = s.canonicalName || s.skill || "";
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = categoryFilter === "all" || s.category === categoryFilter;
      const skillAxis = classifySkillToPentagonAxis(name, s.category);
      const matchesAxis = selectedAxis === "all" || skillAxis === selectedAxis;
      return matchesSearch && matchesCat && matchesAxis;
    });
  }, [verifiedSkills, searchTerm, categoryFilter, selectedAxis]);

  const getStrengthBadge = (strength: any) => {
    const val = String(strength || "MEDIUM").toUpperCase();
    if (val === "VERY_HIGH") {
      return (
        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
          VERY HIGH
        </span>
      );
    } else if (val === "HIGH") {
      return (
        <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
          HIGH
        </span>
      );
    } else if (val === "MEDIUM") {
      return (
        <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
          VERIFIED
        </span>
      );
    }
    return (
      <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
        {val}
      </span>
    );
  };

  // Geometry helper for SVG Pentagon Radar Chart
  const svgSize = 400;
  const center = svgSize / 2;
  const maxRadius = 126;

  const getPentagonPoint = (axisIndex: number, pct: number) => {
    const angleDeg = -90 + axisIndex * 72;
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = (Math.max(10, Math.min(100, pct)) / 100) * maxRadius;
    return {
      x: center + r * Math.cos(angleRad),
      y: center + r * Math.sin(angleRad),
    };
  };

  const ringLevels = [20, 40, 60, 80, 100];
  const dataPolygonPoints = pentagonData
    .map((d, idx) => {
      const pt = getPentagonPoint(idx, d.score);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(" ");

  const candidateName =
    activeAnalysisRecord?.parsedResume?.personalInfo?.fullName ||
    (activeAnalysisRecord?.parsedResume as any)?.candidateName ||
    "Candidate";

  const candidateEmail =
    activeAnalysisRecord?.parsedResume?.personalInfo?.email ||
    (activeAnalysisRecord?.parsedResume as any)?.email ||
    "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Navigation & Resume Source Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <span>&larr; Back</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {allAvailableAnalyses.length > 1 && onSelectAnalysis && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-[11px] font-bold text-slate-600">Switch Resume:</span>
              <select
                value={activeAnalysisRecord?.id || ""}
                onChange={(e) => {
                  const found = allAvailableAnalyses.find((a) => a.id === e.target.value);
                  if (found) onSelectAnalysis(found);
                }}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {allAvailableAnalyses.map((a, idx) => {
                  const cName =
                    a.parsedResume?.personalInfo?.fullName ||
                    (a.parsedResume as any)?.candidateName ||
                    "Resume";
                  return (
                    <option key={a.id} value={a.id}>
                      {cName} — {a.parsedJob?.jobTitle || `Analysis #${idx + 1}`}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>100% Resume-Verified • Zero Fake or Duplicate Skills</span>
          </span>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-800 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Resume-Only Skill Intelligence &bull; Exclusive Career Role Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {candidateName}&apos;s Verified Skill Profile &amp; Pentagon Graph
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Every skill below is strictly extracted, atomically split, and deduplicated directly from the uploaded resume
              {candidateEmail ? ` (${candidateEmail})` : ""}.
              No fabricated items or duplicate aliases are permitted.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0">
            <div className="text-center px-2">
              <div className="text-2xl font-black text-indigo-600">
                {verifiedSkills.length}
              </div>
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Unique Skills
              </div>
            </div>
            <div className="text-center border-x border-slate-200 px-3">
              <div className="text-2xl font-black text-emerald-600">
                {pentagonData.filter((d) => d.count > 0).length}/5
              </div>
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Pentagon Axes
              </div>
            </div>
            <div className="text-center px-2">
              <div className="text-2xl font-black text-amber-600">
                {suggestedJobRoles.length}
              </div>
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Matched Roles
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoadingProfile && verifiedSkills.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            Building your Pentagonal Skill Graph &amp; Career Role Matches...
          </p>
        </div>
      ) : verifiedSkills.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
          <Award className="h-12 w-12 text-indigo-500 mx-auto" />
          <h2 className="text-lg font-extrabold text-slate-900">
            No Resume Analyzed Yet
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Upload or paste your resume in the Career Readiness Engine to generate your Pentagonal Skill Graph, deduplicated skill ledger, and tailored Job Role recommendations.
          </p>
          {onNavigateToAnalyze && (
            <button
              type="button"
              onClick={onNavigateToAnalyze}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition-all"
            >
              <Zap className="h-4 w-4" />
              <span>Analyze My Resume Now</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* =====================================================================
              SECTION 1: PENTAGONAL SKILL GRAPH & 5-AXIS COMPETENCY BREAKDOWN
             ===================================================================== */}
          <div
            id="section-pentagonal-skill-graph"
            className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 mb-1">
                  <Target className="h-3.5 w-3.5" />
                  <span>5-Axis Resume Competency Radar</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Pentagonal Skill Graph
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Click any vertex on the pentagon or any axis card on the right to filter your verified resume skills by competency dimension.
                </p>
              </div>

              {selectedAxis !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedAxis("all")}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 text-xs font-bold transition-colors"
                >
                  <span>Reset Filter (Show All 5 Axes)</span>
                </button>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left: SVG Pentagonal Radar Graph */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center bg-slate-950 rounded-3xl p-6 text-white relative overflow-hidden border border-slate-800 shadow-inner">
                <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                    Resume Skill Pentagon
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400">
                    {verifiedSkills.length} Verified Skills Mapped
                  </span>
                </div>

                <svg
                  viewBox={`0 0 ${svgSize} ${svgSize}`}
                  className="w-full max-w-[380px] h-auto select-none overflow-visible"
                  role="img"
                  aria-label="Pentagonal Skill Graph"
                >
                  <defs>
                    <radialGradient id="pentagonFillGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
                    </radialGradient>
                  </defs>

                  {/* Concentric Pentagon Grid Rings */}
                  {ringLevels.map((lvl) => {
                    const pts = [0, 1, 2, 3, 4]
                      .map((i) => {
                        const pt = getPentagonPoint(i, lvl);
                        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
                      })
                      .join(" ");
                    return (
                      <g key={lvl}>
                        <polygon
                          points={pts}
                          fill="none"
                          stroke={lvl === 100 ? "#475569" : "#1e293b"}
                          strokeWidth={lvl === 100 ? "1.5" : "1"}
                          strokeDasharray={lvl === 100 ? undefined : "3 3"}
                        />
                        <text
                          x={center + 4}
                          y={center - (lvl / 100) * maxRadius + 10}
                          fill="#64748b"
                          fontSize="8.5"
                          fontWeight="700"
                        >
                          {lvl}%
                        </text>
                      </g>
                    );
                  })}

                  {/* 5 Axis Spokes */}
                  {[0, 1, 2, 3, 4].map((i) => {
                    const outer = getPentagonPoint(i, 100);
                    return (
                      <line
                        key={i}
                        x1={center}
                        y1={center}
                        x2={outer.x}
                        y2={outer.y}
                        stroke="#334155"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Candidate Skill Polygon */}
                  <polygon
                    points={dataPolygonPoints}
                    fill="url(#pentagonFillGrad)"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    className="transition-all duration-500"
                  />

                  {/* Data Vertices & Outer Axis Labels */}
                  {pentagonData.map((axis, i) => {
                    const vertex = getPentagonPoint(i, axis.score);
                    const labelPos = getPentagonPoint(i, 126);
                    const isSelected = selectedAxis === axis.id;

                    return (
                      <g
                        key={axis.id}
                        onClick={() =>
                          setSelectedAxis((prev) => (prev === axis.id ? "all" : axis.id))
                        }
                        className="cursor-pointer group"
                      >
                        <text
                          x={labelPos.x}
                          y={labelPos.y - 5}
                          textAnchor="middle"
                          fill={isSelected ? "#34d399" : "#f8fafc"}
                          fontSize="10.5"
                          fontWeight="800"
                        >
                          {axis.shortLabel}
                        </text>
                        <text
                          x={labelPos.x}
                          y={labelPos.y + 9}
                          textAnchor="middle"
                          fill={isSelected ? "#6ee7b7" : "#94a3b8"}
                          fontSize="9.5"
                          fontWeight="700"
                        >
                          {axis.score}% ({axis.count} {axis.count === 1 ? "skill" : "skills"})
                        </text>

                        <circle
                          cx={vertex.x}
                          cy={vertex.y}
                          r={isSelected ? 7 : 5.5}
                          fill={isSelected ? "#10b981" : "#6366f1"}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      </g>
                    );
                  })}
                </svg>

                <div className="mt-2 text-[11px] text-slate-400 text-center">
                  Polygon vertices reflect verified skill density and resume evidence strength across 5 core dimensions.
                </div>
              </div>

              {/* Right: 5-Axis Detailed Breakdown Cards */}
              <div className="lg:col-span-6 space-y-3">
                {pentagonData.map((axis) => {
                  const isSelected = selectedAxis === axis.id;
                  return (
                    <div
                      key={axis.id}
                      onClick={() =>
                        setSelectedAxis((prev) => (prev === axis.id ? "all" : axis.id))
                      }
                      className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20"
                          : "border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: axis.color }}
                          />
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                            {axis.label}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-black text-slate-900">
                            {axis.score}%
                          </span>
                          <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            {axis.count} {axis.count === 1 ? "skill" : "skills"}
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2.5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${axis.score}%`,
                            backgroundColor: axis.color,
                          }}
                        />
                      </div>

                      {axis.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {axis.skills.map((sk) => (
                            <span
                              key={sk.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-800 shadow-2xs"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              {sk.canonicalName || sk.skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          No skills from this axis detected on current resume.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* =====================================================================
              SECTION 2: EXCLUSIVE JOB ROLE SUGGESTIONS & LIVE MATCHING OPENINGS
             ===================================================================== */}
          <div
            id="section-exclusive-job-roles"
            className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-emerald-50/40 p-6 sm:p-8 shadow-sm space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-indigo-100">
              <div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white mb-2 shadow-2xs">
                  <Compass className="h-3.5 w-3.5 text-amber-300" />
                  <span>Primary Career Intelligence Capability</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Suggested Job Roles Based on Your Resume Skill Pentagon
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                  Computed exclusively in your Skill Profile from your {verifiedSkills.length} verified resume skills and 5-axis pentagon distribution. Every role below is backed by direct skill evidence from your resume.
                </p>
              </div>

              {suggestedJobRoles.length > 0 && (
                <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-2xl px-4 py-3 shrink-0 shadow-2xs">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">
                      Top Role Fit: {suggestedJobRoles[0]?.matchPercent || 0}%
                    </div>
                    <div className="text-[11px] font-semibold text-indigo-700">
                      {suggestedJobRoles[0]?.title}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggested Career Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {suggestedJobRoles.map((role, rIdx) => {
                const encodedRole = encodeURIComponent(role.title);
                return (
                  <div
                    key={role.id}
                    className={`rounded-2xl border bg-white p-5 sm:p-6 shadow-xs transition-all flex flex-col justify-between ${
                      rIdx === 0
                        ? "border-indigo-500 ring-2 ring-indigo-500/15"
                        : "border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {rIdx === 0 && (
                              <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                                #1 Best Fit Role
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-indigo-600">
                              {role.domain}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                            {role.title}
                          </h3>
                        </div>

                        <div className="text-right shrink-0 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
                          <div className="text-lg font-black text-emerald-700 leading-none">
                            {role.matchPercent}%
                          </div>
                          <div className="text-[9px] font-bold uppercase text-emerald-800 mt-0.5">
                            Skill Match
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        {role.description}
                      </p>

                      {/* Pentagon Axes Alignment */}
                      <div className="mb-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Pentagon Synergy:
                        </span>
                        {role.primaryAxisLabels.map((lbl, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700"
                          >
                            {lbl}
                          </span>
                        ))}
                      </div>

                      {/* Matched Resume Skills */}
                      <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/80 p-3 mb-3">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 mb-1.5 flex items-center justify-between">
                          <span>Matched Skills From Your Resume ({role.matchedSkills.length})</span>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {role.matchedSkills.map((sk, sIdx) => (
                            <span
                              key={sIdx}
                              className="rounded-md bg-white border border-emerald-300 px-2 py-0.5 text-[11px] font-bold text-emerald-900 shadow-2xs"
                            >
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Next Skill to Unlock Higher Readiness */}
                      {role.missingRecommended.length > 0 && (
                        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="font-bold text-slate-600">
                            Recommended Next Skills:
                          </span>
                          {role.missingRecommended.map((ms, mIdx) => (
                            <span
                              key={mIdx}
                              className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
                            >
                              + {ms}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Direct Application Portals for this Suggested Job Role */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Search Openings:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a
                          href={`https://www.linkedin.com/jobs/search/?keywords=${encodedRole}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white px-2.5 py-1 text-[11px] font-bold transition-colors"
                        >
                          <span>LinkedIn</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                        <a
                          href={`https://www.indeed.com/jobs?q=${encodedRole}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 text-[11px] font-bold transition-colors"
                        >
                          <span>Indeed</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                        <a
                          href={`https://www.naukri.com/${role.title
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")}-jobs`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1 text-[11px] font-bold transition-colors"
                        >
                          <span>Naukri</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Matched Job Postings Based on Verified Resume Skills */}
            {liveJobs.length > 0 && (
              <div className="pt-6 border-t border-indigo-200/80">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-indigo-600" />
                      <span>Live Job Openings Matched to Your Resume Skills</span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      Direct company &amp; job board openings ranked against your verified skill profile.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {liveJobs.map((item: any, idx: number) => {
                    const job = item.job || item;
                    const match = item.match || {};
                    const score = match.matchPercentage ?? match.overallMatchScore ?? 80;
                    const matchedList: string[] = match.matchedSkills || [];

                    return (
                      <div
                        key={job.id || idx}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-1">
                                {job.title}
                              </h4>
                              <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
                                <Building2 className="h-3 w-3 text-slate-400" />
                                <span>{job.company}</span>
                              </p>
                            </div>
                            <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-black text-indigo-700 shrink-0">
                              {score}% Fit
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-2.5">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span>{job.location || "Remote / Hybrid"}</span>
                          </div>

                          {matchedList.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {matchedList.slice(0, 4).map((ms: string, mIdx: number) => (
                                <span
                                  key={mIdx}
                                  className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800"
                                >
                                  ✓ {ms}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-500">
                            {job.jobSource || "Verified Opening"}
                          </span>
                          <a
                            href={job.applyUrl || job.sourceUrl || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.title || "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 text-[11px] font-bold transition-colors"
                          >
                            <span>Apply Direct</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* =====================================================================
              SECTION 3: DEDUPLICATED & ATOMIC RESUME SKILL LEDGER
             ===================================================================== */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 mb-1">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Deduplicated Atomic Skill Inventory</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Verified Resume Skills ({filteredSkills.length})
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Every skill below is verified against your resume with compound categories split into individual skills and duplicates removed.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter verified resume skills..."
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="h-4 w-4 text-slate-500 shrink-0" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 w-full sm:w-auto"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredSkills.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50 mt-6">
                <Award className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">
                  No verified resume skills matched your current filter.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSkills.map((skill, idx) => {
                  const displayName = skill.canonicalName || skill.skill || "Verified Skill";
                  const strength =
                    skill.evidenceStrength || skill.highestEvidenceStrength || "MEDIUM";
                  const axisId = classifySkillToPentagonAxis(displayName, skill.category);
                  const axisObj = PENTAGON_AXES.find((a) => a.id === axisId)!;
                  const rawContexts = Array.isArray(skill.verifiedContexts)
                    ? skill.verifiedContexts
                    : [];
                  const firstContext = rawContexts[0];
                  const contextSource =
                    typeof firstContext === "string"
                      ? "Resume"
                      : (firstContext as any)?.source || "Resume";
                  const contextSnippet =
                    typeof firstContext === "string"
                      ? firstContext
                      : (firstContext as any)?.snippet || "Verified on Resume";

                  return (
                    <div
                      key={skill.id || `${displayName}-${idx}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900">
                              {displayName}
                            </h3>
                            <span
                              className={`inline-block mt-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${axisObj.badgeClass}`}
                            >
                              {axisObj.shortLabel}
                            </span>
                          </div>
                          {getStrengthBadge(strength)}
                        </div>

                        {rawContexts.length > 0 && (
                          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-[11px] text-slate-600">
                            <span className="font-bold text-slate-800 block mb-0.5">
                              Evidence ({contextSource}):
                            </span>
                            <span className="line-clamp-2">
                              {contextSnippet}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Resume Verified
                        </span>
                        <span>
                          {rawContexts.length || 1} {(rawContexts.length || 1) === 1 ? "source" : "sources"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
