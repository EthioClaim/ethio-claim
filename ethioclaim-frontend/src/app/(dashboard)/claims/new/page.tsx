"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClaim, verifyPolicy } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { PolicyVerificationResult } from "@/types";

const STEPS = [
  { id: 1, label: "Policy", desc: "Policy Verification & Registration" },
  { id: 2, label: "Claimant", desc: "Insured Party Details" },
  { id: 3, label: "Vehicle", desc: "Vehicle Particulars" },
  { id: 4, label: "Incident", desc: "Accident Occurrence" },
  { id: 5, label: "Review", desc: "Review, Confirm & Submit" },
];

function NewClaimForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdClaimId, setCreatedClaimId] = useState<string | null>(null);
  const [createdClaimNumber, setCreatedClaimNumber] = useState<string | null>(null);

  // Policy Verification State
  const [policyNumber, setPolicyNumber] = useState(searchParams.get("policyNumber") || "");
  const [policyCheckLoading, setPolicyCheckLoading] = useState(false);
  const [policyResult, setPolicyResult] = useState<PolicyVerificationResult | null>(null);

  // Snapshot of prefilled values to detect user confirmation vs user correction
  const [prefilledData, setPrefilledData] = useState<{
    fullName?: string;
    make?: string;
    model?: string;
    plate?: string;
    coverageAmount?: string;
  } | null>(null);

  // Form State
  const [claimant, setClaimant] = useState({
    fullName: "",
    phone: "",
    email: "",
    idNumber: "",
  });

  const [vehicle, setVehicle] = useState({
    make: "",
    model: "",
    year: "2024",
    plate: "",
    color: "",
    vin: "",
  });

  const [incident, setIncident] = useState({
    date: new Date().toISOString().split("T")[0],
    location: "Addis Ababa",
    description: "",
    estimatedAmount: "50000",
  });

  const [confirmedReview, setConfirmedReview] = useState(true);

  useEffect(() => {
    const p = searchParams.get("policyNumber");
    if (p) {
      setPolicyNumber(p);
      handleVerifyPolicy(p);
    }
  }, [searchParams]);

  /**
   * Verify policy registration.
   * If registered: prefill user and vehicle information.
   * If not registered: block and warn.
   */
  async function handleVerifyPolicy(num?: string): Promise<PolicyVerificationResult> {
    const val = (num || policyNumber).trim();
    if (!val) {
      const fallback: PolicyVerificationResult = { found: false, status: "NOT_FOUND" };
      setPolicyResult(fallback);
      setPrefilledData(null);
      setError("Please enter a policy number to verify registration.");
      return fallback;
    }

    setPolicyCheckLoading(true);
    setError("");

    try {
      const res = await verifyPolicy(val);
      setPolicyResult(res);

      if (res.found && res.policy) {
        // Data Prefilling: automatically prefill user & vehicle info from policy registration
        const polHolder = res.policy.holderName || res.policy.policyholderName || "";
        const polMake = res.policy.vehicleMake || "";
        const polModel = res.policy.vehicleModel || "";
        const polPlate = res.policy.vehicleRegistration || res.policy.vehiclePlate || "";
        const polCoverage = res.policy.coverageAmount ? String(res.policy.coverageAmount) : "";

        setPrefilledData({
          fullName: polHolder,
          make: polMake,
          model: polModel,
          plate: polPlate,
          coverageAmount: polCoverage,
        });

        // Prefill Claimant Info
        setClaimant((prev) => ({
          ...prev,
          fullName: polHolder || prev.fullName,
        }));

        // Prefill Vehicle Info
        setVehicle((prev) => ({
          ...prev,
          make: polMake || prev.make,
          model: polModel || prev.model,
          plate: polPlate || prev.plate,
        }));

        // Prefill Estimated Claim Amount if available
        if (polCoverage) {
          setIncident((prev) => ({
            ...prev,
            estimatedAmount: polCoverage,
          }));
        }
      } else {
        // Validation & Blocking: Clear prefilled data and trigger blocking warning
        setPrefilledData(null);
        setError("Policy not registered. Claim intake is blocked until a valid, registered policy is verified.");
      }

      return res;
    } catch {
      const fallback: PolicyVerificationResult = { found: false, status: "NOT_FOUND" };
      setPolicyResult(fallback);
      setPrefilledData(null);
      setError("Policy not registered in the system. Claim intake cannot proceed.");
      return fallback;
    } finally {
      setPolicyCheckLoading(false);
    }
  }

  /**
   * Validation & Blocking: User cannot proceed to subsequent steps unless policy is verified.
   */
  async function handleProceedFromPolicy() {
    const val = policyNumber.trim();
    if (!val) {
      setError("Policy Number is required to initiate a claim");
      return;
    }

    let verification = policyResult;
    const normVal = val.replace(/[-\s]/g, "").toUpperCase();
    const verifiedNorm = verification?.policyNumber
      ? verification.policyNumber.replace(/[-\s]/g, "").toUpperCase()
      : null;

    if (!verification || verifiedNorm !== normVal) {
      verification = await handleVerifyPolicy(val);
    }

    if (!verification || !verification.found) {
      setError("Policy not registered. Claim intake is blocked. Please provide a valid, registered policy number to proceed.");
      return;
    }

    setError("");
    setStep(2);
  }

  /**
   * Submit authoritative prefilled and user-confirmed/corrected payload to database.
   */
  async function handleSubmit() {
    setError("");

    // Enforce policy registration validation check
    if (!policyNumber.trim() || !policyResult?.found) {
      setError("Policy not registered. Claim intake is blocked until a registered policy is verified.");
      setStep(1);
      return;
    }

    if (!claimant.fullName.trim() || !claimant.phone.trim()) {
      setError("Claimant Name and Phone Number are required");
      setStep(2);
      return;
    }

    if (!vehicle.make.trim() || !vehicle.model.trim() || !vehicle.plate.trim()) {
      setError("Vehicle Make, Model, and License Plate are required");
      setStep(3);
      return;
    }

    if (!incident.date || !incident.description.trim()) {
      setError("Incident Date and Description narrative are required");
      setStep(4);
      return;
    }

    if (!confirmedReview) {
      setError("Please confirm your review of the prefilled and corrected information before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const claim = await createClaim({
        policyNumber: policyNumber.trim().toUpperCase(),
        claimant: {
          fullName: claimant.fullName.trim(),
          phone: claimant.phone.trim(),
          email: claimant.email.trim() || undefined,
          idNumber: claimant.idNumber.trim() || undefined,
        },
        vehicle: {
          make: vehicle.make.trim(),
          model: vehicle.model.trim(),
          year: parseInt(vehicle.year) || 2024,
          plate: vehicle.plate.trim().toUpperCase(),
          color: vehicle.color.trim() || undefined,
          vin: vehicle.vin.trim().toUpperCase() || undefined,
        },
        incident: {
          date: incident.date,
          location: incident.location.trim() || undefined,
          description: incident.description.trim(),
          estimatedAmount: parseFloat(incident.estimatedAmount) || 0,
        },
      });

      setCreatedClaimId(claim.id);
      setCreatedClaimNumber(claim.claimNumber || claim.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create claim");
    } finally {
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Success Confirmation Screen
  // ─────────────────────────────────────────────────────────────────────────────
  if (createdClaimId) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 space-y-6 animate-fade-in-up">
        <div className="w-16 h-16 rounded-3xl bg-[#30D158]/20 border border-[#30D158]/40 flex items-center justify-center mx-auto text-[#30D158] shadow-lg shadow-[#30D158]/15">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Claim Registered & Submitted
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Authoritative Adjudication Record Created</p>
          <p className="text-xl font-mono font-bold text-[#64D2FF] mt-2">{createdClaimNumber}</p>
        </div>

        <div className="card apple-glass p-6 text-left space-y-3.5 text-xs shadow-md">
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-[var(--text-muted)]">Verified Policy</span>
            <span className="font-mono text-white font-semibold">{policyNumber.toUpperCase()}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-[var(--text-muted)]">Insured Claimant</span>
            <span className="font-semibold text-white flex items-center gap-1.5">
              {claimant.fullName}
              {prefilledData?.fullName && claimant.fullName === prefilledData.fullName && (
                <span className="text-[10px] text-[#30D158] font-normal">(Policy Prefilled)</span>
              )}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-[var(--text-muted)]">Insured Vehicle</span>
            <span className="font-semibold text-white">
              {vehicle.make} {vehicle.model} ({vehicle.plate})
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-[var(--text-muted)]">Claimed Amount</span>
            <span className="font-mono font-semibold text-white">
              {Number(incident.estimatedAmount || 0).toLocaleString()} ETB
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-[var(--text-muted)]">Intake Status</span>
            <span className="badge text-[11px] bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/30 font-semibold">
              SUBMITTED
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
          <Link
            href={`/claims/${createdClaimId}/evidence`}
            className="btn btn-primary py-3 px-6 shadow-sm flex items-center justify-center gap-2 font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Upload Photographic Evidence Now</span>
          </Link>
          <Link
            href={`/claims/${createdClaimId}`}
            className="btn btn-secondary py-3 px-5 flex items-center justify-center font-medium"
          >
            View Claim Overview
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Form Intake View
  // ─────────────────────────────────────────────────────────────────────────────
  const isPolicyVerified = Boolean(policyResult?.found);

  return (
    <div className="max-w-2xl mx-auto space-y-7 animate-fade-in">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] mb-2">
          <Link href="/claims" className="hover:text-white transition-colors">Claims</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">New Intake</span>
        </nav>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.032em] heading-display">
          Motor Claim Intake
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Step {step} of {STEPS.length} — {STEPS[step - 1].desc}
        </p>
      </div>

      {/* Steps Pill Stepper with Strict Policy Validation Blocking */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STEPS.map((s) => {
          const isAccessible = s.id === 1 || isPolicyVerified;
          const isPast = s.id < step;
          const isCurrent = s.id === step;

          return (
            <button
              key={s.id}
              type="button"
              disabled={!isAccessible && !isPast}
              onClick={() => {
                if (!isPolicyVerified && s.id > 1) {
                  setError("Policy not registered. You cannot proceed until a registered policy is verified.");
                  return;
                }
                if (isPast) {
                  setError("");
                  setStep(s.id);
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all select-none ${
                isCurrent
                  ? "bg-[#0A84FF] text-white shadow-sm"
                  : isPast
                    ? "bg-[#30D158]/20 text-[#30D158] hover:bg-[#30D158]/30 cursor-pointer"
                    : isAccessible
                      ? "bg-white/5 text-[var(--text-muted)] hover:text-white cursor-pointer"
                      : "bg-white/[0.02] text-[var(--text-muted)] opacity-40 cursor-not-allowed"
              }`}
              title={!isAccessible ? "Locked: Policy registration required" : s.desc}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/30 font-bold">
                {isPast ? "✓" : !isAccessible ? "🔒" : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Global Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FF453A]/12 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center gap-2.5 animate-fade-in shadow-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Card Form */}
      <div className="card apple-glass p-6 md:p-8 space-y-6 shadow-md">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Step 1: Policy Registration Verification & Blocking                */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge text-[10px] bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/30 font-semibold">
                  PREREQUISITE
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">STEP 1 OF 5</span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Policy Registration Verification</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                Claims can only be filed against active policies registered in the system. Upon verification, policyholder and vehicle data will be automatically prefilled.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="intake-policy-number" className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold flex items-center justify-between">
                <span>Policy Number *</span>
                {policyResult && (
                  <span className={`text-[11px] font-mono font-bold ${policyResult.found ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                    {policyResult.found ? "✓ REGISTERED" : "✗ NOT REGISTERED"}
                  </span>
                )}
              </label>

              <div className="flex gap-2">
                <input
                  id="intake-policy-number"
                  type="text"
                  placeholder="e.g. MTR-000001 or POL-2026-001"
                  className={`input font-mono text-sm uppercase h-11 ${
                    policyResult && !policyResult.found ? "border-[#FF453A]/50 bg-[#FF453A]/[0.03]" : ""
                  }`}
                  value={policyNumber}
                  onChange={(e) => {
                    setPolicyNumber(e.target.value);
                    if (policyResult) {
                      setPolicyResult(null);
                      setPrefilledData(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleVerifyPolicy();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleVerifyPolicy()}
                  disabled={policyCheckLoading || !policyNumber.trim()}
                  className="btn btn-secondary text-xs px-4 h-11 font-semibold flex-shrink-0"
                >
                  {policyCheckLoading ? "Verifying…" : "Check Registry"}
                </button>
              </div>

              {/* Sample Registered Policies Quick Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-[var(--text-muted)]">Registered Samples:</span>
                {["MTR-000001", "MTR-000002", "MTR-000123"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPolicyNumber(p);
                      handleVerifyPolicy(p);
                    }}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[#64D2FF] border border-white/8 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Validation & Blocking: Prominent Warning Card if NOT registered */}
            {policyResult && !policyResult.found && (
              <div className="p-5 rounded-2xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-white space-y-3 animate-fade-in shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FF453A]/20 flex items-center justify-center text-[#FF453A] flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#FF6961] text-sm">Policy Not Registered — Claim Intake Blocked</h4>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      The policy number <span className="font-mono text-white font-semibold">{policyNumber.trim().toUpperCase()}</span> was not found in the national insurer registry. System regulations strictly block proceeding with claim creation for unregistered policies.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <span className="text-[11px] text-[var(--text-muted)]">Resolution:</span>
                  <Link href="/policies/verify" className="text-[11px] text-[#64D2FF] hover:underline font-semibold">
                    Search Policy Verification Directory →
                  </Link>
                </div>
              </div>
            )}

            {/* Verified Policy Success Card with Prefilling Notice */}
            {policyResult && policyResult.found && (
              <div className="p-5 rounded-2xl bg-[#30D158]/10 border border-[#30D158]/30 text-xs text-white space-y-3 animate-fade-in shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#30D158]/20 flex items-center justify-center text-[#30D158] flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[#30D158] text-sm">Policy Verified & Registered Active</h4>
                      <span className="badge text-[10px] bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 font-semibold">
                        {policyResult.status}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      Registered policy found for <span className="font-semibold text-white">{policyResult.policy?.holderName || "Policyholder"}</span>. The system has automatically prefilled the claimant and vehicle records for your review.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-[var(--text-muted)] block text-[10px]">Insured Vehicle</span>
                        <span className="font-semibold text-white">
                          {policyResult.policy?.vehicleMake} {policyResult.policy?.vehicleModel}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-[var(--text-muted)] block text-[10px]">License Plate</span>
                        <span className="font-mono font-semibold text-white">
                          {policyResult.policy?.vehicleRegistration}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-black/20 border border-white/5 col-span-2 sm:col-span-1">
                        <span className="text-[var(--text-muted)] block text-[10px]">Coverage Validity</span>
                        <span className="text-white/80 font-mono text-[10px]">
                          {formatDate(policyResult.validFrom)} — {formatDate(policyResult.validTo)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <span className="text-[11px] text-[var(--text-muted)]">
                {!isPolicyVerified ? "🔒 Verification required to continue" : "✓ Policy verified"}
              </span>
              <button
                type="button"
                onClick={handleProceedFromPolicy}
                disabled={policyCheckLoading || !policyNumber.trim()}
                className={`btn text-xs py-2.5 px-6 font-semibold flex items-center gap-2 ${
                  isPolicyVerified
                    ? "btn-primary shadow-sm"
                    : "btn-secondary text-[var(--text-muted)] hover:text-white"
                }`}
              >
                {policyCheckLoading ? (
                  "Verifying Policy…"
                ) : isPolicyVerified ? (
                  "Continue to Review Prefilled Claimant →"
                ) : (
                  "Verify & Continue →"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Step 2: Claimant Information (Prefilled for User Review)            */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            {/* Prefill & Review Notice Banner */}
            <div className="p-4 rounded-2xl bg-[#0A84FF]/10 border border-[#0A84FF]/30 text-xs text-white space-y-1.5 animate-fade-in">
              <div className="flex items-center gap-2 text-[#64D2FF] font-semibold">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Information Prefilled from Policy Registration ({policyNumber.toUpperCase()})</span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                The claimant name was automatically retrieved from initial policy records. Your role is strictly to <strong>review, confirm, or correct</strong> this information before submission.
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Claimant Information</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Contact and identification details for the insured vehicle driver or owner
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Full Name *
                  </label>
                  {prefilledData?.fullName && (
                    claimant.fullName === prefilledData.fullName ? (
                      <span className="badge text-[10px] bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 font-semibold flex items-center gap-1">
                        <span>✓</span> Prefilled from Policy Record
                      </span>
                    ) : (
                      <span className="badge text-[10px] bg-[#FF9F0A]/20 text-[#FFD60A] border border-[#FF9F0A]/30 font-semibold flex items-center gap-1">
                        <span>✎</span> Corrected by User
                      </span>
                    )
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solomon Tadesse"
                  className="input h-11"
                  value={claimant.fullName}
                  onChange={(e) => setClaimant({ ...claimant, fullName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+251 91 123 4567"
                    className="input h-11"
                    value={claimant.phone}
                    onChange={(e) => setClaimant({ ...claimant, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="claimant@gmail.com"
                    className="input h-11"
                    value={claimant.email}
                    onChange={(e) => setClaimant({ ...claimant, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  National ID / Kebele Card (Optional)
                </label>
                <input
                  type="text"
                  placeholder="ET-ID-123456"
                  className="input h-11 font-mono"
                  value={claimant.idNumber}
                  onChange={(e) => setClaimant({ ...claimant, idNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                ← Back to Policy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!claimant.fullName.trim() || !claimant.phone.trim()) {
                    setError("Claimant Full Name and Phone Number are required");
                    return;
                  }
                  setError("");
                  setStep(3);
                }}
                className="btn btn-primary text-xs py-2.5 px-6 font-semibold"
              >
                Confirm & Continue to Vehicle →
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Step 3: Vehicle Particulars (Prefilled for User Review)             */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            {/* Prefill & Review Notice Banner */}
            <div className="p-4 rounded-2xl bg-[#0A84FF]/10 border border-[#0A84FF]/30 text-xs text-white space-y-1.5 animate-fade-in">
              <div className="flex items-center gap-2 text-[#64D2FF] font-semibold">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Vehicle Particulars Prefilled from Policy Registration</span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Make, Model, and License Plate were automatically retrieved from the policy registration database. Please review, confirm, or correct these details.
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Insured Vehicle Information</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Vehicle specifications used for computer vision matching, damage detection, and fraud analysis
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Make *
                  </label>
                  {prefilledData?.make && (
                    vehicle.make === prefilledData.make ? (
                      <span className="badge text-[10px] bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 font-semibold">
                        ✓ Prefilled
                      </span>
                    ) : (
                      <span className="badge text-[10px] bg-[#FF9F0A]/20 text-[#FFD60A] border border-[#FF9F0A]/30 font-semibold">
                        ✎ Corrected
                      </span>
                    )
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Toyota"
                  className="input h-11"
                  value={vehicle.make}
                  onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Model *
                  </label>
                  {prefilledData?.model && (
                    vehicle.model === prefilledData.model ? (
                      <span className="badge text-[10px] bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 font-semibold">
                        ✓ Prefilled
                      </span>
                    ) : (
                      <span className="badge text-[10px] bg-[#FF9F0A]/20 text-[#FFD60A] border border-[#FF9F0A]/30 font-semibold">
                        ✎ Corrected
                      </span>
                    )
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Corolla"
                  className="input h-11"
                  value={vehicle.model}
                  onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    License Plate *
                  </label>
                  {prefilledData?.plate && (
                    vehicle.plate === prefilledData.plate ? (
                      <span className="badge text-[10px] bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 font-semibold">
                        ✓ Prefilled
                      </span>
                    ) : (
                      <span className="badge text-[10px] bg-[#FF9F0A]/20 text-[#FFD60A] border border-[#FF9F0A]/30 font-semibold">
                        ✎ Corrected
                      </span>
                    )
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="AA-1234-A"
                  className="input h-11 font-mono uppercase"
                  value={vehicle.plate}
                  onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
                />
              </div>

              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Model Year
                </label>
                <input
                  type="number"
                  placeholder="2024"
                  className="input h-11 font-mono"
                  value={vehicle.year}
                  onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Color (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Silver / White"
                  className="input h-11"
                  value={vehicle.color}
                  onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Chassis / VIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="17-character VIN"
                  className="input h-11 font-mono uppercase"
                  value={vehicle.vin}
                  onChange={(e) => setVehicle({ ...vehicle, vin: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                ← Back to Claimant
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!vehicle.make.trim() || !vehicle.model.trim() || !vehicle.plate.trim()) {
                    setError("Make, Model, and License Plate are required");
                    return;
                  }
                  setError("");
                  setStep(4);
                }}
                className="btn btn-primary text-xs py-2.5 px-6 font-semibold"
              >
                Confirm & Continue to Incident →
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Step 4: Incident Occurrence Details                                 */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Accident & Incident Details</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Occurrence timeline, accident location, and initial damage narrative
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Incident Date *
                </label>
                <input
                  type="date"
                  required
                  className="input h-11"
                  value={incident.date}
                  onChange={(e) => setIncident({ ...incident, date: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Accident Location
                </label>
                <input
                  type="text"
                  placeholder="Bole Sub-City, Addis Ababa"
                  className="input h-11"
                  value={incident.location}
                  onChange={(e) => setIncident({ ...incident, location: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Accident Narrative / Description *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe how the accident occurred, impact area, road conditions, and external collision factors…"
                className="input text-xs"
                value={incident.description}
                onChange={(e) => setIncident({ ...incident, description: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Initial Claimed Amount (ETB)
                </label>
                {prefilledData?.coverageAmount && (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Policy Coverage Cap: {Number(prefilledData.coverageAmount).toLocaleString()} ETB
                  </span>
                )}
              </div>
              <input
                type="number"
                placeholder="50000"
                className="input h-11 font-mono"
                value={incident.estimatedAmount}
                onChange={(e) => setIncident({ ...incident, estimatedAmount: e.target.value })}
              />
            </div>

            <div className="flex justify-between pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                ← Back to Vehicle
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!incident.date || !incident.description.trim()) {
                    setError("Incident Date and Description narrative are required");
                    return;
                  }
                  setError("");
                  setStep(5);
                }}
                className="btn btn-primary text-xs py-2.5 px-6 font-semibold"
              >
                Proceed to Review & Confirm →
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Step 5: User Confirmation & Authoritative Submission                */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5 animate-fade-in">
            {/* Authoritative Confirmation Callout */}
            <div className="p-4 rounded-2xl bg-[#30D158]/10 border border-[#30D158]/30 text-xs text-white space-y-1.5 animate-fade-in">
              <div className="flex items-center gap-2 text-[#30D158] font-semibold">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Authoritative Intake Review & Confirmation</span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Review the prefilled policy data and any user-corrected values below. These verified values will be submitted as the default authoritative payload to the claims database.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-[11px] font-bold text-[#0A84FF] uppercase tracking-wider">
                    Policy & Insured Party
                  </span>
                  <span className="badge text-[10px] bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 font-semibold">
                    VERIFIED ACTIVE
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Policy Number</span>
                  <span className="font-mono text-white font-semibold">{policyNumber.toUpperCase()}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)] text-[11px]">Claimant Full Name</span>
                    {prefilledData?.fullName && (
                      claimant.fullName === prefilledData.fullName ? (
                        <span className="text-[10px] text-[#30D158]">Prefilled & Confirmed</span>
                      ) : (
                        <span className="text-[10px] text-[#FFD60A]">User Corrected</span>
                      )
                    )}
                  </div>
                  <span className="text-white font-semibold">{claimant.fullName}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Contact Phone</span>
                  <span className="font-mono text-white">{claimant.phone}</span>
                </div>
                {claimant.email && (
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">Email</span>
                    <span className="text-white">{claimant.email}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-[11px] font-bold text-[#30D158] uppercase tracking-wider">
                    Vehicle & Incident
                  </span>
                  <span className="badge text-[10px] bg-white/[0.06] text-[var(--text-secondary)] border border-white/10 font-mono">
                    {incident.date}
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)] text-[11px]">Vehicle Specification</span>
                    {prefilledData?.make && (
                      vehicle.make === prefilledData.make && vehicle.model === prefilledData.model ? (
                        <span className="text-[10px] text-[#30D158]">Prefilled & Confirmed</span>
                      ) : (
                        <span className="text-[10px] text-[#FFD60A]">User Corrected</span>
                      )
                    )}
                  </div>
                  <span className="text-white font-semibold">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)] text-[11px]">License Plate</span>
                    {prefilledData?.plate && (
                      vehicle.plate === prefilledData.plate ? (
                        <span className="text-[10px] text-[#30D158]">Prefilled & Confirmed</span>
                      ) : (
                        <span className="text-[10px] text-[#FFD60A]">User Corrected</span>
                      )
                    )}
                  </div>
                  <span className="font-mono text-white font-semibold">{vehicle.plate.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Accident Location</span>
                  <span className="text-white">{incident.location || "Addis Ababa"}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Claimed Amount</span>
                  <span className="font-mono font-bold text-[#64D2FF]">
                    {Number(incident.estimatedAmount || 0).toLocaleString()} ETB
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 text-xs space-y-1">
              <span className="text-[var(--text-muted)] block font-semibold text-[11px]">
                Incident Description & Narrative:
              </span>
              <p className="text-white/90 leading-relaxed italic">&ldquo;{incident.description}&rdquo;</p>
            </div>

            {/* Mandatory User Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/8 cursor-pointer select-none hover:bg-white/[0.05] transition-colors">
              <input
                type="checkbox"
                checked={confirmedReview}
                onChange={(e) => setConfirmedReview(e.target.checked)}
                className="checkbox mt-0.5"
              />
              <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                I have reviewed, confirmed, and verified that all prefilled policy records and user-corrected details above are accurate and ready to serve as the default intake payload for adjudication.
              </span>
            </label>

            <div className="flex justify-between pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                ← Back to Incident
              </button>
              <button
                id="submit-intake-btn"
                type="button"
                disabled={submitting || !confirmedReview}
                onClick={handleSubmit}
                className="btn btn-primary text-xs py-3 px-7 font-semibold shadow-md flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Submitting Intake Payload…</span>
                  </>
                ) : (
                  <span>Commit Confirmed Claim Intake →</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewClaimPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 w-full rounded-2xl" />}>
      <NewClaimForm />
    </Suspense>
  );
}
