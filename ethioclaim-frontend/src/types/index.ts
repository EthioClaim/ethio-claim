// ─────────────────────────────────────────────
// EthioClaim — Core Type Definitions
// ─────────────────────────────────────────────

export type ClaimStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "EVIDENCE_CHECK"
  | "NEEDS_INFORMATION"
  | "AI_PROCESSING"
  | "TRIAGED"
  | "FAST_REVIEW"
  | "EXAMINER"
  | "INVESTIGATION"
  | "CLOSED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ImageQuality = "PASS" | "LOW_CONFIDENCE" | "FAIL";
export type DamageSeverity = "MINOR" | "MODERATE" | "SEVERE";
export type ConsistencyLevel = "LOW" | "MEDIUM" | "MEDIUM-HIGH" | "HIGH";

// ── User ──────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: "CLAIMANT" | "EXAMINER" | "INSPECTOR" | "INVESTIGATOR" | "MANAGER" | "ADMIN";
  organizationId: string;
  avatarUrl?: string;
}

// ── Claim ─────────────────────────────────────
export interface Claim {
  id: string;
  claimNumber: string;           // e.g. EC-2026-000123
  status: ClaimStatus;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
  incidentDate: string;
  submittedAt?: string;
  closedAt?: string;

  // Relations
  claimant: ClaimParty;
  vehicle: Vehicle;
  policy: Policy;
  examiner?: User;

  // Content
  accidentDescription: string;
  estimatedAmount: number;
  currency: string;

  // Progress
  evidenceComplete: boolean;
  aiProcessed: boolean;
  aiProcessingAt?: string;
}

export interface ClaimParty {
  id: string;
  name: string;
  phone: string;
  email: string;
  idNumber: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  vin?: string;
}

export interface Policy {
  id: string;
  policyNumber: string;
  insurer: string;
  type: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
}

// ── Evidence ──────────────────────────────────
export interface Evidence {
  id: string;
  claimId: string;
  filename: string;
  type: "IMAGE" | "DOCUMENT";
  viewType?: "FRONT" | "REAR" | "LEFT" | "RIGHT" | "DAMAGE" | "INTERIOR" | "OTHER";
  url: string;
  thumbnailUrl?: string;
  sizeMb: number;
  uploadedAt: string;
  quality?: ImageQuality;
  qualityNote?: string;
}

// ── AI Analysis ───────────────────────────────
export interface AIAnalysis {
  id: string;
  claimId: string;
  modelVersion: string;
  status: "PENDING" | "RUNNING" | "COMPLETE" | "FAILED";
  processingTime?: number;       // seconds
  createdAt: string;
  completedAt?: string;

  imageQualityResults: ImageQualityResult[];
  damageFindings: DamageFinding[];
  documentExtractions: DocumentExtraction[];
  similarityResults: SimilarityResult[];
  consistencyResult: ConsistencyResult;
  riskAssessment: RiskAssessment;
}

export interface ImageQualityResult {
  evidenceId: string;
  filename: string;
  quality: ImageQuality;
  note?: string;
}

export interface DamageFinding {
  id: string;
  analysisId: string;
  evidenceId: string;
  part: string;                  // e.g. "front bumper"
  damageType: string;            // e.g. "dent", "scratch"
  severity: DamageSeverity;
  confidence: number;            // 0.0 – 1.0
  bbox?: [number, number, number, number];
}

export interface DocumentExtraction {
  id: string;
  analysisId: string;
  evidenceId: string;
  field: string;
  value: string;
  confidence: number;
}

export interface SimilarityResult {
  id: string;
  analysisId: string;
  matchedClaimId: string;
  matchedClaimNumber: string;
  similarityScore: number;
  signal: "REVIEW" | "INVESTIGATE" | "OK";
}

export interface ConsistencyResult {
  level: ConsistencyLevel;
  findings: ConsistencyFinding[];
}

export interface ConsistencyFinding {
  source1: string;
  source2: string;
  observation: string;
  severity: "INFO" | "WARN" | "CONFLICT";
}

export interface RiskAssessment {
  riskScore: number;             // 0-100
  riskLevel: RiskLevel;
  reasonCodes: string[];
  modelVersion: string;
  createdAt: string;
}

// ── Dashboard KPIs ────────────────────────────
export interface DashboardStats {
  totalClaims: number;
  openClaims: number;
  highRiskClaims: number;
  avgProcessingDays: number;
  claimsThisMonth: number;
  aiProcessedToday: number;
  pendingEvidence: number;
  closedThisMonth: number;
}

export interface ClaimsOverTime {
  month: string;
  submitted: number;
  resolved: number;
}

export interface RiskDistribution {
  riskLevel: RiskLevel;
  count: number;
}

// ── Admin ─────────────────────────────────────
export interface OrgUser extends User {
  status: "ACTIVE" | "INACTIVE";
  lastLogin?: string;
  claimsAssigned: number;
}
