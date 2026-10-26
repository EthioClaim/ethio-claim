// ═══════════════════════════════════════════════════════════════════════════════
// EthioClaim — Complete NestJS API Client Layer (/api/v1)
// Conforming to doc.md and Section 2 API specifications
// ═══════════════════════════════════════════════════════════════════════════════

import axios, { AxiosInstance } from "axios";
import type {
  AdminUser,
  AuthResponse,
  Claim,
  ClaimQueryParams,
  ClaimStatus,
  ClaimTimelineEvent,
  CreateAdminUserPayload,
  CreateClaimPayload,
  CreatePolicyPayload,
  CurrentUser,
  DamageAnalysis,
  DashboardSummary,
  Evidence,
  ExaminerAssessment,
  ExaminerAssessmentPayload,
  ExaminerDecisionPayload,
  ExaminerDecisionResult,
  HealthResponse,
  LoginPayload,
  RegisterPayload,
  PaginatedClaimsResponse,
  Policy,
  PolicyVerificationResult,
  RequestEvidencePayload,
  SimilarityMatch,
  UpdateAdminUserPayload,
  UpdateClaimPayload,
  UpdatePolicyPayload,
} from "@/types";

// Base API URL configuration
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3006/api/v1";

// Create central Axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor: Attach Bearer token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("ethioclaim_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

import {
  handleMockFallback,
  setMockFallbackActive,
  isMockFallbackActive,
  subscribeToMockFallbackState,
  bypassLoginAs,
  registerMockAccount,
} from "./mock-fallback";

export {
  isMockFallbackActive,
  setMockFallbackActive,
  subscribeToMockFallbackState,
  bypassLoginAs,
  registerMockAccount,
};

// Response Interceptor: Seamlessly fallback to local mock data on network error, 5xx, or timeout
apiClient.interceptors.response.use(
  (response) => {
    // Live call succeeded; ensure mock mode is deactivated
    setMockFallbackActive(false);
    return response;
  },
  async (error) => {
    const config = error.config;
    const url = config?.url || "";
    const method = (config?.method || "GET").toUpperCase();

    // Critical: Auth endpoints (/auth/login, /auth/register, /auth/me) must NEVER silently mock fallback!
    // Real auth failures (401 invalid password, 400 validation, 403) must be thrown directly.
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/me");

    // Detect genuine network connection outage, server unreachable, or 5xx server fault
    const isOfflineOrFault =
      !error.response ||
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNABORTED" ||
      (error.message && error.message.toLowerCase().includes("network error")) ||
      (error.response && error.response.status >= 500);

    // Only allow mock fallback for non-auth requests when backend is truly offline/5xx
    // For mutation methods (POST, PUT, PATCH, DELETE), only allow fallback if mock mode was already explicitly activated
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    const allowMock =
      !isAuthEndpoint &&
      isOfflineOrFault &&
      config &&
      (!isMutation || isMockFallbackActive());

    if (allowMock) {
      try {
        const fallbackData = await handleMockFallback({
          method,
          url,
          data: config.data,
          params: config.params,
        });

        // Return graceful synthetic Axios response matching schema
        return {
          data: fallbackData,
          status: 200,
          statusText: "OK (Mock Fallback)",
          headers: {},
          config,
        };
      } catch (fallbackErr) {
        console.warn("Mock fallback dispatch error:", fallbackErr);
      }
    }

    // Session expired or unauthorized
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Don't auto-clear on login attempt failures
      if (!url.includes("/auth/login") && !url.includes("/health")) {
        clearStoredSession();
      }
    }

    let rawMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected network error occurred";

    let message = Array.isArray(rawMsg) ? rawMsg.join(", ") : String(rawMsg);

    // Sanitize any raw database, Prisma, or server internal trace from leaking to client UI
    const isInternalTrace =
      message.includes("prisma") ||
      message.includes("DATABASE_URL") ||
      message.includes("findUnique") ||
      message.includes("schema.prisma") ||
      message.includes("invocation in") ||
      message.includes("PrismaClient") ||
      (error.response?.status >= 500 && (message.includes("Error:") || message.length > 120));

    if (isInternalTrace) {
      message = "Database service unavailable. Please check the database connection or use Demo Sandbox.";
    }

    return Promise.reject(new Error(message));
  }
);

// Session storage helpers
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ethioclaim_token");
}

export function setStoredSession(token: string, user: CurrentUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("ethioclaim_token", token);
  localStorage.setItem("ethioclaim_user", JSON.stringify(user));
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ethioclaim_token");
  localStorage.removeItem("ethioclaim_user");
}

export function getStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ethioclaim_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.1 Health & Authentication
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public readiness/liveness check: GET /api/v1/health
 * Expects 200 {"status":"ok","database":"ok"}
 */
export async function checkHealth(): Promise<HealthResponse> {
  try {
    const { data } = await apiClient.get<HealthResponse>("/health");
    return data;
  } catch {
    const rootUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    const { data } = await axios.get<HealthResponse>(`${rootUrl}/health`, { timeout: 5000 });
    return data;
  }
}

/**
 * User login: POST /api/v1/auth/login
 * Body: { email, password } or { username, password }
 * Returns 200 { accessToken, user }
 */
export async function login(payloadOrEmail: LoginPayload | string, maybePassword?: string): Promise<AuthResponse> {
  const payload: LoginPayload =
    typeof payloadOrEmail === "string"
      ? { email: payloadOrEmail, username: payloadOrEmail, password: maybePassword || "" }
      : payloadOrEmail;

  // Ensure both email and username are populated for flexible backend compatibility
  const body = {
    email: payload.email || payload.username,
    username: payload.username || payload.email,
    password: payload.password,
  };

  const { data } = await apiClient.post<AuthResponse>("/auth/login", body);
  const token = data.accessToken || data.token;
  if (token && data.user) {
    setStoredSession(token, data.user);
  }
  return data;
}

/**
 * User registration: POST /api/v1/auth/register
 * Body: { email, username, password, role }
 * Returns 200 { accessToken, user }
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", {
    email: payload.email,
    username: payload.username,
    password: payload.password,
    role: payload.role,
  });
  const token = data.accessToken || data.token;
  if (token && data.user) {
    setStoredSession(token, data.user);
  }
  return data;
}

/**
 * Invalidate session: POST /api/v1/auth/logout
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // Proceed with client side cleanup even if backend is offline
  } finally {
    clearStoredSession();
  }
}

/**
 * Current user profile: GET /api/v1/auth/me
 */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>("/auth/me");
  if (typeof window !== "undefined") {
    localStorage.setItem("ethioclaim_user", JSON.stringify(data));
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.2 Policies
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify policy number: POST /api/v1/policies/verify
 * Body: { policyNumber }
 */
export async function verifyPolicy(policyNumber: string): Promise<PolicyVerificationResult> {
  const normalized = policyNumber.trim().toUpperCase();
  const { data } = await apiClient.post<PolicyVerificationResult>("/policies/verify", {
    policyNumber: normalized,
  });
  return data;
}

/**
 * Get policy summary: GET /api/v1/policies/:policyId
 */
export async function fetchPolicy(policyId: string): Promise<Policy> {
  const { data } = await apiClient.get<Policy>(`/policies/${policyId}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.3 Claims Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create claim: POST /api/v1/claims
 * Body: { claimant, vehicle, policyNumber, incident }
 * Returns 201 Created
 */
export async function createClaim(payload: CreateClaimPayload): Promise<Claim> {
  const body = {
    ...payload,
    vehicle: payload.vehicle
      ? {
          ...payload.vehicle,
          plateNumber: (payload.vehicle as any).plateNumber || payload.vehicle.plate,
        }
      : undefined,
  };
  const { data } = await apiClient.post<Claim>("/claims", body);
  return data;
}

/**
 * List claims with pagination, status, query, date range: GET /api/v1/claims
 * Params: page, pageSize, status, q, from, to, assignedToMe
 */
export async function fetchClaims(params?: ClaimQueryParams): Promise<PaginatedClaimsResponse> {
  const query: Record<string, string | number | boolean> = {};

  if (params?.page) query.page = params.page;
  if (params?.pageSize) {
    query.pageSize = params.pageSize;
    query.limit = params.pageSize;
  } else if (params?.limit) {
    query.limit = params.limit;
    query.pageSize = params.limit;
  }

  if (params?.status) query.status = params.status;
  if (params?.q) {
    query.q = params.q;
    query.search = params.q;
  } else if (params?.search) {
    query.q = params.search;
    query.search = params.search;
  }

  if (params?.from) query.from = params.from;
  if (params?.to) query.to = params.to;
  if (params?.assignedToMe !== undefined) query.assignedToMe = params.assignedToMe;
  if (params?.sort) query.sort = params.sort;

  const { data } = await apiClient.get<PaginatedClaimsResponse | Claim[]>("/claims", {
    params: query,
  });

  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: params?.page || 1,
      pageSize: params?.pageSize || params?.limit || data.length,
      totalPages: 1,
    };
  }

  return {
    items: data.items || [],
    total: data.total || 0,
    page: data.page || 1,
    pageSize: data.pageSize || data.limit || 10,
    totalPages: data.totalPages || Math.ceil((data.total || 0) / (data.pageSize || data.limit || 10)),
  };
}

/**
 * Get full claim detail: GET /api/v1/claims/:claimId
 */
export async function fetchClaim(claimId: string): Promise<Claim> {
  const { data } = await apiClient.get<Claim>(`/claims/${claimId}`);
  return data;
}

/**
 * Update permitted pre-review fields: PATCH /api/v1/claims/:claimId
 */
export async function updateClaim(claimId: string, payload: UpdateClaimPayload): Promise<Claim> {
  const { data } = await apiClient.patch<Claim>(`/claims/${claimId}`, payload);
  return data;
}

/**
 * Update workflow status: PATCH /api/v1/claims/:claimId/status
 * (Examiner / Admin)
 */
export async function updateClaimStatus(claimId: string, status: ClaimStatus): Promise<Claim> {
  const { data } = await apiClient.patch<Claim>(`/claims/${claimId}/status`, { status });
  return data;
}

/**
 * Fetch chronological audit/timeline events: GET /api/v1/claims/:claimId/timeline
 */
export async function fetchClaimTimeline(claimId: string): Promise<ClaimTimelineEvent[]> {
  try {
    const { data } = await apiClient.get<any>(`/claims/${claimId}/timeline`);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}

/**
 * Request more evidence: POST /api/v1/claims/:claimId/request-evidence
 */
export async function requestClaimEvidence(
  claimId: string,
  payload: RequestEvidencePayload
): Promise<{ success: boolean; message?: string }> {
  const { data } = await apiClient.post(`/claims/${claimId}/request-evidence`, payload);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.4 Evidence & Uploads
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload evidence photo: POST /api/v1/claims/:claimId/evidence
 * multipart/form-data with field 'file'
 * Returns 202 Accepted { id, analysisStatus: "PENDING" }
 */
export async function uploadClaimEvidence(
  claimId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ id: string; status?: string; analysisStatus?: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post(`/claims/${claimId}/evidence`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });

  return data;
}

/**
 * List evidence metadata for claim: GET /api/v1/claims/:claimId/evidence
 */
export async function fetchClaimEvidence(claimId: string): Promise<Evidence[]> {
  const { data } = await apiClient.get<any>(`/claims/${claimId}/evidence`);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Read evidence metadata: GET /api/v1/evidence/:evidenceId
 */
export async function fetchEvidence(evidenceId: string): Promise<Evidence> {
  const { data } = await apiClient.get<Evidence>(`/evidence/${evidenceId}`);
  return data;
}

/**
 * List all evidence accessible to user: GET /api/v1/evidence
 * (Examiner assigned claims, Admin all claims, Claimant own claims)
 */
export async function fetchEvidenceList(params?: {
  claimId?: string;
  limit?: number;
  offset?: number;
}): Promise<Evidence[]> {
  const { data } = await apiClient.get<any>("/evidence", { params });
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Secure file stream/download URL: GET /api/v1/evidence/:evidenceId/file
 * Automatically appends Bearer token as query parameter for browser <img> loading
 */
export function getEvidenceFileUrl(evidenceId: string): string {
  let url = `${API_BASE_URL}/evidence/${evidenceId}/file`;
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ethioclaim_token");
    if (token) {
      url += `?token=${encodeURIComponent(token)}`;
    }
  }
  return url;
}

/**
 * Resolves a fully qualified, authenticated image URL for an evidence item.
 * Supports relative API paths, direct URLs, and attaches authorization token.
 */
export function getAuthenticatedEvidenceUrl(
  evidence: { id: string; url?: string; thumbnailUrl?: string } | null | undefined
): string {
  if (!evidence) return "";
  let base = evidence.url || evidence.thumbnailUrl || `${API_BASE_URL}/evidence/${evidence.id}/file`;
  if (base.startsWith("/")) {
    base = `${API_BASE_URL.replace(/\/api\/v1$/, "")}${base}`;
  }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ethioclaim_token");
    if (token && !base.includes("token=")) {
      const sep = base.includes("?") ? "&" : "?";
      base = `${base}${sep}token=${encodeURIComponent(token)}`;
    }
  }
  return base;
}

/**
 * Delete evidence: DELETE /api/v1/evidence/:evidenceId
 */
export async function deleteEvidence(evidenceId: string): Promise<void> {
  await apiClient.delete(`/evidence/${evidenceId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.5 Analysis & Historical Matches
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current analysis status & damage detections: GET /api/v1/evidence/:evidenceId/analysis
 */
export async function fetchEvidenceAnalysis(evidenceId: string): Promise<DamageAnalysis> {
  const { data } = await apiClient.get<DamageAnalysis>(`/evidence/${evidenceId}/analysis`);
  return data;
}

/**
 * Retry failed or requested analysis: POST /api/v1/evidence/:evidenceId/reanalyze
 */
export async function reanalyzeEvidence(evidenceId: string): Promise<{ status: string }> {
  const { data } = await apiClient.post(`/evidence/${evidenceId}/reanalyze`);
  return data;
}

/**
 * Return candidate matches: GET /api/v1/evidence/:evidenceId/matches
 * (Examiner / Admin)
 */
export async function fetchEvidenceMatches(evidenceId: string): Promise<SimilarityMatch[]> {
  const { data } = await apiClient.get<any>(`/evidence/${evidenceId}/matches`);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.matches)) return data.matches;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Optional analysis polling: GET /api/v1/analysis/:analysisId
 */
export async function fetchAnalysisById(analysisId: string): Promise<DamageAnalysis> {
  const { data } = await apiClient.get<DamageAnalysis>(`/analysis/${analysisId}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.6 Examiner Assessment & Decisions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create examiner assessment: POST /api/v1/claims/:claimId/assessment
 * Body: { severity, estimatedLossEtb, currency: "ETB", notes }
 */
export async function createAssessment(
  claimId: string,
  payload: ExaminerAssessmentPayload
): Promise<ExaminerAssessment> {
  const lossValue =
    payload.estimatedLossEtb !== undefined
      ? payload.estimatedLossEtb
      : payload.estimatedLossAmount !== undefined
        ? payload.estimatedLossAmount
        : "0.00";

  const numAmount = typeof lossValue === "number" ? lossValue : parseFloat(String(lossValue)) || 0;

  const { data } = await apiClient.post<ExaminerAssessment>(`/claims/${claimId}/assessment`, {
    severity: payload.severity,
    estimatedLossEtb: numAmount,
    estimatedLossAmount: numAmount.toFixed(2),
    currency: "ETB",
    notes: payload.notes,
  });

  return data;
}

/**
 * Read latest assessment: GET /api/v1/claims/:claimId/assessment
 */
export async function fetchAssessment(claimId: string): Promise<ExaminerAssessment | null> {
  try {
    const { data } = await apiClient.get<ExaminerAssessment>(`/claims/${claimId}/assessment`);
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    return null;
  }
}

/**
 * Update assessment details: PATCH /api/v1/claims/:claimId/assessment
 */
export async function updateAssessment(
  claimId: string,
  payload: Partial<ExaminerAssessmentPayload>
): Promise<ExaminerAssessment> {
  const { data } = await apiClient.patch<ExaminerAssessment>(`/claims/${claimId}/assessment`, payload);
  return data;
}

/**
 * Record final human examiner decision: POST /api/v1/claims/:claimId/decision
 * Body: { decision, notes, estimatedLossEtb }
 */
export async function recordClaimDecision(
  claimId: string,
  payload: ExaminerDecisionPayload
): Promise<ExaminerDecisionResult> {
  const { data } = await apiClient.post<ExaminerDecisionResult>(`/claims/${claimId}/decision`, payload);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.7 Dashboard & Administration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dashboard status counts and review queue: GET /api/v1/dashboard/summary
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary");
  return data;
}

/**
 * List staff users: GET /api/v1/admin/users
 */
export async function fetchAdminUsers(params?: {
  page?: number;
  pageSize?: number;
  role?: string;
  active?: boolean;
}): Promise<AdminUser[]> {
  try {
    const { data } = await apiClient.get<any>("/admin/users", { params });
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
  } catch {
    try {
      const { data } = await apiClient.get<any>("/users", { params });
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.items)) return data.items;
    } catch {
      // ignore
    }
  }
  return [];
}

/**
 * Create user: POST /api/v1/admin/users
 */
export async function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUser> {
  const { data } = await apiClient.post<AdminUser>("/admin/users", payload);
  return data;
}

/**
 * Update user: PATCH /api/v1/admin/users/:userId
 */
export async function updateAdminUser(userId: string, payload: UpdateAdminUserPayload): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(`/admin/users/${userId}`, payload);
  return data;
}

/**
 * List policies: GET /api/v1/admin/policies
 */
export async function fetchAdminPolicies(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
}): Promise<Policy[]> {
  const { data } = await apiClient.get<any>("/admin/policies", { params });
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Create policy: POST /api/v1/admin/policies
 */
export async function createAdminPolicy(payload: CreatePolicyPayload): Promise<Policy> {
  const { data } = await apiClient.post<Policy>("/admin/policies", payload);
  return data;
}

/**
 * Update policy: PATCH /api/v1/admin/policies/:policyId
 */
export async function updateAdminPolicy(policyId: string, payload: UpdatePolicyPayload): Promise<Policy> {
  const { data } = await apiClient.patch<Policy>(`/admin/policies/${policyId}`, payload);
  return data;
}

/**
 * Submit draft claim: POST /api/v1/claims/:claimId/submit
 */
export async function submitClaim(
  claimId: string,
  confirmationNotes?: string
): Promise<Claim> {
  const { data } = await apiClient.post<Claim>(`/claims/${claimId}/submit`, {
    confirmationNotes,
  });
  return data;
}

/**
 * Assign examiner to claim: PATCH /api/v1/claims/:claimId/assign
 */
export async function assignExaminer(
  claimId: string,
  examinerId: string,
  note?: string
): Promise<any> {
  const { data } = await apiClient.patch(`/claims/${claimId}/assign`, {
    examinerId,
    note,
  });
  return data;
}

/**
 * Close claim with required reason: POST /api/v1/claims/:claimId/close
 */
export async function closeClaim(
  claimId: string,
  reason: string,
  notes?: string
): Promise<any> {
  const { data } = await apiClient.post(`/claims/${claimId}/close`, {
    reason,
    notes,
  });
  return data;
}

/**
 * Request additional information/evidence: POST /api/v1/claims/:claimId/request-information
 */
export async function requestInformation(
  claimId: string,
  message: string,
  requestedItems?: string[]
): Promise<any> {
  const { data } = await apiClient.post(`/claims/${claimId}/request-information`, {
    message,
    requestedItems,
  });
  return data;
}

/**
 * Search/query audit logs: GET /api/v1/admin/audit-log
 */
export async function fetchAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  action?: string;
  actorId?: string;
  claimId?: string;
  from?: string;
  to?: string;
}): Promise<{
  items: Array<{
    id: string;
    action: string;
    summary?: string;
    details?: any;
    createdAt: string;
    actor?: { id: string; name: string; email: string; role: string };
    claim?: { id: string; claimNumber: string };
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { data } = await apiClient.get("/admin/audit-log", { params });
  return data;
}

/**
 * View analysis operations & pipeline queue: GET /api/v1/admin/operations/analysis
 */
export async function fetchAnalysisOperations(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: Array<{
    id: string;
    evidenceId: string;
    status: string;
    modelName?: string;
    modelVersion?: string;
    inferenceMs?: number;
    errorCode?: string;
    errorMessage?: string;
    retriedAt?: string;
    createdAt: string;
    evidence?: any;
  }>;
  statusCounts: Record<string, number>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { data } = await apiClient.get("/admin/operations/analysis", { params });
  return data;
}

/**
 * Reset user password: POST /api/v1/admin/users/:userId/reset-password
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/admin/users/${userId}/reset-password`, {
    newPassword,
  });
  return data;
}

/**
 * Fetch user details by ID: GET /api/v1/admin/users/:userId
 */
export async function fetchUserById(userId: string): Promise<AdminUser> {
  const { data } = await apiClient.get<AdminUser>(`/admin/users/${userId}`);
  return data;
}

/**
 * Fetch policy details by ID: GET /api/v1/admin/policies/:policyId
 */
export async function fetchPolicyById(policyId: string): Promise<Policy> {
  const { data } = await apiClient.get<Policy>(`/admin/policies/${policyId}`);
  return data;
}

