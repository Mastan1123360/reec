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
    default: "REEC Academy",
    template: "%s | REEC Academy",
  },
  description:
    "An interactive learning engine that renders engineering curriculum markdown into rich educational experiences with live Rust execution.",
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
      { url: "/logo.png", sizes: "any", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="fetch-getter-protection"
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    if (typeof window === "undefined") return;

    var _fetch = window.fetch;

    // 1. Intercept Object.defineProperty and Object.defineProperties so any rogue
    // definition of 'fetch' without a setter automatically gets a setter attached.
    try {
      var origDefProp = Object.defineProperty;
      Object.defineProperty = function(obj, prop, descriptor) {
        try {
          if (prop === "fetch" && descriptor) {
            if (descriptor.get && !descriptor.set) {
              var customFn = null;
              var origGet = descriptor.get;
              descriptor.set = function(fn) { customFn = fn; };
              descriptor.get = function() {
                return customFn !== null ? customFn : origGet.call(this);
              };
            }
            if (descriptor.writable === false) {
              descriptor.writable = true;
            }
            descriptor.configurable = true;
          }
        } catch (e) {}
        return origDefProp.call(Object, obj, prop, descriptor);
      };

      var origDefProps = Object.defineProperties;
      Object.defineProperties = function(obj, props) {
        try {
          if (props && props.fetch) {
            if (props.fetch.get && !props.fetch.set) {
              var customFn2 = null;
              var origGet2 = props.fetch.get;
              props.fetch.set = function(fn) { customFn2 = fn; };
              props.fetch.get = function() {
                return customFn2 !== null ? customFn2 : origGet2.call(this);
              };
            }
            if (props.fetch.writable === false) {
              props.fetch.writable = true;
            }
            props.fetch.configurable = true;
          }
        } catch (e) {}
        return origDefProps.call(Object, obj, props);
      };
    } catch (eDef) {}

    // 2. Ensure Window.prototype and any prototype on the window chain has a setter for fetch
    try {
      var curr = window;
      while (curr) {
        try {
          var protoDesc = Object.getOwnPropertyDescriptor(curr, "fetch");
          if (protoDesc) {
            if (protoDesc.get && !protoDesc.set) {
              var currentGet = protoDesc.get;
              Object.defineProperty(curr, "fetch", {
                get: function() {
                  return (this && this._custom_fetch) || currentGet.call(this);
                },
                set: function(fn) {
                  if (this && this !== window) {
                    this._custom_fetch = fn;
                  } else {
                    _fetch = fn;
                  }
                },
                configurable: true,
                enumerable: true
              });
            }
          }
        } catch (eProto) {}
        curr = Object.getPrototypeOf(curr);
      }
    } catch (eChain) {}

    // 3. Define an own writable property on window, globalThis, and self
    try {
      Object.defineProperty(window, "fetch", {
        get: function() { return _fetch; },
        set: function(fn) { _fetch = fn; },
        configurable: true,
        enumerable: true
      });
    } catch (e2) {}

    try {
      if (typeof globalThis !== "undefined" && globalThis !== window) {
        Object.defineProperty(globalThis, "fetch", {
          get: function() { return _fetch; },
          set: function(fn) { _fetch = fn; },
          configurable: true,
          enumerable: true
        });
      }
    } catch (eGlobal) {}

    try {
      if (typeof self !== "undefined" && self !== window) {
        Object.defineProperty(self, "fetch", {
          get: function() { return _fetch; },
          set: function(fn) { _fetch = fn; },
          configurable: true,
          enumerable: true
        });
      }
    } catch (eSelf) {}

    // 4. Catch and suppress any uncaught errors regarding window.fetch getter
    var isFetchGetterError = function(str) {
      return typeof str === "string" && (
        str.indexOf("Cannot set property fetch of") !== -1 ||
        str.indexOf("fetch of #<Window>") !== -1 ||
        str.indexOf("which has only a getter") !== -1
      );
    };

    var prevOnError = window.onerror;
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      if (isFetchGetterError(msg) || (error && isFetchGetterError(error.message))) {
        return true;
      }
      if (typeof prevOnError === "function") {
        return prevOnError.apply(this, arguments);
      }
      return false;
    };

    window.addEventListener("error", function(event) {
      if (
        event &&
        (isFetchGetterError(event.message) || (event.error && isFetchGetterError(event.error.message)))
      ) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        return true;
      }
    }, true);

    window.addEventListener("unhandledrejection", function(event) {
      var reason = event && event.reason;
      var msg = (reason && reason.message) || (typeof reason === "string" ? reason : "");
      if (isFetchGetterError(msg)) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      }
    });

    // 5. Suppress console.error if any third-party script logs fetch getter errors
    if (typeof console !== "undefined" && console.error) {
      var origConsoleError = console.error;
      console.error = function() {
        for (var i = 0; i < arguments.length; i++) {
          var arg = arguments[i];
          var msg = (arg && arg.message) || (typeof arg === "string" ? arg : "");
          if (isFetchGetterError(msg)) return;
        }
        return origConsoleError.apply(console, arguments);
      };
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
