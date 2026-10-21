// ═══════════════════════════════════════════════════════════════════════════════
// EthioClaim — High-Fidelity Mock Fallback & Offline-First Layer
// Conforming to NestJS /api/v1 contracts defined in doc.md
// Seamlessly activates ONLY on network error, 5xx, or offline server states.
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  AdminUser,
  Claim,
  ClaimStatus,
  ClaimTimelineEvent,
  CurrentUser,
  DamageAnalysis,
  DashboardSummary,
  Evidence,
  ExaminerAssessment,
  Policy,
  SimilarityMatch,
} from "@/types";

// Offline indicator observable
type OfflineListener = (isActive: boolean) => void;
const listeners: Set<OfflineListener> = new Set();
let _isMockActive = false;

export function isMockFallbackActive(): boolean {
  return _isMockActive;
}

export function subscribeToMockFallbackState(fn: OfflineListener): () => void {
  listeners.add(fn);
  fn(_isMockActive);
  return () => {
    listeners.delete(fn);
  };
}

export function setMockFallbackActive(active: boolean) {
  if (_isMockActive !== active) {
    _isMockActive = active;
    listeners.forEach((fn) => fn(_isMockActive));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial Seed Data (Stored in localStorage for mutations during testing)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_USERS: Record<string, CurrentUser> = {
  examiner: {
    id: "usr-examiner-01",
    email: "examiner@ethioclaim.et",
    displayName: "Solomon Tadesse (Examiner)",
    username: "examiner",
    role: "EXAMINER",
    organizationId: "org-eic-01",
  },
  admin: {
    id: "usr-admin-01",
    email: "admin@ethioclaim.et",
    displayName: "Hanna Girma (Administrator)",
    username: "admin",
    role: "ADMIN",
    organizationId: "org-eic-01",
  },
  claimant: {
    id: "usr-intake-01",
    email: "intake@ethioclaim.et",
    displayName: "Abebe Kebede (Intake Officer)",
    username: "claimant",
    role: "INTAKE_USER",
    organizationId: "org-eic-01",
  },
  manager: {
    id: "usr-manager-01",
    email: "manager@ethioclaim.et",
    displayName: "Dawit Haile (Claims Manager)",
    username: "manager",
    role: "MANAGER",
    organizationId: "org-eic-01",
  },
};

const SEED_POLICIES: Policy[] = [
  {
    id: "pol-001",
    policyNumber: "ETH-POL-2026-001",
    normalizedPolicyNumber: "ETHPOL2026001",
    status: "ACTIVE",
    validFrom: "2026-01-01T00:00:00Z",
    validTo: "2026-12-31T23:59:59Z",
    insurer: "Ethiopian Insurance Corporation",
    holderName: "Solomon Tadesse",
    vehicleRegistration: "AA-2-B12345",
  },
  {
    id: "pol-002",
    policyNumber: "ETH-POL-2026-002",
    normalizedPolicyNumber: "ETHPOL2026002",
    status: "ACTIVE",
    validFrom: "2026-02-15T00:00:00Z",
    validTo: "2027-02-14T23:59:59Z",
    insurer: "Awash Insurance SC",
    holderName: "Tsedale Mengistu",
    vehicleRegistration: "ET-3-C98765",
  },
  {
    id: "pol-003",
    policyNumber: "ETH-POL-2026-003",
    normalizedPolicyNumber: "ETHPOL2026003",
    status: "EXPIRED",
    validFrom: "2025-01-01T00:00:00Z",
    validTo: "2025-12-31T23:59:59Z",
    insurer: "Nyala Insurance SC",
    holderName: "Bereket Alemu",
    vehicleRegistration: "AA-2-D45678",
  },
  {
    id: "pol-004",
    policyNumber: "ETH-POL-2026-004",
    normalizedPolicyNumber: "ETHPOL2026004",
    status: "SUSPENDED",
    validFrom: "2026-03-01T00:00:00Z",
    validTo: "2027-03-01T23:59:59Z",
    insurer: "United Insurance SC",
    holderName: "Almaz Kebede",
    vehicleRegistration: "ET-2-E55555",
  },
];

const SEED_CLAIMS: Claim[] = [
  {
    id: "clm-101",
    claimNumber: "CLM-2026-00101",
    status: "READY_FOR_REVIEW",
    incidentDate: "2026-10-12T14:30:00Z",
    submittedAt: "2026-10-12T16:00:00Z",
    createdAt: "2026-10-12T16:00:00Z",
    description: "Intersection collision at Bole Medhanialem roundabout. Side body panel impact with bumper damage.",
    accidentDescription: "Collision with another vehicle turning left without right-of-way.",
    estimatedAmount: 85000,
    currency: "ETB",
    policyNumber: "ETH-POL-2026-001",
    evidenceCount: 3,
    claimant: {
      name: "Solomon Tadesse",
      phone: "+251 91 123 4567",
      email: "solomon.t@example.com",
      idNumber: "ET-NAT-88392",
    },
    vehicle: {
      make: "Toyota",
      model: "Corolla",
      year: 2021,
      plate: "AA-2-B12345",
      color: "Silver",
      vin: "JT2BF28K210088921",
    },
    policy: SEED_POLICIES[0],
    evidence: [
      {
        id: "ev-101",
        claimId: "clm-101",
        originalFilename: "front_bumper_damage.jpg",
        filename: "front_bumper_damage.jpg",
        contentType: "image/jpeg",
        sizeBytes: 2450000,
        uploadedAt: "2026-10-12T16:05:00Z",
        analysisStatus: "COMPLETED",
        url: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80",
        viewType: "FRONT",
      },
      {
        id: "ev-102",
        claimId: "clm-101",
        originalFilename: "side_door_dent.jpg",
        filename: "side_door_dent.jpg",
        contentType: "image/jpeg",
        sizeBytes: 3100000,
        uploadedAt: "2026-10-12T16:06:00Z",
        analysisStatus: "COMPLETED",
        url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
        viewType: "SIDE",
      },
      {
        id: "ev-103",
        claimId: "clm-101",
        originalFilename: "plate_verification.jpg",
        filename: "plate_verification.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1800000,
        uploadedAt: "2026-10-12T16:08:00Z",
        analysisStatus: "PROCESSING",
        url: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
        viewType: "REAR",
      },
    ],
    latestAssessment: {
      id: "ass-101",
      claimId: "clm-101",
      severity: "MODERATE",
      estimatedLossEtb: 78500,
      estimatedLossAmount: "78500.00",
      currency: "ETB",
      notes: "Front bumper detachment and moderate left fender crease. Structural frame intact.",
      assessedBy: "Solomon Tadesse (Examiner)",
      examinerName: "Solomon Tadesse",
      assessedAt: "2026-10-13T10:15:00Z",
    },
  },
  {
    id: "clm-102",
    claimNumber: "CLM-2026-00102",
    status: "UNDER_REVIEW",
    incidentDate: "2026-10-14T08:15:00Z",
    submittedAt: "2026-10-14T09:30:00Z",
    createdAt: "2026-10-14T09:30:00Z",
    description: "Rear-ended along Gotera Interchange during morning rush hour. Crushed rear bumper and broken taillight.",
    estimatedAmount: 42000,
    currency: "ETB",
    policyNumber: "ETH-POL-2026-002",
    evidenceCount: 2,
    claimant: {
      name: "Tsedale Mengistu",
      phone: "+251 92 987 6543",
      email: "tsedale.m@example.com",
    },
    vehicle: {
      make: "Hyundai",
      model: "Tucson",
      year: 2023,
      plate: "ET-3-C98765",
      color: "White",
    },
    policy: SEED_POLICIES[1],
    evidence: [
      {
        id: "ev-201",
        claimId: "clm-102",
        originalFilename: "rear_bumper_crush.jpg",
        filename: "rear_bumper_crush.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1950000,
        uploadedAt: "2026-10-14T09:35:00Z",
        analysisStatus: "COMPLETED",
        url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    id: "clm-103",
    claimNumber: "CLM-2026-00103",
    status: "SUBMITTED",
    incidentDate: "2026-10-15T18:00:00Z",
    submittedAt: "2026-10-15T19:00:00Z",
    createdAt: "2026-10-15T19:00:00Z",
    description: "Parking pillar collision in basement parking. Scratched passenger door and mirror.",
    estimatedAmount: 18500,
    currency: "ETB",
    policyNumber: "ETH-POL-2026-001",
    evidenceCount: 1,
    claimant: {
      name: "Solomon Tadesse",
      phone: "+251 91 123 4567",
    },
    vehicle: {
      make: "Toyota",
      model: "Corolla",
      year: 2021,
      plate: "AA-2-B12345",
    },
    policy: SEED_POLICIES[0],
  },
  {
    id: "clm-104",
    claimNumber: "CLM-2026-00104",
    status: "APPROVED",
    incidentDate: "2026-10-08T11:20:00Z",
    submittedAt: "2026-10-08T12:00:00Z",
    createdAt: "2026-10-08T12:00:00Z",
    description: "Windshield cracked by flying gravel on Ring Road.",
    estimatedAmount: 26000,
    currency: "ETB",
    policyNumber: "ETH-POL-2026-002",
    claimant: {
      name: "Tsedale Mengistu",
      phone: "+251 92 987 6543",
    },
    vehicle: {
      make: "Hyundai",
      model: "Tucson",
      year: 2023,
      plate: "ET-3-C98765",
    },
    policy: SEED_POLICIES[1],
  },
  {
    id: "clm-105",
    claimNumber: "CLM-2026-00105",
    status: "EVIDENCE_REQUESTED",
    incidentDate: "2026-10-09T22:00:00Z",
    submittedAt: "2026-10-10T08:00:00Z",
    createdAt: "2026-10-10T08:00:00Z",
    description: "High-speed rollover on outskirts. Potential similarity match flagged by perceptual hash.",
    estimatedAmount: 340000,
    currency: "ETB",
    policyNumber: "ETH-POL-2026-004",
    claimant: {
      name: "Almaz Kebede",
      phone: "+251 91 555 5555",
    },
    vehicle: {
      make: "Toyota",
      model: "Land Cruiser",
      year: 2020,
      plate: "ET-2-E55555",
    },
    policy: SEED_POLICIES[3],
  },
];

const SEED_TIMELINE: Record<string, ClaimTimelineEvent[]> = {
  "clm-101": [
    {
      id: "evt-1",
      claimId: "clm-101",
      action: "CLAIM_SUBMITTED",
      description: "Intake officer registered initial motor claim with verified policy ETH-POL-2026-001.",
      createdAt: "2026-10-12T16:00:00Z",
      actor: "Abebe Kebede",
    },
    {
      id: "evt-2",
      claimId: "clm-101",
      action: "EVIDENCE_UPLOADED",
      description: "3 photographic files uploaded and queued for damage inference.",
      createdAt: "2026-10-12T16:08:00Z",
      actor: "Abebe Kebede",
    },
    {
      id: "evt-3",
      claimId: "clm-101",
      action: "AI_ANALYSIS_COMPLETED",
      description: "Model v2.4 identified moderate bumper detachment (91% confidence).",
      createdAt: "2026-10-12T16:10:00Z",
      actor: "Inference Engine",
    },
    {
      id: "evt-4",
      claimId: "clm-101",
      action: "STATUS_CHANGED",
      description: "Triage automation routed claim to examiner review queue.",
      createdAt: "2026-10-12T16:11:00Z",
      actor: "System Gateway",
    },
    {
      id: "evt-5",
      claimId: "clm-101",
      action: "ASSESSMENT_RECORDED",
      description: "Examiner Solomon evaluated moderate severity with 78,500.00 ETB estimate.",
      createdAt: "2026-10-13T10:15:00Z",
      actor: "Solomon Tadesse (Examiner)",
    },
  ],
};

const SEED_DAMAGE_ANALYSIS: Record<string, DamageAnalysis> = {
  "ev-101": {
    id: "ana-101",
    evidenceId: "ev-101",
    modelName: "YOLOv8x-Damage-ET",
    modelVersion: "2.4.1",
    inferenceStatus: "COMPLETED",
    processingTime: 1.42,
    createdAt: "2026-10-12T16:10:00Z",
    detections: [
      {
        id: "det-1",
        part: "Front Bumper",
        damageType: "BUMPER_DETACHMENT",
        severity: "MODERATE",
        confidence: 0.92,
        bbox: [120, 340, 680, 520],
      },
      {
        id: "det-2",
        part: "Left Headlight",
        damageType: "HOUSING_CRACK",
        severity: "MINOR",
        confidence: 0.86,
        bbox: [540, 260, 710, 380],
      },
    ],
  },
  "ev-102": {
    id: "ana-102",
    evidenceId: "ev-102",
    modelName: "YOLOv8x-Damage-ET",
    modelVersion: "2.4.1",
    inferenceStatus: "COMPLETED",
    processingTime: 1.15,
    createdAt: "2026-10-12T16:10:30Z",
    detections: [
      {
        id: "det-3",
        part: "Driver Door",
        damageType: "CREASE_DENT",
        severity: "MODERATE",
        confidence: 0.89,
        bbox: [200, 180, 550, 420],
      },
    ],
  },
};

const SEED_MATCHES: Record<string, SimilarityMatch[]> = {
  "ev-101": [
    {
      id: "mat-1",
      sourceEvidenceId: "ev-101",
      matchedEvidenceId: "ev-arch-904",
      matchedClaimId: "clm-2025-098",
      matchedClaimNumber: "CLM-2025-098",
      matchType: "EMBEDDING_SIMILARITY",
      distance: 0.18,
      score: 0.82,
      createdAt: "2026-10-12T16:10:05Z",
    },
  ],
  "ev-102": [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Local Storage Backed Mutable Store
// ─────────────────────────────────────────────────────────────────────────────

interface MockStore {
  claims: Claim[];
  policies: Policy[];
  users: AdminUser[];
  timelines: Record<string, ClaimTimelineEvent[]>;
  analyses: Record<string, DamageAnalysis>;
  matches: Record<string, SimilarityMatch[]>;
}

function getStore(): MockStore {
  if (typeof window === "undefined") {
    return {
      claims: SEED_CLAIMS,
      policies: SEED_POLICIES,
      users: Object.values(MOCK_USERS).map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        username: u.username,
        role: u.role,
        status: "ACTIVE",
        createdAt: "2026-01-10T00:00:00Z",
      })),
      timelines: SEED_TIMELINE,
      analyses: SEED_DAMAGE_ANALYSIS,
      matches: SEED_MATCHES,
    };
  }

  const raw = localStorage.getItem("ethioclaim_mock_store");
  if (!raw) {
    const initial: MockStore = {
      claims: SEED_CLAIMS,
      policies: SEED_POLICIES,
      users: Object.values(MOCK_USERS).map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        username: u.username,
        role: u.role,
        status: "ACTIVE",
        createdAt: "2026-01-10T00:00:00Z",
      })),
      timelines: SEED_TIMELINE,
      analyses: SEED_DAMAGE_ANALYSIS,
      matches: SEED_MATCHES,
    };
    localStorage.setItem("ethioclaim_mock_store", JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      claims: SEED_CLAIMS,
      policies: SEED_POLICIES,
      users: [],
      timelines: SEED_TIMELINE,
      analyses: SEED_DAMAGE_ANALYSIS,
      matches: SEED_MATCHES,
    };
  }
}

function saveStore(store: MockStore) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ethioclaim_mock_store", JSON.stringify(store));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Matcher & Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

interface FallbackRequest {
  method: string;
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
}

export async function handleMockFallback(req: FallbackRequest): Promise<unknown> {
  setMockFallbackActive(true);

  const method = (req.method || "GET").toUpperCase();
  // Strip base URL if included
  const path = (req.url || "").replace(/^https?:\/\/[^/]+(\/api\/v1)?/, "").replace(/^\/api\/v1/, "");
  const store = getStore();

  // 1. Health: GET /health
  if (method === "GET" && (path === "/health" || path === "health")) {
    return {
      status: "ok",
      database: "mock-offline",
      timestamp: new Date().toISOString(),
      mode: "OFFLINE_FALLBACK",
    };
  }

  // 2. Auth: POST /auth/login
  if (method === "POST" && path.includes("/auth/login")) {
    let body: Record<string, string> = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }
    const ident = (body.email || body.username || "examiner").toLowerCase();
    const user =
      ident.includes("admin") ? MOCK_USERS.admin :
      ident.includes("claimant") || ident.includes("intake") ? MOCK_USERS.claimant :
      ident.includes("manager") ? MOCK_USERS.manager :
      MOCK_USERS.examiner;

    const token = `mock-jwt-${user.role.toLowerCase()}-${Date.now()}`;
    return {
      token,
      accessToken: token,
      user,
    };
  }

  // 3. Auth: POST /auth/logout
  if (method === "POST" && path.includes("/auth/logout")) {
    return { success: true, message: "Logged out from mock session" };
  }

  // 4. Auth: GET /auth/me
  if (method === "GET" && path.includes("/auth/me")) {
    const rawUser = typeof window !== "undefined" ? localStorage.getItem("ethioclaim_user") : null;
    if (rawUser) {
      try {
        return JSON.parse(rawUser);
      } catch {
        // fallback
      }
    }
    return MOCK_USERS.examiner;
  }

  // 5. Policy: POST /policies/verify
  if (method === "POST" && path.includes("/policies/verify")) {
    let body: { policyNumber?: string } = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }
    const num = (body.policyNumber || "").trim().toUpperCase();
    const found = store.policies.find(
      (p) =>
        p.policyNumber.toUpperCase() === num ||
        (p.normalizedPolicyNumber && p.normalizedPolicyNumber.toUpperCase() === num.replace(/[^A-Z0-9]/g, ""))
    );

    if (found) {
      return {
        found: true,
        status: found.status,
        policyId: found.id,
        policyNumber: found.policyNumber,
        validFrom: found.validFrom,
        validTo: found.validTo,
        insurer: found.insurer,
        holderName: found.holderName,
      };
    }

    // Dynamic mock for any typed valid-looking string
    if (num.length >= 3) {
      return {
        found: true,
        status: "ACTIVE",
        policyId: `pol-${Date.now().toString(36)}`,
        policyNumber: num,
        validFrom: "2026-01-01T00:00:00Z",
        validTo: "2026-12-31T23:59:59Z",
        insurer: "Ethiopian Insurance Corporation",
        holderName: "Verified Policyholder",
      };
    }

    return {
      found: false,
      status: "NOT_FOUND",
    };
  }

  // 6. Policy: GET /policies/:id
  const polMatch = path.match(/^\/policies\/([^/]+)$/);
  if (method === "GET" && polMatch) {
    const id = polMatch[1];
    const pol = store.policies.find((p) => p.id === id || p.policyNumber === id) || store.policies[0];
    return pol;
  }

  // 7. Dashboard: GET /dashboard/summary
  if (method === "GET" && path.includes("/dashboard/summary")) {
    const counts: Record<string, number> = {};
    store.claims.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });

    const reviewQueue = store.claims.filter(
      (c) => c.status === "READY_FOR_REVIEW" || c.status === "UNDER_REVIEW"
    ).length;

    return {
      totalClaims: store.claims.length,
      statusCounts: counts,
      reviewQueueCount: reviewQueue,
      recentClaims: store.claims.slice(0, 5),
      totalAssessedEtb: store.claims.reduce((acc, c) => acc + (c.estimatedAmount || 0), 0),
    } as DashboardSummary;
  }

  // 8. Claims: POST /claims
  if (method === "POST" && path === "/claims") {
    let body: any = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }

    const newClaim: Claim = {
      id: `clm-${Date.now()}`,
      claimNumber: `CLM-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      status: "SUBMITTED",
      incidentDate: body.incident?.date || new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: body.incident?.description || "Initial claimant report",
      estimatedAmount: Number(body.incident?.estimatedAmount) || 0,
      currency: "ETB",
      policyNumber: body.policyNumber || "ETH-POL-2026-001",
      claimant: body.claimant || { name: "Intake Claimant", phone: "+251 91 000 0000" },
      vehicle: body.vehicle || { make: "Vehicle", model: "Model", plate: "ET-0-00000" },
      evidenceCount: 0,
    };

    store.claims.unshift(newClaim);
    store.timelines[newClaim.id] = [
      {
        id: `evt-${Date.now()}`,
        claimId: newClaim.id,
        action: "CLAIM_SUBMITTED",
        description: `Claim ${newClaim.claimNumber} registered with initial estimate ${newClaim.estimatedAmount} ETB.`,
        createdAt: new Date().toISOString(),
        actor: "Intake Officer",
      },
    ];
    saveStore(store);
    return newClaim;
  }

  // 9. Claims: GET /claims
  if (method === "GET" && path === "/claims") {
    const params = req.params || {};
    let items = [...store.claims];

    if (params.q) {
      const q = String(params.q).toLowerCase();
      items = items.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(q) ||
          c.claimant?.name?.toLowerCase().includes(q) ||
          c.policyNumber?.toLowerCase().includes(q) ||
          c.vehicle?.plate?.toLowerCase().includes(q)
      );
    }

    if (params.status) {
      items = items.filter((c) => c.status === params.status);
    }

    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 10;
    const total = items.length;
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    return {
      items: pagedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  // 10. Claim Detail: GET /claims/:claimId
  const singleClaimMatch = path.match(/^\/claims\/([^/]+)$/);
  if (method === "GET" && singleClaimMatch) {
    const id = singleClaimMatch[1];
    const claim = store.claims.find((c) => c.id === id || c.claimNumber === id) || store.claims[0];
    return claim;
  }

  // 11. Claim Status: PATCH /claims/:claimId/status
  const statusMatch = path.match(/^\/claims\/([^/]+)\/status$/);
  if (method === "PATCH" && statusMatch) {
    const id = statusMatch[1];
    let body: { status: ClaimStatus } = { status: "UNDER_REVIEW" };
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }

    const claim = store.claims.find((c) => c.id === id || c.claimNumber === id);
    if (claim) {
      const oldStatus = claim.status;
      claim.status = body.status;
      claim.updatedAt = new Date().toISOString();

      const timeline = store.timelines[claim.id] || [];
      timeline.push({
        id: `evt-${Date.now()}`,
        claimId: claim.id,
        action: `STATUS_CHANGED_${body.status}`,
        description: `Adjudication status updated from ${oldStatus} to ${body.status}.`,
        createdAt: new Date().toISOString(),
        actor: "Claims Examiner",
      });
      store.timelines[claim.id] = timeline;
      saveStore(store);
      return claim;
    }
    return { status: body.status };
  }

  // 12. Claim Update: PATCH /claims/:claimId
  if (method === "PATCH" && singleClaimMatch) {
    const id = singleClaimMatch[1];
    let body: any = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }

    const claim = store.claims.find((c) => c.id === id || c.claimNumber === id);
    if (claim) {
      Object.assign(claim, body);
      claim.updatedAt = new Date().toISOString();
      saveStore(store);
      return claim;
    }
  }

  // 13. Claim Timeline: GET /claims/:claimId/timeline
  const timelineMatch = path.match(/^\/claims\/([^/]+)\/timeline$/);
  if (method === "GET" && timelineMatch) {
    const id = timelineMatch[1];
    return store.timelines[id] || SEED_TIMELINE["clm-101"] || [];
  }

  // 14. Request Evidence: POST /claims/:claimId/request-evidence
  const reqEvMatch = path.match(/^\/claims\/([^/]+)\/request-evidence$/);
  if (method === "POST" && reqEvMatch) {
    const id = reqEvMatch[1];
    let body: any = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }

    const timeline = store.timelines[id] || [];
    timeline.push({
      id: `evt-${Date.now()}`,
      claimId: id,
      action: "EVIDENCE_REQUESTED",
      description: body.notes || `Examiner requested item: ${body.item || "Photos"}`,
      createdAt: new Date().toISOString(),
      actor: "Examiner",
    });
    store.timelines[id] = timeline;
    saveStore(store);
    return { success: true, message: "Evidence request formally recorded" };
  }

  // 15. Evidence List: GET /claims/:claimId/evidence
  const claimEvListMatch = path.match(/^\/claims\/([^/]+)\/evidence$/);
  if (method === "GET" && claimEvListMatch) {
    const id = claimEvListMatch[1];
    const claim = store.claims.find((c) => c.id === id || c.claimNumber === id);
    return claim?.evidence || SEED_CLAIMS[0].evidence || [];
  }

  // 16. Upload Evidence: POST /claims/:claimId/evidence
  if (method === "POST" && claimEvListMatch) {
    const id = claimEvListMatch[1];
    const evId = `ev-${Date.now()}`;
    const newEvidence: Evidence = {
      id: evId,
      claimId: id,
      originalFilename: "uploaded_inspection_photo.jpg",
      filename: "uploaded_inspection_photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 2150000,
      uploadedAt: new Date().toISOString(),
      analysisStatus: "COMPLETED",
      url: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80",
    };

    const claim = store.claims.find((c) => c.id === id || c.claimNumber === id);
    if (claim) {
      if (!claim.evidence) claim.evidence = [];
      claim.evidence.push(newEvidence);
      claim.evidenceCount = claim.evidence.length;
    }

    store.analyses[evId] = {
      id: `ana-${Date.now()}`,
      evidenceId: evId,
      modelName: "YOLOv8x-Damage-ET",
      modelVersion: "2.4.1",
      inferenceStatus: "COMPLETED",
      processingTime: 1.28,
      createdAt: new Date().toISOString(),
      detections: [
        {
          id: `det-${Date.now()}-1`,
          part: "Front Bumper",
          damageType: "DENT_AND_SCRATCH",
          severity: "MODERATE",
          confidence: 0.94,
          bbox: [100, 200, 500, 400],
        },
      ],
    };

    saveStore(store);
    return {
      id: evId,
      status: "COMPLETED",
      analysisStatus: "COMPLETED",
    };
  }

  // 17. Evidence Metadata: GET /evidence/:evidenceId
  const singleEvMatch = path.match(/^\/evidence\/([^/]+)$/);
  if (method === "GET" && singleEvMatch) {
    const evId = singleEvMatch[1];
    return {
      id: evId,
      claimId: "clm-101",
      originalFilename: "damage_inspection.jpg",
      analysisStatus: "COMPLETED",
      uploadedAt: new Date().toISOString(),
      sizeBytes: 2048000,
      url: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80",
    };
  }

  // 18. Delete Evidence: DELETE /evidence/:evidenceId
  if (method === "DELETE" && singleEvMatch) {
    const evId = singleEvMatch[1];
    store.claims.forEach((c) => {
      if (c.evidence) {
        c.evidence = c.evidence.filter((e) => e.id !== evId);
        c.evidenceCount = c.evidence.length;
      }
    });
    saveStore(store);
    return { success: true };
  }

  // 19. Evidence Analysis: GET /evidence/:evidenceId/analysis
  const analysisMatch = path.match(/^\/evidence\/([^/]+)\/analysis$/);
  if (method === "GET" && analysisMatch) {
    const evId = analysisMatch[1];
    return (
      store.analyses[evId] || {
        id: `ana-${evId}`,
        evidenceId: evId,
        modelName: "YOLOv8x-Damage-ET",
        modelVersion: "2.4.1",
        inferenceStatus: "COMPLETED",
        processingTime: 1.1,
        detections: [
          {
            part: "Body Panel",
            damageType: "DENT",
            severity: "MODERATE",
            confidence: 0.91,
          },
        ],
      }
    );
  }

  // 20. Reanalyze: POST /evidence/:evidenceId/reanalyze
  const reanalyzeMatch = path.match(/^\/evidence\/([^/]+)\/reanalyze$/);
  if (method === "POST" && reanalyzeMatch) {
    const evId = reanalyzeMatch[1];
    return { status: "COMPLETED", evidenceId: evId };
  }

  // 21. Similarity Matches: GET /evidence/:evidenceId/matches
  const matchesMatch = path.match(/^\/evidence\/([^/]+)\/matches$/);
  if (method === "GET" && matchesMatch) {
    const evId = matchesMatch[1];
    return store.matches[evId] || SEED_MATCHES["ev-101"] || [];
  }

  // 22. Assessment: POST /claims/:claimId/assessment
  const assessmentMatch = path.match(/^\/claims\/([^/]+)\/assessment$/);
  if (method === "POST" && assessmentMatch) {
    const id = assessmentMatch[1];
    let body: any = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }

    const loss = Number(body.estimatedLossEtb || body.estimatedLossAmount) || 0;
    const ass: ExaminerAssessment = {
      id: `ass-${Date.now()}`,
      claimId: id,
      severity: body.severity || "MODERATE",
      estimatedLossEtb: loss,
      estimatedLossAmount: loss.toFixed(2),
      currency: "ETB",
      notes: body.notes || "",
      assessedBy: "Solomon Tadesse (Examiner)",
      assessedAt: new Date().toISOString(),
    };

    const claim = store.claims.find((c) => c.id === id || c.claimNumber === id);
    if (claim) {
      claim.latestAssessment = ass;
      const timeline = store.timelines[claim.id] || [];
      timeline.push({
        id: `evt-${Date.now()}`,
        claimId: claim.id,
        action: "ASSESSMENT_RECORDED",
        description: `Severity: ${ass.severity} • Estimated Loss: ${ass.estimatedLossAmount} ETB`,
        createdAt: new Date().toISOString(),
        actor: "Solomon Tadesse",
      });
      store.timelines[claim.id] = timeline;
      saveStore(store);
    }
    return ass;
  }

  // 23. Assessment Read: GET /claims/:claimId/assessment
  if (method === "GET" && assessmentMatch) {
    const id = assessmentMatch[1];
    const claim = store.claims.find((c) => c.id === id || c.claimNumber === id);
    return claim?.latestAssessment || SEED_CLAIMS[0].latestAssessment || null;
  }

  // 24. Assessment Update: PATCH /claims/:claimId/assessment
  if (method === "PATCH" && assessmentMatch) {
    const id = assessmentMatch[1];
    let body: any = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }

    const claim = store.claims.find((c) => c.id === id || c.claimNumber === id);
    if (claim && claim.latestAssessment) {
      Object.assign(claim.latestAssessment, body);
      claim.latestAssessment.updatedAt = new Date().toISOString();
      saveStore(store);
      return claim.latestAssessment;
    }
    return body;
  }

  // 25. Examiner Decision: POST /claims/:claimId/decision
  const decisionMatch = path.match(/^\/claims\/([^/]+)\/decision$/);
  if (method === "POST" && decisionMatch) {
    const id = decisionMatch[1];
    let body: any = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }

    const dec = body.decision;
    const claim = store.claims.find((c) => c.id === id || c.claimNumber === id);
    if (claim) {
      if (dec === "RECOMMEND_APPROVAL") claim.status = "APPROVED";
      else if (dec === "RECOMMEND_REJECTION") claim.status = "REJECTED";
      else if (dec === "REFER_FOR_INSPECTION") claim.status = "UNDER_REVIEW";
      else if (dec === "ADDITIONAL_DOCUMENTS_REQUIRED") claim.status = "EVIDENCE_REQUESTED";
      else claim.status = "UNDER_REVIEW";

      const timeline = store.timelines[claim.id] || [];
      timeline.push({
        id: `evt-${Date.now()}`,
        claimId: claim.id,
        action: `DECISION_${dec}`,
        description: body.notes || "Human examiner recorded final adjudication decision.",
        createdAt: new Date().toISOString(),
        actor: "Examiner",
      });
      store.timelines[claim.id] = timeline;
      saveStore(store);
    }

    return {
      id: `dec-${Date.now()}`,
      claimId: id,
      decision: dec,
      notes: body.notes,
      recordedAt: new Date().toISOString(),
      recordedBy: "Solomon Tadesse (Examiner)",
    };
  }

  // 26. Admin Users: GET /admin/users
  if (method === "GET" && path.includes("/admin/users")) {
    return store.users;
  }

  // 27. Admin Users: POST /admin/users
  if (method === "POST" && path.includes("/admin/users")) {
    let body: any = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }
    const newUser: AdminUser = {
      id: `usr-${Date.now()}`,
      email: body.email,
      displayName: body.displayName || body.username || body.email.split("@")[0],
      username: body.username || body.email.split("@")[0],
      role: body.role || "EXAMINER",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    store.users.unshift(newUser);
    saveStore(store);
    return newUser;
  }

  // 28. Admin Users: PATCH /admin/users/:userId
  const editUserMatch = path.match(/^\/admin\/users\/([^/]+)$/);
  if (method === "PATCH" && editUserMatch) {
    const uid = editUserMatch[1];
    let body: any = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }
    const u = store.users.find((user) => user.id === uid);
    if (u) {
      Object.assign(u, body);
      saveStore(store);
      return u;
    }
  }

  // 29. Admin Policies: GET /admin/policies
  if (method === "GET" && path.includes("/admin/policies")) {
    return {
      items: store.policies,
      page: 1,
      pageSize: 50,
      total: store.policies.length,
    };
  }

  // 30. Admin Policies: POST /admin/policies
  if (method === "POST" && path.includes("/admin/policies")) {
    let body: any = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }
    const newPol: Policy = {
      id: `pol-${Date.now()}`,
      policyNumber: body.policyNumber,
      normalizedPolicyNumber: (body.policyNumber || "").replace(/[^A-Z0-9]/g, "").toUpperCase(),
      status: body.status || "ACTIVE",
      holderName: body.holderName || "New Policyholder",
      vehicleRegistration: body.vehicleRegistration || undefined,
      vehicleMake: body.vehicleMake || undefined,
      vehicleModel: body.vehicleModel || undefined,
      insurer: body.insurer || "Ethiopian Insurance Corporation",
      validFrom: body.validFrom || new Date().toISOString(),
      validTo: body.validTo || new Date(Date.now() + 365 * 86400000).toISOString(),
      coverageAmount: body.coverageAmount || undefined,
      createdAt: new Date().toISOString(),
    };
    store.policies.unshift(newPol);
    saveStore(store);
    return newPol;
  }

  // 31. Admin Policies: PATCH /admin/policies/:policyId
  const editPolMatch = path.match(/^\/admin\/policies\/([^/]+)$/);
  if (method === "PATCH" && editPolMatch) {
    const pid = editPolMatch[1];
    let body: any = {};
    try {
      body = typeof req.data === "string" ? JSON.parse(req.data) : req.data || {};
    } catch {
      // ignore
    }
    const p = store.policies.find((pol) => pol.id === pid || pol.policyNumber === pid);
    if (p) {
      Object.assign(p, body);
      saveStore(store);
      return p;
    }
  }

  // Default fallback for unmatched routes
  return { success: true, message: "Handled by mock fallback" };
}

// ─────────────────────────────────────────────────────────────────────────────
// One-Click Mock Login Bypass
// ─────────────────────────────────────────────────────────────────────────────

export function bypassLoginAs(role: "ADMIN" | "EXAMINER" | "INTAKE_USER" | "MANAGER"): {
  token: string;
  user: CurrentUser;
} {
  const user =
    role === "ADMIN" ? MOCK_USERS.admin :
    role === "INTAKE_USER" ? MOCK_USERS.claimant :
    role === "MANAGER" ? MOCK_USERS.manager :
    MOCK_USERS.examiner;

  const token = `mock-bypass-${role.toLowerCase()}-${Date.now()}`;
  if (typeof window !== "undefined") {
    localStorage.setItem("ethioclaim_token", token);
    localStorage.setItem("ethioclaim_user", JSON.stringify(user));
  }
  setMockFallbackActive(true);
  return { token, user };
}

export function registerMockAccount(details: {
  email: string;
  displayName: string;
  role: "ADMIN" | "EXAMINER" | "INTAKE_USER";
}): { token: string; user: CurrentUser } {
  const user: CurrentUser = {
    id: `usr-custom-${Date.now()}`,
    email: details.email,
    displayName: details.displayName,
    username: details.email.split("@")[0],
    role: details.role,
    organizationId: "org-eic-01",
  };
  const token = `mock-bypass-custom-${Date.now()}`;
  if (typeof window !== "undefined") {
    localStorage.setItem("ethioclaim_token", token);
    localStorage.setItem("ethioclaim_user", JSON.stringify(user));
  }
  const store = getStore();
  store.users.unshift({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    username: user.username,
    role: user.role,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  });
  saveStore(store);
  setMockFallbackActive(true);
  return { token, user };
}
