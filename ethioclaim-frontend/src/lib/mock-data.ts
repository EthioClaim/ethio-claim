// ─────────────────────────────────────────────
// EthioClaim — Mock Data
// ─────────────────────────────────────────────
import type {
  Claim, Evidence, AIAnalysis, DashboardStats,
  ClaimsOverTime, RiskDistribution, OrgUser, User
} from "@/types";

// ── Auth ──────────────────────────────────────
export const MOCK_USERS: Record<string, User & { password: string }> = {
  "examiner@ethioclaim.io": {
    id: "u-001", name: "Dawit Bekele", email: "examiner@ethioclaim.io",
    password: "demo1234", role: "EXAMINER", organizationId: "org-1",
  },
  "manager@ethioclaim.io": {
    id: "u-002", name: "Sara Tesfaye", email: "manager@ethioclaim.io",
    password: "demo1234", role: "MANAGER", organizationId: "org-1",
  },
  "admin@ethioclaim.io": {
    id: "u-003", name: "Abel Girma", email: "admin@ethioclaim.io",
    password: "demo1234", role: "ADMIN", organizationId: "org-1",
  },
  "inspector@ethioclaim.io": {
    id: "u-004", name: "Meron Hailu", email: "inspector@ethioclaim.io",
    password: "demo1234", role: "INSPECTOR", organizationId: "org-1",
  },
};

// ── Dashboard ─────────────────────────────────
export const MOCK_STATS: DashboardStats = {
  totalClaims: 1847,
  openClaims: 234,
  highRiskClaims: 43,
  avgProcessingDays: 4.2,
  claimsThisMonth: 187,
  aiProcessedToday: 29,
  pendingEvidence: 18,
  closedThisMonth: 142,
};

export const MOCK_CLAIMS_OVER_TIME: ClaimsOverTime[] = [
  { month: "Apr", submitted: 132, resolved: 118 },
  { month: "May", submitted: 148, resolved: 137 },
  { month: "Jun", submitted: 161, resolved: 145 },
  { month: "Jul", submitted: 175, resolved: 158 },
  { month: "Aug", submitted: 169, resolved: 162 },
  { month: "Sep", submitted: 187, resolved: 142 },
];

export const MOCK_RISK_DISTRIBUTION: RiskDistribution[] = [
  { riskLevel: "LOW",      count: 98  },
  { riskLevel: "MEDIUM",   count: 76  },
  { riskLevel: "HIGH",     count: 43  },
  { riskLevel: "CRITICAL", count: 17  },
];

// ── Claims List ───────────────────────────────
export const MOCK_CLAIMS: Claim[] = [
  {
    id: "c-001", claimNumber: "EC-2026-000123",
    status: "AI_PROCESSING", riskLevel: "HIGH",
    createdAt: "2026-09-14T08:22:00Z", updatedAt: "2026-09-30T07:00:00Z",
    incidentDate: "2026-09-14", submittedAt: "2026-09-14T10:15:00Z",
    claimant: { id: "p-1", name: "Tesfaye Alemu", phone: "+251911234567", email: "tesfaye@email.com", idNumber: "ET-ID-112233" },
    vehicle: { id: "v-1", make: "Toyota", model: "Corolla", year: 2022, plate: "AA-12345-A", color: "White" },
    policy: { id: "pol-1", policyNumber: "POL-2025-88421", insurer: "Awash Insurance", type: "Comprehensive", startDate: "2025-01-01", endDate: "2026-12-31", status: "ACTIVE" },
    accidentDescription: "Rear-end collision at Bole road. Vehicle sustained front bumper and hood damage.",
    estimatedAmount: 85000, currency: "ETB",
    evidenceComplete: true, aiProcessed: false,
  },
  {
    id: "c-002", claimNumber: "EC-2026-000119",
    status: "INVESTIGATION", riskLevel: "CRITICAL",
    createdAt: "2026-09-10T11:00:00Z", updatedAt: "2026-09-29T16:00:00Z",
    incidentDate: "2026-09-09", submittedAt: "2026-09-10T11:00:00Z",
    claimant: { id: "p-2", name: "Hana Tadesse", phone: "+251922345678", email: "hana@email.com", idNumber: "ET-ID-998877" },
    vehicle: { id: "v-2", make: "Hyundai", model: "Tucson", year: 2021, plate: "AA-98765-B", color: "Black" },
    policy: { id: "pol-2", policyNumber: "POL-2024-55012", insurer: "EthioClaim Pilot", type: "Third Party+", startDate: "2024-06-01", endDate: "2026-05-31", status: "ACTIVE" },
    accidentDescription: "Side collision reported. Significant right-side damage claimed.",
    estimatedAmount: 220000, currency: "ETB",
    evidenceComplete: true, aiProcessed: true, aiProcessingAt: "2026-09-10T14:30:00Z",
  },
  {
    id: "c-003", claimNumber: "EC-2026-000115",
    status: "TRIAGED", riskLevel: "LOW",
    createdAt: "2026-09-08T09:00:00Z", updatedAt: "2026-09-28T13:00:00Z",
    incidentDate: "2026-09-07", submittedAt: "2026-09-08T09:00:00Z",
    claimant: { id: "p-3", name: "Biruk Haile", phone: "+251933456789", email: "biruk@email.com", idNumber: "ET-ID-445566" },
    vehicle: { id: "v-3", make: "Nissan", model: "X-Trail", year: 2023, plate: "AA-55432-C", color: "Silver" },
    policy: { id: "pol-3", policyNumber: "POL-2025-91234", insurer: "Awash Insurance", type: "Comprehensive", startDate: "2025-03-01", endDate: "2027-02-28", status: "ACTIVE" },
    accidentDescription: "Minor front bumper scratch during parking.",
    estimatedAmount: 15000, currency: "ETB",
    evidenceComplete: true, aiProcessed: true, aiProcessingAt: "2026-09-08T12:00:00Z",
  },
  {
    id: "c-004", claimNumber: "EC-2026-000108",
    status: "NEEDS_INFORMATION", riskLevel: "MEDIUM",
    createdAt: "2026-09-05T14:00:00Z", updatedAt: "2026-09-27T10:00:00Z",
    incidentDate: "2026-09-04",
    claimant: { id: "p-4", name: "Yordanos Tsega", phone: "+251944567890", email: "yordanos@email.com", idNumber: "ET-ID-776655" },
    vehicle: { id: "v-4", make: "Land Rover", model: "Defender", year: 2020, plate: "AA-33211-D", color: "Green" },
    policy: { id: "pol-4", policyNumber: "POL-2024-72100", insurer: "Nile Insurance", type: "Comprehensive", startDate: "2024-09-01", endDate: "2026-08-31", status: "ACTIVE" },
    accidentDescription: "Road accident involving multiple vehicles on Ring Road.",
    estimatedAmount: 350000, currency: "ETB",
    evidenceComplete: false, aiProcessed: false,
  },
  {
    id: "c-005", claimNumber: "EC-2026-000099",
    status: "CLOSED", riskLevel: "LOW",
    createdAt: "2026-08-28T09:00:00Z", updatedAt: "2026-09-20T15:00:00Z",
    incidentDate: "2026-08-27", submittedAt: "2026-08-28T09:00:00Z", closedAt: "2026-09-20T15:00:00Z",
    claimant: { id: "p-5", name: "Girma Wolde", phone: "+251955678901", email: "girma@email.com", idNumber: "ET-ID-223344" },
    vehicle: { id: "v-5", make: "Toyota", model: "Hilux", year: 2019, plate: "AA-77654-E", color: "Grey" },
    policy: { id: "pol-5", policyNumber: "POL-2023-48001", insurer: "Awash Insurance", type: "Comprehensive", startDate: "2023-08-01", endDate: "2026-07-31", status: "EXPIRED" },
    accidentDescription: "Minor tail-light damage in parking lot.",
    estimatedAmount: 8500, currency: "ETB",
    evidenceComplete: true, aiProcessed: true,
  },
];

// ── Evidence ──────────────────────────────────
export const MOCK_EVIDENCE: Evidence[] = [
  { id: "e-001", claimId: "c-001", filename: "front.jpg", type: "IMAGE", viewType: "FRONT",
    url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=200",
    sizeMb: 2.4, uploadedAt: "2026-09-14T10:20:00Z", quality: "PASS" },
  { id: "e-002", claimId: "c-001", filename: "rear.jpg", type: "IMAGE", viewType: "REAR",
    url: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=200",
    sizeMb: 2.1, uploadedAt: "2026-09-14T10:21:00Z", quality: "PASS" },
  { id: "e-003", claimId: "c-001", filename: "right.jpg", type: "IMAGE", viewType: "RIGHT",
    url: "https://images.unsplash.com/photo-1558981852-426c349e3e46?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1558981852-426c349e3e46?w=200",
    sizeMb: 1.9, uploadedAt: "2026-09-14T10:22:00Z", quality: "LOW_CONFIDENCE", qualityNote: "blur detected" },
  { id: "e-004", claimId: "c-001", filename: "damage_01.jpg", type: "IMAGE", viewType: "DAMAGE",
    url: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=200",
    sizeMb: 3.1, uploadedAt: "2026-09-14T10:23:00Z", quality: "PASS" },
];

// ── AI Analysis ───────────────────────────────
export const MOCK_AI_ANALYSIS: AIAnalysis = {
  id: "ai-001", claimId: "c-001", modelVersion: "ethioclaim-v0.3.1",
  status: "COMPLETE", processingTime: 38, createdAt: "2026-09-14T12:00:00Z", completedAt: "2026-09-14T12:00:38Z",
  imageQualityResults: [
    { evidenceId: "e-001", filename: "front.jpg", quality: "PASS" },
    { evidenceId: "e-002", filename: "rear.jpg", quality: "PASS" },
    { evidenceId: "e-003", filename: "right.jpg", quality: "LOW_CONFIDENCE", note: "blur detected" },
    { evidenceId: "e-004", filename: "damage_01.jpg", quality: "PASS" },
  ],
  damageFindings: [
    { id: "df-1", analysisId: "ai-001", evidenceId: "e-001", part: "Front Bumper", damageType: "Dent", severity: "MODERATE", confidence: 0.88 },
    { id: "df-2", analysisId: "ai-001", evidenceId: "e-001", part: "Hood", damageType: "Scratch", severity: "MINOR", confidence: 0.81 },
    { id: "df-3", analysisId: "ai-001", evidenceId: "e-001", part: "Left Headlight", damageType: "Crack", severity: "SEVERE", confidence: 0.91 },
  ],
  documentExtractions: [
    { id: "de-1", analysisId: "ai-001", evidenceId: "e-doc-1", field: "Claim Number", value: "EC-2026-000123", confidence: 0.99 },
    { id: "de-2", analysisId: "ai-001", evidenceId: "e-doc-1", field: "Incident Date", value: "2026-09-14", confidence: 0.96 },
    { id: "de-3", analysisId: "ai-001", evidenceId: "e-doc-1", field: "Vehicle Plate", value: "AA-12345-A", confidence: 0.94 },
    { id: "de-4", analysisId: "ai-001", evidenceId: "e-doc-1", field: "Repair Estimate", value: "85,000 ETB", confidence: 0.87 },
  ],
  similarityResults: [
    { id: "sim-1", analysisId: "ai-001", matchedClaimId: "c-old-891", matchedClaimNumber: "EC-2025-001891", similarityScore: 0.91, signal: "REVIEW" },
  ],
  consistencyResult: {
    level: "MEDIUM-HIGH",
    findings: [
      { source1: "Photographs", source2: "Claim Narrative", observation: "Photographed damage shows front bumper impact; narrative describes rear-end collision", severity: "WARN" },
      { source1: "Repair Estimate", source2: "Photographs", observation: "Front bumper replacement consistent with photographed damage", severity: "INFO" },
    ],
  },
  riskAssessment: {
    riskScore: 72, riskLevel: "HIGH",
    reasonCodes: [
      "Historical image similarity score 0.91",
      "Incomplete right-side evidence",
      "High estimated claim amount relative to historical distribution",
      "Narrative/photographic evidence mild inconsistency",
    ],
    modelVersion: "risk-lgbm-v1.2", createdAt: "2026-09-14T12:00:38Z",
  },
};

// ── Admin Users ───────────────────────────────
export const MOCK_ORG_USERS: OrgUser[] = [
  { id: "u-001", name: "Dawit Bekele", email: "examiner@ethioclaim.io", role: "EXAMINER", organizationId: "org-1", status: "ACTIVE", lastLogin: "2026-09-30T08:00:00Z", claimsAssigned: 28 },
  { id: "u-002", name: "Sara Tesfaye",  email: "manager@ethioclaim.io",  role: "MANAGER",  organizationId: "org-1", status: "ACTIVE", lastLogin: "2026-09-30T09:15:00Z", claimsAssigned: 0  },
  { id: "u-003", name: "Abel Girma",    email: "admin@ethioclaim.io",    role: "ADMIN",    organizationId: "org-1", status: "ACTIVE", lastLogin: "2026-09-29T18:00:00Z", claimsAssigned: 0  },
  { id: "u-004", name: "Meron Hailu",   email: "inspector@ethioclaim.io",role: "INSPECTOR",organizationId: "org-1", status: "ACTIVE", lastLogin: "2026-09-28T10:00:00Z", claimsAssigned: 12 },
  { id: "u-005", name: "Kebede Lema",   email: "examiner2@ethioclaim.io",role: "EXAMINER", organizationId: "org-1", status: "ACTIVE", lastLogin: "2026-09-30T07:30:00Z", claimsAssigned: 19 },
  { id: "u-006", name: "Tigist Mesfin", email: "invest@ethioclaim.io",   role: "INVESTIGATOR", organizationId: "org-1", status: "INACTIVE", lastLogin: "2026-09-10T11:00:00Z", claimsAssigned: 5 },
];
