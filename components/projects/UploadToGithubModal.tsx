"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  Check,
  Copy,
  Terminal,
  Lock,
  Globe,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  FolderGit2,
  Code2,
} from "lucide-react";
import type { EngineeringProject } from "@/lib/content/projects-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadToGithubModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: EngineeringProject;
  userEmail?: string;
  userHandle?: string;
}

export function UploadToGithubModal({
  isOpen,
  onClose,
  project,
  userHandle,
}: UploadToGithubModalProps) {
  // Slugify repo name by default
  const defaultRepoName = React.useMemo(() => {
    return project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }, [project.title]);

  const [repoName, setRepoName] = React.useState(defaultRepoName);
  const [repoDescription, setRepoDescription] = React.useState(
    project.description || `${project.title} — Built with REEC Rust Academy`
  );
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [personalAccessToken, setPersonalAccessToken] = React.useState("");
  const [rememberToken, setRememberToken] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"api" | "cli">("api");

  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStep, setUploadStep] = React.useState<string>("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [createdRepoUrl, setCreatedRepoUrl] = React.useState<string | null>(null);
  const [copiedCli, setCopiedCli] = React.useState(false);

  // Restore remembered token from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("reec_github_pat");
      if (stored) {
        setPersonalAccessToken(stored);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    setRepoName(defaultRepoName);
    setRepoDescription(project.description || `${project.title} — Built with REEC Rust Academy`);
    setErrorMessage(null);
    setCreatedRepoUrl(null);
  }, [project, defaultRepoName]);

  // Generate README.md content
  const readmeContent = React.useMemo(() => {
    const milestonesList = project.milestones
      .map((m) => `- [${m.completed ? "x" : " "}] **${m.title}**: ${m.description}`)
      .join("\n");

    const stackList = project.techStack.map((s) => `- \`${s}\``).join("\n");

    return `# ${project.title}

> **Phase ${project.phase} Capstone Project** · Difficulty: **${project.difficulty}**  
> Architected via [REEC Academy](https://ai.studio/build)

## Overview
${project.description}

## Tech Stack
${stackList}

## Engineering Milestones
${milestonesList}

## Getting Started

Ensure you have the Rust toolchain installed:

\`\`\`bash
# Verify Rust & Cargo
rustc --version
cargo --version

# Run the project
cargo run

# Run tests & benchmarks
cargo test
\`\`\`

---
*Built with [REEC Academy](https://ai.studio/build) — The production-grade Rust systems curriculum.*
`;
  }, [project]);

  // Generate Cargo.toml
  const cargoTomlContent = React.useMemo(() => {
    const safePkgName = repoName.replace(/[^a-zA-Z0-9_-]/g, "_");

    // Standard high-performance Rust dependencies
    let deps = `[dependencies]\nanyhow = "1.0"\nthiserror = "1.0"\n`;
    const tech = project.techStack.map((t) => t.toLowerCase());

    if (tech.some((t) => t.includes("tokio") || t.includes("async"))) {
      deps += `tokio = { version = "1.38", features = ["full"] }\n`;
    }
    if (tech.some((t) => t.includes("serde") || t.includes("json"))) {
      deps += `serde = { version = "1.0", features = ["derive"] }\nserde_json = "1.0"\n`;
    }
    if (tech.some((t) => t.includes("tracing") || t.includes("log"))) {
      deps += `tracing = "0.1"\ntracing-subscriber = "0.3"\n`;
    }
    if (tech.some((t) => t.includes("clap") || t.includes("cli"))) {
      deps += `clap = { version = "4.5", features = ["derive"] }\n`;
    }

    return `[package]
name = "${safePkgName}"
version = "0.1.0"
edition = "2021"
description = "${project.tagline.replace(/"/g, "'")}"

${deps}
`;
  }, [repoName, project]);

  // Helper for UTF-8 to base64
  const toBase64 = (str: string) => {
    return btoa(unescape(encodeURIComponent(str)));
  };

  const handleUploadToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const token = personalAccessToken.trim();
    if (!token) {
      setErrorMessage("Please enter a valid GitHub Personal Access Token (PAT) with 'repo' scope.");
      return;
    }

    if (!repoName.trim()) {
      setErrorMessage("Please specify a valid repository name.");
      return;
    }

    setIsUploading(true);
    setUploadStep("Authenticating with GitHub...");

    try {
      if (rememberToken) {
        localStorage.setItem("reec_github_pat", token);
      } else {
        localStorage.removeItem("reec_github_pat");
      }

      // Step 1: Verify token & get authenticated user
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!userRes.ok) {
        throw new Error(
          userRes.status === 401
            ? "Invalid Personal Access Token. Please ensure it has not expired and has 'repo' permissions."
            : `GitHub API error: ${userRes.statusText}`
        );
      }

      const ghUser = await userRes.json();
      const owner = ghUser.login;

      // Step 2: Check if repository exists, or create it
      setUploadStep(`Creating repository '${repoName}' on GitHub...`);
      const createRepoRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: repoName.trim(),
          description: repoDescription.trim(),
          private: isPrivate,
          auto_init: false,
        }),
      });

      let targetRepo = null;
      if (createRepoRes.ok) {
        targetRepo = await createRepoRes.json();
      } else if (createRepoRes.status === 422) {
        // Repo already exists on user's account
        setUploadStep(`Repository '${repoName}' already exists. Preparing files...`);
        const existingRes = await fetch(`https://api.github.com/repos/${owner}/${repoName.trim()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (!existingRes.ok) {
          throw new Error("Repository exists but could not be accessed. Verify permissions.");
        }
        targetRepo = await existingRes.json();
      } else {
        const errData = await createRepoRes.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to create repository on GitHub.");
      }

      const repoUrl = targetRepo.html_url;

      // Helper function to commit or update a file in the repo
      const commitFile = async (filePath: string, content: string, commitMsg: string) => {
        // Check if file already exists to get its SHA for update
        const checkRes = await fetch(
          `https://api.github.com/repos/${owner}/${repoName.trim()}/contents/${filePath}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        let sha: string | undefined = undefined;
        if (checkRes.ok) {
          const fileData = await checkRes.json();
          sha = fileData.sha;
        }

        const putRes = await fetch(
          `https://api.github.com/repos/${owner}/${repoName.trim()}/contents/${filePath}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: commitMsg,
              content: toBase64(content),
              sha,
            }),
          }
        );

        if (!putRes.ok) {
          const putErr = await putRes.json().catch(() => ({}));
          throw new Error(putErr.message || `Failed to commit ${filePath}`);
        }
      };

      // Step 3: Commit Cargo.toml
      setUploadStep("Committing Cargo.toml...");
      await commitFile("Cargo.toml", cargoTomlContent, "chore: initialize Cargo manifest");

      // Step 4: Commit src/main.rs
      setUploadStep("Committing src/main.rs with starter code...");
      await commitFile("src/main.rs", project.starterCode, `feat: add starter code for ${project.title}`);

      // Step 5: Commit README.md
      setUploadStep("Committing README.md with milestones and architecture...");
      await commitFile("README.md", readmeContent, "docs: add project architecture and roadmap milestones");

      // Success!
      setCreatedRepoUrl(repoUrl);
      setUploadStep("Successfully pushed project to GitHub!");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to upload project to GitHub.");
    } finally {
      setIsUploading(false);
    }
  };

  const gitCliCommands = `git init
git add .
git commit -m "feat: initial commit for ${project.title}"
git branch -M main
git remote add origin https://github.com/${userHandle || "your-username"}/${repoName}.git
git push -u origin main`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(gitCliCommands);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/75 dark:bg-black/85 backdrop-blur-2xl transition-all"
          />

          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-lg md:max-w-xl rounded-t-[28px] sm:rounded-3xl border-t sm:border border-white/80 dark:border-white/[0.14] glass-frosted-deep text-slate-900 dark:text-slate-100 shadow-2xl z-10 flex flex-col max-h-[90dvh] sm:max-h-[85vh] overflow-hidden"
            style={{
              boxShadow: "var(--glass-specular), 0 32px 64px -16px rgba(0, 0, 0, 0.6)",
            }}
          >
            {/* Header */}
            <div className="shrink-0 px-5 pt-4 pb-3 sm:px-6 flex items-center justify-between border-b border-slate-900/[0.05] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white/10 text-white flex items-center justify-center">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Upload to GitHub
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Push {project.title} to your personal GitHub repository
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                aria-label="Close upload modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Tabs */}
            <div className="shrink-0 px-5 pt-3 sm:px-6">
              <div className="flex rounded-xl bg-slate-200/60 dark:bg-white/[0.06] p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("api")}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                    activeTab === "api"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Direct GitHub Push (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cli")}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer",
                    activeTab === "cli"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Git CLI Commands</span>
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto overscroll-contain flex-1 px-5 py-4 sm:px-6 space-y-4">
              {/* Success Banner if already pushed */}
              {createdRepoUrl && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Repository successfully created and populated!</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                    All starter files (<code>src/main.rs</code>, <code>Cargo.toml</code>, and <code>README.md</code>) have been pushed to GitHub.
                  </p>
                  <a
                    href={createdRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>View Repository on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Upload Error:</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {activeTab === "api" ? (
                <form onSubmit={handleUploadToGitHub} className="space-y-3.5">
                  {/* Repo Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Repository Name</span>
                      <span className="text-[10px] font-mono text-slate-400">required</span>
                    </label>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="my-rust-project"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>

                  {/* Repo Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Description
                    </label>
                    <input
                      type="text"
                      value={repoDescription}
                      onChange={(e) => setRepoDescription(e.target.value)}
                      placeholder="Brief description of the Rust system"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>

                  {/* Visibility & PAT */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex items-center gap-1">
                        {isPrivate ? <Lock className="w-3 h-3 text-amber-500" /> : <Globe className="w-3 h-3 text-blue-500" />}
                        <span>Private Repository</span>
                      </span>
                    </label>
                  </div>

                  {/* GitHub Personal Access Token */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        GitHub Personal Access Token (PAT)
                      </label>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo&description=REEC%20Academy%20Project%20Sync"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>Generate Token</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={personalAccessToken}
                      onChange={(e) => setPersonalAccessToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_..."
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Requires <code>repo</code> scope to create repositories and commit code.</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberToken}
                          onChange={(e) => setRememberToken(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span>Remember token</span>
                      </label>
                    </div>
                  </div>

                  {/* Files to be included preview */}
                  <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/[0.06] text-xs space-y-1.5">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 block">
                      Files Included in Initial Commit:
                    </span>
                    <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 font-mono">
                      <li className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Cargo.toml (Cargo manifest with dependencies)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>src/main.rs (Starter implementation)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span>README.md (Phase capstone & milestones checklist)</span>
                      </li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isUploading}
                      className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{uploadStep || "Uploading to GitHub..."}</span>
                        </>
                      ) : (
                        <>
                          <FolderGit2 className="w-4 h-4" />
                          <span>Push Repository to GitHub</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                /* CLI TAB */
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Prefer using your local terminal? Use the commands below to initialize and push your project to GitHub using the Git CLI:
                  </p>

                  <div className="relative rounded-2xl bg-slate-950 p-3.5 font-mono text-xs text-slate-200 border border-slate-800">
                    <button
                      type="button"
                      onClick={handleCopyCli}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
                      title="Copy CLI commands"
                    >
                      {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <pre className="overflow-x-auto whitespace-pre pr-8">{gitCliCommands}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-3 sm:px-6 border-t border-slate-900/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500">
              <span>REEC GitHub Integration</span>
              <button
                type="button"
                onClick={onClose}
                className="font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
