**ETHIOCLAIM**

**Full Product, Frontend, Backend & API Documentation**

Policy-first motor insurance claim intake and evidence review platform

Architecture: Next.js + NestJS + PostgreSQL/Prisma + FastAPI

Scope: practical MVP with human-led claim assessment

# Document purpose and how to use it

This document is the shared source of truth for product behavior, roles and permissions, policy ownership, frontend screens, backend services, API contracts, data entities, AI evidence analysis, security, testing, and implementation order. It is written for a three-person team and prioritizes a deliverable MVP.

Important: this is a product/engineering specification, not legal or insurance advice. Policy eligibility, required documents, claim deadlines, decision authority, retention periods, and approval/rejection rules must ultimately be confirmed with the participating insurer. For a demo without insurer integration, use clearly labelled fictional/test policy data.

# Table of contents

* 1. Product summary and MVP boundaries
* 2. Users, roles, and permission model
* 3. Insurance policy model: owner, registration, and prefilled forms
* 4. End-to-end workflows and claim statuses
* 5. Frontend requirements and page-by-page specification
* 6. Backend architecture and service responsibilities
* 7. Database model and relationships
* 8. API specification
* 9. AI and evidence analysis
* 10. Security, privacy, and auditability
* 11. Validation, errors, and user experience
* 12. Testing and acceptance criteria
* 13. Team split and implementation plan
* 14. Deferred features and final checklist

# 1. Product summary and MVP boundaries

## 1.1 Product purpose

EthioClaim helps an insurer or claims team register motor insurance claims, link them to existing policy and vehicle records, collect vehicle-damage photographs, surface duplicate or visually similar evidence, and record a human examiner's assessment. It centralizes the process and reduces repeated data entry.

## 1.2 Core product principles

* Policy-first: a policy record is registered before a claim is created. The policy number retrieves known policyholder and vehicle details.
* Enter only what is missing: prefill available details and ask the user to confirm them rather than repeatedly typing the same information.
* Least privilege: users can access only the records and actions their role requires.
* Human review: AI output is advisory. It must not autonomously reject a claim or label a person as fraudulent.
* Traceability: record who performed important actions, when they occurred, and the reason for exceptional changes.
* Resilient evidence handling: a failed AI request must not delete the claim or the uploaded photo.
* MVP realism: use demo policy data until an authorized insurer system integration exists.

## 1.3 Included in MVP

* Login and role-based access for Admin, Intake User, and Examiner.
* Admin-managed demo policyholders, policies, and insured vehicles.
* Policy number lookup and form prefill.
* Claim creation, draft editing, submission, status tracking, and claim timeline.
* Photo upload, storage, preview, and evidence metadata.
* SHA-256 exact duplicate checks and perceptual hash near-duplicate checks.
* Optional image embeddings/similarity search if the team can implement and test it reliably.
* Damage-detection inference only if a suitable pretrained model is available and tested; otherwise show analysis as unavailable.
* Examiner's manual severity, ETB estimate, notes, and recommendation.
* Admin oversight, examiner assignment, and basic audit log.

## 1.4 Explicitly excluded from MVP

* OCR or automatic extraction of text from policy documents or photos.
* AI-generated-image detection, Photoshop/manipulation forensics, or authenticity guarantees.
* Automatic repair-cost prediction.
* Automatic claim approval, rejection, payment, or definitive fraud detection.
* Direct integration with real insurer databases unless access and authorization are provided.
* Complex payment, repair-shop, garage, surveyor, SMS, email, or third-party identity integrations.
* A full production insurance policy administration suite.

# 2. Users, roles, and permission model

Authorization must be checked by NestJS on every protected endpoint. Hiding a button in the frontend is not a security control. Use role checks plus record-level access checks.

## 2.1 Admin

* Dashboard: view aggregate counts, claim queues, failed analyses, and basic operational metrics.
* Users: create accounts, assign roles, activate/deactivate accounts, initiate password resets, and review account activity.
* Policies: create, view, update, activate/deactivate, and search policyholder/policy/vehicle records; prevent duplicate policy identifiers within the same insurer.
* Claims: view claims for oversight, assign/reassign examiners, inspect status history, and handle authorized administrative exceptions.
* Monitoring: see analysis failures and request retries if implemented; view technical status without exposing secrets.
* Audit: view activity logs. Admins should not edit or erase audit events.
* Limits: no plaintext password access; no silent rewriting of past assessments; no automatic fraud declaration.

## 2.2 Intake User

* Verify a policy number and see the minimum policy, policyholder, and vehicle details required for claim registration.
* Create claims, save drafts, edit drafts, confirm prefilled data, enter incident details, upload photos, and submit claims.
* View claims they created or have explicitly been permitted to handle.
* View claim status and relevant examiner requests; respond with clarification or additional evidence.
* View limited AI status and evidence warnings needed to help the claimant, but not alter the original AI results.
* Cannot create or edit policy records, assign examiners, record severity/loss assessment, approve/reject claims, or bypass policy checks.

## 2.3 Examiner

* View claims assigned to them, relevant policy/vehicle/incident information, evidence, timeline, and authorized prior related claims.
* Review original images, damage-detection output when available, exact duplicates, near-duplicate matches, and analysis status.
* Request more information or evidence and explain what is missing.
* Record damage severity, affected vehicle areas, observations, manual estimated loss in ETB, supporting reasoning, and recommendation.
* Re-run analysis for an assigned claim if permitted and technically supported.
* Cannot manage users or policy records, edit the model's original output, delete audit history, or access unrelated claims without authorization.
* Final approval/rejection authority is configurable. For the MVP, prefer assessment plus recommendation; if a final decision is allowed, make it a separate action with a required reason.

## 2.4 Permission matrix

|  |  |  |  |
| --- | --- | --- | --- |
| **Action** | **Admin** | **Intake User** | **Examiner** |
| System-wide dashboard | Yes | No | No |
| Manage users/roles | Yes | No | No |
| Create/edit policy records | Yes | No | No |
| Verify policy | Yes | Yes | Read-only |
| Create/edit draft claim | Exceptional | Yes | No by default |
| Submit claim | Limited | Yes | No by default |
| View all claims | Operational need | No | No by default |
| View own/assigned claims | Yes | Yes, permitted scope | Yes, assigned scope |
| Upload evidence | Exceptional | Yes | Optional if needed |
| View AI results/matches | Operational need | Limited summary | Yes, assigned claims |
| Request additional evidence | Optional | Respond | Yes |
| Record severity/loss assessment | No by default | No | Yes |
| Recommend outcome | No by default | No | Yes |
| Assign examiner | Yes | No | No |
| View audit log | Yes | Own/limited history | Claim/own activity |
| Modify audit log | Never | Never | Never |

## 2.5 Authorization implementation

|  |
| --- |
| enum UserRole {  ADMIN = 'ADMIN',  INTAKE\_USER = 'INTAKE\_USER',  EXAMINER = 'EXAMINER', } |

Use an authentication guard, a roles guard/decorator, and service-level record ownership/assignment checks. Never trust a role, userId, policy status, or examiner assignment supplied by the browser. Derive the acting user from the authenticated session/token.

Recommended record access rules: Admin can access records for operational management; Intake User can access claims they created or are assigned to handle; Examiner can access claims assigned to them. Expand these scopes only through explicit permissions.

# 3. Insurance policy model: owner, registration, and prefilled forms

## 3.1 What a policy represents

An insurance policy is an agreement between an insurer and a policyholder. It records the cover, insured subject (here, a vehicle), effective dates, status, and terms. A policy number identifies a policy record within the issuing insurer's system; it is not necessarily a unique identifier for a human being.

One person may hold multiple policies. A policy may cover multiple vehicles under some products. A vehicle's driver at the time of an incident may not be the policyholder. Therefore, policyholder, insured vehicle, claimant, and driver should be represented as separate concepts where needed.

## 3.2 Who registers and owns policy records?

For the MVP, an Admin registers fictional/test policy records in EthioClaim. In a real deployment, policy data should be sourced from the insurer's authoritative system through an authorized API or controlled import. EthioClaim should not imply that a demo policy is a real insurance contract.

The policyholder is the person or organization named on the policy. The insurer is the organization that issued it. The Admin manages the record inside the MVP; the Admin does not become the policyholder or insurer by entering it.

## 3.3 Recommended policy-first registration flow

1. Admin registers a policyholder, policy, and insured vehicle before a claim needs to be submitted.
2. Intake User opens New Claim and enters the policy number.
3. Frontend sends the policy number to NestJS. NestJS validates the request and searches the policy database.
4. Backend returns a minimal policy summary only if the caller is authorized. The response identifies whether it was found and provides the fields required for the workflow.
5. Frontend prefills policyholder and vehicle details and clearly marks them as retrieved from the policy record.
6. Intake User confirms the vehicle/policy and enters incident-specific information: incident date/time, location, description, claimant/driver details if needed, and photos.
7. Backend rechecks policy status and dates at submission time. It must not rely only on the earlier frontend verification.
8. Claim is created with an internal policyId foreign key. The policy number is used for lookup, not as the only relationship key.
9. Store a snapshot of the policy/vehicle details used at claim submission or preserve a versioned history so later policy edits do not silently rewrite historical context.

## 3.4 What data should a policy have?

|  |  |  |
| --- | --- | --- |
| **Entity** | **Recommended fields** | **Purpose** |
| Insurer | id, name, code, contact details (optional), status | Supports multiple insurers; policy numbers may overlap across insurers. |
| Policyholder | id, type (person/organization), fullName or legalName, phone (if required), email (optional), address (optional) | Identifies the person/organization named on the policy. Collect only necessary data. |
| Policy | id, insurerId, policyholderId, policyNumber, policyType, startDate, endDate, status, createdAt, updatedAt | Core coverage record and eligibility lookup. |
| Insured vehicle | id, policyId or policy-vehicle link, plateNumber, make, model, modelYear (optional), vehicleType, VIN/chassis number (optional if legitimately available) | Prefills vehicle details and associates claims with the correct vehicle. |
| Policy coverage | coverage type, deductible/excess, limits, exclusions/notes where approved | Useful for real assessments; optional in a short MVP if no rules depend on it. |
| Audit event | actorUserId, action, entityType, entityId, timestamp, reason/metadata | Tracks policy creation and changes. |

MVP simplification: one policyholder and one insured vehicle per policy can be supported in the first demo, but the schema should avoid assuming that a policy number identifies a person. If multiple vehicles per policy are in scope, use a PolicyVehicle join table rather than storing one vehicle directly on Policy.

## 3.5 Policy number uniqueness

If the platform may hold multiple insurers, enforce uniqueness on (insurerId, normalizedPolicyNumber), not policyNumber alone. Normalize leading/trailing spaces and case only according to the insurer's numbering rules. Do not remove meaningful punctuation unless the issuer confirms it is insignificant.

## 3.6 Which fields should the intake user still enter?

|  |  |  |
| --- | --- | --- |
| **Field** | **Source** | **Intake action** |
| Policy number | User-provided lookup key | Enter it; do not re-enter the full policy. |
| Policyholder name | Policy record | Prefill and ask user to confirm identity/context; avoid allowing arbitrary edits. |
| Policy status and dates | Policy record | Display read-only with clear eligibility warning. |
| Vehicle plate, make, model | Insured vehicle record | Prefill and confirm the vehicle involved. |
| Incident date/time | Claimant/intake report | Required claim-specific field. |
| Incident location | Claimant/intake report | Required if the insurer's workflow needs it. |
| Incident description | Claimant/intake report | Required short description. |
| Driver identity | Incident-specific | Collect only when needed; driver may differ from policyholder. |
| Claimant contact details | Policyholder record or claimant | Prefill only if available and appropriate; confirm/update through controlled workflow. |
| Damage photographs | Claimant/intake user | Upload; each image becomes an evidence record. |
| Claimant relationship to policyholder | Claimant/intake user | Optional/required according to insurer's actual process. |

## 3.7 Avoid exposing private information during policy lookup

A policy number alone should not be treated as proof of identity. Do not return every personal detail to anyone who enters a number. In a demo, show only fields necessary to register the claim. For production, require appropriate authentication or an insurer-approved identity verification step before revealing personal data. Consider masking phone numbers and showing only a minimal confirmation summary until the user's authority is established.

## 3.8 Policy statuses and eligibility

|  |  |
| --- | --- |
| **Status** | **Suggested behavior** |
| ACTIVE | Allow claim registration subject to policy dates and insurer rules. |
| EXPIRED | Show warning and prevent or route claim registration according to configured rules; do not let intake user override it. |
| CANCELLED | Block normal registration or route to an authorized exception process. |
| SUSPENDED | Block or flag for admin review according to insurer rules. |
| PENDING | Do not treat as active coverage unless the insurer's rules explicitly permit it. |
| NOT\_FOUND | Offer correction/retry and a controlled escalation path; do not create a policy from the intake form. |

Policy validity is not the same as claim coverage. A valid policy lookup does not automatically establish that the specific incident is covered. Actual coverage depends on the policy terms and insurer review.

## 3.9 Admin policy screens

* Policy list: search by policy number, policyholder, plate number, insurer, and status; paginate results.
* Create policy: select/create policyholder, insurer, insured vehicle, policy number, effective dates, status, and any required coverage details.
* Policy detail: show linked policyholder, vehicle(s), dates, status, and linked claims where authorized.
* Edit policy: allow controlled corrections; require a reason for sensitive changes and log before/after values where appropriate.
* Deactivate/cancel: confirm the action and require a reason. Avoid hard deletion where claims already reference the policy.
* Duplicate prevention: show a validation message when the same normalized policy number already exists for the same insurer.

# 4. End-to-end workflows and claim statuses

## 4.1 Main claim workflow

1. DRAFT: Intake User has started a claim; information can be edited.
2. SUBMITTED: Intake User submits the claim. The system validates required fields and creates the official claim reference.
3. ANALYSIS\_PENDING: Evidence analysis has been queued or is being processed. This may be an evidence-level status rather than a claim status.
4. UNDER\_REVIEW: Claim is assigned to an examiner and available for review.
5. INFO\_REQUESTED: Examiner requested more details or evidence.
6. INFO\_RECEIVED: Intake User supplied the requested information; claim returns to the examiner queue.
7. ASSESSMENT\_SUBMITTED: Examiner recorded the assessment and recommendation.
8. APPROVED / REJECTED: Use only if final decision capability is included and the authorized workflow permits it.
9. CLOSED: Administrative workflow completed; reopening must be controlled and logged.

Keep claim status separate from evidence-analysis status. A claim can be UNDER\_REVIEW while one image's AI analysis has failed; this should not force the entire claim into an error state.

## 4.2 State-transition rules

|  |  |  |  |
| --- | --- | --- | --- |
| **From** | **To** | **Who may initiate** | **Rule** |
| DRAFT | SUBMITTED | Intake User | Required fields and policy checks pass. |
| SUBMITTED | UNDER\_REVIEW | System/Admin | Claim is queued and assigned or available for assignment. |
| UNDER\_REVIEW | INFO\_REQUESTED | Examiner | Reason/request details required. |
| INFO\_REQUESTED | INFO\_RECEIVED | Intake User/System | Requested response/evidence is recorded. |
| INFO\_RECEIVED | UNDER\_REVIEW | System/Examiner | Return to examiner queue. |
| UNDER\_REVIEW | ASSESSMENT\_SUBMITTED | Examiner | Severity, reasoning, and recommendation validated. |
| ASSESSMENT\_SUBMITTED | APPROVED/REJECTED | Authorized decision-maker | Separate permission, required reason, audit event. |
| Any allowed state | CLOSED | Authorized role | Closure rules; record reason. |
| CLOSED | Reopened state | Admin/authorized role | Explicit reason and audit event. |

## 4.3 Evidence workflow

1. Upload request is authorized against the claim and validated for file size/type.
2. File is stored in private storage; metadata is written to the database.
3. Exact hash is calculated. If the same hash exists, mark the file as an exact duplicate candidate.
4. Perceptual hash compares visual structure and flags likely near-duplicates within a defined threshold.
5. Embedding similarity is an optional layer; results should be shown as similarity candidates, not proof of reuse or fraud.
6. Damage inference runs only when the model is available and tested.
7. Analysis output and status are stored separately from the original evidence record.
8. Examiner reviews findings and records a human conclusion. Failed analysis can be retried without losing the evidence.

# 5. Frontend requirements and page-by-page specification

## 5.1 Frontend stack and conventions

* Next.js App Router with TypeScript.
* Use a shared authenticated application layout with navigation filtered by role.
* Use a single typed API client for NestJS endpoints; frontend must not call FastAPI directly.
* Use forms with client-side feedback plus server-side validation messages.
* Use reusable components for tables, status badges, image upload/preview, confirm dialogs, empty states, and error states.
* Use pagination/search/filtering for lists; avoid loading every record into the browser.
* Use accessible labels, keyboard navigation, clear focus states, responsive layouts, and readable contrast.

## 5.2 Route map

|  |  |  |
| --- | --- | --- |
| **Route** | **Who** | **Purpose** |
| /login | All unauthenticated users | Login and validation errors. |
| /dashboard | All authenticated roles | Role-specific summary and actions. |
| /claims | Admin; authorized Intake/Examiner | Search/filter claims within access scope. |
| /claims/new | Intake User | Policy-first claim registration wizard. |
| /claims/[claimId] | Authorized roles | Claim overview, details, status, timeline. |
| /claims/[claimId]/evidence | Authorized roles | Evidence gallery and analysis status. |
| /claims/[claimId]/review | Assigned Examiner | Review images, matches, and analysis. |
| /claims/[claimId]/assessment | Assigned Examiner | Severity, loss estimate, findings, recommendation. |
| /policies | Admin | Policy search/list. |
| /policies/new | Admin | Register policyholder/policy/vehicle. |
| /policies/[policyId] | Admin; limited read-only view for others | Policy detail and linked claims. |
| /admin/users | Admin | Manage users and roles. |
| /admin/audit-log | Admin | Search important system events. |
| /admin/operations | Admin | Analysis failures and operational monitoring. |

## 5.3 Login and session behavior

* Inputs: email/username according to backend identity schema, password.
* Show generic invalid-credentials errors; do not reveal whether an account exists.
* On success, fetch current user and role, then route to dashboard.
* Handle expired sessions and logout; do not store secrets in insecure browser storage.
* Protected routes should redirect unauthenticated users to login and show a safe forbidden page for unauthorized users.

## 5.4 Role-based dashboard

|  |  |
| --- | --- |
| **Role** | **Dashboard cards/actions** |
| Admin | Total claims; unassigned claims; claims by status; active/expired policy counts; failed analysis jobs; quick links to users, policies, claim queue, audit log. |
| Intake User | Drafts; claims submitted; claims needing more information; recent claims created; New Claim action. |
| Examiner | Assigned queue; awaiting review; information requested; assessments in progress; analysis-failed cases needing attention. |

Dashboard metrics should be calculated from authorized backend responses. Do not derive privileged counts by downloading all claims into the browser.

## 5.5 New Claim wizard (policy-first)

Recommended steps:

1. Step 1 — Find policy: enter policy number and click Verify.
2. Step 2 — Confirm policy/vehicle: display policy status and dates, policyholder name, and vehicle details. Mark values as read-only if they came from the policy record. Show clear warnings for not found, expired, cancelled, or inactive policies.
3. Step 3 — Incident details: date/time, location, narrative, driver details if required, and claimant relationship/contact confirmation if required.
4. Step 4 — Evidence: upload multiple photos, preview/remove before final submission, add optional photo descriptions, show upload progress.
5. Step 5 — Review and submit: display a summary, require confirmation that the information is accurate, then submit.
6. After submission — Show claim reference number, submitted status, and next-step explanation.

Do not ask the user to retype policyholder name, policy dates, make/model, or plate number when they are already reliably stored. Provide a correction request path rather than allowing an intake user to silently alter authoritative policy data.

## 5.6 Claims list and claim detail

* Claims list: server-side pagination, keyword search, status filter, date range, and role-appropriate visibility.
* Columns: claim reference, policy number (masked where appropriate), vehicle plate (as permitted), submitted date, status, assigned examiner (where appropriate), latest update.
* Claim detail tabs/sections: Overview, Policy/Vehicle, Incident, Evidence, Analysis, Assessment, Timeline.
* Display status history and actor/time for significant actions.
* Show actions only when permitted and when the current status allows them.
* Use confirmation dialogs for submit, reassignment, closure, and other consequential actions.

## 5.7 Evidence gallery and analysis UI

* Grid/list of images with thumbnail, upload time, uploader, description, and processing status.
* Open image preview; support zoom or full-size view if feasible.
* Separate Original Evidence from Analysis Results so model output cannot be mistaken for the original image.
* Show exact duplicate vs near-duplicate vs embedding-similarity candidate distinctly.
* For a match, show related claim/evidence reference only if the current user is authorized to view it.
* Show AI output as advisory and show confidence only when returned by the actual model.
* If analysis fails, show failure status and retry action only to permitted roles; retain the image and allow manual review.

## 5.8 Examiner review and assessment

* Review layout should show claim summary, policy/vehicle data, image viewer, AI summary, duplicate matches, and notes together without hiding context.
* Examiner manually selects severity from insurer-approved options (initial demo: Minor, Moderate, Severe, plus Unable to Determine if needed).
* Examiner enters an estimated loss amount in ETB as a manual estimate, with a reason or supporting notes.
* Examiner records observations, outstanding concerns, and a recommendation.
* If requesting information, require a clear message and set the claim status to INFO\_REQUESTED.
* Before assessment submission, show a review summary and confirm that the assessment is the examiner's own judgement.
* If final decision is implemented, separate it from recommendation and require a reason.

## 5.9 Admin policy and user screens

* Policy list with filters and pagination; no hard-delete control for policies referenced by claims.
* Policy creation form should group policyholder, insurer, policy dates/status, vehicle details, and optional coverage fields.
* Policy detail shows linked claims and change history if available.
* User list shows name, username/email, role, account status, and last login if available; never show password hashes.
* Role changes and account deactivation require confirmation and are logged.
* Audit log supports filters by actor, action, entity, and date.

## 5.10 Frontend states every page must handle

* Initial loading, table loading, upload progress, and analysis processing.
* Empty state (no claims/policies/matches), not-found state, and forbidden state.
* Validation errors, server errors, network timeout, session expiry, and retryable AI failure.
* Duplicate policy number error and policy not found.
* Policy inactive/expired warning.
* File too large/unsupported file type and interrupted upload.
* No AI model configured or analysis unavailable.
* Responsive layout on entry-level devices and narrow screens; avoid unnecessary large images before requested.

# 6. Backend architecture and service responsibilities

## 6.1 Architecture

|  |
| --- |
| Browser / Next.js frontend  |  | HTTPS + authenticated API requests  v NestJS application API  - Authentication and RBAC  - Policy and policyholder management  - Claim lifecycle and assignment  - Evidence metadata and access control  - Assessment and audit log  - AI-service client / retry coordination  | |  | +--> Private object/file storage  |  +--> PostgreSQL via Prisma  |  +--> Private FastAPI AI service  - SHA-256 / perceptual hash  - optional embeddings and similarity search  - optional damage-detection inference |

The frontend must call NestJS only. FastAPI should not be exposed as a public frontend API. NestJS owns authentication, authorization, persistence, claim lifecycle, and the official API contract. FastAPI performs analysis and returns structured results.

## 6.2 Recommended modules

|  |  |
| --- | --- |
| **NestJS module** | **Responsibilities** |
| AuthModule | Login/logout/current user; password hashing; session/token lifecycle. |
| UsersModule | Admin-only user management and role assignment. |
| InsurersModule | Insurer records if multiple insurers are supported. |
| PolicyholdersModule | Policyholder records and minimal profile data. |
| PoliciesModule | Policy CRUD, lookup, policy status, date checks, duplicate prevention. |
| VehiclesModule | Vehicle records and association to policies. |
| ClaimsModule | Claim creation, list/detail, status transitions, assignment, timeline. |
| EvidenceModule | Upload authorization, metadata, file access, deletion/replacement policy. |
| AnalysisModule | AI service calls, result persistence, retry state, duplicate matches. |
| AssessmentsModule | Severity, estimated loss, examiner notes, recommendation/decision. |
| AuditModule | Append-only event creation and authorized audit queries. |
| HealthModule | Health/readiness checks without revealing secrets. |

## 6.3 FastAPI responsibilities

* Accept internal requests from NestJS only, authenticated with service credentials or private network controls.
* Validate that uploaded file paths/identifiers are safe; do not accept arbitrary server paths from the caller.
* Compute SHA-256 for exact file identity.
* Compute perceptual hash and compare to permitted evidence records.
* Optionally generate image embeddings and retrieve similar images using a tested index.
* Optionally run a suitable pretrained damage-detection model; record model/version and inference metadata.
* Return structured outputs and explicit statuses such as COMPLETED, PARTIAL, FAILED, or MODEL\_UNAVAILABLE.
* Never make final claim decisions or store a separate authoritative copy of claim lifecycle state.

## 6.4 Reliability and asynchronous analysis

For a compact MVP, NestJS can create evidence records and then call FastAPI synchronously, provided timeouts are handled and the upload response does not fail merely because AI inference fails. A robust implementation can enqueue analysis jobs and process them asynchronously. Redis/BullMQ is optional, not required for the smallest working demo.

* Persist evidence metadata before requesting AI analysis.
* Set connection/read timeouts and handle service unavailable errors.
* Store analysis status and error category without storing secrets or excessive stack traces in user-visible responses.
* Use an idempotency key or evidence ID to avoid creating duplicate jobs on retries.
* Permit retry only for eligible failed/pending analyses; retain prior analysis versions.
* Do not block examiner review indefinitely because a model is unavailable.

# 7. Database model and relationships

Use PostgreSQL with Prisma. IDs should be opaque internal IDs (UUID or CUID are both reasonable); use foreign keys and indexes. The following is a logical schema rather than a copy-paste migration; adapt naming and optional fields to the selected Prisma version.

## 7.1 Core entities

|  |  |  |
| --- | --- | --- |
| **Entity** | **Key fields** | **Notes** |
| User | id, displayName, email/username, passwordHash, role, isActive, createdAt, updatedAt | Unique login identifier; passwordHash only. |
| Insurer | id, name, code, status | Optional for single-insurer demo, recommended for policy-number scoping. |
| Policyholder | id, entityType, fullName/legalName, phone?, email?, address?, createdAt | Separate person/organization from user account. |
| Vehicle | id, plateNumber, make, model, modelYear?, vehicleType?, vinOrChassisNumber? | Avoid storing unnecessary identifiers if not available/needed. |
| Policy | id, insurerId, policyholderId, policyNumber, status, startDate, endDate, policyType, createdAt, updatedAt | Unique (insurerId, normalizedPolicyNumber). |
| PolicyVehicle | policyId, vehicleId | Use if one policy can cover multiple vehicles. |
| Claim | id, claimNumber, policyId, vehicleId?, createdById, assignedExaminerId?, status, incidentAt, location?, description, submittedAt?, createdAt, updatedAt | claimNumber is human-friendly; id is internal FK. |
| ClaimPolicySnapshot | claimId, snapshotJson, capturedAt | Optional; preserves policy/vehicle context at submission. |
| Evidence | id, claimId, uploadedById, storageKey, originalFilename, mimeType, sizeBytes, sha256, perceptualHash?, description?, uploadedAt, status | Store file outside database; DB stores metadata and private storage key. |
| AnalysisRun | id, evidenceId, status, modelName?, modelVersion?, damageOutputJson?, sha256, perceptualHash?, embeddingRef?, errorCode?, startedAt?, completedAt? | One evidence can have multiple analysis runs. |
| EvidenceMatch | id, evidenceId, matchedEvidenceId, method, score?, createdAt | Method might be SHA256, PHASH, or EMBEDDING; only authorized users see linked case details. |
| Assessment | id, claimId, examinerId, severity, estimatedLossETB?, recommendation, notes, createdAt, updatedAt, submittedAt? | Use version/history if assessments may be revised. |
| ClaimEvent | id, claimId, actorUserId?, eventType, fromStatus?, toStatus?, message?, metadataJson?, createdAt | Timeline/history; avoid putting unnecessary personal data in metadata. |
| AuditLog | id, actorUserId?, action, entityType, entityId, timestamp, reason?, metadataJson? | Append-only from application perspective. |

## 7.2 Important database rules

* Unique login identifier for users.
* Unique (insurerId, normalizedPolicyNumber) for policy records when multiple insurers are supported.
* Claim must reference an existing policy; optionally reference the selected insured vehicle.
* Evidence must reference a claim and uploader; file metadata is not a substitute for authorization checks.
* Store monetary estimates as Decimal/NUMERIC, not floating-point. Name the currency explicitly as ETB in API/UI.
* Use database transactions for operations that create a claim and its timeline event or submit an assessment and change status.
* Use soft deactivation or status changes for policies/users where hard deletion could break history.
* Never cascade-delete a policy, claim, or evidence record in a way that destroys claim history unexpectedly.
* Index claimNumber, policyNumber, plateNumber, status, assignedExaminerId, createdAt, evidence sha256, and relevant foreign keys.
* Use a controlled JSON field only for flexible analysis metadata; keep fields used in filtering/reporting as structured columns.

## 7.3 Example relationship diagram

|  |
| --- |
| Insurer 1 ---- \* Policy \* ---- 1 Policyholder  |  \* (via PolicyVehicle if multiple)  |  Vehicle  |  \* Claim ---- \* Evidence ---- \* AnalysisRun  | |  | \* EvidenceMatch \* ---- Evidence  |  \* Assessment  |  \* ClaimEvent  User ---- creates Claims / uploads Evidence / performs Assessments User ---- appears as actor in AuditLog |

# 8. API specification

Base URL example: /api/v1. Exact field names and response DTOs should be shared between frontend and backend developers. Return consistent error shapes and use HTTP status codes appropriately.

## 8.1 Authentication and user endpoints

|  |  |  |
| --- | --- | --- |
| **Method & path** | **Access** | **Purpose** |
| POST /auth/login | Public | Authenticate user; return session/token according to chosen auth design. |
| POST /auth/logout | Authenticated | Invalidate session/refresh token where supported. |
| GET /auth/me | Authenticated | Return current user ID, display name, role, and active status. |
| GET /admin/users | Admin | Paginated user list. |
| POST /admin/users | Admin | Create user and assign allowed role. |
| GET /admin/users/:userId | Admin | User detail without password hash. |
| PATCH /admin/users/:userId | Admin | Update permitted user fields or status. |
| POST /admin/users/:userId/reset-password | Admin/controlled flow | Initiate reset; do not return an existing password. |

## 8.2 Policy and reference-data endpoints

|  |  |  |
| --- | --- | --- |
| **Method & path** | **Access** | **Purpose** |
| POST /policies/verify | Authenticated; field-minimized response | Lookup policy number and return found/status plus minimal allowed summary. |
| GET /admin/policies | Admin | Search/filter/paginate policies. |
| POST /admin/policies | Admin | Create policyholder/policy/vehicle association or create policy using existing IDs. |
| GET /admin/policies/:policyId | Admin | Policy detail. |
| PATCH /admin/policies/:policyId | Admin | Controlled corrections/status updates with audit reason where required. |
| GET /admin/policyholders | Admin | Search policyholders. |
| POST /admin/policyholders | Admin | Create policyholder record. |
| GET /admin/vehicles | Admin | Search vehicles. |
| POST /admin/vehicles | Admin | Create vehicle record. |

## 8.3 Claim endpoints

|  |  |  |
| --- | --- | --- |
| **Method & path** | **Access** | **Purpose** |
| POST /claims | Intake User | Create a draft claim linked to policyId. |
| GET /claims | Role-scoped | List claims with server-side filters and pagination. |
| GET /claims/:claimId | Record-scoped | Claim details only if caller has access. |
| PATCH /claims/:claimId | Intake User; draft/allowed statuses | Edit allowed claim fields. |
| POST /claims/:claimId/submit | Intake User | Revalidate policy, required fields, and evidence; submit claim. |
| PATCH /claims/:claimId/assign | Admin | Assign/reassign examiner. |
| PATCH /claims/:claimId/status | Role/status policy | Use only for allowed transitions; do not accept arbitrary status changes. |
| GET /claims/:claimId/timeline | Record-scoped | Return ordered claim events. |
| POST /claims/:claimId/request-information | Assigned Examiner | Request missing information/evidence with message. |
| POST /claims/:claimId/close | Authorized role | Close claim with reason if closure is in MVP. |

## 8.4 Evidence and analysis endpoints

|  |  |  |
| --- | --- | --- |
| **Method & path** | **Access** | **Purpose** |
| POST /claims/:claimId/evidence | Intake User; authorized claim | Upload file and create evidence metadata. |
| GET /claims/:claimId/evidence | Record-scoped | List evidence metadata. |
| GET /evidence/:evidenceId | Record-scoped | Get metadata and permitted analysis summary. |
| GET /evidence/:evidenceId/file | Record-scoped | Authorize then stream a private file or issue a short-lived signed URL. |
| GET /evidence/:evidenceId/analysis | Record-scoped | Get latest analysis status/results. |
| GET /evidence/:evidenceId/matches | Examiner/admin; record-scoped | Return duplicate/similarity candidates with access-controlled related details. |
| POST /evidence/:evidenceId/reanalyze | Examiner assigned to claim/Admin | Queue/retry analysis. |
| DELETE /evidence/:evidenceId | Restricted workflow | Only allowed before submission or via audited replacement/removal process. |

## 8.5 Assessment and audit endpoints

|  |  |  |
| --- | --- | --- |
| **Method & path** | **Access** | **Purpose** |
| POST /claims/:claimId/assessment | Assigned Examiner | Create/submit assessment. |
| GET /claims/:claimId/assessment | Record-scoped | View current assessment and permitted history. |
| PATCH /claims/:claimId/assessment | Assigned Examiner; editable states only | Update draft assessment; preserve history if submitted versions can change. |
| POST /claims/:claimId/decision | Authorized decision-maker; optional | Record final decision with required reason. |
| GET /admin/audit-log | Admin | Search audit events. |
| GET /admin/operations/analysis | Admin | View pending/failed analysis jobs and basic retry controls. |
| GET /health | Public or internal, minimal | Health check without exposing configuration or secrets. |

## 8.6 Example policy verification contract

|  |
| --- |
| POST /api/v1/policies/verify Request: {  "policyNumber": "MOT-2026-00125" }  Response (illustrative): {  "found": true,  "policy": {  "id": "policy\_internal\_id",  "policyNumber": "MOT-2026-00125",  "status": "ACTIVE",  "startDate": "2026-01-01",  "endDate": "2026-12-31",  "policyholder": { "displayName": "Abebe K." },  "vehicle": {  "plateNumber": "AA-3-12345",  "make": "Toyota",  "model": "Corolla"  }  } } |

The values above are fictional examples. In production, the policy lookup response must be minimized and must not reveal private policyholder information based on policy number alone.

## 8.7 Example claim creation contract

|  |
| --- |
| POST /api/v1/claims {  "policyId": "policy\_internal\_id",  "vehicleId": "vehicle\_internal\_id",  "incidentAt": "2026-10-19T14:30:00+03:00",  "incidentLocation": "Addis Ababa",  "incidentDescription": "Reported collision involving the insured vehicle." }  Response: {  "id": "claim\_internal\_id",  "claimNumber": "EC-2026-000123",  "status": "DRAFT",  "createdAt": "2026-10-20T08:30:00Z" } |

## 8.8 Example examiner assessment contract

|  |
| --- |
| POST /api/v1/claims/:claimId/assessment {  "severity": "MODERATE",  "estimatedLossETB": "18000.00",  "observations": "Visible damage to the front bumper; manual estimate.",  "recommendation": "REQUEST\_MORE\_INFORMATION",  "recommendationReason": "Additional view of the affected area is needed." } |

Use Decimal strings or an agreed decimal representation for money. Validate enums on the backend. If recommendation is REQUEST\_MORE\_INFORMATION, the API should require the request details and transition the claim through the appropriate workflow.

## 8.9 API error contract

|  |
| --- |
| {  "statusCode": 400,  "code": "POLICY\_NOT\_ELIGIBLE",  "message": "This policy cannot be used to submit a claim through the standard workflow.",  "details": { "policyStatus": "EXPIRED" },  "requestId": "req\_example" } |

Recommended error categories: VALIDATION\_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT\_FOUND, POLICY\_NOT\_FOUND, POLICY\_NOT\_ELIGIBLE, DUPLICATE\_POLICY\_NUMBER, INVALID\_STATUS\_TRANSITION, FILE\_TOO\_LARGE, UNSUPPORTED\_FILE\_TYPE, ANALYSIS\_UNAVAILABLE, RATE\_LIMITED, and INTERNAL\_ERROR. Never send stack traces, private file paths, secrets, or database internals to the frontend.

# 9. AI and evidence analysis

## 9.1 Evidence pipeline

1. Validate upload and store the original image in private storage.
2. Calculate SHA-256: exact equality check for byte-identical files.
3. Calculate perceptual hash: flag visually similar images after testing thresholds on the intended data.
4. Optional: compute an image embedding and search an indexed set of prior evidence.
5. Optional: run a pretrained damage-detection model only if it has been tested on relevant vehicle images.
6. Persist structured output, model/version, status, and timestamps.
7. Show examiner-friendly results and let the examiner record an interpretation.

## 9.2 What the methods do and do not mean

|  |  |  |
| --- | --- | --- |
| **Method** | **Useful for** | **Limitations** |
| SHA-256 | Detecting exactly identical file bytes. | A resized/recompressed version will usually have a different hash. |
| Perceptual hash | Flagging some resized/compressed/visually similar images. | Thresholds can produce false positives/negatives; not proof of reuse. |
| Image embeddings | Finding visually similar images at scale. | Similarity is contextual; similar vehicles/damage can be unrelated. |
| Damage model | Suggesting likely damage regions/classes when model supports it. | May fail or be inaccurate on local conditions, angles, lighting, or unseen classes. |

## 9.3 Result presentation

* Use labels such as Exact match found, Possible visual match, No match found, Analysis incomplete, and Analysis unavailable.
* For a similarity result, show method and score only when meaningful, and clarify that the score is not a fraud probability.
* Only link to related evidence after the backend checks the user's authorization to access that claim.
* Keep raw original files immutable from the normal UI; store annotations/overlays separately.
* Never turn an AI warning directly into REJECTED or FRAUD\_CONFIRMED.

## 9.4 Internal FastAPI contract

|  |  |
| --- | --- |
| **Endpoint** | **Purpose** |
| GET /health | Internal readiness/health response. |
| POST /internal/analyze-image | Analyze a stored evidence identifier or an authorized upload payload; return hashes and optional model outputs. |
| POST /internal/search-similar | Optional similarity search if separated from analysis. |

FastAPI should receive only the minimum necessary information and should not accept arbitrary filesystem paths. Authenticate service-to-service calls. Define payload size and timeouts. If using local storage in the MVP, use an internal evidence identifier and a controlled storage adapter.

## 9.5 Model readiness gate

Do not label damage detection as complete merely because a model package installs. Before enabling it, test sample images, output schema, inference latency, CPU/GPU requirements, false positives, and failure behavior. If no suitable model/dataset is available in time, ship hashing and manual examination first and expose damage detection as NOT\_CONFIGURED rather than pretending it works.

# 10. Security, privacy, and auditability

## 10.1 Authentication

* Hash passwords with a modern password hashing algorithm; never store plaintext passwords.
* Use secure, HTTP-only cookies for browser sessions where feasible, or a carefully designed token strategy.
* Use HTTPS in deployed environments.
* Rate-limit login and policy lookup to reduce abuse.
* Support account deactivation and session revocation where feasible.
* Use generic login errors and avoid revealing whether an email/account exists.

## 10.2 Authorization and data access

* Check role and record scope in NestJS for every list, detail, download, update, and retry endpoint.
* Never trust userId, role, assignedExaminerId, or policy status from the frontend.
* Do not make uploaded images publicly accessible through guessable URLs.
* Use private object storage or private local storage and serve files only after authorization; signed URLs should expire quickly.
* Return minimal policyholder data from policy verification.
* Prevent an examiner from accessing another examiner's claim unless team policy grants it.

## 10.3 File upload protection

* Allowlist supported image MIME types and verify actual file signatures where feasible.
* Set maximum file size and maximum number of photos per claim.
* Generate storage keys on the server; do not trust original filenames as storage paths.
* Protect against path traversal and malformed uploads.
* Keep original filename only as metadata after sanitization.
* Restrict download and deletion; preserve evidence history for submitted claims.
* Consider malware scanning if production scope and infrastructure support it.

## 10.4 Audit events

Audit important events such as login failures where appropriate, user creation/deactivation, role changes, policy creation/edits/status changes, claim creation/submission/assignment/status transitions, evidence upload/removal/replacement, analysis retry, assessment submission/revision, final decision, and claim reopening.

Each event should identify the actor (when authenticated), action, entity, timestamp, and reason/metadata where appropriate. The normal application must not offer an edit/delete operation for audit events. Avoid recording passwords, tokens, or unnecessary personal data in logs.

## 10.5 Privacy and retention

Collect only data necessary for claim handling. Define who can see names, phone numbers, photos, and linked claim history. Set a retention and deletion policy with the insurer before real deployment. For a demo, use fictional data and avoid uploading real personal documents or real claimant photos without permission.

## 10.6 Operational configuration

* Keep database credentials, JWT/session secrets, storage credentials, and FastAPI service secrets in environment configuration, not source control.
* Validate required environment variables on startup without printing secret values.
* Use separate development/test/production configuration.
* Keep FastAPI internal; do not publish it as a browser-accessible endpoint.
* Do not expose detailed health/diagnostic output to unauthenticated clients.

# 11. Validation, errors, and user experience

## 11.1 Policy validation

* Normalize policy number according to insurer-specific rules and reject empty/invalid input.
* Return a clear NOT\_FOUND result without creating a new policy from the claim form.
* Check active status and effective dates both during verification and again at claim submission.
* Handle race conditions: a policy may be deactivated after the initial lookup.
* Do not disclose full personal information before appropriate authorization.

## 11.2 Claim validation

* Require policyId, incident date/time, incident description, and other fields confirmed by the product/insurer.
* Reject invalid dates and impossible values; allow only permitted status transitions.
* Ensure the selected vehicle belongs to the selected policy.
* At submission, verify that the caller is authorized and the claim is still editable.
* Generate claim number on the backend; do not accept a claim number supplied by the browser.

## 11.3 Evidence validation

* Check file size, file type, and claim access.
* Persist evidence metadata before analysis begins.
* Handle upload retries without creating unintended duplicate records.
* Distinguish upload failure from analysis failure.
* Keep manual review available when AI analysis is pending, unavailable, or failed.

## 11.4 Accessibility and low-bandwidth behavior

* Use compact layouts and avoid loading full-resolution images until opened.
* Show upload progress and allow retry after interruption.
* Provide clear, nontechnical error messages.
* Use keyboard-accessible controls and properly labelled form fields.
* Avoid relying on color alone for status; include text labels and icons.
* Preserve draft form state where feasible, but do not store sensitive policyholder details in insecure persistent browser storage.

# 12. Testing and acceptance criteria

## 12.1 Role/authorization tests

* Intake User cannot create or edit a policy through direct API requests.
* Examiner cannot create users, change roles, or edit policy records.
* Examiner cannot access an unassigned claim unless explicitly authorized.
* Intake User cannot submit a claim for a policy that is not eligible under configured rules.
* Frontend hiding a button is not the only barrier; direct API calls are rejected too.
* Inactive users cannot continue to use protected endpoints.

## 12.2 Policy and prefill tests

* Admin can create a policyholder, policy, and vehicle association.
* Duplicate policy number for the same insurer is rejected with a clear error.
* Valid policy lookup returns the permitted summary and prefills the form.
* Unknown policy returns a not-found result without leaking unrelated records.
* Expired/cancelled policy is visibly flagged and submission follows configured rules.
* A vehicle not linked to the selected policy cannot be submitted under that policy.
* Changing policy data later does not silently rewrite the snapshot of an already submitted claim.

## 12.3 Claim and evidence tests

* Intake User can save a draft, upload images, review the summary, and submit a valid claim.
* Required field validation works in both frontend and backend.
* Claim reference is generated on the backend and appears after submission.
* An exact duplicate file is identified by SHA-256.
* A likely near-duplicate can be flagged by pHash when implemented and tested.
* An analysis service timeout does not delete the claim or evidence.
* Unauthorized users cannot download evidence by guessing an evidence ID.
* An examiner can view only authorized/assigned claim evidence.

## 12.4 Assessment tests

* Examiner can record severity, manual ETB estimate, observations, and recommendation.
* Invalid severity/recommendation values are rejected by the backend.
* Assessment submission creates an audit/timeline event.
* AI similarity warning alone cannot trigger automatic rejection.
* Final decision endpoint, if included, requires the proper permission and a reason.

## 12.5 Definition of done

The MVP is ready for demonstration when a seeded admin can create a demo policy; an intake user can verify that policy, see prefills, create a claim, upload evidence, and submit it; the examiner can access the assigned claim, review images and any available analysis, request information or submit a documented assessment; and the admin can manage users/policies and inspect claim activity. All three roles must be blocked from unauthorized actions by the backend, and failures must be visible without losing the claim or evidence.

# 13. Team split and implementation plan

## 13.1 Three-person split

|  |  |  |
| --- | --- | --- |
| **Person** | **Primary ownership** | **Deliverables** |
| Frontend developer | Next.js UI | Login, role dashboards, policy-first claim wizard, claims list/detail, evidence upload/gallery, examiner review/assessment screens, API integration, loading/error states. |
| Core backend developer | NestJS + PostgreSQL/Prisma | Auth/RBAC, users, insurer/policyholder/policy/vehicle records, policy lookup, claims/status/assignment, assessment APIs, audit log, DTO validation, integration tests. |
| Evidence/AI backend developer | FastAPI + evidence pipeline | Secure upload integration support, SHA-256, pHash, optional embeddings/search, optional damage inference, analysis persistence/contract, retry behavior, NestJS integration, tests. |

## 13.2 Suggested order of work

|  |  |  |
| --- | --- | --- |
| **Phase** | **Build** | **Exit condition** |
| 1. Contracts and schema | Agree role names, DTOs, status enums, policy model, claim/evidence IDs, error shape. | Frontend and backend share one contract; no conflicting field names. |
| 2. Auth and seed data | Login, role guard, demo users, demo insurer/policyholders/policies/vehicles. | Each role can sign in; policy data exists. |
| 3. Policy-first intake | Policy verification, prefilling, draft claim creation, incident form. | Intake can verify a seeded policy and create a valid draft. |
| 4. Evidence upload | Private file storage, metadata, image preview, access checks. | Images persist and can only be retrieved by authorized users. |
| 5. Analysis baseline | SHA-256 and pHash; optional model/embedding after baseline works. | Exact duplicate results work; analysis failure does not lose evidence. |
| 6. Examination | Assignment, review UI, info request, assessment/recommendation. | Examiner can complete a claim review. |
| 7. Admin oversight | Policy/user management, assignment, audit and failure view. | Admin can operate the demo safely. |
| 8. Hardening/demo | Role tests, error handling, responsive polish, seed reset, demo script. | End-to-end flow works from login to assessment. |

## 13.3 Integration rules for the team

* Commit an OpenAPI spec or shared endpoint/DTO document early.
* Agree whether authentication uses cookies or bearer tokens before building protected frontend calls.
* Agree on exact claim/evidence status enums before writing pages.
* Keep FastAPI internal; NestJS is the single frontend API.
* Use one consistent timestamp format (ISO 8601 with timezone) and ETB decimal representation.
* Seed demo data through a repeatable script; do not hand-edit production-like data in the database.
* Make optional AI features clearly optional so a model integration delay does not block the whole product.

# 14. Deferred features and final checklist

## 14.1 Useful future enhancements (not required for MVP)

* Authorized live insurer policy lookup integration.
* Multi-vehicle and fleet policy management if required.
* Notifications for evidence requests and claim status changes.
* Advanced audit export and operational reporting.
* pgvector or another vector index when the evidence dataset justifies it.
* Background job queue and monitoring for large analysis workloads.
* Document attachments and additional evidence types if the insurer requires them.
* Configurable coverage rules and decision authority aligned with insurer policy.

## 14.2 Features intentionally not recommended for the MVP

* A claim form that forces users to re-enter all policyholder and vehicle data.
* Treating the policy number as a person's identity or as proof of authorization.
* Letting intake users create or activate policies just to make claim submission pass.
* A global search that exposes every claimant's personal information to every staff user.
* A single generic status field used for claim lifecycle and AI analysis state.
* Automatic rejection based on image similarity or model confidence.
* Cost predictions without suitable data and validated methodology.
* A dependency on a damage model that has not been tested on representative images.

## 14.3 Final implementation checklist

* ? Role permissions are enforced in NestJS, including record-level access.
* ? Admin can create/manage demo policyholders, policies, and vehicles.
* ? Policy numbers are unique within the issuing insurer's records.
* ? Policy lookup prefills known fields and limits personal-data disclosure.
* ? Claim submission revalidates policy status and selected vehicle.
* ? Claims preserve their policy relationship and historical context.
* ? Evidence is stored privately and remains available if analysis fails.
* ? Exact duplicate detection is implemented and tested; near-duplicate/embedding/model features are labelled according to actual readiness.
* ? Examiner can submit a reasoned assessment and manual ETB estimate.
* ? AI is advisory and never makes a final fraud or claim decision.
* ? Important changes are recorded in an append-only audit trail.
* ? The end-to-end demo works for Admin, Intake User, and Examiner accounts.

# Appendix A — Suggested demo seed data

Use fictional data only. A small seed set should include one active policy, one expired policy, one cancelled policy, two intake users, two examiners, one admin, a few vehicles, and several claims in different statuses. Include two identical sample images and a visually similar but non-identical image to demonstrate that exact matching and similarity matching are different.

# Appendix B — Decisions the team must confirm

* Is the MVP single-insurer or multi-insurer? If uncertain, retain insurerId and scoped uniqueness.
* Can a policy cover multiple vehicles in the actual use case? If unknown, use a PolicyVehicle join table or keep the code flexible.
* Does the examiner only recommend an outcome, or can they record final approval/rejection?
* Which incident fields are mandatory for the demo versus required by a real insurer?
* What is the maximum number and size of photos per claim?
* Which file storage option will be used for local development and deployment?
* Is a tested damage-detection model available in time? If not, ship hashing plus human review.
* Who can view prior claims and linked evidence, and under what authorization?
* What retention/deletion rules apply before using real claimant data?
