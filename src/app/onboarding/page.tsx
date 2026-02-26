"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { createBereavedCase, createPreneedPlan } from "@/lib/actions/onboarding";

type Step = "use_case" | "details" | "consent" | "creating";

const IMMEDIATE_NEEDS = [
  "Funeral/memorial service",
  "Cremation",
  "Burial",
  "Transportation of remains",
  "Obituary writing",
  "Death certificates",
  "Legal/probate guidance",
  "Grief counseling referral",
];

const RELATIONSHIPS = [
  { value: "spouse", label: "Spouse or Partner" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "other", label: "Other Family/Friend" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Pacific/Honolulu",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("use_case");
  const [useCase, setUseCase] = useState<"BEREAVED" | "PRENEED" | null>(null);
  const [error, setError] = useState("");

  // Bereaved details
  const [relationship, setRelationship] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [dateOfDeath, setDateOfDeath] = useState("");
  const [hasExisting, setHasExisting] = useState(false);
  const [needs, setNeeds] = useState<string[]>([]);
  const [budgetTarget, setBudgetTarget] = useState(5000);
  const [budgetMax, setBudgetMax] = useState(8000);

  // Communication consent
  const [allowOutbound, setAllowOutbound] = useState(true);
  const [allowEmail, setAllowEmail] = useState(true);
  const [allowSms, setAllowSms] = useState(true);
  const [allowCalls, setAllowCalls] = useState(true);
  const [callingStart, setCallingStart] = useState("09:00");
  const [callingEnd, setCallingEnd] = useState("17:00");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [approvalLevel, setApprovalLevel] = useState<"LEVEL_1_REVIEW_ALL" | "LEVEL_2_AUTO_OUTREACH">("LEVEL_1_REVIEW_ALL");
  const [disclosureMode, setDisclosureMode] = useState<"FULL" | "MINIMAL">("FULL");
  const [contactFirstName, setContactFirstName] = useState("");

  // Preneed
  const [planTitle, setPlanTitle] = useState("");

  function toggleNeed(need: string) {
    setNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  }

  async function handleSubmitBereaved() {
    setError("");
    setStep("creating");

    try {
      const result = await createBereavedCase({
        relationship,
        city,
        state,
        dateOfDeath: dateOfDeath || undefined,
        hasExistingFuneralHome: hasExisting,
        immediateNeeds: needs,
        budgetTarget: budgetTarget * 100,
        budgetMax: budgetMax * 100,
        allowOutbound,
        allowEmail,
        allowSms,
        allowCalls,
        callingWindowStart: callingStart,
        callingWindowEnd: callingEnd,
        timezone,
        approvalLevel,
        disclosureMode,
        contactFirstName,
      });
      if (result?.error) {
        const msg = typeof result.error === "string"
          ? result.error
          : "Validation failed. Please check your inputs.";
        setError(msg);
        setStep("consent");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setStep("consent");
    }
  }

  async function handleSubmitPreneed() {
    setStep("creating");
    try {
      const result = await createPreneedPlan({
        title: planTitle || "My Pre-Need Plan",
      });
      if (result?.error) {
        const msg = typeof result.error === "string"
          ? result.error
          : "Validation failed. Please check your inputs.";
        setError(msg);
        setStep("use_case");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setStep("use_case");
    }
  }

  const stepNumber = step === "use_case" ? 1 : step === "details" ? 2 : 3;

  return (
    <div className="min-h-screen bg-stone-25">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-stone-900">LifeFarewell</span>
          </Link>
          {useCase === "BEREAVED" && step !== "creating" && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              Step {stepNumber} of 3
            </div>
          )}
        </div>
        {useCase === "BEREAVED" && step !== "creating" && (
          <div className="mx-auto max-w-2xl px-6 pb-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    s <= stepNumber ? "bg-stone-900" : "bg-stone-200"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Step 1: Use case selection */}
        {step === "use_case" && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-stone-900">
              How can we help you?
            </h1>
            <p className="mt-2 text-stone-500">
              We&apos;re here to support you through this process.
            </p>

            <div className="mt-8 grid gap-4">
              <button
                onClick={() => {
                  setUseCase("BEREAVED");
                  setStep("details");
                }}
                className="group flex items-start gap-4 rounded-2xl border-2 border-stone-200 bg-white p-6 text-left transition-all hover:border-stone-400 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 transition-colors group-hover:bg-stone-200">
                  <Heart className="h-6 w-6 text-stone-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">
                    I&apos;m handling arrangements for someone who passed away
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Our concierge will contact funeral homes, gather quotes,
                    and help you compare options.
                  </p>
                </div>
                <ArrowRight className="ml-auto mt-1 h-5 w-5 shrink-0 text-stone-400 transition-colors group-hover:text-stone-700" />
              </button>

              <button
                onClick={() => {
                  setUseCase("PRENEED");
                }}
                className="group flex items-start gap-4 rounded-2xl border-2 border-stone-200 bg-white p-6 text-left transition-all hover:border-stone-300 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 transition-colors group-hover:bg-stone-200">
                  <svg className="h-6 w-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">
                    I&apos;m planning ahead for myself
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Document your preferences and prepare in advance.
                  </p>
                </div>
                <ArrowRight className="ml-auto mt-1 h-5 w-5 shrink-0 text-stone-400 transition-colors group-hover:text-stone-700" />
              </button>
            </div>

            {useCase === "PRENEED" && (
              <div className="mt-6 animate-fade-in rounded-2xl border border-stone-200 bg-white p-6">
                <h3 className="font-semibold text-stone-900">
                  Name your plan
                </h3>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                  placeholder="e.g., My Wishes"
                />
                <button
                  onClick={handleSubmitPreneed}
                  className="mt-4 rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
                >
                  Create Plan
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Bereaved Details */}
        {step === "details" && (
          <div className="animate-fade-in">
            <button
              onClick={() => setStep("use_case")}
              className="mb-6 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <h1 className="text-2xl font-semibold text-stone-900">
              Tell us about your situation
            </h1>
            <p className="mt-2 text-stone-500">
              This helps us find the right options for you. All fields can be updated later.
            </p>

            <div className="mt-8 space-y-6">
              {/* Relationship */}
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Your relationship to the deceased
                </label>
                <div className="flex flex-wrap gap-2">
                  {RELATIONSHIPS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRelationship(r.value)}
                      className={`rounded-full border px-4 py-2 text-sm transition-all ${
                        relationship === r.value
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                    placeholder="e.g., Livermore"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                  >
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date of death */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Date of death <span className="text-stone-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={dateOfDeath}
                  onChange={(e) => setDateOfDeath(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              {/* Existing funeral home */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Have you already engaged a funeral home?
                </label>
                <div className="flex gap-3">
                  {[
                    { value: true, label: "Yes" },
                    { value: false, label: "No" },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setHasExisting(opt.value)}
                      className={`rounded-xl border px-6 py-2.5 text-sm transition-all ${
                        hasExisting === opt.value
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Immediate needs */}
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  What do you need help with?
                </label>
                <div className="flex flex-wrap gap-2">
                  {IMMEDIATE_NEEDS.map((need) => (
                    <button
                      key={need}
                      onClick={() => toggleNeed(need)}
                      className={`rounded-full border px-4 py-2 text-sm transition-all ${
                        needs.includes(need)
                          ? "border-amber-600 bg-amber-50 text-amber-800"
                          : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                      }`}
                    >
                      {needs.includes(need) && <Check className="mr-1 inline h-3.5 w-3.5" />}
                      {need}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Target budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                    <input
                      type="number"
                      value={budgetTarget}
                      onChange={(e) => setBudgetTarget(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-300 py-3 pl-8 pr-4 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Maximum budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                    <input
                      type="number"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-300 py-3 pl-8 pr-4 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                onClick={() => {
                  if (!relationship || !city) {
                    setError("Please fill in your relationship and city");
                    return;
                  }
                  if (needs.length === 0) {
                    setError("Please select at least one need");
                    return;
                  }
                  setError("");
                  setStep("consent");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-8 py-3 text-sm font-medium text-white hover:bg-stone-800"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <p className="mt-3 text-right text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        {/* Step 3: Communication Consent */}
        {step === "consent" && (
          <div className="animate-fade-in">
            <button
              onClick={() => setStep("details")}
              className="mb-6 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <h1 className="text-2xl font-semibold text-stone-900">
              Communication preferences
            </h1>
            <p className="mt-2 text-stone-500">
              Control how our concierge reaches out to vendors on your behalf.
              You can change these settings at any time.
            </p>

            <div className="mt-8 space-y-6">
              {/* Your name for disclosure */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Your first name <span className="text-stone-400">(used in disclosure to vendors)</span>
                </label>
                <input
                  type="text"
                  value={contactFirstName}
                  onChange={(e) => setContactFirstName(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                  placeholder="Your first name"
                />
              </div>

              {/* Allow outbound */}
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-stone-900">Allow outbound contact on my behalf</h3>
                    <p className="mt-1 text-sm text-stone-500">
                      Our concierge will contact funeral homes and vendors to gather information and quotes.
                    </p>
                  </div>
                  <button
                    onClick={() => setAllowOutbound(!allowOutbound)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      allowOutbound ? "bg-stone-900" : "bg-stone-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        allowOutbound ? "translate-x-5.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Channels */}
              <div>
                <label className="mb-3 block text-sm font-medium text-stone-700">
                  Allowed channels
                </label>
                <div className="space-y-3">
                  {[
                    { key: "email", label: "Email", value: allowEmail, setter: setAllowEmail },
                    { key: "sms", label: "SMS/Text", value: allowSms, setter: setAllowSms },
                    { key: "calls", label: "Phone calls", value: allowCalls, setter: setAllowCalls },
                  ].map((ch) => (
                    <label
                      key={ch.key}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:bg-stone-50"
                    >
                      <input
                        type="checkbox"
                        checked={ch.value}
                        onChange={() => ch.setter(!ch.value)}
                        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                      />
                      <span className="text-sm font-medium text-stone-700">{ch.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Calling window */}
              {allowCalls && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Call from</label>
                    <input
                      type="time"
                      value={callingStart}
                      onChange={(e) => setCallingStart(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Call until</label>
                    <input
                      type="time"
                      value={callingEnd}
                      onChange={(e) => setCallingEnd(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz.replace("America/", "").replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Approval level */}
              <div>
                <label className="mb-3 block text-sm font-medium text-stone-700">
                  Approval level
                </label>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-200 bg-white p-4 transition-colors has-[:checked]:border-stone-900 has-[:checked]:bg-stone-50">
                    <input
                      type="radio"
                      name="approval"
                      checked={approvalLevel === "LEVEL_1_REVIEW_ALL"}
                      onChange={() => setApprovalLevel("LEVEL_1_REVIEW_ALL")}
                      className="mt-0.5 h-4 w-4 border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <div>
                      <span className="text-sm font-semibold text-stone-900">Review everything</span>
                      <p className="mt-0.5 text-xs text-stone-500">
                        Approve every email, SMS, and call before it&apos;s sent. Maximum control.
                      </p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-200 bg-white p-4 transition-colors has-[:checked]:border-stone-900 has-[:checked]:bg-stone-50">
                    <input
                      type="radio"
                      name="approval"
                      checked={approvalLevel === "LEVEL_2_AUTO_OUTREACH"}
                      onChange={() => setApprovalLevel("LEVEL_2_AUTO_OUTREACH")}
                      className="mt-0.5 h-4 w-4 border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <div>
                      <span className="text-sm font-semibold text-stone-900">Auto outreach, approve commitments</span>
                      <p className="mt-0.5 text-xs text-stone-500">
                        Initial outreach and follow-ups sent automatically. You approve bookings and payments.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Disclosure mode */}
              <div>
                <label className="mb-3 block text-sm font-medium text-stone-700">
                  Disclosure level
                </label>
                <p className="mb-3 text-xs text-stone-400">
                  We always disclose that we&apos;re an assistant — we never pretend to be you.
                </p>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-200 bg-white p-4 transition-colors has-[:checked]:border-stone-900 has-[:checked]:bg-stone-50">
                    <input
                      type="radio"
                      name="disclosure"
                      checked={disclosureMode === "FULL"}
                      onChange={() => setDisclosureMode("FULL")}
                      className="mt-0.5 h-4 w-4 border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <div>
                      <span className="text-sm font-semibold text-stone-900">Full disclosure</span>
                      <p className="mt-0.5 text-xs text-stone-500">
                        &quot;I&apos;m an assistant from LifeFarewell, contacting you on behalf of [Name]...&quot;
                      </p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-200 bg-white p-4 transition-colors has-[:checked]:border-stone-900 has-[:checked]:bg-stone-50">
                    <input
                      type="radio"
                      name="disclosure"
                      checked={disclosureMode === "MINIMAL"}
                      onChange={() => setDisclosureMode("MINIMAL")}
                      className="mt-0.5 h-4 w-4 border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <div>
                      <span className="text-sm font-semibold text-stone-900">Minimal disclosure</span>
                      <p className="mt-0.5 text-xs text-stone-500">
                        &quot;I&apos;m assisting the family coordinating arrangements.&quot; (Still discloses assistance)
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-10 flex justify-end">
              <button
                onClick={() => {
                  if (!contactFirstName) {
                    setError("Please enter your first name for disclosure");
                    return;
                  }
                  if (!allowOutbound) {
                    setError("Outbound contact must be enabled to use the concierge");
                    return;
                  }
                  handleSubmitBereaved();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-8 py-3 text-sm font-medium text-white hover:bg-stone-800"
              >
                Create my case <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Creating state */}
        {step === "creating" && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-stone-200 border-t-stone-900" />
            <p className="mt-6 text-lg font-medium text-stone-900">
              Setting up your case...
            </p>
            <p className="mt-2 text-sm text-stone-500">
              We&apos;re preparing your concierge console.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
