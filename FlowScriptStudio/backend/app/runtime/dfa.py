from enum import Enum


class State(str, Enum):
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    RETRYING = "RETRYING"
    FAILED = "FAILED"
    DONE = "DONE"


# Explicit DFA transition table.
TRANSITIONS = {
    (State.IDLE, "START"): State.RUNNING,
    (State.RUNNING, "WORKFLOW_SUCCESS"): State.SUCCESS,
    (State.RUNNING, "TASK_FAILURE_RETRYABLE"): State.RETRYING,
    (State.RUNNING, "TASK_FAILURE_FINAL"): State.FAILED,
    (State.RETRYING, "RETRY"): State.RUNNING,
    (State.SUCCESS, "FINALIZE"): State.DONE,
    (State.FAILED, "RESET"): State.IDLE,
    (State.DONE, "RESET"): State.IDLE,
}


class InvalidTransitionError(Exception):
    pass


class WorkflowDFA:
    def __init__(self):
        self.state = State.IDLE
        self.history = [self.state.value]

    def transition(self, event: str) -> State:
        key = (self.state, event)
        if key not in TRANSITIONS:
            raise InvalidTransitionError(
                f"Event {event!r} is invalid in state "
                f"{self.state.value!r}"
            )
        self.state = TRANSITIONS[key]
        self.history.append(self.state.value)
        return self.state

    def reset(self):
        self.transition("RESET")

    def to_dict(self) -> dict:
        return {
            "current_state": self.state.value,
            "history": self.history.copy(),
        }
