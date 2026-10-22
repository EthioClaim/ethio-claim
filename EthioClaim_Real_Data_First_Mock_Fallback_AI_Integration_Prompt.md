# EthioClaim — Full-Stack Bug Fixes and AI Integration Prompt

Act as a senior full-stack engineer working on **EthioClaim**, an AI-assisted motor insurance claims management platform. The frontend and NestJS backend are already running and connected, and the backend successfully fetches claims and other resources. Your task is to investigate the existing codebase, fix the broken functionality, integrate the asynchronous AI analysis workflow, and ensure the frontend accurately reflects real backend data.

**Do not just make the UI look correct. Trace every issue through the frontend, API layer, backend services, database queries, and AI integration where applicable. Implement and test the actual fixes. Preserve the existing architecture and coding conventions unless a change is necessary.**

## Core rule: real data first, mocks only for genuine outages

**Keep the existing mock fixtures as a fallback for confirmed backend/database unavailability. When the backend and database are healthy, always use real API responses; never silently substitute or merge mock data.** Implement this centrally in the shared API/data layer rather than adding inconsistent fallbacks to individual pages.

- Use a health/readiness endpoint where possible. A reachable NestJS server does not necessarily mean its database is ready; distinguish application liveness from database readiness.
- Fallback is allowed only for confirmed infrastructure/connectivity failures such as network errors, timeouts, or an explicit database-not-ready response. Do not trigger it for empty arrays, `401`, `403`, `404`, validation errors, or ordinary endpoint/application errors.
- A healthy backend returning no records must show a real empty state, not mock records. Never mix mock and real records.
- When fallback is active, show a persistent, clear banner such as **“Offline/demo data — backend or database unavailable.”** Provide retry/reconnect behavior.
- When connectivity returns, refetch real data, invalidate mock-backed caches/state, and remove the banner only after a real request succeeds.
- Never send mock records to real mutation endpoints or save them to the database. Disable mutations in offline/demo mode unless the project already has a deliberately designed offline-write queue.
- Do not use fallback to hide broken endpoints, DTO mismatches, permission errors, or backend bugs. Centralize fallback selection and error classification, and test it.
- Label all mock/demo identity and simulated AI output clearly. Production configuration must not accidentally enable mock login or simulated AI output.

### Special authentication safety rule

Authentication is not an ordinary data fallback. Never automatically sign in a mock user at startup. Always use real authentication when the backend is available. Invalid credentials, expired sessions, and `401`/`403` responses must never trigger mock login. If the backend/database is genuinely unavailable, offer a mock/demo session only if explicitly configured and clearly labeled; otherwise show an unauthenticated offline state. Demo mode must not masquerade as a real authenticated session, grant real privileged permissions, or allow real claim/assessment/evidence/administrative mutations.

## 1. Fix authentication while preserving a safe demo fallback

### Current problem
When I open the login page, the application automatically signs in using mock credentials or mock user data, even though the frontend is connected to the running backend.

### Required changes
- Inspect the authentication provider, login page, API client, route guards, session initialization, mock authentication utilities, development shortcuts, and environment configuration.
- Identify why the application automatically authenticates a mock user.
- Remove automatic mock sign-in from startup and the normal application flow. Real backend authentication must take precedence whenever the backend is available.
- Make login use the actual NestJS authentication endpoint and the credentials entered by the user.
- Verify that successful login stores and uses the real authentication token or session according to the existing backend implementation.
- Ensure protected API requests include the required authentication credentials.
- Ensure page refreshes and navigation restore a valid session correctly without silently replacing it with mock data.
- Handle expired sessions, invalid credentials, loading states, and unauthorized API responses correctly.
- Redirect unauthenticated users to the login page and prevent protected pages from briefly rendering mock or unauthorized data.
- Preserve mock/demo authentication only as an explicitly enabled, clearly labeled fallback for genuine backend/database unavailability. Never use it for invalid credentials, expired sessions, `401`/`403`, or broken authentication endpoints. Demo mode must not permit real privileged mutations or masquerade as a real authenticated session.

**Acceptance criteria:**
1. Opening the application does not automatically log in a user.
2. Login succeeds only through the real backend authentication flow.
3. The correct authenticated user's identity and role appear throughout the application.
4. Refreshing the page does not unexpectedly sign out the user or substitute a mock user.
5. Invalid credentials and expired sessions are handled properly and never trigger mock login.
6. If the backend/database is genuinely unavailable, any demo session is explicitly enabled, visibly labeled, and prevented from performing real privileged actions.

## 2. Connect Admin Operations and Admin Audit to the real backend

### Current problem
The Admin Operations and Admin Audit pages do not fetch their actual data from the backend, even though other endpoints, including claims, are working.

### Required changes
- Inspect the Admin Operations and Admin Audit pages, API services, query hooks, endpoint configuration, DTOs, and backend controllers.
- Identify whether the issue comes from missing API calls, incorrect endpoint paths, mismatched response structures, missing authentication headers, incorrect role checks, stale mock data, or backend endpoints that have not been implemented.
- Connect each page to the correct real backend endpoint.
- If an endpoint is missing, implement it in NestJS using the existing architecture, authorization rules, and database schema. Do not fabricate production data in the frontend to fill the gap.
- Use only real API data while the backend/database is healthy. Keep existing mock records solely for confirmed infrastructure outages, visibly label them as offline/demo data, and never trigger fallback for empty responses, authorization errors, missing endpoints, validation errors, or ordinary application errors.
- Make loading, empty, error, and retry states visible and accurate.
- Ensure audit records reflect actual backend audit events and operations records reflect actual persisted operations data.
- Follow the existing pagination, filtering, sorting, and date-range conventions where supported.
- Verify that the frontend response types match the backend DTOs and that all displayed fields are mapped correctly.

**Acceptance criteria:**
1. Both pages fetch real backend data.
2. The browser's network requests show the expected authenticated API calls.
3. An empty database produces a proper empty state, not fabricated records.
4. Backend errors are displayed and can be retried.
5. Unauthorized users cannot access restricted administrative information.
6. Outage fallback is clearly labeled and automatically gives way to fresh real data after recovery.

## 3. Enforce examiner-specific claim assignment

### Required behavior
An examiner must see only claims assigned to that examiner. Other roles, such as administrators or operations personnel, should see claims according to their existing permissions.

### Required changes
- Inspect the claim assignment schema, examiner relationships, backend claim queries, authorization guards, and frontend claim list/detail pages.
- Identify the canonical field or relationship used to represent the assigned examiner. Reuse it if it exists rather than introducing a competing assignment field.
- Enforce assignment filtering in NestJS for examiner-facing list, detail, assessment, evidence, and decision endpoints.
- Do not rely on frontend filtering as the security boundary.
- Ensure an examiner cannot access another examiner's claim simply by changing a claim ID in the URL or API request.
- Apply the appropriate authorization rules to nested endpoints, including evidence retrieval, AI results, assessments, and claim decisions.
- Make the frontend display only claims the current user is authorized to access.
- Ensure administrative roles retain only the broader access explicitly granted by the existing role model.
- Handle unassigned claims according to the existing workflow and permissions; do not automatically expose them to every examiner.

**Acceptance criteria:**
- Examiner A sees and accesses only Examiner A's assigned claims.
- Examiner B cannot access Examiner A's claims through either the UI or direct API requests.
- Authorized administrative roles retain their permitted access.
- Authorization is checked on every relevant backend endpoint.

## 4. Centralize real-data-first mock fallback and recovery

Inspect the current API client, query/cache layer, mock fixtures, environment flags, and health endpoints. Implement the Core rule consistently across the application.

- Prefer an existing readiness endpoint; if missing, implement one that distinguishes app liveness from database readiness without exposing secrets.
- Centralize classification of connectivity/infrastructure errors and selection of real versus mock data.
- Use real responses whenever backend/database readiness is healthy, including legitimate empty responses.
- Use mock fixtures only for confirmed infrastructure unavailability. Do not treat every non-2xx response as an outage.
- Show an unmistakable offline/demo banner, provide retry/reconnect behavior, and switch back to real data after recovery. Invalidate mock-backed caches and refetch real resources.
- Never combine real and mock records. Never persist mock records or submit them to real mutation endpoints. Disable writes while offline/demo mode is active unless a safe offline-write queue already exists.
- Keep mock fixtures for UI development/tests as appropriate, but ensure they cannot silently override real API data in the connected application.
- If database readiness cannot be determined, show connection status and retry rather than silently presenting mocks as real data.

## 5. Automatically trigger AI analysis after evidence submission

### Current architecture
The NestJS evidence-upload method already:
- Validates the uploaded file and claim access.
- Computes the image's SHA-256 hash and perceptual hash (pHash).
- Uploads the image to object storage.
- Creates an Evidence record.
- Checks for exact duplicate hashes and creates a SimilarityMatch when applicable.
- Creates an initial DamageAnalysis record with a pending status.
- Records an audit event.
- Calls `processDamageAnalysis(...)` asynchronously.

Build on this existing implementation. **Do not duplicate functionality that is already implemented.**

### Required changes
- Trace the existing `processDamageAnalysis` implementation and determine whether it calls the actual FastAPI service or only simulates AI results.
- Replace simulated analysis with the real FastAPI integration where needed.
- Ensure every eligible new evidence upload triggers AI analysis automatically in the background.
- The upload request should not wait for the entire AI inference and vector search process to finish.
- Persist the evidence and initial analysis record before processing begins.
- Send FastAPI the evidence ID, claim ID, analysis ID, trusted image reference, existing SHA-256 and pHash values, and any duplicate-match information already computed by NestJS.
- FastAPI must not recompute SHA-256 or pHash. NestJS remains responsible for these hashes and their comparisons.
- Ensure FastAPI generates the image embedding, stores it in the separate Qdrant vector database, searches for visually similar evidence, and returns structured results.
- Run the damage-detection model and return its detections and any supported severity information.
- Persist AI results in the existing DamageAnalysis model or extend it only where necessary.
- Keep analysis statuses consistent, for example: `PENDING`, `PROCESSING`, `COMPLETED`, `PARTIAL`, and `FAILED`, adapting these values to the existing schema and enums.
- Make processing idempotent so retries do not create duplicate analysis records or vector points.
- Handle timeouts, service outages, invalid images, and partial failures. A FastAPI or Qdrant failure must not delete evidence or make the claim disappear.
- Add a reliable retry mechanism or durable background job mechanism if the existing fire-and-forget call cannot guarantee processing. Keep the solution proportional to the current project and deadline.
- Never expose FastAPI or Qdrant directly to the browser. The frontend communicates with NestJS, which coordinates the internal AI service.

**Important:** The upload API should return promptly after evidence has been safely stored and processing has been scheduled. The frontend should obtain analysis updates through the existing polling, refresh, or notification architecture. Implement polling if no reliable update mechanism already exists.

## 6. Display AI analysis throughout the claim UI

### Current problem
The frontend does not adequately reflect the AI analysis associated with uploaded evidence.

### Required changes
Inspect the examiner's claim detail page, evidence viewer, assessment form, claim summary, status indicators, and API response types. Integrate the real persisted AI results rather than maintaining a separate mock analysis state.

For each analyzed evidence item, display the following information when available:

- AI analysis status: Pending, Processing, Completed, Partial, or Failed.
- Detected damage types and confidence values.
- Damage locations or bounding boxes if returned by the model and supported by the UI.
- AI-suggested severity, if the model genuinely provides a supported severity output.
- Exact duplicate matches reported by NestJS.
- Perceptual-hash matches reported by NestJS.
- Visually similar evidence retrieved through Qdrant.
- The AI risk label and its explanatory reasons.
- Analysis warnings, failure messages, model version, and analysis timestamp where useful.

### Fraud-risk UI

When the AI returns `POTENTIAL_FRAUD`, show a clear, prominent warning component on the examiner's claim detail page. It should include:

- A visible **Potential Fraud — Examiner Review Required** label.
- The reasons for the flag, such as an exact duplicate or highly similar evidence from another claim.
- Links or navigation to authorized matching evidence and relevant claim details.
- A clear indication that similarity or an AI flag is a review signal, not proof of fraud.
- A record of whether the examiner reviewed the flag and the eventual resolution.

When the AI returns `NO_FRAUD_INDICATORS_FOUND`, show a neutral status indicating that no configured risk indicators were found. Do not display it as a guarantee that the claim is legitimate.

When analysis is `PENDING`, `PROCESSING`, `PARTIAL`, or `FAILED`, show the appropriate state and any available results. Do not display missing data as zero, fabricate results, or interpret a failed analysis as a clean claim.

Make the interface responsive and consistent with the existing design system.

## 7. Autofill AI damage severity as a suggestion, not a final assessment

### Required behavior
When the AI returns a supported damage-severity result, reflect it in the examiner's assessment form.

- Display the AI-suggested severity near the examiner's severity field.
- Use the AI value as a placeholder or explicitly labeled suggestion, as requested, rather than silently saving it as the examiner's decision.
- If the examiner has not selected a severity, show the AI suggestion as a helpful reference.
- If the examiner selects a severity manually, preserve their selection and never overwrite it with a late AI response.
- Allow the examiner to choose a different severity from the AI suggestion.
- Clearly distinguish `AI Suggested Severity` from `Examiner Assessment`.
- If the AI does not return severity, show the existing form normally without inventing a value.
- Do not use a generic damage-detection confidence score as severity.
- If the current model only detects damage classes and bounding boxes, do not fabricate a severity prediction. Either use a genuinely supported severity output or leave severity to the examiner.

The AI's suggestion must not automatically determine repair cost, claim value, or claim approval.

## 8. Define how AI analysis interacts with examiner assessment and final decisions

The desired workflow is:

1. Claimant submits evidence.
2. NestJS stores the evidence and triggers background AI analysis.
3. The examiner can open the claim and assess it while AI analysis is pending.
4. When the AI response becomes available, the frontend updates the claim and assessment UI.
5. The examiner reviews the AI findings and independently assesses the damage.
6. The authorized examiner records the final decision and rationale.

### Decision and override rules
- The examiner must be allowed to continue working while AI analysis is pending.
- Do not force the examiner to keep the claim open solely because the AI service is slow or unavailable.
- An examiner may bypass or proceed without a pending AI result and finalize the claim if authorized by the existing workflow. Record that the AI result was unavailable or bypassed, with a reason where appropriate.
- If a `POTENTIAL_FRAUD` flag has already been returned, require the examiner to acknowledge and review it and record a reason for the final decision. The examiner may agree or disagree with the AI.
- Never automatically approve or reject a claim based solely on the AI response.
- Do not silently turn an AI flag into a rejected claim status.
- Preserve the AI result and the examiner's decision separately for auditability.
- If analysis completes after the claim has been finalized, save the result and follow a defined policy for notifying the appropriate reviewer. Do not silently overwrite or reverse the final decision.
- If a late AI result raises a significant concern after closure, create an auditable review flag or follow-up task according to the existing permissions; do not automatically reopen or reject the claim.

Use the existing claim-status enums and decision model wherever possible. Avoid introducing redundant workflow states without checking the existing implementation.

## 9. Fix the missing claimant name on claim details

### Current problem
The claimant's phone number, registered vehicle, policy, and initial estimation are displayed on the claim detail page, but the claimant's name is blank even though the name is stored in the database.

### Required investigation and fix
Trace the claimant name from the database to the UI:

1. Inspect the Claim and User/Claimant database relationships and identify where the authoritative claimant name is stored.
2. Inspect the Prisma query used to fetch claim details and determine whether the claimant relation or name field is omitted.
3. Inspect the backend response DTO/serializer and ensure it includes the correct claimant name.
4. Inspect frontend response types, property names, mapping logic, and the component rendering the claimant's name.
5. Check for mismatches such as `claimantName`, `claimant.name`, `user.fullName`, or other project-specific fields.
6. Fix the underlying query, response mapping, or rendering issue rather than hardcoding a name.
7. Ensure claimant details remain properly authorized and do not expose unnecessary personal information.

**Acceptance criteria:** A claim with a valid stored claimant name displays that name consistently in the claims list, claim detail view, and any relevant examiner or operations screens. Missing names should have a deliberate fallback such as `Not provided`, not a silent blank field.

## 10. Preserve and integrate existing duplicate detection and vector search

The current backend already computes SHA-256 and pHash. Preserve that implementation.

The intended responsibilities are:

- **NestJS:** Compute SHA-256 and pHash, compare them against existing evidence, and persist exact/perceptual hash matches.
- **FastAPI:** Generate embeddings, upsert them into Qdrant, and retrieve visually similar evidence.
- **PostgreSQL/Prisma:** Store canonical claims, evidence, analysis results, match records, examiner actions, and audit events.
- **Frontend:** Display authorized matching evidence and explain which type of similarity signal was found.

Ensure vector search applies the required insurer/tenant access filters. A vector similarity score is not a fraud probability, and neither a hash match nor visual similarity alone proves fraud.

Do not reimplement a duplicate-detection feature that already exists. Integrate the existing results and extend only what is missing.

## 11. Auditability and consistency

Ensure the following actions are properly recorded using the existing audit infrastructure:

- Evidence uploaded.
- AI analysis requested, started, completed, partially completed, or failed.
- Potential-fraud flag created or resolved.
- Examiner acknowledged or overrode an AI flag.
- Examiner severity assessment recorded or updated.
- Claim approved, rejected, partially approved, or sent back for more evidence.
- AI result arrived after the examiner's decision, if applicable.

Use existing audit conventions and enums where possible. Do not log credentials, authentication tokens, or unnecessary personal data.

Ensure claim status, AI analysis status, AI risk label, examiner assessment, and final decision remain separate concepts. One must not silently overwrite another.

## 12. Testing and verification

After implementing the changes, run the available tests, type checks, linting, and relevant builds. Add tests where coverage is missing.

At minimum, verify the following scenarios:

1. Opening the login page does not automatically authenticate a mock user.
2. With a healthy backend/database, all pages use real API responses and never show mock fixtures; a real empty response displays an empty state.
3. Invalid credentials and `401`/`403` responses never trigger mock fallback.
4. A genuine network/database outage activates only the defined, visibly labeled fallback; reconnecting refetches real data and clears stale mock state.
5. Demo mode cannot perform real privileged mutations.
6. Real login and protected API calls work.
3. Admin Operations and Admin Audit display real backend data and handle errors correctly.
4. An examiner cannot list or retrieve claims assigned to another examiner.
5. Uploading evidence stores it successfully and schedules AI analysis without blocking the upload response.
6. NestJS passes the existing SHA-256 and pHash values to FastAPI without recomputing them there.
7. FastAPI creates and stores an embedding in Qdrant and returns similar evidence candidates.
8. The frontend displays damage detections, severity suggestions, and risk flags from the persisted backend response.
9. A `POTENTIAL_FRAUD` flag creates a visible examiner warning and does not automatically reject the claim.
10. An examiner can finalize a claim while analysis is pending if authorized, with the bypass recorded appropriately.
11. A late AI response does not overwrite the examiner's assessment or final decision.
12. An examiner who disagrees with an AI flag can record a decision and rationale.
13. A missing or failed AI response does not prevent evidence retrieval or corrupt the claim.
14. The claimant's name is returned by the backend and rendered correctly in the frontend.
15. Existing claim, evidence, assessment, decision, and audit functionality continues working.

Use unit tests for isolated logic and integration tests for backend endpoints and database interactions. Where practical, add an end-to-end test for the main upload-to-examiner workflow.

Do not claim a test passed unless you actually ran it.

## 13. Implementation approach and final report

Work through the codebase systematically:

1. Inspect the repository structure, frontend framework, NestJS modules, Prisma schema, existing API client, authentication flow, and FastAPI integration.
2. Identify the exact root cause of each reported problem before changing code.
3. Reuse existing services, models, DTOs, enums, and components wherever appropriate.
4. Implement the backend and frontend fixes together when the issue crosses service boundaries.
5. Add or update migrations only if the schema genuinely requires a change.
6. Run tests, type checks, linting, and builds that are available in the repository.
7. Report any missing environment variables, credentials, services, model artifacts, or endpoints that prevent full verification.

At the end, provide a concise but specific report containing:

- **Root causes:** What caused each issue.
- **Files changed:** The important frontend, backend, and configuration files.
- **Implementation:** What was changed and how the data flows now.
- **Database changes:** Any migrations or schema changes.
- **Testing:** Commands executed and their actual results.
- **Manual verification:** Exact steps to test login, admin pages, examiner assignment, AI analysis, severity suggestions, fraud warnings, claim decisions, and claimant-name display.
- **Remaining blockers:** Anything requiring credentials, infrastructure, labelled data, or further work.

Do not replace working backend behavior with mocks, do not rewrite unrelated parts of the application, and do not stop after fixing only the visible frontend symptoms. The goal is a fully connected, secure, auditable EthioClaim workflow with real asynchronous AI results and human-controlled claim decisions.

## Final non-negotiable rule

When the backend and database are healthy, use real backend/database data only. Mocks are a clearly identified fallback for genuine infrastructure unavailability, not a way to hide broken integration. Never silently present mock data as real, never let mock authentication override a real session, and never present simulated AI output as genuine analysis.
