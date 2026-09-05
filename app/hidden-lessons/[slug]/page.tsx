import { getHiddenLessonBySlug, getAllHiddenLessons } from "@/lib/content/discover";
import { CurriculumShell } from "@/components/CurriculumShell";
import { HiddenLessonView } from "@/components/hidden-lessons/HiddenLessonView";
import Link from "next/link";
import { Sparkles, ArrowLeft, Layers, Terminal } from "lucide-react";

export async function generateStaticParams() {
  const hiddenLessons = await getAllHiddenLessons();
  return hiddenLessons.map((lesson) => ({
    slug: lesson.frontmatter.slug || lesson.slug[lesson.slug.length - 1],
  }));
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function HiddenLessonPage({
  params,
}: {
  params: { slug?: string } | Promise<{ slug?: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const rawSlug = resolvedParams?.slug || "nll";
  const lesson = await getHiddenLessonBySlug(rawSlug);

  if (!lesson) {
    return (
      <CurriculumShell>
        <div className="mx-auto max-w-2xl px-6 py-20 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-500 shadow-md">
            <Sparkles size={30} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Hidden Lesson Exploration
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Hidden Lessons are unlocked dynamically as you trigger genuine compiler diagnostics, edge-case failure modes, and explore advanced borrow-checker internals in the code workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 max-w-md mx-auto text-left text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-primary">
              <Terminal size={14} />
              <span>Unlock Guide</span>
            </div>
            <p className="text-muted-foreground text-[11.5px] leading-relaxed">
              Execute exercises in Phase 01 (Week 03) to trigger Non-Lexical Lifetimes (NLL), aliasing proofs, and unsafe cell internals.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all"
            >
              <ArrowLeft size={13} />
              <span>Back to Roadmap</span>
            </Link>
            <Link
              href="/hidden-lessons/nll"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs"
            >
              <Layers size={13} />
              <span>View NLL Deep Dive</span>
            </Link>
          </div>
        </div>
      </CurriculumShell>
    );
  }

  return (
    <CurriculumShell>
      <HiddenLessonView lesson={lesson} />
    </CurriculumShell>
  );
}
