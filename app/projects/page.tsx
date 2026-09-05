"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderGit2,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  Plus,
  Terminal,
  Layers,
  ChevronRight,
  Sparkles,
  Search,
  Trash2,
  X,
  ArrowRight,
} from "lucide-react";
import { useProjectStore } from "@/lib/projects/store";
import type { EngineeringProject } from "@/lib/content/projects-data";
import { useRustWorkspace } from "@/lib/rust/state";
import { BackButton } from "@/components/ui/BackButton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const router = useRouter();
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const toggleMilestone = useProjectStore((s) => s.toggleMilestone);

  const updateFileContent = useRustWorkspace((s) => s.updateFileContent);
  const projectState = useRustWorkspace((s) => s.project);
  const setActiveFile = useRustWorkspace((s) => s.setActiveFile);

  const [activeProject, setActiveProject] = React.useState<EngineeringProject | null>(null);
  const [selectedPhase, setSelectedPhase] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [modalOpen, setModalOpen] = React.useState(false);

  // Sync active project
  React.useEffect(() => {
    if (projects.length > 0) {
      if (!activeProject || !projects.some((p) => p.id === activeProject.id)) {
        setActiveProject(projects[0]);
      }
    } else {
      setActiveProject(null);
    }
  }, [projects, activeProject]);

  const filteredProjects = React.useMemo(() => {
    return projects.filter((proj) => {
      const matchesPhase = selectedPhase === "all" || proj.phase === Number(selectedPhase);
      const matchesSearch =
        searchQuery.trim() === "" ||
        proj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proj.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proj.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proj.techStack.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesPhase && matchesSearch;
    });
  }, [projects, selectedPhase, searchQuery]);

  const handleLaunchInWorkspace = (proj: EngineeringProject) => {
    const mainFile = projectState.files.find((f) => f.kind === "main") || projectState.files[0];
    if (mainFile) {
      updateFileContent(mainFile.id, proj.starterCode);
      setActiveFile(mainFile.id);
    }
    router.push("/workspace");
  };

  // 1. EMPTY STATE (When no projects exist)
  if (projects.length === 0) {
    return (
      <div className="h-full overflow-y-auto py-8 px-4 sm:px-6 lg:px-12 max-w-4xl mx-auto flex flex-col justify-center items-center text-center space-y-6 relative">
        <div className="absolute top-6 left-6 sm:left-8">
          <BackButton fallbackHref="/" label="Return to Dashboard" />
        </div>

        <div className="p-4 rounded-3xl border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] shadow-lg backdrop-blur-xl">
          <FolderGit2 size={36} className="text-blue-500" />
        </div>

        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Projects
          </h1>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No projects yet.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Create your first project to architect production-ready systems, track milestones, and launch starter code into the native Rust toolchain.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="h-10 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg flex items-center gap-2"
        >
          <Plus size={15} />
          <span>Create Project</span>
        </Button>

        {modalOpen && (
          <CreateProjectModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={(data) => {
              const id = addProject(data);
              setModalOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  // 2. POPULATED PROJECTS VIEW
  const currentProj = activeProject || filteredProjects[0] || projects[0];
  const completedMilestones = currentProj?.milestones.filter((m) => m.completed).length || 0;
  const totalMilestones = currentProj?.milestones.length || 1;
  const progressPercent = Math.round((completedMilestones / totalMilestones) * 100);

  return (
    <div className="h-full overflow-y-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-12 pb-28 sm:pb-32 lg:pb-12 max-w-[1600px] mx-auto space-y-8 scroll-smooth">
      {/* Header Banner */}
      <div
        className="relative overflow-hidden rounded-2xl glass-surface p-6 sm:p-10"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <BackButton fallbackHref="/" label="Return to Dashboard" className="mt-1" />
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <Layers size={14} />
                <span>Production Systems Capstones</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Systems Projects
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Design, implement, and verify low-level Rust architectures. Track engineering milestones and launch codebase templates directly into the IDE.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setModalOpen(true)}
            className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 self-start md:self-center shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Project</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedPhase("all")}
            className={cn(
              "whitespace-nowrap shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 border cursor-pointer",
              selectedPhase === "all"
                ? "border-blue-500/40 bg-blue-600 text-white shadow-xs"
                : "glass-control text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            All Projects ({projects.length})
          </button>
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl glass-control pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>

      {/* Main Split View: 2-Cols on Tablet (md:) & Desktop (lg:) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 items-start pb-28 sm:pb-32 lg:pb-8">
        {/* Left: Project Cards */}
        <div className="md:col-span-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
            Projects ({filteredProjects.length})
          </div>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1 scrollbar-none">
            {filteredProjects.map((proj) => {
              const isSelected = currentProj?.id === proj.id;
              const doneCount = proj.milestones.filter((m) => m.completed).length;
              const pct = Math.round((doneCount / (proj.milestones.length || 1)) * 100);

              return (
                <div
                  key={proj.id}
                  onClick={() => setActiveProject(proj)}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-xl p-4 sm:p-5 transition-all duration-200",
                    isSelected
                      ? "glass-elevated border-blue-500/50 dark:border-blue-500/50 shadow-md scale-[1.01]"
                      : "glass-elevated hover:border-blue-500/30"
                  )}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        Phase {proj.phase}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {proj.difficulty} • {proj.estimatedHours}h
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-500 transition-colors">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {proj.tagline || proj.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Milestones</span>
                        <span>
                          {doneCount}/{proj.milestones.length} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Project Details */}
        {currentProj && (
          <div className="md:col-span-7 space-y-6">
            <div
              className="rounded-2xl glass-surface p-6 space-y-5"
            >
              {/* Top controls & launch button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    Phase {currentProj.phase} Capstone
                  </span>
                  <span className="rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {currentProj.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleLaunchInWorkspace(currentProj)}
                    className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <Code2 size={13} />
                    <span>Open in Workspace</span>
                  </Button>
                  <button
                    onClick={() => deleteProject(currentProj.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {currentProj.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {currentProj.description}
                </p>
              </div>

              {/* Tech Stack Pills */}
              {currentProj.techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {currentProj.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.06] px-2.5 py-1 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {/* Milestones Checklist */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Engineering Milestones ({completedMilestones}/{totalMilestones})
                  </h3>
                  <span className="font-mono text-xs font-bold text-blue-500">
                    {progressPercent}% Complete
                  </span>
                </div>

                <div className="space-y-2">
                  {currentProj.milestones.map((milestone, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleMilestone(currentProj.id, idx)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl p-3.5 cursor-pointer transition-all",
                        milestone.completed
                          ? "glass-elevated border-emerald-500/30 bg-emerald-500/10 text-slate-800 dark:text-slate-200"
                          : "glass-elevated hover:border-blue-500/30"
                      )}
                    >
                      {milestone.completed ? (
                        <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <Circle size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-xs font-bold",
                            milestone.completed && "line-through text-slate-400"
                          )}
                        >
                          {milestone.title}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Starter Code Snippet Box */}
              {currentProj.starterCode && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <span>Starter Code Template</span>
                    <span className="font-mono text-[10px] text-slate-400">src/main.rs</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-950 p-4 font-mono text-xs text-slate-100 overflow-x-auto max-h-60 select-text">
                    <pre className="whitespace-pre">{currentProj.starterCode}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <CreateProjectModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={(data) => {
            const id = addProject(data);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<EngineeringProject, "id">) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [phase, setPhase] = React.useState(0);
  const [difficulty, setDifficulty] = React.useState<EngineeringProject["difficulty"]>("Foundation");
  const [estimatedHours, setEstimatedHours] = React.useState(6);
  const [techStackInput, setTechStackInput] = React.useState("Rust 2021, CLI, Error Handling");
  const [starterCode, setStarterCode] = React.useState(
    `fn main() {\n    println!("Hello, REEC Project!");\n}`
  );
  const [milestones, setMilestones] = React.useState([
    { title: "Milestone 1: Domain Modeling", description: "Define core structs, traits, and error enums." },
    { title: "Milestone 2: Core Implementation", description: "Implement primary business logic and state management." },
    { title: "Milestone 3: Verification & Tests", description: "Write comprehensive unit tests and benchmark throughput." },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const techStack = techStackInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({
      title: title.trim(),
      tagline: tagline.trim() || title.trim(),
      description: description.trim() || tagline.trim(),
      phase,
      difficulty,
      estimatedHours,
      techStack,
      starterCode,
      milestones,
      architectureHighlights: ["Memory safety without GC", "Zero-cost abstractions"],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in-0">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/70 dark:border-white/[0.1] bg-white/95 dark:bg-[#0c1424]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 20px 50px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="text-blue-500" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Create Engineering Project
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Project Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Memory Allocator & Free-List Slab"
              className="w-full rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Curriculum Phase</label>
              <select
                value={phase}
                onChange={(e) => setPhase(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-[#0c1424] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <option key={p} value={p}>
                    Phase {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-[#0c1424] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="Foundation">Foundation</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Production Grade">Production Grade</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Est. Hours</label>
              <input
                type="number"
                min={1}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Short Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Low-level memory management with strict alignment and page tracking"
              className="w-full rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the architectural objectives and engineering constraints..."
              className="w-full rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Tech Stack (comma separated)</label>
            <input
              type="text"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              placeholder="Rust 2021, Unsafe, Pointer Arithmetic"
              className="w-full rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Starter Code</label>
            <textarea
              rows={4}
              value={starterCode}
              onChange={(e) => setStarterCode(e.target.value)}
              className="w-full rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-950 p-3 font-mono text-xs text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-9 px-4 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
            >
              Save Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
