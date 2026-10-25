import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  Handle,
  MarkerType,
  Position,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  FileCode2,
  FileText,
  GitBranch,
  Layers,
  LoaderCircle,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Zap,
} from "lucide-react";

type AstTask = {
  type: "Task";
  name: string;
  line: number;
};

type AstIf = {
  type: "If";
  condition: string;
  then_body: AstStatement[];
  else_body: AstStatement[];
  line: number;
};

type AstStatement = AstTask | AstIf;

type WorkflowAst = {
  type: "Workflow";
  name: string;
  line: number;
  body: AstStatement[];
};

type TaskResult = {
  task: string;
  name?: string;
  status: string;
  output: string;
  line?: number;
};

export type WorkflowGraphProps = {
  source: string;
  results?: TaskResult[];
  executionStatus?: string;
  onSourceChange: (source: string) => void;
  onRunWorkflow?: () => void;
  loading?: boolean;
  compileErrors?: { message?: string; line?: number; column?: number; stage?: string }[];
  onSwitchToEditor?: () => void;
};

type TaskNodeData = {
  label: string;
  line: number;
  status: string;
  output?: string;
  stepIndex?: number;
};

function getTaskIcon(taskName: string) {
  switch (taskName.toLowerCase()) {
    case "search":
      return <Search size={16} className="text-sky-300" />;
    case "analyze":
      return <Activity size={16} className="text-violet-300" />;
    case "summarize":
      return <FileText size={16} className="text-amber-300" />;
    case "publish":
      return <Send size={16} className="text-emerald-300" />;
    case "retry":
      return <RotateCcw size={16} className="text-orange-300" />;
    default:
      return <Layers size={16} className="text-slate-300" />;
  }
}

function WorkflowNode({ data }: { data: TaskNodeData }) {
  const completed = data.status === "SUCCESS";
  const failed = data.status === "FAILED";
  const running = data.status === "RUNNING";

  return (
    <div
      className={`min-w-[220px] max-w-[240px] rounded-xl border transition-all duration-200 shadow-xl overflow-hidden ${
        completed
          ? "border-emerald-400/80 bg-gradient-to-b from-[#0f2c22] to-[#0b1320] shadow-emerald-950/40"
          : failed
          ? "border-rose-400/80 bg-gradient-to-b from-[#2d1217] to-[#0b1320] shadow-rose-950/40"
          : running
          ? "border-sky-400/80 bg-gradient-to-b from-[#0f2333] to-[#0b1320] shadow-sky-950/40 animate-pulse"
          : "border-slate-700/80 bg-[#0e1421] hover:border-slate-500 shadow-black/40"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-slate-400" />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2 bg-white/[0.02]">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400">
            {data.stepIndex ? `TASK ${String(data.stepIndex).padStart(2, "0")}` : "TASK"}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-[10px] text-slate-500">L{data.line}</span>
        </div>
        <span
          className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            completed
              ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
              : failed
              ? "bg-rose-400/15 text-rose-300 border border-rose-400/30"
              : running
              ? "bg-sky-400/15 text-sky-300 border border-sky-400/30"
              : "bg-slate-800 text-slate-400 border border-slate-700"
          }`}
        >
          {completed && <CheckCircle2 size={11} className="inline shrink-0" />}
          {failed && <CircleAlert size={11} className="inline shrink-0" />}
          {running && <LoaderCircle size={11} className="inline shrink-0 animate-spin" />}
          {!completed && !failed && !running && <CircleDot size={10} className="inline shrink-0 text-slate-500" />}
          {completed ? "SUCCESS" : failed ? "FAILED" : running ? "RUNNING" : "PENDING"}
        </span>
      </div>

      {/* Main Info */}
      <div className="flex items-center gap-3 p-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            completed
              ? "bg-emerald-400/15 text-emerald-300"
              : failed
              ? "bg-rose-400/15 text-rose-300"
              : running
              ? "bg-sky-400/15 text-sky-300"
              : "bg-white/[0.06] text-slate-300"
          }`}
        >
          {getTaskIcon(data.label)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-100">
            {data.label}
          </p>
          <p className="text-[11px] text-slate-400">
            Automated Task
          </p>
        </div>
      </div>

      {/* Output / Status Preview */}
      {data.output ? (
        <div className="border-t border-white/[0.06] bg-black/25 px-3 py-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Output</p>
          <p className="truncate text-xs font-mono text-emerald-300/90">
            {data.output}
          </p>
        </div>
      ) : (
        <div className="border-t border-white/[0.04] px-3 py-1.5 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Not executed yet</span>
          <span className="text-slate-600">●</span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-slate-400" />
    </div>
  );
}

function ConditionNode({
  data,
}: {
  data: { label: string; line: number };
}) {
  return (
    <div className="min-w-[240px] max-w-[260px] rounded-xl border border-amber-400/80 bg-gradient-to-b from-[#2a1d0b] to-[#0f1422] p-3 shadow-xl shadow-amber-950/30">
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-amber-400" />

      <div className="flex items-center justify-between border-b border-amber-400/20 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full">
            <GitBranch size={11} />
            CONDITION
          </span>
          <span className="text-[10px] text-amber-400/70">Line {data.line}</span>
        </div>
      </div>

      <div className="my-1.5">
        <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-0.5">Evaluation Expression</p>
        <p className="font-mono text-sm font-bold text-amber-200 break-words bg-black/30 p-2 rounded-lg border border-amber-400/20">
          {data.label}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between pt-1 border-t border-white/[0.06] text-[10px] font-semibold">
        <div className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>TRUE branch</span>
        </div>
        <div className="flex items-center gap-1 text-orange-400">
          <span>FALSE branch</span>
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
        </div>
      </div>

      <Handle
        id="true"
        type="source"
        position={Position.Bottom}
        style={{ left: "25%", background: "#10b981", width: 10, height: 10 }}
      />
      <Handle
        id="false"
        type="source"
        position={Position.Bottom}
        style={{ left: "75%", background: "#f97316", width: 10, height: 10 }}
      />
    </div>
  );
}

const nodeTypes = {
  task: WorkflowNode,
  condition: ConditionNode,
};

function parseWorkflow(source: string): WorkflowAst | null {
  const lines = source.split(/\r?\n/);
  let workflowName = "Workflow";
  let workflowLine = 1;
  const root: AstStatement[] = [];
  const stack: {
    node: AstIf;
    target: AstStatement[];
  }[] = [];

  let currentBody = root;
  let foundWorkflow = false;

  for (let index = 0; index < lines.length; index++) {
    const text = lines[index].trim();
    if (!text || text.startsWith("#")) continue;

    const workflowMatch = text.match(/^WORKFLOW\s+(\w+)/i);
    if (workflowMatch) {
      workflowName = workflowMatch[1];
      workflowLine = index + 1;
      foundWorkflow = true;
      continue;
    }

    const taskMatch = text.match(/^TASK\s+(\w+)/i);
    if (taskMatch) {
      currentBody.push({
        type: "Task",
        name: taskMatch[1],
        line: index + 1,
      });
      continue;
    }

    const ifMatch = text.match(/^IF\s+(.+)/i);
    if (ifMatch) {
      const node: AstIf = {
        type: "If",
        condition: ifMatch[1],
        then_body: [],
        else_body: [],
        line: index + 1,
      };

      currentBody.push(node);
      stack.push({ node, target: currentBody });
      currentBody = node.then_body;
      continue;
    }

    if (/^ELSE$/i.test(text)) {
      const frame = stack[stack.length - 1];
      if (frame) currentBody = frame.node.else_body;
      continue;
    }

    if (/^END$/i.test(text) && stack.length > 0) {
      const frame = stack.pop()!;
      currentBody = frame.target;
    }
  }

  if (!foundWorkflow) return null;

  return {
    type: "Workflow",
    name: workflowName,
    line: workflowLine,
    body: root,
  };
}

function countStats(statements: AstStatement[]): { tasks: number; conditions: number } {
  let tasks = 0;
  let conditions = 0;
  for (const stmt of statements) {
    if (stmt.type === "Task") {
      tasks++;
    } else if (stmt.type === "If") {
      conditions++;
      const sub = countStats([...stmt.then_body, ...stmt.else_body]);
      tasks += sub.tasks;
      conditions += sub.conditions;
    }
  }
  return { tasks, conditions };
}

function findIfNode(statements: AstStatement[], line: number): AstIf | null {
  for (const stmt of statements) {
    if (stmt.type === "If") {
      if (stmt.line === line) return stmt;
      const found = findIfNode([...stmt.then_body, ...stmt.else_body], line);
      if (found) return found;
    }
  }
  return null;
}

export default function WorkflowGraph({
  source,
  results = [],
  executionStatus,
  onSourceChange,
  onRunWorkflow,
  loading = false,
  compileErrors = [],
  onSwitchToEditor,
}: WorkflowGraphProps) {
  const [selectedNode, setSelectedNode] = useState<{
    type: "task" | "condition";
    name: string;
    line: number;
  } | null>(null);

  const [selectedBranch, setSelectedBranch] = useState<"true" | "false">("true");
  const [moveDestination, setMoveDestination] = useState<"main" | "true" | "false">("true");
  const [targetConditionLine, setTargetConditionLine] = useState("");

  const ast = useMemo(() => parseWorkflow(source), [source]);
  const stats = useMemo(() => (ast ? countStats(ast.body) : { tasks: 0, conditions: 0 }), [ast]);

  const graph = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const resultMap = new Map(
      results.map((item) => [
        `${item.line}:${item.task ?? item.name}`,
        item,
      ]),
    );

    if (!ast) return { nodes, edges };

    const addEdge = (
      from: string,
      to: string,
      label?: string,
      color = "#64748b",
      sourceHandle?: string,
      isAnimated = false,
    ) => {
      edges.push({
        id: `${from}-${to}-${label ?? "next"}`,
        source: from,
        target: to,
        sourceHandle,
        label,
        type: "smoothstep",
        animated: isAnimated || color === "#10b981",
        markerEnd: { type: MarkerType.ArrowClosed, color },
        style: { stroke: color, strokeWidth: color === "#10b981" ? 2.5 : 1.8 },
        labelStyle: { fill: color, fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: "#0e1421", fillOpacity: 0.95 },
      });
    };

    nodes.push({
      id: "start",
      type: "input",
      position: { x: 300, y: 20 },
      data: { label: `${ast.name} · START` },
      style: {
        background: "#0f2c22",
        color: "#6ee7b7",
        border: "1.5px solid #10b981",
        borderRadius: 999,
        padding: "10px 16px",
        width: 190,
        fontWeight: 600,
        textAlign: "center",
        boxShadow: "0 0 15px rgba(16,185,129,0.2)",
      },
    });

    let nextId = 0;
    let taskCounter = 0;

    function buildSequence(
      statements: AstStatement[],
      incoming: string[],
      depth: number,
    ): string[] {
      let frontier = incoming;

      statements.forEach((statement) => {
        const id = `node-${nextId++}`;
        const y = 130 + nextId * 135;
        const x = 300 + depth * 280;

        if (statement.type === "Task") {
          taskCounter++;
          const result = resultMap.get(
            `${statement.line}:${statement.name}`,
          );

          nodes.push({
            id,
            type: "task",
            position: { x, y },
            data: {
              label: statement.name,
              line: statement.line,
              status: result?.status ?? "PENDING",
              output: result?.output,
              stepIndex: taskCounter,
            },
          });

          const isSuccess = result?.status === "SUCCESS";
          frontier.forEach((previous) =>
            addEdge(
              previous,
              id,
              undefined,
              isSuccess ? "#10b981" : "#64748b",
              undefined,
              isSuccess,
            ),
          );

          frontier = [id];
        } else {
          nodes.push({
            id,
            type: "condition",
            position: { x, y },
            data: {
              label: statement.condition,
              line: statement.line,
            },
          });

          frontier.forEach((previous) => addEdge(previous, id));

          const trueEnds = buildSequence(
            statement.then_body,
            [id],
            depth - 1,
          );

          const falseEnds = buildSequence(
            statement.else_body,
            [id],
            depth + 1,
          );

          edges.forEach((edge) => {
            if (edge.source === id && trueEnds.includes(edge.target)) {
              edge.sourceHandle = "true";
              edge.label = "TRUE";
              edge.style = { stroke: "#10b981", strokeWidth: 2.2 };
              edge.labelStyle = { fill: "#10b981", fontSize: 11, fontWeight: 700 };
            } else if (edge.source === id && falseEnds.includes(edge.target)) {
              edge.sourceHandle = "false";
              edge.label = "FALSE";
              edge.style = { stroke: "#fb923c", strokeWidth: 2.2 };
              edge.labelStyle = { fill: "#fb923c", fontSize: 11, fontWeight: 700 };
            }
          });

          frontier = [...trueEnds, ...falseEnds];
        }
      });

      return frontier;
    }

    const endNodes = buildSequence(ast.body, ["start"], 0);

    const finalY = Math.max(520, 140 + (nextId + 1) * 130);

    nodes.push({
      id: "end",
      type: "output",
      position: { x: 300, y: finalY },
      data: {
        label:
          executionStatus === "SUCCESS"
            ? "COMPLETED"
            : executionStatus === "FAILED"
            ? "FAILED"
            : "END",
      },
      style: {
        background:
          executionStatus === "FAILED" ? "#2d1217" : "#0f2c22",
        color: executionStatus === "FAILED" ? "#fda4af" : "#6ee7b7",
        border:
          executionStatus === "FAILED"
            ? "1.5px solid #f43f5e"
            : "1.5px solid #10b981",
        borderRadius: 999,
        padding: "10px 16px",
        width: 170,
        fontWeight: 600,
        textAlign: "center",
        boxShadow:
          executionStatus === "FAILED"
            ? "0 0 15px rgba(244,63,94,0.2)"
            : "0 0 15px rgba(16,185,129,0.2)",
      },
    });

    endNodes.forEach((id) =>
      addEdge(
        id,
        "end",
        undefined,
        executionStatus === "SUCCESS" ? "#10b981" : "#64748b",
        undefined,
        executionStatus === "SUCCESS",
      ),
    );

    return { nodes, edges };
  }, [ast, results, executionStatus]);

  function addTask() {
    const lines = source.trimEnd().split(/\r?\n/);
    const endIndex = lines.findLastIndex(
      (line) => line.trim().toUpperCase() === "END",
    );

    if (endIndex < 0) {
      alert("Add a valid WORKFLOW declaration and END first.");
      return;
    }

    lines.splice(endIndex, 0, "TASK Search");
    onSourceChange(lines.join("\n"));

    setSelectedNode({
      type: "task",
      name: "Search",
      line: endIndex + 1,
    });
  }

  function updateSelectedTask(name: string) {
    if (!selectedNode || selectedNode.type !== "task") return;

    const lines = source.split(/\r?\n/);
    const target = lines[selectedNode.line - 1];

    if (!target || !/^\s*TASK\s+\w+\s*$/i.test(target)) return;

    lines[selectedNode.line - 1] = target.replace(
      /^(\s*TASK\s+)\w+(\s*)$/i,
      `$1${name}$2`,
    );

    onSourceChange(lines.join("\n"));
    setSelectedNode({ type: "task", name, line: selectedNode.line });
  }

  function deleteSelectedTask() {
    if (!selectedNode || selectedNode.type !== "task") return;

    const lines = source.split(/\r?\n/);
    const target = lines[selectedNode.line - 1];

    if (!target || !/^\s*TASK\s+\w+\s*$/i.test(target)) return;

    lines.splice(selectedNode.line - 1, 1);
    onSourceChange(lines.join("\n"));
    setSelectedNode(null);
  }

  function updateSelectedCondition(condition: string) {
    if (!selectedNode || selectedNode.type !== "condition") return;

    const lines = source.split(/\r?\n/);
    const index = selectedNode.line - 1;

    if (index < 0 || index >= lines.length) return;

    const indentation = lines[index].match(/^\s*/)?.[0] ?? "";
    lines[index] = `${indentation}IF ${condition}`;

    onSourceChange(lines.join("\n"));
    setSelectedNode({
      ...selectedNode,
      name: condition,
    });
  }

  function addTaskToBranch() {
    if (!selectedNode || selectedNode.type !== "condition") {
      alert("Select an IF condition node first.");
      return;
    }

    const lines = source.split(/\r?\n/);
    const ifIndex = selectedNode.line - 1;

    if (ifIndex < 0 || !/^\s*IF\s+.+/i.test(lines[ifIndex] ?? "")) {
      alert("Could not locate the selected IF statement.");
      return;
    }

    let depth = 0;
    let elseIndex = -1;
    let endIndex = -1;

    for (let i = ifIndex + 1; i < lines.length; i++) {
      const text = lines[i].trim();

      if (/^IF\s+.+/i.test(text)) {
        depth++;
      } else if (/^END$/i.test(text)) {
        if (depth === 0) {
          endIndex = i;
          break;
        }
        depth--;
      } else if (
        /^ELSE$/i.test(text) &&
        depth === 0 &&
        elseIndex === -1
      ) {
        elseIndex = i;
      }
    }

    if (endIndex === -1) {
      alert("Could not find the matching END for this IF.");
      return;
    }

    const ifIndent = lines[ifIndex].match(/^\s*/)?.[0] ?? "";
    const taskIndent = `${ifIndent}    `;
    let insertIndex: number;

    if (selectedBranch === "true") {
      insertIndex = elseIndex !== -1 ? elseIndex : endIndex;
    } else {
      if (elseIndex === -1) {
        lines.splice(endIndex, 0, `${ifIndent}ELSE`);
        elseIndex = endIndex;
        endIndex++;
      }
      insertIndex = endIndex;
    }

    lines.splice(insertIndex, 0, `${taskIndent}TASK Search`);
    onSourceChange(lines.join("\n"));

    setSelectedNode({
      type: "task",
      name: "Search",
      line: insertIndex + 1,
    });
  }

  function moveSelectedTask() {
    if (!selectedNode || selectedNode.type !== "task") {
      alert("Select a task node first.");
      return;
    }

    const lines = source.split(/\r?\n/);
    const sourceIndex = selectedNode.line - 1;
    const taskLine = lines[sourceIndex];

    if (!taskLine || !/^\s*TASK\s+\w+\s*$/i.test(taskLine)) {
      alert("Could not locate the selected task in the source.");
      return;
    }

    const taskName = taskLine.trim().match(/^TASK\s+(\w+)/i)?.[1];
    if (!taskName) return;

    lines.splice(sourceIndex, 1);

    let insertIndex = -1;
    let indentation = "";

    if (moveDestination === "main") {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().toUpperCase() === "END") {
          insertIndex = i;
          break;
        }
      }

      if (insertIndex < 0) {
        alert("Could not find the workflow's END.");
        return;
      }
    } else {
      let targetLine = Number(targetConditionLine);

      if (!targetLine) {
        alert("Select a destination IF condition.");
        return;
      }

      if (sourceIndex < targetLine - 1) {
        targetLine--;
      }

      const ifIndex = targetLine - 1;

      if (!/^\s*IF\s+.+/i.test(lines[ifIndex] ?? "")) {
        alert("Could not locate the destination IF condition.");
        return;
      }

      let depth = 0;
      let elseIndex = -1;
      let endIndex = -1;

      for (let i = ifIndex + 1; i < lines.length; i++) {
        const text = lines[i].trim();

        if (/^IF\s+.+/i.test(text)) {
          depth++;
        } else if (/^END$/i.test(text)) {
          if (depth === 0) {
            endIndex = i;
            break;
          }
          depth--;
        } else if (
          /^ELSE$/i.test(text) &&
          depth === 0 &&
          elseIndex === -1
        ) {
          elseIndex = i;
        }
      }

      if (endIndex < 0) {
        alert("Could not find the matching END for the destination IF.");
        return;
      }

      const ifIndent = lines[ifIndex].match(/^\s*/)?.[0] ?? "";
      indentation = `${ifIndent}    `;

      if (moveDestination === "true") {
        insertIndex = elseIndex >= 0 ? elseIndex : endIndex;
      } else {
        if (elseIndex < 0) {
          lines.splice(endIndex, 0, `${ifIndent}ELSE`);
          elseIndex = endIndex;
          endIndex++;
        }
        insertIndex = endIndex;
      }
    }

    if (insertIndex < 0) {
      alert("Could not determine the destination.");
      return;
    }

    const movedLine = `${indentation}TASK ${taskName}`;
    lines.splice(insertIndex, 0, movedLine);

    onSourceChange(lines.join("\n"));

    setSelectedNode({
      type: "task",
      name: taskName,
      line: insertIndex + 1,
    });
  }

  const selectedIfNode = useMemo(() => {
    if (selectedNode?.type === "condition" && ast) {
      return findIfNode(ast.body, selectedNode.line);
    }
    return null;
  }, [selectedNode, ast]);

  const compileErrorsCount = compileErrors.length;

  return (
    <div className="space-y-3">
      {/* Visual Workflow Studio Header & Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0e1421] p-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-tight text-slate-200">
              Visual Workflow Studio
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#090d16] px-2.5 py-1 text-xs">
            <span className="text-slate-500">Tasks:</span>
            <span className="font-semibold text-slate-200">{stats.tasks}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#090d16] px-2.5 py-1 text-xs">
            <span className="text-slate-500">Conditions:</span>
            <span className="font-semibold text-amber-300">{stats.conditions}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#090d16] px-2.5 py-1 text-xs">
            <span className="text-slate-500">Compile:</span>
            <button
              onClick={compileErrorsCount > 0 ? onSwitchToEditor : undefined}
              className={`font-semibold ${
                compileErrorsCount > 0
                  ? "text-rose-400 hover:underline"
                  : "text-emerald-300"
              }`}
            >
              {compileErrorsCount > 0 ? `${compileErrorsCount} issue(s)` : "Ready"}
            </button>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#090d16] px-2.5 py-1 text-xs">
            <span className="text-slate-500">Execution:</span>
            <span
              className={`font-semibold ${
                executionStatus === "SUCCESS"
                  ? "text-emerald-300"
                  : executionStatus === "FAILED"
                  ? "text-rose-300"
                  : loading
                  ? "text-sky-300 animate-pulse"
                  : "text-slate-400"
              }`}
            >
              {loading ? "Running..." : executionStatus ?? "Idle"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addTask}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
          >
            <Plus size={14} className="text-violet-400" />
            Add task
          </button>
          {onRunWorkflow && (
            <button
              onClick={onRunWorkflow}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
              Run workflow
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Grid: Interactive Flow Canvas + Properties Panel */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Flow Canvas */}
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b111d] shadow-xl">
          <div className="h-[580px]">
            <ReactFlow
              nodes={graph.nodes.map((node) => ({
                ...node,
                selected:
                  selectedNode?.type === node.type &&
                  selectedNode?.line === Number((node.data as { line?: unknown })?.line),
                data: {
                  ...node.data,
                  onSelect: () => {
                    if (node.type === "task" || node.type === "condition") {
                      setSelectedNode({
                        type: node.type,
                        name: String((node.data as { label?: unknown })?.label ?? ""),
                        line: Number((node.data as { line?: unknown })?.line ?? 0),
                      });
                    }
                  },
                },
              }))}
              edges={graph.edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => {
                const nodeData = node.data as { label?: unknown; line?: unknown } | undefined;
                if (node.type === "task") {
                  setSelectedNode({
                    type: "task",
                    name: String(nodeData?.label ?? ""),
                    line: Number(nodeData?.line ?? 0),
                  });
                } else if (node.type === "condition") {
                  setSelectedNode({
                    type: "condition",
                    name: String(nodeData?.label ?? ""),
                    line: Number(nodeData?.line ?? 0),
                  });
                }
              }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#334155" gap={24} size={1} />
              <Controls />
            </ReactFlow>
          </div>
        </div>

        {/* Selected-Node Properties Inspector */}
        <aside className="rounded-xl border border-white/[0.08] bg-[#0e1421] p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                  <Zap size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Node Properties
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Interactive inspector
                  </p>
                </div>
              </div>
              {selectedNode && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-slate-400">
                  Line {selectedNode.line}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="mt-4 space-y-4">
                {selectedNode.type === "task" ? (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-300">
                        Task type
                      </label>
                      <select
                        value={selectedNode.name}
                        onChange={(event) => updateSelectedTask(event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#0b111d] p-2.5 text-sm font-semibold text-slate-200 outline-none focus:border-violet-500"
                      >
                        {["Search", "Analyze", "Summarize", "Publish", "Retry"].map(
                          (task) => (
                            <option key={task} value={task}>
                              {task}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="space-y-3 rounded-lg border border-white/[0.06] bg-[#090d16] p-3">
                      <label className="block text-xs font-medium text-slate-300">
                        Move task to branch
                      </label>

                      <select
                        value={moveDestination}
                        onChange={(event) =>
                          setMoveDestination(
                            event.target.value as "main" | "true" | "false",
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#0e1421] p-2 text-xs text-slate-200 outline-none focus:border-violet-500"
                      >
                        <option value="main">Main workflow sequence</option>
                        <option value="true">TRUE branch of condition</option>
                        <option value="false">FALSE branch of condition</option>
                      </select>

                      {moveDestination !== "main" && (
                        <div>
                          <label className="mb-1.5 block text-[11px] text-slate-400">
                            Target IF statement
                          </label>

                          <select
                            value={targetConditionLine}
                            onChange={(event) =>
                              setTargetConditionLine(event.target.value)
                            }
                            className="w-full rounded-lg border border-white/10 bg-[#0e1421] p-2 text-xs text-slate-200 outline-none focus:border-violet-500"
                          >
                            <option value="">Select an IF condition</option>
                            {source.split(/\r?\n/).map((line, index) => {
                              const match = line.trim().match(/^IF\s+(.+)/i);
                              if (!match) return null;
                              return (
                                <option key={index} value={String(index + 1)}>
                                  Line {index + 1}: {match[1]}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      <button
                        onClick={moveSelectedTask}
                        className="w-full rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20"
                      >
                        Move task
                      </button>
                    </div>

                    <button
                      onClick={deleteSelectedTask}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
                    >
                      <Trash2 size={13} />
                      Delete task
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-amber-300">
                        IF Condition Expression
                      </label>
                      <input
                        value={selectedNode.name}
                        onChange={(event) =>
                          updateSelectedCondition(event.target.value)
                        }
                        placeholder="e.g. confidence > 0.8"
                        className="w-full rounded-lg border border-amber-400/30 bg-[#0b111d] p-2.5 font-mono text-sm text-amber-200 outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Quick Condition Presets */}
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-slate-400">
                        Quick presets
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "confidence > 0.8",
                          "confidence < 0.5",
                          "score >= 90",
                          "Success",
                        ].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => updateSelectedCondition(preset)}
                            className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-slate-300 transition hover:border-amber-400/40 hover:bg-amber-400/10"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Branch Inspector */}
                    <div className="space-y-2 rounded-lg border border-white/[0.06] bg-[#090d16] p-3">
                      <p className="text-[11px] font-semibold text-slate-300">
                        Branch Overview
                      </p>

                      <div className="rounded border border-emerald-500/20 bg-emerald-500/[0.04] p-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          TRUE Branch
                        </span>
                        <p className="mt-1 font-mono text-xs text-slate-200">
                          {selectedIfNode?.then_body.length
                            ? selectedIfNode.then_body
                                .map((t) =>
                                  t.type === "Task" ? t.name : "IF..."
                                )
                                .join(" → ")
                            : "(Empty branch)"}
                        </p>
                      </div>

                      <div className="rounded border border-orange-500/20 bg-orange-500/[0.04] p-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                          FALSE Branch
                        </span>
                        <p className="mt-1 font-mono text-xs text-slate-200">
                          {selectedIfNode?.else_body.length
                            ? selectedIfNode.else_body
                                .map((t) =>
                                  t.type === "Task" ? t.name : "IF..."
                                )
                                .join(" → ")
                            : "(Empty branch)"}
                        </p>
                      </div>
                    </div>

                    {/* Add Task to Branch */}
                    <div className="space-y-2 border-t border-white/[0.08] pt-3">
                      <label className="block text-xs font-medium text-slate-300">
                        Append new task to branch
                      </label>
                      <select
                        value={selectedBranch}
                        onChange={(event) =>
                          setSelectedBranch(
                            event.target.value as "true" | "false",
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#0b111d] p-2 text-xs text-slate-200 outline-none focus:border-amber-400"
                      >
                        <option value="true">TRUE branch</option>
                        <option value="false">FALSE branch</option>
                      </select>

                      <button
                        onClick={addTaskToBranch}
                        className="w-full rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                      >
                        + Add task to branch
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-slate-500">
                  <FileCode2 size={22} />
                </div>
                <h4 className="mt-3 text-sm font-medium text-slate-300">
                  No Node Selected
                </h4>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Click on any task or condition node in the graph to inspect,
                  edit, route branches, or change parameters.
                </p>

                <div className="mt-6 rounded-lg border border-white/[0.06] bg-[#090d16] p-3 text-left">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Workflow Info
                  </span>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Name:</span>
                      <span className="font-semibold text-slate-200">
                        {ast?.name ?? "Unnamed"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Steps:</span>
                      <span className="font-semibold text-slate-200">
                        {stats.tasks + stats.conditions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.07] pt-3 text-[11px] text-slate-500 flex items-center justify-between">
            <span>FlowScript Visual Studio</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Sync
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
