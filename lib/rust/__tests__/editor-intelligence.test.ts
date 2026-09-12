import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { rust } from "@codemirror/lang-rust";
import {
  closeBrackets,
  insertBracket,
  deleteBracketPair,
  CompletionContext,
} from "@codemirror/autocomplete";
import { indentUnit, indentOnInput, ensureSyntaxTree } from "@codemirror/language";
import { rustCompletionsSource, rustSmartEnter } from "../rust-editor-intelligence";

describe("42. Professional Editor Intelligence", () => {
  const createTestState = (doc: string, anchor = doc.length, head = anchor) => {
    const state = EditorState.create({
      doc,
      selection: { anchor, head },
      extensions: [
        rust(),
        indentUnit.of("    "),
        indentOnInput(),
        closeBrackets(),
      ],
    });
    ensureSyntaxTree(state, state.doc.length, 5000);
    return state;
  };

  describe("Automatic bracket and quote pairing", () => {
    it("inserts matching pair when typing opening parenthesis '('", () => {
      const state = createTestState("");
      const tr = insertBracket(state, "(");
      expect(tr).not.toBeNull();
      const updatedState = tr!.state;
      expect(updatedState.doc.toString()).toBe("()");
      expect(updatedState.selection.main.head).toBe(1);
    });

    it("inserts matching pair when typing opening curly brace '{'", () => {
      const state = createTestState("fn main() ");
      const tr = insertBracket(state, "{");
      expect(tr).not.toBeNull();
      const updatedState = tr!.state;
      expect(updatedState.doc.toString()).toBe("fn main() {}");
      expect(updatedState.selection.main.head).toBe(11);
    });

    it("inserts matching pair when typing opening square bracket '['", () => {
      const state = createTestState("let arr = ");
      const tr = insertBracket(state, "[");
      expect(tr).not.toBeNull();
      const updatedState = tr!.state;
      expect(updatedState.doc.toString()).toBe("let arr = []");
      expect(updatedState.selection.main.head).toBe(11);
    });

    it("inserts matching pair when typing double quotes '\"'", () => {
      const state = createTestState("let msg = ");
      const tr = insertBracket(state, '"');
      expect(tr).not.toBeNull();
      const updatedState = tr!.state;
      expect(updatedState.doc.toString()).toBe('let msg = ""');
      expect(updatedState.selection.main.head).toBe(11);
    });
  });

  describe("Smart deletion", () => {
    it("removes both brackets when Backspace is pressed between empty pair '()'", () => {
      const state = createTestState("()", 1);
      let deletedTr: any;
      const handled = deleteBracketPair({
        state,
        dispatch: (tr: any) => {
          deletedTr = tr;
        },
      } as any);

      expect(handled).toBe(true);
      expect(deletedTr.state.doc.toString()).toBe("");
    });

    it("removes both braces when Backspace is pressed between empty pair '{}'", () => {
      const state = createTestState("{}", 1);
      let deletedTr: any;
      const handled = deleteBracketPair({
        state,
        dispatch: (tr: any) => {
          deletedTr = tr;
        },
      } as any);

      expect(handled).toBe(true);
      expect(deletedTr.state.doc.toString()).toBe("");
    });

    it("removes both quotes when Backspace is pressed between empty pair '\"\"'", () => {
      const state = createTestState('""', 1);
      let deletedTr: any;
      const handled = deleteBracketPair({
        state,
        dispatch: (tr: any) => {
          deletedTr = tr;
        },
      } as any);

      expect(handled).toBe(true);
      expect(deletedTr.state.doc.toString()).toBe("");
    });
  });

  describe("Selection awareness", () => {
    it("wraps selected text in parentheses when typing '(' instead of destroying selection", () => {
      const doc = "hello_world";
      const state = createTestState(doc, 0, doc.length);
      const tr = insertBracket(state, "(");
      expect(tr).not.toBeNull();
      expect(tr!.state.doc.toString()).toBe("(hello_world)");
    });

    it("wraps selected text in brackets when typing '['", () => {
      const doc = "1, 2, 3";
      const state = createTestState(doc, 0, doc.length);
      const tr = insertBracket(state, "[");
      expect(tr).not.toBeNull();
      expect(tr!.state.doc.toString()).toBe("[1, 2, 3]");
    });

    it("wraps selected text in braces when typing '{'", () => {
      const doc = "let x = 10;";
      const state = createTestState(doc, 0, doc.length);
      const tr = insertBracket(state, "{");
      expect(tr).not.toBeNull();
      expect(tr!.state.doc.toString()).toBe("{let x = 10;}");
    });
  });

  describe("Smart Enter / indentation", () => {
    it("indents 4 spaces inside a function block on Enter", () => {
      const doc = "fn main() {}";
      const state = createTestState(doc, 11);
      let updatedState: any;
      const handled = rustSmartEnter({
        state,
        dispatch: (tr: any) => {
          updatedState = tr.state;
        },
      } as any);

      expect(handled).toBe(true);
      expect(updatedState).toBeDefined();
      const lines = updatedState.doc.toString().split("\n");
      expect(lines.length).toBe(3);
      expect(lines[0]).toBe("fn main() {");
      expect(lines[1]).toBe("    ");
      expect(lines[2]).toBe("}");
    });

    it("structurally indents nested blocks", () => {
      const doc = "fn main() {\n    if condition {}\n}";
      const bracePos = doc.indexOf("{}") + 1;
      const state = createTestState(doc, bracePos);
      let updatedState: any;
      const handled = rustSmartEnter({
        state,
        dispatch: (tr: any) => {
          updatedState = tr.state;
        },
      } as any);

      expect(handled).toBe(true);
      expect(updatedState).toBeDefined();
      const lines = updatedState.doc.toString().split("\n");
      expect(lines.length).toBe(5);
      expect(lines[2]).toBe("        "); // 8 spaces for nested block
    });
  });

  describe("Rust completions & snippets", () => {
    it("provides contextual Rust snippets, types and keywords", async () => {
      const state = createTestState("fn m", 4);
      const context = new CompletionContext(state, 4, false);

      const result = await (rustCompletionsSource as any)(context);
      expect(result).not.toBeNull();
      expect(result.options.some((opt: any) => opt.label === "fn main")).toBe(true);
      expect(result.options.some((opt: any) => opt.label === "match")).toBe(true);
      expect(result.options.some((opt: any) => opt.label === "println!")).toBe(true);
      expect(result.options.some((opt: any) => opt.label === "Vec")).toBe(true);
      expect(result.options.some((opt: any) => opt.label === "String")).toBe(true);
    });

    it("does not trigger completions inside line comments", async () => {
      const doc = "// this is a comment with fn";
      const state = createTestState(doc, doc.length);
      const context = new CompletionContext(state, doc.length, false);

      const result = await (rustCompletionsSource as any)(context);
      expect(result).toBeNull();
    });
  });
});
