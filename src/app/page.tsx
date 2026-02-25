import Link from "next/link";
import {
  Heart,
  Shield,
  Phone,
  FileText,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-25">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-stone-900">
              LifeFarewell
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth"
              className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-stone-800 hover:shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700">
              <Heart className="h-3.5 w-3.5" />
              Compassionate, AI-assisted planning
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
              We handle the details
              <br />
              <span className="text-stone-500">so you can grieve in peace</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-stone-600 sm:text-xl">
              LifeFarewell is your personal concierge for funeral planning.
              Our AI assistant contacts funeral homes, gathers quotes,
              compares options, and guides every step — with full
              transparency and your approval at every turn.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-8 py-3.5 text-base font-medium text-white transition-all hover:bg-stone-800 hover:shadow-lg"
              >
                Start Planning
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-8 py-3.5 text-base font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-stone-200 bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-semibold text-stone-900">
              How it works
            </h2>
            <p className="mt-3 text-lg text-stone-500">
              Three steps to compassionate, organized planning
            </p>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Tell us your needs",
                desc: "Answer a few gentle questions about your situation, preferences, and budget. Set your communication preferences and approval level.",
                icon: FileText,
              },
              {
                step: "2",
                title: "We do the outreach",
                desc: "Our concierge contacts local funeral homes, gathers quotes, and normalizes pricing — all with your chosen level of oversight.",
                icon: Phone,
              },
              {
                step: "3",
                title: "Compare & decide",
                desc: "Review side-by-side comparisons with clear pricing, recommendations, and the ability to approve every interaction.",
                icon: CheckCircle2,
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
                  <item.icon className="h-6 w-6 text-stone-700" />
                </div>
                <div className="mb-2 text-sm font-semibold text-amber-600">
                  Step {item.step}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-stone-900">
                  {item.title}
                </h3>
                <p className="text-stone-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="border-t border-stone-200 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Shield,
                title: "Full Transparency",
                desc: "Every outreach discloses our role. No deception, ever.",
              },
              {
                icon: Clock,
                title: "Save Hours",
                desc: "We handle dozens of calls and emails that would take you days.",
              },
              {
                icon: DollarSign,
                title: "Fair Pricing",
                desc: "Normalized quotes expose hidden fees and enable real comparison.",
              },
              {
                icon: Heart,
                title: "Bereaved-First",
                desc: "Designed with empathy. Calm interface, no pressure, your pace.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-stone-200 bg-white p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100">
                  <item.icon className="h-5 w-5 text-stone-700" />
                </div>
                <h3 className="mb-2 font-semibold text-stone-900">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-stone-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900">
              <Heart className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-stone-900">LifeFarewell</span>
          </div>
          <p className="text-sm text-stone-500">
            Compassionate funeral planning, handled with care.
          </p>
        </div>
      </footer>
    </div>
  );
}
