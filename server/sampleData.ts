export interface SamplePair {
  id: string;
  name: string;
  category: string;
  track?: 'TECHNICAL' | 'NON_TECHNICAL';
  expectedState: 'READY' | 'NEAR_READY' | 'NOT_READY';
  resume: string;
  jobDescription: string;
}

export const SAMPLE_DATA_PAIRS: SamplePair[] = [
  // ================= TECHNICAL SAMPLES =================
  {
    id: "sample-senior-fs",
    name: "Senior Full-Stack Engineer",
    category: "Software Engineering",
    track: "TECHNICAL",
    expectedState: "READY",
    resume: `ALEX RIVERA
Email: alex.rivera@example.com | Phone: (555) 349-2810 | Location: San Francisco, CA
LinkedIn: linkedin.com/in/alexrivera-dev | GitHub: github.com/alexrivera

PROFESSIONAL SUMMARY
Senior Full-Stack Software Engineer with 6+ years of production experience architecting distributed cloud backends with Java, Spring Boot, and TypeScript/React. Proven history reducing API latencies by 35% and mentoring junior developers.

EXPERIENCE
Lead Software Engineer | Apex Cloud Solutions (2021 - Present)
- Designed and maintained high-throughput Spring Boot microservices handling 45M daily requests backed by PostgreSQL and Redis.
- Architected asynchronous event streaming pipelines using Apache Kafka and Spring Data JPA.
- Spearheaded frontend rewrite to React and TypeScript, improving Core Web Vitals and lowering bounce rate by 22%.
- Containerized microservices using Docker and managed deployments to AWS ECS with GitHub Actions CI/CD.

Software Engineer | Nexa Technologies (2018 - 2021)
- Built enterprise RESTful APIs with Java and Spring Framework for financial compliance reporting.
- Optimized complex PostgreSQL database queries, reducing report generation duration from 14s to 800ms.
- Implemented unit and integration test suites using JUnit and Mockito achieving 88% code coverage.

TECHNICAL SKILLS
Languages: Java, TypeScript, JavaScript, SQL, Python
Frameworks: Spring Boot, Spring Data JPA, Spring Security, React, Next.js, Express.js
Databases: PostgreSQL, MySQL, Redis, DynamoDB
DevOps & Cloud: AWS, Docker, Kubernetes, CI/CD, Git, Terraform
Methodologies: Agile/Scrum, System Design, REST API, Microservices

EDUCATION
Bachelor of Science in Computer Science | University of California, Berkeley (2014 - 2018)

CERTIFICATIONS
- AWS Certified Solutions Architect - Associate
- Oracle Certified Professional: Java SE 11 Developer`,
    jobDescription: `SENIOR FULL-STACK ENGINEER
Company: NovaPay Financial
Location: Remote / Hybrid

ABOUT THE ROLE:
NovaPay is seeking a Senior Full-Stack Engineer to architect next-generation payment APIs and developer portals. You will lead technical design, scale microservices, and deliver robust frontend applications.

RESPONSIBILITIES:
- Architect and develop secure, high-availability microservices in Java and Spring Boot.
- Build responsive, accessible web interfaces in React and TypeScript.
- Design relational schemas and optimize complex SQL queries in PostgreSQL.
- Partner with DevOps to package containerized services using Docker and deploy to AWS.
- Mentor team members and maintain high automated test coverage.

CRITICAL REQUIREMENTS:
- 5+ years building enterprise applications with Java and Spring Boot.
- Demonstrated production experience with React and TypeScript.
- Strong proficiency in relational databases, especially PostgreSQL.
- Solid understanding of REST API design, Microservices, and Docker containerization.

PREFERRED QUALIFICATIONS:
- Hands-on AWS cloud experience.
- Experience with Redis caching and Kafka message queues.
- B.S. in Computer Science or equivalent practical experience.`
  },
  {
    id: "sample-devops-near-ready",
    name: "Cloud / DevOps Engineer",
    category: "Cloud & Infrastructure",
    track: "TECHNICAL",
    expectedState: "NEAR_READY",
    resume: `JORDAN CHEN
Email: jordan.chen@example.com | Phone: (555) 902-1248 | Location: Austin, TX
GitHub: github.com/jordanchen-ops

PROFESSIONAL SUMMARY
DevOps & Systems Administrator with 4 years supporting Linux environments, CI/CD pipelines, and AWS cloud deployments. Experienced in automated scripting with Python and Bash.

EXPERIENCE
DevOps Engineer | CloudScale Networks (2022 - Present)
- Automated deployment workflows using GitHub Actions and GitLab CI, reducing release lead time by 40%.
- Managed AWS infrastructure including EC2 instances, S3 buckets, VPC networking, and IAM role security.
- Packaged multi-tier applications into Docker containers and collaborated with developers on environment parity.

Systems Administrator | DataPoint Corp (2020 - 2022)
- Maintained Linux (Ubuntu/RHEL) server clusters and automated system monitoring with Prometheus and Grafana.
- Wrote Python and Bash scripts for log rotation, automated backups, and disk cleanup.

SKILLS
Cloud: AWS (EC2, S3, CloudWatch, Route53)
Tools: Docker, Git, CI/CD, GitHub Actions, Linux, Bash, Python
Listed Skills: Kubernetes, Terraform, Microservices

EDUCATION
B.S. in Information Technology | Texas A&M University (2020)`,
    jobDescription: `SITE RELIABILITY / DEVOPS ENGINEER
Company: Quantum Cloud Systems
Location: Austin, TX

RESPONSIBILITIES:
- Maintain 99.99% service availability across multi-region Kubernetes clusters.
- Manage infrastructure as code utilizing Terraform.
- Oversee AWS cloud infrastructure and container security policies.
- Build automated CI/CD pipelines for continuous deployment.

CRITICAL REQUIREMENTS:
- Extensive production hands-on experience orchestrating Kubernetes (EKS / GKE) clusters.
- Demonstrated experience deploying infrastructure with Terraform.
- Strong knowledge of AWS cloud services and Docker containerization.
- Proficiency in Linux systems administration and CI/CD pipelines.

PREFERRED:
- Experience with Prometheus/Grafana monitoring.`
  },
  {
    id: "sample-career-changer",
    name: "Junior Developer",
    category: "Junior Transition",
    track: "TECHNICAL",
    expectedState: "NOT_READY",
    resume: `TAYLOR MORGAN
Email: taylor.morgan@example.com | Location: Seattle, WA
GitHub: github.com/taylormorgan

SUMMARY
Junior web developer eager to contribute. Completed intensive 12-week coding bootcamp covering HTML, CSS, and basic JavaScript.

PROJECTS
Recipe Finder App (Bootcamp Capstone Project)
- Built interactive single-page recipe search app using vanilla JavaScript and Spoonacular REST API.
- Styled pages with responsive CSS flexbox layout.

Personal Portfolio
- Created static personal website hosted on GitHub Pages.

SKILLS
HTML5, CSS3, JavaScript, Git, VS Code

EDUCATION
Certificate of Web Development | Northwest Tech Bootcamp (2024)
B.A. in Communications | Washington State University (2020)`,
    jobDescription: `BACKEND JAVA SOFTWARE ENGINEER
Company: Enterprise Data Core
Location: Seattle, WA

RESPONSIBILITIES:
- Develop mission-critical backend microservices in Java 17 and Spring Boot.
- Write transactional persistence queries using Spring Data JPA and PostgreSQL.
- Architect high-performance distributed caching strategies with Redis.
- Collaborate with cloud platform engineers to deploy Docker containers onto Kubernetes.

CRITICAL REQUIREMENTS:
- 3+ years professional software engineering experience in Java.
- Deep expertise with Spring Boot and Spring Data JPA.
- Strong relational database modeling and query tuning in PostgreSQL.
- Experience writing JUnit tests and working with Docker.`
  },

  // ================= NON-TECHNICAL SAMPLES =================
  {
    id: "sample-senior-pm",
    name: "Senior Product Manager",
    category: "Product Management",
    track: "NON_TECHNICAL",
    expectedState: "READY",
    resume: `SAMANTHA VANCE
Email: samantha.vance@example.com | Phone: (555) 712-4490 | Location: New York, NY
LinkedIn: linkedin.com/in/samanthavance-pm

PROFESSIONAL SUMMARY
Senior Product Manager with 7+ years of experience leading cross-functional teams in B2B SaaS and marketplace platforms. Scaled annual recurring revenue (ARR) from $4M to $16M through customer discovery, data-informed roadmap prioritization, and rapid experimentation. Expert in Agile/Scrum and stakeholder management.

EXPERIENCE
Lead Product Manager | CloudHub Solutions (2021 - Present)
- Owned product vision, quarterly OKRs, and backlog prioritization for core enterprise analytics platform used by 250k daily active users.
- Partnered with engineering, design, and sales leads to launch automated workflows, driving a 34% increase in user retention and $4.2M new ARR.
- Conducted over 90 user discovery interviews and led weekly sprint grooming, release planning, and retrospective sessions in Jira.
- Reduced customer onboarding time from 14 days to 3.5 days through iterative UI optimization in Figma and Amplitude funnel analysis.

Product Manager | Omnia Commerce (2018 - 2021)
- Managed self-serve billing and checkout experiences, boosting conversion rate by 18.5% across 4 global regions.
- Designed and analyzed A/B test experiments resulting in a 12% reduction in cart abandonment.
- Authored detailed PRDs, user stories, and acceptance criteria for engineering sprints.

CORE COMPETENCIES & SKILLS
Product Strategy, Agile / Scrum Methodology, Product Roadmapping, User Story Mapping, Stakeholder Management, Customer Discovery, OKR Planning, PRD Authoring, A/B Testing, User Research
Tools: Jira, Confluence, Figma, Mixpanel, Amplitude, Google Analytics, Tableau, Slack

EDUCATION
Bachelor of Science in Business Administration | New York University (Stern School of Business) (2014 - 2018)

CERTIFICATIONS
- Certified Scrum Product Owner (CSPO)
- Pragmatic Institute Certified (PMC-III)`,
    jobDescription: `SENIOR PRODUCT MANAGER (B2B SAAS)
Company: ApexFlow Enterprise
Location: New York, NY / Hybrid

ABOUT THE ROLE:
ApexFlow is hiring a Senior Product Manager to lead our Core Platform product squad. You will define the multi-year roadmap, align cross-functional stakeholders, and translate complex customer pain points into high-velocity product solutions.

RESPONSIBILITIES:
- Define product vision, measurable OKRs, and quarterly roadmaps for enterprise SaaS tools.
- Lead Agile ceremonies including backlog grooming, sprint planning, and sprint reviews with engineering squads.
- Synthesize user research, qualitative customer feedback, and quantitative product metrics to validate feature bets.
- Author clear Product Requirement Documents (PRDs) and detailed user acceptance criteria.
- Coordinate go-to-market strategies with Product Marketing, Sales, and Customer Success teams.

CRITICAL REQUIREMENTS:
- 5+ years of dedicated product management experience in B2B SaaS or enterprise software.
- Proven mastery of Agile / Scrum methodologies and sprint backlog management.
- Strong track record of driving measurable business impact (ARR growth, retention, conversion rates).
- Deep experience using product analytics platforms (Amplitude, Mixpanel, or Tableau) to guide roadmap decisions.
- Exceptional stakeholder communication and cross-functional leadership skills.

PREFERRED QUALIFICATIONS:
- Certified Scrum Product Owner (CSPO) certification.
- Hands-on experience with Jira and Figma.`
  },
  {
    id: "sample-growth-marketing",
    name: "Growth Marketing Manager",
    category: "Marketing & Growth",
    track: "NON_TECHNICAL",
    expectedState: "NEAR_READY",
    resume: `MARCUS STERLING
Email: marcus.sterling@example.com | Phone: (555) 883-2019 | Location: Chicago, IL
LinkedIn: linkedin.com/in/marcussterling-growth

PROFESSIONAL SUMMARY
Data-driven Growth Marketer with 5 years managing multi-channel digital acquisition, paid performance marketing, and conversion rate optimization (CRO). Proven ability to scale pipeline while reducing Customer Acquisition Cost (CAC) by 26%.

EXPERIENCE
Growth Marketing Manager | ScaleVantage Media (2022 - Present)
- Managed $180K monthly paid acquisition budget across Google Ads, LinkedIn Ads, and Meta, delivering a 3.8x Return on Ad Spend (ROAS).
- Implemented full-funnel tracking and attribution modeling using Google Analytics 4, Tag Manager, and HubSpot CRM.
- Ran weekly CRO split-tests on landing pages using Webflow and Unbounce, boosting demo request conversion rate from 2.1% to 4.4%.

Digital Marketing Specialist | BrightPeak Tech (2019 - 2022)
- Produced SEO content strategies and email nurture sequences resulting in 65% organic traffic growth in 18 months.
- Managed outbound email drip campaigns achieving a 32% open rate and 6.4% click-through rate.

SKILLS & TOOLS
Performance Marketing, Paid Search (Google Ads), Paid Social (LinkedIn/Meta Ads), Conversion Rate Optimization (CRO), Lead Generation, SEO, Email Marketing, Customer Acquisition Cost (CAC) Reduction
Tools: Google Analytics 4, HubSpot, Google Tag Manager, Webflow, SEMrush, Mailchimp

EDUCATION
B.A. in Marketing & Communications | University of Illinois Urbana-Champaign (2019)`,
    jobDescription: `GROWTH MARKETING MANAGER
Company: Horizon Digital
Location: Chicago, IL / Remote

RESPONSIBILITIES:
- Own paid acquisition channels (Google Search, LinkedIn Ads, Paid Social) to generate qualified sales pipeline.
- Partner with product and sales to optimize end-to-end user acquisition funnels and reduce CAC.
- Build automated email lifecycle campaigns and lead nurturing sequences in HubSpot.
- Analyze campaign data and generate executive-level reporting on ROAS, CAC, and LTV.

CRITICAL REQUIREMENTS:
- 4+ years in growth marketing or performance marketing for high-growth tech companies.
- Proven track record scaling Google Ads and LinkedIn paid advertising campaigns.
- Expert proficiency with HubSpot CRM and marketing automation workflows.
- Strong data analysis capabilities using Google Analytics 4 and Tag Manager.
- Demonstrated experience executing Conversion Rate Optimization (CRO) tests.

PREFERRED:
- Knowledge of SQL or BI dashboarding tools (Looker/Tableau).`
  },
  {
    id: "sample-talent-ops",
    name: "HR & Talent Operations Lead",
    category: "Human Resources",
    track: "NON_TECHNICAL",
    expectedState: "READY",
    resume: `ELENA ROSTOVA
Email: elena.rostova@example.com | Phone: (555) 431-8902 | Location: Denver, CO
LinkedIn: linkedin.com/in/elenarostova-hr

SUMMARY
Senior HR & Talent Acquisition Lead with 6+ years driving full-cycle recruiting, people operations, and employee engagement programs. Successfully recruited 140+ corporate and tech roles while lowering average time-to-hire by 38%.

EXPERIENCE
Talent Acquisition & People Operations Lead | Summit Health Tech (2021 - Present)
- Designed end-to-end recruitment lifecycle and employer branding strategy across 6 departments.
- Reduced time-to-hire from 54 days to 33 days while maintaining a 94% 1-year employee retention rate.
- Managed enterprise ATS systems (Greenhouse & Lever), optimizing candidate pipeline stages and diversity hiring metrics.
- Facilitated new hire onboarding, performance review cycles, and employee relations discussions with department heads.

HR Generalist | Peak Systems (2018 - 2021)
- Managed employee payroll, benefits administration, and compliance reporting in ADP Workforce Now.
- Conducted candidate phone screens, structured interviews, and background checks.

SKILLS
Full Lifecycle Recruiting, Talent Sourcing, Applicant Tracking Systems (Greenhouse, Lever), Employer Branding, Employee Onboarding, Performance Management, Diversity & Inclusion Hiring, HR Compliance
Tools: Greenhouse, Lever, LinkedIn Recruiter, ADP Workforce Now, BambooHR, Slack, Workday

EDUCATION
B.S. in Human Resource Management | Colorado State University (2018)

CERTIFICATIONS
- SHRM-CP (Society for Human Resource Management Certified Professional)`,
    jobDescription: `TALENT ACQUISITION & HR LEAD
Company: Keystone Innovations
Location: Denver, CO / Hybrid

RESPONSIBILITIES:
- Lead corporate and commercial talent acquisition efforts from sourcing to offer negotiation.
- Oversee ATS workflows in Greenhouse to streamline candidate experience and pipeline velocity.
- Partner with department VPs to build quarterly workforce plans and headcount forecasts.
- Champion diversity, equity, and inclusion (DEI) initiatives across interview panels.

CRITICAL REQUIREMENTS:
- 5+ years experience in full-lifecycle recruitment and human resources operations.
- Hands-on expertise managing ATS platforms (Greenhouse or Lever).
- Proven track record reducing time-to-fill and improving candidate conversion rates.
- Excellent interview assessment and stakeholder management capabilities.

PREFERRED:
- SHRM-CP or PHR certification.
- Experience with BambooHR or Workday.`
  }
];
