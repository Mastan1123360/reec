import { getAllHiddenLessons } from "@/lib/content/discover";
import { CurriculumShell } from "@/components/CurriculumShell";
import Link from "next/link";
import { Sparkles, Terminal, ArrowRight, ShieldAlert, Cpu, Layers, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function HiddenLessonsIndex() {
  const hiddenLessons = await getAllHiddenLessons();

  return (
    <CurriculumShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:px-8 space-y-6">
        {/* Header Banner */}
        <div
          className="relative rounded-2xl border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/80 p-6 sm:p-8 backdrop-blur-xl backdrop-saturate-150 shadow-sm"
          style={{ boxShadow: "var(--glass-inner-highlight)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              <Sparkles size={12} />
              Hidden Lessons Archive
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Compiler Failure Labs & Deep Dives
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Hidden lessons are dynamic modules that unlock when you push the Rust compiler past its limits, encounter borrow-checker diagnostics, or deliberately construct non-trivial memory graphs.
          </p>
        </div>

        {/* Discovery Guide */}
        <div
          className="rounded-xl border border-slate-200/50 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.02] p-4 sm:p-5 backdrop-blur-md"
          style={{ boxShadow: "var(--glass-inner-highlight)" }}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
            <Terminal size={14} className="text-blue-500" />
            <span>How Unlock Triggers Work</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Running exercises with specific compiler errors (e.g. <code className="text-[11px] font-mono bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">E0502</code>, <code className="text-[11px] font-mono bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">E0499</code>) or completing challenge requirements in the workspace automatically registers discovery in your profile.
          </p>
        </div>

        {/* Hidden Lessons Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            Available Hidden Lessons ({hiddenLessons.length > 0 ? hiddenLessons.length : 1})
          </h2>

          {hiddenLessons.length === 0 ? (
            <Link
              href="/hidden-lessons/nll"
              className="group block rounded-xl border border-slate-200/60 dark:border-white/[0.08] bg-white/60 hover:bg-white/90 dark:bg-[#0c1322]/60 dark:hover:bg-[#0c1322]/90 p-4 transition-all duration-200"
              style={{ boxShadow: "var(--glass-inner-highlight)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      NLL
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Non-Lexical Lifetimes (NLL) Deep Dive
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    Explore Polonius internals, borrow liveness spans, and how NLL transformed Rust from lexical scoping to fine-grained control flow graph analysis.
                  </p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100/80 dark:bg-white/10 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ) : (
            hiddenLessons.map((hl) => {
              const slug = hl.frontmatter.slug || hl.slug[hl.slug.length - 1] || "nll";
              return (
                <Link
                  key={hl.frontmatter.id || slug}
                  href={`/hidden-lessons/${slug}`}
                  className="group block rounded-xl border border-slate-200/60 dark:border-white/[0.08] bg-white/60 hover:bg-white/90 dark:bg-[#0c1322]/60 dark:hover:bg-[#0c1322]/90 p-4 transition-all duration-200"
                  style={{ boxShadow: "var(--glass-inner-highlight)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {hl.frontmatter.badge || "HL"}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {hl.frontmatter.title}
                        </h3>
                      </div>
                      {hl.frontmatter.subtitle && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {hl.frontmatter.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100/80 dark:bg-white/10 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
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
