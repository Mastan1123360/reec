"use client";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useProgressStore } from "@/lib/progress/store";
import type { Lesson } from "@/lib/content/types";
import type { RoadmapStatus } from "@/lib/content/discover";

export function DashboardPhaseGrid({
  roadmap,
  lessons,
}: {
  roadmap: RoadmapStatus[];
  lessons: Lesson[];
}) {
  const progressForPhase = useProgressStore((s) => s.progressForPhase);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {roadmap.map((entry) =>
        entry.hasContent ? (
          <LivePhaseCard
            key={entry.phase}
            entry={entry}
            pct={progressForPhase(
              lessons.filter((l) => l.frontmatter.phase === entry.phase).map((l) => l.path)
            )}
          />
        ) : (
          <ComingSoonCard key={entry.phase} entry={entry} />
        )
      )}
    </div>
  );
}

function LivePhaseCard({ entry, pct }: { entry: RoadmapStatus; pct: number }) {
  return (
    <Link href={`/phase/${entry.phase}`}>
      <Card className="group h-full transition-colors hover:border-primary/50">
        <CardHeader>
          <div className="mb-1 flex items-center justify-between">
            <Badge variant="outline">Phase {entry.phase}</Badge>
            <span className="text-xs text-muted-foreground">
              {entry.lessonCount} lesson{entry.lessonCount === 1 ? "" : "s"}
            </span>
          </div>
          <CardTitle>{entry.title}</CardTitle>
          <CardDescription>
            {entry.weeks.length > 0
              ? `Weeks ${Math.min(...entry.weeks)}–${Math.max(...entry.weeks)}`
              : entry.description}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col items-stretch gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{pct}% complete</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </div>
          <Progress value={pct} />
        </CardFooter>
      </Card>
    </Link>
  );
}

function ComingSoonCard({ entry }: { entry: RoadmapStatus }) {
  return (
    <Card className="relative h-full overflow-hidden border-dashed opacity-80">
      <CardHeader>
        <div className="mb-1 flex items-center justify-between">
          <Badge variant="outline">Phase {entry.phase}</Badge>
          <Badge variant="secondary" className="gap-1">
            <Clock3 size={11} /> Coming soon
          </Badge>
        </div>
        <CardTitle className="text-muted-foreground">{entry.title}</CardTitle>
        <CardDescription>{entry.description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          Curriculum modules in preparation
        </span>
      </CardFooter>
    </Card>
  );
}
