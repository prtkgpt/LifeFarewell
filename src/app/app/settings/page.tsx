"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Save,
  Loader2,
  Check,
  ArrowLeft,
  Mail,
} from "lucide-react";

export default function UserSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setName(data.name || "");
          setEmail(data.email || "");
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/app"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage your profile information
        </p>
      </div>

      {/* Profile card */}
      <div className="max-w-xl rounded-2xl border border-stone-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
            <User className="h-8 w-8 text-stone-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              {name || "Your Name"}
            </h2>
            <p className="text-sm text-stone-500">{email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Email
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5">
              <Mail className="h-4 w-4 text-stone-400" />
              <span className="text-sm text-stone-600">{email}</span>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Email cannot be changed
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
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
            {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
