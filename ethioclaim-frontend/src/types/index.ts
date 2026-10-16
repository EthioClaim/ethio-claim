// ═══════════════════════════════════════════════════════════════════════════════
// EthioClaim — Complete Domain & NestJS API Contract Models (/api/v1)
// Conforming to doc.md specifications
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = "INTAKE_USER" | "EXAMINER" | "ADMIN" | "CLAIMANT" | "MANAGER";

export interface CurrentUser {
  id: string;
  email: string;
  displayName?: string;
  name?: string;
  username?: string;
  role: UserRole;
  organizationId?: string;
}

export type User = CurrentUser;

export interface LoginPayload {
  email?: string;
  username?: string;
  password: string;
}

export interface AuthResponse {
  accessToken?: string;
  token?: string;
  user: CurrentUser;
}

export interface HealthResponse {
  status: "ok" | string;
  database?: "ok" | string;
  timestamp?: string;
}

// ── Policies ──────────────────────────────────────────────────────────────────
export interface Policy {
  id: string;
  policyNumber: string;
  normalizedPolicyNumber?: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED" | string;
  validFrom?: string;
  validTo?: string;
  insurer?: string;
  holderName?: string;
  vehicleRegistration?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PolicyVerificationResult {
  found: boolean;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "NOT_FOUND" | string;
  policyId?: string;
  validFrom?: string;
  validTo?: string;
  insurer?: string;
  policyNumber?: string;
}

// ── Claims ────────────────────────────────────────────────────────────────────
export type ClaimStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "POLICY_UNVERIFIED"
  | "PROCESSING"
  | "READY_FOR_REVIEW"
  | "UNDER_REVIEW"
  | "EVIDENCE_REQUESTED"
  | "NEED_MORE_EVIDENCE"
  | "ASSESSED"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ClaimParty {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  idNumber?: string;
}

export interface Vehicle {
  id?: string;
  make: string;
  model: string;
  year?: number | string;
  plate: string;
  color?: string;
  vin?: string;
  vehicleType?: string;
}

export interface ClaimSummary {
  id: string;
  claimNumber?: string;
  policyNumber: string;
  claimantName: string;
  vehiclePlate?: string;
  incidentDate: string;
  status: ClaimStatus;
  createdAt: string;
  updatedAt?: string;
  evidenceCount?: number;
}

export interface ClaimTimelineEvent {
  id: string;
  claimId: string;
  action: string;
  description?: string;
  actor?: { id?: string; name?: string; role?: string } | string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface CreateClaimPayload {
  claimant: {
    name: string;
    phone: string;
    email?: string;
    idNumber?: string;
  };
  vehicle: {
    make: string;
    model: string;
    year?: number | string;
    plate: string;
    color?: string;
    vin?: string;
  };
  policyNumber: string;
  incident: {
    date: string;
    location?: string;
    description: string;
    estimatedAmount?: number | string;
  };
}

export interface UpdateClaimPayload {
  claimant?: Partial<ClaimParty>;
  vehicle?: Partial<Vehicle>;
  incident?: {
    date?: string;
    location?: string;
    description?: string;
    estimatedAmount?: number | string;
  };
}

export interface Claim {
  id: string;
  claimNumber: string;
  status: ClaimStatus;
  riskLevel?: RiskLevel;
  createdAt: string;
  updatedAt?: string;
  incidentDate: string;
  submittedAt?: string;
  closedAt?: string;
  description?: string;
  accidentDescription?: string;

  claimant: ClaimParty;
  vehicle: Vehicle;
  policyNumber?: string;
  policy?: Policy;
  evidence?: Evidence[];
  evidenceCount?: number;
  latestAssessment?: ExaminerAssessment;
  assessmentSummary?: ExaminerAssessment;
  examiner?: CurrentUser;

  estimatedAmount?: number;
  currency?: string;
  evidenceComplete?: boolean;
  aiProcessed?: boolean;
}

export interface RequestEvidencePayload {
  item: string;
  notes?: string;
  deadline?: string;
}

// ── Evidence & Analysis ───────────────────────────────────────────────────────
export type AnalysisStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Evidence {
  id: string;
  claimId: string;
  storageKey?: string;
  originalFilename?: string;
  filename?: string;
  contentType?: string;
  mimeType?: string;
  sizeBytes?: number;
  fileSize?: number;
  sha256?: string;
  phash?: string;
  uploadedAt: string;
  analysisStatus: AnalysisStatus | string;
  url?: string;
  thumbnailUrl?: string;
  viewType?: string;
}

export interface DamageDetection {
  id?: string;
  part?: string;
  damageType: string;
  severity?: string;
  confidence: number;
  bbox?: [number, number, number, number];
}

export interface DamageAnalysis {
  id: string;
  evidenceId: string;
  modelName?: string;
  modelVersion?: string;
  inferenceStatus?: AnalysisStatus | string;
  status?: string;
  detections: DamageDetection[];
  errorMessage?: string;
  createdAt?: string;
  processingTime?: number;
}

export type SimilarityMatchType = "EXACT_HASH" | "PERCEPTUAL_HASH" | "EMBEDDING_SIMILARITY";

export interface SimilarityMatch {
  id: string;
  sourceEvidenceId?: string;
  matchedEvidenceId: string;
  matchedClaimId?: string;
  matchedClaimNumber?: string;
  matchType: SimilarityMatchType;
  distance?: number;
  score?: number;
  createdAt?: string;
}

// ── Examiner Assessment & Decisions ───────────────────────────────────────────
export type AssessmentSeverity = "MINOR" | "MODERATE" | "SEVERE" | "UNDETERMINED";

export interface ExaminerAssessment {
  id?: string;
  claimId: string;
  severity: AssessmentSeverity;
  estimatedLossEtb?: number | string;
  estimatedLossAmount?: number | string;
  currency: "ETB";
  notes?: string;
  assessedBy?: string;
  examinerUserId?: string;
  examinerName?: string;
  assessedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExaminerAssessmentPayload {
  severity: AssessmentSeverity;
  estimatedLossEtb?: number | string;
  estimatedLossAmount?: number | string;
  currency?: "ETB";
  notes: string;
}

export type ExaminerDecisionType =
  | "REFER_FOR_INSPECTION"
  | "RECOMMEND_APPROVAL"
  | "RECOMMEND_REJECTION"
  | "FAST_TRACK"
  | "ADDITIONAL_DOCUMENTS_REQUIRED";

export interface ExaminerDecisionPayload {
  decision: ExaminerDecisionType | string;
  notes?: string;
  estimatedLossEtb?: number | string;
}

export interface ExaminerDecisionResult {
  id?: string;
  claimId: string;
  decision: string;
  notes?: string;
  recordedAt: string;
  recordedBy?: string;
}

// ── Dashboard & Administration ────────────────────────────────────────────────
export interface DashboardSummary {
  totalClaims: number;
  statusCounts: Record<string, number>;
  reviewQueueCount: number;
  recentClaims?: Claim[];
  totalAssessedEtb?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
}

export interface CreateAdminUserPayload {
  email: string;
  username?: string;
  displayName?: string;
  password?: string;
  role: UserRole;
}

export interface UpdateAdminUserPayload {
  email?: string;
  displayName?: string;
  role?: UserRole;
  status?: "ACTIVE" | "INACTIVE";
  password?: string;
}

export interface CreatePolicyPayload {
  policyNumber: string;
  status?: "ACTIVE" | "EXPIRED" | "SUSPENDED" | string;
  validFrom?: string;
  validTo?: string;
  insurer?: string;
  holderName?: string;
}

export interface UpdatePolicyPayload {
  status?: "ACTIVE" | "EXPIRED" | "SUSPENDED" | string;
  validFrom?: string;
  validTo?: string;
  insurer?: string;
  holderName?: string;
}

// ── Query & Pagination ────────────────────────────────────────────────────────
export interface ClaimQueryParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  status?: ClaimStatus | string;
  q?: string;
  search?: string;
  from?: string;
  to?: string;
  assignedToMe?: boolean;
  sort?: string;
}

export interface PaginatedClaimsResponse {
  items: Claim[];
  total: number;
  page: number;
  pageSize?: number;
  limit?: number;
  totalPages?: number;
}
