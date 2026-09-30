# AI ML Project Ideas

**User:** Anonymous  
**Created:** 9/13/2026 16:43:30  
**Updated:** 9/30/2026 13:04:46  
**Exported:** 9/30/2026 13:10:00  
**Link:** [https://chatgpt.com/c/6aa6a882-88d0-83ea-bc04-db0dc14b3a67](https://chatgpt.com/c/6aa6a882-88d0-83ea-bc04-db0dc14b3a67)  

## Response:
9/30/2026, 12:38:32 PM · gpt-5-6

Yes. For **EthioClaim**, I recommend keeping the frontend and backend as **two completely separate applications** rather than putting everything in one monorepo.

The architecture should be:

```text
EthioClaim/
├── ethioclaim-frontend/     # Next.js + TypeScript
└── ethioclaim-backend/      # Django + DRF + Celery
```

Since you're building a serious B2B SaaS product, I would structure it from the beginning so you can later add the **AI inference service** without rewriting the backend.

---

# 1. Overall Architecture

```text
                         ETHIOCLAIM
                              |
              ┌───────────────┴───────────────┐
              │                               │
       FRONTEND APPLICATION             BACKEND APPLICATION
       Next.js / TypeScript              Django / DRF
              │                               │
              │                         ┌─────┴─────┐
              │                         │           │
              │                     PostgreSQL    Redis
              │                         │           │
              │                         │        Celery
              │                         │           │
              │                         │      AI Jobs
              │                         │           │
              │                         │           ▼
              │                         │      AI Services
              │                         │      /Inference
              │                         │
              └──────────── REST API ───┘
                              |
                         Object Storage
                       photos/documents
```

I recommend:

### Frontend

- **Next.js**
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Zustand where needed
- Recharts
- Axios or native `fetch`

### Backend

- **Django**
- Django REST Framework
- PostgreSQL
- Redis
- Celery
- JWT authentication
- S3-compatible object storage
- OpenAPI/Swagger

### AI later

Do **not** put your PyTorch models directly inside Django application code.

Eventually:

```text
Django
   |
Celery
   |
AI inference service
   |
PyTorch / YOLO / OCR / embeddings
```

This separation will save you a lot of trouble.

---

# 2. Complete Project Structure

Your root directory should look like:

```text
EthioClaim/
│
├── ethioclaim-frontend/
│
├── ethioclaim-backend/
│
├── README.md
├── .gitignore
└── LICENSE
```

You can keep both repositories under one parent directory initially.

---

# 3. FRONTEND

I recommend this structure:

```text
ethioclaim-frontend/
│
├── public/
│   ├── images/
│   ├── icons/
│   └── logos/
│
├── src/
│   │
│   ├── app/
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── reset-password/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── claims/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [claimId]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── evidence/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── documents/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── ai-analysis/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── investigation/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── decision/
│   │   │   │           └── page.tsx
│   │   │
│   │   │   ├── inspections/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [inspectionId]/
│   │   │   │       └── page.tsx
│   │   │
│   │   │   ├── vehicles/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [vehicleId]/
│   │   │   │       └── page.tsx
│   │   │
│   │   │   ├── policies/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [policyId]/
│   │   │   │       └── page.tsx
│   │   │
│   │   │   ├── investigations/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [investigationId]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [reportId]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── organization/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── roles/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── integrations/
│   │   │   │       └── page.tsx
│   │   │
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/
│   │   │   └── ...
│   │   │
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   │
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── breadcrumbs.tsx
│   │   │   ├── mobile-sidebar.tsx
│   │   │   └── page-header.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── stats-card.tsx
│   │   │   ├── claims-overview.tsx
│   │   │   ├── claims-chart.tsx
│   │   │   ├── risk-distribution.tsx
│   │   │   ├── processing-time.tsx
│   │   │   └── recent-claims.tsx
│   │   │
│   │   ├── claims/
│   │   │   ├── claim-card.tsx
│   │   │   ├── claim-table.tsx
│   │   │   ├── claim-filters.tsx
│   │   │   ├── claim-status-badge.tsx
│   │   │   ├── claim-timeline.tsx
│   │   │   ├── claim-summary.tsx
│   │   │   ├── claim-form.tsx
│   │   │   └── claim-actions.tsx
│   │   │
│   │   ├── evidence/
│   │   │   ├── evidence-uploader.tsx
│   │   │   ├── evidence-grid.tsx
│   │   │   ├── evidence-viewer.tsx
│   │   │   ├── image-viewer.tsx
│   │   │   ├── image-comparison.tsx
│   │   │   ├── evidence-quality.tsx
│   │   │   └── upload-progress.tsx
│   │   │
│   │   ├── ai/
│   │   │   ├── ai-summary.tsx
│   │   │   ├── damage-overlay.tsx
│   │   │   ├── damage-findings.tsx
│   │   │   ├── confidence-indicator.tsx
│   │   │   ├── risk-score.tsx
│   │   │   ├── risk-reasons.tsx
│   │   │   ├── similarity-results.tsx
│   │   │   ├── consistency-results.tsx
│   │   │   └── ai-processing-status.tsx
│   │   │
│   │   ├── documents/
│   │   │   ├── document-uploader.tsx
│   │   │   ├── document-viewer.tsx
│   │   │   ├── document-preview.tsx
│   │   │   ├── extracted-fields.tsx
│   │   │   └── extraction-confidence.tsx
│   │   │
│   │   ├── inspections/
│   │   │   ├── inspection-checklist.tsx
│   │   │   ├── photo-guidelines.tsx
│   │   │   ├── inspection-status.tsx
│   │   │   └── inspection-summary.tsx
│   │   │
│   │   ├── investigations/
│   │   │   ├── investigation-card.tsx
│   │   │   ├── investigation-table.tsx
│   │   │   ├── evidence-network.tsx
│   │   │   ├── investigation-notes.tsx
│   │   │   └── investigation-timeline.tsx
│   │   │
│   │   ├── analytics/
│   │   │   ├── claims-volume-chart.tsx
│   │   │   ├── claim-status-chart.tsx
│   │   │   ├── risk-chart.tsx
│   │   │   ├── damage-chart.tsx
│   │   │   └── processing-time-chart.tsx
│   │   │
│   │   └── forms/
│   │       ├── form-field.tsx
│   │       ├── date-picker.tsx
│   │       ├── file-upload.tsx
│   │       └── form-error.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   ├── types.ts
│   │   │   └── schemas.ts
│   │   │
│   │   ├── claims/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   ├── types.ts
│   │   │   └── schemas.ts
│   │   │
│   │   ├── evidence/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── documents/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── investigations/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── types.ts
│   │   │
│   │   └── analytics/
│   │       ├── api.ts
│   │       ├── hooks.ts
│   │       └── types.ts
│   │
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   ├── constants.ts
│   │   ├── permissions.ts
│   │   ├── utils.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   │
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-debounce.ts
│   │   ├── use-pagination.ts
│   │   ├── use-upload.ts
│   │   └── use-permissions.ts
│   │
│   ├── store/
│   │   ├── auth-store.ts
│   │   ├── ui-store.ts
│   │   └── claim-store.ts
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── claims.ts
│   │   ├── evidence.ts
│   │   ├── ai.ts
│   │   └── common.ts
│   │
│   └── config/
│       ├── navigation.ts
│       ├── environment.ts
│       └── permissions.ts
│
├── tests/
│   ├── components/
│   ├── features/
│   └── e2e/
│
├── .env.local
├── .env.example
├── .gitignore
├── components.json
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

# 4. Why I'm separating `components` and `features`

This is important.

Don't put everything under:

```text
components/
```

because eventually you'll have 200+ components.

Instead:

### `components/`

Contains **reusable UI**.

Example:

```text
components/ui/button.tsx
components/ui/dialog.tsx
components/ui/table.tsx
```

and domain-oriented reusable components:

```text
components/claims/claim-table.tsx
components/ai/risk-score.tsx
```

### `features/`

Contains **business logic associated with a feature**.

For example:

```text
features/claims/
    api.ts
    hooks.ts
    schemas.ts
    types.ts
```

This means:

```text
Claim page
    ↓
Claim components
    ↓
Claim hooks
    ↓
Claim API
    ↓
Backend
```

Much easier to maintain.

---

# 5. BACKEND

For your backend, I recommend **Django + Django REST Framework**.

The structure should be:

```text
ethioclaim-backend/
│
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   ├── production.py
│   │   └── testing.py
│   │
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── celery.py
│   └── api.py
│
├── apps/
│   │
│   ├── accounts/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── services.py
│   │   ├── selectors.py
│   │   ├── validators.py
│   │   └── tests/
│   │       ├── test_models.py
│   │       ├── test_api.py
│   │       └── test_permissions.py
│   │
│   ├── organizations/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── services.py
│   │   └── tests/
│   │
│   ├── policies/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   ├── selectors.py
│   │   └── tests/
│   │
│   ├── vehicles/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tests/
│   │
│   ├── claims/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── claim.py
│   │   │   ├── claimant.py
│   │   │   ├── incident.py
│   │   │   └── decision.py
│   │   ├── serializers/
│   │   │   ├── __init__.py
│   │   │   ├── claim.py
│   │   │   ├── incident.py
│   │   │   └── decision.py
│   │   ├── views/
│   │   │   ├── __init__.py
│   │   │   ├── claim.py
│   │   │   ├── incident.py
│   │   │   └── decision.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── claim_service.py
│   │   │   ├── claim_lifecycle.py
│   │   │   └── decision_service.py
│   │   ├── selectors/
│   │   │   ├── __init__.py
│   │   │   └── claim_selectors.py
│   │   ├── urls.py
│   │   └── tests/
│   │
│   ├── evidence/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── evidence.py
│   │   │   ├── image.py
│   │   │   └── document.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services/
│   │   │   ├── upload_service.py
│   │   │   ├── storage_service.py
│   │   │   └── validation_service.py
│   │   └── tests/
│   │
│   ├── inspections/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tests/
│   │
│   ├── ai_analysis/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── analysis.py
│   │   │   ├── damage_finding.py
│   │   │   ├── similarity.py
│   │   │   ├── consistency.py
│   │   │   └── risk_assessment.py
│   │   │
│   │   ├── serializers/
│   │   │   ├── __init__.py
│   │   │   ├── analysis.py
│   │   │   ├── damage.py
│   │   │   ├── similarity.py
│   │   │   └── risk.py
│   │   │
│   │   ├── views.py
│   │   ├── urls.py
│   │   │
│   │   ├── services/
│   │   │   ├── analysis_service.py
│   │   │   ├── damage_service.py
│   │   │   ├── similarity_service.py
│   │   │   ├── consistency_service.py
│   │   │   └── risk_service.py
│   │   │
│   │   └── tests/
│   │
│   ├── investigations/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tests/
│   │
│   ├── analytics/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services/
│   │   │   ├── claims_metrics.py
│   │   │   ├── risk_metrics.py
│   │   │   └── performance_metrics.py
│   │   └── tests/
│   │
│   ├── notifications/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── tasks.py
│   │   └── tests/
│   │
│   ├── audit/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── services.py
│   │   └── tests/
│   │
│   ├── billing/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tests/
│   │
│   └── integrations/
│       ├── migrations/
│       ├── __init__.py
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── services/
│       │   ├── policy_import.py
│       │   ├── claim_import.py
│       │   └── external_api.py
│       └── tests/
│
├── ai/
│   │
│   ├── damage_detection/
│   │   ├── models/
│   │   ├── inference/
│   │   ├── preprocessing/
│   │   ├── postprocessing/
│   │   └── config/
│   │
│   ├── segmentation/
│   │   ├── models/
│   │   ├── inference/
│   │   └── config/
│   │
│   ├── image_quality/
│   │   ├── models/
│   │   ├── inference/
│   │   └── config/
│   │
│   ├── ocr/
│   │   ├── preprocessing/
│   │   ├── extraction/
│   │   ├── postprocessing/
│   │   └── config/
│   │
│   ├── embeddings/
│   │   ├── models/
│   │   ├── inference/
│   │   └── vector_store/
│   │
│   ├── similarity/
│   │   ├── retrieval.py
│   │   ├── ranking.py
│   │   └── thresholds.py
│   │
│   ├── anomaly_detection/
│   │   ├── models/
│   │   ├── features/
│   │   └── inference/
│   │
│   ├── consistency/
│   │   ├── rules/
│   │   ├── features/
│   │   └── inference/
│   │
│   ├── risk_model/
│   │   ├── features/
│   │   ├── models/
│   │   ├── calibration/
│   │   └── inference/
│   │
│   ├── pipelines/
│   │   ├── claim_pipeline.py
│   │   └── evidence_pipeline.py
│   │
│   ├── datasets/
│   │   ├── raw/
│   │   ├── processed/
│   │   ├── annotations/
│   │   └── splits/
│   │
│   ├── experiments/
│   │   ├── damage/
│   │   ├── segmentation/
│   │   ├── embeddings/
│   │   └── risk/
│   │
│   └── evaluation/
│       ├── detection/
│       ├── segmentation/
│       ├── retrieval/
│       ├── ocr/
│       └── risk/
│
├── common/
│   ├── constants.py
│   ├── enums.py
│   ├── exceptions.py
│   ├── pagination.py
│   └── utils.py
│
├── scripts/
│   ├── seed_database.py
│   ├── create_admin.py
│   ├── generate_synthetic_claims.py
│   └── import_dataset.py
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
│
├── docker/
│   ├── backend/
│   │   └── Dockerfile
│   ├── worker/
│   │   └── Dockerfile
│   └── nginx/
│       └── nginx.conf
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── manage.py
├── .env
├── .env.example
├── .gitignore
├── pyproject.toml
├── pytest.ini
└── README.md
```

---

# 6. Why the backend is divided this way

There are **three important boundaries** here.

## Boundary 1 — Business logic

```text
apps/
```

Django owns:

- users
- organizations
- policies
- vehicles
- claims
- evidence
- investigations
- billing
- analytics

---

## Boundary 2 — AI

```text
ai/
```

This owns:

- PyTorch
- YOLO
- OCR
- embeddings
- anomaly models
- risk models
- evaluation

This is important because your ML code should **not** become tangled with Django.

For example, don't do this:

```python
# claims/views.py

model = YOLO("best.pt")
result = model(image)
```

That becomes painful very quickly.

Instead:

```text
Django
   ↓
Celery task
   ↓
AI service
   ↓
model inference
   ↓
result
   ↓
Django database
```

---

# 7. Claims Backend Structure

This is probably the most important backend app.

I'd make:

```text
apps/claims/
```

responsible for the **business lifecycle**.

It should understand:

```text
DRAFT
SUBMITTED
EVIDENCE_REQUIRED
PROCESSING
TRIAGED
UNDER_REVIEW
INVESTIGATION
APPROVED
REJECTED
SETTLED
CLOSED
```

But it should **not** understand how YOLO works.

That's AI's responsibility.

---

# 8. Evidence Architecture

Evidence should be its own application:

```text
apps/evidence/
```

because eventually you may have:

```text
IMAGE
VIDEO
PDF
DOCUMENT
RECEIPT
POLICE_REPORT
REPAIR_ESTIMATE
OTHER
```

Your database stores metadata:

```text
Evidence
---------
id
claim_id
type
file_name
mime_type
storage_key
file_size
sha256
uploaded_by
created_at
```

The actual image shouldn't live in PostgreSQL.

Instead:

```text
PostgreSQL
    |
    | storage_key
    ↓
Object Storage
```

For example:

```text
claims/
    2026/
        EC-2026-000123/
            evidence/
                front.jpg
                rear.jpg
                damage_01.jpg
            documents/
                claim_form.pdf
                estimate.pdf
```

---

# 9. AI Database Relationship

This is extremely important for your project.

Suppose AI analyzes:

```text
damage_01.jpg
```

Don't just save:

```text
damage = "dent"
```

Save something like:

```text
AIAnalysis
----------------
id
claim_id
evidence_id
model_name
model_version
processing_time
status
created_at
```

Then:

```text
DamageFinding
----------------
analysis_id
part
damage_type
confidence
bbox
mask
severity
```

And:

```text
RiskAssessment
----------------
claim_id
model_version
risk_score
risk_level
reasons
created_at
```

This lets you later answer:

> Which model generated this result?

That becomes extremely important once you start retraining models.

---

# 10. Celery Architecture

Don't make the user wait while Python processes everything.

When:

```text
POST /claims/{id}/process
```

is called:

```text
Django
   |
   v
Create AIAnalysis
   |
   v
Celery task
   |
   +---- Image quality
   |
   +---- Damage detection
   |
   +---- OCR
   |
   +---- Embeddings
   |
   +---- Similarity
   |
   +---- Consistency
   |
   +---- Risk
   |
   v
Update database
```

The frontend can then poll:

```text
GET /claims/{id}/ai-analysis
```

or eventually use WebSockets/SSE.

---

# 11. Frontend Pages I Would Build First

Don't build every page in the structure immediately.

Your first usable frontend should be:

```text
/login

/dashboard

/claims
/claims/new
/claims/[claimId]

/claims/[claimId]/evidence
/claims/[claimId]/documents
/claims/[claimId]/ai-analysis
```

The most important page is:

```text
/claims/[claimId]
```

It should eventually look conceptually like:

```text
┌────────────────────────────────────────────────────────────┐
│ Claim EC-2026-000123                    HIGH PRIORITY       │
├────────────────────────────────────────────────────────────┤
│ Vehicle      Policy       Claimant       Incident           │
│ Toyota       POL-...      ...            14 Sep 2026       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Evidence                                                   │
│                                                            │
│ [ Front ] [ Rear ] [ Left ] [ Right ] [ Damage ]          │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ AI ANALYSIS                                                │
│                                                            │
│ Damage                                                     │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Front bumper    Dent          Moderate       91%       │ │
│ │ Hood            Scratch       Minor          84%       │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Similar Evidence                                           │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Similar claim found                     91%             │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Evidence Consistency                                       │
│ ⚠ Medium                                                   │
│                                                            │
│ Risk Priority                                             │
│ HIGH                                                       │
│                                                            │
│ [ Accept Findings ] [ Request Evidence ] [ Investigate ]  │
└────────────────────────────────────────────────────────────┘
```

That page will become the **heart of EthioClaim**.

---

# 12. One change I strongly recommend

Don't build the frontend around the AI first.

Build around the **claims examiner workflow**.

The workflow should be:

```text
Claim
 ↓
Evidence
 ↓
AI Analysis
 ↓
Investigation
 ↓
Decision
```

The AI is embedded inside that workflow.

That means if tomorrow your YOLO model is replaced by a better model, the web application doesn't need to change.

---

# 13. Development order

I recommend you build in this order:

### Phase 1 — Foundation

```text
Backend
├── accounts
├── organizations
├── vehicles
├── policies
└── claims
```

Frontend:

```text
login
dashboard
claims
claim creation
claim details
```

---

### Phase 2 — Evidence

Backend:

```text
evidence
storage
upload
validation
```

Frontend:

```text
evidence uploader
image viewer
document viewer
```

---

### Phase 3 — AI integration

Backend:

```text
ai_analysis
Celery
Redis
```

AI:

```text
image_quality
damage_detection
segmentation
```

Frontend:

```text
AI findings
damage overlays
confidence
processing status
```

---

### Phase 4 — Intelligence

Add:

```text
OCR
embeddings
similarity
consistency
risk model
```

---

### Phase 5 — Business product

Then add:

```text
analytics
investigations
reports
organizations
roles
billing
integrations
audit
```

---

# 14. The final architecture

Your finished system should essentially become:

```text
                         ┌──────────────────┐
                         │   Next.js Web    │
                         │     Dashboard    │
                         └────────┬─────────┘
                                  │
                                  │ REST API
                                  ▼
                         ┌──────────────────┐
                         │     Django       │
                         │   REST API       │
                         └────────┬─────────┘
                                  │
            ┌─────────────────────┼──────────────────────┐
            │                     │                      │
            ▼                     ▼                      ▼
      PostgreSQL              Redis                 Object Store
            │                     │                      │
            │                     ▼                      │
            │                  Celery                   │
            │                     │                      │
            │                     ▼                      │
            │              ┌─────────────┐              │
            │              │ AI Pipeline │◄─────────────┘
            │              └──────┬──────┘
            │                     │
            │       ┌─────────────┼─────────────┐
            │       │             │             │
            │       ▼             ▼             ▼
            │    Damage          OCR       Embeddings
            │       │             │             │
            │       └─────────────┼─────────────┘
            │                     │
            │                     ▼
            │               Consistency
            │                     │
            │                     ▼
            │                Risk Model
            │                     │
            └─────────────────────┘
                                  │
                                  ▼
                           Human Examiner
                                  │
                                  ▼
                             Final Decision
                                  │
                                  ▼
                         Feedback / Labels
                                  │
                                  ▼
                           Better AI Models
```

**This is the architecture I'd recommend you commit to before starting implementation.** It gives you a clean separation between your teammate's software-engineering work and your ML work, while still allowing the two sides to integrate tightly through well-defined APIs and asynchronous AI jobs.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)