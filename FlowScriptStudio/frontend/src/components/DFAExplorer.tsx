import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  MarkerType,
  Position,
  Handle,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GitBranch,
  CircleAlert,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
} from "lucide-react";

const STATES = [
  "IDLE",
  "RUNNING",
  "SUCCESS",
  "RETRYING",
  "FAILED",
  "DONE",
] as const;

type DFAState = (typeof STATES)[number];

type Transition = {
  from: DFAState;
  event: string;
  to: DFAState;
};

const TRANSITIONS: Transition[] = [
  { from: "IDLE", event: "START", to: "RUNNING" },
  { from: "RUNNING", event: "WORKFLOW_SUCCESS", to: "SUCCESS" },
  { from: "RUNNING", event: "TASK_FAILURE_RETRYABLE", to: "RETRYING" },
  { from: "RUNNING", event: "TASK_FAILURE_FINAL", to: "FAILED" },
  { from: "RETRYING", event: "RETRY", to: "RUNNING" },
  { from: "SUCCESS", event: "FINALIZE", to: "DONE" },
  { from: "FAILED", event: "RESET", to: "IDLE" },
  { from: "DONE", event: "RESET", to: "IDLE" },
];

const POSITIONS: Record<DFAState, { x: number; y: number }> = {
  IDLE: { x: 40, y: 180 },
  RUNNING: { x: 280, y: 180 },
  RETRYING: { x: 520, y: 40 },
  SUCCESS: { x: 520, y: 180 },
  FAILED: { x: 520, y: 320 },
  DONE: { x: 760, y: 180 },
};

function stateColor(state: DFAState) {
  switch (state) {
    case "IDLE":
      return "#94a3b8";
    case "RUNNING":
      return "#60a5fa";
    case "RETRYING":
      return "#fbbf24";
    case "SUCCESS":
      return "#34d399";
    case "FAILED":
      return "#fb7185";
    case "DONE":
      return "#a78bfa";
  }
}

function StateNode({
  data,
}: {
  data: { label: DFAState; active: boolean; visited: boolean };
}) {
  const color = stateColor(data.label);

  return (
    <div
      className="min-w-[145px] rounded-xl border bg-[#111827] px-4 py-3 shadow-lg"
      style={{
        borderColor: data.active ? "#ffffff" : color,
        boxShadow: data.active
          ? `0 0 0 3px ${color}50, 0 0 22px ${color}35`
          : data.visited
            ? `0 0 12px ${color}20`
            : "none",
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-semibold text-slate-100">
          {data.label}
        </span>
      </div>
      <p className="mt-2 text-[10px] text-slate-400">
        {data.active ? "CURRENT STATE" : data.visited ? "VISITED" : "STATE"}
      </p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { dfaState: StateNode };

type DFAExplorerProps = {
  currentState?: string;
  history?: string[];
};

export default function DFAExplorer({
  currentState = "IDLE",
  history = ["IDLE"],
}: DFAExplorerProps) {
  const [selectedState, setSelectedState] = useState<DFAState>("IDLE");
  const [eventInput, setEventInput] = useState("");

  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const replayHistory = useMemo(
    () => (history.length > 0 ? history : ["IDLE"]),
    [history],
  );

  const replayState = (STATES as readonly string[]).includes(
    replayHistory[replayIndex] ?? "",
  )
    ? (replayHistory[replayIndex] as DFAState)
    : "IDLE";

  const previousState =
    replayIndex > 0 ? replayHistory[replayIndex - 1] : null;

  const replayEvent =
    replayIndex > 0
      ? TRANSITIONS.find(
          (transition) =>
            transition.from === previousState &&
            transition.to === replayState,
        )?.event ?? "Unknown transition"
      : "Initial state";

  useEffect(() => {
    setReplayIndex(0);
    setIsPlaying(false);
  }, [history]);

  useEffect(() => {
    if (!isPlaying) return;

    if (replayIndex >= replayHistory.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setReplayIndex((index) =>
        Math.min(index + 1, replayHistory.length - 1),
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isPlaying, replayIndex, replayHistory.length]);

  const validState = (STATES as readonly string[]).includes(currentState)
    ? (currentState as DFAState)
    : "IDLE";

  const nodes = useMemo<Node[]>(
    () =>
      STATES.map((state) => ({
        id: state,
        type: "dfaState",
        position: POSITIONS[state],
        data: {
          label: state,
          active: state === replayState,
          visited: replayHistory
            .slice(0, replayIndex + 1)
            .includes(state),
        },
        draggable: false,
      })),
    [replayState, replayIndex, replayHistory],
  );

  const edges = useMemo<Edge[]>(
    () =>
      TRANSITIONS.map((transition, index) => ({
        id: `transition-${index}`,
        source: transition.from,
        target: transition.to,
        label: transition.event,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        labelStyle: { fill: "#cbd5e1", fontSize: 10 },
        labelBgStyle: { fill: "#0b111d", fillOpacity: 0.95 },
        style: { stroke: "#64748b", strokeWidth: 1.5 },
      })),
    [],
  );

  const outgoing = TRANSITIONS.filter(
    (transition) => transition.from === selectedState,
  );

  const preview = TRANSITIONS.find(
    (transition) =>
      transition.from === selectedState && transition.event === eventInput,
  );

  const invalidExplanation = eventInput.trim()
    ? preview
      ? null
      : `Event "${eventInput}" is not valid in state ${selectedState}. Valid events: ${
          outgoing.map((transition) => transition.event).join(", ") || "none"
        }.`
    : null;

  return (
    <div className="space-y-4 text-slate-200">
      <div className="rounded-xl border border-white/[0.08] bg-[#0e1421] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">DFA Explorer</h2>
            <p className="mt-1 text-xs text-slate-400">
              Deterministic finite automaton for workflow execution
            </p>
          </div>
          <div className="rounded-lg border border-white/10 px-3 py-2 text-xs">
            Runtime state:{" "}
            <span
              className="font-semibold"
              style={{ color: stateColor(validState) }}
            >
              {validState}
            </span>
          </div>
        </div>

        <div className="h-[430px] overflow-hidden rounded-lg border border-white/[0.06] bg-[#0b111d]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) =>
              setSelectedState(node.id as DFAState)
            }
            fitView
            fitViewOptions={{ padding: 0.15 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#334155" gap={24} size={1} />
            <Controls />
          </ReactFlow>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Select any state to inspect its valid outgoing transitions. The
          highlighted state reflects the latest runtime result.
        </p>
      </div>

      <section className="rounded-xl border border-white/[0.08] bg-[#0e1421] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Execution replay</h3>
            <p className="mt-1 text-xs text-slate-400">
              Step {replayIndex + 1} of {replayHistory.length}
            </p>
          </div>

          <span
            className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold"
            style={{ color: stateColor(replayState) }}
          >
            {replayState}
          </span>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-violet-400 transition-all duration-300"
            style={{
              width: `${
                replayHistory.length <= 1
                  ? 100
                  : (replayIndex / (replayHistory.length - 1)) * 100
              }%`,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setIsPlaying(false);
              setReplayIndex(0);
            }}
            className="rounded-lg border border-white/10 p-2 hover:bg-white/[0.06]"
            title="Reset replay"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setReplayIndex((index) => Math.max(0, index - 1));
            }}
            disabled={replayIndex === 0}
            className="rounded-lg border border-white/10 p-2 hover:bg-white/[0.06] disabled:opacity-30"
            title="Previous step"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={() => {
              if (replayIndex >= replayHistory.length - 1) {
                setReplayIndex(0);
              }
              setIsPlaying((playing) => !playing);
            }}
            disabled={replayHistory.length <= 1}
            className="flex items-center gap-2 rounded-lg border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-xs text-violet-200 disabled:opacity-30"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setReplayIndex((index) =>
                Math.min(index + 1, replayHistory.length - 1),
              );
            }}
            disabled={replayIndex >= replayHistory.length - 1}
            className="rounded-lg border border-white/10 p-2 hover:bg-white/[0.06] disabled:opacity-30"
            title="Next step"
          >
            <SkipForward size={16} />
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Transition event
          </p>

          <p className="mt-1 font-mono text-sm text-sky-300">{replayEvent}</p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            {replayIndex === 0
              ? "The automaton begins in its initial IDLE state."
              : `The automaton moved from ${previousState} to ${replayState} in response to ${replayEvent}.`}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {replayHistory.map((state, index) => (
            <button
              key={`${state}-${index}`}
              onClick={() => {
                setIsPlaying(false);
                setReplayIndex(index);
              }}
              className={`rounded-md border px-2 py-1 text-[10px] ${
                index === replayIndex
                  ? "border-violet-400/50 bg-violet-400/10"
                  : "border-white/10"
              }`}
              style={{
                color: stateColor(
                  (STATES as readonly string[]).includes(state)
                    ? (state as DFAState)
                    : "IDLE",
                ),
              }}
            >
              {index + 1}. {state}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-white/[0.08] bg-[#0e1421] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <GitBranch size={16} className="text-violet-300" />
            Transition table
          </h3>

          <div className="max-h-[300px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0e1421] text-slate-400">
                <tr>
                  <th className="px-2 py-2">From</th>
                  <th className="px-2 py-2">Event</th>
                  <th className="px-2 py-2">To</th>
                </tr>
              </thead>
              <tbody>
                {TRANSITIONS.map((transition) => (
                  <tr
                    key={`${transition.from}-${transition.event}`}
                    className={`border-t border-white/[0.06] ${
                      transition.from === selectedState
                        ? "bg-violet-400/[0.08]"
                        : ""
                    }`}
                  >
                    <td className="px-2 py-2">{transition.from}</td>
                    <td className="px-2 py-2 font-mono text-sky-300">
                      {transition.event}
                    </td>
                    <td className="px-2 py-2">{transition.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-[#0e1421] p-4">
          <h3 className="text-sm font-semibold">
            Explore state: {selectedState}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {outgoing.length} valid outgoing transition(s)
          </p>

          <div className="mt-3 space-y-2">
            {outgoing.length ? (
              outgoing.map((transition) => (
                <div
                  key={transition.event}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 text-xs"
                >
                  <span className="font-mono text-sky-300">
                    {transition.event}
                  </span>
                  <span className="mx-2 text-slate-500">→</span>
                  <span style={{ color: stateColor(transition.to) }}>
                    {transition.to}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">
                This state has no outgoing transitions defined.
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-white/[0.08] pt-4">
            <label className="mb-2 block text-xs text-slate-400">
              Check an event (exploration only)
            </label>
            <input
              value={eventInput}
              onChange={(event) => setEventInput(event.target.value.trimStart())}
              placeholder="e.g. START"
              className="w-full rounded-lg border border-white/10 bg-[#0b111d] p-2 text-sm outline-none focus:border-violet-400/50"
            />

            {eventInput.trim() && (
              <div className="mt-3 rounded-lg bg-white/[0.03] p-3 text-xs">
                {preview ? (
                  <p className="text-emerald-300">
                    Valid: {selectedState} → {preview.to}
                  </p>
                ) : (
                  <p className="flex gap-2 text-rose-300">
                    <CircleAlert size={15} className="shrink-0" />
                    {invalidExplanation}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
