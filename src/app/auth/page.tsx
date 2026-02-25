"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create account");
          setLoading(false);
          return;
        }
      }

      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-25 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900">
              <Heart className="h-5 w-5 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-semibold text-stone-900">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            {isSignUp
              ? "Get started with LifeFarewell"
              : "Sign in to your account"}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                  placeholder="Your name"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                placeholder="Min. 6 characters"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-stone-900 py-3 text-sm font-medium text-white transition-all hover:bg-stone-800 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-sm text-stone-500 transition-colors hover:text-stone-900"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
