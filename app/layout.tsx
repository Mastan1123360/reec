import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/supabase/auth-context";
import { RealtimeContentProvider } from "@/components/content/RealtimeContentProvider";
import { AppShell } from "@/components/AppShell";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf2f8" },
    { media: "(prefers-color-scheme: dark)", color: "#070b14" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://reec.academy"),
  title: {
    default: "REEC — Rust Elite Engineering Curriculum",
    template: "%s | REEC Academy",
  },
  description:
    "Understand the machine. Then make it yours. An elite, interactive engineering curriculum for master-level Rust systems programming.",
  applicationName: "REEC Academy",
  authors: [{ name: "REEC Systems Lab" }],
  keywords: [
    "Rust",
    "Systems Programming",
    "REEC",
    "Borrow Checker",
    "Non-Lexical Lifetimes",
    "Memory Layout",
    "Zero-Cost Abstractions",
    "Engineering Curriculum",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://reec.academy",
    siteName: "REEC Academy",
    title: "REEC — Rust Elite Engineering Curriculum",
    description:
      "Understand the machine. Then make it yours. An elite, interactive engineering curriculum for master-level Rust systems programming.",
  },
  twitter: {
    card: "summary_large_image",
    title: "REEC — Rust Elite Engineering Curriculum",
    description:
      "Understand the machine. Then make it yours. An elite, interactive engineering curriculum for master-level Rust systems programming.",
  },
  icons: {
    icon: [
      { url: "/icon", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
                  if (target) {
                    var currentFetch = target.fetch;
                    try {
                      Object.defineProperty(target, 'fetch', {
                        get: function() { return currentFetch; },
                        set: function(v) { currentFetch = v; },
                        configurable: true,
                        enumerable: true
                      });
                    } catch (e) {}
                    if (typeof window !== 'undefined' && window !== target) {
                      try {
                        Object.defineProperty(window, 'fetch', {
                          get: function() { return currentFetch; },
                          set: function(v) { currentFetch = v; },
                          configurable: true,
                          enumerable: true
                        });
                      } catch (e) {}
                    }
                  }
                } catch (err) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="h-screen w-screen overflow-hidden bg-[#edf2f8] dark:bg-[#070b14] font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-500/20"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <RealtimeContentProvider>
              <AppShell>
                {children}
              </AppShell>
            </RealtimeContentProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
