from typing import Any
from app.runtime.dfa import (
    WorkflowDFA,
    State,
    InvalidTransitionError,
)


DEFAULT_SIMULATION_CONTEXT: dict[str, Any] = {
    "confidence": 0.85,
    "score": 90,
    "accuracy": 0.95,
    "threshold": 0.8,
    "status": "Success",
    "Success": True,
    "Failure": False,
}


class WorkflowExecutionError(Exception):
    """Raised when workflow execution fails."""


class WorkflowEngine:
    def __init__(self):
        self.dfa = WorkflowDFA()
        self.logs: list[dict[str, Any]] = []
        self.results: list[dict[str, Any]] = []

    def _log(self, message: str, level: str = "INFO", line: int | None = None) -> None:
        log_entry: dict[str, Any] = {
            "level": level,
            "message": message,
            "state": self.dfa.state.value,
        }
        if line is not None:
            log_entry["line"] = line
        self.logs.append(log_entry)

    def _execute_task(self, name: str, line: int) -> bool:
        """Execute a supported task using deterministic demo behavior."""
        self._log(f"Executing task: {name} (line {line})", line=line)
        # These are simulated tasks for the project prototype.
        # Real external integrations can be added later.
        task_outputs = {
            "Search": "Search completed",
            "Analyze": "Analysis completed",
            "Summarize": "Summary completed",
            "Publish": "Publish completed",
            "Retry": "Retry scheduled",
        }

        if name not in task_outputs:
            self._log(f"Unsupported task '{name}' at line {line}", level="ERROR", line=line)
            err = WorkflowExecutionError(f"Unsupported task '{name}' at line {line}")
            err.line = line
            raise err

        output = task_outputs[name]
        self.results.append({
            "task": name,
            "name": name,
            "line": line,
            "output": output,
            "status": "SUCCESS",
        })
        self._log(f"Task completed: {name} (line {line})")
        return True

    def _evaluate_condition(
        self, condition: Any, context: dict[str, Any] | None = None
    ) -> bool:
        """Evaluate a condition expression or demo flag."""
        merged_context = {**DEFAULT_SIMULATION_CONTEXT, **(context or {})}

        if not isinstance(condition, str):
            return bool(condition)

        # Direct context lookup or boolean flag
        if condition in merged_context:
            return bool(merged_context[condition])
        if condition == "Success":
            return True
        if condition == "Failure":
            return False

        # Evaluate comparison expressions (e.g. "confidence > 0.8")
        parts = condition.split()
        if len(parts) == 3:
            left_str, op, right_str = parts
            left_val = merged_context.get(left_str)
            try:
                right_val = float(right_str) if "." in right_str else int(right_str)
            except ValueError:
                right_val = right_str

            if left_val is not None:
                try:
                    if op == ">":
                        return left_val > right_val
                    elif op == "<":
                        return left_val < right_val
                    elif op == ">=":
                        return left_val >= right_val
                    elif op == "<=":
                        return left_val <= right_val
                    elif op == "==":
                        return str(left_val) == str(right_val) if isinstance(right_val, str) else left_val == right_val
                    elif op == "!=":
                        return str(left_val) != str(right_val) if isinstance(right_val, str) else left_val != right_val
                except TypeError:
                    pass

        return False

    def _execute_instructions(
        self,
        instructions: list[dict[str, Any]],
        context: dict[str, Any] | None = None,
    ) -> None:
        """Process IR instructions sequentially."""
        for inst in instructions:
            op = inst.get("op")
            line = inst.get("line", 0)

            if op == "TASK":
                task_name = inst.get("name", "")
                self._execute_task(task_name, line)
            elif op == "IF":
                condition = inst.get("condition")
                self._log(f"Evaluating condition: {condition} (line {line})", line=line)
                if self._evaluate_condition(condition, context):
                    self._log(f"Condition '{condition}' is True; executing then-branch", line=line)
                    self._execute_instructions(inst.get("then", []), context)
                else:
                    self._log(f"Condition '{condition}' is False; executing else-branch", line=line)
                    self._execute_instructions(inst.get("else", []), context)
            else:
                self._log(f"Unsupported instruction op '{op}' at line {line}", level="ERROR")
                raise WorkflowExecutionError(f"Unsupported instruction op '{op}' at line {line}")

    def execute(
        self,
        ir: dict[str, Any],
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute a compiled workflow IR representation."""
        if not isinstance(ir, dict):
            raise WorkflowExecutionError("Workflow IR must be a dictionary")

        workflow_name = ir.get("workflow", "UnnamedWorkflow")
        self.dfa.transition("START")
        self._log(f"Starting workflow execution: {workflow_name}")

        try:
            instructions = ir.get("instructions", [])
            self._execute_instructions(instructions, context)
            self.dfa.transition("WORKFLOW_SUCCESS")
            self.dfa.transition("FINALIZE")
            self._log(f"Workflow '{workflow_name}' completed successfully")

            return {
                "workflow": workflow_name,
                "status": "SUCCESS",
                "state": self.dfa.to_dict(),
                "results": self.results,
                "logs": self.logs,
            }
        except Exception as exc:
            if self.dfa.state == State.RUNNING:
                self.dfa.transition("TASK_FAILURE_FINAL")
            self._log(f"Workflow execution failed: {exc}", level="ERROR")
            if not isinstance(exc, WorkflowExecutionError):
                raise WorkflowExecutionError(str(exc)) from exc
            raise
