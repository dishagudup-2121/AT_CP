import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  PanOnScrollMode,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleDot,
  FileCode2,
  FileText,
  GitBranch,
  Layers,
  LoaderCircle,
  Maximize2,
  PanelRight,
  PanelRightClose,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Zap,
  ZoomIn,
  ZoomOut,
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
  isActive?: boolean;
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
      return <Search size={18} className="text-[#8CB8B5]" />;
    case "analyze":
      return <Activity size={18} className="text-[#A78BFA]" />;
    case "summarize":
      return <FileText size={18} className="text-[#D8A657]" />;
    case "publish":
      return <Send size={18} className="text-[#6EAA8C]" />;
    case "retry":
      return <RotateCcw size={18} className="text-[#E07A5F]" />;
    default:
      return <Layers size={18} className="text-[#A9BAC2]" />;
  }
}

function getTaskTheme(taskName: string) {
  switch (taskName.toLowerCase()) {
    case "search":
      return {
        accentText: "text-[#8CB8B5]",
        iconBg: "bg-[#2D424A] text-[#8CB8B5] border-[#3A515B]",
        desc: "Query & retrieve dataset",
      };
    case "analyze":
      return {
        accentText: "text-[#A78BFA]",
        iconBg: "bg-[#2D424A] text-[#A78BFA] border-[#3A515B]",
        desc: "Evaluate & process payload",
      };
    case "summarize":
      return {
        accentText: "text-[#D8A657]",
        iconBg: "bg-[#2D424A] text-[#D8A657] border-[#3A515B]",
        desc: "Synthesize findings & output",
      };
    case "publish":
      return {
        accentText: "text-[#6EAA8C]",
        iconBg: "bg-[#2D424A] text-[#6EAA8C] border-[#3A515B]",
        desc: "Deploy result to channel",
      };
    case "retry":
      return {
        accentText: "text-[#E07A5F]",
        iconBg: "bg-[#2D424A] text-[#E07A5F] border-[#3A515B]",
        desc: "Handle error & retry step",
      };
    default:
      return {
        accentText: "text-[#A9BAC2]",
        iconBg: "bg-[#2D424A] text-[#A9BAC2] border-[#3A515B]",
        desc: "Automated pipeline step",
      };
  }
}

function WorkflowNode({
  data,
  selected,
}: {
  data: TaskNodeData;
  selected?: boolean;
}) {
  const completed = data.status === "SUCCESS";
  const failed = data.status === "FAILED";
  const running = data.status === "RUNNING";
  const theme = getTaskTheme(data.label);

  return (
    <div
      className={`group relative w-[270px] rounded-xl border transition-all duration-200 shadow-lg overflow-hidden bg-[#243944] text-[#E8EDEF] ${
        selected
          ? "ring-2 ring-[#8CB8B5] ring-offset-2 ring-offset-[#182630] shadow-xl shadow-[#8CB8B5]/20 border-[#8CB8B5] -translate-y-0.5"
          : "hover:-translate-y-0.5 hover:shadow-xl border-[#3A515B]"
      } ${
        completed
          ? "border-[#6EAA8C] bg-gradient-to-b from-[#243944] to-[#6EAA8C]/10"
          : failed
          ? "border-[#C86D6D] bg-gradient-to-b from-[#243944] to-[#C86D6D]/10"
          : running
          ? "border-[#5B92E5] bg-gradient-to-b from-[#243944] to-[#5B92E5]/10 animate-pulse"
          : "border-[#3A515B]"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#8CB8B5] !border-2 !border-[#182630] hover:!scale-125 transition-all !top-[-6px]"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#3A515B] px-3.5 py-2 bg-[#1E2D38]">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold tracking-wider text-[#8CB8B5] bg-[#2D424A] px-1.5 py-0.5 rounded border border-[#3A515B]">
            {data.stepIndex ? `TASK ${String(data.stepIndex).padStart(2, "0")}` : "TASK"}
          </span>
          <span className="text-[#577D83] font-bold">·</span>
          <span className="text-[11px] font-mono text-[#A9BAC2]">L{data.line}</span>
        </div>
        <span
          className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            completed
              ? "bg-[#6EAA8C]/20 text-[#6EAA8C] border-[#6EAA8C]/40"
              : failed
              ? "bg-[#C86D6D]/20 text-[#C86D6D] border-[#C86D6D]/40"
              : running
              ? "bg-[#5B92E5]/20 text-[#5B92E5] border-[#5B92E5]/40"
              : "bg-[#2D424A] text-[#A9BAC2] border-[#3A515B]"
          }`}
        >
          {completed && <CheckCircle2 size={11} className="inline shrink-0" />}
          {failed && <CircleAlert size={11} className="inline shrink-0" />}
          {running && <LoaderCircle size={11} className="inline shrink-0 animate-spin" />}
          {!completed && !failed && !running && <CircleDot size={10} className="inline shrink-0 text-[#577D83]" />}
          {completed ? "SUCCESS" : failed ? "FAILED" : running ? "RUNNING" : "PENDING"}
        </span>
      </div>

      {/* Main Info */}
      <div className="flex items-center gap-3.5 p-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm border transition-transform group-hover:scale-105 ${
            completed
              ? "bg-[#6EAA8C]/15 text-[#6EAA8C] border-[#6EAA8C]/30"
              : failed
              ? "bg-[#C86D6D]/15 text-[#C86D6D] border-[#C86D6D]/30"
              : running
              ? "bg-[#5B92E5]/15 text-[#5B92E5] border-[#5B92E5]/30"
              : theme.iconBg
          }`}
        >
          {getTaskIcon(data.label)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[#E8EDEF] tracking-tight">
            {data.label}
          </p>
          <p className="truncate text-[11px] text-[#A9BAC2] mt-0.5">
            {theme.desc}
          </p>
        </div>
      </div>

      {/* Output / Status Preview */}
      {data.output ? (
        <div className="border-t border-[#3A515B] bg-[#182630] px-3.5 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-[#A9BAC2] uppercase tracking-wider">
              Output Payload
            </span>
            <span className="text-[10px] font-mono font-bold text-[#6EAA8C]">OK</span>
          </div>
          <p className="text-xs font-mono text-[#6EAA8C] break-words line-clamp-2 bg-[#6EAA8C]/10 px-2 py-1 rounded border border-[#6EAA8C]/30">
            {data.output}
          </p>
        </div>
      ) : (
        <div className="border-t border-[#3A515B] bg-[#1E2D38] px-3.5 py-1.5 text-[11px] text-[#A9BAC2] flex items-center justify-between">
          <span className="font-medium">Awaiting execution</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#577D83]" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[#8CB8B5] !border-2 !border-[#182630] hover:!scale-125 transition-all !bottom-[-6px]"
      />
    </div>
  );
}

function ConditionNode({
  data,
  selected,
}: {
  data: { label: string; line: number };
  selected?: boolean;
}) {
  return (
    <div
      className={`group relative w-[280px] rounded-xl border transition-all duration-200 shadow-lg overflow-hidden bg-[#243944] text-[#E8EDEF] ${
        selected
          ? "ring-2 ring-[#D8A657] ring-offset-2 ring-offset-[#182630] shadow-xl shadow-[#D8A657]/20 border-[#D8A657] -translate-y-0.5"
          : "hover:-translate-y-0.5 hover:shadow-xl border-[#D8A657]/70"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#D8A657] !border-2 !border-[#182630] hover:!scale-125 transition-all !top-[-6px]"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3A515B] px-3.5 py-2 bg-[#1E2D38]">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#D8A657] bg-[#D8A657]/15 border border-[#D8A657]/30 px-2 py-0.5 rounded-full">
          <GitBranch size={11} className="shrink-0" />
          CONDITION BRANCH
        </span>
        <span className="text-[11px] font-mono text-[#D8A657] bg-[#2D424A] px-1.5 py-0.5 rounded border border-[#3A515B]">
          L{data.line}
        </span>
      </div>

      {/* Body: Condition Expression */}
      <div className="p-3.5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-[#A9BAC2] mb-1.5">
          Decision Expression
        </p>
        <div className="bg-[#182630] border border-[#3A515B] rounded-lg p-2.5 shadow-sm">
          <p className="font-mono text-xs font-bold text-[#D8A657] break-words leading-relaxed">
            {data.label}
          </p>
        </div>
      </div>

      {/* Branch Port Markers */}
      <div className="border-t border-[#3A515B] bg-[#1E2D38] px-3.5 py-2 flex items-center justify-between text-[11px] font-bold">
        <div className="flex items-center gap-1.5 text-[#6EAA8C] bg-[#6EAA8C]/15 border border-[#6EAA8C]/30 px-2 py-0.5 rounded-md">
          <span className="w-2 h-2 rounded-full bg-[#6EAA8C] inline-block shadow-sm" />
          <span>TRUE</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#E07A5F] bg-[#E07A5F]/15 border border-[#E07A5F]/30 px-2 py-0.5 rounded-md">
          <span>FALSE</span>
          <span className="w-2 h-2 rounded-full bg-[#E07A5F] inline-block shadow-sm" />
        </div>
      </div>

      <Handle
        id="true"
        type="source"
        position={Position.Bottom}
        style={{ left: "25%", background: "#6EAA8C", width: 12, height: 12, bottom: -6 }}
        className="!border-2 !border-[#182630] hover:!scale-125 transition-transform"
      />
      <Handle
        id="false"
        type="source"
        position={Position.Bottom}
        style={{ left: "75%", background: "#E07A5F", width: 12, height: 12, bottom: -6 }}
        className="!border-2 !border-[#182630] hover:!scale-125 transition-transform"
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
  let currentBody: AstStatement[] = root;
  let foundWorkflow = false;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].trim();
    if (!text || text.startsWith("//")) continue;

    const wfMatch = text.match(/^WORKFLOW\s+(\w+)/i);
    if (wfMatch) {
      workflowName = wfMatch[1];
      workflowLine = i + 1;
      foundWorkflow = true;
      continue;
    }

    const taskMatch = text.match(/^TASK\s+(\w+)/i);
    if (taskMatch) {
      currentBody.push({
        type: "Task",
        name: taskMatch[1],
        line: i + 1,
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
        line: i + 1,
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
  isActive = true,
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
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentViewport, setCurrentViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
  const [isHoveringScrollbar, setIsHoveringScrollbar] = useState(false);

  const reactFlowRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientY: number; startFraction: number }>({ clientY: 0, startFraction: 0 });

  const ast = useMemo(() => parseWorkflow(source), [source]);
  const stats = useMemo(() => (ast ? countStats(ast.body) : { tasks: 0, conditions: 0 }), [ast]);

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
      minZoom: 0.7,
      maxZoom: 1.0,
      duration: 350,
    });
  };

  // Auto-center and fit diagram whenever active, AST, or container bounds change
  useEffect(() => {
    if (!isActive) return;
    const timers = [
      setTimeout(() => handleFitView(), 60),
      setTimeout(() => handleFitView(), 220),
      setTimeout(() => handleFitView(), 450),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isActive, ast, inspectorOpen, source]);

  // Track container dimensions and update size for scrollbar metrics
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50 && entry.contentRect.height > 50) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
      color = "#577D83",
      sourceHandle?: string,
      isAnimated = false,
    ) => {
      edges.push({
        id: `${from}-${to}-${sourceHandle ?? ""}-${label ?? "next"}`,
        source: from,
        target: to,
        sourceHandle,
        label,
        type: "smoothstep",
        animated: isAnimated || color === "#8CB8B5",
        markerEnd: { type: MarkerType.ArrowClosed, color },
        style: { stroke: color, strokeWidth: color === "#8CB8B5" ? 2.5 : 1.8 },
        labelStyle: { fill: color === "#577D83" ? "#E8EDEF" : color, fontSize: 11, fontWeight: 700 },
        labelBgStyle: { fill: "#243944", fillOpacity: 0.95, stroke: color, strokeWidth: 1, rx: 4, ry: 4 },
      });
    };

    let nextId = 0;
    let taskCounter = 0;

    type Frontier = {
      id: string;
      sourceHandle?: string;
      label?: string;
      color?: string;
    };

    function measureStatementWidth(stmt: AstStatement): number {
      if (stmt.type === "Task") {
        return 310;
      }
      const trueW = measureBodyWidth(stmt.then_body);
      const falseW = measureBodyWidth(stmt.else_body);
      return Math.max(310, trueW + falseW + 70);
    }

    function measureBodyWidth(statements: AstStatement[]): number {
      if (statements.length === 0) return 260;
      let maxW = 310;
      for (const s of statements) {
        maxW = Math.max(maxW, measureStatementWidth(s));
      }
      return maxW;
    }

    function layoutStatements(
      statements: AstStatement[],
      incoming: Frontier[],
      centerX: number,
      startY: number,
    ): { frontiers: Frontier[]; maxY: number } {
      let currentFrontiers = incoming;
      let currentY = startY;

      for (const stmt of statements) {
        const id = `node-${nextId++}`;

        if (stmt.type === "Task") {
          taskCounter++;
          const result = resultMap.get(`${stmt.line}:${stmt.name}`);
          const isSuccess = result?.status === "SUCCESS";
          const hasOutput = Boolean(result?.output);
          const cardHeight = hasOutput ? 200 : 160;

          nodes.push({
            id,
            type: "task",
            position: { x: centerX - 135, y: currentY },
            data: {
              label: stmt.name,
              line: stmt.line,
              status: result?.status ?? "PENDING",
              output: result?.output,
              stepIndex: taskCounter,
            },
          });

          currentFrontiers.forEach((prev) => {
            addEdge(
              prev.id,
              id,
              prev.label,
              prev.color ?? (isSuccess ? "#8CB8B5" : "#577D83"),
              prev.sourceHandle,
              isSuccess,
            );
          });

          currentFrontiers = [{ id }];
          currentY += cardHeight + 65;
        } else {
          // Condition Node
          const conditionHeight = 175;
          nodes.push({
            id,
            type: "condition",
            position: { x: centerX - 140, y: currentY },
            data: {
              label: stmt.condition,
              line: stmt.line,
            },
          });

          currentFrontiers.forEach((prev) => {
            addEdge(
              prev.id,
              id,
              prev.label,
              prev.color ?? "#577D83",
              prev.sourceHandle,
            );
          });

          const trueW = measureBodyWidth(stmt.then_body);
          const falseW = measureBodyWidth(stmt.else_body);
          const totalBranchW = trueW + 70 + falseW;

          const leftCenter = centerX - totalBranchW / 2 + trueW / 2;
          const rightCenter = centerX + totalBranchW / 2 - falseW / 2;
          const branchStartY = currentY + conditionHeight + 65;

          const trueIncoming: Frontier[] = [
            { id, sourceHandle: "true", label: "TRUE", color: "#6EAA8C" },
          ];
          const falseIncoming: Frontier[] = [
            { id, sourceHandle: "false", label: "FALSE", color: "#E07A5F" },
          ];

          const trueRes = stmt.then_body.length > 0
            ? layoutStatements(stmt.then_body, trueIncoming, leftCenter, branchStartY)
            : { frontiers: trueIncoming, maxY: branchStartY };

          const falseRes = stmt.else_body.length > 0
            ? layoutStatements(stmt.else_body, falseIncoming, rightCenter, branchStartY)
            : { frontiers: falseIncoming, maxY: branchStartY };

          currentFrontiers = [...trueRes.frontiers, ...falseRes.frontiers];
          currentY = Math.max(trueRes.maxY, falseRes.maxY) + 65;
        }
      }

      return { frontiers: currentFrontiers, maxY: currentY };
    }

    const totalWidth = measureBodyWidth(ast.body);
    const rootCenterX = Math.max(350, totalWidth / 2 + 50);
    const startY = 30;

    nodes.push({
      id: "start",
      type: "input",
      position: { x: rootCenterX - 110, y: startY },
      data: { label: `${ast.name} · START` },
      style: {
        background: "#243944",
        color: "#E8EDEF",
        border: "2px solid #6EAA8C",
        borderRadius: "9999px",
        padding: "10px 22px",
        width: 220,
        fontWeight: 700,
        fontSize: "12px",
        letterSpacing: "0.05em",
        textAlign: "center",
        boxShadow: "0 2px 12px rgba(110,170,140,0.25)",
      },
    });

    const { frontiers: finalFrontiers, maxY } = layoutStatements(
      ast.body,
      [{ id: "start" }],
      rootCenterX,
      startY + 75,
    );

    const finalY = Math.max(startY + 200, maxY + 20);

    nodes.push({
      id: "end",
      type: "output",
      position: { x: rootCenterX - 110, y: finalY },
      data: {
        label:
          executionStatus === "SUCCESS"
            ? "WORKFLOW · SUCCESS"
            : executionStatus === "FAILED"
            ? "WORKFLOW · FAILED"
            : "WORKFLOW · END",
      },
      style: {
        background: "#243944",
        color:
          executionStatus === "FAILED"
            ? "#C86D6D"
            : executionStatus === "SUCCESS"
            ? "#6EAA8C"
            : "#A9BAC2",
        border:
          executionStatus === "FAILED"
            ? "2px solid #C86D6D"
            : executionStatus === "SUCCESS"
            ? "2px solid #6EAA8C"
            : "2px solid #577D83",
        borderRadius: "9999px",
        padding: "10px 22px",
        width: 220,
        fontWeight: 700,
        fontSize: "12px",
        letterSpacing: "0.05em",
        textAlign: "center",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
      },
    });

    finalFrontiers.forEach((prev) => {
      addEdge(
        prev.id,
        "end",
        prev.label,
        prev.color ?? (executionStatus === "SUCCESS" ? "#8CB8B5" : "#577D83"),
        prev.sourceHandle,
        executionStatus === "SUCCESS",
      );
    });

    return { nodes, edges };
  }, [ast, results, executionStatus]);

  // Compute layout metrics of workflow for centering and vertical scrolling
  const flowMetrics = useMemo(() => {
    if (!ast || graph.nodes.length === 0) {
      return { rootCenterX: 350, startY: 30, finalY: 600, totalHeight: 570 };
    }
    const startNode = graph.nodes.find((n) => n.id === "start");
    const endNode = graph.nodes.find((n) => n.id === "end");
    const startY = startNode?.position.y ?? 30;
    const finalY = endNode?.position.y ?? 600;
    const rootCenterX = (startNode?.position.x ?? 240) + 110;
    return {
      rootCenterX,
      startY,
      finalY,
      totalHeight: Math.max(finalY - startY, 200),
    };
  }, [ast, graph.nodes]);

  const containerH = containerSize.height || 600;
  const zoom = Math.max(currentViewport.zoom || 0.85, 0.5);
  const visibleFlowHeight = containerH / zoom;
  const totalFlowHeight = flowMetrics.totalHeight + 120;
  const ratio = visibleFlowHeight / totalFlowHeight;
  const isScrollable = ratio < 0.95;
  const thumbHeightPercent = Math.max(16, Math.min(100, ratio * 100));

  const currentFraction = useMemo(() => {
    const z = Math.max(currentViewport.zoom || 0.85, 0.5);
    const screenCenterY = (containerSize.height || 600) / 2;
    const flowCenterY = (screenCenterY - currentViewport.y) / z;
    const startY = flowMetrics.startY + 60;
    const finalY = flowMetrics.finalY - 60;
    const span = finalY - startY;
    if (span <= 10) return 0;
    return Math.max(0, Math.min(1, (flowCenterY - startY) / span));
  }, [currentViewport, containerSize.height, flowMetrics]);

  const thumbTopPercent = currentFraction * (100 - thumbHeightPercent);

  // Scroll to a specific fraction (0 = top, 1 = bottom)
  const scrollToFraction = (fraction: number, animate = true) => {
    if (!reactFlowRef.current) return;
    const clamped = Math.max(0, Math.min(1, fraction));
    const startY = flowMetrics.startY + 60;
    const finalY = flowMetrics.finalY - 60;
    const targetY = startY + clamped * (finalY - startY);
    reactFlowRef.current.setCenter(
      flowMetrics.rootCenterX,
      targetY,
      {
        zoom: Math.max(currentViewport.zoom || 0.85, 0.7),
        duration: animate ? 250 : 0,
      },
    );
  };

  const scrollToTop = () => {
    if (!reactFlowRef.current) return;
    reactFlowRef.current.setCenter(
      flowMetrics.rootCenterX,
      flowMetrics.startY + 60,
      {
        zoom: Math.max(currentViewport.zoom || 0.85, 0.7),
        duration: 350,
      },
    );
  };

  const scrollToBottom = () => {
    if (!reactFlowRef.current) return;
    reactFlowRef.current.setCenter(
      flowMetrics.rootCenterX,
      flowMetrics.finalY - 40,
      {
        zoom: Math.max(currentViewport.zoom || 0.85, 0.7),
        duration: 350,
      },
    );
  };

  // Scrollbar drag interaction handlers
  const handleScrollbarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragStartRef.current = {
      clientY: e.clientY,
      startFraction: currentFraction,
    };
    setIsDraggingScrollbar(true);
  };

  const handleScrollbarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingScrollbar || !trackRef.current) return;
    e.preventDefault();
    const trackHeight = trackRef.current.clientHeight;
    if (trackHeight <= 0) return;

    const maxThumbTopPx = trackHeight * (1 - thumbHeightPercent / 100);
    if (maxThumbTopPx <= 0) return;

    const deltaY = e.clientY - dragStartRef.current.clientY;
    const deltaFraction = deltaY / maxThumbTopPx;
    const newFraction = Math.max(0, Math.min(1, dragStartRef.current.startFraction + deltaFraction));
    scrollToFraction(newFraction, false);
  };

  const handleScrollbarPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingScrollbar) return;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setIsDraggingScrollbar(false);
  };

  // Track click handler (jump directly to position)
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const fraction = Math.max(0, Math.min(1, clickY / rect.height));
    scrollToFraction(fraction, true);
  };

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
      const lineNum = Number(targetConditionLine);
      if (!lineNum || isNaN(lineNum)) {
        alert("Select a target IF condition first.");
        return;
      }

      const ifIdx = lineNum - 1;
      const ifIndent = lines[ifIdx].match(/^\s*/)?.[0] ?? "";
      indentation = `${ifIndent}    `;

      let depth = 0;
      let elseIndex = -1;
      let endIndex = -1;

      for (let i = ifIdx + 1; i < lines.length; i++) {
        const text = lines[i].trim();
        if (/^IF\s+.+/i.test(text)) {
          depth++;
        } else if (/^END$/i.test(text)) {
          if (depth === 0) {
            endIndex = i;
            break;
          }
          depth--;
        } else if (/^ELSE$/i.test(text) && depth === 0 && elseIndex === -1) {
          elseIndex = i;
        }
      }

      if (endIndex < 0) {
        alert("Could not find the matching END for the target IF.");
        return;
      }

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
    <div className="flex flex-col h-full w-full min-h-0 bg-[#182630] text-[#E8EDEF]">
      {/* 1. Sleek Toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#3A515B] bg-[#1E2D38] px-3 select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#E8EDEF]">
            Visual Workflow Studio
          </span>

          <div className="h-3.5 w-px bg-[#3A515B] mx-1" />

          <div className="flex items-center gap-1 rounded bg-[#2D424A] border border-[#3A515B] px-2 py-0.5 text-[11px]">
            <span className="text-[#A9BAC2]">Compile:</span>
            <button
              onClick={compileErrorsCount > 0 ? onSwitchToEditor : undefined}
              className={`font-semibold ${
                compileErrorsCount > 0 ? "text-[#C86D6D] hover:underline" : "text-[#6EAA8C]"
              }`}
            >
              {compileErrorsCount > 0 ? `${compileErrorsCount} issue(s)` : "Ready"}
            </button>
          </div>

          <div className="flex items-center gap-1 rounded bg-[#2D424A] border border-[#3A515B] px-2 py-0.5 text-[11px]">
            <span className="text-[#A9BAC2]">Execution:</span>
            <span
              className={`font-semibold ${
                executionStatus === "SUCCESS"
                  ? "text-[#6EAA8C]"
                  : executionStatus === "FAILED"
                  ? "text-[#C86D6D]"
                  : loading
                  ? "text-[#5B92E5] animate-pulse"
                  : "text-[#A9BAC2]"
              }`}
            >
              {loading ? "Running..." : executionStatus ?? "Idle"}
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          {/* Dedicated Zoom In / Zoom Out / Reset Controls */}
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

          {/* Fit to screen button */}
          <button
            onClick={handleFitView}
            className="flex items-center gap-1 rounded border border-[#3A515B] bg-[#2D424A] px-2.5 py-1 text-xs font-medium text-[#E8EDEF] hover:bg-[#344B54] transition shadow-sm"
            title="Fit diagram to viewport (Auto-adjust)"
          >
            <Maximize2 size={13} className="text-[#8CB8B5]" />
            <span>Fit View</span>
          </button>

          {/* Toggle Inspector Drawer */}
          <button
            onClick={() => setInspectorOpen((open) => !open)}
            className={`flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium transition ${
              inspectorOpen
                ? "border-[#8CB8B5] bg-[#2D424A] text-[#8CB8B5]"
                : "border-[#3A515B] bg-[#1E2D38] text-[#A9BAC2] hover:bg-[#2D424A] hover:text-[#E8EDEF]"
            }`}
            title={inspectorOpen ? "Hide property inspector" : "Show property inspector"}
          >
            {inspectorOpen ? <PanelRightClose size={13} /> : <PanelRight size={13} />}
            <span>{inspectorOpen ? "Hide Inspector" : "Inspector"}</span>
          </button>

          <button
            onClick={addTask}
            className="flex items-center gap-1 rounded border border-[#3A515B] bg-[#2D424A] px-2.5 py-1 text-xs font-medium text-[#E8EDEF] transition hover:bg-[#344B54]"
          >
            <Plus size={13} className="text-[#8CB8B5]" />
            <span>Add task</span>
          </button>

          {onRunWorkflow && (
            <button
              onClick={onRunWorkflow}
              disabled={loading}
              className="flex items-center gap-1.5 rounded bg-[#577D83] px-3 py-1 text-xs font-semibold text-[#FFFFFF] shadow-sm transition hover:bg-[#68939A] disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle size={13} className="animate-spin" />
              ) : (
                <Play size={13} fill="currentColor" />
              )}
              <span>Run workflow</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Flex Studio: Canvas + Collapsible Properties Inspector */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Full-Page ReactFlow Canvas */}
        <div ref={containerRef} className="relative flex-1 h-full min-w-0 bg-[#182630]">
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
                    setInspectorOpen(true);
                  }
                },
              },
            }))}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              reactFlowRef.current = instance;
              setTimeout(() => {
                instance.fitView({ padding: 0.18, minZoom: 0.7, maxZoom: 1.0 });
              }, 60);
            }}
            onNodeClick={(_, node) => {
              const nodeData = node.data as { label?: unknown; line?: unknown } | undefined;
              if (node.type === "task") {
                setSelectedNode({
                  type: "task",
                  name: String(nodeData?.label ?? ""),
                  line: Number(nodeData?.line ?? 0),
                });
                setInspectorOpen(true);
              } else if (node.type === "condition") {
                setSelectedNode({
                  type: "condition",
                  name: String(nodeData?.label ?? ""),
                  line: Number(nodeData?.line ?? 0),
                });
                setInspectorOpen(true);
              }
            }}
            fitView
            fitViewOptions={{ padding: 0.18, minZoom: 0.7, maxZoom: 1.0 }}
            minZoom={0.5}
            maxZoom={2.0}
            panOnScroll={true}
            panOnScrollSpeed={1.2}
            panOnScrollMode={PanOnScrollMode.Vertical}
            zoomOnPinch={true}
            onMove={(_, viewport) => {
              setZoomLevel(Math.round(viewport.zoom * 100));
              setCurrentViewport(viewport);
            }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#2D424A" gap={20} size={1} />
            <Controls className="!bg-[#243944] !border !border-[#3A515B] !shadow-xl !rounded-md [&>button]:!border-[#3A515B] [&>button]:!text-[#E8EDEF] [&>button:hover]:!bg-[#2D424A]" />
          </ReactFlow>

          {/* Dedicated Interactive Vertical Scrolling Bar */}
          {isScrollable && (
            <div
              className={`absolute right-3.5 top-5 bottom-5 z-20 flex flex-col items-center justify-between transition-opacity duration-200 select-none ${
                isDraggingScrollbar || isHoveringScrollbar ? "opacity-100" : "opacity-85 hover:opacity-100"
              }`}
            onMouseEnter={() => setIsHoveringScrollbar(true)}
            onMouseLeave={() => setIsHoveringScrollbar(false)}
          >
            {/* Scroll to Top (START) button */}
            <button
              onClick={scrollToTop}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#3A515B] bg-[#243944]/95 text-[#A9BAC2] shadow-lg backdrop-blur-sm transition-all hover:border-[#8CB8B5] hover:bg-[#2D424A] hover:text-[#8CB8B5] active:scale-95"
              title="Scroll whole flow to TOP (START)"
            >
              <ChevronUp size={15} />
            </button>

            {/* Scroll Track & Draggable Thumb */}
            <div
              ref={trackRef}
              onClick={handleTrackClick}
              className="relative my-2 flex-1 w-3 hover:w-3.5 transition-all duration-150 rounded-full bg-[#243944]/80 border border-[#3A515B]/70 shadow-inner backdrop-blur-sm cursor-pointer overflow-visible"
              title="Click or drag to scroll flow from top to bottom"
            >
              {/* Draggable Thumb */}
              <div
                onPointerDown={handleScrollbarPointerDown}
                onPointerMove={handleScrollbarPointerMove}
                onPointerUp={handleScrollbarPointerUp}
                onPointerCancel={handleScrollbarPointerUp}
                style={{
                  top: `${thumbTopPercent}%`,
                  height: `${thumbHeightPercent}%`,
                }}
                className={`absolute left-0 right-0 rounded-full transition-colors cursor-grab active:cursor-grabbing border ${
                  isDraggingScrollbar
                    ? "bg-[#8CB8B5] border-[#FFFFFF] shadow-[0_0_12px_rgba(140,184,181,0.8)]"
                    : "bg-[#577D83] border-[#8CB8B5]/50 hover:bg-[#8CB8B5] hover:border-[#E8EDEF]"
                }`}
              >
                {/* Visual Grab Ridges */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 opacity-60 pointer-events-none">
                  <span className="w-1.5 h-0.5 rounded-full bg-[#182630]" />
                  <span className="w-1.5 h-0.5 rounded-full bg-[#182630]" />
                  <span className="w-1.5 h-0.5 rounded-full bg-[#182630]" />
                </div>
              </div>

              {/* Position indicator tooltip when hovering or dragging */}
              {(isHoveringScrollbar || isDraggingScrollbar) && (
                <div
                  style={{
                    top: `calc(${thumbTopPercent}% + ${thumbHeightPercent / 2}%)`,
                  }}
                  className="absolute right-6 -translate-y-1/2 pointer-events-none rounded bg-[#182630] border border-[#3A515B] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#8CB8B5] shadow-xl whitespace-nowrap z-30"
                >
                  {Math.round(currentFraction * 100)}%
                </div>
              )}
            </div>

            {/* Scroll to Bottom (SUCCESS) button */}
            <button
              onClick={scrollToBottom}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#3A515B] bg-[#243944]/95 text-[#A9BAC2] shadow-lg backdrop-blur-sm transition-all hover:border-[#8CB8B5] hover:bg-[#2D424A] hover:text-[#8CB8B5] active:scale-95"
              title="Scroll whole flow to BOTTOM (SUCCESS)"
            >
              <ChevronDown size={15} />
            </button>
          </div>
        )}
      </div>

        {/* Collapsible Node Properties Inspector Drawer */}
        {inspectorOpen && (
          <aside className="w-80 shrink-0 border-l border-[#3A515B] bg-[#243944] p-4 flex flex-col justify-between overflow-y-auto shadow-2xl select-none text-[#E8EDEF]">
            <div>
              <div className="flex items-center justify-between border-b border-[#3A515B] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2D424A] text-[#8CB8B5] border border-[#3A515B]">
                    <Zap size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#E8EDEF]">
                      Node Properties
                    </h3>
                    <p className="text-[10px] text-[#A9BAC2]">
                      Visual Inspector
                    </p>
                  </div>
                </div>
                {selectedNode && (
                  <span className="rounded bg-[#2D424A] border border-[#3A515B] px-2 py-0.5 text-[10px] font-mono text-[#8CB8B5]">
                    Line {selectedNode.line}
                  </span>
                )}
              </div>

              {selectedNode ? (
                <div className="mt-3.5 space-y-3.5 text-xs">
                  {selectedNode.type === "task" ? (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#E8EDEF]">
                          Task Action
                        </label>
                        <select
                          value={selectedNode.name}
                          onChange={(event) => updateSelectedTask(event.target.value)}
                          className="w-full rounded border border-[#3A515B] bg-[#182630] p-2 text-xs font-semibold text-[#E8EDEF] outline-none focus:border-[#8CB8B5]"
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

                      <div className="space-y-2.5 rounded-lg border border-[#3A515B] bg-[#2D424A] p-3">
                        <label className="block text-xs font-semibold text-[#E8EDEF]">
                          Move task to branch
                        </label>

                        <select
                          value={moveDestination}
                          onChange={(event) =>
                            setMoveDestination(
                              event.target.value as "main" | "true" | "false",
                            )
                          }
                          className="w-full rounded border border-[#3A515B] bg-[#182630] p-2 text-xs text-[#E8EDEF] outline-none focus:border-[#8CB8B5]"
                        >
                          <option value="main">Main workflow sequence</option>
                          <option value="true">TRUE branch of condition</option>
                          <option value="false">FALSE branch of condition</option>
                        </select>

                        {moveDestination !== "main" && (
                          <div>
                            <label className="mb-1 block text-[11px] text-[#A9BAC2]">
                              Target IF statement
                            </label>

                            <select
                              value={targetConditionLine}
                              onChange={(event) =>
                                setTargetConditionLine(event.target.value)
                              }
                              className="w-full rounded border border-[#3A515B] bg-[#182630] p-2 text-xs text-[#E8EDEF] outline-none focus:border-[#8CB8B5]"
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
                          className="w-full rounded border border-[#577D83] bg-[#182630] px-3 py-1.5 text-xs font-semibold text-[#8CB8B5] transition hover:bg-[#344B54]"
                        >
                          Move task
                        </button>
                      </div>

                      <button
                        onClick={deleteSelectedTask}
                        className="flex w-full items-center justify-center gap-1.5 rounded border border-[#C86D6D]/40 bg-[#C86D6D]/15 px-3 py-1.5 text-xs font-semibold text-[#C86D6D] transition hover:bg-[#C86D6D]/25"
                      >
                        <Trash2 size={13} />
                        Delete task
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#D8A657]">
                          IF Condition Expression
                        </label>
                        <input
                          value={selectedNode.name}
                          onChange={(event) =>
                            updateSelectedCondition(event.target.value)
                          }
                          placeholder="e.g. confidence > 0.8"
                          className="w-full rounded border border-[#3A515B] bg-[#182630] p-2 font-mono text-xs font-semibold text-[#D8A657] outline-none focus:border-[#D8A657]"
                        />
                      </div>

                      {/* Quick Condition Presets */}
                      <div>
                        <p className="mb-1 text-[11px] font-semibold text-[#A9BAC2]">
                          Quick presets
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {[
                            "confidence > 0.8",
                            "confidence < 0.5",
                            "score >= 90",
                            "status == 1",
                          ].map((preset) => (
                            <button
                              key={preset}
                              onClick={() => updateSelectedCondition(preset)}
                              className="rounded border border-[#3A515B] bg-[#182630] px-2 py-0.5 font-mono text-[10px] text-[#A9BAC2] transition hover:border-[#8CB8B5] hover:text-[#8CB8B5]"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Branch Inspector */}
                      <div className="space-y-2 rounded-lg border border-[#3A515B] bg-[#2D424A] p-2.5">
                        <p className="text-[11px] font-semibold text-[#E8EDEF]">
                          Branch Overview
                        </p>

                        <div className="rounded border border-[#6EAA8C]/30 bg-[#182630] p-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6EAA8C]">
                            TRUE Branch
                          </span>
                          <p className="mt-0.5 font-mono text-xs text-[#E8EDEF]">
                            {selectedIfNode?.then_body.length
                              ? selectedIfNode.then_body
                                  .map((t) =>
                                    t.type === "Task" ? t.name : "IF..."
                                  )
                                  .join(" → ")
                              : "(Empty branch)"}
                          </p>
                        </div>

                        <div className="rounded border border-[#E07A5F]/30 bg-[#182630] p-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#E07A5F]">
                            FALSE Branch
                          </span>
                          <p className="mt-0.5 font-mono text-xs text-[#E8EDEF]">
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
                      <div className="space-y-2 border-t border-[#3A515B] pt-2.5">
                        <label className="block text-xs font-semibold text-[#E8EDEF]">
                          Append task to branch
                        </label>
                        <select
                          value={selectedBranch}
                          onChange={(event) =>
                            setSelectedBranch(
                              event.target.value as "true" | "false",
                            )
                          }
                          className="w-full rounded border border-[#3A515B] bg-[#182630] p-2 text-xs text-[#E8EDEF] outline-none"
                        >
                          <option value="true">TRUE branch</option>
                          <option value="false">FALSE branch</option>
                        </select>

                        <button
                          onClick={addTaskToBranch}
                          className="w-full rounded border border-[#6EAA8C]/40 bg-[#6EAA8C]/20 px-3 py-1.5 text-xs font-semibold text-[#6EAA8C] transition hover:bg-[#6EAA8C]/30"
                        >
                          + Add task to branch
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-6 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-[#3A515B] bg-[#2D424A] text-[#8CB8B5]">
                    <FileCode2 size={20} />
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-[#E8EDEF]">
                    No Node Selected
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#A9BAC2]">
                    Click on any task or condition node in the graph to inspect, edit, or configure branches.
                  </p>

                  <div className="mt-4 rounded-lg border border-[#3A515B] bg-[#2D424A] p-2.5 text-left text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8CB8B5]">
                      Workflow Info
                    </span>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex justify-between text-[#A9BAC2]">
                        <span>Workflow:</span>
                        <span className="font-semibold text-[#E8EDEF]">
                          {ast?.name ?? "Unnamed"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#A9BAC2]">
                        <span>Total Steps:</span>
                        <span className="font-semibold text-[#E8EDEF]">
                          {stats.tasks + stats.conditions}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#3A515B] pt-2.5 text-[10px] text-[#A9BAC2] flex items-center justify-between">
              <span>FlowScript Studio</span>
              <span className="flex items-center gap-1 text-[#6EAA8C] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6EAA8C]"></span>
                Live Synchronized
              </span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
