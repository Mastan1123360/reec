import { getAllHiddenLessons } from "@/lib/content/discover";
import { CurriculumShell } from "@/components/CurriculumShell";
import Link from "next/link";
import { Sparkles, Terminal, ArrowRight, ShieldAlert, Cpu, Layers, BookOpen, ShieldCheck, Lock, Code2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

export const dynamic = "force-dynamic";

export default async function HiddenLessonsIndex() {
  const hiddenLessons = await getAllHiddenLessons();

  return (
    <CurriculumShell>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 sm:px-6 md:px-8 space-y-6 pb-28 sm:pb-32 lg:pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3">
          <BackButton fallbackHref="/" label="Return to Dashboard" />
          <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
          <Link
            href="/roadmap"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            Curriculum Roadmap
          </Link>
        </div>

        {/* Grand Header Banner */}
        <div
          className="relative overflow-hidden rounded-[26px] border border-purple-500/35 bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/5 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-[#091122]/70 p-6 sm:p-8 backdrop-blur-2xl shadow-xl"
          style={{ boxShadow: "0 12px 36px rgba(147, 51, 234, 0.1), var(--glass-inner-highlight)" }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                <Sparkles size={13} />
                <span>Encrypted Compiler Archive</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Compiler Failure Labs & Deep Dives
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Dynamic deep dives that declassify when you push the Rust compiler past its limits, encounter borrow-checker diagnostics, or deliberately trigger memory invariants.
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-purple-500/20 pt-3 sm:pt-0 shrink-0">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Clearance Status
              </span>
              <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-500/30 mt-1">
                Level 5 · Declassified
              </span>
            </div>
          </div>
        </div>

        {/* Discovery Guide */}
        <div
          className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/80 p-5 sm:p-6 backdrop-blur-xl space-y-3"
          style={{ boxShadow: "var(--glass-inner-highlight)" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 font-mono">
              <Terminal size={14} className="text-purple-500" />
              <span>How Unlock Triggers Work</span>
            </h2>
            <Link
              href="/workspace"
              className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Simulate in Workspace</span>
              <ArrowRight size={12} />
            </Link>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Running exercises with specific compiler errors (such as <code className="text-[11px] font-mono bg-purple-500/10 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">E0502</code> or <code className="text-[11px] font-mono bg-purple-500/10 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">E0499</code>) or completing challenge requirements automatically registers discovery in your session profile.
          </p>
        </div>

        {/* Hidden Lessons Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Available Deep Dives ({hiddenLessons.length > 0 ? hiddenLessons.length : 1})
            </h2>
            <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
              Execution Gated
            </span>
          </div>

          {hiddenLessons.length === 0 ? (
            <Link
              href="/hidden-lessons/nll"
              className="group block rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 hover:bg-white/95 dark:bg-[#0c1322]/70 dark:hover:bg-[#0c1322]/95 p-5 transition-all duration-200 shadow-sm hover:shadow-md"
              style={{ boxShadow: "var(--glass-inner-highlight)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-mono font-bold text-xs shrink-0 shadow-md shadow-purple-500/20 border border-purple-400/30">
                    NLL
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        Polonius Engine
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                        Non-Lexical Lifetimes (NLL) Deep Dive
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      Explore Polonius internals, borrow liveness spans, and how NLL transformed Rust from lexical scoping to fine-grained control flow graph analysis.
                    </p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              </div>
            </Link>
          ) : (
            hiddenLessons.map((hl) => {
              const slug = hl.frontmatter.slug || hl.slug[hl.slug.length - 1] || "nll";
              return (
                <Link
                  key={hl.frontmatter.id || slug}
                  href={`/hidden-lessons/${slug}`}
                  className="group block rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 hover:bg-white/95 dark:bg-[#0c1322]/70 dark:hover:bg-[#0c1322]/95 p-5 transition-all duration-200 shadow-sm hover:shadow-md"
                  style={{ boxShadow: "var(--glass-inner-highlight)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-mono font-bold text-xs shrink-0 shadow-md shadow-purple-500/20 border border-purple-400/30">
                        {hl.frontmatter.badge || "HL"}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            Declassified Lab
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                            {hl.frontmatter.title}
                          </h3>
                        </div>
                        {hl.frontmatter.subtitle && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {hl.frontmatter.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </CurriculumShell>
  );
}

