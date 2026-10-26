import {
  AlignLeft,
  CheckCircle2,
  ChevronDown,
  FileCode2,
  FolderTree,
  LoaderCircle,
  Play,
  RotateCcw,
  Sparkles,
  Workflow,
  XCircle,
} from "lucide-react";
import { useState } from "react";

export type TopBarProps = {
  workflowName: string;
  documentName: string;
  onCompile: () => void;
  onRun: () => void;
  onFormat: () => void;
  onReset: () => void;
  onSelectSample: (sampleKey: "pipeline" | "moderation" | "nested") => void;
  loading: boolean;
  isCompiling: boolean;
  apiOnline: boolean;
};

export default function TopBar({
  workflowName,
  documentName,
  onCompile,
  onRun,
  onFormat,
  onReset,
  onSelectSample,
  loading,
  isCompiling,
  apiOnline,
}: TopBarProps) {
  const [samplesOpen, setSamplesOpen] = useState(false);

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#3A515B] bg-[#1E2D38] px-3 select-none text-[#E8EDEF]">
      {/* Left: Branding and Document title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#577D83] text-[#E8EDEF] shadow-sm">
            <Workflow size={16} />
          </div>
          <span className="text-xs font-bold tracking-tight text-[#E8EDEF]">
            FlowScript <span className="text-[#8CB8B5] font-semibold">Studio</span>
          </span>
        </div>

        <div className="h-4 w-px bg-[#3A515B]" />

        {/* Breadcrumb / Document Path */}
        <div className="flex items-center gap-1.5 text-xs text-[#A9BAC2]">
          <FolderTree size={13} className="text-[#8CB8B5]" />
          <span>workspace</span>
          <span className="text-[#3A515B]">/</span>
          <FileCode2 size={13} className="text-[#8CB8B5]" />
          <span className="font-semibold text-[#E8EDEF]">{documentName}</span>
          {workflowName && (
            <span className="rounded bg-[#2D424A] border border-[#3A515B] px-1.5 py-0.5 text-[10px] font-mono text-[#8CB8B5]">
              {workflowName}
            </span>
          )}
        </div>
      </div>

      {/* Center / Right: Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Samples Dropdown */}
        <div className="relative">
          <button
            onClick={() => setSamplesOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded border border-[#3A515B] bg-[#2D424A] px-2.5 py-1 text-xs font-medium text-[#E8EDEF] transition hover:bg-[#344B54]"
            title="Load built-in workflow samples"
          >
            <Sparkles size={13} className="text-[#8CB8B5]" />
            <span>Samples</span>
            <ChevronDown size={12} className="text-[#A9BAC2]" />
          </button>

          {samplesOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-[#3A515B] bg-[#243944] p-1 shadow-2xl"
              onMouseLeave={() => setSamplesOpen(false)}
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#A9BAC2]">
                Preset Workflows
              </div>
              <button
                onClick={() => {
                  onSelectSample("pipeline");
                  setSamplesOpen(false);
                }}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-[#E8EDEF] hover:bg-[#2D424A] transition"
              >
                <span>Research Pipeline</span>
                <span className="text-[10px] text-[#8CB8B5]">Sequential</span>
              </button>
              <button
                onClick={() => {
                  onSelectSample("moderation");
                  setSamplesOpen(false);
                }}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-[#E8EDEF] hover:bg-[#2D424A] transition"
              >
                <span>Content Moderation</span>
                <span className="text-[10px] text-[#D8A657]">IF / ELSE</span>
              </button>
              <button
                onClick={() => {
                  onSelectSample("nested");
                  setSamplesOpen(false);
                }}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-[#E8EDEF] hover:bg-[#2D424A] transition"
              >
                <span>Nested Decision</span>
                <span className="text-[10px] text-[#A78BFA]">Nested IF</span>
              </button>
            </div>
          )}
        </div>

        {/* Format Code */}
        <button
          onClick={onFormat}
          className="flex items-center gap-1.5 rounded border border-[#3A515B] bg-[#2D424A] px-2.5 py-1 text-xs font-medium text-[#E8EDEF] transition hover:bg-[#344B54]"
          title="Format FlowScript source code"
        >
          <AlignLeft size={13} className="text-[#A9BAC2]" />
          <span>Format</span>
        </button>

        {/* Reset Workspace */}
        <button
          onClick={onReset}
          disabled={loading}
          className="flex items-center gap-1.5 rounded border border-[#3A515B] bg-[#2D424A] px-2.5 py-1 text-xs font-medium text-[#E8EDEF] transition hover:bg-[#344B54] disabled:opacity-50"
          title="Reset code and runtime state"
        >
          <RotateCcw size={13} className="text-[#A9BAC2]" />
          <span>Reset</span>
        </button>

        <div className="h-4 w-px bg-[#3A515B]" />

        {/* Compile Button */}
        <button
          onClick={onCompile}
          disabled={isCompiling}
          className="flex items-center gap-1.5 rounded border border-[#577D83] bg-[#2D424A] px-3 py-1 text-xs font-semibold text-[#E8EDEF] transition hover:bg-[#344B54] disabled:opacity-50"
          title="Compile and perform semantic analysis"
        >
          {isCompiling ? (
            <LoaderCircle size={13} className="animate-spin text-[#8CB8B5]" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-[#8CB8B5]" />
          )}
          <span>Compile</span>
        </button>

        {/* Run Workflow Button */}
        <button
          id="ide-run-btn"
          onClick={onRun}
          disabled={loading}
          className="flex items-center gap-1.5 rounded bg-[#577D83] px-3.5 py-1 text-xs font-semibold text-[#FFFFFF] shadow-sm transition hover:bg-[#68939A] disabled:opacity-50"
          title="Compile & execute workflow via DFA runtime"
        >
          {loading ? (
            <LoaderCircle size={13} className="animate-spin" />
          ) : (
            <Play size={13} fill="currentColor" />
          )}
          <span>{loading ? "Running..." : "Run Workflow"}</span>
        </button>

        <div className="h-4 w-px bg-[#3A515B]" />

        {/* Backend Connectivity Indicator */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
            apiOnline
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/15 text-rose-300"
          }`}
          title={apiOnline ? "FastAPI server active at http://127.0.0.1:8000" : "Cannot reach backend"}
        >
          {apiOnline ? (
            <CheckCircle2 size={12} className="text-emerald-400" />
          ) : (
            <XCircle size={12} className="text-rose-400" />
          )}
          <span className="hidden md:inline">{apiOnline ? "API Online" : "API Offline"}</span>
        </div>
      </div>
    </header>
  );
}
