"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Terminal,
  Compass,
  Layers,
  CheckCircle2,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  MapPin,
  Flame,
  ShieldAlert,
  Cpu,
} from "lucide-react";
import { useHiddenLessonsStore } from "@/lib/hidden-lessons/store";

function playGrandUnlockChime() {
  try {
    if (typeof window === "undefined") return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic Chord Arpeggio: C5 -> E5 -> G5 -> B5 -> D6
    const freqs = [523.25, 659.25, 783.99, 987.77, 1174.66];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.07;
      const duration = 1.3;

      osc.type = idx % 2 === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.16 / (idx + 1), startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    });

    // Sub-bass resonance for grand physical weight
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(130.81, now);
    subOsc.frequency.exponentialRampToValueAtTime(65.41, now + 0.8);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 1.2);
  } catch {
    // AudioContext blocked or not supported
  }
}

function ParticleCanvas({ active }: { active: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const centerX = width / 2;
    const centerY = height / 2;

    const colors = [
      "rgba(168, 85, 247, ", // purple
      "rgba(59, 130, 246, ", // blue
      "rgba(6, 182, 212, ", // cyan
      "rgba(234, 179, 8, ", // amber
      "rgba(255, 255, 255, ", // white
    ];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      decay: number;
      color: string;
      rotation: number;
      vRot: number;
    }

    const particles: Particle[] = [];
    const count = 75;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2.5 + Math.random() * 6.5;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 4.5,
        alpha: 1,
        decay: 0.008 + Math.random() * 0.015,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.1,
      });
    }

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      for (const p of particles) {
        if (p.alpha > 0.01) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.alpha -= p.decay;
          p.rotation += p.vRot;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = `${p.color}${Math.max(0, p.alpha)})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = `${p.color}0.8)`;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (alive) {
        animFrame = requestAnimationFrame(render);
      }
    }

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[105]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

export function GrandUnlockModal() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const isRevealModalOpen = useHiddenLessonsStore((s) => s.isRevealModalOpen);
  const recentUnlockedLesson = useHiddenLessonsStore((s) => s.recentUnlockedLesson);
  const closeRevealModal = useHiddenLessonsStore((s) => s.closeRevealModal);
  const markAsOpened = useHiddenLessonsStore((s) => s.markAsOpened);

  const [soundMuted, setSoundMuted] = React.useState(false);

  // Play audio chime when modal opens
  React.useEffect(() => {
    if (isRevealModalOpen && !soundMuted && !prefersReducedMotion) {
      const timer = setTimeout(() => {
        playGrandUnlockChime();
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [isRevealModalOpen, soundMuted, prefersReducedMotion]);

  // Close on Escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isRevealModalOpen) {
        closeRevealModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRevealModalOpen, closeRevealModal]);

  if (!isRevealModalOpen || !recentUnlockedLesson) {
    return null;
  }

  const lesson = recentUnlockedLesson;

  function handleExplore() {
    closeRevealModal();
    markAsOpened(lesson.lessonId);
    router.push(`/hidden-lessons/${lesson.slug}`);
  }

  function handleViewRoadmap() {
    closeRevealModal();
    markAsOpened(lesson.lessonId);
    router.push("/roadmap");
  }

  function handleDismiss() {
    closeRevealModal();
  }

  const baseDelay = prefersReducedMotion ? 0 : 0.1;
  const signalDelay = prefersReducedMotion ? 0 : 0.25;
  const textDelay = prefersReducedMotion ? 0 : 0.55;
  const contextDelay = prefersReducedMotion ? 0 : 0.85;
  const actionsDelay = prefersReducedMotion ? 0 : 1.1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Particle Fireworks Canvas */}
        {!prefersReducedMotion && <ParticleCanvas active={isRevealModalOpen} />}

        {/* PHASE 1 — ATMOSPHERE: High-contrast backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.35, ease: "easeOut" }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-[#02050e]/85 dark:bg-[#01040a]/92 backdrop-blur-2xl"
        />

        {/* Atmospheric Aura Ring */}
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.6 }}
            className="h-[620px] w-[620px] rounded-full bg-gradient-to-tr from-purple-600/30 via-indigo-600/25 to-cyan-400/20 blur-[130px]"
          />
        </div>

        {/* REVEAL DIALOG CONTAINER */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Hidden Lesson Unlocked"
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.88, y: 24 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.92, y: 12 }
          }
          transition={{
            type: prefersReducedMotion ? "tween" : "spring",
            stiffness: 320,
            damping: 24,
            delay: baseDelay,
          }}
          className="relative w-full max-w-lg sm:max-w-xl overflow-hidden rounded-[26px] sm:rounded-[32px] border border-purple-500/40 dark:border-purple-400/35 bg-white/95 dark:bg-[#080d1a]/95 p-5 sm:p-8 text-slate-900 dark:text-white backdrop-blur-2xl shadow-2xl z-10 select-none"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 32px 80px -16px rgba(0, 0, 0, 0.6), 0 0 50px rgba(168, 85, 247, 0.2)",
          }}
        >
          {/* Top Holographic Sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" />

          {/* Audio Replay & Close Controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
            <button
              onClick={() => {
                if (soundMuted) {
                  setSoundMuted(false);
                  playGrandUnlockChime();
                } else {
                  playGrandUnlockChime();
                }
              }}
              title="Replay Unlock Chime"
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.05] text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 transition-all cursor-pointer"
            >
              <Sparkles size={13} />
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Close"
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.05] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* PHASE 2 — GRAND 3D COORDINATE RETICLE */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: prefersReducedMotion ? 0.1 : 0.45,
              delay: signalDelay,
              ease: "easeOut",
            }}
            className="flex justify-center mb-4 sm:mb-5 pt-1"
          >
            <div className="relative flex items-center justify-center h-22 w-22 sm:h-26 sm:w-26">
              {/* Outer Golden/Purple Orbital Ring */}
              <motion.div
                animate={prefersReducedMotion ? {} : { rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-purple-500/50 dark:border-purple-400/40"
              />

              {/* Inner Coordinate Glow Ring */}
              <motion.div
                animate={prefersReducedMotion ? {} : { rotate: -360 }}
                transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 sm:inset-3 rounded-full border border-dotted border-cyan-400/60 dark:border-cyan-300/50"
              />

              {/* Central Glowing Vault Emblem */}
              <motion.div
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        boxShadow: [
                          "0 0 20px rgba(168, 85, 247, 0.4)",
                          "0 0 35px rgba(168, 85, 247, 0.7)",
                          "0 0 20px rgba(168, 85, 247, 0.4)",
                        ],
                      }
                }
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white font-mono font-extrabold text-sm sm:text-base tracking-wider border border-purple-300/50"
              >
                <span className="relative z-10">{lesson.badge || "NLL"}</span>
                <div className="absolute inset-0 rounded-2xl bg-white/15" />
              </motion.div>

              {/* System Coordinate Stamps */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-purple-600 dark:text-purple-400 font-bold tracking-widest uppercase">
                VAULT·UNLOCKED
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-cyan-600 dark:text-cyan-400 font-bold tracking-widest">
                STAGE·0x7F
              </div>
            </div>
          </motion.div>

          {/* PHASE 3 — REVELATION TYPOGRAPHY */}
          <div className="text-center space-y-1.5 sm:space-y-2">
            {/* Category Discovery Pill */}
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0.1 : 0.25,
                delay: textDelay,
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/35 bg-purple-500/10 dark:bg-purple-950/40 px-3 py-0.5 text-[10.5px] sm:text-[11px] font-mono font-bold tracking-widest text-purple-600 dark:text-purple-400 uppercase"
            >
              <Sparkles size={12} className="text-purple-500 dark:text-purple-400 animate-spin" />
              <span>✦ Hidden Secret Layer Unlocked ✦</span>
            </motion.div>

            {/* Lesson Title */}
            <motion.h2
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0.1 : 0.3,
                delay: textDelay + (prefersReducedMotion ? 0 : 0.1),
              }}
              className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
            >
              {lesson.title}
            </motion.h2>

            {/* Subtitle */}
            {lesson.subtitle && (
              <motion.p
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0.1 : 0.25,
                  delay: textDelay + (prefersReducedMotion ? 0 : 0.2),
                }}
                className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed"
              >
                {lesson.subtitle}
              </motion.p>
            )}
          </div>

          {/* PHASE 4 — ROADMAP PLACEMENT & TRIGGER EVIDENCE */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0.1 : 0.3,
              delay: contextDelay,
            }}
            className="my-4 sm:my-5 space-y-2.5 rounded-2xl border border-purple-500/25 dark:border-white/[0.08] bg-purple-500/[0.03] dark:bg-white/[0.03] p-3.5 sm:p-4 text-left backdrop-blur-md"
          >
            {/* Roadmap Pin Notice */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] sm:text-xs font-semibold">
              <MapPin size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Pinned at the very top of your Curriculum Roadmap for instant access!</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">
                <Terminal size={13} />
                <span className="uppercase tracking-wider text-[10.5px]">
                  Execution Signature
                </span>
              </div>
              <div className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} />
                <span>Compiler Diagnostic Verified</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {lesson.triggerDescription ? (
                <>
                  Your action in <span className="font-semibold text-slate-900 dark:text-white">{lesson.triggerDescription}</span> triggered an internal compiler analysis model.
                </>
              ) : lesson.sourceLessonId ? (
                <>
                  Your execution in <span className="font-semibold text-slate-900 dark:text-white">{lesson.sourceLessonId}</span> unlocked a deeper systems layer.
                </>
              ) : (
                <>
                  Your active code execution revealed a deep-dive compiler concept.
                </>
              )}
            </p>

            {/* Tags */}
            {lesson.tags && lesson.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {lesson.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md border border-purple-500/20 dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.06] px-2 py-0.5 text-[9.5px] font-mono font-medium tracking-wider text-slate-600 dark:text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* PHASE 5 — ACTIONS */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0.1 : 0.3,
              delay: actionsDelay,
            }}
            className="space-y-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleExplore}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 sm:py-3 px-4 text-xs sm:text-sm shadow-lg shadow-purple-500/25 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap"
              >
                <Layers size={15} />
                <span>Launch Deep Dive</span>
                <ArrowRight size={15} />
              </button>

              <button
                onClick={handleViewRoadmap}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 dark:border-purple-500/20 bg-purple-500/[0.05] hover:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold py-2.5 sm:py-3 px-4 text-xs sm:text-sm active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap"
              >
                <MapPin size={14} />
                <span>View on Roadmap</span>
              </button>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full flex items-center justify-center rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.05] hover:bg-slate-200/80 dark:hover:bg-white/[0.09] text-slate-700 dark:text-slate-300 font-medium py-2 px-4 text-xs active:scale-[0.99] transition-all cursor-pointer"
            >
              Continue in Workspace
            </button>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
