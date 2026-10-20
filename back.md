**ETHIOCLAIM**

**Full Backend Implementation & API Contract**

*Version 2.0 | 17 October 2026*

# 1. Purpose and backend scope

This is the implementation contract for the two backend contributors. The main backend is NestJS + TypeScript, backed by PostgreSQL + Prisma. The separate FastAPI AI service remains the same agreed AI component. NestJS is the source of truth for users, permissions, policies, claims, evidence metadata, analysis results, examiner assessments and audit history.

## 1.1 Fixed architecture decisions

* Frontend calls NestJS only; never call FastAPI from the browser.
* NestJS owns auth, authorization, business rules, database transactions and claim state.
* FastAPI owns image-processing computation only; it does not decide claim status or access policy.
* Persist uploaded evidence before analysis starts. If AI fails, preserve evidence and mark analysis FAILED/retryable.
* Do not implement OCR, image forensics, AI repair-cost prediction or automatic fraud/claim decisions.

# 2. Backend responsibilities and split for two people

## Person A — Core workflow backend (approximately 50%)

* Own NestJS bootstrap/configuration conventions, Prisma schema/migrations and seed script.
* Implement authentication, password hashing, JWT/session handling, current-user endpoint, role guards and ownership/scope checks.
* Implement User/Admin and Policy modules, policy verification rules and policy seed data.
* Implement Claim module: create/list/detail/update, filtering/pagination, claim number generation, validation and allowed status transitions.
* Implement ExaminerAssessment module: create/read/update severity, estimatedLossEtb Decimal, notes and examiner attribution.
* Implement Audit module/service and claim timeline; record who changed what and when.
* Implement dashboard summary and admin endpoints if time permits.
* Write unit/integration tests for auth, policy verification, claim CRUD, status machine, assessment permissions and audit.
* Maintain API response/error conventions and review Person B’s persistence assumptions.

## Person B — Evidence, analysis orchestration and AI service (approximately 50%)

* Own the separate FastAPI service and keep its agreed AI scope unchanged: SHA-256, pHash, embeddings/similarity, and pretrained damage inference only if suitable/validated.
* Implement NestJS Evidence module: upload validation, private storage, metadata, authorized download, listing and allowed soft deletion.
* Implement NestJS AI client for private FastAPI calls, timeouts, request authentication, sanitized errors and retry behavior.
* Implement analysis orchestration and persistence: PENDING/PROCESSING/COMPLETED/FAILED, inference metadata and retry endpoint.
* Implement SimilarityMatch persistence and endpoint, including candidate access restrictions and separate match types.
* Implement internal FastAPI endpoints, schemas, health check and tests for fingerprints, image decode, similarity and model availability.
* Write tests for invalid files, size limits, AI timeout/failure, retry, exact duplicates and match authorization.
* Coordinate database field names with Person A before schema freeze; do not independently redefine shared Claim/User/Policy models.

## Shared integration responsibilities

* Agree endpoint contracts and enums before parallel implementation.
* Use feature branches and pull requests; avoid editing the same Prisma schema without coordination.
* Person A owns final migration integration; Person B proposes Evidence/Analysis/Similarity fields and contributes schema changes through reviewed commits.
* Both review authorization boundaries and run the complete end-to-end flow.
* A single shared OpenAPI/endpoint table is the contract; frontend changes must not silently alter response shape.

# 3. Module boundaries and request flow

Frontend -> NestJS controller -> DTO validation -> service -> Prisma/PostgreSQL

|-> Audit service

|-> private AI client -> FastAPI

NestJS Evidence service -> private file storage

NestJS file endpoint -> authorization -> stream file (never public URL by default)

# 4. Roles and access matrix

|  |  |  |  |
| --- | --- | --- | --- |
| **Resource/action** | **INTAKE\_USER** | **EXAMINER** | **ADMIN** |
| Verify policy | Yes | Yes | Yes |
| Create claim | Yes | Yes | Yes |
| List/read claims | Only scoped claims | Authorized review queue/scope | All claims for administration |
| Edit intake fields | Before review / scoped | As needed with audit | As needed with audit |
| Upload evidence | Scoped claim | Scoped claim | Yes |
| Read/download evidence | Scoped claim | Authorized claim | Authorized administrative purpose |
| Reanalyze evidence | No | Yes | Yes |
| Set examiner assessment | No | Yes | Yes if operationally needed, audited |
| Change claim status | Only permitted submission transition | Allowed state transitions | Allowed transitions / audited override if implemented |
| Manage users/policies | No | No | Yes |

The exact tenancy model can be minimal for a demo, but every protected record must have a clear authorization rule. Do not rely on UUID secrecy or frontend route guards.

# 5. API conventions

* Prefix all endpoints with /api/v1.
* JSON field naming: camelCase. IDs: UUID strings. Dates: ISO-8601 UTC strings. Money: decimal string in API payloads, persisted as Decimal/Numeric.
* Authentication: Authorization: Bearer <token> or a secure session, selected once and used consistently.
* List response: { "items": [], "page": 1, "pageSize": 20, "total": 0 }.
* Error response: { "statusCode": 400, "code": "VALIDATION\_ERROR", "message": "...", "details": [] }. Do not return stack traces.
* Pagination: page >= 1; pageSize default 20 and maximum 100. Sort order must be stable.
* Upload: multipart/form-data with field name file; allow only supported image formats and validate decoded bytes, not only filename/MIME header.
* Use 409 for invalid status transitions and conflicting updates; 413 for size limit; 415 for unsupported type.

# 6. Complete frontend-facing API reference

The following routes form the full planned API. Optional routes can be omitted from the demo only if the frontend does not depend on them; do not implement optional decision automation. All protected routes require authentication plus role/claim-scope checks.

## 6.1 Health and authentication

### GET /api/v1/health

**Purpose:** Liveness/readiness check for main backend.

**Access:** Public

**Request:** No body.

**Success:** 200 {"status":"ok","database":"ok"} (readiness may report degraded if DB unavailable).

**Common errors:** 503 dependency unavailable

### POST /api/v1/auth/login

**Purpose:** Validate credentials and issue token/session.

**Access:** Public

**Request:** {"email":"examiner@example.test","password":"..."}

**Success:** 200 {"accessToken":"...","user":{"id":"uuid","name":"...","email":"...","role":"EXAMINER"}}

**Common errors:** 400 invalid payload; 401 invalid credentials; 429 rate limited

### POST /api/v1/auth/logout

**Purpose:** Invalidate current session/refresh token if supported.

**Access:** Authenticated

**Request:** No body or refresh-token body according to selected auth design.

**Success:** 204 No Content. For stateless JWT, document that logout clears client token unless a revocation mechanism exists.

**Common errors:** 401 unauthenticated

### GET /api/v1/auth/me

**Purpose:** Return current authenticated user and permissions summary.

**Access:** Authenticated

**Request:** No body.

**Success:** 200 {"id":"uuid","name":"...","email":"...","role":"INTAKE\_USER","active":true}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

## 6.2 Policies

### POST /api/v1/policies/verify

**Purpose:** Exact lookup of normalized policy number against local policy records. This is not full coverage adjudication.

**Access:** Authenticated

**Request:** {"policyNumber":"MTR-000123"}

**Success:** 200 {"found":true,"policy":{"id":"uuid","policyNumber":"MTR-000123","status":"ACTIVE","policyholderName":"...","vehiclePlate":"..."}}; if not found return found:false and policy:null.

**Common errors:** 400 empty/invalid policy number

### GET /api/v1/policies/:policyId

**Purpose:** Read permitted policy summary.

**Access:** EXAMINER/ADMIN or scoped intake user

**Request:** Path policyId.

**Success:** 200 {"id":"uuid","policyNumber":"...","status":"ACTIVE","startDate":"...","endDate":"..."}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

## 6.3 Claims

### POST /api/v1/claims

**Purpose:** Create claim and audit event; verify policy association server-side.

**Access:** INTAKE\_USER/EXAMINER/ADMIN

**Request:** {"claimant":{"fullName":"...","phone":"...","email":null},"vehicle":{"plateNumber":"...","make":"...","model":"...","year":2018,"vin":null},"policyNumber":"MTR-000123","incident":{"occurredAt":"2026-10-15T10:30:00Z","location":"Addis Ababa","description":"...","incidentType":"COLLISION"}}

**Success:** 201 {"id":"uuid","claimNumber":"EC-2026-00001","status":"SUBMITTED","policyVerification":"VERIFIED","createdAt":"..."}

**Common errors:** 409 duplicate/idempotency conflict; 422 policy or field rule

### GET /api/v1/claims

**Purpose:** List claims visible to current user, with status/search/date filters and pagination.

**Access:** Authenticated + scoped results

**Request:** Query: page, pageSize, status, q, from, to, assignedToMe.

**Success:** 200 {"items":[{"id":"uuid","claimNumber":"...","status":"READY\_FOR\_REVIEW","createdAt":"..."}],"page":1,"pageSize":20,"total":1}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### GET /api/v1/claims/:claimId

**Purpose:** Return claim detail with safe related policy summary, evidence count and assessment summary.

**Access:** Authenticated + claim scope

**Request:** Path claimId.

**Success:** 200 {"id":"uuid","claimNumber":"...","claimant":{},"vehicle":{},"incident":{},"status":"UNDER\_REVIEW","policy":{},"evidenceCount":2,"assessment":null}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### PATCH /api/v1/claims/:claimId

**Purpose:** Update allowed manual claim fields; protect fields after review begins.

**Access:** INTAKE\_USER for permitted pre-review fields; EXAMINER/ADMIN with audit

**Request:** Partial JSON object containing allowed claimant/vehicle/incident fields only.

**Success:** 200 updated claim detail.

**Common errors:** 409 claim locked/invalid edit state

### PATCH /api/v1/claims/:claimId/status

**Purpose:** Validate status transition, update status and audit event transactionally.

**Access:** EXAMINER/ADMIN; limited submission transition for intake

**Request:** {"status":"UNDER\_REVIEW","note":"Review started"}

**Success:** 200 {"id":"uuid","status":"UNDER\_REVIEW","updatedAt":"..."}

**Common errors:** 409 INVALID\_STATUS\_TRANSITION

### GET /api/v1/claims/:claimId/timeline

**Purpose:** Return chronological audit/workflow events.

**Access:** Authenticated + claim scope

**Request:** Path claimId; optional page/pageSize.

**Success:** 200 {"items":[{"id":"uuid","action":"CLAIM\_CREATED","actor":{"id":"...","name":"..."},"createdAt":"...","summary":"Claim submitted"}]}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### POST /api/v1/claims/:claimId/request-evidence

**Purpose:** Record a request for more evidence and move status if valid.

**Access:** EXAMINER

**Request:** {"message":"Please upload a clearer front-side photo.","requestedItems":["FRONT\_DAMAGE\_PHOTO"]}

**Success:** 201 {"id":"uuid","claimId":"uuid","status":"NEED\_MORE\_EVIDENCE","message":"..."}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

## 6.4 Evidence upload and access

### POST /api/v1/claims/:claimId/evidence

**Purpose:** Upload an image, persist metadata and return promptly while analysis runs.

**Access:** INTAKE\_USER/EXAMINER with claim scope

**Request:** multipart/form-data: file=<image>; optional caption and evidenceType.

**Success:** 202 {"id":"uuid","claimId":"uuid","analysisStatus":"PENDING","sha256":"...","uploadedAt":"..."}

**Common errors:** 413 FILE\_TOO\_LARGE; 415 UNSUPPORTED\_MEDIA\_TYPE; 422 image decode failed

### GET /api/v1/claims/:claimId/evidence

**Purpose:** List evidence metadata for a claim.

**Access:** Authenticated + claim scope

**Request:** Path claimId; pagination optional.

**Success:** 200 {"items":[{"id":"uuid","originalName":"front.jpg","mimeType":"image/jpeg","sizeBytes":12345,"analysisStatus":"COMPLETED","uploadedAt":"..."}],"page":1,"pageSize":20,"total":1}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### GET /api/v1/evidence/:evidenceId

**Purpose:** Read evidence metadata and current analysis status.

**Access:** Authenticated + claim scope

**Request:** Path evidenceId.

**Success:** 200 {"id":"uuid","claimId":"uuid","originalName":"front.jpg","sha256":"...","phash":"...","analysisStatus":"COMPLETED"}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### GET /api/v1/evidence/:evidenceId/file

**Purpose:** Stream/download the file after authorization; do not return unrestricted storage path.

**Access:** Authenticated + claim scope

**Request:** Path evidenceId.

**Success:** 200 image bytes with safe Content-Type and Content-Disposition.

**Common errors:** 404 missing file; 403/404 permission policy

### DELETE /api/v1/evidence/:evidenceId

**Purpose:** Soft-delete or mark unavailable if allowed; never silently remove audit history.

**Access:** Uploader before review or ADMIN according to policy

**Request:** Path evidenceId; optional reason.

**Success:** 204 No Content and audit event.

**Common errors:** 409 evidence locked after assessment

## 6.5 Analysis and historical matches

### GET /api/v1/evidence/:evidenceId/analysis

**Purpose:** Get current analysis status, model metadata and detections if available.

**Access:** Authenticated + claim scope

**Request:** Path evidenceId.

**Success:** 200 {"evidenceId":"uuid","status":"COMPLETED","modelName":"...","modelVersion":"...","detections":[],"inferenceMs":120,"errorCode":null}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### POST /api/v1/evidence/:evidenceId/reanalyze

**Purpose:** Retry analysis when failed or explicitly requested by authorized examiner.

**Access:** EXAMINER/ADMIN

**Request:** Path evidenceId; optional {"reason":"Retry after service recovery"}.

**Success:** 202 {"evidenceId":"uuid","status":"PENDING"}

**Common errors:** 409 analysis already running or evidence unavailable

### GET /api/v1/evidence/:evidenceId/matches

**Purpose:** Return authorized exact, near-duplicate and visual-similarity candidates separately.

**Access:** EXAMINER/ADMIN or permitted reviewer

**Request:** Path evidenceId; optional limit capped (e.g. 20).

**Success:** 200 {"evidenceId":"uuid","matches":[{"matchedEvidenceId":"uuid","claimId":"uuid","claimNumber":"...","matchType":"EXACT\_HASH","score":1.0,"distance":0,"uploadedAt":"..."}]}

**Common errors:** 403/404 if no claim access

### GET /api/v1/analysis/:analysisId

**Purpose:** Optional analysis record detail/polling endpoint.

**Access:** Authenticated + claim scope

**Request:** Path analysisId.

**Success:** 200 analysis status and safe result fields.

**Common errors:** 404 unknown analysis

## 6.6 Examiner assessment and optional decision record

### POST /api/v1/claims/:claimId/assessment

**Purpose:** Create human assessment for claim.

**Access:** EXAMINER

**Request:** {"severity":"MODERATE","estimatedLossEtb":"12500.00","currency":"ETB","notes":"Based on visible damage and workshop quote."}

**Success:** 201 {"id":"uuid","claimId":"uuid","severity":"MODERATE","estimatedLossEtb":"12500.00","currency":"ETB","examinerId":"uuid","createdAt":"..."}

**Common errors:** 409 assessment already exists if only one active assessment is allowed

### GET /api/v1/claims/:claimId/assessment

**Purpose:** Read the assessment if present.

**Access:** EXAMINER/ADMIN or authorized claim viewer

**Request:** Path claimId.

**Success:** 200 assessment object or 404 if none exists

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### PATCH /api/v1/claims/:claimId/assessment

**Purpose:** Update assessment; preserve history via audit or assessment versions.

**Access:** EXAMINER; ADMIN only if policy permits

**Request:** Partial {"severity":"SEVERE","estimatedLossEtb":"24000.00","notes":"Updated after additional photo."}

**Success:** 200 updated assessment

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### POST /api/v1/claims/:claimId/decision

**Purpose:** Optional record of a human examiner decision; do not automate from AI output.

**Access:** EXAMINER/ADMIN

**Request:** {"decision":"REFER\_FOR\_INSPECTION","reason":"Photo evidence is inconclusive."}

**Success:** 201 human decision record with actor and timestamp. This endpoint can be omitted if final decisions are outside demo scope.

**Common errors:** 409 invalid workflow state

## 6.7 Optional dashboard and admin endpoints

### GET /api/v1/dashboard/summary

**Purpose:** Counts by claim status and current examiner queue.

**Access:** EXAMINER/ADMIN

**Request:** Optional date filters.

**Success:** 200 {"countsByStatus":{"SUBMITTED":2,"UNDER\_REVIEW":1},"needsReview":3}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### GET /api/v1/admin/users

**Purpose:** List users with pagination.

**Access:** ADMIN

**Request:** Query page/pageSize/role/active.

**Success:** 200 paginated user list without password hashes.

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### POST /api/v1/admin/users

**Purpose:** Create a user or invite account for demo.

**Access:** ADMIN

**Request:** {"name":"...","email":"...","role":"EXAMINER","password":"..."} or invitation workflow.

**Success:** 201 safe user object.

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### PATCH /api/v1/admin/users/:userId

**Purpose:** Change role/active state.

**Access:** ADMIN

**Request:** {"active":false} or permitted role update.

**Success:** 200 safe user object; audit event.

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### GET /api/v1/admin/policies

**Purpose:** List/search local policy registry.

**Access:** ADMIN

**Request:** Query page/pageSize/q/status.

**Success:** 200 paginated policy records.

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### POST /api/v1/admin/policies

**Purpose:** Create policy record for local registry/demo seeds.

**Access:** ADMIN

**Request:** Policy fields defined by Policy DTO.

**Success:** 201 policy summary.

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### PATCH /api/v1/admin/policies/:policyId

**Purpose:** Update local policy status/metadata.

**Access:** ADMIN

**Request:** Partial allowed policy fields.

**Success:** 200 updated policy summary; audit event.

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

# 7. Request/response examples

## 7.1 Standard error response

{

"statusCode": 409,

"code": "INVALID\_STATUS\_TRANSITION",

"message": "Claim cannot move from CLOSED to UNDER\_REVIEW.",

"details": []

}

## 7.2 Claim create request

{

"claimant": {"fullName": "Example Claimant", "phone": "+2519...", "email": null},

"vehicle": {"plateNumber": "AA-12345", "make": "Toyota", "model": "Corolla", "year": 2018, "vin": null},

"policyNumber": "MTR-000123",

"incident": {"occurredAt": "2026-10-15T10:30:00Z", "location": "Addis Ababa", "description": "Vehicle collision", "incidentType": "COLLISION"}

}

## 7.3 Evidence analysis response

{

"evidenceId": "uuid",

"status": "COMPLETED",

"sha256": "hex-digest",

"phash": "hex-perceptual-hash",

"model": {"name": "model-if-available", "version": "version-if-known"},

"detections": [],

"inferenceMs": 210,

"errorCode": null,

"matches": [

{"matchedEvidenceId": "uuid", "matchType": "NEAR\_DUPLICATE", "distance": 4, "score": null}

]

}

# 8. Database schema design

The schema below is the required logical model. Exact field names can be adapted during implementation, but preserve relationships, indexes, money precision, role/status enums and ownership boundaries. Use Prisma migrations and seed data; do not rely on prisma db push as the only shared migration process.

## 8.1 Enums

enum Role { INTAKE\_USER EXAMINER ADMIN }

enum PolicyStatus { ACTIVE EXPIRED CANCELLED SUSPENDED UNKNOWN }

enum ClaimStatus { DRAFT SUBMITTED POLICY\_UNVERIFIED PROCESSING READY\_FOR\_REVIEW UNDER\_REVIEW NEED\_MORE\_EVIDENCE ASSESSED CLOSED }

enum AnalysisStatus { PENDING PROCESSING COMPLETED FAILED }

enum Severity { MINOR MODERATE SEVERE UNDETERMINED }

enum MatchType { EXACT\_HASH NEAR\_DUPLICATE VISUAL\_SIMILARITY }

enum IncidentType { COLLISION THEFT VANDALISM NATURAL\_EVENT OTHER }

## 8.2 Prisma schema starter

// Illustrative schema starter; validate relation names and migration before use.

model User {

id String @id @default(uuid()) @db.Uuid

name String

email String @unique

passwordHash String

role Role @default(INTAKE\_USER)

active Boolean @default(true)

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

createdClaims Claim[] @relation("ClaimCreator")

assessments ExaminerAssessment[]

auditEvents AuditEvent[]

}

model Policy {

id String @id @default(uuid()) @db.Uuid

policyNumber String @unique

insurerName String

status PolicyStatus @default(UNKNOWN)

policyholderName String

vehiclePlate String?

vehicleVin String?

startDate DateTime?

endDate DateTime?

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

claims Claim[]

@@index([status])

}

model Claim {

id String @id @default(uuid()) @db.Uuid

claimNumber String @unique

policyId String? @db.Uuid

createdById String @db.Uuid

assignedExaminerId String? @db.Uuid

status ClaimStatus @default(SUBMITTED)

claimantName String

claimantPhone String

claimantEmail String?

vehiclePlate String

vehicleMake String?

vehicleModel String?

vehicleYear Int?

vehicleVin String?

incidentAt DateTime

incidentLocation String?

incidentDescription String

incidentType IncidentType @default(OTHER)

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

policy Policy? @relation(fields: [policyId], references: [id])

creator User @relation("ClaimCreator", fields: [createdById], references: [id])

evidence Evidence[]

assessment ExaminerAssessment?

auditEvents AuditEvent[]

@@index([status, createdAt])

@@index([createdById, createdAt])

@@index([vehiclePlate])

}

model Evidence {

id String @id @default(uuid()) @db.Uuid

claimId String @db.Uuid

uploadedById String @db.Uuid

originalName String

storageKey String @unique

mimeType String

sizeBytes Int

sha256 String

phash String?

embedding Json? // prototype only; prefer pgvector for scale

caption String?

evidenceType String?

deletedAt DateTime?

createdAt DateTime @default(now())

claim Claim @relation(fields: [claimId], references: [id])

analyses DamageAnalysis[]

matchesFrom SimilarityMatch[] @relation("MatchSource")

matchesTo SimilarityMatch[] @relation("MatchTarget")

@@index([claimId, createdAt])

@@index([sha256])

}

model DamageAnalysis {

id String @id @default(uuid()) @db.Uuid

evidenceId String @db.Uuid

status AnalysisStatus @default(PENDING)

modelName String?

modelVersion String?

detections Json?

inferenceMs Int?

errorCode String?

errorMessage String?

attempt Int @default(0)

startedAt DateTime?

completedAt DateTime?

createdAt DateTime @default(now())

evidence Evidence @relation(fields: [evidenceId], references: [id])

@@index([evidenceId, createdAt])

@@index([status, createdAt])

}

model SimilarityMatch {

id String @id @default(uuid()) @db.Uuid

sourceEvidenceId String @db.Uuid

matchedEvidenceId String @db.Uuid

matchType MatchType

score Float?

distance Int?

details Json?

createdAt DateTime @default(now())

source Evidence @relation("MatchSource", fields: [sourceEvidenceId], references: [id])

matched Evidence @relation("MatchTarget", fields: [matchedEvidenceId], references: [id])

@@unique([sourceEvidenceId, matchedEvidenceId, matchType])

@@index([sourceEvidenceId, matchType])

}

model ExaminerAssessment {

id String @id @default(uuid()) @db.Uuid

claimId String @unique @db.Uuid

examinerId String @db.Uuid

severity Severity @default(UNDETERMINED)

estimatedLossEtb Decimal? @db.Decimal(14, 2)

currency String @default("ETB")

notes String?

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

claim Claim @relation(fields: [claimId], references: [id])

examiner User @relation(fields: [examinerId], references: [id])

}

model AuditEvent {

id String @id @default(uuid()) @db.Uuid

actorId String? @db.Uuid

entityType String

entityId String

action String

before Json?

after Json?

summary String?

createdAt DateTime @default(now())

actor User? @relation(fields: [actorId], references: [id])

@@index([entityType, entityId, createdAt])

@@index([actorId, createdAt])

}

## 8.3 Schema notes and constraints

* If multiple assessments/version history are required, remove @unique on claimId and introduce assessment version/active marker. For MVP, one current assessment per claim is simpler.
* Use a claimNumber generation strategy that is collision-safe under concurrent requests (transaction/sequence or retry on unique conflict).
* Store money as Decimal/Numeric and serialize as a decimal string.
* For deleted evidence, retain the database record and audit event; file deletion must be a separate authorized operation.
* Embedding as JSON is a demo fallback only. Prefer pgvector or a dedicated vector index for scalable retrieval.
* If multi-insurer tenancy is implemented, add organization/tenant IDs to users, policies, claims and access checks before real customer data is used.

# 9. Internal FastAPI contract (AI component unchanged)

These are private service endpoints called only by NestJS. Do not expose them through the public frontend API. Preserve the agreed processing scope and semantics.

### GET /health

**Purpose:** AI service health/readiness.

**Access:** Internal monitoring

**Request:** No body.

**Success:** 200 {"status":"ok"}

**Common errors:** 400 validation error; 401 unauthenticated; 403 forbidden; 404 not found

### POST /internal/analyze-image

**Purpose:** Run the agreed image processing pipeline for a newly uploaded image.

**Access:** NestJS service credential only

**Request:** Multipart image bytes or internal controlled storage reference, plus evidenceId and optional model configuration.

**Success:** 200 {"evidenceId":"uuid","sha256":"...","phash":"...","embedding":[...],"damage":{"modelName":"...","modelVersion":"...","detections":[],"inferenceMs":123,"status":"COMPLETED"},"matches":[]}. Omit model fields or return unavailable status if no suitable model is usable.

**Common errors:** 400 invalid image; 401/403 invalid internal token; 413 too large; 500 sanitized processing error

### POST /internal/search-similar

**Purpose:** Optional explicit search of archive after embedding/fingerprint generation.

**Access:** NestJS service credential only

**Request:** {"evidenceId":"uuid","sha256":"...","phash":"...","embedding":[...],"limit":10}.

**Success:** 200 {"matches":[{"matchedEvidenceId":"uuid","matchType":"VISUAL\_SIMILARITY","score":0.91,"distance":null}]}.

**Common errors:** 401/403 invalid internal token; 422 invalid vector shape

## 9.1 AI result handling

* SHA-256 is computed from original uploaded bytes.
* pHash is a near-duplicate clue based on Hamming distance; threshold must be tested on sample data.
* Embedding uses the same pretrained encoder/preprocessing for new and historical images; cosine similarity or a vector index retrieves candidates.
* Pretrained damage inference is used only if a suitable compatible model is available and tested on sample images early. A generic object detector does not automatically detect dents or scratches.
* The AI does not estimate repair costs. Examiner selects Minor / Moderate / Severe / Undetermined and enters estimated loss using insurer procedure/expertise/quote.
* If AI fails, keep evidence, record FAILED and sanitized error details, and allow retry. Similarity is not proof of fraud.

# 10. Implementation sequence and acceptance tests

|  |  |  |  |
| --- | --- | --- | --- |
| **Order** | **Person A** | **Person B** | **Integration acceptance** |
| 1. Contract | Agree enums, IDs, request/response DTOs, auth mode | Agree internal AI schemas and evidence metadata needs | Both approve one shared API contract |
| 2. Skeleton | NestJS, config, Prisma, migration/seed, auth guard | FastAPI skeleton/health; evidence storage spike; verify model feasibility | Both services start from documented commands |
| 3. Core flow | Policy verify, claim create/list/detail/update/status | Evidence upload, SHA-256/pHash, analysis status persistence | Create claim ? upload image ? see PENDING/COMPLETED or FAILED |
| 4. Review flow | Assessment and audit timeline | Historical candidates and reanalyze endpoint | Examiner sees authorized matches and records ETB assessment |
| 5. Hardening | RBAC, validation, transaction/state tests | File validation, AI timeout/retry, match access tests | No unauthorized file/claim access; failure never loses evidence |
| 6. Demo | Seed accounts/policies and stable API | Seed example images and show model limitations | Run full demo with known expected results |

# 11. Test checklist

* Auth: invalid credentials, inactive user, role guard, missing token.
* Policy: known active, expired/inactive, unknown, whitespace/case normalization.
* Claims: required fields, date validation, duplicate claim number, pagination, access scope.
* Statuses: allowed transitions, rejected transition, concurrent transition conflict.
* Evidence: valid JPEG/PNG, disguised file, corrupted file, oversized file, empty file, safe storage key, unauthorized download.
* AI: exact duplicate, recompressed duplicate, unrelated image, visually similar but not identical image, model unavailable, timeout, malformed result.
* Assessment: role permission, decimal amount validation, negative amount rejected, update audit.
* Audit: actor/action/timestamp present; sensitive data/secrets not logged.

# 12. Three-day work plan

|  |  |  |  |
| --- | --- | --- | --- |
| **Day** | **Person A — Core** | **Person B — Evidence/AI** | **Required checkpoint** |
| Day 1 | Schema/migrations, auth, roles, policy and claim DTOs/controllers | FastAPI health, image decode, SHA-256/pHash, check pretrained damage model viability | Claim can be created; AI feasibility decision documented |
| Day 2 | Claim CRUD/status machine, assessment, audit | Upload/storage, AI client, persist analysis, similarity candidates | End-to-end claim plus evidence works |
| Day 3 | RBAC regression, seed data, fixes, optional dashboard/admin | Failure/retry handling, match endpoint, AI tests and docs | Full demo, no critical access-control bugs |

# 13. Environment variables and local setup

# backend/.env

DATABASE\_URL="postgresql://postgres:postgres@localhost:5432/ethioclaim"

JWT\_SECRET="replace-with-local-secret"

AI\_SERVICE\_URL="http://127.0.0.1:8001"

AI\_SERVICE\_TOKEN="local-internal-token"

UPLOAD\_DIR="./private-uploads"

MAX\_UPLOAD\_MB="10"

# ai-service/.env

INTERNAL\_API\_TOKEN="local-internal-token"

MAX\_UPLOAD\_MB="10"

# frontend/.env.local

NEXT\_PUBLIC\_API\_BASE\_URL="http://localhost:3000/api/v1"

Illustrative setup: start PostgreSQL; install backend dependencies; run Prisma migration and seed; start NestJS; create a Python virtual environment; install FastAPI/Pillow/ImageHash/NumPy and the chosen encoder/model dependencies; start FastAPI; then start Next.js. Pin dependency versions and record exact commands in README.

# 14. Security checklist

* Password hashes only; secrets via environment variables; no committed credentials.
* Rate limit login and uploads; validate decoded image content, file size and dimensions.
* Private file storage; generated storage keys; safe Content-Disposition; authorization before streaming.
* Private AI service authentication; strict request timeout; no arbitrary local paths from client input.
* No sensitive image bytes, tokens, passwords or full claimant details in logs.
* Audit status, assessment, admin and evidence deletion actions.
* Return generic authentication errors; prevent claim/evidence IDOR by checking ownership/scope in service layer.
* Treat AI output as untrusted data; validate response schema before persistence.

# 15. Out of scope

* OCR and automatic document field extraction.
* AI-generated-image or Photoshop forensic analysis.
* AI repair-cost prediction or severity claims unsupported by validation.
* Automatic fraud verdict, claim approval/rejection or payment.
* Full integration with real insurer policy systems, payment gateways or external claims systems.
* Production compliance/security certification; this MVP requires further review before real claimant data is processed.
