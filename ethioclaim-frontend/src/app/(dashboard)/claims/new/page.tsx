"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClaim, verifyPolicy } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { PolicyVerificationResult } from "@/types";

const STEPS = [
  { id: 1, label: "Policy", desc: "Insurer Policy Number" },
  { id: 2, label: "Claimant", desc: "Personal Information" },
  { id: 3, label: "Vehicle", desc: "Vehicle & Registration" },
  { id: 4, label: "Incident", desc: "Accident Occurrence" },
  { id: 5, label: "Review", desc: "Adjudication & Submit" },
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
    name: "",
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
    if (!claimant.name || !claimant.phone) {
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
          name: claimant.name.trim(),
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
        <div className="w-16 h-16 rounded-full bg-[#30D158]/20 border border-[#30D158]/40 flex items-center justify-center mx-auto text-[#30D158]">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Claim Registered Successfully</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Claim Record ID in Adjudication Workflow</p>
          <p className="text-xl font-mono font-bold text-[#64D2FF] mt-2">{createdClaimNumber}</p>
        </div>

        <div className="card apple-glass p-6 text-left space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-[var(--text-muted)]">Insured Claimant</span>
            <span className="font-semibold text-white">{claimant.name}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-[var(--text-muted)]">Insured Vehicle</span>
            <span className="font-semibold text-white">{vehicle.make} {vehicle.model} ({vehicle.plate})</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-[var(--text-muted)]">Verified Policy</span>
            <span className="font-mono text-white">{policyNumber.toUpperCase()}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[var(--text-muted)]">Claim Status</span>
            <span className="badge text-[10px] bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/30">
              SUBMITTED
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={`/claims/${createdClaimId}/evidence`}
            className="btn btn-primary py-3 px-6 shadow-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Upload Photographic Evidence Now</span>
          </Link>
          <Link
            href={`/claims/${createdClaimId}`}
            className="btn btn-secondary py-3 px-5 flex items-center justify-center"
          >
            View Claim Details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] mb-2">
          <Link href="/claims" className="hover:text-white transition-colors">Claims</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">New Intake</span>
        </nav>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
          Motor Claim Intake
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Step {step} of {STEPS.length} — {STEPS[step - 1].desc}
        </p>
      </div>

      {/* Steps Pill Indicator */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => s.id < step && setStep(s.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              step === s.id
                ? "bg-[#0A84FF] text-white shadow-sm"
                : s.id < step
                ? "bg-[#30D158]/20 text-[#30D158] hover:bg-[#30D158]/30"
                : "bg-white/5 text-[var(--text-muted)] opacity-60"
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/30">
              {s.id < step ? "✓" : s.id}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center gap-2.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Card Form */}
      <div className="card apple-glass p-6 md:p-8 space-y-6">
        {/* Step 1: Policy */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Policy Number Lookup</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Exact lookup in insurer registry. Normalizes whitespace and casing.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="intake-policy-number" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                Policy Number *
              </label>
              <div className="flex gap-2">
                <input
                  id="intake-policy-number"
                  type="text"
                  placeholder="e.g. POL-2026-001"
                  className="input uppercase font-mono text-sm"
                  value={policyNumber}
                  onChange={(e) => {
                    setPolicyNumber(e.target.value);
                    setPolicyResult(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleVerifyPolicy()}
                  disabled={policyCheckLoading || !policyNumber.trim()}
                  className="btn btn-secondary px-4 text-xs font-semibold flex items-center gap-1.5"
                >
                  {policyCheckLoading ? "Checking…" : "Verify"}
                </button>
              </div>
            </div>

            {policyResult && (
              <div className="pt-2">
                {policyResult.found ? (
                  <div className="p-3.5 rounded-xl bg-[#30D158]/10 border border-[#30D158]/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[#30D158] font-semibold">
                      <span>✓ Policy Verified Active</span>
                      {policyResult.validTo && (
                        <span className="text-[var(--text-muted)] font-normal">
                          (Expires {formatDate(policyResult.validTo)})
                        </span>
                      )}
                    </div>
                    <span className="badge text-[10px] bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40">
                      {policyResult.status}
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#FF9F0A]/10 border border-[#FF9F0A]/30 text-xs text-[#FFD60A]">
                    Policy not found in registry. You may still proceed with intake as Policy Unverified.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Claimant */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Insured Claimant Details</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Primary party filing the claim
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="claimant-name" className="label text-xs uppercase text-[var(--text-muted)]">Full Name *</label>
                <input
                  id="claimant-name"
                  type="text"
                  placeholder="e.g. Abebe Bikila"
                  className="input text-xs"
                  value={claimant.name}
                  onChange={(e) => setClaimant({ ...claimant, name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="claimant-phone" className="label text-xs uppercase text-[var(--text-muted)]">Phone Number *</label>
                <input
                  id="claimant-phone"
                  type="tel"
                  placeholder="e.g. +251 911 234567"
                  className="input text-xs"
                  value={claimant.phone}
                  onChange={(e) => setClaimant({ ...claimant, phone: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="claimant-id" className="label text-xs uppercase text-[var(--text-muted)]">National ID / Kebele ID</label>
                <input
                  id="claimant-id"
                  type="text"
                  placeholder="e.g. ET-ID-88492"
                  className="input text-xs"
                  value={claimant.idNumber}
                  onChange={(e) => setClaimant({ ...claimant, idNumber: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="claimant-email" className="label text-xs uppercase text-[var(--text-muted)]">Email (Optional)</label>
                <input
                  id="claimant-email"
                  type="email"
                  placeholder="e.g. claimant@example.com"
                  className="input text-xs"
                  value={claimant.email}
                  onChange={(e) => setClaimant({ ...claimant, email: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Vehicle */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Insured Vehicle Specifications</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Vehicle registration details
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="vehicle-make" className="label text-xs uppercase text-[var(--text-muted)]">Make *</label>
                <input
                  id="vehicle-make"
                  type="text"
                  placeholder="e.g. Toyota"
                  className="input text-xs"
                  value={vehicle.make}
                  onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="vehicle-model" className="label text-xs uppercase text-[var(--text-muted)]">Model *</label>
                <input
                  id="vehicle-model"
                  type="text"
                  placeholder="e.g. Corolla"
                  className="input text-xs"
                  value={vehicle.model}
                  onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="vehicle-plate" className="label text-xs uppercase text-[var(--text-muted)]">License Plate Number *</label>
                <input
                  id="vehicle-plate"
                  type="text"
                  placeholder="e.g. 2-AA-B12345"
                  className="input text-xs font-mono uppercase"
                  value={vehicle.plate}
                  onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="vehicle-year" className="label text-xs uppercase text-[var(--text-muted)]">Model Year</label>
                <input
                  id="vehicle-year"
                  type="number"
                  placeholder="2024"
                  className="input text-xs"
                  value={vehicle.year}
                  onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="vehicle-color" className="label text-xs uppercase text-[var(--text-muted)]">Body Color</label>
                <input
                  id="vehicle-color"
                  type="text"
                  placeholder="e.g. Silver Metallic"
                  className="input text-xs"
                  value={vehicle.color}
                  onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="vehicle-vin" className="label text-xs uppercase text-[var(--text-muted)]">VIN / Chassis (Optional)</label>
                <input
                  id="vehicle-vin"
                  type="text"
                  placeholder="17-character VIN"
                  className="input text-xs font-mono uppercase"
                  value={vehicle.vin}
                  onChange={(e) => setVehicle({ ...vehicle, vin: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Incident */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Incident Details</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Collision date, location, and occurrence description
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="incident-date" className="label text-xs uppercase text-[var(--text-muted)]">Incident Date *</label>
                <input
                  id="incident-date"
                  type="date"
                  className="input text-xs"
                  value={incident.date}
                  onChange={(e) => setIncident({ ...incident, date: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="incident-location" className="label text-xs uppercase text-[var(--text-muted)]">Location</label>
                <input
                  id="incident-location"
                  type="text"
                  placeholder="e.g. Bole Medhanialem, Addis Ababa"
                  className="input text-xs"
                  value={incident.location}
                  onChange={(e) => setIncident({ ...incident, location: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="incident-amount" className="label text-xs uppercase text-[var(--text-muted)]">Initial Claimed Amount (ETB)</label>
              <input
                id="incident-amount"
                type="number"
                placeholder="e.g. 50000"
                className="input text-xs font-mono"
                value={incident.estimatedAmount}
                onChange={(e) => setIncident({ ...incident, estimatedAmount: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="incident-description" className="label text-xs uppercase text-[var(--text-muted)]">Collision Occurrence Description *</label>
              <textarea
                id="incident-description"
                rows={4}
                placeholder="Describe how the accident happened, damages observed, and any other vehicles involved…"
                className="input text-xs py-2.5 leading-relaxed"
                value={incident.description}
                onChange={(e) => setIncident({ ...incident, description: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-4 text-xs">
            <div>
              <h3 className="text-base font-bold text-white">Review Claim Before Submission</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Ensure details are accurate. Evidence photos are uploaded on the next step.
              </p>
            </div>

            <div className="divide-y divide-white/5 rounded-xl bg-white/[0.02] border border-white/5 p-4 space-y-3">
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Policy Number</span>
                <span className="font-mono font-semibold text-white">{policyNumber.toUpperCase()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Claimant</span>
                <span className="font-semibold text-white">{claimant.name} ({claimant.phone})</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Vehicle</span>
                <span className="font-semibold text-white">{vehicle.year} {vehicle.make} {vehicle.model} — {vehicle.plate}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Incident Date</span>
                <span className="text-white">{formatDate(incident.date)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Initial Claim Estimate</span>
                <span className="font-mono font-semibold text-[#64D2FF]">
                  {parseFloat(incident.estimatedAmount || "0").toLocaleString()} ETB
                </span>
              </div>
              <div className="pt-2">
                <span className="text-[var(--text-muted)] block mb-1">Occurrence Narrative:</span>
                <p className="text-[var(--text-secondary)] italic leading-relaxed">
                  &ldquo;{incident.description}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="btn btn-secondary text-xs font-semibold px-4"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep(step + 1);
              }}
              className="btn btn-primary text-xs font-semibold px-5"
            >
              Continue →
            </button>
          ) : (
            <button
              id="submit-claim-btn"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary text-xs font-semibold px-6 shadow-sm flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving Claim…</span>
                </>
              ) : (
                <span>Submit Claim</span>
              )}
            </button>
          )}
        </div>
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
