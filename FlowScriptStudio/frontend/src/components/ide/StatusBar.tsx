import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Server,
  Workflow,
} from "lucide-react";

export type StatusBarProps = {
  workflowName: string;
  apiOnline: boolean;
  compileErrorCount: number;
  executionStatus?: string;
  currentState: string;
  cursorPosition: { line: number; col: number };
  activeTab: string;
};

export default function StatusBar({
  workflowName,
  apiOnline,
  compileErrorCount,
  executionStatus,
  currentState,
  cursorPosition,
  activeTab,
}: StatusBarProps) {
  return (
    <footer
      className="flex h-6 shrink-0 items-center justify-between border-t border-[#3A515B] bg-[#1E2D38] px-3 text-[11px] font-medium text-[#A9BAC2] select-none z-10"
      aria-label="Status Bar"
    >
      {/* Left Items */}
      <div className="flex items-center gap-3">
        {/* Backend Connectivity */}
        <div
          className="flex items-center gap-1.5 cursor-pointer hover:bg-[#243944] hover:text-[#E8EDEF] px-1.5 py-0.5 rounded transition"
          title={apiOnline ? "FastAPI Server connected" : "API Offline"}
        >
          <Server size={11} className={apiOnline ? "text-emerald-400" : "text-rose-400"} />
          <span className="font-mono">{apiOnline ? "API :8000" : "Disconnected"}</span>
        </div>

        {/* Workflow Name */}
        {workflowName && (
          <div className="flex items-center gap-1 hover:bg-[#243944] hover:text-[#E8EDEF] px-1.5 py-0.5 rounded transition text-[#E8EDEF]">
            <Workflow size={11} className="text-[#8CB8B5]" />
            <span className="font-semibold">{workflowName}</span>
          </div>
        )}

        {/* Language Mode */}
        <div className="hidden sm:flex items-center gap-1 hover:bg-[#243944] hover:text-[#E8EDEF] px-1.5 py-0.5 rounded transition text-[#577D83]">
          <span>FlowScript DSL</span>
        </div>
      </div>

      {/* Right Items */}
      <div className="flex items-center gap-3 font-mono">
        {/* Compilation Status */}
        <div
          className="flex items-center gap-1 hover:bg-[#243944] hover:text-[#E8EDEF] px-1.5 py-0.5 rounded cursor-pointer transition"
          title="Compilation diagnostics"
        >
          {compileErrorCount > 0 ? (
            <>
              <AlertCircle size={11} className="text-[#C86D6D]" />
              <span className="text-[#C86D6D] font-bold">{compileErrorCount} Issues</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={11} className="text-[#6EAA8C]" />
              <span className="text-[#6EAA8C]">Valid</span>
            </>
          )}
        </div>

        {/* Runtime DFA State & Execution Status */}
        <div
          className="flex items-center gap-1 hover:bg-[#243944] hover:text-[#E8EDEF] px-1.5 py-0.5 rounded transition"
          title="Automaton runtime lifecycle state"
        >
          <Cpu size={11} className="text-[#8CB8B5]" />
          <span>DFA: <strong className="text-[#E8EDEF]">{currentState}</strong></span>
          {executionStatus && (
            <span className="ml-1 text-[#577D83]">({executionStatus})</span>
          )}
        </div>

        {/* Cursor Position (active when editor is active) */}
        {activeTab === "editor" && (
          <div className="hover:bg-[#243944] hover:text-[#E8EDEF] px-1.5 py-0.5 rounded transition text-[#E8EDEF]">
            <span>
              Ln {cursorPosition.line}, Col {cursorPosition.col}
            </span>
          </div>
        )}

        <div className="hidden md:block text-[#577D83]">
          <span>UTF-8</span>
        </div>
      </div>
    </footer>
  );
}
