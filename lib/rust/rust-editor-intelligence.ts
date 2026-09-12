import {
  snippetCompletion,
  completeFromList,
  type Completion,
  type CompletionContext,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import { type Command, type KeyBinding } from "@codemirror/view";
import { insertNewlineAndIndent } from "@codemirror/commands";

/**
 * Rust Snippets & Templates
 */
const RUST_SNIPPETS: Completion[] = [
  // Functions & Main
  snippetCompletion("fn main() {\n    #{1}\n}", {
    label: "fn main",
    detail: "fn main() { ... }",
    type: "function",
    info: "Standard Rust program entrypoint",
    boost: 99,
  }),
  snippetCompletion("fn #{1:name}(#{2}) #{3:-> #{4:Type} }{\n    #{5}\n}", {
    label: "fn",
    detail: "fn name(args) -> ReturnType { ... }",
    type: "function",
    info: "Function definition",
    boost: 90,
  }),
  snippetCompletion("pub fn #{1:name}(#{2}) #{3:-> #{4:Type} }{\n    #{5}\n}", {
    label: "pub fn",
    detail: "pub fn name(args) -> ReturnType { ... }",
    type: "function",
    info: "Public function definition",
    boost: 88,
  }),
  snippetCompletion("#[test]\nfn #{1:test_name}() {\n    #{2}\n}", {
    label: "test",
    detail: "#[test] fn test_name() { ... }",
    type: "function",
    info: "Unit test function",
    boost: 85,
  }),

  // Variables & Bindings
  snippetCompletion("let #{1:var} = #{2:value};", {
    label: "let",
    detail: "let var = value;",
    type: "keyword",
    info: "Immutable variable binding",
    boost: 95,
  }),
  snippetCompletion("let mut #{1:var} = #{2:value};", {
    label: "let mut",
    detail: "let mut var = value;",
    type: "keyword",
    info: "Mutable variable binding",
    boost: 94,
  }),
  snippetCompletion("const #{1:NAME}: #{2:Type} = #{3:value};", {
    label: "const",
    detail: "const NAME: Type = value;",
    type: "keyword",
    info: "Compile-time constant",
    boost: 80,
  }),

  // Control Flow
  snippetCompletion("if #{1:condition} {\n    #{2}\n}", {
    label: "if",
    detail: "if condition { ... }",
    type: "keyword",
    info: "If conditional block",
    boost: 92,
  }),
  snippetCompletion("if #{1:condition} {\n    #{2}\n} else {\n    #{3}\n}", {
    label: "ifelse",
    detail: "if condition { ... } else { ... }",
    type: "keyword",
    info: "If / else conditional block",
    boost: 91,
  }),
  snippetCompletion("if let Some(#{1:val}) = #{2:expr} {\n    #{3}\n}", {
    label: "if let",
    detail: "if let Some(val) = expr { ... }",
    type: "keyword",
    info: "Pattern matching if statement",
    boost: 89,
  }),
  snippetCompletion("match #{1:expr} {\n    #{2:pattern} => #{3},\n    _ => #{4},\n}", {
    label: "match",
    detail: "match expr { pat => ..., _ => ... }",
    type: "keyword",
    info: "Exhaustive pattern matching",
    boost: 93,
  }),
  snippetCompletion("for #{1:item} in #{2:iter} {\n    #{3}\n}", {
    label: "for",
    detail: "for item in iter { ... }",
    type: "keyword",
    info: "For iterator loop",
    boost: 90,
  }),
  snippetCompletion("while #{1:condition} {\n    #{2}\n}", {
    label: "while",
    detail: "while condition { ... }",
    type: "keyword",
    info: "While loop",
    boost: 85,
  }),
  snippetCompletion("while let Some(#{1:val}) = #{2:expr} {\n    #{3}\n}", {
    label: "while let",
    detail: "while let Some(val) = expr { ... }",
    type: "keyword",
    info: "Pattern matching while loop",
    boost: 84,
  }),
  snippetCompletion("loop {\n    #{1}\n}", {
    label: "loop",
    detail: "loop { ... }",
    type: "keyword",
    info: "Infinite loop",
    boost: 82,
  }),

  // Structs, Enums, Impls
  snippetCompletion("struct #{1:Name} {\n    #{2:pub }#{3:field}: #{4:Type},\n}", {
    label: "struct",
    detail: "struct Name { ... }",
    type: "type",
    info: "Struct declaration",
    boost: 91,
  }),
  snippetCompletion("enum #{1:Name} {\n    #{2:Variant},\n}", {
    label: "enum",
    detail: "enum Name { ... }",
    type: "type",
    info: "Enum declaration",
    boost: 91,
  }),
  snippetCompletion("impl #{1:Type} {\n    pub fn new(#{2}) -> Self {\n        Self { #{3} }\n    }\n}", {
    label: "impl",
    detail: "impl Type { ... }",
    type: "keyword",
    info: "Implementation block",
    boost: 90,
  }),
  snippetCompletion("impl #{1:Trait} for #{2:Type} {\n    #{3}\n}", {
    label: "impl for",
    detail: "impl Trait for Type { ... }",
    type: "keyword",
    info: "Trait implementation block",
    boost: 89,
  }),
  snippetCompletion("trait #{1:Name} {\n    #{2}\n}", {
    label: "trait",
    detail: "trait Name { ... }",
    type: "type",
    info: "Trait definition",
    boost: 85,
  }),
  snippetCompletion("#[derive(#{1:Debug, Clone, PartialEq})]", {
    label: "derive",
    detail: "#[derive(...)]",
    type: "keyword",
    info: "Macro derive attribute",
    boost: 88,
  }),
  snippetCompletion("mod #{1:name} {\n    #{2}\n}", {
    label: "mod",
    detail: "mod name { ... }",
    type: "keyword",
    info: "Module declaration",
    boost: 80,
  }),
  snippetCompletion("#[cfg(test)]\nmod tests {\n    use super::*;\n\n    #[test]\n    fn #{1:test_name}() {\n        #{2}\n    }\n}", {
    label: "mod tests",
    detail: "#[cfg(test)] mod tests { ... }",
    type: "keyword",
    info: "Unit test module boilerplate",
    boost: 86,
  }),

  // Logging & Formatting Macros
  snippetCompletion('println!("#{1:\{\}}", #{2});', {
    label: "println!",
    detail: 'println!("{}", ...);',
    type: "function",
    info: "Prints formatted string with newline to stdout",
    boost: 98,
  }),
  snippetCompletion('eprintln!("#{1:\{\}}", #{2});', {
    label: "eprintln!",
    detail: 'eprintln!("{}", ...);',
    type: "function",
    info: "Prints formatted string with newline to stderr",
    boost: 92,
  }),
  snippetCompletion('format!("#{1:\{\}}", #{2})', {
    label: "format!",
    detail: 'format!("{}", ...)',
    type: "function",
    info: "Creates a formatted String",
    boost: 94,
  }),
  snippetCompletion("vec![#{1}]", {
    label: "vec!",
    detail: "vec![...]",
    type: "function",
    info: "Constructs a vector dynamically",
    boost: 95,
  }),
  snippetCompletion('panic!("#{1:explicit panic}");', {
    label: "panic!",
    detail: 'panic!("...");',
    type: "function",
    info: "Aborts thread with error message",
    boost: 82,
  }),
  snippetCompletion("assert!(#{1:condition});", {
    label: "assert!",
    detail: "assert!(condition);",
    type: "function",
    info: "Panics if boolean expression is false",
    boost: 84,
  }),
  snippetCompletion("assert_eq!(#{1:left}, #{2:right});", {
    label: "assert_eq!",
    detail: "assert_eq!(left, right);",
    type: "function",
    info: "Panics if left != right",
    boost: 87,
  }),
  snippetCompletion("assert_ne!(#{1:left}, #{2:right});", {
    label: "assert_ne!",
    detail: "assert_ne!(left, right);",
    type: "function",
    info: "Panics if left == right",
    boost: 80,
  }),
  snippetCompletion("dbg!(#{1:expr});", {
    label: "dbg!",
    detail: "dbg!(expr);",
    type: "function",
    info: "Prints value for debugging",
    boost: 86,
  }),
  snippetCompletion('todo!("#{1:reason}");', {
    label: "todo!",
    detail: 'todo!("...");',
    type: "function",
    info: "Indicates unfinished code",
    boost: 81,
  }),
  snippetCompletion("unimplemented!()", {
    label: "unimplemented!",
    detail: "unimplemented!()",
    type: "function",
    info: "Indicates unimplemented code",
    boost: 80,
  }),

  // Concurrency & Async
  snippetCompletion("std::thread::spawn(move || {\n    #{1}\n});", {
    label: "thread::spawn",
    detail: "std::thread::spawn(move || { ... });",
    type: "function",
    info: "Spawns a new OS thread",
    boost: 83,
  }),
  snippetCompletion("async fn #{1:name}(#{2}) #{3:-> #{4:Type} }{\n    #{5}\n}", {
    label: "async fn",
    detail: "async fn name() -> Type { ... }",
    type: "function",
    info: "Asynchronous function",
    boost: 87,
  }),
];

/**
 * Standard Rust Keywords, Types, Traits & Common Constructs
 */
const RUST_WORDS: Completion[] = [
  // Keywords
  { label: "pub", type: "keyword", boost: 50 },
  { label: "use", type: "keyword", boost: 50 },
  { label: "mut", type: "keyword", boost: 55 },
  { label: "ref", type: "keyword", boost: 40 },
  { label: "move", type: "keyword", boost: 45 },
  { label: "return", type: "keyword", boost: 50 },
  { label: "break", type: "keyword", boost: 45 },
  { label: "continue", type: "keyword", boost: 45 },
  { label: "where", type: "keyword", boost: 45 },
  { label: "self", type: "keyword", boost: 55 },
  { label: "Self", type: "type", boost: 60 },
  { label: "crate", type: "keyword", boost: 45 },
  { label: "super", type: "keyword", boost: 45 },
  { label: "unsafe", type: "keyword", boost: 40 },
  { label: "extern", type: "keyword", boost: 35 },
  { label: "dyn", type: "keyword", boost: 45 },
  { label: "as", type: "keyword", boost: 45 },
  { label: "in", type: "keyword", boost: 45 },
  { label: "type", type: "keyword", boost: 50 },
  { label: "static", type: "keyword", boost: 45 },
  { label: "async", type: "keyword", boost: 50 },
  { label: "await", type: "keyword", boost: 55 },

  // Primitive Types
  { label: "i8", type: "type", detail: "8-bit signed integer", boost: 60 },
  { label: "i16", type: "type", detail: "16-bit signed integer", boost: 60 },
  { label: "i32", type: "type", detail: "32-bit signed integer", boost: 70 },
  { label: "i64", type: "type", detail: "64-bit signed integer", boost: 65 },
  { label: "i128", type: "type", detail: "128-bit signed integer", boost: 55 },
  { label: "isize", type: "type", detail: "Pointer-sized signed integer", boost: 65 },
  { label: "u8", type: "type", detail: "8-bit unsigned integer", boost: 65 },
  { label: "u16", type: "type", detail: "16-bit unsigned integer", boost: 60 },
  { label: "u32", type: "type", detail: "32-bit unsigned integer", boost: 70 },
  { label: "u64", type: "type", detail: "64-bit unsigned integer", boost: 65 },
  { label: "u128", type: "type", detail: "128-bit unsigned integer", boost: 55 },
  { label: "usize", type: "type", detail: "Pointer-sized unsigned integer", boost: 70 },
  { label: "f32", type: "type", detail: "32-bit floating point", boost: 60 },
  { label: "f64", type: "type", detail: "64-bit floating point", boost: 65 },
  { label: "bool", type: "type", detail: "Boolean (true/false)", boost: 75 },
  { label: "char", type: "type", detail: "Unicode character (4 bytes)", boost: 65 },
  { label: "str", type: "type", detail: "String slice", boost: 70 },
  { label: "true", type: "constant", boost: 70 },
  { label: "false", type: "constant", boost: 70 },

  // Standard Library Core Types
  { label: "String", type: "type", detail: "Growable UTF-8 string buffer", boost: 85 },
  { label: "String::new()", type: "function", detail: "Construct empty String", boost: 80 },
  { label: "String::from(\"\")", type: "function", detail: "Create String from string literal", boost: 82 },
  { label: "Vec", type: "type", detail: "Growable array Vec<T>", boost: 85 },
  { label: "Vec::new()", type: "function", detail: "Construct empty Vec", boost: 80 },
  { label: "Vec::with_capacity(capacity)", type: "function", detail: "Construct Vec with capacity", boost: 75 },
  { label: "Option", type: "type", detail: "Optional value enum Option<T>", boost: 85 },
  { label: "Some", type: "function", detail: "Some(val)", boost: 85 },
  { label: "None", type: "constant", detail: "None", boost: 85 },
  { label: "Result", type: "type", detail: "Error handling enum Result<T, E>", boost: 85 },
  { label: "Ok", type: "function", detail: "Ok(val)", boost: 85 },
  { label: "Err", type: "function", detail: "Err(err)", boost: 85 },
  { label: "Box", type: "type", detail: "Heap allocation pointer Box<T>", boost: 75 },
  { label: "Box::new(val)", type: "function", detail: "Allocate value on the heap", boost: 75 },
  { label: "Rc", type: "type", detail: "Reference counted pointer Rc<T>", boost: 70 },
  { label: "Arc", type: "type", detail: "Atomically reference counted pointer Arc<T>", boost: 75 },
  { label: "Arc::new(val)", type: "function", detail: "Create thread-safe Arc", boost: 74 },
  { label: "Mutex", type: "type", detail: "Mutual exclusion primitive Mutex<T>", boost: 75 },
  { label: "Mutex::new(val)", type: "function", detail: "Create new Mutex", boost: 74 },
  { label: "RwLock", type: "type", detail: "Reader-writer lock RwLock<T>", boost: 70 },
  { label: "Cell", type: "type", detail: "Shareable mutable container Cell<T>", boost: 65 },
  { label: "RefCell", type: "type", detail: "Dynamically checked mutable borrow RefCell<T>", boost: 70 },
  { label: "HashMap", type: "type", detail: "Hash map collection HashMap<K, V>", boost: 80 },
  { label: "HashMap::new()", type: "function", detail: "Construct empty HashMap", boost: 75 },
  { label: "HashSet", type: "type", detail: "Hash set collection HashSet<T>", boost: 75 },
  { label: "BTreeMap", type: "type", detail: "Ordered map BTreeMap<K, V>", boost: 65 },
  { label: "BTreeSet", type: "type", detail: "Ordered set BTreeSet<T>", boost: 65 },
  { label: "Duration", type: "type", detail: "std::time::Duration", boost: 65 },
  { label: "Instant", type: "type", detail: "std::time::Instant", boost: 65 },

  // Standard Library Traits
  { label: "Clone", type: "type", detail: "Explicitly duplicable trait", boost: 70 },
  { label: "Copy", type: "type", detail: "Bitwise copyable trait", boost: 70 },
  { label: "Debug", type: "type", detail: "Debug formatting trait", boost: 75 },
  { label: "Display", type: "type", detail: "User-facing formatting trait", boost: 75 },
  { label: "Default", type: "type", detail: "Default value constructor trait", boost: 70 },
  { label: "Default::default()", type: "function", detail: "Construct default value", boost: 72 },
  { label: "PartialEq", type: "type", detail: "Equality comparison trait", boost: 65 },
  { label: "Eq", type: "type", detail: "Full equivalence relation trait", boost: 65 },
  { label: "PartialOrd", type: "type", detail: "Partial ordering trait", boost: 60 },
  { label: "Ord", type: "type", detail: "Total ordering trait", boost: 60 },
  { label: "From", type: "type", detail: "Value-to-value conversion trait", boost: 70 },
  { label: "Into", type: "type", detail: "Value-to-value conversion trait", boost: 70 },
  { label: "TryFrom", type: "type", detail: "Fallible conversion trait", boost: 65 },
  { label: "TryInto", type: "type", detail: "Fallible conversion trait", boost: 65 },
  { label: "AsRef", type: "type", detail: "Reference-to-reference conversion", boost: 65 },
  { label: "AsMut", type: "type", detail: "Mutable reference conversion", boost: 60 },
  { label: "Deref", type: "type", detail: "Immutable dereferencing trait", boost: 65 },
  { label: "DerefMut", type: "type", detail: "Mutable dereferencing trait", boost: 60 },
  { label: "Drop", type: "type", detail: "Custom destructor trait", boost: 65 },
  { label: "Send", type: "type", detail: "Safe to transfer across threads", boost: 70 },
  { label: "Sync", type: "type", detail: "Safe to share between threads", boost: 70 },
  { label: "Iterator", type: "type", detail: "Iterator interface trait", boost: 75 },
  { label: "IntoIterator", type: "type", detail: "Conversion into an Iterator", boost: 70 },
  { label: "Fn", type: "type", detail: "Callable with &self", boost: 65 },
  { label: "FnMut", type: "type", detail: "Callable with &mut self", boost: 65 },
  { label: "FnOnce", type: "type", detail: "Callable with self", boost: 65 },
  { label: "Error", type: "type", detail: "std::error::Error trait", boost: 70 },
];

const ALL_RUST_COMPLETIONS: Completion[] = [...RUST_SNIPPETS, ...RUST_WORDS];
const baseComplete = completeFromList(ALL_RUST_COMPLETIONS);

const IGNORED_NODE_TYPES = new Set([
  "LineComment",
  "BlockComment",
  "Comment",
  "String",
  "RawString",
  "Char",
]);

/**
 * Context-aware completion source for Rust.
 * Disables autocompletions inside line/block comments and string literals
 * to avoid hijacking natural text entry.
 */
export const rustCompletionsSource = (context: CompletionContext) => {
  const line = context.state.doc.lineAt(context.pos);
  const textBefore = line.text.slice(0, context.pos - line.from);

  // Fast check for line comment
  if (textBefore.trimStart().startsWith("//")) {
    return null;
  }

  // Syntax tree AST check
  const tree = syntaxTree(context.state);
  if (tree) {
    const node = tree.resolveInner(context.pos, -1);
    if (node && IGNORED_NODE_TYPES.has(node.name)) {
      return null;
    }
  }

  return baseComplete(context);
};

/**
 * Rust Smart Enter Command:
 * When Enter is pressed between `{}` or `[]` or `()`, it intelligently expands
 * into a formatted block with correct Rust 4-space indentation and places the
 * cursor on the newly indented line.
 */
export const rustSmartEnter: Command = ({ state, dispatch }) => {
  const sel = state.selection.main;
  if (!sel.empty) return false;

  const pos = sel.head;
  const line = state.doc.lineAt(pos);
  const before = state.doc.sliceString(Math.max(0, pos - 1), pos);
  const after = state.doc.sliceString(pos, Math.min(state.doc.length, pos + 1));

  // Check if cursor is between matching pairs: { and }, [ and ], ( and )
  const isBracePair = before === "{" && after === "}";
  const isBracketPair = before === "[" && after === "]";
  const isParenPair = before === "(" && after === ")";

  if (isBracePair || isBracketPair || isParenPair) {
    const currentLineIndentMatch = line.text.match(/^\s*/);
    const currentLineIndent = currentLineIndentMatch ? currentLineIndentMatch[0] : "";
    const unitIndent = "    "; // 4 spaces Rust standard
    const innerIndent = currentLineIndent + unitIndent;
    const outerIndent = currentLineIndent;

    const insertText = "\n" + innerIndent + "\n" + outerIndent;
    const newPos = pos + 1 + innerIndent.length;

    dispatch(
      state.update({
        changes: { from: pos, to: pos, insert: insertText },
        selection: { anchor: newPos },
        scrollIntoView: true,
      })
    );
    return true;
  }

  // Fallback to standard AST newline & indent
  return insertNewlineAndIndent({ state, dispatch });
};

/**
 * Rust Keymap for Code Workspace
 */
export const rustKeymap: readonly KeyBinding[] = [
  {
    key: "Enter",
    run: rustSmartEnter,
  },
];
