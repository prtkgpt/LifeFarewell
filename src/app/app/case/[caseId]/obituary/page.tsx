"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Eye, Edit3, Save, Loader2, Check } from "lucide-react";

const OBITUARY_TEMPLATE = `[Full Name], age [age], of [City, State], passed away peacefully on [date].

[He/She/They] was born on [birth date] in [birthplace] to [parents' names].

[First name] is survived by [surviving family members]. [He/She/They] was preceded in death by [deceased family members].

[First name] was known for [personal qualities, hobbies, achievements]. [He/She/They] enjoyed [activities and interests], and will be deeply missed by all who knew [him/her/them].

A [memorial service/celebration of life/funeral service] will be held on [date] at [location].

In lieu of flowers, the family requests donations be made to [charity/organization].`;

export default function ObituaryPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [content, setContent] = useState(OBITUARY_TEMPLATE);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadObituary() {
      try {
        const res = await fetch(`/api/cases/${caseId}/obituary`);
        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            setContent(data.content);
          }
        }
      } catch (err) {
        console.error("Failed to load obituary:", err);
      } finally {
        setLoading(false);
      }
    }
    loadObituary();
  }, [caseId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      // Save to DecedentProfile.notes via a PATCH-like operation
      const res = await fetch(`/api/cases/${caseId}/obituary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save obituary:", err);
    } finally {
      setSaving(false);
    }
  }

  const charCount = content.length;
  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Obituary</h1>
          <p className="mt-1 text-sm text-stone-500">
            Write and preview the obituary with care and respect
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            {mode === "edit" ? (
              <>
                <Eye className="h-4 w-4" /> Preview
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4" /> Edit
              </>
            )}
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
            {saving ? "Saving..." : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div
          className={mode === "preview" ? "hidden lg:block" : "lg:col-span-1"}
        >
          <div className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                <Edit3 className="h-4 w-4" />
                Editor
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="block w-full resize-none border-0 bg-transparent px-5 py-4 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-0"
              rows={20}
              placeholder="Begin writing the obituary..."
            />
          </div>
        </div>

        {/* Preview */}
        <div
          className={mode === "edit" ? "hidden lg:block" : "lg:col-span-1"}
        >
          <div className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3 text-sm font-medium text-stone-700">
              <Eye className="h-4 w-4" />
              Preview
            </div>
            <div className="px-8 py-6">
              {content ? (
                <div className="prose prose-stone prose-sm max-w-none">
                  <div className="mb-6 border-b border-stone-200 pb-4">
                    <div className="mx-auto h-0.5 w-16 bg-amber-400" />
                  </div>
                  {content.split("\n\n").map((paragraph, i) => (
                    <p
                      key={i}
                      className="mb-4 text-sm leading-relaxed text-stone-700"
                    >
                      {paragraph}
                    </p>
                  ))}
                  <div className="mt-6 border-t border-stone-200 pt-4">
                    <div className="mx-auto h-0.5 w-16 bg-amber-400" />
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-stone-300" />
                  <p className="mt-2 text-sm text-stone-400">
                    Start writing to see the preview
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Guidance */}
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="text-sm font-semibold text-amber-900">
          Writing guidance
        </h3>
        <ul className="mt-2 space-y-1.5 text-sm text-amber-800">
          <li>
            Include full name, age, city of residence, and date of passing
          </li>
          <li>
            Mention surviving family members and those who preceded in death
          </li>
          <li>
            Share personal qualities, achievements, and what made them special
          </li>
          <li>Include service details, date, time, and location if known</li>
          <li>
            Mention any preferred charitable donations in lieu of flowers
          </li>
        </ul>
      </div>
    </div>
  );
}
