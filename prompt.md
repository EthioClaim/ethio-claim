# EthioClaim — Evidence Workflow, Examiner Lifecycle, and Unified ML Backend Integration

## 1. Role and Objective

Act as a senior full-stack engineer and ML engineer working directly on the existing **EthioClaim** repository.

Your task is to implement the requirements below across the frontend, NestJS backend, database, and ML backend. Investigate the current implementation, identify root causes, make the necessary code changes, and verify that the entire workflow works end to end.

**Do not merely describe what needs to be done. Implement the changes, run the available tests, fix regressions, and report the actual results.**

You are authorized to run terminal commands, inspect the repository, install necessary dependencies, create or modify files, run migrations and tests, and remove files confirmed to be obsolete and safe to delete. Do not ask for permission before ordinary development commands.

### Non-negotiable rules

- Inspect the existing implementation before changing it.
- Preserve working functionality and follow the existing architecture wherever possible.
- Modify the frontend, NestJS backend, and ML backend together where necessary.
- Enforce authorization on the backend, not only in the UI.
- Reuse existing database fields, enums, models, services, and endpoints where possible.
- Do not introduce duplicate status fields or competing implementations without a demonstrated need.
- Never fabricate AI predictions, damage detections, fraud results, or successful test outcomes.
- When the backend and database are available, use real persisted data. Do not silently substitute mock data for broken endpoints.
- Preserve existing model weights, datasets, labels, configuration, and preprocessing logic during ML integration.
- Do not stop after making a plan. Implement and test the changes.

---

## 2. Evidence Upload and Navigation

### Required behavior

When a claimant successfully uploads evidence for an existing claim:

1. Validate and upload the evidence using the existing frontend and backend architecture.
2. Ensure NestJS persists the evidence record and safely stores the image.
3. Schedule AI analysis in the background.
4. Return the user to `/claims` immediately after the upload and scheduling operation succeeds.
5. Display a success notification indicating that the evidence was submitted and AI analysis is processing.
6. Show the current claim/evidence processing status on the claims page.
7. If the upload fails, remain on the current page and display a meaningful error.
8. Prevent duplicate submissions while the upload is in progress.

The upload request must not wait for the entire AI inference, embedding generation, or vector-search process to finish.

Before implementing navigation, inspect the existing routing structure and determine how the uploaded evidence relates to its claim. Preserve the correct claim association throughout the workflow.

### Acceptance criteria

- Successful upload returns the user to `/claims`.
- Evidence is persisted before the frontend reports success.
- AI processing starts automatically in the background.
- The claims page displays the appropriate status.
- Failed uploads do not falsely report success or navigate away.

---

## 3. AI Processing and Evidence Classification

Implement a reliable asynchronous workflow that updates the claim/evidence state after the AI analysis finishes.

First, inspect the existing database schema, status enums, `DamageAnalysis` model, evidence-upload service, and ML integration. Reuse existing structures where appropriate.

### Required status flags

The system must clearly distinguish these states:

**AI Processing**

Evidence has been successfully uploaded, but AI analysis is pending or running.

**Fraud Review**

The system detected a configured duplicate or suspicious similarity signal involving previous evidence. The claim requires examiner review.

**No Damage Detected**

The model detected no damage in the submitted evidence. The examiner must cross-check the evidence and determine whether it is sufficient.

**Submitted**

AI analysis completed successfully, no configured fraud-review condition was triggered, and the claim is ready for the assigned examiner's queue.

**Need More Evidence**

The examiner requested additional evidence from the claimant.

**Under Review**

The examiner has started reviewing the claim.

**Assessed**

The examiner submitted an assessment. The claim is ready for authorized administrative review.

Use existing enum values if equivalent states already exist. Add new enum values or database fields only when necessary, and include the appropriate migration.

Do not combine AI processing status, AI risk classification, and claim workflow status into one field if the current architecture can represent them separately.

### Required AI processing workflow

1. The claimant uploads evidence.
2. NestJS validates the request, computes the existing hashes, stores the evidence, and creates or updates the analysis record.
3. NestJS schedules AI analysis without blocking the upload response on inference.
4. The frontend returns to `/claims`.
5. The claim/evidence displays **AI Processing** while the analysis is pending or running.
6. The frontend retrieves updated analysis results using the existing polling, refresh, or notification mechanism.
7. Once the analysis finishes, the backend persists the results and the UI updates automatically.

### Result A: Previous evidence matches

If the evidence matches previous evidence according to the configured duplicate-detection rules:

- Flag the claim as **Fraud Review**, or use the existing equivalent status/flag.
- Persist the reason for the flag and the matching evidence references.
- Display the flag prominently to the examiner.
- Allow the examiner to inspect the matched evidence when authorized.
- Preserve the similarity type, score, and relevant metadata returned by the existing detection system.
- Record the event in the audit log.

A duplicate or similarity match is a review signal, not proof of fraud. **Never automatically reject a claim solely because a match was found.**

Use the existing signals appropriately:

- SHA-256 for exact file-content matches.
- Perceptual hashing for likely visual matches after transformations such as resizing or recompression.
- ML embeddings and vector search for visually similar evidence.

Reuse existing duplicate-detection functionality rather than implementing a competing system.

### Result B: No damage detected

If the model genuinely supports determining that no damage is present:

- Set the appropriate **No Damage Detected** flag.
- Make the result visible to the examiner.
- Include the model result and relevant explanation or confidence information, if available.
- Require the examiner to cross-check the evidence.
- Do not automatically reject, approve, or close the claim.

Inspect the model's actual classes and inference logic before implementing this behavior. If the model cannot reliably distinguish no damage from an unsupported or inconclusive result, do not invent a prediction. Report the limitation and implement only what the model actually supports.

### Result C: Analysis completed without a configured fraud flag

If the analysis completes successfully, no configured duplicate/fraud-review condition applies, and the result is usable:

- Mark the claim/evidence as **Submitted**, using the appropriate existing lifecycle mapping.
- Ensure the claim becomes visible in the assigned examiner's queue.
- Persist the analysis and status changes.
- Display the updated status on `/claims`.

### Result D: Analysis fails or is inconclusive

If AI processing fails, times out, or produces an inconclusive result:

- Preserve the uploaded evidence and claim.
- Display the real failure or inconclusive status.
- Record the error appropriately without exposing sensitive internals to the frontend.
- Support retry or examiner review according to the existing workflow.
- Do not falsely label the claim as Submitted, Fraud Review, or No Damage Detected.

### Multiple findings

If an image both matches previous evidence and contains no detectable damage, preserve both findings where possible. Fraud Review should remain prominent, but the no-damage finding must not be discarded.

Late AI responses must never silently overwrite examiner assessments or final claim decisions.

---

## 4. Examiner Access to `/evidence`

Evidence upload is the claimant's responsibility, not the examiner's.

When a user with the **Examiner** role visits `/evidence`:

- Do not display an upload button, upload form, or other evidence-submission control.
- Allow the examiner to view evidence attached to claims assigned to them.
- Display evidence metadata, thumbnails or previews where supported, and the associated AI analysis results.
- Show the relevant AI Processing, Fraud Review, and No Damage Detected flags.
- Allow the examiner to open matching evidence only when authorized to access the associated claim.
- Provide proper loading, empty, and error states.

### Backend enforcement

Do not rely on frontend visibility alone.

- Inspect the current role and permission model.
- Reject evidence-upload requests from examiners at the NestJS authorization layer unless the existing policy explicitly grants that permission.
- Enforce claim-assignment checks on evidence list, detail, download, and AI-result endpoints.
- Prevent an examiner from accessing another examiner's evidence by modifying an ID, URL, or query parameter.
- Preserve the permissions of other roles without unintentionally broadening access.

---

## 5. Examiner Access to `/claims`

When the authenticated user has the **Examiner** role:

- Do not display the **New Claim**, **New Claim Intake**, or equivalent claim-creation button.
- Display only claims assigned to the authenticated examiner.
- Allow the examiner to open assigned claims, inspect evidence, request additional evidence, and submit assessments according to the existing workflow.
- Display AI-processing and review flags on relevant claims.
- Ensure the examiner's queue reflects persisted backend status rather than hardcoded frontend data.

### Mandatory backend security

Enforce examiner assignment checks in NestJS for:

- Claim list and search endpoints.
- Claim detail endpoints.
- Evidence retrieval and download.
- AI analysis results.
- Assessment retrieval and submission.
- Additional-evidence requests.
- Claim decisions and other examiner actions.

An examiner must not gain access to another examiner's claims by changing a claim ID in a URL or submitting a crafted API request.

Reuse the canonical examiner-assignment relationship already present in the database. Do not introduce a second assignment mechanism unnecessarily.

Administrators and operations users must retain only the access granted by the existing role model.

---

## 6. Automatically Mark Claims Under Review

When an examiner opens a claim assigned to them:

1. Verify the examiner's authorization and assignment.
2. If the claim is eligible for review, transition it to **Under Review**, or the existing equivalent status.
3. Persist the change in the backend.
4. Update the frontend from the backend response.
5. Record an audit event with the actor, claim ID, previous status, new status, and timestamp.

### Important safeguards

- Perform the transition only when necessary.
- Reopening or refreshing an already-under-review claim must not generate duplicate transition events.
- Never move an assessed, closed, rejected, or otherwise later-stage claim backward to Under Review.
- Do not bypass existing workflow permissions.
- Do not casually add database mutations to a GET request. Prefer an explicit authenticated start-review action or another appropriate idempotent API pattern.
- Trigger the transition once when the examiner enters the claim workflow, and handle retries safely.

### Acceptance criteria

Opening an eligible assigned claim automatically persists the Under Review status and records one audit event for the actual transition.

---

## 7. Fix the Request Additional Evidence Form

### Current bug

When the examiner submits the **Request Additional Evidence** form, the backend returns:

`message must be string`

This happens even though the form appears to accept a string.

Trace the request through every layer and identify the actual cause.

Inspect:

- Frontend form state.
- Input registration and validation.
- Form submission handler.
- API client and request serialization.
- Request body and property names.
- NestJS controller.
- DTO definitions and validation decorators.
- Validation and transformation pipes.
- Service logic and database persistence.

Determine whether the issue is caused by an incorrect property name, nested request body, `undefined` or `null` value, incorrect JSON serialization, `FormData`, or a mismatch between frontend and backend types.

**Fix the root cause. Do not remove or weaken backend validation merely to make the error disappear.**

### Required behavior after the fix

1. The examiner enters a request message and submits the form.
2. The frontend sends the correctly structured request expected by the NestJS DTO.
3. The backend validates and persists the request.
4. Only after successful persistence, the claim transitions to **Need More Evidence**, or the existing equivalent.
5. The frontend displays a success notification and updates the claim status.
6. The audit log records the request and transition.

If the request fails, do not change the claim status.

### Validation and regression tests

- Ensure frontend TypeScript types match the backend DTO.
- Validate that the message is a string and apply sensible required/length rules consistent with the UI.
- Add a regression test for a valid string message.
- Add tests for missing, null, and non-string values.
- Verify that valid submission changes the claim status to Need More Evidence.
- Verify that a failed request leaves the claim status unchanged.

---

## 8. Examiner Assessment and Admin Review

When the examiner finishes reviewing a claim and submits the assessment:

1. Validate the assessment request.
2. Persist the assessment in the backend.
3. Transition the claim to **Assessed**, or the existing equivalent.
4. Make the claim appear in the authorized administrator's assessment-review queue.
5. Record the assessment submission and status transition in the audit log.
6. Display the updated persisted status in the frontend.

### Important requirements

- Only the examiner assigned to the claim may submit its assessment, unless the existing permission model explicitly authorizes an exception.
- Preserve examiner findings separately from AI findings.
- Do not automatically close the claim when the examiner submits an assessment.
- Prevent accidental duplicate submissions and conflicting updates where practical.
- Ensure the administrator can inspect the assessment and complete the existing claim closure/finalization workflow.
- Do not invent a separate admin permission system if one already exists.
- Enforce the status transition in NestJS, not only in the frontend.

### Expected lifecycle

The intended normal workflow is:

1. Evidence uploaded.
2. AI Processing.
3. Analysis result:
   - Fraud Review, if a configured match/risk condition exists.
   - No Damage Detected, if the model detects no damage.
   - Submitted, if the analysis is usable and no configured fraud-review condition applies.
4. Examiner opens the assigned claim: Under Review.
5. Examiner requests more evidence: Need More Evidence.
6. Examiner submits assessment: Assessed.
7. Authorized administrator reviews the assessment and closes/finalizes the claim.

Use the existing status model where possible. Do not force every exceptional case into this normal sequence or discard independent AI findings.

---

## 9. Mandatory ML Integration: Merge `ML/` and `ML-backend/`

**This task is mandatory and must not be skipped.**

Inspect the entire `ML/` directory and the existing `ML-backend/` project. Integrate their useful functionality into one coherent ML project while preserving existing behavior.

Do not simply copy one directory over the other or delete either project before understanding its implementation.

### Step 1: Inspect both projects

Inspect:

- Directory structures and README files.
- Python entry points and application startup.
- FastAPI apps, routers, controllers, and endpoints.
- Model loading and inference pipelines.
- Image preprocessing and postprocessing.
- Damage-detection model architecture and class labels.
- Embedding-generation code.
- Similarity-search and Qdrant integration.
- Utility modules and shared functions.
- Dependency manifests and version constraints.
- Environment variables and configuration files.
- Model weights, checkpoints, datasets, and label maps.
- Dockerfiles, compose configuration, startup scripts, and deployment instructions.
- Tests and any existing API contracts consumed by NestJS.

Determine which functionality is unique to each project, where functionality overlaps, and which ML endpoint NestJS currently calls.

### Step 2: Establish one canonical ML project

Consolidate the code into one maintainable project with:

- One documented canonical entry point.
- A consistent dependency/configuration setup.
- Clear modules for model loading, inference, embedding generation, and similarity search where appropriate.
- A stable internal API consumed by NestJS.
- Correct model/configuration paths independent of the shell's current working directory.
- Health/readiness endpoints and appropriate error handling.
- Tests for core behavior.

Preserve useful features from both projects. Do not replace real inference with placeholder results.

### Step 3: Preserve model and vector compatibility

- Preserve existing model weights, class labels, preprocessing, image dimensions, normalization, and postprocessing logic.
- Preserve embedding dimensions and vector metadata required by Qdrant.
- Ensure vector IDs and upserts are stable and idempotent.
- Preserve appropriate tenant/insurer filters for similarity searches.
- Do not mix embeddings from incompatible model versions.
- If the integration changes the embedding model, dimensions, preprocessing, collection name, or vector schema, document and implement the necessary migration or reindexing strategy.
- Do not remove large assets until their role and dependencies are understood.

### Step 4: Integrate NestJS with the unified ML backend

- Update the NestJS AI service to call the unified ML backend's actual URL and endpoints.
- Keep service-to-service calls authenticated and internal.
- Ensure request/response DTOs match between NestJS and FastAPI.
- Pass the existing evidence ID, claim ID, analysis ID, trusted image reference, SHA-256, pHash, and relevant duplicate-match information as required by the existing design.
- Do not make the ML service recompute SHA-256 or pHash if NestJS already owns those calculations.
- Ensure the ML backend performs real inference, embedding generation, and Qdrant operations where configured.
- Persist returned analysis results through NestJS.
- Keep the frontend isolated from direct ML-backend or Qdrant access.

### Step 5: Consolidate safely

- Update dependency files, startup commands, environment examples, Docker configuration, README documentation, and tests.
- Resolve dependency conflicts based on actual requirements.
- Retain a compatibility wrapper if it is necessary during migration.
- Remove old duplicate code only after the unified project works and tests pass.
- Document the canonical location of the integrated project and how to start it.

### ML integration acceptance criteria

1. One canonical ML backend entry point is documented.
2. Useful functionality from both projects remains available.
3. Dependencies install successfully using documented instructions.
4. The service starts from the documented working directory.
5. The intended models and configuration load correctly.
6. Real damage inference works with a valid test image when assets and dependencies are available.
7. Embedding generation and Qdrant search/upsert work when the configured service is available.
8. NestJS successfully calls the unified ML service.
9. Request/response contracts and error handling are verified.
10. No required model weights, labels, configurations, or functionality are accidentally deleted.

If an external service or model asset is unavailable, verify what can be tested and document the blocker honestly. Do not claim full integration success without evidence.

---

## 10. Audit Every Relevant API Endpoint

Perform a systematic audit of the frontend, NestJS backend, and ML backend.

Inventory the endpoints used by:

- Authentication and session management.
- Claims list, details, and assignment.
- Evidence upload and retrieval.
- AI analysis status and results.
- Duplicate/similarity matches.
- Additional-evidence requests.
- Examiner assessment.
- Admin assessment review and claim closure.
- Audit logs and status transitions.
- ML health, damage inference, embeddings, and similarity search.

For each endpoint, verify:

- HTTP method and URL.
- Request parameters and body structure.
- DTO validation and TypeScript types.
- Authentication and role/assignment guards.
- Database operations and relations.
- ML service calls and response mapping.
- Status codes and error responses.
- Frontend loading, success, and error handling.

Fix missing endpoints, stale URLs, incorrect request properties, mismatched response shapes, missing authorization, and broken service configuration.

Update every consumer and test whenever an API contract changes.

Do not assume an endpoint works merely because the frontend compiles. Test the actual request and response path wherever the environment permits.

---

## 11. Testing and Verification

Inspect the repository's scripts and use the existing package manager and testing tools.

Run the available tests, type checks, linting, builds, migrations where applicable, and health checks for the frontend, NestJS backend, and unified ML project.

At minimum, verify:

1. Evidence upload persists successfully and returns the user to `/claims`.
2. The upload endpoint does not wait for full AI inference.
3. AI Processing appears while analysis is pending.
4. The UI updates when analysis finishes.
5. A genuine duplicate match triggers Fraud Review.
6. No damage detected triggers the appropriate examiner cross-check flag.
7. A usable analysis without a configured fraud-review condition triggers Submitted and enters the assigned examiner queue.
8. Failed or inconclusive analysis is not misrepresented as a successful result.
9. Examiners cannot upload evidence through either the UI or direct API requests.
10. Examiners do not see the New Claim button on `/claims`.
11. Examiners can only access claims assigned to them, including nested evidence and AI results.
12. Opening an eligible claim transitions it to Under Review and records one appropriate audit event.
13. The additional-evidence form accepts valid strings and fixes the `message must be string` bug.
14. Invalid messages are handled correctly.
15. Successful evidence requests transition claims to Need More Evidence.
16. Assessment submission transitions claims to Assessed.
17. Assessed claims appear in the appropriate admin review queue.
18. Admins can review and close claims using existing permissions.
19. Late AI results do not overwrite examiner assessments or final decisions.
20. The unified ML backend starts correctly and loads the intended models.
21. Real inference, embedding generation, and Qdrant operations work where dependencies and services are available.
22. All affected frontend/backend/ML API contracts match.
23. Existing claim, evidence, assessment, decision, and audit functionality continues working.

Add unit and integration tests for important logic and authorization boundaries. Use an end-to-end test for the upload-to-examiner workflow where practical.

**Never claim a test passed unless it was actually executed.** Distinguish automated tests, manual checks, and blocked checks.

---

## 12. Implementation Order

Follow this order to minimize regressions:

1. Inspect the repository, schema, existing status enums, authorization rules, API contracts, and both ML projects.
2. Document the current behavior and identify the root cause of each reported issue.
3. Fix the additional-evidence request payload/DTO validation mismatch.
4. Implement evidence upload navigation and asynchronous AI status updates.
5. Implement the AI result flags and persistence.
6. Implement examiner-only page restrictions and backend assignment enforcement.
7. Implement Under Review, Need More Evidence, and Assessed transitions with audit events.
8. Integrate `ML/` and `ML-backend/` into one project while preserving functionality.
9. Connect and verify the affected frontend, NestJS, and ML endpoints.
10. Run tests and builds, resolve regressions, and update documentation.

Do not rewrite unrelated components unless necessary to complete these tasks.

## 13. Final Report

After implementation, provide a report containing:

- **Root causes:** The cause of each issue found.
- **Frontend changes:** Components, routes, forms, and API clients modified.
- **Backend changes:** Controllers, services, DTOs, authorization rules, and status transitions modified.
- **Database changes:** Schema changes and migrations.
- **ML integration:** How `ML/` and `ML-backend/` were consolidated, the canonical entry point, and the functionality/assets preserved.
- **API verification:** Which endpoints were tested and their actual results.
- **Testing:** Commands executed and actual results for tests, type checks, linting, builds, and health checks.
- **Manual verification:** Steps and outcomes for the complete upload-to-admin-closure workflow.
- **Remaining blockers:** Missing model assets, credentials, services, or infrastructure that prevented verification.

**Final requirement:** Implement the complete workflow across the frontend, backend, database, and ML backend. Preserve existing functionality, enforce examiner assignment at the backend, and verify the real API integrations. Consolidating `ML/` and `ML-backend/` into one working project is mandatory.