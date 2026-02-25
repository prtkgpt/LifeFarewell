"use client";

import { useState } from "react";
import { Save, Loader2, Check, Plus, X } from "lucide-react";

interface Preference {
  id: string;
  key: string;
  value: string;
}

const COMMON_PREFERENCE_KEYS = [
  "Service Type",
  "Burial or Cremation",
  "Location Preference",
  "Budget Range",
  "Religious/Cultural Needs",
  "Music Preferences",
  "Floral Preferences",
  "Special Requests",
];

export function PlanPreferenceForm({
  planId,
  existingPreferences,
}: {
  planId: string;
  existingPreferences: Preference[];
}) {
  const [preferences, setPreferences] = useState<
    { key: string; value: string }[]
  >(
    existingPreferences.length > 0
      ? existingPreferences.map((p) => ({ key: p.key, value: p.value }))
      : [{ key: "", value: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addPreference() {
    setPreferences([...preferences, { key: "", value: "" }]);
  }

  function removePreference(index: number) {
    setPreferences(preferences.filter((_, i) => i !== index));
  }

  function updatePreference(
    index: number,
    field: "key" | "value",
    val: string
  ) {
    const updated = [...preferences];
    updated[index][field] = val;
    setPreferences(updated);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const validPrefs = preferences.filter(
      (p) => p.key.trim() && p.value.trim()
    );

    try {
      const res = await fetch(`/api/plans/${planId}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: validPrefs }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="space-y-3">
        {preferences.map((pref, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex-1">
              <select
                value={
                  COMMON_PREFERENCE_KEYS.includes(pref.key) ? pref.key : "_custom"
                }
                onChange={(e) => {
                  if (e.target.value === "_custom") {
                    updatePreference(i, "key", "");
                  } else {
                    updatePreference(i, "key", e.target.value);
                  }
                }}
                className="mb-1.5 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              >
                <option value="">Select a category...</option>
                {COMMON_PREFERENCE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
                <option value="_custom">Custom...</option>
              </select>
              {!COMMON_PREFERENCE_KEYS.includes(pref.key) &&
                pref.key !== "" && (
                  <input
                    type="text"
                    value={pref.key}
                    onChange={(e) => updatePreference(i, "key", e.target.value)}
                    className="mb-1.5 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                    placeholder="Preference name"
                  />
                )}
            </div>
            <div className="flex-1">
              <textarea
                value={pref.value}
                onChange={(e) => updatePreference(i, "value", e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="Your preference..."
              />
            </div>
            <button
              onClick={() => removePreference(i)}
              className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={addPreference}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
        >
          <Plus className="h-4 w-4" /> Add Preference
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
