import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
  FileCode2,
  GitBranch,
  Layers,
  PanelLeftClose,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import type { ActivityType } from "./ActivityBar";
import type { WorkspaceTabId } from "./WorkspaceTabs";

export type ExplorerSidebarProps = {
  activeActivity: ActivityType;
  open: boolean;
  onClose: () => void;
  activeTab: WorkspaceTabId;
  onSelectTab: (tab: WorkspaceTabId) => void;
  source: string;
  workflowName: string;
  compileErrors: { message?: string; line?: number; column?: number; stage?: string }[];
  executionStatus?: string;
  currentState: string;
  taskCount: number;
  conditionCount: number;
  onSelectLine?: (line: number) => void;
  onSelectSample: (sampleKey: "pipeline" | "moderation" | "nested") => void;
  currentSampleKey?: string;
};

export default function ExplorerSidebar({
  activeActivity,
  open,
  onClose,
  activeTab,
  onSelectTab,
  source,
  workflowName,
  compileErrors,
  executionStatus,
  currentState,
  taskCount,
  conditionCount,
  onSelectLine,
  onSelectSample,
  currentSampleKey = "pipeline",
}: ExplorerSidebarProps) {
  const [filesOpen, setFilesOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [viewsOpen, setViewsOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);

  if (!open) return null;

  // Extract workflow outline tasks & conditions from source
  const outlineItems: { type: "task" | "condition"; name: string; line: number }[] = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((lineText, idx) => {
    const trimmed = lineText.trim();
    const taskMatch = trimmed.match(/^TASK\s+(\w+)/i);
    if (taskMatch) {
      outlineItems.push({
        type: "task",
        name: taskMatch[1],
        line: idx + 1,
      });
      return;
    }
    const ifMatch = trimmed.match(/^IF\s+(.+)/i);
    if (ifMatch) {
      outlineItems.push({
        type: "condition",
        name: `IF ${ifMatch[1]}`,
        line: idx + 1,
      });
    }
  });

  const getTitle = () => {
    switch (activeActivity) {
      case "editor":
        return "CODE EDITOR";
      case "graph":
        return "VISUAL WORKFLOW";
      case "dfa":
        return "DFA EXPLORER";
      case "history":
        return "RUN HISTORY";
      default:
        return "EXPLORER";
    }
  };

  return (
    <aside
      className="flex w-64 shrink-0 flex-col border-r border-[#3A515B] bg-[#1E2D38] text-[#E8EDEF] select-none"
      aria-label="Sidebar"
    >
      {/* Sidebar Header */}
      <div className="flex h-9 items-center justify-between border-b border-[#3A515B] px-3 bg-[#1E2D38]">
        <span className="text-[11px] font-bold tracking-wider text-[#A9BAC2]">
          {getTitle()}
        </span>
        <button
          onClick={onClose}
          className="rounded p-1 text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF] transition"
          title="Close Sidebar (Ctrl+B)"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden text-xs">
        {/* SECTION: WORKSPACE FILES */}
        <div className="border-b border-[#3A515B]">
          <button
            onClick={() => setFilesOpen((prev) => !prev)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 font-bold tracking-wider text-[#A9BAC2] hover:bg-[#2D424A] transition"
          >
            {filesOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span className="text-[10px] uppercase">Workspace Files</span>
          </button>

          {filesOpen && (
            <div className="pb-1">
              <button
                onClick={() => {
                  onSelectSample("pipeline");
                  onSelectTab("editor");
                }}
                className={`flex w-full items-center justify-between px-6 py-1.5 text-left text-xs transition ${
                  currentSampleKey === "pipeline"
                    ? "bg-[#2D424A] font-semibold text-[#8CB8B5] border-l-2 border-[#8CB8B5]"
                    : "text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 size={13} className="text-[#8CB8B5] shrink-0" />
                  <span className="truncate">ResearchPipeline.flow</span>
                </div>
                <span className="text-[10px] font-mono text-[#577D83]">DSL</span>
              </button>

              <button
                onClick={() => {
                  onSelectSample("moderation");
                  onSelectTab("editor");
                }}
                className={`flex w-full items-center justify-between px-6 py-1.5 text-left text-xs transition ${
                  currentSampleKey === "moderation"
                    ? "bg-[#2D424A] font-semibold text-[#8CB8B5] border-l-2 border-[#8CB8B5]"
                    : "text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 size={13} className="text-[#8CB8B5] shrink-0" />
                  <span className="truncate">ContentModeration.flow</span>
                </div>
                <span className="text-[10px] font-mono text-[#D8A657]">IF</span>
              </button>

              <button
                onClick={() => {
                  onSelectSample("nested");
                  onSelectTab("editor");
                }}
                className={`flex w-full items-center justify-between px-6 py-1.5 text-left text-xs transition ${
                  currentSampleKey === "nested"
                    ? "bg-[#2D424A] font-semibold text-[#8CB8B5] border-l-2 border-[#8CB8B5]"
                    : "text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 size={13} className="text-[#8CB8B5] shrink-0" />
                  <span className="truncate">NestedDecision.flow</span>
                </div>
                <span className="text-[10px] font-mono text-[#A78BFA]">NEST</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION: STUDIO WORKSPACE VIEWS */}
        <div className="border-b border-[#3A515B]">
          <button
            onClick={() => setViewsOpen((prev) => !prev)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 font-bold tracking-wider text-[#A9BAC2] hover:bg-[#2D424A] transition"
          >
            {viewsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span className="text-[10px] uppercase">Studio Views</span>
          </button>

          {viewsOpen && (
            <div className="pb-1">
              <button
                onClick={() => onSelectTab("editor")}
                className={`flex w-full items-center gap-2 px-6 py-1.5 text-left text-xs transition ${
                  activeTab === "editor"
                    ? "bg-[#2D424A] font-semibold text-[#8CB8B5] border-l-2 border-[#8CB8B5]"
                    : "text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF]"
                }`}
              >
                <Code2 size={13} className="text-[#8CB8B5]" />
                <span>Code Editor (Monaco)</span>
              </button>

              <button
                onClick={() => onSelectTab("graph")}
                className={`flex w-full items-center gap-2 px-6 py-1.5 text-left text-xs transition ${
                  activeTab === "graph"
                    ? "bg-[#2D424A] font-semibold text-[#8CB8B5] border-l-2 border-[#8CB8B5]"
                    : "text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF]"
                }`}
              >
                <Workflow size={13} className="text-[#8CB8B5]" />
                <span>Visual Workflow</span>
              </button>

              <button
                onClick={() => onSelectTab("dfa")}
                className={`flex w-full items-center gap-2 px-6 py-1.5 text-left text-xs transition ${
                  activeTab === "dfa"
                    ? "bg-[#2D424A] font-semibold text-[#8CB8B5] border-l-2 border-[#8CB8B5]"
                    : "text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF]"
                }`}
              >
                <Cpu size={13} className="text-[#8CB8B5]" />
                <span>DFA Explorer</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION: WORKFLOW OUTLINE */}
        <div className="border-b border-[#3A515B]">
          <button
            onClick={() => setOutlineOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-3 py-1.5 font-bold tracking-wider text-[#A9BAC2] hover:bg-[#2D424A] transition"
          >
            <div className="flex items-center gap-1.5 truncate">
              {outlineOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span className="text-[10px] uppercase truncate">{workflowName || "Workflow"} Outline</span>
            </div>
            <span className="text-[10px] font-normal text-[#577D83]">
              {taskCount} tasks
            </span>
          </button>

          {outlineOpen && (
            <div className="max-h-48 overflow-y-auto px-1 pb-1">
              {outlineItems.length === 0 ? (
                <div className="px-5 py-2 text-[11px] text-[#A9BAC2]">No tasks found</div>
              ) : (
                outlineItems.map((item, idx) => (
                  <button
                    key={`${item.line}-${idx}`}
                    onClick={() => {
                      onSelectTab("editor");
                      onSelectLine?.(item.line);
                    }}
                    className="flex w-full items-center justify-between rounded px-5 py-1 text-left text-xs text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF] transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {item.type === "task" ? (
                        <Layers size={12} className="text-[#8CB8B5] shrink-0" />
                      ) : (
                        <GitBranch size={12} className="text-[#D8A657] shrink-0" />
                      )}
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#577D83]">L{item.line}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* SECTION: DIAGNOSTICS & RUNTIME SUMMARY */}
        <div>
          <button
            onClick={() => setStatusOpen((prev) => !prev)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 font-bold tracking-wider text-[#A9BAC2] hover:bg-[#2D424A] transition"
          >
            {statusOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span className="text-[10px] uppercase">Status & Metrics</span>
          </button>

          {statusOpen && (
            <div className="space-y-1.5 p-3 text-[11px]">
              <div className="flex items-center justify-between rounded bg-[#182630] border border-[#3A515B] p-2">
                <span className="text-[#A9BAC2]">Compiler:</span>
                {compileErrors.length > 0 ? (
                  <span className="flex items-center gap-1 font-semibold text-[#C86D6D]">
                    <AlertCircle size={12} />
                    {compileErrors.length} Issue(s)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold text-[#6EAA8C]">
                    <CheckCircle2 size={12} />
                    Ready
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between rounded bg-[#182630] border border-[#3A515B] p-2">
                <span className="text-[#A9BAC2]">DFA Runtime:</span>
                <span className="font-mono font-bold text-[#8CB8B5]">{currentState}</span>
              </div>

              <div className="flex items-center justify-between rounded bg-[#182630] border border-[#3A515B] p-2">
                <span className="text-[#A9BAC2]">Execution Status:</span>
                <span
                  className={`font-semibold ${
                    executionStatus === "SUCCESS"
                      ? "text-[#6EAA8C]"
                      : executionStatus === "FAILED"
                      ? "text-[#C86D6D]"
                      : "text-[#A9BAC2]"
                  }`}
                >
                  {executionStatus ?? "Idle"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded bg-[#182630] border border-[#3A515B] p-2">
                <span className="text-[#A9BAC2]">Workflow Size:</span>
                <span className="font-semibold text-[#E8EDEF]">
                  {taskCount} Tasks · {conditionCount} Cond
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
