import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  MarkerType,
  Position,
  Handle,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Compass,
  GitBranch,
  HelpCircle,
  Info,
  Maximize2,
  PanelRight,
  PanelRightClose,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

// ============================================================================
// 1. AUTHORITATIVE DFA SPECIFICATION (MATCHING backend/app/runtime/dfa.py)
// ============================================================================

export const DFA_STATE_IDS = [
  "IDLE",
  "RUNNING",
  "SUCCESS",
  "RETRYING",
  "FAILED",
  "DONE",
] as const;

export type DFAStateId = (typeof DFA_STATE_IDS)[number];

export const DFA_EVENT_SYMBOLS = [
  "START",
  "WORKFLOW_SUCCESS",
  "TASK_FAILURE_RETRYABLE",
  "TASK_FAILURE_FINAL",
  "RETRY",
  "FINALIZE",
  "RESET",
] as const;

export type DFAEvent = (typeof DFA_EVENT_SYMBOLS)[number];

export type DFAStateMeta = {
  id: DFAStateId;
  name: DFAStateId;
  alias: string; // Formal textbook notation: q0, q1, etc.
  isInitial: boolean;
  isAccepting: boolean; // F = { DONE }
  isSink: boolean; // FAILED is terminal error trap state
  title: string;
  description: string;
  formalRole: string;
  accentColor: string;
};

export const DFA_STATES: Record<DFAStateId, DFAStateMeta> = {
  IDLE: {
    id: "IDLE",
    name: "IDLE",
    alias: "q0",
    isInitial: true,
    isAccepting: false,
    isSink: false,
    title: "Initial State (q0)",
    description: "The engine is initialized and idling, awaiting the START event to begin pipeline execution.",
    formalRole: "Initial start state q0 ∈ Q.",
    accentColor: "#8CB8B5", // Sea-glass teal
  },
  RUNNING: {
    id: "RUNNING",
    name: "RUNNING",
    alias: "q1",
    isInitial: false,
    isAccepting: false,
    isSink: false,
    title: "Active Execution State (q1)",
    description: "Tasks are being executed and conditionals evaluated sequentially from intermediate representation.",
    formalRole: "Primary operational state coordinating task progression.",
    accentColor: "#5B92E5", // Academic Blue
  },
  SUCCESS: {
    id: "SUCCESS",
    name: "SUCCESS",
    alias: "q2",
    isInitial: false,
    isAccepting: false,
    isSink: false,
    title: "Pre-Finalization Success State (q2)",
    description: "All pipeline instructions executed without unhandled errors; awaiting final output commit.",
    formalRole: "Transient success state prior to emission of FINALIZE.",
    accentColor: "#6EAA8C", // Soft Sage
  },
  RETRYING: {
    id: "RETRYING",
    name: "RETRYING",
    alias: "q3",
    isInitial: false,
    isAccepting: false,
    isSink: false,
    title: "Error Recovery State (q3)",
    description: "A retryable task exception was trapped. The system prepares recovery parameters before emitting RETRY.",
    formalRole: "Transient recovery state in the retry cycle.",
    accentColor: "#D8A657", // Warm Amber
  },
  FAILED: {
    id: "FAILED",
    name: "FAILED",
    alias: "q4",
    isInitial: false,
    isAccepting: false,
    isSink: true,
    title: "Terminal Error Sink State (q4)",
    description: "A fatal non-retryable task failure occurred. The workflow halts immediately and awaits external RESET.",
    formalRole: "Terminal rejection / sink state (non-accepting trap).",
    accentColor: "#C86D6D", // Muted Dusty Rose
  },
  DONE: {
    id: "DONE",
    name: "DONE",
    alias: "q5",
    isInitial: false,
    isAccepting: true, // Formal accepting state F = { q5 }
    isSink: false,
    title: "Formal Accepting State (q5 ∈ F)",
    description: "Workflow executed to completion and successfully finalized. Designated as the formal accepting state.",
    formalRole: "Final accepting state F = { DONE } denoting valid language/workflow termination.",
    accentColor: "#A78BFA", // Muted Violet
  },
};

export type DFATransition = {
  id: string;
  from: DFAStateId;
  event: DFAEvent;
  to: DFAStateId;
  meaning: string;
  sourceHandle: "top" | "bottom" | "left" | "right" | "top-right" | "left-loop" | "right-loop";
  targetHandle: "top" | "bottom" | "left" | "right" | "top-tgt" | "left-tgt" | "bottom-tgt";
};

// Exact transition table matching backend/app/runtime/dfa.py
export const DFA_TRANSITIONS: DFATransition[] = [
  {
    id: "t_start",
    from: "IDLE",
    event: "START",
    to: "RUNNING",
    meaning: "Begin workflow execution",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    id: "t_success",
    from: "RUNNING",
    event: "WORKFLOW_SUCCESS",
    to: "SUCCESS",
    meaning: "Workflow completed all instructions successfully",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    id: "t_retryable",
    from: "RUNNING",
    event: "TASK_FAILURE_RETRYABLE",
    to: "RETRYING",
    meaning: "A task encountered a transient retryable failure",
    sourceHandle: "left-loop",
    targetHandle: "left-tgt",
  },
  {
    id: "t_retry",
    from: "RETRYING",
    event: "RETRY",
    to: "RUNNING",
    meaning: "Re-attempt failed step and resume execution",
    sourceHandle: "right-loop",
    targetHandle: "top-tgt",
  },
  {
    id: "t_final_fail",
    from: "RUNNING",
    event: "TASK_FAILURE_FINAL",
    to: "FAILED",
    meaning: "A task failed critically; workflow execution aborted",
    sourceHandle: "bottom",
    targetHandle: "top-tgt",
  },
  {
    id: "t_finalize",
    from: "SUCCESS",
    event: "FINALIZE",
    to: "DONE",
    meaning: "Persist outputs and conclude workflow into final state",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    id: "t_reset_fail",
    from: "FAILED",
    event: "RESET",
    to: "IDLE",
    meaning: "Reset aborted workflow back to initial state q0",
    sourceHandle: "left-loop",
    targetHandle: "bottom-tgt",
  },
  {
    id: "t_reset_done",
    from: "DONE",
    event: "RESET",
    to: "IDLE",
    meaning: "Reset completed workflow back to initial state q0",
    sourceHandle: "bottom",
    targetHandle: "bottom-tgt",
  },
];

// Coordinate layout for textbook circular diagram
const POSITIONS: Record<DFAStateId | "start-marker", { x: number; y: number }> = {
  "start-marker": { x: 30, y: 220 },
  IDLE: { x: 130, y: 180 },
  RUNNING: { x: 410, y: 180 },
  RETRYING: { x: 410, y: 20 },
  SUCCESS: { x: 690, y: 180 },
  DONE: { x: 960, y: 180 },
  FAILED: { x: 410, y: 380 },
};

// ============================================================================
// 2. TEXTBOOK CUSTOM REACT FLOW NODES
// ============================================================================

/**
 * StartMarkerNode: Represents the formal textbook start arrow
 * pointing from outside into the initial state q0.
 */
function StartMarkerNode() {
  return (
    <div className="flex items-center gap-1 select-none pr-1">
      <div className="flex items-center gap-1.5 rounded-full bg-[#243944] border border-[#3A515B] px-2.5 py-1 shadow-md">
        <span className="h-1.5 w-1.5 rounded-full bg-[#8CB8B5] animate-ping" />
        <span className="text-[10px] font-mono font-bold tracking-wider text-[#8CB8B5]">
          START
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="start-out"
        className="!w-1.5 !h-1.5 !bg-[#8CB8B5] !border-none opacity-0"
      />
    </div>
  );
}

/**
 * StateCircleNode: Textbook-style circular finite automaton state.
 * Double ring indicates an accepting state F = { DONE }.
 * Highlight ring indicates the active execution or simulation state.
 */
function StateCircleNode({
  data,
}: {
  data: {
    state: DFAStateMeta;
    isActive: boolean;
    isVisited: boolean;
    isSelected: boolean;
    onSelect: () => void;
  };
}) {
  const { state, isActive, isVisited, isSelected, onSelect } = data;

  return (
    <div
      onClick={onSelect}
      className={`group relative flex h-24 w-24 cursor-pointer select-none flex-col items-center justify-center rounded-full transition-all duration-200 ${
        isActive
          ? "bg-[#2D424A] shadow-xl shadow-[#8CB8B5]/25 ring-4 ring-[#8CB8B5] ring-offset-2 ring-offset-[#182630] scale-105"
          : isSelected
          ? "bg-[#2D424A] ring-2 ring-[#8CB8B5] shadow-lg"
          : isVisited
          ? "bg-[#243944] border-2 border-[#577D83] hover:border-[#8CB8B5] hover:scale-105"
          : "bg-[#243944] border-2 border-[#3A515B] hover:border-[#577D83] hover:scale-105"
      }`}
      style={{
        borderColor: isActive || isSelected ? "#8CB8B5" : state.isSink ? "#C86D6D" : undefined,
      }}
      title={`${state.name} (${state.alias}) — Click to inspect details`}
    >
      {/* Textbook Double Circle for Accepting State F */}
      {state.isAccepting && (
        <div
          className={`pointer-events-none absolute inset-[5px] rounded-full border-2 transition-colors ${
            isActive ? "border-[#8CB8B5]" : "border-[#A78BFA]"
          }`}
        />
      )}

      {/* Target Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-2 !w-2 !bg-[#8CB8B5] !border-none !opacity-0"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-tgt"
        className="!h-2 !w-2 !bg-[#8CB8B5] !border-none !opacity-0"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-tgt"
        className="!h-2 !w-2 !bg-[#8CB8B5] !border-none !opacity-0"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-tgt"
        className="!h-2 !w-2 !bg-[#8CB8B5] !border-none !opacity-0"
      />

      {/* Source Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-2 !w-2 !bg-[#8CB8B5] !border-none !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!h-2 !w-2 !bg-[#8CB8B5] !border-none !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-loop"
        className="!h-2 !w-2 !bg-[#8CB8B5] !border-none !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-loop"
        className="!h-2 !w-2 !bg-[#8CB8B5] !border-none !opacity-0"
      />

      {/* Content inside State Circle */}
      <div className="z-10 flex flex-col items-center justify-center text-center px-1">
        {/* Textbook Alias: q0, q1, etc. */}
        <span
          className={`font-serif italic text-sm font-black tracking-tight leading-none ${
            isActive ? "text-[#8CB8B5]" : "text-[#E8EDEF]"
          }`}
        >
          {state.alias}
        </span>

        {/* State Name */}
        <span
          className="mt-1 font-mono text-[11px] font-bold tracking-wider leading-none"
          style={{ color: state.accentColor }}
        >
          {state.name}
        </span>

        {/* Status Indicator Badge */}
        <div className="mt-1 flex items-center justify-center">
          {isActive ? (
            <span className="flex items-center gap-1 rounded-full bg-[#8CB8B5]/20 px-1.5 py-0.5 text-[8.5px] font-bold text-[#8CB8B5] border border-[#8CB8B5]/50 leading-none">
              <span className="h-1 w-1 rounded-full bg-[#8CB8B5] animate-ping" />
              ACTIVE
            </span>
          ) : state.isInitial ? (
            <span className="rounded-full bg-[#577D83]/20 px-1.5 py-0.5 text-[8.5px] font-semibold text-[#8CB8B5] border border-[#577D83]/40 leading-none">
              INITIAL
            </span>
          ) : state.isAccepting ? (
            <span className="rounded-full bg-[#A78BFA]/20 px-1.5 py-0.5 text-[8.5px] font-bold text-[#A78BFA] border border-[#A78BFA]/40 leading-none">
              ACCEPT
            </span>
          ) : state.isSink ? (
            <span className="rounded-full bg-[#C86D6D]/20 px-1.5 py-0.5 text-[8.5px] font-bold text-[#C86D6D] border border-[#C86D6D]/40 leading-none">
              SINK
            </span>
          ) : (
            <span className="text-[8.5px] font-mono text-[#A9BAC2]/70 leading-none">
              STATE
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  startMarker: StartMarkerNode,
  stateCircle: StateCircleNode,
};

// ============================================================================
// 3. MAIN COMPONENT PROPS
// ============================================================================

export type DFAExplorerProps = {
  isActive?: boolean;
  currentState?: string;
  history?: string[];
};

export default function DFAExplorer({
  isActive = true,
  currentState = "IDLE",
  history = ["IDLE"],
}: DFAExplorerProps) {
  // Mode selection: "replay" (real workflow execution trace) vs "explore" (hypothetical sandbox)
  const [explorerMode, setExplorerMode] = useState<"replay" | "explore">("replay");

  // Selection states for inspection
  const [selectedStateId, setSelectedStateId] = useState<DFAStateId>("IDLE");
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);

  // Side Drawer Tabs: "table" | "inspector" | "definition"
  const [activeDrawerTab, setActiveDrawerTab] = useState<"table" | "inspector" | "definition">("table");
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Event acceptance tester in State Details
  const [simulatedSymbol, setSimulatedSymbol] = useState<DFAEvent>("START");

  // Replay timeline state (Replay Mode)
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Simulation state (Explore Mode)
  const [sandboxState, setSandboxState] = useState<DFAStateId>("IDLE");
  const [sandboxHistory, setSandboxHistory] = useState<DFAStateId[]>(["IDLE"]);
  const [sandboxLastEvent, setSandboxLastEvent] = useState<DFAEvent | null>(null);

  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Validated replay history from execution
  const executionHistory: DFAStateId[] = useMemo(() => {
    if (!history || history.length === 0) {
      const validCurrent = DFA_STATE_IDS.includes(currentState as DFAStateId)
        ? (currentState as DFAStateId)
        : "IDLE";
      return [validCurrent];
    }
    return history.map((s) => (DFA_STATE_IDS.includes(s as DFAStateId) ? (s as DFAStateId) : "IDLE"));
  }, [history, currentState]);

  // Current active state depending on mode
  const activeState: DFAStateId = useMemo(() => {
    if (explorerMode === "explore") return sandboxState;
    return executionHistory[replayIndex] ?? "IDLE";
  }, [explorerMode, sandboxState, executionHistory, replayIndex]);

  // Identify active transition in replay mode
  const activeReplayTransition = useMemo(() => {
    if (explorerMode === "explore") {
      if (!sandboxLastEvent || sandboxHistory.length < 2) return null;
      const prev = sandboxHistory[sandboxHistory.length - 2];
      return DFA_TRANSITIONS.find((t) => t.from === prev && t.event === sandboxLastEvent && t.to === sandboxState) ?? null;
    }
    if (replayIndex <= 0) return null;
    const prev = executionHistory[replayIndex - 1];
    const curr = executionHistory[replayIndex];
    return DFA_TRANSITIONS.find((t) => t.from === prev && t.to === curr) ?? null;
  }, [explorerMode, sandboxLastEvent, sandboxHistory, sandboxState, replayIndex, executionHistory]);

  // Reset replay on history change
  useEffect(() => {
    setReplayIndex(0);
    setIsPlaying(false);
  }, [history]);

  // Synchronize selectedStateId when external currentState changes
  useEffect(() => {
    if (currentState && DFA_STATE_IDS.includes(currentState as DFAStateId)) {
      setSelectedStateId(currentState as DFAStateId);
    }
  }, [currentState]);

  // Automatically select a valid outgoing symbol when switching states so every state doesn't show "Undefined Transition"
  useEffect(() => {
    const isCurrentValid = DFA_TRANSITIONS.some(
      (t) => t.from === selectedStateId && t.event === simulatedSymbol,
    );
    if (!isCurrentValid) {
      const firstValid = DFA_TRANSITIONS.find((t) => t.from === selectedStateId);
      if (firstValid) {
        setSimulatedSymbol(firstValid.event);
      }
    }
  }, [selectedStateId]);

  // Replay playback interval
  useEffect(() => {
    if (!isPlaying) return;

    if (replayIndex >= executionHistory.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setReplayIndex((idx) => Math.min(idx + 1, executionHistory.length - 1));
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [isPlaying, replayIndex, executionHistory.length]);

  const [zoomLevel, setZoomLevel] = useState(100);

  const handleZoomIn = () => {
    reactFlowRef.current?.zoomIn({ duration: 180 });
  };

  const handleZoomOut = () => {
    reactFlowRef.current?.zoomOut({ duration: 180 });
  };

  const handleZoomReset = () => {
    reactFlowRef.current?.zoomTo(1, { duration: 200 });
  };

  const handleFitView = () => {
    reactFlowRef.current?.fitView({
      padding: 0.18,
      minZoom: 0.05,
      maxZoom: 1.1,
      duration: 350,
    });
  };

  // Auto fit diagram whenever tab becomes active or drawer opens/closes
  useEffect(() => {
    if (!isActive) return;
    const timers = [
      setTimeout(() => handleFitView(), 50),
      setTimeout(() => handleFitView(), 200),
      setTimeout(() => handleFitView(), 450),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isActive, drawerOpen]);

  // ResizeObserver on canvas container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50 && entry.contentRect.height > 50) {
          handleFitView();
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Sandbox transition handler (Explore Mode)
  const triggerSandboxEvent = (event: DFAEvent) => {
    const rule = DFA_TRANSITIONS.find((t) => t.from === sandboxState && t.event === event);
    if (!rule) return;
    setSandboxState(rule.to);
    setSandboxHistory((prev) => [...prev, rule.to]);
    setSandboxLastEvent(event);
    setSelectedStateId(rule.to);
    setSelectedTransitionId(rule.id);
  };

  const resetSandbox = () => {
    setSandboxState("IDLE");
    setSandboxHistory(["IDLE"]);
    setSandboxLastEvent(null);
    setSelectedStateId("IDLE");
    setSelectedTransitionId(null);
  };

  // Build textbook ReactFlow Nodes
  const nodes = useMemo<Node[]>(() => {
    const visitedSet = new Set(
      explorerMode === "explore" ? sandboxHistory : executionHistory.slice(0, replayIndex + 1),
    );

    const stateNodes: Node[] = DFA_STATE_IDS.map((stateId) => ({
      id: stateId,
      type: "stateCircle",
      position: POSITIONS[stateId],
      data: {
        state: DFA_STATES[stateId],
        isActive: stateId === activeState,
        isVisited: visitedSet.has(stateId),
        isSelected: stateId === selectedStateId,
        onSelect: () => {
          setSelectedStateId(stateId);
          setSelectedTransitionId(null);
          setActiveDrawerTab("inspector");
        },
      },
      draggable: true,
    }));

    // Start marker incoming arrow node
    const markerNode: Node = {
      id: "start-marker",
      type: "startMarker",
      position: POSITIONS["start-marker"],
      data: {},
      draggable: false,
    };

    return [markerNode, ...stateNodes];
  }, [explorerMode, sandboxHistory, executionHistory, replayIndex, activeState, selectedStateId]);

  // Build textbook ReactFlow Directed Edges
  const edges = useMemo<Edge[]>(() => {
    // 1. Initial State Arrow
    const initialEdge: Edge = {
      id: "edge_initial_start",
      source: "start-marker",
      sourceHandle: "start-out",
      target: "IDLE",
      targetHandle: "left",
      type: "straight",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#8CB8B5",
        width: 14,
        height: 14,
      },
      style: {
        stroke: "#8CB8B5",
        strokeWidth: 2,
      },
    };

    // 2. Regular Directed Transition Edges
    const transitionEdges: Edge[] = DFA_TRANSITIONS.map((transition) => {
      const isSelected = selectedTransitionId === transition.id;
      const isTraversed = activeReplayTransition?.id === transition.id;

      // Color scheme based on status
      const edgeColor = isTraversed
        ? "#8CB8B5" // Active Teal
        : isSelected
        ? "#5B92E5" // Selected Blue
        : "#577D83"; // Inactive Muted Slate-Teal

      return {
        id: transition.id,
        source: transition.from,
        target: transition.to,
        sourceHandle: transition.sourceHandle,
        targetHandle: transition.targetHandle,
        label: transition.event,
        type: "smoothstep",
        animated: isTraversed,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 16,
          height: 16,
        },
        labelStyle: {
          fill: isTraversed ? "#8CB8B5" : isSelected ? "#FFFFFF" : "#E8EDEF",
          fontSize: 10,
          fontFamily: "'Fira Code', monospace",
          fontWeight: isTraversed || isSelected ? 700 : 600,
        },
        labelBgStyle: {
          fill: isTraversed ? "#182630" : isSelected ? "#2D424A" : "#243944",
          fillOpacity: 0.95,
          stroke: edgeColor,
          strokeWidth: isTraversed || isSelected ? 1.5 : 1,
          rx: 4,
          ry: 4,
        },
        labelBgPadding: [6, 3] as [number, number],
        style: {
          stroke: edgeColor,
          strokeWidth: isTraversed ? 3 : isSelected ? 2.5 : 1.8,
        },
      };
    });

    return [initialEdge, ...transitionEdges];
  }, [selectedTransitionId, activeReplayTransition]);

  // Outgoing and Incoming transitions for the currently selected state
  const selectedStateMeta = DFA_STATES[selectedStateId];
  const outgoingTransitions = DFA_TRANSITIONS.filter((t) => t.from === selectedStateId);
  const incomingTransitions = DFA_TRANSITIONS.filter((t) => t.to === selectedStateId);

  // Evaluated rule for the selected transition
  const activeSelectedTransition = DFA_TRANSITIONS.find((t) => t.id === selectedTransitionId) ?? null;

  // Simulator test for selected state
  const simulatedOutcome = DFA_TRANSITIONS.find(
    (t) => t.from === selectedStateId && t.event === simulatedSymbol,
  );

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-[#182630] text-[#E8EDEF] select-none font-sans">
      {/* 1. TOP TOOLBAR: Playback / Explore Controls & Stats */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#3A515B] bg-[#243944] px-3 select-none z-20">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-bold text-xs text-[#E8EDEF]">
            <Compass size={15} className="text-[#8CB8B5]" />
            <span>DFA Explorer</span>
            <span className="hidden sm:inline text-[11px] font-normal text-[#A9BAC2]">
              — State Machine Architecture
            </span>
          </div>

          <div className="h-4 w-px bg-[#3A515B] mx-1" />

          {/* Mode Switcher: Replay vs Explore */}
          <div className="flex items-center rounded-md border border-[#3A515B] bg-[#182630] p-0.5 text-xs">
            <button
              onClick={() => setExplorerMode("replay")}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-semibold transition ${
                explorerMode === "replay"
                  ? "bg-[#2D424A] text-[#8CB8B5] shadow-xs"
                  : "text-[#A9BAC2] hover:text-[#E8EDEF]"
              }`}
              title="Replay actual workflow execution trace"
            >
              <span>Replay Trace</span>
            </button>
            <button
              onClick={() => {
                setExplorerMode("explore");
                setSelectedStateId(sandboxState);
              }}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-semibold transition ${
                explorerMode === "explore"
                  ? "bg-[#2D424A] text-[#8CB8B5] shadow-xs"
                  : "text-[#A9BAC2] hover:text-[#E8EDEF]"
              }`}
              title="Explore transitions interactively in sandbox mode"
            >
              <Sparkles size={11} />
              <span>Explore Mode</span>
            </button>
          </div>

          {/* Controls for Replay Mode */}
          {explorerMode === "replay" ? (
            <div className="flex items-center gap-1 border-l border-[#3A515B] pl-2">
              <button
                onClick={() => {
                  setReplayIndex(0);
                  setIsPlaying(false);
                }}
                disabled={replayIndex === 0}
                className="p-1 rounded text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF] disabled:opacity-30"
                title="Reset Replay"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => setReplayIndex((i) => Math.max(0, i - 1))}
                disabled={replayIndex === 0}
                className="p-1 rounded text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF] disabled:opacity-30"
                title="Previous Step"
              >
                <SkipBack size={13} />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1 rounded bg-[#577D83] px-2 py-0.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#68939a]"
                title={isPlaying ? "Pause Replay" : "Play Replay"}
              >
                {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                <span className="text-[11px]">{isPlaying ? "Pause" : "Play"}</span>
              </button>
              <button
                onClick={() => setReplayIndex((i) => Math.min(executionHistory.length - 1, i + 1))}
                disabled={replayIndex >= executionHistory.length - 1}
                className="p-1 rounded text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF] disabled:opacity-30"
                title="Next Step"
              >
                <SkipForward size={13} />
              </button>

              <div className="hidden md:flex items-center gap-1 rounded bg-[#2D424A] border border-[#3A515B] px-2 py-0.5 text-xs">
                <span className="text-[#A9BAC2]">Step:</span>
                <span className="font-bold text-[#E8EDEF]">
                  {replayIndex + 1} / {executionHistory.length}
                </span>
              </div>
            </div>
          ) : (
            /* Controls for Explore Mode */
            <div className="flex items-center gap-1 border-l border-[#3A515B] pl-2">
              <button
                onClick={resetSandbox}
                className="flex items-center gap-1 rounded border border-[#3A515B] bg-[#2D424A] px-2 py-0.5 text-xs font-semibold text-[#A9BAC2] hover:text-[#E8EDEF]"
                title="Reset Sandbox to Initial State q0"
              >
                <RotateCcw size={12} />
                <span>Reset Sandbox</span>
              </button>
              <div className="hidden md:flex items-center gap-1 rounded bg-[#2D424A] border border-[#3A515B] px-2 py-0.5 text-xs">
                <span className="text-[#A9BAC2]">Trace length:</span>
                <span className="font-mono font-bold text-[#8CB8B5]">{sandboxHistory.length} steps</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          {/* Active State Pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-[#3A515B] bg-[#2D424A] px-2.5 py-0.5 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: DFA_STATES[activeState].accentColor }}
            />
            <span className="text-[#A9BAC2] text-[11px]">State:</span>
            <span className="font-mono font-bold text-[#E8EDEF]">
              {DFA_STATES[activeState].alias} ({activeState})
            </span>
          </div>

          {/* Zoom In / Out / Reset Controls */}
          <div className="flex items-center rounded border border-[#3A515B] bg-[#1E2D38] p-0.5 shadow-sm">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF] transition"
              title="Zoom Out (-)"
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-[#8CB8B5] hover:text-[#E8EDEF] transition"
              title="Reset Zoom to 100%"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF] transition"
              title="Zoom In (+)"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            onClick={handleFitView}
            className="flex items-center gap-1 rounded border border-[#3A515B] bg-[#2D424A] px-2.5 py-1 text-xs font-medium text-[#E8EDEF] hover:bg-[#344b54] shadow-sm"
            title="Fit diagram to viewport (Auto-adjust)"
          >
            <Maximize2 size={13} className="text-[#8CB8B5]" />
            <span className="hidden sm:inline">Fit View</span>
          </button>

          <button
            onClick={() => setDrawerOpen((open) => !open)}
            className={`flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium transition ${
              drawerOpen
                ? "border-[#8CB8B5] bg-[#2D424A] text-[#8CB8B5]"
                : "border-[#3A515B] bg-[#243944] text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF]"
            }`}
            title={drawerOpen ? "Hide educational inspector" : "Open educational inspector"}
          >
            {drawerOpen ? <PanelRightClose size={13} /> : <PanelRight size={13} />}
            <span className="hidden sm:inline">{drawerOpen ? "Hide Drawer" : "Inspector"}</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE: ReactFlow Canvas + Coordinated Right Drawer */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Textbook DFA State Canvas */}
        <div ref={containerRef} className="relative flex-1 h-full min-w-0 bg-[#182630]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              reactFlowRef.current = instance;
              instance.fitView({ padding: 0.25 });
            }}
            onEdgeClick={(_, edge) => {
              if (edge.id === "edge_initial_start") return;
              setSelectedTransitionId(edge.id);
              const rule = DFA_TRANSITIONS.find((t) => t.id === edge.id);
              if (rule) {
                setSelectedStateId(rule.from);
                setSimulatedSymbol(rule.event);
              }
              setActiveDrawerTab("table");
            }}
            fitView
            fitViewOptions={{ padding: 0.18, minZoom: 0.05, maxZoom: 1.1 }}
            minZoom={0.05}
            maxZoom={2.5}
            onMove={(_, viewport) => {
              setZoomLevel(Math.round(viewport.zoom * 100));
            }}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#2D424A" gap={20} size={1} />
            <Controls className="!bg-[#243944] !border !border-[#3A515B] !shadow-lg !rounded-md [&>button]:!border-[#3A515B] [&>button]:!text-[#E8EDEF] [&>button:hover]:!bg-[#2D424A]" />
          </ReactFlow>

          {/* Textbook Mathematical Legend */}
          <div className="absolute bottom-3 left-3 z-10 hidden sm:flex flex-wrap items-center gap-2 rounded-lg border border-[#3A515B] bg-[#243944]/95 px-3 py-1.5 text-[11px] shadow-lg backdrop-blur">
            <span className="font-bold text-[#8CB8B5]">M = (Q, Σ, δ, q0, F)</span>
            <span className="text-[#3A515B]">|</span>
            <span className="text-[#A9BAC2]">Initial: <strong className="text-[#8CB8B5]">q0 (IDLE)</strong></span>
            <span className="text-[#3A515B]">·</span>
            <span className="text-[#A9BAC2]">Accepting: <strong className="text-[#A78BFA]">q5 (DONE) ∈ F</strong></span>
            <span className="text-[#3A515B]">·</span>
            <span className="text-[#A9BAC2]">Sink: <strong className="text-[#C86D6D]">q4 (FAILED)</strong></span>
          </div>
        </div>

        {/* 3. COORDINATED RIGHT DRAWER (Formal Table, State Details & Definition) */}
        {drawerOpen && (
          <aside className="w-96 shrink-0 border-l border-[#3A515B] bg-[#243944] flex flex-col justify-between overflow-hidden shadow-2xl select-none z-10">
            {/* Drawer Tabs Header */}
            <div className="flex h-10 shrink-0 border-b border-[#3A515B] bg-[#1E2D38]">
              <button
                onClick={() => setActiveDrawerTab("table")}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold transition border-b-2 ${
                  activeDrawerTab === "table"
                    ? "border-[#8CB8B5] text-[#8CB8B5] bg-[#243944]"
                    : "border-transparent text-[#A9BAC2] hover:text-[#E8EDEF] hover:bg-[#243944]/50"
                }`}
              >
                <GitBranch size={13} />
                <span>Table (δ)</span>
              </button>

              <button
                onClick={() => setActiveDrawerTab("inspector")}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold transition border-b-2 ${
                  activeDrawerTab === "inspector"
                    ? "border-[#8CB8B5] text-[#8CB8B5] bg-[#243944]"
                    : "border-transparent text-[#A9BAC2] hover:text-[#E8EDEF] hover:bg-[#243944]/50"
                }`}
              >
                <Info size={13} />
                <span>State & Rule</span>
              </button>

              <button
                onClick={() => setActiveDrawerTab("definition")}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold transition border-b-2 ${
                  activeDrawerTab === "definition"
                    ? "border-[#8CB8B5] text-[#8CB8B5] bg-[#243944]"
                    : "border-transparent text-[#A9BAC2] hover:text-[#E8EDEF] hover:bg-[#243944]/50"
                }`}
              >
                <BookOpen size={13} />
                <span>Formal (M)</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3.5">
              {/* ============================================================ */}
              {/* TAB 1: FORMAL TRANSITION TABLE (δ)                           */}
              {/* ============================================================ */}
              {activeDrawerTab === "table" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-[#E8EDEF]">
                        Transition Function δ: Q × Σ → Q
                      </h3>
                      <p className="text-[11px] text-[#A9BAC2] mt-0.5">
                        Click any row to highlight the matching diagram edge.
                      </p>
                    </div>
                    <span className="rounded bg-[#2D424A] border border-[#3A515B] px-1.5 py-0.5 text-[10px] font-mono text-[#8CB8B5]">
                      8 rules
                    </span>
                  </div>

                  <div className="rounded-lg border border-[#3A515B] bg-[#182630] overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#2D424A] text-[#A9BAC2] border-b border-[#3A515B] uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-2.5 py-2 font-bold">State (q)</th>
                          <th className="px-2.5 py-2 font-bold">Symbol (σ)</th>
                          <th className="px-2.5 py-2 font-bold">Next δ(q,σ)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3A515B]/50 font-mono">
                        {DFA_TRANSITIONS.map((transition) => {
                          const isSelected = selectedTransitionId === transition.id;
                          const isTraversed = activeReplayTransition?.id === transition.id;

                          return (
                            <tr
                              key={transition.id}
                              onClick={() => {
                                setSelectedTransitionId(transition.id);
                                setSelectedStateId(transition.from);
                                setSimulatedSymbol(transition.event);
                              }}
                              className={`cursor-pointer transition-colors ${
                                isTraversed
                                  ? "bg-[#8CB8B5]/20 font-bold"
                                  : isSelected
                                  ? "bg-[#2D424A] font-bold"
                                  : "hover:bg-[#243944]"
                              }`}
                            >
                              <td className="px-2.5 py-2">
                                <span
                                  className="font-bold"
                                  style={{ color: DFA_STATES[transition.from].accentColor }}
                                >
                                  {DFA_STATES[transition.from].alias}
                                </span>{" "}
                                <span className="text-[#A9BAC2] text-[10px]">
                                  ({transition.from})
                                </span>
                              </td>
                              <td className="px-2.5 py-2 text-[#8CB8B5]">
                                {transition.event}
                              </td>
                              <td className="px-2.5 py-2">
                                <span
                                  className="font-bold"
                                  style={{ color: DFA_STATES[transition.to].accentColor }}
                                >
                                  {DFA_STATES[transition.to].alias}
                                </span>{" "}
                                <span className="text-[#A9BAC2] text-[10px]">
                                  ({transition.to})
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Operational Meaning for Selected Transition */}
                  {activeSelectedTransition && (
                    <div className="rounded-lg border border-[#3A515B] bg-[#2D424A] p-3 space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#3A515B] pb-1.5">
                        <span className="font-bold text-xs text-[#8CB8B5]">
                          Selected Rule: δ({DFA_STATES[activeSelectedTransition.from].alias}, {activeSelectedTransition.event}) = {DFA_STATES[activeSelectedTransition.to].alias}
                        </span>
                        <span className="text-[10px] font-mono text-[#A9BAC2]">
                          {activeSelectedTransition.from} → {activeSelectedTransition.to}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#E8EDEF]">
                        <strong>Operational Meaning:</strong> {activeSelectedTransition.meaning}.
                      </p>
                      <p className="text-[10px] text-[#A9BAC2]">
                        In formal language terms, upon reading symbol <code>{activeSelectedTransition.event}</code> while in state <code>{activeSelectedTransition.from}</code>, the transition function deterministic yields <code>{activeSelectedTransition.to}</code>.
                      </p>
                    </div>
                  )}

                  {/* Sandbox Event Dispatcher in Table Tab */}
                  {explorerMode === "explore" && (
                    <div className="rounded-lg border border-[#3A515B] bg-[#2D424A] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#E8EDEF]">
                          Explore from: {sandboxState} ({DFA_STATES[sandboxState].alias})
                        </span>
                        <button
                          onClick={resetSandbox}
                          className="text-[10px] text-[#8CB8B5] hover:underline"
                        >
                          Reset
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {DFA_TRANSITIONS.filter((t) => t.from === sandboxState).map((rule) => (
                          <button
                            key={rule.event}
                            onClick={() => triggerSandboxEvent(rule.event)}
                            className="flex items-center justify-between rounded bg-[#182630] border border-[#3A515B] px-2.5 py-1.5 text-xs hover:border-[#8CB8B5] transition text-left"
                          >
                            <span className="font-mono font-bold text-[#8CB8B5]">
                              {rule.event}
                            </span>
                            <span className="text-[11px] text-[#E8EDEF]">
                              → {rule.to} ({DFA_STATES[rule.to].alias})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 2: STATE & TRANSITION INSPECTOR                          */}
              {/* ============================================================ */}
              {activeDrawerTab === "inspector" && (
                <div className="space-y-3.5">
                  {/* State Details Card */}
                  <div className="rounded-lg border border-[#3A515B] bg-[#2D424A] p-3 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[#3A515B] pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: selectedStateMeta.accentColor }}
                        />
                        <div>
                          <h4 className="font-bold text-xs text-[#E8EDEF]">
                            State {selectedStateMeta.alias} · {selectedStateMeta.name}
                          </h4>
                          <span className="text-[10px] text-[#A9BAC2]">
                            {selectedStateMeta.formalRole}
                          </span>
                        </div>
                      </div>

                      {/* State Classification Badges */}
                      <div className="flex items-center gap-1">
                        {selectedStateMeta.isInitial && (
                          <span className="rounded bg-[#8CB8B5]/20 border border-[#8CB8B5]/40 px-1.5 py-0.5 text-[9px] font-bold text-[#8CB8B5]">
                            INITIAL q0
                          </span>
                        )}
                        {selectedStateMeta.isAccepting && (
                          <span className="rounded bg-[#A78BFA]/20 border border-[#A78BFA]/40 px-1.5 py-0.5 text-[9px] font-bold text-[#A78BFA]">
                            FINAL F
                          </span>
                        )}
                        {selectedStateMeta.isSink && (
                          <span className="rounded bg-[#C86D6D]/20 border border-[#C86D6D]/40 px-1.5 py-0.5 text-[9px] font-bold text-[#C86D6D]">
                            SINK
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-[#A9BAC2] leading-relaxed">
                      {selectedStateMeta.description}
                    </p>

                    {/* Outgoing Transitions */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A9BAC2] block mb-1">
                        Valid Outgoing Transitions ({outgoingTransitions.length})
                      </span>
                      {outgoingTransitions.length > 0 ? (
                        <div className="space-y-1">
                          {outgoingTransitions.map((t) => (
                            <div
                              key={t.event}
                              onClick={() => {
                                setSelectedTransitionId(t.id);
                                setSimulatedSymbol(t.event);
                                if (explorerMode === "explore") triggerSandboxEvent(t.event);
                              }}
                              className="flex items-center justify-between rounded bg-[#182630] border border-[#3A515B] px-2 py-1 text-xs hover:border-[#8CB8B5] cursor-pointer transition"
                            >
                              <span className="font-mono font-bold text-[#8CB8B5]">
                                {t.event}
                              </span>
                              <span className="text-[11px] font-semibold" style={{ color: DFA_STATES[t.to].accentColor }}>
                                → {t.to} ({DFA_STATES[t.to].alias})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#A9BAC2] italic bg-[#182630] p-2 rounded border border-[#3A515B]">
                          Terminal state. No valid outgoing transitions. Requires manual RESET.
                        </p>
                      )}
                    </div>

                    {/* Incoming Transitions */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A9BAC2] block mb-1">
                        Incoming Transitions ({incomingTransitions.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {incomingTransitions.map((t) => (
                          <span
                            key={t.id}
                            className="rounded bg-[#182630] border border-[#3A515B] px-2 py-0.5 text-[10px] font-mono text-[#A9BAC2]"
                          >
                            {DFA_STATES[t.from].alias} via <strong>{t.event}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Invalid Event Simulator / Acceptance Checker */}
                  <div className="rounded-lg border border-[#3A515B] bg-[#2D424A] p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle size={13} className="text-[#8CB8B5]" />
                      <h4 className="font-bold text-xs text-[#E8EDEF]">
                        Event Acceptance Simulator
                      </h4>
                    </div>

                    <p className="text-[11px] text-[#A9BAC2]">
                      Test whether an event symbol from alphabet Σ is valid from state{" "}
                      <strong>{selectedStateMeta.name} ({selectedStateMeta.alias})</strong>.
                    </p>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-bold text-[#A9BAC2]">
                          Select Input Symbol (σ ∈ Σ)
                        </label>
                        <span className="text-[10px] font-mono text-[#8CB8B5]">
                          {outgoingTransitions.length} valid / {DFA_EVENT_SYMBOLS.length - outgoingTransitions.length} rejected
                        </span>
                      </div>

                      {/* Dropdown with clear VALID vs REJECTED annotations */}
                      <select
                        value={simulatedSymbol}
                        onChange={(e) => setSimulatedSymbol(e.target.value as DFAEvent)}
                        className="w-full rounded border border-[#3A515B] bg-[#182630] px-2.5 py-1.5 text-xs text-[#E8EDEF] outline-none focus:border-[#8CB8B5]"
                      >
                        {DFA_EVENT_SYMBOLS.map((sym) => {
                          const target = DFA_TRANSITIONS.find(
                            (t) => t.from === selectedStateId && t.event === sym,
                          );
                          return (
                            <option key={sym} value={sym}>
                              {sym} {target ? `— ✓ VALID (→ ${target.to})` : "— ✗ REJECTED (Undefined)"}
                            </option>
                          );
                        })}
                      </select>

                      {/* Quick Interactive Symbol Chips for testing */}
                      <div className="mt-2 space-y-1">
                        <span className="text-[9.5px] uppercase font-semibold text-[#A9BAC2] block">
                          Quick Test Symbols from Σ:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {DFA_EVENT_SYMBOLS.map((sym) => {
                            const target = DFA_TRANSITIONS.find(
                              (t) => t.from === selectedStateId && t.event === sym,
                            );
                            const isSelected = simulatedSymbol === sym;
                            const isValid = !!target;
                            return (
                              <button
                                key={sym}
                                type="button"
                                onClick={() => setSimulatedSymbol(sym)}
                                className={`px-2 py-0.5 text-[10px] rounded font-mono font-semibold transition flex items-center gap-1 border cursor-pointer ${
                                  isSelected
                                    ? isValid
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/30"
                                      : "bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-xs ring-1 ring-rose-500/30"
                                    : isValid
                                    ? "bg-[#182630] text-[#8CB8B5] border-[#3A515B] hover:border-[#8CB8B5] hover:bg-[#243944]"
                                    : "bg-[#182630]/60 text-[#A9BAC2]/60 border-[#3A515B]/40 hover:border-[#3A515B] hover:text-[#A9BAC2]"
                                }`}
                                title={
                                  isValid
                                    ? `Valid transition: advances to ${target.to} (${DFA_STATES[target.to].alias})`
                                    : `Undefined symbol from state ${selectedStateId} (triggers InvalidTransitionError)`
                                }
                              >
                                <span className={isValid ? "text-emerald-400 font-bold" : "text-rose-400"}>
                                  {isValid ? "✓" : "✗"}
                                </span>
                                <span>{sym}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Result Explanation */}
                    <div className="rounded bg-[#182630] border border-[#3A515B] p-2.5">
                      {simulatedOutcome ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                            <CheckCircle2 size={13} />
                            <span>Defined Transition: VALID</span>
                          </div>
                          <p className="text-[11px] text-[#E8EDEF]">
                            δ({selectedStateMeta.alias}, {simulatedSymbol}) ={" "}
                            <strong>{simulatedOutcome.to} ({DFA_STATES[simulatedOutcome.to].alias})</strong>
                          </p>
                          <p className="text-[10px] text-[#A9BAC2]">
                            The transition exists in the DFA specification and will be executed deterministically by the runtime.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                            <CircleAlert size={13} />
                            <span>Undefined Transition: REJECTED</span>
                          </div>
                          <p className="text-[11px] text-[#C86D6D]">
                            δ({selectedStateMeta.alias}, {simulatedSymbol}) is <em>undefined</em>.
                          </p>
                          <p className="text-[10px] text-[#A9BAC2] leading-relaxed">
                            Because the DFA transition function is partial, receiving <code>{simulatedSymbol}</code> in state <code>{selectedStateMeta.name}</code> triggers an <code>InvalidTransitionError</code> in the backend runtime. The machine does <strong>not</strong> transition to any implicit crash state; the operation is strictly rejected.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 3: FORMAL DFA DEFINITION (M = (Q, Σ, δ, q0, F))           */}
              {/* ============================================================ */}
              {activeDrawerTab === "definition" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-[#3A515B] bg-[#2D424A] p-3 space-y-2">
                    <h4 className="font-bold text-xs text-[#8CB8B5] flex items-center gap-1.5">
                      <BookOpen size={13} />
                      Formal 5-Tuple Definition
                    </h4>
                    <div className="rounded bg-[#182630] border border-[#3A515B] p-2 font-mono text-center text-xs text-[#8CB8B5] font-bold">
                      M = (Q, Σ, δ, q0, F)
                    </div>
                    <p className="text-[11px] text-[#A9BAC2] leading-relaxed">
                      FlowScript Studio models its workflow execution engine using a deterministic finite automaton with the following mathematical components:
                    </p>
                  </div>

                  {/* Components Breakdown */}
                  <div className="space-y-2">
                    {/* Q */}
                    <div className="rounded bg-[#2D424A] border border-[#3A515B] p-2.5">
                      <span className="font-bold text-[#8CB8B5] block mb-0.5">
                        Q: Finite Set of States (|Q| = 6)
                      </span>
                      <p className="font-mono text-[10.5px] text-[#E8EDEF]">
                        Q = &#123; IDLE (q0), RUNNING (q1), SUCCESS (q2), RETRYING (q3), FAILED (q4), DONE (q5) &#125;
                      </p>
                    </div>

                    {/* Sigma */}
                    <div className="rounded bg-[#2D424A] border border-[#3A515B] p-2.5">
                      <span className="font-bold text-[#8CB8B5] block mb-0.5">
                        Σ: Input Alphabet (|Σ| = 7)
                      </span>
                      <p className="font-mono text-[10.5px] text-[#E8EDEF]">
                        Σ = &#123; START, WORKFLOW_SUCCESS, TASK_FAILURE_RETRYABLE, TASK_FAILURE_FINAL, RETRY, FINALIZE, RESET &#125;
                      </p>
                    </div>

                    {/* Delta */}
                    <div className="rounded bg-[#2D424A] border border-[#3A515B] p-2.5">
                      <span className="font-bold text-[#8CB8B5] block mb-0.5">
                        δ: State Transition Function
                      </span>
                      <p className="text-[11px] text-[#A9BAC2]">
                        δ: Q × Σ → Q is a <em>partial</em> mapping defined explicitly by 8 production rules in <code>backend/app/runtime/dfa.py</code>.
                      </p>
                    </div>

                    {/* q0 */}
                    <div className="rounded bg-[#2D424A] border border-[#3A515B] p-2.5">
                      <span className="font-bold text-[#8CB8B5] block mb-0.5">
                        q0: Initial State
                      </span>
                      <p className="font-mono text-[10.5px] text-[#E8EDEF]">
                        q0 = IDLE ∈ Q
                      </p>
                    </div>

                    {/* F */}
                    <div className="rounded bg-[#2D424A] border border-[#3A515B] p-2.5">
                      <span className="font-bold text-[#A78BFA] block mb-0.5">
                        F: Set of Accepting States (F ⊆ Q)
                      </span>
                      <p className="font-mono text-[10.5px] text-[#E8EDEF]">
                        F = &#123; DONE &#125;
                      </p>
                      <p className="text-[10px] text-[#A9BAC2] mt-1">
                        Designated with double-circle notation in the state diagram. An execution trace is formally accepted iff the automaton terminates in F.
                      </p>
                    </div>
                  </div>

                  {/* Academic Automata Note */}
                  <div className="rounded-lg border border-[#3A515B] bg-[#1E2D38] p-3 text-[10.5px] text-[#A9BAC2] space-y-1.5 leading-relaxed">
                    <strong className="text-[#8CB8B5] block text-xs">
                      Language Recognizer vs. Execution State Machine
                    </strong>
                    <p>
                      In formal language theory, a DFA accepts words w ∈ Σ*. In software engineering, this automaton acts as a formal reactive state machine governing task lifecycles.
                    </p>
                    <p>
                      Undefined events are rejected with an exception rather than transitioning to an error trap. State <strong>FAILED (q4)</strong> is a sink state reached exclusively when a fatal task failure is encountered.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Drawer Footer */}
            <div className="border-t border-[#3A515B] bg-[#1E2D38] px-3 py-2 text-[10px] text-[#A9BAC2] flex items-center justify-between">
              <span>Automata Theory Studio</span>
              <span className="font-mono text-[#8CB8B5]">
                {explorerMode === "replay" ? `Replay: ${activeState}` : `Sandbox: ${sandboxState}`}
              </span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
