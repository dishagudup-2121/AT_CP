import { useEffect, useRef, useState } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import Editor from "@monaco-editor/react";
import {
  FLOWSCRIPT_LANGUAGE_ID,
  registerFlowScript,
  setFlowScriptMarkers,
} from "./editor/flowscript";
import {
  Activity,
  AlignLeft,
  Braces,
  CheckCircle2,
  CircleAlert,
  Code2,
  FileCheck2,
  FileCode2,
  GitBranch,
  LoaderCircle,
  Play,
  RotateCcw,
  Terminal,
  Workflow,
} from "lucide-react";
import WorkflowGraph from "./components/WorkflowGraph";
import DFAExplorer from "./components/DFAExplorer";
import { formatFlowScript } from "./editor/formatFlowscript";

const API_URL = "http://127.0.0.1:8000";

function validateWorkflow(source: string) {
  return fetch(`${API_URL}/api/compile/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  }).then((response) => response.json());
}

const starterCode = `WORKFLOW ResearchPipeline
TASK Search
TASK Analyze
TASK Summarize
END`;

const sampleConditional = `WORKFLOW ContentModeration
TASK Search
IF confidence > 0.8
    TASK Publish
ELSE
    TASK Retry
END
END`;

type ExecutionResponse = {
  success: boolean;
  stage?: string;
  workflow?: string;
  status?: string;
  state?: {
    current_state: string;
    history: string[];
  };
  logs?: {
    level: string;
    message: string;
    state?: string;
  }[];
  results?: {
    task: string;
    status: string;
    output: string;
    line?: number;
  }[];
  errors?: {
    message?: string;
    line?: number;
    stage?: string;
  }[];
};

export default function App() {
  const [source, setSource] = useState(starterCode);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [result, setResult] = useState<ExecutionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"logs" | "results">("logs");
  const [workspaceTab, setWorkspaceTab] = useState<"editor" | "graph" | "dfa">("editor");
  const [requestError, setRequestError] = useState("");
  const [compileMessage, setCompileMessage] = useState("");
  const [compileErrors, setCompileErrors] = useState<
    { message?: string; line?: number; column?: number; stage?: string }[]
  >([]);
  const [diagnosticsTab, setDiagnosticsTab] = useState<"problems" | "console">("problems");

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      if (!source.trim()) {
        setCompileErrors([]);
        if (monacoRef.current && editorRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            setFlowScriptMarkers(monacoRef.current, model, []);
          }
        }
        return;
      }

      try {
        const data = await validateWorkflow(source);
        const errors = data.errors ?? [];
        setCompileErrors(errors);

        if (monacoRef.current && editorRef.current) {
          const model = editorRef.current.getModel();

          if (model) {
            setFlowScriptMarkers(monacoRef.current, model, errors);
          }
        }
      } catch {
        // Leave the editor usable if the backend is temporarily unavailable.
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [source]);

  async function compileWorkflow() {
    setCompileMessage("Compiling...");
    setCompileErrors([]);

    try {
      const data = await validateWorkflow(source);

      if (data.detail) {
        throw new Error(data.detail);
      }

      const errors = data.errors ?? [];
      setCompileErrors(errors);

      if (monacoRef.current && editorRef.current) {
        const model = editorRef.current.getModel();

        if (model) {
          setFlowScriptMarkers(
            monacoRef.current,
            model,
            errors,
          );
        }
      }

      setCompileMessage(
        data.success
          ? `Compilation successful — ${data.stage ?? "build"}`
          : `Compilation failed — ${errors.length} issue(s)`,
      );
    } catch (error) {
      setCompileMessage(
        error instanceof Error ? error.message : "Compilation request failed",
      );
    }
  }

  async function runWorkflow() {
    setLoading(true);
    setRequestError("");
    setResult(null);
    setActiveTab("logs");

    try {
      const response = await fetch(`${API_URL}/api/compile/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `Request failed with HTTP ${response.status}`,
        );
      }
      setResult(data);

      if (!data.success && data.errors?.length) {
        setActiveTab("logs");
      }
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the FlowScript API.",
      );
    } finally {
      setLoading(false);
    }
  }

  function resetWorkspace() {
    setSource(starterCode);
    setResult(null);
    setRequestError("");
    setCompileMessage("");
    setCompileErrors([]);
    if (monacoRef.current && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        setFlowScriptMarkers(monacoRef.current, model, []);
      }
    }
  }

  const successful = result?.status === "SUCCESS";
  const currentState = result?.state?.current_state ?? "IDLE";

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <header className="flex h-[68px] items-center justify-between border-b border-white/[0.08] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15 text-violet-300">
            <Workflow size={23} />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              FlowScript <span className="text-violet-400">Studio</span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Workflow compiler & runtime
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-300 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Local development
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-4 md:p-6">
        <section className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-slate-300">ResearchPipeline.flow</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Workflow Playground
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Write, compile, and execute workflows in your custom DSL.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="load-conditional-btn"
              onClick={() => {
                setSource(sampleConditional);
                setResult(null);
                setRequestError("");
                setCompileMessage("");
                setCompileErrors([]);
                if (monacoRef.current && editorRef.current) {
                  const model = editorRef.current.getModel();
                  if (model) {
                    setFlowScriptMarkers(monacoRef.current, model, []);
                  }
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-slate-300 transition hover:bg-white/[0.06]"
            >
              <GitBranch size={14} className="text-amber-400" />
              Load Conditional
            </button>
            <button
              id="reset-btn"
              onClick={resetWorkspace}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              <RotateCcw size={15} />
              Reset
            </button>
            <button
              id="run-workflow-btn"
              onClick={runWorkflow}
              disabled={loading || !source.trim()}
              className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
              {loading ? "Running..." : "Run workflow"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
          <div className="overflow-hidden rounded-xl border border-white/[0.09] bg-[#0e1421]">
            <div className="flex border-b border-white/[0.07] px-4">
              <button
                id="tab-editor"
                onClick={() => setWorkspaceTab("editor")}
                className={`px-4 py-3 text-xs ${
                  workspaceTab === "editor"
                    ? "border-b-2 border-violet-400 text-violet-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Code editor
              </button>
              <button
                id="tab-graph"
                onClick={() => setWorkspaceTab("graph")}
                className={`px-4 py-3 text-xs ${
                  workspaceTab === "graph"
                    ? "border-b-2 border-violet-400 text-violet-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Visual workflow
              </button>
              <button
                id="tab-dfa"
                onClick={() => setWorkspaceTab("dfa")}
                className={`px-4 py-3 text-xs ${
                  workspaceTab === "dfa"
                    ? "border-b-2 border-violet-400 text-violet-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                DFA Explorer
              </button>
            </div>

            {workspaceTab === "editor" ? (
              <div>
                <div className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FileCode2 size={16} className="text-violet-300" />
                    <span className="font-medium">ResearchPipeline.flow</span>
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-500">
                      DSL
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const formatted = formatFlowScript(source);
                          setSource(formatted);
                          setCompileMessage("Code formatted");
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06]"
                      >
                        <AlignLeft size={14} />
                        Format
                      </button>

                      <button
                        onClick={compileWorkflow}
                        className="flex items-center gap-1.5 rounded-md bg-violet-500/15 px-2.5 py-1.5 text-xs text-violet-300 hover:bg-violet-500/25"
                      >
                        <FileCheck2 size={14} />
                        Compile
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Code2 size={14} />
                      FlowScript
                    </div>
                  </div>
                </div>

                <div className="h-[420px] md:h-[500px]">
                  <Editor
                    height="100%"
                    language={FLOWSCRIPT_LANGUAGE_ID}
                    theme="vs-dark"
                    value={source}
                    onChange={(value) => setSource(value ?? "")}
                    beforeMount={(monaco) => {
                      registerFlowScript(monaco);
                    }}
                    onMount={(editor, monaco) => {
                      editorRef.current = editor;
                      monacoRef.current = monaco;
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineHeight: 24,
                      padding: { top: 20, bottom: 20 },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: "on",
                      lineNumbers: "on",
                      renderLineHighlight: "all",
                      suggestOnTriggerCharacters: true,
                      quickSuggestions: true,
                      overviewRulerBorder: false,
                      scrollbar: {
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                      },
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] px-4 py-3 text-[11px] text-slate-500">
                  <span>FlowScript DSL · UTF-8</span>
                  <span>{source.split("\n").length} lines</span>
                </div>

                {compileMessage && (
                  <div className="border-t border-white/[0.07] px-4 py-2 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>{compileMessage}</span>
                      {compileErrors.length > 0 && (
                        <span className="text-rose-400 font-medium">{compileErrors.length} issue(s)</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-white/[0.08] bg-[#0b111d]">
                  <div className="flex items-center gap-4 border-b border-white/[0.08] px-4">
                    <button
                      onClick={() => setDiagnosticsTab("problems")}
                      className={`py-3 text-xs ${
                        diagnosticsTab === "problems"
                          ? "border-b-2 border-violet-400 text-violet-300 font-medium"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Problems ({compileErrors.length})
                    </button>

                    <button
                      onClick={() => setDiagnosticsTab("console")}
                      className={`py-3 text-xs ${
                        diagnosticsTab === "console"
                          ? "border-b-2 border-violet-400 text-violet-300 font-medium"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Compiler status
                    </button>
                  </div>

                  <div className="max-h-40 overflow-auto p-3">
                    {diagnosticsTab === "problems" ? (
                      compileErrors.length ? (
                        compileErrors.map((error, index) => (
                          <button
                            key={`${error.line}-${index}`}
                            onClick={() => {
                              const editor = editorRef.current;
                              if (!editor) return;

                              const line = error.line ?? 1;
                              editor.revealLineInCenter(line);
                              editor.setPosition({
                                lineNumber: line,
                                column: error.column ?? 1,
                              });
                              editor.focus();
                            }}
                            className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-white/[0.05]"
                          >
                            <span className="mt-0.5 text-rose-400">●</span>
                            <span className="flex-1 text-xs text-slate-300">
                              {error.message ?? "Compilation error"}
                            </span>
                            <span className="text-xs text-slate-500">
                              Line {error.line ?? "—"}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-2 py-3 text-xs text-slate-500">
                          No problems reported. Compile your workflow to validate it.
                        </p>
                      )
                    ) : (
                      <p className="px-2 py-3 text-xs text-slate-400">
                        {compileMessage || "Ready to compile."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : workspaceTab === "graph" ? (
              <div className="p-3">
                <WorkflowGraph
                  source={source}
                  results={result?.results}
                  executionStatus={result?.status}
                  onSourceChange={setSource}
                  onRunWorkflow={runWorkflow}
                  loading={loading}
                  compileErrors={compileErrors}
                  onSwitchToEditor={() => setWorkspaceTab("editor")}
                />
              </div>
            ) : (
              <div className="p-3">
                <DFAExplorer
                  currentState={result?.state?.current_state ?? "IDLE"}
                  history={result?.state?.history ?? ["IDLE"]}
                />
              </div>
            )}
          </div>

          <div className="flex min-h-[480px] flex-col overflow-hidden rounded-xl border border-white/[0.09] bg-[#0e1421]">
            <div className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity size={16} className="text-violet-300" />
                Execution monitor
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                  !result
                    ? "bg-slate-700/40 text-slate-400"
                    : successful
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-rose-400/10 text-rose-300"
                }`}
              >
                {loading ? "RUNNING" : result ? currentState : "IDLE"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                  <GitBranch size={14} />
                  Runtime state
                </div>
                <div className="text-lg font-semibold">{currentState}</div>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                  <Braces size={14} />
                  Tasks completed
                </div>
                <div className="text-lg font-semibold">
                  {result?.results?.filter((item) => item.status === "SUCCESS")
                    .length ?? 0}
                </div>
              </div>
            </div>

            <div className="flex border-b border-white/[0.07] px-4">
              <button
                id="tab-logs"
                onClick={() => setActiveTab("logs")}
                className={`border-b-2 px-3 py-3 text-xs ${
                  activeTab === "logs"
                    ? "border-violet-400 text-violet-300"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <Terminal size={13} className="mr-1.5 inline" />
                Execution logs ({result?.logs?.length ?? 0})
              </button>
              <button
                id="tab-results"
                onClick={() => setActiveTab("results")}
                className={`border-b-2 px-3 py-3 text-xs ${
                  activeTab === "results"
                    ? "border-violet-400 text-violet-300"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <FileCheck2 size={13} className="mr-1.5 inline" />
                Results ({result?.results?.length ?? 0})
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {requestError ? (
                <div className="flex gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-300">
                  <CircleAlert size={17} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">API connection failed</p>
                    <p className="mt-1 break-words text-xs text-rose-200/80">
                      {requestError}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Start the FastAPI backend on port 8000 and try again.
                    </p>
                  </div>
                </div>
              ) : !result ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-500">
                    <Terminal size={21} />
                  </div>
                  <p className="text-sm font-medium text-slate-300">
                    Ready to execute
                  </p>
                  <p className="mt-1 max-w-52 text-xs leading-5 text-slate-500">
                    Run your workflow to inspect state transitions, logs, and
                    task outputs.
                  </p>
                </div>
              ) : activeTab === "logs" ? (
                <div className="space-y-3">
                  {result.logs?.map((log, index) => (
                    <div key={index} className="flex gap-3 text-xs leading-5">
                      <span className="mt-0.5 shrink-0 text-slate-600">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {log.level === "ERROR" ? (
                        <CircleAlert
                          size={14}
                          className="mt-0.5 shrink-0 text-rose-400"
                        />
                      ) : (
                        <CheckCircle2
                          size={14}
                          className="mt-0.5 shrink-0 text-emerald-400"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="break-words text-slate-300">
                          {log.message}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-600">
                          {log.state ?? "runtime"} · {log.level}
                        </p>
                      </div>
                    </div>
                  ))}

                  {result.errors?.map((error, index) => (
                    <div
                      key={`error-${index}`}
                      className="rounded-lg border border-rose-400/20 bg-rose-400/[0.05] p-3 text-xs text-rose-300"
                    >
                      <p className="font-semibold">
                        {error.stage ?? result.stage ?? "Error"}
                        {error.line !== undefined ? ` · Line ${error.line}` : ""}
                      </p>
                      <p className="mt-1 break-words">
                        {error.message ?? JSON.stringify(error)}
                      </p>
                    </div>
                  ))}

                  {!result.logs?.length && !result.errors?.length && (
                    <p className="text-xs text-slate-500">
                      No execution logs returned.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {result.results?.map((item, index) => (
                    <div
                      key={`${item.task}-${index}`}
                      className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {item.task}
                        </span>
                        <span className="text-[10px] text-emerald-300">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.output}
                      </p>
                      {item.line !== undefined && (
                        <p className="mt-2 text-[10px] text-slate-600">
                          Source line {item.line}
                        </p>
                      )}
                    </div>
                  ))}

                  {!result.results?.length && (
                    <p className="text-xs text-slate-500">
                      No task results returned.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.07] px-4 py-3 text-[11px] text-slate-500">
              <span
                className={`h-2 w-2 rounded-full ${
                  loading
                    ? "animate-pulse bg-amber-400"
                    : result
                    ? successful
                      ? "bg-emerald-400"
                      : "bg-rose-400"
                    : "bg-slate-600"
                }`}
              />
              {loading
                ? "Executing workflow..."
                : result
                ? `Execution finished · ${result.status}`
                : "Waiting for execution"}
            </div>
          </div>
        </section>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] text-slate-600">
          <span>FlowScript Studio · Compiler-based workflow automation</span>
          <span>React · FastAPI · DFA Runtime</span>
        </footer>
      </main>
    </div>
  );
}
