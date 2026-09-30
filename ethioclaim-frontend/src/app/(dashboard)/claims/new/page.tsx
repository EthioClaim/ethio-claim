"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClaim } from "@/lib/api";

const STEPS = [
  { id: 1, label: "Claimant", desc: "Personal information" },
  { id: 2, label: "Vehicle",  desc: "Vehicle details" },
  { id: 3, label: "Incident", desc: "Accident description" },
  { id: 4, label: "Policy",   desc: "Insurance policy" },
  { id: 5, label: "Review",   desc: "Confirm & submit" },
];

type FormData = {
  claimant: { name: string; phone: string; email: string; idNumber: string };
  vehicle:  { make: string; model: string; year: string; plate: string; color: string; vin: string };
  incident: { date: string; location: string; description: string; estimatedAmount: string };
  policy:   { policyNumber: string; insurer: string; type: string };
};

const INITIAL: FormData = {
  claimant: { name: "", phone: "", email: "", idNumber: "" },
  vehicle:  { make: "", model: "", year: "2023", plate: "", color: "", vin: "" },
  incident: { date: "", location: "", description: "", estimatedAmount: "" },
  policy:   { policyNumber: "", insurer: "", type: "Comprehensive" },
};

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
              style={{
                background: step.id < current ? "#10b981"
                  : step.id === current ? "#3b82f6"
                  : "var(--bg-elevated)",
                color: step.id <= current ? "#fff" : "var(--text-muted)",
                border: step.id === current ? "2px solid #93c5fd" : "1px solid var(--border)",
              }}
            >
              {step.id < current ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : step.id}
            </div>
            <span className="text-xs hidden sm:block" style={{ color: step.id === current ? "#93c5fd" : "var(--text-muted)" }}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="h-px flex-1 mx-2" style={{ background: step.id < current ? "#10b981" : "var(--border)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

export default function NewClaimPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newClaimNumber, setNewClaimNumber] = useState("");

  const update = (section: keyof FormData, field: string, value: string) => {
    setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));
  };

  async function handleSubmit() {
    setSubmitting(true);
    const result = await createClaim({
      claimant: { id: "new", ...form.claimant },
      vehicle:  { id: "new", ...form.vehicle, year: parseInt(form.vehicle.year) },
      policy:   { id: "new", ...form.policy, startDate: "", endDate: "", status: "ACTIVE" as const },
      incidentDate: form.incident.date,
      accidentDescription: form.incident.description,
      estimatedAmount: parseFloat(form.incident.estimatedAmount) || 0,
    });
    setNewClaimNumber(result.claimNumber);
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(16,185,129,0.1)", border: "2px solid #10b981" }}>
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#10b981">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Space Grotesk" }}>Claim Submitted!</h2>
        <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>Your claim has been created successfully.</p>
        <p className="text-lg font-mono font-bold mb-6" style={{ color: "#93c5fd" }}>{newClaimNumber}</p>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Next step: upload evidence (photos and documents) to continue AI processing.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setForm(INITIAL); setStep(1); setSubmitted(false); }} className="btn btn-secondary">
            Submit Another
          </button>
          <button onClick={() => router.push("/claims")} className="btn btn-primary">
            View All Claims →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk" }}>Submit New Claim</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Step {step} of {STEPS.length} — {STEPS[step - 1].desc}</p>
      </div>

      <StepIndicator current={step} />

      <div className="card p-6 animate-fade-in-up">
        {/* Step 1: Claimant */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold mb-4">Claimant Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name *" id="claimant-name">
                <input id="claimant-name" className="input" value={form.claimant.name} onChange={(e) => update("claimant", "name", e.target.value)} placeholder="Tesfaye Alemu" />
              </Field>
              <Field label="National ID *" id="claimant-id">
                <input id="claimant-id" className="input" value={form.claimant.idNumber} onChange={(e) => update("claimant", "idNumber", e.target.value)} placeholder="ET-ID-112233" />
              </Field>
              <Field label="Phone Number *" id="claimant-phone">
                <input id="claimant-phone" className="input" value={form.claimant.phone} onChange={(e) => update("claimant", "phone", e.target.value)} placeholder="+251 9XX XXX XXXX" />
              </Field>
              <Field label="Email Address" id="claimant-email">
                <input id="claimant-email" type="email" className="input" value={form.claimant.email} onChange={(e) => update("claimant", "email", e.target.value)} placeholder="name@email.com" />
              </Field>
            </div>
          </div>
        )}

        {/* Step 2: Vehicle */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold mb-4">Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Make *" id="vehicle-make">
                <input id="vehicle-make" className="input" value={form.vehicle.make} onChange={(e) => update("vehicle", "make", e.target.value)} placeholder="Toyota" />
              </Field>
              <Field label="Model *" id="vehicle-model">
                <input id="vehicle-model" className="input" value={form.vehicle.model} onChange={(e) => update("vehicle", "model", e.target.value)} placeholder="Corolla" />
              </Field>
              <Field label="Year *" id="vehicle-year">
                <input id="vehicle-year" type="number" className="input" value={form.vehicle.year} onChange={(e) => update("vehicle", "year", e.target.value)} min="2000" max="2027" />
              </Field>
              <Field label="Color" id="vehicle-color">
                <input id="vehicle-color" className="input" value={form.vehicle.color} onChange={(e) => update("vehicle", "color", e.target.value)} placeholder="White" />
              </Field>
              <Field label="License Plate *" id="vehicle-plate">
                <input id="vehicle-plate" className="input" value={form.vehicle.plate} onChange={(e) => update("vehicle", "plate", e.target.value)} placeholder="AA-12345-A" />
              </Field>
              <Field label="VIN (optional)" id="vehicle-vin">
                <input id="vehicle-vin" className="input" value={form.vehicle.vin} onChange={(e) => update("vehicle", "vin", e.target.value)} placeholder="1HGBH41JXMN109186" />
              </Field>
            </div>
          </div>
        )}

        {/* Step 3: Incident */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold mb-4">Incident Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Incident Date *" id="incident-date">
                <input id="incident-date" type="date" className="input" value={form.incident.date} onChange={(e) => update("incident", "date", e.target.value)} />
              </Field>
              <Field label="Estimated Claim Amount (ETB) *" id="incident-amount">
                <input id="incident-amount" type="number" className="input" value={form.incident.estimatedAmount} onChange={(e) => update("incident", "estimatedAmount", e.target.value)} placeholder="85000" />
              </Field>
            </div>
            <Field label="Incident Location" id="incident-location">
              <input id="incident-location" className="input" value={form.incident.location} onChange={(e) => update("incident", "location", e.target.value)} placeholder="Bole Road, Addis Ababa" />
            </Field>
            <Field label="Accident Description *" id="incident-description">
              <textarea
                id="incident-description"
                className="input"
                rows={5}
                value={form.incident.description}
                onChange={(e) => update("incident", "description", e.target.value)}
                placeholder="Describe how the accident occurred, what was damaged, and any other relevant information…"
                style={{ resize: "vertical" }}
              />
            </Field>
          </div>
        )}

        {/* Step 4: Policy */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold mb-4">Insurance Policy</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Policy Number *" id="policy-number">
                <input id="policy-number" className="input" value={form.policy.policyNumber} onChange={(e) => update("policy", "policyNumber", e.target.value)} placeholder="POL-2025-88421" />
              </Field>
              <Field label="Insurer *" id="policy-insurer">
                <input id="policy-insurer" className="input" value={form.policy.insurer} onChange={(e) => update("policy", "insurer", e.target.value)} placeholder="Awash Insurance" />
              </Field>
              <Field label="Policy Type" id="policy-type">
                <select id="policy-type" className="select w-full" value={form.policy.type} onChange={(e) => update("policy", "type", e.target.value)}>
                  <option>Comprehensive</option>
                  <option>Third Party</option>
                  <option>Third Party+</option>
                </select>
              </Field>
            </div>
            <div className="rounded-lg p-4 mt-2" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-sm" style={{ color: "#93c5fd" }}>
                💡 Policy status will be automatically verified against the insurer database after submission.
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold mb-4">Review & Submit</h3>
            {[
              { label: "Claimant", data: [["Name", form.claimant.name], ["Phone", form.claimant.phone], ["ID", form.claimant.idNumber]] },
              { label: "Vehicle",  data: [["Make/Model", `${form.vehicle.make} ${form.vehicle.model}`], ["Year", form.vehicle.year], ["Plate", form.vehicle.plate]] },
              { label: "Incident", data: [["Date", form.incident.date], ["Amount", `${parseInt(form.incident.estimatedAmount || "0").toLocaleString()} ETB`], ["Location", form.incident.location]] },
              { label: "Policy",   data: [["Number", form.policy.policyNumber], ["Insurer", form.policy.insurer], ["Type", form.policy.type]] },
            ].map((section) => (
              <div key={section.label} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                  {section.label}
                </div>
                <div className="grid grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
                  {section.data.map(([k, v]) => (
                    <div key={k} className="px-4 py-3" style={{ background: "var(--bg-card)" }}>
                      <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{k}</div>
                      <div className="text-sm font-medium">{v || <span style={{ color: "var(--text-muted)" }}>—</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="p-4 rounded-lg" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p className="text-sm" style={{ color: "#fcd34d" }}>
                ⚠️ After submission, you will be prompted to upload evidence (photos and documents). AI analysis will begin once all required evidence is uploaded.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-5">
        <button
          className="btn btn-secondary"
          onClick={() => step > 1 ? setStep(step - 1) : router.back()}
          id="claim-form-back"
        >
          ← {step === 1 ? "Cancel" : "Back"}
        </button>
        {step < STEPS.length ? (
          <button
            className="btn btn-primary"
            onClick={() => setStep(step + 1)}
            id="claim-form-next"
          >
            Next →
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
            id="claim-form-submit"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Submitting…
              </span>
            ) : "Submit Claim ✓"}
          </button>
        )}
      </div>
    </div>
  );
}
