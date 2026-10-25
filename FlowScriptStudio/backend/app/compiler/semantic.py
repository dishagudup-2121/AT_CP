from dataclasses import dataclass
from .ast_nodes import IfNode, TaskNode, WorkflowNode

# Task handlers that the runtime will support.
SUPPORTED_TASKS = {
    "Search",
    "Analyze",
    "Summarize",
    "Publish",
    "Retry",
}

SUPPORTED_CONDITIONS = {
    "Success",
}

SUPPORTED_VARIABLES = {
    "confidence",
    "score",
    "accuracy",
    "threshold",
    "status",
}

COMPARISON_OPERATORS = {">=", "<=", "==", "!=", ">", "<"}


@dataclass
class SemanticError:
    message: str
    line: int
    stage: str = "semantic"

    def to_dict(self) -> dict:
        return {
            "stage": self.stage,
            "message": self.message,
            "line": self.line,
        }


def analyze_workflow(
    workflow: WorkflowNode,
    supported_tasks: set[str] | None = None,
    supported_conditions: set[str] | None = None,
    supported_variables: set[str] | None = None,
) -> list[SemanticError]:
    if supported_tasks is None:
        supported_tasks = SUPPORTED_TASKS
    if supported_conditions is None:
        supported_conditions = SUPPORTED_CONDITIONS
    if supported_variables is None:
        supported_variables = SUPPORTED_VARIABLES

    errors: list[SemanticError] = []

    def visit(node):
        if isinstance(node, WorkflowNode):
            if not node.name.isidentifier():
                errors.append(
                    SemanticError(
                        message=f"Invalid workflow name '{node.name}'",
                        line=node.line,
                    )
                )
            for statement in node.body:
                visit(statement)
        elif isinstance(node, TaskNode):
            if node.name not in supported_tasks:
                errors.append(
                    SemanticError(
                        message=f"Unknown task '{node.name}'",
                        line=node.line,
                    )
                )
        elif isinstance(node, IfNode):
            parts = node.condition.split()
            if len(parts) == 3 and parts[1] in COMPARISON_OPERATORS:
                var_name, _, _ = parts
                if var_name not in supported_variables:
                    errors.append(
                        SemanticError(
                            message=f"Unknown condition variable '{var_name}' in '{node.condition}'",
                            line=node.line,
                        )
                    )
            elif node.condition not in supported_conditions:
                errors.append(
                    SemanticError(
                        message=f"Unknown condition '{node.condition}'",
                        line=node.line,
                    )
                )
            for statement in node.then_body:
                visit(statement)
            for statement in node.else_body:
                visit(statement)

    visit(workflow)
    return errors
