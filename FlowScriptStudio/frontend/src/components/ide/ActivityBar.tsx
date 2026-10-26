import {
  Code2,
  Cpu,
  Files,
  History,
  Terminal,
  Workflow,
} from "lucide-react";

export type ActivityType = "explorer" | "editor" | "graph" | "dfa" | "history";

export type ActivityBarProps = {
  activeActivity: ActivityType;
  onSelectActivity: (activity: ActivityType) => void;
  sidebarOpen: boolean;
  bottomPanelOpen: boolean;
  onToggleBottomPanel: () => void;
  problemCount?: number;
};

export default function ActivityBar({
  activeActivity,
  onSelectActivity,
  sidebarOpen,
  bottomPanelOpen,
  onToggleBottomPanel,
  problemCount = 0,
}: ActivityBarProps) {
  const items: {
    id: ActivityType;
    label: string;
    icon: typeof Files;
    shortcut?: string;
  }[] = [
    {
      id: "explorer",
      label: "Explorer (Ctrl+B)",
      icon: Files,
      shortcut: "Ctrl+B",
    },
    {
      id: "editor",
      label: "Code Editor",
      icon: Code2,
    },
    {
      id: "graph",
      label: "Visual Workflow",
      icon: Workflow,
    },
    {
      id: "dfa",
      label: "DFA Explorer",
      icon: Cpu,
    },
    {
      id: "history",
      label: "Execution History",
      icon: History,
    },
  ];

  return (
    <aside
      className="flex w-12 shrink-0 flex-col items-center justify-between border-r border-[#3A515B] bg-[#1E2D38] py-2 text-[#E8EDEF] select-none z-10"
      aria-label="Activity Bar"
    >
      {/* Top Activity Icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeActivity === item.id && (item.id !== "explorer" || sidebarOpen);

          return (
            <button
              key={item.id}
              onClick={() => onSelectActivity(item.id)}
              className={`group relative flex h-10 w-full items-center justify-center transition-colors ${
                isActive
                  ? "text-[#8CB8B5] bg-[#243944]"
                  : "text-[#A9BAC2] hover:text-[#E8EDEF] hover:bg-[#243944]"
              }`}
              title={item.label}
              aria-label={item.label}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#8CB8B5] rounded-r" />
              )}

              <Icon size={20} />

              {/* Problem Badge on Editor */}
              {item.id === "editor" && problemCount > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-[#C86D6D]" />
              )}

              {/* Accessible Floating Tooltip */}
              <span className="pointer-events-none absolute left-14 z-50 hidden whitespace-nowrap rounded-md bg-[#182630] border border-[#3A515B] px-2 py-1 text-[11px] font-medium text-[#E8EDEF] shadow-xl group-hover:block">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Actions: Terminal / Bottom Panel toggle */}
      <div className="flex flex-col items-center gap-1 w-full">
        <button
          onClick={onToggleBottomPanel}
          className={`group relative flex h-10 w-full items-center justify-center transition-colors ${
            bottomPanelOpen
              ? "text-[#8CB8B5] bg-[#243944]"
              : "text-[#A9BAC2] hover:text-[#E8EDEF] hover:bg-[#243944]"
          }`}
          title="Toggle Terminal & Output Panel (Ctrl+J)"
          aria-label="Toggle Panel"
        >
          <Terminal size={19} />
          <span className="pointer-events-none absolute left-14 z-50 hidden whitespace-nowrap rounded-md bg-[#182630] border border-[#3A515B] px-2 py-1 text-[11px] font-medium text-[#E8EDEF] shadow-xl group-hover:block">
            Output & Terminal (Ctrl+J)
          </span>
        </button>
      </div>
    </aside>
  );
}
