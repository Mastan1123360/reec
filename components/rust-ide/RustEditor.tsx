"use client";

import * as React from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { rust } from "@codemirror/lang-rust";
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
  nextSnippetField,
  prevSnippetField,
  clearSnippet,
} from "@codemirror/autocomplete";
import {
  indentUnit,
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  indentOnInput,
  foldGutter,
} from "@codemirror/language";
import {
  defaultKeymap,
  historyKeymap,
  history,
  indentWithTab,
} from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  keymap,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useTheme } from "@/components/ThemeProvider";
import { rustCompletionsSource, rustKeymap } from "@/lib/rust/rust-editor-intelligence";

// Dark CodeMirror Theme with Apple Glass Tooltip
const darkEditorTheme = EditorView.theme(
  {
    "&": {
      fontSize: "13px",
      height: "100%",
      backgroundColor: "transparent",
      color: "#f1f5f9",
    },
    ".cm-scroller": {
      fontFamily:
        "var(--font-mono, ui-monospace), 'SF Mono', Menlo, Consolas, monospace",
      lineHeight: "1.65",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      borderRight: "1px solid rgba(255, 255, 255, 0.05)",
      color: "#64748b",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.06)",
      color: "#93c5fd",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-cursor, &.cm-focused .cm-cursor": {
      borderLeftColor: "#3b82f6",
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(59, 130, 246, 0.28) !important",
    },
    ".cm-content": {
      caretColor: "#3b82f6",
      color: "#f1f5f9",
      padding: "12px 0",
    },
    ".cm-line": {
      padding: "0 14px",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "rgba(59, 130, 246, 0.25)",
      outline: "1px solid rgba(59, 130, 246, 0.45)",
      borderRadius: "2px",
    },
    // Autocomplete Glass UI
    ".cm-tooltip": {
      backgroundColor: "rgba(15, 23, 42, 0.92) !important",
      backdropFilter: "blur(16px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.12) !important",
      borderRadius: "12px",
      boxShadow: "0 12px 36px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
      overflow: "hidden",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul": {
        fontFamily: "var(--font-mono, ui-monospace), monospace",
        fontSize: "12px",
        maxHeight: "240px",
        padding: "4px",
      },
      "& > ul > li": {
        borderRadius: "8px",
        padding: "4px 8px",
        margin: "1px 0",
        color: "#cbd5e1",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: "rgba(59, 130, 246, 0.25) !important",
        color: "#ffffff !important",
      },
    },
    ".cm-completionLabel": {
      fontWeight: "600",
    },
    ".cm-completionMatchedText": {
      color: "#38bdf8 !important",
      textDecoration: "underline",
      fontWeight: "700",
    },
    ".cm-completionDetail": {
      fontStyle: "normal",
      color: "#94a3b8",
      fontSize: "11px",
      marginLeft: "auto",
      paddingLeft: "12px",
      opacity: 0.85,
    },
    ".cm-completionInfo": {
      padding: "8px 12px !important",
      borderRadius: "10px !important",
      backgroundColor: "rgba(15, 23, 42, 0.95) !important",
      border: "1px solid rgba(255, 255, 255, 0.1) !important",
      color: "#e2e8f0 !important",
      fontSize: "11.5px !important",
      maxWidth: "320px",
    },
  },
  { dark: true }
);

// Light CodeMirror Theme with Apple Glass Tooltip
const lightEditorTheme = EditorView.theme(
  {
    "&": {
      fontSize: "13px",
      height: "100%",
      backgroundColor: "transparent",
      color: "#0f172a",
    },
    ".cm-scroller": {
      fontFamily:
        "var(--font-mono, ui-monospace), 'SF Mono', Menlo, Consolas, monospace",
      lineHeight: "1.65",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      borderRight: "1px solid rgba(0, 0, 0, 0.06)",
      color: "#94a3b8",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(0, 0, 0, 0.04)",
      color: "#2563eb",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(0, 0, 0, 0.025)",
    },
    ".cm-cursor, &.cm-focused .cm-cursor": {
      borderLeftColor: "#2563eb",
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(37, 99, 235, 0.2) !important",
    },
    ".cm-content": {
      caretColor: "#2563eb",
      color: "#0f172a",
      padding: "12px 0",
    },
    ".cm-line": {
      padding: "0 14px",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "rgba(37, 99, 235, 0.18)",
      outline: "1px solid rgba(37, 99, 235, 0.4)",
      borderRadius: "2px",
    },
    // Autocomplete Glass UI
    ".cm-tooltip": {
      backgroundColor: "rgba(255, 255, 255, 0.95) !important",
      backdropFilter: "blur(16px) saturate(180%)",
      border: "1px solid rgba(0, 0, 0, 0.08) !important",
      borderRadius: "12px",
      boxShadow: "0 12px 36px -4px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
      overflow: "hidden",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul": {
        fontFamily: "var(--font-mono, ui-monospace), monospace",
        fontSize: "12px",
        maxHeight: "240px",
        padding: "4px",
      },
      "& > ul > li": {
        borderRadius: "8px",
        padding: "4px 8px",
        margin: "1px 0",
        color: "#334155",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: "rgba(37, 99, 235, 0.12) !important",
        color: "#1e3a8a !important",
      },
    },
    ".cm-completionLabel": {
      fontWeight: "600",
    },
    ".cm-completionMatchedText": {
      color: "#0284c7 !important",
      textDecoration: "underline",
      fontWeight: "700",
    },
    ".cm-completionDetail": {
      fontStyle: "normal",
      color: "#64748b",
      fontSize: "11px",
      marginLeft: "auto",
      paddingLeft: "12px",
      opacity: 0.85,
    },
    ".cm-completionInfo": {
      padding: "8px 12px !important",
      borderRadius: "10px !important",
      backgroundColor: "rgba(255, 255, 255, 0.98) !important",
      border: "1px solid rgba(0, 0, 0, 0.08) !important",
      color: "#0f172a !important",
      fontSize: "11.5px !important",
      maxWidth: "320px",
    },
  },
  { dark: false }
);

// Restrained Apple Dark Syntax Highlighting
const darkHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "#38bdf8", fontWeight: "600" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#e2e8f0" },
  { tag: [t.function(t.variableName), t.labelName], color: "#60a5fa" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#f59e0b" },
  { tag: [t.definition(t.name), t.separator], color: "#f8fafc" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#a78bfa" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "#38bdf8" },
  { tag: [t.meta, t.comment], color: "#64748b", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#60a5fa", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#60a5fa" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#fb7185" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#34d399" },
  { tag: t.invalid, color: "#f43f5e" },
]);

// Restrained Apple Light Syntax Highlighting
const lightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "#0284c7", fontWeight: "600" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#1e293b" },
  { tag: [t.function(t.variableName), t.labelName], color: "#2563eb" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#d97706" },
  { tag: [t.definition(t.name), t.separator], color: "#0f172a" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#7c3aed" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "#0284c7" },
  { tag: [t.meta, t.comment], color: "#94a3b8", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#2563eb", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#2563eb" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#e11d48" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#059669" },
  { tag: t.invalid, color: "#e11d48" },
]);

export interface RustEditorHandle {
  jumpTo: (line: number, column: number) => void;
  focus: () => void;
}

export const RustEditor = React.forwardRef<
  RustEditorHandle,
  {
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
  }
>(function RustEditor({ value, onChange, readOnly = false }, ref) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const viewRef = React.useRef<EditorView | null>(null);

  React.useImperativeHandle(ref, () => ({
    jumpTo: (line, column) => {
      const view = viewRef.current;
      if (!view) return;
      const lineInfo = view.state.doc.line(
        Math.min(Math.max(line, 1), view.state.doc.lines)
      );
      const pos = Math.min(lineInfo.from + Math.max(column - 1, 0), lineInfo.to);
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });
      view.focus();
    },
    focus: () => {
      viewRef.current?.focus();
    },
  }));

  const extensions = React.useMemo(() => {
    return [
      // 1. Full Lezer Rust language support (AST parsing, syntax-tree indentation)
      rust(),

      // 2. Rust-standard 4-space indentation and dynamic auto-indent
      indentUnit.of("    "),
      indentOnInput(),

      // 3. Bracket matching & intelligent bracket / quote pairing
      bracketMatching(),
      closeBrackets(),

      // 4. Contextual Rust Autocompletion & Snippets
      autocompletion({
        override: [rustCompletionsSource],
        activateOnTyping: true,
        maxRenderedOptions: 12,
        defaultKeymap: false,
        icons: true,
      }),

      // 5. Search & Match Highlights
      highlightSelectionMatches(),

      // 6. Restrained Apple Glass Visual Theming
      isDark ? darkEditorTheme : lightEditorTheme,
      syntaxHighlighting(isDark ? darkHighlightStyle : lightHighlightStyle),
      EditorView.lineWrapping,

      // 7. Ordered Extensions & Keymaps for intuitive, modern editor intelligence
      keymap.of([
        { key: "Tab", run: nextSnippetField, shift: prevSnippetField },
        { key: "Escape", run: clearSnippet },
        ...closeBracketsKeymap,
        ...rustKeymap,
        ...completionKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
    ];
  }, [isDark]);

  return (
    <div className="h-full w-full overflow-hidden select-text">
      <CodeMirror
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        theme={isDark ? "dark" : "light"}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: false, // handled directly in extensions with full AST support
          closeBrackets: false, // handled directly in extensions
          autocompletion: false, // handled directly in extensions
          history: true,
          indentOnInput: false, // handled directly in extensions
          defaultKeymap: false, // handled directly in extensions
          historyKeymap: false, // handled directly in extensions
          closeBracketsKeymap: false, // handled directly in extensions
        }}
        onCreateEditor={(view) => {
          viewRef.current = view;
        }}
        height="100%"
        className="h-full"
      />
    </div>
  );
});
