EthioClaim

**Updated FastAPI AI Service & Vector Database Implementation Guide**

Aligned with the existing NestJS evidence-upload pipeline

Purpose: define the revised service boundary, endpoints, Qdrant vector database, risk flags, and mandatory examiner handoff.

|  |  |
| --- | --- |
| **Decision** | **Implementation** |
| NestJS owns | Claim/evidence APIs, access control, file upload/storage, SHA-256 and pHash, hash comparisons, workflow, audit events, examiner assessments and final decisions. |
| FastAPI owns | Damage inference, image embedding generation, Qdrant upsert/search, visual similarity results, and an AI screening/risk response. |
| Vector database | Qdrant is a separate service for image embeddings and searchable metadata. PostgreSQL/Prisma remains the canonical business database. |
| Human oversight | AI may flag POTENTIAL\_FRAUD or NO\_FRAUD\_INDICATORS\_FOUND. These are screening outcomes, not final decisions. An examiner decides whether to approve, reject, or request more evidence. |

# 1. Executive summary

The current NestJS upload method already computes SHA-256 and pHash, uploads the file, creates Evidence, checks exact duplicates, records a SimilarityMatch, creates a pending DamageAnalysis, and writes an audit event. FastAPI must not recompute those hashes. NestJS should send the existing values and the matches it found to FastAPI as analysis context.

* FastAPI loads the image using a trusted internal storage reference, runs damage detection, creates an embedding, stores it in Qdrant, and searches for visually similar historical evidence.
* NestJS persists the AI response and connects it to the claim workflow. The browser never calls FastAPI directly.
* Exact hash, pHash, and embedding similarity are evidence signals, not proof of fraud. Similar photos can be legitimate or coincidental.
* If AI flags POTENTIAL\_FRAUD, NestJS must route the claim to an examiner and prevent automated approval/rejection. The examiner reviews evidence and records an outcome with a rationale.
* If no risk indicator is found, the claim still follows normal review. Absence of a flag does not prove a claim is legitimate.

# 2. Scope and non-goals

|  |  |
| --- | --- |
| **In MVP** | **Out of scope** |
| Damage detection using an available pretrained/fine-tuned model; embeddings; Qdrant similarity search; consumption of NestJS hashes/matches; transparent risk flags; examiner review handoff. | OCR; automatic repair-cost estimation; AI-generated/photoshop forensics; automatic claim approval/rejection/payment; treating similarity as proof; training a fraud classifier without labelled data. |

If no reliable labelled fraud dataset is available, start with transparent rules based on the signals that actually exist. Do not claim a validated fraud-prediction model unless it has been trained and evaluated on representative labelled cases.

# 3. Architecture and ownership

Next.js browser -> NestJS API -> PostgreSQL/Prisma
 |
 | internal authenticated request
 v
 FastAPI AI service <----> Qdrant vector DB
 | embeddings + metadata
 +-- damage detector
 +-- embedding encoder
 +-- risk assessment

|  |  |
| --- | --- |
| **Component** | **Responsibilities** |
| NestJS | Authentication/access checks; evidence upload/storage; SHA-256/pHash; exact and pHash comparison; claim/evidence records; analysis persistence; flags; examiner decisions; audit logs. |
| FastAPI | Decode/validate image; damage inference; generate embedding; Qdrant upsert/search; return similar evidence IDs/scores and risk reasons. Do not recompute hashes or decide claims. |
| Qdrant | Store and search image vectors with evidence/claim/tenant/model metadata. It is an index, not the source of truth. |
| PostgreSQL | Canonical records, analysis results, similarity-match records, flags, examiner actions, and audit history. |

# 4. Updated upload-to-analysis flow

1. Client uploads image to NestJS. NestJS authenticates the user and verifies access to the claim.
2. NestJS validates and stores the image, computes SHA-256 and pHash once, creates the Evidence row, checks for exact hash matches, and optionally checks pHash distances against historical evidence.
3. NestJS persists matching rows in SimilarityMatch, creates DamageAnalysis in PENDING, and records EVIDENCE\_UPLOADED.
4. After database writes are committed, NestJS sends an internal analysis request to FastAPI. Include evidenceId, claimId, analysisId, trusted imageRef, existing sha256/phash values, and exact/perceptual match summaries.
5. FastAPI fetches the image via a controlled storage adapter, runs damage inference, generates an embedding, upserts it into Qdrant, and searches top-K similar evidence with insurer/tenant filters.
6. FastAPI returns damage detections, visual matches, risk label/reasons, warnings, and model versions. It does not change claim status or make a final decision.
7. NestJS validates and persists the response. If POTENTIAL\_FRAUD, create a ClaimFlag/review task. If analysis fails, retain evidence and allow retry.
8. Examiner inspects the original evidence, relevant historical matches, and AI explanation, then records APPROVE, REJECT, PARTIALLY\_APPROVE, or REQUEST\_MORE\_EVIDENCE with a written reason.

## 4.1 Important reliability note for the existing method

The current processDamageAnalysis(evidence.id, file.originalname) is fire-and-forget. If the promise rejects or the process restarts, analysis may be lost. For the MVP, catch/log failures and persist FAILED or RETRYABLE status. Ensure the Evidence and DamageAnalysis rows are committed before calling FastAPI. A durable job queue or database outbox is a follow-up improvement.

Do not pass arbitrary client-provided URLs or filesystem paths to FastAPI. Pass a storage key that FastAPI resolves through a trusted adapter, or a short-lived signed URL generated by NestJS. Protect against SSRF and path traversal.

# 5. Internal API contracts

|  |  |
| --- | --- |
| **Method / route** | **Purpose** |
| GET /health/live | Process liveness. |
| GET /health/ready | Readiness check for model initialization and Qdrant connection. |
| POST /internal/v1/analyze | Primary MVP endpoint: damage inference, embedding upsert, similarity retrieval, and risk screening. |
| POST /internal/v1/similarity/search | Optional separate vector-search endpoint if not included in /analyze. |
| POST /internal/v1/embeddings/reindex | Optional authenticated admin operation for rebuilding vectors. |

## 5.1 Example NestJS request

{
 "analysisId": "analysis-uuid",
 "evidenceId": "evidence-uuid",
 "claimId": "claim-uuid",
 "imageRef": "trusted-internal-storage-key",
 "sha256": "value-computed-by-NestJS",
 "phash": "value-computed-by-NestJS",
 "hashMatches": {
 "exactMatches": [{"evidenceId": "prior-evidence-id", "claimId": "prior-claim-id"}],
 "perceptualMatches": [{"evidenceId": "prior-id", "claimId": "prior-claim-id", "distance": 4}]
 },
 "options": {"damageDetection": true, "embeddingSimilarity": true, "topK": 5}
}

## 5.2 Example FastAPI response

{
 "analysisId": "analysis-uuid",
 "evidenceId": "evidence-uuid",
 "status": "COMPLETED",
 "damageDetections": [
 {"label": "scratch", "confidence": 0.87, "box": [0.1, 0.2, 0.6, 0.7]}
 ],
 "embedding": {"stored": true, "model": "vision-encoder", "version": "v1"},
 "visualMatches": [
 {"evidenceId": "prior-evidence-id", "claimId": "prior-claim-id", "similarity": 0.93}
 ],
 "riskAssessment": {
 "label": "POTENTIAL\_FRAUD",
 "score": null,
 "reasons": ["High visual similarity to evidence from another claim",
 "NestJS reported an exact hash match"],
 "requiresExaminerReview": true,
 "ruleVersion": "rules-v1"
 },
 "warnings": ["Similarity is a review signal, not proof of fraud"],
 "createdAt": "ISO-8601 timestamp"
}

Scores above are illustrative. Do not display a number as a fraud probability unless calibrated and validated. For a rules-based MVP, score may remain null; return reason codes and the rule/model version.

# 6. Risk labels and human decision flow

|  |  |  |
| --- | --- | --- |
| **AI label** | **Meaning** | **Required handling** |
| POTENTIAL\_FRAUD | One or more configured risk signals warrant review. | Create examiner task; show reasons and candidate evidence; block automated approval/rejection; require examiner action. |
| NO\_FRAUD\_INDICATORS\_FOUND | Configured checks did not find a trigger above threshold. | Continue ordinary review. Do not automatically approve the claim. |
| INCONCLUSIVE | Image quality, missing history, conflicting signals, or confidence is insufficient. | Manual review or retry; do not infer fraud. |
| ANALYSIS\_FAILED | Technical failure prevented analysis. | Preserve evidence; record error; retry or manually review. |

SUBMITTED -> READY\_FOR\_REVIEW -> UNDER\_REVIEW
UNDER\_REVIEW -> NEED\_MORE\_EVIDENCE (optional) -> UNDER\_REVIEW
UNDER\_REVIEW -> ASSESSED -> APPROVED / REJECTED / PARTIALLY\_APPROVED
Optional final step: CLOSED

* AI risk label and claim status must be separate fields. POTENTIAL\_FRAUD must not silently set status to REJECTED.
* For a potential-fraud flag, require the examiner to record a decision and rationale before finalization.
* Record examiner ID, timestamp, outcome, rationale, whether they agreed with the AI, and which evidence they reviewed.
* Examiner must be able to disagree with the AI. Preserve the original flag and record the override instead of overwriting history.

# 7. Separate vector database: Qdrant

Use Qdrant as the dedicated image-vector store. FastAPI generates an embedding with a pretrained vision encoder, upserts it under a stable point ID, and retrieves nearest neighbours. PostgreSQL remains canonical and should store the AI result and candidate IDs so the examiner interface can show past results even when Qdrant is temporarily unavailable.

## 7.1 Payload fields

|  |  |
| --- | --- |
| **Field** | **Purpose** |
| Point ID | Stable ID mapped to evidenceId; makes retries idempotent. |
| Vector | Embedding produced by the selected vision encoder. |
| evidence\_id, claim\_id | References to canonical NestJS records. |
| insurer\_id / tenant\_id | Mandatory isolation filter where multiple insurers/tenants exist. |
| embedding\_model, model\_version | Traceability and version compatibility. |
| created\_at | Vector creation/indexing timestamp. |
| sha256/phash (optional) | Can be copied for traceability from NestJS, but must not be recomputed by FastAPI. |

## 7.2 Embedding lifecycle

1. Load the image using the trusted storage adapter and apply deterministic preprocessing.
2. Run the chosen vision encoder and obtain the embedding vector.
3. Normalize embeddings if required by the encoder and selected distance metric.
4. Upsert into Qdrant using a stable point ID, including evidence/claim/tenant/model metadata.
5. Search top-K neighbours, exclude the current evidence, and enforce insurer/tenant filters.
6. Return candidate evidence IDs and similarity scores; NestJS resolves IDs to authorized display details.
7. On deletion or retention expiry, remove/deactivate the corresponding point. Keep the index rebuildable from canonical evidence.

* Use the actual embedding output dimension; do not guess it.
* Choose the Qdrant distance metric to match the selected encoder, commonly cosine for normalized embeddings.
* Create payload indexes for fields used in filters, especially tenant/insurer and evidence/claim IDs.
* Do not mix incompatible embedding-model versions in one ranking without a migration plan. Re-embed into a versioned collection when changing models.
* Never expose Qdrant to the browser or public internet.

Example local development command (pin a reviewed image version for deployment):
docker run --name ethio-claim-qdrant -p 6333:6333 -p 6334:6334 \
 -v qdrant\_storage:/qdrant/storage qdrant/qdrant

# 8. Interpreting similarity and flagging risk

|  |  |
| --- | --- |
| **Signal** | **Interpretation** |
| Exact SHA-256 match from NestJS | Same bytes. Strong duplicate signal, but reuse may be legitimate or accidental. |
| Small pHash distance from NestJS | Likely visually similar despite resizing/recompression; not proof of fraud. |
| High Qdrant embedding similarity | Visually similar content; could be the same car, similar damage, or unrelated similar imagery. |
| Damage detections | Help locate visible damage; do not establish when it happened, cause, or claimant responsibility. |
| Multiple independent signals | May raise review priority only after thresholds are evaluated; do not add uncalibrated scores and call the result a probability. |

Recommended MVP logic: if NestJS reports an exact match across different claims or a validated cross-claim similarity rule triggers, return POTENTIAL\_FRAUD with explicit reason codes. Otherwise return NO\_FRAUD\_INDICATORS\_FOUND or INCONCLUSIVE. Tune thresholds with labelled image pairs and record the rule version. Keep all final decisions human-owned.

# 9. NestJS integration and persistence

* Create a NestJS AiService using a configured HTTP client. Authenticate every service-to-service request with a secret/token or stronger service identity.
* Set explicit connect/read timeouts, bounded retries, and an idempotency key based on analysisId/evidenceId.
* Never treat CORS as authentication. Do not expose FastAPI publicly just to make browser calls work.
* Validate response schema, enum values, score ranges, candidate count, and string lengths before saving.
* FastAPI returns identifiers and scores, not private claim details. NestJS checks access before displaying candidate details.

|  |  |
| --- | --- |
| **Record** | **Suggested fields** |
| Evidence (existing) | id, claimId, storageKey, sha256, phash, uploadedById, createdAt, deletedAt. |
| DamageAnalysis | id, evidenceId, status, damageDetections JSON, embeddingModel/version, vectorPointId, riskLabel, riskReasons JSON, nullable riskScore, warnings JSON, rule/model version, analyzedAt, errorCode. |
| SimilarityMatch (existing) | sourceEvidenceId, matchedEvidenceId, matchType (EXACT\_HASH / PHASH / VECTOR), score nullable, distance nullable, createdAt. |
| ClaimFlag | id, claimId, evidenceId nullable, type, source=AI, explanation, status=OPEN/IN\_REVIEW/RESOLVED, createdAt, resolvedById, resolutionNotes. |
| ClaimDecision | claimId, outcome, reason, decidedById, decidedAt, aiFlagReviewed, aiFlagDisposition. |
| AuditEvent (existing) | claimId, actorId, action, summary, details JSON, createdAt. |

Do not store large embedding arrays in a PostgreSQL JSON column if Qdrant is the vector database. Store vector point ID and model/version if useful. Persist enough candidate-match metadata in PostgreSQL for the examiner's audit trail.

# 10. Suggested FastAPI repository structure

apps/ai-service/
 app/main.py
 app/core/config.py
 app/core/security.py
 app/api/routes/health.py
 app/api/routes/analyze.py
 app/schemas/analysis.py
 app/services/image\_loader.py
 app/services/damage\_detector.py
 app/services/embedding\_service.py
 app/services/vector\_store.py
 app/services/risk\_assessor.py
 app/services/analysis\_service.py
 app/adapters/qdrant\_adapter.py
 tests/
 requirements.txt
 Dockerfile
 .env.example

Keep damage detection and embedding generation behind adapters. If the actual model is not ready, use a mock adapter first while preserving the request/response contract.

# 11. Configuration and dependencies

ENVIRONMENT=development
INTERNAL\_SERVICE\_TOKEN=replace-with-secret
QDRANT\_URL=http://qdrant:6333
QDRANT\_API\_KEY=
QDRANT\_COLLECTION=ethio\_claim\_evidence\_v1
EMBEDDING\_MODEL\_NAME=selected-vision-encoder
EMBEDDING\_MODEL\_VERSION=v1
DAMAGE\_MODEL\_PATH=/models/damage-model.pt
USE\_MOCK\_DAMAGE\_MODEL=true
MAX\_IMAGE\_BYTES=10485760
MAX\_IMAGE\_DIMENSION=6000
ANALYSIS\_TIMEOUT\_SECONDS=30
TOP\_K\_DEFAULT=5

* Core packages: fastapi, uvicorn[standard], pydantic-settings, Pillow, httpx, qdrant-client, pytest. Add torch/ultralytics or other encoder dependencies only after selecting the model.
* Do not commit secrets or private storage credentials. Load fixed, reviewed model artifacts rather than downloading arbitrary weights at runtime.
* Validate byte size, decoded format, dimensions, and decompression limits. Consider CPU inference latency before adding asynchronous workers.

# 12. Reliability and error handling

|  |  |
| --- | --- |
| **Failure** | **Required behaviour** |
| Qdrant unavailable | Return partial/retryable result where possible; preserve damage detections and evidence. |
| Damage model unavailable | Return partial analysis if embeddings work; otherwise mark analysis failed with an error code. |
| Corrupt image | Reject analysis input safely; retain uploaded evidence and route for correction/manual review as appropriate. |
| Duplicate request | Idempotently update the same analysis/vector point; do not create repeated points. |
| No neighbours | Return an empty list, not an error. This does not prove absence of fraud. |
| FastAPI unavailable | NestJS stores retryable failure state. Evidence upload remains successful if evidence storage succeeded. |
| Timeout after Qdrant upsert | Retry safely using the stable point ID. |

# 13. Security, privacy, and auditability

* Keep FastAPI and Qdrant on a private network and require service authentication.
* Apply insurer/tenant filters to every vector search. Do not expose one insurer's claim images to another.
* Use least-privilege object-storage access and trusted references; never fetch arbitrary browser-provided URLs.
* Restrict access to uploaded vehicle images and define retention/deletion rules for both evidence and vectors.
* Log analysis ID, model/rule versions, duration, status, and error codes. Avoid logging image bytes, tokens, or unnecessary personal data.
* Persist the AI explanation and examiner action so later auditors can reconstruct why a claim was flagged and how the decision was reached.

# 14. Testing and model evaluation

|  |  |
| --- | --- |
| **Area** | **Tests / measures** |
| API/security | Valid/invalid schemas, missing token, oversized images, invalid file, timeout. |
| Embedding pipeline | Stable vector dimension, deterministic preprocessing, model version, idempotent upsert. |
| Vector retrieval | Known similar pairs in top-K; current evidence excluded; tenant filters enforced; Recall@K and Precision@K on labelled pairs. |
| Damage model | Per-class precision/recall and mAP on held-out data; prevent near-duplicate leakage between train/test. |
| Risk flags | False-positive/false-negative rates on labelled examples; exact match, pHash match, vector match, no match, inconclusive cases. |
| Human workflow | Potential-fraud task created; no automatic rejection; reason required; examiner override is audited. |
| Resilience | Model/Qdrant outage does not delete evidence or silently approve/reject a claim. |

Measure vector retrieval quality separately from fraud classification quality. A nearest-neighbour score is not a fraud probability. If no reliable labelled fraud dataset exists, describe the output as rules-based screening.

# 15. Three-day implementation plan

|  |  |  |
| --- | --- | --- |
| **Day** | **Work** | **Deliverable** |
| 1 | FastAPI skeleton, config, internal auth, health routes, Pydantic schemas, trusted image loader, mock damage adapter. | Service runs; schema/auth/image tests pass. |
| 2 | Pretrained embedding encoder, Qdrant collection, idempotent upsert, top-K search and tenant filtering. | Embeddings persist and similar evidence can be retrieved. |
| 3 | Transparent risk rules, NestJS integration, persistence, ClaimFlag/review task, examiner decision and failure handling. | End-to-end upload-to-examiner demo with no automated rejection. |

# 16. Definition of done

* FastAPI consumes NestJS-computed SHA-256/pHash and does not recompute them.
* NestJS remains the public API and source of truth.
* Every successful embedding is upserted into Qdrant with stable identifiers and model version.
* Similarity search applies tenant/insurer filters and returns candidate IDs/scores.
* AI returns risk label, explicit reasons, warnings, and model/rule version.
* POTENTIAL\_FRAUD creates a mandatory examiner-review path and never auto-rejects.
* Examiner decisions require outcome, rationale, identity, timestamp, and audit history.
* FastAPI/Qdrant failures do not delete evidence or silently decide a claim.
* Tests cover retrieval, duplicate context, partial failures, tenant isolation, and examiner override.

# 17. Final recommendations

* Keep SHA-256 and pHash computation and comparison in NestJS; pass those results to FastAPI.
* Use Qdrant as the separate vector database; keep PostgreSQL/Prisma canonical.
* Start with one pretrained embedding encoder and version it from day one.
* Use transparent rules for the first risk flags unless a validated fraud classifier and labelled dataset are available.
* Treat POTENTIAL\_FRAUD as a mandatory review trigger, not a final finding. The examiner owns the final decision.
* Prioritize a reliable end-to-end MVP over multiple models or complex infrastructure within the three-day deadline.

# Appendix: implementation checklist

* ? FastAPI internal token validation
* ? Request/response schemas and trusted image loader
* ? Damage detector adapter (mock first if needed)
* ? Embedding model adapter
* ? Qdrant collection, payload indexes, and tenant filters
* ? Idempotent vector upsert and top-K search
* ? Risk rules with explicit reason codes
* ? NestJS client, timeout, retries, and idempotency
* ? Persist analysis results and ClaimFlag in PostgreSQL
* ? Examiner review UI and mandatory decision rationale
* ? Retry path and tests for model/Qdrant failure
