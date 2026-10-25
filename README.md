# EthioClaim

**Policy-first motor insurance claim intake and AI-assisted evidence review platform**

EthioClaim helps an insurer or claims team register motor insurance claims, link them to existing policy and vehicle records, collect vehicle-damage photographs, surface duplicate or visually similar evidence, and record a human examiner's assessment.

> **AI is advisory only.** EthioClaim never approves or rejects a claim and never labels a person as fraudulent. Damage detection and similarity results are leads for a human examiner.

Built by **Samuel Nigussie**, **Mussie Ferde**, and **Maraky Ayalneh** at the **INSA Summer Camp**.

---

## Table of contents

- [Repository branches](#repository-branches)
- [Key features](#key-features)
- [System architecture](#system-architecture)
- [Roles and permissions](#roles-and-permissions)
- [Claim workflow](#claim-workflow)
- [AI evidence analysis](#ai-evidence-analysis)
- [Database model](#database-model)
- [Getting started](#getting-started)
- [API overview](#api-overview)
- [Security and privacy](#security-and-privacy)
- [Limitations](#limitations)
- [Documentation](#documentation)
- [Team](#team)

---

## Repository branches

The project is split across five branches. Each component lives in its own folder, so check out the branch you want to work on.

| Branch | Contents | Folder |
|---|---|---|
| `main` | Project overview (this README) | n/a |
| `frontend` | Earlier Next.js UI (dashboard, claims, AI analysis, investigation, decision pages) built on mock data | `ethioclaim-frontend/` |
| `frontend-final` | **Current** Next.js UI aligned with the API contract: login/signup, role dashboards, policy verification, claim wizard, evidence, and admin screens | `ethioclaim-frontend/` |
| `backend` | NestJS core API with Prisma schema and seed data | `ethioclaim-backend/` |
| `ai-service` | Private FastAPI image-analysis service | `ML-backend/` |

```bash
git clone https://github.com/EthioClaim/ethio-claim.git
cd ethio-claim
git checkout frontend-final   # or: backend, ai-service, frontend, main
```

---

## Key features

- **Policy-first intake:** a policy is registered before a claim is created. The policy number prefills policyholder and vehicle details, and the intake user only enters what is missing.
- **Role-based access:** Admin, Intake User, and Examiner, enforced by the backend on every protected endpoint.
- **Claim lifecycle:** draft, submit, review, request information, assess, and close, with a full timeline.
- **Evidence handling:** private storage, SHA-256 exact-duplicate checks, perceptual-hash near-duplicate checks, and embedding-based similarity search.
- **Damage detection:** a fine-tuned YOLO11n model locates visible damage in photographs.
- **Examiner assessment:** manual severity, estimated loss in Ethiopian birr (ETB), notes, and recommendation.
- **Audit log:** append-only record of important actions.
- **Resilient by design:** a failed AI request never deletes the claim or the uploaded photo.

---

## System architecture

The browser talks only to the NestJS API. The FastAPI AI service is private and is called only by NestJS.

```
Browser / Next.js frontend
          │  HTTPS
          ▼
   NestJS core API  ──────────────►  Private FastAPI AI service
 (auth, RBAC, claims, evidence,      (damage detection, hashing,
  assessments, audit)                 embeddings, similarity)
     │            │
     ▼            ▼
 PostgreSQL     Private file
 (via Prisma)   storage
```

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod, Zustand, Recharts |
| Core API | NestJS, TypeScript, Prisma, PostgreSQL, JWT / Passport, Swagger |
| AI service | FastAPI, Python 3.11, Pillow, NumPy, Qdrant adapter |
| AI models | YOLO11n (damage detection), DINOv2-small (image similarity) |

---

## Roles and permissions

| Action | Admin | Intake User | Examiner |
|---|---|---|---|
| System-wide dashboard | Yes | No | No |
| Manage users and roles | Yes | No | No |
| Create or edit policy records | Yes | No | No |
| Verify a policy | Yes | Yes | Read-only |
| Create, edit, and submit claims | Exceptional | Yes | No |
| Upload evidence | Exceptional | Yes | Optional |
| View AI results and matches | Operational need | Limited summary | Yes (assigned claims) |
| Record severity and loss assessment | No | No | Yes |
| Assign an examiner | Yes | No | No |
| View audit log | Yes | Limited | Own activity |
| Modify audit log | Never | Never | Never |

---

## Claim workflow

```
DRAFT → SUBMITTED → UNDER_REVIEW ⇄ INFO_REQUESTED → INFO_RECEIVED
                         │
                         ▼
              ASSESSMENT_SUBMITTED → (APPROVED / REJECTED, if enabled) → CLOSED
```

Claim status is kept separate from evidence-analysis status. A claim can stay under review while one image's analysis has failed.

---

## AI evidence analysis

### Vehicle damage detection

- **Model:** YOLO11n fine-tuned on the CarDD dataset (6 classes: dent, scratch, crack, shattered glass, broken lamp, flat tire).
- **Training:** 50 epochs, 640 × 640 input, batch size 16, on a Tesla T4 (about 1 hour).
- **Split:** 2,816 training, 810 validation, 374 test images.

| Metric | Validation | Test |
|---|---|---|
| Precision | 0.731 | 0.738 |
| Recall | 0.679 | 0.653 |
| mAP@50 | 0.707 | **0.701** |
| mAP@50–95 | 0.563 | **0.550** |

Strong on shattered glass (mAP@50 0.990), flat tire (0.881), and broken lamp (0.823). Weaker on dent (0.602), scratch (0.558), and especially crack (0.350).

### Image similarity retrieval

DINOv2-small embeddings (384-dimensional, cosine similarity) compared against exact and perceptual hashing on 1,200 synthetic edit queries (exact copy, resize, JPEG re-save, crop, brightness, flip):

| Method | Recall@1 | Recall@5 |
|---|---|---|
| SHA-256 | 0.167 | 0.167 |
| Perceptual hash (pHash) | 0.731 | 0.771 |
| **DINOv2-small** | **0.995** | **0.998** |

Provisional similarity policy (to be recalibrated on representative data): **≥ 0.90** strong match, **0.80 to < 0.90** show as a candidate, **< 0.80** no flag.

> These results come from public data (CarDD) and controlled image edits. They do **not** establish real-world fraud-detection performance, and they do not cover Ethiopian vehicles or real claim photographs.

---

## Database model

PostgreSQL accessed through Prisma. The current schema has 9 models: `User`, `Policy`, `Claim`, `Evidence`, `DamageAnalysis`, `SimilarityMatch`, `ExaminerAssessment`, `ClaimDecision`, and `AuditEvent`.

![EthioClaim ER diagram](docs/ethioclaim_er_diagram_landscape.png)

- Monetary values use `Decimal` and are in ETB.
- `Evidence.uploadedById` and `ClaimDecision.actorId` are plain UUID columns without a declared Prisma relation.

---

## Getting started

### Prerequisites

- Node.js 20 or newer and npm
- PostgreSQL
- Python 3.11 (for the AI service)
- Optional: Docker, and a Qdrant instance for vector search

### 1. Core API (`backend` branch)

```bash
git checkout backend
cd ethioclaim-backend
npm install
```

Create a `.env` file:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/ethioclaim
DIRECT_URL=postgresql://USER:PASSWORD@localhost:5432/ethioclaim
PORT=3005
FRONTEND_URL=http://localhost:3000
ML_SERVICE_URL=http://127.0.0.1:8000
INTERNAL_SERVICE_TOKEN=replace-with-a-long-random-secret
```

Set up the database and start the server:

```bash
npx prisma generate
npm run db:setup        # applies migrations and seeds demo data
npm run start:dev
```

The API is served at `http://localhost:3005/api/v1`.

**Demo accounts** (created by the seed script, fictional data only; password for all: `Password123!`):

| Role | Email |
|---|---|
| Admin | `admin@ethioclaim.test` |
| Examiner | `examiner@ethioclaim.test` |
| Intake User | `intake@ethioclaim.test` |

Seeded demo policy numbers include `MTR-000001`, `MTR-000002`, and `MTR-000123`. Change or remove these before any real deployment.

### 2. AI service (`ai-service` branch)

```bash
git checkout ai-service
cd ML-backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then set INTERNAL_SERVICE_TOKEN
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Key settings in `.env` (see `.env.example` for all of them):

| Variable | Purpose |
|---|---|
| `INTERNAL_SERVICE_TOKEN` | Shared secret; must match the NestJS value |
| `USE_MOCK_DAMAGE_MODEL` / `USE_MOCK_EMBEDDING_MODEL` | `true` uses mock adapters; set `false` once real weights are installed |
| `DAMAGE_MODEL_PATH` | Path to the trained damage detector weights |
| `QDRANT_URL`, `QDRANT_COLLECTION` | Vector store for similarity search |
| `MAX_IMAGE_BYTES`, `MAX_IMAGE_DIMENSION`, `ANALYSIS_TIMEOUT_SECONDS` | Intake limits |

Interactive docs are at `http://localhost:8000/docs`. Run the tests with `pytest`. A `Dockerfile` is included:

```bash
docker build -t ethioclaim-ai .
docker run -p 8000:8000 --env-file .env ethioclaim-ai
```

### 3. Frontend (`frontend-final` branch)

```bash
git checkout frontend-final
cd ethioclaim-frontend
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3005/api/v1
```

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
```

---

## API overview

Base URL: `/api/v1`. Full contracts are in the project documentation.

| Area | Examples |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Policies | `POST /policies/verify`, `GET/POST /admin/policies` |
| Claims | `POST /claims`, `GET /claims`, `POST /claims/:id/submit`, `PATCH /claims/:id/assign` |
| Evidence | `POST /claims/:id/evidence`, `GET /evidence/:id/file`, `GET /evidence/:id/matches`, `POST /evidence/:id/reanalyze` |
| Assessment | `POST /claims/:id/assessment`, `GET /claims/:id/assessment` |
| Admin | `GET /admin/users`, `GET /admin/audit-log`, `GET /admin/operations/analysis` |
| Health | `GET /health` |

Internal AI service endpoints (called only by NestJS): `POST /internal/v1/analyze`, `POST /internal/v1/similarity/search`, `GET /health/live`, `GET /health/ready`.

Errors use one consistent shape with a stable `code` such as `POLICY_NOT_ELIGIBLE` or `INVALID_STATUS_TRANSITION`.

---

## Security and privacy

- Passwords are hashed and never stored in plaintext; login errors are generic.
- Authorization is checked on the backend for every role and every record. Hiding a button in the UI is not a security control.
- Uploaded images are served from private storage after an authorization check, never through guessable public URLs.
- The AI service is internal, authenticated with a service token, and rejects arbitrary URLs and file paths.
- Policy lookup returns only the minimum data needed to register a claim.
- Audit events can never be edited or deleted through the application.
- Secrets belong in environment variables and are never committed. `.env` files are git-ignored.

---

## Limitations

- The platform runs on **fictional demo data** and has no connection to a real insurer.
- AI components were evaluated on public data and synthetic edits only; local performance on Ethiopian vehicles and real claims is unknown.
- The damage detector is weak on cracks, scratches, and dents.
- Similarity thresholds are provisional and were tested on a small, easy gallery without hard negatives.
- Not implemented: OCR, image-quality checks, severity estimation, repair-cost estimation, and automatic decisions.

---

## Documentation

The full project documentation (product design, frontend, backend, API contracts, database model, AI evaluation, security, and testing) is in [`docs/EthioClaim_Project_Documentation.pdf`](docs/EthioClaim_Project_Documentation.pdf).

---

## Team

| Name |
|---|
| Samuel Nigussie |
| Mussie Ferde |
| Maraky Ayalneh |

INSA Summer Camp, October 2026.

---

## Acknowledgements and references

- **CarDD:** Wang, Li, and Wu, "CarDD: A New Dataset for Vision-based Car Damage Detection," IEEE Transactions on Intelligent Transportation Systems, 2023 (arXiv:2211.00945). CarDD is distributed for non-commercial research and educational use.
- **DINOv2:** Oquab et al., "DINOv2: Learning Robust Visual Features without Supervision," 2023.
- **Ultralytics YOLO11:** https://docs.ultralytics.com
