/**
 * lib/materials.ts
 *
 * The authoritative Global REEC Apple Glass Material System.
 * Defines shared material tokens, classes, and styles consumed across
 * every surface in the application (Dashboard, Lessons, Projects,
 * IDE, Terminal, Bookmarks, Upload, Search, Menus, Overlays).
 */

export const REEC_MATERIALS = {
  // Ambient environment background refraction
  environment:
    "relative min-h-screen w-full bg-[#f6f8fb] dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/20",

  // Ambient lights layer (to be placed behind glass surfaces)
  environmentAura:
    "pointer-events-none fixed inset-0 z-0 opacity-40 dark:opacity-25 bg-[radial-gradient(at_15%_15%,rgba(191,219,254,0.45)_0px,transparent_60%),radial-gradient(at_85%_85%,rgba(219,234,254,0.35)_0px,transparent_60%)] dark:bg-[radial-gradient(at_20%_20%,rgba(30,58,138,0.25)_0px,transparent_60%),radial-gradient(at_80%_80%,rgba(15,23,42,0.6)_0px,transparent_60%)]",

  // Glass Shell: Major structural panes (Desktop Sidebar, Persistent Nav, Header)
  glassShell:
    "bg-white/70 dark:bg-[#090f1d]/75 backdrop-blur-2xl backdrop-saturate-150 border-slate-200/60 dark:border-white/[0.08]",

  // Glass Surface: Standard cards, content panels, article sections
  glassSurface:
    "rounded-[20px] border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/75 backdrop-blur-xl backdrop-saturate-150 shadow-xs transition-all duration-200",

  // Glass Surface with hover elevation
  glassSurfaceInteractive:
    "rounded-[20px] border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/75 backdrop-blur-xl backdrop-saturate-150 shadow-xs hover:border-blue-500/40 hover:bg-white/85 dark:hover:bg-[#111a2e]/85 hover:shadow-md transition-all duration-200",

  // Glass Elevated: Floating cards, dropdown menus, popovers
  glassElevated:
    "rounded-2xl border border-slate-200/70 dark:border-white/[0.1] bg-white/85 dark:bg-[#0c1424]/90 backdrop-blur-2xl backdrop-saturate-150 shadow-xl",

  // Glass Floating: Overlays, Modals, Search Dialog, Command Palette
  glassFloating:
    "rounded-2xl border border-slate-200/70 dark:border-white/[0.12] bg-white/90 dark:bg-[#0a101e]/95 backdrop-blur-3xl backdrop-saturate-150 shadow-2xl",

  // Glass Control: Buttons, inputs, search triggers, pill badges
  glassControl:
    "border border-slate-200/70 dark:border-white/[0.08] bg-white/75 dark:bg-white/[0.05] backdrop-blur-md shadow-xs transition-all hover:border-blue-500/40 hover:bg-white/90 dark:hover:bg-white/[0.09] active:scale-[0.99]",

  // Glass Active: Active pill, selected tab, current phase/lesson
  glassActive:
    "border border-blue-500/40 bg-blue-500/12 text-blue-600 dark:text-blue-400 font-semibold shadow-xs backdrop-blur-md",

  // Glass Input: Search boxes, code workspace inputs, form text fields
  glassInput:
    "rounded-xl border border-slate-200/70 dark:border-white/[0.1] bg-white/60 dark:bg-white/[0.04] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 backdrop-blur-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all",

  // Glass Terminal & Technical: Darker translucent surface for IDE, Code blocks, Compiler output
  glassTerminal:
    "rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-[#f8fafc]/90 dark:bg-[#060a12]/90 backdrop-blur-xl shadow-inner font-mono text-slate-800 dark:text-slate-200",

  // Specular Highlight inline styles (Apple glass top reflection)
  specularLight: "inset 0 1px 0 rgba(255, 255, 255, 0.45)",
  specularStrong: "inset 0 1px 0 rgba(255, 255, 255, 0.7)",
  specularDark: "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
};
