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
  UserPlus,
  Shield,
  ShieldAlert,
  Copy,
  Clock,
  Users,
} from "lucide-react";

interface CaseMember {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string; isGuest: boolean };
}

interface InvitationItem {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function UserSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Invite state
  const [caseId, setCaseId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [members, setMembers] = useState<CaseMember[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setName(data.name || "");
          setEmail(data.email || "");
          setIsGuest(data.isGuest || false);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Load case + members
  useEffect(() => {
    async function loadCase() {
      try {
        const res = await fetch("/api/cases");
        if (res.ok) {
          const cases = await res.json();
          if (cases.length > 0) {
            const id = cases[0].id;
            setCaseId(id);
            loadMembers(id);
          }
        }
      } catch (err) {
        console.error("Failed to load cases:", err);
      }
    }
    loadCase();
  }, []);

  async function loadMembers(id: string) {
    try {
      const res = await fetch(`/api/invitations?caseId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
        // Check current user role
        const res2 = await fetch("/api/user/profile");
        if (res2.ok) {
          const profile = await res2.json();
          const me = (data.members || []).find(
            (m: CaseMember) => m.user.id === profile.id
          );
          setMyRole(me?.role || null);
        }
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    }
  }

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
    } catch {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!caseId) return;

    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    setInviteLink("");

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, email: inviteEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Failed to send invitation");
        return;
      }

      const link = `${window.location.origin}/invite?token=${data.token}&email=${encodeURIComponent(data.email)}`;
      setInviteLink(link);
      setInviteSuccess(`Invitation created for ${data.email}`);
      setInviteEmail("");
      loadMembers(caseId);
    } catch {
      setInviteError("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
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
          Manage your profile and team
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Guest warning */}
        {isGuest && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Guest Account
              </p>
              <p className="mt-1 text-sm text-amber-700">
                You&apos;re using a temporary guest account. Secure it with your
                email and password to avoid losing access.
              </p>
              <Link
                href="/app/claim-account"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
              >
                <Shield className="h-3.5 w-3.5" />
                Secure Account
              </Link>
            </div>
          </div>
        )}

        {/* Profile card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
              <User className="h-8 w-8 text-stone-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {name || "Your Name"}
              </h2>
              <p className="text-sm text-stone-500">
                {isGuest ? "Guest Account" : email}
              </p>
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

            {!isGuest && (
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
            )}
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

        {/* Team Members */}
        {caseId && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-stone-600" />
              <h2 className="text-lg font-semibold text-stone-900">
                Case Team
              </h2>
            </div>

            {/* Current members */}
            <div className="mb-4 space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200">
                      <User className="h-4 w-4 text-stone-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {member.user.name || "Unnamed"}
                        {member.user.isGuest && (
                          <span className="ml-1.5 text-xs text-amber-600">
                            (guest)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500">
                        {member.user.isGuest
                          ? "No email set"
                          : member.user.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      member.role === "PRIMARY"
                        ? "bg-stone-900 text-white"
                        : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {member.role === "PRIMARY" ? "Primary" : "Viewer"}
                  </span>
                </div>
              ))}
            </div>

            {/* Pending invitations */}
            {invitations.filter((i) => i.status === "PENDING").length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-400">
                  Pending Invitations
                </p>
                <div className="space-y-2">
                  {invitations
                    .filter((i) => i.status === "PENDING")
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span className="text-sm text-amber-800">
                            {inv.email}
                          </span>
                        </div>
                        <span className="text-xs text-amber-600">Pending</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Invite form (only for PRIMARY) */}
            {myRole === "PRIMARY" && !isGuest && (
              <form onSubmit={handleInvite} className="mt-4 border-t border-stone-100 pt-4">
                <p className="mb-3 text-sm font-medium text-stone-700">
                  Invite a family member
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 py-2.5 pl-10 pr-4 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                      placeholder="family@example.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
                  >
                    {inviting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Invite
                  </button>
                </div>

                {inviteError && (
                  <p className="mt-2 text-sm text-red-600">{inviteError}</p>
                )}

                {inviteSuccess && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-green-700">{inviteSuccess}</p>
                    {inviteLink && (
                      <>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={inviteLink}
                            className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600"
                          />
                          <button
                            type="button"
                            onClick={copyLink}
                            className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-100"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-stone-400">
                          Share this link with the person you invited. It expires
                          in 7 days.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {myRole === "PRIMARY" && isGuest && (
                  <p className="mt-3 text-sm text-amber-700">
                    Secure your account first before inviting others.
                  </p>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
