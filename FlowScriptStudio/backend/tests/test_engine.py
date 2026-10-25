import sys
from pathlib import Path

# Add backend directory to sys.path so app can be imported when running pytest from root
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from app.runtime.engine import WorkflowEngine, WorkflowExecutionError


def test_successful_workflow_execution():
    ir = {
        "workflow": "ResearchPipeline",
        "instructions": [
            {"op": "TASK", "name": "Search", "line": 2},
            {"op": "TASK", "name": "Analyze", "line": 3},
        ],
    }
    result = WorkflowEngine().execute(ir)
    assert result["status"] == "SUCCESS"
    assert result["state"]["current_state"] == "DONE"
    assert len(result["results"]) == 2


def test_conditional_executes_true_branch():
    ir = {
        "workflow": "ConditionalFlow",
        "instructions": [
            {
                "op": "IF",
                "condition": "Success",
                "line": 2,
                "then": [
                    {"op": "TASK", "name": "Summarize", "line": 3}
                ],
                "else": [
                    {"op": "TASK", "name": "Retry", "line": 5}
                ],
            }
        ],
    }
    result = WorkflowEngine().execute(ir)
    assert result["status"] == "SUCCESS"
    assert result["state"]["current_state"] == "DONE"
    assert len(result["results"]) == 1
    assert result["results"][0]["task"] == "Summarize"


def test_conditional_executes_false_branch():
    ir = {
        "workflow": "ConditionalFlow",
        "instructions": [
            {
                "op": "IF",
                "condition": "Failure",
                "line": 2,
                "then": [
                    {"op": "TASK", "name": "Summarize", "line": 3}
                ],
                "else": [
                    {"op": "TASK", "name": "Retry", "line": 5}
                ],
            }
        ],
    }
    result = WorkflowEngine().execute(ir)
    assert result["status"] == "SUCCESS"
    assert result["state"]["current_state"] == "DONE"
    assert len(result["results"]) == 1
    assert result["results"][0]["task"] == "Retry"


def test_unsupported_task_raises_error():
    ir = {
        "workflow": "InvalidFlow",
        "instructions": [
            {"op": "TASK", "name": "UnknownTask", "line": 2}
        ],
    }
    engine = WorkflowEngine()
    with pytest.raises(WorkflowExecutionError):
        engine.execute(ir)
    assert engine.dfa.state == "FAILED"


def test_comparison_condition_executes_true_branch():
    ir = {
        "workflow": "ComparisonFlow",
        "instructions": [
            {
                "op": "IF",
                "condition": "confidence > 0.8",
                "line": 2,
                "then": [{"op": "TASK", "name": "Publish", "line": 3}],
                "else": [{"op": "TASK", "name": "Retry", "line": 5}],
            }
        ],
    }
    # Default confidence is 0.85 (> 0.8 -> true branch)
    result = WorkflowEngine().execute(ir)
    assert result["status"] == "SUCCESS"
    assert [r["name"] for r in result["results"]] == ["Publish"]


def test_comparison_condition_executes_false_branch():
    ir = {
        "workflow": "ComparisonFlow",
        "instructions": [
            {
                "op": "IF",
                "condition": "confidence < 0.5",
                "line": 2,
                "then": [{"op": "TASK", "name": "Publish", "line": 3}],
                "else": [{"op": "TASK", "name": "Retry", "line": 5}],
            }
        ],
    }
    # 0.85 < 0.5 is False -> else branch executes
    result = WorkflowEngine().execute(ir)
    assert result["status"] == "SUCCESS"
    assert [r["name"] for r in result["results"]] == ["Retry"]


def test_custom_context_overrides_condition():
    ir = {
        "workflow": "ComparisonFlow",
        "instructions": [
            {
                "op": "IF",
                "condition": "confidence > 0.8",
                "line": 2,
                "then": [{"op": "TASK", "name": "Publish", "line": 3}],
                "else": [{"op": "TASK", "name": "Retry", "line": 5}],
            }
        ],
    }
    # Pass context where confidence is 0.2 (fails condition)
    result = WorkflowEngine().execute(ir, context={"confidence": 0.2})
    assert result["status"] == "SUCCESS"
    assert [r["name"] for r in result["results"]] == ["Retry"]
