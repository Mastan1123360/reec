"use client";

import * as React from "react";
import {
  CircleCheck,
  Hammer,
  Play,
  FlaskConical,
  WandSparkles,
  Square,
  Loader2,
  Copy,
  Check,
  Download,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { useRustWorkspace } from "@/lib/rust/state";
import type { RustEdition, RustOperation, RustProfile } from "@/lib/rust/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPERATIONS: { op: RustOperation; label: string; icon: React.ElementType; shortcut: string }[] = [
  { op: "run", label: "Run", icon: Play, shortcut: "⌘⏎" },
  { op: "check", label: "Check", icon: CircleCheck, shortcut: "⇧⌘C" },
  { op: "build", label: "Build", icon: Hammer, shortcut: "⇧⌘B" },
  { op: "test", label: "Test", icon: FlaskConical, shortcut: "⇧⌘T" },
  { op: "format", label: "Format", icon: WandSparkles, shortcut: "⇧⌘F" },
];

const TEMPLATES: { name: string; category: string; code: string }[] = [
  {
    name: "Hello World (Main)",
    category: "Basics",
    code: `fn main() {
    println!("Hello, REEC Rust Workspace!");
    
    let answer = 6 * 7;
    println!("Computed answer: {}", answer);
}`,
  },
  {
    name: "Borrowing & Mutability",
    category: "Ownership",
    code: `fn main() {
    let mut numbers = vec![10, 20, 30];
    
    // Borrow immutably
    print_slice(&numbers);
    
    // Borrow mutably
    append_number(&mut numbers, 40);
    
    print_slice(&numbers);
}

fn print_slice(slice: &[i32]) {
    println!("Slice view: {:?}", slice);
}

fn append_number(vec: &mut Vec<i32>, val: i32) {
    vec.push(val);
}`,
  },
  {
    name: "Structs & Impl Methods",
    category: "Types",
    code: `#[derive(Debug, Clone)]
struct Account {
    owner: String,
    balance: f64,
}

impl Account {
    fn new(owner: &str, initial_deposit: f64) -> Self {
        Self {
            owner: owner.to_string(),
            balance: initial_deposit,
        }
    }

    fn deposit(&mut self, amount: f64) {
        self.balance += amount;
    }

    fn withdraw(&mut self, amount: f64) -> Result<f64, String> {
        if amount > self.balance {
            Err("Insufficient funds".to_string())
        } else {
            self.balance -= amount;
            Ok(self.balance)
        }
    }
}

fn main() {
    let mut acc = Account::new("Rustacean", 500.0);
    acc.deposit(250.0);
    
    match acc.withdraw(100.0) {
        Ok(new_bal) => println!("New balance for {}: \${:.2}", acc.owner, new_bal),
        Err(e) => println!("Transaction failed: {}", e),
    }
}`,
  },
  {
    name: "Multi-threading & Arc/Mutex",
    category: "Concurrency",
    code: `use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter_clone = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter_clone.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final atomic counter count: {}", *counter.lock().unwrap());
}`,
  },
  {
    name: "Custom Error Handling",
    category: "Errors",
    code: `use std::fmt;

#[derive(Debug)]
enum MathError {
    DivisionByZero,
    NegativeSquareRoot,
}

impl fmt::Display for MathError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MathError::DivisionByZero => write!(f, "Cannot divide by zero"),
            MathError::NegativeSquareRoot => write!(f, "Cannot take square root of negative number"),
        }
    }
}

fn safe_div(a: f64, b: f64) -> Result<f64, MathError> {
    if b == 0.0 {
        Err(MathError::DivisionByZero)
    } else {
        Ok(a / b)
    }
}

fn main() {
    match safe_div(42.0, 0.0) {
        Ok(val) => println!("Result: {}", val),
        Err(e) => println!("Handled custom error: {}", e),
    }
}`,
  },
];

const IN_PROGRESS_STATUSES = new Set(["checking", "building", "running", "testing", "formatting"]);

function activeStatusFor(op: RustOperation) {
  return ({ check: "checking", build: "building", run: "running", test: "testing", format: "formatting" } as const)[
    op
  ];
}

export function Toolbar() {
  const phase = useRustWorkspace((s) => s.phase);
  const runOperation = useRustWorkspace((s) => s.runOperation);
  const cancel = useRustWorkspace((s) => s.cancel);
  const edition = useRustWorkspace((s) => s.project.edition);
  const profile = useRustWorkspace((s) => s.profile);
  const setEdition = useRustWorkspace((s) => s.setEdition);
  const setProfile = useRustWorkspace((s) => s.setProfile);
  const reset = useRustWorkspace((s) => s.reset);
  const updateFileContent = useRustWorkspace((s) => s.updateFileContent);
  const project = useRustWorkspace((s) => s.project);
  const activeFile = project.files.find((f) => f.id === project.activeFileId) ?? project.files[0];

  const [copied, setCopied] = React.useState(false);
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const busy = IN_PROGRESS_STATUSES.has(phase.status);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "Enter") {
        e.preventDefault();
        runOperation("run");
      } else if (e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        runOperation("check");
      } else if (e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        runOperation("build");
      } else if (e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        runOperation("test");
      } else if (e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        runOperation("format");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runOperation]);

  const handleCopyCode = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadCode = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.path.split("/").pop() || "main.rs";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadTemplate = (code: string) => {
    if (!activeFile) return;
    updateFileContent(activeFile.id, code);
    setTemplateOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/[0.06] bg-white/70 dark:bg-[#090f1d]/75 px-3 py-2 backdrop-blur-xl overflow-x-auto scrollbar-none">
      {/* Primary Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {OPERATIONS.map(({ op, label, icon: Icon, shortcut }) => {
          const isActive = busy && phase.status === activeStatusFor(op);
          const isPrimary = op === "run";

          return (
            <Button
              key={op}
              size="sm"
              variant={isPrimary ? "default" : "outline"}
              disabled={busy && !isActive}
              onClick={() => runOperation(op)}
              title={`${label} (${shortcut})`}
              className={cn(
                "h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all shadow-xs",
                isActive && "opacity-80"
              )}
            >
              {isActive ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
              <span className="ml-1.5">{label}</span>
            </Button>
          );
        })}

        {busy && (
          <Button
            size="sm"
            variant="ghost"
            onClick={cancel}
            className="h-8 px-2 text-xs text-rose-500 hover:bg-rose-500/10 rounded-xl"
          >
            <Square size={12} className="mr-1 fill-current" /> Cancel
          </Button>
        )}
      </div>

      {/* Utilities: Template Picker, Copy, Download, Reset */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {/* Templates Dropdown */}
        <div className="relative">
          <button
            onClick={() => setTemplateOpen((o) => !o)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white/75 dark:bg-white/[0.05] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:border-blue-500/40 transition-all backdrop-blur-md shadow-xs"
            style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4)" }}
            title="Load starter template"
          >
            <BookOpen size={13} className="text-blue-500" />
            <span className="hidden sm:inline">Snippets</span>
          </button>

          {templateOpen && (
            <div className="absolute right-0 top-10 z-50 w-64 rounded-2xl border border-slate-200/80 dark:border-white/[0.1] bg-white/95 dark:bg-[#0c1424]/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Starter Snippets
              </div>
              <div className="space-y-0.5 mt-1">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => handleLoadTemplate(t.code)}
                    className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs rounded-xl hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-slate-800 dark:text-slate-200"
                  >
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{t.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Copy Code */}
        <button
          onClick={handleCopyCode}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white/75 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-blue-500/40 transition-all backdrop-blur-md shadow-xs"
          style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4)" }}
          title="Copy code to clipboard"
          aria-label="Copy code"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        </button>

        {/* Download .rs */}
        <button
          onClick={handleDownloadCode}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white/75 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-blue-500/40 transition-all backdrop-blur-md shadow-xs"
          style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4)" }}
          title="Download Rust file"
          aria-label="Download code"
        >
          <Download size={13} />
        </button>

        {/* Reset Workspace */}
        <button
          onClick={() => {
            if (confirm("Reset current file to default starter code?")) {
              reset();
            }
          }}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white/75 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:border-rose-500/40 transition-all backdrop-blur-md shadow-xs"
          style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4)" }}
          title="Reset to starter"
          aria-label="Reset workspace"
        >
          <RotateCcw size={13} />
        </button>

        {/* Toolchain Selectors (Edition & Profile) */}
        <div className="hidden md:flex items-center gap-1.5 pl-1.5 border-l border-slate-200/60 dark:border-white/[0.06]">
          <select
            aria-label="Rust edition"
            value={edition}
            onChange={(e) => setEdition(e.target.value as RustEdition)}
            className="h-7.5 rounded-lg border border-slate-200/70 dark:border-white/[0.08] bg-white/75 dark:bg-white/[0.05] px-2 text-[11px] font-mono text-slate-700 dark:text-slate-300 outline-none backdrop-blur-md"
          >
            <option value="2021" className="dark:bg-[#0c1322]">2021</option>
            <option value="2024" className="dark:bg-[#0c1322]">2024</option>
            <option value="2018" className="dark:bg-[#0c1322]">2018</option>
            <option value="2015" className="dark:bg-[#0c1322]">2015</option>
          </select>

          <select
            aria-label="Build profile"
            value={profile}
            onChange={(e) => setProfile(e.target.value as RustProfile)}
            className="h-7.5 rounded-lg border border-slate-200/70 dark:border-white/[0.08] bg-white/75 dark:bg-white/[0.05] px-2 text-[11px] font-mono text-slate-700 dark:text-slate-300 outline-none backdrop-blur-md"
          >
            <option value="debug" className="dark:bg-[#0c1322]">debug</option>
            <option value="release" className="dark:bg-[#0c1322]">release</option>
          </select>
        </div>
      </div>
    </div>
  );
}
