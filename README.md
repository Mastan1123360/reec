# REEC

A browser-native **Rust** development and learning environment. Not a
generic online compiler with a language dropdown — Rust is the entire
product, and the architecture, terminology, and UI are built around it
specifically.

REEC also hosts a separate, markdown-driven curriculum platform (see
"The curriculum platform" below) that predates this rebuild and is
untouched by it — the two are independent subsystems in one repo.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
npm run build       # production build
npm run typecheck
npm run test        # unit tests (vitest)
```

No environment variables are required — the Rust backend defaults to
`play.rust-lang.org` with zero configuration. See `.env.local.example`
if you need to point at a different execution service.

## Architecture

```
Browser (RustEditor, Toolbar, DiagnosticsPanel, OutputPanel)
  │  useRustWorkspace()  — lib/rust/state.ts
  │  explicit compiler state machine + project/file model
  ▼
POST /api/rust/[operation]  — app/api/rust/[operation]/route.ts
  │  thin translation layer: validates the request, maps
  │  RustBackendException → the right HTTP status
  ▼
RustExecutionBackend  — lib/rust/playground-adapter.ts
  │  the ONLY file that knows play.rust-lang.org's actual
  │  request/response shapes; everything else talks to this
  │  interface, not to Playground directly
  ▼
play.rust-lang.org  (/execute, /compile, /format)
  │
  ▼
parseRustDiagnostics()  — lib/rust/diagnostics.ts
  │  turns rustc's human-readable stderr into structured
  │  RustDiagnostic[] — level, code, message, file/line/column,
  │  source snippet, underline label — without ever inventing or
  │  rewriting what rustc actually said (raw text always retained)
  ▼
Structured, navigable diagnostics + separated stdout/stderr in the UI
```

### Why this shape

- **The backend is swappable.** `RustExecutionBackend` is one interface
  with one method (`run`). `playground-adapter.ts` is the only file that
  knows Playground's actual endpoints/fields. Pointing REEC at a
  different Rust execution service later is: implement that interface
  again. Nothing else changes.
- **CHECK/BUILD/RUN/TEST/FORMAT are real, distinct operations**, not one
  collapsed "Run" button — mapped onto Playground's actual endpoints:
  CHECK → `/compile` (`target: mir`, the fastest real type-checking
  signal available), BUILD → `/compile` (`target: asm`, full codegen,
  the result becomes an inspectable artifact), RUN/TEST → `/execute`,
  FORMAT → `/format` (rustfmt).
- **The compiler is modeled as an explicit state machine**
  (`CompilerPhase` in `lib/rust/state.ts`), not scattered
  `isLoading`/`isRunning` booleans — at any moment there's exactly one
  answer to "what is REEC doing," including whether a finished operation
  succeeded, failed to compile/run, or REEC itself couldn't reach the
  backend at all (`backend_error` — a fundamentally different failure
  from your code not compiling, and the UI treats it as one).
- **Diagnostics are parsed, not dumped.** rustc's stable, well-documented
  text format is parsed into level/code/message/span/snippet — verified
  against real rustc output in `lib/rust/__tests__/diagnostics.test.ts`
  — with every diagnostic clickable to jump the editor straight to that
  source position. The raw text is always retained and viewable, so
  nothing structured extraction misses is ever lost.
- **The learning layer never touches compiler truth.** `lib/rust/
  learning.ts` has curated, general explanations for common error codes
  (E0382, E0502, E0499, E0507, E0106, E0308, ...). It renders in a
  visually distinct "REEC explanation" block, always below rustc's own
  message, never replacing or rewriting it.

## The Rust IDE (`components/rust-ide/`)

| Component | Role |
|---|---|
| `RustEditor` | CodeMirror 6 + Rust syntax highlighting (via `@codemirror/legacy-modes` — there's no official lezer-based Rust grammar package), line numbers, folding, bracket matching, search, undo/redo |
| `Toolbar` | Check/Build/Run/Test/Format as distinct actions with keyboard shortcuts (⌘⏎, ⇧⌘C/B/T/F) |
| `FileExplorer` | Project files, add/remove, dirty-state indicator |
| `DiagnosticsPanel` | Structured, navigable rustc diagnostics + the learning layer |
| `OutputPanel` | STDOUT / STDERR / status / timing, structurally separated |
| `StatusBar` | Always-visible, unambiguous "what is REEC doing right now" |
| `CommandPalette` | ⌘P — Check/Build/Run/Test/Format/new file/toggle panels |
| `RustIDE` | Composes all of the above into the actual screen |

`RustIDE` is used in two contexts sharing one live state
(`useRustWorkspace`): the full-page `/workspace` sandbox, and a
lesson-triggered slide-in panel (`RustWorkspacePanel` +
`FocusBackdrop`) — opening either shows the same file, because there's
one REEC workspace, reachable two ways. The slide-in panel implements
"focus mode": the lesson content behind it is hidden the instant it
opens, with a hamburger toggle in the panel header to bring it back.

`/hello-reec` is a separate, *persistent* personal file directory
(`lib/files/store.ts`, localStorage-backed) — matching the curriculum's
own Lab 0.1 ("a committed hello_reec repository") — deliberately using
its own local compiler state rather than the shared workspace, since its
file model (named, long-lived files) is genuinely different.

## Testing

```bash
npm run test
```

23 tests in `lib/rust/__tests__/`:
- `diagnostics.test.ts` — the rustc text parser against realistic
  compiler output (a real move-error + warning sample, plus a
  multi-span borrow-conflict sample), verifying level/code/message/span/
  snippet extraction, `= note:` children, summary-line exclusion, and
  that every extracted field traces back to the raw text (nothing
  fabricated).
- `playground-adapter.test.ts` — request routing for all 5 operations
  (mocked fetch), plus error classification (HTTP 500 → `backend_error`,
  429 → `rate_limit`, thrown network errors → `network_error`, with the
  verbatim upstream response body always preserved).

**Not covered yet**, honestly: React component/interaction tests
(command palette selection, editor typing, panel toggling) — would need
a `@testing-library/react` + jsdom setup not yet added. What exists is
real behavioral coverage of the highest-risk logic (diagnostics parsing,
backend request/error handling), not "renders without crashing" tests.

## What I could and couldn't verify directly

I don't have live network access to `play.rust-lang.org` from my own
build/test environment (confirmed via the sandbox's own egress block,
not a real API rejection). What I verified directly:

- The app builds and typechecks cleanly, and all 23 unit tests pass.
- The full error-handling path works end-to-end: a blocked/failed
  request is correctly classified as `backend_error`, with the exact
  upstream message preserved and surfaced in the UI — not a crash, not
  a silently wrong success.
- The diagnostics parser is verified against realistic rustc output
  samples (not live compiler output, since I couldn't reach the
  compiler) — this is real, deterministic logic, so sample-based
  verification is meaningful, unlike guessing at a third-party API's
  current auth requirements.

What I could **not** verify: an actual live Check/Build/Run/Test/Format
round-trip against Playground, or any real browser interaction (typing
in the editor, clicking through the command palette). Run these
yourself once — if anything's off, the diagnostics above (verbatim
upstream error bodies, an explicit state machine, a real test suite)
mean it should be fast to pin down exactly what and why.

## The curriculum platform

REEC reads canonical curriculum content from Supabase (`public.content_files`), which serves as the authoritative production curriculum store. The website is a read-only learning client that consumes published curriculum records and compiles them into rich, interactive study sessions via the REEC parser (`lib/content/parser.ts`).

Curriculum management is strictly external to the learner-facing web application. There is no web ingestion UI or browser upload mechanism. The web application reacts in real time to database changes via Supabase Realtime cache invalidation (`RealtimeContentProvider`). The only integration point between the curriculum platform and the Rust execution architecture is that interactive lesson widgets (`WorkedExample`, `SmartCode`, `MiniChallenge`) open the Rust workspace panel when a learner runs code.

## Deploying

Push to a Git repo and import into Vercel — zero configuration needed.
The Rust execution backend is an external HTTPS call from a Vercel
serverless function; there is no persistent server, Docker host, or
self-hosted execution infrastructure anywhere in this architecture.
