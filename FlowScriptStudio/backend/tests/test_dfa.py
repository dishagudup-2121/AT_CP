import sys
from pathlib import Path

# Add backend directory to sys.path so app can be imported when running pytest from root
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from app.runtime.dfa import (
    State,
    WorkflowDFA,
    InvalidTransitionError,
)


def test_successful_workflow_transitions():
    dfa = WorkflowDFA()
    assert dfa.state == State.IDLE
    dfa.transition("START")
    dfa.transition("WORKFLOW_SUCCESS")
    dfa.transition("FINALIZE")
    assert dfa.state == State.DONE
    assert dfa.history == [
        "IDLE",
        "RUNNING",
        "SUCCESS",
        "DONE",
    ]
    assert dfa.to_dict() == {
        "current_state": "DONE",
        "history": ["IDLE", "RUNNING", "SUCCESS", "DONE"],
    }


def test_retry_transition():
    dfa = WorkflowDFA()
    dfa.transition("START")
    dfa.transition("TASK_FAILURE_RETRYABLE")
    assert dfa.state == State.RETRYING
    dfa.transition("RETRY")
    assert dfa.state == State.RUNNING
    assert dfa.history == [
        "IDLE",
        "RUNNING",
        "RETRYING",
        "RUNNING",
    ]


def test_final_failure_transition():
    dfa = WorkflowDFA()
    dfa.transition("START")
    dfa.transition("TASK_FAILURE_FINAL")
    assert dfa.state == State.FAILED
    assert dfa.history == [
        "IDLE",
        "RUNNING",
        "FAILED",
    ]


def test_invalid_transition_raises_error():
    dfa = WorkflowDFA()
    with pytest.raises(InvalidTransitionError) as exc_info:
        dfa.transition("WORKFLOW_SUCCESS")
    assert "Event 'WORKFLOW_SUCCESS' is invalid in state 'IDLE'" in str(exc_info.value)


def test_reset_transition():
    dfa = WorkflowDFA()
    # Reset from FAILED
    dfa.transition("START")
    dfa.transition("TASK_FAILURE_FINAL")
    assert dfa.state == State.FAILED
    dfa.reset()
    assert dfa.state == State.IDLE

    # Reset from DONE
    dfa.transition("START")
    dfa.transition("WORKFLOW_SUCCESS")
    dfa.transition("FINALIZE")
    assert dfa.state == State.DONE
    dfa.reset()
    assert dfa.state == State.IDLE
    assert dfa.history == [
        "IDLE",
        "RUNNING",
        "FAILED",
        "IDLE",
        "RUNNING",
        "SUCCESS",
        "DONE",
        "IDLE",
    ]
