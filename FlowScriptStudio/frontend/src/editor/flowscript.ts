import type { editor, languages } from "monaco-editor";

export const FLOWSCRIPT_LANGUAGE_ID = "flowscript";

export function registerFlowScript(monaco: typeof import("monaco-editor")) {
  if (!monaco.languages.getLanguages().some(
    (language) => language.id === FLOWSCRIPT_LANGUAGE_ID
  )) {
    monaco.languages.register({ id: FLOWSCRIPT_LANGUAGE_ID });
  }

  monaco.languages.setMonarchTokensProvider(FLOWSCRIPT_LANGUAGE_ID, {
    keywords: ["WORKFLOW", "TASK", "IF", "ELSE", "END", "USING", "AI"],
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [
          /\b(WORKFLOW|TASK|IF|ELSE|END|USING|AI)\b/i,
          "keyword",
        ],
        [/\b(Search|Analyze|Summarize|Publish|Retry)\b/, "type.identifier"],
        [/[a-zA-Z_]\w*/, "identifier"],
        [/[0-9]+(?:\.[0-9]+)?/, "number"],
        [/[><=!]+/, "operator"],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration(FLOWSCRIPT_LANGUAGE_ID, {
    comments: { lineComment: "#" },
    brackets: [["{", "}"]],
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "{", close: "}" },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: "(", close: ")" },
      { open: "{", close: "}" },
      { open: '"', close: '"' },
    ],
  });

  monaco.languages.registerCompletionItemProvider(FLOWSCRIPT_LANGUAGE_ID, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: languages.CompletionItem[] = [
        {
          label: "WORKFLOW",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "WORKFLOW ${1:MyWorkflow}\n    $0\nEND",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Declare a workflow.",
          range,
        },
        {
          label: "TASK",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "TASK ${1|Search,Analyze,Summarize,Publish,Retry|}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Add a supported task.",
          range,
        },
        {
          label: "IF",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "IF ${1|Success|}\n    $0\nELSE\n    \nEND",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Create a conditional branch.",
          range,
        },
        {
          label: "Search",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "Search",
          documentation: "Search task",
          range,
        },
        {
          label: "Analyze",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "Analyze",
          documentation: "Analyze task",
          range,
        },
        {
          label: "Summarize",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: "Summarize",
          documentation: "Summarize task",
          range,
        },
      ];

      return { suggestions };
    },
  });

  // Soft Ocean Monaco Dark Theme
  monaco.editor.defineTheme("soft-ocean", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "8CB8B5", fontStyle: "bold" },
      { token: "type.identifier", foreground: "E8EDEF", fontStyle: "bold" },
      { token: "identifier", foreground: "D4E2E8" },
      { token: "string", foreground: "6EAA8C" },
      { token: "number", foreground: "D8A657" },
      { token: "operator", foreground: "8CB8B5" },
      { token: "delimiter", foreground: "A9BAC2" },
      { token: "comment", foreground: "6C8693", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#182630",
      "editor.foreground": "#E8EDEF",
      "editor.lineHighlightBackground": "#1E2D3880",
      "editor.lineHighlightBorder": "#2D424A00",
      "editorCursor.foreground": "#8CB8B5",
      "editorWhitespace.foreground": "#2D424A",
      "editorIndentGuide.background": "#243944",
      "editorIndentGuide.activeBackground": "#577D83",
      "editorLineNumber.foreground": "#577D83",
      "editorLineNumber.activeForeground": "#8CB8B5",
      "editorGutter.background": "#182630",
      "editorWidget.background": "#1E2D38",
      "editorWidget.border": "#3A515B",
      "editorSuggestWidget.background": "#1E2D38",
      "editorSuggestWidget.border": "#3A515B",
      "editorSuggestWidget.foreground": "#E8EDEF",
      "editorSuggestWidget.selectedBackground": "#2D424A",
      "editorSuggestWidget.highlightForeground": "#8CB8B5",
      "editorHoverWidget.background": "#1E2D38",
      "editorHoverWidget.border": "#3A515B",
      "scrollbarSlider.background": "#2D424A80",
      "scrollbarSlider.hoverBackground": "#344B54B3",
      "scrollbarSlider.activeBackground": "#577D83CC",
    },
  });
}

export function setFlowScriptMarkers(
  monaco: typeof import("monaco-editor"),
  model: editor.ITextModel,
  errors: { message?: string; line?: number; column?: number }[],
) {
  const markers: editor.IMarkerData[] = errors.map((error) => {
    const line = Math.max(1, error.line ?? 1);
    const column = Math.max(1, error.column ?? 1);

    return {
      severity: monaco.MarkerSeverity.Error,
      message: error.message ?? "Compilation error",
      startLineNumber: line,
      endLineNumber: line,
      startColumn: column,
      endColumn: column + 1,
    };
  });

  monaco.editor.setModelMarkers(model, FLOWSCRIPT_LANGUAGE_ID, markers);
}
