import { useEffect, useMemo, useRef, useState } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import Editor from "@monaco-editor/react";
import {
  FLOWSCRIPT_LANGUAGE_ID,
  registerFlowScript,
  setFlowScriptMarkers,
} from "./editor/flowscript";
import WorkflowGraph from "./components/WorkflowGraph";
import DFAExplorer from "./components/DFAExplorer";
import { formatFlowScript } from "./editor/formatFlowscript";

import TopBar from "./components/ide/TopBar";
import ActivityBar, { type ActivityType } from "./components/ide/ActivityBar";
import ExplorerSidebar from "./components/ide/ExplorerSidebar";
import WorkspaceTabs, { type WorkspaceTabId } from "./components/ide/WorkspaceTabs";
import BottomPanel, { type BottomPanelTab } from "./components/ide/BottomPanel";
import StatusBar from "./components/ide/StatusBar";

const API_URL = "http://127.0.0.1:8000";

function validateWorkflow(source: string) {
  return fetch(`${API_URL}/api/compile/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  }).then((response) => response.json());
}

const samplePipeline = `WORKFLOW ResearchPipeline
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

const sampleNested = `WORKFLOW NestedDecision
TASK Search
IF confidence > 0.8
    TASK Analyze
    IF score >= 90
        TASK Publish
    ELSE
        TASK Summarize
    END
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
    column?: number;
    stage?: string;
  }[];
};

export default function App() {
  const [source, setSource] = useState(samplePipeline);
  const [currentSampleKey, setCurrentSampleKey] = useState<"pipeline" | "moderation" | "nested">("pipeline");
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  // Execution & Compile state
  const [result, setResult] = useState<ExecutionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileMessage, setCompileMessage] = useState("");
  const [compileErrors, setCompileErrors] = useState<
    { message?: string; line?: number; column?: number; stage?: string }[]
  >([]);
  const [requestError, setRequestError] = useState("");
  const [apiOnline, setApiOnline] = useState(true);

  // IDE Shell Layout state
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTabId>("editor");
  const [activeActivity, setActiveActivity] = useState<ActivityType>("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<BottomPanelTab>("compiler");
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });

  // Periodically check API health
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (mounted) setApiOnline(res.ok);
      } catch {
        if (mounted) setApiOnline(false);
      }
    };
    checkHealth();
    const interval = window.setInterval(checkHealth, 8000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  // Keyboard shortcuts (Ctrl+B, Ctrl+J, Ctrl+Enter)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setBottomPanelOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runWorkflow();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [source]);

  // Real-time linter / semantic analysis debounce
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
        // Backend temporarily unreachable
      }
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [source]);

  // Extract workflow details from code
  const workflowName = useMemo(() => {
    const match = source.match(/^\s*WORKFLOW\s+(\w+)/m);
    return match ? match[1] : "Workflow";
  }, [source]);

  const documentName = useMemo(() => {
    switch (currentSampleKey) {
      case "moderation":
        return "ContentModeration.flow";
      case "nested":
        return "NestedDecision.flow";
      default:
        return `${workflowName}.flow`;
    }
  }, [currentSampleKey, workflowName]);

  const counts = useMemo(() => {
    const tasks = (source.match(/^\s*TASK\s+\w+/gim) || []).length;
    const conditions = (source.match(/^\s*IF\s+/gim) || []).length;
    return { tasks, conditions };
  }, [source]);

  // Compilation action
  async function compileWorkflow() {
    setIsCompiling(true);
    setCompileMessage("Compiling and analyzing intermediate representation...");
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
          setFlowScriptMarkers(monacoRef.current, model, errors);
        }
      }

      if (data.success) {
        setCompileMessage(`Compilation successful — stage: ${data.stage ?? "build"}`);
      } else {
        setCompileMessage(`Compilation failed with ${errors.length} issue(s).`);
        setBottomTab("problems");
        setBottomPanelOpen(true);
      }
    } catch (error) {
      setCompileMessage(
        error instanceof Error ? error.message : "Compilation request failed.",
      );
      setBottomTab("compiler");
      setBottomPanelOpen(true);
    } finally {
      setIsCompiling(false);
    }
  }

  // Execution action
  async function runWorkflow() {
    setLoading(true);
    setRequestError("");
    setResult(null);
    setBottomTab("logs");
    setBottomPanelOpen(true);

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
        setCompileErrors(data.errors);
        setBottomTab("problems");
      }
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the FlowScript API.",
      );
      setBottomTab("logs");
    } finally {
      setLoading(false);
    }
  }

  function handleFormat() {
    const formatted = formatFlowScript(source);
    setSource(formatted);
    setCompileMessage("Source code formatted.");
  }

  function handleReset() {
    setSource(samplePipeline);
    setCurrentSampleKey("pipeline");
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

  function handleSelectSample(sampleKey: "pipeline" | "moderation" | "nested") {
    setCurrentSampleKey(sampleKey);
    let sampleCode = samplePipeline;
    if (sampleKey === "moderation") sampleCode = sampleConditional;
    if (sampleKey === "nested") sampleCode = sampleNested;

    setSource(sampleCode);
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

  function handleSelectTab(tab: WorkspaceTabId) {
    setWorkspaceTab(tab);
    if (tab === "graph" || tab === "dfa") {
      setBottomPanelOpen(false); // Maximize canvas visibility to almost the entire page
    }
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  }

  function handleSelectActivity(activity: ActivityType) {
    if (activity === activeActivity) {
      // Toggle sidebar if clicking current activity
      setSidebarOpen((prev) => !prev);
    } else {
      setActiveActivity(activity);
      if (activity === "editor") {
        setWorkspaceTab("editor");
        setSidebarOpen(true);
      } else if (activity === "graph") {
        setWorkspaceTab("graph");
        setBottomPanelOpen(false);
      } else if (activity === "dfa") {
        setWorkspaceTab("dfa");
        setBottomPanelOpen(false);
      } else if (activity === "history") {
        setBottomPanelOpen(true);
        setBottomTab("logs");
      }
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);
    }
  }

  function handleJumpToLine(line: number, column = 1) {
    setWorkspaceTab("editor");
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column });
    editor.focus();
  }

  const currentState = result?.state?.current_state ?? "IDLE";
  const executionStatus = result?.status;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#182630] text-[#E8EDEF]">
      {/* 1. TOP APPLICATION BAR */}
      <TopBar
        workflowName={workflowName}
        documentName={documentName}
        onCompile={compileWorkflow}
        onRun={runWorkflow}
        onFormat={handleFormat}
        onReset={handleReset}
        onSelectSample={handleSelectSample}
        loading={loading}
        isCompiling={isCompiling}
        apiOnline={apiOnline}
      />

      {/* 2. MAIN HORIZONTAL BODY: Activity Bar + Explorer Sidebar + Central Workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Activity Bar */}
        <ActivityBar
          activeActivity={activeActivity}
          onSelectActivity={handleSelectActivity}
          sidebarOpen={sidebarOpen}
          bottomPanelOpen={bottomPanelOpen}
          onToggleBottomPanel={() => {
            setBottomPanelOpen((prev) => !prev);
            setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
          }}
          problemCount={compileErrors.length}
        />

        {/* Collapsible Explorer Sidebar */}
        <ExplorerSidebar
          activeActivity={activeActivity}
          open={sidebarOpen}
          onClose={() => {
            setSidebarOpen(false);
            setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
          }}
          activeTab={workspaceTab}
          onSelectTab={handleSelectTab}
          source={source}
          workflowName={workflowName}
          compileErrors={compileErrors}
          executionStatus={executionStatus}
          currentState={currentState}
          taskCount={counts.tasks}
          conditionCount={counts.conditions}
          onSelectLine={(line) => handleJumpToLine(line)}
          onSelectSample={handleSelectSample}
          currentSampleKey={currentSampleKey}
        />

        {/* Central Workspace Region */}
        <main className="flex flex-1 min-w-0 flex-col overflow-hidden bg-[#182630]">
          {/* Workspace Tabs Header */}
          <WorkspaceTabs
            activeTab={workspaceTab}
            onSelectTab={handleSelectTab}
            documentName={documentName}
            hasErrors={compileErrors.length > 0}
            executionStatus={executionStatus}
            bottomPanelOpen={bottomPanelOpen}
            onToggleBottomPanel={() => {
              setBottomPanelOpen((prev) => !prev);
              setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
            }}
          />

          {/* Central Workspace Tab Content */}
          <div className="flex-1 min-h-0 relative overflow-hidden bg-[#182630]">
            {/* VIEW 1: Code Editor (Monaco) */}
            <div
              className={`h-full w-full ${
                workspaceTab === "editor" ? "block" : "hidden"
              }`}
            >
              <Editor
                height="100%"
                language={FLOWSCRIPT_LANGUAGE_ID}
                theme="soft-ocean"
                value={source}
                onChange={(value) => setSource(value ?? "")}
                beforeMount={(monaco) => {
                  registerFlowScript(monaco);
                }}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                  editor.onDidChangeCursorPosition((e) => {
                    setCursorPosition({
                      line: e.position.lineNumber,
                      col: e.position.column,
                    });
                  });
                }}
                options={{
                  minimap: { enabled: true, side: "right", scale: 1 },
                  fontSize: 13.5,
                  fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                  lineHeight: 22,
                  padding: { top: 12, bottom: 12 },
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

            {/* VIEW 2: Visual Workflow Studio (Full Canvas) */}
            <div
              className={`h-full w-full overflow-hidden flex flex-col ${
                workspaceTab === "graph" ? "block" : "hidden"
              }`}
            >
              <WorkflowGraph
                isActive={workspaceTab === "graph"}
                source={source}
                results={result?.results}
                executionStatus={result?.status}
                onSourceChange={setSource}
                onRunWorkflow={runWorkflow}
                loading={loading}
                compileErrors={compileErrors}
                onSwitchToEditor={() => handleSelectTab("editor")}
              />
            </div>

            {/* VIEW 3: DFA Explorer (Full Canvas) */}
            <div
              className={`h-full w-full overflow-hidden flex flex-col ${
                workspaceTab === "dfa" ? "block" : "hidden"
              }`}
            >
              <DFAExplorer
                isActive={workspaceTab === "dfa"}
                currentState={currentState}
                history={result?.state?.history ?? ["IDLE"]}
              />
            </div>
          </div>

          {/* Collapsible Bottom Panel */}
          <BottomPanel
            open={bottomPanelOpen}
            onClose={() => setBottomPanelOpen(false)}
            activeTab={bottomTab}
            onSelectTab={setBottomTab}
            compileErrors={compileErrors}
            compileMessage={compileMessage}
            executionLogs={result?.logs}
            taskResults={result?.results}
            requestError={requestError}
            onSelectErrorLine={(line, col) => handleJumpToLine(line, col)}
          />
        </main>
      </div>

      {/* 3. SLIM STATUS BAR */}
      <StatusBar
        workflowName={workflowName}
        apiOnline={apiOnline}
        compileErrorCount={compileErrors.length}
        executionStatus={executionStatus}
        currentState={currentState}
        cursorPosition={cursorPosition}
        activeTab={workspaceTab}
      />
    </div>
  );
}
