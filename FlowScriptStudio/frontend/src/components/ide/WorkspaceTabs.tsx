import {
  Code2,
  Cpu,
  PanelBottom,
  PanelBottomClose,
  Workflow,
  X,
} from "lucide-react";

export type WorkspaceTabId = "editor" | "graph" | "dfa";

export type WorkspaceTabsProps = {
  activeTab: WorkspaceTabId;
  onSelectTab: (tab: WorkspaceTabId) => void;
  documentName: string;
  hasErrors?: boolean;
  executionStatus?: string;
  bottomPanelOpen?: boolean;
  onToggleBottomPanel?: () => void;
};

export default function WorkspaceTabs({
  activeTab,
  onSelectTab,
  documentName,
  hasErrors = false,
  executionStatus,
  bottomPanelOpen = false,
  onToggleBottomPanel,
}: WorkspaceTabsProps) {
  const tabs: {
    id: WorkspaceTabId;
    title: string;
    icon: typeof Code2;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: "editor",
      title: documentName,
      icon: Code2,
      badge: hasErrors ? "●" : undefined,
      badgeColor: "#C86D6D",
    },
    {
      id: "graph",
      title: "Visual Workflow",
      icon: Workflow,
    },
    {
      id: "dfa",
      title: "DFA Explorer",
      icon: Cpu,
      badge: executionStatus,
      badgeColor: executionStatus === "SUCCESS" ? "#6EAA8C" : executionStatus === "FAILED" ? "#C86D6D" : undefined,
    },
  ];

  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#3A515B] bg-[#1E2D38] px-1 select-none overflow-x-auto">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group relative flex h-8 items-center gap-2 rounded-t px-3.5 text-xs transition border-t-2 ${
                isActive
                  ? "border-[#8CB8B5] bg-[#182630] font-semibold text-[#8CB8B5] shadow-xs"
                  : "border-transparent bg-transparent text-[#A9BAC2] hover:bg-[#243944] hover:text-[#E8EDEF]"
              }`}
            >
              <Icon
                size={14}
                className={isActive ? "text-[#8CB8B5]" : "text-[#A9BAC2]"}
              />
              <span className="truncate max-w-[150px]">{tab.title}</span>

              {tab.badge && (
                <span
                  className="text-[10px] font-bold"
                  style={{ color: tab.badgeColor ?? "#8CB8B5" }}
                >
                  {tab.badge}
                </span>
              )}

              {/* Close Tab Icon */}
              <span className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 rounded hover:bg-[#3A515B] ml-1 transition">
                <X size={11} />
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Corner: Toggle Bottom Panel / Full Page Canvas button */}
      {onToggleBottomPanel && (
        <button
          onClick={onToggleBottomPanel}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded transition font-medium mr-1.5 border border-[#3A515B] ${
            !bottomPanelOpen
              ? "bg-[#2D424A] text-[#8CB8B5] shadow-sm hover:bg-[#344B54]"
              : "bg-transparent text-[#A9BAC2] hover:bg-[#243944] hover:text-[#E8EDEF]"
          }`}
          title={bottomPanelOpen ? "Maximize workspace (collapse bottom panel)" : "Show output panel (Ctrl+J)"}
        >
          {bottomPanelOpen ? (
            <>
              <PanelBottomClose size={13} />
              <span className="hidden sm:inline">Maximize</span>
            </>
          ) : (
            <>
              <PanelBottom size={13} />
              <span className="hidden sm:inline">Panel</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
