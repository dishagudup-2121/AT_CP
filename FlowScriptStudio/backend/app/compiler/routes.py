from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.runtime.engine import WorkflowEngine
from .ast_nodes import ast_to_dict
from .lexer import LexerError, tokenize
from .parser import ParserError, parse_tokens
from .semantic import analyze_workflow
from .ir import ast_to_ir

router = APIRouter(prefix="/api/compile", tags=["Compiler"])


class LexRequest(BaseModel):
    source: str = Field(..., description="FlowScript source code")


class ExecuteRequest(BaseModel):
    source: str = Field(..., description="FlowScript source code to execute")
    context: dict[str, Any] | None = Field(default=None, description="Optional execution context variables")


@router.post("/lex")
def lex_source(request: LexRequest):
    try:
        tokens = tokenize(request.source)
        return {
            "success": True,
            "count": len(tokens),
            "tokens": [token.to_dict() for token in tokens],
            "errors": [],
        }
    except LexerError as exc:
        return {
            "success": False,
            "count": 0,
            "tokens": [],
            "errors": [
                {
                    "stage": "lexer",
                    "message": str(exc),
                    "line": exc.line,
                    "column": exc.column,
                }
            ],
        }


@router.post("/parse")
def parse_source(request: LexRequest):
    try:
        tokens = tokenize(request.source)
        ast = parse_tokens(tokens, require_end=True)
        return {
            "success": True,
            "workflow": ast_to_dict(ast),
            "errors": [],
        }
    except LexerError as exc:
        return {
            "success": False,
            "workflow": None,
            "errors": [
                {
                    "stage": "lexer",
                    "message": str(exc),
                    "line": exc.line,
                    "column": exc.column,
                }
            ],
        }
    except ParserError as exc:
        return {
            "success": False,
            "workflow": None,
            "errors": [
                {
                    "stage": "parser",
                    "message": str(exc),
                    "line": exc.line,
                    "column": exc.column,
                }
            ],
        }


@router.post("/build")
def build_workflow(request: LexRequest):
    # Stage 1: Lexical analysis
    try:
        tokens = tokenize(request.source)
    except LexerError as exc:
        return {
            "success": False,
            "stage": "lexer",
            "errors": [
                {
                    "stage": "lexer",
                    "message": str(exc),
                    "line": exc.line,
                    "column": exc.column,
                }
            ],
        }

    # Stage 2: Parsing
    try:
        ast = parse_tokens(tokens, require_end=True)
    except ParserError as exc:
        return {
            "success": False,
            "stage": "parser",
            "errors": [
                {
                    "stage": "parser",
                    "message": str(exc),
                    "line": exc.line,
                    "column": exc.column,
                }
            ],
        }

    # Stage 3: Semantic analysis
    semantic_errors = analyze_workflow(ast)
    if semantic_errors:
        return {
            "success": False,
            "stage": "semantic",
            "errors": [err.to_dict() for err in semantic_errors],
        }

    return {
        "success": True,
        "stage": "complete",
        "workflow": ast_to_dict(ast),
        "tokens": [token.to_dict() for token in tokens],
        "ir": ast_to_ir(ast),
        "errors": [],
    }


@router.post("/execute")
def execute_workflow(request: ExecuteRequest):
    # Compile the source into IR first.
    build_result = build_workflow(
        LexRequest(source=request.source)
    )
    if not build_result.get("success"):
        return {
            "success": False,
            "stage": build_result.get("stage"),
            "errors": build_result.get("errors", []),
        }

    # Execute the compiled intermediate representation.
    engine = WorkflowEngine()
    try:
        execution_result = engine.execute(build_result["ir"], context=request.context)
        return {
            "success": execution_result["status"] == "SUCCESS",
            "stage": "execution",
            "workflow": execution_result["workflow"],
            "status": execution_result["status"],
            "state": execution_result["state"],
            "logs": execution_result["logs"],
            "results": execution_result["results"],
            "errors": [
                {
                    "stage": "execution",
                    "message": log["message"],
                    "line": log.get("line"),
                }
                for log in execution_result["logs"]
                if log.get("level") == "ERROR"
            ],
        }
    except Exception as exc:
        workflow_name = ""
        if isinstance(build_result.get("workflow"), dict):
            workflow_name = build_result["workflow"].get("name", "")
        return {
            "success": False,
            "stage": "execution",
            "workflow": workflow_name,
            "status": "FAILED",
            "state": engine.dfa.to_dict(),
            "logs": engine.logs,
            "results": engine.results,
            "errors": [
                {
                    "stage": "execution",
                    "message": log["message"],
                    "line": log.get("line"),
                }
                for log in engine.logs
                if log["level"] == "ERROR"
            ]
            or [
                {
                    "stage": "execution",
                    "message": str(exc),
                    "line": getattr(exc, "line", None),
                }
            ],
        }
