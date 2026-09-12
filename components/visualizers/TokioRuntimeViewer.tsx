"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, Play, RotateCcw, CheckCircle2, Server, Cpu, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetProps } from "@/lib/widgets/registry";

interface TaskItem {
  id: string;
  name: string;
  state: "ready" | "polling" | "pending" | "completed";
  thread: string;
  wakerRegistered: boolean;
}

export function TokioRuntimeViewer({ props }: WidgetProps = {}) {
  const [tasks, setTasks] = React.useState<TaskItem[]>([
    { id: "task-1", name: "tokio::spawn(fetch_order(42))", state: "polling", thread: "Worker 0", wakerRegistered: true },
    { id: "task-2", name: "tokio::spawn(db_write(user))", state: "ready", thread: "Worker 1", wakerRegistered: false },
    { id: "task-3", name: "tokio::spawn(timer_sleep(100ms))", state: "pending", thread: "Reactor epoll", wakerRegistered: true },
  ]);

  const [epollEvents, setEpollEvents] = React.useState<string[]>([
    "MIO / epoll_wait: fd=12 (TCP socket read ready)",
    "Timer wheel: tick=420ms expired",
  ]);

  const simulateStep = () => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.state === "ready") return { ...t, state: "polling" };
        if (t.state === "polling") return { ...t, state: "pending", wakerRegistered: true };
        if (t.state === "pending") return { ...t, state: "completed" };
        return { ...t, state: "ready" };
      })
    );
  };

  return (
    <div className="my-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070e1d]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <Activity size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tokio Async Runtime: Work-Stealing Executor &amp; Reactor Loop
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Future state machine polling, Waker wakeups, and epoll/kqueue event demultiplexing
            </p>
          </div>
        </div>

        <button
          onClick={simulateStep}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
        >
          <RefreshCw size={12} />
          <span>Step Executor Event Loop</span>
        </button>
      </div>

      {/* Task Queue & Reactor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Worker Threads Queue */}
        <div className="md:col-span-7 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
            <div className="flex items-center gap-1.5">
              <Cpu size={14} className="text-teal-500" />
              <span>Multi-Threaded Work-Stealing Tasks</span>
            </div>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 p-2.5 text-xs flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    {task.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Assigned: {task.thread} | Waker: {task.wakerRegistered ? "Registered" : "None"}
                  </div>
                </div>

                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase",
                    task.state === "ready"
                      ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      : task.state === "polling"
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse"
                      : task.state === "pending"
                      ? "bg-purple-500/20 text-purple-600 dark:text-purple-400"
                      : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {task.state}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reactor / epoll demultiplexer */}
        <div className="md:col-span-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/50 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
            <Server size={14} className="text-indigo-500" />
            <span>I/O Reactor (epoll / kqueue)</span>
          </div>

          <div className="space-y-1.5 font-mono text-[10.5px]">
            {epollEvents.map((ev, i) => (
              <div key={i} className="p-2 rounded bg-slate-950 text-teal-300 border border-white/5">
                {ev}
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
            When OS file descriptors become readable, the Reactor calls <code>Waker::wake()</code>, immediately rescheduling the suspended task back onto a worker queue without thread context-switching.
          </div>
        </div>
      </div>
    </div>
  );
}
