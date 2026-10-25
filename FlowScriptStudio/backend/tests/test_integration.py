from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_and_health_endpoints():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"


def test_lex_valid_workflow():
    source = "WORKFLOW Test\nTASK Search\nEND"
    response = client.post("/api/compile/lex", json={"source": source})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["count"] > 0
    assert len(data["errors"]) == 0


def test_lex_invalid_character():
    source = "WORKFLOW Test\nTASK @Invalid\nEND"
    response = client.post("/api/compile/lex", json={"source": source})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert len(data["errors"]) > 0
    err = data["errors"][0]
    assert err["stage"] == "lexer"
    assert "line" in err
    assert "column" in err
    assert "Unexpected character" in err["message"]


def test_parse_valid_and_invalid_syntax():
    # Valid syntax
    valid_source = "WORKFLOW Valid\nTASK Search\nEND"
    resp = client.post("/api/compile/parse", json={"source": valid_source})
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert resp.json()["workflow"]["name"] == "Valid"

    # Invalid syntax - missing END
    invalid_source = "WORKFLOW Broken\nTASK Search"
    resp = client.post("/api/compile/parse", json={"source": invalid_source})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert len(data["errors"]) > 0
    err = data["errors"][0]
    assert err["stage"] == "parser"
    assert "line" in err


def test_build_workflow_semantic_rejection():
    # Unknown task must be caught at semantic stage before execution
    source = "WORKFLOW SemanticFail\nTASK UnsupportedTask\nEND"
    resp = client.post("/api/compile/build", json={"source": source})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert data["stage"] == "semantic"
    assert len(data["errors"]) > 0
    assert "Unknown task" in data["errors"][0]["message"]
    assert data["errors"][0]["stage"] == "semantic"
    assert data["errors"][0]["line"] == 2


def test_execute_sequential_workflow():
    source = "WORKFLOW SeqDemo\nTASK Search\nTASK Analyze\nEND"
    resp = client.post("/api/compile/execute", json={"source": source})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["status"] == "SUCCESS"
    assert data["state"]["current_state"] == "DONE"
    assert len(data["results"]) == 2
    assert [r["name"] for r in data["results"]] == ["Search", "Analyze"]


def test_execute_conditional_workflow():
    source = (
        "WORKFLOW BranchDemo\n"
        "IF Success\n"
        "TASK Analyze\n"
        "ELSE\n"
        "TASK Retry\n"
        "END\n"
        "END"
    )
    resp = client.post("/api/compile/execute", json={"source": source})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["status"] == "SUCCESS"
    assert len(data["results"]) == 1
    assert data["results"][0]["name"] == "Analyze"


def test_execute_compilation_failure_never_executes():
    # Syntax error: must fail during parsing, and execution results/state must never be generated
    broken_source = "WORKFLOW BrokenDemo\nTASK Search"
    resp = client.post("/api/compile/execute", json={"source": broken_source})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert data["stage"] == "parser"
    assert "results" not in data  # Engine was never invoked
    assert len(data["errors"]) > 0
    assert data["errors"][0]["stage"] == "parser"


def test_execute_semantic_failure_never_executes():
    # Semantic error: must fail during semantic analysis and never execute tasks
    unknown_task_source = "WORKFLOW InvalidDemo\nTASK UnknownTask\nEND"
    resp = client.post("/api/compile/execute", json={"source": unknown_task_source})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert data["stage"] == "semantic"
    assert "results" not in data  # Engine was never invoked
    assert len(data["errors"]) > 0
    assert data["errors"][0]["stage"] == "semantic"
    assert data["errors"][0]["line"] == 2


def test_execute_sample_conditional_workflow():
    # Test the exact ContentModeration sample from the frontend
    source = (
        "WORKFLOW ContentModeration\n"
        "TASK Search\n"
        "IF confidence > 0.8\n"
        "    TASK Publish\n"
        "ELSE\n"
        "    TASK Retry\n"
        "END\n"
        "END"
    )
    resp = client.post("/api/compile/execute", json={"source": source})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["status"] == "SUCCESS"
    # Default confidence is 0.85, so Search runs, confidence > 0.8 is True, Publish runs
    assert [r["name"] for r in data["results"]] == ["Search", "Publish"]
