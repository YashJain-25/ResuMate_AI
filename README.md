# ResuMate AI — Career Readiness & Resume Intelligence Platform

ResuMate AI is an enterprise-grade AI Career Readiness and Resume Intelligence platform that bridges the gap between job seekers' raw experiences and target employment roles. It extracts canonical skills, audits verifiable evidence, deterministically scores career readiness, conducts objective technical video assessments, provides personalized learning paths with reassessment, and synthesizes ATS-compliant resumes with a 6-point verification audit.

---

## Architecture & Security Highlights

- **Guest-First Workflow:** Candidates can immediately test and evaluate readiness without an account; seamlessly link and persist analyses upon authentication.
- **Evidence-First Verification Hierarchy:** Eliminates keyword stuffing. Claims are ranked strictly from **VERY HIGH** (production experience) down to **NONE**.
- **Objective Video Competency Assessment:** Uses browser media capture to evaluate technical answers. Strictly ignores appearance, background, accent, or age.
- **Continuous Skill Gaps & Reassessment:** Candidates can complete practical modules, submit verifiable proof (e.g. GitHub repos, architecture write-ups), and boost their score from `NOT_READY` &rarr; `READY`.
- **Anti-Fabrication Resume Engine:** Guarantees zero hallucinations. Resumes are synthesized strictly from source facts and audited against 6 ATS compliance metrics.
- **Resilient Fallback Ladder & Sub-Second Latency:** Powered by the `@google/genai` TypeScript SDK with automated fallback across `gemini-3.1-flash-lite`, `gemini-3.6-flash`, `gemini-flash-latest`, and `gemini-3.7-flash` with parallelized document parsing and SHA-256 caching for instant responses.

---

## 1. Environment & Prerequisites

1. **Google Cloud Project:** Ensure you have an active GCP Project with billing enabled.
2. **Google Cloud SDK:** Install and configure the `gcloud` CLI:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. **Enable Required APIs:**
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     artifactregistry.googleapis.com \
     cloudbuild.googleapis.com
   ```

---

## 2. Secret Management Setup

ResuMate AI enforces a zero-hardcoding security standard. Sensitive credentials such as `GEMINI_API_KEY` are provisioned via Google Cloud Secret Manager.

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration

For production persistence, configure Cloud Firestore in Native mode and deploy the owner-bound security rules to ensure user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Build and deploy the application container directly to Cloud Run:

```bash
gcloud run deploy resumate-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## 5. Required Campaign Verification Labeling

To register the service for automated challenge verification, apply the mandatory resource label:

```bash
gcloud run services update <SERVICE_NAME> \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=<REGION>
```

---

## Local Development

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
