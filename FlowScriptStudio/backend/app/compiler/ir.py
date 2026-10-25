from .ast_nodes import IfNode, TaskNode, WorkflowNode


def ast_to_ir(workflow: WorkflowNode) -> dict:
    def convert(statement):
        if isinstance(statement, TaskNode):
            return {
                "op": "TASK",
                "name": statement.name,
                "line": statement.line,
            }
        if isinstance(statement, IfNode):
            return {
                "op": "IF",
                "condition": statement.condition,
                "then": [convert(item) for item in statement.then_body],
                "else": [convert(item) for item in statement.else_body],
                "line": statement.line,
            }
        raise TypeError(
            f"Unsupported AST node: {type(statement).__name__}"
        )

    return {
        "workflow": workflow.name,
        "instructions": [convert(item) for item in workflow.body],
    }
