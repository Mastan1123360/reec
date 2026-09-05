import Link from "next/link";
import { Compass, Home, Map } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-28 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.04] text-blue-500 shadow-xs backdrop-blur-xl mb-4"
        style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45)" }}
      >
        <Compass size={32} />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">404</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        This curriculum module doesn&rsquo;t exist yet — or the slug doesn&rsquo;t match anything published in the curriculum.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 dark:border-white/[0.1] bg-white/80 dark:bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-xs backdrop-blur-md"
          style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45)" }}
        >
          <Home size={13} />
          Back to Dashboard
        </Link>
        <Link
          href="/roadmap"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs"
        >
          <Map size={13} />
          View Roadmap
        </Link>
      </div>
    </div>
  );
}
