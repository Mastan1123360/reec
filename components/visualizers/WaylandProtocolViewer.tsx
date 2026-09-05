"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Monitor, ArrowRight, Layers, Terminal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetProps } from "@/lib/widgets/registry";

export function WaylandProtocolViewer({ props }: WidgetProps = {}) {
  const [messages, setMessages] = React.useState<string[]>([
    "-> wl_compositor@1.create_surface(new_id: wl_surface@3)",
    "-> wl_shm@2.create_pool(new_id: wl_shm_pool@4, fd: 7, size: 8294400)",
    "-> wl_shm_pool@4.create_buffer(new_id: wl_buffer@5, offset: 0, width: 1920, height: 1080, stride: 7680, format: ARGB8888)",
    "-> wl_surface@3.attach(buffer: wl_buffer@5, x: 0, y: 0)",
    "-> wl_surface@3.commit()",
    "<- wl_buffer@5.release() [Compositor GPU swap completed]",
  ]);

  return (
    <div className="my-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070e1d]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <Monitor size={18} className="text-pink-600 dark:text-pink-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Wayland Display Server Protocol &amp; IPC Compositor Pipeline
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Shared memory buffer passing (`wl_shm`), UNIX domain socket wire serialization, and double-buffering
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 text-[11px] font-mono text-pink-600 dark:text-pink-400 self-start sm:self-auto">
          IPC Wire Buffer: Active
        </span>
      </div>

      {/* IPC Wire Architecture Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Client side */}
        <div className="md:col-span-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.05] p-3 text-xs space-y-1.5">
          <div className="font-bold text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1">
            <Terminal size={13} />
            <span>Rust Wayland Client</span>
          </div>
          <p className="text-[11.5px] text-slate-600 dark:text-slate-300">
            Renders pixels directly into anonymous POSIX shared memory (<code>memfd_create</code>). Sends lightweight descriptor and offset over socket.
          </p>
        </div>

        {/* IPC Socket Channel */}
        <div className="md:col-span-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 font-mono text-[10.5px] text-slate-300 overflow-x-auto space-y-1">
          <div className="text-[9.5px] uppercase font-bold text-pink-400 mb-1 flex items-center justify-between">
            <span>UNIX Domain Socket</span>
            <span>Zero Copy</span>
          </div>
          {messages.map((m, i) => (
            <div key={i} className={cn("truncate", m.startsWith("<-") ? "text-emerald-400" : "text-slate-300")}>
              {m}
            </div>
          ))}
        </div>

        {/* Compositor side */}
        <div className="md:col-span-4 rounded-xl border border-purple-500/30 bg-purple-500/[0.05] p-3 text-xs space-y-1.5">
          <div className="font-bold text-purple-600 dark:text-purple-400 font-mono flex items-center gap-1">
            <Layers size={13} />
            <span>Wayland Compositor (KMS/DRM)</span>
          </div>
          <p className="text-[11.5px] text-slate-600 dark:text-slate-300">
            Maps the shared buffer directly to OpenGL/Vulkan texture surfaces. Page flips with zero kernel-space memory copies.
          </p>
        </div>
      </div>
    </div>
  );
}
