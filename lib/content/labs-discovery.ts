import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface FailureLab {
  id: string;
  title: string;
  phase: number;
  category: "Memory & Ownership" | "Concurrency & Threads" | "Lifetimes & References" | "Unsafe & Pointers" | "Async & I/O" | "Type System & Traits";
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  estimatedMinutes: number;
  description: string;
  errorMessage: string;
  errorCode: string;
  buggyCode: string;
  fixedCode: string;
  explanation: string;
  architecturalLesson: string;
  fileName: string;
}

const CONTENT_ROOT = path.join(process.cwd(), "content");

/**
 * Checks if a filename explicitly identifies a Failure Lab.
 * Matches:
 *  - "Failure Lab.md"
 *  - "Failure-Lab.md"
 *  - "failure-lab.md"
 *  - "Failure Lab — Ownership.md"
 *  - "failure lab ownership.md"
 *  - "01_failure_lab_borrow.md"
 */
export function isFailureLabFilename(fileName: string): boolean {
  const normalized = fileName.toLowerCase().replace(/[_\s\-]+/g, " ");
  return normalized.includes("failure lab") || normalized.includes("failurelab");
}

function extractCodeBlocks(content: string): { lang: string; code: string }[] {
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const blocks: { lang: string; code: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      lang: match[1].trim() || "rust",
      code: match[2].trim(),
    });
  }
  return blocks;
}

function extractSection(content: string, headingRegex: RegExp): string {
  const match = content.match(headingRegex);
  if (!match) return "";
  return match[1].trim();
}

/**
 * Parses a markdown file into a FailureLab representation using the actual file content.
 */
export function parseFailureLabFile(filePath: string, rawContent: string): FailureLab {
  const parsed = matter(rawContent);
  const data = parsed.data || {};
  const body = parsed.content || "";
  const baseName = path.basename(filePath, path.extname(filePath));

  // Extract title
  const h1Match = body.match(/^#\s+(.+)$/m);
  const title = (data.title as string) || (h1Match ? h1Match[1].trim() : baseName);

  // Extract description
  let description = (data.description as string) || "";
  if (!description) {
    // Take text before the first secondary heading
    const firstSectionMatch = body.replace(/^#\s+.+$/m, "").trim().split(/\n##\s+/)[0];
    description = firstSectionMatch.replace(/```[\s\S]*?```/g, "").trim().slice(0, 300);
  }

  // Extract code blocks
  const codeBlocks = extractCodeBlocks(body);
  const buggyCode = (data.buggyCode as string) || codeBlocks[0]?.code || "// No buggy code provided in lab file";
  const fixedCode = (data.fixedCode as string) || codeBlocks[1]?.code || codeBlocks[0]?.code || "// No fixed code provided in lab file";

  // Extract error info
  const errorCodeMatch = body.match(/(?:error\[?([E0-9]{4,5})\]?|`([E0-9]{4,5})`)/i);
  const errorCode = (data.errorCode as string) || (errorCodeMatch ? (errorCodeMatch[1] || errorCodeMatch[2]) : "E0000");

  const errorMsgMatch = body.match(/(?:error|Error):\s*`?([^\n`]+)`?/i);
  const errorMessage = (data.errorMessage as string) || (errorMsgMatch ? errorMsgMatch[1].trim() : "Compiler error detected");

  // Extract explanation & architecture lessons
  const explanation =
    (data.explanation as string) ||
    extractSection(body, /##\s*(?:Explanation|Why this happens|Analysis)\n([\s\S]*?)(?=\n##|$)/i) ||
    description;

  const architecturalLesson =
    (data.architecturalLesson as string) ||
    extractSection(body, /##\s*(?:Architectural Lesson|Key Takeaway|Production Insight)\n([\s\S]*?)(?=\n##|$)/i) ||
    "Mastering compiler invariants builds robust, race-free zero-cost abstractions.";

  // Category and difficulty
  const category = (data.category as FailureLab["category"]) || "Memory & Ownership";
  const difficulty = (data.difficulty as FailureLab["difficulty"]) || "Intermediate";
  const phase = typeof data.phase === "number" ? data.phase : 1;
  const estimatedMinutes = typeof data.estimatedMinutes === "number" ? data.estimatedMinutes : 20;

  const id = `lab-${baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return {
    id,
    title,
    phase,
    category,
    difficulty,
    estimatedMinutes,
    description,
    errorMessage,
    errorCode,
    buggyCode,
    fixedCode,
    explanation,
    architecturalLesson,
    fileName: path.basename(filePath),
  };
}

/**
 * Dynamically discovers all Failure Labs from the content directory.
 * If no Failure Lab files are present, returns [].
 */
export function getFailureLabs(): FailureLab[] {
  if (!fs.existsSync(CONTENT_ROOT)) return [];

  const labs: FailureLab[] = [];
  const scannedFiles = new Set<string>();

  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
          if (isFailureLabFilename(entry.name) && !scannedFiles.has(fullPath)) {
            scannedFiles.add(fullPath);
            try {
              const raw = fs.readFileSync(fullPath, "utf-8");
              labs.push(parseFailureLabFile(fullPath, raw));
            } catch (err) {
              console.error(`Error parsing Failure Lab file ${fullPath}:`, err);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  walk(CONTENT_ROOT);
  return labs;
}
