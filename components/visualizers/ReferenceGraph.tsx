"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { GitFork, Eye, Lock, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetProps } from "@/lib/widgets/registry";

export interface GraphNode {
  id: string;
  label: string;
  type: "owner" | "shared_ref" | "mut_ref" | "heap_buffer";
  value: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "owns" | "borrows_shared" | "borrows_mut";
  label?: string;
}

export interface ReferenceGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  title?: string;
  description?: string;
}

const DEFAULT_GRAPH_DATA: ReferenceGraphData = {
  title: "Topological Reference & Ownership Graph",
  description: "Live node-link graph mapping owners, shared references (&T), and heap allocations.",
  nodes: [
    { id: "owner_vec", label: "let mut v: Vec<i32>", type: "owner", value: "ptr: 0x8800, len: 3", x: 60, y: 50 },
    { id: "heap_buf", label: "Heap [10, 20, 30]", type: "heap_buffer", value: "0x8800 (12 bytes)", x: 260, y: 50 },
    { id: "ref_r1", label: "let r1 = &v[0]", type: "shared_ref", value: "ptr -> 0x8800 (shared)", x: 60, y: 150 },
    { id: "ref_r2", label: "let r2 = &v[1]", type: "shared_ref", value: "ptr -> 0x8804 (shared)", x: 260, y: 150 },
  ],
  edges: [
    { from: "owner_vec", to: "heap_buf", kind: "owns", label: "owns heap buffer" },
    { from: "ref_r1", to: "heap_buf", kind: "borrows_shared", label: "&v[0]" },
    { from: "ref_r2", to: "heap_buf", kind: "borrows_shared", label: "&v[1]" },
  ],
};

export function ReferenceGraph({ props }: WidgetProps = {}) {
  const data: ReferenceGraphData = (props?.graph as ReferenceGraphData) || DEFAULT_GRAPH_DATA;
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const selectedNode = data.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="my-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070e1d]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <GitFork size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {data.title || "Reference Graph Visualizer"}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {data.description || "Interactive directed graph of pointers and ownership links"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1 text-indigo-500">
            <span className="w-2.5 h-0.5 bg-indigo-500 rounded" /> Owns
          </span>
          <span className="flex items-center gap-1 text-blue-500">
            <span className="w-2.5 h-0.5 bg-blue-500 border-b border-dashed border-blue-500" /> &amp;T
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            <span className="w-2.5 h-0.5 bg-amber-500 rounded" /> &amp;mut T
          </span>
        </div>
      </div>

      {/* SVG Canvas with internal responsive viewport */}
      <div className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950/90 p-3 overflow-x-auto">
        <div className="min-w-[340px] flex justify-center">
          <svg viewBox="0 0 400 220" className="w-full max-w-[500px] h-auto select-none">
            <defs>
              <marker id="arrow-owns" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
              </marker>
              <marker id="arrow-shared" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
              </marker>
              <marker id="arrow-mut" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
              </marker>
            </defs>

            {/* Edges */}
            {data.edges.map((edge, idx) => {
              const fromNode = data.nodes.find((n) => n.id === edge.from);
              const toNode = data.nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const isOwns = edge.kind === "owns";
              const isMut = edge.kind === "borrows_mut";
              const strokeColor = isOwns ? "#6366f1" : isMut ? "#f59e0b" : "#3b82f6";
              const markerId = isOwns ? "arrow-owns" : isMut ? "arrow-mut" : "arrow-shared";

              return (
                <g key={idx}>
                  <line
                    x1={fromNode.x + 50}
                    y1={fromNode.y + 20}
                    x2={toNode.x + 50}
                    y2={toNode.y + 20}
                    stroke={strokeColor}
                    strokeWidth={isOwns ? "2.5" : "1.5"}
                    strokeDasharray={isOwns ? undefined : "4,3"}
                    markerEnd={`url(#${markerId})`}
                  />
                  {edge.label && (
                    <text
                      x={(fromNode.x + toNode.x) / 2 + 50}
                      y={(fromNode.y + toNode.y) / 2 + 12}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {data.nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isOwner = node.type === "owner";
              const isHeap = node.type === "heap_buffer";
              const isMut = node.type === "mut_ref";

              const fill = isHeap ? "#064e3b" : isOwner ? "#312e81" : isMut ? "#78350f" : "#1e3a8a";
              const stroke = isSelected ? "#38bdf8" : isHeap ? "#10b981" : isOwner ? "#818cf8" : isMut ? "#fbbf24" : "#60a5fa";

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="cursor-pointer transition-transform hover:opacity-90"
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={110}
                    height={42}
                    rx={8}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? "2.5" : "1.5"}
                  />
                  <text
                    x={node.x + 55}
                    y={node.y + 17}
                    fill="#f8fafc"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label}
                  </text>
                  <text
                    x={node.x + 55}
                    y={node.y + 31}
                    fill="#cbd5e1"
                    fontSize="8.5"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {node.value.length > 20 ? node.value.slice(0, 18) + "…" : node.value}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Node Inspector Details */}
      {selectedNode ? (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.06] p-3 text-xs flex items-center justify-between">
          <div className="font-mono">
            <span className="text-purple-600 dark:text-purple-400 font-bold">Node Selected:</span>{" "}
            <code>{selectedNode.label}</code> — <span>{selectedNode.value}</span> ({selectedNode.type})
          </div>
          <button
            onClick={() => setSelectedNodeId(null)}
            className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-mono">
          Click any node above to inspect its memory address, permissions, and inbound/outbound references.
        </div>
      )}
    </div>
  );
}
