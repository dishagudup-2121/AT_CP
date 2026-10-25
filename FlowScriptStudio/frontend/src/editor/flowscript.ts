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
