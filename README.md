# ResuMate AI — Deterministic Career Readiness & Anti-Hallucination ATS Resume Intelligence Platform

ResuMate AI is an enterprise-grade AI Career Readiness and Resume Intelligence platform that bridges the gap between job seekers' raw experiences and target employment roles. It extracts canonical skills, audits verifiable evidence, deterministically scores career readiness, conducts objective technical video assessments, provides personalized learning paths with reassessment, and synthesizes ATS-compliant resumes with a 6-point verification audit and a 7-Node Autonomous Orchestration Agent.

---

## Repository Security & Secret Management Architecture

ResuMate AI enforces a strict **Zero-Secret-In-Git** and **Backend-Isolated AI/OAuth** security model:

```text
project-root/
├── .env                          # Local secrets ONLY (Git-ignored, never committed)
├── .env.example                  # Safe environment variable template (Committed)
├── .gitignore                    # Hardened exclusions for secrets, keys, and runtime data
├── .github/
│   └── workflows/
│       └── security-scan.yml     # Automated CI secret & VITE_ boundary audit
├── server/
│   ├── config/
│   │   ├── env.ts                # Centralized server environment & leak auditor
│   │   └── secrets.ts            # Server-only secret loader (GEMINI_API_KEY, SESSION_SECRET, OAuth)
│   ├── agent.ts                  # 7-Node Autonomous Orchestration Agent
│   ├── ai.ts                     # Server-only @google/genai gateway
│   ├── db.ts                     # Local JSON persistence (.data/) + HMAC session tokens
│   ├── documentParser.ts         # PDF / DOCX / TXT extraction engine
│   ├── jobService.ts             # Verified job matching engine
│   ├── ontology.ts               # 250+ Canonical Skill Taxonomy
│   ├── sampleData.ts             # Calibration benchmark datasets
│   └── tools.ts                  # Deterministic scoring & anti-hallucination tools
├── src/                          # React 19 + TypeScript Frontend (Browser bundle)
├── firestore.rules               # Owner-isolated Cloud Firestore security rules
└── server.ts                     # Express API gateway + Vite middleware
```

### Strict Client vs. Server Boundary Rules
1. **Server-Only Secrets (`process.env` via `server/config/secrets.ts`):**
   - `GEMINI_API_KEY` — Used exclusively on the Express backend (`server/ai.ts`). The browser never calls Gemini directly.
   - `SESSION_SECRET` / `JWT_SECRET` — Used exclusively on the server (`server/db.ts`) to HMAC-sign session tokens.
   - `LINKEDIN_CLIENT_SECRET` — Used exclusively on the backend (`server.ts`) during the OAuth 2.0 authorization code exchange.
2. **Browser Bundle Protection (`VITE_*` Rule):**
   - Any variable prefixed with `VITE_` is statically embedded into client JavaScript by Vite.
   - **NEVER** place `GEMINI_API_KEY`, `SESSION_SECRET`, `JWT_SECRET`, `LINKEDIN_CLIENT_SECRET`, service-account private keys, or database passwords inside a `VITE_*` variable.
   - Startup validation in `server/config/env.ts` (`auditProcessEnvForLeaks()`) and CI checks in `.github/workflows/security-scan.yml` actively detect and block `VITE_*` secret leaks.
3. **Firebase Web SDK vs. Admin Credentials:**
   - `firebase-applet-config.json` and `VITE_FIREBASE_*` contain **public Firebase Web SDK identifiers** (`projectId`, `appId`, `apiKey`, `authDomain`, `firestoreDatabaseId`) required by the browser SDK. Data isolation is strictly enforced by `firestore.rules` (`request.auth != null && request.auth.uid == userId`).
   - Private Firebase Admin SDK service-account JSON files (`*-firebase-adminsdk-*.json`, `service-account.json`) are strictly blocked by `.gitignore`.
4. **Local Runtime Storage (`.data/`):**
   - Local candidate profiles, password hashes, session tokens, and analyses in `.data/resumate_store.json` are excluded from Git via `.gitignore`.

---

## Local Development Setup

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```
2. **Configure local environment variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set your server-side secrets:
   - `GEMINI_API_KEY` (Required for live Gemini AI extraction; deterministic fallback parser runs if omitted)
   - `SESSION_SECRET` (Recommended random 64-character hex string: `openssl rand -hex 32`)
   - `LINKEDIN_CLIENT_ID` & `LINKEDIN_CLIENT_SECRET` (Optional, for live LinkedIn OAuth 2.0 popup sign-in)
3. **Start the development server:**
   ```bash
   npm run dev
   ```
4. **Type-check and build for production:**
   ```bash
   npm run lint
   npm run build
   npm start
   ```

---

## Deploying Safely to Production (Cloud Run / GitHub Actions)

### Google Cloud Secret Manager + Cloud Run
Store sensitive keys in Secret Manager rather than committing files:

```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_REAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

gcloud secrets create SESSION_SECRET --replication-policy="automatic"
openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add SESSION_SECRET --data-file=-

gcloud run deploy resumate-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,SESSION_SECRET=SESSION_SECRET:latest
```

### GitHub Actions Secrets
When configuring CI/CD deployments on GitHub, navigate to **Settings → Secrets and variables → Actions** and add:
- `GEMINI_API_KEY`
- `SESSION_SECRET`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
