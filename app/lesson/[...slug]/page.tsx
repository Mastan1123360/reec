import { getCurriculumNavigation, getAllLessonSlugs, getLessonBySlug, getHiddenLessonBySlug } from "@/lib/content/discover";
import { CurriculumShell } from "@/components/CurriculumShell";
import { LessonExperience } from "@/components/experience/LessonExperience";
import { notFound, redirect } from "next/navigation";

export async function generateStaticParams() {
  const slugs = await getAllLessonSlugs();
  return slugs.map((slug) => ({ slug: slug.map((s) => s.toLowerCase()) }));
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function LessonPage({ params }: { params: { slug?: string[] | string } | Promise<{ slug?: string[] | string }> }) {
  const resolvedParams = await Promise.resolve(params);
  const rawSlug = resolvedParams?.slug;
  const slugArray = Array.isArray(rawSlug)
    ? rawSlug
    : typeof rawSlug === "string"
    ? rawSlug.split("/").filter(Boolean)
    : [];

  if (slugArray.length === 0) {
    notFound();
  }

  const lesson = await getLessonBySlug(slugArray);
  if (!lesson) {
    // If this matches a hidden lesson, redirect cleanly to /hidden-lessons/[slug]
    const hiddenLesson = await getHiddenLessonBySlug(slugArray.join("/"));
    if (hiddenLesson) {
      const target = `/hidden-lessons/${hiddenLesson.frontmatter.slug || hiddenLesson.slug[hiddenLesson.slug.length - 1] || "nll"}`;
      redirect(target);
    }
    notFound();
  }

  if (lesson.frontmatter.hidden) {
    const target = `/hidden-lessons/${lesson.frontmatter.slug || lesson.slug[lesson.slug.length - 1] || "nll"}`;
    redirect(target);
  }

  // Diagnostic log
  console.log(
    `[CONTENT DIAGNOSTIC]\nCONTENT SOURCE: SUPABASE\nLESSON: ${lesson.frontmatter.id}\nCONTENT LENGTH: ${lesson.rawContent?.length ?? 0}\nHASH: ${lesson.contentHash ?? ""}\nPARSED BLOCKS: ${lesson.blocks.length}`
  );

  // Calculate real prev / next lessons from ordered curriculum index in <1ms
  const { prevLesson, nextLesson } = await getCurriculumNavigation(lesson.path, lesson.frontmatter.id);

  return (
    <CurriculumShell>
      <article className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-28 sm:pb-32 lg:pb-8 lg:px-8">
        <LessonExperience lesson={lesson} prevLesson={prevLesson} nextLesson={nextLesson} />
      </article>
    </CurriculumShell>
  );
}

