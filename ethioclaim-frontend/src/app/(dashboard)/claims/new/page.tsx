"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClaim, verifyPolicy } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { PolicyVerificationResult } from "@/types";

const STEPS = [
  { id: 1, label: "Policy", desc: "Policy Verification" },
  { id: 2, label: "Claimant", desc: "Personal Information" },
  { id: 3, label: "Vehicle", desc: "Vehicle & License Plate" },
  { id: 4, label: "Incident", desc: "Accident Occurrence" },
  { id: 5, label: "Review", desc: "Confirmation & Intake" },
];

function NewClaimForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdClaimId, setCreatedClaimId] = useState<string | null>(null);
  const [createdClaimNumber, setCreatedClaimNumber] = useState<string | null>(null);

  // Form State
  const [policyNumber, setPolicyNumber] = useState(searchParams.get("policyNumber") || "");
  const [policyCheckLoading, setPolicyCheckLoading] = useState(false);
  const [policyResult, setPolicyResult] = useState<PolicyVerificationResult | null>(null);

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

  useEffect(() => {
    const p = searchParams.get("policyNumber");
    if (p) {
      setPolicyNumber(p);
      handleVerifyPolicy(p);
    }
  }, [searchParams]);

  async function handleVerifyPolicy(num?: string) {
    const val = (num || policyNumber).trim();
    if (!val) return;
    setPolicyCheckLoading(true);
    setError("");
    try {
      const res = await verifyPolicy(val);
      setPolicyResult(res);
    } catch {
      setPolicyResult({ found: false, status: "NOT_FOUND" });
    } finally {
      setPolicyCheckLoading(false);
    }
  }

  async function handleSubmit() {
    setError("");
    if (!policyNumber.trim()) {
      setError("Policy Number is required");
      setStep(1);
      return;
    }
    if (!claimant.fullName || !claimant.phone) {
      setError("Claimant Name and Phone Number are required");
      setStep(2);
      return;
    }
    if (!vehicle.make || !vehicle.model || !vehicle.plate) {
      setError("Vehicle Make, Model, and License Plate are required");
      setStep(3);
      return;
    }
    if (!incident.date || !incident.description) {
      setError("Incident Date and Description are required");
      setStep(4);
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
            Claim Registered Successfully
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Claim Record ID in Adjudication Workflow</p>
          <p className="text-xl font-mono font-bold text-[#64D2FF] mt-2">{createdClaimNumber}</p>
        </div>

        <div className="card apple-glass p-6 text-left space-y-3.5 text-xs">
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-[var(--text-muted)]">Insured Claimant</span>
            <span className="font-semibold text-white">{claimant.fullName}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-[var(--text-muted)]">Insured Vehicle</span>
            <span className="font-semibold text-white">{vehicle.make} {vehicle.model} ({vehicle.plate})</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-[var(--text-muted)]">Verified Policy</span>
            <span className="font-mono text-white font-semibold">{policyNumber.toUpperCase()}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-[var(--text-muted)]">Initial Status</span>
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

      {/* Steps Pill Stepper */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => s.id < step && setStep(s.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all select-none ${step === s.id
                ? "bg-[#0A84FF] text-white shadow-sm"
                : s.id < step
                  ? "bg-[#30D158]/20 text-[#30D158] hover:bg-[#30D158]/30 cursor-pointer"
                  : "bg-white/5 text-[var(--text-muted)] opacity-60 cursor-default"
              }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/30 font-bold">
              {s.id < step ? "✓" : s.id}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#FF453A]/12 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center gap-2.5 animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Card Form */}
      <div className="card apple-glass p-6 md:p-8 space-y-6">
        {/* Step 1: Policy */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Policy Number Lookup</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Exact lookup in insurer registry. Normalizes whitespace and casing.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="intake-policy-number" className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Policy Number *
              </label>
              <div className="flex gap-2">
                <input
                  id="intake-policy-number"
                  type="text"
                  placeholder="e.g. POL-2026-001"
                  className="input font-mono text-sm uppercase h-11"
                  value={policyNumber}
                  onChange={(e) => {
                    setPolicyNumber(e.target.value);
                    if (policyResult) setPolicyResult(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleVerifyPolicy()}
                  disabled={policyCheckLoading || !policyNumber.trim()}
                  className="btn btn-secondary text-xs px-4 h-11 font-semibold flex-shrink-0"
                >
                  {policyCheckLoading ? "Verifying…" : "Check"}
                </button>
              </div>

              {/* Sample Quick Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-[var(--text-muted)]">Samples:</span>
                {["POL-2026-001", "POL-2025-88421", "AWASH-POL-902"].map((p) => (
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

            {policyResult && (
              <div className={`p-4 rounded-2xl border text-xs animate-fade-in ${policyResult.found
                  ? "bg-[#30D158]/[0.08] border-[#30D158]/30 text-white"
                  : "bg-[#FF9F0A]/[0.08] border-[#FF9F0A]/30 text-[#FFD60A]"
                }`}>
                {policyResult.found ? (
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#30D158]" />
                    <span className="font-semibold text-[#30D158]">Policy Verified Active</span>
                    <span className="text-white/80">({formatDate(policyResult.validFrom)} — {formatDate(policyResult.validTo)})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF9F0A]" />
                    <span>Policy not verified in database. You may still proceed with intake under POLICY_UNVERIFIED status.</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => {
                  if (!policyNumber.trim()) {
                    setError("Please enter a policy number");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="btn btn-primary text-xs py-2.5 px-6 font-semibold"
              >
                Continue to Claimant Information →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Claimant */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Claimant Information</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Contact and identification details for the insured vehicle driver or owner
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Full Name *</label>
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
                  <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Phone Number *</label>
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
                  <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Email (Optional)</label>
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
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">National ID / Kebele Card (Optional)</label>
                <input
                  type="text"
                  placeholder="ET-ID-123456"
                  className="input h-11 font-mono"
                  value={claimant.idNumber}
                  onChange={(e) => setClaimant({ ...claimant, idNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                ← Back
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
                Continue to Vehicle →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Vehicle */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Insured Vehicle Information</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Vehicle specifications for computer vision validation and damage localization
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Make *</label>
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
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Model *</label>
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
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">License Plate *</label>
                <input
                  type="text"
                  required
                  placeholder="AA-2-B12345"
                  className="input h-11 font-mono uppercase"
                  value={vehicle.plate}
                  onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Model Year</label>
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
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Color (Optional)</label>
                <input
                  type="text"
                  placeholder="Silver / Gray"
                  className="input h-11"
                  value={vehicle.color}
                  onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Chassis / VIN (Optional)</label>
                <input
                  type="text"
                  placeholder="17-character VIN"
                  className="input h-11 font-mono uppercase"
                  value={vehicle.vin}
                  onChange={(e) => setVehicle({ ...vehicle, vin: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                ← Back
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
                Continue to Incident Details →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Incident */}
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
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Incident Date *</label>
                <input
                  type="date"
                  required
                  className="input h-11"
                  value={incident.date}
                  onChange={(e) => setIncident({ ...incident, date: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Accident Location</label>
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
              <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Accident Narrative / Description *</label>
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
              <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Initial Claimed Amount (ETB)</label>
              <input
                type="number"
                placeholder="50000"
                className="input h-11 font-mono"
                value={incident.estimatedAmount}
                onChange={(e) => setIncident({ ...incident, estimatedAmount: e.target.value })}
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!incident.date || !incident.description.trim()) {
                    setError("Incident Date and Description are required");
                    return;
                  }
                  setError("");
                  setStep(5);
                }}
                className="btn btn-primary text-xs py-2.5 px-6 font-semibold"
              >
                Review & Confirm →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Review Claim Summary</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Confirm all particulars before committing to the adjudication registry
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 space-y-2 text-xs">
                <span className="text-[11px] font-bold text-[#0A84FF] uppercase tracking-wider block">Policy & Claimant</span>
                <div>
                  <span className="text-[var(--text-muted)] block">Policy Number</span>
                  <span className="font-mono text-white font-semibold">{policyNumber.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Claimant</span>
                  <span className="text-white font-medium">{claimant.fullName}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Phone</span>
                  <span className="font-mono text-white">{claimant.phone}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 space-y-2 text-xs">
                <span className="text-[11px] font-bold text-[#30D158] uppercase tracking-wider block">Vehicle & Incident</span>
                <div>
                  <span className="text-[var(--text-muted)] block">Vehicle</span>
                  <span className="text-white font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">License Plate</span>
                  <span className="font-mono text-white font-semibold">{vehicle.plate.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Incident Date</span>
                  <span className="text-white">{incident.date}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 text-xs space-y-1">
              <span className="text-[var(--text-muted)] block font-semibold">Incident Narrative:</span>
              <p className="text-white/90 leading-relaxed italic">&ldquo;{incident.description}&rdquo;</p>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                ← Back
              </button>
              <button
                id="submit-intake-btn"
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="btn btn-primary text-xs py-3 px-7 font-semibold shadow-md flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Registering Claim…</span>
                  </>
                ) : (
                  <span>Commit Claim Intake →</span>
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
