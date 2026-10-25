from dataclasses import dataclass, field


@dataclass
class TaskNode:
    name: str
    line: int = 1


@dataclass
class IfNode:
    condition: str
    then_body: list = field(default_factory=list)
    else_body: list = field(default_factory=list)
    line: int = 1


@dataclass
class WorkflowNode:
    name: str
    body: list = field(default_factory=list)
    line: int = 1


def ast_to_dict(node):
    if isinstance(node, WorkflowNode):
        return {
            "type": "Workflow",
            "name": node.name,
            "line": node.line,
            "body": [ast_to_dict(child) for child in node.body],
        }
    if isinstance(node, TaskNode):
        return {
            "type": "Task",
            "name": node.name,
            "line": node.line,
        }
    if isinstance(node, IfNode):
        return {
            "type": "If",
            "condition": node.condition,
            "then_body": [ast_to_dict(child) for child in node.then_body],
            "else_body": [ast_to_dict(child) for child in node.else_body],
            "line": node.line,
        }
    return {}
