// ─────────────────────────────────────────────
// EthioClaim — Mock API Layer
// All calls are simulated with realistic delays
// ─────────────────────────────────────────────
import {
  MOCK_CLAIMS, MOCK_EVIDENCE, MOCK_AI_ANALYSIS,
  MOCK_STATS, MOCK_CLAIMS_OVER_TIME, MOCK_RISK_DISTRIBUTION,
  MOCK_ORG_USERS, MOCK_USERS,
} from "./mock-data";
import type { Claim, ClaimStatus, RiskLevel } from "@/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Auth ──────────────────────────────────────
export async function mockLogin(email: string, password: string) {
  await delay(800);
  const user = MOCK_USERS[email];
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password");
  }
  const { password: _pw, ...rest } = user;
  return { user: rest, token: "mock-jwt-token-" + rest.id };
}

// ── Dashboard ─────────────────────────────────
export async function fetchDashboardStats() {
  await delay(400);
  return MOCK_STATS;
}

export async function fetchClaimsOverTime() {
  await delay(500);
  return MOCK_CLAIMS_OVER_TIME;
}

export async function fetchRiskDistribution() {
  await delay(400);
  return MOCK_RISK_DISTRIBUTION;
}

// ── Claims ────────────────────────────────────
export async function fetchClaims(filters?: { status?: ClaimStatus; risk?: RiskLevel; search?: string }) {
  await delay(500);
  let claims = [...MOCK_CLAIMS];
  if (filters?.status) claims = claims.filter((c) => c.status === filters.status);
  if (filters?.risk)   claims = claims.filter((c) => c.riskLevel === filters.risk);
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    claims = claims.filter((c) =>
      c.claimNumber.toLowerCase().includes(s) ||
      c.claimant.name.toLowerCase().includes(s) ||
      c.vehicle.plate.toLowerCase().includes(s)
    );
  }
  return claims;
}

export async function fetchClaim(id: string) {
  await delay(400);
  const claim = MOCK_CLAIMS.find((c) => c.id === id);
  if (!claim) throw new Error("Claim not found");
  return claim;
}

export async function createClaim(data: Partial<Claim>) {
  await delay(1000);
  const newClaim: Claim = {
    id: "c-new-" + Date.now(),
    claimNumber: "EC-2026-" + String(Math.floor(Math.random() * 999) + 200).padStart(6, "0"),
    status: "DRAFT",
    riskLevel: "LOW",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    incidentDate: data.incidentDate ?? new Date().toISOString().split("T")[0],
    claimant: data.claimant ?? { id: "p-new", name: "New Claimant", phone: "", email: "", idNumber: "" },
    vehicle:  data.vehicle  ?? { id: "v-new", make: "Unknown", model: "Unknown", year: 2024, plate: "", color: "" },
    policy:   data.policy   ?? { id: "pol-new", policyNumber: "", insurer: "", type: "", startDate: "", endDate: "", status: "ACTIVE" },
    accidentDescription: data.accidentDescription ?? "",
    estimatedAmount: data.estimatedAmount ?? 0,
    currency: "ETB",
    evidenceComplete: false,
    aiProcessed: false,
    ...data,
  };
  return newClaim;
}

export async function triggerAIProcessing(claimId: string) {
  await delay(1200);
  return { claimId, jobId: "job-" + Date.now(), status: "QUEUED" };
}

// ── Evidence ──────────────────────────────────
export async function fetchEvidence(claimId: string) {
  await delay(400);
  return MOCK_EVIDENCE.filter((e) => e.claimId === claimId);
}

export async function uploadEvidence(claimId: string, _file: File) {
  await delay(1500);
  return { id: "e-" + Date.now(), claimId, status: "UPLOADED" };
}

// ── AI Analysis ───────────────────────────────
export async function fetchAIAnalysis(claimId: string) {
  await delay(600);
  if (claimId === "c-001") return MOCK_AI_ANALYSIS;
  return null;
}

// ── Admin ─────────────────────────────────────
export async function fetchOrgUsers() {
  await delay(400);
  return MOCK_ORG_USERS;
}
