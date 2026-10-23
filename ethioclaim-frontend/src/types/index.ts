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

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  role: "ADMIN" | "EXAMINER" | "INTAKE_USER";
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
  holderName?: string | null;
  policyholderName?: string | null;
  vehicleRegistration?: string | null;
  vehiclePlate?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  insurer?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  coverageAmount?: string | number | null;
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
  policy?: Policy | null;
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
  name?: string;
  fullName?: string;
  phone?: string;
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
  claimantFullName?: string;
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
    fullName: string;
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
  claimantName?: string;
  claimantFullName?: string;
  vehicle: Vehicle;
  policyNumber?: string;
  policy?: Policy;
  evidence?: Evidence[];
  evidenceCount?: number;
  latestAssessment?: ExaminerAssessment;
  assessmentSummary?: ExaminerAssessment;
  examiner?: CurrentUser;

  aiSuggestedSeverity?: "MINOR" | "MODERATE" | "SEVERE" | string;
  aiRiskAssessment?: {
    label: "NO_FRAUD_INDICATORS_FOUND" | "POTENTIAL_FRAUD" | "PENDING" | "FAILED" | string;
    reasons?: string[];
    confidence?: number;
    matchedEvidenceIds?: string[];
    matchedClaimIds?: string[];
  };

  estimatedAmount?: number;
  currency?: string;
  evidenceComplete?: boolean;
  aiProcessed?: boolean;
}

export interface RequestEvidencePayload {
  message?: string;
  requestedItems?: string[];
  item?: string;
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
  analysis?: DamageAnalysis | null;
  riskAssessment?: any;
  hasMatches?: boolean;
  matches?: any[];
  noDamageDetected?: boolean;
}

export interface DamageDetection {
  id?: string;
  part?: string;
  damageType?: string;
  severity?: string;
  confidence?: number;
  bbox?: [number, number, number, number];
  label?: string;
  box?: number[];
  areaPercentage?: number;
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
  errorCode?: string;
  createdAt?: string;
  processingTime?: number;
  inferenceMs?: number;
  riskAssessment?: {
    label: "NO_FRAUD_INDICATORS_FOUND" | "POTENTIAL_FRAUD" | "PENDING" | "FAILED" | string;
    reasons?: string[];
    confidence?: number;
    matchedEvidenceIds?: string[];
    matchedClaimIds?: string[];
  };
  warnings?: string[];
  ocrResult?: any;
}

export type SimilarityMatchType =
  | "EXACT_HASH"
  | "PERCEPTUAL_HASH"
  | "NEAR_DUPLICATE"
  | "EMBEDDING_SIMILARITY"
  | "VISUAL_SIMILARITY";

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
  name?: string;
  email: string;
  username?: string;
  displayName?: string;
  role: UserRole;
  status?: "ACTIVE" | "INACTIVE" | string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAdminUserPayload {
  email: string;
  name?: string;
  username?: string;
  displayName?: string;
  password?: string;
  role: UserRole;
}

export interface UpdateAdminUserPayload {
  name?: string;
  email?: string;
  displayName?: string;
  username?: string;
  role?: UserRole;
  status?: "ACTIVE" | "INACTIVE" | string;
  active?: boolean;
  password?: string;
}

export interface CreatePolicyPayload {
  policyNumber: string;
  holderName?: string;
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  insurer?: string;
  status?: "ACTIVE" | "EXPIRED" | "SUSPENDED" | string;
  validFrom?: string;
  validTo?: string;
  coverageAmount?: string;
}

export interface UpdatePolicyPayload {
  holderName?: string;
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  insurer?: string;
  status?: "ACTIVE" | "EXPIRED" | "SUSPENDED" | string;
  validFrom?: string;
  validTo?: string;
  coverageAmount?: string;
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
