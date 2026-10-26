import {
  AlertCircle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Terminal as TerminalIcon,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";

export type BottomPanelTab = "problems" | "compiler" | "logs" | "terminal";

export type BottomPanelProps = {
  open: boolean;
  onClose: () => void;
  activeTab: BottomPanelTab;
  onSelectTab: (tab: BottomPanelTab) => void;
  compileErrors: { message?: string; line?: number; column?: number; stage?: string }[];
  compileMessage?: string;
  executionLogs?: { message: string; level: string; state?: string }[];
  taskResults?: { task: string; status: string; output: string; line?: number }[];
  requestError?: string | null;
  onSelectErrorLine?: (line: number, col: number) => void;
};

export default function BottomPanel({
  open,
  onClose,
  activeTab,
  onSelectTab,
  compileErrors = [],
  compileMessage,
  executionLogs = [],
  taskResults = [],
  requestError,
  onSelectErrorLine,
}: BottomPanelProps) {
  const [maximized, setMaximized] = useState(false);

  if (!open) return null;

  return (
    <section
      className={`flex flex-col border-t border-[#3A515B] bg-[#182630] text-[#E8EDEF] transition-all select-none ${
        maximized ? "h-[70vh]" : "h-56"
      }`}
      aria-label="Diagnostics and Terminal Panel"
    >
      {/* Panel Tab Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#3A515B] bg-[#1E2D38] px-2">
        <div className="flex items-center gap-1">
          {/* PROBLEMS Tab */}
          <button
            onClick={() => onSelectTab("problems")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition rounded-t ${
              activeTab === "problems"
                ? "bg-[#182630] text-[#8CB8B5] font-bold border-t-2 border-[#8CB8B5]"
                : "text-[#A9BAC2] hover:text-[#E8EDEF] hover:bg-[#243944]"
            }`}
          >
            <span>Problems</span>
            {compileErrors.length > 0 && (
              <span className="rounded-full bg-[#C86D6D] px-1.5 py-0.2 text-[10px] font-bold text-white">
                {compileErrors.length}
              </span>
            )}
          </button>

          {/* COMPILER OUTPUT Tab */}
          <button
            onClick={() => onSelectTab("compiler")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition rounded-t ${
              activeTab === "compiler"
                ? "bg-[#182630] text-[#8CB8B5] font-bold border-t-2 border-[#8CB8B5]"
                : "text-[#A9BAC2] hover:text-[#E8EDEF] hover:bg-[#243944]"
            }`}
          >
            <span>Compiler Output</span>
          </button>

          {/* EXECUTION LOGS Tab */}
          <button
            onClick={() => onSelectTab("logs")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition rounded-t ${
              activeTab === "logs"
                ? "bg-[#182630] text-[#8CB8B5] font-bold border-t-2 border-[#8CB8B5]"
                : "text-[#A9BAC2] hover:text-[#E8EDEF] hover:bg-[#243944]"
            }`}
          >
            <span>Execution Logs</span>
            {executionLogs.length > 0 && (
              <span className="rounded-full bg-[#2D424A] border border-[#3A515B] px-1.5 text-[10px] text-[#8CB8B5] font-mono">
                {executionLogs.length}
              </span>
            )}
          </button>

          {/* TERMINAL / RESULTS Tab */}
          <button
            onClick={() => onSelectTab("terminal")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition rounded-t ${
              activeTab === "terminal"
                ? "bg-[#182630] text-[#8CB8B5] font-bold border-t-2 border-[#8CB8B5]"
                : "text-[#A9BAC2] hover:text-[#E8EDEF] hover:bg-[#243944]"
            }`}
          >
            <TerminalIcon size={12} className="text-[#8CB8B5]" />
            <span>Terminal / Results</span>
            {taskResults.length > 0 && (
              <span className="rounded-full bg-[#2D424A] border border-[#3A515B] px-1.5 text-[10px] text-[#8CB8B5] font-mono">
                {taskResults.length}
              </span>
            )}
          </button>
        </div>

        {/* Panel Action Controls: Maximize, Close */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMaximized((m) => !m)}
            className="rounded p-1 text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF] transition"
            title={maximized ? "Restore panel height" : "Maximize panel"}
          >
            {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF] transition"
            title="Hide panel (Ctrl+J)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-3 text-xs font-sans">
        {/* TAB 1: PROBLEMS */}
        {activeTab === "problems" && (
          <div>
            {compileErrors.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-[#A9BAC2]">
                <CheckCircle2 size={16} className="text-[#6EAA8C]" />
                <span>No issues detected in current workflow code.</span>
              </div>
            ) : (
              <div className="space-y-1">
                {compileErrors.map((error, idx) => (
                  <button
                    key={`${error.line}-${idx}`}
                    onClick={() => onSelectErrorLine?.(error.line ?? 1, error.column ?? 1)}
                    className="flex w-full items-start gap-2.5 rounded px-2.5 py-1.5 text-left transition hover:bg-[#243944] group"
                  >
                    <XCircle size={15} className="mt-0.5 shrink-0 text-[#C86D6D]" />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-[#E8EDEF]">
                        {error.message ?? "Syntax or semantic error"}
                      </span>
                      {error.stage && (
                        <span className="ml-2 rounded bg-[#2D424A] border border-[#3A515B] px-1.5 py-0.5 text-[10px] font-mono text-[#8CB8B5]">
                          {error.stage}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[#577D83] group-hover:text-[#8CB8B5]">
                      [{error.line ?? 1}, {error.column ?? 1}]
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMPILER OUTPUT */}
        {activeTab === "compiler" && (
          <div className="font-mono text-[11px] leading-relaxed text-[#E8EDEF]">
            <p className="text-[#577D83]">// FlowScript Compiler Pipeline (Lexer → Parser → Semantic → IR)</p>
            <p className="mt-2 text-[#8CB8B5]">
              &gt; {compileMessage || "Compiler ready. Click 'Compile' in top bar to validate."}
            </p>
            {compileErrors.length > 0 && (
              <div className="mt-2 text-[#C86D6D]">
                {compileErrors.map((err, i) => (
                  <p key={i}>
                    [Error] Line {err.line ?? "?"}: {err.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXECUTION LOGS */}
        {activeTab === "logs" && (
          <div>
            {requestError && (
              <div className="mb-2 flex items-center gap-2 rounded bg-[#C86D6D]/15 border border-[#C86D6D]/30 p-2 text-[#C86D6D]">
                <AlertCircle size={15} className="shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            {executionLogs.length === 0 ? (
              <div className="py-4 text-[#A9BAC2]">
                No execution logs yet. Click &quot;Run Workflow&quot; to execute the pipeline.
              </div>
            ) : (
              <div className="space-y-1 font-mono text-[11px]">
                {executionLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded px-2 py-1 transition hover:bg-[#243944]"
                  >
                    <span className="text-[#577D83] shrink-0 font-bold">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {log.level === "ERROR" ? (
                      <XCircle size={14} className="mt-0.5 shrink-0 text-[#C86D6D]" />
                    ) : (
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#6EAA8C]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[#E8EDEF] font-medium">{log.message}</span>
                      <span className="ml-2 text-[10px] text-[#8CB8B5]">
                        [{log.state ?? "runtime"}]
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TERMINAL / RESULTS */}
        {activeTab === "terminal" && (
          <div>
            {taskResults.length === 0 ? (
              <div className="py-4 text-[#A9BAC2]">
                No task results available. Run a workflow to view output payloads.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {taskResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#3A515B] bg-[#243944] p-3 shadow-md"
                  >
                    <div className="flex items-center justify-between border-b border-[#3A515B] pb-1.5 mb-1.5">
                      <span className="font-bold text-[#E8EDEF]">{result.task}</span>
                      <span
                        className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 border ${
                          result.status === "SUCCESS"
                            ? "bg-[#6EAA8C]/20 border-[#6EAA8C]/40 text-[#6EAA8C]"
                            : "bg-[#C86D6D]/20 border-[#C86D6D]/40 text-[#C86D6D]"
                        }`}
                      >
                        {result.status}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-[#A9BAC2] break-words bg-[#182630] p-1.5 rounded border border-[#3A515B]">
                      {result.output}
                    </p>
                    {result.line !== undefined && (
                      <span className="mt-1.5 block text-[10px] font-mono text-[#577D83]">
                        Source Line {result.line}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
